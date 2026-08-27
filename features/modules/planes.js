import * as THREE from "three";
import { CONFIG } from "./config.js";
import { polygonArea, polygonBounds, disposeObject } from "./utils.js";
import { spatialMap } from "./spatialMap.js";
import {
  planeGroup, planeEdgeGroup, planeNormalGroup, planeCenterGroup,
  floorGridGroup
} from "./scene.js";
import {
  floorMaterial, wallMaterial, horizontalMaterial, otherMaterial,
  edgeMaterial, normalMaterial, centerMaterial
} from "./materials.js";

const planeObjects = new Map();
const planeIds = new WeakMap();
let nextPlaneId = 1;
let lastFloorGridSignature = "";

function getPlaneId(plane) {
  let id = planeIds.get(plane);
  if (!id) {
    id = "plane-" + nextPlaneId++;
    planeIds.set(plane, id);
  }
  return id;
}

function getWorldNormal(pose) {
  const q = new THREE.Quaternion(
    pose.transform.orientation.x,
    pose.transform.orientation.y,
    pose.transform.orientation.z,
    pose.transform.orientation.w
  );
  return new THREE.Vector3(0, 1, 0).applyQuaternion(q).normalize();
}

function classifyPlane(pose) {
  const normal = getWorldNormal(pose);
  const absX = Math.abs(normal.x);
  const absY = Math.abs(normal.y);
  const absZ = Math.abs(normal.z);

  if (absY > 0.85) {
    const y = pose.transform.position.y;
    if (Math.abs(y) < 0.20) return "floor";
    if (y > 1.9) return "ceiling";
    return "horizontal";
  }
  if (absX > 0.85 || absZ > 0.85) return "wall";
  return "other";
}

function createPlaneMesh(plane, pose, classification) {
  const polygon = plane.polygon;
  if (!polygon || polygon.length < 3) return null;

  const shape = new THREE.Shape();
  shape.moveTo(polygon[0].x, polygon[0].y);
  for (let i = 1; i < polygon.length; i++) {
    shape.lineTo(polygon[i].x, polygon[i].y);
  }
  shape.closePath();

  const geometry = new THREE.ShapeGeometry(shape);
  let material;
  switch (classification) {
    case "floor": material = floorMaterial.clone(); break;
    case "wall": material = wallMaterial.clone(); break;
    case "ceiling":
    case "horizontal": material = horizontalMaterial.clone(); break;
    default: material = otherMaterial.clone(); break;
  }

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
  mesh.quaternion.set(pose.transform.orientation.x, pose.transform.orientation.y, pose.transform.orientation.z, pose.transform.orientation.w);
  return mesh;
}

function createPlaneEdges(plane, pose) {
  const polygon = plane.polygon;
  if (!polygon || polygon.length < 2) return null;

  const positions = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    positions.push(a.x, a.y, 0, b.x, b.y, 0);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const lines = new THREE.LineSegments(geometry, edgeMaterial.clone());
  lines.position.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
  lines.quaternion.set(pose.transform.orientation.x, pose.transform.orientation.y, pose.transform.orientation.z, pose.transform.orientation.w);
  return lines;
}

function createPlaneNormal(pose) {
  const origin = new THREE.Vector3(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
  const normal = getWorldNormal(pose);
  const end = origin.clone().add(normal.clone().multiplyScalar(0.25));
  const geometry = new THREE.BufferGeometry().setFromPoints([origin, end]);
  return new THREE.Line(geometry, normalMaterial);
}

function createPlaneCenter(pose) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), centerMaterial);
  mesh.position.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
  return mesh;
}

function removePlaneVisual(visual) {
  if (!visual) return;
  disposeObject(visual.mesh);
  disposeObject(visual.edges);
  disposeObject(visual.normal);
  disposeObject(visual.center);
}

function rebuildFloorGrid() {
  if (!CONFIG.showFloorGrid) return;

  const floors = Object.values(spatialMap.planes).filter(p => p.classification === "floor");
  if (!floors.length) return;

  floors.sort((a, b) => b.area - a.area);
  const floor = floors[0];

  const signature = [floor.id, floor.center.x.toFixed(2), floor.center.y.toFixed(2), floor.center.z.toFixed(2), floor.area.toFixed(2)].join("|");
  if (signature === lastFloorGridSignature) return;
  lastFloorGridSignature = signature;

  floorGridGroup.clear();

  const size = CONFIG.floorGridSize;
  const step = CONFIG.floorGridStep;
  const positions = [];

  for (let x = -size; x <= size; x += step) {
    positions.push(x, 0, -size, x, 0, size);
  }
  for (let z = -size; z <= size; z += step) {
    positions.push(-size, 0, z, size, 0, z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ color: 0x444444, transparent: true, opacity: 0.25 });
  const grid = new THREE.LineSegments(geometry, material);
  grid.position.set(floor.center.x, floor.center.y + 0.003, floor.center.z);
  floorGridGroup.add(grid);
}

export function updatePlanes(frame, renderer) {
  const detectedPlanes = frame.detectedPlanes;
  if (!detectedPlanes) {
    spatialMap.features.planeDetection = false;
    return;
  }
  spatialMap.features.planeDetection = true;

  const referenceSpace = renderer.xr.getReferenceSpace();
  if (!referenceSpace) return;

  const visibleIds = new Set();

  for (const plane of detectedPlanes) {
    const id = getPlaneId(plane);
    visibleIds.add(id);

    const pose = frame.getPose(plane.planeSpace, referenceSpace);
    if (!pose) continue;

    const classification = classifyPlane(pose);
    const polygon = plane.polygon || [];
    const area = polygonArea(polygon);
    const bounds = polygonBounds(polygon);
    const worldNormal = getWorldNormal(pose);

    let data = spatialMap.planes[id];
    if (!data) {
      data = {
        id,
        orientation: plane.orientation || "unknown",
        classification,
        center: { x: 0, y: 0, z: 0 },
        normal: { x: 0, y: 0, z: 0 },
        polygon: [],
        vertexCount: 0,
        area: 0,
        width: 0,
        height: 0,
        updates: 0,
        lastChangedTime: plane.lastChangedTime || null
      };
      spatialMap.planes[id] = data;
    }

    data.orientation = plane.orientation || "unknown";
    data.classification = classification;
    data.center = { x: pose.transform.position.x, y: pose.transform.position.y, z: pose.transform.position.z };
    data.normal = { x: worldNormal.x, y: worldNormal.y, z: worldNormal.z };
    data.vertexCount = polygon.length;
    data.area = area;
    data.width = bounds.width;
    data.height = bounds.height;
    data.polygon = polygon.map(p => ({ x: p.x, y: p.y }));
    data.updates++;
    data.lastChangedTime = plane.lastChangedTime || data.lastChangedTime;

    const oldVisual = planeObjects.get(id);
    if (oldVisual) removePlaneVisual(oldVisual);

    const mesh = CONFIG.showPlanes ? createPlaneMesh(plane, pose, classification) : null;
    const edges = CONFIG.showPlaneEdges ? createPlaneEdges(plane, pose) : null;
    const visualNormal = CONFIG.showPlaneNormals ? createPlaneNormal(pose) : null;
    const center = CONFIG.showPlaneCenters ? createPlaneCenter(pose) : null;

    if (mesh) planeGroup.add(mesh);
    if (edges) planeEdgeGroup.add(edges);
    if (visualNormal) planeNormalGroup.add(visualNormal);
    if (center) planeCenterGroup.add(center);

    planeObjects.set(id, { mesh, edges, normal: visualNormal, center });
  }

  for (const [id, visual] of planeObjects) {
    if (!visibleIds.has(id)) {
      removePlaneVisual(visual);
      planeObjects.delete(id);
      delete spatialMap.planes[id];
    }
  }

  rebuildFloorGrid();
}
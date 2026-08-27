import * as THREE from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";

/* ============================================================
   CONFIGURATION
   ============================================================ */

const CONFIG = {
  /* Plane visualization */
  showPlanes: true,
  showPlaneEdges: true,
  showPlaneCenters: true,
  showPlaneNormals: true,

  /* Depth point cloud */
  depthSampleStep: 8,
  maxDepthPoints: 30000,
  depthMaxDistance: 12,
  pointSize: 0.012,
  depthUpdateInterval: 4,

  /* Floor grid */
  showFloorGrid: true,
  floorGridSize: 10,
  floorGridStep: 0.25,

  /* Hit test */
  showHitTest: true,

  /* Debug update frequency */
  debugUpdateInterval: 15
};

/* ============================================================
   THREE.JS
   ============================================================ */

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: "high-performance"
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setAnimationLoop(render);
document.body.appendChild(renderer.domElement);

/* ============================================================
   LIGHT
   ============================================================ */

scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.5));

/* ============================================================
   VISUAL GROUPS
   ============================================================ */

const planeGroup = new THREE.Group();
const planeEdgeGroup = new THREE.Group();
const planeNormalGroup = new THREE.Group();
const planeCenterGroup = new THREE.Group();
const depthPointGroup = new THREE.Group();
const floorGridGroup = new THREE.Group();
const hitTestGroup = new THREE.Group();

scene.add(planeGroup);
scene.add(planeEdgeGroup);
scene.add(planeNormalGroup);
scene.add(planeCenterGroup);
scene.add(depthPointGroup);
scene.add(floorGridGroup);
scene.add(hitTestGroup);

/* ============================================================
   DEBUG ELEMENT
   ============================================================ */

const debugContent = document.getElementById("debugContent");

/* ============================================================
   MATERIALS
   ============================================================ */

const floorMaterial = new THREE.MeshBasicMaterial({
  color: 0x00ff00,
  transparent: true,
  opacity: 0.18,
  side: THREE.DoubleSide,
  depthWrite: false
});

const wallMaterial = new THREE.MeshBasicMaterial({
  color: 0x0088ff,
  transparent: true,
  opacity: 0.15,
  side: THREE.DoubleSide,
  depthWrite: false
});

const horizontalMaterial = new THREE.MeshBasicMaterial({
  color: 0xffff00,
  transparent: true,
  opacity: 0.13,
  side: THREE.DoubleSide,
  depthWrite: false
});

const otherMaterial = new THREE.MeshBasicMaterial({
  color: 0xff00ff,
  transparent: true,
  opacity: 0.12,
  side: THREE.DoubleSide,
  depthWrite: false
});

const edgeMaterial = new THREE.LineBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.8
});

const normalMaterial = new THREE.LineBasicMaterial({
  color: 0xff3333
});

const centerMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff
});

/* ============================================================
   DEPTH POINT CLOUD MATERIAL
   ============================================================ */

const depthPointMaterial = new THREE.PointsMaterial({
  color: 0xffffff,
  size: CONFIG.pointSize,
  sizeAttenuation: true,
  transparent: true,
  opacity: 0.8,
  depthWrite: false
});

const depthGeometry = new THREE.BufferGeometry();
const depthPositions = new Float32Array(CONFIG.maxDepthPoints * 3);
depthGeometry.setAttribute("position", new THREE.BufferAttribute(depthPositions, 3));
depthGeometry.setDrawRange(0, 0);

const depthPoints = new THREE.Points(depthGeometry, depthPointMaterial);
depthPointGroup.add(depthPoints);

/* ============================================================
   SPATIAL MAP
   ============================================================ */

const spatialMap = {
  version: 2,
  type: "webxr-spatial-map",
  startedAt: null,
  lastUpdate: null,
  frames: 0,
  xrFrames: 0,
  renderFrames: 0,

  session: {
    supported: false,
    active: false,
    visibilityState: null,
    environmentBlendMode: null,
    interactionMode: null,
    depthUsage: null,
    depthDataFormat: null,
    inputSources: 0
  },

  features: {
    planeDetection: false,
    hitTest: false,
    depthSensing: false,
    localFloor: false
  },

  camera: {
    position: { x: 0, y: 0, z: 0 },
    quaternion: { x: 0, y: 0, z: 0, w: 1 }
  },

  planes: {},

  depth: {
    frames: 0,
    samples: 0,
    worldPoints: 0,
    width: 0,
    height: 0,
    rawValueToMeters: 0,
    format: null,
    usage: null
  },

  hitTest: {
    available: false,
    hits: 0,
    position: null,
    distance: null
  }
};

/* ============================================================
   PLANE OBJECTS
   ============================================================ */

const planeObjects = new Map();
const planeIds = new WeakMap();
let nextPlaneId = 1;

/* ============================================================
   XR STATE
   ============================================================ */

let currentSession = null;
let hitTestSource = null;
let viewerSpace = null;
let lastDepthUpdateFrame = -1;
let lastFloorGridSignature = "";

/* ============================================================
   UTILITY
   ============================================================ */

function fmt(value, digits = 3) {
  if (!Number.isFinite(value)) return "n/a";
  return Number(value).toFixed(digits);
}

function vectorText(v) {
  return "(" + fmt(v.x) + ", " + fmt(v.y) + ", " + fmt(v.z) + ")";
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/* ============================================================
   PLANE ID
   ============================================================ */

function getPlaneId(plane) {
  let id = planeIds.get(plane);
  if (!id) {
    id = "plane-" + nextPlaneId++;
    planeIds.set(plane, id);
  }
  return id;
}

/* ============================================================
   POLYGON AREA
   ============================================================ */

function polygonArea(points) {
  if (!points || points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area) * 0.5;
}

/* ============================================================
   POLYGON BOUNDS
   ============================================================ */

function polygonBounds(points) {
  if (!points || points.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
}

/* ============================================================
   WORLD NORMAL
   ============================================================ */

function getWorldNormal(pose) {
  const q = new THREE.Quaternion(
    pose.transform.orientation.x,
    pose.transform.orientation.y,
    pose.transform.orientation.z,
    pose.transform.orientation.w
  );
  return new THREE.Vector3(0, 1, 0).applyQuaternion(q).normalize();
}

/* ============================================================
   PLANE CLASSIFICATION
   ============================================================ */

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

/* ============================================================
   CREATE PLANE MESH
   ============================================================ */

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

/* ============================================================
   CREATE PLANE EDGES
   ============================================================ */

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

/* ============================================================
   CREATE NORMAL
   ============================================================ */

function createPlaneNormal(pose) {
  const origin = new THREE.Vector3(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
  const normal = getWorldNormal(pose);
  const end = origin.clone().add(normal.clone().multiplyScalar(0.25));
  const geometry = new THREE.BufferGeometry().setFromPoints([origin, end]);
  return new THREE.Line(geometry, normalMaterial);
}

/* ============================================================
   CREATE CENTER
   ============================================================ */

function createPlaneCenter(pose) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), centerMaterial);
  mesh.position.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
  return mesh;
}

/* ============================================================
   DISPOSE OBJECT
   ============================================================ */

function disposeObject(object) {
  if (!object) return;
  if (object.parent) object.parent.remove(object);
  if (object.geometry) object.geometry.dispose();
  if (object.material) {
    if (Array.isArray(object.material)) {
      for (const material of object.material) material.dispose();
    } else {
      object.material.dispose();
    }
  }
}

/* ============================================================
   REMOVE PLANE VISUAL
   ============================================================ */

function removePlaneVisual(visual) {
  if (!visual) return;
  disposeObject(visual.mesh);
  disposeObject(visual.edges);
  disposeObject(visual.normal);
  disposeObject(visual.center);
}

/* ============================================================
   UPDATE PLANES
   ============================================================ */

function updatePlanes(frame) {
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

    // Rebuild visual
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

  // Remove planes that disappeared
  for (const [id, visual] of planeObjects) {
    if (!visibleIds.has(id)) {
      removePlaneVisual(visual);
      planeObjects.delete(id);
      delete spatialMap.planes[id];
    }
  }

  rebuildFloorGrid();
}

/* ============================================================
   FLOOR GRID
   ============================================================ */

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

/* ============================================================
   DEPTH SUPPORT
   ============================================================ */

function hasDepthSupport(session) {
  if (!session) return false;
  if (typeof session.depthUsage !== "string") return false;
  if (session.depthUsage !== "cpu-optimized") return false;
  return true;
}

/* ============================================================
   DEPTH WORLD POSITION
   ============================================================ */

function depthSampleToWorld(view, normalizedX, normalizedY, depthMeters) {
  const ndcX = normalizedX * 2 - 1;
  const ndcY = 1 - normalizedY * 2;

  const inverseProjection = new THREE.Matrix4().copy(view.projectionMatrix).invert();
  const nearPoint = new THREE.Vector4(ndcX, ndcY, -1, 1).applyMatrix4(inverseProjection);
  if (Math.abs(nearPoint.w) < 0.000001) return null;
  nearPoint.multiplyScalar(1 / nearPoint.w);

  const ray = new THREE.Vector3(nearPoint.x, nearPoint.y, nearPoint.z).normalize();
  const viewPoint = ray.multiplyScalar(depthMeters);
  const world = new THREE.Vector3(viewPoint.x, viewPoint.y, viewPoint.z).applyMatrix4(view.transform.matrix);
  return world;
}

/* ============================================================
   COLLECT DEPTH
   ============================================================ */

function collectDepth(frame) {
  const session = renderer.xr.getSession();
  if (!session) return;
  if (!hasDepthSupport(session)) return;
  if (typeof frame.getViewerPose !== "function") return;
  if (typeof frame.getDepthInformation !== "function") return;

  const referenceSpace = renderer.xr.getReferenceSpace();
  if (!referenceSpace) return;

  const viewerPose = frame.getViewerPose(referenceSpace);
  if (!viewerPose) return;

  const frameNumber = spatialMap.frames;
  if (frameNumber - lastDepthUpdateFrame < CONFIG.depthUpdateInterval) return;
  lastDepthUpdateFrame = frameNumber;

  const view = viewerPose.views[0];
  if (!view) return;

  let depthInfo = null;
  try {
    depthInfo = frame.getDepthInformation(view);
  } catch (error) {
    console.warn("getDepthInformation failed:", error);
    return;
  }
  if (!depthInfo) return;

  spatialMap.features.depthSensing = true;
  spatialMap.depth.frames++;
  spatialMap.depth.width = depthInfo.width;
  spatialMap.depth.height = depthInfo.height;
  spatialMap.depth.rawValueToMeters = depthInfo.rawValueToMeters || 0;
  spatialMap.depth.format = session.depthDataFormat || null;
  spatialMap.depth.usage = session.depthUsage || null;

  const step = Math.max(1, CONFIG.depthSampleStep);
  let pointIndex = 0;
  const positions = depthGeometry.getAttribute("position").array;

  for (let y = 0; y < depthInfo.height; y += step) {
    for (let x = 0; x < depthInfo.width; x += step) {
      if (pointIndex >= CONFIG.maxDepthPoints) break;

      const normalizedX = (x + 0.5) / depthInfo.width;
      const normalizedY = (y + 0.5) / depthInfo.height;

      let depth;
      try {
        depth = depthInfo.getDepthInMeters(normalizedX, normalizedY);
      } catch {
        continue;
      }

      if (!Number.isFinite(depth)) continue;
      if (depth <= 0 || depth > CONFIG.depthMaxDistance) continue;

      const world = depthSampleToWorld(view, normalizedX, normalizedY, depth);
      if (!world) continue;

      const index = pointIndex * 3;
      positions[index] = world.x;
      positions[index + 1] = world.y;
      positions[index + 2] = world.z;
      pointIndex++;
      spatialMap.depth.samples++;
    }
    if (pointIndex >= CONFIG.maxDepthPoints) break;
  }

  depthGeometry.setDrawRange(0, pointIndex);
  depthGeometry.getAttribute("position").needsUpdate = true;
  spatialMap.depth.worldPoints = pointIndex;
}

/* ============================================================
   HIT TEST
   ============================================================ */

async function initializeHitTest(session) {
  hitTestSource = null;
  viewerSpace = null;

  if (typeof session.requestReferenceSpace !== "function") return;
  if (typeof session.requestHitTestSource !== "function") return;

  try {
    viewerSpace = await session.requestReferenceSpace("viewer");
    hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
    spatialMap.features.hitTest = true;
    spatialMap.hitTest.available = true;

    session.addEventListener("end", () => {
      hitTestSource = null;
      viewerSpace = null;
      spatialMap.features.hitTest = false;
      spatialMap.hitTest.available = false;
    }, { once: true });
  } catch (error) {
    console.warn("Hit test unavailable:", error);
  }
}

/* ============================================================
   UPDATE HIT TEST
   ============================================================ */

function updateHitTest(frame) {
  if (!hitTestSource) {
    spatialMap.hitTest.position = null;
    spatialMap.hitTest.distance = null;
    return;
  }

  const referenceSpace = renderer.xr.getReferenceSpace();
  if (!referenceSpace) return;

  let results;
  try {
    results = frame.getHitTestResults(hitTestSource);
  } catch {
    return;
  }

  if (!results || results.length === 0) {
    spatialMap.hitTest.position = null;
    spatialMap.hitTest.distance = null;
    return;
  }

  const pose = results[0].getPose(referenceSpace);
  if (!pose) return;

  const position = new THREE.Vector3(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
  const cameraPosition = new THREE.Vector3(spatialMap.camera.position.x, spatialMap.camera.position.y, spatialMap.camera.position.z);

  spatialMap.hitTest.hits++;
  spatialMap.hitTest.position = { x: position.x, y: position.y, z: position.z };
  spatialMap.hitTest.distance = position.distanceTo(cameraPosition);

  updateHitTestVisual(position);
}

/* ============================================================
   HIT TEST VISUAL
   ============================================================ */

function updateHitTestVisual(position) {
  hitTestGroup.clear();
  if (!CONFIG.showHitTest) return;

  const geometry = new THREE.RingGeometry(0.06, 0.08, 32);
  const material = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(geometry, material);
  ring.rotation.x = -Math.PI / 2;
  ring.position.copy(position);
  hitTestGroup.add(ring);
}

/* ============================================================
   CAMERA INFORMATION
   ============================================================ */

function updateCameraInfo() {
  const xrCamera = renderer.xr.getCamera();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  xrCamera.getWorldPosition(position);
  xrCamera.getWorldQuaternion(quaternion);
  spatialMap.camera.position = { x: position.x, y: position.y, z: position.z };
  spatialMap.camera.quaternion = { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w };
}

/* ============================================================
   SESSION INFORMATION
   ============================================================ */

function updateSessionInfo(session) {
  if (!session) {
    spatialMap.session.active = false;
    return;
  }
  spatialMap.session.active = true;
  spatialMap.session.visibilityState = session.visibilityState || null;
  spatialMap.session.environmentBlendMode = session.environmentBlendMode || null;
  spatialMap.session.interactionMode = session.interactionMode || null;
  spatialMap.session.depthUsage = session.depthUsage || null;
  spatialMap.session.depthDataFormat = session.depthDataFormat || null;
  spatialMap.session.inputSources = session.inputSources ? session.inputSources.length : 0;
}

/* ============================================================
   INPUT SOURCE DEBUG
   ============================================================ */

function getInputSourceInfo(session) {
  if (!session) return [];
  const result = [];
  for (const source of session.inputSources) {
    result.push({
      handedness: source.handedness || null,
      targetRayMode: source.targetRayMode || null,
      profiles: source.profiles || []
    });
  }
  return result;
}

/* ============================================================
   DEBUG HTML
   ============================================================ */

function updateDebug() {
  const session = renderer.xr.getSession();
  updateSessionInfo(session);

  const planes = Object.values(spatialMap.planes);
  const floors = planes.filter(p => p.classification === "floor");
  const walls = planes.filter(p => p.classification === "wall");
  const ceilings = planes.filter(p => p.classification === "ceiling");
  const horizontals = planes.filter(p => p.classification === "horizontal");
  const camera = spatialMap.camera;

  let html = "";

  html += `<div>WebXR: <span class="${spatialMap.session.supported ? "ok" : "warning"}">${spatialMap.session.supported ? "supported" : "unknown"}</span></div>`;

  html += `<div class="section">XR SESSION</div>
    active: ${spatialMap.session.active}<br>
    visibility: ${escapeHtml(spatialMap.session.visibilityState || "none")}<br>
    blend: ${escapeHtml(spatialMap.session.environmentBlendMode || "none")}<br>
    interaction: ${escapeHtml(spatialMap.session.interactionMode || "none")}<br>
    inputSources: ${spatialMap.session.inputSources}`;

  html += `<div class="section">FEATURES</div>
    local-floor: <span class="${spatialMap.features.localFloor ? "ok" : "warning"}">${spatialMap.features.localFloor ? "YES" : "NO"}</span><br>
    plane-detection: <span class="${spatialMap.features.planeDetection ? "ok" : "warning"}">${spatialMap.features.planeDetection ? "YES" : "NO"}</span><br>
    hit-test: <span class="${spatialMap.features.hitTest ? "ok" : "warning"}">${spatialMap.features.hitTest ? "YES" : "NO"}</span><br>
    depth-sensing: <span class="${spatialMap.features.depthSensing ? "ok" : "warning"}">${spatialMap.features.depthSensing ? "YES" : "NO"}</span>`;

  html += `<div class="section">FRAME STATISTICS</div>
    frames: ${spatialMap.frames}<br>
    XR frames: ${spatialMap.xrFrames}<br>
    render frames: ${spatialMap.renderFrames}`;

  html += `<div class="section">CAMERA</div>
    position: ${escapeHtml(vectorText(camera.position))}<br>
    quaternion: ${escapeHtml(vectorText(camera.quaternion))}`;

  html += `<div class="section">PLANES</div>
    total: ${planes.length}<br>
    floor: ${floors.length}<br>
    walls: ${walls.length}<br>
    ceiling: ${ceilings.length}<br>
    horizontal: ${horizontals.length}<br>
    tracked: ${planes.length}`;

  html += `<div class="section">DEPTH</div>
    usage: ${escapeHtml(spatialMap.depth.usage || "none")}<br>
    format: ${escapeHtml(spatialMap.depth.format || "none")}<br>
    resolution: ${spatialMap.depth.width ? spatialMap.depth.width + " × " + spatialMap.depth.height : "n/a"}<br>
    rawValueToMeters: ${fmt(spatialMap.depth.rawValueToMeters, 6)}<br>
    depth frames: ${spatialMap.depth.frames}<br>
    samples: ${spatialMap.depth.samples}<br>
    world points: ${spatialMap.depth.worldPoints}`;

  html += `<div class="section">HIT TEST</div>
    available: ${spatialMap.hitTest.available}<br>
    hits: ${spatialMap.hitTest.hits}`;

  if (spatialMap.hitTest.position) {
    html += `<br>position: ${escapeHtml(vectorText(spatialMap.hitTest.position))}<br>distance: ${fmt(spatialMap.hitTest.distance, 3)} m`;
  }

  html += `<div class="section">PLANES DETAIL</div>`;
  planes.sort((a, b) => b.area - a.area);

  for (const plane of planes) {
    const className = plane.classification === "floor" ? "floor" : plane.classification === "wall" ? "wall" : "other";
    html += `<div class="plane ${className}">
      <b>${escapeHtml(plane.classification)}</b><br>
      id: ${escapeHtml(plane.id)}<br>
      orientation: ${escapeHtml(plane.orientation)}<br>
      center: ${escapeHtml(vectorText(plane.center))}<br>
      normal: ${escapeHtml(vectorText(plane.normal))}<br>
      vertices: ${plane.vertexCount}<br>
      area: ${fmt(plane.area, 3)} m²<br>
      size: ${fmt(plane.width, 3)} × ${fmt(plane.height, 3)} m<br>
      updates: ${plane.updates}<br>
      lastChangedTime: ${escapeHtml(plane.lastChangedTime ?? "n/a")}
    </div>`;
  }

  html += `<div class="section">DEPTH CLOUD</div>
    point cloud: ${spatialMap.depth.worldPoints}<br>
    max: ${CONFIG.maxDepthPoints}<br>
    sample step: ${CONFIG.depthSampleStep}<br>
    max distance: ${CONFIG.depthMaxDistance} m`;

  if (session) {
    const inputs = getInputSourceInfo(session);
    html += `<div class="section">INPUT SOURCES</div>`;
    for (const input of inputs) {
      html += `handedness: ${escapeHtml(input.handedness)}<br>
        targetRayMode: ${escapeHtml(input.targetRayMode)}<br>
        profiles: ${escapeHtml(input.profiles.join(", "))}<br><br>`;
    }
  }

  debugContent.innerHTML = html;
}

/* ============================================================
   START XR
   ============================================================ */

async function onSessionStarted(session) {
  currentSession = session;
  spatialMap.startedAt = new Date().toISOString();
  spatialMap.features.localFloor = true;
  spatialMap.session.active = true;
  updateSessionInfo(session);

  session.addEventListener("end", onSessionEnded);
  await initializeHitTest(session);

  console.log("[SpatialScanner] XR session started");
  console.log("[SpatialScanner] session:", session);
  console.log("[SpatialScanner] depthUsage:", session.depthUsage);
  console.log("[SpatialScanner] depthDataFormat:", session.depthDataFormat);
  console.log("[SpatialScanner] inputSources:", getInputSourceInfo(session));

  updateDebug();
}

/* ============================================================
   END XR
   ============================================================ */

function onSessionEnded() {
  currentSession = null;
  hitTestSource = null;
  viewerSpace = null;
  spatialMap.session.active = false;
  spatialMap.features.hitTest = false;
  spatialMap.features.depthSensing = false;
  spatialMap.hitTest.available = false;
  console.log("[SpatialScanner] XR session ended");
  updateDebug();
}

/* ============================================================
   AR SESSION OPTIONS
   ============================================================ */

const sessionInit = {
  requiredFeatures: ["local-floor", "plane-detection"],
  optionalFeatures: ["hit-test", "depth-sensing", "dom-overlay"],
  domOverlay: { root: document.body },
  depthSensing: {
    usagePreference: ["cpu-optimized", "gpu-optimized"],
    dataFormatPreference: ["luminance-alpha", "float32"]
  }
};

/* ============================================================
   AR BUTTON
   ============================================================ */

const arButton = ARButton.createButton(renderer, sessionInit);
document.body.appendChild(arButton);

/* ============================================================
   XR SUPPORT CHECK
   ============================================================ */

async function checkWebXR() {
  if (!navigator.xr) {
    spatialMap.session.supported = false;
    debugContent.innerHTML = `
      <div class="error">WebXR is not available.</div>
      <br>navigator.xr = undefined<br><br>
      Use a WebXR-compatible mobile browser and HTTPS.
    `;
    return;
  }

  try {
    const supported = await navigator.xr.isSessionSupported("immersive-ar");
    spatialMap.session.supported = supported;

    if (!supported) {
      debugContent.innerHTML = `
        <div class="warning">immersive-ar is not supported</div>
        <br>WebXR exists, but this browser/device cannot start immersive AR.
      `;
      return;
    }

    debugContent.innerHTML = `
      <div class="ok">immersive-ar supported</div>
      <br>Press the AR button.<br><br>
      Move the camera slowly around the room to allow the device to detect surfaces.
    `;
  } catch (error) {
    console.error(error);
    debugContent.innerHTML = `
      <div class="error">WebXR support check failed</div>
      <br>${escapeHtml(error.message || String(error))}
    `;
  }
}

checkWebXR();

/* ============================================================
   XR SESSION DETECTION
   ============================================================ */

function checkSession() {
  const session = renderer.xr.getSession();
  if (session && session !== currentSession) {
    onSessionStarted(session);
  }
}

/* ============================================================
   MAIN RENDER LOOP
   ============================================================ */

function render(time, frame) {
  spatialMap.frames++;
  spatialMap.renderFrames++;

  checkSession();

  const xrFrame = frame || renderer.xr.getFrame();
  if (xrFrame) {
    spatialMap.xrFrames++;
    try { updatePlanes(xrFrame); } catch (error) { console.error("[SpatialScanner] plane error:", error); }
    try { updateHitTest(xrFrame); } catch (error) { console.error("[SpatialScanner] hit test error:", error); }
    try { collectDepth(xrFrame); } catch (error) { console.error("[SpatialScanner] depth error:", error); }
  }

  try { updateCameraInfo(); } catch (error) { console.error("[SpatialScanner] camera error:", error); }

  spatialMap.lastUpdate = new Date().toISOString();

  if (spatialMap.frames % CONFIG.debugUpdateInterval === 0) {
    updateDebug();
  }

  renderer.render(scene, camera);
}

/* ============================================================
   EXPORT SPATIAL MAP
   ============================================================ */

function buildExportData() {
  return {
    ...spatialMap,
    exportedAt: new Date().toISOString(),
    statistics: {
      planes: Object.keys(spatialMap.planes).length,
      floors: Object.values(spatialMap.planes).filter(p => p.classification === "floor").length,
      walls: Object.values(spatialMap.planes).filter(p => p.classification === "wall").length,
      ceiling: Object.values(spatialMap.planes).filter(p => p.classification === "ceiling").length,
      depthPoints: spatialMap.depth.worldPoints
    }
  };
}

/* ============================================================
   EXPORT BUTTON
   ============================================================ */

document.getElementById("exportButton").addEventListener("click", () => {
  const data = buildExportData();
  const json = JSON.stringify(data, null, 2);
  console.log("[SpatialScanner] SPATIAL MAP:", data);

  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "webxr-spatial-map.json";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

/* ============================================================
   CLEAR DEPTH CLOUD
   ============================================================ */

document.getElementById("clearButton").addEventListener("click", () => {
  spatialMap.depth.samples = 0;
  spatialMap.depth.worldPoints = 0;
  depthGeometry.setDrawRange(0, 0);
  depthGeometry.getAttribute("position").needsUpdate = true;
  console.log("[SpatialScanner] point cloud cleared");
  updateDebug();
});

/* ============================================================
   GLOBAL DEBUG API
   ============================================================ */

window.spatialMap = spatialMap;
window.exportSpatialMap = buildExportData;
window.spatialScanner = {
  getMap() { return spatialMap; },
  getPlanes() { return Object.values(spatialMap.planes); },
  getFloorPlanes() { return Object.values(spatialMap.planes).filter(p => p.classification === "floor"); },
  getWalls() { return Object.values(spatialMap.planes).filter(p => p.classification === "wall"); },
  getDepthPointCount() { return spatialMap.depth.worldPoints; },
  export() { return buildExportData(); }
};

/* ============================================================
   RESIZE
   ============================================================ */

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ============================================================
   DEBUG PANEL TOGGLE
   ============================================================ */

const debugPanel = document.getElementById("debug");
const debugToggleBtn = document.getElementById("debugToggle");
const debugEarBtn = document.getElementById("debugEar");

function setDebugCollapsed(collapsed) {
  if (!debugPanel) return;
  debugPanel.classList.toggle("collapsed", collapsed);
  if (debugToggleBtn) {
    debugToggleBtn.textContent = collapsed ? "▶" : "◀";
    debugToggleBtn.title = collapsed ? "Развернуть лог" : "Свернуть лог";
    debugToggleBtn.setAttribute("aria-label", debugToggleBtn.title);
  }
}

function toggleDebugPanel() {
  if (!debugPanel) return;
  setDebugCollapsed(!debugPanel.classList.contains("collapsed"));
}

if (debugToggleBtn) {
  debugToggleBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleDebugPanel();
  });
}

if (debugEarBtn) {
  debugEarBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDebugCollapsed(false);
  });
}

/* ============================================================
   INITIAL LOG
   ============================================================ */

console.log("%cWEBXR SPATIAL SCANNER", "font-size:18px;font-weight:bold");
console.log("Spatial map:", "window.spatialMap");
console.log("Scanner API:", "window.spatialScanner");
console.log("Export:", "window.exportSpatialMap()");
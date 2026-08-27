import * as THREE from "three";
import { CONFIG } from "./config.js";
import { spatialMap } from "./spatialMap.js";
import { depthPointGroup } from "./scene.js";
import { depthPointMaterial } from "./materials.js";

let lastDepthUpdateFrame = -1;

// Depth geometry and points
const depthGeometry = new THREE.BufferGeometry();
const depthPositions = new Float32Array(CONFIG.maxDepthPoints * 3);
depthGeometry.setAttribute("position", new THREE.BufferAttribute(depthPositions, 3));
depthGeometry.setDrawRange(0, 0);

export const depthPoints = new THREE.Points(depthGeometry, depthPointMaterial);
depthPointGroup.add(depthPoints);

function hasDepthSupport(session) {
  if (!session) return false;
  if (typeof session.depthUsage !== "string") return false;
  if (session.depthUsage !== "cpu-optimized") return false;
  return true;
}

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

export function collectDepth(frame, renderer) {
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

export function clearDepthCloud() {
  spatialMap.depth.samples = 0;
  spatialMap.depth.worldPoints = 0;
  depthGeometry.setDrawRange(0, 0);
  depthGeometry.getAttribute("position").needsUpdate = true;
}
import * as THREE from "three";
import { CONFIG } from "./config.js";
import { spatialMap } from "./spatialMap.js";
import { hitTestGroup } from "./scene.js";

let hitTestSource = null;
let viewerSpace = null;

export async function initializeHitTest(session) {
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

export function updateHitTest(frame, renderer) {
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

export function resetHitTest() {
  hitTestSource = null;
  viewerSpace = null;
}
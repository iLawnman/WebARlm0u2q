import * as THREE from "three";

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
export const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: "high-performance"
});

export function initScene() {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.5));
}

export function setupResize() {
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// Visual groups
export const planeGroup = new THREE.Group();
export const planeEdgeGroup = new THREE.Group();
export const planeNormalGroup = new THREE.Group();
export const planeCenterGroup = new THREE.Group();
export const depthPointGroup = new THREE.Group();
export const floorGridGroup = new THREE.Group();
export const hitTestGroup = new THREE.Group();

export function initGroups() {
  scene.add(planeGroup);
  scene.add(planeEdgeGroup);
  scene.add(planeNormalGroup);
  scene.add(planeCenterGroup);
  scene.add(depthPointGroup);
  scene.add(floorGridGroup);
  scene.add(hitTestGroup);
}
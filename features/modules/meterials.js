import * as THREE from "three";
import { CONFIG } from "./config.js";

export const floorMaterial = new THREE.MeshBasicMaterial({
  color: 0x00ff00,
  transparent: true,
  opacity: 0.18,
  side: THREE.DoubleSide,
  depthWrite: false
});

export const wallMaterial = new THREE.MeshBasicMaterial({
  color: 0x0088ff,
  transparent: true,
  opacity: 0.15,
  side: THREE.DoubleSide,
  depthWrite: false
});

export const horizontalMaterial = new THREE.MeshBasicMaterial({
  color: 0xffff00,
  transparent: true,
  opacity: 0.13,
  side: THREE.DoubleSide,
  depthWrite: false
});

export const otherMaterial = new THREE.MeshBasicMaterial({
  color: 0xff00ff,
  transparent: true,
  opacity: 0.12,
  side: THREE.DoubleSide,
  depthWrite: false
});

export const edgeMaterial = new THREE.LineBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.8
});

export const normalMaterial = new THREE.LineBasicMaterial({
  color: 0xff3333
});

export const centerMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff
});

export const depthPointMaterial = new THREE.PointsMaterial({
  color: 0xffffff,
  size: CONFIG.pointSize,
  sizeAttenuation: true,
  transparent: true,
  opacity: 0.8,
  depthWrite: false
});
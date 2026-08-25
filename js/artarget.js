// artarget.js - Main entry point
import { ModelFactory } from './arobjects.js';

// Singleton instance for convenience functions
const defaultFactory = new ModelFactory();

export function createArTargetSync(targetData, options = {}) {
  return defaultFactory.createArTargetSync(targetData, options);
}

export async function createArTarget(targetData, options = {}) {
  return await defaultFactory.createArTarget(targetData, options);
}

export function setArTargetDesignPrefab(prefab) {
  defaultFactory.setDesignPrefab(prefab);
}

export function getArTargetDesignPrefab() {
  return defaultFactory.getDesignPrefab();
}

/**
 * Связывает singleton ModelFactory с реальными renderer/scene/camera
 * WebXR-сцены. Без этого вызова panelCreator.renderer/scene/camera
 * остаются null, и если createArTarget(Sync) вызовут без явного arInput,
 * ARPanelCreator/arobjects.js создадут fallback ARInput с camera=null,
 * из-за чего raycaster.setFromCamera() будет падать при каждом клике
 * (клики по AR-таргету не будут работать).
 * Вызывать один раз при старте приложения, сразу после создания ARScene.
 */
export function setArTargetContext(renderer, scene, camera) {
  defaultFactory.setRenderer(renderer);
  defaultFactory.setScene(scene);
  defaultFactory.setCamera(camera);
}

export async function preloadArTargetPrefab(url, ui = null) {
  const prefabUrl = url || defaultFactory.prefabUrl;
  console.log('[ModelFactory] preloadArTargetPrefab: preloading', prefabUrl);
  if (ui) ui.log(`[ModelFactory] Preloading AR target prefab: ${prefabUrl}`, 'info');
  await defaultFactory._ensurePrefab(prefabUrl, ui);
  const source = defaultFactory._prefabSource;
  console.log('[ModelFactory] preloadArTargetPrefab: done, source =', source);
  if (ui) ui.log(`[ModelFactory] Prefab preload done, source = ${source}`, source === 'server' ? 'ok' : 'warn');
  return source;
}

export async function preloadArTargetDesign(ui = null) {
  console.log('[ModelFactory] preloadArTargetDesign: preloading design JSON');
  if (ui) ui.log('[ModelFactory] Preloading AR target design JSON...', 'info');
  await defaultFactory._autoLoadDesignIfNeeded(ui);
  const prefab = defaultFactory.getDesignPrefab();
  console.log('[ModelFactory] preloadArTargetDesign: done, design prefab =', prefab ? 'SET' : 'NOT SET');
  if (ui) ui.log(`[ModelFactory] Design preload done: ${prefab ? 'design applied' : 'no design JSON found'}`, prefab ? 'ok' : 'warn');
  return prefab;
}
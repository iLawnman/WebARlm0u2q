// artarget.js - Main entry point
import { ModelFactory } from './arobjects.js';
import { ARModalManager } from './armodal.js';

// Singleton instance for convenience functions
const defaultFactory = new ModelFactory();
const modalManager = new ARModalManager();

export function createArTargetSync(targetData, options = {}) {
  const target = defaultFactory.createArTargetSync(targetData, options);
  
  // Если переданы данные для модального окна — инициализируем при старте
  if (targetData && (targetData.story || targetData.legend || targetData.intro || targetData.title)) {
    modalManager.setupModal(document.body, targetData, options.ui);
  }
  
  return target;
}

export async function createArTarget(targetData, options = {}) {
  const target = await defaultFactory.createArTarget(targetData, options);
  
  // Инициализация модального окна при вызове асинхронной сборки
  if (targetData && (targetData.story || targetData.legend || targetData.intro || targetData.title)) {
    modalManager.setupModal(document.body, targetData, options.ui);
  }

  return target;
}

export function setArTargetDesignPrefab(prefab) {
  defaultFactory.setDesignPrefab(prefab);
}

export function getArTargetDesignPrefab() {
  return defaultFactory.getDesignPrefab();
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
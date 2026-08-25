// artarget.js - Main entry point
import { ModelFactory } from './arobjects.js';

// Re-exported so modelfactory.js's `export { ModelFactory } from './artarget.js'`
// actually resolves - it was importing this name before too, but this file
// never re-exported it (pre-existing gap, unrelated to the mesh-ui refactor).
export { ModelFactory };

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

// modelfactory.js already re-exported this name, but artarget.js never
// defined it - ARPanel.designGroupsToPrefab is a plain data function
// (design JSON -> prefab tokens), exposed here the same way it always
// should have been.
export function designGroupsToPrefab(groups) {
  return defaultFactory.panel.designGroupsToPrefab(groups);
}

/**
 * Связывает singleton ModelFactory с ARScene.
 *
 * BREAKING CHANGE (mesh-ui refactor): раньше принимал (renderer, scene,
 * camera) и прокидывал их в panelCreator, потому что raycasting жил в
 * ARInput и собирался вручную из этих трёх объектов. Теперь raycasting
 * встроен в саму ARScene (arscene.js), а panel-блоки регистрируются на
 * ней напрямую, поэтому фабрике нужен сам инстанс ARScene, а не его
 * внутренности по отдельности.
 *
 * Было:  setArTargetContext(renderer, scene, camera)
 * Стало: setArTargetContext(arScene)
 *
 * Без этого вызова createArTarget(Sync) всё ещё построит панель, но её
 * кнопки не будут кликабельны (ModelFactory сам залогирует warning).
 * Вызывать один раз при старте приложения, сразу после создания ARScene.
 */
export function setArTargetContext(arScene) {
  defaultFactory.setARScene(arScene);
}

/**
 * DEPRECATED - no-op.
 *
 * Раньше предзагружал внешний HTML-префаб (artargetPrefabNew.html) через
 * ARPanelCreator._ensurePrefab(). В mesh-ui версии панель строится напрямую
 * из three-mesh-ui.Block/Text без каких-либо HTML-шаблонов, поэтому
 * предзагружать больше нечего. Функция оставлена, чтобы существующие
 * `import { preloadArTargetPrefab }` не падали - она просто логирует
 * предупреждение и сразу резолвится.
 *
 * Если вызывающий код проверяет возвращаемое значение (раньше это было
 * 'server' | 'fallback'), теперь всегда возвращается 'mesh-ui'.
 */
export async function preloadArTargetPrefab(url, ui = null) {
  const msg = '[ModelFactory] preloadArTargetPrefab is deprecated and does nothing after the mesh-ui refactor (panels are no longer built from an HTML prefab)';
  console.warn(msg);
  if (ui) ui.log(msg, 'warn');
  return 'mesh-ui';
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

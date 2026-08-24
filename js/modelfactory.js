/**
 * Тонкая обёртка. Вся логика изолирована в artarget.js.
 * Оставляем файл для обратной совместимости импортов.
 */
export {
  ModelFactory,
  createArTarget,
  createArTargetSync,
  designGroupsToPrefab,
  setArTargetDesignPrefab,
  getArTargetDesignPrefab,
  preloadArTargetPrefab,
  preloadArTargetDesign
} from './artarget.js';

// Экспорт по умолчанию для обратной совместимости
export { ModelFactory as default } from './artarget.js';
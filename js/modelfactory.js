/**
 * Тонкая обёртка. Вся логика изолирована в artarget.js.
 * Оставляем файл для обратной совместимости импортов.
 */
export {
  ModelFactory,
  createArTarget,
  createArTargetSync,
  default,
  designGroupsToPrefab,
  setArTargetDesignPrefab,
  getArTargetDesignPrefab
} from './artarget.js';
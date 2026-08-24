// js/uiinput.js
import { playSound } from './audio.js';

export class UIInput {
  constructor(ui) {
    this.ui = ui;
    this._touchHandler = null;
    this._globalClickHandler = null;
  }

  /**
   * Включает отслеживание касаний/кликов для DOM UI и оверлеев.
   */
  attach() {
    this.detach();

    // Захват касаний до Canvas / WebXR
    this._touchHandler = (e) => {
      const touch = e.touches[0];
      if (touch) {
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        const tag = target ? `${target.tagName}.${target.className}` : 'null';
        if (this.ui) {
          this.ui.log(`[UIInput TouchStart] (${Math.round(touch.clientX)},${Math.round(touch.clientY)}) -> ${tag}`, 'info');
        }
      }
    };
    window.addEventListener('touchstart', this._touchHandler, { capture: true, passive: true });

    // Глобальное отслеживание промахов (кликов мимо кнопок)
    this._globalClickHandler = (e) => {
      const isButton = e.target.closest('button, input, .ar-css3d-panel');
      if (!isButton) {
        if (this.ui) {
          this.ui.log(`[UIInput Global Miss] Click at (${e.clientX}, ${e.clientY}) on tag: ${e.target.tagName}`, 'warn');
        }
        playSound('miss');
      }
    };
    window.addEventListener('click', this._globalClickHandler);

    if (this.ui) {
      this.ui.log('[UIInput] Listeners attached', 'info');
    }
  }

  /**
   * Отключает слушатели событий UI.
   */
  detach() {
    if (this._touchHandler) {
      window.removeEventListener('touchstart', this._touchHandler, { capture: true });
      this._touchHandler = null;
    }
    if (this._globalClickHandler) {
      window.removeEventListener('click', this._globalClickHandler);
      this._globalClickHandler = null;
    }
  }
}
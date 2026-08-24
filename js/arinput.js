// js/arinput.js
import { playSound } from './audio.js';

export class ARInput {
  constructor(ui) {
    this.ui = ui;
  }

  /**
   * Панель: stopPropagation только если клик НЕ по интерактивному потомку.
   */
  bindPanelEvents(element, panelName) {
    element.style.pointerEvents = 'auto';
    element.style.touchAction = 'manipulation';

    const interactiveSelector = [
      'button',
      'input',
      'textarea',
      'select',
      'a',
      '.ar-quest-btn',
      '.ar-quest-submit-btn',
      '.ar-slide-nav',
      '.ar-quest-input',
      '.ar-quest-ok-btn'
    ].join(',');

    const handler = (e) => {
      const isInteractive = !!e.target.closest(interactiveSelector);

      if (this.ui) {
        this.ui.log(
            `[ARInput Panel Event] Panel '${panelName}' received: ${e.type}` +
            (isInteractive ? ` → INTERACTIVE (${e.target.tagName}/${e.target.className})` : ''),
            isInteractive ? 'ok' : 'info'
        );
      }

      if (!isInteractive) {
        e.stopPropagation();
      }
    };

    ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'click'].forEach((evt) => {
      element.addEventListener(evt, handler, { passive: false, capture: false });
    });
  }

  /**
   * Кнопки / интерактив
   */
  bindInteractiveEvent(element, btnName, callback) {
    if (!element) return;

    element.style.pointerEvents = 'auto';
    element.style.touchAction = 'manipulation';
    element.style.cursor = 'pointer';
    element.style.minWidth = '48px';
    element.style.minHeight = '40px';
    element.style.position = 'relative';
    element.style.zIndex = '50';

    const fire = (e) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (e.cancelable) e.preventDefault();

      if (this.ui) {
        this.ui.log(`[ARInput Button Pressed] '${btnName}' via ${e.type}`, 'ok');
      }
      playSound('click');
      callback(e);
    };

    element.addEventListener('click', fire);
    element.addEventListener('pointerup', (e) => {
      if (e.button === 0) fire(e);
    });

    // Ранняя блокировка всплытия
    element.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
    });
    element.addEventListener('touchstart', (e) => {
      e.stopPropagation();
    }, { passive: false });
  }

  bindInputField(inputElement) {
    if (!inputElement) return;
    inputElement.style.pointerEvents = 'auto';
    inputElement.style.touchAction = 'manipulation';

    const stop = (e) => {
      if (this.ui) this.ui.log(`[ARInput Input Event] ${e.type}`, 'info');
      e.stopPropagation();
    };

    ['click', 'pointerdown', 'touchstart', 'focus'].forEach((evt) => {
      inputElement.addEventListener(evt, stop);
    });
  }
}
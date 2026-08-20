// js/arinput.js
import { playSound } from './audio.js';

export class ARInput {
  constructor(ui) {
    this.ui = ui;
  }

  /**
   * Обработка событий на панели.
   * stopPropagation срабатывает ТОЛЬКО если клик НЕ по интерактивному элементу внутри.
   */
  bindPanelEvents(element, panelName) {
    element.style.pointerEvents = 'auto';
    element.style.touchAction = 'manipulation';

    const interactiveSelector = 'button, input, textarea, select, a, .ar-quest-btn, .ar-quest-submit-btn, .ar-slide-nav, .ar-quest-input';

    const handler = (e) => {
      const isInteractive = e.target.closest(interactiveSelector);

      if (this.ui) {
        this.ui.log(
            `[ARInput Panel Event] Panel '${panelName}' received: ${e.type}` +
            (isInteractive ? ` (interactive: ${e.target.tagName})` : ''),
            isInteractive ? 'ok' : 'info'
        );
      }

      // Останавливаем всплытие только для "пустых" кликов по панели
      if (!isInteractive) {
        e.stopPropagation();
      }
    };

    ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'click'].forEach((evt) => {
      element.addEventListener(evt, handler, { passive: false });
    });
  }

  /**
   * Интерактивные кнопки / элементы управления.
   */
  bindInteractiveEvent(element, btnName, callback) {
    if (!element) return;

    element.style.pointerEvents = 'auto';
    element.style.touchAction = 'manipulation';
    element.style.cursor = 'pointer';

    // Увеличиваем хит-зону на маленьких кнопках
    element.style.minWidth = element.style.minWidth || '44px';
    element.style.minHeight = element.style.minHeight || '36px';

    const handler = (e) => {
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();

      if (this.ui) {
        this.ui.log(`[ARInput Button Pressed] '${btnName}' via ${e.type}`, 'ok');
      }
      playSound('click');
      callback(e);
    };

    // Слушаем и click, и pointerup (для надёжности в AR/CSS3D)
    element.addEventListener('click', handler);
    element.addEventListener('pointerup', (e) => {
      // только если это был именно клик, а не drag
      if (e.button === 0) handler(e);
    });

    // Блокируем всплытие на ранних стадиях
    element.addEventListener('pointerdown', (e) => e.stopPropagation());
    element.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: false });
  }

  /**
   * Поля ввода
   */
  bindInputField(inputElement) {
    if (!inputElement) return;

    inputElement.style.pointerEvents = 'auto';
    inputElement.style.touchAction = 'manipulation';

    const stop = (e) => {
      if (this.ui) {
        this.ui.log(`[ARInput Input Event] ${e.type}`, 'info');
      }
      e.stopPropagation();
    };

    ['click', 'pointerdown', 'touchstart', 'focus'].forEach((evt) => {
      inputElement.addEventListener(evt, stop);
    });
  }
}
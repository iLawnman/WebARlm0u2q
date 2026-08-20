// js/arinput.js
import { playSound } from './audio.js';

export class ARInput {
  constructor(ui) {
    this.ui = ui;
  }

  /**
   * Настраивает обработку интерактивных событий на DOM-элементе AR-панели.
   * @param {HTMLElement} element 
   * @param {string} panelName 
   */
  bindPanelEvents(element, panelName) {
    element.style.pointerEvents = 'auto';

    const stopEvents = ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'click'];
    stopEvents.forEach((evt) => {
      element.addEventListener(evt, (e) => {
        if (this.ui) {
          this.ui.log(`[ARInput Panel Event] Panel '${panelName}' received: ${evt}`, 'info');
        }
        e.stopPropagation();
      });
    });
  }

  /**
   * Настраивает события для интерактивных кнопок и элементов управления AR.
   * @param {HTMLElement} element 
   * @param {string} btnName 
   * @param {Function} callback 
   */
  bindInteractiveEvent(element, btnName, callback) {
    element.style.pointerEvents = 'auto';
    element.style.touchAction = 'manipulation';

    const handler = (e) => {
      if (this.ui) {
        this.ui.log(`[ARInput Button Pressed] '${btnName}' via event: ${e.type}`, 'ok');
      }
      playSound('click');
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
      callback(e);
    };

    element.addEventListener('click', handler);
    element.addEventListener('pointerdown', (e) => e.stopPropagation());
    element.addEventListener('touchstart', (e) => e.stopPropagation());
  }

  /**
   * Настраивает логирование и предотвращение всплытия для полей ввода AR.
   * @param {HTMLInputElement} inputElement 
   */
  bindInputField(inputElement) {
    inputElement.style.pointerEvents = 'auto';

    const stopPropagation = (e) => {
      if (this.ui) {
        this.ui.log(`[ARInput Input Event] ${e.type}`, 'info');
      }
      e.stopPropagation();
    };

    inputElement.addEventListener('click', stopPropagation);
    inputElement.addEventListener('pointerdown', stopPropagation);
    inputElement.addEventListener('touchstart', stopPropagation);
  }
}
// js/arinput.js
import { playSound } from './audio.js';

export class ARInput {
  constructor(ui) {
    this.ui = ui;
    this._interactiveElements = new WeakSet();
  }

  /**
   * Панель: полностью пропускаем интерактивные элементы
   */
  bindPanelEvents(element, panelName) {
    console.log(`[ARInput] bindPanelEvents called for: ${panelName}`, element);
    
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
      '.ar-quest-ok-btn',
      '.modal-close-btn'
    ].join(',');

    // Обработчик для capture фазы
    const captureHandler = (e) => {
      const target = e.target;
      const isInteractive = !!target.closest(interactiveSelector);
      
      console.log(`[ARInput Panel] ${panelName}: event ${e.type} on ${target.tagName}/${target.className}, interactive: ${isInteractive}`);
      
      // Если клик по интерактивному элементу — полностью пропускаем
      if (isInteractive) {
        if (this.ui) {
          this.ui.log(
            `[ARInput Panel] ${panelName}: interactive click detected (${target.tagName}/${target.className}) → letting through`,
            'info'
          );
        }
        return; // Не вызываем stopPropagation
      }

      // Если клик по не-интерактивной области панели — останавливаем
      if (this.ui) {
        this.ui.log(
          `[ARInput Panel] ${panelName}: non-interactive click → stopping propagation`,
          'info'
        );
      }
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
    };

    // Навешиваем на capture фазу
    element.addEventListener('pointerdown', captureHandler, true);
    element.addEventListener('pointerup', captureHandler, true);
    element.addEventListener('click', captureHandler, true);
    element.addEventListener('touchstart', captureHandler, { passive: false, capture: true });
    element.addEventListener('touchend', captureHandler, { passive: false, capture: true });
    
    console.log(`[ARInput] bindPanelEvents complete for: ${panelName}`);
  }

  /**
   * Кнопки / интерактив — навешиваем на capture фазе с высоким приоритетом
   */
  bindInteractiveEvent(element, btnName, callback) {
    console.log(`[ARInput] bindInteractiveEvent called for: ${btnName}`, element);
    
    if (!element) {
      console.warn(`[ARInput] bindInteractiveEvent: element is null for ${btnName}`);
      return;
    }

    // Принудительно устанавливаем стили для перехвата событий
    element.style.pointerEvents = 'auto !important';
    element.style.touchAction = 'manipulation !important';
    element.style.cursor = 'pointer !important';
    element.style.minWidth = '48px';
    element.style.minHeight = '40px';
    element.style.position = 'relative';
    element.style.zIndex = '99999 !important';
    
    // Для кнопок с textContent пустым (как крестик) добавляем padding
    if (!element.textContent.trim() || element.textContent === '✕') {
      element.style.padding = '8px';
      element.style.fontSize = '20px';
      element.style.lineHeight = '1';
    }

    // Помечаем элемент как интерактивный
    this._interactiveElements.add(element);

    const fire = (e) => {
      console.log(`[ARInput] fire called for: ${btnName}, event: ${e.type}`);
      console.log(`[ARInput] Event details:`, {
        type: e.type,
        target: e.target,
        currentTarget: e.currentTarget,
        button: e.button,
        clientX: e.clientX,
        clientY: e.clientY
      });
      
      // Останавливаем всплытие на всех фазах
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (e.cancelable) e.preventDefault();

      if (this.ui) {
        this.ui.log(`[ARInput Button Pressed] '${btnName}' via ${e.type}`, 'ok');
      }
      playSound('click');
      callback(e);
    };

    // Навешиваем на capture фазе
    element.addEventListener('click', fire, true);
    element.addEventListener('pointerup', (e) => {
      console.log(`[ARInput] pointerup for: ${btnName}, button: ${e.button}`);
      if (e.button === 0) fire(e);
    }, true);

    // Блокируем всплытие pointerdown/touchstart на capture фазе
    element.addEventListener('pointerdown', (e) => {
      console.log(`[ARInput] pointerdown for: ${btnName}`);
      e.stopPropagation();
      e.stopImmediatePropagation();
    }, true);
    
    element.addEventListener('touchstart', (e) => {
      console.log(`[ARInput] touchstart for: ${btnName}`);
      console.log(`[ARInput] Touch details:`, {
        touches: e.touches?.length,
        changedTouches: e.changedTouches?.length
      });
      e.stopPropagation();
      e.stopImmediatePropagation();
    }, { passive: false, capture: true });
    
    // Для мобильных устройств - дополнительный обработчик touchend
    element.addEventListener('touchend', (e) => {
      console.log(`[ARInput] touchend for: ${btnName}`);
      console.log(`[ARInput] Touch end details:`, {
        changedTouches: e.changedTouches?.length
      });
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (e.cancelable) e.preventDefault();
      fire(e);
    }, { passive: false, capture: true });
    
    // ДОБАВЛЯЕМ: прямой обработчик для отладки
    element.addEventListener('mousedown', (e) => {
      console.log(`[ARInput] mousedown for: ${btnName}, button: ${e.button}`);
    }, true);
    
    element.addEventListener('mouseup', (e) => {
      console.log(`[ARInput] mouseup for: ${btnName}, button: ${e.button}`);
    }, true);
    
    console.log(`[ARInput] bindInteractiveEvent complete for: ${btnName}`);
  }

  bindInputField(inputElement) {
    console.log('[ARInput] bindInputField called', inputElement);
    
    if (!inputElement) return;
    inputElement.style.pointerEvents = 'auto';
    inputElement.style.touchAction = 'manipulation';

    // Помечаем как интерактивный
    this._interactiveElements.add(inputElement);

    const stop = (e) => {
      console.log(`[ARInput Input Event] ${e.type} on ${inputElement.tagName}`);
      if (this.ui) this.ui.log(`[ARInput Input Event] ${e.type}`, 'info');
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    // Навешиваем на capture фазе
    ['click', 'pointerdown', 'touchstart', 'focus'].forEach((evt) => {
      inputElement.addEventListener(evt, stop, true);
    });
    
    console.log('[ARInput] bindInputField complete');
  }
}
// js/arinput.js
import { playSound } from './audio.js';

export class ARInput {
  constructor(ui) {
    this.ui = ui;
    this._interactiveElements = new WeakSet();
  }

  /**
   * Панель: stopPropagation только если клик НЕ по интерактивному потомку.
   * Используем capture фазу для раннего перехвата
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
      '.ar-quest-ok-btn',
      '.modal-close-btn'
    ].join(',');

    // Обработчик для capture фазы — проверяем, является ли цель интерактивной
    const captureHandler = (e) => {
      const target = e.target;
      const isInteractive = !!target.closest(interactiveSelector);
      
      // Если клик по интерактивному элементу — НЕ останавливаем распространение
      // и НЕ предотвращаем дефолтное поведение, чтобы событие дошло до кнопки
      if (isInteractive) {
        if (this.ui) {
          this.ui.log(
            `[ARInput Panel] ${panelName}: interactive click detected (${target.tagName}/${target.className}) → letting through`,
            'info'
          );
        }
        // Не вызываем stopPropagation, не вызываем preventDefault
        return;
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

    // Навешиваем на capture фазу (true), чтобы перехватить ДО всплытия
    element.addEventListener('pointerdown', captureHandler, true);
    element.addEventListener('pointerup', captureHandler, true);
    element.addEventListener('click', captureHandler, true);
    element.addEventListener('touchstart', captureHandler, { passive: false, capture: true });
    element.addEventListener('touchend', captureHandler, { passive: false, capture: true });

    // Также сохраняем обработчик для bubble фазы (для не-интерактивных кликов,
    // которые не были остановлены в capture)
    const bubbleHandler = (e) => {
      const target = e.target;
      const isInteractive = !!target.closest(interactiveSelector);
      
      if (isInteractive) {
        return; // Пропускаем интерактивные
      }
      
      // Для не-интерактивных — останавливаем, если еще не остановлено
      if (!e.defaultPrevented) {
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();
      }
    };

    element.addEventListener('click', bubbleHandler);
    element.addEventListener('pointerup', bubbleHandler);
  }

  /**
   * Кнопки / интерактив — навешиваем на capture фазе с высоким приоритетом
   */
  bindInteractiveEvent(element, btnName, callback) {
    if (!element) return;

    // Принудительно устанавливаем стили для перехвата событий
    element.style.pointerEvents = 'auto !important';
    element.style.touchAction = 'manipulation !important';
    element.style.cursor = 'pointer !important';
    element.style.minWidth = '48px';
    element.style.minHeight = '40px';
    element.style.position = 'relative';
    element.style.zIndex = '9999 !important';
    
    // Для кнопок с textContent пустым (как крестик) добавляем padding
    if (!element.textContent.trim() || element.textContent === '✕') {
      element.style.padding = '8px';
      element.style.fontSize = '20px';
      element.style.lineHeight = '1';
    }

    // Помечаем элемент как интерактивный
    this._interactiveElements.add(element);

    const fire = (e) => {
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

    // Навешиваем на capture фазе, чтобы перехватить ДО панели
    element.addEventListener('click', fire, true);
    element.addEventListener('pointerup', (e) => {
      if (e.button === 0) fire(e);
    }, true);

    // Блокируем всплытие pointerdown/touchstart на capture фазе
    element.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
    }, true);
    
    element.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
    }, { passive: false, capture: true });
    
    // Для мобильных устройств - дополнительный обработчик touchend
    element.addEventListener('touchend', (e) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (e.cancelable) e.preventDefault();
      fire(e);
    }, { passive: false, capture: true });
  }

  bindInputField(inputElement) {
    if (!inputElement) return;
    inputElement.style.pointerEvents = 'auto';
    inputElement.style.touchAction = 'manipulation';

    // Помечаем как интерактивный
    this._interactiveElements.add(inputElement);

    const stop = (e) => {
      if (this.ui) this.ui.log(`[ARInput Input Event] ${e.type}`, 'info');
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    // Навешиваем на capture фазе
    ['click', 'pointerdown', 'touchstart', 'focus'].forEach((evt) => {
      inputElement.addEventListener(evt, stop, true);
    });
  }
}
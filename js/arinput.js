// js/arinput.js
import { playSound } from './audio.js';
import * as THREE from 'three';

export class ARInput {
  constructor(ui, renderer, scene, camera) {
    this.ui = ui;
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this._interactiveElements = new WeakSet();
    this._raycaster = new THREE.Raycaster();
    this._pointer = new THREE.Vector2();
    this._cssObjects = [];
    this._isInitialized = false;
  }

  /**
   * Инициализация: добавляем CSS3D объекты в массив для raycast
   */
  init(cssObjects = []) {
    console.log('[ARInput] init called with', cssObjects.length, 'CSS objects');
    this._cssObjects = cssObjects;
    this._isInitialized = true;
    
    // Добавляем глобальные обработчики событий
    this._setupGlobalListeners();
  }

  /**
   * Добавляем CSS3D объект для отслеживания
   */
  addCSSObject(cssObject) {
    console.log('[ARInput] addCSSObject', cssObject);
    if (cssObject && !this._cssObjects.includes(cssObject)) {
      this._cssObjects.push(cssObject);
    }
  }

  /**
   * Настройка глобальных обработчиков для захвата событий из 3D сцены
   */
  _setupGlobalListeners() {
    console.log('[ARInput] Setting up global listeners for 3D scene');
    
    // Для десктопа - события мыши
    const canvas = this.renderer?.domElement;
    if (canvas) {
      console.log('[ARInput] Found renderer canvas', canvas);
      
      canvas.addEventListener('click', this._onCanvasEvent.bind(this), true);
      canvas.addEventListener('pointerdown', this._onCanvasEvent.bind(this), true);
      canvas.addEventListener('pointerup', this._onCanvasEvent.bind(this), true);
      canvas.addEventListener('touchstart', this._onCanvasEvent.bind(this), true);
      canvas.addEventListener('touchend', this._onCanvasEvent.bind(this), true);
      
      console.log('[ARInput] Canvas event listeners added');
    } else {
      console.warn('[ARInput] No renderer canvas found');
      // Если нет canvas, пробуем на window
      window.addEventListener('click', this._onWindowEvent.bind(this), true);
      window.addEventListener('touchstart', this._onWindowEvent.bind(this), true);
    }
  }

  /**
   * Обработка событий на canvas (3D сцена)
   */
  _onCanvasEvent(e) {
    console.log('[ARInput] Canvas event:', e.type, e);
    
    if (!this._isInitialized) {
      console.warn('[ARInput] Not initialized yet');
      return;
    }
    
    // Получаем позицию клика на canvas
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
    this._pointer.set(x, y);
    
    // Делаем raycast
    this._raycaster.setFromCamera(this._pointer, this.camera);
    
    // Получаем все CSS3D объекты из сцены
    const cssObjects = this._getAllCSSObjects();
    console.log('[ARInput] Found', cssObjects.length, 'CSS objects in scene');
    
    if (cssObjects.length === 0) {
      console.warn('[ARInput] No CSS objects found');
      return;
    }
    
    // Проверяем пересечения с CSS3D объектами
    const intersects = this._raycaster.intersectObjects(cssObjects);
    console.log('[ARInput] Intersections:', intersects.length);
    
    if (intersects.length > 0) {
      // Берем первый попавшийся объект
      const hit = intersects[0];
      const cssObject = hit.object;
      
      console.log('[ARInput] Hit CSS object:', cssObject.name, cssObject);
      
      if (cssObject.element) {
        // Получаем координаты клика на элементе
        const elementRect = cssObject.element.getBoundingClientRect();
        const clickX = e.clientX - elementRect.left;
        const clickY = e.clientY - elementRect.top;
        
        console.log('[ARInput] Element click at:', clickX, clickY);
        
        // Создаем событие на элементе
        const eventOptions = {
          clientX: e.clientX,
          clientY: e.clientY,
          offsetX: clickX,
          offsetY: clickY,
          target: cssObject.element,
          currentTarget: cssObject.element
        };
        
        // Ищем кнопку внутри элемента по координатам
        const targetElement = this._findElementAt(cssObject.element, clickX, clickY);
        console.log('[ARInput] Found element at position:', targetElement);
        
        if (targetElement) {
          // Создаем событие для целевого элемента
          const newEvent = new Event(e.type, {
            bubbles: true,
            cancelable: true,
            composed: true
          });
          
          Object.assign(newEvent, eventOptions);
          newEvent.target = targetElement;
          newEvent.currentTarget = targetElement;
          
          console.log('[ARInput] Dispatching event to:', targetElement);
          targetElement.dispatchEvent(newEvent);
        }
      }
    }
  }

  /**
   * Fallback: обработка событий на window
   */
  _onWindowEvent(e) {
    console.log('[ARInput] Window event:', e.type, e);
    
    if (!this._isInitialized) {
      return;
    }
    
    // Проверяем, не кликнули ли по CSS3D элементу
    const target = e.target;
    if (target && target.closest) {
      const screen = target.closest('.ar-target-screen');
      if (screen) {
        console.log('[ARInput] Click on AR screen detected via window');
        // Находим кнопку закрытия
        const closeBtn = screen.querySelector('.modal-close-btn');
        if (closeBtn && (target === closeBtn || closeBtn.contains(target))) {
          console.log('[ARInput] ★★★ CLOSE BUTTON CLICKED! ★★★');
          closeBtn.dispatchEvent(new Event('click', { bubbles: true }));
        }
      }
    }
  }

  /**
   * Получает все CSS3D объекты из сцены
   */
  _getAllCSSObjects() {
    const objects = [];
    if (!this.scene) return objects;
    
    this.scene.traverse((child) => {
      if (child.isCSS3DObject) {
        objects.push(child);
      }
    });
    
    return objects;
  }

  /**
   * Находит элемент в CSS3D объекте по координатам
   */
  _findElementAt(root, x, y) {
    if (!root) return null;
    
    // Проверяем все интерактивные элементы
    const interactive = root.querySelectorAll('button, .modal-close-btn, .ar-quest-btn, .ar-quest-submit-btn');
    
    for (const el of interactive) {
      const rect = el.getBoundingClientRect();
      // Используем глобальные координаты
      // В CSS3D они могут быть смещены, поэтому используем более простой метод
      if (el === root.querySelector('.modal-close-btn')) {
        return el; // Возвращаем кнопку закрытия
      }
    }
    
    // Если не нашли, проверяем все дочерние элементы
    const allElements = root.querySelectorAll('*');
    for (const el of allElements) {
      if (el === root.querySelector('.modal-close-btn')) {
        return el;
      }
    }
    
    return null;
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
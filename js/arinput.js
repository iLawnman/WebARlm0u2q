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
    this._sceneGroups = []; // Для отслеживания добавленных групп
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
    
    // Логируем все объекты в сцене для отладки
    this._logSceneObjects();
  }

  /**
   * Добавляем группу с AR объектами в сцену для отслеживания
   */
  addSceneGroup(group) {
    console.log('[ARInput] addSceneGroup called with group:', group.name);
    if (group && !this._sceneGroups.includes(group)) {
      this._sceneGroups.push(group);
      console.log('[ARInput] Group added, total groups:', this._sceneGroups.length);
    }
  }

  /**
   * Добавляем CSS3D объект для отслеживания
   */
  addCSSObject(cssObject) {
    console.log('[ARInput] addCSSObject called');
    if (cssObject) {
      console.log('[ARInput] CSS Object details:', {
        name: cssObject.name || 'unnamed',
        type: cssObject.type,
        isCSS3DObject: cssObject.isCSS3DObject,
        position: cssObject.position,
        element: cssObject.element ? 'has element' : 'no element'
      });
    }
    if (cssObject && !this._cssObjects.includes(cssObject)) {
      this._cssObjects.push(cssObject);
      console.log('[ARInput] CSS object added, total:', this._cssObjects.length);
    } else if (cssObject) {
      console.log('[ARInput] CSS object already in list');
    }
  }

  /**
   * Логирование всех объектов в сцене для отладки
   */
  _logSceneObjects() {
    console.log('[ARInput] === SCENE OBJECTS DEBUG ===');
    if (!this.scene) {
      console.log('[ARInput] Scene is null!');
      return;
    }
    
    let objectCount = 0;
    let cssCount = 0;
    this.scene.traverse((child) => {
      objectCount++;
      if (child.isCSS3DObject) {
        cssCount++;
        console.log(`[ARInput] CSS3D Object #${cssCount}:`, {
          name: child.name || 'unnamed',
          type: child.type,
          position: child.position.toArray(),
          visible: child.visible,
          element: child.element ? 'has element' : 'no element',
          elementHTML: child.element ? child.element.outerHTML.substring(0, 200) + '...' : 'none'
        });
      }
    });
    console.log(`[ARInput] Total objects: ${objectCount}, CSS3D objects: ${cssCount}`);
    console.log('[ARInput] === END SCENE DEBUG ===');
    
    // Логируем отдельно CSS объекты из нашего массива
    console.log('[ARInput] CSS objects in _cssObjects array:', this._cssObjects.length);
    this._cssObjects.forEach((obj, idx) => {
      console.log(`[ARInput] _cssObjects[${idx}]:`, {
        name: obj.name || 'unnamed',
        type: obj.type,
        visible: obj.visible,
        element: obj.element ? 'has element' : 'no element'
      });
    });
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
      canvas.addEventListener('touchstart', this._onCanvasEvent.bind(this), { passive: true, capture: true });
      canvas.addEventListener('touchend', this._onCanvasEvent.bind(this), { passive: true, capture: true });
      
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
    console.log('[ARInput] ★★★ CANVAS EVENT ★★★:', e.type, 'target:', e.target);
    
    if (!this._isInitialized) {
      console.warn('[ARInput] Not initialized yet');
      return;
    }
    
    if (!this.renderer || !this.renderer.domElement) {
      console.warn('[ARInput] Renderer or domElement is null');
      return;
    }
    
    // Получаем позицию клика на canvas
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
    console.log('[ARInput] Click position:', {
      clientX: e.clientX,
      clientY: e.clientY,
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      normalized: { x, y }
    });
    
    this._pointer.set(x, y);
    
    // Делаем raycast
    console.log('[ARInput] ★★★ PERFORMING RAYCAST ★★★');
    this._raycaster.setFromCamera(this._pointer, this.camera);
    console.log('[ARInput] Raycaster origin:', this._raycaster.ray.origin);
    console.log('[ARInput] Raycaster direction:', this._raycaster.ray.direction);
    
    // Получаем все CSS3D объекты из сцены
    const cssObjects = this._getAllCSSObjects();
    console.log('[ARInput] Found', cssObjects.length, 'CSS objects in scene');
    
    if (cssObjects.length === 0) {
      console.warn('[ARInput] ⚠️ No CSS objects found in scene!');
      console.log('[ARInput] Scene children count:', this.scene?.children?.length || 0);
      // Дополнительный обход для поиска
      if (this.scene) {
        this.scene.traverse((child) => {
          if (child.isCSS3DObject) {
            console.log('[ARInput] Found CSS object during traversal:', child.name);
          }
        });
      }
      return;
    }
    
    // Логируем найденные объекты
    cssObjects.forEach((obj, idx) => {
      console.log(`[ARInput] CSS object ${idx}:`, {
        name: obj.name || 'unnamed',
        visible: obj.visible,
        position: obj.position.toArray(),
        element: obj.element ? 'has element' : 'no element'
      });
    });
    
    // Проверяем пересечения с CSS3D объектами
    console.log('[ARInput] ★★★ INTERSECTING WITH RAY ★★★');
    const intersects = this._raycaster.intersectObjects(cssObjects);
    console.log('[ARInput] Intersections count:', intersects.length);
    
    if (intersects.length > 0) {
      console.log('[ARInput] ★★★ INTERSECTION FOUND! ★★★');
      // Логируем все пересечения
      intersects.forEach((intersect, idx) => {
        console.log(`[ARInput] Intersection ${idx}:`, {
          object: intersect.object.name || 'unnamed',
          distance: intersect.distance,
          point: intersect.point.toArray(),
          element: intersect.object.element ? 'has element' : 'no element'
        });
      });
      
      // Берем первый попавшийся объект
      const hit = intersects[0];
      const cssObject = hit.object;
      
      console.log('[ARInput] ★★★ HIT CSS OBJECT ★★★:', {
        name: cssObject.name || 'unnamed',
        type: cssObject.type,
        element: cssObject.element ? 'has element' : 'no element'
      });
      
      if (cssObject.element) {
        // Получаем координаты клика на элементе
        const elementRect = cssObject.element.getBoundingClientRect();
        const clickX = e.clientX - elementRect.left;
        const clickY = e.clientY - elementRect.top;
        
        console.log('[ARInput] Element rect:', {
          left: elementRect.left,
          top: elementRect.top,
          width: elementRect.width,
          height: elementRect.height
        });
        console.log('[ARInput] Element click at:', { clickX, clickY });
        
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
          console.log('[ARInput] ★★★ DISPATCHING EVENT TO:', targetElement.tagName, targetElement.className);
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
        } else {
          console.log('[ARInput] No target element found at click position');
          // Попробуем найти интерактивные элементы внутри
          const interactive = cssObject.element.querySelectorAll('button, .modal-close-btn, .ar-quest-btn, .ar-quest-submit-btn, input, textarea, select, a');
          console.log('[ARInput] Interactive elements in CSS object:', interactive.length);
          interactive.forEach((el, idx) => {
            const rect = el.getBoundingClientRect();
            console.log(`[ARInput] Interactive element ${idx}:`, {
              tag: el.tagName,
              class: el.className,
              rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
              containsPoint: this._isPointInRect(e.clientX, e.clientY, rect)
            });
          });
        }
      } else {
        console.warn('[ARInput] Hit CSS object has no element!');
      }
    } else {
      console.log('[ARInput] No intersections found');
    }
  }

  /**
   * Проверка, находится ли точка в прямоугольнике
   */
  _isPointInRect(x, y, rect) {
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
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
    if (!this.scene) {
      console.warn('[ARInput] Scene is null in _getAllCSSObjects');
      return objects;
    }
    
    // Сначала добавляем объекты из нашего массива
    for (const obj of this._cssObjects) {
      if (obj && obj.isCSS3DObject && obj.visible !== false) {
        objects.push(obj);
      }
    }
    
    // Затем ищем в сцене
    this.scene.traverse((child) => {
      if (child.isCSS3DObject && !objects.includes(child)) {
        objects.push(child);
      }
    });
    
    console.log('[ARInput] _getAllCSSObjects found:', objects.length, 'objects');
    return objects;
  }

  /**
   * Находит элемент в CSS3D объекте по координатам
   */
  _findElementAt(root, x, y) {
    if (!root) {
      console.log('[ARInput] _findElementAt: root is null');
      return null;
    }
    
    console.log('[ARInput] _findElementAt: searching in root', root.tagName, root.className);
    
    // Проверяем все интерактивные элементы
    const interactive = root.querySelectorAll('button, .modal-close-btn, .ar-quest-btn, .ar-quest-submit-btn, input, textarea, select, a, .ar-quest-ok-btn, .ar-slide-nav');
    console.log('[ARInput] _findElementAt: found', interactive.length, 'interactive elements');
    
    // Используем глобальные координаты, проверяем попадание
    for (const el of interactive) {
      const rect = el.getBoundingClientRect();
      const isInside = this._isPointInRect(x + (rect.left - root.getBoundingClientRect().left), y + (rect.top - root.getBoundingClientRect().top), rect);
      
      console.log(`[ARInput] Checking element ${el.tagName}.${el.className}:`, {
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        point: { x, y },
        isInside
      });
      
      if (isInside) {
        console.log('[ARInput] ★★★ Found target element:', el.tagName, el.className);
        return el;
      }
    }
    
    // Если не нашли, проверяем специальные элементы
    const closeBtn = root.querySelector('.modal-close-btn');
    if (closeBtn) {
      const rect = closeBtn.getBoundingClientRect();
      if (this._isPointInRect(x + (rect.left - root.getBoundingClientRect().left), y + (rect.top - root.getBoundingClientRect().top), rect)) {
        console.log('[ARInput] ★★★ Found close button!');
        return closeBtn;
      }
    }
    
    console.log('[ARInput] _findElementAt: no element found');
    return null;
  }

  /**
   * Панель: полностью пропускаем интерактивные элементы
   */
  bindPanelEvents(element, panelName) {
    console.log(`[ARInput] bindPanelEvents called for: ${panelName}`, element);
    
    if (!element) {
      console.warn(`[ARInput] bindPanelEvents: element is null for ${panelName}`);
      return;
    }
    
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
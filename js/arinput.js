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
    this._raycastMeshes = [];
    this._isInitialized = false;
    this._sceneGroups = [];

    // Состояние жеста "тап двумя пальцами" (debug-рейкаст из центра экрана)
    this._twoFingerActive = false;
    this._twoFingerStartTime = 0;
    this._twoFingerMaxTapMs = 500; // дольше - считаем это не тапом, а долгим удержанием/жестом
  }

  /**
   * Инициализация: добавляем CSS3D объекты в массив для raycast
   */
  init(cssObjects = []) {
    console.log('[ARInput] init called with', cssObjects.length, 'CSS objects');
    this._cssObjects = cssObjects;
    this._isInitialized = true;

    if (this.ui) {
      this.ui.log(
        `[ARInput] Старт | renderer=${!!this.renderer} scene=${!!this.scene} camera=${!!this.camera}`,
        'info'
      );
    }

    this._setupGlobalListeners();
    this._logSceneObjects();
  }

  addSceneGroup(group) {
    console.log('[ARInput] addSceneGroup called with group:', group?.name);
    if (group && !this._sceneGroups.includes(group)) {
      this._sceneGroups.push(group);
    }
  }

  addCSSObject(cssObject, raycastMesh = null) {
    if (cssObject && !this._cssObjects.includes(cssObject)) {
      this._cssObjects.push(cssObject);
    }
    // CSS3DObject не имеет геометрии, поэтому THREE.Raycaster не может
    // пересечь его напрямую (Object3D.raycast по умолчанию - пустая функция).
    // Поэтому используем невидимый прокси-меш той же формы/трансформации
    // и связываем его с исходным CSS3DObject через userData.
    if (raycastMesh) {
      raycastMesh.userData.cssObject = cssObject;
      if (!this._raycastMeshes.includes(raycastMesh)) {
        this._raycastMeshes.push(raycastMesh);
      }
    }
  }

  _logSceneObjects() {
    console.log('[ARInput] === SCENE OBJECTS DEBUG ===');
    if (!this.scene) return;
    
    let objectCount = 0;
    let cssCount = 0;
    this.scene.traverse((child) => {
      objectCount++;
      if (child.isCSS3DObject) {
        cssCount++;
      }
    });
    console.log(`[ARInput] Total objects: ${objectCount}, CSS3D objects: ${cssCount}`);
  }

  _setupGlobalListeners() {
    console.log('[ARInput] Setting up global listeners');
    const canvas = this.renderer?.domElement;
    
    if (canvas) {
      canvas.addEventListener('click', this._onCanvasEvent.bind(this), true);
      canvas.addEventListener('pointerdown', this._onCanvasEvent.bind(this), true);
      canvas.addEventListener('pointerup', this._onCanvasEvent.bind(this), true);
      canvas.addEventListener('touchstart', this._onCanvasEvent.bind(this), { passive: true, capture: true });
      canvas.addEventListener('touchend', this._onCanvasEvent.bind(this), { passive: true, capture: true });

      // Отдельное отслеживание жеста "тап двумя пальцами" - debug raycast
      // из центра экрана по всем объектам Three.js сцены.
      canvas.addEventListener('touchstart', this._onTouchStartTwoFinger.bind(this), { passive: true, capture: true });
      canvas.addEventListener('touchend', this._onTouchEndTwoFinger.bind(this), { passive: true, capture: true });

      if (this.ui) this.ui.log('[ARInput] Слушатели событий подключены к canvas', 'ok');
    } else {
      window.addEventListener('click', this._onWindowEvent.bind(this), true);
      window.addEventListener('touchstart', this._onWindowEvent.bind(this), true);

      if (this.ui) this.ui.log('[ARInput] canvas отсутствует - слушатели подключены к window (fallback)', 'warn');
    }
  }

  _onCanvasEvent(e) {
    if (!this._isInitialized || !this.renderer || !this.renderer.domElement) return;

    if (!this.camera) {
      // Без камеры raycaster.setFromCamera() кидает исключение молча
      // внутри обработчика клика - таргет становится "нерабочим" без
      // видимой причины. Логируем явно, чтобы сразу было видно источник.
      console.error('[ARInput] _onCanvasEvent: camera is missing, cannot raycast clicks');
      if (this.ui) this.ui.log('[ARInput] Нет камеры для рейкаста клика - проверьте передачу arInput', 'err');
      return;
    }

    // В клике интересуют фазы окончания тапа/клика
    if (e.type !== 'click' && e.type !== 'touchend' && e.type !== 'pointerup') {
      return;
    }

    const clientX = e.clientX || (e.changedTouches && e.changedTouches[0]?.clientX);
    const clientY = e.clientY || (e.changedTouches && e.changedTouches[0]?.clientY);

    if (clientX === undefined || clientY === undefined) return;

    // if (this.ui) {
    //   this.ui.log(`[ARInput] Событие '${e.type}' получено @ (${Math.round(clientX)}, ${Math.round(clientY)})`, 'info');
    // }

    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this._pointer.set(x, y);

    this._raycaster.setFromCamera(this._pointer, this.camera);
    const raycastMeshes = this._getAllRaycastMeshes();

    if (raycastMeshes.length === 0) {
      if (this.ui) this.ui.log('[ARInput] Нет доступных объектов для рейкаста (raycastMeshes пуст)', 'warn');
      return;
    }

    const intersects = this._raycaster.intersectObjects(raycastMeshes);

    // if (this.ui) {
    //   this.ui.log(`[ARInput] Raycast: проверено ${raycastMeshes.length} объектов, попаданий: ${intersects.length}`, 'info');
    // }

    if (intersects.length > 0) {
      const hit = intersects[0];
      const cssObject = hit.object.userData && hit.object.userData.cssObject;

      if (cssObject && cssObject.element) {
        const canvas = this.renderer.domElement;
        const prevPointerEvents = canvas.style.pointerEvents;
        
        // Временно пропускаем событие сквозь canvas, чтобы элемент под курсором среагировал
        canvas.style.pointerEvents = 'none';
        const realTarget = document.elementFromPoint(clientX, clientY);
        canvas.style.pointerEvents = prevPointerEvents;

        if (realTarget && cssObject.element.contains(realTarget)) {
          const panelEl = realTarget.closest('[data-ar-panel-name]');
          const panelName = panelEl ? panelEl.dataset.arPanelName : null;

          // console.log('[ARInput] ★ Real target hit:', realTarget.tagName, realTarget.className);
          // if (this.ui) {
          //   this.ui.log(
          //     `[ARInput] Попадание в элемент: <${realTarget.tagName.toLowerCase()}> class="${realTarget.className}"` +
          //     (panelName ? ` (панель: "${panelName}")` : ''),
          //     'ok'
          //   );
          // }
          
          playSound('click');
          
          // Триггерим события непосредственно на элементы
          realTarget.click();
          if (typeof realTarget.focus === 'function') realTarget.focus();
        } else {
          // Если клик не попал в конкретный подэлемент, ищем ближайший интерактивный
          const interactive = cssObject.element.querySelector('button, input, a, select, textarea, .modal-close-btn');
          if (interactive) {
            // if (this.ui) this.ui.log('[ARInput] Точного попадания нет, кликаем по ближайшему интерактивному элементу панели', 'ok');
            playSound('click');
            interactive.click();
          } else if (this.ui) {
            // this.ui.log('[ARInput] Попадание в панель, но интерактивный элемент не найден', 'warn');
          }
        }
      }
    } else if (this.ui) {
      // this.ui.log('[ARInput] Мимо - ни один объект не задет', 'warn');
    }
  }

  _onWindowEvent(e) {
    const target = e.target;
    if (target && target.closest) {
      const screen = target.closest('.ar-target-screen');
      if (screen) {
        const closeBtn = screen.querySelector('.modal-close-btn');
        if (closeBtn && (target === closeBtn || closeBtn.contains(target))) {
          closeBtn.click();
        }
      }
    }
  }

  /**
   * Debug-фича: тап двумя пальцами -> raycast из центра экрана по всем
   * объектам Three.js сцены (не только по CSS3D-панелям), с выводом
   * в лог имени объекта, в который попали. Удобно для отладки/настройки
   * положения объектов в 3D-сцене.
   */
  _onTouchStartTwoFinger(e) {
    if (!e.touches) return;

    if (e.touches.length === 2) {
      this._twoFingerActive = true;
      this._twoFingerStartTime = performance.now();
      if (this.ui) this.ui.log('[ARInput] Тап двумя пальцами: начало', 'info');
    } else if (e.touches.length > 2) {
      // Более двух пальцев - это не наш жест, сбрасываем
      this._twoFingerActive = false;
    }
  }

  _onTouchEndTwoFinger(e) {
    if (!this._twoFingerActive) return;

    const remaining = e.touches ? e.touches.length : 0;

    if (remaining > 0) {
      // Один из двух пальцев ещё не оторван - ждём, пока оторвутся оба
      return;
    }

    const elapsed = performance.now() - this._twoFingerStartTime;
    this._twoFingerActive = false;

    if (elapsed > this._twoFingerMaxTapMs) {
      if (this.ui) this.ui.log('[ARInput] Тап двумя пальцами: слишком долго, это не тап', 'warn');
      return;
    }

    if (this.ui) this.ui.log('[ARInput] Тап двумя пальцами: raycast из центра экрана', 'info');
    this._raycastFromScreenCenter();
  }

  _raycastFromScreenCenter() {
    if (!this.camera) {
      console.error('[ARInput] _raycastFromScreenCenter: camera is missing');
      if (this.ui) this.ui.log('[ARInput] Нет камеры для raycast из центра экрана', 'err');
      return;
    }
    if (!this.scene) {
      console.error('[ARInput] _raycastFromScreenCenter: scene is missing');
      if (this.ui) this.ui.log('[ARInput] Нет сцены для raycast из центра экрана', 'err');
      return;
    }

    // Центр экрана в нормализованных координатах устройства (NDC) - (0, 0)
    this._pointer.set(0, 0);
    this._raycaster.setFromCamera(this._pointer, this.camera);

    const intersects = this._raycaster.intersectObjects(this.scene.children, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const obj = hit.object;
      const name = obj.name || obj.type || '(без имени)';
      const distance = hit.distance.toFixed(3);

      console.log('[ARInput] ★ Two-finger center raycast hit:', name, obj);
      if (this.ui) {
        this.ui.log(`[ARInput] 2-пальца raycast → объект: "${name}" (${obj.type}), дистанция=${distance}м`, 'ok');
      }
      playSound('click');
    } else {
      console.log('[ARInput] Two-finger center raycast: no intersection');
      if (this.ui) this.ui.log('[ARInput] 2-пальца raycast: объект не найден', 'warn');
    }
  }

  _getAllRaycastMeshes() {
    const meshes = [];

    for (const m of this._raycastMeshes) {
      if (m && m.visible !== false) {
        meshes.push(m);
      }
    }

    if (this.scene) {
      this.scene.traverse((child) => {
        if (
          child.userData &&
          child.userData.cssObject &&
          !meshes.includes(child) &&
          child.visible !== false
        ) {
          meshes.push(child);
        }
      });
    }

    return meshes;
  }

  bindPanelEvents(element, panelName) {
    if (!element) return;
    
    element.style.pointerEvents = 'auto';
    element.style.touchAction = 'manipulation';

    // Запоминаем имя панели прямо на элементе - используется здесь же
    // для лога и в bindInteractiveEvent(), чтобы кнопка тоже знала,
    // в какой зоне панели она находится.
    element.dataset.arPanelName = panelName;

    const interactiveSelector = [
      'button', 'input', 'textarea', 'select', 'a',
      '.ar-quest-btn', '.ar-quest-submit-btn', '.ar-slide-nav',
      '.ar-quest-input', '.ar-quest-ok-btn', '.modal-close-btn'
    ].join(',');

    const captureHandler = (e) => {
      const target = e.target;
      const isInteractive = !!target.closest(interactiveSelector);

      // Клики по панели минуют canvas (панель лежит поверх него в DOM),
      // поэтому ARInput._onCanvasEvent для них не срабатывает - лог о
      // попадании в панель пишем именно здесь, на реальном пути клика.
      // Только на завершающих фазах жеста (click/touchend), чтобы не
      // спамить логами на pointerdown/touchstart.
      if (this.ui && (e.type === 'click' || e.type === 'touchend')) {
        const now = performance.now();
        // touchend и синтетический click часто срабатывают на один и тот
        // же тап - логируем не чаще раза в 400мс на элемент, чтобы не
        // дублировать запись в лог.
        if (!element._arLastPanelLogTime || now - element._arLastPanelLogTime > 400) {
          element._arLastPanelLogTime = now;
          this.ui.log(
            `[ARInput] Клик по панели "${panelName}"${isInteractive ? ' (интерактивный элемент)' : ''}`,
            'info'
          );
        }
      }

      if (isInteractive) {
        return; // Пропускаем обработку для интерактивных элементов
      }

      e.stopPropagation();
    };

    element.addEventListener('pointerdown', captureHandler, true);
    element.addEventListener('click', captureHandler, true);
    element.addEventListener('touchstart', captureHandler, { passive: false, capture: true });
    element.addEventListener('touchend', captureHandler, { passive: false, capture: true });
  }

  bindInteractiveEvent(element, btnName, callback) {
    if (!element) return;

    element.style.pointerEvents = 'auto';
    element.style.touchAction = 'manipulation';
    element.style.cursor = 'pointer';

    this._interactiveElements.add(element);

    const fire = (e) => {
      e.stopPropagation();
      e.stopImmediatePropagation();

      if (this.ui) {
        const panelEl = element.closest('[data-ar-panel-name]');
        const panelName = panelEl ? panelEl.dataset.arPanelName : null;
        this.ui.log(
          `[ARInput Button] '${btnName}' pressed${panelName ? ` (панель: "${panelName}")` : ''}`,
          'ok'
        );
      }
      playSound('click');
      callback(e);
    };

    element.addEventListener('click', fire, true);
    element.addEventListener('touchend', (e) => {
      if (e.cancelable) e.preventDefault();
      fire(e);
    }, { passive: false, capture: true });
  }

  bindInputField(inputElement) {
    if (!inputElement) return;
    inputElement.style.pointerEvents = 'auto';
    inputElement.style.touchAction = 'manipulation';

    this._interactiveElements.add(inputElement);

    const stop = (e) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    ['click', 'pointerdown', 'touchstart', 'focus'].forEach((evt) => {
      inputElement.addEventListener(evt, stop, true);
    });
  }
}
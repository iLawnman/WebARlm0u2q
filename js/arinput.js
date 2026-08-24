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
  }

  /**
   * Инициализация: добавляем CSS3D объекты в массив для raycast
   */
  init(cssObjects = []) {
    console.log('[ARInput] init called with', cssObjects.length, 'CSS objects');
    this._cssObjects = cssObjects;
    this._isInitialized = true;
    
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
    } else {
      window.addEventListener('click', this._onWindowEvent.bind(this), true);
      window.addEventListener('touchstart', this._onWindowEvent.bind(this), true);
    }
  }

  _onCanvasEvent(e) {
    if (!this._isInitialized || !this.renderer || !this.renderer.domElement) return;

    // В клике интересуют фазы окончания тапа/клика
    if (e.type !== 'click' && e.type !== 'touchend' && e.type !== 'pointerup') {
      return;
    }

    const clientX = e.clientX || (e.changedTouches && e.changedTouches[0]?.clientX);
    const clientY = e.clientY || (e.changedTouches && e.changedTouches[0]?.clientY);

    if (clientX === undefined || clientY === undefined) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this._pointer.set(x, y);

    this._raycaster.setFromCamera(this._pointer, this.camera);
    const raycastMeshes = this._getAllRaycastMeshes();

    if (raycastMeshes.length === 0) return;

    const intersects = this._raycaster.intersectObjects(raycastMeshes);

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
          console.log('[ARInput] ★ Real target hit:', realTarget.tagName, realTarget.className);
          
          playSound('click');
          
          // Триггерим события непосредственно на элементы
          realTarget.click();
          if (typeof realTarget.focus === 'function') realTarget.focus();
        } else {
          // Если клик не попал в конкретный подэлемент, ищем ближайший интерактивный
          const interactive = cssObject.element.querySelector('button, input, a, select, textarea, .modal-close-btn');
          if (interactive) {
            playSound('click');
            interactive.click();
          }
        }
      }
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

    const interactiveSelector = [
      'button', 'input', 'textarea', 'select', 'a',
      '.ar-quest-btn', '.ar-quest-submit-btn', '.ar-slide-nav',
      '.ar-quest-input', '.ar-quest-ok-btn', '.modal-close-btn'
    ].join(',');

    const captureHandler = (e) => {
      const target = e.target;
      const isInteractive = !!target.closest(interactiveSelector);
      
      if (isInteractive) {
        return; // Пропускаем обработку для интерактивных элементов
      }

      e.stopPropagation();
    };

    element.addEventListener('pointerdown', captureHandler, true);
    element.addEventListener('click', captureHandler, true);
    element.addEventListener('touchstart', captureHandler, { passive: false, capture: true });
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
        this.ui.log(`[ARInput Button] '${btnName}' pressed`, 'ok');
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
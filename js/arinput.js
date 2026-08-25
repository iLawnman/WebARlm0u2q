// js/arinput.js
import { playSound } from './audio.js';
import * as THREE from 'three';

export class ARInput {
  constructor(ui, renderer, scene, camera) {
    this.ui = ui;
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this._raycaster = new THREE.Raycaster();
    this._pointer = new THREE.Vector2();
    this._cssObjects = [];
    this._raycastMeshes = [];
    this._isInitialized = false;
  }

  init(cssObjects = []) {
    console.log('[ARInput] init with', cssObjects.length, 'CSS objects');
    this._cssObjects = cssObjects;
    this._isInitialized = true;
    this._setupGlobalListeners();
  }

  addCSSObject(cssObject, raycastMesh = null) {
    if (cssObject && !this._cssObjects.includes(cssObject)) {
      this._cssObjects.push(cssObject);
    }
    if (raycastMesh) {
      raycastMesh.userData.cssObject = cssObject;
      if (!this._raycastMeshes.includes(raycastMesh)) {
        this._raycastMeshes.push(raycastMesh);
      }
    }
  }

  _setupGlobalListeners() {
    const canvas = this.renderer?.domElement;
    if (canvas) {
      canvas.addEventListener('click', this._onCanvasEvent.bind(this), true);
      canvas.addEventListener('touchend', this._onCanvasEvent.bind(this), { passive: true, capture: true });
    }
  }

  _onCanvasEvent(e) {
    if (!this._isInitialized || !this.renderer?.domElement || !this.camera) return;
    if (e.type !== 'click' && e.type !== 'touchend') return;

    const clientX = e.clientX ?? e.changedTouches?.[0]?.clientX;
    const clientY = e.clientY ?? e.changedTouches?.[0]?.clientY;
    if (clientX === undefined || clientY === undefined) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this._pointer.set(x, y);
    this._raycaster.setFromCamera(this._pointer, this.camera);

    const intersects = this._raycaster.intersectObjects(this._raycastMeshes);
    if (intersects.length === 0) return;

    const hit = intersects[0];
    const cssObject = hit.object.userData?.cssObject;
    if (!cssObject?.element) return;

    // Просто логируем попадание в панель
    // Все интерактивные элементы работают через естественные DOM-обработчики
    if (this.ui) {
      this.ui.log(`[ARInput] Попадание в панель`, 'ok');
    }
  }

  bindInteractiveEvent(element, btnName, callback) {
    if (!element) return;
    element.style.pointerEvents = 'auto';
    element.style.touchAction = 'manipulation';
    element.style.cursor = 'pointer';

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
  }
}
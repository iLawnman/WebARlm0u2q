// arpanel.js
import * as THREE from 'three';
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { ARDataParser } from './arparser.js';
import { ARButtonCreator } from './arbutton.js';
import { ARModalManager } from './armodal.js';

export class ARPanelCreator {
  constructor(options = {}) {
    this.parser = new ARDataParser();
    this.buttonCreator = new ARButtonCreator();
    this.modalManager = new ARModalManager();
    this.prefabCache = null;
    this.designPrefab = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
  }

  setRenderer(renderer) { this.renderer = renderer; }
  setScene(scene) { this.scene = scene; }
  setCamera(camera) { this.camera = camera; }
  setDesignPrefab(prefab) { this.designPrefab = prefab; }
  getDesignPrefab() { return this.designPrefab; }

  _buildFallbackPrefab() {
    const div = document.createElement('div');
    div.innerHTML = `
      <div class="screen active">
        <div class="content">
          <div class="title-area">
            <div class="title-text"></div>
          </div>
          <div class="main-panel">
            <div class="main-text"></div>
          </div>
          <div class="buttons-area">
            <div class="buttons-row"></div>
          </div>
        </div>
      </div>
    `;
    return div.firstElementChild;
  }

  async ensurePrefab(url, ui = null) {
    if (this.prefabCache) return;
    
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const screenRoot = doc.querySelector('.screen') || doc.querySelector('body > div');
      if (!screenRoot) throw new Error('Не найден корневой узел префаба');
      
      this.prefabCache = screenRoot;
      if (ui) ui.log(`[ARPanelCreator] Prefab loaded`, 'ok');
    } catch (e) {
      console.warn('[ARPanelCreator] Prefab fetch failed, using fallback:', e.message);
      if (ui) ui.log(`[ARPanelCreator] Using fallback prefab`, 'warn');
      this.prefabCache = this._buildFallbackPrefab();
    }
  }

  _getScreenRoot() {
    if (this.prefabCache) return this.prefabCache;
    this.prefabCache = this._buildFallbackPrefab();
    return this.prefabCache;
  }

  createCSSScreen(data, onAnswer, ui, arInput) {
    const SCREEN_WIDTH_PX = 340;
    const SCREEN_HEIGHT_PX = 480;
    const SCREEN_SCALE = 0.0005;
    const screenSrc = this._getScreenRoot();

    const el = screenSrc.cloneNode(true);
    el.classList.add('ar-target-screen');
    el.style.width = `${SCREEN_WIDTH_PX}px`;
    el.style.height = `${SCREEN_HEIGHT_PX}px`;
    el.style.pointerEvents = 'auto';
    el.style.touchAction = 'manipulation';
    el.style.position = 'relative';

    el.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
    if (el.id) el.removeAttribute('id');

    this._fillScreen(el, data, onAnswer, ui, arInput);

    const cssObject = new CSS3DObject(el);
    cssObject.name = 'Screen';
    cssObject.scale.set(SCREEN_SCALE, SCREEN_SCALE, SCREEN_SCALE);
    cssObject.position.set(0, 0.05, 0);
    cssObject.rotation.set(-Math.PI / 2, 0, 0);

    const raycastMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(SCREEN_WIDTH_PX * SCREEN_SCALE, SCREEN_HEIGHT_PX * SCREEN_SCALE),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    raycastMesh.name = 'ScreenRaycastProxy';
    raycastMesh.position.copy(cssObject.position);
    raycastMesh.rotation.copy(cssObject.rotation);

    return { el, cssObject, raycastMesh };
  }

  _fillScreen(el, data, onAnswer, ui, arInput) {
    const setText = (sel, val) => {
      const n = el.querySelector(sel);
      if (n) n.textContent = val || '';
      return n;
    };

    setText('.title-text', data.title);
    setText('.main-text', data.question || data.mainText || '');

    const buttonsRow = el.querySelector('.buttons-row');
    if (buttonsRow) {
      this.buttonCreator.buildQuestionBody(buttonsRow, data, onAnswer, ui, arInput, this.designPrefab);
    }

    this.modalManager.setupModal(el, ui, arInput);
  }
}
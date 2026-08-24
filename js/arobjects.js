// arobjects.js - Main AR Objects Factory
import * as THREE from 'three';
import { ARDataParser } from './arparser.js';
import { ARPanelCreator } from './arpanel.js';
import { ARButtonCreator } from './arbutton.js';
import { ARModalManager } from './armodal.js';
import { ARInput } from './arinput.js';
import { playSound } from './audio.js';

const DEFAULT_PREFAB_URL = './assets/artargetPrefabNew.html';

export class ModelFactory {
  constructor(defaults = {}) {
    this.prefabUrl = defaults.prefabUrl || DEFAULT_PREFAB_URL;
    this.parser = new ARDataParser();
    this.panelCreator = new ARPanelCreator();
    this.buttonCreator = new ARButtonCreator();
    this.modalManager = new ARModalManager();
    this._arInputInstances = [];
    this._debugSaveBtn = null;
    this._designAutoLoadAttempted = false;
  }

  setRenderer(renderer) {
    this.panelCreator.setRenderer(renderer);
  }

  setScene(scene) {
    this.panelCreator.setScene(scene);
  }

  setCamera(camera) {
    this.panelCreator.setCamera(camera);
  }

  setDesignPrefab(prefab) {
    this.panelCreator.setDesignPrefab(prefab);
    console.log('[ModelFactory] Design prefab set');
  }

  getDesignPrefab() {
    return this.panelCreator.getDesignPrefab();
  }

  async _autoLoadDesignIfNeeded(ui = null) {
    if (this.panelCreator.getDesignPrefab()) {
      console.log('[ModelFactory] Design prefab already set, skipping autoload');
      return;
    }
    if (this._designAutoLoadAttempted) {
      console.log('[ModelFactory] Autoload already attempted, skipping');
      return;
    }
    this._designAutoLoadAttempted = true;

    const DESIGN_JSON_CANDIDATES = [
      './assets/arprefabdesign.json',
      './assets/arprefabsdesign.json',
      './arprefabdesign.json',
      './arprefabsdesign.json'
    ];

    const tryFetchDesignJson = async (path) => {
      if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') {
        return null;
      }
      try {
        const r = await fetch(path);
        if (r.ok) {
          const json = await r.json();
          console.log('[ModelFactory] Design JSON loaded from', path);
          return json;
        }
      } catch (e) {
        console.log('[ModelFactory] Failed to load design JSON from', path);
      }
      return null;
    };

    let groups = null;
    for (const path of DESIGN_JSON_CANDIDATES) {
      groups = await tryFetchDesignJson(path);
      if (groups) break;
    }

    if (groups) {
      const prefab = this.parser.designGroupsToPrefab(groups);
      this.panelCreator.setDesignPrefab(prefab);
      console.log('[ModelFactory] Design JSON applied');
      if (ui) ui.log('[ModelFactory] Design JSON loaded and applied', 'ok');
    } else {
      console.log('[ModelFactory] No design JSON found, using defaults');
      if (ui) ui.log('[ModelFactory] No design JSON found, using defaults', 'warn');
    }
  }

  async _ensurePrefab(url, ui = null) {
    await this.panelCreator.ensurePrefab(url, ui);
  }

  async createArTarget(targetData = '', options = {}) {
    const prefabUrl = options.prefabUrl || this.prefabUrl;
    const ui = options.ui || null;
    console.log('[ModelFactory] createArTarget: requesting prefab from', prefabUrl);
    
    await this._ensurePrefab(prefabUrl, ui);
    await this._autoLoadDesignIfNeeded(ui);

    return this.createArTargetSync(targetData, options);
  }

  createArTargetSync(targetData = '', options = {}) {
    const { onAnswer = null, ui = null } = options;
    const data = this.parser.normalizeTargetData(targetData);
    
    console.log('[ModelFactory] createArTargetSync: creating target:', data.groupName);

    // Создаем ARInput с рендерером, сценой и камерой
    const arInput = new ARInput(ui, this.panelCreator.renderer, this.panelCreator.scene, this.panelCreator.camera);
    this._arInputInstances.push(arInput);

    const group = new THREE.Group();
    group.name = `arTarget_${data.groupName}`;

    // Создаем сферу (маркер)
    const sphere = this._createSphere();
    group.add(sphere);

    // Обработчик ответа
    const handleAnswer = (value) => {
      if (ui) ui.log(`[Target:${data.groupName}] Answer: ${value}`, 'ok');
      playSound('click');
      if (typeof onAnswer === 'function') onAnswer(value);
    };

    // Создаем CSS экран
    const { el, cssObject } = this.panelCreator.createCSSScreen(data, handleAnswer, ui, arInput);
    group.add(cssObject);

    // Привязываем панели к ARInput
    const zoneMainPanel = el.querySelector('.main-panel');
    const zoneLeftPanel = el.querySelector('.panels > .side-panel');
    const zoneRightPanel = el.querySelectorAll('.panels > .side-panel')[1] || null;
    const zoneButtons = el.querySelector('.buttons-area');
    
    if (zoneMainPanel) arInput.bindPanelEvents(zoneMainPanel, 'MainBlock');
    if (zoneLeftPanel) arInput.bindPanelEvents(zoneLeftPanel, 'LeftHelpBlock');
    if (zoneRightPanel) arInput.bindPanelEvents(zoneRightPanel, 'RightBlock');
    if (zoneButtons) arInput.bindPanelEvents(zoneButtons, 'ButtonsBlock');

    // Добавляем CSS объект в ARInput
    arInput.addCSSObject(cssObject);

    // Инициализируем ARInput
    if (this.panelCreator.scene) {
      arInput.addSceneGroup(group);
      arInput.init();
    } else {
      arInput.init();
    }

    const panels = { 
      Screen: cssObject, 
      MainBlock: cssObject, 
      LeftHelpBlock: cssObject, 
      RightBlock: cssObject, 
      ButtonsBlock: cssObject 
    };

    group.userData = {
      targetInfo: data.raw,
      normalized: data,
      sphere,
      ...panels,
      panelEl: el,
      cssObject,
      onAnswer: handleAnswer,
      answerType: data.answerType,
      groupName: data.groupName,
      arInput: arInput
    };

    this._ensureDebugSaveButton(group, ui);
    return group;
  }

  _createSphere() {
    const geo = new THREE.SphereGeometry(0.0075, 24, 24);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 0.5
    });
    return new THREE.Mesh(geo, mat);
  }

  _ensureDebugSaveButton(group, ui) {
    if (this._debugSaveBtn) return;
    const btn = document.createElement('button');
    btn.id = 'ar-debug-save-btn';
    btn.textContent = 'Save AR Target (Debug)';
    btn.style.cssText = `
      position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%);
      z-index: 99999; padding: 10px 18px; font-size: 13px; font-weight: 600;
      background: rgba(0,40,30,0.95); color: #00ffaa;
      border: 2px solid #00ffaa; border-radius: 10px; cursor: pointer;
    `;
    btn.addEventListener('click', () => this._saveTargetDebug(group, ui));
    document.body.appendChild(btn);
    this._debugSaveBtn = btn;
  }

  _saveTargetDebug(group, ui) {
    const ud = group.userData || {};
    const snapshot = {
      name: group.name,
      groupName: ud.groupName,
      answerType: ud.answerType,
      normalized: ud.normalized,
      panels: {}
    };
    for (const [key, obj] of Object.entries(ud)) {
      if (obj?.isCSS3DObject && obj.element) {
        snapshot.panels[key] = {
          position: obj.position.toArray(),
          rotation: obj.rotation.toArray().map((r) => +(r * 180 / Math.PI).toFixed(1)),
          scale: obj.scale.x,
          html: obj.element.outerHTML
        };
      }
    }
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `artarget_${ud.groupName || 'debug'}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (ui) ui.log(`[Debug] Saved ${a.download}`, 'ok');
  }
}
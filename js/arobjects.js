// arobjects.js - Main AR Target Factory
//
// REFACTOR NOTE (CSS3D -> three-mesh-ui):
// The prefab-HTML fetching (DEFAULT_PREFAB_URL / ensurePrefab) is gone - it
// only made sense when panels were built by cloning an HTML template.
// ARPanel now builds the panel directly as three-mesh-ui Blocks.
//
// IMPORTANT INTEGRATION CHANGE: this factory no longer creates a fallback
// ARInput internally. Interactivity now comes from ARScene's pointer
// raycasting loop, so you must give the factory a live ARScene - either via
// `new ModelFactory({ arScene })`, `factory.setARScene(arScene)`, or by
// passing `{ arScene }` in the options of createArTarget(). Without one, the
// panel is still built and visible, but its buttons will not respond to
// clicks (a warning is logged).
//
// group.userData also changed shape: the old CSS-specific keys (cssObject,
// panelEl, Screen/MainBlock/LeftHelpBlock/RightBlock/ButtonsBlock aliases,
// arInput) are gone. See the new keys below (panelRoot, screen, openModal,
// closeModal).
import * as THREE from 'three';
import { ARPanel } from './arpanel.js';

const DESIGN_JSON_CANDIDATES = [
  './assets/arprefabdesign.json',
  './assets/arprefabsdesign.json',
  './arprefabdesign.json',
  './arprefabsdesign.json'
];

export class ModelFactory {
  constructor(defaults = {}) {
    this.panel = new ARPanel(defaults);
    this._arScene = defaults.arScene || null;
    this._designAutoLoadAttempted = false;
    this._debugSaveBtn = null;
  }

  setARScene(arScene) {
    this._arScene = arScene;
  }

  setDesignPrefab(prefab) {
    this.panel.setDesignPrefab(prefab);
    console.log('[ModelFactory] Design prefab set');
  }

  getDesignPrefab() {
    return this.panel.getDesignPrefab();
  }

  async _autoLoadDesignIfNeeded(ui = null) {
    if (this.panel.getDesignPrefab()) {
      console.log('[ModelFactory] Design prefab already set, skipping autoload');
      return;
    }
    if (this._designAutoLoadAttempted) {
      console.log('[ModelFactory] Autoload already attempted, skipping');
      return;
    }
    this._designAutoLoadAttempted = true;

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
      const prefab = this.panel.designGroupsToPrefab(groups);
      this.panel.setDesignPrefab(prefab);
      console.log('[ModelFactory] Design JSON applied');
      if (ui) ui.log('[ModelFactory] Design JSON loaded and applied', 'ok');
    } else {
      console.log('[ModelFactory] No design JSON found, using defaults');
      if (ui) ui.log('[ModelFactory] No design JSON found, using defaults', 'warn');
    }
  }

  async createArTarget(targetData = '', options = {}) {
    const ui = options.ui || null;
    await this._autoLoadDesignIfNeeded(ui);
    return this.createArTargetSync(targetData, options);
  }

  createArTargetSync(targetData = '', options = {}) {
    const { onAnswer = null, ui = null, arScene = this._arScene } = options;

    const panelResult = this.panel.createPanel(targetData, { onAnswer, ui });
    const data = panelResult.data;

    console.log('[ModelFactory] createArTargetSync: creating target:', data.groupName);

    const group = new THREE.Group();
    group.name = `arTarget_${data.groupName}`;

    const sphere = this._createSphere();
    group.add(sphere);
    group.add(panelResult.root);

    if (arScene) {
      panelResult.interactives.forEach((block) => arScene.registerInteractive(block));
    } else if (ui) {
      ui.log('[ModelFactory] No ARScene attached - panel buttons will not be interactive. Call setARScene() or pass options.arScene.', 'warn');
    } else {
      console.warn('[ModelFactory] No ARScene attached - panel buttons will not be interactive.');
    }

    group.userData = {
      targetInfo: data.raw,
      normalized: data,
      sphere,
      panelRoot: panelResult.root,
      screen: panelResult.screen,
      openModal: panelResult.openModal,
      closeModal: panelResult.closeModal,
      onAnswer,
      answerType: data.answerType,
      groupName: data.groupName
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

  // NOTE: previously dumped each CSS3D panel's outerHTML. There is no HTML
  // anymore, so this now dumps the normalized data plus the screen Block's
  // transform - still enough to diff/reproduce a target's placement.
  _saveTargetDebug(group, ui) {
    const ud = group.userData || {};
    const screen = ud.screen;
    const snapshot = {
      name: group.name,
      groupName: ud.groupName,
      answerType: ud.answerType,
      normalized: ud.normalized,
      screenTransform: screen ? {
        position: screen.position.toArray(),
        rotation: screen.rotation.toArray().slice(0, 3).map((r) => +(r * 180 / Math.PI).toFixed(1)),
        scale: screen.scale.toArray()
      } : null
    };
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

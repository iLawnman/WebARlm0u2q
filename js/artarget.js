import * as THREE from 'three';
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { playSound } from './audio.js';
import { ARInput } from './arinput.js';

const DEFAULT_PREFAB_URL = './assets/artargetPrefabNew.html';

/**
 * ModelFactory — изолированная фабрика.
 * Prefab-first. Зоны расширения помечены.
 */
export class ModelFactory {
  constructor(defaults = {}) {
    this.prefabUrl = defaults.prefabUrl || DEFAULT_PREFAB_URL;
    this._prefabCache = null;
    this._debugSaveBtn = null;
  }

  // === ZONE: Public API ===

  async createArTarget(targetData = '', options = {}) {
    const prefabUrl = options.prefabUrl || this.prefabUrl;
    await this._ensurePrefab(prefabUrl);
    return this.createArTargetSync(targetData, options);
  }

  createArTargetSync(targetData = '', options = {}) {
    const { onAnswer = null, ui = null } = options;
    const data = this._normalizeTargetData(targetData);
    const arInput = new ARInput(ui);

    const group = new THREE.Group();
    group.name = `arTarget_${data.groupName}`;

    const sphere = this._createSphere();
    group.add(sphere);

    const handleAnswer = (value) => {
      if (ui) ui.log(`[Target:${data.groupName}] Answer: ${value}`, 'ok');
      playSound('click');
      if (typeof onAnswer === 'function') onAnswer(value);
    };

    const panelNodes = this._getPanelNodes();
    const panels = {};

    for (const src of panelNodes) {
      const name = src.dataset.name || 'panel';
      const el = src.cloneNode(true);

      // Критично
      el.style.pointerEvents = 'auto';
      el.style.touchAction = 'manipulation';

      arInput.bindPanelEvents(el, name);
      this._fillPanel(el, name, data, handleAnswer, ui, arInput);

      const pos = this._parseVec3(el.dataset.position, [0, 0, 0]);
      const rotDeg = this._parseVec3(el.dataset.rotation, [-90, 0, 0]);
      const rot = rotDeg.map((d) => (d * Math.PI) / 180);
      const scale = parseFloat(el.dataset.scale) || 0.0005;

      // Очистка data-атрибутов
      ['data-name', 'data-position', 'data-rotation', 'data-scale'].forEach(a => el.removeAttribute(a));

      const cssObject = new CSS3DObject(el);
      cssObject.name = name;
      cssObject.scale.set(scale, scale, scale);
      cssObject.position.set(...pos);
      cssObject.rotation.set(...rot);

      group.add(cssObject);
      panels[name] = cssObject;
    }

    group.userData = {
      targetInfo: data.raw,
      normalized: data,
      sphere,
      ...panels,
      panelEl: panels.MainBlock?.element || null,
      cssObject: panels.MainBlock || null,
      onAnswer,
      answerType: data.answerType,
      groupName: data.groupName
    };

    this._ensureDebugSaveButton(group, ui);
    return group;
  }

  // === ZONE: Normalization + Unity rich-text cleanup ===

  _normalizeTargetData(targetData) {
    const raw = typeof targetData === 'object' && targetData !== null
        ? targetData
        : { title: String(targetData ?? '') };

    const pick = (...keys) => {
      for (const k of keys) {
        const v = raw[k];
        if (v !== undefined && v !== null && String(v).trim() !== '') return v;
      }
      return '';
    };

    const clean = (s) => this._cleanUnityRichText(String(s || ''));

    const title = clean(pick('TitleText_Text', 'title', 'name', 'Title'));
    const question = clean(pick('Question', 'question'));
    let mainText = clean(pick('MainTxt_Text', 'mainText'));
    if (mainText === question) mainText = '';

    const helpUp = clean(pick('HelpUpText_Text', 'helpUp', 'HelpUp'));
    const helpDown = clean(pick('HelpDownText_Text', 'helpDown', 'HelpDown'));
    const help = clean(pick('help')) || [helpUp, helpDown].filter(Boolean).join('\n\n');

    const imageSrc = String(pick('imageSrc', 'AnswerPicture_Image', 'AdditionalImg_Image', 'image', 'img') || '');
    const imageCaption = clean(pick('imageCaption', 'imgLabel', 'AnswerPictureCaption'));
    const answerType = String(pick('AnswerType', 'answerType', 'type') || 'Slide');

    let options = raw.options || raw.Options || [];
    if (!Array.isArray(options)) options = [];
    options = options.map((o, i) => {
      if (typeof o === 'string') return { text: clean(o) };
      if (o && typeof o === 'object') return { text: clean(o.text ?? o.MainTxt_Text ?? String(o)) };
      return { text: `Вариант ${i + 1}` };
    });

    const groupName = String(pick('questId', 'QuestID', 'id', 'AnswerID', 'title', 'name') || 'target');

    return { raw, title, question, mainText, help, helpUp, helpDown, imageSrc, imageCaption, answerType, options, groupName };
  }

  _cleanUnityRichText(str) {
    if (!str) return '';
    return str
        .replace(/<\/?size(?:=[^>]*)?>/gi, '')
        .replace(/<\/?color(?:=[^>]*)?>/gi, '')
        .replace(/<\/?align(?:=[^>]*)?>/gi, '')
        .replace(/<\/?font(?:=[^>]*)?>/gi, '')
        .replace(/<\/?b>/gi, '')
        .replace(/<\/?i>/gi, '')
        .replace(/<\/?u>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
  }

  // === ZONE: Prefab ===

  async _ensurePrefab(url) {
    if (this._prefabCache) return;

    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const tpl = doc.querySelector('#ar-target') || doc.querySelector('template');
      if (!tpl) throw new Error('No <template id="ar-target">');

      // Инъекция стилей один раз
      if (!document.getElementById('ar-target-prefab-styles')) {
        const styleEl = doc.querySelector('style');
        const s = document.createElement('style');
        s.id = 'ar-target-prefab-styles';
        s.textContent = (styleEl ? styleEl.textContent : '') + `
          .ar-css3d-panel, .ar-css3d-panel * {
            pointer-events: auto !important;
            touch-action: manipulation !important;
          }
          .ar-buttons-block {
            z-index: 40 !important;
            pointer-events: auto !important;
          }
          .ar-quest-btn, .ar-quest-submit-btn, .ar-slide-nav {
            pointer-events: auto !important;
            min-width: 44px;
            min-height: 36px;
          }
        `;
        document.head.appendChild(s);
      }

      this._prefabCache = tpl.content || tpl;
      console.log('[ModelFactory] Prefab loaded:', url);
    } catch (e) {
      console.warn('[ModelFactory] Prefab failed, using fallback', url, e);
      this._prefabCache = this._buildFallbackPrefab();
    }
  }

  _getPanelNodes() {
    if (this._prefabCache) {
      return Array.from(this._prefabCache.querySelectorAll('[data-name]'));
    }
    this._prefabCache = this._buildFallbackPrefab();
    return Array.from(this._prefabCache.querySelectorAll('[data-name]'));
  }

  _buildFallbackPrefab() {
    const root = document.createDocumentFragment();

    const make = (name, cls, pos, rot, scale, html) => {
      const div = document.createElement('div');
      div.className = `ar-css3d-panel ${cls}`;
      div.style.pointerEvents = 'auto';
      div.dataset.name = name;
      div.dataset.position = pos;
      div.dataset.rotation = rot;
      div.dataset.scale = scale;
      div.innerHTML = html;
      root.appendChild(div);
    };

    make('LeftHelpBlock', 'ar-left-help-block',
        '-0.115, 0.025, 0', '-90, 16, 0', '0.00048',
        '<div class="ar-panel-help" data-field="help"></div>');

    make('MainBlock', 'ar-main-block',
        '0, 0.045, 0', '-90, 0, 0', '0.0005',
        `<div class="ar-panel-title" data-field="title"></div>
       <div class="ar-panel-question" data-field="question"></div>
       <div class="ar-panel-maintext" data-field="mainText"></div>`);

    make('RightBlock', 'ar-right-block',
        '0.115, 0.025, 0', '-90, -16, 0', '0.00048',
        `<img class="ar-panel-image" data-field="imageSrc" alt="" />
       <div class="ar-panel-help" data-field="imageCaption"></div>`);

    // ButtonsBlock — выше и крупнее для лучшего хита
    make('ButtonsBlock', 'ar-buttons-block',
        '0, -0.065, 0', '-90, 0, 0', '0.00055',
        '<div class="ar-quest-body" data-field="buttons"></div>');

    return root;
  }

  // === ZONE: Fill ===

  _fillPanel(el, name, data, onAnswer, ui, arInput) {
    const setText = (sel, val) => {
      const n = el.querySelector(sel);
      if (n) n.textContent = val || '';
    };

    if (name === 'LeftHelpBlock') {
      setText('[data-field="help"]', data.help);
      if (!data.help) el.classList.add('ar-panel-empty');
    }

    if (name === 'MainBlock') {
      setText('[data-field="title"]', data.title);
      setText('[data-field="question"]', data.question);
      setText('[data-field="mainText"]', data.mainText);
      if (!data.title && !data.question && !data.mainText) el.classList.add('ar-panel-empty');
    }

    if (name === 'RightBlock') {
      const img = el.querySelector('[data-field="imageSrc"]');
      if (img) {
        if (data.imageSrc) {
          img.src = data.imageSrc;
          img.alt = data.imageCaption || data.title || '';
        } else {
          img.removeAttribute('src');
        }
      }
      setText('[data-field="imageCaption"]', data.imageCaption);
      if (!data.imageSrc && !data.imageCaption) el.classList.add('ar-panel-empty');
    }

    if (name === 'ButtonsBlock') {
      const body = el.querySelector('[data-field="buttons"]') || el;
      this._buildQuestionBody(body, data, onAnswer, ui, arInput);
    }
  }

  // === ZONE: Interactive body ===

  _buildQuestionBody(bodyEl, data, onAnswer, ui, arInput) {
    bodyEl.innerHTML = '';
    const type = data.answerType || 'Slide';
    const options = data.options || [];

    if (type === 'Button') {
      const grid = document.createElement('div');
      grid.className = 'ar-quest-options-grid';
      options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ar-quest-btn';
        btn.textContent = opt.text || `Вариант ${idx + 1}`;
        arInput.bindInteractiveEvent(btn, `OptionButton_${idx + 1}`, () => onAnswer(idx + 1));
        grid.appendChild(btn);
      });
      bodyEl.appendChild(grid);

    } else if (type === 'InputField') {
      const wrap = document.createElement('div');
      wrap.className = 'ar-quest-input-block';

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'ar-quest-input';
      input.placeholder = 'Введите ответ...';
      arInput.bindInputField(input);

      input.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          playSound('click');
          onAnswer(input.value);
        }
      });

      const submitBtn = document.createElement('button');
      submitBtn.type = 'button';
      submitBtn.className = 'ar-quest-submit-btn';
      submitBtn.textContent = 'OK';
      arInput.bindInteractiveEvent(submitBtn, 'InputSubmitButton', () => onAnswer(input.value));

      wrap.appendChild(input);
      wrap.appendChild(submitBtn);
      bodyEl.appendChild(wrap);

    } else if (type === 'Art' || type === 'AntiArt') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ar-quest-submit-btn ar-quest-ok-btn';
      btn.textContent = 'OK';
      arInput.bindInteractiveEvent(btn, 'ArtOKButton', () => onAnswer(true));
      bodyEl.appendChild(btn);

    } else {
      // Slide
      let idx = 0;
      const total = Math.max(options.length, 1);

      const slider = document.createElement('div');
      slider.className = 'ar-quest-slider';

      const prev = document.createElement('button');
      prev.type = 'button';
      prev.className = 'ar-slide-nav prev';
      prev.textContent = '◄';

      const slideContent = document.createElement('div');
      slideContent.className = 'ar-slide-content';
      slideContent.textContent = options[0]?.text || data.mainText || data.question || '';

      const next = document.createElement('button');
      next.type = 'button';
      next.className = 'ar-slide-nav next';
      next.textContent = '►';

      const update = () => {
        slideContent.textContent = options[idx]?.text || data.mainText || data.question || '';
      };

      arInput.bindInteractiveEvent(prev, 'SliderPrev', () => {
        idx = (idx - 1 + total) % total;
        update();
      });
      arInput.bindInteractiveEvent(next, 'SliderNext', () => {
        idx = (idx + 1) % total;
        update();
      });

      slider.appendChild(prev);
      slider.appendChild(slideContent);
      slider.appendChild(next);
      bodyEl.appendChild(slider);

      const okBtn = document.createElement('button');
      okBtn.type = 'button';
      okBtn.className = 'ar-quest-submit-btn ar-quest-ok-btn';
      okBtn.textContent = 'OK';
      arInput.bindInteractiveEvent(okBtn, 'SliderOK', () => onAnswer(idx + 1));
      bodyEl.appendChild(okBtn);
    }
  }

  // === ZONE: Helpers ===

  _createSphere() {
    const geo = new THREE.SphereGeometry(0.0075, 24, 24);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 0.5
    });
    return new THREE.Mesh(geo, mat);
  }

  _parseVec3(str, fallback) {
    if (!str) return fallback.slice();
    const parts = String(str).split(',').map(s => parseFloat(s.trim()));
    return parts.length === 3 && parts.every(Number.isFinite) ? parts : fallback.slice();
  }

  // === ZONE: Debug save ===

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
      box-shadow: 0 4px 16px rgba(0,0,0,0.5);
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
          rotation: obj.rotation.toArray().map(r => +(r * 180 / Math.PI).toFixed(1)),
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
    console.log('[ModelFactory] Snapshot', snapshot);
  }
}

const defaultFactory = new ModelFactory();

export function createArTargetSync(targetData, options = {}) {
  return defaultFactory.createArTargetSync(targetData, options);
}

export async function createArTarget(targetData, options = {}) {
  return defaultFactory.createArTarget(targetData, options);
}

export { ModelFactory as default };
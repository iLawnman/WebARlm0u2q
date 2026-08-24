// arpanel.js - AR Panel Creator
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
    this.prefabSource = null;
    this.prefabSourceUrl = null;
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
      <div class="screen active" id="screen-fallback">
        <div class="bg"></div>
        <div class="bg-img"></div>
        <div class="modal-overlay" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;background:rgba(0,0,0,0.8);align-items:center;justify-content:center;pointer-events:none;">
          <div class="modal-window" style="background:#1a1a2e;padding:30px;border-radius:15px;max-width:80%;max-height:80%;overflow:auto;color:white;position:relative;pointer-events:auto;box-shadow:0 10px 40px rgba(0,0,0,0.5);">
            <button class="modal-close-btn" type="button" style="position:absolute;top:10px;right:15px;font-size:28px;font-weight:bold;background:none;border:none;color:#ff6b6b;cursor:pointer;z-index:999999;pointer-events:auto;padding:10px 15px;min-width:48px;min-height:48px;">✕</button>
            <div class="modal-title" style="font-size:20px;font-weight:bold;margin-bottom:15px;color:#ffd700;"></div>
            <div class="modal-body" style="font-size:16px;line-height:1.6;color:#e0e0e0;"></div>
          </div>
        </div>
        <div class="content">
          <div class="title-area">
            <div class="title-text"></div>
          </div>
          <div class="panels">
            <div class="panel side-panel">
              <div class="panel-corner tl"></div>
              <div class="panel-corner tr"></div>
              <div class="panel-corner bl"></div>
              <div class="panel-corner br"></div>
              <div class="help-slot">
                <div class="help">📍 ПОДСКАЗКА</div>
                <div class="help-body"></div>
              </div>
              <div class="help-slot">
                <div class="help">📍 СОВЕТ</div>
                <div class="help-body"></div>
              </div>
            </div>
            <div class="panel main-panel">
              <div class="panel-corner tl"></div>
              <div class="panel-corner tr"></div>
              <div class="panel-corner bl"></div>
              <div class="panel-corner br"></div>
              <div class="decor-line"></div>
              <div class="main-text"></div>
              <div class="decor-line"></div>
            </div>
            <div class="panel side-panel">
              <div class="panel-corner tl"></div>
              <div class="panel-corner tr"></div>
              <div class="panel-corner bl"></div>
              <div class="panel-corner br"></div>
              <div class="right-label">📜 ЗАМЕТКА</div>
              <div class="right-panel-content"></div>
            </div>
          </div>
          <div class="buttons-area">
            <div class="buttons-row"></div>
            <div class="next-btn-wrap">
              <button class="next-btn" type="button" style="display:none;">Дальше</button>
            </div>
          </div>
        </div>
      </div>`;
    return div.firstElementChild;
  }

  async ensurePrefab(url, ui = null) {
    if (this.prefabCache) {
      console.log('[ARPanelCreator] Prefab already cached, source:', this.prefabSource);
      return;
    }

    console.log('[ARPanelCreator] Fetching prefab from:', url);
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const screenRoot = doc.querySelector('.screen') || doc.querySelector('body > div');
      if (!screenRoot) {
        throw new Error('Не найден корневой узел префаба');
      }

      // Добавляем стили
      if (!document.getElementById('ar-target-prefab-styles')) {
        const s = document.createElement('style');
        s.id = 'ar-target-prefab-styles';
        s.textContent = `
          .ar-target-screen, .ar-target-screen * { 
            pointer-events: auto !important; 
            touch-action: manipulation !important; 
          }
          .ar-target-screen .modal-close-btn {
            pointer-events: auto !important;
            z-index: 99999 !important;
            position: relative !important;
            cursor: pointer !important;
          }
          .ar-target-screen .modal-overlay {
            pointer-events: auto !important;
          }
          .modal-overlay {
            display: none !important;
          }
          .modal-overlay.active {
            display: flex !important;
          }
        `;
        document.head.appendChild(s);
      }

      this.prefabCache = screenRoot;
      this.prefabSource = 'server';
      this.prefabSourceUrl = url;
      if (ui) ui.log(`[ARPanelCreator] Prefab loaded from server: ${url}`, 'ok');
    } catch (e) {
      this.prefabSource = 'fallback-code';
      this.prefabSourceUrl = null;
      console.warn('[ARPanelCreator] Prefab fetch failed, using fallback:', e.message);
      if (ui) ui.log(`[ARPanelCreator] Using fallback prefab: ${e.message || e}`, 'warn');
      this.prefabCache = this._buildFallbackPrefab();
    }
  }

  _getScreenRoot() {
    if (this.prefabCache) return this.prefabCache;
    this.prefabSource = 'fallback-code';
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
    el.style.background = 'transparent';
    
    el.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
    if (el.id) el.removeAttribute('id');

    // Отключаем pointer-events для декоративных элементов
    el.querySelectorAll(
      '.title-text, .help, .help-body, .main-text, .decor-line, .panel-corner, ' +
      '.mandala-icon, .bg, .bg-img, .right-panel-content'
    ).forEach((n) => { n.style.pointerEvents = 'none'; });

    this._fillScreen(el, data, onAnswer, ui, arInput);
    this._applyDesignToScreen(el, this.designPrefab);

    const cssObject = new CSS3DObject(el);
    cssObject.name = 'Screen';
    cssObject.scale.set(SCREEN_SCALE, SCREEN_SCALE, SCREEN_SCALE);
    cssObject.position.set(0, 0.05, 0);
    cssObject.rotation.set(-Math.PI / 2, 0, 0);

    return { el, cssObject };
  }

  _fillScreen(el, data, onAnswer, ui, arInput) {
    const setText = (sel, val) => {
      const n = el.querySelector(sel);
      if (n) n.textContent = val || '';
      return n;
    };

    setText('.title-area .title-text', data.title);
    setText('.modal-title', data.title);

    const helpBodies = el.querySelectorAll('.panels > .side-panel:first-child .help-body');
    if (helpBodies[0]) helpBodies[0].textContent = data.helpUp || data.help || '';
    if (helpBodies[1]) helpBodies[1].textContent = data.helpDown || '';

    setText('.main-panel .main-text', [data.question, data.mainText].filter(Boolean).join('\n\n'));

    const storySrc = data.raw?.story || data.raw?.legend || data.raw?.intro || data.mainText || data.question || '';
    setText('.modal-body', storySrc);

    const rightPanel = el.querySelectorAll('.panels > .side-panel')[1];
    if (rightPanel) {
      const noteEl = rightPanel.querySelector('.right-panel-content');
      if (noteEl) noteEl.textContent = data.imageCaption || '';
      let img = rightPanel.querySelector('img.ar-target-image');
      if (data.imageSrc) {
        if (!img) {
          img = document.createElement('img');
          img.className = 'ar-target-image';
          rightPanel.insertBefore(img, rightPanel.firstChild);
        }
        img.src = data.imageSrc;
        img.alt = data.imageCaption || data.title || '';
      } else if (img) {
        img.remove();
      }
    }

    const buttonsRow = el.querySelector('.buttons-area .buttons-row');
    if (buttonsRow) {
      this.buttonCreator.buildQuestionBody(buttonsRow, data, onAnswer, ui, arInput, this.designPrefab);
    }

    const nextBtn = el.querySelector('.next-btn');
    if (nextBtn) nextBtn.style.display = 'none';

    // Модалка
    this.modalManager.setupModal(el, data, ui);
  }

  _applyDesignToScreen(el, p) {
    if (!p) return;

    const parser = this.parser;
    const applied = [];
    const skippedNoValue = [];
    const skippedNoElement = [];

    const setBg = (field, value, target, targetLabel, isImage) => {
      if (!target) { skippedNoElement.push(`${field} (нет узла "${targetLabel}")`); return; }
      if (value === undefined || value === null || value === '') { skippedNoValue.push(field); return; }
      if (isImage) {
        const url = parser.normalizeDesignAsset(value);
        target.style.backgroundImage = `url('${url}')`;
        target.style.backgroundSize = 'cover';
        applied.push(`${field}=${value} → ${url}`);
      } else {
        target.style.backgroundColor = value;
        applied.push(`${field}=${value}`);
      }
    };

    const setColor = (field, value, target, targetLabel) => {
      if (!target) { skippedNoElement.push(`${field} (нет узла "${targetLabel}")`); return; }
      if (value === undefined || value === null || value === '') { skippedNoValue.push(field); return; }
      target.style.color = value;
      applied.push(`${field}=${value}`);
    };

    const setExistingBgAll = (field, value, targets, targetsLabel) => {
      if (!targets || !targets.length) { skippedNoElement.push(`${field} (нет узлов "${targetsLabel}")`); return; }
      if (!value) { skippedNoValue.push(field); return; }
      const url = parser.normalizeDesignAsset(value);
      targets.forEach((t) => {
        t.style.backgroundImage = `url('${url}')`;
        t.style.backgroundSize = 'contain';
        t.style.backgroundRepeat = 'no-repeat';
      });
      applied.push(`${field}=${value} → ${url} (${targets.length} узлов)`);
    };

    const sidePanels = el.querySelectorAll('.panels > .side-panel');
    const leftPanel = sidePanels[0] || null;
    const rightPanel = sidePanels[1] || null;
    const mainPanel = el.querySelector('.main-panel');
    const titleArea = el.querySelector('.title-area');
    const titleText = el.querySelector('.title-area .title-text');
    const buttonsArea = el.querySelector('.buttons-area');
    const bgImgEl = el.querySelector('.bg-img');

    setBg('back_image', p.back_image, bgImgEl, '.bg-img', true);
    setBg('title_bg_color', p.title_bg_color, titleArea, '.title-area', false);
    setBg('title_bg_image', p.title_bg_image, titleArea, '.title-area', true);
    setColor('title_color', p.title_color, titleText, '.title-area .title-text');
    setBg('main_bg_color', p.main_bg_color, mainPanel, '.main-panel', false);
    setBg('main_bg_image', p.main_bg_image, mainPanel, '.main-panel', true);
    setColor('title_color', p.title_color, mainPanel?.querySelector('.main-text'), '.main-panel .main-text');
    setExistingBgAll('main_corner', p.main_corner, mainPanel ? Array.from(mainPanel.querySelectorAll('.panel-corner')) : [], '.main-panel .panel-corner');
    setExistingBgAll('main_decor1+main_decor2', p.main_decor1 || p.main_decor2, mainPanel ? Array.from(mainPanel.querySelectorAll('.decor-line')) : [], '.main-panel .decor-line');

    setBg('left_bg_color', p.left_bg_color, leftPanel, '.panels > .side-panel[0]', false);
    setBg('left_bg_image', p.left_bg_image, leftPanel, '.panels > .side-panel[0]', true);
    if (leftPanel) {
      const helpLabels = leftPanel.querySelectorAll('.help');
      if (p.left_help_color && helpLabels.length) {
        helpLabels.forEach((h) => { h.style.color = p.left_help_color; });
        applied.push(`left_help_color=${p.left_help_color} (${helpLabels.length} меток)`);
      } else if (!p.left_help_color) {
        skippedNoValue.push('left_help_color');
      } else {
        skippedNoElement.push('left_help_color (нет узлов .help)');
      }
    } else {
      skippedNoElement.push('left_bg_color/left_bg_image/left_help_color (нет левой .side-panel)');
    }
    setExistingBgAll('left_corner', p.left_corner, leftPanel ? Array.from(leftPanel.querySelectorAll('.panel-corner')) : [], 'левая .side-panel .panel-corner');

    setBg('right_bg_color', p.right_bg_color, rightPanel, '.panels > .side-panel[1]', false);
    setBg('right_bg_image', p.right_bg_image, rightPanel, '.panels > .side-panel[1]', true);
    setExistingBgAll('right_corner', p.right_corner, rightPanel ? Array.from(rightPanel.querySelectorAll('.panel-corner')) : [], 'правая .side-panel .panel-corner');

    setBg('buttons_bg_color', p.buttons_bg_color, buttonsArea, '.buttons-area', false);
    setBg('buttons_bg_image', p.buttons_bg_image, buttonsArea, '.buttons-area', true);

    console.log('[ARPanelCreator] Design applied:', applied.length, 'fields');
  }
}
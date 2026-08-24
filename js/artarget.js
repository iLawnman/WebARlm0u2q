import * as THREE from 'three';
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { playSound } from './audio.js';
import { ARInput } from './arinput.js';

const DEFAULT_PREFAB_URL = './assets/artargetPrefabNew.html';

// === Дизайн-префаб ===
const DESIGN_RES = './assets/resources';

function normalizeDesignAsset(name) {
  if (!name) return '';
  const n = String(name).trim();
  if (!n) return '';
  if (/^(https?:|\/\/|\.\/|\/)/i.test(n)) return n;
  return DESIGN_RES + '/' + n + (/\.[a-z0-9]+$/i.test(n) ? '' : '.png');
}

const DESIGN_JSON_CANDIDATES = [
  './assets/arprefabdesign.json',
  './assets/arprefabsdesign.json',
  './arprefabdesign.json',
  './arprefabsdesign.json'
];

async function tryFetchDesignJson(path, ui = null) {
  if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') {
    console.log('[ModelFactory] tryFetchDesignJson: protocol is file:, skipping fetch of', path);
    return null;
  }
  console.log('[ModelFactory] tryFetchDesignJson: trying', path);
  try {
    const r = await fetch(path);
    console.log('[ModelFactory] tryFetchDesignJson: response for', path, '→', r.status, r.statusText);
    if (r.ok) {
      const json = await r.json();
      console.log('[ModelFactory] tryFetchDesignJson: OK, parsed JSON from', path, '— top-level keys:', Object.keys(json || {}));
      return json;
    }
  } catch (e) {
    console.log('[ModelFactory] tryFetchDesignJson: FAILED for', path, '—', e.message || e);
  }
  return null;
}

export function designGroupsToPrefab(groups) {
  const getter = (group, prop, def) => {
    if (!groups || !groups[group]) return def;
    const val = groups[group][prop];
    return (val !== undefined && val !== null && val !== '') ? val : def;
  };
  return {
    back_image: getter('BackGradient', 'image') || getter('BackImage', 'image'),
    title_bg_color: getter('TitleText_bg', 'color'),
    title_bg_image: getter('TitleText_bg', 'image'),
    title_color: getter('TitleText', 'color', '#FFD700'),
    title_corner_image: getter('TitleText_4corner_decor_Corner', 'image') || 'RusStyleElement',
    main_corner: getter('MainText_4corner_decor_Corner', 'image') || 'RusStyleElement',
    main_bg_color: getter('MainText_bg', 'color', 'rgba(7,7,7,0.93)'),
    main_bg_image: getter('MainText_bg', 'image', 'MainTextPanelDark'),
    main_decor1: getter('MainText_Decor_2lines_line1', 'image', 'Line2S'),
    main_decor2: getter('MainText_Decor_2lines_line2', 'image', 'Line2S'),
    left_bg_color: getter('LeftPanel_bgLeftPanel', 'color', 'rgba(7,7,7,0.93)'),
    left_bg_image: getter('LeftPanel_bgLeftPanel', 'image', 'MainTextPanelDark'),
    left_help_color: getter('LeftPanel_HelpUp', 'color', '#FF69B4'),
    left_corner: getter('LeftPanel_4corner_decor_Corner', 'image') || 'RusStyleElement',
    right_bg_color: getter('RightPanel_bgRight_Panel', 'color', 'rgba(7,7,7,0.93)'),
    right_bg_image: getter('RightPanel_bgRight_Panel', 'image', 'MainTextPanelDark'),
    right_corner: getter('RightPanel_4corner_decor_Corner', 'image') || 'RusStyleElement',
    buttons_bg_color: getter('Buttons_bgButtonsPanel', 'color', 'rgba(7,7,7,0.93)'),
    buttons_bg_image: getter('Buttons_bgButtonsPanel', 'image', 'ButtonPanelBG'),
    btn_next_text: getter('Buttons_Button_NEXT_Text', 'text', 'Дальше'),
    input_ph_text: getter('Buttons_InputField', 'text') || getter('Buttons_InputField_Placeholder', 'text', 'ВВЕДИТЕ ОТВЕТ')
  };
}

export class ModelFactory {
  constructor(defaults = {}) {
    this.prefabUrl = defaults.prefabUrl || DEFAULT_PREFAB_URL;
    this._prefabCache = null;
    this._debugSaveBtn = null;
    this._prefabSource = null;
    this._prefabSourceUrl = null;
    this._designPrefab = null;
    this._designAutoLoadAttempted = false;
  }

  setDesignPrefab(prefab) {
    if (!prefab) {
      console.log('[ModelFactory.setDesignPrefab] called with', prefab, '→ design reset, panels will use default HTML-prefab styles');
    } else {
      const keys = Object.keys(prefab);
      const filledKeys = keys.filter(k => prefab[k] !== undefined && prefab[k] !== null && prefab[k] !== '');
      console.log(
          `[ModelFactory.setDesignPrefab] received design prefab: ${filledKeys.length}/${keys.length} fields set →`,
          filledKeys
      );
      console.log('[ModelFactory.setDesignPrefab] full prefab payload:', prefab);
    }
    this._designPrefab = prefab;
  }

  getDesignPrefab() {
    return this._designPrefab;
  }

  async _autoLoadDesignIfNeeded(ui = null) {
    if (this._designPrefab) {
      console.log('[ModelFactory] _autoLoadDesignIfNeeded: design prefab already set explicitly → skipping autoload');
      return;
    }
    if (this._designAutoLoadAttempted) {
      console.log('[ModelFactory] _autoLoadDesignIfNeeded: autoload already attempted before → skipping');
      return;
    }
    this._designAutoLoadAttempted = true;

    console.log('[ModelFactory] _autoLoadDesignIfNeeded: trying candidates:', DESIGN_JSON_CANDIDATES);
    if (ui) ui.log('[ModelFactory] Searching for design JSON...', 'info');

    let groups = null;
    let foundPath = null;
    for (const path of DESIGN_JSON_CANDIDATES) {
      groups = await tryFetchDesignJson(path, ui);
      if (groups) { foundPath = path; break; }
    }

    if (!groups) {
      console.log('[ModelFactory] _autoLoadDesignIfNeeded: no design JSON found at any candidate path → panels will use default styles');
      if (ui) ui.log('[ModelFactory] No design JSON found → using default panel styles', 'warn');
      return;
    }

    console.log('[ModelFactory] _autoLoadDesignIfNeeded: design JSON found at', foundPath, '→ converting via designGroupsToPrefab');
    if (ui) ui.log(`[ModelFactory] Design JSON loaded from ${foundPath}`, 'ok');

    const prefab = designGroupsToPrefab(groups);
    this.setDesignPrefab(prefab);
  }

  async createArTarget(targetData = '', options = {}) {
    const prefabUrl = options.prefabUrl || this.prefabUrl;
    const ui = options.ui || null;
    console.log('[ModelFactory] createArTarget: requesting prefab from', prefabUrl);
    if (ui) ui.log(`[ModelFactory] Requesting prefab: ${prefabUrl}`, 'info');
    await this._ensurePrefab(prefabUrl, ui);
    console.log(
        '[ModelFactory] createArTarget: prefab source =',
        this._prefabSource,
        '(url:', this._prefabSourceUrl, ')'
    );
    if (ui) ui.log(`[ModelFactory] Prefab source: ${this._prefabSource}`, this._prefabSource === 'server' ? 'ok' : 'warn');

    await this._autoLoadDesignIfNeeded(ui);

    return this.createArTargetSync(targetData, options);
  }

  createArTargetSync(targetData = '', options = {}) {
    const { onAnswer = null, ui = null } = options;
    const data = this._normalizeTargetData(targetData);
    const arInput = new ARInput(ui);

    if (!this._prefabCache) {
      console.warn(
          '[ModelFactory] createArTargetSync called WITHOUT a cached prefab ' +
          '(createArTarget/_ensurePrefab was not awaited before this call). ' +
          'Falling back to built-in defaultPrefab from code, not from server.'
      );
      if (ui) ui.log('[ModelFactory] No cached prefab → using built-in defaultPrefab from code (server not fetched)', 'warn');
    } else {
      console.log(
          '[ModelFactory] createArTargetSync: using cached prefab, source =',
          this._prefabSource || 'unknown'
      );
      if (ui) ui.log(`[ModelFactory] Using cached prefab, source = ${this._prefabSource || 'unknown'}`, 'info');
    }
    if (this._designPrefab) {
      console.log('[ModelFactory] createArTargetSync: design prefab IS SET → will style panels:', this._designPrefab);
      if (ui) ui.log('[ModelFactory] Design prefab set → applying custom design to panels', 'info');
    } else {
      console.log('[ModelFactory] createArTargetSync: design prefab is NULL/unset → panels use default HTML-prefab styles');
      if (ui) ui.log('[ModelFactory] No design prefab set → using default panel styles', 'info');
    }

    const group = new THREE.Group();
    group.name = `arTarget_${data.groupName}`;

    const sphere = this._createSphere();
    group.add(sphere);

    const handleAnswer = (value) => {
      if (ui) ui.log(`[Target:${data.groupName}] Answer: ${value}`, 'ok');
      playSound('click');
      if (typeof onAnswer === 'function') onAnswer(value);
    };

    const SCREEN_WIDTH_PX = 500;
    const SCREEN_HEIGHT_PX = 600;
    const SCREEN_SCALE = 0.0005;

    const screenSrc = this._getScreenRoot(ui);
    const el = screenSrc.cloneNode(true);
    console.log('[ModelFactory] Building single combined screen from prefab, source =', this._prefabSource);

    el.classList.add('ar-target-screen');
    el.style.width = `${SCREEN_WIDTH_PX}px`;
    el.style.height = `${SCREEN_HEIGHT_PX}px`;
    el.style.pointerEvents = 'auto';
    el.style.touchAction = 'manipulation';
    el.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
    if (el.id) el.removeAttribute('id');

    el.querySelectorAll(
        '.title-text, .help, .help-body, .main-text, .decor-line, .panel-corner, ' +
        '.mandala-icon, .bg, .bg-img, .right-panel-content'
    ).forEach((n) => { n.style.pointerEvents = 'none'; });

    this._fillScreen(el, data, handleAnswer, ui, arInput);
    this._applyDesignToScreen(el, this._designPrefab);

    const zoneMainPanel = el.querySelector('.main-panel');
    const zoneLeftPanel = el.querySelector('.panels > .side-panel');
    const zoneRightPanel = el.querySelectorAll('.panels > .side-panel')[1] || null;
    const zoneButtons = el.querySelector('.buttons-area');
    if (zoneMainPanel) arInput.bindPanelEvents(zoneMainPanel, 'MainBlock');
    if (zoneLeftPanel) arInput.bindPanelEvents(zoneLeftPanel, 'LeftHelpBlock');
    if (zoneRightPanel) arInput.bindPanelEvents(zoneRightPanel, 'RightBlock');
    if (zoneButtons) arInput.bindPanelEvents(zoneButtons, 'ButtonsBlock');

    const cssObject = new CSS3DObject(el);
    cssObject.name = 'Screen';
    cssObject.scale.set(SCREEN_SCALE, SCREEN_SCALE, SCREEN_SCALE);
    cssObject.position.set(0, 0.05, 0);
    cssObject.rotation.set(-Math.PI / 2, 0, 0);
    group.add(cssObject);

    const panels = { Screen: cssObject, MainBlock: cssObject, LeftHelpBlock: cssObject, RightBlock: cssObject, ButtonsBlock: cssObject };

    setTimeout(() => {
      const rect = el.getBoundingClientRect();
      console.log('[Screen] screen rect:', {
        x: Math.round(rect.x), y: Math.round(rect.y),
        w: Math.round(rect.width), h: Math.round(rect.height),
        visible: rect.width > 0 && rect.height > 0
      });
    }, 300);

    group.userData = {
      targetInfo: data.raw,
      normalized: data,
      sphere,
      ...panels,
      panelEl: el,
      cssObject,
      onAnswer,
      answerType: data.answerType,
      groupName: data.groupName
    };

    this._ensureDebugSaveButton(group, ui);
    return group;
  }

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

  async _ensurePrefab(url, ui = null) {
    if (this._prefabCache) {
      console.log(
          '[ModelFactory] _ensurePrefab: already cached, source =',
          this._prefabSource, '(url:', this._prefabSourceUrl, ') — skipping fetch of', url
      );
      return;
    }

    console.log('[ModelFactory] _ensurePrefab: fetching from server →', url);
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      console.log('[ModelFactory] _ensurePrefab: fetch response', res.status, res.statusText, 'for', url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      console.log('[ModelFactory] _ensurePrefab: received', html.length, 'bytes of HTML from', url);

      const doc = new DOMParser().parseFromString(html, 'text/html');
      const screenRoot = doc.querySelector('.screen') || doc.querySelector('body > div');
      if (!screenRoot) {
        throw new Error('Не найден корневой узел префаба (.screen или хотя бы body > div)');
      }

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
        `;
        document.head.appendChild(s);
      }

      this._prefabCache = screenRoot;
      this._prefabSource = 'server';
      this._prefabSourceUrl = url;
      const panelCount = this._prefabCache.querySelectorAll('.panel').length;
      console.log('[ModelFactory] Prefab loaded OK from SERVER:', url, '— .panel elements found:', panelCount);
      if (ui) ui.log(`[ModelFactory] Prefab loaded from SERVER: ${url} (${panelCount} panels)`, 'ok');
    } catch (e) {
      this._prefabSource = 'fallback-code';
      this._prefabSourceUrl = null;
      console.warn(
          '[ModelFactory] Prefab fetch FAILED for', url,
          '→ using built-in defaultPrefab from code (NOT from server). Reason:', e
      );
      if (ui) ui.log(`[ModelFactory] Prefab fetch FAILED (${url}) → using code fallback. ${e.message || e}`, 'warn');
      this._prefabCache = this._buildFallbackPrefab();
    }
  }

  _getScreenRoot(ui = null) {
    if (this._prefabCache) {
      console.log('[ModelFactory] _getScreenRoot: using prefab, source =', this._prefabSource);
      return this._prefabCache;
    }
    console.warn(
        '[ModelFactory] _getScreenRoot: no prefab cached yet → building defaultPrefab from code ' +
        '(server prefab was never fetched/awaited). This is the code-side fallback, not the server one.'
    );
    if (ui) ui.log('[ModelFactory] _getScreenRoot: no cached prefab → building defaultPrefab from code', 'warn');
    this._prefabSource = 'fallback-code';
    this._prefabSourceUrl = null;
    this._prefabCache = this._buildFallbackPrefab();
    return this._prefabCache;
  }

  _buildFallbackPrefab() {
    const div = document.createElement('div');
    div.innerHTML = `
      <div class="screen active" id="screen-fallback">
        <div class="bg"></div>
        <div class="bg-img"></div>
        <div class="modal-overlay" style="display:flex;">
          <div class="modal-window">
            <button class="modal-close-btn" type="button">✕</button>
            <div class="modal-title"></div>
            <div class="modal-body"></div>
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
      this._buildQuestionBody(buttonsRow, data, onAnswer, ui, arInput);
    }

    const nextBtn = el.querySelector('.next-btn');
    if (nextBtn) nextBtn.style.display = 'none';

    // ============================================================
    // МОДАЛКА - ИСПРАВЛЕННАЯ ОБРАБОТКА
    // ============================================================
    const modalOverlay = el.querySelector('.modal-overlay');
    const modalCloseBtn = el.querySelector('.modal-close-btn');
    
    if (modalOverlay && modalCloseBtn) {
      console.log('[Modal] Found modal overlay and close button');
      if (ui) ui.log('[Modal] Found modal overlay and close button', 'info');
      
      // Убеждаемся, что модалка видима
      modalOverlay.style.display = 'flex';
      modalOverlay.style.pointerEvents = 'auto';
      modalOverlay.style.touchAction = 'manipulation';
      
      // Убеждаемся, что кнопка видима и кликабельна
      modalCloseBtn.style.display = 'block';
      modalCloseBtn.style.pointerEvents = 'auto';
      modalCloseBtn.style.touchAction = 'manipulation';
      modalCloseBtn.style.cursor = 'pointer';
      modalCloseBtn.style.zIndex = '99999';
      modalCloseBtn.style.position = 'relative';
      modalCloseBtn.style.minWidth = '40px';
      modalCloseBtn.style.minHeight = '40px';
      modalCloseBtn.style.padding = '8px';
      modalCloseBtn.style.fontSize = '20px';
      modalCloseBtn.style.lineHeight = '1';
      
      // Сохраняем ссылки для обработчика
      const modalOverlayRef = modalOverlay;
      const modalCloseBtnRef = modalCloseBtn;
      const elRef = el;
      
      const closeModal = (e) => {
        console.log('[Modal] closeModal called!', e ? e.type : 'no event');
        if (ui) ui.log('[Modal] closeModal called!', 'ok');
        
        try {
          // Читаем текст модалки до удаления
          const modalBody = elRef.querySelector('.modal-body');
          const modalBodyText = modalBody ? modalBody.textContent : '';
          console.log('[Modal] modal body text length:', modalBodyText ? modalBodyText.length : 0);
          
          // Скрываем и удаляем модалку
          modalOverlayRef.style.display = 'none';
          modalOverlayRef.remove();
          console.log('[Modal] modal overlay removed');
          
          // Переносим текст в правую панель
          const noteEl = elRef.querySelector('.panels > .side-panel:last-child .right-panel-content');
          if (noteEl && !noteEl.textContent.trim() && modalBodyText) {
            noteEl.textContent = modalBodyText;
            console.log('[Modal] text moved to right panel');
            if (ui) ui.log('[Modal] Text moved to right panel', 'info');
          }
          
          console.log('[Modal] Closed successfully');
          if (ui) ui.log('[Modal] Closed successfully', 'ok');
        } catch (err) {
          console.error('[Modal] Error in closeModal:', err);
          if (ui) ui.log('[Modal] Error: ' + err.message, 'error');
        }
      };
      
      // ===== НАВЕШИВАЕМ ОБРАБОТЧИКИ ВСЕМИ ВОЗМОЖНЫМИ СПОСОБАМИ =====
      
      // 1. Через ARInput
      if (typeof arInput.bindInteractiveEvent === 'function') {
        arInput.bindInteractiveEvent(modalCloseBtnRef, 'ModalCloseButton', closeModal);
        console.log('[Modal] Bound via arInput.bindInteractiveEvent');
        if (ui) ui.log('[Modal] Bound via arInput.bindInteractiveEvent', 'info');
      }
      
      // 2. Прямой обработчик click (capture phase)
      modalCloseBtnRef.addEventListener('click', function(e) {
        console.log('[Modal] Direct click handler (capture)');
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (e.cancelable) e.preventDefault();
        closeModal(e);
      }, true);
      
      // 3. Прямой обработчик click (bubble phase)
      modalCloseBtnRef.addEventListener('click', function(e) {
        console.log('[Modal] Direct click handler (bubble)');
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (e.cancelable) e.preventDefault();
        closeModal(e);
      }, false);
      
      // 4. Pointerup (capture)
      modalCloseBtnRef.addEventListener('pointerup', function(e) {
        if (e.button === 0) {
          console.log('[Modal] Direct pointerup handler (capture)');
          e.stopPropagation();
          e.stopImmediatePropagation();
          if (e.cancelable) e.preventDefault();
          closeModal(e);
        }
      }, true);
      
      // 5. Touch events для мобильных
      modalCloseBtnRef.addEventListener('touchstart', function(e) {
        console.log('[Modal] Touchstart handler');
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (e.cancelable) e.preventDefault();
      }, true);
      
      modalCloseBtnRef.addEventListener('touchend', function(e) {
        console.log('[Modal] Touchend handler');
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (e.cancelable) e.preventDefault();
        closeModal(e);
      }, true);
      
      // 6. Клик по оверлею - НЕ закрываем модалку
      modalOverlayRef.addEventListener('click', function(e) {
        if (e.target === modalOverlayRef) {
          console.log('[Modal] Click on overlay - ignoring');
          if (ui) ui.log('[Modal] Click on overlay - ignoring', 'info');
        }
      });
      
      console.log('[Modal] All handlers attached');
      if (ui) ui.log('[Modal] All handlers attached', 'ok');
      
    } else {
      console.warn('[Modal] Modal overlay or close button not found');
      if (ui) ui.log('[Modal] Modal overlay or close button not found', 'warn');
    }
  }

  _applyDesignToScreen(el, p) {
    if (!p) return;

    const applied = [];
    const skippedNoValue = [];
    const skippedNoElement = [];

    const setBg = (field, value, target, targetLabel, isImage) => {
      if (!target) { skippedNoElement.push(`${field} (нет узла "${targetLabel}")`); return; }
      if (value === undefined || value === null || value === '') { skippedNoValue.push(field); return; }
      if (isImage) {
        const url = normalizeDesignAsset(value);
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
      const url = normalizeDesignAsset(value);
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

    console.log(
        '[ModelFactory._applyDesignToScreen] ' +
        `applied=[${applied.join('; ') || '—'}] ` +
        `skippedNoValue=[${skippedNoValue.join(', ') || '—'}] ` +
        `skippedNoElement=[${skippedNoElement.join(', ') || '—'}]`
    );
  }

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
      input.placeholder = (this._designPrefab && this._designPrefab.input_ph_text) || 'Введите ответ...';
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
    const parts = String(str).split(',').map((s) => parseFloat(s.trim()));
    return parts.length === 3 && parts.every(Number.isFinite) ? parts : fallback.slice();
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

// ===== ЭКСПОРТЫ =====
const defaultFactory = new ModelFactory();

export function createArTargetSync(targetData, options = {}) {
  return defaultFactory.createArTargetSync(targetData, options);
}

export async function createArTarget(targetData, options = {}) {
  return defaultFactory.createArTarget(targetData, options);
}

export function setArTargetDesignPrefab(prefab) {
  defaultFactory.setDesignPrefab(prefab);
}

export function getArTargetDesignPrefab() {
  return defaultFactory.getDesignPrefab();
}

export async function preloadArTargetPrefab(url, ui = null) {
  const prefabUrl = url || defaultFactory.prefabUrl;
  console.log('[ModelFactory] preloadArTargetPrefab: preloading', prefabUrl);
  if (ui) ui.log(`[ModelFactory] Preloading AR target prefab: ${prefabUrl}`, 'info');
  await defaultFactory._ensurePrefab(prefabUrl, ui);
  const source = defaultFactory._prefabSource;
  console.log('[ModelFactory] preloadArTargetPrefab: done, source =', source);
  if (ui) ui.log(`[ModelFactory] Prefab preload done, source = ${source}`, source === 'server' ? 'ok' : 'warn');
  return source;
}

export async function preloadArTargetDesign(ui = null) {
  console.log('[ModelFactory] preloadArTargetDesign: preloading design JSON');
  if (ui) ui.log('[ModelFactory] Preloading AR target design JSON...', 'info');
  await defaultFactory._autoLoadDesignIfNeeded(ui);
  const prefab = defaultFactory.getDesignPrefab();
  console.log('[ModelFactory] preloadArTargetDesign: done, design prefab =', prefab ? 'SET' : 'NOT SET');
  if (ui) ui.log(`[ModelFactory] Design preload done: ${prefab ? 'design applied' : 'no design JSON found'}`, prefab ? 'ok' : 'warn');
  return prefab;
}

export { ModelFactory as default };
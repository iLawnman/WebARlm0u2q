import * as THREE from 'three';
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { playSound } from './audio.js';
import { ARInput } from './arinput.js';

const DEFAULT_PREFAB_URL = './assets/artargetPrefabNew.html';

// === Дизайн-префаб (перенесено из questsim.js: QuestSim.designGroupsToPrefab) ===
// Тот же путь к ресурсам, что и в QuestSim, чтобы имена ассетов резолвились одинаково.
const DESIGN_RES = './assets/resources';

function normalizeDesignAsset(name) {
  if (!name) return '';
  const n = String(name).trim();
  if (!n) return '';
  if (/^(https?:|\/\/|\.\/|\/)/i.test(n)) return n;
  return DESIGN_RES + '/' + n + (/\.[a-z0-9]+$/i.test(n) ? '' : '.png');
}

// Кандидаты пути к JSON с "сырыми" группами дизайна.
// Первый — подтверждённое реальное расположение файла в проекте.
// Остальные — на случай других раскладок/опечаток в имени (как в questsim.js: "arprefabsdesign.json").
const DESIGN_JSON_CANDIDATES = [
  './assets/arprefabdesign.json',
  './assets/arprefabsdesign.json',
  './arprefabdesign.json',
  './arprefabsdesign.json'
];

// Аналог QuestSim.tryFetchJson — не бросает исключение, просто возвращает null при неудаче.
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

// Точная копия QuestSim.designGroupsToPrefab — не меняем логику получения полей,
// чтобы дизайн-префаб, приходящий из тех же исходных "groups", давал идентичный результат.
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
    this._prefabSource = null; // 'server' | 'fallback-code' | null (ещё не загружен)
    this._prefabSourceUrl = null;
    this._designPrefab = null; // текущий дизайн-префаб (см. setDesignPrefab)
    this._designAutoLoadAttempted = false; // была ли уже попытка автозагрузки дизайн-JSON
  }

  /**
   * Сохраняет дизайн-префаб (результат designGroupsToPrefab), который будет
   * применяться к панелям при следующих вызовах createArTargetSync.
   * Если префаб не задан — панели используют исходные стили из HTML-префаба (без изменений).
   */
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

  /**
   * Пытается автоматически загрузить дизайн-JSON и применить его как design prefab,
   * если он ещё не был явно установлен через setDesignPrefab(). Аналог логики
   * QuestSim.handleBundleFiles (tryFetchJson по списку путей + designGroupsToPrefab),
   * но без ручного выбора файла — сразу по известным путям в assets.
   * Безопасно вызывать многократно: реальная попытка сети выполняется один раз.
   */
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

    // Автозагрузка дизайн-JSON (если ещё не задан явно через setArTargetDesignPrefab).
    // Не бросает исключений и не блокирует создание таргета при неудаче.
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

    // Единый экран (см. artargetPrefabNew.html: .screen > .content > .title-area + .panels + .buttons-area)
    // вместо 4 отдельных CSS3D-объектов. Физический размер задаём явно (px), т.к. исходная
    // разметка рассчитана на 100vw/100vh — для плавающей AR-панели это неприменимо.
    const SCREEN_WIDTH_PX = 340;
    const SCREEN_HEIGHT_PX = 480;
    const SCREEN_SCALE = 0.0005; // 340px * 0.0005 ≈ 0.17м реальной ширины — тот же порядок, что был у MainBlock

    const screenSrc = this._getScreenRoot(ui);
    const el = screenSrc.cloneNode(true);
    console.log('[ModelFactory] Building single combined screen from prefab, source =', this._prefabSource);

    el.classList.add('ar-target-screen');
    el.style.width = `${SCREEN_WIDTH_PX}px`;
    el.style.height = `${SCREEN_HEIGHT_PX}px`;
    el.style.pointerEvents = 'auto';
    el.style.touchAction = 'manipulation';
    // Снимаем id у всего, что клонировано из статического префаба — при нескольких
    // одновременно отслеживаемых таргетах одинаковые id (modal-0, note-content-0, ...)
    // дали бы дубликаты в живом документе. Дальше работаем через прямые ссылки на узлы,
    // а не через getElementById.
    el.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
    if (el.id) el.removeAttribute('id');

    // Декоративные/текстовые слои не должны перехватывать клики — иначе интерактивные
    // элементы (кнопки, инпут) под ними могут не получать события.
    el.querySelectorAll(
        '.title-text, .help, .help-body, .main-text, .decor-line, .panel-corner, ' +
        '.mandala-icon, .bg, .bg-img, .right-panel-content'
    ).forEach((n) => { n.style.pointerEvents = 'none'; });

    this._fillScreen(el, data, handleAnswer, ui, arInput);
    this._applyDesignToScreen(el, this._designPrefab);

    // bindPanelEvents вызываем по тем же логическим зонам/именам, что и раньше
    // (LeftHelpBlock/MainBlock/RightBlock/ButtonsBlock), просто теперь это не отдельные
    // CSS3D-объекты, а под-элементы одного экрана — сохраняем сигнатуру вызова 1:1.
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

    // Алиасы под старые имена — на случай, если что-то во внешнем коде читает
    // group.userData.MainBlock / .LeftHelpBlock и т.п. напрямую (обратная совместимость).
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

  // ─── остальной код без изменений по логике (normalize, clean, prefab, fill, buildQuestionBody, helpers, debug save) ───

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
      // Новый формат префаба (подтверждён пользователем): единый полноэкранный
      // "screen" (title-area + panels + buttons-area + опциональная modal-overlay),
      // а не <template id="ar-target"> с 4 отдельными CSS3D-панелями.
      const screenRoot = doc.querySelector('.screen') || doc.querySelector('body > div');
      if (!screenRoot) {
        throw new Error('Не найден корневой узел префаба (.screen или хотя бы body > div)');
      }

      if (!document.getElementById('ar-target-prefab-styles')) {
        const styleEl = doc.querySelector('style');
        const s = document.createElement('style');
        s.id = 'ar-target-prefab-styles';
        s.textContent = (styleEl ? styleEl.textContent : '') + `
          .ar-target-screen, .ar-target-screen * { pointer-events: auto !important; touch-action: manipulation !important; }
          .ar-target-screen .buttons-area { z-index: 100 !important; }
          .ar-target-screen .nav-btn, .ar-target-screen .next-btn, .ar-target-screen .modal-close-btn,
          .ar-target-screen .ar-quest-btn, .ar-target-screen .ar-quest-submit-btn, .ar-target-screen .ar-slide-nav, .ar-target-screen .ar-quest-ok-btn {
            pointer-events: auto !important;
            min-width: 40px !important;
            min-height: 36px !important;
            position: relative;
            z-index: 50;
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

  /**
   * Fallback-версия экрана, структурно повторяющая server-side формат
   * (см. artargetPrefabNew.html: .screen > .content > .title-area + .panels(.side-panel x2 + .main-panel) + .buttons-area),
   * включая уже готовые .panel-corner / .decor-line элементы — чтобы _applyDesignToScreen
   * работал одинаково независимо от источника префаба.
   */
  _buildFallbackPrefab() {
    const corners = () => `
      <div class="panel-corner tl" style="position:absolute; top:-2px; left:-2px; width:16px; height:16px; background-size:contain; background-repeat:no-repeat; pointer-events:none;"></div>
      <div class="panel-corner tr" style="position:absolute; top:-2px; right:-2px; width:16px; height:16px; background-size:contain; background-repeat:no-repeat; transform:scaleX(-1); pointer-events:none;"></div>
      <div class="panel-corner bl" style="position:absolute; bottom:-2px; left:-2px; width:16px; height:16px; background-size:contain; background-repeat:no-repeat; transform:scaleY(-1); pointer-events:none;"></div>
      <div class="panel-corner br" style="position:absolute; bottom:-2px; right:-2px; width:16px; height:16px; background-size:contain; background-repeat:no-repeat; transform:scale(-1); pointer-events:none;"></div>`;

    const div = document.createElement('div');
    div.innerHTML = `
      <div class="screen active" id="screen-fallback" style="position:relative; width:100%; height:100%; display:flex; flex-direction:column; box-sizing:border-box; overflow:hidden;">
        <div class="bg" style="position:absolute; inset:0; background:#050505; z-index:0;"></div>
        <div class="bg-img" style="position:absolute; inset:0; background-size:cover; background-position:center; z-index:1;"></div>
        <div class="modal-overlay" style="display:none; position:absolute; inset:0; background:rgba(0,0,0,0.85); z-index:50; align-items:center; justify-content:center; padding:20px;">
          <div class="modal-window" style="position:relative; width:90%; max-width:520px; background:#0a0a0c; border:2px solid #DAA520; border-radius:8px; padding:20px; box-sizing:border-box;">
            <button class="modal-close-btn" type="button" style="position:absolute; top:10px; right:10px; background:#111; border:1px solid #DAA520; color:#DAA520; width:30px; height:30px; border-radius:4px; cursor:pointer;">✕</button>
            <div class="modal-title" style="color:#FFD700; font-weight:bold; text-align:center; margin-bottom:14px; padding-right:25px;"></div>
            <div class="modal-body" style="white-space:pre-line; color:#e2e8f0; font-size:0.8rem; line-height:1.45; max-height:60vh; overflow-y:auto;"></div>
          </div>
        </div>
        <div class="content" style="position:relative; z-index:10; display:flex; flex-direction:column; height:100%; padding:10px; box-sizing:border-box; gap:8px;">
          <div class="title-area" style="background:#070707EE; border:1px solid #DAA520; position:relative; padding:8px; border-radius:4px;">
            <div class="title-text" style="color:#FFD700; text-align:center; font-weight:bold; font-size:0.95rem;"></div>
          </div>
          <div class="panels" style="display:flex; gap:8px; flex:1; min-height:0;">
            <div class="panel side-panel" style="background:#070707EE; border:1px solid #DAA520; flex:1; display:flex; flex-direction:column; gap:8px; position:relative; padding:10px; border-radius:4px;">
              ${corners()}
              <div style="border:1px solid rgba(218,165,32,0.3); padding:6px; border-radius:4px; background:rgba(0,0,0,0.4);">
                <div class="help" style="color:#FF69B4; font-weight:bold; font-size:0.75rem;">📍 ПОДСКАЗКА</div>
                <div class="help-body" style="color:#cbd5e1; font-size:0.7rem; line-height:1.25; margin-top:4px;"></div>
              </div>
              <div style="border:1px solid rgba(218,165,32,0.3); padding:6px; border-radius:4px; background:rgba(0,0,0,0.4);">
                <div class="help" style="color:#FF69B4; font-weight:bold; font-size:0.75rem;">📍 СОВЕТ</div>
                <div class="help-body" style="color:#cbd5e1; font-size:0.7rem; line-height:1.25; margin-top:4px;"></div>
              </div>
            </div>
            <div class="panel main-panel" style="background:#070707EE; border:1px solid #DAA520; flex:2; display:flex; flex-direction:column; justify-content:center; align-items:center; position:relative; padding:12px; border-radius:4px;">
              ${corners()}
              <div class="decor-line" style="width:80%; height:6px; margin-bottom:8px;"></div>
              <div class="main-text" style="color:#FFD700; white-space:pre-line; text-align:center; font-weight:500; font-size:0.85rem; line-height:1.4;"></div>
              <div class="decor-line" style="width:80%; height:6px; margin-top:8px;"></div>
            </div>
            <div class="panel side-panel" style="background:#070707EE; border:1px solid #DAA520; flex:1; position:relative; padding:10px; border-radius:4px; overflow-y:auto;">
              ${corners()}
              <div style="color:#FFD700; font-size:0.8rem; font-weight:bold; margin-bottom:6px;">📜 ЗАМЕТКА</div>
              <div class="right-panel-content" style="color:#cbd5e1; font-size:0.7rem; line-height:1.3; white-space:pre-line;"></div>
            </div>
          </div>
          <div class="buttons-area" style="background:#070707EE; border:1px solid #DAA520; padding:8px 12px; position:relative; border-radius:4px;">
            <div class="buttons-row" style="display:flex; align-items:center; justify-content:center; gap:10px;"></div>
            <div style="text-align:center; margin-top:6px;">
              <button class="next-btn" type="button" style="display:none;">Дальше</button>
            </div>
          </div>
        </div>
      </div>`;
    return div.firstElementChild;
  }

  /**
   * Заполняет единый "screen"-префаб данными таргета. Селекторы — по классам
   * (title-text, main-text, help-body, right-panel-content, buttons-row), т.к.
   * новый формат префаба не использует data-field.
   */
  _fillScreen(el, data, onAnswer, ui, arInput) {
    const setText = (sel, val) => {
      const n = el.querySelector(sel);
      if (n) n.textContent = val || '';
      return n;
    };

    // Заголовок — дублируется в шапке (title-area) и в модалке (если она есть).
    setText('.title-area .title-text', data.title);
    setText('.modal-title', data.title);

    // Левая панель — 2 слота помощи (helpUp/helpDown), как в questsim (sim-help-up/down).
    // Если раздельных полей нет, используем объединённое data.help одним куском в первый слот.
    const helpBodies = el.querySelectorAll('.panels > .side-panel:first-child .help-body');
    if (helpBodies[0]) helpBodies[0].textContent = data.helpUp || data.help || '';
    if (helpBodies[1]) helpBodies[1].textContent = data.helpDown || '';
    console.log(
        '[ModelFactory._fillScreen] left help slots filled:', helpBodies.length,
        'helpUp=', !!data.helpUp, 'helpDown=', !!data.helpDown, 'fallback help=', !!data.help
    );

    // Главная панель — вопрос + основной текст одним блоком (в новом префабе один слот
    // .main-text вместо раздельных title/question/mainText, как было у CSS3D MainBlock).
    setText('.main-panel .main-text', [data.question, data.mainText].filter(Boolean).join('\n\n'));

    // Модалка (если есть в разметке) — длинный вступительный текст. Явного поля "story"
    // в текущей модели данных нет (см. recognition.js: title/question/mainText/options/imageSrc),
    // поэтому берём с fallback-цепочкой и логируем, что реально использовано —
    // стоит проверить, нет ли отдельного поля story/legend/intro в quests.js.
    const storySrc = data.raw?.story || data.raw?.legend || data.raw?.intro || data.mainText || data.question || '';
    const storyField = data.raw?.story ? 'raw.story' : data.raw?.legend ? 'raw.legend' : data.raw?.intro ? 'raw.intro' : data.mainText ? 'mainText' : 'question';
    console.log('[ModelFactory._fillScreen] modal-body source field:', storyField);
    setText('.modal-body', storySrc);

    // Правая панель — заметка (imageCaption) + опционально картинка распознанного маркера,
    // которой в новой разметке нет как <img> — добавляем динамически, если imageSrc есть.
    const rightPanel = el.querySelectorAll('.panels > .side-panel')[1];
    if (rightPanel) {
      const noteEl = rightPanel.querySelector('.right-panel-content');
      if (noteEl) noteEl.textContent = data.imageCaption || '';
      let img = rightPanel.querySelector('img.ar-target-image');
      if (data.imageSrc) {
        if (!img) {
          img = document.createElement('img');
          img.className = 'ar-target-image';
          img.style.cssText = 'display:block; width:100%; height:auto; max-height:120px; object-fit:contain; border-radius:6px; margin-bottom:6px; background:rgba(0,0,0,0.3);';
          rightPanel.insertBefore(img, rightPanel.firstChild);
        }
        img.src = data.imageSrc;
        img.alt = data.imageCaption || data.title || '';
      } else if (img) {
        img.remove();
      }
    } else {
      console.warn('[ModelFactory._fillScreen] правая side-panel не найдена — imageCaption/imageSrc не применены');
    }

    // Кнопки/ответ — та же логика построения UI (_buildQuestionBody), что и раньше,
    // просто монтируется в .buttons-row вместо data-field="buttons".
    const buttonsRow = el.querySelector('.buttons-area .buttons-row');
    if (buttonsRow) {
      this._buildQuestionBody(buttonsRow, data, onAnswer, ui, arInput);
    } else {
      console.warn('[ModelFactory._fillScreen] .buttons-row не найден — ответ построить некуда');
    }
    // "Дальше" — из старого 2D-флоу (переход к следующему экрану квеста), в AR такого шага
    // нет: ответ отправляется сразу через onAnswer(...) из _buildQuestionBody. Прячем кнопку,
    // а не оставляем нерабочей.
    const nextBtn = el.querySelector('.next-btn');
    if (nextBtn) nextBtn.style.display = 'none';

    // Модалка: если есть — навешиваем закрытие через addEventListener (не inline onclick,
    // т.к. id внутри неуникальны при нескольких одновременных таргетах — см. очистку id выше).
    // При закрытии, если правая заметка ещё пустая, переносим туда текст модалки —
    // тот же UX-паттерн, что был в исходном экспорте редактора.
    const modalOverlay = el.querySelector('.modal-overlay');
    const modalCloseBtn = el.querySelector('.modal-close-btn');
    if (modalOverlay && modalCloseBtn) {
      modalCloseBtn.removeAttribute('onclick');
      const closeModal = () => {
        // Читаем текст модалки ДО удаления из DOM — иначе querySelector('.modal-body')
        // после .remove() ничего не найдёт (узел уже отсоединён от дерева).
        const modalBody = el.querySelector('.modal-body');
        const modalBodyText = modalBody ? modalBody.textContent : '';
        modalOverlay.style.display = 'none';
        modalOverlay.remove();
        const noteEl = el.querySelector('.panels > .side-panel:last-child .right-panel-content');
        if (noteEl && !noteEl.textContent.trim() && modalBodyText) {
          noteEl.textContent = modalBodyText;
        }
      };
      if (typeof arInput.bindInteractiveEvent === 'function') {
        arInput.bindInteractiveEvent(modalCloseBtn, 'ModalCloseButton', closeModal);
      } else {
        modalCloseBtn.addEventListener('click', closeModal);
      }
    }
  }

  /**
   * Применяет дизайн-префаб к единому screen-узлу (аналог QuestSim.applyDesign),
   * по CSS-классам вместо data-field/data-name. В отличие от старой CSS3D-версии,
   * этот формат префаба УЖЕ содержит .panel-corner и .decor-line элементы в разметке —
   * поэтому просто переставляем им background-image, а не создаём новые узлы.
   * Ничего не делает, если префаб не задан (никакой регрессии для случая без дизайна).
   */
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
    // Обновляет background-image УЖЕ существующим .panel-corner / .decor-line узлам
    // (они есть в разметке этого формата префаба), вместо создания новых.
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

    // Фон всего экрана — раньше это поле (back_image) было "сиротой": в CSS3D-формате
    // не было под него DOM-узла. В этом формате есть .bg-img — наконец применяем.
    setBg('back_image', p.back_image, bgImgEl, '.bg-img', true);

    setBg('title_bg_color', p.title_bg_color, titleArea, '.title-area', false);
    setBg('title_bg_image', p.title_bg_image, titleArea, '.title-area', true);
    setColor('title_color', p.title_color, titleText, '.title-area .title-text');

    setBg('main_bg_color', p.main_bg_color, mainPanel, '.main-panel', false);
    setBg('main_bg_image', p.main_bg_image, mainPanel, '.main-panel', true);
    // Отдельного поля цвета main-text в дизайн-префабе нет — по конвенции из
    // реального экспорта редактора main-text красится тем же золотым, что и title.
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

const defaultFactory = new ModelFactory();

export function createArTargetSync(targetData, options = {}) {
  return defaultFactory.createArTargetSync(targetData, options);
}

export async function createArTarget(targetData, options = {}) {
  return defaultFactory.createArTarget(targetData, options);
}

/**
 * Устанавливает дизайн-префаб на дефолтную фабрику (singleton), используемую
 * createArTargetSync/createArTarget. Аналог QuestSim.setDesignPrefab —
 * можно вызывать с объектом от designGroupsToPrefab(groups) или напрямую
 * с результатом DesignPreview.getCurrentPrefab().
 * @param {object|null} prefab
 */
export function setArTargetDesignPrefab(prefab) {
  defaultFactory.setDesignPrefab(prefab);
}

export function getArTargetDesignPrefab() {
  return defaultFactory.getDesignPrefab();
}

/**
 * Дожидается загрузки серверного prefab'а (artargetPrefabNew.html) один раз,
 * до того как где-либо будет вызван синхронный createArTargetSync().
 * Использует тот же defaultFactory (singleton), поэтому кэш переиспользуется
 * во всех дальнейших синхронных вызовах createArTargetSync.
 * @param {string} [url] — необязательный кастомный URL, иначе берётся DEFAULT_PREFAB_URL
 * @param {import('./ui.js').UI} [ui] — если передан, диагностика дублируется в ui.log
 */
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

/**
 * Дожидается загрузки дизайн-JSON (arprefabdesign.json и т.п.) один раз,
 * до того как где-либо будет вызван синхронный createArTargetSync().
 * Использует тот же defaultFactory (singleton), поэтому применённый дизайн
 * переиспользуется во всех дальнейших вызовах createArTargetSync.
 * Симметрична preloadArTargetPrefab — вызывать рядом с ней в точке инициализации AR.
 * Ничего не делает, если дизайн уже был установлен явно через setArTargetDesignPrefab().
 * @param {import('./ui.js').UI} [ui] — если передан, диагностика дублируется в ui.log
 * @returns {Promise<object|null>} применённый дизайн-префаб или null, если не найден
 */
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
// arpanel.js - Builds the AR question panel as three-mesh-ui Blocks
//
// REFACTOR NOTE (CSS3D -> three-mesh-ui):
// The old implementation fetched an external HTML "prefab" file and filled it
// with DOM elements rendered through CSS3DObject. HTML/CSS templates have no
// meaning for real 3D meshes, so that fetch-and-clone-HTML step is gone
// entirely. Layout/styling is now expressed directly as three-mesh-ui Block
// options (width/height/padding/backgroundColor/...), and the "design
// prefab" JSON (colors, background images, button labels) is mapped onto
// those Block options instead of CSS classes.
//
// three-mesh-ui has no built-in text-input widget. For AnswerType
// 'InputField' we keep one small, deliberately invisible DOM <input> whose
// only job is to receive real keyboard/mobile-keyboard input; its value is
// mirrored onto a mesh-ui Text label every keystroke. This is the one place
// DOM is unavoidable - there is no way to open a phone's on-screen keyboard
// from a canvas-only scene.
//
// This module intentionally does NOT register anything with ARScene itself;
// createPanel() returns the list of interactive Blocks so the caller
// (ModelFactory) can register them - keeping ARPanel free of any dependency
// on the render/interaction loop.
import * as THREE from 'three';
import ThreeMeshUI from 'three-mesh-ui';
import { playSound } from './audio.js';

// Legacy layout numbers were expressed in CSS pixels at a 0.0005 world-scale.
// Keeping the same effective panel size (in meters) preserves the original
// proportions without requiring anyone to re-tune positions/rotations.
const PX = 0.0005;
const PANEL_WIDTH = 340 * PX;   // 0.17 m
const PANEL_HEIGHT = 480 * PX;  // 0.24 m

const DEFAULT_FONT_JSON = './assets/fonts/Roboto-msdf.json';
const DEFAULT_FONT_TEXTURE = './assets/fonts/Roboto-msdf.png';

const COLOR = {
  panelBg: 0x111111,
  idle: 0x2b2b2b,
  hovered: 0x555555,
  selected: 0x00ffaa,
  text: 0xffffff,
  placeholder: 0x888888,
  title: 0xffd700
};

// ---------------------------------------------------------------------------
// Pure data helpers (formerly arparser.js / ARDataParser). No DOM, no THREE -
// kept as plain functions inside this module rather than a 4th exported class.
// ---------------------------------------------------------------------------

function cleanUnityRichText(str) {
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

function normalizeTargetData(targetData) {
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

  const clean = (s) => cleanUnityRichText(String(s || ''));

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

function designGroupsToPrefab(groups) {
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
    main_bg_color: getter('MainText_bg', 'color', 'rgba(7,7,7,0.93)'),
    main_bg_image: getter('MainText_bg', 'image'),
    left_bg_color: getter('LeftPanel_bgLeftPanel', 'color', 'rgba(7,7,7,0.93)'),
    left_help_color: getter('LeftPanel_HelpUp', 'color', '#FF69B4'),
    right_bg_color: getter('RightPanel_bgRight_Panel', 'color', 'rgba(7,7,7,0.93)'),
    buttons_bg_color: getter('Buttons_bgButtonsPanel', 'color', 'rgba(7,7,7,0.93)'),
    buttons_bg_image: getter('Buttons_bgButtonsPanel', 'image'),
    btn_next_text: getter('Buttons_Button_NEXT_Text', 'text', 'Дальше'),
    input_ph_text: getter('Buttons_InputField', 'text') || getter('Buttons_InputField_Placeholder', 'text', 'ВВЕДИТЕ ОТВЕТ')
  };
}

function normalizeDesignAsset(name) {
  if (!name) return '';
  const n = String(name).trim();
  if (!n) return '';
  if (/^(https?:|\/\/|\.\/|\/)/i.test(n)) return n;
  return './assets/resources/' + n + (/\.[a-z0-9]+$/i.test(n) ? '' : '.png');
}

// parses '#RRGGBB' / 'rgb(...)' / 'rgba(...)' into { color, opacity }
function parseColor(value, fallbackHex) {
  if (value === undefined || value === null || value === '') {
    return { color: fallbackHex, opacity: null };
  }
  if (typeof value === 'number') return { color: value, opacity: null };

  const rgbaMatch = String(value).match(/rgba?\(([^)]+)\)/i);
  if (rgbaMatch) {
    const parts = rgbaMatch[1].split(',').map((s) => s.trim());
    const [r, g, b] = parts;
    const opacity = parts.length > 3 ? parseFloat(parts[3]) : null;
    const color = (parseInt(r, 10) << 16) | (parseInt(g, 10) << 8) | parseInt(b, 10);
    return { color, opacity: Number.isNaN(opacity) ? null : opacity };
  }

  try {
    return { color: new THREE.Color(value).getHex(), opacity: null };
  } catch {
    return { color: fallbackHex, opacity: null };
  }
}

// ---------------------------------------------------------------------------

export class ARPanel {
  constructor(options = {}) {
    this.fontFamily = options.fontFamily || DEFAULT_FONT_JSON;
    this.fontTexture = options.fontTexture || DEFAULT_FONT_TEXTURE;
    this.designPrefab = null;
    this._textureLoader = new THREE.TextureLoader();
    this._textureCache = new Map();
  }

  setDesignPrefab(prefab) { this.designPrefab = prefab; }
  getDesignPrefab() { return this.designPrefab; }

  normalizeTargetData(data) { return normalizeTargetData(data); }
  designGroupsToPrefab(groups) { return designGroupsToPrefab(groups); }

  _loadTexture(url) {
    if (!url) return null;
    if (this._textureCache.has(url)) return this._textureCache.get(url);
    const tex = this._textureLoader.load(url);
    this._textureCache.set(url, tex);
    return tex;
  }

  _loadDesignTexture(name) {
    return this._loadTexture(normalizeDesignAsset(name));
  }

  /**
   * Builds the whole interactive panel for one AR target as three-mesh-ui
   * Blocks (real WebXR-visible meshes - no DOM, no CSS3DObject).
   *
   * @returns {{root: THREE.Group, screen: ThreeMeshUI.Block, interactives: Array,
   *   data: object, openModal: Function, closeModal: Function, destroy: Function}}
   */
  createPanel(rawData, { onAnswer = null, ui = null } = {}) {
    const data = normalizeTargetData(rawData);
    const design = this.designPrefab;
    const interactives = [];
    const cleanupFns = [];

    const root = new THREE.Group();
    root.name = `ARPanel_${data.groupName}`;

    const mainBg = parseColor(design?.main_bg_color, COLOR.panelBg);

    const screen = new ThreeMeshUI.Block({
      width: PANEL_WIDTH,
      height: PANEL_HEIGHT,
      padding: 0.006,
      contentDirection: 'column',
      justifyContent: 'start',
      alignItems: 'center',
      backgroundColor: new THREE.Color(mainBg.color),
      backgroundOpacity: mainBg.opacity ?? 0.93,
      fontFamily: this.fontFamily,
      fontTexture: this.fontTexture,
      fontSize: 0.011,
      fontColor: new THREE.Color(COLOR.text)
    });
    const mainBgTex = design?.main_bg_image ? this._loadDesignTexture(design.main_bg_image) : null;
    if (mainBgTex) screen.set({ backgroundTexture: mainBgTex });

    // Preserve the original CSS3D screen transform: a flat panel that sits
    // just above the tracked marker, facing up.
    screen.position.set(0, 0.05, 0);
    screen.rotation.set(-Math.PI / 2, 0, 0);
    root.add(screen);

    if (data.title) {
      const titleColor = parseColor(design?.title_color, COLOR.title);
      const titleBlock = new ThreeMeshUI.Block({
        width: PANEL_WIDTH - 0.012,
        height: 0.022,
        justifyContent: 'center',
        backgroundOpacity: 0
      });
      titleBlock.add(new ThreeMeshUI.Text({
        content: data.title,
        fontSize: 0.013,
        fontColor: new THREE.Color(titleColor.color)
      }));
      screen.add(titleBlock);
    }

    const mainTextBlock = new ThreeMeshUI.Block({
      width: PANEL_WIDTH - 0.012,
      height: 0.09,
      justifyContent: 'center',
      backgroundOpacity: 0
    });
    mainTextBlock.add(new ThreeMeshUI.Text({
      content: data.question || data.mainText || '',
      fontSize: 0.010
    }));
    screen.add(mainTextBlock);

    const buttonsBg = parseColor(design?.buttons_bg_color, COLOR.panelBg);
    const buttonsArea = new ThreeMeshUI.Block({
      width: PANEL_WIDTH - 0.012,
      height: 0.1,
      contentDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: new THREE.Color(buttonsBg.color),
      backgroundOpacity: buttonsBg.opacity ?? 0
    });
    screen.add(buttonsArea);

    const handleAnswer = (value) => {
      if (ui) ui.log(`[Panel:${data.groupName}] Answer: ${value}`, 'ok');
      if (typeof onAnswer === 'function') onAnswer(value);
    };

    switch (data.answerType) {
      case 'Button':
        this._buildButtonGrid(buttonsArea, data.options, handleAnswer, ui, interactives);
        break;
      case 'InputField': {
        const inputApi = this._buildInputField(buttonsArea, data, handleAnswer, ui, interactives);
        cleanupFns.push(inputApi.destroy);
        break;
      }
      case 'Art':
      case 'AntiArt':
        this._buildArtButton(buttonsArea, handleAnswer, ui, interactives);
        break;
      default:
        this._buildSlider(buttonsArea, data, handleAnswer, ui, interactives);
    }

    const modal = this._buildModal(data, ui, interactives);
    root.add(modal.block);

    return {
      root,
      screen,
      interactives,
      data,
      openModal: modal.open,
      closeModal: modal.close,
      destroy: () => cleanupFns.forEach((fn) => fn && fn())
    };
  }

  // ---- shared button helpers ----

  _makeButtonBlock(label) {
    const btn = new ThreeMeshUI.Block({
      width: 0.05,
      height: 0.024,
      margin: 0.004,
      borderRadius: 0.004,
      justifyContent: 'center'
    });
    btn.add(new ThreeMeshUI.Text({ content: label, fontSize: 0.009, fontColor: new THREE.Color(COLOR.text) }));

    btn.setupState({ state: 'idle', attributes: { backgroundColor: new THREE.Color(COLOR.idle), backgroundOpacity: 0.85 } });
    btn.setupState({ state: 'hovered', attributes: { backgroundColor: new THREE.Color(COLOR.hovered), backgroundOpacity: 1 } });
    btn.setState('idle');
    return btn;
  }

  // Wires the 'selected' state to fire once per press (playSound + ui log +
  // callback), same observable behaviour as the old ARInput.bindInteractiveEvent.
  _bindPress(block, label, ui, callback) {
    block.setupState({
      state: 'selected',
      attributes: { backgroundColor: new THREE.Color(COLOR.selected), backgroundOpacity: 1 },
      onSet: () => {
        if (ui) ui.log(`[ARPanel Button] '${label}' pressed`, 'ok');
        playSound('click');
        callback();
      }
    });
  }

  _buildButtonGrid(area, options, onAnswer, ui, interactives) {
    area.set({ contentDirection: 'column' });
    const opts = options.length ? options : [{ text: 'OK' }];
    opts.forEach((opt, idx) => {
      const label = opt.text || `Вариант ${idx + 1}`;
      const btn = this._makeButtonBlock(label);
      this._bindPress(btn, `OptionButton_${idx + 1}`, ui, () => onAnswer(idx + 1));
      area.add(btn);
      interactives.push(btn);
    });
  }

  _buildArtButton(area, onAnswer, ui, interactives) {
    const btn = this._makeButtonBlock('OK');
    this._bindPress(btn, 'ArtOKButton', ui, () => onAnswer(true));
    area.add(btn);
    interactives.push(btn);
  }

  _buildSlider(area, data, onAnswer, ui, interactives) {
    let idx = 0;
    const options = data.options.length ? data.options : [{ text: data.mainText || data.question || '' }];
    const total = options.length;

    area.set({ contentDirection: 'column' });

    const row = new ThreeMeshUI.Block({ contentDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundOpacity: 0 });

    const prev = this._makeButtonBlock('◄');
    const next = this._makeButtonBlock('►');
    const slideText = new ThreeMeshUI.Text({ content: options[0]?.text || '', fontSize: 0.009 });
    const slideBlock = new ThreeMeshUI.Block({ width: 0.09, height: 0.035, justifyContent: 'center', backgroundOpacity: 0 });
    slideBlock.add(slideText);

    const update = () => slideText.set({ content: options[idx]?.text || '' });

    this._bindPress(prev, 'SliderPrev', ui, () => { idx = (idx - 1 + total) % total; update(); });
    this._bindPress(next, 'SliderNext', ui, () => { idx = (idx + 1) % total; update(); });

    row.add(prev, slideBlock, next);
    area.add(row);
    interactives.push(prev, next);

    const okBtn = this._makeButtonBlock('OK');
    this._bindPress(okBtn, 'SliderOK', ui, () => onAnswer(idx + 1));
    area.add(okBtn);
    interactives.push(okBtn);
  }

  _buildInputField(area, data, onAnswer, ui, interactives) {
    const placeholder = (this.designPrefab && this.designPrefab.input_ph_text) || 'Введите ответ...';

    area.set({ contentDirection: 'column' });

    const fieldBlock = new ThreeMeshUI.Block({
      width: 0.1,
      height: 0.026,
      justifyContent: 'center',
      backgroundColor: new THREE.Color(0x111111),
      backgroundOpacity: 0.85
    });
    const fieldText = new ThreeMeshUI.Text({ content: placeholder, fontSize: 0.009, fontColor: new THREE.Color(COLOR.placeholder) });
    fieldBlock.add(fieldText);

    // The one unavoidable bit of real DOM: a 1x1px, invisible, but genuinely
    // focusable <input>, used purely to receive OS/mobile keyboard input.
    // three-mesh-ui has no text-entry primitive of its own.
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'text';
    hiddenInput.setAttribute('aria-hidden', 'true');
    hiddenInput.style.cssText = `
      position: fixed; top: 0; left: 0; width: 1px; height: 1px;
      opacity: 0; border: 0; padding: 0; pointer-events: none; z-index: -1;
    `;
    document.body.appendChild(hiddenInput);

    const syncText = () => {
      fieldText.set({
        content: hiddenInput.value || placeholder,
        fontColor: new THREE.Color(hiddenInput.value ? COLOR.text : COLOR.placeholder)
      });
    };
    const onKeydown = (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        playSound('click');
        onAnswer(hiddenInput.value);
      }
    };
    hiddenInput.addEventListener('input', syncText);
    hiddenInput.addEventListener('keydown', onKeydown);

    fieldBlock.setupState({ state: 'idle', attributes: { backgroundOpacity: 0.85 } });
    fieldBlock.setupState({ state: 'hovered', attributes: { backgroundOpacity: 1 } });
    fieldBlock.setupState({
      state: 'selected',
      attributes: { backgroundOpacity: 1 },
      onSet: () => {
        // focus() must happen inside the tap/click handler to satisfy mobile
        // browsers' "user gesture required" rule for opening the keyboard.
        hiddenInput.style.pointerEvents = 'auto';
        hiddenInput.focus();
        hiddenInput.style.pointerEvents = 'none';
        if (ui) ui.log(`[ARPanel Button] 'InputField' focused`, 'ok');
      }
    });
    fieldBlock.setState('idle');

    const submitBtn = this._makeButtonBlock('OK');
    this._bindPress(submitBtn, 'InputSubmitButton', ui, () => onAnswer(hiddenInput.value));

    area.add(fieldBlock, submitBtn);
    interactives.push(fieldBlock, submitBtn);

    return {
      destroy: () => {
        hiddenInput.removeEventListener('input', syncText);
        hiddenInput.removeEventListener('keydown', onKeydown);
        hiddenInput.remove();
      }
    };
  }

  // ---- modal (image viewer) ----
  // Previously a fixed full-screen DOM overlay (position: fixed) built by
  // ARModalManager. There is no screen-space DOM overlay concept in a mesh
  // scene, so the modal is now a Block placed in front of the panel that we
  // toggle visible/invisible. It is not auto-opened by anything in this
  // module (same as before) - call panelResult.openModal()/closeModal() from
  // wherever the app previously toggled '.modal-overlay' visibility.
  _buildModal(data, ui, interactives) {
    const modalBlock = new ThreeMeshUI.Block({
      width: PANEL_WIDTH * 0.9,
      height: PANEL_HEIGHT * 0.9,
      justifyContent: 'end',
      alignItems: 'end',
      backgroundColor: new THREE.Color(0x000000),
      backgroundOpacity: 0.95
    });
    modalBlock.visible = false;
    modalBlock.position.set(0, 0.06, 0.001);
    modalBlock.rotation.set(-Math.PI / 2, 0, 0);

    const imageUrl = data.imageSrc || './assets/modal-image.jpg';
    const tex = this._loadTexture(imageUrl);
    if (tex) modalBlock.set({ backgroundTexture: tex });

    const closeBtn = this._makeButtonBlock('✕');
    const open = () => { modalBlock.visible = true; };
    const close = () => {
      modalBlock.visible = false;
      if (ui) ui.log('[Modal] Closed', 'ok');
    };
    this._bindPress(closeBtn, 'ModalCloseButton', ui, close);

    modalBlock.add(closeBtn);
    interactives.push(closeBtn);

    return { block: modalBlock, open, close };
  }
}

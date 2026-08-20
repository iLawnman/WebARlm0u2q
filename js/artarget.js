import * as THREE from 'three';
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

const DEFAULT_PREFAB_URL = './assets/artargetprefab.html';

/**
 * ModelFactory — AR-таргет:
 *   сфера-маркер (WebGL) + 4 CSS3D-панели из prefab:
 *     LeftHelpBlock | MainBlock | RightBlock
 *                   | ButtonsBlock
 */
export class ModelFactory {
    /**
     * @param {object} [defaults]
     * @param {string} [defaults.prefabUrl]
     */
    constructor(defaults = {}) {
        this.prefabUrl = defaults.prefabUrl || DEFAULT_PREFAB_URL;
        this._prefabCache = null; // DocumentFragment / template content
    }

    /**
     * Асинхронное создание (загружает prefab при необходимости).
     * @param {string|object} [targetData='']
     * @param {object} [options]
     * @param {Function|null} [options.onAnswer]
     * @param {string} [options.prefabUrl]
     * @returns {Promise<THREE.Group>}
     */
    async createArTarget(targetData = '', options = {}) {
        const prefabUrl = options.prefabUrl || this.prefabUrl;
        await this._ensurePrefab(prefabUrl);
        return this.createArTargetSync(targetData, options);
    }

    /**
     * Синхронное создание (prefab должен быть уже загружен, иначе fallback-разметка).
     * @param {string|object} [targetData='']
     * @param {object} [options]
     * @param {Function|null} [options.onAnswer]
     * @returns {THREE.Group}
     */
    createArTargetSync(targetData = '', options = {}) {
        const { onAnswer = null } = options;
        const data = this._normalizeTargetData(targetData);

        const group = new THREE.Group();
        group.name = `arTarget_${data.groupName}`;

        const sphere = this._createSphere();
        group.add(sphere);

        const handleAnswer = (value) => {
            if (typeof onAnswer === 'function') onAnswer(value);
        };

        const panelNodes = this._getPanelNodes();
        const panels = {};

        for (const src of panelNodes) {
            const name = src.dataset.name || 'panel';
            const el = src.cloneNode(true);

            // Явное включение событий мыши/тача для элементов CSS3D
            el.style.pointerEvents = 'auto';

            // Изоляция от жестких сбросов WebXR DOM Overlay
            const stopEvents = ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'mouseup'];
            stopEvents.forEach(evt => {
                el.addEventListener(evt, (e) => e.stopPropagation());
            });

            // заполнение полей
            this._fillPanel(el, name, data, handleAnswer);

            const pos = this._parseVec3(el.dataset.position, [0, 0, 0]);
            const rotDeg = this._parseVec3(el.dataset.rotation, [-90, 0, 0]);
            const rot = rotDeg.map((d) => (d * Math.PI) / 180);
            const scale = parseFloat(el.dataset.scale) || 0.0005;

            // убираем data-* из DOM (не нужны в runtime)
            el.removeAttribute('data-name');
            el.removeAttribute('data-position');
            el.removeAttribute('data-rotation');
            el.removeAttribute('data-scale');

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
            answerType: data.answerType
        };

        return group;
    }

    _normalizeTargetData(targetData) {
        const raw =
            typeof targetData === 'object' && targetData !== null
                ? targetData
                : { title: String(targetData ?? '') };

        const pick = (...keys) => {
            for (const k of keys) {
                const v = raw[k];
                if (v !== undefined && v !== null && String(v).trim() !== '') return v;
            }
            return '';
        };

        const title = String(
            pick('TitleText_Text', 'title', 'name', 'Title') || ''
        );

        const question = String(
            pick('Question', 'question', 'MainTxt_Text', 'mainText') || ''
        );

        let mainText = String(pick('MainTxt_Text', 'mainText') || '');
        if (mainText === question) mainText = '';

        const help = String(
            pick(
                'HelpUpText_Text',
                'HelpDownText_Text',
                'help',
                'helpUp',
                'helpDown',
                'HelpUp',
                'HelpDown'
            ) || ''
        );

        const helpUp = String(pick('HelpUpText_Text', 'helpUp', 'HelpUp') || '');
        const helpDown = String(pick('HelpDownText_Text', 'helpDown', 'HelpDown') || '');
        const helpCombined =
            help ||
            [helpUp, helpDown].filter(Boolean).join('\n\n') ||
            '';

        const imageSrc = String(
            pick(
                'imageSrc',
                'AnswerPicture_Image',
                'AdditionalImg_Image',
                'image',
                'img'
            ) || ''
        );

        const imageCaption = String(
            pick('imageCaption', 'imgLabel', 'AnswerPictureCaption') || ''
        );

        const answerType = String(
            pick('AnswerType', 'answerType', 'type') || 'Slide'
        );

        let options = raw.options || raw.Options || [];
        if (!Array.isArray(options)) options = [];
        options = options.map((o, i) => {
            if (typeof o === 'string') return { text: o };
            if (o && typeof o === 'object') return { text: o.text ?? o.MainTxt_Text ?? String(o) };
            return { text: `Вариант ${i + 1}` };
        });

        const groupName = String(
            pick('questId', 'QuestID', 'id', 'AnswerID', 'title', 'name') || 'target'
        );

        return {
            raw,
            title,
            question,
            mainText,
            help: helpCombined,
            helpUp,
            helpDown,
            imageSrc,
            imageCaption,
            answerType,
            options,
            groupName
        };
    }

    async _ensurePrefab(url) {
        if (this._prefabCache) return;
        try {
            const res = await fetch(url, { cache: 'no-cache' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const tpl = doc.querySelector('#ar-target') || doc.querySelector('template');
            if (!tpl) throw new Error('No <template id="ar-target">');

            const styleEl = doc.querySelector('style');
            if (styleEl && !document.getElementById('ar-target-prefab-styles')) {
                const s = document.createElement('style');
                s.id = 'ar-target-prefab-styles';
                // Принудительно устанавливаем pointer-events и предотвращаем блокировку в WebXR DOM Overlay
                s.textContent = styleEl.textContent + `
                    .ar-css3d-panel, .ar-css3d-panel * {
                        pointer-events: auto !important;
                        touch-action: manipulation !important;
                    }
                `;
                document.head.appendChild(s);
            }

            this._prefabCache = tpl.content || tpl;
        } catch (e) {
            console.warn('[ModelFactory] prefab load failed, using fallback', url, e);
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

        const make = (name, className, pos, rot, scale, innerHTML) => {
            const div = document.createElement('div');
            div.className = `ar-css3d-panel ${className}`;
            div.style.pointerEvents = 'auto';
            div.dataset.name = name;
            div.dataset.position = pos;
            div.dataset.rotation = rot;
            div.dataset.scale = scale;
            div.innerHTML = innerHTML;
            root.appendChild(div);
        };

        make(
            'LeftHelpBlock',
            'ar-left-help-block',
            '-0.115, 0.025, 0',
            '-90, 16, 0',
            '0.00048',
            '<div class="ar-panel-help" data-field="help"></div>'
        );
        make(
            'MainBlock',
            'ar-main-block',
            '0, 0.04, 0',
            '-90, 0, 0',
            '0.0005',
            `<div class="ar-panel-title" data-field="title"></div>
       <div class="ar-panel-question" data-field="question"></div>
       <div class="ar-panel-maintext" data-field="mainText"></div>`
        );
        make(
            'RightBlock',
            'ar-right-block',
            '0.115, 0.025, 0',
            '-90, -16, 0',
            '0.00048',
            `<img class="ar-panel-image" data-field="imageSrc" alt="" />
       <div class="ar-panel-help" data-field="imageCaption"></div>`
        );
        make(
            'ButtonsBlock',
            'ar-buttons-block',
            '0, -0.085, 0',
            '-90, 0, 0',
            '0.0005',
            '<div class="ar-quest-body" data-field="buttons"></div>'
        );

        return root;
    }

    _fillPanel(el, name, data, onAnswer) {
        const setText = (selector, value) => {
            const node = el.querySelector(selector);
            if (!node) return;
            node.textContent = value || '';
        };

        if (name === 'LeftHelpBlock') {
            setText('[data-field="help"]', data.help);
            if (!data.help) el.classList.add('ar-panel-empty');
        }

        if (name === 'MainBlock') {
            setText('[data-field="title"]', data.title);
            setText('[data-field="question"]', data.question);
            setText('[data-field="mainText"]', data.mainText);
            if (!data.title && !data.question && !data.mainText) {
                el.classList.add('ar-panel-empty');
            }
        }

        if (name === 'RightBlock') {
            const img = el.querySelector('[data-field="imageSrc"]');
            if (img) {
                if (data.imageSrc) {
                    img.src = data.imageSrc;
                    img.alt = data.imageCaption || data.title || '';
                } else {
                    img.removeAttribute('src');
                    img.alt = '';
                }
            }
            setText('[data-field="imageCaption"]', data.imageCaption);
            if (!data.imageSrc && !data.imageCaption) el.classList.add('ar-panel-empty');
        }

        if (name === 'ButtonsBlock') {
            const body = el.querySelector('[data-field="buttons"]') || el;
            this._buildQuestionBody(body, data, onAnswer);
        }
    }

    _buildQuestionBody(bodyEl, data, onAnswer) {
        bodyEl.innerHTML = '';

        const type = data.answerType || 'Slide';
        const options = data.options || [];

        const bindInteractiveEvent = (element, callback) => {
            element.style.pointerEvents = 'auto';
            element.style.touchAction = 'manipulation';
            
            const handler = (e) => {
                e.stopPropagation();
                if (e.cancelable) e.preventDefault();
                callback(e);
            };

            element.addEventListener('click', handler);
            element.addEventListener('touchend', handler);
        };

        if (type === 'Button') {
            const grid = document.createElement('div');
            grid.className = 'ar-quest-options-grid';
            grid.style.pointerEvents = 'auto';

            options.forEach((opt, idx) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'ar-quest-btn';
                btn.textContent = opt.text || `Вариант ${idx + 1}`;
                
                bindInteractiveEvent(btn, () => onAnswer(idx + 1));
                grid.appendChild(btn);
            });

            bodyEl.appendChild(grid);

        } else if (type === 'InputField') {
            const wrap = document.createElement('div');
            wrap.className = 'ar-quest-input-block';
            wrap.style.pointerEvents = 'auto';

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'ar-quest-input';
            input.placeholder = 'Введите ответ...';
            input.style.pointerEvents = 'auto';

            const stopPropagation = (e) => e.stopPropagation();
            input.addEventListener('click', stopPropagation);
            input.addEventListener('pointerdown', stopPropagation);
            input.addEventListener('touchstart', stopPropagation);
            
            input.addEventListener('keydown', (e) => {
                e.stopPropagation();
                if (e.key === 'Enter') onAnswer(input.value);
            });

            const submitBtn = document.createElement('button');
            submitBtn.type = 'button';
            submitBtn.className = 'ar-quest-submit-btn';
            submitBtn.textContent = 'OK';
            
            bindInteractiveEvent(submitBtn, () => onAnswer(input.value));

            wrap.appendChild(input);
            wrap.appendChild(submitBtn);
            bodyEl.appendChild(wrap);

        } else if (type === 'Art' || type === 'AntiArt') {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'ar-quest-submit-btn ar-quest-ok-btn';
            btn.textContent = 'OK';
            
            bindInteractiveEvent(btn, () => onAnswer(true));
            bodyEl.appendChild(btn);

        } else {
            // Slide (по умолчанию)
            let idx = 0;
            const total = Math.max(options.length, 1);

            const slider = document.createElement('div');
            slider.className = 'ar-quest-slider';
            slider.style.pointerEvents = 'auto';

            const prev = document.createElement('button');
            prev.type = 'button';
            prev.className = 'ar-slide-nav prev';
            prev.textContent = '◄';

            const slideContent = document.createElement('div');
            slideContent.className = 'ar-slide-content';
            slideContent.textContent =
                options[0]?.text || data.mainText || data.question || '';

            const next = document.createElement('button');
            next.type = 'button';
            next.className = 'ar-slide-nav next';
            next.textContent = '►';

            const update = () => {
                slideContent.textContent =
                    options[idx]?.text || data.mainText || data.question || '';
            };

            bindInteractiveEvent(prev, () => {
                idx = (idx - 1 + total) % total;
                update();
            });

            bindInteractiveEvent(next, () => {
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
            
            bindInteractiveEvent(okBtn, () => onAnswer(idx + 1));
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
        const parts = String(str)
            .split(',')
            .map((s) => parseFloat(s.trim()));
        return parts.length === 3 && parts.every(Number.isFinite)
            ? parts
            : fallback.slice();
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
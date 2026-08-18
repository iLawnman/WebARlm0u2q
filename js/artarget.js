import * as THREE from 'three';

const DEFAULT_TEMPLATE_URL = '/assets/artarget.html';

/**
 * ModelFactory — central builder for AR target objects.
 * HTML templates remain the single source of truth for panel content, size and placement.
 * Procedural (canvas) fallback is available for offline / no-foreignObject environments.
 */
export class ModelFactory {
    /**
     * @param {object} [defaults]
     * @param {string} [defaults.templateUrl]
     */
    constructor(defaults = {}) {
        this.templateUrl = defaults.templateUrl || DEFAULT_TEMPLATE_URL;
    }

    /**
     * Abstract AR object: panels + layout come from declarative HTML.
     * @param {string|object} [targetData=''] Target identifier or data object
     * @param {object} [options]
     * @param {Function|null} [options.onOk]
     * @param {string} [options.templateUrl]
     * @param {object} [options.vars] Additional variables for template substitution
     * @returns {Promise<THREE.Group>}
     */
    async createArTarget(targetData = '', options = {}) {
        const { onOk = null, templateUrl = this.templateUrl, vars: extraVars = {} } = options;

        const targetInfo = typeof targetData === 'object' && targetData !== null
            ? targetData
            : { title: String(targetData) };

        const title = targetInfo.title ?? targetInfo.name ?? String(targetData ?? '');
        const groupName = targetInfo.id || title || 'target';

        const group = new THREE.Group();
        group.name = `arTarget_${groupName}`;

        const sphere = this._createSphere();
        group.add(sphere);

        const template = await this._loadTemplate(templateUrl);
        const panels = template.querySelectorAll('panel');

        const templateVars = {
            title: title,
            textLabel: targetInfo.textLabel ?? 'MARKER',
            imgLabel: targetInfo.imgLabel ?? 'IMAGE',
            subtitle: targetInfo.subtitle ?? 'AR Target',
            okText: targetInfo.okText ?? 'OK',
            markerName: title, // Backward compatibility
            ...extraVars
        };

        const userData = {
            targetInfo,
            markerName: title, // Legacy backward compatibility
            sphere,
            onOk,
            panels: {}
        };

        let hasQuestionPanel = false;

        for (const panelEl of panels) {
            const mesh = await this._createPanelFromHtml(panelEl, templateVars);
            group.add(mesh);
            userData.panels[mesh.name] = mesh;
            userData[mesh.name] = mesh; // legacy direct access
            if (mesh.name === 'questionPanel') hasQuestionPanel = true;
            if (mesh.userData.texture) {
                userData[`${mesh.name}Texture`] = mesh.userData.texture;
            }
        }

        // Если в HTML-шаблоне нет центральной панели вопроса — добавляем холст вопроса
        if (!hasQuestionPanel) {
            const questionPanel = this._makeQuestionPanel(targetInfo);
            group.add(questionPanel);
            userData.panels.questionPanel = questionPanel;
            userData.questionPanel = questionPanel;
            userData.questionTexture = questionPanel.userData.texture;
        }

        group.position.z = 0.02;
        group.userData = userData;

        return group;
    }

    /**
     * Pure-canvas fallback (no network / no foreignObject) — for offline use.
     * @param {string|object} [targetData=''] Target identifier or data object
     * @param {object} [options]
     * @param {Function|null} [options.onOk]
     * @returns {THREE.Group}
     */
    createArTargetSync(targetData = '', options = {}) {
        const { onOk = null } = options;

        const targetInfo = typeof targetData === 'object' && targetData !== null
            ? targetData
            : { title: String(targetData) };

        const title = targetInfo.title ?? targetInfo.name ?? String(targetData ?? '');
        const textLabel = targetInfo.textLabel ?? 'MARKER';
        const imgLabel = targetInfo.imgLabel ?? 'IMAGE';
        const subtitle = targetInfo.subtitle ?? 'AR Target';
        const okText = targetInfo.okText ?? 'OK';
        const groupName = targetInfo.id || title || 'target';

        const group = new THREE.Group();
        group.name = `arTarget_${groupName}`;

        const sphere = this._createSphere();
        group.add(sphere);

        // Левая панель
        const textPanel = this._makeCanvasPanel({
            name: 'textPanel',
            w: 0.12, h: 0.18,
            pos: [-0.18, 0, 0.02],
            rot: [-Math.PI / 2, (20 * Math.PI) / 180, 0],
            draw: (ctx, cw, ch) => {
                ctx.fillStyle = 'rgba(10, 10, 30, 0.92)';
                ctx.fillRect(0, 0, cw, ch);
                ctx.strokeStyle = '#00ffaa';
                ctx.lineWidth = 8;
                ctx.strokeRect(4, 4, cw - 8, ch - 8);
                ctx.fillStyle = '#00ffaa';
                ctx.font = 'bold 28px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(textLabel, cw / 2, 60);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 36px sans-serif';
                ctx.fillText(title, cw / 2, 200);
                ctx.fillStyle = '#aaaaaa';
                ctx.font = '20px sans-serif';
                ctx.fillText(subtitle, cw / 2, 280);
            }
        });
        group.add(textPanel);

        // Правая панель
        const imgPanel = this._makeCanvasPanel({
            name: 'imgPanel',
            w: 0.12, h: 0.18,
            pos: [0.18, 0, 0.02],
            rot: [-Math.PI / 2, (-20 * Math.PI) / 180, 0],
            draw: (ctx, cw, ch) => {
                const grad = ctx.createLinearGradient(0, 0, 0, ch);
                grad.addColorStop(0, '#1a0033');
                grad.addColorStop(1, '#003344');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, cw, ch);
                for (let i = 0; i < 12; i++) {
                    ctx.beginPath();
                    ctx.arc(40 + Math.random() * 176, 40 + Math.random() * 304, 8 + Math.random() * 24, 0, Math.PI * 2);
                    ctx.fillStyle = `hsla(${200 + Math.random() * 80}, 70%, 55%, 0.7)`;
                    ctx.fill();
                }
                ctx.strokeStyle = '#ff66cc';
                ctx.lineWidth = 8;
                ctx.strokeRect(4, 4, cw - 8, ch - 8);
                ctx.fillStyle = '#ff66cc';
                ctx.font = 'bold 22px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(imgLabel, cw / 2, 50);
                ctx.fillStyle = '#ffffff';
                ctx.font = '18px sans-serif';
                ctx.fillText(title, cw / 2, 340);
            }
        });
        group.add(imgPanel);

        // Центральная панель с вопросом
        const questionPanel = this._makeQuestionPanel(targetInfo);
        group.add(questionPanel);

        // Нижная панель подтверждения OK
        const okPanel = this._makeCanvasPanel({
            name: 'okButton',
            w: 0.16, h: 0.06,
            pos: [0, -0.18, 0.02],
            rot: [-Math.PI / 2, 0, 0],
            canvasW: 256, canvasH: 96,
            draw: (ctx, cw, ch) => {
                ctx.fillStyle = 'rgba(0, 40, 20, 0.95)';
                ctx.fillRect(0, 0, cw, ch);
                ctx.fillStyle = '#00cc66';
                this._roundRectPath(ctx, 24, 16, 208, 64, 12);
                ctx.fill();
                ctx.strokeStyle = '#00ff99';
                ctx.lineWidth = 4;
                ctx.stroke();
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 40px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(okText, cw / 2, ch / 2);
            }
        });
        group.add(okPanel);

        group.position.z = 0.02;
        group.userData = {
            targetInfo,
            markerName: title, // Legacy backward compatibility
            sphere,
            textPanel,
            imgPanel,
            questionPanel,
            okPanel,
            textTexture: textPanel.userData.texture,
            imgTexture: imgPanel.userData.texture,
            questionTexture: questionPanel.userData.texture,
            okTexture: okPanel.userData.texture,
            onOk
        };
        return group;
    }

    // ─── private: HTML → THREE ─────────────────────────────────────────────────

    async _loadTemplate(url) {
        const res = await fetch(url);
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const template = doc.querySelector('#ar-target') || doc.querySelector('template');
        if (!template) throw new Error(`No <template id="ar-target"> in ${url}`);

        const styleEl = doc.querySelector('style');
        if (styleEl) {
            template.dataset.style = styleEl.textContent;
        }
        return template;
    }

    /**
     * Create a PlaneGeometry mesh from a <panel> element.
     * data-width / data-height  → geometry size (metres)
     * data-position="x,y,z"     → position
     * data-rotation="rx,ry,rz"  → degrees → radians
     * Inner HTML is rendered to CanvasTexture via SVG foreignObject.
     */
    async _createPanelFromHtml(panelEl, vars = {}) {
        const name = panelEl.getAttribute('name') || 'panel';
        const w = parseFloat(panelEl.dataset.width) || 0.12;
        const h = parseFloat(panelEl.dataset.height) || 0.18;
        const pos = this._parseVec3(panelEl.dataset.position, [0, 0, 0.02]);
        const rot = this._parseVec3(panelEl.dataset.rotation, [-90, 0, 0]).map(d => d * Math.PI / 180);

        let inner = panelEl.innerHTML;
        for (const [k, v] of Object.entries(vars)) {
            inner = inner.replaceAll(`{{${k}}}`, String(v ?? ''));
        }

        const { cssW, cssH } = this._measurePanelCss(panelEl);

        const texture = await this._htmlToTexture(
            inner,
            cssW,
            cssH,
            panelEl.closest('template')?.dataset?.style || ''
        );

        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(w, h),
            new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                side: THREE.DoubleSide
            })
        );
        mesh.name = name;
        mesh.position.set(...pos);
        mesh.rotation.set(...rot);
        mesh.userData.texture = texture;

        return mesh;
    }

    _measurePanelCss(panelEl) {
        const root = panelEl.querySelector('.panel') || panelEl.firstElementChild;
        if (!root) return { cssW: 256, cssH: 384 };

        const style = root.getAttribute('style') || '';
        const wMatch = style.match(/width:\s*([\d.]+)px/);
        const hMatch = style.match(/height:\s*([\d.]+)px/);

        let cssW = wMatch ? parseFloat(wMatch[1]) : 256;
        let cssH = hMatch ? parseFloat(hMatch[1]) : 384;

        if (root.classList.contains('ok-panel')) {
            cssW = 256;
            cssH = 96;
        }
        return { cssW, cssH };
    }

    /**
     * Render arbitrary HTML + CSS into a CanvasTexture (SVG foreignObject).
     */
    _htmlToTexture(html, width, height, cssText = '') {
        return new Promise((resolve, reject) => {
            const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;margin:0;padding:0;overflow:hidden;">
      <style>${cssText}</style>
      ${html}
    </div>
  </foreignObject>
</svg>`.trim();

            const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                URL.revokeObjectURL(url);

                const tex = new THREE.CanvasTexture(canvas);
                tex.colorSpace = THREE.SRGBColorSpace;
                tex.needsUpdate = true;
                resolve(tex);
            };
            img.onerror = (e) => {
                URL.revokeObjectURL(url);
                reject(e);
            };
            img.src = url;
        });
    }

    // ─── private: helpers ──────────────────────────────────────────────────────

    _createSphere() {
        const geo = new THREE.SphereGeometry(0.01, 24, 24);
        const mat = new THREE.MeshStandardMaterial({
            color: 0xff00ff,
            metalness: 0.3,
            roughness: 0.4,
            emissive: 0xff00ff,
            emissiveIntensity: 0.15
        });
        return new THREE.Mesh(geo, mat);
    }

    _parseVec3(str, fallback) {
        if (!str) return fallback.slice();
        const parts = str.split(',').map(s => parseFloat(s.trim()));
        return parts.length === 3 && parts.every(Number.isFinite) ? parts : fallback.slice();
    }

    _makeCanvasPanel({ name, w, h, pos, rotX, rot = [rotX ?? -Math.PI / 2, 0, 0], canvasW = 256, canvasH = 384, draw }) {
        const canvas = document.createElement('canvas');
        canvas.width = canvasW;
        canvas.height = canvasH;
        const ctx = canvas.getContext('2d');
        draw(ctx, canvasW, canvasH);

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;

        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(w, h),
            new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
        );
        mesh.name = name;
        mesh.position.set(...pos);
        mesh.rotation.set(...rot);
        mesh.userData.texture = tex;
        return mesh;
    }

    /**
     * Создает центральную 3D-панель вопроса с динамическим интерактивом
     */
    _makeQuestionPanel(targetInfo) {
        const questData = targetInfo.questData || {};
        const answerType = questData.answerType || 'Slide';
        const title = questData.title || targetInfo.title || 'КВЕСТ';
        const question = questData.question || targetInfo.subtitle || '';
        const mainText = questData.mainText || '';
        const options = questData.options || [];

        const canvasW = 384;
        const canvasH = 512;
        const canvas = document.createElement('canvas');
        canvas.width = canvasW;
        canvas.height = canvasH;
        const ctx = canvas.getContext('2d');

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;

        const userData = {
            texture: tex,
            questData,
            slideIndex: 0,
            inputValue: '',
            hitRegions: [],
            redraw: null
        };

        const redraw = () => {
            ctx.clearRect(0, 0, canvasW, canvasH);
            userData.hitRegions = [];

            // Фону карточки
            ctx.fillStyle = 'rgba(12, 16, 38, 0.95)';
            this._roundRectPath(ctx, 4, 4, canvasW - 8, canvasH - 8, 20);
            ctx.fill();
            ctx.strokeStyle = '#00e5ff';
            ctx.lineWidth = 6;
            ctx.stroke();

            // Заголовок
            ctx.fillStyle = 'rgba(0, 229, 255, 0.15)';
            this._roundRectPath(ctx, 16, 16, canvasW - 32, 54, 12);
            ctx.fill();

            ctx.fillStyle = '#00e5ff';
            ctx.font = 'bold 22px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            this._wrapText(ctx, title, canvasW / 2, 43, canvasW - 50, 24);

            // Текст вопроса
            ctx.fillStyle = '#ffffff';
            ctx.font = '20px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            const nextY = this._wrapText(ctx, question, canvasW / 2, 85, canvasW - 40, 26);

            // Интерактивное содержимое в зависимости от answerType
            if (answerType === 'Button') {
                const totalOpts = options.length || 1;
                const startY = Math.max(nextY + 20, 200);
                const availableH = canvasH - startY - 20;
                const btnH = Math.min(60, Math.floor((availableH - (totalOpts - 1) * 12) / totalOpts));

                options.forEach((opt, idx) => {
                    const btnY = startY + idx * (btnH + 12);
                    const btnX = 30;
                    const btnW = canvasW - 60;

                    ctx.fillStyle = 'rgba(0, 180, 216, 0.25)';
                    this._roundRectPath(ctx, btnX, btnY, btnW, btnH, 10);
                    ctx.fill();
                    ctx.strokeStyle = '#00b4d8';
                    ctx.lineWidth = 3;
                    ctx.stroke();

                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 18px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    this._wrapText(ctx, opt.text || `Вариант ${idx + 1}`, canvasW / 2, btnY + btnH / 2, btnW - 20, 22);

                    userData.hitRegions.push({
                        type: 'button',
                        index: idx + 1,
                        x: btnX,
                        y: btnY,
                        w: btnW,
                        h: btnH
                    });
                });
            } else if (answerType === 'InputField') {
                const inputY = Math.max(nextY + 30, 220);
                const inputX = 30;
                const inputW = canvasW - 60;
                const inputH = 60;

                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                this._roundRectPath(ctx, inputX, inputY, inputW, inputH, 10);
                ctx.fill();
                ctx.strokeStyle = '#00ffaa';
                ctx.lineWidth = 3;
                ctx.stroke();

                ctx.fillStyle = userData.inputValue ? '#ffffff' : '#888888';
                ctx.font = '18px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(userData.inputValue || 'Нажмите для ввода...', canvasW / 2, inputY + inputH / 2);

                userData.hitRegions.push({
                    type: 'input',
                    x: inputX,
                    y: inputY,
                    w: inputW,
                    h: inputH
                });

                // Кнопка OK
                const okY = inputY + inputH + 30;
                const okX = 80;
                const okW = canvasW - 160;
                const okH = 55;

                ctx.fillStyle = '#00cc66';
                this._roundRectPath(ctx, okX, okY, okW, okH, 12);
                ctx.fill();
                ctx.strokeStyle = '#00ff99';
                ctx.lineWidth = 3;
                ctx.stroke();

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 24px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('OK', canvasW / 2, okY + okH / 2);

                userData.hitRegions.push({
                    type: 'ok',
                    x: okX,
                    y: okY,
                    w: okW,
                    h: okH
                });
            } else if (answerType === 'Slide') {
                const slideY = Math.max(nextY + 20, 210);
                const currentOpt = options[userData.slideIndex] || {};
                const slideText = currentOpt.text || mainText || '';

                // Кнопка назад ◄
                const navW = 50;
                const navH = 50;
                const navY = slideY + 30;

                ctx.fillStyle = 'rgba(0, 229, 255, 0.3)';
                this._roundRectPath(ctx, 20, navY, navW, navH, 10);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 24px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('◄', 20 + navW / 2, navY + navH / 2);

                userData.hitRegions.push({
                    type: 'prev',
                    x: 20,
                    y: navY,
                    w: navW,
                    h: navH
                });

                // Кнопка вперед ►
                ctx.fillStyle = 'rgba(0, 229, 255, 0.3)';
                this._roundRectPath(ctx, canvasW - 20 - navW, navY, navW, navH, 10);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 24px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('►', canvasW - 20 - navW / 2, navY + navH / 2);

                userData.hitRegions.push({
                    type: 'next',
                    x: canvasW - 20 - navW,
                    y: navY,
                    w: navW,
                    h: navH
                });

                // Текст слайда
                const contentX = 80;
                const contentW = canvasW - 160;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                this._roundRectPath(ctx, contentX, slideY, contentW, 110, 10);
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.font = '18px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                this._wrapText(ctx, slideText, canvasW / 2, slideY + 15, contentW - 20, 22);

                // Кнопка OK
                const okY = slideY + 130;
                const okX = 80;
                const okW = canvasW - 160;
                const okH = 55;

                ctx.fillStyle = '#00cc66';
                this._roundRectPath(ctx, okX, okY, okW, okH, 12);
                ctx.fill();
                ctx.strokeStyle = '#00ff99';
                ctx.lineWidth = 3;
                ctx.stroke();

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 24px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('OK', canvasW / 2, okY + okH / 2);

                userData.hitRegions.push({
                    type: 'ok',
                    x: okX,
                    y: okY,
                    w: okW,
                    h: okH
                });
            } else {
                // Art / AntiArt или по умолчанию
                const okY = Math.max(nextY + 40, 300);
                const okX = 80;
                const okW = canvasW - 160;
                const okH = 60;

                ctx.fillStyle = '#00cc66';
                this._roundRectPath(ctx, okX, okY, okW, okH, 12);
                ctx.fill();
                ctx.strokeStyle = '#00ff99';
                ctx.lineWidth = 3;
                ctx.stroke();

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 26px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('OK', canvasW / 2, okY + okH / 2);

                userData.hitRegions.push({
                    type: 'ok',
                    x: okX,
                    y: okY,
                    w: okW,
                    h: okH
                });
            }

            tex.needsUpdate = true;
        };

        userData.redraw = redraw;
        redraw();

        const w = 0.20;
        const h = 0.26;
        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(w, h),
            new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
        );
        mesh.name = 'questionPanel';
        mesh.position.set(0, 0, 0.02);
        mesh.rotation.set(-Math.PI / 2, 0, 0);
        mesh.userData = userData;

        return mesh;
    }

    _wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        if (!text) return y;
        const words = String(text).split(' ');
        let line = '';
        let currentY = y;

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line.trim(), x, currentY);
                line = words[n] + ' ';
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line.trim(), x, currentY);
        return currentY + lineHeight;
    }

    _roundRectPath(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
}

// ─── backward-compatible free functions (no regression) ───────────────────────

const defaultFactory = new ModelFactory();

/**
 * @param {string|object} [targetData]
 * @param {object} [options]
 * @returns {Promise<THREE.Group>}
 */
export async function createArTarget(targetData, options = {}) {
    return defaultFactory.createArTarget(targetData, options);
}

/**
 * @param {string|object} [targetData]
 * @param {object} [options]
 * @returns {THREE.Group}
 */
export function createArTargetSync(targetData, options = {}) {
    return defaultFactory.createArTargetSync(targetData, options);
}
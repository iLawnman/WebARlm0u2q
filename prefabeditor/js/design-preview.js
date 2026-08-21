/**
 * Модуль генерации и управления дизайн-превью.
 * Работает как локально (file://), так и через web-сервер.
 */
(function(window) {
    'use strict';

    const PROP_KEYS = ['font', 'color', 'image', 'fx', 'sound', 'text', 'prefab'];

    function normalizeAsset(name) {
        if (!name) return '';
        const n = String(name).trim();
        if (!n) return '';
        if (n.startsWith('http://') || n.startsWith('https://') || n.startsWith('./') || n.startsWith('/')) return n;
        return './assets/resources/' + n + '.png';
    }

    window.normalizeAsset = normalizeAsset;

    function parseRowGroups(headers, values) {
        const groups = {};
        const order = [];
        headers.forEach((header, i) => {
            if (header === 'id' || header === 'name' || header === 'Res_Check') return;
            const sep = header.lastIndexOf('_');
            if (sep === -1) return;
            const group = header.substring(0, sep);
            const prop = header.substring(sep + 1).toLowerCase();
            if (!PROP_KEYS.includes(prop)) return;

            const val = values[i];
            if (!groups[group]) { groups[group] = {}; order.push(group); }
            if (val !== undefined && val !== null && val !== '') groups[group][prop] = val;
        });
        return { groups, order };
    }

    function parseDesignJson(jsonData) {
        if (!Array.isArray(jsonData) || jsonData.length < 2) {
            throw new Error('Неверный формат JSON-дизайна: ожидается [headers, ...rows]');
        }
        const headers = jsonData[0];
        const dataRows = jsonData.slice(1);
        return dataRows.map(values => {
            const { groups, order } = parseRowGroups(headers, values);
            return { meta: { id: values[0] || '', name: values[1] || '' }, groups, order };
        });
    }

    function renderFallbackHTML(meta, groups) {
        const getAsset = (grp, key) => groups[grp] && groups[grp][key] ? normalizeAsset(groups[grp][key]) : '';
        const getColor = (grp) => groups[grp] && groups[grp].color ? groups[grp].color : 'transparent';
        const getText = (grp) => groups[grp] && groups[grp].text ? groups[grp].text : '';

        const bgImg = getAsset('BackGradient', 'image') || getAsset('BackImage', 'image');
        const titleBg = getColor('TitleText_bg');
        const titleText = getText('TitleText') || meta.name || meta.id;
        const mainBg = getColor('MainText_bg');
        const mainText = getText('MainText_MainTxt');

        return `
            <div class="screen" style="background-color: #1a1a1a;">
                ${bgImg ? `<div class="bg-img" style="background-image: url('${bgImg}');"></div>` : ''}
                <div class="content">
                    <div class="title-area" style="background: ${titleBg}; color: #fff;">
                        <h2>${titleText}</h2>
                    </div>
                    <div class="panels">
                        <div class="panel main-panel" style="background: ${mainBg}; color: #fff;">
                            <p>${mainText}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    let parsedRows = [];
    let currentSelectedRow = 0;

    const DesignPreview = {
        handleJsonFile: function(event) {
            const file = event.target.files && event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const jsonData = JSON.parse(e.target.result);
                    parsedRows = parseDesignJson(jsonData);

                    const statusEl = document.getElementById('json-status');
                    if (statusEl) {
                        statusEl.innerText = `Загружено вариантов: ${parsedRows.length}`;
                    }

                    const selector = document.getElementById('json-row-selector');
                    if (selector) {
                        selector.innerHTML = '';
                        parsedRows.forEach((r, idx) => {
                            const opt = document.createElement('option');
                            opt.value = idx;
                            opt.textContent = `${idx + 1}. ${r.meta.id || r.meta.name || 'Вариант'}`;
                            selector.appendChild(opt);
                        });
                        selector.style.display = parsedRows.length > 1 ? 'block' : 'none';
                    }

                    const btnHide = document.getElementById('btn-hide-design');
                    if (btnHide) btnHide.style.display = 'inline-block';

                    currentSelectedRow = 0;
                    this.showPreview();

                } catch (err) {
                    console.error('Ошибка обработки JSON-дизайна:', err);
                    alert('Не удалось распарсить JSON дизайн: ' + err.message);
                }
            };
            reader.readAsText(file);
        },

        handleRowChange: function(event) {
            currentSelectedRow = parseInt(event.target.value, 10) || 0;
            this.showPreview();
        },

        showPreview: function() {
            if (!parsedRows || parsedRows.length === 0) return;

            const row = parsedRows[currentSelectedRow] || parsedRows[0];
            const overlay = document.getElementById('design-preview-overlay');
            const iframe = document.getElementById('design-preview-frame');
            const titleEl = document.getElementById('preview-title');

            if (!overlay || !iframe) return;

            if (titleEl) {
                titleEl.textContent = row.meta.id || row.meta.name || `Вариант #${currentSelectedRow + 1}`;
            }

            let htmlContent = '';

            try {
                if (window.QuestBuilder && typeof window.QuestBuilder.buildScreenHTML === 'function') {
                    htmlContent = window.QuestBuilder.buildScreenHTML(currentSelectedRow, row.meta, row.groups, row.order);
                } else {
                    htmlContent = renderFallbackHTML(row.meta, row.groups);
                }
            } catch (builderErr) {
                console.warn('Ошибка внутри QuestBuilder.buildScreenHTML, переключение на встроенный рендер:', builderErr);
                htmlContent = renderFallbackHTML(row.meta, row.groups);
            }

            const doc = iframe.contentDocument || iframe.contentWindow.document;
            doc.open();
            doc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { margin:0; padding:0; background:#111; font-family:sans-serif; overflow:hidden; }
                        .screen { width:100vw; height:100vh; position:relative; }
                        .bg-img { position:absolute; inset:0; background-size:cover; background-position:center; }
                        .content { position:relative; z-index:2; height:100%; display:flex; flex-direction:column; padding:16px; box-sizing:border-box; }
                        .title-area { padding:12px; text-align:center; border-radius:6px; font-weight:bold; }
                        .panels { flex:1; display:flex; gap:12px; margin:12px 0; }
                        .panel { flex:1; border-radius:6px; padding:12px; position:relative; }
                        .main-panel { flex:2; }
                    </style>
                </head>
                <body>
                    ${htmlContent}
                </body>
                </html>
            `);
            doc.close();

            // Пробрасываем closeQuestModal во фрейм для обратной совместимости
            if (typeof window.closeQuestModal === 'function') {
                iframe.contentWindow.closeQuestModal = window.closeQuestModal;
            }

            overlay.style.display = 'flex';
        },

        hidePreview: function() {
            const overlay = document.getElementById('design-preview-overlay');
            if (overlay) overlay.style.display = 'none';
        },

        exportDesignHTML: function() {
            const iframe = document.getElementById('design-preview-frame');
            if (!iframe) return;
            const doc = iframe.contentDocument || iframe.contentWindow.document;

            const blob = new Blob([doc.documentElement.outerHTML], { type: 'text/html' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `design-preview-${currentSelectedRow + 1}.html`;
            a.click();
        }
    };

    window.DesignPreview = DesignPreview;

})(window);
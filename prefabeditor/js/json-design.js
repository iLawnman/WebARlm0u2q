/** Загрузка и разбор JSON-дизайна (arprefabsdesign.json) в префаб редактора.
 *
 *  Логика извлечения полей 1:1 портирована из рабочего makedesign.js:
 *  каждое значение ищется по ТОЧНОМУ имени колонки (getVal), с фолбэком
 *  на дефолт, а не через generic-разбиение заголовка "Группа_Свойство"
 *  (старый подход разваливал дизайн на десятки мелких бессвязных панелек).
 *
 *  Вместо этого дизайн строится как связный AR-экран из 5 панелей:
 *  Заголовок / Основной текст / Левая панель / Правая панель / Кнопки —
 *  как в ardesign.html и на скриншоте макета.
 */

import { normalizePath, escapeAttr } from './utils.js';

let lastJsonDesign = null;

/** Точный поиск значения по имени колонки (как getVal в makedesign.js) */
function getVal(headers, row, key, fallback = '') {
    const idx = headers.indexOf(key);
    if (idx === -1) return fallback;
    const v = row[idx];
    return (v === undefined || v === null || v === '') ? fallback : v;
}

function assetUrl(name) {
    if (!name) return '';
    const n = String(name).trim();
    if (!n) return '';
    if (/^(https?:)?\/\//.test(n) || n.startsWith('./') || n.startsWith('/')) return normalizePath(n);
    return normalizePath(n + '.png');
}

/** Извлекает из строки JSON-дизайна плоский объект полей (как prefabs.map в makedesign.js) */
export function extractPrefabFields(headers, row) {
    const v = (key, fb) => getVal(headers, row, key, fb);
    return {
        id: v('id'),
        name: v('name'),

        back_image: v('BackGradient_Image') || v('BackImage_Image') || 'Back3',

        title_font: v('TitleText_Font') || 'nk_vitez SDF',
        title_color: v('TitleText_Color') || '#FFD700',
        title_bg_color: v('TitleText_bg_Color') || '#070707EE',
        title_bg_image: v('TitleText_bg_Image') || 'ButtonPanelBG',

        main_bg_color: v('MainText_bg_Color') || '#070707EE',
        main_bg_image: v('MainText_bg_Image') || 'MainTextPanelDark',
        main_font: v('MainText_MainTxt_Font') || v('MainTxt_Font') || 'RobotoSlab-Regular SDF',
        main_color: v('MainText_MainTxt_Color') || '#FFFFFF',

        left_bg_color: v('LeftPanel_bgLeftPanel_Color') || '#070707EE',
        left_bg_image: v('LeftPanel_bgLeftPanel_Image') || 'MainTextPanelDark',
        left_help_font: v('LeftPanel_HelpUp_Font') || 'RobotoSlab-Regular SDF',
        left_help_color: v('LeftPanel_HelpUp_Color') || '#FF69B4',
        left_help_text: v('LeftPanel_HelpUp_Text') || 'Подсказка',

        right_bg_color: v('RightPanel_bgRight_Panel_Color') || '#070707EE',
        right_bg_image: v('RightPanel_bgRight_Panel_Image') || 'MainTextPanelDark',

        buttons_bg_color: v('Buttons_bgButtonsPanel_Color') || '#070707EE',
        buttons_bg_image: v('Buttons_bgButtonsPanel_Image') || 'ButtonPanelBG',

        btn_next_text: v('Buttons_Button_NEXT_Text_Text') || 'Дальше',
        btn_next_color: v('Buttons_Button_NEXT_Text_Color') || '#E9BF15',
        btn_next_bg_color: v('Buttons_Button_NEXT_Color') || '#FA0617',

        input_ph_text: v('Buttons_InputField_Placeholder_Text') || 'ВВЕДИТЕ ОТВЕТ',
        input_ph_color: v('Buttons_InputField_Placeholder_Color') || '#D19C27',
        input_text_color: v('Buttons_InputField_Text_Color') || '#FFFFFF',

        additional_prefab: v('additionalCanvas_Prefab') || 'BigSparks'
    };
}

/** Сериализует одну панель экрана в формате ar-screen-panel (понимается panels.js) */
function serializeScreenPanel(bgColor, bgImageName, elements) {
    const elsHtml = elements.map(el => {
        const attrs = [`class="ar-el"`, `data-type="${el.type}"`];
        if (el.text !== undefined) attrs.push(`data-text="${escapeAttr(el.text)}"`);
        if (el.fontSize !== undefined) attrs.push(`data-fontsize="${el.fontSize}"`);
        if (el.color !== undefined) attrs.push(`data-color="${escapeAttr(el.color)}"`);
        if (el.weight !== undefined) attrs.push(`data-weight="${escapeAttr(el.weight)}"`);
        if (el.src !== undefined) attrs.push(`data-src="${escapeAttr(el.src)}"`);
        if (el.width !== undefined) attrs.push(`data-width="${el.width}"`);
        if (el.height !== undefined) attrs.push(`data-height="${el.height}"`);
        if (el.btnBg !== undefined) attrs.push(`data-bg="${escapeAttr(el.btnBg)}"`);
        return `<div ${attrs.join(' ')}></div>`;
    }).join('\n    ');

    return `<div class="ar-screen-panel" data-bg-color="${escapeAttr(bgColor)}" data-bg-image="${escapeAttr(assetUrl(bgImageName))}">
    ${elsHtml}
  </div>`;
}

function panelTag(name, width, height, position, innerHtml) {
    return `  <panel name="${name}" data-width="${width}" data-height="${height}" data-position="${position}" data-rotation="0,0,0">
    ${innerHtml}
  </panel>\n`;
}

/** Строит AR-шаблон (5 панелей: заголовок/центр/лево/право/кнопки) из полей дизайна */
export function buildScreenTemplate(p) {
    let out = `<template id="ar-target">\n`;

    // Заголовок
    out += panelTag('TitlePanel', '0.34', '0.08', '0,0.16,0', serializeScreenPanel(
        p.title_bg_color, p.title_bg_image,
        [{ type: 'text', text: 'Вопрос', fontSize: 20, color: p.title_color, weight: 'bold' }]
    ));

    // Основная панель
    out += panelTag('MainTextPanel', '0.34', '0.24', '0,0,0', serializeScreenPanel(
        p.main_bg_color, p.main_bg_image,
        [{ type: 'text', text: 'Текст основного вопроса отображается здесь. Можно использовать несколько строк.', fontSize: 15, color: p.main_color }]
    ));

    // Левая панель
    out += panelTag('LeftPanel', '0.15', '0.24', '-0.245,0,0', serializeScreenPanel(
        p.left_bg_color, p.left_bg_image,
        [
            { type: 'text', text: p.left_help_text, fontSize: 13, color: p.left_help_color },
            { type: 'text', text: '↓', fontSize: 13, color: p.left_help_color }
        ]
    ));

    // Правая панель
    out += panelTag('RightPanel', '0.15', '0.24', '0.245,0,0', serializeScreenPanel(
        p.right_bg_color, p.right_bg_image,
        [{ type: 'text', text: 'Правая панель', fontSize: 11, color: '#888888' }]
    ));

    // Панель кнопок
    out += panelTag('ButtonsPanel', '0.34', '0.11', '0,-0.19,0', serializeScreenPanel(
        p.buttons_bg_color, p.buttons_bg_image,
        [
            { type: 'input', text: p.input_ph_text, fontSize: 13 },
            { type: 'button', text: p.btn_next_text, fontSize: 14, btnBg: p.btn_next_bg_color },
            { type: 'text', text: '1   2   3   4', fontSize: 14, color: p.title_color }
        ]
    ));

    out += `</template>`;
    return out;
}

export function handleJsonDesignSelect(event, onBuilt) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            buildDesignFromJson(data, undefined, onBuilt);
        } catch (err) {
            alert('Ошибка при чтении JSON: ' + err.message);
        }
    };
    reader.readAsText(file);
}

export function handleJsonRowChange(event, onBuilt) {
    const rowIndex = parseInt(event.target.value, 10);
    if (lastJsonDesign) buildDesignFromJson(lastJsonDesign, rowIndex, onBuilt);
}

export function buildDesignFromJson(jsonData, rowIndex, onBuilt) {
    if (!Array.isArray(jsonData) || jsonData.length < 2) {
        alert('Неверный формат JSON-дизайна.');
        return;
    }

    lastJsonDesign = jsonData;

    const headers = jsonData[0];
    const dataRows = jsonData.slice(1);
    const idx = Number.isInteger(rowIndex) ? rowIndex : 0;
    const row = dataRows[idx] || dataRows[0];

    const selectorEl = document.getElementById('json-row-selector');
    if (selectorEl) {
        if (dataRows.length > 1) {
            selectorEl.style.display = '';
            selectorEl.innerHTML = dataRows.map((r, i) => {
                const p = extractPrefabFields(headers, r);
                const label = p.id || p.name || ('Вариант ' + (i + 1));
                return `<option value="${i}" ${i === idx ? 'selected' : ''}>${label}</option>`;
            }).join('');
        } else {
            selectorEl.style.display = 'none';
        }
    }

    const prefab = extractPrefabFields(headers, row);
    const generatedTemplate = buildScreenTemplate(prefab);
    if (onBuilt) onBuilt(generatedTemplate);
}

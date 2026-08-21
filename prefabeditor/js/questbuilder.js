/**
 * js/questbuilder.js
 * Генератор дизайн-превью из arprefabsdesign.json → разметка в стиле ardesign.html
 */

export const PROP_KEYS = ['font', 'color', 'image', 'fx', 'sound', 'text', 'prefab'];

export function normalizeAsset(name) {
    if (!name) return '';
    const n = String(name).trim();
    if (!n) return '';
    if (n.startsWith('http://') || n.startsWith('https://') || n.startsWith('./') || n.startsWith('/')) return n;
    return './assets/resources/' + n + '.png';
}

/** Разбирает одну строку данных на { groupName: {font,color,image,...} } */
export function parseRowGroups(headers, values) {
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

/** Разбирает весь JSON-дизайн (headers + rows) в массив { meta:{id,name}, groups } */
export function parseDesignJson(jsonData) {
    if (!Array.isArray(jsonData) || jsonData.length < 2) {
        throw new Error('Неверный формат JSON-дизайна: ожидается [headers, ...rows]');
    }
    const headers = jsonData[0];
    const dataRows = jsonData.slice(1);
    return dataRows.map(values => {
        const { groups } = parseRowGroups(headers, values);
        return { meta: { id: values[0] || '', name: values[1] || '' }, groups };
    });
}

function g(groups, group, prop, fallback) {
    const v = groups[group] && groups[group][prop];
    return (v === undefined || v === null || v === '') ? (fallback !== undefined ? fallback : '') : v;
}

function guessTitle(meta) {
    const id = (meta.id || meta.name || '').toLowerCase();
    return id.includes('base') ? 'Базовый вопрос' : 'Вопрос';
}

function bgStyle(colorVal, imgUrl, fallbackColor) {
    let s = `background-color:${colorVal || fallbackColor};`;
    if (imgUrl) s += `background-image:url('${imgUrl}');background-size:cover;`;
    return s;
}

/** Строит HTML одного экрана (вкладки) на основе groups конкретной строки */
export function buildScreenHTML(rowIndex, meta, groups, options = {}) {
    const mainPlaceholder = options.mainText ||
        'Текст основного вопроса отображается здесь. Можно использовать несколько строк.';

    const bgImg = normalizeAsset(g(groups, 'BackGradient', 'image'));

    const titleBgColor = g(groups, 'TitleText_bg', 'color', 'rgba(7,7,7,0.93)');
    const titleBgImg = normalizeAsset(g(groups, 'TitleText_bg', 'image'));
    const titleColor = g(groups, 'TitleText', 'color', '#FFD700');
    const titleText = options.title || guessTitle(meta);

    const leftCornerImg = normalizeAsset(g(groups, 'LeftPanel_4corner_decor_Corner', 'image', 'RusStyleElement'));
    const rightCornerImg = normalizeAsset(g(groups, 'RightPanel_4corner_decor_Corner', 'image', 'RusStyleElement'));
    const mainCornerImg = normalizeAsset(g(groups, 'MainText_4corner_decor_Corner', 'image', 'RusStyleElement'));

    const leftBgColor = g(groups, 'LeftPanel_bgLeftPanel', 'color', 'rgba(7,7,7,0.93)');
    const leftBgImg = normalizeAsset(g(groups, 'LeftPanel_bgLeftPanel', 'image', 'MainTextPanelDark'));
    const rightBgColor = g(groups, 'RightPanel_bgRight_Panel', 'color', 'rgba(7,7,7,0.93)');
    const rightBgImg = normalizeAsset(g(groups, 'RightPanel_bgRight_Panel', 'image', 'MainTextPanelDark'));
    const mainBgColor = g(groups, 'MainText_bg', 'color', 'rgba(7,7,7,0.93)');
    const mainBgImg = normalizeAsset(g(groups, 'MainText_bg', 'image', 'MainTextPanelDark'));

    const mandalaImg = normalizeAsset('mandala');
    const decorLine1 = normalizeAsset(g(groups, 'MainText_Decor_2lines_line1', 'image', 'Line2S'));
    const decorLine2 = normalizeAsset(g(groups, 'MainText_Decor_2lines_line2', 'image', 'Line2S'));

    const mainTextColor = g(groups, 'MainText_MainTxt', 'color', '#FFFFFF');
    const helpColor = g(groups, 'LeftPanel_HelpUp', 'color', '#FF69B4');
    const helpText = g(groups, 'LeftPanel_HelpUp', 'text', 'Подсказка');

    const buttonsBgColor = g(groups, 'Buttons_bgButtonsPanel', 'color', 'rgba(7,7,7,0.93)');
    const buttonsBgImg = normalizeAsset(g(groups, 'Buttons_bgButtonsPanel', 'image', 'ButtonPanelBG'));

    const nextText = g(groups, 'Buttons_Button_NEXT_Text', 'text', 'Дальше');
    const nextColor = g(groups, 'Buttons_Button_NEXT_Text', 'color', '#E9BF15');

    const placeholderText = g(groups, 'Buttons_InputField_Placeholder', 'text', 'ВВЕДИТЕ ОТВЕТ');
    const placeholderColor = g(groups, 'Buttons_InputField_Placeholder', 'color', '#D19C27');
    const inputBorderColor = g(groups, 'Buttons_InputField', 'color', '#6A550E');
    const inputTextColor = g(groups, 'Buttons_InputField_Text', 'color', '#FFFFFF');

    const leftAngleImg = normalizeAsset(g(groups, 'Buttons_Button_Left_Image', 'image', 'angle-left'));
    const rightAngleImg = normalizeAsset(g(groups, 'Buttons_Button_Right_Image', 'image', 'angle-right'));

    const fourBtnColor = g(groups, 'Buttons_4Buttons_Image', 'color', '#2F32FF');

    const corners = (img) => `
        <div class="panel-corner tl" style="background-image:url('${img}');"></div>
        <div class="panel-corner tr" style="background-image:url('${img}');"></div>
        <div class="panel-corner bl" style="background-image:url('${img}');"></div>
        <div class="panel-corner br" style="background-image:url('${img}');"></div>`;

    return `
  <div class="screen ${rowIndex === 0 ? 'active' : ''}" id="screen-${rowIndex}">
    <div class="bg"></div>
    ${bgImg ? `<div class="bg-img" style="background-image:url('${bgImg}');"></div>` : ''}
    <div class="content">
      <div class="title-area" style="${bgStyle(titleBgColor, titleBgImg, 'rgba(7,7,7,0.93)')}">
        <div class="title-text" style="color:${titleColor};">${titleText}</div>
      </div>

      <div class="panels">
        <div class="panel side-panel" style="${bgStyle(leftBgColor, leftBgImg, 'rgba(7,7,7,0.93)')}">
          ${corners(leftCornerImg)}
          <div class="side-empty" style="background-image:url('${mandalaImg}');"></div>
          <div class="help" style="color:${helpColor};">${helpText}</div>
          <div class="help" style="color:${helpColor};">↓</div>
        </div>

        <div class="panel main-panel" style="${bgStyle(mainBgColor, mainBgImg, 'rgba(7,7,7,0.93)')}">
          ${corners(mainCornerImg)}
          <div class="decor-line" style="background-image:url('${decorLine1}');"></div>
          <div class="main-text" style="color:${mainTextColor};">${mainPlaceholder}</div>
          <div class="decor-line" style="background-image:url('${decorLine2}');"></div>
        </div>

        <div class="panel side-panel" style="${bgStyle(rightBgColor, rightBgImg, 'rgba(7,7,7,0.93)')}">
          ${corners(rightCornerImg)}
          <div class="side-empty" style="background-image:url('${mandalaImg}'); opacity:0.4;"></div>
          <div style="color:#888; font-size:0.75rem;">Правая панель</div>
        </div>
      </div>

      <div class="buttons-area" style="${bgStyle(buttonsBgColor, buttonsBgImg, 'rgba(7,7,7,0.93)')}">
        <div class="buttons-row">
          <div class="nav-btn" title="Left"><div class="icon" style="background:url('${leftAngleImg}') center/contain no-repeat;"></div></div>
          <div class="input-wrap">
            <input class="input-field" type="text" placeholder="${placeholderText}"
                   style="border-color:${inputBorderColor}; color:${inputTextColor};">
          </div>
          <button class="next-btn" style="color:${nextColor};">${nextText}</button>
          <div class="nav-btn" title="Right"><div class="icon" style="background:url('${rightAngleImg}') center/contain no-repeat;"></div></div>
        </div>
        <div class="four-btns">
          ${[1, 2, 3, 4].map(n => `<div class="four-btn" style="background:radial-gradient(circle at 30% 30%, ${fourBtnColor}, #1a1a80);"><span>${n}</span></div>`).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

export function collectAssets(groups) {
    const set = new Set();
    Object.values(groups).forEach(props => {
        if (props.image) set.add(props.image);
        if (props.prefab) set.add(props.prefab);
    });
    return Array.from(set);
}

export function buildLegendHTML(assetNames) {
    return assetNames.map(name => `
    <div class="res-item">
      <div class="res-preview img-ph" style="background-image:url('${normalizeAsset(name)}');"></div>
      <div class="name">${name}</div>
    </div>`).join('');
}

/** Полная таблица всех групп/свойств по всем строкам */
export function buildPropsTableHTML(rows) {
    const groupNames = new Set();
    rows.forEach(r => Object.keys(r.groups).forEach(gn => groupNames.add(gn)));
    const names = Array.from(groupNames).filter(n => Object.values(rows.find(r => r.groups[n]).groups[n] || {}).length).sort();

    const head = '<tr><th>Группа</th>' + rows.map(r => `<th>${r.meta.id || r.meta.name}</th>`).join('') + '</tr>';
    const body = names.map(gn => {
        const cells = rows.map(r => {
            const p = r.groups[gn] || {};
            const parts = PROP_KEYS.filter(k => p[k]).map(k => `${k}: ${p[k]}`);
            return `<td class="val">${parts.join(' / ') || '—'}</td>`;
        }).join('');
        return `<tr><td>${gn}</td>${cells}</tr>`;
    }).join('');

    return `<thead>${head}</thead><tbody>${body}</tbody>`;
}

/** Главная функция: JSON-дизайн → { tabsHTML, screensHTML, legendHTML, propsTableHTML, rows } */
export function generateDesignPreview(jsonData, options = {}) {
    const rows = parseDesignJson(jsonData);

    const tabsHTML = rows.map((r, i) =>
        `<button class="tab ${i === 0 ? 'active' : ''}" data-tab="${i}">${r.meta.id || r.meta.name || ('Вариант ' + (i + 1))}</button>`
    ).join('');

    const screensHTML = rows.map((r, i) => buildScreenHTML(i, r.meta, r.groups, options)).join('');

    const assets = Array.from(new Set(rows.flatMap(r => collectAssets(r.groups))));
    const legendHTML = buildLegendHTML(assets);
    const propsTableHTML = buildPropsTableHTML(rows);

    return { rows, tabsHTML, screensHTML, legendHTML, propsTableHTML };
}

/** Навешивает обработчики переключения вкладок на DOM */
export function wireTabs(root = document) {
    root.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            root.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            root.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            tab.classList.add('active');
            const target = root.getElementById ?
                root.getElementById('screen-' + tab.dataset.tab) :
                root.querySelector('#screen-' + tab.dataset.tab);
            if (target) target.classList.add('active');
        });
    });
}
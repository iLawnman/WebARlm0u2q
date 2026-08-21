(function(window) {
    'use strict';

    function g(groups, groupName, propName, defaultValue = '') {
        if (!groups || !groups[groupName]) return defaultValue;
        const val = groups[groupName][propName];
        return (val !== undefined && val !== null && val !== '') ? val : defaultValue;
    }

    function parseUnityRichText(text) {
        if (!text) return '';
        let str = String(text);
        str = str.replace(/^em/gi, '');
        str = str.replace(/<color=(#?[a-zA-Z0-9]+)>(.*?)<\/color>/gi, '<span style="color:$1;">$2</span>');
        str = str.replace(/<b>(.*?)<\/b>/gi, '<strong>$1</strong>');
        str = str.replace(/<i>(.*?)<\/i>/gi, '<em>$1</em>');
        str = str.replace(/<size=(\d+)>(.*?)<\/size>/gi, '<span style="font-size:$1px;">$2</span>');
        return str;
    }

    function bgStyle(color, imgUrl, defaultColor = 'rgba(7,7,7,0.93)') {
        const bgCol = color || defaultColor;
        if (imgUrl) {
            return `background: ${bgCol} url('${imgUrl}') center/cover no-repeat;`;
        }
        return `background: ${bgCol};`;
    }

    function buildScreenHTML(rowIndex, meta, groups, options = {}) {
        const normalize = (val) => typeof window.normalizeAsset === 'function' ? window.normalizeAsset(val) : val;

        const bgImg = normalize(g(groups, 'BackGradient', 'image') || g(groups, 'BackImage', 'image'));

        const titleTextRaw = options.title || g(groups, 'TitleText', 'text') || 'Первое задание - тренировочное';
        const titleText = parseUnityRichText(titleTextRaw);

        const storyTextRaw = options.modalText ||
            g(groups, 'Modal_Text', 'text') ||
            g(groups, 'Question', 'text') ||
            '...Ваня, владелец кафешки, говорит,\nчто уже 2 дня Аленку не видел.\n\n- Однако ж, помочь могу. Помнишь, блюдечко с голубой каемочкой?\nВот тебе аналог с искусственным интеллектом, R4. Правда, вредный он, прямо не ведет, но подсказки дает.\nКак никак, помощь.\nУспей! Время помощи ограничено.\n\nЗакрывай окошко и наводи камеру на картинку.';
        const storyText = parseUnityRichText(storyTextRaw);

        const questTextRaw = options.questText ||
            options.mainText ||
            g(groups, 'MainText_MainTxt', 'text') ||
            g(groups, 'MainText', 'text') ||
            'Прямо пойдешь - ничего не найдешь';
        const mainBlockText = parseUnityRichText(questTextRaw);

        const answerTextRaw = options.answerText ||
            g(groups, 'Buttons_InputField_Text', 'text') ||
            g(groups, 'Buttons_InputField_Placeholder', 'text') ||
            mainBlockText;
        const answerOptionText = parseUnityRichText(answerTextRaw);

        const helpUpText = parseUnityRichText(g(groups, 'LeftPanel_HelpUp', 'text', '📍 ПОДСКАЗКА'));
        const helpDownText = parseUnityRichText(g(groups, 'LeftPanel_HelpDown', 'text', '📍 СОВЕТ'));
        const noteText = parseUnityRichText(g(groups, 'RightPanel_NoteText', 'text', ''));

        const titleBgColor = g(groups, 'TitleText_bg', 'color', 'rgba(7,7,7,0.93)');
        const titleBgImg = normalize(g(groups, 'TitleText_bg', 'image'));
        const titleColor = g(groups, 'TitleText', 'color', '#FFD700');

        const leftCornerImg = normalize(g(groups, 'LeftPanel_4corner_decor_Corner', 'image', 'RusStyleElement'));
        const rightCornerImg = normalize(g(groups, 'RightPanel_4corner_decor_Corner', 'image', 'RusStyleElement'));
        const mainCornerImg = normalize(g(groups, 'MainText_4corner_decor_Corner', 'image', 'RusStyleElement'));

        const leftBgColor = g(groups, 'LeftPanel_bgLeftPanel', 'color', 'rgba(7,7,7,0.93)');
        const leftBgImg = normalize(g(groups, 'LeftPanel_bgLeftPanel', 'image', 'MainTextPanelDark'));
        const rightBgColor = g(groups, 'RightPanel_bgRight_Panel', 'color', 'rgba(7,7,7,0.93)');
        const rightBgImg = normalize(g(groups, 'RightPanel_bgRight_Panel', 'image', 'MainTextPanelDark'));
        const mainBgColor = g(groups, 'MainText_bg', 'color', 'rgba(7,7,7,0.93)');
        const mainBgImg = normalize(g(groups, 'MainText_bg', 'image', 'MainTextPanelDark'));

        const mandalaImg = normalize('mandala');
        const decorLine1 = normalize(g(groups, 'MainText_Decor_2lines_line1', 'image', 'Line2S'));
        const decorLine2 = normalize(g(groups, 'MainText_Decor_2lines_line2', 'image', 'Line2S'));

        const mainTextColor = g(groups, 'MainText_MainTxt', 'color', '#FFFFFF');
        const helpColor = g(groups, 'LeftPanel_HelpUp', 'color', '#FF69B4');

        const buttonsBgColor = g(groups, 'Buttons_bgButtonsPanel', 'color', 'rgba(7,7,7,0.93)');
        const buttonsBgImg = normalize(g(groups, 'Buttons_bgButtonsPanel', 'image', 'ButtonPanelBG'));

        const nextText = g(groups, 'Buttons_Button_NEXT_Text', 'text', 'ОК');
        const nextColor = g(groups, 'Buttons_Button_NEXT_Text', 'color', '#FFFFFF');

        const inputBorderColor = g(groups, 'Buttons_InputField', 'color', '#DAA520');
        const inputTextColor = g(groups, 'Buttons_InputField_Text', 'color', '#FFFFFF');

        const corners = (img) => `
            <div class="panel-corner tl" style="position:absolute; top:-2px; left:-2px; width:16px; height:16px; background-image:url('${img}'); background-size:contain; background-repeat:no-repeat; pointer-events:none;"></div>
            <div class="panel-corner tr" style="position:absolute; top:-2px; right:-2px; width:16px; height:16px; background-image:url('${img}'); background-size:contain; background-repeat:no-repeat; transform:scaleX(-1); pointer-events:none;"></div>
            <div class="panel-corner bl" style="position:absolute; bottom:-2px; left:-2px; width:16px; height:16px; background-image:url('${img}'); background-size:contain; background-repeat:no-repeat; transform:scaleY(-1); pointer-events:none;"></div>
            <div class="panel-corner br" style="position:absolute; bottom:-2px; right:-2px; width:16px; height:16px; background-image:url('${img}'); background-size:contain; background-repeat:no-repeat; transform:scale(-1); pointer-events:none;"></div>`;

        // Автономный обработчик закрытия — работает в iframe, при экспорте и локально
        const closeHandler = `(function(){var m=document.getElementById('modal-${rowIndex}');if(m){m.style.display='none';m.remove();}var b=document.getElementById('modal-body-${rowIndex}');var n=document.getElementById('note-content-${rowIndex}');if(b&&n&&!n.textContent.trim())n.innerHTML=b.innerHTML;})()`;

        return `
      <div class="screen ${rowIndex === 0 ? 'active' : ''}" id="screen-${rowIndex}" style="position:relative; width:100%; height:100%; display:flex; flex-direction:column; box-sizing:border-box; overflow:hidden;">
        <div class="bg" style="position:absolute; inset:0; background:#050505; z-index:0;"></div>
        ${bgImg ? `<div class="bg-img" style="position:absolute; inset:0; background-image:url('${bgImg}'); background-size:cover; background-position:center; z-index:1;"></div>` : ''}

        <!-- Модальное окно истории -->
        <div class="modal-overlay" id="modal-${rowIndex}" style="display: flex; position: absolute; inset: 0; background: rgba(0,0,0,0.85); z-index: 50; align-items: center; justify-content: center; padding: 20px;">
          <div class="modal-window" style="position: relative; width: 90%; max-width: 520px; background: #0a0a0c; border: 2px solid #DAA520; border-radius: 8px; padding: 20px; box-shadow: 0 0 25px rgba(0,0,0,0.95); box-sizing:border-box; z-index: 51;">
            <button class="modal-close-btn" 
                    type="button"
                    onclick="${closeHandler}" 
                    style="position: absolute; top: 10px; right: 10px; background: #111; border: 1px solid #DAA520; color: #DAA520; width: 30px; height: 30px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 16px; display:flex; align-items:center; justify-content:center; z-index: 52;">✕</button>
            <div class="modal-title" style="color:${titleColor}; font-weight: bold; text-align: center; margin-bottom: 14px; font-size: 1.05rem; padding-right: 25px;">${titleText}</div>
            <div class="modal-body" id="modal-body-${rowIndex}" style="white-space: pre-line; color: #e2e8f0; font-size: 0.8rem; line-height: 1.45; max-height:60vh; overflow-y:auto;">${storyText}</div>
          </div>
        </div>

        <div class="content" style="position:relative; z-index:10; display:flex; flex-direction:column; height:100%; padding:10px; box-sizing:border-box; gap:8px;">
          <!-- Шапка -->
          <div class="title-area" style="${bgStyle(titleBgColor, titleBgImg)}; border: 1px solid #DAA520; position: relative; padding: 8px; border-radius:4px;">
            <div class="mandala-icon left" style="position:absolute; left:8px; top:50%; transform:translateY(-50%); width:20px; height:20px; background:url('${mandalaImg}') center/contain no-repeat;"></div>
            <div class="title-text" style="color:${titleColor}; text-align:center; font-weight:bold; font-size:0.95rem;">${titleText}</div>
            <div class="mandala-icon right" style="position:absolute; right:8px; top:50%; transform:translateY(-50%); width:20px; height:20px; background:url('${mandalaImg}') center/contain no-repeat;"></div>
          </div>

          <!-- Блоки -->
          <div class="panels" style="display:flex; gap:8px; flex:1; min-height:0;">
            <div class="panel side-panel" style="${bgStyle(leftBgColor, leftBgImg)}; border: 1px solid #DAA520; flex:1; display:flex; flex-direction:column; gap:8px; position:relative; padding:10px; border-radius:4px;">
              ${corners(leftCornerImg)}
              <div style="border: 1px solid rgba(218,165,32,0.3); padding: 6px; border-radius: 4px; background: rgba(0,0,0,0.4);">
                <div class="help" style="color:${helpColor}; font-weight:bold; font-size:0.75rem;">${helpUpText}</div>
                <div class="help-body" style="color:#cbd5e1; font-size:0.7rem; line-height:1.25; margin-top:4px;">
                  Это вариант вашего решения задачи. Их несколько, минимум 2 варианта. Листай их стрелками.
                </div>
              </div>
              <div style="border: 1px solid rgba(218,165,32,0.3); padding: 6px; border-radius: 4px; background: rgba(0,0,0,0.4);">
                <div class="help" style="color:${helpColor}; font-weight:bold; font-size:0.75rem;">${helpDownText}</div>
                <div class="help-body" style="color:#cbd5e1; font-size:0.7rem; line-height:1.25; margin-top:4px;">
                  Определись с решением, подтверди выбор кнопкой ОК
                </div>
              </div>
            </div>

            <div class="panel main-panel" style="${bgStyle(mainBgColor, mainBgImg)}; border: 1px solid #DAA520; flex:2; display:flex; flex-direction:column; justify-content:center; align-items:center; position:relative; padding:12px; border-radius:4px;">
              ${corners(mainCornerImg)}
              ${decorLine1 ? `<div class="decor-line" style="width:80%; height:6px; background:url('${decorLine1}') center/contain no-repeat; margin-bottom:8px;"></div>` : ''}
              <div class="main-text" style="color:${mainTextColor}; white-space: pre-line; text-align: center; font-weight:500; font-size:0.85rem; line-height:1.4;">
                ${mainBlockText}
              </div>
              ${decorLine2 ? `<div class="decor-line" style="width:80%; height:6px; background:url('${decorLine2}') center/contain no-repeat; margin-top:8px;"></div>` : ''}
            </div>

            <div class="panel side-panel" style="${bgStyle(rightBgColor, rightBgImg)}; border: 1px solid #DAA520; flex:1; position:relative; padding:10px; border-radius:4px; overflow-y:auto;">
              ${corners(rightCornerImg)}
              <div style="color:#FFD700; font-size:0.8rem; font-weight:bold; margin-bottom:6px;">📜 ЗАМЕТКА</div>
              <div class="right-panel-content" id="note-content-${rowIndex}" style="color:#cbd5e1; font-size:0.7rem; line-height:1.3; white-space: pre-line;">
                ${noteText}
              </div>
            </div>
          </div>

          <!-- Нижняя панель -->
          <div class="buttons-area" style="${bgStyle(buttonsBgColor, buttonsBgImg)}; border: 1px solid #DAA520; padding:8px 12px; position:relative; border-radius:4px;">
            <div class="buttons-row" style="display:flex; align-items:center; justify-content:center; gap:10px;">
              <button class="nav-btn" type="button" style="background:rgba(0,0,0,0.6); border:1px solid #DAA520; color:#FFD700; width:32px; height:32px; border-radius:50%; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center;">◀</button>
              <div class="input-wrap" style="flex:1; max-width:400px;">
                <div class="input-field" style="border: 1px solid ${inputBorderColor}; color:${inputTextColor}; text-align:center; padding:6px 10px; background:rgba(0,0,0,0.6); border-radius:4px; font-weight:bold; font-size:0.8rem;">
                  ${answerOptionText}
                </div>
              </div>
              <button class="nav-btn" type="button" style="background:rgba(0,0,0,0.6); border:1px solid #DAA520; color:#FFD700; width:32px; height:32px; border-radius:50%; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center;">▶</button>
            </div>
            <div style="text-align:center; margin-top:6px;">
              <button class="next-btn" type="button" style="background:#e60000; color:${nextColor}; border:1px solid #FF4500; padding:6px 28px; border-radius:4px; font-weight:bold; cursor:pointer; font-size:0.8rem; min-width:100px;">${nextText}</button>
            </div>
          </div>
        </div>
      </div>`;
    }

    window.QuestBuilder = { buildScreenHTML };

    // Оставляем для обратной совместимости (вне iframe)
    window.closeQuestModal = function(rowIndex) {
        const modal = document.getElementById('modal-' + rowIndex);
        if (modal) {
            modal.style.display = 'none';
            modal.remove();
        }
        const modalBody = document.getElementById('modal-body-' + rowIndex);
        const noteContainer = document.getElementById('note-content-' + rowIndex);
        if (modalBody && noteContainer && !noteContainer.textContent.trim()) {
            noteContainer.innerHTML = modalBody.innerHTML;
        }
    };
})(window);
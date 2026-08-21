#!/usr/bin/env python3
"""
makedesign.py — генерация ardesign.html из arprefabsdesign.json
"""
import json
  from pathlib import Path

with open("/home/workdir/attachments/arprefabsdesign.json") as f:
    data = json.load(f)

headers = data[0]
rows = data[1:]

def get_val(row, key, default=""):
try:
idx = headers.index(key)
return row[idx] if row[idx] else default
except ValueError:
    return default

# Структурированные данные для обоих префабов
prefabs = []
for row in rows:
p = {
  "id": get_val(row, "id"),
  "name": get_val(row, "name"),
  "back_image": get_val(row, "BackGradient_Image") or get_val(row, "BackImage_Image") or "Back3",
  "title_font": get_val(row, "TitleText_Font") or "nk_vitez SDF",
  "title_color": get_val(row, "TitleText_Color") or "#FFD700",
  "title_bg_color": get_val(row, "TitleText_bg_Color") or "#070707EE",
  "title_bg_image": get_val(row, "TitleText_bg_Image") or "ButtonPanelBG",
  "title_corner_image": get_val(row, "TitleText_If_Title_Empty_Corner_Image") or "mandala",
  "title_corner_color": get_val(row, "TitleText_If_Title_Empty_Corner_Color") or "#FF000033",
  "main_bg_color": get_val(row, "MainText_bg_Color") or "#070707EE",
  "main_bg_image": get_val(row, "MainText_bg_Image") or "MainTextPanelDark",
  "main_font": get_val(row, "MainText_MainTxt_Font") or get_val(row, "MainTxt_Font") or "RobotoSlab-Regular SDF",
  "main_color": get_val(row, "MainText_MainTxt_Color") or "#FFFFFF",
  "main_decor_line": get_val(row, "MainText_Decor_2lines_line1_Image") or "Line2S",
  "main_corner": get_val(row, "MainText_4corner_decor_Corner_Image") or "RusStyleElement",
  "main_empty_decor": get_val(row, "MainText_Decor_IfEmpty_Image") or "mandala",
  "main_empty_color": get_val(row, "MainText_Decor_IfEmpty_Color") or "#FF000033",
  "left_bg_color": get_val(row, "LeftPanel_bgLeftPanel_Color") or "#070707EE",
  "left_bg_image": get_val(row, "LeftPanel_bgLeftPanel_Image") or "MainTextPanelDark",
  "left_corner": get_val(row, "LeftPanel_4corner_decor_Corner_Image") or "RusStyleElement",
  "left_empty_image": get_val(row, "LeftPanel_If_Title_Empty_Image") or "mandala",
  "left_help_font": get_val(row, "LeftPanel_HelpUp_Font") or "RobotoSlab-Regular SDF",
  "left_help_color": get_val(row, "LeftPanel_HelpUp_Color") or "#FF69B4",
  "right_bg_color": get_val(row, "RightPanel_bgRight_Panel_Color") or "#070707EE",
  "right_bg_image": get_val(row, "RightPanel_bgRight_Panel_Image") or "MainTextPanelDark",
  "right_corner": get_val(row, "RightPanel_4corner_decor_Corner_Image") or "RusStyleElement",
  "buttons_bg_color": get_val(row, "Buttons_bgButtonsPanel_Color") or "#070707EE",
  "buttons_bg_image": get_val(row, "Buttons_bgButtonsPanel_Image") or "ButtonPanelBG",
  "btn_ok_rim_color": get_val(row, "Buttons_Button_OK_RIM_Color") or "#F5004E",
  "btn_ok_rim_image": get_val(row, "Buttons_Button_OK_RIM_Image") or "Emerald",
  "btn_ok_img_color": get_val(row, "Buttons_Button_OK_Image_Color") or "#E90E1B",
  "btn_ok_img": get_val(row, "Buttons_Button_OK_Image_Image") or "Emerald",
  "btn_left_color": get_val(row, "Buttons_Button_Left_Image_Color") or "#DAA520",
  "btn_left_img": get_val(row, "Buttons_Button_Left_Image_Image") or "angle-left",
  "btn_right_color": get_val(row, "Buttons_Button_Right_Image_Color") or "#DAA520",
  "btn_right_img": get_val(row, "Buttons_Button_Right_Image_Image") or "angle-right",
  "btn_next_text": get_val(row, "Buttons_Button_NEXT_Text_Text") or "Дальше",
  "btn_next_font": get_val(row, "Buttons_Button_NEXT_Text_Font") or "nk_vitez SDF",
  "btn_next_color": get_val(row, "Buttons_Button_NEXT_Text_Color") or "#E9BF15",
  "btn_next_bg_color": get_val(row, "Buttons_Button_NEXT_Color") or "#FA0617",
  "btn_next_bg_img": get_val(row, "Buttons_Button_NEXT_Image") or "RoundedSquareFull512px",
  "btn_next_rim_color": get_val(row, "Buttons_Button_NEXT_RIM_Color") or "#5B1919",
  "btn_next_rim_img": get_val(row, "Buttons_Button_NEXT_RIM_Image") or "RoundedSquareStroke128px",
  "btn_next_shadow": get_val(row, "Buttons_Button_NEXT_Label Shadow_Image") or "sq-shadow128",
  "input_shadow_color": get_val(row, "Buttons_InputField_Shadow_Color") or "#41331672",
  "input_shadow_img": get_val(row, "Buttons_InputField_Shadow_Image") or "sq-shadow128",
  "input_color": get_val(row, "Buttons_InputField_Color") or "#6A550E",
  "input_img": get_val(row, "Buttons_InputField_Image") or "InputOutline",
  "input_ph_font": get_val(row, "Buttons_InputField_Placeholder_Font") or "nk_vitez SDF",
  "input_ph_color": get_val(row, "Buttons_InputField_Placeholder_Color") or "#D19C27",
  "input_ph_text": get_val(row, "Buttons_InputField_Placeholder_Text") or "ВВЕДИТЕ ОТВЕТ",
  "input_text_font": get_val(row, "Buttons_InputField_Text_Font") or "nk_vitez SDF",
  "input_text_color": get_val(row, "Buttons_InputField_Text_Color") or "#FFFFFF",
  "four_btn_color": get_val(row, "Buttons_4Buttons_Color") or "#2F32FF",
  "four_btn_img": get_val(row, "Buttons_4Buttons_Image") or "Circle64px1Shadow",
  "four_btn_shadow": get_val(row, "Buttons_4Buttons_LabelShadow_Image") or "sq-shadow128",
  "four_btn_rim_color": get_val(row, "Buttons_4Buttons_RIM_Color") or "#330E0E33",
  "four_btn_rim_img": get_val(row, "Buttons_4Buttons_RIM_Image") or "Decor1",
  "four_btn_label_font": get_val(row, "Buttons_4Buttons_Label_Font") or "nk_vitez SDF",
  "four_btn_label_color": get_val(row, "Buttons_4Buttons_Label_Color") or "#E9BF15",
  "additional_prefab": get_val(row, "additionalCanvas_Prefab") or "BigSparks",
}
prefabs.append(p)

# Генерация HTML
html = '''<!DOCTYPE html>
<html lang="ru">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AR Prefabs Design — BasePrefabQuestions</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@400;700&family=Cinzel:wght@600;700&display=swap');

  :root {
  --gold: #FFD700;
  --gold2: #E9BF15;
  --gold3: #D19C27;
  --gold4: #DAA520;
  --dark: #070707;
  --dark2: #0E0E0E;
  --pink: #FF69B4;
  --red: #FA0617;
  --red2: #E90E1B;
  --emerald: #F5004E;
}

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Roboto Slab', serif;
  background: #111;
  color: #eee;
  min-height: 100vh;
  padding: 20px;
}

  h1 {
    text-align: center;
  font-family: 'Cinzel', serif;
  color: var(--gold);
  margin-bottom: 8px;
  font-size: 1.8rem;
  text-shadow: 0 0 12px rgba(255,215,0,0.4);
}

  .subtitle {
    text-align: center;
  color: #888;
  margin-bottom: 24px;
  font-size: 0.9rem;
}

  .tabs {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 28px;
}

  .tab {
  padding: 10px 24px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  cursor: pointer;
  color: #aaa;
  font-family: inherit;
  font-size: 0.95rem;
  transition: all 0.2s;
}

  .tab.active {
  background: linear-gradient(135deg, #2a1a00, #3d2800);
  border-color: var(--gold4);
  color: var(--gold);
  box-shadow: 0 0 15px rgba(218,165,32,0.25);
}

  .tab:hover:not(.active) {
    border-color: #555;
  color: #ccc;
}

  .screen {
  display: none;
  max-width: 960px;
  margin: 0 auto;
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,215,0,0.15);
}

  .screen.active { display: block; }

  .bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(160deg, #0a0a12 0%, #1a0a0a 40%, #0d0d18 100%);
  z-index: 0;
}

  .bg-img {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  opacity: 0.35;
  z-index: 1;
}

  .content {
  position: relative;
  z-index: 2;
  padding: 24px 28px 32px;
  min-height: 620px;
  display: flex;
  flex-direction: column;
}

  .title-area {
  position: relative;
  text-align: center;
  padding: 14px 20px;
  margin-bottom: 18px;
  border-radius: 8px;
  background: rgba(7,7,7,0.93);
  border: 1px solid rgba(255,215,0,0.2);
  box-shadow: 0 4px 20px rgba(0,0,0,0.5);
}

  .title-area::before,
  .title-area::after {
  content: '';
  position: absolute;
  width: 48px;
  height: 48px;
  background-size: contain;
  background-repeat: no-repeat;
  opacity: 0.7;
}

  .title-area::before { top: -8px; left: -8px; }
  .title-area::after { top: -8px; right: -8px; transform: scaleX(-1); }

  .title-text {
    font-family: 'Cinzel', serif;
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-shadow: 0 0 10px rgba(255,215,0,0.5), 0 2px 4px rgba(0,0,0,0.8);
}

  .panels {
  display: grid;
  grid-template-columns: 180px 1fr 180px;
  gap: 16px;
  flex: 1;
  margin-bottom: 20px;
}

  .panel {
  position: relative;
  background: rgba(7,7,7,0.93);
  border-radius: 10px;
  border: 1px solid rgba(255,215,0,0.12);
  padding: 16px 14px;
  box-shadow: inset 0 0 30px rgba(0,0,0,0.4);
  min-height: 280px;
}

  .panel-corner {
  position: absolute;
  width: 36px;
  height: 36px;
  background-size: contain;
  background-repeat: no-repeat;
  opacity: 0.85;
}

  .panel-corner.tl { top: 4px; left: 4px; }
  .panel-corner.tr { top: 4px; right: 4px; transform: scaleX(-1); }
  .panel-corner.bl { bottom: 4px; left: 4px; transform: scaleY(-1); }
  .panel-corner.br { bottom: 4px; right: 4px; transform: scale(-1); }

  .main-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 12px;
}

  .decor-line {
  width: 70%;
  height: 8px;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  opacity: 0.8;
}

  .main-text {
    font-size: 1.15rem;
  line-height: 1.55;
  max-width: 90%;
  text-shadow: 0 1px 3px rgba(0,0,0,0.9);
}

  .side-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  font-size: 0.85rem;
}

  .side-panel .help {
    font-size: 0.8rem;
  opacity: 0.9;
}

  .side-empty {
  width: 64px;
  height: 64px;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  opacity: 0.5;
  margin: 20px 0;
}

  .buttons-area {
  position: relative;
  background: rgba(7,7,7,0.93);
  border-radius: 10px;
  border: 1px solid rgba(255,215,0,0.15);
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 -4px 20px rgba(0,0,0,0.3);
}

  .buttons-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

  .nav-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid var(--gold4);
  background: rgba(20,15,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 0 12px rgba(218,165,32,0.3);
}

  .nav-btn:hover {
  background: rgba(40,30,0,0.9);
  box-shadow: 0 0 18px rgba(218,165,32,0.5);
  transform: scale(1.05);
}

  .nav-btn img, .nav-btn .icon {
  width: 24px;
  height: 24px;
  filter: drop-shadow(0 0 4px rgba(218,165,32,0.6));
}

  .input-wrap {
  position: relative;
  flex: 1;
  max-width: 320px;
}

  .input-field {
  width: 100%;
  padding: 12px 18px;
  background: rgba(20,15,5,0.9);
  border: 2px solid #6A550E;
  border-radius: 8px;
  color: #fff;
  font-family: 'Cinzel', serif;
  font-size: 1rem;
  text-align: center;
  outline: none;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4), inset 0 0 8px rgba(0,0,0,0.3);
}

  .input-field::placeholder {
  color: #D19C27;
  opacity: 0.85;
  letter-spacing: 0.06em;
}

  .input-field:focus {
    border-color: var(--gold2);
  box-shadow: 0 0 16px rgba(233,191,21,0.35);
}

  .next-btn {
  padding: 12px 36px;
  background: linear-gradient(180deg, #c40a12 0%, #8a060c 100%);
  border: 2px solid #5B1919;
  border-radius: 8px;
  color: var(--gold2);
  font-family: 'Cinzel', serif;
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  cursor: pointer;
  text-shadow: 0 1px 3px rgba(0,0,0,0.8);
  box-shadow: 0 4px 16px rgba(250,6,23,0.35), inset 0 1px 0 rgba(255,255,255,0.15);
  transition: all 0.2s;
}

  .next-btn:hover {
  background: linear-gradient(180deg, #e00c16 0%, #a00810 100%);
  box-shadow: 0 6px 22px rgba(250,6,23,0.5);
  transform: translateY(-1px);
}

  .four-btns {
  display: flex;
  justify-content: center;
  gap: 18px;
  flex-wrap: wrap;
}

  .four-btn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #4a4dff, #1a1a80);
  border: 2px solid rgba(51,14,14,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(47,50,255,0.4), 0 0 0 3px rgba(0,0,0,0.3);
  transition: all 0.2s;
  position: relative;
}

  .four-btn:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 20px rgba(47,50,255,0.55);
}

  .four-btn span {
    font-family: 'Cinzel', serif;
  color: var(--gold2);
  font-size: 1.1rem;
  font-weight: 700;
  text-shadow: 0 1px 3px rgba(0,0,0,0.9);
}

  .legend {
    max-width: 960px;
  margin: 36px auto 20px;
  background: #161616;
  border-radius: 10px;
  border: 1px solid #2a2a2a;
  padding: 20px 24px;
}

  .legend h2 {
    font-family: 'Cinzel', serif;
  color: var(--gold4);
  font-size: 1.1rem;
  margin-bottom: 14px;
}

  .res-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}

  .res-item {
  background: #1e1e1e;
  border-radius: 6px;
  padding: 10px;
  text-align: center;
  border: 1px solid #2e2e2e;
  font-size: 0.75rem;
}

  .res-item .name {
  color: #ccc;
  word-break: break-all;
  margin-top: 6px;
}

  .res-preview {
  width: 48px;
  height: 48px;
  margin: 0 auto;
  background: #2a2a2a;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  color: #666;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

  .props-table {
    max-width: 960px;
  margin: 20px auto 40px;
  overflow-x: auto;
}

  .props-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

  .props-table th, .props-table td {
  padding: 8px 12px;
  border: 1px solid #2a2a2a;
  text-align: left;
}

  .props-table th {
  background: #1a1a1a;
  color: var(--gold4);
  font-weight: 600;
}

  .props-table tr:nth-child(even) { background: #141414; }
  .props-table td { color: #bbb; }
  .props-table .val { color: #e0d0a0; font-family: monospace; }

  .img-ph {
  background: repeating-linear-gradient(
  45deg,
  #222,
  #222 4px,
  #2a2a2a 4px,
  #2a2a2a 8px
  );
}

  @media (max-width: 720px) {
  .panels { grid-template-columns: 1fr; }
  .side-panel { min-height: 120px; }
  .content { padding: 16px; }
}
</style>
</head>
<body>
<h1>AR Prefabs Design</h1>
<p class="subtitle">BasePrefabQuestions · ресурсы из <code>./assets/resources/</code></p>

<div class="tabs">
  <button class="tab active" data-tab="0">BasePrefabQuestions</button>
  <button class="tab" data-tab="1">BasePrefabQuestionsBase</button>
</div>
'''

# Экраны для каждого префаба
for idx, p in enumerate(prefabs):
active = " active" if idx == 0 else ""
title_sample = "Вопрос" if idx == 0 else "Базовый вопрос"
main_sample = (
"Текст основного вопроса отображается здесь. Можно использовать несколько строк."
if idx == 0
else "Основной текст с белым цветом (Base вариант)."
)
main_color = p["main_color"] if p["main_color"] else "#FFFFFF"
title_color = p["title_color"]

html += f'''
<div class="screen{active}" id="screen-{idx}">
  <div class="bg"></div>
  <div class="bg-img" style="background-image: url('./assets/resources/{p["back_image"]}.png');"></div>

  <div class="content">
    <div class="title-area" style="background-color: {p["title_bg_color"]}; background-image: url('./assets/resources/{p["title_bg_image"]}.png'); background-size: cover;">
      <div class="title-text" style="color: {title_color}; font-family: 'Cinzel', serif;">{title_sample}</div>
    </div>

    <div class="panels">
      <div class="panel side-panel" style="background-color: {p["left_bg_color"]}; background-image: url('./assets/resources/{p["left_bg_image"]}.png'); background-size: cover;">
        <div class="panel-corner tl" style="background-image: url('./assets/resources/{p["left_corner"]}.png');"></div>
        <div class="panel-corner tr" style="background-image: url('./assets/resources/{p["left_corner"]}.png');"></div>
        <div class="panel-corner bl" style="background-image: url('./assets/resources/{p["left_corner"]}.png');"></div>
        <div class="panel-corner br" style="background-image: url('./assets/resources/{p["left_corner"]}.png');"></div>
        <div class="side-empty" style="background-image: url('./assets/resources/{p["left_empty_image"]}.png');"></div>
        <div class="help" style="color: {p["left_help_color"]}; font-family: 'Roboto Slab', serif;">Подсказка</div>
        <div class="help" style="color: {p["left_help_color"]};">↓</div>
      </div>

      <div class="panel main-panel" style="background-color: {p["main_bg_color"]}; background-image: url('./assets/resources/{p["main_bg_image"]}.png'); background-size: cover;">
        <div class="panel-corner tl" style="background-image: url('./assets/resources/{p["main_corner"]}.png');"></div>
        <div class="panel-corner tr" style="background-image: url('./assets/resources/{p["main_corner"]}.png');"></div>
        <div class="panel-corner bl" style="background-image: url('./assets/resources/{p["main_corner"]}.png');"></div>
        <div class="panel-corner br" style="background-image: url('./assets/resources/{p["main_corner"]}.png');"></div>
        <div class="decor-line" style="background-image: url('./assets/resources/{p["main_decor_line"]}.png');"></div>
        <div class="main-text" style="color: {main_color};">{main_sample}</div>
        <div class="decor-line" style="background-image: url('./assets/resources/{p["main_decor_line"]}.png');"></div>
      </div>

      <div class="panel side-panel" style="background-color: {p["right_bg_color"]}; background-image: url('./assets/resources/{p["right_bg_image"]}.png'); background-size: cover;">
        <div class="panel-corner tl" style="background-image: url('./assets/resources/{p["right_corner"]}.png');"></div>
        <div class="panel-corner tr" style="background-image: url('./assets/resources/{p["right_corner"]}.png');"></div>
        <div class="panel-corner bl" style="background-image: url('./assets/resources/{p["right_corner"]}.png');"></div>
        <div class="panel-corner br" style="background-image: url('./assets/resources/{p["right_corner"]}.png');"></div>
        <div class="side-empty" style="background-image: url('./assets/resources/mandala.png'); opacity:0.4;"></div>
        <div style="color:#888; font-size:0.75rem;">Правая панель</div>
      </div>
    </div>

    <div class="buttons-area" style="background-color: {p["buttons_bg_color"]}; background-image: url('./assets/resources/{p["buttons_bg_image"]}.png'); background-size: cover;">
      <div class="buttons-row">
        <div class="nav-btn" title="Left">
          <div class="icon" style="width:24px;height:24px;background:url('./assets/resources/{p["btn_left_img"]}.png') center/contain no-repeat; filter: drop-shadow(0 0 4px {p["btn_left_color"]});"></div>
        </div>

        <div class="input-wrap">
          <input class="input-field" type="text" placeholder="{p["input_ph_text"]}"
                 style="border-color: {p["input_color"]}; color: {p["input_text_color"]};">
        </div>

        <button class="next-btn">{p["btn_next_text"]}</button>

        <div class="nav-btn" title="Right">
          <div class="icon" style="width:24px;height:24px;background:url('./assets/resources/{p["btn_right_img"]}.png') center/contain no-repeat; filter: drop-shadow(0 0 4px {p["btn_right_color"]});"></div>
        </div>
      </div>

      <div class="four-btns">
        <div class="four-btn"><span>1</span></div>
        <div class="four-btn"><span>2</span></div>
        <div class="four-btn"><span>3</span></div>
        <div class="four-btn"><span>4</span></div>
      </div>
    </div>
  </div>
</div>
'''

# Легенда ресурсов
images = sorted([
"Back3", "ButtonPanelBG", "Circle64px1Shadow", "Decor1", "Emerald",
"InputOutline", "Line2S", "MainTextPanelDark", "RoundedSquareFull512px",
"RoundedSquareStroke128px", "RusStyleElement", "angle-left", "angle-right",
"mandala", "sq-shadow128", "BigSparks"
])

html += '''
<div class="legend">
  <h2>Ресурсы (./assets/resources/)</h2>
  <div class="res-grid">
    '''

    for img in images:
    html += f'''      <div class="res-item">
    <div class="res-preview img-ph" style="background-image: url('./assets/resources/{img}.png');"></div>
    <div class="name">{img}</div>
  </div>
    '''

    html += '''    </div>
</div>

<div class="props-table">
  <h2 style="font-family:'Cinzel',serif; color:#DAA520; margin-bottom:12px; font-size:1.1rem;">Ключевые свойства</h2>
  <table>
    <thead>
    <tr>
      <th>Свойство</th>
      <th>BasePrefabQuestions</th>
      <th>BasePrefabQuestionsBase</th>
    </tr>
    </thead>
    <tbody>
    '''

    keys = [
    ("TitleText_Font / Color", "title_font", "title_color"),
    ("MainText_MainTxt_Font / Color", "main_font", "main_color"),
    ("BackGradient_Image", "back_image", None),
    ("MainText_bg_Image", "main_bg_image", None),
    ("TitleText_bg_Image", "title_bg_image", None),
    ("Buttons_Button_NEXT_Text", "btn_next_text", "btn_next_color"),
    ("Buttons_InputField_Placeholder", "input_ph_text", "input_ph_color"),
    ("LeftPanel_HelpUp_Color", "left_help_color", None),
    ("additionalCanvas_Prefab", "additional_prefab", None),
    ]

    for label, k1, k2 in keys:
    if k2:
    v0 = f"{prefabs[0].get(k1,'')} / {prefabs[0].get(k2,'')}"
    v1 = f"{prefabs[1].get(k1,'')} / {prefabs[1].get(k2,'')}"
    else:
    v0 = prefabs[0].get(k1, "")
    v1 = prefabs[1].get(k1, "")
    html += f'''        <tr>
      <td>{label}</td>
      <td class="val">{v0}</td>
      <td class="val">{v1}</td>
    </tr>
    '''

    html += '''      </tbody>
  </table>
</div>

<script>
  document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('screen-' + tab.dataset.tab).classList.add('active');
  });
});
</script>
</body>
</html>
'''

out = Path("/home/workdir/artifacts/ardesign.html")
out.write_text(html, encoding="utf-8")
print(f"Written: {out} ({out.stat().st_size} bytes)")
print("Prefabs:", [p["id"] for p in prefabs])
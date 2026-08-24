// arparser.js - AR Data Parser
export class ARDataParser {
  constructor() {}

  normalizeTargetData(targetData) {
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

  // Парсинг дизайн-префаба из JSON
  designGroupsToPrefab(groups) {
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

  normalizeDesignAsset(name) {
    if (!name) return '';
    const n = String(name).trim();
    if (!n) return '';
    if (/^(https?:|\/\/|\.\/|\/)/i.test(n)) return n;
    return './assets/resources/' + n + (/\.[a-z0-9]+$/i.test(n) ? '' : '.png');
  }
}
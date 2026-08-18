import * as THREE from 'three';

/**
 * Вспомогательная функция разбиения текста на строки по ширине Canvas
 */
function wrapCanvasText(ctx, text = '', x, y, maxWidth, lineHeight) {
  // Предварительная очистка от BBCode/TMPro тегов (например, <size=+5>, <b>, <color=red>)
  const cleanText = text.replace(/<[^>]*>/g, '');
  const lines = cleanText.split('\n');
  let currentY = y;

  for (let i = 0; i < lines.length; i++) {
    const words = lines[i].split(' ');
    let line = '';

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line.trim(), x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, currentY);
    currentY += lineHeight;
  }
  return currentY;
}

/**
 * Вспомогательная функция отрисовки скругленного прямоугольника
 */
function drawRoundRect(ctx, x, y, width, height, radius, fillStyle, strokeStyle, strokeWidth = 0) {
  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.rect(x, y, width, height);
  }
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle && strokeWidth > 0) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * 1. СОЗДАНИЕ ЛЕВОЙ ПАНЕЛИ ПОДСКАЗОК (HELPS)
 */
function createLeftHelpCanvas(info) {
  const helpUp = info.HelpUpText_Text || '';
  const helpDown = info.HelpDownText_Text || '';
  if (!helpUp && !helpDown) return null;

  const canvas = document.createElement('canvas');
  const W = 380;
  const H = 768;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Фон
    drawRoundRect(ctx, 10, 10, W - 20, H - 20, 20, 'rgba(15, 20, 32, 0.92)', '#DAA520', 3);

    // Заголовок
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('ПОДСКАЗКИ', W / 2, 30);

    ctx.strokeStyle = 'rgba(218, 165, 32, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, 65);
    ctx.lineTo(W - 30, 65);
    ctx.stroke();

    let curY = 85;

    // Верхний блок подсказки
    if (helpUp) {
      drawRoundRect(ctx, 25, curY, W - 50, 280, 14, 'rgba(30, 38, 58, 0.85)', '#3d4b75', 2);
      ctx.fillStyle = '#E0E6ED';
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'left';
      wrapCanvasText(ctx, helpUp, 40, curY + 20, W - 80, 24);
      curY += 300;
    }

    // Нижний блок подсказки
    if (helpDown) {
      drawRoundRect(ctx, 25, curY, W - 50, H - curY - 30, 14, 'rgba(30, 38, 58, 0.85)', '#3d4b75', 2);
      ctx.fillStyle = '#E0E6ED';
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'left';
      wrapCanvasText(ctx, helpDown, 40, curY + 20, W - 80, 24);
    }

    texture.needsUpdate = true;
  }

  draw();
  return texture;
}

/**
 * 2. СОЗДАНИЕ ПРАВОЙ ПАНЕЛИ КАРТИНКИ (PICTURE)
 */
function createRightImageCanvas(info) {
  const imageName = info.AnswerPicture_Image || info.AdditionalImg_Image || info.RecognitionImage || '';
  if (!imageName) return null;

  const canvas = document.createElement('canvas');
  const W = 380;
  const H = 768;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Фон
    drawRoundRect(ctx, 10, 10, W - 20, H - 20, 20, 'rgba(15, 20, 32, 0.92)', '#DAA520', 3);

    // Заголовок
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('ИЛЛЮСТРАЦИЯ', W / 2, 30);

    // Имитация изображения / Плашка под Иконку
    const imgBoxX = 35;
    const imgBoxY = 80;
    const imgBoxW = W - 70;
    const imgBoxH = W - 70;

    drawRoundRect(ctx, imgBoxX, imgBoxY, imgBoxW, imgBoxH, 16, '#161b26', '#00e5ff', 2);

    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`[ ${imageName} ]`, W / 2, imgBoxY + imgBoxH / 2);

    // Дополнительное описание картинки при наличии
    if (info.TitleText_Text) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      wrapCanvasText(ctx, info.TitleText_Text, W / 2, imgBoxY + imgBoxH + 30, W - 60, 22);
    }

    texture.needsUpdate = true;
  }

  draw();
  return texture;
}

/**
 * 3. СОЗДАНИЕ ЦЕНТРАЛЬНОЙ ПАНЕЛИ ВОПРОСА И ОТВЕТОВ
 */
function createQuestionPanelCanvas(info) {
  const canvas = document.createElement('canvas');
  const W = 512;
  const H = 768;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const hitRegions = [];
  const userData = {
    info,
    slideIndex: 0,
    inputValue: '',
    hitRegions,
    redraw: null
  };

  function draw() {
    hitRegions.length = 0;
    ctx.clearRect(0, 0, W, H);

    // Фон главной панели
    drawRoundRect(ctx, 10, 10, W - 20, H - 20, 24, 'rgba(20, 24, 35, 0.94)', '#00e5ff', 4);

    // Заголовок Тег
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const tagText = (info.id || info.QuestID || 'QUEST').toUpperCase();
    ctx.fillText(tagText, W / 2, 30);

    // Заголовок задания
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    const titleText = info.TitleText_Text || 'Задание';
    let startY = wrapCanvasText(ctx, titleText, W / 2, 65, W - 60, 30);

    // Разделитель
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, startY + 8);
    ctx.lineTo(W - 30, startY + 8);
    ctx.stroke();

    startY += 22;

    // Текст вопроса / Основной текст
    const questionText = info.MainTxt_Text || info.Question || '';
    if (questionText) {
      ctx.fillStyle = '#e0e6ed';
      const fontSize = questionText.length > 150 ? 17 : (questionText.length > 80 ? 19 : 21);
      ctx.font = `${fontSize}px sans-serif`;
      startY = wrapCanvasText(ctx, questionText, W / 2, startY, W - 60, fontSize + 7);
    }

    startY += 15;

    // Тип ответа
    const answerType = info.AnswerType || (info.options ? 'MultipleChoice' : 'Art');
    const bottomReservedHeight = 100;
    const maxAnswersY = H - bottomReservedHeight;

    // Варианты 1: Кнопки выбора (MultipleChoice / Button)
    if ((answerType === 'MultipleChoice' || answerType === 'Button') && Array.isArray(info.options) && info.options.length > 0) {
      const options = info.options;
      const availableSpace = maxAnswersY - startY;
      const btnHeight = Math.min(50, Math.max(36, Math.floor((availableSpace - (options.length * 10)) / options.length)));
      const fontSize = btnHeight < 44 ? 15 : 18;

      options.forEach((optText, idx) => {
        const btnX = 40;
        const btnY = startY + idx * (btnHeight + 10);
        const btnW = W - 80;

        if (btnY + btnHeight <= maxAnswersY + 20) {
          drawRoundRect(ctx, btnX, btnY, btnW, btnHeight, 12, '#2a324d', '#3d4b75', 2);

          ctx.fillStyle = '#ffffff';
          ctx.font = `${fontSize}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(optText.replace(/<[^>]*>/g, ''), W / 2, btnY + btnHeight / 2, btnW - 20);

          hitRegions.push({
            type: 'button',
            index: idx + 1,
            x: btnX,
            y: btnY,
            w: btnW,
            h: btnHeight
          });
        }
      });
    } 
    // Варианты 2: Слайдер (Slide)
    else if (answerType === 'Slide' && Array.isArray(info.options) && info.options.length > 0) {
      const options = info.options;
      const currentIdx = userData.slideIndex % options.length;
      const optText = options[currentIdx] ? options[currentIdx].replace(/<[^>]*>/g, '') : '';

      const slideY = Math.min(startY + 10, maxAnswersY - 60);

      // Кнопка Влево
      drawRoundRect(ctx, 40, slideY, 50, 50, 10, '#2a324d', '#00e5ff', 1);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('<', 65, slideY + 25);
      hitRegions.push({ type: 'prev', x: 40, y: slideY, w: 50, h: 50 });

      // Окно значения
      drawRoundRect(ctx, 100, slideY, W - 200, 50, 10, '#161b26', '#3d4b75', 1);
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(optText, W / 2, slideY + 25, W - 220);

      // Кнопка Вправо
      drawRoundRect(ctx, W - 90, slideY, 50, 50, 10, '#2a324d', '#00e5ff', 1);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('>', W - 65, slideY + 25);
      hitRegions.push({ type: 'next', x: W - 90, y: slideY, w: 50, h: 50 });

      drawOkButton(H - 85);
    } 
    // Варианты 3: Текстовое поле ввода (InputField)
    else if (answerType === 'InputField') {
      const inputY = Math.min(startY + 10, maxAnswersY - 60);
      const valText = userData.inputValue || 'Нажмите, чтобы ввести...';

      drawRoundRect(ctx, 40, inputY, W - 80, 50, 10, '#161b26', '#00e5ff', 2);

      ctx.fillStyle = userData.inputValue ? '#ffffff' : '#888888';
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(valText, W / 2, inputY + 25, W - 100);

      hitRegions.push({ type: 'input', x: 40, y: inputY, w: W - 80, h: 50 });

      drawOkButton(H - 85);
    } 
    // Стандартный вариант / Art / Инфо
    else {
      drawOkButton(H - 85);
    }

    function drawOkButton(btnY) {
      const btnW = 180;
      const btnH = 50;
      const btnX = (W - btnW) / 2;

      drawRoundRect(ctx, btnX, btnY, btnW, btnH, 25, '#00e5ff', '#ffffff', 2);

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(info.okText || 'ОК', W / 2, btnY + btnH / 2);

      hitRegions.push({ type: 'ok', x: btnX, y: btnY, w: btnW, h: btnH });
    }

    texture.needsUpdate = true;
  }

  userData.redraw = draw;
  draw();

  return { texture, hitRegions, redraw: draw, userData };
}

/**
 * ГЛАВНАЯ ФУНКЦИЯ: Построение полного 3D комплекса ArTarget с боковыми панелями
 * @param {Object} rawData - Объединенные данные элемента квеста
 * @returns {THREE.Group}
 */
export function createArTargetSync(rawData = {}) {
  const group = new THREE.Group();
  group.name = 'ArTargetGroup';

  // Размеры панелей
  const centerW = 0.8;
  const centerH = 1.2;
  const sideW = 0.55;
  const sideH = 1.12;
  const gap = 0.05;

  // 1. Центральная панель
  const centerPanelData = createQuestionPanelCanvas(rawData);
  const centerGeo = new THREE.PlaneGeometry(centerW, centerH);
  const centerMat = new THREE.MeshBasicMaterial({
    map: centerPanelData.texture,
    transparent: true,
    side: THREE.DoubleSide
  });

  const centerMesh = new THREE.Mesh(centerGeo, centerMat);
  centerMesh.name = 'QuestionPanelMesh';
  centerMesh.position.set(0, centerH / 2, 0);
  centerMesh.userData = centerPanelData.userData;
  group.add(centerMesh);

  const panelsDict = { questionPanel: centerMesh };

  // 2. Левая панель (Helps)
  const leftTexture = createLeftHelpCanvas(rawData);
  if (leftTexture) {
    const leftGeo = new THREE.PlaneGeometry(sideW, sideH);
    const leftMat = new THREE.MeshBasicMaterial({
      map: leftTexture,
      transparent: true,
      side: THREE.DoubleSide
    });
    const leftMesh = new THREE.Mesh(leftGeo, leftMat);
    leftMesh.name = 'LeftHelpPanelMesh';
    // Позиционируем слева под углом
    leftMesh.position.set(-(centerW / 2 + sideW / 2 + gap), sideH / 2 + 0.04, 0.05);
    leftMesh.rotation.y = 0.25; // Разворот к пользователю
    group.add(leftMesh);
    panelsDict.leftPanel = leftMesh;
  }

  // 3. Правая панель (Image)
  const rightTexture = createRightImageCanvas(rawData);
  if (rightTexture) {
    const rightGeo = new THREE.PlaneGeometry(sideW, sideH);
    const rightMat = new THREE.MeshBasicMaterial({
      map: rightTexture,
      transparent: true,
      side: THREE.DoubleSide
    });
    const rightMesh = new THREE.Mesh(rightGeo, rightMat);
    rightMesh.name = 'RightImagePanelMesh';
    // Позиционируем справа под углом
    rightMesh.position.set(centerW / 2 + sideW / 2 + gap, sideH / 2 + 0.04, 0.05);
    rightMesh.rotation.y = -0.25; // Разворот к пользователю
    group.add(rightMesh);
    panelsDict.rightPanel = rightMesh;
  }

  group.userData = {
    questionPanel: centerMesh,
    panels: panelsDict
  };

  return group;
}
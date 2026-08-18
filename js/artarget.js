import * as THREE from 'three';

/**
 * Вспомогательная функция безопасного получения полей (case-insensitive search)
 */
function getField(obj, ...keys) {
  if (!obj) return '';
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') {
      return obj[k];
    }
  }
  return '';
}

/**
 * Отрисовка текста с переносом строк на Canvas
 */
function wrapCanvasText(ctx, text = '', x, y, maxWidth, lineHeight) {
  const cleanText = String(text).replace(/<[^>]*>/g, '');
  const lines = cleanText.split('\n');
  let currentY = y;

  for (let i = 0; i < lines.length; i++) {
    const words = lines[i].split(' ');
    let line = '';

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      if (ctx.measureText(testLine).width > maxWidth && n > 0) {
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
 * Отрисовка скругленного прямоугольника
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
 * 1. ЛЕВАЯ ПАНЕЛЬ (HELPS)
 */
function createLeftHelpCanvas(rawData) {
  const helpUp = getField(rawData, 'HelpUpText_Text', 'helpUp', 'helpText');
  const helpDown = getField(rawData, 'HelpDownText_Text', 'helpDown', 'hint');

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

    // Фон панели
    drawRoundRect(ctx, 10, 10, W - 20, H - 20, 20, 'rgba(15, 20, 32, 0.95)', '#DAA520', 3);

    // Заголовок
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('ПОДСКАЗКА', W / 2, 30);

    ctx.strokeStyle = 'rgba(218, 165, 32, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, 65);
    ctx.lineTo(W - 30, 65);
    ctx.stroke();

    let curY = 85;

    // Верхний блок
    drawRoundRect(ctx, 25, curY, W - 50, 280, 14, 'rgba(30, 38, 58, 0.85)', '#3d4b75', 2);
    ctx.fillStyle = '#E0E6ED';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'left';
    const txt1 = helpUp || 'Обратите внимание на детали объекта в зоне видимости.';
    wrapCanvasText(ctx, txt1, 40, curY + 20, W - 80, 24);

    curY += 300;

    // Нижний блок
    drawRoundRect(ctx, 25, curY, W - 50, H - curY - 30, 14, 'rgba(30, 38, 58, 0.85)', '#3d4b75', 2);
    ctx.fillStyle = '#E0E6ED';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'left';
    const txt2 = helpDown || 'Используйте кнопки на центральной панели для выбора ответа.';
    wrapCanvasText(ctx, txt2, 40, curY + 20, W - 80, 24);

    texture.needsUpdate = true;
  }

  draw();
  return texture;
}

/**
 * 2. ПРАВАЯ ПАНЕЛЬ (PICTURE)
 */
function createRightImageCanvas(rawData) {
  const imageName = getField(rawData, 'AnswerPicture_Image', 'AdditionalImg_Image', 'RecognitionImage', 'image');

  const canvas = document.createElement('canvas');
  const W = 380;
  const H = 768;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  function draw(imgObj = null) {
    ctx.clearRect(0, 0, W, H);

    // Фон
    drawRoundRect(ctx, 10, 10, W - 20, H - 20, 20, 'rgba(15, 20, 32, 0.95)', '#DAA520', 3);

    // Заголовок
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('ИЛЛЮСТРАЦИЯ', W / 2, 30);

    const imgBoxX = 35;
    const imgBoxY = 80;
    const imgBoxW = W - 70;
    const imgBoxH = W - 70;

    drawRoundRect(ctx, imgBoxX, imgBoxY, imgBoxW, imgBoxH, 16, '#161b26', '#00e5ff', 2);

    if (imgObj) {
      // Масштабирование внешнего изображения
      ctx.save();
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH, 16);
      else ctx.rect(imgBoxX, imgBoxY, imgBoxW, imgBoxH);
      ctx.clip();
      ctx.drawImage(imgObj, imgBoxX, imgBoxY, imgBoxW, imgBoxH);
      ctx.restore();
    } else {
      // Текстовая плашка-заглушка
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = imageName ? `[ ${imageName} ]` : '[ МЕДИА МАТЕРИАЛ ]';
      ctx.fillText(label, W / 2, imgBoxY + imgBoxH / 2, imgBoxW - 20);
    }

    // Подпись
    const titleText = getField(rawData, 'TitleText_Text', 'title', 'name') || 'Информация к заданию';
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    wrapCanvasText(ctx, titleText, W / 2, imgBoxY + imgBoxH + 30, W - 60, 22);

    texture.needsUpdate = true;
  }

  draw();

  // Если imageName представляет собой прямой URL к картинке, загружаем ее
  if (imageName && (imageName.startsWith('http') || imageName.startsWith('data:'))) {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => draw(img);
    img.src = imageName;
  }

  return texture;
}

/**
 * 3. ЦЕНТРАЛЬНАЯ ПАНЕЛЬ (QUESTION & ANSWERS)
 */
function createQuestionPanelCanvas(rawData) {
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
    info: rawData,
    slideIndex: 0,
    inputValue: '',
    hitRegions,
    redraw: null
  };

  function draw() {
    hitRegions.length = 0;
    ctx.clearRect(0, 0, W, H);

    // Фон центральной панели
    drawRoundRect(ctx, 10, 10, W - 20, H - 20, 24, 'rgba(20, 24, 35, 0.96)', '#00e5ff', 4);

    // Тег ID
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const tagText = String(getField(rawData, 'id', 'QuestID', 'code') || 'QUEST-01').toUpperCase();
    ctx.fillText(tagText, W / 2, 30);

    // Заголовок
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    const titleText = getField(rawData, 'TitleText_Text', 'title') || 'Задание';
    let startY = wrapCanvasText(ctx, titleText, W / 2, 65, W - 60, 30);

    // Разделительная линия
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, startY + 8);
    ctx.lineTo(W - 30, startY + 8);
    ctx.stroke();

    startY += 22;

    // Текст Вопроса
    const questionText = getField(rawData, 'MainTxt_Text', 'Question', 'text', 'description') || 'Внимательно изучите объект и выберите правильный вариант ответа из списка ниже:';
    ctx.fillStyle = '#e0e6ed';
    const fontSize = questionText.length > 150 ? 17 : 20;
    ctx.font = `${fontSize}px sans-serif`;
    startY = wrapCanvasText(ctx, questionText, W / 2, startY, W - 60, fontSize + 7);

    startY += 20;

    // Определение вариантов ответа
    let options = rawData.options || rawData.Answers || rawData.answers;
    if (!Array.isArray(options) || options.length === 0) {
      options = ['Вариант 1', 'Вариант 2', 'Вариант 3'];
    }

    const answerType = getField(rawData, 'AnswerType', 'type') || 'MultipleChoice';
    const maxAnswersY = H - 90;

    // Вариант 1: Варианты выбора (MultipleChoice / Button)
    if (answerType === 'MultipleChoice' || answerType === 'Button' || answerType === '') {
      const availableSpace = maxAnswersY - startY;
      const btnHeight = Math.min(52, Math.max(38, Math.floor((availableSpace - (options.length * 10)) / options.length)));

      options.forEach((optText, idx) => {
        const btnX = 40;
        const btnY = startY + idx * (btnHeight + 10);
        const btnW = W - 80;

        if (btnY + btnHeight <= maxAnswersY + 25) {
          drawRoundRect(ctx, btnX, btnY, btnW, btnHeight, 12, '#2a324d', '#3d4b75', 2);

          ctx.fillStyle = '#ffffff';
          ctx.font = '17px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(optText).replace(/<[^>]*>/g, ''), W / 2, btnY + btnHeight / 2, btnW - 20);

          hitRegions.push({ type: 'button', index: idx + 1, x: btnX, y: btnY, w: btnW, h: btnHeight });
        }
      });
    }
    // Вариант 2: Слайдер (Slide)
    else if (answerType === 'Slide') {
      const currentIdx = userData.slideIndex % options.length;
      const optText = String(options[currentIdx]).replace(/<[^>]*>/g, '');
      const slideY = Math.min(startY + 10, maxAnswersY - 60);

      drawRoundRect(ctx, 40, slideY, 50, 50, 10, '#2a324d', '#00e5ff', 1);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('<', 65, slideY + 25);
      hitRegions.push({ type: 'prev', x: 40, y: slideY, w: 50, h: 50 });

      drawRoundRect(ctx, 100, slideY, W - 200, 50, 10, '#161b26', '#3d4b75', 1);
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(optText, W / 2, slideY + 25, W - 220);

      drawRoundRect(ctx, W - 90, slideY, 50, 50, 10, '#2a324d', '#00e5ff', 1);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('>', W - 65, slideY + 25);
      hitRegions.push({ type: 'next', x: W - 90, y: slideY, w: 50, h: 50 });

      drawOkButton(H - 80);
    }
    // Вариант 3: Поле ввода (InputField)
    else if (answerType === 'InputField') {
      const inputY = Math.min(startY + 10, maxAnswersY - 60);
      const valText = userData.inputValue || 'Нажмите для ввода...';

      drawRoundRect(ctx, 40, inputY, W - 80, 50, 10, '#161b26', '#00e5ff', 2);
      ctx.fillStyle = userData.inputValue ? '#ffffff' : '#888888';
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(valText, W / 2, inputY + 25, W - 100);

      hitRegions.push({ type: 'input', x: 40, y: inputY, w: W - 80, h: 50 });

      drawOkButton(H - 80);
    } 
    else {
      drawOkButton(H - 80);
    }

    function drawOkButton(btnY) {
      const btnW = 180;
      const btnH = 48;
      const btnX = (W - btnW) / 2;

      drawRoundRect(ctx, btnX, btnY, btnW, btnH, 24, '#00e5ff', '#ffffff', 2);

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(rawData.okText || 'ОТВЕТИТЬ', W / 2, btnY + btnH / 2);

      hitRegions.push({ type: 'ok', x: btnX, y: btnY, w: btnW, h: btnH });
    }

    texture.needsUpdate = true;
  }

  userData.redraw = draw;
  draw();

  return { texture, hitRegions, userData };
}

/**
 * СОЗДАНИЕ 3D-КОМПЛЕКСА (Главный экспорт)
 * @param {Object} rawData - Данные квеста/задания
 * @returns {THREE.Group}
 */
export function createArTargetSync(rawData = {}) {
  const group = new THREE.Group();
  group.name = 'ArTargetGroup';

  // Размеры элементов
  const centerW = 0.8;
  const centerH = 1.2;
  const sideW = 0.55;
  const sideH = 1.12;
  const gap = 0.04;

  // 1. Центральная панель
  const centerData = createQuestionPanelCanvas(rawData);
  const centerGeo = new THREE.PlaneGeometry(centerW, centerH);
  const centerMat = new THREE.MeshBasicMaterial({
    map: centerData.texture,
    transparent: true,
    side: THREE.DoubleSide
  });

  const centerMesh = new THREE.Mesh(centerGeo, centerMat);
  centerMesh.name = 'QuestionPanelMesh';
  // Смещаем центр панели вверх, чтобы нижний край стоек стоял на плоскости
  centerMesh.position.set(0, centerH / 2, 0);
  centerMesh.userData = centerData.userData;
  group.add(centerMesh);

  // 2. Левая панель (Helps)
  const leftTexture = createLeftHelpCanvas(rawData);
  const leftGeo = new THREE.PlaneGeometry(sideW, sideH);
  const leftMat = new THREE.MeshBasicMaterial({
    map: leftTexture,
    transparent: true,
    side: THREE.DoubleSide
  });
  const leftMesh = new THREE.Mesh(leftGeo, leftMat);
  leftMesh.name = 'LeftHelpPanelMesh';
  leftMesh.position.set(-(centerW / 2 + sideW / 2 + gap), sideH / 2, 0.04);
  leftMesh.rotation.y = 0.28; // Разворот к пользователю (вогнутый стенд)
  group.add(leftMesh);

  // 3. Правая панель (Picture)
  const rightTexture = createRightImageCanvas(rawData);
  const rightGeo = new THREE.PlaneGeometry(sideW, sideH);
  const rightMat = new THREE.MeshBasicMaterial({
    map: rightTexture,
    transparent: true,
    side: THREE.DoubleSide
  });
  const rightMesh = new THREE.Mesh(rightGeo, rightMat);
  rightMesh.name = 'RightImagePanelMesh';
  rightMesh.position.set(centerW / 2 + sideW / 2 + gap, sideH / 2, 0.04);
  rightMesh.rotation.y = -0.28; // Разворот к пользователю
  group.add(rightMesh);

  // ----------------------------------------------------
  // КОРРЕКЦИЯ ОРИЕНТАЦИИ И ПОЗИЦИОНИРОВАНИЯ
  // ----------------------------------------------------
  // Устанавливаем вертикальное положение лицевой стороной к Z+
  group.rotation.set(0, 0, 0);

  // Сохраняем ссылки для интерактива
  group.userData = {
    questionPanel: centerMesh,
    leftPanel: leftMesh,
    rightPanel: rightMesh
  };

  return group;
}
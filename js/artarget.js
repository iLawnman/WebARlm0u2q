import * as THREE from 'three';

/**
 * Создаёт текстуру холста для центральной панели с учётом динамического размера текста и гарантии видимости нижних кнопок.
 * @param {Object} info 
 * @returns {{ texture: THREE.CanvasTexture, hitRegions: Array, redraw: Function, userData: Object }}
 */
function createQuestionPanelCanvas(info) {
  const canvas = document.createElement('canvas');
  const W = 512;
  const H = 768; // Увеличенная высота для комфортного размещения всех элементов
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const hitRegions = [];
  const questData = info.questData || {};
  const userData = {
    questData,
    slideIndex: 0,
    inputValue: '',
    hitRegions,
    redraw: null
  };

  function wrapText(context, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = context.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        context.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    context.fillText(line, x, currentY);
    return currentY + lineHeight;
  }

  function draw() {
    hitRegions.length = 0;
    ctx.clearRect(0, 0, W, H);

    // Фон панели
    ctx.fillStyle = 'rgba(20, 24, 35, 0.92)';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(10, 10, W - 20, H - 20, 24);
    } else {
      ctx.rect(10, 10, W - 20, H - 20);
    }
    ctx.fill();

    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Заголовок (Тег)
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const tagText = (info.textLabel || 'QUEST').toUpperCase();
    ctx.fillText(tagText, W / 2, 30);

    // Главный заголовок
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    const titleText = info.title || 'Задание';
    let startY = wrapText(ctx, titleText, W / 2, 65, W - 60, 32);

    // Разделительная линия
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, startY + 10);
    ctx.lineTo(W - 30, startY + 10);
    ctx.stroke();

    startY += 25;

    // Текст вопроса
    const questionText = questData.question || info.subtitle || '';
    if (questionText) {
      ctx.fillStyle = '#e0e6ed';
      // Подбор размера шрифта в зависимости от длины вопроса
      const fontSize = questionText.length > 120 ? 18 : (questionText.length > 60 ? 20 : 22);
      ctx.font = `${fontSize}px sans-serif`;
      startY = wrapText(ctx, questionText, W / 2, startY, W - 60, fontSize + 8);
    }

    startY += 15;

    // Зона контента и ответов (занимает место до зоны нижних кнопок)
    const answerType = questData.answerType;
    const bottomReservedHeight = 110; // Зарезервированное место внизу под кнопки
    const maxAnswersY = H - bottomReservedHeight;

    if (answerType === 'MultipleChoice' && Array.isArray(questData.options) && questData.options.length > 0) {
      const options = questData.options;
      const availableSpace = maxAnswersY - startY;
      const btnHeight = Math.min(52, Math.max(38, Math.floor((availableSpace - (options.length * 10)) / options.length)));
      const fontSize = btnHeight < 45 ? 16 : 18;

      options.forEach((opt, idx) => {
        const btnX = 40;
        const btnY = startY + idx * (btnHeight + 10);
        const btnW = W - 80;

        if (btnY + btnHeight <= maxAnswersY + 20) {
          ctx.fillStyle = '#2a324d';
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(btnX, btnY, btnW, btnHeight, 12);
          else ctx.rect(btnX, btnY, btnW, btnHeight);
          ctx.fill();

          ctx.strokeStyle = '#3d4b75';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = `${fontSize}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(opt, W / 2, btnY + btnHeight / 2, btnW - 20);

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
    } else if (answerType === 'Slide' && Array.isArray(questData.options) && questData.options.length > 0) {
      const options = questData.options;
      const currentIdx = userData.slideIndex % options.length;
      const optText = options[currentIdx] || '';

      const slideY = Math.min(startY + 20, maxAnswersY - 60);

      // Кнопка влево
      ctx.fillStyle = '#2a324d';
      ctx.fillRect(40, slideY, 50, 50);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('<', 65, slideY + 25);
      hitRegions.push({ type: 'prev', x: 40, y: slideY, w: 50, h: 50 });

      // Значение слайдера
      ctx.fillStyle = '#161b26';
      ctx.fillRect(100, slideY, W - 200, 50);
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(optText, W / 2, slideY + 25, W - 220);

      // Кнопка вправо
      ctx.fillStyle = '#2a324d';
      ctx.fillRect(W - 90, slideY, 50, 50);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('>', W - 65, slideY + 25);
      hitRegions.push({ type: 'next', x: W - 90, y: slideY, w: 50, h: 50 });

      // Нижняя кнопка подтверждения OK
      drawOkButton(H - 85);
    } else if (answerType === 'InputField') {
      const inputY = Math.min(startY + 10, maxAnswersY - 60);
      const valText = userData.inputValue || 'Нажмите, чтобы ввести...';

      ctx.fillStyle = '#161b26';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(40, inputY, W - 80, 50, 10);
      else ctx.rect(40, inputY, W - 80, 50);
      ctx.fill();

      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = userData.inputValue ? '#ffffff' : '#888888';
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(valText, W / 2, inputY + 25, W - 100);

      hitRegions.push({ type: 'input', x: 40, y: inputY, w: W - 80, h: 50 });

      // Нижняя кнопка подтверждения OK
      drawOkButton(H - 85);
    } else {
      // Стандартная кнопка OK, если нет конкретных вариантов
      drawOkButton(H - 85);
    }

    function drawOkButton(btnY) {
      const btnW = 160;
      const btnH = 50;
      const btnX = (W - btnW) / 2;

      ctx.fillStyle = '#00e5ff';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(btnX, btnY, btnW, btnH, 25);
      else ctx.rect(btnX, btnY, btnW, btnH);
      ctx.fill();

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
 * Создает AR-цель (3D-объект с панелями) синхронно.
 * @param {Object} info 
 * @param {Object} handlers 
 * @returns {THREE.Group}
 */
export function createArTargetSync(info = {}, handlers = {}) {
  const group = new THREE.Group();
  group.name = 'ArTargetGroup';

  // Размеры основной 3D плоскости под пропорции Canvas 512x768 (соотношение 1:1.5)
  const planeWidth = 0.8;
  const planeHeight = 1.2;

  const panelData = createQuestionPanelCanvas(info);

  const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
  const material = new THREE.MeshBasicMaterial({
    map: panelData.texture,
    transparent: true,
    side: THREE.DoubleSide
  });

  const questionMesh = new THREE.Mesh(geometry, material);
  questionMesh.name = 'QuestionPanelMesh';
  questionMesh.position.set(0, planeHeight / 2, 0);
  questionMesh.userData = panelData.userData;

  group.add(questionMesh);

  group.userData = {
    questionPanel: questionMesh,
    panels: {
      questionPanel: questionMesh
    }
  };

  return group;
}
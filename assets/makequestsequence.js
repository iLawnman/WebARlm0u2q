const fs = require('fs');
const path = require('path');

function parseTable(data) {
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      if (h) obj[h] = row[i] !== undefined ? row[i] : "";
    });
    return obj;
  });
}

try {
  const rawAnswers = JSON.parse(fs.readFileSync(path.join(__dirname, 'answers.json'), 'utf8'));
  const rawStyles = JSON.parse(fs.readFileSync(path.join(__dirname, 'arprefabsdesign.json'), 'utf8'));
  const rawQuests = JSON.parse(fs.readFileSync(path.join(__dirname, 'questtable.json'), 'utf8'));

  const answers = parseTable(rawAnswers);
  const styles = parseTable(rawStyles);
  const quests = parseTable(rawQuests);

  const htmlContent = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Интерактивный Квест</title>
  <style>
    :root {
      --bg: #070707;
      --panel-bg: #121212;
      --panel-border: #FFD700;
      --text: #FFFFFF;
      --accent: #FFD700;
      --correct: #22c55e;
      --wrong: #ef4444;
    }

    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }

    #quest-container {
      width: 100%;
      max-width: 600px;
      background: var(--panel-bg);
      border: 2px solid var(--panel-border);
      border-radius: 16px;
      box-shadow: 0 0 25px rgba(255, 215, 0, 0.15);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      margin: 10px;
    }

    /* Панель заголовка */
    .header-panel {
      background: linear-gradient(180deg, #1f1f1f 0%, #121212 100%);
      padding: 15px 20px;
      border-bottom: 1px solid rgba(255, 215, 0, 0.3);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .quest-title {
      font-weight: bold;
      color: var(--accent);
      font-size: 1.1rem;
    }

    .badge {
      font-size: 0.8rem;
      padding: 4px 8px;
      border-radius: 4px;
      background: #333;
      color: #aaa;
    }

    /* Главная панель контента */
    .main-panel {
      padding: 20px;
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .quest-text {
      line-height: 1.5;
      font-size: 1rem;
    }

    .quest-text i { color: #888; }
    .quest-text b { color: var(--accent); }

    /* Медиа-информация */
    .media-badge {
      font-size: 0.75rem;
      color: #FF69B4;
      background: rgba(255, 105, 180, 0.1);
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px dashed #FF69B4;
    }

    /* Панель подсказок */
    .help-panel {
      background: rgba(255, 255, 255, 0.03);
      border-left: 3px solid var(--accent);
      padding: 10px 12px;
      font-size: 0.85rem;
      color: #ccc;
    }

    /* Панель ответов и ввода */
    .answers-panel {
      margin-top: 10px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .btn-option {
      background: #1e1e1e;
      color: var(--text);
      border: 1px solid #444;
      padding: 12px 16px;
      border-radius: 8px;
      cursor: pointer;
      text-align: left;
      font-size: 0.95rem;
      transition: all 0.2s ease;
    }

    .btn-option:hover {
      background: #2a2a2a;
      border-color: var(--accent);
    }

    .input-group {
      display: flex;
      gap: 8px;
    }

    .input-field {
      flex: 1;
      background: #1e1e1e;
      border: 1px solid #444;
      color: #fff;
      padding: 12px;
      border-radius: 8px;
      outline: none;
      font-size: 1rem;
    }

    .input-field:focus { border-color: var(--accent); }

    .btn-submit {
      background: var(--accent);
      color: #000;
      font-weight: bold;
      border: none;
      padding: 0 20px;
      border-radius: 8px;
      cursor: pointer;
    }

    /* Панель фидбека (Результат) */
    .feedback-panel {
      padding: 15px;
      border-radius: 8px;
      display: none;
      flex-direction: column;
      gap: 10px;
    }

    .feedback-panel.correct {
      background: rgba(34, 197, 94, 0.15);
      border: 1px solid var(--correct);
      color: #4ade80;
    }

    .feedback-panel.wrong {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid var(--wrong);
      color: #f87171;
    }

    .btn-next {
      background: var(--text);
      color: #000;
      border: none;
      padding: 10px;
      border-radius: 6px;
      font-weight: bold;
      cursor: pointer;
      align-self: flex-end;
    }

    /* Карусель (Слайды) */
    .carousel-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 10px;
    }

    .btn-arrow {
      background: #222;
      color: var(--accent);
      border: 1px solid #444;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 1.2rem;
    }
  </style>
</head>
<body>

<div id="quest-container">
  <div class="header-panel">
    <div class="quest-title" id="title-text">Загрузка...</div>
    <div class="badge" id="quest-id">ID</div>
  </div>

  <div class="main-panel">
    <div id="media-info" class="media-badge" style="display:none;"></div>
    <div id="question-text" class="quest-text"></div>
    <div id="help-text" class="help-panel" style="display:none;"></div>

    <!-- Интерактивная зона -->
    <div id="interactive-zone" class="answers-panel"></div>

    <!-- Фидбек и переход -->
    <div id="feedback-panel" class="feedback-panel">
      <div id="feedback-text"></div>
      <button class="btn-next" onclick="nextQuest()">Продолжить</button>
    </div>
  </div>
</div>

<script>
  const quests = ${JSON.stringify(quests)};
  const answers = ${JSON.stringify(answers)};

  const questMap = new Map(quests.map(q => [q.QuestID, q]));
  const answerMap = new Map(answers.map(a => [a.id, a]));

  let currentQuestId = "Start";
  let slideIndex = 0;
  let currentAnswerIds = [];
  let targetNextQuest = "";

  function cleanFormatting(str) {
    if (!str) return "";
    return str
      .replace(/<size=\\+?\\d+>/gi, "")
      .replace(/<\\/size>/gi, "")
      .replace(/<color=[^>]+>/gi, "")
      .replace(/<\\/color>/gi, "")
      .replace(/<align=[^>]+>/gi, "")
      .replace(/<\\/align>/gi, "")
      .replace(/\\n/g, "<br>");
  }

  function renderQuest(questId) {
    const q = questMap.get(questId);
    if (!q) {
      alert("Квест завершен или не найден!");
      return;
    }

    currentQuestId = questId;
    slideIndex = 0;
    document.getElementById("feedback-panel").style.display = "none";
    document.getElementById("quest-id").innerText = q.QuestID;

    // Парсим связанные ответы
    currentAnswerIds = q.AnswerList ? q.AnswerList.split(',').map(s => s.trim()) : [];
    const firstAns = answerMap.get(currentAnswerIds[0]) || {};

    // Заголовок
    document.getElementById("title-text").innerHTML = cleanFormatting(firstAns.TitleText_Text || q.QuestID);

    // Главный текст
    document.getElementById("question-text").innerHTML = cleanFormatting(q.Question || firstAns.MainTxt_Text);

    // Медиа
    const sounds = currentAnswerIds.map(id => answerMap.get(id)?.Sound_Sound || answerMap.get(id)?.Music_Music).filter(Boolean);
    const mediaZone = document.getElementById("media-info");
    if (sounds.length > 0) {
      mediaZone.style.display = "block";
      mediaZone.innerHTML = "🎵 Аудиосопровождение: " + sounds.join(", ");
    } else {
      mediaZone.style.display = "none";
    }

    // Подсказка
    const helpMsg = firstAns.HelpUpText_Text || firstAns.HelpDownText_Text;
    const helpZone = document.getElementById("help-text");
    if (helpMsg) {
      helpZone.style.display = "block";
      helpZone.innerHTML = "💡 " + cleanFormatting(helpMsg);
    } else {
      helpZone.style.display = "none";
    }

    // Отрисовка интерактивной зоны (Кнопки / Ввод / Слайдер)
    renderInteractiveZone(q);
  }

  function renderInteractiveZone(q) {
    const zone = document.getElementById("interactive-zone");
    zone.style.display = "flex";
    zone.innerHTML = "";

    const ansObjects = currentAnswerIds.map(id => answerMap.get(id)).filter(Boolean);
    const primaryType = ansObjects[0]?.AnswerType || "";

    // 1. Поле ввода текста
    if (primaryType === "InputField" || ansObjects.some(a => a.MainTxt_Text && a.MainTxt_Text.length < 15 && !a.AnswerType)) {
      zone.innerHTML = \`
        <div class="input-group">
          <input type="text" id="user-input" class="input-field" placeholder="Введите ответ..." />
          <button class="btn-submit" onclick="checkInputAnswer()">OK</button>
        </div>
      \`;
      return;
    }

    // 2. Слайдер / Выбор из нескольких с переключением
    if (primaryType === "Slide" || ansObjects.length > 3) {
      renderSlideOption(0);
      return;
    }

    // 3. Стандартные кнопки ответов
    ansObjects.forEach((ans, index) => {
      const btn = document.createElement("button");
      btn.className = "btn-option";
      btn.innerHTML = cleanFormatting(ans.MainTxt_Text || ans.HelpUpText_Text || ("Вариант " + (index + 1)));
      btn.onclick = () => selectOption(index + 1);
      zone.appendChild(btn);
    });
  }

  function renderSlideOption(index) {
    const zone = document.getElementById("interactive-zone");
    const ansObjects = currentAnswerIds.map(id => answerMap.get(id)).filter(Boolean);
    
    if (index < 0) slideIndex = ansObjects.length - 1;
    else if (index >= ansObjects.length) slideIndex = 0;
    else slideIndex = index;

    const currentAns = ansObjects[slideIndex];

    zone.innerHTML = \`
      <div style="text-align:center; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px;">
        <div>\${cleanFormatting(currentAns.MainTxt_Text || currentAns.HelpUpText_Text || "Вариант " + (slideIndex + 1))}</div>
      </div>
      <div class="carousel-controls">
        <button class="btn-arrow" onclick="renderSlideOption(slideIndex - 1)">❮</button>
        <button class="btn-submit" style="height: 40px;" onclick="selectOption(slideIndex + 1)">Выбрать OK</button>
        <button class="btn-arrow" onclick="renderSlideOption(slideIndex + 1)">❯</button>
      </div>
    \`;
  }

  function checkInputAnswer() {
    const val = document.getElementById("user-input").value.trim().toLowerCase();
    const ansObjects = currentAnswerIds.map(id => answerMap.get(id)).filter(Boolean);
    
    // Проверка текстовых ответов из JSON
    const matchIndex = ansObjects.findIndex(a => a.MainTxt_Text && a.MainTxt_Text.trim().toLowerCase() === val);

    if (matchIndex !== -1 || val.length > 0) {
      selectOption(matchIndex !== -1 ? matchIndex + 1 : 1);
    }
  }

  function selectOption(optionIndex) {
    const q = questMap.get(currentQuestId);
    const rightWays = q.RightWayIndx ? q.RightWayIndx.split(',').map(s => parseInt(s.trim())) : [];

    const isCorrect = rightWays.length === 0 || rightWays.includes(optionIndex);

    document.getElementById("interactive-zone").style.display = "none";
    const feedbackPanel = document.getElementById("feedback-panel");
    const feedbackText = document.getElementById("feedback-text");

    feedbackPanel.style.display = "flex";

    if (isCorrect) {
      feedbackPanel.className = "feedback-panel correct";
      feedbackText.innerHTML = cleanFormatting(q.RightReaction || "Правильно!");
      targetNextQuest = q.RightWayQuest;
    } else {
      feedbackPanel.className = "feedback-panel wrong";
      feedbackText.innerHTML = cleanFormatting(q.WrongReaction || "Неправильно!");
      targetNextQuest = q.WrongWayQuest || q.RightWayQuest;
    }

    if (!targetNextQuest) {
      targetNextQuest = q.NextWayQuest;
    }
  }

  function nextQuest() {
    if (targetNextQuest && questMap.has(targetNextQuest)) {
      renderQuest(targetNextQuest);
    } else {
      alert("Конец интерактивного сценария!");
    }
  }

  // Запуск первого квеста
  window.onload = () => renderQuest("Start");
</script>
</body>
</html>`;

  fs.writeFileSync(path.join(__dirname, 'makequestsequence.html'), htmlContent, 'utf8');
  console.log('Успешно сгенерирован файл makequestsequence.html');

} catch (err) {
  console.error('Ошибка сборки:', err);
}
const fs = require('fs');
const path = require('path');

// Хелперы очистки и парсинга
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

function cleanText(text) {
  if (!text) return "";
  return text
    .replace(/<size=\+?\d+>/gi, "")
    .replace(/<\/size>/gi, "")
    .replace(/<color=[^>]+>/gi, "")
    .replace(/<\/color>/gi, "")
    .replace(/<align=[^>]+>/gi, "")
    .replace(/<\/align>/gi, "")
    .replace(/\n/g, "<br>");
}

// Загрузка входных JSON файлов
try {
  const rawAnswers = JSON.parse(fs.readFileSync(path.join(__dirname, 'answers.json'), 'utf8'));
  const rawStyles = JSON.parse(fs.readFileSync(path.join(__dirname, 'arprefabsdesign.json'), 'utf8'));
  const rawQuests = JSON.parse(fs.readFileSync(path.join(__dirname, 'questtable.json'), 'utf8'));

  const answersList = parseTable(rawAnswers);
  const stylesList = parseTable(rawStyles);
  const questsList = parseTable(rawQuests);

  const answersMap = new Map(answersList.map(a => [a.id, a]));
  const stylesMap = new Map(stylesList.map(s => [s.id, s]));

  let questsHTML = "";

  questsList.forEach(q => {
    const ansIds = q.AnswerList ? q.AnswerList.split(',').map(s => s.trim()) : [];
    const questionAnswers = ansIds.map(id => answersMap.get(id)).filter(Boolean);

    // 1. Header Panel
    const titleText = questionAnswers.map(a => a.TitleText_Text).find(t => t) || q.QuestID;
    const headerPanel = `
      <div class="panel header-panel">
        <div class="badge">Quest ID: ${q.QuestID}</div>
        <h2>${cleanText(titleText)}</h2>
      </div>`;

    // 2. Context Panel
    const questionText = cleanText(q.Question);
    const mainTxtExtra = questionAnswers.map(a => cleanText(a.MainTxt_Text)).filter(Boolean).join("<br><br>");
    
    let contextPanel = "";
    if (questionText || mainTxtExtra) {
      contextPanel = `
        <div class="panel context-panel">
          <h3>Описание и условия</h3>
          ${questionText ? `<div class="quest-text">${questionText}</div>` : ""}
          ${mainTxtExtra ? `<div class="main-txt-extra" style="margin-top:10px; opacity:0.9;">${mainTxtExtra}</div>` : ""}
        </div>`;
    }

    // 3. Media Panel
    const mediaItems = [];
    questionAnswers.forEach(a => {
      if (a.Sound_Sound) mediaItems.push(`<li><strong>Звук:</strong> ${a.Sound_Sound}</li>`);
      if (a.Music_Music) mediaItems.push(`<li><strong>Музыка:</strong> ${a.Music_Music}</li>`);
      if (a.AdditionalPrefab_Prefab) mediaItems.push(`<li><strong>Префаб:</strong> ${a.AdditionalPrefab_Prefab}</li>`);
      if (a.AnswerPicture_Image) mediaItems.push(`<li><strong>Изображение:</strong> ${a.AnswerPicture_Image}</li>`);
    });

    let mediaPanel = "";
    if (mediaItems.length > 0) {
      mediaPanel = `
        <div class="panel media-panel">
          <h3>Медиа и Ресурсы</h3>
          <ul>${mediaItems.join("")}</ul>
        </div>`;
    }

    // 4. Answers Panel
    let answersPanel = "";
    if (questionAnswers.length > 0) {
      const options = questionAnswers.map((a, idx) => {
        const isCorrect = (q.RightWayIndx && q.RightWayIndx.split(',').map(s => s.trim()).includes(String(idx + 1))) ? 'correct' : '';
        const type = a.AnswerType || "Option";
        const content = cleanText(a.HelpUpText_Text || a.HelpDownText_Text || a.MainTxt_Text || a.id);
        return `
          <div class="answer-card ${isCorrect}">
            <div class="answer-type">${type} (ID: ${a.id})</div>
            <div class="answer-content">${content}</div>
          </div>`;
      }).join("");

      answersPanel = `
        <div class="panel answers-panel">
          <h3>Варианты ответов / Действия</h3>
          <div class="answers-grid">${options}</div>
        </div>`;
    }

    // 5. Navigation Panel
    let navPanel = "";
    if (q.RightReaction || q.WrongReaction || q.RightWayQuest || q.WrongWayQuest) {
      navPanel = `
        <div class="panel nav-panel">
          <h3>Переходы и Реакции</h3>
          <div class="nav-grid">
            <div class="nav-box right">
              <strong>Успех (Переход -> ${q.RightWayQuest || '—'}):</strong>
              <p>${cleanText(q.RightReaction)}</p>
            </div>
            <div class="nav-box wrong">
              <strong>Ошибка (Переход -> ${q.WrongWayQuest || '—'}):</strong>
              <p>${cleanText(q.WrongReaction)}</p>
            </div>
          </div>
        </div>`;
    }

    questsHTML += `
      <section class="quest-card">
        ${headerPanel}
        <div class="quest-body">
          ${contextPanel}
          ${mediaPanel}
          ${answersPanel}
          ${navPanel}
        </div>
      </section>`;
  });

  const fullHTML = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quest Map</title>
  <style>
    :root {
      --bg-color: #0f172a;
      --card-bg: #1e293b;
      --panel-bg: #334155;
      --accent: #eab308;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --correct: #22c55e;
      --wrong: #ef4444;
    }
    body { font-family: system-ui, -apple-system, sans-serif; background: var(--bg-color); color: var(--text); margin: 0; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 30px; }
    .quest-card { background: var(--card-bg); border-radius: 12px; padding: 24px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5); border: 1px solid #475569; }
    .header-panel { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--accent); padding-bottom: 12px; margin-bottom: 20px; }
    .badge { background: var(--accent); color: #000; font-weight: bold; padding: 4px 12px; border-radius: 20px; }
    .quest-body { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
    .panel { background: var(--panel-bg); padding: 16px; border-radius: 8px; }
    .panel h3 { margin-top: 0; color: var(--accent); font-size: 1.1rem; border-bottom: 1px solid #475569; padding-bottom: 6px; }
    .answers-grid { display: flex; flex-direction: column; gap: 10px; }
    .answer-card { background: #1e293b; padding: 10px; border-radius: 6px; border-left: 4px solid #64748b; }
    .answer-card.correct { border-left-color: var(--correct); background: #14532d33; }
    .answer-type { font-size: 0.8rem; color: var(--text-muted); }
    .nav-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .nav-box { padding: 10px; border-radius: 6px; font-size: 0.9rem; }
    .nav-box.right { background: #14532d55; }
    .nav-box.wrong { background: #7f1d1d55; }
    ul { padding-left: 20px; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Квест Карта</h1>
    ${questsHTML}
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(__dirname, 'quest.html'), fullHTML, 'utf8');
  console.log('Успешно сгенерирован quest.html');

} catch (err) {
  console.error('Ошибка при генерации HTML:', err);
}
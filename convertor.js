// convertor.js
//
// По клику на кнопку проверяет наличие трёх файлов конвертера в ./assets/:
//   - assets/arTargetDesign.json
//   - assets/questTable.json
//   - assets/answers.json
// Если ВСЕ три файла найдены — создаёт отдельную WebXR DOM Overlay панель
// с текстом (по умолчанию отчёт о найденных файлах, но можно передать любой
// свой HTML/текст через createOverlayPanel()).
//
// ВАЖНО: панель добавляется внутрь того же элемента, что передан в
// ARButton.createButton(renderer, { domOverlay: { root: <этот элемент> } }),
// иначе браузер её не покажет во время immersive-ar сессии — за пределами
// domOverlay.root ничего не композитится поверх камеры.

const DEFAULT_ASSET_FILES = [
  'assets/artargetdesign.json',
  'assets/questtable.json',
  'assets/answers.json',
];

async function fileExists(path) {
  try {
    const res = await fetch(path, { method: 'HEAD', cache: 'no-store' });
    if (res.ok) return true;
    // Некоторые статические сервера не поддерживают HEAD — пробуем GET.
    if (res.status === 405 || res.status === 501) {
      const getRes = await fetch(path, { method: 'GET', cache: 'no-store' });
      return getRes.ok;
    }
    return false;
  } catch (err) {
    return false;
  }
}

/**
 * Проверяет список файлов, возвращает результат по каждому и общий флаг.
 */
export async function checkAssetFiles(files = DEFAULT_ASSET_FILES) {
  const results = await Promise.all(
    files.map(async (path) => ({ path, exists: await fileExists(path) }))
  );
  return {
    results,
    allExist: results.every((r) => r.exists),
  };
}

let panelCounter = 0;

/**
 * Создаёт отдельную WebXR DOM Overlay панель с произвольным HTML/текстом.
 * @param {HTMLElement} overlayRoot - тот же элемент, что domOverlay.root
 * @param {{title?: string, html?: string, onClose?: () => void}} opts
 */
export function createOverlayPanel(overlayRoot, { title = 'Панель', html = '', onClose } = {}) {
  panelCounter += 1;

  const panel = document.createElement('div');
  panel.className = 'convertor-panel';
  panel.dataset.panelId = String(panelCounter);
  panel.style.setProperty('--stack-offset', `${(panelCounter - 1) * 14}px`);
  panel.innerHTML = `
    <div class="convertor-panel-header">
      <span>${title}</span>
      <button type="button" class="convertor-panel-close" aria-label="Закрыть">×</button>
    </div>
    <div class="convertor-panel-body">${html}</div>
  `;
  overlayRoot.appendChild(panel);

  panel.querySelector('.convertor-panel-close').addEventListener('click', () => {
    panel.remove();
    if (onClose) onClose();
  });

  return panel;
}

function renderReportHtml(results) {
  return results
    .map(
      (r) => `
        <div class="convertor-row ${r.exists ? 'ok' : 'missing'}">
          <span>${r.exists ? '✅' : '❌'}</span>
          <code>${r.path}</code>
        </div>`
    )
    .join('');
}

/**
 * Добавляет в overlayRoot кнопку-триггер. По клику проверяет файлы и,
 * если все на месте, открывает отдельную панель (через createOverlayPanel).
 * Текст/заголовок панели при успехе можно переопределить через
 * onSuccessPanel(results) -> { title, html }.
 */
export function attachConvertorButton(
  overlayRoot,
  {
    buttonLabel = '📦 Проверить assets',
    files = DEFAULT_ASSET_FILES,
    onSuccessPanel,
    onMissingPanel,
  } = {}
) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'convertor-trigger';
  button.textContent = buttonLabel;
  overlayRoot.appendChild(button);

  button.addEventListener('click', async () => {
    button.disabled = true;
    const originalLabel = button.textContent;
    button.textContent = '⏳ Проверяю…';

    const { results, allExist } = await checkAssetFiles(files);

    button.disabled = false;
    button.textContent = originalLabel;

    if (allExist) {
      const custom = onSuccessPanel ? onSuccessPanel(results) : null;
      createOverlayPanel(overlayRoot, {
        title: custom?.title ?? 'Assets найдены',
        html: custom?.html ?? `<p>Все файлы конвертера на месте:</p>${renderReportHtml(results)}`,
      });
    } else {
      const custom = onMissingPanel ? onMissingPanel(results) : null;
      createOverlayPanel(overlayRoot, {
        title: custom?.title ?? 'Не хватает файлов',
        html:
          custom?.html ??
          `<p>Не все файлы найдены в <code>./assets/</code>:</p>${renderReportHtml(results)}`,
      });
    }
  });

  return button;
}

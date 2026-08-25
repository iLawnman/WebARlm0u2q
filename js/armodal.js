// armodal.js - Modal Manager for AR
//
// Модалка (легенда/история таргета) - это разметка ВНУТРИ конкретной
// CSS3D-панели таргета (el), склонированная вместе с остальным префабом
// (.modal-overlay/.modal-close-btn/.modal-title/.modal-body). Она НЕ
// является отдельным глобальным элементом документа: recognition.js
// показывает её именно через `panelEl.querySelector('.modal-overlay')`,
// где panelEl === el. Поэтому весь код здесь тоже обязан работать со
// scoped-узлами внутри el, а не через document.querySelector - иначе
// закрытие вешается на другой (чужой/несвязанный) узел, и крестик
// визуально реагирует, но ничего не делает.
export class ARModalManager {
  constructor() {}

  /**
   * Настраивает модальное окно (заголовок/текст уже заполнены в
   * arpanel.js._fillScreen - здесь только логика показа/скрытия).
   * Показ модалки не выполняется автоматически - им управляет вызывающий
   * код (recognition.js показывает её с задержкой после появления таргета).
   */
  setupModal(el, ui, arInput = null) {
    if (!el) return;

    let modalOverlay = el.querySelector('.modal-overlay');
    let modalCloseBtn = el.querySelector('.modal-close-btn');

    if (!modalOverlay || !modalCloseBtn) {
      // Кастомный префаб без встроенной разметки модалки - строим
      // минимальную структуру и добавляем её внутрь el, чтобы она
      // осталась частью той же CSS3D-панели (а не отдельным элементом
      // документа, который легко потерять/перепутать между таргетами).
      const built = this._buildModalMarkup(el);
      modalOverlay = built.modalOverlay;
      modalCloseBtn = built.modalCloseBtn;
    }

    // Гарантируем, что модалка стартует скрытой
    modalOverlay.style.display = modalOverlay.style.display || 'none';

    const closeModal = () => {
      modalOverlay.style.display = 'none';
      if (ui) ui.log('[Modal] Closed', 'ok');
    };

    if (arInput) {
      // Единый проверенный путь обработки кликов/тапов: даёт то же
      // логирование, звук и защиту от двойного срабатывания click+touchend,
      // что и остальные интерактивные элементы панели.
      arInput.bindInteractiveEvent(modalCloseBtn, 'ModalCloseButton', closeModal);
    } else {
      // Фоллбэк на случай, если arInput не передали
      modalCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeModal();
      }, true);
      modalCloseBtn.addEventListener('touchend', (e) => {
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();
        closeModal();
      }, { passive: false, capture: true });
    }

    // Клик по затемнённому фону (не по самому окну) тоже закрывает модалку
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    }, true);
  }

  _buildModalMarkup(el) {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      z-index: 99999;
      display: none;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
      box-sizing: border-box;
    `;

    const modalWindow = document.createElement('div');
    modalWindow.className = 'modal-window';
    modalWindow.style.cssText = `
      background: linear-gradient(145deg, #1a1a2e, #16213e);
      padding: 30px;
      border-radius: 16px;
      max-width: 90%;
      max-height: 85%;
      overflow-y: auto;
      color: #ffffff;
      position: relative;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
      border: 1px solid rgba(255, 215, 0, 0.3);
      pointer-events: auto;
      min-width: 280px;
    `;

    const modalCloseBtn = document.createElement('button');
    modalCloseBtn.type = 'button';
    modalCloseBtn.className = 'modal-close-btn';
    modalCloseBtn.innerHTML = '&#10005;';
    modalCloseBtn.style.cssText = `
      position: absolute;
      top: 12px;
      right: 12px;
      font-size: 24px;
      font-weight: bold;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 50%;
      color: #ff6b6b;
      cursor: pointer;
      pointer-events: auto;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const modalTitle = document.createElement('div');
    modalTitle.className = 'modal-title';
    modalTitle.style.cssText = `
      font-size: 22px;
      font-weight: bold;
      margin-bottom: 16px;
      color: #ffd700;
      text-align: center;
      padding-right: 30px;
    `;

    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body';
    modalBody.style.cssText = `
      font-size: 16px;
      line-height: 1.6;
      color: #e0e0e0;
      margin-bottom: 10px;
    `;

    modalWindow.appendChild(modalCloseBtn);
    modalWindow.appendChild(modalTitle);
    modalWindow.appendChild(modalBody);
    modalOverlay.appendChild(modalWindow);
    el.appendChild(modalOverlay);

    return { modalOverlay, modalCloseBtn, modalTitle, modalBody };
  }
}

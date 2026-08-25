// armodal.js - Modal Manager for AR
export class ARModalManager {
  constructor() {}

  setupModal(el, ui, arInput = null) {
    if (!el) return;

    let modalOverlay = el.querySelector('.modal-overlay');
    let modalCloseBtn = el.querySelector('.modal-close-btn');

    if (!modalOverlay || !modalCloseBtn) {
      const built = this._buildModalMarkup(el);
      modalOverlay = built.modalOverlay;
      modalCloseBtn = built.modalCloseBtn;
    }

    // Гарантируем, что модалка стартует скрытой
    if (!modalOverlay.classList.contains('active')) {
      modalOverlay.classList.remove('active');
    }

    const closeModal = () => {
      modalOverlay.classList.remove('active');
      if (ui) ui.log('[Modal] Closed', 'ok');
    };

    if (arInput) {
      arInput.bindInteractiveEvent(modalCloseBtn, 'ModalCloseButton', closeModal);
    } else {
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

    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    }, true);
  }

  _buildModalMarkup(el) {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.85);
      z-index: 99999;
      align-items: center; justify-content: center;
      box-sizing: border-box;
      pointer-events: none;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s, visibility 0.2s;
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
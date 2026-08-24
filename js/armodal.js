// armodal.js - Modal Manager for AR
export class ARModalManager {
  constructor() {}

  setupModal(el, data, ui) {
    console.log('[ARModalManager] Setting up modal');

    let modalOverlay = el.querySelector('.modal-overlay');
    let modalCloseBtn = el.querySelector('.modal-close-btn');

    if (!modalOverlay) {
      modalOverlay = document.querySelector('.modal-overlay');
      modalCloseBtn = document.querySelector('.modal-close-btn');
    }

    if (!modalOverlay) {
      this._createModal(el, data, ui);
      return;
    }

    if (modalOverlay && modalCloseBtn) {
      this._setupModalHandlers(modalOverlay, modalCloseBtn, data, ui);
    } else {
      console.error('[ARModalManager] Failed to setup modal');
    }
  }

  _createModal(el, data, ui) {
    console.log('[ARModalManager] Creating modal overlay programmatically');

    const storySrc = data.raw?.story || data.raw?.legend || data.raw?.intro || data.mainText || data.question || '';

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
    `;

    const modalWindow = document.createElement('div');
    modalWindow.className = 'modal-window';
    modalWindow.style.cssText = `
      background: linear-gradient(145deg, #1a1a2e, #16213e);
      padding: 40px;
      border-radius: 20px;
      max-width: 90%;
      max-height: 90%;
      overflow: auto;
      color: white;
      position: relative;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
      border: 1px solid rgba(255, 215, 0, 0.2);
      pointer-events: auto;
      min-width: 300px;
    `;

    const modalCloseBtn = document.createElement('button');
    modalCloseBtn.className = 'modal-close-btn';
    modalCloseBtn.textContent = '✕';
    modalCloseBtn.style.cssText = `
      position: absolute;
      top: 10px;
      right: 15px;
      font-size: 30px;
      font-weight: bold;
      background: none;
      border: none;
      color: #ff6b6b;
      cursor: pointer;
      z-index: 9999999;
      pointer-events: auto;
      padding: 10px 15px;
      min-width: 48px;
      min-height: 48px;
      transition: transform 0.2s;
    `;
    modalCloseBtn.onmouseover = function() { this.style.transform = 'scale(1.3)'; };
    modalCloseBtn.onmouseout = function() { this.style.transform = 'scale(1)'; };

    const modalTitle = document.createElement('div');
    modalTitle.className = 'modal-title';
    modalTitle.style.cssText = `
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 20px;
      color: #ffd700;
      text-align: center;
    `;
    modalTitle.textContent = data.title || 'Внимание!';

    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body';
    modalBody.style.cssText = `
      font-size: 18px;
      line-height: 1.8;
      color: #e0e0e0;
      margin-bottom: 20px;
    `;
    modalBody.textContent = storySrc || 'Добро пожаловать!';

    modalWindow.appendChild(modalCloseBtn);
    modalWindow.appendChild(modalTitle);
    modalWindow.appendChild(modalBody);
    modalOverlay.appendChild(modalWindow);

    document.body.appendChild(modalOverlay);
    console.log('[ARModalManager] Modal created and added to body');

    this._setupModalHandlers(modalOverlay, modalCloseBtn, data, ui);
    this._showModal(modalOverlay, ui);
  }

  _setupModalHandlers(modalOverlay, modalCloseBtn, data, ui) {
    console.log('[ARModalManager] Setting up modal handlers');

    const closeModal = (e) => {
      console.log('[ARModalManager] Closing modal');
      if (e) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (e.cancelable) e.preventDefault();
      }
      modalOverlay.style.display = 'none';
      if (ui) ui.log('[Modal] Closed', 'ok');
    };

    const showModal = () => {
      this._showModal(modalOverlay, ui);
    };

    window._showModal = showModal;
    window._closeModal = closeModal;
    window._modalOverlay = modalOverlay;

    modalCloseBtn.onclick = function(e) {
      closeModal(e);
      return false;
    };

    modalCloseBtn.addEventListener('click', closeModal, true);
    modalCloseBtn.addEventListener('pointerup', function(e) {
      if (e.button === 0) closeModal(e);
    }, true);
    modalCloseBtn.addEventListener('touchend', closeModal, { passive: false, capture: true });

    modalOverlay.addEventListener('click', function(e) {
      if (e.target === modalOverlay) closeModal(e);
    }, true);

    // Показываем модалку
    showModal();
  }

  _showModal(modalOverlay, ui) {
    console.log('[ARModalManager] Showing modal');
    modalOverlay.style.display = 'flex';
    
    setTimeout(() => {
      if (modalOverlay.style.display === 'none' || window.getComputedStyle(modalOverlay).display === 'none') {
        console.log('[ARModalManager] Modal is hidden, forcing show again');
        modalOverlay.style.display = 'flex';
      }
    }, 500);

    if (ui) ui.log('[Modal] Shown', 'info');
  }
}
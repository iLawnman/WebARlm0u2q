// armodal.js - Modal Manager for AR
export class ARModalManager {
  constructor() {}

  setupModal(el, data, ui) {
    console.log('[ARModalManager] Setting up modal');

    let modalOverlay = document.querySelector('.modal-overlay');
    let modalCloseBtn = document.querySelector('.modal-close-btn');

    if (!modalOverlay) {
      this._createModal(el, data, ui);
      return;
    }

    if (modalOverlay && modalCloseBtn) {
      this._setupModalHandlers(modalOverlay, modalCloseBtn, data, ui);
    } else {
      console.error('[ARModalManager] Failed to setup modal, recreating...');
      this._createModal(el, data, ui);
    }
  }

  _createModal(el, data, ui) {
    console.log('[ARModalManager] Creating modal overlay in document.body');

    const storySrc = data?.raw?.story || data?.raw?.legend || data?.raw?.intro || data?.mainText || data?.question || '';

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.85);
      z-index: 2147483647;
      display: flex;
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
      z-index: 2147483647;
      pointer-events: auto;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, background 0.2s;
    `;
    modalCloseBtn.onmouseover = function() { 
      this.style.transform = 'scale(1.1)'; 
      this.style.background = 'rgba(255, 107, 107, 0.2)';
    };
    modalCloseBtn.onmouseout = function() { 
      this.style.transform = 'scale(1)'; 
      this.style.background = 'rgba(255, 255, 255, 0.1)';
    };

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
    modalTitle.textContent = data?.title || 'Информация';

    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body';
    modalBody.style.cssText = `
      font-size: 16px;
      line-height: 1.6;
      color: #e0e0e0;
      margin-bottom: 10px;
    `;
    modalBody.textContent = storySrc || 'Добро пожаловать!';

    modalWindow.appendChild(modalCloseBtn);
    modalWindow.appendChild(modalTitle);
    modalWindow.appendChild(modalBody);
    modalOverlay.appendChild(modalWindow);

    document.body.appendChild(modalOverlay);
    console.log('[ARModalManager] Modal created and appended to document.body');

    this._setupModalHandlers(modalOverlay, modalCloseBtn, data, ui);
    this._showModal(modalOverlay, ui);
  }

  _setupModalHandlers(modalOverlay, modalCloseBtn, data, ui) {
    const closeModal = (e) => {
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

    modalCloseBtn.onclick = closeModal;
    modalCloseBtn.addEventListener('touchend', closeModal, { passive: false });

    modalOverlay.addEventListener('click', function(e) {
      if (e.target === modalOverlay) closeModal(e);
    }, true);

    showModal();
  }

  _showModal(modalOverlay, ui) {
    console.log('[ARModalManager] Showing modal overlay');
    modalOverlay.style.display = 'flex';
    
    // Повторная подстраховка для предотвращения перебивания другими скриптами при старте
    requestAnimationFrame(() => {
      modalOverlay.style.display = 'flex';
    });

    if (ui) ui.log('[Modal] Shown', 'info');
  }
}
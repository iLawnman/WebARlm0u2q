// armodal.js
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

    // Модалка стартует скрытой
    modalOverlay.style.display = 'none';

    const closeModal = () => {
      modalOverlay.style.display = 'none';
      if (ui) ui.log('[Modal] Closed', 'ok');
    };

    if (arInput) {
      arInput.bindInteractiveEvent(modalCloseBtn, 'ModalCloseButton', closeModal);
    } else {
      modalCloseBtn.addEventListener('click', closeModal, true);
    }
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
      background: rgba(0, 0, 0, 0.9);
      z-index: 99999;
      display: none;
      align-items: center;
      justify-content: center;
    `;

    const modalWindow = document.createElement('div');
    modalWindow.style.cssText = `
      position: relative;
      max-width: 90%;
      max-height: 90%;
    `;

    const img = document.createElement('img');
    img.src = './assets/modal-image.jpg'; // Замените на путь к вашей картинке
    img.alt = 'Modal Image';
    img.style.cssText = `
      max-width: 100%;
      max-height: 80vh;
      border-radius: 10px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
    `;

    const modalCloseBtn = document.createElement('button');
    modalCloseBtn.type = 'button';
    modalCloseBtn.className = 'modal-close-btn';
    modalCloseBtn.innerHTML = '&#10005;';
    modalCloseBtn.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      font-size: 32px;
      font-weight: bold;
      background: rgba(255, 255, 255, 0.2);
      border: 2px solid #fff;
      border-radius: 50%;
      color: #fff;
      cursor: pointer;
      width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100000;
    `;

    modalWindow.appendChild(img);
    modalWindow.appendChild(modalCloseBtn);
    modalOverlay.appendChild(modalWindow);
    el.appendChild(modalOverlay);

    return { modalOverlay, modalCloseBtn };
  }
}
// js/panel-controller.js
export class PanelController {
  constructor(ui) {
    this.ui = ui;
    this.activePanels = new Set();
    this.panels = new Map();
    this._initPanels();
  }

  _initPanels() {
    const panelIds = [
      'curtain-panel',
      'quest-start-panel', 
      'result-panel',
      'ar-scan-frame'
    ];
    
    for (const id of panelIds) {
      const el = document.getElementById(id);
      if (el) {
        this.panels.set(id, el);
      }
    }
  }

  show(panelId, data = {}) {
    const panel = this.panels.get(panelId);
    if (!panel) {
      console.warn(`[PanelController] Panel "${panelId}" not found`);
      return;
    }

    for (const id of this.activePanels) {
      if (id !== panelId) {
        this.hide(id);
      }
    }

    if (data.content !== undefined) {
      const contentEl = panel.querySelector('.panel-content');
      if (contentEl) contentEl.textContent = data.content;
    }
    
    if (data.image !== undefined) {
      const imgEl = panel.querySelector('img');
      if (imgEl) {
        imgEl.src = data.image;
        imgEl.style.display = 'block';
      }
    }

    if (data.text !== undefined) {
      const textEl = panel.querySelector('.panel-text');
      if (textEl) textEl.textContent = data.text;
    }

    if (panelId === 'quest-start-panel') {
      this._handleQuestStart(panel, data);
    } else if (panelId === 'result-panel') {
      this._handleResult(panel, data);
    }

    panel.classList.add('open');
    this.activePanels.add(panelId);
    
    if (this.ui) {
      this.ui.log(`[PanelController] Show: ${panelId}`, 'ok');
    }
  }

  hide(panelId) {
    const panel = this.panels.get(panelId);
    if (panel) {
      panel.classList.remove('open');
      if (panelId === 'ar-scan-frame') {
        panel.classList.remove('visible', 'blink', 'effect');
      }
      this.activePanels.delete(panelId);
      
      if (this.ui) {
        this.ui.log(`[PanelController] Hide: ${panelId}`, 'info');
      }
    }
  }

  hideAll() {
    for (const id of this.activePanels) {
      this.hide(id);
    }
    this.activePanels.clear();
  }

  _handleQuestStart(panel, data) {
    const img = panel.querySelector('#quest-start-img');
    const text = panel.querySelector('#quest-start-text');
    
    if (img && data.image) {
      img.src = data.image;
      img.style.display = 'block';
    }
    if (text && data.text) {
      text.textContent = data.text;
    }
  }

  _handleResult(panel, data) {
    const sign = panel.querySelector('#result-sign');
    const text = panel.querySelector('#result-text');
    
    panel.classList.remove('result-ok', 'result-fail');
    if (data.isCorrect !== undefined) {
      panel.classList.add(data.isCorrect ? 'result-ok' : 'result-fail');
      if (sign) sign.textContent = data.isCorrect ? '✓' : '✕';
    }
    if (text && data.message) {
      text.textContent = data.message;
    }
  }

  showQuestStart(image, text = 'ИЩИТЕ!') {
    this.show('quest-start-panel', { image, text });
  }

  showResult(isCorrect, message, onClose) {
    this.show('result-panel', { isCorrect, message });
    if (onClose) {
      const closeBtn = document.getElementById('result-close-btn');
      if (closeBtn) {
        closeBtn.onclick = () => {
          this.hide('result-panel');
          onClose();
        };
      }
    }
  }

  showScanFrame(mode = 'blink') {
    const panel = this.panels.get('ar-scan-frame');
    if (!panel) return;
    
    panel.classList.remove('blink', 'effect');
    if (mode === 'blink') {
      panel.classList.add('visible', 'blink');
    } else if (mode === 'effect') {
      panel.classList.add('visible', 'effect');
    }
  }

  hideScanFrame() {
    this.hide('ar-scan-frame');
  }

  showCurtain() {
    this.show('curtain-panel');
    const text = document.querySelector('.curtain-text');
    if (text) text.classList.remove('ready');
  }

  hideCurtain() {
    this.hide('curtain-panel');
    const text = document.querySelector('.curtain-text');
    if (text) text.classList.add('ready');
  }
}
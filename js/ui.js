// js/ui.js
import { PanelController } from './panel-controller.js';
import { InputManager } from './input-manager.js';

export class UI {
  constructor() {
    this.logPanel = document.getElementById('log-panel');
    this.logToggle = document.getElementById('log-toggle');
    this.btnAr = document.getElementById('btn-ar');
    this.btnEndAr = document.getElementById('btn-end-ar');
    this.hint = document.getElementById('hint');
    this.preview = document.getElementById('target-preview');

    this.panels = new PanelController(this);
    this.input = new InputManager(this);

    this.logVisible = false;
    if (this.logPanel) this.logPanel.classList.add('collapsed');

    if (this.logToggle) {
      this.logToggle.addEventListener('click', () => {
        this.logVisible = !this.logVisible;
        this.logPanel.classList.toggle('collapsed', !this.logVisible);
      });
    }

    const closeBtn = document.getElementById('result-close-btn');
    if (closeBtn) {
      this.input.bindInteractive(closeBtn, 'ResultClose', () => {
        this.panels.hide('result-panel');
        if (this._onResultClose) {
          const cb = this._onResultClose;
          this._onResultClose = null;
          cb();
        }
      });
    }

    this._onResultClose = null;
  }

  showCurtain() { this.panels.showCurtain(); }
  hideCurtain() { this.panels.hideCurtain(); }
  
  showQuestStart(image, text) { this.panels.showQuestStart(image, text); }
  hideQuestStart() { this.panels.hide('quest-start-panel'); }
  
  showResult(isCorrect, message, onClose) { 
    this._onResultClose = onClose;
    this.panels.showResult(isCorrect, message, onClose);
  }
  hideResult() { 
    this.panels.hide('result-panel');
    this._onResultClose = null;
  }
  
  showScanFrameBlink() { this.panels.showScanFrame('blink'); }
  hideScanFrame() { this.panels.hideScanFrame(); }
  
  playScanEffect(onDone) {
    this.panels.showScanFrame('effect');
    setTimeout(() => {
      this.panels.hideScanFrame();
      if (onDone) onDone();
    }, 2000);
  }

  log(msg, type = '') {
    if (!this.logPanel) return;
    const div = document.createElement('div');
    div.className = 'entry ' + type;
    const now = new Date();
    const t = now.toLocaleTimeString('ru-RU', { hour12: false }) + '.' + String(now.getMilliseconds()).padStart(3, '0');
    div.textContent = `[${t}] ${msg}`;
    this.logPanel.appendChild(div);
    this.logPanel.scrollTop = this.logPanel.scrollHeight;
    console.log(`[${type || 'log'}] ${msg}`);
  }

  setHint(text) {
    if (this.hint) this.hint.textContent = text;
  }

  setPreview(src) {
    if (this.preview) {
      this.preview.src = src;
      this.preview.style.display = 'block';
    }
  }

  enableArButton() {
    if (this.btnAr) {
      this.btnAr.disabled = false;
      this.btnAr.style.display = 'block';
    }
    const text = document.querySelector('.curtain-text');
    if (text) text.classList.add('ready');
  }

  disableArButton() {
    if (this.btnAr) {
      this.btnAr.disabled = true;
      this.btnAr.style.display = 'none';
    }
  }

  showEndArButton() {
    if (this.btnEndAr) this.btnEndAr.style.display = 'block';
  }

  hideEndArButton() {
    if (this.btnEndAr) this.btnEndAr.style.display = 'none';
  }

  onStartAR(handler) {
    if (this.btnAr) this.btnAr.addEventListener('click', handler);
  }

  onEndAR(handler) {
    if (this.btnEndAr) this.btnEndAr.addEventListener('click', handler);
  }

  // Для обратной совместимости с кодом, который использует showDetectedObjectsInfo
  showDetectedObjectsInfo(detections) {
    this.log(`Detected: ${detections.map(d => d.label).join(', ')}`, 'info');
  }

  hideDetectedObjectsInfo() {
    // no-op
  }
}
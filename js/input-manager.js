// js/input-manager.js
import { playSound } from './audio.js';

export class InputManager {
  constructor(ui) {
    this.ui = ui;
    this.handlers = new Map();
  }

  bindInteractive(element, name, callback, options = {}) {
    if (!element) return null;
    
    element.style.pointerEvents = 'auto';
    element.style.touchAction = 'manipulation';
    if (options.cursor !== false) element.style.cursor = 'pointer';
    if (options.minSize) {
      element.style.minWidth = '44px';
      element.style.minHeight = '44px';
    }

    const handler = (e) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (e.cancelable) e.preventDefault();
      
      if (this.ui) {
        this.ui.log(`[InputManager] ${name} triggered via ${e.type}`, 'ok');
      }
      playSound('click');
      callback(e);
    };

    element.addEventListener('click', handler);
    element.addEventListener('pointerup', (e) => {
      if (e.button === 0) handler(e);
    });
    
    element.addEventListener('pointerdown', (e) => e.stopPropagation());
    element.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: false });

    this.handlers.set(name, { element, handler });
    return element;
  }

  bindPanel(panel, name) {
    if (!panel) return null;
    
    panel.style.pointerEvents = 'auto';
    panel.style.touchAction = 'manipulation';

    const interactiveSelector = [
      'button', 'input', 'textarea', 'select', 'a',
      '.ar-quest-btn', '.ar-quest-submit-btn', '.ar-slide-nav',
      '.ar-quest-input', '.ar-quest-ok-btn'
    ].join(',');

    const handler = (e) => {
      const isInteractive = !!e.target.closest(interactiveSelector);
      
      if (this.ui) {
        this.ui.log(
          `[InputManager] Panel '${name}' ${e.type} → ${isInteractive ? 'INTERACTIVE' : 'BLOCKED'}`,
          isInteractive ? 'ok' : 'info'
        );
      }

      if (!isInteractive) {
        e.stopPropagation();
      }
    };

    ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'click'].forEach((evt) => {
      panel.addEventListener(evt, handler, { passive: false });
    });

    this.handlers.set(`panel_${name}`, { element: panel, handler });
    return panel;
  }

  bindInput(input, name) {
    if (!input) return null;
    
    input.style.pointerEvents = 'auto';
    input.style.touchAction = 'manipulation';

    const handler = (e) => {
      if (this.ui) this.ui.log(`[InputManager] Input '${name}' ${e.type}`, 'info');
      e.stopPropagation();
    };

    ['click', 'pointerdown', 'touchstart', 'focus'].forEach((evt) => {
      input.addEventListener(evt, handler);
    });

    this.handlers.set(`input_${name}`, { element: input, handler });
    return input;
  }

  detachAll() {
    for (const [name, { element, handler }] of this.handlers) {
      if (element) {
        element.replaceWith(element.cloneNode(true));
      }
    }
    this.handlers.clear();
  }
}
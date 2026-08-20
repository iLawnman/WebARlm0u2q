import { UI } from './ui.js';
import { ImageRecognition } from './recognition.js';
import { ARScene } from './arscene.js';
import { playSound } from './audio.js';
import { Settings } from './settings.js';
import { ARSettings } from './arsettings.js';

export class App {
  constructor() {
    this.ui = new UI();
    this.settings = new Settings();
    this.arSettings = new ARSettings();
    this.recognition = null;
    this.arScene = new ARScene(this.ui);

    this.xrSession = null;
    this.imageTrackingEnabled = false;
    this.frameCount = 0;

    this.arScene.renderer.xr.setReferenceSpaceType('local-floor');

    this.init();
  }

  async init() {
    this.ui.log('App init (WebGL / Three.js WebXR)...', 'info');
    this.ui.showCurtain();

    this.ui.log('Loading AR CSS themes...', 'info');
    try {
      await this.arSettings.init();
      this.ui.log(
          `AR themes ready | count=${this.arSettings.getThemes().length} active=${this.arSettings.getActiveThemeId()}`,
          'ok'
      );
    } catch (e) {
      this.ui.log('AR themes failed: ' + (e && e.message ? e.message : e), 'warn');
    }

    this.ui.log('Loading settings...', 'info');
    await this.settings.load();
    if (this.settings.isLoaded) {
      this.ui.log(`Settings loaded | unique_targets=${this.settings.uniqueTargets}`, 'ok');
    } else {
      this.ui.log('Settings failed to load, using defaults', 'warn');
    }

    this.recognition = new ImageRecognition(this.ui, this.settings);
    await this.recognition.init();

    this.ui.onStartAR(() => this.startAR());
    this.ui.onEndAR(() => this.endAR());

    this.arScene.renderer.setAnimationLoop((timestamp, frame) => {
      this.onXRFrame(timestamp, frame);
    });
  }

  async startAR() {
    this.ui.disableArButton();
    this.ui.log('>>> Start AR clicked', 'info');

    if (!navigator.xr) {
      this.ui.log('navigator.xr missing', 'err');
      this.ui.setHint('WebXR не поддерживается');
      this.ui.enableArButton();
      return;
    }

    const supported = await navigator.xr.isSessionSupported('immersive-ar').catch(() => false);
    if (!supported) {
      this.ui.setHint('immersive-ar не поддерживается');
      this.ui.enableArButton();
      return;
    }

    const trackedImages = this.recognition.getTrackedImages(0.2);

    if (!trackedImages.length) {
      this.ui.log('No tracked images available', 'err');
      this.ui.setHint('Нет загруженных маркеров');
      this.ui.enableArButton();
      return;
    }

    // 1. Создаем общий контейнер-корень для WebXR Overlay
    let overlayRoot = document.getElementById('xr-overlay-container');
    if (!overlayRoot) {
      overlayRoot = document.createElement('div');
      overlayRoot.id = 'xr-overlay-container';
      overlayRoot.style.position = 'fixed';
      overlayRoot.style.top = '0';
      overlayRoot.style.left = '0';
      overlayRoot.style.width = '100vw';
      overlayRoot.style.height = '100vh';
      overlayRoot.style.pointerEvents = 'none';
      overlayRoot.style.zIndex = '99999';
      document.body.appendChild(overlayRoot);
    }

    // 2. Переносим CSS3D рендерер и элементы UI в root-контейнер overlay
    if (this.arScene.cssRenderer.domElement) {
      overlayRoot.appendChild(this.arScene.cssRenderer.domElement);
    }

    // Моделируем перенос UI элементов, чтобы они не пропадали во время AR сессии
    const uiElements = document.querySelectorAll('.ui-root, #ui-container, #app-ui, .ar-ui, #log-panel, #logs, .log-container');
    uiElements.forEach(el => {
      el.style.pointerEvents = 'auto'; // Разрешаем клики по UI
      overlayRoot.appendChild(el);
    });

    // Добавляем глобальный захват касаний для диагностики до прохождения в Canvas/WebXR
    this._touchHandler = (e) => {
      const touch = e.touches[0];
      if (touch) {
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        const tag = target ? `${target.tagName}.${target.className}` : 'null';
        this.ui.log(`[TouchStart] (${Math.round(touch.clientX)},${Math.round(touch.clientY)}) -> ${tag}`, 'info');
      }
    };
    window.addEventListener('touchstart', this._touchHandler, { capture: true, passive: true });

    const sessionInit = {
      requiredFeatures: ['local-floor'],
      optionalFeatures: ['image-tracking', 'dom-overlay', 'anchors'],
      trackedImages,
      domOverlay: { root: overlayRoot }
    };

    try {
      this.xrSession = await navigator.xr.requestSession('immersive-ar', sessionInit);
      this.ui.log('WebXR Session initialized with Overlay Root', 'ok');
    } catch (e) {
      this.ui.log('DOM Overlay failed, fallback session: ' + e.message, 'warn');
      try {
        this.xrSession = await navigator.xr.requestSession('immersive-ar', {
          requiredFeatures: ['local-floor'],
          optionalFeatures: ['image-tracking'],
          trackedImages
        });
      } catch (e2) {
        this.ui.log('Session request FAILED: ' + e2.message, 'err');
        this.ui.setHint('Ошибка запуска AR: ' + e2.message);
        this.ui.enableArButton();
        return;
      }
    }

    this.xrSession.addEventListener('selectstart', () => {
      this.ui.log('[XR] selectstart fired', 'info');
    });

    await this.arScene.renderer.xr.setSession(this.xrSession);

    this.ui.showEndArButton();
    this.imageTrackingEnabled = true;

    this.recognition.attachInput(this.xrSession, this.arScene);
    this.ui.hideCurtain();
    this.recognition.presentSearchPrompt();

    this.xrSession.addEventListener('end', () => {
      this.ui.log('Session ended', 'warn');
      
      if (this._touchHandler) {
        window.removeEventListener('touchstart', this._touchHandler, { capture: true });
      }

      // Возвращаем UI элементы обратно в body при завершении
      uiElements.forEach(el => document.body.appendChild(el));

      this.imageTrackingEnabled = false;
      this.recognition.detachInput();
      this.recognition.reset(this.arScene);
      this.xrSession = null;
      this.frameCount = 0;

      this.ui.hideEndArButton();
      this.ui.enableArButton();
      this.ui.showCurtain();
    });
  }

  async endAR() {
    if (this.xrSession) {
      await this.xrSession.end();
    }
  }

  onXRFrame(timestamp, frame) {
    if (!frame) {
      this.arScene.render();
      return;
    }

    this.frameCount++;

    if (this.imageTrackingEnabled) {
      const refSpace = this.arScene.renderer.xr.getReferenceSpace();
      if (refSpace) {
        this.recognition.processTracking(frame, refSpace, this.frameCount, this.arScene);
      }
    }

    this.arScene.render();
  }
}

new App();
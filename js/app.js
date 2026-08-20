import { UI } from './ui.js';
import { ImageRecognition } from './recognition.js';
import { ARScene } from './arscene.js';
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

    // Создаем или получаем изолированный контейнер для WebXR Overlay
    let overlayRoot = document.getElementById('xr-overlay-container');
    if (!overlayRoot) {
      overlayRoot = document.createElement('div');
      overlayRoot.id = 'xr-overlay-container';
      overlayRoot.style.position = 'absolute';
      overlayRoot.style.top = '0';
      overlayRoot.style.left = '0';
      overlayRoot.style.width = '100%';
      overlayRoot.style.height = '100%';
      overlayRoot.style.pointerEvents = 'none';
      overlayRoot.style.zIndex = '999';
      document.body.appendChild(overlayRoot);
    }

    // Перемещаем элемент CSS3D рендерера в overlay Root
    if (this.arScene.cssRenderer.domElement) {
      overlayRoot.appendChild(this.arScene.cssRenderer.domElement);
    }

    const sessionInit = {
      requiredFeatures: ['local-floor'],
      optionalFeatures: ['image-tracking', 'dom-overlay', 'anchors'],
      trackedImages,
      domOverlay: { root: overlayRoot }
    };

    try {
      this.xrSession = await navigator.xr.requestSession('immersive-ar', sessionInit);
      this.ui.log('WebXR Session initialized with DOM Overlay root', 'ok');
    } catch (e) {
      this.ui.log('DOM Overlay failed, fallback to standard session: ' + e.message, 'warn');
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

    // Добавляем глобальный обработчик выбора WebXR (Select / Tap в AR)
    this.xrSession.addEventListener('selectstart', (e) => {
      this.ui.log('[XR Event] selectstart fired (Tap detected in AR)', 'info');
    });

    this.xrSession.addEventListener('select', (e) => {
      this.ui.log('[XR Event] select fired', 'ok');
    });

    // Навешиваем прямое логирование тачей на уровень всего окна для проверки блокировок
    window.addEventListener('touchstart', (e) => {
      const target = e.touches[0] ? document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY) : null;
      this.ui.log(`[Raw TouchStart] Target: ${target ? target.tagName + '.' + target.className : 'null'}`, 'info');
    }, { capture: true, passive: true });

    await this.arScene.renderer.xr.setSession(this.xrSession);

    this.ui.showEndArButton();
    this.imageTrackingEnabled = true;

    this.recognition.attachInput(this.xrSession, this.arScene);
    this.ui.hideCurtain();
    this.recognition.presentSearchPrompt();

    this.xrSession.addEventListener('end', () => {
      this.ui.log('Session ended', 'warn');
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
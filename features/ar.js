(function() {
  'use strict';

  const startBtn = document.getElementById('start-ar-btn');
  const unsupportedDiv = document.getElementById('unsupported');
  const hintDiv = document.getElementById('hint');

  let xrSession = null;
  let gl = null;
  let xrRefSpace = null;

  // Проверка поддержки WebXR
  async function checkXRSupport() {
    if (!navigator.xr) {
      console.error('WebXR не поддерживается браузером');
      unsupportedDiv.style.display = 'flex';
      startBtn.disabled = true;
      return false;
    }

    try {
      const supported = await navigator.xr.isSessionSupported('immersive-ar');
      if (!supported) {
        console.error('immersive-ar не поддерживается');
        unsupportedDiv.style.display = 'flex';
        startBtn.disabled = true;
        return false;
      }
      console.log('✅ WebXR AR поддерживается');
      return true;
    } catch (err) {
      console.error('Ошибка проверки WebXR:', err);
      unsupportedDiv.style.display = 'flex';
      startBtn.disabled = true;
      return false;
    }
  }

  // Запуск AR сессии
  async function startAR() {
    try {
      console.log('Запуск AR сессии...');
      
      xrSession = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test', 'local-floor'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.body }
      });

      console.log('✅ AR сессия запущена');

      // Настройка WebGL
      const canvas = document.createElement('canvas');
      gl = canvas.getContext('webgl2', { xrCompatible: true });
      
      if (!gl) {
        gl = canvas.getContext('webgl', { xrCompatible: true });
      }

      if (!gl) {
        throw new Error('WebGL не поддерживается');
      }

      await xrSession.updateRenderState({
        baseLayer: new XRWebGLLayer(xrSession, gl)
      });

      xrRefSpace = await xrSession.requestReferenceSpace('local-floor');

      // Скрыть UI элементы
      document.body.classList.add('ar-active');
      hintDiv.style.display = 'none';

      // Обработчик окончания сессии
      xrSession.addEventListener('end', onSessionEnd);

      // Запуск цикла рендеринга
      xrSession.requestAnimationFrame(onXRFrame);

      console.log('✅ AR инициализирован');

    } catch (err) {
      console.error('Ошибка запуска AR:', err);
      alert('Не удалось запустить AR: ' + err.message);
    }
  }

  // Цикл рендеринга
  function onXRFrame(time, frame) {
    if (!xrSession) return;

    xrSession.requestAnimationFrame(onXRFrame);

    const pose = frame.getViewerPose(xrRefSpace);
    if (!pose) return;

    const glLayer = xrSession.renderState.baseLayer;
    gl.bindFramebuffer(gl.FRAMEBUFFER, glLayer.framebuffer);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Здесь будет рендеринг Three.js сцены
    // for (const view of pose.views) {
    //   const viewport = glLayer.getViewport(view);
    //   gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
    //   // Рендеринг сцены для каждого глаза
    // }
  }

  // Окончание сессии
  function onSessionEnd() {
    console.log('AR сессия завершена');
    xrSession = null;
    document.body.classList.remove('ar-active');
    hintDiv.style.display = 'block';
  }

  // Обработчик клика на кнопку
  startBtn.addEventListener('click', async () => {
    const supported = await checkXRSupport();
    if (supported) {
      await startAR();
    }
  });

  // Инициализация при загрузке
  window.addEventListener('load', () => {
    console.log('AR модуль загружен');
    checkXRSupport();
  });

})();
// arindex.js
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { UIPanel, UIButton, UIText } from 'three-mesh-ui';

// --- Глобальные переменные ---
let scene, camera, renderer;
let cube, edges, reticle;
let mainPanel, fixedPanel;
let placed = false;
let hitTestSource = null;
let hitTestSourceRequested = false;
let font = null;
let currentSession = null;

// Raycaster для обработки кликов по UI в WebXR
const raycaster = new THREE.Raycaster();
const tempMatrix = new THREE.Matrix4();

init();

async function init() {
  const webglContainer = document.getElementById('webgl-container');
  const hint = document.getElementById('hint');
  const unsupportedEl = document.getElementById('unsupported');
  const startBtn = document.getElementById('start-ar-btn');

  // 1. Проверка WebXR
  if (!('xr' in navigator)) {
    unsupportedEl.style.display = 'flex';
    startBtn.disabled = true;
    startBtn.textContent = 'WebXR не поддерживается';
    return;
  }

  let supported = false;
  try {
    supported = await navigator.xr.isSessionSupported('immersive-ar');
  } catch (e) {
    console.error('XR support check failed:', e);
  }

  if (!supported) {
    unsupportedEl.style.display = 'flex';
    startBtn.disabled = true;
    startBtn.textContent = 'AR не поддерживается';
    return;
  }

  // 2. Загрузка шрифта для three-mesh-ui (ОБЯЗАТЕЛЬНО до создания панелей!)
  const loader = new FontLoader();
  try {
    font = await new Promise((resolve, reject) => {
      loader.load(
        'https://unpkg.com/three@0.160.0/examples/fonts/helvetiker_regular.typeface.json',
        resolve,
        undefined,
        reject
      );
    });
    console.log('✅ Шрифт загружен');
  } catch (err) {
    console.error('❌ Не удалось загрузить шрифт:', err);
  }

  // 3. Сцена и Камера
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

  // 4. WebGL Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  webglContainer.appendChild(renderer.domElement);

  // 5. Кнопка Start AR (кастомная, не ARButton)
  startBtn.addEventListener('click', startARSession);

  // 6. Свет
  scene.add(new THREE.HemisphereLight(0xffffff, 0x333344, 1.2));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(2, 4, 2);
  scene.add(dirLight);

  // 7. Ретикул (маркер на полу)
  const reticleGeometry = new THREE.RingGeometry(0.08, 0.1, 32).rotateX(-Math.PI / 2);
  const reticleMaterial = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
  reticle = new THREE.Mesh(reticleGeometry, reticleMaterial);
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  // 8. Куб
  const cubeSize = 0.18;
  cube = new THREE.Mesh(
    new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize),
    new THREE.MeshStandardMaterial({
      color: 0x6366f1,
      metalness: 0.3,
      roughness: 0.35,
      emissive: 0x1e1b4b,
      emissiveIntensity: 0.4
    })
  );
  cube.visible = false;
  scene.add(cube);

  edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(cube.geometry),
    new THREE.LineBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.7 })
  );
  edges.visible = false;
  scene.add(edges);

  // 9. Создание UI Панелей (только если шрифт загружен)
  if (font) {
    createUIPanels();
  } else {
    console.warn('Панели не созданы — шрифт не загружен');
  }

  // 10. Обработчики событий сессии
  renderer.xr.addEventListener('sessionstart', () => {
    document.body.classList.add('ar-active');
    placed = false;
    cube.visible = false;
    edges.visible = false;
    reticle.visible = false;
    if (mainPanel) mainPanel.visible = false;
    if (fixedPanel) fixedPanel.visible = false;
    hitTestSourceRequested = false;
    hitTestSource = null;
    hint.style.display = 'block';
  });

  renderer.xr.addEventListener('sessionend', () => {
    document.body.classList.remove('ar-active');
    currentSession = null;
    hitTestSource = null;
    hitTestSourceRequested = false;
  });

  // 11. Размещение по тапу
  const controller = renderer.xr.getController(0);
  controller.addEventListener('select', onSelect);
  scene.add(controller);

  // 12. Ресайз
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // 13. Запуск цикла анимации
  renderer.setAnimationLoop(animate);
}

// --- Запуск AR сессии ---
async function startARSession() {
  const startBtn = document.getElementById('start-ar-btn');
  startBtn.disabled = true;
  startBtn.textContent = '⏳ Запуск...';

  try {
    const sessionInit = {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['local-floor', 'dom-overlay'],
      domOverlay: { root: document.body }
    };

    const session = await navigator.xr.requestSession('immersive-ar', sessionInit);
    currentSession = session;

    session.addEventListener('end', () => {
      startBtn.disabled = false;
      startBtn.textContent = '▶ START AR';
    });

    await renderer.xr.setSession(session);
    console.log('✅ AR сессия запущена');
  } catch (err) {
    console.error('❌ Не удалось запустить AR:', err);
    startBtn.disabled = false;
    startBtn.textContent = '▶ START AR';
    alert('Не удалось запустить AR: ' + err.message);
  }
}

// --- Создание UI Панелей ---
function createUIPanels() {
  // --- ПАНЕЛЬ 1: Основная (поворачивается к камере) ---
  mainPanel = new UIPanel({
    width: 0.5,
    height: 0.35,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundOpacity: 0.9,
    backgroundColor: new THREE.Color(0x0b1120),
    borderRadius: 0.02,
    fontFamily: font,
    fontSize: 0.025,
    fontColor: new THREE.Color(0xe2e8f0),
    padding: 0.02
  });
  mainPanel.visible = false;
  scene.add(mainPanel);

  // Кнопка внутри основной панели
  const testBtn = new UIButton({
    width: 0.4,
    height: 0.08,
    backgroundColor: new THREE.Color(0x6366f1),
    hoverColor: new THREE.Color(0x4f46e5),
    borderRadius: 0.01,
    fontFamily: font,
    fontSize: 0.022,
    fontColor: new THREE.Color(0xffffff)
  });
  testBtn.add(new UIText({ content: 'Test click' }));

  testBtn.addEventListener('click', () => {
    console.log('✅ Клик по three-mesh-ui кнопке сработал!');
  });

  mainPanel.add(testBtn);

  // --- ПАНЕЛЬ 2: Фиксированная (НЕ поворачивается к камере) ---
  fixedPanel = new UIPanel({
    width: 0.35,
    height: 0.22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundOpacity: 0.9,
    backgroundColor: new THREE.Color(0x0f172a),
    borderColor: new THREE.Color(0x06b6d4),
    borderWidth: 0.004,
    borderRadius: 0.02,
    fontFamily: font,
    fontSize: 0.02,
    fontColor: new THREE.Color(0x67e8f9),
    padding: 0.02,
    textAlign: 'center'
  });
  fixedPanel.visible = false;

  fixedPanel.add(new UIText({
    content: 'Fixed panel'
  }));
  fixedPanel.add(new UIText({
    content: 'Rotation is locked',
    fontSize: 0.015,
    fontColor: new THREE.Color(0x94a3b8)
  }));

  scene.add(fixedPanel);
}

// --- Размещение объектов по тапу ---
function onSelect() {
  if (!reticle.visible) return;

  cube.position.setFromMatrixPosition(reticle.matrix);
  cube.position.y += 0.09;
  edges.position.copy(cube.position);
  cube.visible = true;
  edges.visible = true;

  if (mainPanel) {
    mainPanel.position.set(cube.position.x, cube.position.y + 0.28, cube.position.z);
    mainPanel.visible = true;
  }

  if (fixedPanel) {
    fixedPanel.position.set(cube.position.x + 0.4, cube.position.y + 0.15, cube.position.z);
    // ЖЁСТКАЯ ФИКСАЦИЯ ПОВОРОТА
    fixedPanel.rotation.set(0, 0, 0);
    fixedPanel.visible = true;
  }

  placed = true;
  document.getElementById('hint').style.display = 'none';
}

// --- Цикл анимации ---
function animate(timestamp, frame) {
  if (frame) {
    const session = renderer.xr.getSession();
    const referenceSpace = renderer.xr.getReferenceSpace();

    if (!hitTestSourceRequested && session) {
      session.requestReferenceSpace('viewer').then((viewerSpace) => {
        session.requestHitTestSource({ space: viewerSpace }).then((source) => {
          hitTestSource = source;
        });
      });
      session.addEventListener('end', () => {
        hitTestSourceRequested = false;
        hitTestSource = null;
      });
      hitTestSourceRequested = true;
    }

    if (hitTestSource) {
      const hitTestResults = frame.getHitTestResults(hitTestSource);
      if (hitTestResults.length > 0 && !placed) {
        const hit = hitTestResults[0];
        const pose = hit.getPose(referenceSpace);
        reticle.visible = true;
        reticle.matrix.fromArray(pose.transform.matrix);
      } else if (!placed) {
        reticle.visible = false;
      }
    }
  }

  if (placed) {
    // ПАНЕЛЬ 1: Поворачивается к камере (billboard)
    if (mainPanel) {
      mainPanel.lookAt(camera.position);
    }

    // ПАНЕЛЬ 2: НЕ поворачивается — её rotation остаётся (0, 0, 0)

    // Обновляем raycaster для XR контроллера
    const controller = renderer.xr.getController(0);
    if (controller) {
      controller.updateMatrixWorld();
      tempMatrix.identity().extractRotation(controller.matrixWorld);
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

      // Обновляем UI (нужно для работы hover/click)
      if (mainPanel) mainPanel.update(timestamp, raycaster);
      if (fixedPanel) fixedPanel.update(timestamp, raycaster);
    }
  }

  renderer.render(scene, camera);
}
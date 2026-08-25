import * as THREE from 'three';
import * as ThreeMeshUI from 'three-mesh-ui';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';

let scene, camera, renderer;
let cube, edges, reticle;
let mainPanel, fixedPanel, testButton;
let placed = false;
let hitTestSource = null;
let hitTestSourceRequested = false;
let font = null;

const raycaster = new THREE.Raycaster();
const tempMatrix = new THREE.Matrix4();

init();

async function init() {
  console.log('🚀 Инициализация...');

  const webglContainer = document.getElementById('webgl-container');
  const hint = document.getElementById('hint');
  const unsupportedEl = document.getElementById('unsupported');
  const startBtn = document.getElementById('start-ar-btn');

  if (!('xr' in navigator)) {
    console.error('❌ WebXR не поддерживается');
    unsupportedEl.style.display = 'flex';
    startBtn.disabled = true;
    return;
  }

  let supported = false;
  try {
    supported = await navigator.xr.isSessionSupported('immersive-ar');
    console.log('✅ immersive-ar:', supported);
  } catch (e) {
    console.error('❌ Ошибка проверки XR:', e);
  }

  if (!supported) {
    unsupportedEl.style.display = 'flex';
    startBtn.disabled = true;
    return;
  }

  // Загрузка шрифта
  const loader = new FontLoader();
  try {
    font = await new Promise((resolve, reject) => {
      loader.load(
        'https://unpkg.com/three-mesh-ui@6.5.4/examples/assets/Roboto-msdf.json',
        resolve,
        undefined,
        reject
      );
    });
    console.log('✅ Шрифт загружен');
  } catch (err) {
    console.error('❌ Ошибка загрузки шрифта:', err);
    return;
  }

  // Сцена и камера
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  webglContainer.appendChild(renderer.domElement);
  console.log('✅ Renderer создан');

  // Кнопка Start AR
  startBtn.addEventListener('click', startARSession);

  // Свет
  scene.add(new THREE.HemisphereLight(0xffffff, 0x333344, 1.2));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(2, 4, 2);
  scene.add(dirLight);

  // Ретикул
  const reticleGeometry = new THREE.RingGeometry(0.08, 0.1, 32).rotateX(-Math.PI / 2);
  const reticleMaterial = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
  reticle = new THREE.Mesh(reticleGeometry, reticleMaterial);
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  // Куб
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

  // UI панели
  createUIPanels();

  // События сессии
  renderer.xr.addEventListener('sessionstart', () => {
    console.log('✅ AR сессия запущена');
    document.body.classList.add('ar-active');
    placed = false;
    cube.visible = false;
    edges.visible = false;
    reticle.visible = false;
    if (mainPanel) mainPanel.visible = false;
    if (fixedPanel) fixedPanel.visible = false;
    hitTestSourceRequested = false;
    hitTestSource = null;
  });

  renderer.xr.addEventListener('sessionend', () => {
    console.log('🔚 AR сессия завершена');
    document.body.classList.remove('ar-active');
    hitTestSource = null;
    hitTestSourceRequested = false;
    startBtn.disabled = false;
    startBtn.textContent = '▶ START AR';
  });

  // Контроллер
  const controller = renderer.xr.getController(0);
  controller.addEventListener('select', onSelect);
  scene.add(controller);

  // Ресайз
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  renderer.setAnimationLoop(animate);
  console.log('✅ Инициализация завершена');
}

async function startARSession() {
  const startBtn = document.getElementById('start-ar-btn');
  startBtn.disabled = true;
  startBtn.textContent = '⏳ Запуск...';
  console.log('🔄 Запуск AR сессии...');

  try {
    const session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test', 'local-floor'],
      optionalFeatures: ['dom-overlay'],
      domOverlay: { root: document.body }
    });

    console.log('✅ Сессия получена');
    await renderer.xr.setSession(session);
    console.log('✅ Сессия установлена');
  } catch (err) {
    console.error('❌ Ошибка запуска AR:', err);
    startBtn.disabled = false;
    startBtn.textContent = '▶ START AR';
    alert('Не удалось запустить AR: ' + err.message);
  }
}

function createUIPanels() {
  console.log('🎨 Создание UI панелей...');

  // === ПАНЕЛЬ 1: Основная ===
  mainPanel = new ThreeMeshUI.Block({
    fontFamily: font,
    fontSize: 0.05,
    width: 0.5,
    height: 0.35,
    backgroundColor: new THREE.Color(0x0b1120),
    backgroundOpacity: 0.9,
    borderRadius: 0.02,
    padding: 0.02,
    justifyContent: 'center',
    alignItems: 'center'
  });
  mainPanel.visible = false;
  scene.add(mainPanel);

  const title = new ThreeMeshUI.Inline({
    content: 'Main Panel',
    fontColor: new THREE.Color(0xe2e8f0),
    fontSize: 0.06,
    textAlign: 'center'
  });
  mainPanel.add(title);

  // Кнопка
  testButton = new ThreeMeshUI.Block({
    width: 0.4,
    height: 0.08,
    backgroundColor: new THREE.Color(0x6366f1),
    borderRadius: 0.01,
    marginTop: 0.03,
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer'
  });

  const btnText = new ThreeMeshUI.Inline({
    content: 'Test Click',
    fontColor: new THREE.Color(0xffffff),
    fontSize: 0.045
  });
  testButton.add(btnText);

  testButton.onClick = () => {
    console.log('✅ Клик по UI кнопке!');
    testButton.backgroundColor = new THREE.Color(0x4f46e5);
    setTimeout(() => {
      testButton.backgroundColor = new THREE.Color(0x6366f1);
    }, 150);
  };

  testButton.onHover = (isHovered) => {
    if (isHovered) {
      testButton.backgroundColor = new THREE.Color(0x5558e8);
    } else {
      testButton.backgroundColor = new THREE.Color(0x6366f1);
    }
  };

  mainPanel.add(testButton);

  // === ПАНЕЛЬ 2: Фиксированная ===
  fixedPanel = new ThreeMeshUI.Block({
    fontFamily: font,
    fontSize: 0.05,
    width: 0.35,
    height: 0.22,
    backgroundColor: new THREE.Color(0x0f172a),
    backgroundOpacity: 0.9,
    borderColor: new THREE.Color(0x06b6d4),
    borderWidth: 0.004,
    borderRadius: 0.02,
    padding: 0.02,
    justifyContent: 'center',
    alignItems: 'center'
  });
  fixedPanel.visible = false;

  const fixedTitle = new ThreeMeshUI.Inline({
    content: 'Fixed Panel',
    fontColor: new THREE.Color(0x67e8f9),
    fontSize: 0.055,
    textAlign: 'center'
  });
  fixedPanel.add(fixedTitle);

  const fixedText = new ThreeMeshUI.Inline({
    content: 'Rotation locked',
    fontColor: new THREE.Color(0x94a3b8),
    fontSize: 0.035,
    textAlign: 'center',
    marginTop: 0.02
  });
  fixedPanel.add(fixedText);

  scene.add(fixedPanel);

  console.log('✅ Панели созданы');
}

function onSelect() {
  console.log('👆 Tap, reticle visible:', reticle.visible);
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
    fixedPanel.rotation.set(0, 0, 0);
    fixedPanel.visible = true;
  }

  placed = true;
  console.log('✅ Объекты размещены');
}

function animate(timestamp, frame) {
  if (frame) {
    const session = renderer.xr.getSession();
    const referenceSpace = renderer.xr.getReferenceSpace();

    if (!hitTestSourceRequested && session) {
      session.requestReferenceSpace('viewer').then((viewerSpace) => {
        session.requestHitTestSource({ space: viewerSpace }).then((source) => {
          hitTestSource = source;
          console.log('✅ Hit-test source получен');
        });
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
    if (mainPanel) mainPanel.lookAt(camera.position);

    const controller = renderer.xr.getController(0);
    if (controller) {
      controller.updateMatrixWorld();
      tempMatrix.identity().extractRotation(controller.matrixWorld);
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

      if (mainPanel) mainPanel.update(timestamp, raycaster);
      if (fixedPanel) fixedPanel.update(timestamp, raycaster);
    }
  }

  renderer.render(scene, camera);
}
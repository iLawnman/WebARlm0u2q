// arindex.js
import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { UIPanel, UIButton, UIText } from 'three-mesh-ui';

// --- Глобальные переменные ---
let scene, camera, renderer, cssRenderer;
let cube, edges, reticle;
let mainPanel, fixedPanel;
let placed = false;
let hitTestSource = null;
let hitTestSourceRequested = false;
let font = null;

// Raycaster для обработки кликов по UI в WebXR
const raycaster = new THREE.Raycaster();
const tempMatrix = new THREE.Matrix4();

init();

async function init() {
  const webglContainer = document.getElementById('webgl-container');
  const hint = document.getElementById('hint');
  const unsupportedEl = document.getElementById('unsupported');
  const arButtonContainer = document.getElementById('ar-button-container');

  // 1. Проверка WebXR
  if (!('xr' in navigator)) {
    unsupportedEl.style.display = 'flex';
    return;
  }
  const supported = await navigator.xr.isSessionSupported('immersive-ar');
  if (!supported) {
    unsupportedEl.style.display = 'flex';
    return;
  }

  // 2. Загрузка шрифта для three-mesh-ui (обязательно!)
  const loader = new FontLoader();
  font = await loader.loadAsync('https://unpkg.com/three-mesh-ui@6.5.2/examples/assets/Roboto-msdf.json');

  // 3. Сцена и Камера
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

  // 4. WebGL Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  webglContainer.appendChild(renderer.domElement);

  // 5. Кнопка AR
  const arButton = ARButton.createButton(renderer, {
    requiredFeatures: ['hit-test'],
    optionalFeatures: ['local-floor']
  });
  arButtonContainer.appendChild(arButton);

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
    new THREE.MeshStandardMaterial({ color: 0x6366f1, metalness: 0.3, roughness: 0.35, emissive: 0x1e1b4b, emissiveIntensity: 0.4 })
  );
  cube.visible = false;
  scene.add(cube);

  edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(cube.geometry),
    new THREE.LineBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.7 })
  );
  edges.visible = false;
  scene.add(edges);

  // 9. Создание UI Панелей (изначально скрыты)
  createUIPanels();

  // 10. Обработчики событий сессии
  renderer.xr.addEventListener('sessionstart', () => {
    placed = false;
    cube.visible = false;
    edges.visible = false;
    reticle.visible = false;
    mainPanel.visible = false;
    fixedPanel.visible = false;
    hitTestSourceRequested = false;
    hitTestSource = null;
    hint.style.display = 'block';
  });

  renderer.xr.addEventListener('sessionend', () => {
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

function createUIPanels() {
  // --- ПАНЕЛЬ 1: Основная (будет поворачиваться к камере) ---
  mainPanel = new UIPanel({
    width: 0.5,       // 50 см
    height: 0.35,     // 35 см
    justifyContent: 'center',
    alignItems: 'center',
    backgroundOpacity: 0.85,
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
    borderRadius: 0.01,
    fontFamily: font,
    fontSize: 0.022
  });
  testBtn.add(new UIText({ content: '🧪 Тест клика по UI' }));
  
  // Обработка клика по кнопке
  testBtn.addEventListener('click', () => {
    console.log('✅ Клик по three-mesh-ui кнопке сработал!');
    // Визуальный фидбек (можно добавить изменение текста)
  });
  
  mainPanel.add(testBtn);

  // --- ПАНЕЛЬ 2: Фиксированная (НЕ поворачивается к камере) ---
  fixedPanel = new UIPanel({
    width: 0.35,      // 35 см
    height: 0.25,     // 25 см
    justifyContent: 'center',
    alignItems: 'center',
    backgroundOpacity: 0.85,
    backgroundColor: new THREE.Color(0x0f172a),
    borderColor: new THREE.Color(0x06b6d4),
    borderWidth: 0.005,
    borderRadius: 0.02,
    fontFamily: font,
    fontSize: 0.022,
    fontColor: new THREE.Color(0x67e8f9),
    padding: 0.02,
    textAlign: 'center'
  });
  fixedPanel.visible = false;
  
  fixedPanel.add(new UIText({ 
    content: '📌 Фиксированная панель\n\nМой поворот в пространстве\nжестко задан и не меняется\nпри движении камеры.' 
  }));
  
  scene.add(fixedPanel);
}

function onSelect() {
  if (!reticle.visible) return;

  // Размещаем куб
  cube.position.setFromMatrixPosition(reticle.matrix);
  cube.position.y += 0.09; // половина высоты куба
  edges.position.copy(cube.position);
  cube.visible = true;
  edges.visible = true;

  // Размещаем Панель 1 (чуть выше куба)
  mainPanel.position.set(cube.position.x, cube.position.y + 0.28, cube.position.z);
  mainPanel.visible = true;

  // Размещаем Панель 2 (со смещением вправо)
  fixedPanel.position.set(cube.position.x + 0.4, cube.position.y + 0.15, cube.position.z);
  
  // ЖЕСТКАЯ ФИКСАЦИЯ ПОВОРОТА ВТОРОЙ ПАНЕЛИ
  // Мы явно задаем rotation и НИКОГДА не вызываем для неё lookAt()
  fixedPanel.rotation.set(0, 0, 0); 
  fixedPanel.visible = true;

  placed = true;
  document.getElementById('hint').style.display = 'none';
}

function animate(timestamp, frame) {
  if (frame) {
    const session = renderer.xr.getSession();
    const referenceSpace = renderer.xr.getReferenceSpace();

    if (!hitTestSourceRequested) {
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
      } else {
        reticle.visible = false;
      }
    }
  }

  if (placed) {
    // 1. ПАНЕЛЬ 1: Поворачивается к камере (Billboard эффект)
    mainPanel.lookAt(camera.position);

    // 2. ПАНЕЛЬ 2: НЕ поворачивается. Её rotation остался тем, что мы задали при размещении (0, 0, 0).

    // 3. Обновляем Raycaster для WebXR контроллера (чтобы работали клики по кнопкам)
    const controller = renderer.xr.getController(0);
    controller.updateMatrixWorld();
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    // 4. Обновляем состояние UI (анимации кнопок, hover, клики)
    mainPanel.update(timestamp, raycaster);
    fixedPanel.update(timestamp, raycaster);
  }

  renderer.render(scene, camera);
}
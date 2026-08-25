// arindex.js
import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { checkAssetFiles } from './convertor.js';

const webglContainer = document.getElementById('webgl-container');
const hint = document.getElementById('hint');
const unsupportedEl = document.getElementById('unsupported');
const arOverlay = document.getElementById('ar-overlay');
const placeHint = document.getElementById('place-hint');
const arButtonContainer = document.getElementById('ar-button-container');
const convertorTriggerBtn = document.getElementById('convertor-trigger-btn');
const convertorPanelsContainer = document.getElementById('convertor-panels-container');
const cssContainer = document.getElementById('css-container');

const anchorPanel = document.getElementById('anchor-panel');
const debugBtn = document.getElementById('debug-btn');
const debugLog = document.getElementById('debug-log');
const secondPanel = document.getElementById('second-panel');

let debugClickCount = 0;
function logToOverlay(message) {
  debugClickCount += 1;
  const time = new Date().toLocaleTimeString('ru-RU', { hour12: false });
  const line = document.createElement('div');
  line.className = 'log-line';
  line.textContent = `[${time}] #${debugClickCount} ${message}`;
  if (debugLog.querySelector('.log-empty')) debugLog.innerHTML = '';
  debugLog.prepend(line);
  console.log('[AR DOM Overlay]', message);
}

debugBtn.addEventListener('click', () => {
  logToOverlay('Клик по кнопке в WebXR DOM Overlay сработал ✅');
});

// ---------- Хранилище динамических панелей ----------
const anchoredPanels = new Map();
const anchoredPanelObjects = new Map(); // Храним соответствующие CSS3DObject

function addAnchoredPanel(panelElement, anchorPosition) {
  const id = `panel-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  panelElement.classList.add('ar-anchored-panel');
  convertorPanelsContainer.appendChild(panelElement);
  
  // 1. Создаем CSS3DObject для новой панели
  const cssObj = new CSS3DObject(panelElement);
  cssObj.position.copy(anchorPosition);
  scene.add(cssObj);
  
  const panelData = {
    element: panelElement,
    cssObject: cssObj,
    anchorPosition: anchorPosition.clone(),
    visible: true
  };
  anchoredPanels.set(id, panelData);
  anchoredPanelObjects.set(id, cssObj);
  return id;
}

function removeAnchoredPanel(id) {
  const data = anchoredPanels.get(id);
  if (data) {
    data.element.remove();
    scene.remove(data.cssObject);
    anchoredPanels.delete(id);
    anchoredPanelObjects.delete(id);
  }
}

let interacting = false;
function setupPanelInteraction(panelElement) {
  panelElement.addEventListener('pointerdown', () => { interacting = true; });
  panelElement.addEventListener('touchstart', () => { interacting = true; }, { passive: true });
  panelElement.addEventListener('pointerup', () => { interacting = false; });
  panelElement.addEventListener('pointercancel', () => { interacting = false; });
  panelElement.addEventListener('touchend', () => { interacting = false; }, { passive: true });
  panelElement.addEventListener('touchcancel', () => { interacting = false; }, { passive: true });
}

setupPanelInteraction(anchorPanel);
setupPanelInteraction(secondPanel);

const panelIframe = anchorPanel.querySelector('iframe');
panelIframe.addEventListener('load', () => {
  try {
    const doc = panelIframe.contentDocument;
    doc.addEventListener('touchstart', () => { interacting = true; }, { passive: true });
    doc.addEventListener('touchend', () => { interacting = false; }, { passive: true });
    doc.addEventListener('touchcancel', () => { interacting = false; }, { passive: true });
    doc.addEventListener('pointerdown', () => { interacting = true; });
    doc.addEventListener('pointerup', () => { interacting = false; });
  } catch (err) {
    console.warn('Could not attach listeners inside iframe (cross-origin?)', err);
  }
});

// ---------- WebXR support check ----------
if (!('xr' in navigator)) {
  unsupportedEl.style.display = 'flex';
} else {
  navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
    if (!supported) unsupportedEl.style.display = 'flex';
  }).catch(() => { unsupportedEl.style.display = 'flex'; });
}

// ---------- Scene / Camera ----------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

// ---------- WebGL Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
webglContainer.appendChild(renderer.domElement);

// ---------- CSS3D Renderer ----------
const cssRenderer = new CSS3DRenderer();
cssRenderer.setSize(window.innerWidth, window.innerHeight);
cssRenderer.domElement.style.position = 'absolute';
cssRenderer.domElement.style.top = '0';
cssRenderer.domElement.style.left = '0';
cssRenderer.domElement.style.pointerEvents = 'none';
cssContainer.appendChild(cssRenderer.domElement);

// ---------- AR entry button ----------
const arButton = ARButton.createButton(renderer, {
  requiredFeatures: ['hit-test'],
  optionalFeatures: ['local-floor', 'dom-overlay'],
  domOverlay: { root: arOverlay }
});
arButtonContainer.appendChild(arButton);

// ---------- Lights ----------
scene.add(new THREE.HemisphereLight(0xffffff, 0x333344, 1.2));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(2, 4, 2);
scene.add(dirLight);

// ---------- Reticle ----------
const reticleGeometry = new THREE.RingGeometry(0.08, 0.1, 32).rotateX(-Math.PI / 2);
const reticleMaterial = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
const reticle = new THREE.Mesh(reticleGeometry, reticleMaterial);
reticle.matrixAutoUpdate = false;
reticle.visible = false;
scene.add(reticle);

// ---------- Cube ----------
const cubeSize = 0.18;
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize),
  new THREE.MeshStandardMaterial({
    color: 0x6366f1,
    metalness: 0.3,
    roughness: 0.35,
    emissive: 0x1e1b4b,
    emissiveIntensity: 0.4,
  })
);
cube.visible = false;
scene.add(cube);

const edges = new THREE.LineSegments(
  new THREE.EdgesGeometry(cube.geometry),
  new THREE.LineBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.7 })
);
edges.visible = false;
scene.add(edges);

// ---------- CSS3D Objects для основных панелей ----------
// 1. Создаем CSS3DObject из существующих HTML-элементов
const anchorPanelObj = new CSS3DObject(anchorPanel);
const secondPanelObj = new CSS3DObject(secondPanel);

// Добавляем их в сцену (позиции будут заданы при размещении)
scene.add(anchorPanelObj);
scene.add(secondPanelObj);

const panelAnchor = new THREE.Vector3();
const secondPanelAnchor = new THREE.Vector3();
const PANEL_HEIGHT_OFFSET = 0.28;

// ---------- Hit-test state ----------
let hitTestSource = null;
let hitTestSourceRequested = false;
let placed = false;

renderer.xr.addEventListener('sessionstart', () => {
  placed = false;
  cube.visible = false;
  edges.visible = false;
  anchorPanel.classList.remove('visible');
  secondPanel.classList.remove('visible');
  reticle.visible = false;
  hitTestSourceRequested = false;
  hitTestSource = null;
  placeHint.style.display = 'block';
  
  for (const [id, data] of anchoredPanels) {
    data.element.remove();
    scene.remove(data.cssObject);
  }
  anchoredPanels.clear();
  anchoredPanelObjects.clear();
});

renderer.xr.addEventListener('sessionend', () => {
  hitTestSource = null;
  hitTestSourceRequested = false;
});

// ---------- Конвертор ----------
convertorTriggerBtn.addEventListener('click', async () => {
  if (!placed) {
    console.warn('Сначала разместите куб на полу');
    return;
  }
  
  convertorTriggerBtn.disabled = true;
  const originalLabel = convertorTriggerBtn.textContent;
  convertorTriggerBtn.textContent = '⏳ Проверяю…';

  try {
    const { results, allExist } = await checkAssetFiles();
    
    const panel = document.createElement('div');
    panel.className = 'convertor-panel';
    
    const rowsHtml = results.map(r => `
      <div class="convertor-row ${r.exists ? 'ok' : 'missing'}">
        <span>${r.exists ? '✅' : '❌'}</span>
        <code>${r.path}</code>
      </div>
    `).join('');
    
    const title = allExist ? '✅ Assets найдены' : '❌ Не хватает файлов';
    const message = allExist 
      ? '<p>Все файлы конвертера на месте!</p>'
      : `<p>Не все файлы найдены в <code>./assets/</code>:</p>`;
    
    panel.innerHTML = `
      <div class="convertor-panel-header">
        <span>${title}</span>
        <button type="button" class="convertor-panel-close" aria-label="Закрыть">×</button>
      </div>
      <div class="convertor-panel-body">
        ${message}
        ${rowsHtml}
      </div>
    `;
    
    const offsetPosition = panelAnchor.clone();
    offsetPosition.x += 0.30;
    offsetPosition.y += 0.05;
    
    const panelId = addAnchoredPanel(panel, offsetPosition);
    setupPanelInteraction(panel);
    
    panel.querySelector('.convertor-panel-close').addEventListener('click', () => {
      removeAnchoredPanel(panelId);
    });
    
  } catch (err) {
    console.error('Ошибка при проверке assets:', err);
  } finally {
    convertorTriggerBtn.disabled = false;
    convertorTriggerBtn.textContent = originalLabel;
  }
});

// ---------- Tap to place ----------
function onSelect() {
  if (!reticle.visible) return;

  cube.position.setFromMatrixPosition(reticle.matrix);
  cube.position.y += cubeSize / 2;
  edges.position.copy(cube.position);
  cube.visible = true;
  edges.visible = true;

  // --- ПАНЕЛЬ 1: Основная ---
  panelAnchor.set(cube.position.x, cube.position.y + PANEL_HEIGHT_OFFSET, cube.position.z);
  anchorPanelObj.position.copy(panelAnchor);
  // Если нужно, чтобы первая панель смотрела на камеру, раскомментируйте строку ниже:
  // anchorPanelObj.lookAt(camera.position); 

  // --- ПАНЕЛЬ 2: Фиксированная ---
  secondPanelAnchor.set(cube.position.x + 0.4, cube.position.y + 0.15, cube.position.z);
  secondPanelObj.position.copy(secondPanelAnchor);
  
  // ЖЕСТКАЯ ФИКСАЦИЯ ПОВОРОТА ВТОРОЙ ПАНЕЛИ
  // Мы НЕ вызываем lookAt(). Мы явно задаем rotation (или оставляем 0, 0, 0).
  // Например, небольшой наклон, чтобы было видно, что он не меняется:
  secondPanelObj.rotation.x = 0;
  secondPanelObj.rotation.y = 0; 
  secondPanelObj.rotation.z = 0;

  placed = true;
  placeHint.style.display = 'none';
}

const controller = renderer.xr.getController(0);
controller.addEventListener('select', onSelect);
scene.add(controller);

// ---------- Resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  cssRenderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Animation loop ----------
renderer.setAnimationLoop((timestamp, frame) => {
  if (frame) {
    const session = renderer.xr.getSession();
    const referenceSpace = renderer.xr.getReferenceSpace();

    hint.style.display = 'none';
    arOverlay.style.display = 'block';

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
  } else {
    arOverlay.style.display = 'none';
  }

  if (placed) {
    // Управление видимостью на основе дистанции (CSS3DRenderer сам обработает масштаб и перспективу)
    const dist1 = camera.position.distanceTo(panelAnchor);
    anchorPanelObj.visible = (dist1 < 8);
    if (dist1 < 8) anchorPanel.classList.add('visible');
    else anchorPanel.classList.remove('visible');

    const dist2 = camera.position.distanceTo(secondPanelAnchor);
    secondPanelObj.visible = (dist2 < 8);
    if (dist2 < 8) secondPanel.classList.add('visible');
    else secondPanel.classList.remove('visible');

    for (const [id, data] of anchoredPanels) {
      const dist = camera.position.distanceTo(data.anchorPosition);
      data.cssObject.visible = (dist < 8);
      if (dist < 8) data.element.classList.add('visible');
      else data.element.classList.remove('visible');
    }

    // Рендерим CSS3D сцену (это автоматически применит правильные transform ко всем CSS3DObject)
    cssRenderer.render(scene, camera);
  }

  // Рендерим WebGL сцену
  renderer.render(scene, camera);
});
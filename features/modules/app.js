import * as THREE from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";

import { CONFIG } from "./modules/config.js";
import { spatialMap, updateCameraInfo } from "./modules/spatialMap.js";
import { scene, camera, renderer, initScene, initGroups, setupResize } from "./modules/scene.js";
import { updatePlanes } from "./modules/planes.js";
import { collectDepth, clearDepthCloud, depthPoints } from "./modules/depth.js";
import { initializeHitTest, updateHitTest, resetHitTest } from "./modules/hitTest.js";
import { updateDebug, setupDebugPanel, showWebXRStatus } from "./modules/ui.js";
import { buildExportData, setupExportButton, setupGlobalAPI } from "./modules/export.js";
import { escapeHtml } from "./modules/utils.js";

// Initialize scene
initScene();
initGroups();
setupResize();

// Setup UI
setupDebugPanel();
setupExportButton();
setupGlobalAPI();

// Session state
let currentSession = null;

/* ============================================================
   XR SESSION HANDLING
   ============================================================ */

async function onSessionStarted(session) {
  currentSession = session;
  spatialMap.startedAt = new Date().toISOString();
  spatialMap.features.localFloor = true;
  spatialMap.session.active = true;

  session.addEventListener("end", onSessionEnded);
  await initializeHitTest(session);

  console.log("[SpatialScanner] XR session started");
  console.log("[SpatialScanner] session:", session);
  console.log("[SpatialScanner] depthUsage:", session.depthUsage);
  console.log("[SpatialScanner] depthDataFormat:", session.depthDataFormat);
  console.log("[SpatialScanner] inputSources:", session.inputSources);

  updateDebug(renderer);
}

function onSessionEnded() {
  currentSession = null;
  resetHitTest();
  spatialMap.session.active = false;
  spatialMap.features.hitTest = false;
  spatialMap.features.depthSensing = false;
  spatialMap.hitTest.available = false;
  console.log("[SpatialScanner] XR session ended");
  updateDebug(renderer);
}

/* ============================================================
   AR SESSION OPTIONS
   ============================================================ */

const sessionInit = {
  requiredFeatures: ["local-floor", "plane-detection"],
  optionalFeatures: ["hit-test", "depth-sensing", "dom-overlay"],
  domOverlay: { root: document.body },
  depthSensing: {
    usagePreference: ["cpu-optimized", "gpu-optimized"],
    dataFormatPreference: ["luminance-alpha", "float32"]
  }
};

/* ============================================================
   AR BUTTON
   ============================================================ */

const arButton = ARButton.createButton(renderer, sessionInit);
document.body.appendChild(arButton);

/* ============================================================
   XR SUPPORT CHECK
   ============================================================ */

async function checkWebXR() {
  if (!navigator.xr) {
    spatialMap.session.supported = false;
    showWebXRStatus(`
      <div class="error">WebXR is not available.</div>
      <br>navigator.xr = undefined<br><br>
      Use a WebXR-compatible mobile browser and HTTPS.
    `);
    return;
  }

  try {
    const supported = await navigator.xr.isSessionSupported("immersive-ar");
    spatialMap.session.supported = supported;

    if (!supported) {
      showWebXRStatus(`
        <div class="warning">immersive-ar is not supported</div>
        <br>WebXR exists, but this browser/device cannot start immersive AR.
      `, "warning");
      return;
    }

    showWebXRStatus(`
      <div class="ok">immersive-ar supported</div>
      <br>Press the AR button.<br><br>
      Move the camera slowly around the room to allow the device to detect surfaces.
    `);
  } catch (error) {
    console.error(error);
    showWebXRStatus(`
      <div class="error">WebXR support check failed</div>
      <br>${escapeHtml(error.message || String(error))}
    `);
  }
}

checkWebXR();

/* ============================================================
   XR SESSION DETECTION
   ============================================================ */

function checkSession() {
  const session = renderer.xr.getSession();
  if (session && session !== currentSession) {
    onSessionStarted(session);
  }
}

/* ============================================================
   MAIN RENDER LOOP
   ============================================================ */

function render(time, frame) {
  spatialMap.frames++;
  spatialMap.renderFrames++;

  checkSession();

  const xrFrame = frame || renderer.xr.getFrame();
  if (xrFrame) {
    spatialMap.xrFrames++;
    try { updatePlanes(xrFrame, renderer); } catch (error) { console.error("[SpatialScanner] plane error:", error); }
    try { updateHitTest(xrFrame, renderer); } catch (error) { console.error("[SpatialScanner] hit test error:", error); }
    try { collectDepth(xrFrame, renderer); } catch (error) { console.error("[SpatialScanner] depth error:", error); }
  }

  try { updateCameraInfo(renderer); } catch (error) { console.error("[SpatialScanner] camera error:", error); }

  spatialMap.lastUpdate = new Date().toISOString();

  if (spatialMap.frames % CONFIG.debugUpdateInterval === 0) {
    updateDebug(renderer);
  }

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(render);

/* ============================================================
   CLEAR DEPTH CLOUD BUTTON
   ============================================================ */

document.getElementById("clearButton").addEventListener("click", () => {
  clearDepthCloud();
  console.log("[SpatialScanner] point cloud cleared");
  updateDebug(renderer);
});

/* ============================================================
   INITIAL LOG
   ============================================================ */

console.log("%cWEBXR SPATIAL SCANNER", "font-size:18px;font-weight:bold");
console.log("Spatial map:", "window.spatialMap");
console.log("Scanner API:", "window.spatialScanner");
console.log("Export:", "window.exportSpatialMap()");
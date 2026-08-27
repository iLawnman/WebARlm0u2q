import { CONFIG } from "./config.js";
import { spatialMap, updateSessionInfo } from "./spatialMap.js";
import { fmt, vectorText, escapeHtml, getInputSourceInfo } from "./utils.js";

const debugContent = document.getElementById("debugContent");

export function updateDebug(renderer) {
  const session = renderer.xr.getSession();
  updateSessionInfo(session);

  const planes = Object.values(spatialMap.planes);
  const floors = planes.filter(p => p.classification === "floor");
  const walls = planes.filter(p => p.classification === "wall");
  const ceilings = planes.filter(p => p.classification === "ceiling");
  const horizontals = planes.filter(p => p.classification === "horizontal");
  const camera = spatialMap.camera;

  let html = "";

  html += `<div>WebXR: <span class="${spatialMap.session.supported ? "ok" : "warning"}">${spatialMap.session.supported ? "supported" : "unknown"}</span></div>`;

  html += `<div class="section">XR SESSION</div>
    active: ${spatialMap.session.active}<br>
    visibility: ${escapeHtml(spatialMap.session.visibilityState || "none")}<br>
    blend: ${escapeHtml(spatialMap.session.environmentBlendMode || "none")}<br>
    interaction: ${escapeHtml(spatialMap.session.interactionMode || "none")}<br>
    inputSources: ${spatialMap.session.inputSources}`;

  html += `<div class="section">FEATURES</div>
    local-floor: <span class="${spatialMap.features.localFloor ? "ok" : "warning"}">${spatialMap.features.localFloor ? "YES" : "NO"}</span><br>
    plane-detection: <span class="${spatialMap.features.planeDetection ? "ok" : "warning"}">${spatialMap.features.planeDetection ? "YES" : "NO"}</span><br>
    hit-test: <span class="${spatialMap.features.hitTest ? "ok" : "warning"}">${spatialMap.features.hitTest ? "YES" : "NO"}</span><br>
    depth-sensing: <span class="${spatialMap.features.depthSensing ? "ok" : "warning"}">${spatialMap.features.depthSensing ? "YES" : "NO"}</span>`;

  html += `<div class="section">FRAME STATISTICS</div>
    frames: ${spatialMap.frames}<br>
    XR frames: ${spatialMap.xrFrames}<br>
    render frames: ${spatialMap.renderFrames}`;

  html += `<div class="section">CAMERA</div>
    position: ${escapeHtml(vectorText(camera.position))}<br>
    quaternion: ${escapeHtml(vectorText(camera.quaternion))}`;

  html += `<div class="section">PLANES</div>
    total: ${planes.length}<br>
    floor: ${floors.length}<br>
    walls: ${walls.length}<br>
    ceiling: ${ceilings.length}<br>
    horizontal: ${horizontals.length}<br>
    tracked: ${planes.length}`;

  html += `<div class="section">DEPTH</div>
    usage: ${escapeHtml(spatialMap.depth.usage || "none")}<br>
    format: ${escapeHtml(spatialMap.depth.format || "none")}<br>
    resolution: ${spatialMap.depth.width ? spatialMap.depth.width + " × " + spatialMap.depth.height : "n/a"}<br>
    rawValueToMeters: ${fmt(spatialMap.depth.rawValueToMeters, 6)}<br>
    depth frames: ${spatialMap.depth.frames}<br>
    samples: ${spatialMap.depth.samples}<br>
    world points: ${spatialMap.depth.worldPoints}`;

  html += `<div class="section">HIT TEST</div>
    available: ${spatialMap.hitTest.available}<br>
    hits: ${spatialMap.hitTest.hits}`;

  if (spatialMap.hitTest.position) {
    html += `<br>position: ${escapeHtml(vectorText(spatialMap.hitTest.position))}<br>distance: ${fmt(spatialMap.hitTest.distance, 3)} m`;
  }

  html += `<div class="section">PLANES DETAIL</div>`;
  planes.sort((a, b) => b.area - a.area);

  for (const plane of planes) {
    const className = plane.classification === "floor" ? "floor" : plane.classification === "wall" ? "wall" : "other";
    html += `<div class="plane ${className}">
      <b>${escapeHtml(plane.classification)}</b><br>
      id: ${escapeHtml(plane.id)}<br>
      orientation: ${escapeHtml(plane.orientation)}<br>
      center: ${escapeHtml(vectorText(plane.center))}<br>
      normal: ${escapeHtml(vectorText(plane.normal))}<br>
      vertices: ${plane.vertexCount}<br>
      area: ${fmt(plane.area, 3)} m²<br>
      size: ${fmt(plane.width, 3)} × ${fmt(plane.height, 3)} m<br>
      updates: ${plane.updates}<br>
      lastChangedTime: ${escapeHtml(plane.lastChangedTime ?? "n/a")}
    </div>`;
  }

  html += `<div class="section">DEPTH CLOUD</div>
    point cloud: ${spatialMap.depth.worldPoints}<br>
    max: ${CONFIG.maxDepthPoints}<br>
    sample step: ${CONFIG.depthSampleStep}<br>
    max distance: ${CONFIG.depthMaxDistance} m`;

  if (session) {
    const inputs = getInputSourceInfo(session);
    html += `<div class="section">INPUT SOURCES</div>`;
    for (const input of inputs) {
      html += `handedness: ${escapeHtml(input.handedness)}<br>
        targetRayMode: ${escapeHtml(input.targetRayMode)}<br>
        profiles: ${escapeHtml(input.profiles.join(", "))}<br><br>`;
    }
  }

  debugContent.innerHTML = html;
}

export function setupDebugPanel() {
  const debugPanel = document.getElementById("debug");
  const debugToggleBtn = document.getElementById("debugToggle");
  const debugEarBtn = document.getElementById("debugEar");

  function setDebugCollapsed(collapsed) {
    if (!debugPanel) return;
    debugPanel.classList.toggle("collapsed", collapsed);
    if (debugToggleBtn) {
      debugToggleBtn.textContent = collapsed ? "▶" : "◀";
      debugToggleBtn.title = collapsed ? "Развернуть лог" : "Свернуть лог";
      debugToggleBtn.setAttribute("aria-label", debugToggleBtn.title);
    }
  }

  function toggleDebugPanel() {
    if (!debugPanel) return;
    setDebugCollapsed(!debugPanel.classList.contains("collapsed"));
  }

  if (debugToggleBtn) {
    debugToggleBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleDebugPanel();
    });
  }

  if (debugEarBtn) {
    debugEarBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setDebugCollapsed(false);
    });
  }
}

export function showWebXRStatus(message, className = "ok") {
  debugContent.innerHTML = message;
}
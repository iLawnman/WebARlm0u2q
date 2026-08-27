import { spatialMap } from "./spatialMap.js";

export function buildExportData() {
  return {
    ...spatialMap,
    exportedAt: new Date().toISOString(),
    statistics: {
      planes: Object.keys(spatialMap.planes).length,
      floors: Object.values(spatialMap.planes).filter(p => p.classification === "floor").length,
      walls: Object.values(spatialMap.planes).filter(p => p.classification === "wall").length,
      ceiling: Object.values(spatialMap.planes).filter(p => p.classification === "ceiling").length,
      depthPoints: spatialMap.depth.worldPoints
    }
  };
}

export function setupExportButton() {
  document.getElementById("exportButton").addEventListener("click", () => {
    const data = buildExportData();
    const json = JSON.stringify(data, null, 2);
    console.log("[SpatialScanner] SPATIAL MAP:", data);

    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "webxr-spatial-map.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

export function setupGlobalAPI() {
  window.spatialMap = spatialMap;
  window.exportSpatialMap = buildExportData;
  window.spatialScanner = {
    getMap() { return spatialMap; },
    getPlanes() { return Object.values(spatialMap.planes); },
    getFloorPlanes() { return Object.values(spatialMap.planes).filter(p => p.classification === "floor"); },
    getWalls() { return Object.values(spatialMap.planes).filter(p => p.classification === "wall"); },
    getDepthPointCount() { return spatialMap.depth.worldPoints; },
    export() { return buildExportData(); }
  };
}
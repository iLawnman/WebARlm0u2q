import * as THREE from 'three';

export class ImageReco {
  static SMOOTH_FACTOR = 0.2;

  /**
   * @param {import('./ui.js').UI} ui
   * @param {import('./settings.js').Settings} settings
   * @param {import('./quests.js').QuestManager} questManager
   * @param {import('./policies.js').Policies} policies
   */
  constructor(ui, settings, questManager, policies) {
    this.ui = ui;
    this.settings = settings;
    this.questManager = questManager;
    this.policies = policies;

    this.targetBitmaps = [];
    this.trackedMarkers = new Map();
  }

  async init() {
    this.targetBitmaps = [];

    try {
      const response = await fetch('./assets/recoimages/recognitionimages.json');
      if (!response.ok) {
        throw new Error(`Failed to fetch recognitionimages.json: ${response.status} ${response.statusText}`);
      }

      const fileList = await response.json();

      // Проверяем, что пришел массив строк
      if (Array.isArray(fileList)) {
        for (const fileName of fileList) {
          if (typeof fileName !== 'string') continue;

          // Формируем путь к файлу картинки внутри папки assets
          const imgPath = `./assets/recoimages/${fileName.replace(/^\.\//, '')}`;

          try {
            const imgRes = await fetch(imgPath);
            if (!imgRes.ok) {
              console.warn(`[ImageReco] Failed to fetch image: ${imgPath} (${imgRes.status})`);
              continue;
            }

            const blob = await imgRes.blob();
            const bitmap = await createImageBitmap(blob);

            // Имя маркерa отсекает расширение (например, "T1.jpg" -> "T1")
            const markerName = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;

            this.targetBitmaps.push({
              name: markerName,
              src: imgPath,
              bitmap
            });
          } catch (imgErr) {
            console.error(`[ImageReco] Error loading bitmap for ${imgPath}:`, imgErr);
          }
        }
      }

      this.ui.log(`Loaded ${this.targetBitmaps.length} recognition image targets`, 'ok');
    } catch (err) {
      console.error('[ImageReco] Error initializing recognition images:', err);
      this.ui.log('Failed to load recognition images config', 'warn');
    }
  }

  getTrackedImages(widthInMeters = 0.2) {
    return this.targetBitmaps.map(t => ({
      image: t.bitmap,
      widthInMeters
    }));
  }

  getMarkerName(idx) {
    return this.targetBitmaps[idx]?.name || `Marker_${idx}`;
  }

  computeStablePose(samples) {
    if (!samples || !samples.length) return null;
    let px = 0, py = 0, pz = 0;
    let qx = 0, qy = 0, qz = 0, qw = 0;

    for (const s of samples) {
      px += s.px; py += s.py; pz += s.pz;
      qx += s.qx; qy += s.qy; qz += s.qz; qw += s.qw;
    }

    const count = samples.length;
    return {
      position: new THREE.Vector3(px / count, py / count, pz / count),
      orientation: new THREE.Quaternion(qx / count, qy / count, qz / count, qw / count).normalize()
    };
  }

  disposeEntry(entry) {
    if (!entry) return;
    if (entry.arTarget) {
      entry.arTarget.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      });
    }
  }
}
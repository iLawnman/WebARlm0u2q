import * as THREE from 'three';
import { createArTargetSync, preloadArTargetPrefab, preloadArTargetDesign } from './artarget.js';
import { playSound } from './audio.js';
import { QuestManager } from './quests.js';
import { Policies } from './policies.js';
import { MediaPipeReco } from './mediapipe.js';
import { ImageReco } from './imagereco.js';

export class Recognition {
  /**
   * @param {import('./ui.js').UI} ui
   * @param {import('./settings.js').Settings} settings
   */
  constructor(ui, settings) {
    this.ui = ui;
    this.settings = settings;

    this.questManager = new QuestManager();
    this.policies = new Policies(settings, this.questManager);

    this.imageReco = new ImageReco(ui, settings, this.questManager, this.policies);
    this.mediaPipeReco = new MediaPipeReco(ui);

    this.state = 'waitingImage';

    this._raycaster = new THREE.Raycaster();
    this._pointerNdc = new THREE.Vector2(0, 0);
    this._boundOnSelect = null;
    this._boundOnClick = null;
    this._arScene = null;
    this._xrSession = null;

    this._tmpPos = new THREE.Vector3();
    this._tmpQuat = new THREE.Quaternion();
  }

  async init() {
    this.state = 'waitingImage';

    this.ui.log('Loading quest table & answers...', 'info');
    await this.questManager.loadData();
    if (this.questManager.isLoaded) {
      this.ui.log(`Quest data loaded: ${this.questManager.quests.size} quests`, 'ok');
    }

    this.policies.init();
    await this.imageReco.init();

    this.ui.log('Preloading AR target prefab...', 'info');
    const prefabSource = await preloadArTargetPrefab(undefined, this.ui);
    if (prefabSource !== 'server') {
      this.ui.log('AR target prefab NOT loaded from server → using built-in defaultPrefab from code', 'warn');
    }

    this.ui.log('Preloading AR target design...', 'info');
    const designPrefab = await preloadArTargetDesign(this.ui);
    if (!designPrefab) {
      this.ui.log('AR target design JSON NOT found → panels will use default (undesigned) styles', 'warn');
    }

    this.ui.enableArButton();
    this.ui.log('state → waitingImage | ready', 'info');
  }

  getTrackedImages(widthInMeters = 0.2) {
    return this.imageReco.getTrackedImages(widthInMeters);
  }

  attachInput(xrSession, arScene) {
    this._xrSession = xrSession;
    this._arScene = arScene;

    this._boundOnSelect = (ev) => this._onSelect(ev);
    xrSession.addEventListener('select', this._boundOnSelect);

    this._boundOnClick = (ev) => this._onCanvasTap(ev);
    arScene.renderer.domElement.addEventListener('click', this._boundOnClick);
    arScene.renderer.domElement.addEventListener('touchend', this._boundOnClick, { passive: true });
  }

  detachInput() {
    if (this._xrSession && this._boundOnSelect) {
      this._xrSession.removeEventListener('select', this._boundOnSelect);
    }
    if (this._arScene && this._boundOnClick) {
      this._arScene.renderer.domElement.removeEventListener('click', this._boundOnClick);
      this._arScene.renderer.domElement.removeEventListener('touchend', this._boundOnClick);
    }
    this._xrSession = null;
    this._arScene = null;
    this._boundOnSelect = null;
    this._boundOnClick = null;
  }

  presentSearchPrompt() {
    this.state = 'waitingImage';
    this.ui.hideScanFrame();
    if (!this.imageReco.targetBitmaps.length) return;

    let pick;
    if (this.policies.mode >= 2 && this.policies.expectedMarker) {
      pick = this.imageReco.targetBitmaps.find(t => t.name === this.policies.expectedMarker)
          || this.imageReco.targetBitmaps[0];
    } else {
      pick = this.imageReco.targetBitmaps[Math.floor(Math.random() * this.imageReco.targetBitmaps.length)];
    }

    this.ui.showQuestStart(pick.src, 'ИЩИТЕ!');
    this.ui.showScanFrameBlink();
  }

  reset(arScene) {
    for (const [, entry] of this.imageReco.trackedMarkers) {
      if (entry.arTarget && arScene) {
        arScene.scene.remove(entry.arTarget);
      }
      this.imageReco.disposeEntry(entry);
    }
    this.imageReco.trackedMarkers.clear();

    this.mediaPipeReco.clear(arScene);

    this.state = 'waitingImage';
    this.policies.reset();

    this.ui.hideQuestStart();
    this.ui.hideResult();
    this.ui.hideScanFrame();
    this.ui.hideDetectedObjectsInfo();
  }

  _parseRichText(text) {
    if (!text) return '';
    return text
        .replace(/<size=\+?(\d+)>/gi, '<span style="font-size: calc(1em + $1px)">')
        .replace(/<\/size>/gi, '</span>');
  }

  _onSelect(ev) {
    if (this.state !== 'waitingInput' || !this._arScene) return;
    this._pointerNdc.set(0, 0);
  }

  _onCanvasTap(ev) {
    if (this.state !== 'waitingInput' || !this._arScene) return;
    const rect = this._arScene.renderer.domElement.getBoundingClientRect();
    let clientX = ev.changedTouches ? ev.changedTouches[0].clientX : ev.clientX;
    let clientY = ev.changedTouches ? ev.changedTouches[0].clientY : ev.clientY;

    this._pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this._pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  _onQuestionAnswered(entry, value) {
    if (entry.dismissed) return;
    entry.dismissed = true;

    if (entry.arTarget) {
      entry.arTarget.visible = false;
      if (this._arScene && entry.arTarget.parent) {
        this._arScene.scene.remove(entry.arTarget);
      }
    }

    const questData = entry.questData;
    const questId = questData?.questId;

    let isCorrect = true;
    if (questId && this.questManager.quests.has(questId)) {
      isCorrect = this.questManager.validateAnswer(questId, value);
    }

    this.state = 'showingResult';

    if (questId) {
      const quest = this.questManager.quests.get(questId);
      if (quest) {
        const nextId = isCorrect ? quest.RightWayQuest : quest.WrongWayQuest;
        if (nextId) this.policies.onQuestAdvanced(nextId);
      }
    }

    const reactionText = this.questManager.getReactionText(questId, isCorrect);
    this.ui.showResult(isCorrect, reactionText, () => {
      this.presentSearchPrompt();
    });
  }

  processTracking(frame, xrRefSpace, frameCount, arScene) {
    try {
      if (!frame || typeof frame.getImageTrackingResults !== 'function') return;

      const results = frame.getImageTrackingResults();
      if (!results) return;

      const seen = new Set();

      for (const result of results) {
        if (!result) continue;

        const trackingState = result.trackingState;
        const idx = result.index;
        seen.add(idx);

        const pose = frame.getPose(result.imageSpace, xrRefSpace);
        if (!pose || !pose.transform) continue;

        let entry = this.imageReco.trackedMarkers.get(idx);

        if (!entry) {
          if (this.state !== 'waitingImage') continue;

          const markerName = this.imageReco.getMarkerName(idx);
          const policyCheck = this.policies.canRecognize(markerName);
          if (!policyCheck.ok) continue;

          const bitmapEntry = this.imageReco.targetBitmaps.find(t => t.name === markerName);
          const questData = this.questManager.getArTargetData(markerName);

          const rawMainText = questData?.mainText || '';
          const targetInfoData = {
            title: questData?.title || markerName,
            question: questData?.question || questData?.title || markerName,
            mainText: this._parseRichText(rawMainText),
            answerType: questData?.answerType || 'Slide',
            options: questData?.options || [],
            imageSrc: bitmapEntry ? bitmapEntry.src : '',
            questId: questData?.questId,
            questData
          };

          const arTarget = createArTargetSync(targetInfoData, {
            ui: this.ui,
            onAnswer: (value) => {
              const e = this.imageReco.trackedMarkers.get(idx);
              if (e) this._onQuestionAnswered(e, value);
            }
          });

          arTarget.visible = false;
          arScene.scene.add(arTarget);

          entry = {
            arTarget,
            lastState: trackingState,
            dismissed: false,
            questData,
            markerName,
            bitmapEntry,
            anchor: null,
            anchorCreating: false,
            recognizing: true,
            poseSamples: [],
            effectDone: false,
            pendingAnchorPose: null
          };

          this.imageReco.trackedMarkers.set(idx, entry);
          this.policies.onRecognized(markerName);
          this.state = 'recognizing';

          this.ui.hideQuestStart();
          playSound('click');

          this.ui.playScanEffect(() => {
            const e = this.imageReco.trackedMarkers.get(idx);
            if (!e || e.dismissed) return;

            e.effectDone = true;
            e.pendingAnchorPose = this.imageReco.computeStablePose(e.poseSamples);
            e.recognizing = false;

            this.ui.hideScanFrame();
            this.ui.hideQuestStart();

            if (e.arTarget) e.arTarget.visible = true;

            this.state = 'waitingInput';
          });
        }

        if (entry.dismissed) {
          entry.lastState = trackingState;
          continue;
        }

        const target = entry.arTarget;
        if (!target) continue;

        if (entry.recognizing || !entry.effectDone) {
          const t = pose.transform;
          if (t.position && t.orientation) {
            entry.poseSamples.push({
              px: t.position.x, py: t.position.y, pz: t.position.z,
              qx: t.orientation.x, qy: t.orientation.y, qz: t.orientation.z, qw: t.orientation.w
            });
            target.position.set(t.position.x, t.position.y, t.position.z);
            target.quaternion.set(t.orientation.x, t.orientation.y, t.orientation.z, t.orientation.w);
          }
          entry.lastState = trackingState;
          continue;
        }

        if (!entry.anchor && !entry.anchorCreating && typeof frame.createAnchor === 'function') {
          entry.anchorCreating = true;
          const createPromise = frame.createAnchor(pose.transform, xrRefSpace);
          if (createPromise && typeof createPromise.then === 'function') {
            createPromise
                .then((anchor) => { if (entry && !entry.dismissed) entry.anchor = anchor; })
                .finally(() => { if (entry) entry.anchorCreating = false; });
          } else {
            entry.anchorCreating = false;
          }
        }

        let usePose = pose;
        if (entry.anchor && entry.anchor.anchorSpace) {
          const anchorPose = frame.getPose(entry.anchor.anchorSpace, xrRefSpace);
          if (anchorPose && anchorPose.transform) usePose = anchorPose;
        }

        const pos = usePose.transform.position;
        const ori = usePose.transform.orientation;

        if (pos) {
          this._tmpPos.set(pos.x, pos.y, pos.z);
          target.position.lerp(this._tmpPos, ImageReco.SMOOTH_FACTOR);
        }
        if (ori) {
          this._tmpQuat.set(ori.x, ori.y, ori.z, ori.w);
          target.quaternion.slerp(this._tmpQuat, ImageReco.SMOOTH_FACTOR);
        }

        entry.lastState = trackingState;

        if (frameCount % 30 === 0) {
          this.mediaPipeReco.processDetection(entry, arScene);
        }
      }

      for (const [idx, entry] of this.imageReco.trackedMarkers) {
        if (!seen.has(idx) && entry.lastState !== 'lost') {
          entry.lastState = 'lost';
          if (entry.arTarget && entry.arTarget.parent) {
            arScene.scene.remove(entry.arTarget);
          }
          this.imageReco.disposeEntry(entry);
          this.imageReco.trackedMarkers.delete(idx);

          if (!entry.dismissed) {
            this.presentSearchPrompt();
          }
        }
      }
    } catch (e) {
      // Игнорируем ошибки кадра
    }
  }
}
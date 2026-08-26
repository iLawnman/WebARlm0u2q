import * as THREE from 'three';
import { createArTargetSync, preloadArTargetDesign } from './artarget.js';
import { playSound } from './audio.js';
import { QuestManager } from './quests.js';
import { Policies } from './policies.js';
import { MediaPipeReco } from './mediapipe.js';
import { ImageReco } from './imagereco.js';

export class Recognition {
  constructor(ui, settings, arScene = null) {
    this.ui = ui;
    this.settings = settings;

    // REFACTOR (CSS3D -> three-mesh-ui): the standalone ARInput helper is
    // gone - raycasting now lives inside ARScene itself, and target buttons
    // register themselves with it via ModelFactory. This constructor arg is
    // only useful as an early value for this._arScene (normally overwritten
    // by attachInput() once the XR session actually starts); every real use
    // of it below happens inside processTracking(), which only ever runs
    // after attachInput() has already set this._arScene, so this is mostly
    // for symmetry/safety.
    this._arScene = arScene;

    this.questManager = new QuestManager();
    this.policies = new Policies(settings, this.questManager);

    this.imageReco = new ImageReco(ui, settings, this.questManager, this.policies);
    this.mediaPipeReco = new MediaPipeReco(ui);

    this.state = 'waitingImage';

    this._raycaster = new THREE.Raycaster();
    this._pointerNdc = new THREE.Vector2(0, 0);
    this._boundOnSelect = null;
    this._boundOnClick = null;
    this._xrSession = null;

    this._tmpPos = new THREE.Vector3();
    this._tmpQuat = new THREE.Quaternion();
    
    this._isRecognizing = false;
    this._frameCounter = 0;
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

    // REFACTOR (CSS3D -> three-mesh-ui): panels are built directly from
    // three-mesh-ui Blocks, there is no HTML prefab to preload anymore -
    // preloadArTargetPrefab is now a deprecated no-op, so it's no longer
    // called here at all.

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
    this._isRecognizing = false;
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
    this._isRecognizing = false;
    
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
    this._frameCounter++;
    
    try {
      if (!frame || typeof frame.getImageTrackingResults !== 'function') {
        return;
      }

      const results = frame.getImageTrackingResults();
      if (!results) {
        return;
      }

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
          // Предотвращаем множественные распознавания
          if (this._isRecognizing) {
            console.log('[Recognition] ⏳ Already recognizing, skipping new marker');
            continue;
          }
          
          if (this.state !== 'waitingImage') {
            console.log('[Recognition] Skipping: state is', this.state, 'not waitingImage');
            continue;
          }

          const markerName = this.imageReco.getMarkerName(idx);
          console.log('[Recognition] 🎯 New marker detected:', markerName);
          this.ui.log(`🎯 New marker detected: ${markerName}`, 'info');

          const policyCheck = this.policies.canRecognize(markerName);
          if (!policyCheck.ok) {
            console.log('[Recognition] Policy check failed for', markerName, ':', policyCheck.reason);
            this.ui.log(`🚫 Policy check failed: ${policyCheck.reason}`, 'warn');
            continue;
          }

          // Устанавливаем флаг, что началось распознавание
          this._isRecognizing = true;

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

          console.log('[Recognition] 🏗️ Creating AR Target (HIDDEN) for:', markerName);
          this.ui.log(`🏗️ Creating AR Target (HIDDEN) for: ${markerName}`, 'info');

          // Создаем AR Target
          const arTarget = createArTargetSync(targetInfoData, {
            ui: this.ui,
            arScene,
            onAnswer: (value) => {
              const e = this.imageReco.trackedMarkers.get(idx);
              if (e) this._onQuestionAnswered(e, value);
            }
          });

          // Полностью скрываем весь AR Target
          arTarget.visible = false;
          arTarget.traverse((child) => {
            if (child.isMesh) {
              child.visible = false;
            }
          });
          
          arScene.scene.add(arTarget);
          console.log('[Recognition] ✅ AR Target added to scene (HIDDEN)');
          this.ui.log(`✅ AR Target added to scene (HIDDEN) for: ${markerName}`, 'ok');

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

          // ЗАПУСКАЕМ ЭФФЕКТ СКАНИРОВАНИЯ
          console.log('[Recognition] 🔄 Starting scan effect for marker:', markerName);
          this.ui.log(`🔄 Starting scan effect for: ${markerName}`, 'info');

          const idxRef = idx;

          try {
            this.ui.playScanEffect(() => {
              // Колбэк вызывается ПОСЛЕ завершения эффекта
              console.log('[Recognition] ✅ SCAN EFFECT COMPLETED for marker:', markerName);
              this.ui.log(`✅ Scan effect completed for: ${markerName}`, 'ok');

              const e = this.imageReco.trackedMarkers.get(idxRef);
              if (!e) {
                console.log('[Recognition] ❌ Entry not found after scan effect');
                this._isRecognizing = false;
                return;
              }
              if (e.dismissed) {
                console.log('[Recognition] ❌ Entry dismissed, skipping show');
                this._isRecognizing = false;
                return;
              }

              // Отмечаем, что эффект завершен
              e.effectDone = true;
              e.recognizing = false;

              // Скрываем рамку сканирования и подсказку
              this.ui.hideScanFrame();
              this.ui.hideQuestStart();

              // ПОКАЗЫВАЕМ AR Target ТОЛЬКО ПОСЛЕ завершения эффекта
              if (e.arTarget) {
                console.log('[Recognition] 📦 Showing AR Target...');
                this.ui.log(`📦 Showing AR Target for: ${markerName}`, 'info');
                
                // Делаем видимой всю группу
                e.arTarget.visible = true;
                e.arTarget.traverse((child) => {
                  if (child.isMesh) {
                    child.visible = true;
                  }
                });
                
                console.log('[Recognition] ✅ AR Target SHOWN for:', markerName);
                this.ui.log(`✅ AR Target SHOWN: ${markerName}`, 'ok');
                
                // Небольшая задержка перед показом модалки
                // REFACTOR (CSS3D -> three-mesh-ui) BUGFIX: userData.panelEl
                // and '.modal-overlay' were DOM-only concepts from the old
                // CSS3D panel and no longer exist, so this used to silently
                // do nothing. ARPanel now exposes openModal()/closeModal()
                // directly on userData for exactly this purpose.
                setTimeout(() => {
                  if (typeof e.arTarget.userData?.openModal === 'function') {
                    e.arTarget.userData.openModal();
                    console.log('[Recognition] ✅ Modal shown');
                    this.ui.log('✅ Modal shown', 'ok');
                  }
                }, 150);
                
              } else {
                console.log('[Recognition] ❌ arTarget is null');
              }

              // Переходим в состояние ожидания ввода
              this.state = 'waitingInput';
              this._isRecognizing = false;
              console.log('[Recognition] State → waitingInput');
              this.ui.log('State → waitingInput', 'info');
            });
          } catch (err) {
            console.error('[Recognition] ❌ Error in playScanEffect:', err);
            this.ui.log(`❌ Error in playScanEffect: ${err.message}`, 'error');
            
            if (entry.arTarget) {
              entry.arTarget.visible = true;
              entry.arTarget.traverse((child) => {
                if (child.isMesh) {
                  child.visible = true;
                }
              });
            }
            entry.recognizing = false;
            this.state = 'waitingInput';
            this._isRecognizing = false;
          }
        }

        // --- Обработка трекинга ---
        if (entry.dismissed) {
          entry.lastState = trackingState;
          continue;
        }

        const target = entry.arTarget;
        if (!target) continue;

        const t = pose.transform;
        if (t.position && t.orientation) {
          if (entry.recognizing || !entry.effectDone) {
            entry.poseSamples.push({
              px: t.position.x, py: t.position.y, pz: t.position.z,
              qx: t.orientation.x, qy: t.orientation.y, qz: t.orientation.z, qw: t.orientation.w
            });
          }
          
          target.position.set(t.position.x, t.position.y, t.position.z);
          target.quaternion.set(t.orientation.x, t.orientation.y, t.orientation.z, t.orientation.w);
        }

        entry.lastState = trackingState;

        if (entry.effectDone && !entry.anchor && !entry.anchorCreating && typeof frame.createAnchor === 'function') {
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

        if (entry.effectDone && entry.anchor && entry.anchor.anchorSpace) {
          const anchorPose = frame.getPose(entry.anchor.anchorSpace, xrRefSpace);
          if (anchorPose && anchorPose.transform) {
            const pos = anchorPose.transform.position;
            const ori = anchorPose.transform.orientation;
            if (pos) {
              this._tmpPos.set(pos.x, pos.y, pos.z);
              target.position.lerp(this._tmpPos, ImageReco.SMOOTH_FACTOR);
            }
            if (ori) {
              this._tmpQuat.set(ori.x, ori.y, ori.z, ori.w);
              target.quaternion.slerp(this._tmpQuat, ImageReco.SMOOTH_FACTOR);
            }
          }
        }

        if (frameCount % 30 === 0 && entry.effectDone) {
          this.mediaPipeReco.processDetection(entry, arScene);
        }
      }

      // Очистка потерянных маркеров
      for (const [idx, entry] of this.imageReco.trackedMarkers) {
        if (!seen.has(idx) && entry.lastState !== 'lost') {
          entry.lastState = 'lost';
          if (entry.arTarget && entry.arTarget.parent) {
            arScene.scene.remove(entry.arTarget);
          }
          this.imageReco.disposeEntry(entry);
          this.imageReco.trackedMarkers.delete(idx);

          if (!entry.dismissed) {
            this._isRecognizing = false;
            this.presentSearchPrompt();
          }
        }
      }
    } catch (e) {
      console.error('[Recognition] processTracking error:', e);
    }
  }
}
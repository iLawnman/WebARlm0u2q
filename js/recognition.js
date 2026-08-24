import * as THREE from 'three';
import { createArTargetSync, preloadArTargetPrefab, preloadArTargetDesign } from './artarget.js';
import { playSound } from './audio.js';
import { QuestManager } from './quests.js';
import { Policies } from './policies.js';
import { MediaPipeReco } from './mediapipe.js';
import { ImageReco } from './imagereco.js';

export class Recognition {
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
    
    // Флаг для предотвращения множественных распознаваний
    this._isRecognizing = false;
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

          const policyCheck = this.policies.canRecognize(markerName);
          if (!policyCheck.ok) {
            console.log('[Recognition] Policy check failed for', markerName, ':', policyCheck.reason);
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

          // Создаем AR Target, но пока скрываем его
          const arTarget = createArTargetSync(targetInfoData, {
            ui: this.ui,
            onAnswer: (value) => {
              const e = this.imageReco.trackedMarkers.get(idx);
              if (e) this._onQuestionAnswered(e, value);
            }
          });

          // ВАЖНО: Target изначально скрыт
          arTarget.visible = false;
          arScene.scene.add(arTarget);

          console.log('[Recognition] ✅ AR Target added to scene (HIDDEN) for:', markerName);

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
          this.ui.log(`[Recognition] 🔄 Starting scan effect for: ${markerName}`, 'info');

          const idxRef = idx;

          try {
            this.ui.playScanEffect(() => {
              // Колбэк вызывается ПОСЛЕ завершения эффекта
              console.log('[Recognition] ✅ SCAN EFFECT COMPLETED for marker:', markerName);
              this.ui.log(`[Recognition] ✅ Scan effect completed for: ${markerName}`, 'ok');

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
                // Добавляем небольшую задержку для плавности
                setTimeout(() => {
                  if (e && e.arTarget && !e.dismissed) {
                    e.arTarget.visible = true;
                    console.log('[Recognition] ✅ AR Target SHOWN for:', markerName);
                    this.ui.log(`[Recognition] ✅ AR Target shown: ${markerName}`, 'ok');
                    
                    // ПОКАЗЫВАЕМ МОДАЛКУ после того как AR Target стал видимым
                    const panelEl = e.arTarget.userData?.panelEl;
                    if (panelEl) {
                      const modalOverlay = panelEl.querySelector('.modal-overlay');
                      if (modalOverlay) {
                        modalOverlay.style.display = 'flex';
                        console.log('[Recognition] ✅ Modal shown after AR Target visible');
                        this.ui.log('[Recognition] ✅ Modal shown', 'ok');
                      }
                    }
                  }
                }, 100);
              } else {
                console.log('[Recognition] ❌ arTarget is null');
              }

              // Переходим в состояние ожидания ввода
              this.state = 'waitingInput';
              this._isRecognizing = false;
              console.log('[Recognition] State → waitingInput');
            });
          } catch (err) {
            console.error('[Recognition] ❌ Error in playScanEffect:', err);
            this.ui.log('[Recognition] ❌ Error: ' + err.message, 'error');
            
            // В случае ошибки показываем AR Target сразу
            if (entry.arTarget) {
              entry.arTarget.visible = true;
              console.log('[Recognition] ⚠️ Showing AR Target immediately due to error');
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

        // Обновляем позицию ДАЖЕ если target скрыт
        const t = pose.transform;
        if (t.position && t.orientation) {
          if (entry.recognizing || !entry.effectDone) {
            entry.poseSamples.push({
              px: t.position.x, py: t.position.y, pz: t.position.z,
              qx: t.orientation.x, qy: t.orientation.y, qz: t.orientation.z, qw: t.orientation.w
            });
          }
          
          // Всегда обновляем позицию
          target.position.set(t.position.x, t.position.y, t.position.z);
          target.quaternion.set(t.orientation.x, t.orientation.y, t.orientation.z, t.orientation.w);
        }

        entry.lastState = trackingState;

        // Анкер только когда target видим
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

        // Плавное позиционирование только если target видим
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
      console.warn('[Recognition] processTracking error:', e);
    }
  }
}
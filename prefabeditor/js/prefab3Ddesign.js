/**
 * prefab3Ddesign.js  v3.1 — CSS3DRenderer, проверенный
 */

(function () {
    "use strict";

    const Prefab3DDesign = (() => {

        const state = {
            ssPreviewRoot: null,
            syncActive: false,
            prefabFile: null, prefabHtml: "", prefabDocument: null,
            designFile: null, designData: null, designPrefab: null,
            questFile: null, questsRaw: null, quests: [],
            answersFile: null, answersRaw: null, answers: {},
            selectedQuestId: null, previewRoot: null,
            popup: null, status: null, questList: null, loading: false,
            CSS3DObjectClass: null
        };

        let cssRenderer = null, cssScene = null, cssRafId = null;

        // ===================== DOM UI =====================

        function createUI() {
            if (state.popup) return;
            injectStyles();
            const popup = document.createElement("div");
            popup.id = "prefab3d-design-popup";
            popup.className = "prefab3d-design-popup";
            popup.innerHTML = `
                <div class="prefab3d-design-window">
                    <div class="prefab3d-design-header">
                        <div class="prefab3d-design-title">Показать префаб с дизайном в 3D</div>
                        <button id="prefab3d-design-close" class="prefab3d-design-close" title="Закрыть">×</button>
                    </div>
                    <div class="prefab3d-design-content">
                        <div class="prefab3d-design-section">
                            <div class="prefab3d-design-label">1. HTML префаб</div>
                            <button id="prefab3d-select-html" class="prefab3d-design-button">Выбрать HTML префаб</button>
                            <div id="prefab3d-html-name" class="prefab3d-design-file-name">Не выбран</div>
                        </div>
                        <div class="prefab3d-design-section">
                            <div class="prefab3d-design-label">2. JSON с дизайном</div>
                            <button id="prefab3d-select-design" class="prefab3d-design-button">Выбрать JSON дизайна</button>
                            <div id="prefab3d-design-name" class="prefab3d-design-file-name">Не выбран</div>
                        </div>
                        <div class="prefab3d-design-section">
                            <div class="prefab3d-design-label">3. QuestTable</div>
                            <button id="prefab3d-select-quest" class="prefab3d-design-button">Выбрать questtable.json</button>
                            <div id="prefab3d-quest-name" class="prefab3d-design-file-name">Не выбран</div>
                        </div>
                        <div class="prefab3d-design-section">
                            <div class="prefab3d-design-label">4. Answers</div>
                            <button id="prefab3d-select-answers" class="prefab3d-design-button">Выбрать answers.json</button>
                            <div id="prefab3d-answers-name" class="prefab3d-design-file-name">Не выбран</div>
                        </div>
                        <div id="prefab3d-status" class="prefab3d-design-status">Выберите файлы.</div>
                        <div id="prefab3d-quest-container" class="prefab3d-quest-container" style="display:none">
                            <div class="prefab3d-design-label">5. Выберите квест для построения</div>
                            <div id="prefab3d-quest-list" class="prefab3d-quest-list"></div>
                        </div>
                        <div class="prefab3d-design-actions">
                            <button id="prefab3d-build" class="prefab3d-build-button" disabled>Создать в 3D</button>
                            <button id="prefab3d-clear" class="prefab3d-design-button">Очистить 3D превью</button>
                        </div>
                    </div>
                </div>`;
            document.body.appendChild(popup);
            state.popup = popup;
            state.status = popup.querySelector("#prefab3d-status");
            state.questList = popup.querySelector("#prefab3d-quest-list");
            bindUI();
        }

        function bindUI() {
            const r = state.popup;
            r.querySelector("#prefab3d-design-close").addEventListener("click", hide);
            r.querySelector("#prefab3d-select-html").addEventListener("click", selectHtmlFile);
            r.querySelector("#prefab3d-select-design").addEventListener("click", selectDesignFile);
            r.querySelector("#prefab3d-select-quest").addEventListener("click", selectQuestFile);
            r.querySelector("#prefab3d-select-answers").addEventListener("click", selectAnswersFile);
            r.querySelector("#prefab3d-build").addEventListener("click", buildSelectedQuest);
            r.querySelector("#prefab3d-clear").addEventListener("click", clearPreview);
        }

        function injectStyles() {
            if (document.getElementById("prefab3d-design-styles")) return;
            const s = document.createElement("style");
            s.id = "prefab3d-design-styles";
            s.textContent = `
                .prefab3d-design-popup{position:fixed;inset:0;display:none;z-index:999999;background:rgba(0,0,0,0.72);align-items:center;justify-content:center;font-family:Arial,sans-serif}
                .prefab3d-design-popup.active{display:flex}
                .prefab3d-design-window{width:720px;max-width:calc(100vw - 40px);max-height:calc(100vh - 40px);overflow:auto;background:#15171c;border:1px solid #555d6b;border-radius:10px;box-shadow:0 20px 80px rgba(0,0,0,0.8)}
                .prefab3d-design-header{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:#20242c;border-bottom:1px solid #444}
                .prefab3d-design-title{color:#fff;font-size:18px;font-weight:bold}
                .prefab3d-design-close{width:32px;height:32px;border:0;border-radius:4px;background:#333842;color:#fff;font-size:24px;cursor:pointer}
                .prefab3d-design-content{padding:18px}
                .prefab3d-design-section{margin-bottom:16px;padding:12px;background:#1d2026;border:1px solid #303640;border-radius:6px}
                .prefab3d-design-label{margin-bottom:10px;color:#d7dde7;font-weight:bold}
                .prefab3d-design-button{padding:9px 14px;border:1px solid #4e5d73;border-radius:5px;background:#2a3342;color:#fff;cursor:pointer}
                .prefab3d-design-button:hover{background:#37445a}
                .prefab3d-design-file-name{margin-top:8px;color:#9ca9ba;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
                .prefab3d-design-status{margin:15px 0;padding:10px;background:#111317;border:1px solid #303640;border-radius:5px;color:#c7d2e3}
                .prefab3d-design-status.error{color:#ff7474;border-color:#7a3535}
                .prefab3d-design-status.success{color:#8ee08e;border-color:#3f7040}
                .prefab3d-quest-container{margin-top:16px;padding:12px;background:#1d2026;border:1px solid #303640;border-radius:6px}
                .prefab3d-quest-list{max-height:320px;overflow-y:auto;border:1px solid #343b47}
                .prefab3d-quest-item{display:block;width:100%;padding:10px;border:0;border-bottom:1px solid #343b47;background:#171a20;color:#dbe4f0;text-align:left;cursor:pointer}
                .prefab3d-quest-item:hover{background:#242a34}
                .prefab3d-quest-item.active{background:#344966;color:#fff}
                .prefab3d-quest-id{display:inline-block;min-width:80px;color:#8ab4f8;font-weight:bold}
                .prefab3d-quest-text{color:#d5d9df}
                .prefab3d-design-actions{display:flex;gap:10px;margin-top:18px}
                .prefab3d-build-button{padding:10px 18px;border:1px solid #527e52;border-radius:5px;background:#2f6334;color:#fff;font-weight:bold;cursor:pointer}
                .prefab3d-build-button:disabled{opacity:0.4;cursor:default}`;
            document.head.appendChild(s);
        }

        function show() { createUI(); state.popup.classList.add("active"); }
        function hide() { if (state.popup) state.popup.classList.remove("active"); }

        // ===================== FILES =====================

        function pickFile(accept) {
            return new Promise((resolve) => {
                const input = document.createElement("input");
                input.type = "file"; input.accept = accept; input.style.display = "none";
                document.body.appendChild(input);
                input.addEventListener("change", function () {
                    const file = input.files && input.files[0] ? input.files[0] : null;
                    document.body.removeChild(input); resolve(file);
                });
                input.click();
            });
        }

        function readText(file) {
            return new Promise((resolve, reject) => {
                const r = new FileReader();
                r.onload = () => resolve(String(r.result || ""));
                r.onerror = () => reject(new Error("Не удалось прочитать файл: " + file.name));
                r.readAsText(file);
            });
        }

        async function readJson(file) {
            const text = await readText(file);
            try { return JSON.parse(text); }
            catch (e) { throw new Error("Некорректный JSON: " + file.name + ". " + e.message); }
        }

        async function selectHtmlFile() {
            try {
                const file = await pickFile(".html,.htm,text/html");
                if (!file) return;
                setStatus("Загрузка HTML префаба...");
                const html = await readText(file);
                state.prefabFile = file; state.prefabHtml = html; state.prefabDocument = parseHtml(html);
                updateFileName("prefab3d-html-name", file.name);
                setStatus("HTML префаб загружен: " + file.name, "success");
                updateReadyState();
            } catch (e) { setStatus(e.message, "error"); }
        }

        async function selectDesignFile() {
            try {
                const file = await pickFile(".json,application/json");
                if (!file) return;
                setStatus("Загрузка JSON дизайна...");
                const json = await readJson(file);
                state.designFile = file; state.designData = json; state.designPrefab = designGroupsToPrefab(resolveDesignGroups());
                updateFileName("prefab3d-design-name", file.name);
                setStatus("JSON дизайна загружен: " + file.name, "success");
                updateReadyState();
            } catch (e) { setStatus(e.message, "error"); }
        }

        async function selectQuestFile() {
            try {
                const file = await pickFile(".json,application/json");
                if (!file) return;
                setStatus("Загрузка questtable...");
                const json = await readJson(file);
                state.questFile = file; state.questsRaw = json; state.quests = normalizeQuests(json);
                updateFileName("prefab3d-quest-name", file.name);
                renderQuestList();
                setStatus("Загружено квестов: " + state.quests.length, "success");
                updateReadyState();
            } catch (e) { setStatus(e.message, "error"); }
        }

        async function selectAnswersFile() {
            try {
                const file = await pickFile(".json,application/json");
                if (!file) return;
                setStatus("Загрузка answers...");
                const json = await readJson(file);
                state.answersFile = file; state.answersRaw = json; state.answers = normalizeAnswers(json);
                updateFileName("prefab3d-answers-name", file.name);
                setStatus("Загружено ответов: " + Object.keys(state.answers).length, "success");
                updateReadyState();
            } catch (e) { setStatus(e.message, "error"); }
        }

        function updateFileName(id, name) {
            if (!state.popup) return;
            const el = state.popup.querySelector("#" + id);
            if (el) el.textContent = name || "Не выбран";
        }

        // ===================== DESIGN =====================

        function resolveDesignGroups() {
            const data = state.designData;
            if (!data) return {};
            if (Array.isArray(data)) {
                if (data.length > 0 && Array.isArray(data[0])) {
                    const headers = data[0], result = {};
                    data.slice(1).forEach(row => {
                        if (!row || !row.length) return;
                        const object = {};
                        headers.forEach((header, index) => { object[header] = row[index]; });
                        const key = object.id || object.ID || object.Name || object.name || row[0];
                        if (key) result[key] = object;
                    });
                    return result;
                }
                return data[0] || {};
            }
            if (data.groups) return data.groups;
            if (data.design) return data.design;
            return data;
        }

        function designGroupsToPrefab(groups) {
            const getter = (group, prop, def) => {
                if (!groups || !groups[group]) return def;
                const val = groups[group][prop];
                return (val !== undefined && val !== null && val !== '') ? val : def;
            };
            return {
                back_image: getter('BackGradient', 'image') || getter('BackImage', 'image'),
                title_bg_color: getter('TitleText_bg', 'color'),
                title_bg_image: getter('TitleText_bg', 'image'),
                title_color: getter('TitleText', 'color', '#FFD700'),
                title_corner_image: getter('TitleText_4corner_decor_Corner', 'image') || 'RusStyleElement',
                main_corner: getter('MainText_4corner_decor_Corner', 'image') || 'RusStyleElement',
                main_bg_color: getter('MainText_bg', 'color', 'rgba(7,7,7,0.93)'),
                main_bg_image: getter('MainText_bg', 'image', 'MainTextPanelDark'),
                main_decor1: getter('MainText_Decor_2lines_line1', 'image', 'Line2S'),
                main_decor2: getter('MainText_Decor_2lines_line2', 'image', 'Line2S'),
                left_bg_color: getter('LeftPanel_bgLeftPanel', 'color', 'rgba(7,7,7,0.93)'),
                left_bg_image: getter('LeftPanel_bgLeftPanel', 'image', 'MainTextPanelDark'),
                left_help_color: getter('LeftPanel_HelpUp', 'color', '#FF69B4'),
                left_corner: getter('LeftPanel_4corner_decor_Corner', 'image') || 'RusStyleElement',
                right_bg_color: getter('RightPanel_bgRight_Panel', 'color', 'rgba(7,7,7,0.93)'),
                right_bg_image: getter('RightPanel_bgRight_Panel', 'image', 'MainTextPanelDark'),
                right_corner: getter('RightPanel_4corner_decor_Corner', 'image') || 'RusStyleElement',
                buttons_bg_color: getter('Buttons_bgButtonsPanel', 'color', 'rgba(7,7,7,0.93)'),
                buttons_bg_image: getter('Buttons_bgButtonsPanel', 'image', 'ButtonPanelBG'),
                btn_next_text: getter('Buttons_Button_NEXT_Text', 'text', 'Дальше'),
                input_ph_text: getter('Buttons_InputField', 'text') || getter('Buttons_InputField_Placeholder', 'text', 'ВВЕДИТЕ ОТВЕТ')
            };
        }

        // ===================== NORMALIZE =====================

        function normalizeQuests(quests) {
            if (Array.isArray(quests) && quests.length > 0 && Array.isArray(quests[0])) {
                const headers = quests[0];
                return quests.slice(1).filter(row => row && row.length).map(row => {
                    const object = {};
                    headers.forEach((header, index) => { object[header] = row[index]; });
                    return normalizeQuestObject(object);
                });
            }
            if (Array.isArray(quests)) return quests.filter(Boolean).map(normalizeQuestObject);
            if (quests && typeof quests === "object") {
                if (Array.isArray(quests.quests)) return quests.quests.map(normalizeQuestObject);
                return Object.keys(quests).map(key => normalizeQuestObject(quests[key]));
            }
            return [];
        }

        function normalizeQuestObject(raw) {
            raw = raw || {};
            return {
                id: raw.id || raw.ID || raw.QuestID || raw.questId || raw.questID || "",
                question: raw.Question || raw.question || raw.Text || raw.text || "",
                picture: raw.QuestPicture_Image || raw.Picture || raw.picture || "",
                task: parseInt(raw.Task || raw.task || 1, 10) || 1,
                answers: normalizeIdList(raw.AnswerList || raw.answers || raw.Answers || raw.answerList),
                timer: parseFloat(raw.Timer || raw.timer || 0) || 0,
                rightIndices: normalizeNumberList(raw.RightWayIndx || raw.rightIndices || raw.RightIndices),
                rightQuest: raw.RightWayQuest || raw.rightQuest || "",
                wrongQuest: raw.WrongWayQuest || raw.wrongQuest || "",
                nextQuest: raw.NextWayQuest || raw.nextQuest || ""
            };
        }

        function normalizeIdList(value) {
            if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
            if (value === null || value === undefined) return [];
            return String(value).split(",").map(v => v.trim()).filter(Boolean);
        }

        function normalizeNumberList(value) {
            return normalizeIdList(value).map(v => parseInt(v, 10)).filter(v => !isNaN(v));
        }

        function normalizeAnswers(answers) {
            const map = {};
            function put(id, raw) {
                if (!id) return;
                const key = String(id).trim();
                if (!key) return;
                raw = raw || {};
                map[key] = {
                    id: key, type: raw.AnswerType || raw.type || "",
                    title: raw.TitleText_Text || raw.title || raw.Title || "",
                    mainText: raw.MainTxt_Text || raw.MainText_Text || raw.MainTxt || raw.MainText || raw.mainText || raw.Text || raw.text || raw.AnswerText || "",
                    helpUp: raw.HelpUpText_Text || raw.helpUp || "",
                    helpDown: raw.HelpDownText_Text || raw.helpDown || "",
                    question: raw.Question || raw.question || "",
                    picture: raw.AnswerPicture_Image || raw.Picture || raw.picture || ""
                };
            }
            if (Array.isArray(answers) && answers.length > 0 && Array.isArray(answers[0])) {
                const headers = answers[0].map(h => String(h || "").trim());
                answers.slice(1).forEach(row => {
                    if (!row || !row.length) return;
                    const object = {};
                    headers.forEach((header, index) => { if (header) object[header] = row[index] !== undefined ? row[index] : ""; });
                    const id = object.id || object.AnswerID || object.AnswerId || row[0];
                    put(id, object);
                });
                return map;
            }
            if (Array.isArray(answers)) {
                answers.forEach(answer => { if (answer) { const id = answer.id || answer.AnswerID || answer.AnswerId; put(id, answer); } });
                return map;
            }
            if (answers && typeof answers === "object") {
                if (Array.isArray(answers.answers)) {
                    answers.answers.forEach(answer => { if (answer) { const id = answer.id || answer.AnswerID || answer.AnswerId; put(id, answer); } });
                } else {
                    Object.keys(answers).forEach(key => { put(key, answers[key]); });
                }
            }
            return map;
        }

        // ===================== QUEST LIST =====================

        function renderQuestList() {
            if (!state.popup) return;
            const container = state.popup.querySelector("#prefab3d-quest-container");
            if (!container) return;
            state.questList.innerHTML = "";
            if (!state.quests.length) { container.style.display = "none"; return; }
            container.style.display = "block";
            state.quests.forEach(quest => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "prefab3d-quest-item";
                button.dataset.questId = String(quest.id);
                const id = escapeHtml(quest.id || "NO_ID");
                const text = escapeHtml(stripTags(quest.question || "Без текста"));
                button.innerHTML = `<span class="prefab3d-quest-id">${id}</span><span class="prefab3d-quest-text">${text}</span>`;
                button.addEventListener("click", function () { selectQuest(quest.id); });
                state.questList.appendChild(button);
            });
        }

        function selectQuest(id) {
            state.selectedQuestId = String(id);
            const buttons = state.questList.querySelectorAll(".prefab3d-quest-item");
            buttons.forEach(button => { button.classList.toggle("active", button.dataset.questId === state.selectedQuestId); });
            const quest = getSelectedQuest();
            setStatus(quest ? "Выбран квест: " + quest.id : "Квест не найден", quest ? "success" : "error");
            updateReadyState();
        }

        function getSelectedQuest() {
            if (!state.selectedQuestId) return null;
            return state.quests.find(quest => String(quest.id) === state.selectedQuestId) || null;
        }

        function updateReadyState() {
            if (!state.popup) return;
            const buildButton = state.popup.querySelector("#prefab3d-build");
            if (!buildButton) return;
            const ready = !!state.prefabHtml && !!state.designData && !!state.questFile && !!state.answersFile && !!state.selectedQuestId;
            buildButton.disabled = !ready;
        }

        function parseHtml(html) {
            const parser = new DOMParser();
            return parser.parseFromString(html, "text/html");
        }

        // ===================== CSS3D RENDERER =====================

        function getCamera() {
            const cam = (window.SceneModule && window.SceneModule.camera) || window.camera || window.Camera || window.__camera || null;
            return cam;
        }

        function ensureCSS3DRenderer() {
            if (cssRenderer && cssScene) return true;
            const THREE = window.THREE;
            if (!THREE) { setStatus("Three.js не найден", "error"); return false; }

            const CSS3DR = window.CSS3DRenderer || THREE.CSS3DRenderer;
            const CSS3DO = window.CSS3DObject || THREE.CSS3DObject;
            if (!CSS3DR || !CSS3DO) {
                setStatus("CSS3DRenderer не найден. Убедитесь, что подключен examples/js/renderers/CSS3DRenderer.js", "error");
                return false;
            }
            state.CSS3DObjectClass = CSS3DO;

            // Container inside viewport, above canvas
            const viewport = document.getElementById("viewport");
            if (!viewport) { setStatus("Viewport не найден", "error"); return false; }

            cssRenderer = new CSS3DR();
            cssRenderer.setSize(viewport.clientWidth, viewport.clientHeight);
            const dom = cssRenderer.domElement;
            dom.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5;";
            viewport.style.position = "relative";
            viewport.appendChild(dom);

            cssScene = new THREE.Scene();

            // Resize handler
            window.addEventListener("resize", () => {
                if (cssRenderer && viewport) cssRenderer.setSize(viewport.clientWidth, viewport.clientHeight);
            });

            // Render loop
            if (cssRafId) cancelAnimationFrame(cssRafId);
            function loop() {
                cssRafId = requestAnimationFrame(loop);
                const cam = getCamera();
                if (cssRenderer && cssScene && cam) cssRenderer.render(cssScene, cam);
            }
            loop();

            console.log("[Prefab3DDesign] CSS3DRenderer initialized");
            return true;
        }

        // ===================== BUILD 3D =====================

        async function buildSelectedQuest() {
            if (state.loading) return;
            const quest = getSelectedQuest();
            if (!quest) { setStatus("Сначала выберите квест.", "error"); return; }
            if (!window.THREE) { setStatus("Three.js не найден.", "error"); return; }

            try {
                state.loading = true;
                setStatus("Создание префаба в 3D...");
                clearPreview();

                if (!ensureCSS3DRenderer()) { state.loading = false; return; }
                if (!state.CSS3DObjectClass) { setStatus("CSS3DObject не инициализирован", "error"); state.loading = false; return; }

                // WebGL root — для иерархии, трансформа, raycast
                const webglRoot = new window.THREE.Group();
                webglRoot.name = "Prefab3DDesign_" + quest.id;
                addToEditorScene(webglRoot);
                state.previewRoot = webglRoot;

                // CSS3D root — для DOM-рендера
                const cssRoot = new window.THREE.Group();
                cssRoot.name = "CSS3D_" + quest.id;
                cssScene.add(cssRoot);
                state.cssPreviewRoot = cssRoot;

                // Синхронизация позиции/поворота/масштаба каждый кадр
                state.syncActive = true;
                function syncLoop() {
                    if (!state.syncActive) return;
                    if (webglRoot && cssRoot) {
                        cssRoot.position.copy(webglRoot.position);
                        cssRoot.quaternion.copy(webglRoot.quaternion);
                        cssRoot.scale.copy(webglRoot.scale);
                    }
                    requestAnimationFrame(syncLoop);
                }
                syncLoop();

                createQuest3D(cssRoot, quest);

                setStatus("Квест " + quest.id + " создан в 3D сцене.", "success");
                console.log("[Prefab3DDesign] 3D prefab created for quest:", quest.id);
            } catch (error) {
                console.error("[Prefab3DDesign] Build error:", error);
                setStatus("Ошибка создания 3D: " + error.message, "error");
            } finally {
                state.loading = false;
            }
        }

        function createQuest3D(root, quest) {
            const p = state.designPrefab || designGroupsToPrefab(resolveDesignGroups());
            const masterAnswer = quest.answers.length > 0 ? getAnswer(quest.answers[0]) : null;
            const CSS3DO = state.CSS3DObjectClass;
            const RES = "./assets/resources";

            function normAsset(name) {
                if (!name) return "";
                const n = String(name).trim();
                if (!n) return "";
                if (/^(https?:|\/\/|\.\/|\/)/i.test(n)) return n;
                return RES + "/" + n + (/\.[a-z0-9]+$/i.test(n) ? "" : ".png");
            }

            // Scale factor: 1 unit = 100px in DOM
            const S = 0.01;

            // --- Background ---
            const bgDiv = document.createElement("div");
            bgDiv.style.cssText = "width:1400px;height:900px;background:#0a0e1a;";
            if (p.back_image) {
                bgDiv.style.backgroundImage = "url('" + normAsset(p.back_image) + "')";
                bgDiv.style.backgroundSize = "cover";
            }
            const bgObj = new CSS3DO(bgDiv);
            bgObj.position.set(0, 0, -0.5);
            bgObj.scale.set(S, S, S);
            root.add(bgObj);

            // --- Title Bar ---
            const titleText = masterAnswer && masterAnswer.title ? masterAnswer.title : (quest.question || quest.id);
            const titleBar = createPanelDOM({
                width: 1360, height: 90,
                bgColor: p.title_bg_color || 'rgba(7,7,7,0.85)',
                bgImage: p.title_bg_image,
                cornerImage: p.title_corner_image || p.main_corner || 'RusStyleElement',
                text: titleText,
                textColor: p.title_color || '#FFD700',
                fontSize: 36, isBold: true, textAlign: 'center'
            });
            const titleObj = new CSS3DO(titleBar);
            titleObj.position.set(0, 3.8, 0.1);
            titleObj.scale.set(S, S, S);
            root.add(titleObj);

            // --- Left Panel ---
            const leftPanel = createPanelDOM({
                width: 360, height: 560,
                bgColor: p.left_bg_color || 'rgba(7,7,7,0.93)',
                bgImage: p.left_bg_image,
                cornerImage: p.left_corner || p.main_corner || 'RusStyleElement'
            });
            // Mandala
            const leftMandala = document.createElement("div");
            leftMandala.style.cssText = "width:140px;height:140px;margin:10px auto;border-radius:50%;border:2px dashed rgba(200,200,220,0.4);background:radial-gradient(circle, rgba(200,200,220,0.1) 0%, transparent 70%);";
            leftPanel.appendChild(leftMandala);
            // Hint
            const hintLabel = document.createElement("div");
            hintLabel.textContent = "💡 ПОДСКАЗКА";
            hintLabel.style.cssText = "color:" + (p.left_help_color || '#FF69B4') + ";font-weight:bold;font-size:18px;padding:8px 16px;";
            leftPanel.appendChild(hintLabel);
            const hintBody = document.createElement("div");
            hintBody.textContent = masterAnswer ? (masterAnswer.helpUp || "Когда найдено испытание, здесь отображается задание.") : "";
            hintBody.style.cssText = "color:#e8edf5;font-size:15px;padding:0 16px 10px 16px;line-height:1.4;";
            leftPanel.appendChild(hintBody);
            // Advice
            const adviceLabel = document.createElement("div");
            adviceLabel.textContent = "💡 СОВЕТ";
            adviceLabel.style.cssText = "color:" + (p.left_help_color || '#FF69B4') + ";font-weight:bold;font-size:18px;padding:8px 16px;";
            leftPanel.appendChild(adviceLabel);
            const adviceBody = document.createElement("div");
            adviceBody.textContent = masterAnswer ? (masterAnswer.helpDown || "Перед наведением на AR-цель осмотрись камерой вокруг.") : "";
            adviceBody.style.cssText = "color:#e8edf5;font-size:15px;padding:0 16px 10px 16px;line-height:1.4;";
            leftPanel.appendChild(adviceBody);

            const leftObj = new CSS3DO(leftPanel);
            leftObj.position.set(-5.2, 0.8, 0.15);
            leftObj.scale.set(S, S, S);
            root.add(leftObj);

            // --- Main Panel ---
            const mainPanel = createPanelDOM({
                width: 640, height: 520,
                bgColor: p.main_bg_color || 'rgba(7,7,7,0.93)',
                bgImage: p.main_bg_image,
                cornerImage: p.main_corner || 'RusStyleElement'
            });
            // Decor line 1
            const d1 = document.createElement("div");
            d1.style.cssText = "height:2px;margin:12px 30px;background:linear-gradient(90deg, transparent 0%, rgba(255,215,0,0.6) 30%, rgba(255,215,0,0.6) 70%, transparent 100%);";
            mainPanel.appendChild(d1);
            // Title
            const mainTitle = document.createElement("div");
            mainTitle.textContent = masterAnswer && masterAnswer.title ? masterAnswer.title : "Привет!";
            mainTitle.style.cssText = "color:#FFD700;font-size:28px;font-weight:bold;padding:10px 30px;";
            mainPanel.appendChild(mainTitle);
            // Text
            const mainText = document.createElement("div");
            mainText.innerHTML = stripTags(masterAnswer ? (masterAnswer.mainText || quest.question || "") : (quest.question || ""));
            mainText.style.cssText = "color:#e4e8ef;font-size:20px;padding:10px 30px;line-height:1.5;";
            mainPanel.appendChild(mainText);
            // Decor line 2
            const d2 = document.createElement("div");
            d2.style.cssText = "height:2px;margin:12px 30px;background:linear-gradient(90deg, transparent 0%, rgba(255,215,0,0.6) 30%, rgba(255,215,0,0.6) 70%, transparent 100%);";
            mainPanel.appendChild(d2);
            // Choose
            const chooseLabel = document.createElement("div");
            chooseLabel.textContent = "Выбирай!";
            chooseLabel.style.cssText = "color:#FFD700;font-size:24px;font-weight:bold;padding:10px 30px;";
            mainPanel.appendChild(chooseLabel);

            const mainObj = new CSS3DO(mainPanel);
            mainObj.position.set(0, 0.9, 0.2);
            mainObj.scale.set(S, S, S);
            root.add(mainObj);

            // --- Right Panel ---
            const rightPanel = createPanelDOM({
                width: 360, height: 560,
                bgColor: p.right_bg_color || 'rgba(7,7,7,0.93)',
                bgImage: p.right_bg_image,
                cornerImage: p.right_corner || p.main_corner || 'RusStyleElement'
            });
            // Mandala faded
            const rightMandala = document.createElement("div");
            rightMandala.style.cssText = "width:140px;height:140px;margin:10px auto;border-radius:50%;border:2px dashed rgba(200,200,220,0.25);background:radial-gradient(circle, rgba(200,200,220,0.05) 0%, transparent 70%);opacity:0.4;";
            rightPanel.appendChild(rightMandala);
            // Note
            const noteLabel = document.createElement("div");
            noteLabel.textContent = "📝 ЗАМЕТКА";
            noteLabel.style.cssText = "color:" + (p.left_help_color || '#FF69B4') + ";font-weight:bold;font-size:18px;padding:8px 16px;";
            rightPanel.appendChild(noteLabel);
            const noteBody = document.createElement("div");
            noteBody.textContent = masterAnswer ? (masterAnswer.question || "") : "";
            noteBody.style.cssText = "color:#e8edf5;font-size:15px;padding:0 16px 10px 16px;line-height:1.4;";
            rightPanel.appendChild(noteBody);

            const rightObj = new CSS3DO(rightPanel);
            rightObj.position.set(5.2, 0.8, 0.15);
            rightObj.scale.set(S, S, S);
            root.add(rightObj);

            // --- Buttons Area ---
            const btnArea = createPanelDOM({
                width: 1000, height: 160,
                bgColor: p.buttons_bg_color || 'rgba(7,7,7,0.93)',
                bgImage: p.buttons_bg_image,
                cornerImage: null
            });
            btnArea.style.cssText += "display:flex;align-items:center;justify-content:center;gap:20px;";

            // Red circles
            const leftCircle = document.createElement("div");
            leftCircle.style.cssText = "width:50px;height:50px;border-radius:50%;background:radial-gradient(circle, #cc2222 0%, #881111 100%);box-shadow:0 0 20px rgba(204,34,34,0.5);flex-shrink:0;";
            btnArea.appendChild(leftCircle);

            // Carousel
            const carouselWrap = document.createElement("div");
            carouselWrap.style.cssText = "display:flex;align-items:center;gap:10px;background:rgba(20,30,60,0.85);border:1px solid rgba(255,215,0,0.3);border-radius:8px;padding:10px 20px;min-width:400px;flex-shrink:0;";
            const arrowLeft = document.createElement("span");
            arrowLeft.textContent = "◀"; arrowLeft.style.cssText = "color:#aaa;font-size:20px;cursor:pointer;flex-shrink:0;";
            carouselWrap.appendChild(arrowLeft);
            const optionIds = quest.answers.slice(1);
            const firstOpt = optionIds.length > 0 ? getAnswer(optionIds[0]) : null;
            const optText = firstOpt ? (firstOpt.mainText || firstOpt.question || optionIds[0]) : (optionIds[0] || "");
            const optDisplay = document.createElement("div");
            optDisplay.textContent = stripTags(optText);
            optDisplay.style.cssText = "flex:1;text-align:center;color:#fff;font-size:18px;";
            carouselWrap.appendChild(optDisplay);
            const arrowRight = document.createElement("span");
            arrowRight.textContent = "▶"; arrowRight.style.cssText = "color:#FFD700;font-size:20px;cursor:pointer;flex-shrink:0;";
            carouselWrap.appendChild(arrowRight);
            btnArea.appendChild(carouselWrap);

            const rightCircle = document.createElement("div");
            rightCircle.style.cssText = "width:50px;height:50px;border-radius:50%;background:radial-gradient(circle, #cc2222 0%, #881111 100%);box-shadow:0 0 20px rgba(204,34,34,0.5);flex-shrink:0;";
            btnArea.appendChild(rightCircle);

            // Next button
            const nextBtn = document.createElement("button");
            nextBtn.textContent = p.btn_next_text || "ДАЛЬШЕ";
            nextBtn.style.cssText = "background:#cc2222;color:#fff;border:none;border-radius:6px;padding:10px 30px;font-size:18px;font-weight:bold;cursor:pointer;box-shadow:0 4px 15px rgba(204,34,34,0.4);flex-shrink:0;";
            btnArea.appendChild(nextBtn);

            const btnObj = new CSS3DO(btnArea);
            btnObj.position.set(0, -2.6, 0.25);
            btnObj.scale.set(S, S, S);
            root.add(btnObj);

            root.userData.prefab3DDesign = {
                questId: quest.id, quest: quest, masterAnswer: masterAnswer,
                htmlPrefabName: state.prefabFile ? state.prefabFile.name : "",
                designFileName: state.designFile ? state.designFile.name : "",
                questFileName: state.questFile ? state.questFile.name : "",
                answersFileName: state.answersFile ? state.answersFile.name : ""
            };
        }

        function createPanelDOM(opts) {
            opts = opts || {};
            const div = document.createElement("div");
            div.style.cssText = "width:" + (opts.width || 400) + "px;height:" + (opts.height || 300) + "px;position:relative;box-sizing:border-box;overflow:hidden;font-family:Arial,sans-serif;";
            const bg = opts.bgColor || 'rgba(7,7,7,0.93)';
            div.style.background = bg;
            if (opts.bgImage) {
                div.style.backgroundImage = "url('" + opts.bgImage + "')";
                div.style.backgroundSize = "cover";
            }
            div.style.border = "1px solid rgba(255,215,0,0.3)";
            div.style.borderRadius = "8px";

            if (opts.cornerImage) {
                const corners = [
                    { t: '0', l: '0', tr: false, tl: false },
                    { t: '0', r: '0', tr: true, tl: false },
                    { b: '0', l: '0', tr: false, tl: true },
                    { b: '0', r: '0', tr: true, tl: true }
                ];
                corners.forEach(c => {
                    const corner = document.createElement("div");
                    corner.style.cssText = "position:absolute;width:40px;height:40px;pointer-events:none;border-radius:4px;";
                    if (c.t !== undefined) corner.style.top = c.t;
                    if (c.b !== undefined) corner.style.bottom = c.b;
                    if (c.l !== undefined) corner.style.left = c.l;
                    if (c.r !== undefined) corner.style.right = c.r;
                    corner.style.borderTop = (c.tr || c.tl) ? "3px solid #FFD700" : "none";
                    corner.style.borderLeft = c.tl ? "3px solid #FFD700" : "none";
                    corner.style.borderRight = c.tr ? "3px solid #FFD700" : "none";
                    corner.style.borderBottom = (!c.tr && !c.tl) ? "3px solid #FFD700" : "none";
                    div.appendChild(corner);
                });
            }

            if (opts.text) {
                const textDiv = document.createElement("div");
                textDiv.textContent = opts.text;
                textDiv.style.cssText = "color:" + (opts.textColor || '#fff') + ";font-size:" + (opts.fontSize || 20) + "px;padding:20px;word-wrap:break-word;";
                if (opts.isBold) textDiv.style.fontWeight = "bold";
                if (opts.textAlign) textDiv.style.textAlign = opts.textAlign;
                div.appendChild(textDiv);
            }
            return div;
        }

        // ===================== CLEANUP =====================

        function clearPreview() {
            state.syncActive = false;

            // WebGL root
            if (state.previewRoot) {
                removeFromEditorScene(state.previewRoot);
                state.previewRoot = null;
            }

            // CSS3D root
            if (state.cssPreviewRoot) {
                if (cssScene) cssScene.remove(state.cssPreviewRoot);
                disposeCSS3DObject(state.cssPreviewRoot);
                state.cssPreviewRoot = null;
            }

            setStatus("3D превью очищено.");
        }

        function disposeCSS3DObject(obj) {
            if (!obj) return;
            obj.traverse(child => {
                if (child.element && child.element.parentNode) {
                    child.element.parentNode.removeChild(child.element);
                }
            });
        }

        // ===================== HELPERS =====================

        function getAnswer(id) {
            if (!id) return null;
            const key = String(id).trim();
            return state.answers[key] || null;
        }

        function stripTags(text) {
            if (text === null || text === undefined) return "";
            return String(text)
                .replace(/<size=[^>]+>/gi, "")
                .replace(/<\/size>/gi, "")
                .replace(/<color=[^>]+>/gi, "")
                .replace(/<\/color>/gi, "")
                .replace(/<[^>]*>/g, "")
                .trim();
        }

        function escapeHtml(text) {
            return String(text || "")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }

        function removeFromEditorScene(object) {
            if (!object) return;
            if (object.parent && typeof object.parent.remove === "function") {
                object.parent.remove(object);
            }
            disposeObject(object);
        }

        function disposeObject(object) {
            if (!object) return;
            object.traverse(child => {
                if (child.geometry && typeof child.geometry.dispose === "function") {
                    child.geometry.dispose();
                }
                if (child.material) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    materials.forEach(material => {
                        if (material.map && typeof material.map.dispose === "function") material.map.dispose();
                        if (typeof material.dispose === "function") material.dispose();
                    });
                }
            });
        }
        
        function setStatus(message, type) {
            if (!state.status) return;
            state.status.textContent = message;
            state.status.className = "prefab3d-design-status";
            if (type) state.status.classList.add(type);
        }

        // ===================== API =====================

        return {
            show: show, hide: hide, clearPreview: clearPreview, buildSelectedQuest: buildSelectedQuest,
            getState: function () {
                return {
                    prefabFile: state.prefabFile, designFile: state.designFile,
                    questFile: state.questFile, answersFile: state.answersFile,
                    selectedQuestId: state.selectedQuestId,
                    quests: state.quests.slice(), answers: state.answers
                };
            }
        };

    })();

    window.Prefab3DDesign = Prefab3DDesign;
    window.showPrefab3DDesign = function () { Prefab3DDesign.show(); };
    console.log("[Prefab3DDesign] Module loaded v3.1-css3d-verified");

})();
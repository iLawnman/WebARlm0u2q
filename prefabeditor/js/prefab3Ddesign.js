/**
 * prefab3Ddesign.js
 *
 * Загрузка HTML-префаба + JSON дизайна + questtable + answers
 * и построение выбранного квеста в существующей 3D сцене.
 *
 * Требования:
 * - Three.js уже используется редактором.
 * - SceneModule.init3D() должен быть вызван до показа.
 *
 * Модуль не зависит от QuestSim.
 */

(function () {
    "use strict";

    const Prefab3DDesign = (() => {

        const state = {
            prefabFile: null,
            prefabHtml: "",
            prefabDocument: null,

            designFile: null,
            designData: null,
            designPrefab: null,

            questFile: null,
            questsRaw: null,
            quests: [],

            answersFile: null,
            answersRaw: null,
            answers: {},

            selectedQuestId: null,

            root3D: null,
            previewRoot: null,
            htmlTextureCanvas: null,

            popup: null,
            status: null,
            questList: null,

            loading: false
        };

        const RES = "./assets/resources";

        // ============================================================
        // DOM
        // ============================================================

        function createUI() {
            if (state.popup) {
                return;
            }

            injectStyles();

            const popup = document.createElement("div");
            popup.id = "prefab3d-design-popup";
            popup.className = "prefab3d-design-popup";

            popup.innerHTML = `
                <div class="prefab3d-design-window">

                    <div class="prefab3d-design-header">
                        <div class="prefab3d-design-title">
                            Показать префаб с дизайном в 3D
                        </div>

                        <button
                            id="prefab3d-design-close"
                            class="prefab3d-design-close"
                            title="Закрыть">
                            ×
                        </button>
                    </div>

                    <div class="prefab3d-design-content">

                        <div class="prefab3d-design-section">
                            <div class="prefab3d-design-label">
                                1. HTML префаб
                            </div>

                            <button
                                id="prefab3d-select-html"
                                class="prefab3d-design-button">
                                Выбрать HTML префаб
                            </button>

                            <div
                                id="prefab3d-html-name"
                                class="prefab3d-design-file-name">
                                Не выбран
                            </div>
                        </div>


                        <div class="prefab3d-design-section">
                            <div class="prefab3d-design-label">
                                2. JSON с дизайном
                            </div>

                            <button
                                id="prefab3d-select-design"
                                class="prefab3d-design-button">
                                Выбрать JSON дизайна
                            </button>

                            <div
                                id="prefab3d-design-name"
                                class="prefab3d-design-file-name">
                                Не выбран
                            </div>
                        </div>


                        <div class="prefab3d-design-section">
                            <div class="prefab3d-design-label">
                                3. QuestTable
                            </div>

                            <button
                                id="prefab3d-select-quest"
                                class="prefab3d-design-button">
                                Выбрать questtable.json
                            </button>

                            <div
                                id="prefab3d-quest-name"
                                class="prefab3d-design-file-name">
                                Не выбран
                            </div>
                        </div>


                        <div class="prefab3d-design-section">
                            <div class="prefab3d-design-label">
                                4. Answers
                            </div>

                            <button
                                id="prefab3d-select-answers"
                                class="prefab3d-design-button">
                                Выбрать answers.json
                            </button>

                            <div
                                id="prefab3d-answers-name"
                                class="prefab3d-design-file-name">
                                Не выбран
                            </div>
                        </div>


                        <div
                            id="prefab3d-status"
                            class="prefab3d-design-status">
                            Выберите HTML префаб.
                        </div>


                        <div
                            id="prefab3d-quest-container"
                            class="prefab3d-quest-container"
                            style="display:none">

                            <div class="prefab3d-design-label">
                                5. Выберите квест для построения
                            </div>

                            <div
                                id="prefab3d-quest-list"
                                class="prefab3d-quest-list">
                            </div>

                        </div>


                        <div class="prefab3d-design-actions">

                            <button
                                id="prefab3d-build"
                                class="prefab3d-build-button"
                                disabled>
                                Создать в 3D
                            </button>

                            <button
                                id="prefab3d-clear"
                                class="prefab3d-design-button">
                                Очистить 3D превью
                            </button>

                        </div>

                    </div>

                </div>
            `;

            document.body.appendChild(popup);

            state.popup = popup;
            state.status = popup.querySelector("#prefab3d-status");
            state.questList = popup.querySelector("#prefab3d-quest-list");

            bindUI();
        }

        function bindUI() {
            const root = state.popup;

            root.querySelector("#prefab3d-design-close")
                .addEventListener("click", hide);

            root.querySelector("#prefab3d-select-html")
                .addEventListener("click", selectHtmlFile);

            root.querySelector("#prefab3d-select-design")
                .addEventListener("click", selectDesignFile);

            root.querySelector("#prefab3d-select-quest")
                .addEventListener("click", selectQuestFile);

            root.querySelector("#prefab3d-select-answers")
                .addEventListener("click", selectAnswersFile);

            root.querySelector("#prefab3d-build")
                .addEventListener("click", buildSelectedQuest);

            root.querySelector("#prefab3d-clear")
                .addEventListener("click", clearPreview);
        }

        function injectStyles() {
            if (document.getElementById("prefab3d-design-styles")) {
                return;
            }

            const style = document.createElement("style");
            style.id = "prefab3d-design-styles";

            style.textContent = `
                .prefab3d-design-popup {
                    position: fixed;
                    inset: 0;
                    display: none;
                    z-index: 999999;
                    background: rgba(0,0,0,0.72);
                    align-items: center;
                    justify-content: center;
                    font-family: Arial, sans-serif;
                }

                .prefab3d-design-popup.active {
                    display: flex;
                }

                .prefab3d-design-window {
                    width: 720px;
                    max-width: calc(100vw - 40px);
                    max-height: calc(100vh - 40px);
                    overflow: auto;

                    background: #15171c;
                    border: 1px solid #555d6b;
                    border-radius: 10px;

                    box-shadow: 0 20px 80px rgba(0,0,0,0.8);
                }

                .prefab3d-design-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;

                    padding: 14px 18px;

                    background: #20242c;
                    border-bottom: 1px solid #444;
                }

                .prefab3d-design-title {
                    color: #ffffff;
                    font-size: 18px;
                    font-weight: bold;
                }

                .prefab3d-design-close {
                    width: 32px;
                    height: 32px;

                    border: 0;
                    border-radius: 4px;

                    background: #333842;
                    color: #fff;

                    font-size: 24px;
                    cursor: pointer;
                }

                .prefab3d-design-content {
                    padding: 18px;
                }

                .prefab3d-design-section {
                    margin-bottom: 16px;
                    padding: 12px;

                    background: #1d2026;
                    border: 1px solid #303640;
                    border-radius: 6px;
                }

                .prefab3d-design-label {
                    margin-bottom: 10px;

                    color: #d7dde7;
                    font-weight: bold;
                }

                .prefab3d-design-button {
                    padding: 9px 14px;

                    border: 1px solid #4e5d73;
                    border-radius: 5px;

                    background: #2a3342;
                    color: #ffffff;

                    cursor: pointer;
                }

                .prefab3d-design-button:hover {
                    background: #37445a;
                }

                .prefab3d-design-file-name {
                    margin-top: 8px;

                    color: #9ca9ba;
                    font-size: 12px;

                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .prefab3d-design-status {
                    margin: 15px 0;
                    padding: 10px;

                    background: #111317;
                    border: 1px solid #303640;
                    border-radius: 5px;

                    color: #c7d2e3;
                }

                .prefab3d-design-status.error {
                    color: #ff7474;
                    border-color: #7a3535;
                }

                .prefab3d-design-status.success {
                    color: #8ee08e;
                    border-color: #3f7040;
                }

                .prefab3d-quest-container {
                    margin-top: 16px;
                    padding: 12px;

                    background: #1d2026;
                    border: 1px solid #303640;
                    border-radius: 6px;
                }

                .prefab3d-quest-list {
                    max-height: 320px;
                    overflow-y: auto;

                    border: 1px solid #343b47;
                }

                .prefab3d-quest-item {
                    display: block;
                    width: 100%;

                    padding: 10px;

                    border: 0;
                    border-bottom: 1px solid #343b47;

                    background: #171a20;
                    color: #dbe4f0;

                    text-align: left;
                    cursor: pointer;
                }

                .prefab3d-quest-item:hover {
                    background: #242a34;
                }

                .prefab3d-quest-item.active {
                    background: #344966;
                    color: #ffffff;
                }

                .prefab3d-quest-id {
                    display: inline-block;
                    min-width: 80px;

                    color: #8ab4f8;
                    font-weight: bold;
                }

                .prefab3d-quest-text {
                    color: #d5d9df;
                }

                .prefab3d-design-actions {
                    display: flex;
                    gap: 10px;
                    margin-top: 18px;
                }

                .prefab3d-build-button {
                    padding: 10px 18px;

                    border: 1px solid #527e52;
                    border-radius: 5px;

                    background: #2f6334;
                    color: #ffffff;

                    font-weight: bold;
                    cursor: pointer;
                }

                .prefab3d-build-button:disabled {
                    opacity: 0.4;
                    cursor: default;
                }
            `;

            document.head.appendChild(style);
        }

        // ============================================================
        // PUBLIC UI
        // ============================================================

        function show() {
            createUI();
            state.popup.classList.add("active");
        }

        function hide() {
            if (state.popup) {
                state.popup.classList.remove("active");
            }
        }

        // ============================================================
        // FILE PICKER
        // ============================================================

        function pickFile(accept) {
            return new Promise((resolve) => {

                const input = document.createElement("input");

                input.type = "file";
                input.accept = accept;

                input.style.display = "none";

                document.body.appendChild(input);

                input.addEventListener("change", function () {
                    const file = input.files && input.files[0]
                        ? input.files[0]
                        : null;

                    document.body.removeChild(input);

                    resolve(file);
                });

                input.click();
            });
        }

        function readText(file) {
            return new Promise((resolve, reject) => {

                const reader = new FileReader();

                reader.onload = function () {
                    resolve(String(reader.result || ""));
                };

                reader.onerror = function () {
                    reject(new Error(
                        "Не удалось прочитать файл: " + file.name
                    ));
                };

                reader.readAsText(file);
            });
        }

        async function readJson(file) {
            const text = await readText(file);

            try {
                return JSON.parse(text);
            } catch (error) {
                throw new Error(
                    "Некорректный JSON: " +
                    file.name +
                    ". " +
                    error.message
                );
            }
        }

        async function selectHtmlFile() {
            try {
                const file = await pickFile(".html,.htm,text/html");

                if (!file) {
                    return;
                }

                setStatus("Загрузка HTML префаба...");

                const html = await readText(file);

                state.prefabFile = file;
                state.prefabHtml = html;
                state.prefabDocument = parseHtml(html);

                updateFileName(
                    "prefab3d-html-name",
                    file.name
                );

                setStatus(
                    "HTML префаб загружен: " + file.name,
                    "success"
                );

                updateReadyState();

            } catch (error) {
                console.error(
                    "[Prefab3DDesign] HTML load error:",
                    error
                );

                setStatus(
                    error.message,
                    "error"
                );
            }
        }

        async function selectDesignFile() {
            try {
                const file = await pickFile(".json,application/json");

                if (!file) {
                    return;
                }

                setStatus("Загрузка JSON дизайна...");

                const json = await readJson(file);

                state.designFile = file;
                state.designData = json;
                state.designPrefab = designGroupsToPrefab(resolveDesignGroups());

                updateFileName(
                    "prefab3d-design-name",
                    file.name
                );

                setStatus(
                    "JSON дизайна загружен: " + file.name,
                    "success"
                );

                updateReadyState();

            } catch (error) {
                console.error(
                    "[Prefab3DDesign] Design load error:",
                    error
                );

                setStatus(
                    error.message,
                    "error"
                );
            }
        }

        async function selectQuestFile() {
            try {
                const file = await pickFile(".json,application/json");

                if (!file) {
                    return;
                }

                setStatus("Загрузка questtable...");

                const json = await readJson(file);

                state.questFile = file;
                state.questsRaw = json;
                state.quests = normalizeQuests(json);

                updateFileName(
                    "prefab3d-quest-name",
                    file.name
                );

                renderQuestList();

                setStatus(
                    "Загружено квестов: " +
                    state.quests.length,
                    "success"
                );

                updateReadyState();

            } catch (error) {
                console.error(
                    "[Prefab3DDesign] Quest load error:",
                    error
                );

                setStatus(
                    error.message,
                    "error"
                );
            }
        }

        async function selectAnswersFile() {
            try {
                const file = await pickFile(".json,application/json");

                if (!file) {
                    return;
                }

                setStatus("Загрузка answers...");

                const json = await readJson(file);

                state.answersFile = file;
                state.answersRaw = json;
                state.answers = normalizeAnswers(json);

                updateFileName(
                    "prefab3d-answers-name",
                    file.name
                );

                setStatus(
                    "Загружено ответов: " +
                    Object.keys(state.answers).length,
                    "success"
                );

                updateReadyState();

            } catch (error) {
                console.error(
                    "[Prefab3DDesign] Answers load error:",
                    error
                );

                setStatus(
                    error.message,
                    "error"
                );
            }
        }

        function updateFileName(id, name) {
            if (!state.popup) {
                return;
            }

            const el = state.popup.querySelector("#" + id);

            if (el) {
                el.textContent = name || "Не выбран";
            }
        }

        // ============================================================
        // DESIGN DATA — полная копия логики QuestSim
        // ============================================================

        function resolveDesignGroups() {
            const data = state.designData;
            if (!data) return {};
            if (Array.isArray(data)) {
                if (data.length > 0 && Array.isArray(data[0])) {
                    const headers = data[0];
                    const result = {};
                    data.slice(1).forEach(row => {
                        if (!row || !row.length) return;
                        const object = {};
                        headers.forEach((header, index) => {
                            object[header] = row[index];
                        });
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

        // ============================================================
        // NORMALIZE QUESTS
        // ============================================================

        function normalizeQuests(quests) {

            if (
                Array.isArray(quests) &&
                quests.length > 0 &&
                Array.isArray(quests[0])
            ) {

                const headers = quests[0];

                return quests
                    .slice(1)
                    .filter(row => row && row.length)
                    .map(row => {

                        const object = {};

                        headers.forEach((header, index) => {
                            object[header] = row[index];
                        });

                        return normalizeQuestObject(object);
                    });
            }

            if (Array.isArray(quests)) {
                return quests
                    .filter(Boolean)
                    .map(normalizeQuestObject);
            }

            if (
                quests &&
                typeof quests === "object"
            ) {

                if (Array.isArray(quests.quests)) {
                    return quests.quests
                        .map(normalizeQuestObject);
                }

                return Object.keys(quests)
                    .map(key => normalizeQuestObject(
                        quests[key]
                    ));
            }

            return [];
        }

        function normalizeQuestObject(raw) {
            raw = raw || {};

            return {
                id:
                    raw.id ||
                    raw.ID ||
                    raw.QuestID ||
                    raw.questId ||
                    raw.questID ||
                    "",

                question:
                    raw.Question ||
                    raw.question ||
                    raw.Text ||
                    raw.text ||
                    "",

                picture:
                    raw.QuestPicture_Image ||
                    raw.Picture ||
                    raw.picture ||
                    "",

                task:
                    parseInt(
                        raw.Task || raw.task || 1,
                        10
                    ) || 1,

                answers:
                    normalizeIdList(
                        raw.AnswerList ||
                        raw.answers ||
                        raw.Answers ||
                        raw.answerList
                    ),

                timer:
                    parseFloat(
                        raw.Timer ||
                        raw.timer ||
                        0
                    ) || 0,

                rightIndices:
                    normalizeNumberList(
                        raw.RightWayIndx ||
                        raw.rightIndices ||
                        raw.RightIndices
                    ),

                rightQuest:
                    raw.RightWayQuest ||
                    raw.rightQuest ||
                    "",

                wrongQuest:
                    raw.WrongWayQuest ||
                    raw.wrongQuest ||
                    "",

                nextQuest:
                    raw.NextWayQuest ||
                    raw.nextQuest ||
                    ""
            };
        }

        function normalizeIdList(value) {

            if (Array.isArray(value)) {
                return value
                    .map(v => String(v).trim())
                    .filter(Boolean);
            }

            if (
                value === null ||
                value === undefined
            ) {
                return [];
            }

            return String(value)
                .split(",")
                .map(v => v.trim())
                .filter(Boolean);
        }

        function normalizeNumberList(value) {

            return normalizeIdList(value)
                .map(v => parseInt(v, 10))
                .filter(v => !isNaN(v));
        }

        // ============================================================
        // NORMALIZE ANSWERS
        // ============================================================

        function normalizeAnswers(answers) {

            const map = {};

            function put(id, raw) {

                if (!id) {
                    return;
                }

                const key = String(id).trim();

                if (!key) {
                    return;
                }

                raw = raw || {};

                map[key] = {
                    id: key,

                    type:
                        raw.AnswerType ||
                        raw.type ||
                        "",

                    title:
                        raw.TitleText_Text ||
                        raw.title ||
                        raw.Title ||
                        "",

                    mainText:
                        raw.MainTxt_Text ||
                        raw.MainText_Text ||
                        raw.MainTxt ||
                        raw.MainText ||
                        raw.mainText ||
                        raw.Text ||
                        raw.text ||
                        raw.AnswerText ||
                        "",

                    helpUp:
                        raw.HelpUpText_Text ||
                        raw.helpUp ||
                        "",

                    helpDown:
                        raw.HelpDownText_Text ||
                        raw.helpDown ||
                        "",

                    question:
                        raw.Question ||
                        raw.question ||
                        "",

                    picture:
                        raw.AnswerPicture_Image ||
                        raw.Picture ||
                        raw.picture ||
                        ""
                };
            }

            if (
                Array.isArray(answers) &&
                answers.length > 0 &&
                Array.isArray(answers[0])
            ) {

                const headers = answers[0]
                    .map(h => String(h || "").trim());

                answers
                    .slice(1)
                    .forEach(row => {

                        if (!row || !row.length) {
                            return;
                        }

                        const object = {};

                        headers.forEach((header, index) => {
                            if (header) {
                                object[header] =
                                    row[index] !== undefined
                                        ? row[index]
                                        : "";
                            }
                        });

                        const id =
                            object.id ||
                            object.AnswerID ||
                            object.AnswerId ||
                            row[0];

                        put(id, object);
                    });

                return map;
            }

            if (
                Array.isArray(answers)
            ) {

                answers.forEach(answer => {

                    if (!answer) {
                        return;
                    }

                    const id =
                        answer.id ||
                        answer.AnswerID ||
                        answer.AnswerId;

                    put(id, answer);
                });

                return map;
            }

            if (
                answers &&
                typeof answers === "object"
            ) {

                if (Array.isArray(answers.answers)) {
                    answers.answers.forEach(answer => {

                        if (!answer) {
                            return;
                        }

                        const id =
                            answer.id ||
                            answer.AnswerID ||
                            answer.AnswerId;

                        put(id, answer);
                    });

                } else {

                    Object.keys(answers)
                        .forEach(key => {
                            put(
                                key,
                                answers[key]
                            );
                        });
                }
            }

            return map;
        }

        // ============================================================
        // QUEST LIST
        // ============================================================

        function renderQuestList() {

            if (!state.popup) {
                return;
            }

            const container =
                state.popup.querySelector(
                    "#prefab3d-quest-container"
                );

            if (!container) {
                return;
            }

            state.questList.innerHTML = "";

            if (!state.quests.length) {

                container.style.display = "none";

                return;
            }

            container.style.display = "block";

            state.quests.forEach(quest => {

                const button =
                    document.createElement("button");

                button.type = "button";

                button.className =
                    "prefab3d-quest-item";

                button.dataset.questId =
                    String(quest.id);

                const id =
                    escapeHtml(
                        quest.id || "NO_ID"
                    );

                const text =
                    escapeHtml(
                        stripTags(
                            quest.question || "Без текста"
                        )
                    );

                button.innerHTML = `
                    <span class="prefab3d-quest-id">
                        ${id}
                    </span>

                    <span class="prefab3d-quest-text">
                        ${text}
                    </span>
                `;

                button.addEventListener(
                    "click",
                    function () {
                        selectQuest(
                            quest.id
                        );
                    }
                );

                state.questList.appendChild(
                    button
                );
            });
        }

        function selectQuest(id) {

            state.selectedQuestId =
                String(id);

            const buttons =
                state.questList.querySelectorAll(
                    ".prefab3d-quest-item"
                );

            buttons.forEach(button => {

                button.classList.toggle(
                    "active",
                    button.dataset.questId ===
                    state.selectedQuestId
                );
            });

            const quest =
                getSelectedQuest();

            setStatus(
                quest
                    ? "Выбран квест: " +
                    quest.id
                    : "Квест не найден",
                quest
                    ? "success"
                    : "error"
            );

            updateReadyState();
        }

        function getSelectedQuest() {

            if (!state.selectedQuestId) {
                return null;
            }

            return state.quests.find(
                quest =>
                    String(quest.id) ===
                    state.selectedQuestId
            ) || null;
        }

        function updateReadyState() {

            if (!state.popup) {
                return;
            }

            const buildButton =
                state.popup.querySelector(
                    "#prefab3d-build"
                );

            if (!buildButton) {
                return;
            }

            const ready =
                !!state.prefabHtml &&
                !!state.designData &&
                !!state.questFile &&
                !!state.answersFile &&
                !!state.selectedQuestId;

            buildButton.disabled = !ready;
        }

        // ============================================================
        // HTML PREFAB PARSER
        // ============================================================

        function parseHtml(html) {

            const parser =
                new DOMParser();

            return parser.parseFromString(
                html,
                "text/html"
            );
        }

        // ============================================================
        // BUILD 3D — полная компоновка как в QuestSim
        // ============================================================

        async function buildSelectedQuest() {

            if (state.loading) {
                return;
            }

            const quest =
                getSelectedQuest();

            if (!quest) {

                setStatus(
                    "Сначала выберите квест.",
                    "error"
                );

                return;
            }

            if (
                !window.THREE
            ) {

                setStatus(
                    "Three.js не найден. Невозможно создать 3D объект.",
                    "error"
                );

                return;
            }

            try {

                state.loading = true;

                setStatus(
                    "Создание префаба в 3D..."
                );

                clearPreview();

                const root =
                    new THREE.Group();

                root.name =
                    "Prefab3DDesign_" +
                    quest.id;

                state.previewRoot =
                    root;

                createQuest3D(
                    root,
                    quest
                );

                addToEditorScene(
                    root
                );

                setStatus(
                    "Квест " +
                    quest.id +
                    " создан в 3D сцене.",
                    "success"
                );

                console.log(
                    "[Prefab3DDesign] 3D prefab created:",
                    root
                );

            } catch (error) {

                console.error(
                    "[Prefab3DDesign] Build error:",
                    error
                );

                setStatus(
                    "Ошибка создания 3D: " +
                    error.message,
                    "error"
                );

            } finally {

                state.loading = false;
            }
        }

        function createQuest3D(root, quest) {
            const THREE = window.THREE;
            const p = state.designPrefab || designGroupsToPrefab(resolveDesignGroups());
            const masterAnswer = quest.answers.length > 0 ? getAnswer(quest.answers[0]) : null;

            // --- Фоновая плоскость (BackGradient / BackImage) ---
            const bgTexture = createPanelTexture(1400, 900, p.back_image, null, null, true);
            const bgMat = new THREE.MeshBasicMaterial({ map: bgTexture, transparent: true, side: THREE.DoubleSide });
            const bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(14, 9), bgMat);
            bgMesh.position.set(0, 0, -0.5);
            bgMesh.name = "BG_" + quest.id;
            root.add(bgMesh);

            // --- Title Bar ---
            const titleBar = createPanel3D(
                13.6, 0.9,
                p.title_bg_color || 'rgba(7,7,7,0.85)',
                p.title_bg_image,
                p.title_corner_image || p.main_corner || 'RusStyleElement',
                p.title_color || '#FFD700',
                masterAnswer && masterAnswer.title ? masterAnswer.title : (quest.question || quest.id),
                42,
                true
            );
            titleBar.position.set(0, 3.8, 0.1);
            root.add(titleBar);

            // --- Left Panel (Подсказка + Совет) ---
            const leftPanel = createLeftPanel3D(p, masterAnswer);
            leftPanel.position.set(-5.2, 0.8, 0.15);
            root.add(leftPanel);

            // --- Main Panel (центр) ---
            const mainPanel = createMainPanel3D(p, quest, masterAnswer);
            mainPanel.position.set(0, 0.9, 0.2);
            root.add(mainPanel);

            // --- Right Panel (Заметка) ---
            const rightPanel = createRightPanel3D(p, masterAnswer);
            rightPanel.position.set(5.2, 0.8, 0.15);
            root.add(rightPanel);

            // --- Buttons Area (низ) ---
            const buttonsArea = createButtonsArea3D(p, quest);
            buttonsArea.position.set(0, -2.6, 0.25);
            root.add(buttonsArea);

            // --- Metadata ---
            root.userData.prefab3DDesign = {
                questId: quest.id,
                quest: quest,
                masterAnswer: masterAnswer,
                htmlPrefabName: state.prefabFile ? state.prefabFile.name : "",
                designFileName: state.designFile ? state.designFile.name : "",
                questFileName: state.questFile ? state.questFile.name : "",
                answersFileName: state.answersFile ? state.answersFile.name : ""
            };
        }

        // ============================================================
        // 3D PANEL BUILDERS
        // ============================================================

        function createPanel3D(width, height, bgColor, bgImage, cornerImage, textColor, text, fontSize, isBold) {
            const THREE = window.THREE;
            const group = new THREE.Group();

            // Background
            const bgTex = createPanelTexture(Math.round(width * 100), Math.round(height * 100), bgImage, bgColor, null);
            const bgMat = new THREE.MeshBasicMaterial({ map: bgTex, transparent: true, side: THREE.DoubleSide });
            const bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), bgMat);
            bgMesh.name = "PanelBG";
            group.add(bgMesh);

            // Corners
            if (cornerImage) {
                const cornerSize = Math.min(width, height) * 0.18;
                const corners = [
                    { x: -width/2 + cornerSize/2, y: height/2 - cornerSize/2 },
                    { x: width/2 - cornerSize/2, y: height/2 - cornerSize/2 },
                    { x: -width/2 + cornerSize/2, y: -height/2 + cornerSize/2 },
                    { x: width/2 - cornerSize/2, y: -height/2 + cornerSize/2 }
                ];
                corners.forEach((pos, idx) => {
                    const cTex = createCornerTexture(cornerImage, cornerSize * 100);
                    const cMat = new THREE.MeshBasicMaterial({ map: cTex, transparent: true, depthWrite: false });
                    const cMesh = new THREE.Mesh(new THREE.PlaneGeometry(cornerSize, cornerSize), cMat);
                    cMesh.position.set(pos.x, pos.y, 0.01);
                    if (idx >= 2) cMesh.scale.y = -1;
                    if (idx === 1 || idx === 3) cMesh.scale.x = -1;
                    group.add(cMesh);
                });
            }

            // Text
            if (text) {
                const textSprite = createTextSprite(stripTags(text), {
                    fontSize: fontSize || 32,
                    color: textColor || '#ffffff',
                    background: 'rgba(0,0,0,0)',
                    padding: 16,
                    maxWidth: Math.round(width * 100),
                    isBold: !!isBold
                });
                textSprite.position.set(0, 0, 0.02);
                textSprite.scale.set(width * 0.92, height * 0.72, 1);
                group.add(textSprite);
            }

            return group;
        }

        function createLeftPanel3D(p, masterAnswer) {
            const THREE = window.THREE;
            const group = new THREE.Group();

            const panelW = 3.6;
            const panelH = 5.6;

            // Background
            const bgTex = createPanelTexture(Math.round(panelW * 100), Math.round(panelH * 100), p.left_bg_image, p.left_bg_color || 'rgba(7,7,7,0.93)', null);
            const bgMat = new THREE.MeshBasicMaterial({ map: bgTex, transparent: true, side: THREE.DoubleSide });
            const bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(panelW, panelH), bgMat);
            bgMesh.name = "LeftPanelBG";
            group.add(bgMesh);

            // Corners
            const cornerImage = p.left_corner || p.main_corner || 'RusStyleElement';
            const cornerSize = 0.5;
            const corners = [
                { x: -panelW/2 + cornerSize/2, y: panelH/2 - cornerSize/2 },
                { x: panelW/2 - cornerSize/2, y: panelH/2 - cornerSize/2 },
                { x: -panelW/2 + cornerSize/2, y: -panelH/2 + cornerSize/2 },
                { x: panelW/2 - cornerSize/2, y: -panelH/2 + cornerSize/2 }
            ];
            corners.forEach((pos, idx) => {
                const cTex = createCornerTexture(cornerImage, cornerSize * 100);
                const cMat = new THREE.MeshBasicMaterial({ map: cTex, transparent: true, depthWrite: false });
                const cMesh = new THREE.Mesh(new THREE.PlaneGeometry(cornerSize, cornerSize), cMat);
                cMesh.position.set(pos.x, pos.y, 0.01);
                if (idx >= 2) cMesh.scale.y = -1;
                if (idx === 1 || idx === 3) cMesh.scale.x = -1;
                group.add(cMesh);
            });

            // Mandala
            const mandalaTex = createMandalaTexture();
            const mandalaMat = new THREE.MeshBasicMaterial({ map: mandalaTex, transparent: true, opacity: 0.6, depthWrite: false });
            const mandalaMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), mandalaMat);
            mandalaMesh.position.set(0, 1.6, 0.02);
            group.add(mandalaMesh);

            // ПОДСКАЗКА label
            const hintLabel = createTextSprite("💡 ПОДСКАЗКА", {
                fontSize: 22,
                color: p.left_help_color || '#FF69B4',
                background: 'rgba(0,0,0,0)',
                padding: 8,
                maxWidth: 300,
                isBold: true
            });
            hintLabel.position.set(0, 0.6, 0.02);
            hintLabel.scale.set(2.8, 0.4, 1);
            group.add(hintLabel);

            // HelpUp text
            const helpUpText = masterAnswer ? (masterAnswer.helpUp || "Когда найдено испытание, здесь отображается задание.") : "";
            const helpUpSprite = createTextSprite(stripTags(helpUpText), {
                fontSize: 18,
                color: '#e8edf5',
                background: 'rgba(0,0,0,0)',
                padding: 10,
                maxWidth: 320
            });
            helpUpSprite.position.set(0, 0.1, 0.02);
            helpUpSprite.scale.set(3.0, 0.8, 1);
            group.add(helpUpSprite);

            // СОВЕТ label
            const adviceLabel = createTextSprite("💡 СОВЕТ", {
                fontSize: 22,
                color: p.left_help_color || '#FF69B4',
                background: 'rgba(0,0,0,0)',
                padding: 8,
                maxWidth: 300,
                isBold: true
            });
            adviceLabel.position.set(0, -1.0, 0.02);
            adviceLabel.scale.set(2.8, 0.4, 1);
            group.add(adviceLabel);

            // HelpDown text
            const helpDownText = masterAnswer ? (masterAnswer.helpDown || "Перед наведением на AR-цель осмотрись камерой вокруг.") : "";
            const helpDownSprite = createTextSprite(stripTags(helpDownText), {
                fontSize: 18,
                color: '#e8edf5',
                background: 'rgba(0,0,0,0)',
                padding: 10,
                maxWidth: 320
            });
            helpDownSprite.position.set(0, -1.5, 0.02);
            helpDownSprite.scale.set(3.0, 0.8, 1);
            group.add(helpDownSprite);

            return group;
        }

        function createMainPanel3D(p, quest, masterAnswer) {
            const THREE = window.THREE;
            const group = new THREE.Group();

            const panelW = 6.4;
            const panelH = 5.2;

            // Background
            const bgTex = createPanelTexture(Math.round(panelW * 100), Math.round(panelH * 100), p.main_bg_image, p.main_bg_color || 'rgba(7,7,7,0.93)', null);
            const bgMat = new THREE.MeshBasicMaterial({ map: bgTex, transparent: true, side: THREE.DoubleSide });
            const bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(panelW, panelH), bgMat);
            bgMesh.name = "MainPanelBG";
            group.add(bgMesh);

            // Corners
            const cornerImage = p.main_corner || 'RusStyleElement';
            const cornerSize = 0.5;
            const corners = [
                { x: -panelW/2 + cornerSize/2, y: panelH/2 - cornerSize/2 },
                { x: panelW/2 - cornerSize/2, y: panelH/2 - cornerSize/2 },
                { x: -panelW/2 + cornerSize/2, y: -panelH/2 + cornerSize/2 },
                { x: panelW/2 - cornerSize/2, y: -panelH/2 + cornerSize/2 }
            ];
            corners.forEach((pos, idx) => {
                const cTex = createCornerTexture(cornerImage, cornerSize * 100);
                const cMat = new THREE.MeshBasicMaterial({ map: cTex, transparent: true, depthWrite: false });
                const cMesh = new THREE.Mesh(new THREE.PlaneGeometry(cornerSize, cornerSize), cMat);
                cMesh.position.set(pos.x, pos.y, 0.01);
                if (idx >= 2) cMesh.scale.y = -1;
                if (idx === 1 || idx === 3) cMesh.scale.x = -1;
                group.add(cMesh);
            });

            // Decor lines
            const decorW = panelW * 0.85;
            const decorH = 0.08;
            const d1Tex = createDecorLineTexture(p.main_decor1 || 'Line2S', decorW * 100, decorH * 100);
            const d1Mat = new THREE.MeshBasicMaterial({ map: d1Tex, transparent: true, depthWrite: false });
            const d1 = new THREE.Mesh(new THREE.PlaneGeometry(decorW, decorH), d1Mat);
            d1.position.set(0, 1.8, 0.02);
            group.add(d1);

            const d2Tex = createDecorLineTexture(p.main_decor2 || 'Line2S', decorW * 100, decorH * 100);
            const d2Mat = new THREE.MeshBasicMaterial({ map: d2Tex, transparent: true, depthWrite: false });
            const d2 = new THREE.Mesh(new THREE.PlaneGeometry(decorW, decorH), d2Mat);
            d2.position.set(0, -1.8, 0.02);
            group.add(d2);

            // Привет! / Title inside main
            const mainTitle = masterAnswer && masterAnswer.title ? masterAnswer.title : "Привет!";
            const titleSprite = createTextSprite(stripTags(mainTitle), {
                fontSize: 36,
                color: '#FFD700',
                background: 'rgba(0,0,0,0)',
                padding: 12,
                maxWidth: 600,
                isBold: true
            });
            titleSprite.position.set(0, 1.2, 0.03);
            titleSprite.scale.set(5.0, 0.6, 1);
            group.add(titleSprite);

            // Main text
            const mainText = masterAnswer ? (masterAnswer.mainText || quest.question || "") : (quest.question || "");
            const textSprite = createTextSprite(stripTags(mainText), {
                fontSize: 26,
                color: '#e4e8ef',
                background: 'rgba(0,0,0,0.3)',
                padding: 20,
                maxWidth: 580
            });
            textSprite.position.set(0, 0.0, 0.03);
            textSprite.scale.set(5.6, 2.2, 1);
            group.add(textSprite);

            // Выбирай!
            const chooseSprite = createTextSprite("Выбирай!", {
                fontSize: 32,
                color: '#FFD700',
                background: 'rgba(0,0,0,0)',
                padding: 12,
                maxWidth: 300,
                isBold: true
            });
            chooseSprite.position.set(0, -1.4, 0.03);
            chooseSprite.scale.set(3.0, 0.5, 1);
            group.add(chooseSprite);

            return group;
        }

        function createRightPanel3D(p, masterAnswer) {
            const THREE = window.THREE;
            const group = new THREE.Group();

            const panelW = 3.6;
            const panelH = 5.6;

            // Background
            const bgTex = createPanelTexture(Math.round(panelW * 100), Math.round(panelH * 100), p.right_bg_image, p.right_bg_color || 'rgba(7,7,7,0.93)', null);
            const bgMat = new THREE.MeshBasicMaterial({ map: bgTex, transparent: true, side: THREE.DoubleSide });
            const bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(panelW, panelH), bgMat);
            bgMesh.name = "RightPanelBG";
            group.add(bgMesh);

            // Corners
            const cornerImage = p.right_corner || p.main_corner || 'RusStyleElement';
            const cornerSize = 0.5;
            const corners = [
                { x: -panelW/2 + cornerSize/2, y: panelH/2 - cornerSize/2 },
                { x: panelW/2 - cornerSize/2, y: panelH/2 - cornerSize/2 },
                { x: -panelW/2 + cornerSize/2, y: -panelH/2 + cornerSize/2 },
                { x: panelW/2 - cornerSize/2, y: -panelH/2 + cornerSize/2 }
            ];
            corners.forEach((pos, idx) => {
                const cTex = createCornerTexture(cornerImage, cornerSize * 100);
                const cMat = new THREE.MeshBasicMaterial({ map: cTex, transparent: true, depthWrite: false });
                const cMesh = new THREE.Mesh(new THREE.PlaneGeometry(cornerSize, cornerSize), cMat);
                cMesh.position.set(pos.x, pos.y, 0.01);
                if (idx >= 2) cMesh.scale.y = -1;
                if (idx === 1 || idx === 3) cMesh.scale.x = -1;
                group.add(cMesh);
            });

            // Mandala (faded)
            const mandalaTex = createMandalaTexture();
            const mandalaMat = new THREE.MeshBasicMaterial({ map: mandalaTex, transparent: true, opacity: 0.4, depthWrite: false });
            const mandalaMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), mandalaMat);
            mandalaMesh.position.set(0, 1.6, 0.02);
            group.add(mandalaMesh);

            // ЗАМЕТКА label
            const noteLabel = createTextSprite("📝 ЗАМЕТКА", {
                fontSize: 22,
                color: p.left_help_color || '#FF69B4',
                background: 'rgba(0,0,0,0)',
                padding: 8,
                maxWidth: 300,
                isBold: true
            });
            noteLabel.position.set(0, 0.6, 0.02);
            noteLabel.scale.set(2.8, 0.4, 1);
            group.add(noteLabel);

            // Question text (right panel body)
            const rightText = masterAnswer ? (masterAnswer.question || "") : "";
            const rightSprite = createTextSprite(stripTags(rightText), {
                fontSize: 18,
                color: '#e8edf5',
                background: 'rgba(0,0,0,0)',
                padding: 10,
                maxWidth: 320
            });
            rightSprite.position.set(0, 0.0, 0.02);
            rightSprite.scale.set(3.0, 1.2, 1);
            group.add(rightSprite);

            return group;
        }

        function createButtonsArea3D(p, quest) {
            const THREE = window.THREE;
            const group = new THREE.Group();

            const areaW = 10.0;
            const areaH = 1.6;

            // Background
            const bgTex = createPanelTexture(Math.round(areaW * 100), Math.round(areaH * 100), p.buttons_bg_image, p.buttons_bg_color || 'rgba(7,7,7,0.93)', null);
            const bgMat = new THREE.MeshBasicMaterial({ map: bgTex, transparent: true, side: THREE.DoubleSide });
            const bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(areaW, areaH), bgMat);
            bgMesh.name = "ButtonsAreaBG";
            group.add(bgMesh);

            // Red decorative circles on sides
            const circleGeo = new THREE.CircleGeometry(0.35, 32);
            const circleMat = new THREE.MeshBasicMaterial({ color: 0xcc2222, transparent: true, opacity: 0.8 });
            const leftCircle = new THREE.Mesh(circleGeo, circleMat);
            leftCircle.position.set(-4.5, 0, 0.02);
            group.add(leftCircle);
            const rightCircle = new THREE.Mesh(circleGeo, circleMat);
            rightCircle.position.set(4.5, 0, 0.02);
            group.add(rightCircle);

            // Options / Carousel / Input
            const optionIds = quest.answers.slice(1);
            const maxOptions = Math.min(optionIds.length, 6);

            if (maxOptions > 0) {
                // Carousel display area
                const carouselW = 5.0;
                const carouselH = 0.7;
                const carouselTex = createPanelTexture(Math.round(carouselW * 100), Math.round(carouselH * 100), null, 'rgba(20,30,60,0.85)', null, true);
                const carouselMat = new THREE.MeshBasicMaterial({ map: carouselTex, transparent: true, side: THREE.DoubleSide });
                const carouselMesh = new THREE.Mesh(new THREE.PlaneGeometry(carouselW, carouselH), carouselMat);
                carouselMesh.position.set(0, 0.15, 0.03);
                group.add(carouselMesh);

                // Arrow left
                const arrowLeft = createTextSprite("◀", { fontSize: 28, color: '#aaaaaa', background: 'rgba(0,0,0,0)', padding: 4 });
                arrowLeft.position.set(-2.8, 0.15, 0.04);
                arrowLeft.scale.set(0.4, 0.4, 1);
                group.add(arrowLeft);

                // Arrow right
                const arrowRight = createTextSprite("▶", { fontSize: 28, color: '#FFD700', background: 'rgba(0,0,0,0)', padding: 4 });
                arrowRight.position.set(2.8, 0.15, 0.04);
                arrowRight.scale.set(0.4, 0.4, 1);
                group.add(arrowRight);

                // Option text in carousel
                const firstOpt = getAnswer(optionIds[0]);
                const optText = firstOpt ? (firstOpt.mainText || firstOpt.question || optionIds[0]) : optionIds[0];
                const optSprite = createTextSprite(stripTags(optText), {
                    fontSize: 22,
                    color: '#ffffff',
                    background: 'rgba(0,0,0,0)',
                    padding: 8,
                    maxWidth: 450
                });
                optSprite.position.set(0, 0.15, 0.05);
                optSprite.scale.set(4.2, 0.5, 1);
                group.add(optSprite);

                // ДАЛЬШЕ button
                const btnW = 2.2;
                const btnH = 0.55;
                const btnColor = normalizeColor(p.buttons_bg_color, '#cc2222');
                const btnTex = createPanelTexture(Math.round(btnW * 100), Math.round(btnH * 100), null, btnColor, null, true);
                const btnMat = new THREE.MeshBasicMaterial({ map: btnTex, transparent: true, side: THREE.DoubleSide });
                const btnMesh = new THREE.Mesh(new THREE.PlaneGeometry(btnW, btnH), btnMat);
                btnMesh.position.set(0, -0.55, 0.03);
                group.add(btnMesh);

                const btnText = createTextSprite(p.btn_next_text || "ДАЛЬШЕ", {
                    fontSize: 24,
                    color: '#ffffff',
                    background: 'rgba(0,0,0,0)',
                    padding: 8,
                    maxWidth: 200,
                    isBold: true
                });
                btnText.position.set(0, -0.55, 0.04);
                btnText.scale.set(1.8, 0.4, 1);
                group.add(btnText);
            }

            return group;
        }

        // ============================================================
        // TEXTURE GENERATORS
        // ============================================================

        function createPanelTexture(width, height, imageName, color, borderColor, isRounded) {
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(width));
            canvas.height = Math.max(1, Math.round(height));
            const ctx = canvas.getContext("2d");

            const bg = color ? normalizeColor(color, '#1a1f2e') : '#1a1f2e';

            if (isRounded) {
                roundRectPath(ctx, 0, 0, canvas.width, canvas.height, 20);
                ctx.fillStyle = bg;
                ctx.fill();
                if (borderColor) {
                    ctx.strokeStyle = borderColor;
                    ctx.lineWidth = 3;
                    ctx.stroke();
                }
            } else {
                ctx.fillStyle = bg;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                if (borderColor) {
                    ctx.strokeStyle = borderColor;
                    ctx.lineWidth = 3;
                    ctx.strokeRect(0, 0, canvas.width, canvas.height);
                }
            }

            // If image specified, draw placeholder pattern
            if (imageName) {
                ctx.fillStyle = 'rgba(255,255,255,0.05)';
                for (let i = 0; i < canvas.width; i += 40) {
                    ctx.fillRect(i, 0, 1, canvas.height);
                }
                for (let j = 0; j < canvas.height; j += 40) {
                    ctx.fillRect(0, j, canvas.width, 1);
                }
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
                ctx.font = '14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('[' + imageName + ']', canvas.width / 2, canvas.height / 2);
            }

            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            if (window.THREE.SRGBColorSpace) {
                texture.colorSpace = window.THREE.SRGBColorSpace;
            }
            return texture;
        }

        function createCornerTexture(imageName, size) {
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(size));
            canvas.height = Math.max(1, Math.round(size));
            const ctx = canvas.getContext("2d");

            // Draw ornamental corner pattern
            const s = canvas.width;
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = Math.max(2, s / 20);

            // Outer frame corner
            ctx.beginPath();
            ctx.moveTo(0, s * 0.7);
            ctx.quadraticCurveTo(0, 0, s * 0.7, 0);
            ctx.lineTo(s * 0.5, 0);
            ctx.quadraticCurveTo(0, 0, 0, s * 0.5);
            ctx.closePath();
            ctx.stroke();

            // Inner decorative curl
            ctx.beginPath();
            ctx.moveTo(s * 0.1, s * 0.6);
            ctx.quadraticCurveTo(s * 0.1, s * 0.1, s * 0.6, s * 0.1);
            ctx.stroke();

            // Dots
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(s * 0.15, s * 0.15, s / 25, 0, Math.PI * 2);
            ctx.fill();

            // Label
            ctx.font = Math.max(8, s / 8) + 'px Arial';
            ctx.fillStyle = 'rgba(255,215,0,0.5)';
            ctx.textAlign = 'center';
            ctx.fillText(imageName.substring(0, 4), s * 0.5, s * 0.55);

            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            if (window.THREE.SRGBColorSpace) {
                texture.colorSpace = window.THREE.SRGBColorSpace;
            }
            return texture;
        }

        function createMandalaTexture() {
            const canvas = document.createElement("canvas");
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext("2d");
            const cx = 128, cy = 128;

            ctx.strokeStyle = 'rgba(200,200,220,0.4)';
            ctx.lineWidth = 1.5;

            // Concentric circles
            for (let r = 20; r < 120; r += 15) {
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Radial lines
            for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(a) * 20, cy + Math.sin(a) * 20);
                ctx.lineTo(cx + Math.cos(a) * 115, cy + Math.sin(a) * 115);
                ctx.stroke();
            }

            // Decorative dots
            ctx.fillStyle = 'rgba(200,200,220,0.5)';
            for (let r = 35; r < 110; r += 25) {
                for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
                    ctx.beginPath();
                    ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            if (window.THREE.SRGBColorSpace) {
                texture.colorSpace = window.THREE.SRGBColorSpace;
            }
            return texture;
        }

        function createDecorLineTexture(imageName, width, height) {
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(width));
            canvas.height = Math.max(1, Math.round(height));
            const ctx = canvas.getContext("2d");

            // Gradient line
            const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
            grad.addColorStop(0, 'rgba(255,215,0,0)');
            grad.addColorStop(0.3, 'rgba(255,215,0,0.6)');
            grad.addColorStop(0.7, 'rgba(255,215,0,0.6)');
            grad.addColorStop(1, 'rgba(255,215,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Center dot
            ctx.fillStyle = 'rgba(255,215,0,0.9)';
            const dotR = Math.max(2, canvas.height * 0.3);
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, dotR, 0, Math.PI * 2);
            ctx.fill();

            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            if (window.THREE.SRGBColorSpace) {
                texture.colorSpace = window.THREE.SRGBColorSpace;
            }
            return texture;
        }

        // ============================================================
        // TEXT SPRITE
        // ============================================================

        function createTextSprite(text, options) {
            options = options || {};
            const canvas = document.createElement("canvas");
            const width = options.maxWidth || 1024;
            const height = 256;
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");

            const fontSize = options.fontSize || 32;
            const padding = options.padding || 16;
            const background = options.background || "rgba(0,0,0,0)";

            ctx.fillStyle = background;
            ctx.fillRect(0, 0, width, height);

            const fontWeight = options.isBold ? "bold " : "";
            ctx.font = fontWeight + fontSize + "px Arial, sans-serif";
            ctx.fillStyle = options.color || "#ffffff";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            const lines = wrapText(ctx, String(text || ""), width - padding * 2, fontSize);
            const lineHeight = fontSize * 1.2;
            const totalHeight = lines.length * lineHeight;
            let y = (height - totalHeight) / 2 + lineHeight / 2;

            lines.slice(0, 8).forEach(line => {
                ctx.fillText(line, width / 2, y);
                y += lineHeight;
            });

            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            if (window.THREE.SRGBColorSpace) {
                texture.colorSpace = window.THREE.SRGBColorSpace;
            }

            const material = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                depthWrite: false
            });

            return new THREE.Sprite(material);
        }

        // ============================================================
        // ADD TO EDITOR SCENE
        // ============================================================

        function addToEditorScene(object) {

            // 1. Пробуем публичный API SceneModule
            if (
                window.SceneModule
            ) {

                const methods = [
                    "addObject",
                    "addObject3D",
                    "addToScene",
                    "addSceneObject",
                    "addExternalObject"
                ];

                for (
                    let i = 0;
                    i < methods.length;
                    i++
                ) {

                    const fn =
                        window.SceneModule[
                            methods[i]
                            ];

                    if (
                        typeof fn ===
                        "function"
                    ) {

                        try {

                            fn(object);

                            console.log(
                                "[Prefab3DDesign] Added through SceneModule." +
                                methods[i]
                            );

                            return;
                        } catch (error) {

                            console.warn(
                                "[Prefab3DDesign] SceneModule." +
                                methods[i] +
                                " failed:",
                                error
                            );
                        }
                    }
                }
            }

            // 2. Пробуем известные глобальные scene
            const candidates = [
                window.scene,
                window.Scene,
                window.__scene,
                window.__editorScene
            ];

            for (
                let i = 0;
                i < candidates.length;
                i++
            ) {

                const scene =
                    candidates[i];

                if (
                    scene &&
                    typeof scene.add ===
                    "function"
                ) {

                    scene.add(
                        object
                    );

                    return;
                }
            }

            // 3. SceneModule.scene
            if (
                window.SceneModule &&
                window.SceneModule.scene &&
                typeof window.SceneModule.scene.add ===
                "function"
            ) {

                window.SceneModule.scene.add(
                    object
                );

                return;
            }

            throw new Error(
                "Не найден объект THREE.Scene. " +
                "Нужно добавить в SceneModule публичный метод addObject(object)."
            );
        }

        function removeFromEditorScene(
            object
        ) {

            if (!object) {
                return;
            }

            if (
                object.parent &&
                typeof object.parent.remove ===
                "function"
            ) {

                object.parent.remove(
                    object
                );
            }

            disposeObject(
                object
            );
        }

        function clearPreview() {

            if (!state.previewRoot) {
                return;
            }

            removeFromEditorScene(
                state.previewRoot
            );

            state.previewRoot =
                null;

            setStatus(
                "3D превью очищено."
            );
        }

        function disposeObject(object) {

            if (!object) {
                return;
            }

            object.traverse(
                child => {

                    if (
                        child.geometry &&
                        typeof child.geometry.dispose ===
                        "function"
                    ) {

                        child.geometry.dispose();
                    }

                    if (
                        child.material
                    ) {

                        const materials =
                            Array.isArray(
                                child.material
                            )
                                ? child.material
                                : [
                                    child.material
                                ];

                        materials.forEach(
                            material => {

                                if (
                                    material.map &&
                                    typeof material.map.dispose ===
                                    "function"
                                ) {

                                    material.map.dispose();
                                }

                                if (
                                    typeof material.dispose ===
                                    "function"
                                ) {

                                    material.dispose();
                                }
                            }
                        );
                    }
                }
            );
        }

        // ============================================================
        // HELPERS
        // ============================================================

        function getAnswer(id) {

            if (!id) {
                return null;
            }

            const key =
                String(id).trim();

            return (
                state.answers[key] ||
                null
            );
        }

        function stripTags(text) {

            if (
                text === null ||
                text === undefined
            ) {
                return "";
            }

            return String(text)
                .replace(
                    /<size=[^>]+>/gi,
                    ""
                )
                .replace(
                    /<\/size>/gi,
                    ""
                )
                .replace(
                    /<color=[^>]+>/gi,
                    ""
                )
                .replace(
                    /<\/color>/gi,
                    ""
                )
                .replace(
                    /<[^>]*>/g,
                    ""
                )
                .trim();
        }

        function escapeHtml(text) {

            return String(text || "")
                .replace(
                    /&/g,
                    "&amp;"
                )
                .replace(
                    /</g,
                    "&lt;"
                )
                .replace(
                    />/g,
                    "&gt;"
                )
                .replace(
                    /"/g,
                    "&quot;"
                )
                .replace(
                    /'/g,
                    "&#039;"
                );
        }

        function normalizeColor(
            color,
            fallback
        ) {

            if (
                !color ||
                typeof color !==
                "string"
            ) {
                return fallback;
            }

            const value =
                color.trim();

            if (
                value.startsWith("#") ||
                value.startsWith("rgb") ||
                value.startsWith("hsl") ||
                value.startsWith("rgba")
            ) {

                return value;
            }

            // Named colors fallback
            const named = {
                'gold': '#FFD700',
                'red': '#ff0000',
                'white': '#ffffff',
                'black': '#000000',
                'pink': '#FF69B4',
                'yellow': '#FFD700'
            };
            const lower = value.toLowerCase();
            if (named[lower]) return named[lower];

            return fallback;
        }

        function roundRectPath(ctx, x, y, width, height, radius) {
            const r = Math.min(radius, width / 2, height / 2);
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + width - r, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + r);
            ctx.lineTo(x + width, y + height - r);
            ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
            ctx.lineTo(x + r, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
        }

        function wrapText(
            ctx,
            text,
            maxWidth,
            fontSize
        ) {

            ctx.font =
                fontSize +
                "px Arial";

            const words =
                String(text || "")
                    .split(/\s+/);

            const lines = [];

            let line =
                "";

            words.forEach(
                word => {

                    const test =
                        line
                            ? line +
                            " " +
                            word
                            : word;

                    const width =
                        ctx.measureText(
                            test
                        ).width;

                    if (
                        width > maxWidth &&
                        line
                    ) {

                        lines.push(
                            line
                        );

                        line =
                            word;

                    } else {

                        line =
                            test;
                    }
                }
            );

            if (line) {
                lines.push(
                    line
                );
            }

            return lines;
        }

        function setStatus(
            message,
            type
        ) {

            if (!state.status) {
                return;
            }

            state.status.textContent =
                message;

            state.status.className =
                "prefab3d-design-status";

            if (type) {
                state.status.classList.add(
                    type
                );
            }
        }

        // ============================================================
        // API
        // ============================================================

        return {
            show: show,
            hide: hide,

            clearPreview: clearPreview,

            buildSelectedQuest:
            buildSelectedQuest,

            getState: function () {
                return {
                    prefabFile:
                    state.prefabFile,

                    designFile:
                    state.designFile,

                    questFile:
                    state.questFile,

                    answersFile:
                    state.answersFile,

                    selectedQuestId:
                    state.selectedQuestId,

                    quests:
                        state.quests.slice(),

                    answers:
                    state.answers
                };
            }
        };

    })();

    window.Prefab3DDesign =
        Prefab3DDesign;

    // Для кнопки через inline onclick,
    // если она уже используется в HTML редактора.
    window.showPrefab3DDesign =
        function () {
            Prefab3DDesign.show();
        };

    console.log(
        "[Prefab3DDesign] Module loaded v2.1-full"
    );

})();
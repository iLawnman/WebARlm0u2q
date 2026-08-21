/* ========== QuestSim ========== */
const QuestSim = (() => {
    const RES = "./assets/resources";
    let QUEST_DATA = [], ANSWER_DATA = {}, currentQuest = null;
    let selectedOptionIdx = -1, carouselIdx = 0, timerId = null, timeLeft = 0, inputValue = "";
    let currentOptions = [];

    function $(id) { return document.getElementById(id); }

    function setStatus(msg, type) {
        const el = $("sim-status");
        if (!el) return;
        el.textContent = msg; el.className = type || "";
    }

    function showStartBtn(show) {
        const btn = $("btn-start-sim");
        if (btn) btn.style.display = show ? "block" : "none";
    }

    function stripTags(t) {
        if (!t) return "";
        return String(t)
            .replace(/<size=[^>]+>/gi, "").replace(/<\/size>/gi, "")
            .replace(/<color=["']?#?[^"'>]+["']?>/gi, '<span style="color:#E90E1B">')
            .replace(/<\/color>/gi, "</span>")
            .replace(/<b>/gi, "<strong>").replace(/<\/b>/gi, "</strong>")
            .replace(/<i>/gi, "em").replace(/<\/i>/gi, "</em>")
            .replace(/<align=["']?left["']?>/gi, '<div style="text-align:left">')
            .replace(/<\/align>/gi, "</div>")
            .replace(/\t/g, "  ");
    }

    function normalizeAsset(name) {
        if (!name) return "";
        const n = String(name).trim();
        if (!n) return "";
        if (/^(https?:|\/\/|\.\/|\/)/i.test(n)) return n;
        return RES + "/" + n + (/\.[a-z0-9]+$/i.test(n) ? "" : ".png");
    }

    function renderMediaMarkup(pictureName, textContent) {
        var html = "";
        if (pictureName && String(pictureName).trim() !== "") {
            var imgUrl = normalizeAsset(pictureName);
            if (imgUrl) {
                html += '<div class="resource-image-wrap"><img src="' + imgUrl + '" alt="Ресурс" onerror="this.style.display=\'none\'" /></div>';
            }
        }
        if (textContent) {
            html += stripTags(textContent);
        }
        return html;
    }

    function setCornerBg(el, imgName) {
        if (!el) return;
        const url = normalizeAsset(imgName || "RusStyleElement");
        el.style.backgroundImage = url ? "url('" + url + "')" : "";
    }

    function applyDesign() {
        const p = (typeof DesignBuilder !== "undefined" && DesignBuilder.getCurrentPrefab) ? DesignBuilder.getCurrentPrefab() : null;
        if (!p) return;
        const bg = $("sim-bg");
        if (bg && p.back_image) bg.style.backgroundImage = "url('" + normalizeAsset(p.back_image) + "')";
        const titleBar = $("sim-title-bar");
        if (titleBar) {
            if (p.title_bg_color) titleBar.style.backgroundColor = p.title_bg_color;
            if (p.title_bg_image) {
                titleBar.style.backgroundImage = "url('" + normalizeAsset(p.title_bg_image) + "')";
                titleBar.style.backgroundSize = "cover";
            }
        }
        if (p.title_color) $("sim-title-text").style.color = p.title_color;
        const titleCorner = p.title_corner_image || p.main_corner || "RusStyleElement";
        ["sim-title-c-tl","sim-title-c-tr","sim-title-c-bl","sim-title-c-br"].forEach(function(id) {
            setCornerBg($(id), titleCorner);
        });
        const main = $("sim-main");
        if (main) {
            if (p.main_bg_color) main.style.backgroundColor = p.main_bg_color;
            if (p.main_bg_image) {
                main.style.backgroundImage = "url('" + normalizeAsset(p.main_bg_image) + "')";
                main.style.backgroundSize = "cover";
            }
        }
        ["sim-main-c-tl","sim-main-c-tr","sim-main-c-bl","sim-main-c-br"].forEach(function(id) {
            setCornerBg($(id), p.main_corner || "RusStyleElement");
        });
        const d1 = $("sim-decor-1"), d2 = $("sim-decor-2"), d3 = $("sim-decor-3");
        if (d1) d1.style.backgroundImage = "url('" + normalizeAsset(p.main_decor1 || "Line2S") + "')";
        if (d2) d2.style.backgroundImage = "url('" + normalizeAsset(p.main_decor2 || "Line2S") + "')";
        if (d3) d3.style.backgroundImage = "url('" + normalizeAsset(p.main_decor1 || "Line2S") + "')";
        [$("sim-help-up"), $("sim-help-down")].forEach(function(card) {
            if (!card) return;
            if (p.left_bg_color) card.style.backgroundColor = p.left_bg_color;
            if (p.left_bg_image) {
                card.style.backgroundImage = "url('" + normalizeAsset(p.left_bg_image) + "')";
                card.style.backgroundSize = "cover";
            }
            if (p.left_help_color) card.style.color = p.left_help_color;
            card.querySelectorAll(".sim-panel-corner").forEach(function(c) {
                setCornerBg(c, p.left_corner || "RusStyleElement");
            });
        });
        const leftMandala = $("sim-left-mandala");
        if (leftMandala) leftMandala.style.backgroundImage = "url('" + normalizeAsset("mandala") + "')";
        const rightCard = $("sim-right-help");
        if (rightCard) {
            if (p.right_bg_color) rightCard.style.backgroundColor = p.right_bg_color;
            if (p.right_bg_image) {
                rightCard.style.backgroundImage = "url('" + normalizeAsset(p.right_bg_image) + "')";
                rightCard.style.backgroundSize = "cover";
            }
            rightCard.querySelectorAll(".sim-panel-corner").forEach(function(c) {
                setCornerBg(c, p.right_corner || "RusStyleElement");
            });
        }
        const rightMandala = $("sim-right-mandala");
        if (rightMandala) {
            rightMandala.style.backgroundImage = "url('" + normalizeAsset("mandala") + "')";
            rightMandala.style.opacity = "0.4";
        }
        const btnArea = $("sim-buttons-area");
        if (btnArea) {
            if (p.buttons_bg_color) btnArea.style.backgroundColor = p.buttons_bg_color;
            if (p.buttons_bg_image) {
                btnArea.style.backgroundImage = "url('" + normalizeAsset(p.buttons_bg_image) + "')";
                btnArea.style.backgroundSize = "cover";
            }
        }
    }

    function normalizeQuests(quests) {
        if (Array.isArray(quests) && quests.length > 0 && Array.isArray(quests[0]) && typeof quests[0][0] === "string") {
            const headers = quests[0];
            return quests.slice(1).map(function(row) {
                const o = {};
                headers.forEach(function(h, i) { o[h] = row[i]; });
                return {
                    id: o.id || o.QuestID,
                    question: o.Question || "",
                    picture: o.QuestPicture_Image || o.Picture || o.picture || "",
                    task: parseInt(o.Task, 10) || 1,
                    answers: String(o.AnswerList || "").split(",").map(function(s) { return s.trim(); }).filter(Boolean),
                    timer: parseFloat(o.Timer) || 0,
                    rightIndices: String(o.RightWayIndx || "").split(",").map(function(s) { return parseInt(s.trim(), 10); }).filter(function(n) { return !isNaN(n); }),
                    rightQuest: o.RightWayQuest || "",
                    rightReactionSign: o.RightReactionSign || "",
                    rightReaction: o.RightReaction || "",
                    wrongQuest: o.WrongWayQuest || "",
                    wrongReactionSign: o.WrongReactionSign || "",
                    wrongReaction: o.WrongReaction || "",
                    nextQuest: o.NextWayQuest || "",
                    goalIndex: parseInt(o.GoalIndex, 10)
                };
            });
        }
        if (Array.isArray(quests)) return quests;
        return [];
    }

    function normalizeAnswers(answers) {
        var map = {};
        function put(id, raw) {
            if (!id) return;
            id = String(id).trim();
            var mainText = "";
            var candidates = [
                raw.MainTxt_Text, raw.MainText_Text, raw.MainTxt, raw.MainText,
                raw.mainText, raw.Text, raw.text, raw.AnswerText
            ];
            for (var i = 0; i < candidates.length; i++) {
                if (candidates[i] != null && String(candidates[i]).trim() !== "") {
                    mainText = String(candidates[i]);
                    break;
                }
            }
            map[id] = {
                id: id, type: raw.AnswerType || raw.type || "", title: raw.TitleText_Text || raw.title || "",
                mainText: mainText, helpUp: raw.HelpUpText_Text || raw.helpUp || "", helpDown: raw.HelpDownText_Text || raw.helpDown || "",
                question: raw.Question || raw.question || "", picture: raw.AnswerPicture_Image || raw.Picture || raw.picture || ""
            };
        }

        if (Array.isArray(answers) && answers.length > 0 && Array.isArray(answers[0])) {
            var headers = answers[0].map(function(h) { return String(h == null ? "" : h).trim(); });
            var idxMain = -1;
            for (var hi = 0; hi < headers.length; hi++) {
                var hl = headers[hi].toLowerCase();
                if (hl === "maintxt_text" || hl === "maintext_text" || hl === "maintxt" || hl === "maintext") {
                    idxMain = hi; break;
                }
            }
            answers.slice(1).forEach(function(row) {
                if (!row || !row.length) return;
                var o = {};
                headers.forEach(function(h, i) { if (h) o[h] = row[i] != null ? row[i] : ""; });
                if (idxMain >= 0 && (o.MainTxt_Text == null || o.MainTxt_Text === "") && row[idxMain] != null) {
                    o.MainTxt_Text = row[idxMain];
                }
                var id = o.id || o.AnswerID || o.AnswerId || row[0];
                put(id, o);
            });
            return map;
        }
        if (answers && typeof answers === "object" && !Array.isArray(answers)) {
            Object.keys(answers).forEach(function(k) { put(k, answers[k] || {}); });
            return map;
        }
        if (Array.isArray(answers)) {
            answers.forEach(function(a) { if (a && a.id) put(a.id, a); });
        }
        return map;
    }

    function detectKind(data, fileName) {
        var name = (fileName || "").toLowerCase();
        if (name.indexOf("quest") !== -1) return "quest";
        if (name.indexOf("answer") !== -1) return "answer";
        if (name.indexOf("arprefab") !== -1 || name.indexOf("design") !== -1) return "design";
        if (Array.isArray(data) && data[0] && Array.isArray(data[0])) {
            var h = data[0].map(function(x) { return String(x || "").toLowerCase(); });
            if (h.indexOf("answerlist") !== -1 || h.indexOf("questid") !== -1) return "quest";
            if (h.indexOf("answertype") !== -1 || h.indexOf("maintxt_text") !== -1 || h.indexOf("answerid") !== -1) return "answer";
            if (h.indexOf("backgradient_image") !== -1) return "design";
        }
        return "unknown";
    }

    function readFileAsJson(file) {
        return new Promise(function(resolve, reject) {
            var reader = new FileReader();
            reader.onload = function() {
                try { resolve(JSON.parse(reader.result)); }
                catch (e) { reject(e); }
            };
            reader.onerror = function() { reject(new Error("Не удалось прочитать " + file.name)); };
            reader.readAsText(file);
        });
    }

    async function tryFetchJson(path) {
        if (window.location.protocol === "file:") return null;
        try {
            var r = await fetch(path);
            if (r.ok) return await r.json();
        } catch (e) {}
        return null;
    }

    async function handleBundleFiles(event) {
        const files = Array.from(event.target.files || []);
        if (!files.length) return;
        try {
            let qData = null, aData = null, designData = null;
            for (const file of files) {
                const data = await readFileAsJson(file);
                const kind = detectKind(data, file.name);
                if (kind === "quest") qData = data;
                else if (kind === "answer") aData = data;
                else if (kind === "design") designData = data;
                else if (!qData) qData = data;
            }
            if (qData) QUEST_DATA = normalizeQuests(qData);
            if (!aData) aData = await tryFetchJson("./answers.json") || await tryFetchJson("./assets/answers.json");
            if (aData) ANSWER_DATA = normalizeAnswers(aData);
            if (!designData) designData = await tryFetchJson("./arprefabsdesign.json") || await tryFetchJson("./assets/arprefabsdesign.json");
            if (designData && typeof DesignBuilder !== "undefined" && DesignBuilder.loadJSON) DesignBuilder.loadJSON(designData);
            if (!QUEST_DATA.length) throw new Error("Нет квестов (questtable.json)");
            var ansCount = Object.keys(ANSWER_DATA).length;
            setStatus("Квестов: " + QUEST_DATA.length + ", ответов: " + ansCount +
                (ansCount ? "" : " — загрузите answers.json!"), ansCount ? "ok" : "err");
            showStartBtn(true);
        } catch (e) {
            setStatus("Ошибка: " + e.message, "err");
            console.error(e);
            showStartBtn(false);
        }
        event.target.value = "";
    }

    function startTimer(minutes) {
        clearInterval(timerId);
        var bar = $("sim-timer-bar");
        var totalSeconds = Math.max(0, Math.round((parseFloat(minutes) || 0) * 60));
        if (!totalSeconds) { if (bar) bar.style.width = "100%"; return; }
        timeLeft = totalSeconds;
        var total = totalSeconds;
        if (bar) bar.style.width = "100%";
        timerId = setInterval(function() {
            timeLeft--;
            if (bar) bar.style.width = (timeLeft / total * 100) + "%";
            if (timeLeft <= 0) {
                clearInterval(timerId);
                showReaction("⏳", "Время вышло!", "Закрыть", function() { stop(); });
            }
        }, 1000);
    }
    function stopTimer() { clearInterval(timerId); }

    function showReaction(sign, text, btnText, callback) {
        $("sim-reaction-sign").textContent = sign || "✦";
        $("sim-reaction-text").innerHTML = stripTags(text);
        $("sim-reaction-btn").textContent = btnText || "Дальше";
        $("sim-reaction").classList.add("active");
        $("sim-reaction-btn").onclick = function() {
            $("sim-reaction").classList.remove("active");
            if (callback) callback();
        };
    }

    function getAnswer(id) {
        if (!id) return null;
        return ANSWER_DATA[id] || ANSWER_DATA[String(id).trim()] || null;
    }

    function applyAnswerToPanels(ans, isMaster) {
        if (!ans) ans = {};
        if (ans.title) $("sim-title-text").innerHTML = stripTags(ans.title);
        var up = $("sim-help-up") && $("sim-help-up").querySelector(".help-body");
        var down = $("sim-help-down") && $("sim-help-down").querySelector(".help-body");
        var right = $("sim-right-help") && $("sim-right-help").querySelector(".help-body");

        if (up) up.innerHTML = renderMediaMarkup("", ans.helpUp || (isMaster ? "Когда найдено испытание, здесь отображается задание." : ""));
        if (down) down.innerHTML = renderMediaMarkup("", ans.helpDown || (isMaster ? "Перед наведением на AR-цель осмотрись камерой вокруг." : ""));
        if (right) right.innerHTML = renderMediaMarkup("", ans.question || "");

        var mainContent = $("sim-main-content");
        if (mainContent && isMaster) {
            var htmlContent = renderMediaMarkup(ans.picture, ans.mainText);
            if (htmlContent) {
                mainContent.innerHTML = '<div class="main-text">' + htmlContent + "</div>";
            } else {
                mainContent.innerHTML = "";
            }
        }
    }

    function showQuestBanner(text, picture) {
        var banner = $("sim-quest-banner");
        var body = $("sim-quest-banner-text");
        if (!banner || !body) return;
        var content = renderMediaMarkup(picture, text);
        if (!content || !String(content).trim()) {
            hideQuestBanner();
            return;
        }
        body.innerHTML = content;
        banner.classList.add("active");
    }

    function hideQuestBanner() {
        var banner = $("sim-quest-banner");
        if (banner) banner.classList.remove("active");
    }

    function loadQuest(qid) {
        var quest = QUEST_DATA.find(function(q) { return q.id === qid; });
        if (!quest) { setStatus("Квест не найден: " + qid, "err"); return; }
        currentQuest = quest;
        selectedOptionIdx = -1;
        carouselIdx = 0;
        inputValue = "";
        currentOptions = (quest.answers || []).slice(1);

        var master = quest.answers && quest.answers[0] ? getAnswer(quest.answers[0]) : null;

        showQuestBanner(quest.question || "", quest.picture || "");

        var badgeEl = $("sim-quest-badge");
        if (badgeEl) {
            badgeEl.textContent = "";
            badgeEl.style.display = "none";
        }

        if (master && master.title) {
            $("sim-title-text").innerHTML = stripTags(master.title);
        } else {
            $("sim-title-text").innerHTML = stripTags((quest.question || "").substring(0, 60) + (quest.question && quest.question.length > 60 ? "…" : ""));
        }
        applyAnswerToPanels(master, true);

        renderTask();
        startTimer(quest.timer || 0);
        applyDesign();
    }

    function renderTask() {
        var task = currentQuest.task;
        var ansIds = currentQuest.answers || [];
        var master = ansIds[0] ? getAnswer(ansIds[0]) : null;
        var btnArea = $("sim-buttons-area");
        btnArea.innerHTML = "";

        var p = (typeof DesignBuilder !== "undefined" && DesignBuilder.getCurrentPrefab) ? DesignBuilder.getCurrentPrefab() : null;
        var nextLabel = (p && p.btn_next_text) || "Дальше";
        var ph = (p && p.input_ph_text) || "ВВЕДИТЕ ОТВЕТ";

        if (task === 1) {
            var options = currentOptions;
            var masterType = (master && master.type) || "Slide";

            if (masterType === "Slide" && options.length > 0) {
                if (selectedOptionIdx < 0) selectedOptionIdx = 0;
                carouselIdx = Math.max(0, Math.min(carouselIdx, options.length - 1));

                var wrap = document.createElement("div");
                wrap.className = "carousel-wrap";
                var leftBtn = document.createElement("button");
                leftBtn.className = "carousel-btn"; leftBtn.innerHTML = "◀";
                var display = document.createElement("div");
                display.className = "carousel-display";
                var rightBtn = document.createElement("button");
                rightBtn.className = "carousel-btn"; rightBtn.innerHTML = "▶";

                function updateCarousel() {
                    var oid = options[carouselIdx];
                    var opt = getAnswer(oid);
                    var optText = opt ? ((opt.mainText && String(opt.mainText).trim()) ? opt.mainText : opt.question) : "";

                    display.innerHTML = stripTags(optText) || ("Нет текста для " + oid);
                    display.classList.toggle("active-opt", carouselIdx === selectedOptionIdx);
                    leftBtn.disabled = carouselIdx === 0;
                    rightBtn.disabled = carouselIdx >= options.length - 1;

                    if (opt) applyAnswerToPanels(opt, false);
                }

                leftBtn.onclick = function() {
                    if (carouselIdx > 0) {
                        carouselIdx--;
                        selectedOptionIdx = carouselIdx;
                        updateCarousel();
                    }
                };
                rightBtn.onclick = function() {
                    if (carouselIdx < options.length - 1) {
                        carouselIdx++;
                        selectedOptionIdx = carouselIdx;
                        updateCarousel();
                    }
                };
                display.onclick = function() {
                    selectedOptionIdx = carouselIdx;
                    updateCarousel();
                };
                updateCarousel();

                wrap.appendChild(leftBtn);
                wrap.appendChild(display);
                wrap.appendChild(rightBtn);
                btnArea.appendChild(wrap);

                var ok = document.createElement("button");
                ok.className = "action-btn";
                ok.textContent = "Дальше";
                ok.onclick = function() {
                    var idx = selectedOptionIdx >= 0 ? selectedOptionIdx : carouselIdx;
                    var oid = options[idx];
                    if (!oid) { setStatus("Нет варианта", "err"); return; }
                    checkAnswer(oid, idx + 1);
                };
                btnArea.appendChild(ok);
            } else if (masterType === "InputField" && options.length > 0) {
                var iwrap = document.createElement("div");
                iwrap.className = "input-wrap";
                var inp = document.createElement("input");
                inp.className = "q-input"; inp.placeholder = ph; inp.type = "text";
                inp.oninput = function(e) { inputValue = e.target.value; };
                inp.onkeydown = function(e) { if (e.key === "Enter") checkInput(); };
                var ok2 = document.createElement("button");
                ok2.className = "action-btn"; ok2.textContent = "Дальше"; ok2.onclick = checkInput;
                iwrap.appendChild(inp); iwrap.appendChild(ok2);
                btnArea.appendChild(iwrap);
            } else if (options.length > 0) {
                var grid = document.createElement("div");
                grid.className = "btn-grid";
                options.forEach(function(oid, idx) {
                    var opt = getAnswer(oid);
                    var btn = document.createElement("button");
                    btn.className = "q-btn";
                    var optText = (opt && (opt.mainText || opt.question)) || oid;

                    btn.innerHTML = stripTags(optText);
                    btn.onclick = function() {
                        applyAnswerToPanels(opt, false);
                        checkAnswer(oid, idx + 1);
                    };
                    grid.appendChild(btn);
                });
                btnArea.appendChild(grid);
            }
        } else if (task === 2) {
            var next = document.createElement("button");
            next.className = "action-btn"; next.textContent = nextLabel;
            next.onclick = function() { goTo(currentQuest.rightQuest || currentQuest.nextQuest); };
            btnArea.appendChild(next);
        } else if (task === 3) {
            var next3 = document.createElement("button");
            next3.className = "action-btn"; next3.textContent = "Вернуться";
            next3.onclick = function() { goTo(currentQuest.wrongQuest || currentQuest.nextQuest); };
            btnArea.appendChild(next3);
        }
    }

    function checkAnswer(answerId, optionIndex) {
        if (!answerId || optionIndex < 1) {
            setStatus("Выберите вариант ответа", "err");
            return;
        }
        var rightIndices = currentQuest.rightIndices || [];
        var isCorrect = rightIndices.length === 0 || rightIndices.indexOf(optionIndex) !== -1;
        if (isCorrect) {
            showReaction(
                currentQuest.rightReactionSign || "✦",
                currentQuest.rightReaction || "Верно!",
                "Дальше",
                function() { goTo(currentQuest.rightQuest); }
            );
        } else {
            showReaction(
                currentQuest.wrongReactionSign || "✖",
                currentQuest.wrongReaction || "Неправильно.",
                "Повторить",
                function() {}
            );
        }
    }

    function checkInput() {
        var options = currentOptions;
        var val = inputValue.trim().toLowerCase();
        var isCorrect = false;
        options.forEach(function(oid) {
            var opt = getAnswer(oid);
            var optText = ((opt && (opt.mainText || opt.question)) || "").trim().toLowerCase();
            if (optText && (optText === val || val.indexOf(optText) !== -1 || optText.indexOf(val) !== -1)) isCorrect = true;
        });
        if (isCorrect) {
            showReaction(currentQuest.rightReactionSign || "✦", currentQuest.rightReaction || "Верно!", "Дальше",
                function() { goTo(currentQuest.rightQuest); });
        } else {
            showReaction(currentQuest.wrongReactionSign || "✖", currentQuest.wrongReaction || "Неправильно.", "Повторить", function() {});
        }
    }

    function goTo(qid) {
        if (!qid) { setStatus("Нет следующего квеста", "err"); return; }
        stopTimer();
        loadQuest(qid);
    }

    function start() {
        if (typeof DesignBuilder !== "undefined" && DesignBuilder.hidePreview) DesignBuilder.hidePreview();
        $("sim-overlay").classList.add("active");
        showStartBtn(false);
        var startId = (QUEST_DATA[0] && QUEST_DATA[0].id) || "Start";
        loadQuest(startId);
        var titleEl = $("sim-toolbar-title");
        if (titleEl) {
            titleEl.textContent = "";
            titleEl.style.display = "none";
        }
    }

    function stop() {
        stopTimer();
        hideQuestBanner();
        $("sim-overlay").classList.remove("active");
        $("sim-reaction").classList.remove("active");
        setStatus("", "");
        showStartBtn(QUEST_DATA.length > 0);
    }

    function restart() {
        stopTimer();
        $("sim-reaction").classList.remove("active");
        if (QUEST_DATA.length) loadQuest((QUEST_DATA[0] && QUEST_DATA[0].id) || "Start");
    }

    document.addEventListener("DOMContentLoaded", function() {
        var banner = $("sim-quest-banner");
        var closeBtn = $("sim-quest-banner-close");
        if (banner) banner.addEventListener("click", function(e) {
            if (e.target === closeBtn) return;
            hideQuestBanner();
        });
        if (closeBtn) closeBtn.addEventListener("click", function(e) {
            e.stopPropagation();
            hideQuestBanner();
        });
    });

    function exportHTML() {
        var data = {
            quests: QUEST_DATA,
            answers: ANSWER_DATA,
            exportedAt: new Date().toISOString()
        };
        var html = '<!DOCTYPE html>\n<html lang="ru">\n<head>\n' +
            '<meta charset="UTF-8">\n<title>Экспорт квеста</title>\n' +
            '<style>body{background:#0d0d12;color:#e0e0e5;font-family:sans-serif;padding:24px}pre{background:#1a1a24;padding:16px;border-radius:8px;overflow:auto}</style>\n' +
            '</head>\n<body>\n<h1>Экспорт квеста</h1>\n<pre>' +
            JSON.stringify(data, null, 2).replace(/</g, '&lt;').replace(/>/g, '&gt;') +
            '</pre>\n</body>\n</html>';
        var blob = new Blob([html], {type: 'text/html;charset=utf-8'});
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'quest-export.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    return {
        start: start,
        stop: stop,
        restart: restart,
        exportHTML: exportHTML,
        handleBundleFiles: handleBundleFiles
    };
})();
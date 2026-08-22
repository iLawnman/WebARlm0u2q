/**
 * js/io.js
 * Модуль загрузки/сохранения префабов (file:// и http://)
 * Поддерживает: JSON-дизайны, HTML-префабы (ar-target template)
 */
(function (global) {
    'use strict';

    var PREFAB_STORAGE_KEY = '__editor_local_prefab_data';

    function parseHtmlPrefab(htmlContent) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(htmlContent, 'text/html');
        var template = doc.getElementById('ar-target');

        if (!template) {
            var templates = doc.querySelectorAll('template');
            for (var i = 0; i < templates.length; i++) {
                if (templates[i].id && templates[i].id.indexOf('ar-target') !== -1) {
                    template = templates[i];
                    break;
                }
            }
        }

        if (!template) {
            console.warn('[IOModule] <template id="ar-target"> не найден в HTML');
            return null;
        }

        var panels = [];
        var content = template.content || template;
        var children = content.children || content.childNodes;

        for (var i = 0; i < children.length; i++) {
            var el = children[i];
            if (el.nodeType !== 1) continue;
            if (!el.classList || !el.classList.contains('ar-css3d-panel')) continue;

            var name = el.getAttribute('data-name') || ('Panel_' + i);
            var posStr = el.getAttribute('data-position') || '0,0,0';
            var rotStr = el.getAttribute('data-rotation') || '0,0,0';
            var scaleStr = el.getAttribute('data-scale') || '1';

            var pos = posStr.split(',').map(function(v) { return parseFloat(v.trim()) || 0; });
            var rot = rotStr.split(',').map(function(v) { return parseFloat(v.trim()) || 0; });
            var scale = parseFloat(scaleStr) || 1;

            var extraClasses = [];
            for (var j = 0; j < el.classList.length; j++) {
                var cls = el.classList[j];
                if (cls !== 'ar-css3d-panel') extraClasses.push(cls);
            }

            var innerHTML = '';
            for (var k = 0; k < el.children.length; k++) {
                innerHTML += el.children[k].outerHTML + '\n';
            }
            innerHTML = innerHTML.trim();

            var fields = {};
            var fieldEls = el.querySelectorAll('[data-field]');
            for (var f = 0; f < fieldEls.length; f++) {
                var fe = fieldEls[f];
                fields[fe.getAttribute('data-field')] = fe.outerHTML;
            }

            panels.push({
                name: name,
                position: pos.length >= 3 ? [pos[0], pos[1], pos[2]] : [0, 0, 0],
                rotation: rot.length >= 3 ? [rot[0], rot[1], rot[2]] : [0, 0, 0],
                scale: [scale, scale, scale],
                type: 'panel',
                panelType: extraClasses.join(' '),
                html: innerHTML,
                fields: fields,
                rawClasses: extraClasses
            });
        }

        var styles = [];
        var styleEls = doc.querySelectorAll('style');
        for (var s = 0; s < styleEls.length; s++) {
            styles.push(styleEls[s].textContent);
        }

        return {
            type: 'html-prefab',
            templateId: template.id || 'ar-target',
            panels: panels,
            styles: styles,
            rawHtml: htmlContent
        };
    }

    function getDefaultPrefabStyles() {
        return [
            '.ar-css3d-panel {',
            '  box-sizing: border-box;',
            '  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;',
            '  color: #e8f0ff;',
            '  background: rgba(8, 12, 24, 0.92);',
            '  border: 2px solid rgba(0, 255, 170, 0.55);',
            '  border-radius: 14px;',
            '  padding: 12px 14px;',
            '  pointer-events: auto;',
            '  touch-action: manipulation;',
            '  overflow: hidden;',
            '  display: flex;',
            '  flex-direction: column;',
            '  gap: 8px;',
            '  box-shadow: 0 8px 24px rgba(0,0,0,0.45);',
            '}',
            '.ar-left-help-block, .ar-right-block { width: 170px; min-height: 150px; max-height: 220px; }',
            '.ar-main-block { width: 240px; min-height: 180px; max-height: 280px; overflow-y: auto; }',
            '.ar-buttons-block { width: 210px; min-height: 64px; max-height: 150px; justify-content: center; align-items: center; z-index: 30; }',
            '.ar-panel-title { font-size: 13px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #00ffaa; line-height: 1.25; word-break: break-word; }',
            '.ar-panel-question, .ar-panel-maintext, .ar-panel-help { font-size: 12.5px; line-height: 1.4; word-break: break-word; white-space: pre-wrap; }',
            '.ar-panel-help { color: #a8b8d0; flex: 1; }',
            '.ar-panel-image { display: block; width: 100%; height: auto; max-height: 170px; object-fit: contain; border-radius: 8px; background: rgba(0,0,0,0.3); }',
            '.ar-panel-image:not([src]), .ar-panel-image[src=""] { display: none; }',
            '.ar-quest-body { width: 100%; display: flex; flex-direction: column; gap: 8px; align-items: center; }',
            '.ar-quest-options-grid { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; width: 100%; }',
            '.ar-quest-btn, .ar-quest-submit-btn, .ar-slide-nav { appearance: none; border: 1px solid rgba(0, 255, 170, 0.65); background: rgba(0, 45, 35, 0.9); color: #e8fff6; border-radius: 9px; padding: 7px 12px; font-size: 12px; font-weight: 600; cursor: pointer; line-height: 1.2; pointer-events: auto; touch-action: manipulation; }',
            '.ar-quest-btn:hover, .ar-quest-submit-btn:hover, .ar-slide-nav:hover { background: rgba(0, 70, 50, 0.98); border-color: #00ffaa; }',
            '.ar-quest-ok-btn { background: linear-gradient(180deg, #00c878 0%, #00995a 100%); border-color: #00ffaa; color: #fff; font-weight: 700; min-width: 90px; }',
            '.ar-quest-input-block { display: flex; gap: 6px; width: 100%; align-items: center; }',
            '.ar-quest-input { flex: 1; min-width: 0; padding: 7px 10px; border-radius: 7px; border: 1px solid rgba(255,255,255,0.28); background: rgba(0,0,0,0.5); color: #fff; font-size: 13px; }',
            '.ar-quest-slider { display: flex; align-items: center; gap: 6px; width: 100%; }',
            '.ar-slide-content { flex: 1; text-align: center; font-size: 12px; line-height: 1.35; min-height: 32px; word-break: break-word; }',
            '.ar-slide-nav { flex-shrink: 0; width: 32px; padding: 5px 0; }',
            '.ar-panel-empty .ar-panel-help, .ar-panel-empty .ar-panel-title, .ar-panel-empty .ar-panel-question { opacity: 0.35; }'
        ].join('\n');
    }

    function createHtmlPrefabPanel(panelData) {
        var dom = document.createElement('div');
        dom.className = 'ar-css3d-panel';
        var classes = (panelData.panelType || '').split(/\s+/).filter(function(c) { return c; });
        if (panelData.rawClasses && panelData.rawClasses.length) {
            classes = panelData.rawClasses;
        }
        classes.forEach(function(c) { dom.classList.add(c); });
        dom.innerHTML = panelData.html || '';

        if (panelData.prefabStyles && panelData.prefabStyles.length > 0) {
            var styleId = 'ar-prefab-styles';
            var existing = document.getElementById(styleId);
            if (!existing) {
                var styleEl = document.createElement('style');
                styleEl.id = styleId;
                styleEl.textContent = panelData.prefabStyles.join('\n');
                document.head.appendChild(styleEl);
            }
        }

        var Objects = global.ObjectsModule || {};
        var group;
        if (typeof Objects.createCSS3DWrapper === 'function') {
            group = Objects.createCSS3DWrapper(0.3, 0.3, dom);
            // Гарантируем, что ссылки на CSS3DObject и DOM есть в userData группы
            if (group) {
                if (!group.userData.domElement) group.userData.domElement = dom;
                if (!group.userData.css2dObject) {
                    group.traverse(function(child) {
                        if (child.type === 'CSS3DObject' || child.isCSS3DObject) {
                            group.userData.css2dObject = child;
                        }
                    });
                }
            }
        } else {
            group = new THREE.Group();
            var geo = new THREE.PlaneGeometry(0.3, 0.3);
            var mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.001, side: THREE.DoubleSide, depthWrite: false });
            var proxy = new THREE.Mesh(geo, mat);
            proxy.name = 'proxy';
            group.add(proxy);
            var CssObj = (typeof THREE !== 'undefined' && typeof THREE.CSS3DObject === 'function') ? THREE.CSS3DObject : null;
            if (CssObj) {
                var css3d = new CssObj(dom);
                var baseW = 300, baseH = 180;
                css3d.scale.set(0.3 / baseW, 0.3 / baseH, 0.3 / baseW);
                group.add(css3d);
                group.userData.css2dObject = css3d;
            }
            group.userData.proxy = proxy;
            group.userData.domElement = dom;
        }

        // Переопределяем масштаб CSS3DObject напрямую из data-scale префаба
        // Группа остаётся scale(1,1,1) чтобы не было двойного масштабирования
        var css3d = group.userData.css2dObject;
        if (css3d) {
            var s = panelData.scale[0] || 0.0005;
            css3d.scale.set(s, s, s);
        }
        group.scale.set(1, 1, 1);

        group.name = panelData.name;
        group.position.set(panelData.position[0], panelData.position[1], panelData.position[2]);
        group.rotation.set(
            panelData.rotation[0] * Math.PI / 180,
            panelData.rotation[1] * Math.PI / 180,
            panelData.rotation[2] * Math.PI / 180
        );

        group.userData.type = 'panel';
        group.userData.isHtmlPrefab = true;
        group.userData.panelType = panelData.panelType || '';
        group.userData.html = panelData.html || '';
        group.userData.fields = panelData.fields || {};
        group.userData.rawClasses = panelData.rawClasses || [];
        group.userData.prefabStyles = panelData.prefabStyles || [];
        group.userData.templateId = panelData.templateId || 'ar-target';
        group.userData.rawHtml = panelData.rawHtml || '';

        return group;
    }

    function parseAndBuildPrefab(designData) {
        var SceneModule = global.SceneModule;
        if (!SceneModule) {
            console.error('[IOModule] SceneModule не найден!');
            return;
        }

        SceneModule.clearScene();
        if (!designData) return;

        if (designData.type === 'html-prefab' && designData.panels) {
            designData.panels.forEach(function(panel, index) {
                panel.prefabStyles = designData.styles || [];
                panel.templateId = designData.templateId || 'ar-target';
                panel.rawHtml = designData.rawHtml || '';
                var group = createHtmlPrefabPanel(panel);
                SceneModule.addSceneObject(group);
            });
            updateHierarchyTree();
            return;
        }

        var rows = designData.rows || (Array.isArray(designData) ? designData : [designData]);

        rows.forEach(function (row, index) {
            var meta = row.meta || {};
            var name = meta.name || row.name || meta.id || ('Prefab_Object_' + (index + 1));

            var geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
            var material = new THREE.MeshStandardMaterial({
                color: Math.random() * 0xffffff,
                roughness: 0.4,
                metalness: 0.1
            });

            var mesh = new THREE.Mesh(geometry, material);
            mesh.name = name;

            if (Array.isArray(row.position) && row.position.length >= 3) {
                mesh.position.set(row.position[0], row.position[1], row.position[2]);
            } else {
                mesh.position.set((index - (rows.length - 1) / 2) * 2.5, 0.75, 0);
            }

            if (Array.isArray(row.rotation) && row.rotation.length >= 3) {
                mesh.rotation.set(row.rotation[0], row.rotation[1], row.rotation[2]);
            }

            if (Array.isArray(row.scale) && row.scale.length >= 3) {
                mesh.scale.set(row.scale[0], row.scale[1], row.scale[2]);
            }

            mesh.userData = row.userData || {
                id: meta.id || ('id_' + index),
                groups: row.groups || {},
                customProps: {}
            };

            SceneModule.addSceneObject(mesh);
        });

        updateHierarchyTree();
    }

    function updateHierarchyTree() {
        var treeContainer = document.getElementById('tree');
        if (!treeContainer) return;

        var SceneModule = global.SceneModule;
        if (!SceneModule) return;

        var objects = SceneModule.getSceneObjects();
        var selected = SceneModule.getSelectedObject();

        treeContainer.innerHTML = '';

        var ul = document.createElement('ul');
        ul.className = 'hierarchy-list';
        ul.style.listStyle = 'none';
        ul.style.padding = '0';
        ul.style.margin = '0';

        objects.forEach(function (obj) {
            var li = document.createElement('li');
            li.className = 'hierarchy-item' + (obj === selected ? ' active' : '');
            li.textContent = obj.name || 'Unnamed Object';
            li.style.padding = '6px 8px';
            li.style.cursor = 'pointer';
            li.style.borderRadius = '4px';
            li.style.fontSize = '13px';
            if (obj === selected) {
                li.style.background = 'rgba(201, 162, 39, 0.25)';
                li.style.color = '#e8c84a';
            }
            li.onclick = function (e) {
                e.stopPropagation();
                SceneModule.selectObject(obj);
            };
            ul.appendChild(li);
        });

        treeContainer.appendChild(ul);
    }

    function loadLocalPrefab() {
        try {
            var raw = localStorage.getItem(PREFAB_STORAGE_KEY);
            if (raw) {
                var parsed;
                try {
                    parsed = JSON.parse(raw);
                } catch (e) {
                    parsed = parseHtmlPrefab(raw);
                    if (!parsed) {
                        console.warn('[IOModule] localStorage содержит нераспознанные данные');
                        throw new Error('Unrecognized format');
                    }
                }
                parseAndBuildPrefab(parsed);
                console.log('[IOModule] Префаб загружен из localStorage');
                return;
            }
        } catch (e) {
            console.warn('[IOModule] Не удалось загрузить localStorage:', e);
        }

        console.log('[IOModule] localStorage пуст, создаём дефолтный шаблон');
        var defaultDesign = {
            rows: [
                {
                    meta: { id: 'default_cube', name: 'Default Cube' },
                    groups: {},
                    position: [0, 0.75, 0],
                    rotation: [0, 0, 0],
                    scale: [1, 1, 1]
                }
            ]
        };
        parseAndBuildPrefab(defaultDesign);
        localStorage.setItem(PREFAB_STORAGE_KEY, JSON.stringify(defaultDesign));
    }

    function extractJsonFromHtml(htmlContent) {
        var scriptMatch = htmlContent.match(/<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/i);
        if (scriptMatch) {
            try { return JSON.parse(scriptMatch[1].trim()); } catch (e) {}
        }
        var idMatch = htmlContent.match(/<script[^>]*id=["']prefab-data["'][^>]*>([\s\S]*?)<\/script>/i);
        if (idMatch) {
            try { return JSON.parse(idMatch[1].trim()); } catch (e) {}
        }
        var jsonBlockMatch = htmlContent.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (jsonBlockMatch) {
            try { return JSON.parse(jsonBlockMatch[0]); } catch (e) {}
        }
        return null;
    }

    function handleFileSelect(event) {
        var file = event.target.files && event.target.files[0];
        if (!file) return;

        var reader = new FileReader();
        reader.onload = function (e) {
            var content = e.target.result;
            var jsonData = null;
            var lastErr = null;

            if (/\.(html|template|htm)$/i.test(file.name)) {
                var prefabData = parseHtmlPrefab(content);
                if (prefabData) {
                    parseAndBuildPrefab(prefabData);
                    localStorage.setItem(PREFAB_STORAGE_KEY, JSON.stringify(prefabData));
                    console.log('[IOModule] HTML-префаб загружен и сохранён');
                    event.target.value = '';
                    return;
                }
            }

            try {
                jsonData = JSON.parse(content);
            } catch (err) {
                lastErr = err;
            }

            if (!jsonData && /\.(html|template|htm)$/i.test(file.name)) {
                jsonData = extractJsonFromHtml(content);
            }

            if (!jsonData) {
                console.error('[IOModule] Ошибка чтения файла:', lastErr);
                alert('Ошибка чтения файла «' + file.name + '».\n\nОжидался JSON или HTML-префаб.\n' + (lastErr ? lastErr.message : 'Не удалось распознать формат.'));
                event.target.value = '';
                return;
            }

            try {
                if (global.DesignBuilder && typeof global.DesignBuilder.loadJSON === 'function' && Array.isArray(jsonData)) {
                    parseAndBuildPrefab(jsonData);
                } else {
                    parseAndBuildPrefab(jsonData);
                }
                localStorage.setItem(PREFAB_STORAGE_KEY, JSON.stringify(jsonData));
                console.log('[IOModule] Файл загружен и сохранён в localStorage');
            } catch (err) {
                console.error('[IOModule] Ошибка обработки данных:', err);
                alert('Ошибка обработки данных: ' + err.message);
            }

            event.target.value = '';
        };

        reader.onerror = function () {
            alert('Ошибка чтения файла «' + file.name + '»');
            event.target.value = '';
        };

        reader.readAsText(file);
    }

    function exportHTML() {
        var SceneModule = global.SceneModule;
        if (!SceneModule) return;

        var objects = SceneModule.getSceneObjects();
        var hasPrefab = objects.some(function(obj) { return obj.userData.isHtmlPrefab; });

        if (hasPrefab) {
            var styles = [];
            var templateId = 'ar-target';
            var panelsHTML = '';

            objects.forEach(function(obj) {
                if (!obj.userData.isHtmlPrefab) return;

                if (obj.userData.prefabStyles && obj.userData.prefabStyles.length > 0 && styles.length === 0) {
                    styles = obj.userData.prefabStyles;
                }
                if (obj.userData.templateId) {
                    templateId = obj.userData.templateId;
                }

                var pos = obj.position;
                var rot = obj.rotation;
                var scale = obj.scale.x;

                var posStr = pos.x.toFixed(5) + ', ' + pos.y.toFixed(5) + ', ' + pos.z.toFixed(5);
                var rotStr = (rot.x * 180 / Math.PI).toFixed(1) + ', ' +
                    (rot.y * 180 / Math.PI).toFixed(1) + ', ' +
                    (rot.z * 180 / Math.PI).toFixed(1);
                var scaleStr = scale.toFixed(5);

                var classes = 'ar-css3d-panel';
                if (obj.userData.panelType) {
                    classes += ' ' + obj.userData.panelType;
                } else if (obj.userData.rawClasses && obj.userData.rawClasses.length) {
                    classes += ' ' + obj.userData.rawClasses.join(' ');
                }

                panelsHTML += '  <!-- ' + obj.name + ' -->\n';
                panelsHTML += '  <div class="' + classes + '"\n';
                panelsHTML += '       data-name="' + escapeHtml(obj.name) + '"\n';
                panelsHTML += '       data-position="' + posStr + '"\n';
                panelsHTML += '       data-rotation="' + rotStr + '"\n';
                panelsHTML += '       data-scale="' + scaleStr + '">\n';

                var inner = obj.userData.html || '';
                if (inner) {
                    panelsHTML += '    ' + inner.replace(/\n/g, '\n    ') + '\n';
                }

                panelsHTML += '  </div>\n\n';
            });

            var styleBlock = styles.length > 0 ? styles.join('\n') : getDefaultPrefabStyles();

            var htmlContent = '<!DOCTYPE html>\n<html lang="ru">\n<head>\n';
            htmlContent += '  <meta charset="UTF-8" />\n';
            htmlContent += '  <title>AR Target Prefab</title>\n';
            htmlContent += '  <style>\n' + styleBlock + '\n  </style>\n';
            htmlContent += '</head>\n<body>\n';
            htmlContent += '<template id="' + templateId + '">\n';
            htmlContent += panelsHTML;
            htmlContent += '</template>\n';
            htmlContent += '</body>\n</html>';

            var blob = new Blob([htmlContent], { type: 'text/html' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'artargetPrefab.html';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else {
            var exportData = objects.map(function (obj) {
                return {
                    name: obj.name,
                    position: obj.position.toArray(),
                    rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
                    scale: obj.scale.toArray(),
                    userData: obj.userData
                };
            });

            var jsonStr = JSON.stringify(exportData, null, 2);
            var blob = new Blob([jsonStr], { type: 'application/json' });
            var url = URL.createObjectURL(blob);

            var a = document.createElement('a');
            a.href = url;
            a.download = 'prefab-export.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }

    function escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    var API = {
        parseAndBuildPrefab: parseAndBuildPrefab,
        updateHierarchyTree: updateHierarchyTree,
        loadLocalPrefab: loadLocalPrefab,
        handleFileSelect: handleFileSelect,
        exportHTML: exportHTML,
        parseHtmlPrefab: parseHtmlPrefab
    };

    global.IOModule = API;
})(typeof window !== 'undefined' ? window : this);
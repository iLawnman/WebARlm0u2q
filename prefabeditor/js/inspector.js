/**
 * js/inspector.js
 * Инспектор свойств объекта (IIFE, file:// совместим)
 */
(function (global) {
    'use strict';

    function getScene() { return global.SceneModule || {}; }
    function getObjects() { return global.ObjectsModule || {}; }
    function getPanels() { return global.PanelsModule || {}; }
    function getUtils() { return global.UtilsModule || {}; }
    function getIO() { return global.IOModule || {}; }

    function renderInspector() {
        var selectedObject = getScene().getSelectedObject && getScene().getSelectedObject();
        if (!selectedObject) return;

        var container = document.getElementById('inspector-content');
        if (!container) return;

        var obj = selectedObject;
        var pos = obj.position;
        var scale = obj.scale;
        var MathUtils = (typeof THREE !== 'undefined' && THREE.MathUtils) ? THREE.MathUtils : {
            radToDeg: function (r) { return r * 180 / Math.PI; },
            degToRad: function (d) { return d * Math.PI / 180; }
        };

        var rotDegX = MathUtils.radToDeg(obj.rotation.x);
        var rotDegY = MathUtils.radToDeg(obj.rotation.y);
        var rotDegZ = MathUtils.radToDeg(obj.rotation.z);

        var html = ''
            + '<div class="prop-group">'
            +   '<label>Имя элемента</label>'
            +   '<input type="text" value="' + (obj.name || '') + '" onchange="window.__editor.updateObjName(this.value)">'
            + '</div>'
            + '<div class="prop-group">'
            +   '<label>Позиция (X, Y, Z)</label>'
            +   '<div class="row">'
            +     '<div><input type="number" step="0.01" value="' + pos.x.toFixed(3) + '" onchange="window.__editor.updateObjTransform(\'pos\', \'x\', this.value)"></div>'
            +     '<div><input type="number" step="0.01" value="' + pos.y.toFixed(3) + '" onchange="window.__editor.updateObjTransform(\'pos\', \'y\', this.value)"></div>'
            +     '<div><input type="number" step="0.01" value="' + pos.z.toFixed(3) + '" onchange="window.__editor.updateObjTransform(\'pos\', \'z\', this.value)"></div>'
            +   '</div>'
            + '</div>'
            + '<div class="prop-group">'
            +   '<label>Поворот (Deg X, Y, Z)</label>'
            +   '<div class="row">'
            +     '<div><input type="number" step="1" value="' + rotDegX.toFixed(1) + '" onchange="window.__editor.updateObjTransform(\'rot\', \'x\', this.value)"></div>'
            +     '<div><input type="number" step="1" value="' + rotDegY.toFixed(1) + '" onchange="window.__editor.updateObjTransform(\'rot\', \'y\', this.value)"></div>'
            +     '<div><input type="number" step="1" value="' + rotDegZ.toFixed(1) + '" onchange="window.__editor.updateObjTransform(\'rot\', \'z\', this.value)"></div>'
            +   '</div>'
            + '</div>'
            + '<div class="prop-group">'
            +   '<label>Масштаб (X, Y, Z)</label>'
            +   '<div class="row">'
            +     '<div><input type="number" step="0.01" value="' + scale.x.toFixed(3) + '" onchange="window.__editor.updateObjTransform(\'scale\', \'x\', this.value)"></div>'
            +     '<div><input type="number" step="0.01" value="' + scale.y.toFixed(3) + '" onchange="window.__editor.updateObjTransform(\'scale\', \'y\', this.value)"></div>'
            +     '<div><input type="number" step="0.01" value="' + scale.z.toFixed(3) + '" onchange="window.__editor.updateObjTransform(\'scale\', \'z\', this.value)"></div>'
            +   '</div>'
            + '</div>';

        if (obj.userData.type === 'panel') {
            var w = obj.userData.width != null ? obj.userData.width : (parseFloat(obj.userData.rawData && obj.userData.rawData.width) || 0.3);
            var h = obj.userData.height != null ? obj.userData.height : (parseFloat(obj.userData.rawData && obj.userData.rawData.height) || 0.3);
            var cssVal = (obj.userData.customCSS || '').replace(/</g, '&lt;');

            html += ''
                + '<hr style="border-color:#3c3c3c; margin: 12px 0;">'
                + '<div class="prop-group">'
                +   '<h3>Размер панели</h3>'
                +   '<div class="row">'
                +     '<div><label>Ширина (м)</label><input type="number" step="0.01" min="0.01" value="' + w + '" onchange="window.__editor.updateObjectProp(\'width\', this.value)"></div>'
                +     '<div><label>Высота (м)</label><input type="number" step="0.01" min="0.01" value="' + h + '" onchange="window.__editor.updateObjectProp(\'height\', this.value)"></div>'
                +   '</div>'
                + '</div>'
                + '<div class="prop-group">'
                +   '<h3>CSS панели</h3>'
                +   '<p style="font-size:11px;color:var(--muted);margin-bottom:6px;line-height:1.4;">Стили применяются к панели в сцене.</p>'
                +   '<textarea id="panel-custom-css" rows="8" style="width:100%; background:#0f172a; border:1px solid #334155; color:#e2e8f0; font-family:ui-monospace,monospace; font-size:11px; margin-bottom:6px; border-radius:6px; padding:8px; line-height:1.4;" placeholder="background: #1e293b;&#10;border: 2px solid #6366f1;" oninput="window.__editor.updatePanelCSS(this.value)">' + cssVal + '</textarea>'
                +   '<button type="button" onclick="window.__editor.updatePanelCSS(document.getElementById(\'panel-custom-css\').value)" style="width:100%;">Применить CSS</button>'
                + '</div>';

            if (obj.userData.isHtmlPrefab) {
                var htmlVal = (obj.userData.html || '').replace(/</g, '&lt;');
                var cssBlock = (obj.userData.prefabStyles && obj.userData.prefabStyles[0] || '').replace(/</g, '&lt;');
                var classVal = obj.userData.panelType || (obj.userData.rawClasses ? obj.userData.rawClasses.join(' ') : '');

                html += ''
                    + '<hr style="border-color:#3c3c3c; margin: 12px 0;">'
                    + '<div class="prop-group">'
                    +   '<h3>HTML Префаб</h3>'
                    +   '<label>CSS-классы</label>'
                    +   '<input type="text" value="' + classVal + '" onchange="window.__editor.updateObjectProp(\'panelType\', this.value)">'
                    +   '<label>HTML содержимое</label>'
                    +   '<textarea rows="6" style="width:100%; background:#0f172a; border:1px solid #334155; color:#e2e8f0; font-family:ui-monospace,monospace; font-size:11px; margin-bottom:6px; border-radius:6px; padding:8px; line-height:1.4;" onchange="window.__editor.updateObjectProp(\'html\', this.value)">' + htmlVal + '</textarea>'
                    +   '<label>CSS стили (общие)</label>'
                    +   '<textarea rows="6" style="width:100%; background:#0f172a; border:1px solid #334155; color:#e2e8f0; font-family:ui-monospace,monospace; font-size:11px; margin-bottom:6px; border-radius:6px; padding:8px; line-height:1.4;" onchange="window.__editor.updateObjectProp(\'prefabStyles\', this.value)">' + cssBlock + '</textarea>'
                    + '</div>';
            } else if (obj.userData.panelData && obj.userData.panelData.props) {
                var props = obj.userData.panelData.props;
                html += ''
                    + '<hr style="border-color:#3c3c3c; margin: 12px 0;">'
                    + '<div class="prop-group">'
                    +   '<h3>Группа из JSON-дизайна: ' + (props.group || '') + '</h3>'
                    +   '<label>Font</label><input type="text" value="' + (props.font || '') + '" onchange="window.__editor.updateDesignPanelProp(\'font\', this.value)">'
                    +   '<label>Color (HEX, без #)</label><input type="text" value="' + (props.color || '') + '" onchange="window.__editor.updateDesignPanelProp(\'color\', this.value)">'
                    +   '<label>Image</label><input type="text" value="' + (props.image || '') + '" onchange="window.__editor.updateDesignPanelProp(\'image\', this.value)">'
                    +   '<label>FX</label><input type="text" value="' + (props.fx || '') + '" onchange="window.__editor.updateDesignPanelProp(\'fx\', this.value)">'
                    +   '<label>Sound</label><input type="text" value="' + (props.sound || '') + '" onchange="window.__editor.updateDesignPanelProp(\'sound\', this.value)">'
                    +   '<label>Text</label><input type="text" value="' + (props.text || '') + '" onchange="window.__editor.updateDesignPanelProp(\'text\', this.value)">'
                    +   '<label>Prefab</label><input type="text" value="' + (props.prefab || '') + '" onchange="window.__editor.updateDesignPanelProp(\'prefab\', this.value)">'
                    + '</div>';
            } else {
                html += ''
                    + '<hr style="border-color:#3c3c3c; margin: 12px 0;">'
                    + '<div class="prop-group">'
                    +   '<h3>UI Компоненты Панели</h3>'
                    +   '<button onclick="window.__editor.addUIElement(\'text\')" style="margin-top:6px;">+ Текст</button>'
                    +   '<button onclick="window.__editor.addUIElement(\'button\')">+ Кнопка</button>'
                    +   '<button onclick="window.__editor.addUIElement(\'input\')">+ Поле ввода</button>'
                    +   '<button onclick="window.__editor.addUIElement(\'image\')">+ Image</button>'
                    +   '<button onclick="window.__editor.addUIElement(\'video\')">+ Video</button>'
                    + '</div>'
                    + '<div id="ui-elements-list"></div>';
            }
        }

        if (obj.userData.type === 'video') {
            html += ''
                + '<hr style="border-color:#3c3c3c; margin: 12px 0;">'
                + '<div class="prop-group">'
                +   '<label>Источник (URL)</label>'
                +   '<input type="text" value="' + (obj.userData.src || '') + '" onchange="window.__editor.updateObjectProp(\'src\', this.value)">'
                +   '<label>Подпись</label>'
                +   '<input type="text" value="' + (obj.userData.label || '') + '" onchange="window.__editor.updateObjectProp(\'label\', this.value)">'
                +   '<div class="row">'
                +     '<div><label>Ширина (м)</label><input type="number" step="0.01" value="' + (obj.userData.width || 0.2) + '" onchange="window.__editor.updateObjectProp(\'width\', this.value)"></div>'
                +     '<div><label>Высота (м)</label><input type="number" step="0.01" value="' + (obj.userData.height || 0.12) + '" onchange="window.__editor.updateObjectProp(\'height\', this.value)"></div>'
                +   '</div>'
                + '</div>';
        }

        if (obj.userData.type === 'html') {
            html += ''
                + '<hr style="border-color:#3c3c3c; margin: 12px 0;">'
                + '<div class="prop-group">'
                +   '<label>HTML содержимое</label>'
                +   '<textarea rows="4" style="width:100%; background:#3c3c3c; border:1px solid #555; color:#fff; font-size:11px; margin-bottom:8px; border-radius:2px; padding:4px 6px;" onchange="window.__editor.updateObjectProp(\'html\', this.value)">' + ((obj.userData.html || '').replace(/</g, '&lt;')) + '</textarea>'
                +   '<div class="row">'
                +     '<div><label>Ширина (м)</label><input type="number" step="0.01" value="' + (obj.userData.width || 0.2) + '" onchange="window.__editor.updateObjectProp(\'width\', this.value)"></div>'
                +     '<div><label>Высота (м)</label><input type="number" step="0.01" value="' + (obj.userData.height || 0.14) + '" onchange="window.__editor.updateObjectProp(\'height\', this.value)"></div>'
                +   '</div>'
                + '</div>';
        }

        if (obj.userData.type === 'object3d') {
            html += ''
                + '<hr style="border-color:#3c3c3c; margin: 12px 0;">'
                + '<div class="prop-group">'
                +   '<label>Файл в /assets/</label>'
                +   '<input type="text" value="' + (obj.userData.src || '') + '" onchange="window.__editor.updateObjectProp(\'src\', this.value)">'
                + '</div>';
        }

        html += '<button class="btn-danger" onclick="window.__editor.deleteSelectedObject()" style="margin-top:16px; width:100%;">Удалить объект</button>';
        container.innerHTML = html;

        if (obj.userData.type === 'panel' && !obj.userData.isHtmlPrefab && !(obj.userData.panelData && obj.userData.panelData.props)) {
            renderUIElementsList();
        }
    }

    function clearInspector() {
        var container = document.getElementById('inspector-content');
        if (container) {
            container.innerHTML = '<p style="font-size: 13px; color: var(--muted); margin-top: 8px; line-height: 1.5;">Выберите элемент в сцене для редактирования.</p>';
        }
    }

    function updateObjName(val) {
        var selectedObject = getScene().getSelectedObject && getScene().getSelectedObject();
        if (selectedObject) {
            selectedObject.name = val;
            if (getIO().updateHierarchyTree) getIO().updateHierarchyTree();
        }
    }

    function updateObjTransform(type, axis, value) {
        var selectedObject = getScene().getSelectedObject && getScene().getSelectedObject();
        if (!selectedObject) return;
        var val = parseFloat(value) || 0;
        var MathUtils = (typeof THREE !== 'undefined' && THREE.MathUtils) ? THREE.MathUtils : {
            degToRad: function (d) { return d * Math.PI / 180; }
        };
        if (type === 'pos') selectedObject.position[axis] = val;
        if (type === 'rot') selectedObject.rotation[axis] = MathUtils.degToRad(val);
        if (type === 'scale') selectedObject.scale[axis] = val || 0.001;
    }

    function updateInspectorFromTransform() {
        var selectedObject = getScene().getSelectedObject && getScene().getSelectedObject();
        if (!selectedObject) return;
        var container = document.getElementById('inspector-content');
        if (!container) return;

        var MathUtils = (typeof THREE !== 'undefined' && THREE.MathUtils) ? THREE.MathUtils : {
            radToDeg: function (r) { return r * 180 / Math.PI; }
        };

        var vals = [
            selectedObject.position.x, selectedObject.position.y, selectedObject.position.z,
            MathUtils.radToDeg(selectedObject.rotation.x),
            MathUtils.radToDeg(selectedObject.rotation.y),
            MathUtils.radToDeg(selectedObject.rotation.z),
            selectedObject.scale.x, selectedObject.scale.y, selectedObject.scale.z
        ];
        var transforms = container.querySelectorAll('.prop-group');
        var idx = 0;
        for (var g = 1; g <= 3 && g < transforms.length; g++) {
            var nums = transforms[g].querySelectorAll('input[type="number"]');
            for (var i = 0; i < nums.length; i++) {
                var inp = nums[i];
                if (idx < vals.length && document.activeElement !== inp) {
                    var v = vals[idx];
                    inp.value = (g === 2) ? Number(v).toFixed(1) : Number(v).toFixed(3);
                }
                idx++;
            }
        }
    }

    function renderUIElementsList() {
        var selectedObject = getScene().getSelectedObject && getScene().getSelectedObject();
        var container = document.getElementById('ui-elements-list');
        if (!container || !selectedObject || !selectedObject.userData.panelData) return;

        var elements = selectedObject.userData.panelData.elements || [];
        var html = '';

        elements.forEach(function (el, index) {
            if (el.type === 'video') {
                html += '<div style="background:rgba(15,23,42,.8); padding:10px; margin-bottom:8px; border-radius:8px; border:1px solid var(--border);">'
                    + '<label>Тип: video</label>'
                    + '<label>Источник (URL)</label>'
                    + '<input type="text" value="' + (el.src || '') + '" onchange="window.__editor.updateUIElement(' + index + ', \'src\', this.value)">'
                    + '<label>Подпись</label>'
                    + '<input type="text" value="' + (el.label || '') + '" onchange="window.__editor.updateUIElement(' + index + ', \'label\', this.value)">'
                    + '<button class="btn-danger" style="font-size:11px; padding:4px 8px;" onclick="window.__editor.removeUIElement(' + index + ')">Удалить</button>'
                    + '</div>';
            } else if (el.type === 'image') {
                html += '<div style="background:rgba(15,23,42,.8); padding:10px; margin-bottom:8px; border-radius:8px; border:1px solid var(--border);">'
                    + '<label>Тип: image</label>'
                    + '<label>Источник</label>'
                    + '<input type="text" value="' + (el.src || '') + '" onchange="window.__editor.updateUIElement(' + index + ', \'src\', this.value)">'
                    + '<button class="btn-danger" style="font-size:11px; padding:4px 8px;" onclick="window.__editor.removeUIElement(' + index + ')">Удалить</button>'
                    + '</div>';
            } else if (el.type === 'html') {
                html += '<div style="background:rgba(15,23,42,.8); padding:10px; margin-bottom:8px; border-radius:8px; border:1px solid var(--border);">'
                    + '<label>Тип: other html</label>'
                    + '<textarea rows="3" style="width:100%; background:#3c3c3c; border:1px solid #555; color:#fff; font-size:11px; margin-bottom:8px; border-radius:2px; padding:4px 6px;" onchange="window.__editor.updateUIElement(' + index + ', \'html\', this.value)">' + ((el.html || '').replace(/</g, '&lt;')) + '</textarea>'
                    + '<button class="btn-danger" style="font-size:11px; padding:4px 8px;" onclick="window.__editor.removeUIElement(' + index + ')">Удалить</button>'
                    + '</div>';
            } else {
                html += '<div style="background:rgba(15,23,42,.8); padding:10px; margin-bottom:8px; border-radius:8px; border:1px solid var(--border);">'
                    + '<label>Тип: ' + el.type + '</label>'
                    + '<input type="text" value="' + (el.text || '') + '" onchange="window.__editor.updateUIElement(' + index + ', \'text\', this.value)">'
                    + '<div class="row"><div><label>Размер</label><input type="number" value="' + (el.fontSize || 16) + '" onchange="window.__editor.updateUIElement(' + index + ', \'fontSize\', this.value)"></div></div>'
                    + '<button class="btn-danger" style="font-size:11px; padding:4px 8px;" onclick="window.__editor.removeUIElement(' + index + ')">Удалить</button>'
                    + '</div>';
            }
        });
        container.innerHTML = html;
    }

    function addUIElement(type) {
        var selectedObject = getScene().getSelectedObject && getScene().getSelectedObject();
        if (!selectedObject || !selectedObject.userData.panelData) return;
        var elements = selectedObject.userData.panelData.elements;

        if (type === 'text') elements.push({ type: 'text', text: 'Новый текст', fontSize: 16, color: '#ffffff' });
        if (type === 'button') elements.push({ type: 'button', text: 'Кнопка', fontSize: 14, btnBg: '#00cc66' });
        if (type === 'input') elements.push({ type: 'input', text: 'Введите текст...', fontSize: 14 });
        if (type === 'image') elements.push({ type: 'image', src: '', width: 80, height: 60 });
        if (type === 'video') elements.push({ type: 'video', src: '', label: 'Video' });
        if (type === 'html') elements.push({ type: 'html', html: '<div style="color:#fff;padding:8px;">Custom HTML</div>' });

        if (getPanels().refreshPanelDOM) getPanels().refreshPanelDOM(selectedObject);
        renderUIElementsList();
    }

    function updateUIElement(index, key, value) {
        var selectedObject = getScene().getSelectedObject && getScene().getSelectedObject();
        if (!selectedObject || !selectedObject.userData.panelData) return;
        var el = selectedObject.userData.panelData.elements[index];
        if (el) {
            var normalizePath = getUtils().normalizePath || function (p) { return p; };
            if (key === 'src') {
                el[key] = normalizePath(value);
            } else {
                el[key] = (key === 'fontSize' || key === 'width' || key === 'height') ? parseInt(value, 10) : value;
            }
            if (getPanels().refreshPanelDOM) getPanels().refreshPanelDOM(selectedObject);
        }
    }

    function removeUIElement(index) {
        var selectedObject = getScene().getSelectedObject && getScene().getSelectedObject();
        if (!selectedObject || !selectedObject.userData.panelData) return;
        selectedObject.userData.panelData.elements.splice(index, 1);
        if (getPanels().refreshPanelDOM) getPanels().refreshPanelDOM(selectedObject);
        renderUIElementsList();
    }

    function updatePanelCSS(cssText) {
        var selectedObject = getScene().getSelectedObject && getScene().getSelectedObject();
        if (!selectedObject || selectedObject.userData.type !== 'panel') return;
        selectedObject.userData.customCSS = cssText == null ? '' : String(cssText);
        if (getPanels().applyPanelCustomCSS) getPanels().applyPanelCustomCSS(selectedObject);
    }

    function updateDesignPanelProp(key, value) {
        var selectedObject = getScene().getSelectedObject && getScene().getSelectedObject();
        if (!selectedObject || !selectedObject.userData.panelData || !selectedObject.userData.panelData.props) return;
        var props = selectedObject.userData.panelData.props;
        var normalizePath = getUtils().normalizePath || function (p) { return p; };

        if (key === 'image' || key === 'prefab') {
            value = value ? normalizePath(value) : '';
        }

        if (value) {
            props[key] = value;
        } else {
            delete props[key];
        }

        if (getPanels().buildPropPanelVisual) {
            var newPanelData = getPanels().buildPropPanelVisual(props);
            selectedObject.userData.panelData = newPanelData;
            if (getPanels().serializePropPanelDiv) {
                selectedObject.userData.innerHTML = getPanels().serializePropPanelDiv(props);
            }
            if (getPanels().refreshPanelDOM) getPanels().refreshPanelDOM(selectedObject);
        }
    }

    function updateObjectProp(key, value) {
        var selectedObject = getScene().getSelectedObject && getScene().getSelectedObject();
        if (!selectedObject) return;
        var type = selectedObject.userData.type;
        var normalizePath = getUtils().normalizePath || function (p) { return p; };
        var Objects = getObjects();

        if (type === 'video') {
            if (key === 'width' || key === 'height') {
                selectedObject.userData[key] = parseFloat(value) || 0.01;
                if (Objects.rebuildPlaneGeometry) Objects.rebuildPlaneGeometry(selectedObject);
            } else if (key === 'src') {
                selectedObject.userData.src = normalizePath(value);
                if (Objects.refreshVideoTexture) Objects.refreshVideoTexture(selectedObject);
            } else {
                selectedObject.userData[key] = value;
                if (Objects.refreshVideoTexture) Objects.refreshVideoTexture(selectedObject);
            }
        } else if (type === 'html') {
            if (key === 'width' || key === 'height') {
                selectedObject.userData[key] = parseFloat(value) || 0.01;
                if (Objects.rebuildPlaneGeometry) Objects.rebuildPlaneGeometry(selectedObject);
            } else if (key === 'html') {
                selectedObject.userData.html = value;
                if (Objects.refreshHtmlTexture) Objects.refreshHtmlTexture(selectedObject);
            }
        } else if (type === 'panel') {
            if (key === 'width' || key === 'height') {
                var num = parseFloat(value) || 0.01;
                selectedObject.userData[key] = num;
                if (!selectedObject.userData.rawData) selectedObject.userData.rawData = {};
                selectedObject.userData.rawData[key] = String(num);
                if (Objects.rebuildPlaneGeometry) Objects.rebuildPlaneGeometry(selectedObject);
            } else if (key === 'panelType') {
                selectedObject.userData.panelType = value;
                selectedObject.userData.rawClasses = value.split(/\s+/).filter(function(c) { return c; });
                if (selectedObject.userData.isHtmlPrefab && selectedObject.userData.domElement) {
                    var dom = selectedObject.userData.domElement;
                    dom.className = 'ar-css3d-panel';
                    selectedObject.userData.rawClasses.forEach(function(c) { dom.classList.add(c); });
                }
            } else if (key === 'html') {
                selectedObject.userData.html = value;
                if (selectedObject.userData.isHtmlPrefab && selectedObject.userData.domElement) {
                    selectedObject.userData.domElement.innerHTML = value;
                }
            } else if (key === 'prefabStyles') {
                if (!selectedObject.userData.prefabStyles) selectedObject.userData.prefabStyles = [];
                selectedObject.userData.prefabStyles[0] = value;
                if (selectedObject.userData.isHtmlPrefab) {
                    var styleEl = document.getElementById('ar-prefab-styles');
                    if (styleEl) {
                        styleEl.textContent = value;
                    } else {
                        var newStyle = document.createElement('style');
                        newStyle.id = 'ar-prefab-styles';
                        newStyle.textContent = value;
                        document.head.appendChild(newStyle);
                    }
                }
            }
        } else if (type === 'object3d') {
            if (key === 'src') {
                selectedObject.userData.src = normalizePath(value);
                if (Objects.reloadObjectModel) Objects.reloadObjectModel(selectedObject);
            }
        }
    }

    function addObject3D() {
        var filename = prompt('Имя файла в /assets/ (например model.obj):', 'model.obj');
        if (filename === null || filename.trim() === '') return;
        var Objects = getObjects();
        var normalizePath = getUtils().normalizePath || function (p) { return p; };
        if (!Objects.createObjectMesh) return;
        var object = Objects.createObjectMesh({
            name: 'Object_' + Date.now().toString().slice(-3),
            src: normalizePath(filename.trim()),
            position: '0,0,0',
            rotation: '0,0,0'
        });
        getScene().addEditableObject(object);
        getScene().selectObject(object);
    }

    function addVideoObject3D() {
        var Objects = getObjects();
        if (!Objects.createVideoMesh) return;
        var video = Objects.createVideoMesh({
            name: 'Video_' + Date.now().toString().slice(-3),
            src: '', label: 'Video', width: 0.2, height: 0.12,
            position: '0,0,0', rotation: '0,0,0'
        });
        getScene().addEditableObject(video);
        getScene().selectObject(video);
    }

    function addHtmlObject3D() {
        var Objects = getObjects();
        if (!Objects.createHtmlMesh) return;
        var htmlObj = Objects.createHtmlMesh({
            name: 'HTML_' + Date.now().toString().slice(-3),
            width: 0.2, height: 0.14,
            position: '0,0,0', rotation: '0,0,0'
        }, '<div style="color:#fff;padding:8px;">Custom HTML</div>');
        getScene().addEditableObject(htmlObj);
        getScene().selectObject(htmlObj);
    }

    function addPanel() {
        var Objects = getObjects();
        if (!Objects.createPanelMesh) return;
        var panel = Objects.createPanelMesh(
            {
                name: 'Panel_' + Date.now().toString().slice(-3),
                width: '0.3',
                height: '0.3',
                position: '0,0,0',
                rotation: '0,0,0'
            },
            '<div class="panel"><div class="label">New Panel</div></div>'
        );
        getScene().addEditableObject(panel);
        getScene().selectObject(panel);
    }

    function deleteSelectedObject() {
        var selectedObject = getScene().getSelectedObject && getScene().getSelectedObject();
        if (!selectedObject) return;
        getScene().removeEditableObject(selectedObject);
        getScene().deselectObject();
        if (getIO().updateHierarchyTree) getIO().updateHierarchyTree();
    }

    var API = {
        renderInspector: renderInspector,
        clearInspector: clearInspector,
        updateObjName: updateObjName,
        updateObjTransform: updateObjTransform,
        updateInspectorFromTransform: updateInspectorFromTransform,
        addUIElement: addUIElement,
        updateUIElement: updateUIElement,
        removeUIElement: removeUIElement,
        updatePanelCSS: updatePanelCSS,
        updateDesignPanelProp: updateDesignPanelProp,
        updateObjectProp: updateObjectProp,
        addObject3D: addObject3D,
        addVideoObject3D: addVideoObject3D,
        addHtmlObject3D: addHtmlObject3D,
        addPanel: addPanel,
        deleteSelectedObject: deleteSelectedObject
    };

    global.InspectorModule = API;
})(typeof window !== 'undefined' ? window : this);
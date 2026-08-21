/**
 * js/io.js
 * Модуль загрузки/сохранения префабов (file:// и http://)
 */
(function (global) {
    'use strict';

    var PREFAB_STORAGE_KEY = '__editor_local_prefab_data';

    function parseAndBuildPrefab(designData) {
        var SceneModule = global.SceneModule;
        if (!SceneModule) {
            console.error('[IOModule] SceneModule не найден!');
            return;
        }

        SceneModule.clearScene();
        if (!designData) return;

        var rows = designData.rows || (Array.isArray(designData) ? designData : [designData]);

        rows.forEach(function (row, index) {
            var meta = row.meta || {};
            var name = meta.name || meta.id || ('Prefab_Object_' + (index + 1));

            var geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
            var material = new THREE.MeshStandardMaterial({
                color: Math.random() * 0xffffff,
                roughness: 0.4,
                metalness: 0.1
            });

            var mesh = new THREE.Mesh(geometry, material);
            mesh.name = name;
            mesh.position.set((index - (rows.length - 1) / 2) * 2.5, 0.75, 0);
            mesh.userData = {
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
                var parsed = JSON.parse(raw);
                parseAndBuildPrefab(parsed);
                console.log('[IOModule] Префаб загружен из localStorage');
            }
        } catch (e) {
            console.warn('[IOModule] Не удалось загрузить localStorage:', e);
        }
    }

    function handleFileSelect(event) {
        var file = event.target.files && event.target.files[0];
        if (!file) return;

        var reader = new FileReader();
        reader.onload = function (e) {
            try {
                var jsonData = JSON.parse(e.target.result);

                if (global.DesignBuilder && typeof global.DesignBuilder.loadJSON === 'function' && Array.isArray(jsonData)) {
                    parseAndBuildPrefab(jsonData);
                } else {
                    parseAndBuildPrefab(jsonData);
                }

                localStorage.setItem(PREFAB_STORAGE_KEY, JSON.stringify(jsonData));
            } catch (err) {
                console.error('[IOModule] Ошибка парсинга JSON:', err);
                alert('Ошибка чтения JSON: ' + err.message);
            }
        };
        reader.readAsText(file);
    }

    function exportHTML() {
        var SceneModule = global.SceneModule;
        if (!SceneModule) return;

        var objects = SceneModule.getSceneObjects();
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

    var API = {
        parseAndBuildPrefab: parseAndBuildPrefab,
        updateHierarchyTree: updateHierarchyTree,
        loadLocalPrefab: loadLocalPrefab,
        handleFileSelect: handleFileSelect,
        exportHTML: exportHTML
    };

    global.IOModule = API;
})(typeof window !== 'undefined' ? window : this);
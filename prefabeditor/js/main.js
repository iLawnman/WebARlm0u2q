/**
 * js/main.js
 * Точка входа редактора префабов (file:// и http://)
 */
(function () {
    'use strict';

    function getModuleFunction(moduleName, fnName) {
        if (window[moduleName] && typeof window[moduleName][fnName] === 'function') {
            return window[moduleName][fnName];
        }
        if (typeof window[fnName] === 'function') {
            return window[fnName];
        }
        return function () {
            console.warn('[Editor] Функция ' + fnName + ' из ' + moduleName + ' не найдена.');
        };
    }

    function safeCall(fnGetter) {
        var args = Array.prototype.slice.call(arguments, 1);
        var fn = fnGetter();
        return fn.apply(null, args);
    }

    function onSelect() {
        var updateHierarchy = getModuleFunction('IOModule', 'updateHierarchyTree');
        var renderInsp = getModuleFunction('InspectorModule', 'renderInspector');
        updateHierarchy();
        renderInsp();
    }

    function onDeselect() {
        var updateHierarchy = getModuleFunction('IOModule', 'updateHierarchyTree');
        var clearInsp = getModuleFunction('InspectorModule', 'clearInspector');
        updateHierarchy();
        clearInsp();
    }

    function onTransformChange() {
        var updateInspTransform = getModuleFunction('InspectorModule', 'updateInspectorFromTransform');
        updateInspTransform.apply(null, arguments);
    }

    function setupCallbacks() {
        var setCallbacks = getModuleFunction('SceneModule', 'setSceneCallbacks');
        setCallbacks({
            onSelect: onSelect,
            onDeselect: onDeselect,
            onTransformChange: onTransformChange
        });
    }

    window.__editor = {
        loadLocalPrefab: function () { return safeCall(function () { return getModuleFunction('IOModule', 'loadLocalPrefab'); }); },
        handleFileSelect: function (e) { return safeCall(function () { return getModuleFunction('IOModule', 'handleFileSelect'); }, e); },
        exportHTML: function () { return safeCall(function () { return getModuleFunction('IOModule', 'exportHTML'); }); },

        addObject3D: function () { return safeCall(function () { return getModuleFunction('InspectorModule', 'addObject3D'); }); },
        addPanel: function () { return safeCall(function () { return getModuleFunction('InspectorModule', 'addPanel'); }); },
        addVideoObject3D: function () { return safeCall(function () { return getModuleFunction('InspectorModule', 'addVideoObject3D'); }); },
        addHtmlObject3D: function () { return safeCall(function () { return getModuleFunction('InspectorModule', 'addHtmlObject3D'); }); },
        updateObjName: function (v) { return safeCall(function () { return getModuleFunction('InspectorModule', 'updateObjName'); }, v); },
        updateObjTransform: function (t, a, v) { return safeCall(function () { return getModuleFunction('InspectorModule', 'updateObjTransform'); }, t, a, v); },
        updateObjectProp: function (k, v) { return safeCall(function () { return getModuleFunction('InspectorModule', 'updateObjectProp'); }, k, v); },
        updateDesignPanelProp: function (k, v) { return safeCall(function () { return getModuleFunction('InspectorModule', 'updateDesignPanelProp'); }, k, v); },
        updatePanelCSS: function (c) { return safeCall(function () { return getModuleFunction('InspectorModule', 'updatePanelCSS'); }, c); },
        addUIElement: function (t) { return safeCall(function () { return getModuleFunction('InspectorModule', 'addUIElement'); }, t); },
        updateUIElement: function (i, k, v) { return safeCall(function () { return getModuleFunction('InspectorModule', 'updateUIElement'); }, i, k, v); },
        removeUIElement: function (i) { return safeCall(function () { return getModuleFunction('InspectorModule', 'removeUIElement'); }, i); },
        deleteSelectedObject: function () { return safeCall(function () { return getModuleFunction('InspectorModule', 'deleteSelectedObject'); }); },
        selectObject: function (o) { return safeCall(function () { return getModuleFunction('SceneModule', 'selectObject'); }, o); }
    };

    window.addEventListener('DOMContentLoaded', function () {
        var init3D = getModuleFunction('SceneModule', 'init3D');
        var loadLocalPrefab = getModuleFunction('IOModule', 'loadLocalPrefab');

        var initPromise;
        try {
            initPromise = Promise.resolve(init3D());
        } catch (e) {
            initPromise = Promise.reject(e);
        }

        initPromise.then(function () {
            setupCallbacks();
            loadLocalPrefab();
        }).catch(function (err) {
            console.error('[Editor] Ошибка инициализации 3D сцены:', err);
        });
    });
})();
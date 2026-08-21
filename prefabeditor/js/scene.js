/**
 * js/scene.js
 * Модуль 3D-сцены на Three.js (file:// и http://)
 */
(function (global) {
    'use strict';

    let scene, camera, renderer, raycaster, mouse;
    let selectedObject = null;
    let sceneObjects = [];
    let callbacks = {
        onSelect: function () {},
        onDeselect: function () {},
        onTransformChange: function () {}
    };

    function init3D() {
        return new Promise(function (resolve) {
            var canvas = document.getElementById('canvas3d');
            if (!canvas) {
                console.error('[SceneModule] #canvas3d не найден');
                resolve();
                return;
            }

            var container = canvas.parentElement || document.body;
            var width = container.clientWidth || window.innerWidth;
            var height = container.clientHeight || window.innerHeight;

            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x0a0a0e);

            camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
            camera.position.set(0, 5, 10);
            camera.lookAt(0, 0, 0);

            renderer = new THREE.WebGLRenderer({
                canvas: canvas,
                antialias: true,
                preserveDrawingBuffer: true,
                alpha: true
            });
            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

            var ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
            scene.add(ambientLight);

            var dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
            dirLight.position.set(5, 10, 7);
            scene.add(dirLight);

            var gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
            scene.add(gridHelper);

            raycaster = new THREE.Raycaster();
            mouse = new THREE.Vector2();

            canvas.addEventListener('pointerdown', onPointerDown);
            window.addEventListener('resize', onWindowResize);

            function animate() {
                requestAnimationFrame(animate);
                if (renderer && scene && camera) {
                    renderer.render(scene, camera);
                }
            }
            animate();

            console.log('[SceneModule] 3D сцена инициализирована (#canvas3d)');
            resolve();
        });
    }

    function onWindowResize() {
        if (!camera || !renderer) return;
        var canvas = document.getElementById('canvas3d');
        var container = (canvas && canvas.parentElement) || document.body;
        var width = container.clientWidth || window.innerWidth;
        var height = container.clientHeight || window.innerHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }

    function onPointerDown(event) {
        if (event.button !== 0) return;
        var canvas = renderer.domElement;
        var rect = canvas.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        var intersects = raycaster.intersectObjects(sceneObjects, true);

        if (intersects.length > 0) {
            var hit = intersects[0].object;
            while (hit.parent && hit.parent !== scene && sceneObjects.indexOf(hit) === -1) {
                hit = hit.parent;
            }
            selectObject(hit);
        } else {
            deselectObject();
        }
    }

    function selectObject(obj) {
        if (selectedObject === obj) return;
        deselectObject();
        selectedObject = obj;
        if (selectedObject) {
            if (!selectedObject.userData.helper) {
                var helper = new THREE.BoxHelper(selectedObject, 0x00ff00);
                scene.add(helper);
                selectedObject.userData.helper = helper;
            }
            callbacks.onSelect(selectedObject);
        }
    }

    function deselectObject() {
        if (selectedObject) {
            if (selectedObject.userData.helper) {
                scene.remove(selectedObject.userData.helper);
                if (selectedObject.userData.helper.dispose) {
                    selectedObject.userData.helper.dispose();
                }
                delete selectedObject.userData.helper;
            }
            selectedObject = null;
            callbacks.onDeselect();
        }
    }

    function setSceneCallbacks(cbs) {
        if (cbs) {
            if (cbs.onSelect) callbacks.onSelect = cbs.onSelect;
            if (cbs.onDeselect) callbacks.onDeselect = cbs.onDeselect;
            if (cbs.onTransformChange) callbacks.onTransformChange = cbs.onTransformChange;
        }
    }

    function addSceneObject(mesh) {
        if (!mesh) return;
        scene.add(mesh);
        sceneObjects.push(mesh);
        selectObject(mesh);
    }

    function removeSceneObject(mesh) {
        if (!mesh) return;
        if (selectedObject === mesh) deselectObject();
        scene.remove(mesh);
        var idx = sceneObjects.indexOf(mesh);
        if (idx !== -1) sceneObjects.splice(idx, 1);
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
            if (Array.isArray(mesh.material)) {
                mesh.material.forEach(function (m) { m.dispose(); });
            } else {
                mesh.material.dispose();
            }
        }
    }

    function clearScene() {
        deselectObject();
        var toRemove = sceneObjects.slice();
        toRemove.forEach(function (obj) { removeSceneObject(obj); });
        sceneObjects = [];
    }

    function addEditableObject(mesh) { addSceneObject(mesh); }
    function removeEditableObject(mesh) { removeSceneObject(mesh); }

    var API = {
        init3D: init3D,
        setSceneCallbacks: setSceneCallbacks,
        selectObject: selectObject,
        deselectObject: deselectObject,
        addSceneObject: addSceneObject,
        removeSceneObject: removeSceneObject,
        addEditableObject: addEditableObject,
        removeEditableObject: removeEditableObject,
        clearScene: clearScene,
        getSelectedObject: function () { return selectedObject; },
        getSceneObjects: function () { return sceneObjects; },
        getScene: function () { return scene; },
        getCamera: function () { return camera; }
    };

    global.SceneModule = API;
})(typeof window !== 'undefined' ? window : this);
/** Создание 3D-объектов: model (Mesh), panel/video/html (CSS3DObject + proxy plane) */
(function () {
    'use strict';

    function getUtils() { return window.UtilsModule || {}; }
    function getPanels() { return window.PanelsModule || {}; }

    function getObjLoader() {
        if (typeof THREE !== 'undefined' && THREE.OBJLoader) {
            return new THREE.OBJLoader();
        }
        return null;
    }

    function createCSS3DWrapper(width, height, domElement) {
        const group = new THREE.Group();

        const geo = new THREE.PlaneGeometry(width, height);
        const mat = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0.001,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const proxy = new THREE.Mesh(geo, mat);
        proxy.name = 'proxy';
        group.add(proxy);

        const CssObj = (typeof THREE !== 'undefined' && typeof THREE.CSS3DObject === 'function') 
            ? THREE.CSS3DObject 
            : null;
        
        if (CssObj) {
            const css3d = new CssObj(domElement);
            css3d.position.set(0, 0, 0);
            const baseW = 300;
            const baseH = 180;
            css3d.scale.set(width / baseW, height / baseH, width / baseW);
            group.add(css3d);
            group.userData.css2dObject = css3d;
        }

        group.userData.proxy = proxy;
        group.userData.domElement = domElement;

        return group;
    }

    function loadObjIntoGroup(group, src, placeholder) {
        const normalizePath = getUtils().normalizePath || (p => p);
        const path = normalizePath(src);
        const loader = getObjLoader();

        if (!loader) {
            console.warn('[Objects] THREE.OBJLoader не доступен.');
            return;
        }

        loader.load(path, obj => {
            if (placeholder && placeholder.parent === group) group.remove(placeholder);
            obj.traverse(child => {
                if (child.isMesh) {
                    child.material = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.2, roughness: 0.6 });
                }
            });
            group.add(obj);
            group.userData.loadedObj = obj;
        }, undefined, err => {
            console.error('Не удалось загрузить OBJ:', path, err);
        });
    }

    function createObjectMesh(data = {}) {
        const normalizePath = getUtils().normalizePath || (p => p);
        const applyTransformData = getUtils().applyTransformData || (() => {});

        const group = new THREE.Group();
        group.name = data.name || 'object_' + Date.now().toString().slice(-4);
        const srcPath = normalizePath(data.src || '');
        group.userData = { type: 'object3d', rawData: data, src: srcPath };

        const placeholder = new THREE.Mesh(
            new THREE.BoxGeometry(0.05, 0.05, 0.05),
            new THREE.MeshStandardMaterial({ color: 0x666666, wireframe: true })
        );
        placeholder.name = 'placeholder';
        group.add(placeholder);

        applyTransformData(group, data);
        if (srcPath) loadObjIntoGroup(group, srcPath, placeholder);
        return group;
    }

    function reloadObjectModel(group) {
        if (group.userData.loadedObj) {
            group.remove(group.userData.loadedObj);
            group.userData.loadedObj = null;
        }
        const placeholder = new THREE.Mesh(
            new THREE.BoxGeometry(0.05, 0.05, 0.05),
            new THREE.MeshStandardMaterial({ color: 0x666666, wireframe: true })
        );
        placeholder.name = 'placeholder';
        group.add(placeholder);
        if (group.userData.src) loadObjIntoGroup(group, group.userData.src, placeholder);
    }

    function createVideoMesh(data = {}) {
        const normalizePath = getUtils().normalizePath || (p => p);
        const applyTransformData = getUtils().applyTransformData || (() => {});
        const buildVideoDOM = getPanels().buildVideoDOM || (() => document.createElement('div'));

        const width = parseFloat(data.width) || 0.2;
        const height = parseFloat(data.height) || 0.12;

        const dom = buildVideoDOM({
            src: normalizePath(data.src || ''),
            label: data.label || 'Video'
        });

        const group = createCSS3DWrapper(width, height, dom);
        group.name = data.name || 'video_' + Date.now().toString().slice(-4);
        group.userData = {
            type: 'video',
            rawData: data,
            src: normalizePath(data.src || ''),
            label: data.label || 'Video',
            width,
            height,
            ...group.userData
        };

        applyTransformData(group, data);
        return group;
    }

    function refreshVideoTexture(mesh) {
        const dom = mesh.userData.domElement;
        if (!dom) return;
        const video = dom.querySelector('video');
        const label = dom.querySelector('.video-label');
        if (video) {
            video.src = mesh.userData.src || '';
            video.load();
        }
        if (label) label.textContent = mesh.userData.label || 'Video';
    }

    function createHtmlMesh(data = {}, rawHtml = '') {
        const applyTransformData = getUtils().applyTransformData || (() => {});
        const buildHtmlDOM = getPanels().buildHtmlDOM || (() => document.createElement('div'));

        const width = parseFloat(data.width) || 0.2;
        const height = parseFloat(data.height) || 0.14;
        const html = rawHtml || data.html || '<div style="color:#fff;padding:8px;">Custom HTML</div>';

        const dom = buildHtmlDOM(html);

        const group = createCSS3DWrapper(width, height, dom);
        group.name = data.name || 'html_' + Date.now().toString().slice(-4);
        group.userData = {
            type: 'html',
            rawData: data,
            html,
            width,
            height,
            ...group.userData
        };

        applyTransformData(group, data);
        return group;
    }

    function refreshHtmlTexture(mesh) {
        const dom = mesh.userData.domElement;
        if (!dom) return;
        dom.innerHTML = mesh.userData.html || '';
    }

    function createPanelMesh(data = {}, innerHTML = '') {
        const decodeHtmlB64 = getUtils().decodeHtmlB64 || (s => s);
        const applyTransformData = getUtils().applyTransformData || (() => {});
        const parsePanelHTML = getPanels().parsePanelHTML || (() => ({}));
        const buildPanelDOM = getPanels().buildPanelDOM || (() => document.createElement('div'));
        const applyPanelCustomCSS = getPanels().applyPanelCustomCSS || (() => {});

        const width = parseFloat(data.width) || 0.3;
        const height = parseFloat(data.height) || 0.3;

        let customCSS = '';
        if (data.css) {
            customCSS = decodeHtmlB64(data.css) || data.css;
        } else if (data.customCss) {
            customCSS = decodeHtmlB64(data.customCss) || data.customCss;
        } else if (data.customCSS) {
            customCSS = data.customCSS;
        }
        if (!customCSS && innerHTML && innerHTML.includes('<style')) {
            const m = innerHTML.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
            if (m) customCSS = m[1].trim();
        }

        const panelData = parsePanelHTML(innerHTML);
        const dom = buildPanelDOM(panelData);

        const group = createCSS3DWrapper(width, height, dom);
        group.name = data.name || 'panel_' + Date.now().toString().slice(-4);
        group.userData = {
            type: 'panel',
            rawData: data,
            panelData,
            innerHTML: innerHTML,
            customCSS: customCSS || '',
            width,
            height,
            ...group.userData
        };

        applyTransformData(group, data);
        applyPanelCustomCSS(group);
        return group;
    }

    function rebuildPlaneGeometry(mesh) {
        const w = mesh.userData.width || 0.3;
        const h = mesh.userData.height || 0.3;

        if (mesh.userData.proxy) {
            mesh.userData.proxy.geometry.dispose();
            mesh.userData.proxy.geometry = new THREE.PlaneGeometry(w, h);
        }

        if (mesh.userData.css2dObject) {
            const baseW = 300;
            const baseH = 180;
            mesh.userData.css2dObject.scale.set(w / baseW, h / baseH, w / baseW);
        }
    }

    window.ObjectsModule = {
        createObjectMesh,
        reloadObjectModel,
        createVideoMesh,
        refreshVideoTexture,
        createHtmlMesh,
        refreshHtmlTexture,
        createPanelMesh,
        rebuildPlaneGeometry
    };
})();
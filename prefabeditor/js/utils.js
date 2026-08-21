/**
 * js/utils.js
 * Утилиты: пути, экранирование, base64, dataset, transform
 */
(function () {
    'use strict';

    function normalizePath(path) {
        if (!path) return '';
        let p = path.trim();
        if (/^(https?:|blob:|data:|\/\/)/i.test(p)) return p;
        if (p.startsWith('./')) return p;
        if (p.startsWith('/')) return '.' + p;
        return './assets/' + p;
    }

    function escapeAttr(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function encodeHtmlB64(str) {
        return btoa(unescape(encodeURIComponent(str || '')));
    }

    function decodeHtmlB64(str) {
        try {
            return decodeURIComponent(escape(atob(str || '')));
        } catch (e) {
            return '';
        }
    }

    function getDataset(node) {
        const data = {};
        if (!node || !node.attributes) return data;
        for (const attr of node.attributes) {
            let name = attr.name;
            if (name.startsWith('data-')) {
                name = name.slice(5);
            }
            const camelCaseKey = name.replace/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
            data[camelCaseKey] = attr.value;
        }
        return data;
    }

    function applyTransformData(mesh, data) {
        if (!mesh || !data) return;
        
        const MathUtils = (typeof THREE !== 'undefined' && THREE.MathUtils) ? THREE.MathUtils : {
            degToRad: function (deg) { return deg * (Math.PI / 180); }
        };

        if (data.position) {
            const pos = data.position.split(',').map(Number);
            if (pos.length === 3 && !pos.some(isNaN)) mesh.position.set(pos[0], pos[1], pos[2]);
        }
        if (data.rotation) {
            const rot = data.rotation.split(',').map(function (v) { return MathUtils.degToRad(parseFloat(v) || 0); });
            if (rot.length === 3) mesh.rotation.set(rot[0], rot[1], rot[2]);
        }
        if (data.scale) {
            const scl = data.scale.split(',').map(Number);
            if (scl.length === 3 && !scl.some(isNaN)) mesh.scale.set(scl[0], scl[1], scl[2]);
        }
    }

    window.UtilsModule = {
        normalizePath: normalizePath,
        escapeAttr: escapeAttr,
        encodeHtmlB64: encodeHtmlB64,
        decodeHtmlB64: decodeHtmlB64,
        getDataset: getDataset,
        applyTransformData: applyTransformData
    };
})();
import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';

export class XRSetup {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a1a);
        
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
        this.camera.position.set(0, 1.5, 1.5);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.xr.enabled = true;
        document.body.prepend(this.renderer.domElement);
        
        // Добавляем AR кнопку
        this.arButton = ARButton.createButton(this.renderer, {
            requiredFeatures: ['camera'],
            optionalFeatures: ['depth-sensing']
        });
        document.body.prepend(this.arButton);
        
        // Освещение
        const light = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(light);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(0, 5, 5);
        this.scene.add(dirLight);
        
        // Сетка для ориентации
        const gridHelper = new THREE.GridHelper(3, 20, 0x4ade80, 0x1a3a2a);
        gridHelper.position.y = -0.5;
        this.scene.add(gridHelper);
        
        window.addEventListener('resize', () => this.onResize());
    }
    
    async init() {
        // Ждем готовности WebXR
        return new Promise((resolve) => {
            if (this.renderer.xr.isPresenting) {
                resolve();
            } else {
                // Просто разрешаем через 1 секунду, если не в AR
                setTimeout(resolve, 1000);
            }
        });
    }
    
    startRenderLoop(callback) {
        this.renderer.setAnimationLoop(() => {
            this.renderer.render(this.scene, this.camera);
            if (callback) callback();
        });
    }
    
    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
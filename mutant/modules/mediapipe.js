export class MediaPipeDetector {
    constructor() {
        this.detector = null;
        this.video = null;
        this.isRunning = false;
        this.onDetectionCallback = null;
    }
    
    async init() {
        // Загружаем MediaPipe через CDN
        await this.loadMediaPipe();
        
        // Создаем видеопоток
        this.video = document.createElement('video');
        this.video.style.display = 'none';
        document.body.appendChild(this.video);
        
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });
        this.video.srcObject = stream;
        await this.video.play();
        
        // Инициализируем детектор
        const { ObjectDetector, FilesetResolver } = await import(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm/vision_bundle.js'
        );
        
        const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
        );
        
        this.detector = await ObjectDetector.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite',
                delegate: 'CPU'
            },
            scoreThreshold: 0.5,
            runningMode: 'VIDEO'
        });
        
        return true;
    }
    
    loadMediaPipe() {
        return new Promise((resolve) => {
            // Проверяем, загружен ли MediaPipe
            if (window.MediaPipeTasksVision) {
                resolve();
                return;
            }
            
            // Загружаем скрипт
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm/vision_bundle.mjs';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load MediaPipe'));
            document.head.appendChild(script);
        });
    }
    
    startDetection(callback) {
        this.onDetectionCallback = callback;
        this.isRunning = true;
        this.detectLoop();
    }
    
    async detectLoop() {
        if (!this.isRunning) return;
        
        if (this.video.readyState >= 2) {
            try {
                const results = await this.detector.detectForVideo(this.video, performance.now());
                if (this.onDetectionCallback) {
                    // Фильтруем только животных (по категориям)
                    const animals = results.detections.filter(d => {
                        const cat = d.categories[0];
                        // Коты, собаки, птицы и т.д.
                        return cat.categoryName && 
                               ['cat', 'dog', 'bird', 'horse', 'sheep', 'cow', 'elephant', 
                                'bear', 'zebra', 'giraffe'].includes(cat.categoryName.toLowerCase());
                    });
                    
                    this.onDetectionCallback({
                        detections: animals,
                        raw: results
                    });
                }
            } catch (err) {
                console.warn('Detection error:', err);
            }
        }
        
        requestAnimationFrame(() => this.detectLoop());
    }
    
    stopDetection() {
        this.isRunning = false;
    }
}
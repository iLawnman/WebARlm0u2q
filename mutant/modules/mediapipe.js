export class MediaPipeDetector {
    constructor(logger) {
        this.logger = logger;
        this.detector = null;
        this.video = null;
        this.isRunning = false;
        this.onDetectionCallback = null;
        this.initialized = false;
        this.detectionCount = 0;
    }
    
    async init() {
        try {
            this.logger.info('📹 Запрос доступа к камере...');
            
            this.video = document.createElement('video');
            this.video.style.display = 'none';
            document.body.appendChild(this.video);
            
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            });
            
            this.video.srcObject = stream;
            await this.video.play();
            this.logger.success(`📹 Камера запущена: ${this.video.videoWidth}x${this.video.videoHeight}`);
            
            this.logger.info('📦 Загрузка MediaPipe модели...');
            
            // Загружаем MediaPipe
            const { ObjectDetector, FilesetResolver } = await import(
                'script src="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.mjs'
            );
            
            this.logger.debug('✅ MediaPipe модуль загружен');
            
            const vision = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
            );
            
            this.logger.debug('✅ FilesetResolver создан');
            
            this.detector = await ObjectDetector.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite',
                    delegate: 'CPU'
                },
                scoreThreshold: 0.5,
                runningMode: 'VIDEO'
            });
            
            this.initialized = true;
            this.logger.success('✅ MediaPipe детектор создан');
            return true;
            
        } catch (err) {
            this.logger.error('❌ Ошибка инициализации MediaPipe:', err.message);
            throw err;
        }
    }
    
    getVideo() {
        return this.video;
    }
    
    startDetection(callback) {
        if (!this.initialized) {
            this.logger.error('❌ MediaPipe не инициализирован');
            return;
        }
        
        this.onDetectionCallback = callback;
        this.isRunning = true;
        this.logger.info('🔄 Запуск цикла детекции...');
        this.detectLoop();
    }
    
    async detectLoop() {
        if (!this.isRunning) return;
        
        if (this.video.readyState >= 2) {
            try {
                const startTime = performance.now();
                const results = await this.detector.detectForVideo(this.video, startTime);
                const elapsed = (performance.now() - startTime).toFixed(1);
                
                if (this.detectionCount % 30 === 0) { // Лог каждые 30 кадров
                    this.logger.debug(`⏱️ Детекция: ${elapsed}ms, детекций: ${results.detections?.length || 0}`);
                }
                this.detectionCount++;
                
                if (this.onDetectionCallback && results.detections) {
                    // Фильтруем только животных
                    const animals = results.detections.filter(d => {
                        const cat = d.categories[0];
                        if (!cat) return false;
                        const name = cat.categoryName?.toLowerCase() || '';
                        const animalList = ['cat', 'dog', 'bird', 'horse', 'sheep', 'cow', 
                                           'elephant', 'bear', 'zebra', 'giraffe', 'lion', 
                                           'tiger', 'monkey', 'rabbit', 'fox', 'wolf'];
                        return animalList.some(a => name.includes(a));
                    });
                    
                    if (animals.length > 0 && this.detectionCount % 10 === 0) {
                        this.logger.debug(`🐾 Найдено животных: ${animals.length}`);
                    }
                    
                    this.onDetectionCallback({
                        detections: animals,
                        raw: results,
                        timestamp: Date.now()
                    });
                }
            } catch (err) {
                if (this.detectionCount % 30 === 0) {
                    this.logger.error('❌ Ошибка детекции:', err.message);
                }
            }
        } else {
            if (this.detectionCount % 60 === 0) {
                this.logger.warn('⏳ Видео не готово, состояние:', this.video.readyState);
            }
        }
        
        requestAnimationFrame(() => this.detectLoop());
    }
    
    stopDetection() {
        this.isRunning = false;
        this.logger.info('⏹️ Детекция остановлена');
    }
}
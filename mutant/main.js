import { XRSetup } from './modules/xr-setup.js';
import { MediaPipeDetector } from './modules/mediapipe.js';
import { SlotsManager } from './modules/slots.js';
import { MutationEngine } from './modules/mutation.js';
import { DebugLogger } from './modules/debug.js';

class AnimalMutatorApp {
    constructor() {
        this.logger = new DebugLogger();
        this.logger.info('🚀 Запуск приложения Animal Mutator');
        
        this.xr = new XRSetup(this.logger);
        this.mediapipe = new MediaPipeDetector(this.logger);
        this.slots = new SlotsManager(this.logger);
        this.mutation = new MutationEngine(this.logger);
        
        this.isCapturing = false;
        this.detectionCount = 0;
        this.statusEl = document.getElementById('status');
        this.hintEl = document.getElementById('hint');
        this.initialized = false;
        
        this.init();
    }
    
    async init() {
        try {
            this.logger.info('📦 Инициализация XR...');
            await this.xr.init();
            this.logger.success('✅ XR инициализирован');
            
            this.logger.info('📦 Инициализация MediaPipe...');
            await this.mediapipe.init();
            this.logger.success('✅ MediaPipe инициализирован');
            
            this.logger.info('📦 Запуск детекции...');
            this.mediapipe.startDetection((results) => {
                this.onDetection(results);
            });
            this.logger.success('✅ Детекция запущена');
            
            this.logger.info('📦 Запуск рендер-лупа...');
            this.xr.startRenderLoop(() => {
                // Можно добавлять 3D-объекты в сцену
            });
            this.logger.success('✅ Рендер-луп запущен');
            
            this.initialized = true;
            this.statusEl.textContent = '✅ Готов, наведите камеру на животное';
            this.logger.success('🎯 Приложение готово к работе!');
            
        } catch (err) {
            this.logger.error('❌ Ошибка инициализации:', err.message);
            this.logger.error('Stack:', err.stack);
            this.statusEl.textContent = '❌ Ошибка: ' + err.message;
            this.statusEl.style.color = '#ef4444';
            console.error(err);
        }
    }
    
    onDetection(results) {
        if (!this.initialized) return;
        if (this.isCapturing) return;
        
        const hasAnimal = results.detections && results.detections.length > 0;
        
        if (hasAnimal) {
            const animal = results.detections[0];
            const name = animal.categories[0]?.categoryName || 'unknown';
            const score = (animal.categories[0]?.score || 0).toFixed(2);
            
            this.logger.debug(`🐾 Обнаружено животное: ${name} (${score})`);
            this.statusEl.textContent = `🐾 ${name} обнаружен!`;
            
            if (!this.slots.isFull()) {
                this.logger.info(`📸 Захват фото (${this.slots.getCount() + 1}/2)`);
                this.capturePhoto();
            } else {
                this.logger.debug('⏳ Слоты заполнены, ожидание мутации');
            }
        } else {
            if (this.statusEl.textContent.includes('обнаружен')) {
                this.statusEl.textContent = '🔍 Наведите на животное';
            }
        }
    }
    
    capturePhoto() {
        this.isCapturing = true;
        this.logger.info('📸 Захват кадра...');
        this.statusEl.textContent = '📸 Фото...';
        
        const video = this.mediapipe.getVideo();
        if (!video) {
            this.logger.error('❌ Видео не доступно');
            this.isCapturing = false;
            return;
        }
        
        try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            this.logger.debug(`📷 Размер фото: ${(dataUrl.length / 1024).toFixed(1)} KB`);
            
            const slotIndex = this.slots.addPhoto(dataUrl);
            
            if (slotIndex !== null) {
                this.logger.success(`✅ Фото сохранено в слот ${slotIndex + 1}`);
                this.statusEl.textContent = `✅ Фото в слоте ${slotIndex + 1}`;
                
                if (this.slots.isFull()) {
                    this.logger.info('🎉 Оба слота заполнены! Запуск мутации...');
                    setTimeout(() => this.runMutation(), 500);
                }
            } else {
                this.logger.warn('⚠️ Нет свободных слотов');
            }
        } catch (err) {
            this.logger.error('❌ Ошибка захвата фото:', err.message);
        }
        
        this.isCapturing = false;
    }
    
    async runMutation() {
        this.logger.info('🧬 Начало мутации...');
        this.statusEl.textContent = '🧬 Создание мутанта...';
        this.hintEl.textContent = '🧬 Мутация...';
        
        const images = this.slots.getImages();
        this.logger.debug(`📸 Изображения для мутации: ${images.length} шт.`);
        
        try {
            this.logger.info('🎨 Генерация мутанта...');
            const result = await this.mutation.mutate(images[0], images[1]);
            this.logger.success('✅ Мутант создан!');
            
            const resultDiv = document.getElementById('result');
            const resultImg = document.getElementById('result-img');
            resultImg.src = result;
            resultDiv.style.display = 'block';
            
            this.logger.debug(`📊 Размер результата: ${(result.length / 1024).toFixed(1)} KB`);
            
            this.statusEl.textContent = '🎉 Мутант создан!';
            this.hintEl.textContent = '🔄 Сделайте новое фото для повторной мутации';
            
            resultDiv.style.animation = 'none';
            setTimeout(() => {
                resultDiv.style.animation = 'fadeInScale 0.8s ease';
            }, 10);
            
            this.logger.info('⏳ Автосброс через 5 секунд...');
            setTimeout(() => {
                this.logger.info('🔄 Сброс слотов');
                this.slots.clear();
                document.getElementById('result').style.display = 'none';
                this.hintEl.textContent = '🔍 Наведите на животное';
                this.statusEl.textContent = '🔍 Готов к новым фото';
                this.logger.info('✅ Готов к новой мутации');
            }, 5000);
            
        } catch (err) {
            this.logger.error('❌ Ошибка мутации:', err.message);
            this.logger.error('Stack:', err.stack);
            this.statusEl.textContent = '❌ Ошибка мутации: ' + err.message;
            this.statusEl.style.color = '#ef4444';
        }
    }
}

// Добавляем CSS-анимацию
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInScale {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
        100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }
`;
document.head.appendChild(style);

// Запуск приложения
window.addEventListener('load', () => {
    new AnimalMutatorApp();
});
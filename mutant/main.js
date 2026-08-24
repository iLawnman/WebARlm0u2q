import { XRSetup } from './modules/xr-setup.js';
import { MediaPipeDetector } from './modules/mediapipe.js';
import { SlotsManager } from './modules/slots.js';
import { MutationEngine } from './modules/mutation.js';

class AnimalMutatorApp {
    constructor() {
        this.xr = new XRSetup();
        this.mediapipe = new MediaPipeDetector();
        this.slots = new SlotsManager();
        this.mutation = new MutationEngine();
        
        this.isCapturing = false;
        this.detectionCount = 0;
        this.statusEl = document.getElementById('status');
        
        this.init();
    }
    
    async init() {
        try {
            await this.xr.init();
            await this.mediapipe.init();
            
            this.statusEl.textContent = '✅ Готов, наведите камеру на животное';
            
            // Запуск детекции
            this.mediapipe.startDetection((results) => {
                this.onDetection(results);
            });
            
            // WebXR рендер-луп
            this.xr.startRenderLoop(() => {
                // Можно добавлять 3D-объекты в сцену
            });
            
        } catch (err) {
            this.statusEl.textContent = '❌ Ошибка: ' + err.message;
            console.error(err);
        }
    }
    
    onDetection(results) {
        if (this.isCapturing) return;
        
        const hasAnimal = results.detections && results.detections.length > 0;
        
        if (hasAnimal) {
            this.statusEl.textContent = '🐾 Животное обнаружено!';
            
            // Показываем подсказку для захвата
            if (!this.slots.isFull()) {
                this.capturePhoto();
            }
        } else {
            this.statusEl.textContent = '🔍 Наведите на животное';
        }
    }
    
    capturePhoto() {
        this.isCapturing = true;
        this.statusEl.textContent = '📸 Фото...';
        
        // Получаем кадр из MediaPipe
        const video = document.querySelector('video');
        if (!video) {
            this.isCapturing = false;
            return;
        }
        
        // Создаем canvas для захвата
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Добавляем в слот
        const slotIndex = this.slots.addPhoto(canvas.toDataURL('image/jpeg', 0.8));
        
        if (slotIndex !== null) {
            this.statusEl.textContent = `✅ Фото в слоте ${slotIndex + 1}`;
            
            // Если оба слота заполнены - запускаем мутацию
            if (this.slots.isFull()) {
                setTimeout(() => this.runMutation(), 500);
            }
        }
        
        this.isCapturing = false;
    }
    
    async runMutation() {
        this.statusEl.textContent = '🧬 Создание мутанта...';
        document.getElementById('hint').textContent = '🧬 Мутация...';
        
        const images = this.slots.getImages();
        
        try {
            const result = await this.mutation.mutate(images[0], images[1]);
            
            // Показываем результат
            const resultDiv = document.getElementById('result');
            const resultImg = document.getElementById('result-img');
            resultImg.src = result;
            resultDiv.style.display = 'block';
            
            this.statusEl.textContent = '🎉 Мутант создан!';
            document.getElementById('hint').textContent = '🔄 Сделайте новое фото для повторной мутации';
            
            // Анимация появления
            resultDiv.style.animation = 'none';
            setTimeout(() => {
                resultDiv.style.animation = 'fadeInScale 0.8s ease';
            }, 10);
            
            // Сбрасываем слоты через 3 секунды
            setTimeout(() => {
                this.slots.clear();
                document.getElementById('result').style.display = 'none';
                document.getElementById('hint').textContent = '🔍 Наведите на животное';
                this.statusEl.textContent = '🔍 Готов к новым фото';
            }, 5000);
            
        } catch (err) {
            this.statusEl.textContent = '❌ Ошибка мутации: ' + err.message;
            console.error(err);
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
new AnimalMutatorApp();
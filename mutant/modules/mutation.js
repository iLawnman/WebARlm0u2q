export class MutationEngine {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
    }
    
    async mutate(img1, img2) {
        // Загружаем изображения
        const image1 = await this.loadImage(img1);
        const image2 = await this.loadImage(img2);
        
        // Размер результата
        const size = 256;
        this.canvas.width = size;
        this.canvas.height = size;
        
        // Создаем мутацию через смешивание с применением эффектов
        this.ctx.clearRect(0, 0, size, size);
        
        // 1. Рисуем первое изображение
        this.ctx.drawImage(image1, 0, 0, size, size);
        
        // 2. Смешиваем второе с различными эффектами
        this.ctx.globalCompositeOperation = 'overlay';
        this.ctx.globalAlpha = 0.6;
        this.ctx.drawImage(image2, 0, 0, size, size);
        
        // 3. Добавляем искажения (волны)
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.globalAlpha = 1;
        
        const imageData = this.ctx.getImageData(0, 0, size, size);
        const data = imageData.data;
        
        // Применяем эффект "мутации" - смещение пикселей
        const mutated = new Uint8ClampedArray(data);
        const distortion = 4;
        
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const idx = (y * size + x) * 4;
                
                // Создаем волновое искажение
                const dx = Math.sin(y * 0.05 + performance.now() * 0.001) * distortion;
                const dy = Math.cos(x * 0.05 + performance.now() * 0.001) * distortion;
                
                const srcX = Math.min(Math.max(Math.floor(x + dx), 0), size - 1);
                const srcY = Math.min(Math.max(Math.floor(y + dy), 0), size - 1);
                const srcIdx = (srcY * size + srcX) * 4;
                
                mutated[idx] = data[srcIdx];
                mutated[idx + 1] = data[srcIdx + 1];
                mutated[idx + 2] = data[srcIdx + 2];
                mutated[idx + 3] = 255;
            }
        }
        
        this.ctx.putImageData(new ImageData(mutated, size, size), 0, 0);
        
        // 4. Добавляем цветокоррекцию для эффекта мутации
        this.ctx.globalCompositeOperation = 'color';
        this.ctx.globalAlpha = 0.15;
        const grad = this.ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size);
        grad.addColorStop(0, '#ff00ff');
        grad.addColorStop(0.5, '#00ffff');
        grad.addColorStop(1, '#ff6600');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, size, size);
        
        // 5. Добавляем пикселизацию для стиля
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.globalAlpha = 1;
        
        // Уменьшаем для пикселизации
        const smallSize = 32;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = smallSize;
        tempCanvas.height = smallSize;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(this.canvas, 0, 0, smallSize, smallSize);
        
        // Возвращаем к размеру с пиксельным эффектом
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.drawImage(tempCanvas, 0, 0, size, size);
        
        // 6. Добавляем рамку и эффекты
        this.ctx.strokeStyle = '#fbbf24';
        this.ctx.lineWidth = 4;
        this.ctx.shadowColor = '#fbbf24';
        this.ctx.shadowBlur = 30;
        this.ctx.strokeRect(2, 2, size-4, size-4);
        
        return this.canvas.toDataURL('image/png');
    }
    
    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }
}
export class SlotsManager {
    constructor(logger) {
        this.logger = logger;
        this.slots = [
            { id: 'slot-left', img: 'img-left', data: null },
            { id: 'slot-right', img: 'img-right', data: null }
        ];
        this.logger.debug('📁 Менеджер слотов создан');
    }
    
    addPhoto(dataUrl) {
        const emptySlot = this.slots.find(s => s.data === null);
        if (!emptySlot) {
            this.logger.warn('⚠️ Нет свободных слотов');
            return null;
        }
        
        emptySlot.data = dataUrl;
        
        const imgEl = document.getElementById(emptySlot.img);
        imgEl.src = dataUrl;
        imgEl.style.display = 'block';
        
        const slotEl = document.getElementById(emptySlot.id);
        slotEl.classList.add('filled');
        
        const index = this.slots.indexOf(emptySlot);
        this.logger.debug(`📷 Слот ${index + 1} заполнен`);
        return index;
    }
    
    getImages() {
        const images = this.slots.map(s => s.data).filter(d => d !== null);
        this.logger.debug(`📸 Получено ${images.length} изображений из слотов`);
        return images;
    }
    
    getCount() {
        return this.slots.filter(s => s.data !== null).length;
    }
    
    isFull() {
        const full = this.slots.every(s => s.data !== null);
        if (full) this.logger.debug('✅ Все слоты заполнены');
        return full;
    }
    
    clear() {
        this.logger.info('🗑️ Очистка слотов');
        this.slots.forEach(slot => {
            slot.data = null;
            const imgEl = document.getElementById(slot.img);
            imgEl.style.display = 'none';
            imgEl.src = '';
            const slotEl = document.getElementById(slot.id);
            slotEl.classList.remove('filled');
        });
        this.logger.debug('✅ Слоты очищены');
    }
}
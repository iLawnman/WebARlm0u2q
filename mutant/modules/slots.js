export class SlotsManager {
    constructor() {
        this.slots = [
            { id: 'slot-left', img: 'img-left', data: null },
            { id: 'slot-right', img: 'img-right', data: null }
        ];
    }
    
    addPhoto(dataUrl) {
        const emptySlot = this.slots.find(s => s.data === null);
        if (!emptySlot) return null;
        
        emptySlot.data = dataUrl;
        
        const imgEl = document.getElementById(emptySlot.img);
        imgEl.src = dataUrl;
        imgEl.style.display = 'block';
        
        const slotEl = document.getElementById(emptySlot.id);
        slotEl.classList.add('filled');
        
        return this.slots.indexOf(emptySlot);
    }
    
    getImages() {
        return this.slots.map(s => s.data).filter(d => d !== null);
    }
    
    isFull() {
        return this.slots.every(s => s.data !== null);
    }
    
    clear() {
        this.slots.forEach(slot => {
            slot.data = null;
            const imgEl = document.getElementById(slot.img);
            imgEl.style.display = 'none';
            imgEl.src = '';
            const slotEl = document.getElementById(slot.id);
            slotEl.classList.remove('filled');
        });
    }
}
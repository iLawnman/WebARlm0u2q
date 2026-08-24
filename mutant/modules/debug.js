export class DebugLogger {
    constructor() {
        this.logs = [];
        this.maxLogs = 500;
        this.autoScroll = true;
        this.panel = document.getElementById('debug-panel');
        this.logsContainer = document.getElementById('debug-logs');
        this.toggleBtn = document.getElementById('debug-toggle');
        this.closeBtn = document.getElementById('debug-close');
        this.clearBtn = document.getElementById('debug-clear');
        this.scrollBtn = document.getElementById('debug-scroll');
        this.testBtn = document.getElementById('debug-test');
        this.isOpen = false;
        
        this.initUI();
    }
    
    initUI() {
        // Toggle panel
        this.toggleBtn.addEventListener('click', () => {
            this.isOpen = !this.isOpen;
            this.panel.classList.toggle('open');
            this.toggleBtn.textContent = this.isOpen ? '🔍 DEBUG' : '🐞 DEBUG';
            if (this.isOpen) this.scrollToBottom();
        });
        
        // Close
        this.closeBtn.addEventListener('click', () => {
            this.isOpen = false;
            this.panel.classList.remove('open');
            this.toggleBtn.textContent = '🐞 DEBUG';
        });
        
        // Clear
        this.clearBtn.addEventListener('click', () => {
            this.clear();
        });
        
        // Auto-scroll toggle
        this.scrollBtn.addEventListener('click', () => {
            this.autoScroll = !this.autoScroll;
            this.scrollBtn.style.opacity = this.autoScroll ? 1 : 0.5;
            if (this.autoScroll) this.scrollToBottom();
        });
        this.scrollBtn.style.opacity = 1;
        
        // Test button
        this.testBtn.addEventListener('click', () => {
            this.info('🧪 Тестовое сообщение');
            this.success('✅ Тестовый успех');
            this.warn('⚠️ Тестовое предупреждение');
            this.error('❌ Тестовая ошибка');
            this.debug('🔍 Тестовый дебаг');
        });
        
        // Initial log
        this.info('🐞 Панель дебага загружена');
    }
    
    log(level, ...args) {
        const timestamp = new Date().toLocaleTimeString('ru-RU', { hour12: false });
        const message = args.map(arg => {
            if (typeof arg === 'object') {
                try { return JSON.stringify(arg, null, 2); } 
                catch { return String(arg); }
            }
            return String(arg);
        }).join(' ');
        
        const entry = {
            timestamp,
            level,
            message,
            id: Date.now() + Math.random()
        };
        
        this.logs.push(entry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        
        this.renderEntry(entry);
        if (this.autoScroll) this.scrollToBottom();
        
        // Также выводим в консоль
        const consoleMethod = level === 'error' ? 'error' : 
                             level === 'warn' ? 'warn' : 
                             level === 'success' ? 'log' : 
                             level === 'debug' ? 'debug' : 'log';
        console[consoleMethod](`[${timestamp}] [${level.toUpperCase()}]`, ...args);
    }
    
    renderEntry(entry) {
        const div = document.createElement('div');
        div.className = `log-entry ${entry.level === 'success' ? 'highlight' : ''}`;
        div.dataset.id = entry.id;
        
        const timeSpan = document.createElement('span');
        timeSpan.className = 'log-time';
        timeSpan.textContent = entry.timestamp;
        
        const levelSpan = document.createElement('span');
        levelSpan.className = `log-level ${entry.level}`;
        levelSpan.textContent = entry.level.toUpperCase();
        
        const msgSpan = document.createElement('span');
        msgSpan.className = 'log-message';
        msgSpan.textContent = entry.message;
        
        div.appendChild(timeSpan);
        div.appendChild(levelSpan);
        div.appendChild(msgSpan);
        
        this.logsContainer.appendChild(div);
    }
    
    scrollToBottom() {
        setTimeout(() => {
            this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
        }, 10);
    }
    
    clear() {
        this.logs = [];
        this.logsContainer.innerHTML = '';
        this.info('🗑️ Логи очищены');
    }
    
    info(...args) { this.log('info', ...args); }
    success(...args) { this.log('success', ...args); }
    warn(...args) { this.log('warn', ...args); }
    error(...args) { this.log('error', ...args); }
    debug(...args) { this.log('debug', ...args); }
}
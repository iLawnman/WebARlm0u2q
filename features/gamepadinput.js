/**
 * Gamepad.js - Модуль для управления геймпадами и джойстиками.
 * Поддерживает стандартные геймпады и старые USB-устройства (DirectInput).
 */
export class GamepadManager {
    constructor(options = {}) {
        this.deadzone = options.deadzone ?? 0.15; // Зона мертвого хода для старых стиков
        this.pollingInterval = options.pollingInterval ?? 16; // ~60 FPS
        
        this.gamepads = new Map();
        this.previousStates = new Map();
        this.listeners = {
            connect: [],
            disconnect: [],
            buttondown: [],
            buttonup: [],
            axis: [],
            rawupdate: []
        };

        this._isPolling = false;
        this._rafId = null;

        this._bindEvents();
        this._checkInitialConnections();
    }

    // --- Публичные методы для подписки ---
    on(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
        return this;
    }

    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
        return this;
    }

    // Получение "сырого" состояния (полезно для старых USB-геймпадов с кривой раскладкой)
    getRawState(index) {
        const gp = navigator.getGamepads()[index];
        return gp ? {
            id: gp.id,
            index: gp.index,
            mapping: gp.mapping, // "standard" или "" (для старых)
            buttons: gp.buttons.map(b => ({ pressed: b.pressed, value: b.value })),
            axes: [...gp.axes]
        } : null;
    }

    start() {
        if (this._isPolling) return;
        this._isPolling = true;
        this._loop();
    }

    stop() {
        this._isPolling = false;
        if (this._rafId) cancelAnimationFrame(this._rafId);
    }

    destroy() {
        this.stop();
        window.removeEventListener("gamepadconnected", this._onConnect);
        window.removeEventListener("gamepaddisconnected", this._onDisconnect);
        this.gamepads.clear();
        this.previousStates.clear();
    }

    // --- Внутренняя логика ---
    _bindEvents() {
        this._onConnect = (e) => this._handleConnect(e.gamepad);
        this._onDisconnect = (e) => this._handleDisconnect(e.gamepad);

        window.addEventListener("gamepadconnected", this._onConnect);
        window.addEventListener("gamepaddisconnected", this._onDisconnect);
    }

    _checkInitialConnections() {
        const gamepads = navigator.getGamepads();
        for (let gp of gamepads) {
            if (gp) this._handleConnect(gp);
        }
    }

    _handleConnect(gp) {
        this.gamepads.set(gp.index, gp);
        this.previousStates.set(gp.index, this._getBlankState(gp));
        this._emit('connect', { index: gp.index, id: gp.id, mapping: gp.mapping });
        
        if (!this._isPolling) this.start();
        console.log(`[Gamepad] Подключен: ${gp.id} (Mapping: ${gp.mapping || 'custom/old'})`);
    }

    _handleDisconnect(gp) {
        this.gamepads.delete(gp.index);
        this.previousStates.delete(gp.index);
        this._emit('disconnect', { index: gp.index, id: gp.id });
        
        if (this.gamepads.size === 0) this.stop();
        console.log(`[Gamepad] Отключен: ${gp.id}`);
    }

    _loop() {
        if (!this._isPolling) return;
        
        const currentGamepads = navigator.getGamepads();
        
        for (let i = 0; i < currentGamepads.length; i++) {
            const gp = currentGamepads[i];
            if (!gp || !this.previousStates.has(i)) continue;

            const prevState = this.previousStates.get(i);
            
            // 1. Обработка кнопок (Edge Detection)
            for (let b = 0; b < gp.buttons.length; b++) {
                const currBtn = gp.buttons[b];
                const prevBtn = prevState.buttons[b];

                if (currBtn.pressed && !prevBtn.pressed) {
                    this._emit('buttondown', { index: i, button: b, value: currBtn.value });
                } else if (!currBtn.pressed && prevBtn.pressed) {
                    this._emit('buttonup', { index: i, button: b });
                }
            }

            // 2. Обработка осей (с учетом Deadzone для старых стиков)
            for (let a = 0; a < gp.axes.length; a++) {
                let rawValue = gp.axes[a];
                let value = Math.abs(rawValue) < this.deadzone ? 0 : rawValue;
                
                // Эмитим только если значение изменилось значительно
                if (Math.abs(value - prevState.axes[a]) > 0.01) {
                    this._emit('axis', { index: i, axis: a, value: value, raw: rawValue });
                }
            }

            // 3. Эмит сырого обновления (для специфичных старых USB-устройств)
            this._emit('rawupdate', { index: i, gamepad: gp });

            // Сохраняем текущее состояние как предыдущее для следующего кадра
            this.previousStates.set(i, {
                buttons: gp.buttons.map(b => ({ pressed: b.pressed, value: b.value })),
                axes: [...gp.axes]
            });
        }

        this._rafId = requestAnimationFrame(() => this._loop());
    }

    _getBlankState(gp) {
        return {
            buttons: gp.buttons.map(() => ({ pressed: false, value: 0 })),
            axes: gp.axes.map(() => 0)
        };
    }

    _emit(event, data) {
        this.listeners[event].forEach(cb => cb(data));
    }
}
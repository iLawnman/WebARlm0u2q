export class QuestSimulation {
  constructor(config = {}) {
    this.config = config;
    this.state = {
      isRunning: false,
      ticks: 0,
      entities: [],
      stats: {}
    };
    this.listeners = new Set();
  }

  /**
   * Инициализация симуляции начальным состоянием
   */
  init(initialData = {}) {
    this.state.ticks = 0;
    this.state.entities = initialData.entities || [];
    this.state.stats = initialData.stats || {};
    this.state.isRunning = false;
    this.notify();
  }

  /**
   * Запуск / Возобновление симуляции
   */
  start() {
    if (!this.state.isRunning) {
      this.state.isRunning = true;
      this.notify();
    }
  }

  /**
   * Пауза
   */
  pause() {
    if (this.state.isRunning) {
      this.state.isRunning = false;
      this.notify();
    }
  }

  /**
   * Один шаг симуляции (вызывается в цикле)
   * @param {number} deltaTime - Время между кадрами/итерациями
   */
  update(deltaTime) {
    if (!this.state.isRunning) return;

    this.state.ticks++;
    this.processEntities(deltaTime);
    this.updateStats();
    
    this.notify();
  }

  /**
   * Внутренняя логика обработки сущностей
   */
  processEntities(deltaTime) {
    for (let i = 0; i < this.state.entities.length; i++) {
      const entity = this.state.entities[i];
      if (typeof entity.update === 'function') {
        entity.update(deltaTime, this.state);
      }
    }
  }

  /**
   * Обновление метрик и статистики
   */
  updateStats() {
    this.state.stats.activeEntities = this.state.entities.filter(e => e.active).length;
  }

  /**
   * Подписка на изменения состояния
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Уведомление подписчиков
   */
  notify() {
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * Получение текущего сSnapshot состояния
   */
  getState() {
    return { ...this.state };
  }
}
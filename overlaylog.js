(function() {
  'use strict';

  function init() {
  const logContainer = document.createElement('div');
  logContainer.id = 'overlay-log-container';
  logContainer.innerHTML = `
    <div id="overlay-log-header">
      <span id="overlay-log-title">📋 Console Log</span>
      <div id="overlay-log-controls">
        <button id="overlay-log-clear" title="Очистить">🗑️</button>
        <button id="overlay-log-toggle" title="Свернуть/Развернуть">▼</button>
      </div>
    </div>
    <div id="overlay-log-content"></div>
  `;

  const styles = `
    <style>
      #overlay-log-container {
        position: fixed;
        left: 10px;
        top: 50%;
        transform: translateY(-50%);
        width: 320px;
        max-height: 70vh;
        background: rgba(15, 23, 42, 0.95);
        border: 1px solid rgba(148, 163, 184, 0.3);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        z-index: 10000;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 11px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        pointer-events: auto;
      }
      #overlay-log-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: rgba(30, 41, 59, 0.8);
        border-bottom: 1px solid rgba(148, 163, 184, 0.2);
        cursor: move;
        user-select: none;
      }
      #overlay-log-title { color: #e2e8f0; font-weight: 600; font-size: 12px; }
      #overlay-log-controls { display: flex; gap: 6px; }
      #overlay-log-controls button {
        background: rgba(99, 102, 241, 0.2);
        border: 1px solid rgba(129, 140, 248, 0.3);
        color: #e0e7ff;
        padding: 4px 8px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
      }
      #overlay-log-controls button:hover { background: rgba(99, 102, 241, 0.4); }
      #overlay-log-content {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
        max-height: calc(70vh - 40px);
        transition: max-height 0.3s ease;
      }
      #overlay-log-content.collapsed {
        max-height: 0;
        padding: 0 8px;
        overflow: hidden;
      }
      .log-entry {
        padding: 4px 6px;
        margin-bottom: 4px;
        border-radius: 4px;
        word-wrap: break-word;
        line-height: 1.4;
      }
      .log-entry.log { color: #e2e8f0; background: rgba(30, 41, 59, 0.5); }
      .log-entry.warn {
        color: #fbbf24;
        background: rgba(251, 191, 36, 0.1);
        border-left: 3px solid #fbbf24;
      }
      .log-entry.error {
        color: #f87171;
        background: rgba(248, 113, 113, 0.1);
        border-left: 3px solid #f87171;
      }
      .log-entry .timestamp {
        color: #64748b;
        font-size: 9px;
        margin-right: 6px;
      }
      #overlay-log-content::-webkit-scrollbar { width: 6px; }
      #overlay-log-content::-webkit-scrollbar-track { background: rgba(30, 41, 59, 0.3); }
      #overlay-log-content::-webkit-scrollbar-thumb {
        background: rgba(99, 102, 241, 0.5);
        border-radius: 3px;
      }
    </style>
  `;

  document.head.insertAdjacentHTML('beforeend', styles);

  // Во время immersive-ar сессии браузер отображает ТОЛЬКО элемент,
  // переданный как domOverlay.root (обычно #ar-overlay) — всё, что
  // висит просто на document.body, во время AR-сессии скрывается.
  // Поэтому монтируем лог внутрь #ar-overlay, если он есть на странице.
  const arOverlayRoot = document.getElementById('ar-overlay');
  const mountTarget = arOverlayRoot || document.body;
  mountTarget.appendChild(logContainer);

  const logContent = document.getElementById('overlay-log-content');
  const toggleBtn = document.getElementById('overlay-log-toggle');
  const clearBtn = document.getElementById('overlay-log-clear');
  const header = document.getElementById('overlay-log-header');

  let isCollapsed = false;
  const maxEntries = 100;

  function addLogEntry(type, args) {
    const timestamp = new Date().toLocaleTimeString('ru-RU', { hour12: false });
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;

    const message = args.map(arg => {
      if (typeof arg === 'object') {
        try { return JSON.stringify(arg, null, 2); }
        catch (e) { return String(arg); }
      }
      return String(arg);
    }).join(' ');

    const div = document.createElement('div');
    div.textContent = message;
    entry.innerHTML = `<span class="timestamp">[${timestamp}]</span>${div.innerHTML}`;

    logContent.appendChild(entry);

    while (logContent.children.length > maxEntries) {
      logContent.removeChild(logContent.firstChild);
    }
    logContent.scrollTop = logContent.scrollHeight;
  }

  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  console.log = function(...args) {
    originalLog.apply(console, args);
    addLogEntry('log', args);
  };
  console.warn = function(...args) {
    originalWarn.apply(console, args);
    addLogEntry('warn', args);
  };
  console.error = function(...args) {
    originalError.apply(console, args);
    addLogEntry('error', args);
  };

  window.addEventListener('error', (event) => {
    addLogEntry('error', [`Uncaught: ${event.message} at ${event.filename}:${event.lineno}`]);
  });
  window.addEventListener('unhandledrejection', (event) => {
    addLogEntry('error', [`Unhandled Promise: ${event.reason}`]);
  });

  toggleBtn.addEventListener('click', () => {
    isCollapsed = !isCollapsed;
    logContent.classList.toggle('collapsed', isCollapsed);
    toggleBtn.textContent = isCollapsed ? '▶' : '▼';
  });

  clearBtn.addEventListener('click', () => {
    logContent.innerHTML = '';
  });

  // Перетаскивание
  let isDragging = false;
  let offsetX = 0, offsetY = 0;

  header.addEventListener('mousedown', dragStart);
  header.addEventListener('touchstart', dragStart, { passive: false });
  document.addEventListener('mousemove', drag);
  document.addEventListener('touchmove', drag, { passive: false });
  document.addEventListener('mouseup', dragEnd);
  document.addEventListener('touchend', dragEnd);

  function dragStart(e) {
    if (e.target.tagName === 'BUTTON') return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rect = logContainer.getBoundingClientRect();
    offsetX = clientX - rect.left;
    offsetY = clientY - rect.top;
    isDragging = true;
    logContainer.style.transform = 'none';
    logContainer.style.left = rect.left + 'px';
    logContainer.style.top = rect.top + 'px';
  }

  function drag(e) {
    if (!isDragging) return;
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    logContainer.style.left = (clientX - offsetX) + 'px';
    logContainer.style.top = (clientY - offsetY) + 'px';
  }

  function dragEnd() {
    isDragging = false;
  }

  console.log('✅ Overlay Log инициализирован' + (arOverlayRoot ? ' (внутри #ar-overlay)' : ' (в document.body — #ar-overlay не найден)'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

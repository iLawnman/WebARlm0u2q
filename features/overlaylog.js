(function() {
  'use strict';

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
  document.body.appendChild(logContainer);

  const logContent = document.getElementById('overlay-log-content');
  const toggleBtn  = document.getElementById('overlay-log-toggle');
  const clearBtn   = document.getElementById('overlay-log-clear');
  const header     = document.getElementById('overlay-log-header');

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

  const originalLog   = console.log;
  const originalWarn  = console.warn;
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
    logContainer.style.top  = rect.top  + 'px';
  }

  function drag(e) {
    if (!isDragging) return;
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    logContainer.style.left = (clientX - offsetX) + 'px';
    logContainer.style.top  = (clientY - offsetY) + 'px';
  }

  function dragEnd() {
    isDragging = false;
  }

  console.log('✅ Overlay Log инициализирован');
})();
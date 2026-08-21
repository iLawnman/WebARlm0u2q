/* ========== Debug & Utility Helper ========== */

export const DEBUG_MODE = true; // Установите false для отключения подсветки в продакшене

/**
 * Обертка для дебаг-разметки блоков
 */
export function wrapDebugBlock(label, value, contentHtml) {
    if (!DEBUG_MODE) return contentHtml;
    
    const safeValue = (value === undefined || value === null) ? 'null/undefined' : String(value);
    const preview = safeValue.replace(/"/g, '&quot;').slice(0, 100);

    return `
        <div style="border:2px dashed #ff0055; position:relative; padding:4px; margin:2px; border-radius:4px; background:rgba(255,0,85,0.05);" title="${preview}">
            <div style="position:absolute; top:-10px; left:8px; background:#ff0055; color:#fff; font-size:10px; font-family:monospace; padding:1px 6px; border-radius:3px; z-index:10; white-space:nowrap; pointer-events:none;">
                [${label}] val: "${preview}"
            </div>
            ${contentHtml}
        </div>
    `;
}

/**
 * Корректная конвертация RichText Unity в HTML (исправлен баг с em/i)
 */
export function parseUnityRichText(str) {
    if (!str) return '';
    return String(str)
        .replace(/<size=[^>]+>/gi, '')
        .replace(/<\/size>/gi, '')
        .replace(/<b>/gi, '<strong>')
        .replace(/<\/b>/gi, '</strong>')
        .replace(/<i>/gi, '<em>')
        .replace(/<\/i>/gi, '</em>')
        .replace(/<color=([^>]+)>/gi, '<span style="color:$1;">')
        .replace(/<\/color>/gi, '</span>')
        .replace(/<align="?left"?>/gi, '<div style="text-align:left;">')
        .replace(/<align="?center"?>/gi, '<div style="text-align:center;">')
        .replace(/<align="?right"?>/gi, '<div style="text-align:right;">')
        .replace(/<\/align>/gi, '</div>');
}
export function fmt(value, digits = 3) {
  if (!Number.isFinite(value)) return "n/a";
  return Number(value).toFixed(digits);
}

export function vectorText(v) {
  return "(" + fmt(v.x) + ", " + fmt(v.y) + ", " + fmt(v.z) + ")";
}

export function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function polygonArea(points) {
  if (!points || points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area) * 0.5;
}

export function polygonBounds(points) {
  if (!points || points.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
}

export function disposeObject(object) {
  if (!object) return;
  if (object.parent) object.parent.remove(object);
  if (object.geometry) object.geometry.dispose();
  if (object.material) {
    if (Array.isArray(object.material)) {
      for (const material of object.material) material.dispose();
    } else {
      object.material.dispose();
    }
  }
}

export function getInputSourceInfo(session) {
  if (!session) return [];
  const result = [];
  for (const source of session.inputSources) {
    result.push({
      handedness: source.handedness || null,
      targetRayMode: source.targetRayMode || null,
      profiles: source.profiles || []
    });
  }
  return result;
}
import type { Shape } from '../../engine/types';

const imageCache = new Map<string, HTMLImageElement>();
const THEME_ADAPTIVE_LINE_STROKES = new Set(['#000', '#000000', '#111827', '#1f2937', '#0f172a']);

const normalizeHex = (color: string): string => color.trim().toLowerCase();

const getLineStrokeColor = (stroke: string, theme: 'dark' | 'light') => {
  const normalized = normalizeHex(stroke);
  if (THEME_ADAPTIVE_LINE_STROKES.has(normalized)) {
    return theme === 'dark' ? '#e5e7eb' : '#0f172a';
  }
  return stroke;
};

const getCachedImage = (src: string): HTMLImageElement => {
  const existing = imageCache.get(src);
  if (existing) {
    return existing;
  }

  const img = new Image();
  img.onload = () => {
    window.dispatchEvent(new Event('shapeo:image-loaded'));
  };
  img.onerror = () => {
    window.dispatchEvent(new Event('shapeo:image-loaded'));
  };
  img.src = src;
  imageCache.set(src, img);
  return img;
};

export const drawShape = ( ctx: CanvasRenderingContext2D, shape: Shape, theme: 'dark' | 'light' = 'dark' ) => {
  ctx.beginPath();

  if (shape.type === 'line') {
    const strokeColor = getLineStrokeColor(shape.stroke, theme);
    ctx.moveTo(shape.x, shape.y);
    ctx.lineTo(shape.x2, shape.y2);
    if (shape.lineCap) ctx.lineCap = shape.lineCap;

    if (shape.strokeWidth > 0) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = shape.strokeWidth;
      ctx.stroke();
    }
    return;
  }

  if (shape.type === 'circle' || shape.type === 'ellipse') {
    const centerX = shape.x + shape.width / 2;
    const centerY = shape.y + shape.height / 2;
    const rx = Math.abs(shape.width / 2);
    const ry = Math.abs(shape.height / 2);

    ctx.ellipse(centerX, centerY, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = shape.fill;
    ctx.fill();

    if (shape.strokeWidth > 0) {
      ctx.strokeStyle = shape.stroke;
      ctx.lineWidth = shape.strokeWidth;
      ctx.stroke();
    }
    return;
  }

  const radius = shape.cornerRadius ?? 0;
  if (radius > 0) ctx.roundRect(shape.x, shape.y, shape.width, shape.height, radius);
  else ctx.rect(shape.x, shape.y, shape.width, shape.height);

  if (shape.type === 'image') {
    const imgElement =
      shape.imageElement instanceof HTMLImageElement
        ? shape.imageElement
        : shape.src
          ? getCachedImage(shape.src)
          : null;

    if (
      imgElement instanceof HTMLImageElement &&
      imgElement.complete &&
      imgElement.naturalWidth > 0 &&
      imgElement.naturalHeight > 0
    ) {
      ctx.save();
      ctx.clip();
      ctx.drawImage(imgElement, shape.x, shape.y, shape.width, shape.height);
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fill();
    }
  } else {
    ctx.fillStyle = shape.fill;
    ctx.fill();
  }

  if (shape.strokeWidth > 0) {
    ctx.strokeStyle = shape.stroke;
    ctx.lineWidth = shape.strokeWidth;
    ctx.stroke();
  }
};

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

const drawArrowHead = (
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  strokeColor: string,
  strokeWidth: number,
  style: 'open' | 'filled' | 'double'
) => {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLength = Math.max(10, strokeWidth * 4);
  const spread = Math.PI / 7;
  const leftX = x2 - headLength * Math.cos(angle - spread);
  const leftY = y2 - headLength * Math.sin(angle - spread);
  const rightX = x2 - headLength * Math.cos(angle + spread);
  const rightY = y2 - headLength * Math.sin(angle + spread);

  if (style === 'filled') {
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(leftX, leftY);
    ctx.lineTo(rightX, rightY);
    ctx.closePath();
    ctx.fillStyle = strokeColor;
    ctx.fill();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(leftX, leftY);
  ctx.moveTo(x2, y2);
  ctx.lineTo(rightX, rightY);
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = strokeWidth;
  ctx.stroke();

  if (style === 'double') {
    const tailAngle = Math.atan2(y1 - y2, x1 - x2);
    const tailLeftX = x1 - headLength * Math.cos(tailAngle - spread);
    const tailLeftY = y1 - headLength * Math.sin(tailAngle - spread);
    const tailRightX = x1 - headLength * Math.cos(tailAngle + spread);
    const tailRightY = y1 - headLength * Math.sin(tailAngle + spread);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(tailLeftX, tailLeftY);
    ctx.moveTo(x1, y1);
    ctx.lineTo(tailRightX, tailRightY);
    ctx.stroke();
  }
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

  if (shape.type === 'line' || shape.type === 'arrow') {
    const strokeColor = getLineStrokeColor(shape.stroke, theme);
    if (typeof ctx.setLineDash === 'function') {
      ctx.setLineDash(shape.type === 'arrow' && shape.dashed ? [10, 7] : []);
    }
    ctx.moveTo(shape.x, shape.y);
    ctx.lineTo(shape.x2, shape.y2);
    if (shape.lineCap) ctx.lineCap = shape.lineCap;

    if (shape.strokeWidth > 0) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = shape.strokeWidth;
      ctx.stroke();
    }

    if (shape.type === 'arrow' && shape.strokeWidth > 0) {
      drawArrowHead(
        ctx,
        shape.x,
        shape.y,
        shape.x2,
        shape.y2,
        strokeColor,
        shape.strokeWidth,
        shape.headStyle ?? 'open'
      );
    }
    if (typeof ctx.setLineDash === 'function') {
      ctx.setLineDash([]);
    }
    return;
  }

  if (shape.type === 'path') {
    if (shape.points.length === 0) {
      return;
    }

    const absolutePoints = shape.points.map((point) => ({
      x: shape.x + point.x,
      y: shape.y + point.y,
    }));

    ctx.lineCap = shape.lineCap ?? 'round';
    ctx.lineJoin = shape.lineJoin ?? 'round';
    ctx.moveTo(absolutePoints[0].x, absolutePoints[0].y);

    if (absolutePoints.length === 1) {
      const point = absolutePoints[0];
      const radius = Math.max(1, (shape.strokeWidth || 1) / 2);
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    } else {
      const smoothing = shape.smoothing ?? 0.65;
      if (smoothing <= 0.05) {
        for (let i = 1; i < absolutePoints.length; i += 1) {
          ctx.lineTo(absolutePoints[i].x, absolutePoints[i].y);
        }
      } else {
        for (let i = 1; i < absolutePoints.length - 1; i += 1) {
          const current = absolutePoints[i];
          const next = absolutePoints[i + 1];
          const midX = current.x + (next.x - current.x) * smoothing;
          const midY = current.y + (next.y - current.y) * smoothing;
          ctx.quadraticCurveTo(current.x, current.y, midX, midY);
        }
        const lastPoint = absolutePoints[absolutePoints.length - 1];
        ctx.lineTo(lastPoint.x, lastPoint.y);
      }
    }

    if (shape.strokeWidth > 0) {
      ctx.strokeStyle = shape.stroke;
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

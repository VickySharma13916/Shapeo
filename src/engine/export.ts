import type { Shape } from './types';

const loadImage = (shape: Extract<Shape, { type: 'image' }>): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    if (shape.imageElement instanceof HTMLImageElement) {
      if (shape.imageElement.complete && shape.imageElement.naturalWidth > 0) {
        resolve(shape.imageElement);
        return;
      }

      shape.imageElement.onload = () => resolve(shape.imageElement as HTMLImageElement);
      shape.imageElement.onerror = () => resolve(null);
      return;
    }

    if (!shape.src) {
      resolve(null);
      return;
    }

    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = shape.src;
  });

const getBounds = (shape: Shape) => {
  if (shape.type === 'line') {
    return {
      minX: Math.min(shape.x, shape.x2),
      minY: Math.min(shape.y, shape.y2),
      maxX: Math.max(shape.x, shape.x2),
      maxY: Math.max(shape.y, shape.y2),
    };
  }

  return {
    minX: Math.min(shape.x, shape.x + shape.width),
    minY: Math.min(shape.y, shape.y + shape.height),
    maxX: Math.max(shape.x, shape.x + shape.width),
    maxY: Math.max(shape.y, shape.y + shape.height),
  };
};

const triggerDownload = (canvas: HTMLCanvasElement, filename: string) => {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
};

const drawShapeAt = async (
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  offsetX: number,
  offsetY: number
) => {
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.globalAlpha = shape.opacity ?? 1;

  if (shape.rotation) {
    ctx.translate(shape.width / 2, shape.height / 2);
    ctx.rotate((shape.rotation * Math.PI) / 180);
    ctx.translate(-shape.width / 2, -shape.height / 2);
  }

  if (shape.type === 'line') {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(shape.x2 - shape.x, shape.y2 - shape.y);
    ctx.strokeStyle = shape.stroke;
    ctx.lineWidth = shape.strokeWidth || 1;
    if (shape.lineCap) ctx.lineCap = shape.lineCap;
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (shape.type === 'ellipse' || shape.type === 'circle') {
    const centerX = shape.width / 2;
    const centerY = shape.height / 2;
    const rx = Math.abs(shape.width / 2);
    const ry = Math.abs(shape.height / 2);
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = shape.fill;
    ctx.fill();
    if (shape.strokeWidth > 0) {
      ctx.strokeStyle = shape.stroke;
      ctx.lineWidth = shape.strokeWidth;
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  const radius = shape.cornerRadius ?? 0;
  ctx.beginPath();
  if (radius > 0) {
    ctx.roundRect(0, 0, shape.width, shape.height, radius);
  } else {
    ctx.rect(0, 0, shape.width, shape.height);
  }

  if (shape.type === 'image') {
    const image = await loadImage(shape);
    if (image) {
      ctx.save();
      ctx.clip();
      ctx.drawImage(image, 0, 0, shape.width, shape.height);
      ctx.restore();
    } else {
      ctx.fillStyle = '#cbd5e1';
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

  ctx.restore();
};

export const exportToPNG = async (shape: Shape) => {
  const bounds = getBounds(shape);
  const width = Math.max(1, Math.ceil(bounds.maxX - bounds.minX));
  const height = Math.max(1, Math.ceil(bounds.maxY - bounds.minY));

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = width;
  canvas.height = height;

  await drawShapeAt(ctx, shape, shape.x - bounds.minX, shape.y - bounds.minY);
  triggerDownload(canvas, `${shape.type}-${shape.id.substring(0, 5)}.png`);
};

export const exportSelectionToPNG = async (shapes: Shape[]) => {
  if (shapes.length === 0) return;
  if (shapes.length === 1) {
    await exportToPNG(shapes[0]);
    return;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  shapes.forEach((shape) => {
    const bounds = getBounds(shape);
    minX = Math.min(minX, bounds.minX);
    minY = Math.min(minY, bounds.minY);
    maxX = Math.max(maxX, bounds.maxX);
    maxY = Math.max(maxY, bounds.maxY);
  });

  const width = Math.max(1, Math.ceil(maxX - minX));
  const height = Math.max(1, Math.ceil(maxY - minY));
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.width = width;
  canvas.height = height;

  for (const shape of shapes) {
    await drawShapeAt(ctx, shape, shape.x - minX, shape.y - minY);
  }

  triggerDownload(canvas, `selection-${shapes.length}-objects.png`);
};

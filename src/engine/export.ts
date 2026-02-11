import type { Shape } from './types';

export const exportToPNG = (shape: Shape) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Set canvas size to shape size
  canvas.width = shape.width;
  canvas.height = shape.height;

  if (shape.type === 'image' && shape.imageElement) {
    // Apply rounded corners if necessary
    if (shape.cornerRadius && shape.cornerRadius > 0) {
      ctx.beginPath();
      ctx.roundRect(0, 0, shape.width, shape.height, shape.cornerRadius);
      ctx.clip();
    }
    
    // Draw the image element at full resolution
    ctx.globalAlpha = shape.opacity ?? 1;
    ctx.drawImage(shape.imageElement, 0, 0, shape.width, shape.height);
  } else {
    // Logic for regular shapes (rectangles)
    ctx.fillStyle = shape.fill;
    
    // Apply rounded corners for rectangles
    if (shape.cornerRadius && shape.cornerRadius > 0) {
      ctx.beginPath();
      ctx.roundRect(0, 0, shape.width, shape.height, shape.cornerRadius);
      ctx.fill();
    } else {
      ctx.fillRect(0, 0, shape.width, shape.height);
    }
  }

  // Trigger download
  const link = document.createElement('a');
  link.download = `${shape.type}-${shape.id.substring(0, 5)}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
};

export const exportSelectionToPNG = (shapes: Shape[]) => {
  if (shapes.length === 0) return;

  // If only one shape, use the simple export
  if (shapes.length === 1) {
    exportToPNG(shapes[0]);
    return;
  }

  // Calculate bounding box for all selected shapes
  const minX = Math.min(...shapes.map(s => s.x));
  const minY = Math.min(...shapes.map(s => s.y));
  const maxX = Math.max(...shapes.map(s => s.x + s.width));
  const maxY = Math.max(...shapes.map(s => s.y + s.height));

  const width = maxX - minX;
  const height = maxY - minY;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = width;
  canvas.height = height;

  // Draw each shape relative to the bounding box
  shapes.forEach(shape => {
    const relX = shape.x - minX;
    const relY = shape.y - minY;

    ctx.save();
    ctx.translate(relX, relY);

    // Apply rotation if present
    if (shape.rotation) {
      ctx.translate(shape.width / 2, shape.height / 2);
      ctx.rotate((shape.rotation * Math.PI) / 180);
      ctx.translate(-shape.width / 2, -shape.height / 2);
    }

    ctx.globalAlpha = shape.opacity ?? 1;

    if (shape.type === 'image' && shape.imageElement) {
      // Apply rounded corners if necessary
      if (shape.cornerRadius && shape.cornerRadius > 0) {
        ctx.beginPath();
        ctx.roundRect(0, 0, shape.width, shape.height, shape.cornerRadius);
        ctx.clip();
      }
      ctx.drawImage(shape.imageElement, 0, 0, shape.width, shape.height);
    } else {
      // Rectangle
      ctx.fillStyle = shape.fill;
      
      if (shape.cornerRadius && shape.cornerRadius > 0) {
        ctx.beginPath();
        ctx.roundRect(0, 0, shape.width, shape.height, shape.cornerRadius);
        ctx.fill();
      } else {
        ctx.fillRect(0, 0, shape.width, shape.height);
      }
    }

    ctx.restore();
  });

  // Trigger download
  const link = document.createElement('a');
  link.download = `selection-${shapes.length}-objects.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
};
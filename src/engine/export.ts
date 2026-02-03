export const exportToPNG = (shape: any) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Set canvas size to shape size
  canvas.width = shape.width;
  canvas.height = shape.height;

  if (shape.type === 'image' && shape.imageElement) {
    // Apply rounded corners if necessary
    if (shape.cornerRadius > 0) {
      ctx.beginPath();
      ctx.roundRect(0, 0, shape.width, shape.height, shape.cornerRadius);
      ctx.clip();
    }
    
    // Draw the image element at full resolution
    ctx.globalAlpha = shape.opacity ?? 1;
    ctx.drawImage(shape.imageElement, 0, 0, shape.width, shape.height);
  } else {
    // Logic for regular shapes
    ctx.fillStyle = shape.fill;
    ctx.fillRect(0, 0, shape.width, shape.height);
  }

  // Trigger download
  const link = document.createElement('a');
  link.download = `${shape.type}-${shape.id.substring(0, 5)}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
};
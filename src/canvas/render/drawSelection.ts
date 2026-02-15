import type { Shape } from '../../engine/types';

type DrawSelectionInput = {
  ctx: CanvasRenderingContext2D;
  shape: Shape;
  selectedIds: string[];
  zoom: number;
};

export const drawSelection = ({ ctx, shape, selectedIds, zoom }: DrawSelectionInput) => {
  if (!selectedIds.includes(shape.id)) {
    return;
  }

  if (selectedIds.length !== 1) {
    return;
  }

  const drawBadge = (label: string, centerX: number, baselineY: number) => {
    const fontSize = 11 / zoom;
    ctx.font = `600 ${fontSize}px Inter, sans-serif`;
    const textWidth = ctx.measureText(label).width;
    const labelX = centerX - textWidth / 2;
    const paddingH = 6 / zoom;
    const paddingV = 3 / zoom;

    ctx.beginPath();
    ctx.roundRect(
      labelX - paddingH,
      baselineY - fontSize,
      textWidth + paddingH * 2,
      fontSize + paddingV * 2,
      4 / zoom
    );
    ctx.fillStyle = '#3b82f6';
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, labelX, baselineY - fontSize / 2 + paddingV);
  };

  if (shape.locked) {
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1 / zoom;
    ctx.setLineDash([4 / zoom, 3 / zoom]);

    if (shape.type === 'line') {
      ctx.beginPath();
      ctx.moveTo(shape.x, shape.y);
      ctx.lineTo(shape.x2, shape.y2);
      ctx.stroke();
      drawBadge(
        'LOCKED',
        (shape.x + shape.x2) / 2,
        (shape.y + shape.y2) / 2 + 12 / zoom
      );
    } else {
      ctx.beginPath();
      ctx.rect(shape.x, shape.y, shape.width, shape.height);
      ctx.stroke();
      drawBadge('LOCKED', shape.x + shape.width / 2, shape.y - 8 / zoom);
    }

    ctx.setLineDash([]);
    return;
  }

  const handleSize = 8 / zoom;
  const rotationHandleDistance = 30 / zoom;
  const rotationHandleSize = 5 / zoom;

  if (shape.type === 'line') {
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5 / zoom;

    ctx.beginPath();
    ctx.moveTo(shape.x, shape.y);
    ctx.lineTo(shape.x2, shape.y2);
    ctx.stroke();

    const endpoints = [
      { x: shape.x, y: shape.y },
      { x: shape.x2, y: shape.y2 },
    ];

    ctx.fillStyle = 'white';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1 / zoom;

    endpoints.forEach((point) => {
      ctx.beginPath();
      ctx.rect(point.x - handleSize / 2, point.y - handleSize / 2, handleSize, handleSize);
      ctx.fill();
      ctx.stroke();
    });
  } else if (shape.type === 'ellipse') {
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1 / zoom;

    const centerX = shape.x + shape.width / 2;
    const centerY = shape.y + shape.height / 2;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, shape.rx, shape.ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    const edgePoints = [
      { x: centerX, y: centerY - shape.ry },
      { x: centerX, y: centerY + shape.ry },
      { x: centerX - shape.rx, y: centerY },
      { x: centerX + shape.rx, y: centerY },
    ];

    ctx.fillStyle = 'white';
    ctx.strokeStyle = '#3b82f6';

    edgePoints.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, handleSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    const corners = [
      { x: shape.x, y: shape.y },
      { x: shape.x + shape.width, y: shape.y },
      { x: shape.x, y: shape.y + shape.height },
      { x: shape.x + shape.width, y: shape.y + shape.height },
    ];

    corners.forEach((corner) => {
      ctx.beginPath();
      ctx.rect(corner.x - handleSize / 2, corner.y - handleSize / 2, handleSize, handleSize);
      ctx.fill();
      ctx.stroke();
    });

    const handleX = shape.x + shape.width / 2;
    const handleY = shape.y - rotationHandleDistance;

    ctx.beginPath();
    ctx.moveTo(handleX, shape.y);
    ctx.lineTo(handleX, handleY);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5 / zoom;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(handleX, handleY, rotationHandleSize, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.strokeStyle = '#3b82f6';
    ctx.fill();
    ctx.stroke();
  } else {
    const rHandleSize = 4 / zoom;
    const baseMargin = Math.min(shape.width, shape.height, 64 / zoom) * 0.15;
    const rMargin = Math.max(baseMargin, 12 / zoom);

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1 / zoom;
    ctx.beginPath();
    ctx.rect(shape.x, shape.y, shape.width, shape.height);
    ctx.stroke();

    const corners = [
      { x: shape.x, y: shape.y },
      { x: shape.x + shape.width, y: shape.y },
      { x: shape.x, y: shape.y + shape.height },
      { x: shape.x + shape.width, y: shape.y + shape.height },
    ];

    ctx.fillStyle = 'white';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1 / zoom;

    corners.forEach((corner) => {
      ctx.beginPath();
      ctx.rect(corner.x - handleSize / 2, corner.y - handleSize / 2, handleSize, handleSize);
      ctx.fill();
      ctx.stroke();
    });

    if (shape.type === 'rect') {
      const radiusPositions = [
        { x: shape.x + rMargin, y: shape.y + rMargin },
        { x: shape.x + shape.width - rMargin, y: shape.y + rMargin },
        { x: shape.x + rMargin, y: shape.y + shape.height - rMargin },
        { x: shape.x + shape.width - rMargin, y: shape.y + shape.height - rMargin },
      ];

      radiusPositions.forEach((pos) => {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, rHandleSize, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.stroke();
      });
    }

    const handleX = shape.x + shape.width / 2;
    const handleY = shape.y - rotationHandleDistance;

    ctx.beginPath();
    ctx.moveTo(handleX, shape.y);
    ctx.lineTo(handleX, handleY);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5 / zoom;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(handleX, handleY, rotationHandleSize, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5 / zoom;
    ctx.fill();
    ctx.stroke();
  }

  let label: string;
  let labelY: number;
  let labelX: number;

  if (shape.type === 'line') {
    const length = Math.sqrt(
      Math.pow(shape.x2 - shape.x, 2) + Math.pow(shape.y2 - shape.y, 2)
    );
    label = `${Math.round(length)}`;
    const midX = (shape.x + shape.x2) / 2;
    const midY = (shape.y + shape.y2) / 2;
    labelX = midX;
    labelY = midY + 12 / zoom;
  } else {
    label = `${Math.round(shape.width)} \u00d7 ${Math.round(shape.height)}`;
    labelY = shape.y + shape.height + 12 / zoom;
    labelX = shape.x + shape.width / 2;
  }

  drawBadge(label, labelX, labelY);
};

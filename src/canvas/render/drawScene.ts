import { GRID_SIZE } from '../../utils/Common';

import { drawSmartGuides, type AlignmentGuide } from '../../engine/smartGuides';
import type { Camera, LayerGroup, Shape } from '../../engine/types';

import { drawSelection } from './drawSelection';
import { drawShape } from './drawShape';

export type MarqueeRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type DrawSceneInput = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  dpr: number;
  camera: Camera;
  shapes: Shape[];
  groups?: LayerGroup[];
  selectedIds: string[];
  showGrid: boolean;
  marqueeRect: MarqueeRect | null;
  smartGuides: AlignmentGuide[];
  theme: 'dark' | 'light';
  selectionPivot?: { x: number; y: number } | null;
};

const getFrameAncestors = (shape: Shape, frameById: Map<string, Shape>): Shape[] => {
  const ancestors: Shape[] = [];
  const visited = new Set<string>();
  let currentFrameId = shape.frameId;

  while (currentFrameId && !visited.has(currentFrameId)) {
    visited.add(currentFrameId);
    const frame = frameById.get(currentFrameId);
    if (!frame || frame.type !== 'frame') break;
    ancestors.unshift(frame);
    currentFrameId = frame.frameId;
  }

  return ancestors;
};

const applyFrameClipPath = (ctx: CanvasRenderingContext2D, frame: Shape) => {
  const radius = frame.type === 'frame' ? frame.cornerRadius ?? 0 : 0;
  const centerX = frame.x + frame.width / 2;
  const centerY = frame.y + frame.height / 2;

  ctx.save();
  if (frame.rotation && frame.rotation !== 0) {
    ctx.translate(centerX, centerY);
    ctx.rotate((frame.rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);
  }

  ctx.beginPath();
  if (radius > 0) ctx.roundRect(frame.x, frame.y, frame.width, frame.height, radius);
  else ctx.rect(frame.x, frame.y, frame.width, frame.height);
  ctx.restore();
  ctx.clip();
};

const getShapeBounds = (shape: Shape) => {
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

const drawMultiSelectionDimensions = (
  ctx: CanvasRenderingContext2D,
  shapes: Shape[],
  selectedIds: string[],
  zoom: number
) => {
  if (selectedIds.length <= 1) {
    return;
  }

  const selectedShapes = shapes.filter((shape) => selectedIds.includes(shape.id));
  if (selectedShapes.length === 0) {
    return;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  selectedShapes.forEach((shape) => {
    const bounds = getShapeBounds(shape);
    minX = Math.min(minX, bounds.minX);
    minY = Math.min(minY, bounds.minY);
    maxX = Math.max(maxX, bounds.maxX);
    maxY = Math.max(maxY, bounds.maxY);
  });

  const width = Math.max(0, maxX - minX);
  const height = Math.max(0, maxY - minY);
  const objectCount = selectedShapes.length;
  const itemLabel = objectCount === 1 ? 'item' : 'items';
  const label = `${Math.round(width)} \u00d7 ${Math.round(height)} • ${objectCount} ${itemLabel}`;

  const fontSize = 11 / zoom;
  const paddingH = 6 / zoom;
  const paddingV = 3 / zoom;
  ctx.font = `600 ${fontSize}px Inter, sans-serif`;

  const textWidth = ctx.measureText(label).width;
  const labelX = minX + width / 2 - textWidth / 2;
  const labelY = maxY + 12 / zoom;

  ctx.beginPath();
  ctx.roundRect(
    labelX - paddingH,
    labelY - fontSize,
    textWidth + paddingH * 2,
    fontSize + paddingV * 2,
    4 / zoom
  );
  ctx.fillStyle = '#18A0FB';
  ctx.fill();

  ctx.fillStyle = 'white';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, labelX, labelY - fontSize / 2 + paddingV);
};

const drawLockBadge = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number
) => {
  const width = 18 / zoom;
  const height = 14 / zoom;
  const radius = 4 / zoom;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = '#3b82f6';
  ctx.fill();

  const cx = x + width / 2;
  const bodyW = 8 / zoom;
  const bodyH = 5.5 / zoom;
  const bodyX = cx - bodyW / 2;
  const bodyY = y + 6.2 / zoom;
  const shackleR = 2.8 / zoom;

  // Shackle
  ctx.beginPath();
  ctx.arc(cx, y + 6 / zoom, shackleR, Math.PI, 0, false);
  ctx.lineWidth = 1.3 / zoom;
  ctx.strokeStyle = 'white';
  ctx.stroke();

  // Body
  ctx.beginPath();
  ctx.roundRect(bodyX, bodyY, bodyW, bodyH, 1.4 / zoom);
  ctx.fillStyle = 'white';
  ctx.fill();

  // Keyhole
  ctx.beginPath();
  ctx.arc(cx, bodyY + bodyH / 2 - 0.3 / zoom, 0.85 / zoom, 0, Math.PI * 2);
  ctx.fillStyle = '#3b82f6';
  ctx.fill();
};

const drawMultiSelectionFrame = (
  ctx: CanvasRenderingContext2D,
  shapes: Shape[],
  selectedIds: string[],
  zoom: number,
  pivot?: { x: number; y: number } | null
) => {
  if (selectedIds.length <= 1) return;
  const selectedShapes = shapes.filter((shape) => selectedIds.includes(shape.id));
  if (selectedShapes.length === 0) return;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  selectedShapes.forEach((shape) => {
    const bounds = getShapeBounds(shape);
    minX = Math.min(minX, bounds.minX);
    minY = Math.min(minY, bounds.minY);
    maxX = Math.max(maxX, bounds.maxX);
    maxY = Math.max(maxY, bounds.maxY);
  });

  const width = maxX - minX;
  const height = maxY - minY;
  const handleSize = 8 / zoom;
  const rotationHandleDistance = 30 / zoom;
  const rotationHandleSize = 5 / zoom;

  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1 / zoom;
  ctx.beginPath();
  ctx.rect(minX, minY, width, height);
  ctx.stroke();

  const corners = [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: minX, y: maxY },
    { x: maxX, y: maxY },
  ];

  ctx.fillStyle = 'white';
  ctx.strokeStyle = '#3b82f6';
  corners.forEach((corner) => {
    ctx.beginPath();
    ctx.rect(corner.x - handleSize / 2, corner.y - handleSize / 2, handleSize, handleSize);
    ctx.fill();
    ctx.stroke();
  });

  const handleX = minX + width / 2;
  const handleY = minY - rotationHandleDistance;
  ctx.beginPath();
  ctx.moveTo(handleX, minY);
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

  const pivotPoint = pivot ?? { x: minX + width / 2, y: minY + height / 2 };
  ctx.beginPath();
  ctx.arc(pivotPoint.x, pivotPoint.y, 4 / zoom, 0, Math.PI * 2);
  ctx.fillStyle = '#3b82f6';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(pivotPoint.x, pivotPoint.y, 7 / zoom, 0, Math.PI * 2);
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1 / zoom;
  ctx.stroke();
};

const drawLockedBadges = (
  ctx: CanvasRenderingContext2D,
  shapes: Shape[],
  groups: LayerGroup[] | undefined,
  zoom: number
) => {
  const groupsById = new Map((groups ?? []).map((group) => [group.id, group]));
  const shapesById = new Map(shapes.map((shape) => [shape.id, shape]));
  const groupCoveredShapeIds = new Set<string>();
  const visitedGroups = new Set<string>();

  const collectGroupShapes = (groupId: string, acc: string[]) => {
    if (visitedGroups.has(groupId)) return;
    visitedGroups.add(groupId);
    const group = groupsById.get(groupId);
    if (!group) return;

    (group.childIds ?? []).forEach((nodeKey) => {
      const [kind, ...rest] = nodeKey.split(':');
      const id = rest.join(':');
      if (kind === 'shape') {
        if (shapesById.has(id)) acc.push(id);
        return;
      }
      if (kind === 'group') {
        collectGroupShapes(id, acc);
      }
    });
  };

  (groups ?? []).forEach((group) => {
    visitedGroups.clear();
    const groupShapeIds: string[] = [];
    collectGroupShapes(group.id, groupShapeIds);
    if (groupShapeIds.length === 0) return;

    const groupShapes = groupShapeIds
      .map((id) => shapesById.get(id))
      .filter((shape): shape is Shape => Boolean(shape));
    if (groupShapes.length === 0) return;

    const allLocked = groupShapes.every((shape) => shape.locked);
    if (!allLocked) return;

    groupShapeIds.forEach((id) => groupCoveredShapeIds.add(id));

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;

    groupShapes.forEach((shape) => {
      const bounds = getShapeBounds(shape);
      minX = Math.min(minX, bounds.minX);
      minY = Math.min(minY, bounds.minY);
      maxX = Math.max(maxX, bounds.maxX);
    });

    drawLockBadge(ctx, maxX + 6 / zoom, minY - 16 / zoom, zoom);
  });

  shapes.forEach((shape) => {
    if (!shape.locked || groupCoveredShapeIds.has(shape.id)) {
      return;
    }
    const bounds = getShapeBounds(shape);
    drawLockBadge(ctx, bounds.maxX + 6 / zoom, bounds.minY - 16 / zoom, zoom);
  });
};

export const drawScene = ({
  canvas,
  ctx,
  dpr,
  camera,
  shapes,
  groups,
  selectedIds,
  showGrid,
  marqueeRect,
  smartGuides,
  theme,
  selectionPivot,
}: DrawSceneInput) => {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.scale(camera.zoom, camera.zoom);

  if (showGrid) {
    const width = canvas.width / (camera.zoom * dpr);
    const height = canvas.height / (camera.zoom * dpr);
    const startX = Math.floor(-camera.x / camera.zoom / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor(-camera.y / camera.zoom / GRID_SIZE) * GRID_SIZE;

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1 / camera.zoom;

    for (let x = startX; x < startX + width + GRID_SIZE * 2; x += GRID_SIZE) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, startY + height + GRID_SIZE * 2);
    }
    for (let y = startY; y < startY + height + GRID_SIZE * 2; y += GRID_SIZE) {
      ctx.moveTo(startX, y);
      ctx.lineTo(startX + width + GRID_SIZE * 2, y);
    }
    ctx.stroke();
  }

  const frameById = new Map(
    shapes
      .filter((shape) => shape.type === 'frame')
      .map((shape) => [shape.id, shape])
  );

  shapes.forEach((shape) => {
    ctx.save();
    ctx.globalAlpha = shape.opacity ?? 1;

    if (shape.frameId) {
      const ancestors = getFrameAncestors(shape, frameById);
      ancestors.forEach((frame) => {
        if (frame.type === 'frame' && frame.clipContent) {
          applyFrameClipPath(ctx, frame);
        }
      });
    }

    if (shape.rotation && shape.rotation !== 0) {
      const centerX = shape.x + shape.width / 2;
      const centerY = shape.y + shape.height / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate((shape.rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);
    }

    if (shape.shadow?.enabled) {
      ctx.shadowColor = shape.shadow.color;
      ctx.shadowBlur = shape.shadow.blur;
      ctx.shadowOffsetX = shape.shadow.x;
      ctx.shadowOffsetY = shape.shadow.y;
    }

    drawShape(ctx, shape, theme);
    drawSelection({ ctx, shape, selectedIds, zoom: camera.zoom });

    ctx.restore();
  });

  if (marqueeRect) {
    ctx.strokeStyle = '#3b82f6';
    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.lineWidth = 1 / camera.zoom;
    ctx.fillRect(marqueeRect.x, marqueeRect.y, marqueeRect.w, marqueeRect.h);
    ctx.strokeRect(marqueeRect.x, marqueeRect.y, marqueeRect.w, marqueeRect.h);
  }

  if (smartGuides.length > 0) {
    drawSmartGuides(ctx, smartGuides, shapes, camera.zoom);
  }

  drawMultiSelectionDimensions(ctx, shapes, selectedIds, camera.zoom);
  drawMultiSelectionFrame(ctx, shapes, selectedIds, camera.zoom, selectionPivot);
  drawLockedBadges(ctx, shapes, groups, camera.zoom);

  ctx.restore();
};

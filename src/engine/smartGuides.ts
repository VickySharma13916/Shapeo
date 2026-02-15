import type { Shape } from './types';

export interface AlignmentGuide {
  axis: 'x' | 'y';
  position: number;
  type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'spacing';
  referenceShapeId: string;
  secondReferenceShapeId?: string;
  kind?: 'alignment' | 'spacing';
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

const SNAP_THRESHOLD = 5;

type Bounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  center: number;
  middle: number;
};

const getBounds = (shape: Shape): Bounds => {
  if (shape.type === 'line') {
    const left = Math.min(shape.x, shape.x2);
    const right = Math.max(shape.x, shape.x2);
    const top = Math.min(shape.y, shape.y2);
    const bottom = Math.max(shape.y, shape.y2);
    return {
      left,
      right,
      top,
      bottom,
      center: (left + right) / 2,
      middle: (top + bottom) / 2,
    };
  }

  const left = Math.min(shape.x, shape.x + shape.width);
  const right = Math.max(shape.x, shape.x + shape.width);
  const top = Math.min(shape.y, shape.y + shape.height);
  const bottom = Math.max(shape.y, shape.y + shape.height);
  return {
    left,
    right,
    top,
    bottom,
    center: left + (right - left) / 2,
    middle: top + (bottom - top) / 2,
  };
};

const mergeBounds = (shapes: Shape[]): Bounds | null => {
  if (shapes.length === 0) return null;
  let left = Infinity;
  let right = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;

  shapes.forEach((shape) => {
    const b = getBounds(shape);
    left = Math.min(left, b.left);
    right = Math.max(right, b.right);
    top = Math.min(top, b.top);
    bottom = Math.max(bottom, b.bottom);
  });

  return {
    left,
    right,
    top,
    bottom,
    center: left + (right - left) / 2,
    middle: top + (bottom - top) / 2,
  };
};

export function findSmartGuides(
  draggedShapes: Shape[],
  allShapes: Shape[],
  snapThreshold: number = SNAP_THRESHOLD
): { guides: AlignmentGuide[]; snapOffset: { x: number; y: number } } {
  const guides: AlignmentGuide[] = [];
  const draggedIds = new Set(draggedShapes.map((shape) => shape.id));
  const otherShapes = allShapes.filter((shape) => !draggedIds.has(shape.id));
  const primaryBounds = mergeBounds(draggedShapes);

  if (!primaryBounds || otherShapes.length === 0) {
    return { guides, snapOffset: { x: 0, y: 0 } };
  }

  let snapOffsetX = 0;
  let snapOffsetY = 0;
  let closestXDist = Infinity;
  let closestYDist = Infinity;
  let guideX: AlignmentGuide | null = null;
  let guideY: AlignmentGuide | null = null;

  otherShapes.forEach((other) => {
    const otherBounds = getBounds(other);

    const verticalChecks: Array<{
      primary: number;
      other: number;
      type: AlignmentGuide['type'];
    }> = [
      { primary: primaryBounds.left, other: otherBounds.left, type: 'left' },
      { primary: primaryBounds.center, other: otherBounds.center, type: 'center' },
      { primary: primaryBounds.right, other: otherBounds.right, type: 'right' },
      { primary: primaryBounds.left, other: otherBounds.center, type: 'center' },
      { primary: primaryBounds.right, other: otherBounds.center, type: 'center' },
    ];

    verticalChecks.forEach(({ primary, other: target, type }) => {
      const dist = Math.abs(primary - target);
      if (dist <= snapThreshold && dist < closestXDist) {
        closestXDist = dist;
        snapOffsetX = target - primary;
        guideX = {
          axis: 'x',
          position: target,
          type,
          referenceShapeId: other.id,
          kind: 'alignment',
        };
      }
    });

    const horizontalChecks: Array<{
      primary: number;
      other: number;
      type: AlignmentGuide['type'];
    }> = [
      { primary: primaryBounds.top, other: otherBounds.top, type: 'top' },
      { primary: primaryBounds.middle, other: otherBounds.middle, type: 'middle' },
      { primary: primaryBounds.bottom, other: otherBounds.bottom, type: 'bottom' },
      { primary: primaryBounds.top, other: otherBounds.middle, type: 'middle' },
      { primary: primaryBounds.bottom, other: otherBounds.middle, type: 'middle' },
    ];

    horizontalChecks.forEach(({ primary, other: target, type }) => {
      const dist = Math.abs(primary - target);
      if (dist <= snapThreshold && dist < closestYDist) {
        closestYDist = dist;
        snapOffsetY = target - primary;
        guideY = {
          axis: 'y',
          position: target,
          type,
          referenceShapeId: other.id,
          kind: 'alignment',
        };
      }
    });
  });

  if (draggedShapes.length === 1 && otherShapes.length >= 2) {
    const dragged = primaryBounds;
    const sortedX = [...otherShapes].sort((a, b) => getBounds(a).left - getBounds(b).left);
    for (let i = 0; i < sortedX.length - 1; i += 1) {
      const leftShape = sortedX[i];
      const rightShape = sortedX[i + 1];
      const leftB = getBounds(leftShape);
      const rightB = getBounds(rightShape);
      const targetLeft = leftB.right + (rightB.left - leftB.right);
      const gapDist = Math.abs(dragged.left - targetLeft);

      if (gapDist <= snapThreshold && gapDist < closestXDist) {
        closestXDist = gapDist;
        snapOffsetX = targetLeft - dragged.left;
        guideX = {
          axis: 'x',
          position: targetLeft,
          type: 'spacing',
          referenceShapeId: leftShape.id,
          secondReferenceShapeId: rightShape.id,
          kind: 'spacing',
          x1: leftB.right,
          y1: dragged.middle,
          x2: dragged.left,
          y2: dragged.middle,
        };
      }
    }

    const sortedY = [...otherShapes].sort((a, b) => getBounds(a).top - getBounds(b).top);
    for (let i = 0; i < sortedY.length - 1; i += 1) {
      const topShape = sortedY[i];
      const bottomShape = sortedY[i + 1];
      const topB = getBounds(topShape);
      const bottomB = getBounds(bottomShape);
      const targetTop = topB.bottom + (bottomB.top - topB.bottom);
      const gapDist = Math.abs(dragged.top - targetTop);

      if (gapDist <= snapThreshold && gapDist < closestYDist) {
        closestYDist = gapDist;
        snapOffsetY = targetTop - dragged.top;
        guideY = {
          axis: 'y',
          position: targetTop,
          type: 'spacing',
          referenceShapeId: topShape.id,
          secondReferenceShapeId: bottomShape.id,
          kind: 'spacing',
          x1: dragged.center,
          y1: topB.bottom,
          x2: dragged.center,
          y2: dragged.top,
        };
      }
    }
  }

  if (guideX) guides.push(guideX);
  if (guideY) guides.push(guideY);

  return { guides, snapOffset: { x: snapOffsetX, y: snapOffsetY } };
}

export function drawSmartGuides(
  ctx: CanvasRenderingContext2D,
  guides: AlignmentGuide[],
  allShapes: Shape[],
  zoom: number
) {
  ctx.save();

  guides.forEach((guide) => {
    if (guide.kind === 'spacing' && guide.x1 !== undefined && guide.y1 !== undefined && guide.x2 !== undefined && guide.y2 !== undefined) {
      ctx.strokeStyle = '#FF006B';
      ctx.lineWidth = 1 / zoom;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(guide.x1, guide.y1);
      ctx.lineTo(guide.x2, guide.y2);
      ctx.stroke();

      const distance =
        guide.axis === 'x'
          ? Math.abs(guide.x2 - guide.x1)
          : Math.abs(guide.y2 - guide.y1);
      const label = `${Math.round(distance)} px`;
      const labelX = (guide.x1 + guide.x2) / 2;
      const labelY = (guide.y1 + guide.y2) / 2;
      const fontSize = 10 / zoom;
      const paddingH = 4 / zoom;
      const paddingV = 2 / zoom;

      ctx.font = `600 ${fontSize}px Inter, sans-serif`;
      const textWidth = ctx.measureText(label).width;
      ctx.beginPath();
      ctx.roundRect(
        labelX - textWidth / 2 - paddingH,
        labelY - fontSize / 2 - paddingV,
        textWidth + paddingH * 2,
        fontSize + paddingV * 2,
        3 / zoom
      );
      ctx.fillStyle = '#FF006B';
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, labelX - textWidth / 2, labelY);
      return;
    }

    const referenceShape = allShapes.find((shape) => shape.id === guide.referenceShapeId);
    if (!referenceShape) return;

    ctx.strokeStyle = '#FF006B';
    ctx.lineWidth = 1 / zoom;
    ctx.setLineDash([4 / zoom, 4 / zoom]);
    ctx.beginPath();

    if (guide.axis === 'x') {
      const x = guide.position;
      const topY = Math.min(...allShapes.map((shape) => getBounds(shape).top));
      const bottomY = Math.max(...allShapes.map((shape) => getBounds(shape).bottom));
      ctx.moveTo(x, topY - 20);
      ctx.lineTo(x, bottomY + 20);
    } else {
      const y = guide.position;
      const leftX = Math.min(...allShapes.map((shape) => getBounds(shape).left));
      const rightX = Math.max(...allShapes.map((shape) => getBounds(shape).right));
      ctx.moveTo(leftX - 20, y);
      ctx.lineTo(rightX + 20, y);
    }

    ctx.stroke();
  });

  ctx.restore();
}

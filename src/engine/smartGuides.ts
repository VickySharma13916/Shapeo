import type { Shape } from './types';

export interface AlignmentGuide {
  axis: 'x' | 'y';
  position: number;
  type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
  referenceShapeId: string;
}

const SNAP_THRESHOLD = 5; // pixels

/**
 * Get all alignment points for a shape
 */
export function getShapeAlignmentPoints(shape: Shape) {
  return {
    left: shape.x,
    center: shape.x + shape.width / 2,
    right: shape.x + shape.width,
    top: shape.y,
    middle: shape.y + shape.height / 2,
    bottom: shape.y + shape.height,
  };
}

/**
 * Find smart guides when dragging shapes
 * Returns guides and snapped position
 */
export function findSmartGuides(
  draggedShapes: Shape[],
  allShapes: Shape[],
  snapThreshold: number = SNAP_THRESHOLD
): { guides: AlignmentGuide[]; snapOffset: { x: number; y: number } } {
  const guides: AlignmentGuide[] = [];
  let snapOffsetX = 0;
  let snapOffsetY = 0;

  // Get other shapes (not being dragged)
  const draggedIds = new Set(draggedShapes.map(s => s.id));
  const otherShapes =allShapes.filter(s => !draggedIds.has(s.id));

  if (otherShapes.length === 0) {
    return { guides, snapOffset: { x: 0, y: 0 } };
  }

  // For simplicity, use the first dragged shape as primary
  const primary = draggedShapes[0];
  const primaryPoints = getShapeAlignmentPoints(primary);

  let closestXDist = Infinity;
  let closestYDist = Infinity;
  let snapX: number | null = null;
  let snapY: number | null = null;
  let guideX: AlignmentGuide | null = null;
  let guideY: AlignmentGuide | null = null;

  // Check alignment with each other shape
  otherShapes.forEach(other => {
    const otherPoints = getShapeAlignmentPoints(other);

    // Check vertical alignments (x-axis)
    const verticalChecks: Array<{ primary: number; other: number; type: AlignmentGuide['type'] }> = [
      { primary: primaryPoints.left, other: otherPoints.left, type: 'left' },
      { primary: primaryPoints.left, other: otherPoints.center, type: 'center' },
      { primary: primaryPoints.left, other: otherPoints.right, type: 'right' },
      { primary: primaryPoints.center, other: otherPoints.left, type: 'left' },
      { primary: primaryPoints.center, other: otherPoints.center, type: 'center' },
      { primary: primaryPoints.center, other: otherPoints.right, type: 'right' },
      { primary: primaryPoints.right, other: otherPoints.left, type: 'left' },
      { primary: primaryPoints.right, other: otherPoints.center, type: 'center' },
      { primary: primaryPoints.right, other: otherPoints.right, type: 'right' },
    ];

    verticalChecks.forEach(({ primary: primaryVal, other: otherVal, type }) => {
      const dist = Math.abs(primaryVal - otherVal);
      if (dist < closestXDist && dist <= snapThreshold) {
        closestXDist = dist;
        snapX = otherVal;
        snapOffsetX = otherVal - primaryVal;
        guideX = {
          axis: 'x',
          position: otherVal,
          type,
          referenceShapeId: other.id,
        };
      }
    });

    // Check horizontal alignments (y-axis)
    const horizontalChecks: Array<{ primary: number; other: number; type: AlignmentGuide['type'] }> = [
      { primary: primaryPoints.top, other: otherPoints.top, type: 'top' },
      { primary: primaryPoints.top, other: otherPoints.middle, type: 'middle' },
      { primary: primaryPoints.top, other: otherPoints.bottom, type: 'bottom' },
      { primary: primaryPoints.middle, other: otherPoints.top, type: 'top' },
      { primary: primaryPoints.middle, other: otherPoints.middle, type: 'middle' },
      { primary: primaryPoints.middle, other: otherPoints.bottom, type: 'bottom' },
      { primary: primaryPoints.bottom, other: otherPoints.top, type: 'top' },
      { primary: primaryPoints.bottom, other: otherPoints.middle, type: 'middle' },
      { primary: primaryPoints.bottom, other: otherPoints.bottom, type: 'bottom' },
    ];

    horizontalChecks.forEach(({ primary: primaryVal, other: otherVal, type }) => {
      const dist = Math.abs(primaryVal - otherVal);
      if (dist < closestYDist && dist <= snapThreshold) {
        closestYDist = dist;
        snapY = otherVal;
        snapOffsetY = otherVal - primaryVal;
        guideY = {
          axis: 'y',
          position: otherVal,
          type,
          referenceShapeId: other.id,
        };
      }
    });
  });

  if (guideX) guides.push(guideX);
  if (guideY) guides.push(guideY);

  return {
    guides,
    snapOffset: { x: snapOffsetX, y: snapOffsetY },
  };
}

/**
 * Draw smart guides on canvas
 */
export function drawSmartGuides(
  ctx: CanvasRenderingContext2D,
  guides: AlignmentGuide[],
  allShapes: Shape[],
  zoom: number
) {
  ctx.save();
  
  guides.forEach(guide => {
    const referenceShape = allShapes.find(s => s.id === guide.referenceShapeId);
    if (!referenceShape) return;

    ctx.strokeStyle = '#FF006B'; // Figma pink
    ctx.lineWidth = 1 / zoom;
    ctx.setLineDash([4 / zoom, 4 / zoom]);
    
    ctx.beginPath();
    
    if (guide.axis === 'x') {
      // Vertical guide line
      const x = guide.position;
      // Draw from top of reference shape to bottom
      const topY = Math.min(...allShapes.map(s => s.y));
      const bottomY = Math.max(...allShapes.map(s => s.y + s.height));
      ctx.moveTo(x, topY - 20);
      ctx.lineTo(x, bottomY + 20 );
    } else {
      // Horizontal guide line
      const y = guide.position;
      // Draw from left of reference shape to right
      const leftX = Math.min(...allShapes.map(s => s.x));
      const rightX = Math.max(...allShapes.map(s => s.x + s.width));
      ctx.moveTo(leftX - 20, y);
      ctx.lineTo(rightX + 20, y);
    }
    
    ctx.stroke();
  });
  
  ctx.restore();
}

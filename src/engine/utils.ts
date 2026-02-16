import type { Point, Camera, Shape } from './types';
import { ShapeType } from './types';

export function screenToWorld(point: Point, camera: Camera): Point {
  return {
    x: (point.x - camera.x) / camera.zoom,
    y: (point.y - camera.y) / camera.zoom,
  };
}

export function worldToScreen(point: Point, camera: Camera): Point {
  return {
    x: point.x * camera.zoom + camera.x,
    y: point.y * camera.zoom + camera.y,
  };
}

export type ShapeBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export function getShapeBounds(shape: Shape): ShapeBounds {
  if (shape.type === ShapeType.Line || shape.type === ShapeType.Arrow) {
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
}

export function isPointInShape(point: Point, shape: Shape): boolean {
  const { x, y, width, height, rotation = 0 } = shape;
  
  // 1. Un-rotate the point around the center of the shape
  const cx = x + width / 2;
  const cy = y + height / 2;
  
  const rad = -rotation * (Math.PI / 180);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  
  const dx = point.x - cx;
  const dy = point.y - cy;
  
  const localX = cx + (dx * cos - dy * sin);
  const localY = cy + (dx * sin + dy * cos);

  // 2. Check based on shape type
  if (
    shape.type === ShapeType.Rectangle ||
    shape.type === ShapeType.Frame ||
    shape.type === ShapeType.Image
  ) {
    return (
      localX >= x &&
      localX <= x + width &&
      localY >= y &&
      localY <= y + height
    );
  } else if (shape.type === ShapeType.Circle || shape.type === ShapeType.Ellipse) {
    const rx = width / 2;
    const ry = height / 2;
    // (x - cx)^2 / rx^2 + (y - cy)^2 / ry^2 <= 1
    const normalizedX = (localX - cx) / rx;
    const normalizedY = (localY - cy) / ry;
    return (normalizedX * normalizedX + normalizedY * normalizedY) <= 1;
  } else if (shape.type === ShapeType.Line || shape.type === ShapeType.Arrow) {
    // Distance from point (localX, localY) to line segment (x1, y1) - (x2, y2)
    // Note: line coords are also in the un-rotated space (since we un-rotated the point)
    const { x: x1, y: y1, x2, y2, strokeWidth } = shape;
    
    // Vector from p1 to p2
    const A = localX - x1;
    const B = localY - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const distDx = localX - xx;
    const distDy = localY - yy;
    const distance = Math.sqrt(distDx * distDx + distDy * distDy);

    // Hit threshold: strokeWidth / 2 + padding (e.g. 5px)
    const threshold = Math.max(strokeWidth || 1, 5);
    return distance <= threshold;
  } else if (shape.type === ShapeType.Path) {
    if (shape.points.length === 0) {
      return false;
    }

    const threshold = Math.max((shape.strokeWidth || 1) + 3, 6);
    const absolutePoints = shape.points.map((pathPoint) => ({
      x: shape.x + pathPoint.x,
      y: shape.y + pathPoint.y,
    }));

    if (absolutePoints.length === 1) {
      const dxPoint = localX - absolutePoints[0].x;
      const dyPoint = localY - absolutePoints[0].y;
      return Math.hypot(dxPoint, dyPoint) <= threshold;
    }

    for (let i = 0; i < absolutePoints.length - 1; i += 1) {
      const p1 = absolutePoints[i];
      const p2 = absolutePoints[i + 1];
      const A = localX - p1.x;
      const B = localY - p1.y;
      const C = p2.x - p1.x;
      const D = p2.y - p1.y;

      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      const t = lenSq > 0 ? Math.max(0, Math.min(1, dot / lenSq)) : 0;
      const projX = p1.x + t * C;
      const projY = p1.y + t * D;
      if (Math.hypot(localX - projX, localY - projY) <= threshold) {
        return true;
      }
    }

    return false;
  }
  
  return false;
}

// src/engine/utils.ts
import type { Point, Camera, Shape } from './types';
import { ShapeType } from './types';

const LINE_HIT_PADDING = 6;

function toLocalPointForShape(point: Point, shape: Shape): Point {
  if (!shape.rotation) return point;

  const radians = (-shape.rotation * Math.PI) / 180;
  const centerX = shape.x + shape.width / 2;
  const centerY = shape.y + shape.height / 2;
  const translatedX = point.x - centerX;
  const translatedY = point.y - centerY;

  return {
    x: translatedX * Math.cos(radians) - translatedY * Math.sin(radians) + centerX,
    y: translatedX * Math.sin(radians) + translatedY * Math.cos(radians) + centerY,
  };
}

function distanceToLineSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)));
  const projectionX = start.x + t * dx;
  const projectionY = start.y + t * dy;

  return Math.hypot(point.x - projectionX, point.y - projectionY);
}

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

export function isPointInShape(point: Point, shape: Shape): boolean {
  const localPoint = toLocalPointForShape(point, shape);

  if (shape.type === ShapeType.Rectangle || shape.type === ShapeType.Image) {
    return (
      localPoint.x >= shape.x &&
      localPoint.x <= shape.x + shape.width &&
      localPoint.y >= shape.y &&
      localPoint.y <= shape.y + shape.height
    );
  }

  if (shape.type === ShapeType.Circle || shape.type === ShapeType.Ellipse) {
    const centerX = shape.x + shape.width / 2;
    const centerY = shape.y + shape.height / 2;
    const rx = Math.abs(shape.width / 2);
    const ry = Math.abs(shape.height / 2);
    if (rx === 0 || ry === 0) return false;

    const normalizedX = (localPoint.x - centerX) / rx;
    const normalizedY = (localPoint.y - centerY) / ry;
    return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
  }

  if (shape.type === ShapeType.Line) {
    const hitDistance = distanceToLineSegment(localPoint, { x: shape.x, y: shape.y }, { x: shape.x2, y: shape.y2 });
    const tolerance = Math.max(shape.strokeWidth / 2, LINE_HIT_PADDING);
    return hitDistance <= tolerance;
  }

  return false;
}

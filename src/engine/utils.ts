// src/engine/utils.ts
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

export function isPointInShape(point: Point, shape: Shape): boolean {
  // Both Rectangle and Image use the same bounding box hit detection
  if (shape.type === ShapeType.Rectangle || shape.type === ShapeType.Image) {
    return (
      point.x >= shape.x &&
      point.x <= shape.x + shape.width &&
      point.y >= shape.y &&
      point.y <= shape.y + shape.height
    );
  }
  return false;
}
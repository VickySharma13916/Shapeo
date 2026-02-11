import type { Point, Shape } from '../engine/types';

// Helper to find radius handles in any of the 4 corners
export const getRadiusHandleAtPos = (worldPos: Point, shape: Shape, zoom: number) => {
  const baseMargin = Math.min(shape.width, shape.height, 64 / zoom) * 0.15;
  const rMargin = Math.max(baseMargin, 12 / zoom);
  const size = 10 / zoom;
  
  const positions = [
    { id: 'tl', x: shape.x + rMargin, y: shape.y + rMargin },
    { id: 'tr', x: shape.x + shape.width - rMargin, y: shape.y + rMargin },
    { id: 'bl', x: shape.x + rMargin, y: shape.y + shape.height - rMargin },
    { id: 'br', x: shape.x + shape.width - rMargin, y: shape.y + shape.height - rMargin }
  ];
    
  return positions.find(p => 
    Math.abs(worldPos.x - p.x) < size && Math.abs(worldPos.y - p.y) < size
  );
};

// Helper to detect rotation handle above the shape
export const getRotationHandleAtPos = (worldPos: Point, shape: Shape, zoom: number) => {
  const handleSize = 10 / zoom;
  const handleDistance = 30 / zoom;
  const handleX = shape.x + shape.width / 2;
  const handleY = shape.y - handleDistance;

  return Math.abs(worldPos.x - handleX) < handleSize && Math.abs(worldPos.y - handleY) < handleSize;
};

// Helper to detect handles at the corners of the shape
export const getHandleAtPos = (worldPos: { x: number; y: number }, shape: Shape, zoom: number) => {
  const handleSize = 10 / zoom;
  const handles = [
    { id: 'nw', x: shape.x, y: shape.y },
    { id: 'ne', x: shape.x + shape.width, y: shape.y },
    { id: 'sw', x: shape.x, y: shape.y + shape.height },
    { id: 'se', x: shape.x + shape.width, y: shape.y + shape.height },
  ];
  return handles.find(h => 
    worldPos.x >= h.x - handleSize/2 && worldPos.x <= h.x + handleSize/2 &&
    worldPos.y >= h.y - handleSize/2 && worldPos.y <= h.y + handleSize/2
  );
};

// Helper to detect handles at the edges of the shape
export const getEdgeHandleAtPos = (worldPos: { x: number; y: number }, shape: Shape, zoom: number) => {
  const threshold = 6 / zoom;
  const withinX = worldPos.x >= shape.x && worldPos.x <= shape.x + shape.width;
  const withinY = worldPos.y >= shape.y && worldPos.y <= shape.y + shape.height;

  if (withinY && Math.abs(worldPos.x - shape.x) <= threshold) return { id: 'w' };
  if (withinY && Math.abs(worldPos.x - (shape.x + shape.width)) <= threshold) return { id: 'e' };
  if (withinX && Math.abs(worldPos.y - shape.y) <= threshold) return { id: 'n' };
  if (withinX && Math.abs(worldPos.y - (shape.y + shape.height)) <= threshold) return { id: 's' };
  return null;
};
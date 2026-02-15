import { MIN_SIZE } from '../../utils/Common';

import type { Point, Shape } from '../../engine/types';

type ShapeUpdates = Partial<Shape> & {
  x2?: number;
  y2?: number;
};

type ResizeUpdateInput = {
  activeHandleId: string;
  shape: Shape;
  worldPos: Point;
  snapToGrid: (value: number) => number;
};

export const getResizeUpdates = ({
  activeHandleId,
  shape,
  worldPos,
  snapToGrid,
}: ResizeUpdateInput): ShapeUpdates | null => {
  if (shape.type === 'line') {
    if (activeHandleId === 'start') {
      return { x: snapToGrid(worldPos.x), y: snapToGrid(worldPos.y) };
    }
    if (activeHandleId === 'end') {
      return { x2: snapToGrid(worldPos.x), y2: snapToGrid(worldPos.y) };
    }
    return null;
  }

  let { x, y, width, height } = shape;
  const aspectRatio = shape.width / shape.height;

  if (activeHandleId.includes('e')) {
    width = Math.max(MIN_SIZE, worldPos.x - shape.x);
  }
  if (activeHandleId.includes('w')) {
    x = worldPos.x;
    width = shape.x + shape.width - worldPos.x;
  }
  if (activeHandleId.includes('s')) {
    height = Math.max(MIN_SIZE, worldPos.y - shape.y);
  }
  if (activeHandleId.includes('n')) {
    y = worldPos.y;
    height = shape.y + shape.height - worldPos.y;
  }

  if (shape.aspectRatioLocked) {
    if (activeHandleId.length === 2) {
      const widthChange = Math.abs(width - shape.width);
      const heightChange = Math.abs(height - shape.height);

      if (widthChange > heightChange) {
        const newHeight = width / aspectRatio;
        if (activeHandleId.includes('n')) {
          y = shape.y + shape.height - newHeight;
        }
        height = newHeight;
      } else {
        const newWidth = height * aspectRatio;
        if (activeHandleId.includes('w')) {
          x = shape.x + shape.width - newWidth;
        }
        width = newWidth;
      }
    } else if (activeHandleId.includes('e') || activeHandleId.includes('w')) {
      height = width / aspectRatio;
    } else if (activeHandleId.includes('n') || activeHandleId.includes('s')) {
      width = height * aspectRatio;
    }
  }

  return { x, y, width, height };
};

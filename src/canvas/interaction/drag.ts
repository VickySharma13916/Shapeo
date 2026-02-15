import type { AlignmentGuide } from '../../engine/smartGuides';
import { findSmartGuides } from '../../engine/smartGuides';
import type { Point, Shape } from '../../engine/types';

import type { InteractionState } from './types';

type ShapeUpdates = Partial<Shape> & {
  x2?: number;
  y2?: number;
};

type DragUpdate = {
  id: string;
  updates: ShapeUpdates;
};

type DragUpdatesInput = {
  worldPos: Point;
  shapes: Shape[];
  dragOffsetById: InteractionState['dragOffsetById'];
  snapEnabled: boolean;
  snapToGrid: (value: number) => number;
};

type DragUpdatesResult = {
  updates: DragUpdate[];
  guides: AlignmentGuide[];
} | null;

export const getDragUpdates = ({
  worldPos,
  shapes,
  dragOffsetById,
  snapEnabled,
  snapToGrid,
}: DragUpdatesInput): DragUpdatesResult => {
  const dragIds = Object.keys(dragOffsetById);
  const draggedShapes = shapes.filter(
    (shape) => dragIds.includes(shape.id) && !shape.locked
  );
  if (draggedShapes.length === 0) {
    return null;
  }

  const primaryShape = draggedShapes[0];
  const primaryOffset = dragOffsetById[primaryShape.id];
  if (!primaryOffset) {
    return null;
  }

  const baseX = worldPos.x - primaryOffset.x;
  const baseY = worldPos.y - primaryOffset.y;

  const tempShapes = draggedShapes.map((shape) => {
    const nextX = shape === primaryShape ? baseX : shape.x + (baseX - primaryShape.x);
    const nextY = shape === primaryShape ? baseY : shape.y + (baseY - primaryShape.y);

    if (shape.type === 'line') {
      const deltaX = nextX - shape.x;
      const deltaY = nextY - shape.y;
      return {
        ...shape,
        x: nextX,
        y: nextY,
        x2: shape.x2 + deltaX,
        y2: shape.y2 + deltaY,
      };
    }

    return { ...shape, x: nextX, y: nextY };
  });

  const { guides, snapOffset } = findSmartGuides(tempShapes, shapes);

  const updates: DragUpdate[] = [];
  dragIds.forEach((id) => {
    const shape = shapes.find((candidate) => candidate.id === id);
    const dragOffset = dragOffsetById[id];
    if (!shape || !dragOffset) {
      return;
    }

    const newX = worldPos.x - dragOffset.x + snapOffset.x;
    const newY = worldPos.y - dragOffset.y + snapOffset.y;

    if (shape.type === 'line') {
      const deltaX = newX - shape.x;
      const deltaY = newY - shape.y;
      updates.push({
        id,
        updates: {
          x: snapEnabled ? snapToGrid(newX) : newX,
          y: snapEnabled ? snapToGrid(newY) : newY,
          x2: snapEnabled ? snapToGrid(shape.x2 + deltaX) : shape.x2 + deltaX,
          y2: snapEnabled ? snapToGrid(shape.y2 + deltaY) : shape.y2 + deltaY,
        },
      });
      return;
    }

    updates.push({
      id,
      updates: {
        x: snapEnabled ? snapToGrid(newX) : newX,
        y: snapEnabled ? snapToGrid(newY) : newY,
      },
    });
  });

  return { updates, guides };
};

import type { Shape } from '../engine/types';

const isSelected = (id: string, selectedIds: string[]) => selectedIds.includes(id);

const sameOrder = (before: Shape[], after: Shape[]) =>
  before.length === after.length && before.every((shape, index) => shape.id === after[index].id);

export const bringSelectedToFront = (shapes: Shape[], selectedIds: string[]) => {
  if (selectedIds.length === 0) {
    return { shapes, changed: false };
  }

  const selected = shapes.filter((shape) => isSelected(shape.id, selectedIds));
  const others = shapes.filter((shape) => !isSelected(shape.id, selectedIds));
  const nextShapes = [...others, ...selected];
  return { shapes: nextShapes, changed: !sameOrder(shapes, nextShapes) };
};

export const sendSelectedToBack = (shapes: Shape[], selectedIds: string[]) => {
  if (selectedIds.length === 0) {
    return { shapes, changed: false };
  }

  const selected = shapes.filter((shape) => isSelected(shape.id, selectedIds));
  const others = shapes.filter((shape) => !isSelected(shape.id, selectedIds));
  const nextShapes = [...selected, ...others];
  return { shapes: nextShapes, changed: !sameOrder(shapes, nextShapes) };
};

export const moveSelectedForward = (shapes: Shape[], selectedIds: string[]) => {
  if (selectedIds.length === 0) {
    return { shapes, changed: false };
  }

  const nextShapes = [...shapes];
  let changed = false;

  for (let i = nextShapes.length - 2; i >= 0; i -= 1) {
    if (isSelected(nextShapes[i].id, selectedIds) && !isSelected(nextShapes[i + 1].id, selectedIds)) {
      [nextShapes[i], nextShapes[i + 1]] = [nextShapes[i + 1], nextShapes[i]];
      changed = true;
    }
  }

  return { shapes: nextShapes, changed };
};

export const moveSelectedBackward = (shapes: Shape[], selectedIds: string[]) => {
  if (selectedIds.length === 0) {
    return { shapes, changed: false };
  }

  const nextShapes = [...shapes];
  let changed = false;

  for (let i = 1; i < nextShapes.length; i += 1) {
    if (isSelected(nextShapes[i].id, selectedIds) && !isSelected(nextShapes[i - 1].id, selectedIds)) {
      [nextShapes[i], nextShapes[i - 1]] = [nextShapes[i - 1], nextShapes[i]];
      changed = true;
    }
  }

  return { shapes: nextShapes, changed };
};

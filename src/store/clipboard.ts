import type { Shape } from '../engine/types';

const PASTE_OFFSET = 20;

export const duplicateShapeForPaste = (shape: Shape): Shape => {
  if (shape.type === 'line') {
    return {
      ...shape,
      id: Math.random().toString(36).substring(7),
      groupId: undefined,
      frameId: undefined,
      x: shape.x + PASTE_OFFSET,
      y: shape.y + PASTE_OFFSET,
      x2: shape.x2 + PASTE_OFFSET,
      y2: shape.y2 + PASTE_OFFSET,
    };
  }

  return {
    ...shape,
    id: Math.random().toString(36).substring(7),
    groupId: undefined,
    frameId: undefined,
    x: shape.x + PASTE_OFFSET,
    y: shape.y + PASTE_OFFSET,
  };
};

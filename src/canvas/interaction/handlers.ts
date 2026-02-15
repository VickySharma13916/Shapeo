import { GRID_SIZE } from '../../utils/Common';

import type { AlignmentGuide } from '../../engine/smartGuides';
import type { Camera, Mode, Point, Shape } from '../../engine/types';
import { isPointInShape } from '../../engine/utils';

import { getRadiusHandleAtPos, getRotationHandleAtPos } from '../../utils/CommonFunctions';

import { getDragUpdates } from './drag';
import { createPointerDownState, getPointerDownResizeHandleId } from './pointerDown';
import { getResizeUpdates } from './resize';
import type { InteractionState } from './types';
import { createInteractionState } from './types';

type ShapeUpdates = Partial<Shape> & {
  x2?: number;
  y2?: number;
};

export type MarqueeRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type InteractionPatch =
  | { type: 'updateShape'; id: string; updates: ShapeUpdates }
  | { type: 'setSelectedIds'; ids: string[] }
  | { type: 'toggleSelection'; id: string }
  | { type: 'bringToFront' }
  | { type: 'setCamera'; camera: Camera }
  | { type: 'saveHistory' };

export type InteractionResult = {
  nextState: InteractionState;
  patches: InteractionPatch[];
  marqueeRect?: MarqueeRect | null;
  smartGuides?: AlignmentGuide[];
};

type PointerDownInput = {
  worldPos: Point;
  shiftKey: boolean;
  camera: Camera;
  mode: Mode;
  shapes: Shape[];
  selectedIds: string[];
  state: InteractionState;
};

type PointerMoveInput = {
  worldPos: Point;
  movement: { x: number; y: number };
  camera: Camera;
  mode: Mode;
  shapes: Shape[];
  selectedIds: string[];
  state: InteractionState;
};

type PointerUpInput = {
  state: InteractionState;
};

const snap = (value: number) => Math.round(value / GRID_SIZE) * GRID_SIZE;

export const handlePointerDown = ({ worldPos, shiftKey, camera, mode, shapes, selectedIds, state }: PointerDownInput): InteractionResult => {
  const patches: InteractionPatch[] = [];

  if (mode === 'pan') {
    return {
      nextState: createPointerDownState(state, 'panning'),
      patches,
    };
  }

  if (selectedIds.length === 1) {
    const selectedShape = shapes.find((shape) => shape.id === selectedIds[0]);
    if (selectedShape && !selectedShape.locked) {
      if (getRotationHandleAtPos(worldPos, selectedShape, camera.zoom)) {
        const dx = worldPos.x - (selectedShape.x + selectedShape.width / 2);
        const dy = worldPos.y - (selectedShape.y + selectedShape.height / 2);
        const rotationStartAngle =
          Math.atan2(dy, dx) * (180 / Math.PI) - 90 - (selectedShape.rotation || 0);

        return {
          nextState: createPointerDownState(state, 'rotating', { rotationStartAngle }),
          patches,
        };
      }

      if (getRadiusHandleAtPos(worldPos, selectedShape, camera.zoom)) {
        return {
          nextState: createPointerDownState(state, 'radius'),
          patches,
        };
      }

      const resizeHandleId = getPointerDownResizeHandleId(
        worldPos,
        selectedShape,
        camera.zoom
      );
      if (resizeHandleId) {
        return {
          nextState: createPointerDownState(state, 'resizing', {
            activeHandleId: resizeHandleId,
          }),
          patches,
        };
      }
    }
  }

  const hit = [...shapes]
    .reverse()
    .find((shape) => !shape.locked && isPointInShape(worldPos, shape));

  if (hit) {
    if (shiftKey) {
      patches.push({ type: 'toggleSelection', id: hit.id });
    } else if (!selectedIds.includes(hit.id)) {
      patches.push({ type: 'setSelectedIds', ids: [hit.id] });
    }

    const currentSelected = selectedIds.includes(hit.id) ? selectedIds : [hit.id];
    const dragOffsetById: InteractionState['dragOffsetById'] = {};
    currentSelected.forEach((id) => {
      const shape = shapes.find((candidate) => candidate.id === id);
      if (shape) {
        dragOffsetById[id] = { x: worldPos.x - shape.x, y: worldPos.y - shape.y };
      }
    });

    return {
      nextState: createPointerDownState(state, 'dragging', { dragOffsetById }),
      patches,
    };
  }

  if (!shiftKey) {
    patches.push({ type: 'setSelectedIds', ids: [] });
  }

  return {
    nextState: createPointerDownState(state, 'marquee', { marqueeStart: worldPos }),
    patches,
  };
};

export const handlePointerMove = ({ worldPos, movement, camera, mode, shapes, selectedIds, state }: PointerMoveInput): InteractionResult => {
  const patches: InteractionPatch[] = [];

  if (mode === 'pan' && state.mode === 'panning') {
    patches.push({
      type: 'setCamera',
      camera: { ...camera, x: camera.x + movement.x, y: camera.y + movement.y },
    });
    return { nextState: state, patches };
  }

  if (state.mode === 'marquee' && state.marqueeStart) {
    const start = state.marqueeStart;
    const marqueeRect = {
      x: Math.min(start.x, worldPos.x),
      y: Math.min(start.y, worldPos.y),
      w: Math.abs(worldPos.x - start.x),
      h: Math.abs(worldPos.y - start.y),
    };
    const hits = shapes
      .filter(
        (shape) =>
          shape.x < marqueeRect.x + marqueeRect.w &&
          shape.x + shape.width > marqueeRect.x &&
          shape.y < marqueeRect.y + marqueeRect.h &&
          shape.y + shape.height > marqueeRect.y
      )
      .map((shape) => shape.id);

    patches.push({ type: 'setSelectedIds', ids: hits });

    return {
      nextState: state,
      patches,
      marqueeRect,
    };
  }

  if (state.mode === 'rotating' && selectedIds.length === 1) {
    const shape = shapes.find((candidate) => candidate.id === selectedIds[0]);
    if (shape && !shape.locked) {
      const dx = worldPos.x - (shape.x + shape.width / 2);
      const dy = worldPos.y - (shape.y + shape.height / 2);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI) - 90;
      const newRotation = angle - state.rotationStartAngle;
      patches.push({
        type: 'updateShape',
        id: shape.id,
        updates: { rotation: Math.round(newRotation) },
      });
    }
    return { nextState: state, patches };
  }

  if (state.mode === 'radius' && selectedIds.length === 1) {
    const shape = shapes.find((candidate) => candidate.id === selectedIds[0]);
    if (shape && !shape.locked) {
      const dx = Math.min(
        Math.abs(worldPos.x - shape.x),
        Math.abs(worldPos.x - (shape.x + shape.width))
      );
      const dy = Math.min(
        Math.abs(worldPos.y - shape.y),
        Math.abs(worldPos.y - (shape.y + shape.height))
      );
      const newRadius = Math.min(dx, dy, shape.width / 2, shape.height / 2);
      patches.push({
        type: 'updateShape',
        id: shape.id,
        updates: { cornerRadius: Math.max(0, Math.round(newRadius)) },
      });
    }
    return { nextState: state, patches };
  }

  if (state.mode === 'resizing' && state.activeHandleId && selectedIds.length === 1) {
    const shape = shapes.find((candidate) => candidate.id === selectedIds[0]);
    if (!shape || shape.locked) {
      return { nextState: state, patches };
    }

    const updates = getResizeUpdates({
      activeHandleId: state.activeHandleId,
      shape,
      worldPos,
      snapToGrid: snap,
    });
    if (updates) {
      patches.push({
        type: 'updateShape',
        id: shape.id,
        updates,
      });
    }

    return { nextState: state, patches };
  }

  if (state.mode === 'dragging') {
    const drag = getDragUpdates({
      worldPos,
      shapes,
      selectedIds,
      dragOffsetById: state.dragOffsetById,
      snapToGrid: snap,
    });
    if (!drag) {
      return { nextState: state, patches };
    }

    drag.updates.forEach(({ id, updates }) => {
      patches.push({
        type: 'updateShape',
        id,
        updates,
      });
    });

    return {
      nextState: state,
      patches,
      smartGuides: drag.guides,
    };
  }

  return { nextState: state, patches };
};

export const handlePointerUp = ({ state }: PointerUpInput): InteractionResult => {
  const patches: InteractionPatch[] = [];

  if (state.mode !== 'idle' && state.mode !== 'panning') {
    patches.push({ type: 'saveHistory' });
  }

  return {
    nextState: createInteractionState(),
    patches,
    marqueeRect: null,
    smartGuides: [],
  };
};

import { describe, expect, it } from 'vitest';

import type { Camera, Shape } from '../../engine/types';

import { createInteractionState, type InteractionState } from './types';

import { handlePointerDown, handlePointerMove, handlePointerUp } from './handlers';

const baseCamera: Camera = { x: 0, y: 0, zoom: 1 };

const rectShape: Shape = {
  id: 'rect-1',
  type: 'rect',
  x: 0,
  y: 0,
  width: 100,
  height: 80,
  fill: '#ffffff',
  stroke: '#000000',
  strokeWidth: 1,
  rotation: 0,
};

const lineShape: Shape = {
  id: 'line-1',
  type: 'line',
  x: 10,
  y: 10,
  x2: 110,
  y2: 10,
  width: 100,
  height: 0,
  fill: '#000000',
  stroke: '#000000',
  strokeWidth: 2,
  rotation: 0,
};

describe('interaction handlers', () => {
  it('drags a single shape', () => {
    const down = handlePointerDown({
      worldPos: { x: 50, y: 40 },
      shiftKey: false,
      camera: baseCamera,
      mode: 'select',
      shapes: [rectShape],
      selectedIds: [rectShape.id],
      state: createInteractionState(),
    });

    expect(down.nextState.mode).toBe('dragging');

    const move = handlePointerMove({
      worldPos: { x: 60, y: 55 },
      movement: { x: 10, y: 15 },
      camera: baseCamera,
      mode: 'select',
      shapes: [rectShape],
      selectedIds: [rectShape.id],
      state: down.nextState,
    });

    const updatePatch = move.patches.find(
      (patch) => patch.type === 'updateShape' && patch.id === rectShape.id
    );

    expect(updatePatch).toEqual({
      type: 'updateShape',
      id: rectShape.id,
      updates: { x: 10, y: 15 },
    });
  });

  it('does not change z-order on pointer down hit', () => {
    const down = handlePointerDown({
      worldPos: { x: 50, y: 40 },
      shiftKey: false,
      camera: baseCamera,
      mode: 'select',
      shapes: [rectShape],
      selectedIds: [rectShape.id],
      state: createInteractionState(),
    });

    const hasBringToFront = down.patches.some((patch) => patch.type === 'bringToFront');
    expect(hasBringToFront).toBe(false);
  });

  it('resizes a line endpoint', () => {
    const down = handlePointerDown({
      worldPos: { x: lineShape.x, y: lineShape.y },
      shiftKey: false,
      camera: baseCamera,
      mode: 'select',
      shapes: [lineShape],
      selectedIds: [lineShape.id],
      state: createInteractionState(),
    });

    expect(down.nextState.mode).toBe('resizing');
    expect(down.nextState.activeHandleId).toBe('start');

    const move = handlePointerMove({
      worldPos: { x: 20, y: 30 },
      movement: { x: 10, y: 20 },
      camera: baseCamera,
      mode: 'select',
      shapes: [lineShape],
      selectedIds: [lineShape.id],
      state: down.nextState,
    });

    expect(move.patches).toContainEqual({
      type: 'updateShape',
      id: lineShape.id,
      updates: { x: 20, y: 30 },
    });
  });

  it('drags a line as a whole object', () => {
    const down = handlePointerDown({
      worldPos: { x: 60, y: 10 },
      shiftKey: false,
      camera: baseCamera,
      mode: 'select',
      shapes: [lineShape],
      selectedIds: [lineShape.id],
      state: createInteractionState(),
    });

    expect(down.nextState.mode).toBe('dragging');

    const move = handlePointerMove({
      worldPos: { x: 70, y: 25 },
      movement: { x: 10, y: 15 },
      camera: baseCamera,
      mode: 'select',
      shapes: [lineShape],
      selectedIds: [lineShape.id],
      state: down.nextState,
    });

    expect(move.patches).toContainEqual({
      type: 'updateShape',
      id: lineShape.id,
      updates: { x: 20, y: 25, x2: 120, y2: 25 },
    });
  });

  it('does not drag locked shapes from canvas hit', () => {
    const lockedRect: Shape = { ...rectShape, id: 'rect-locked', locked: true };

    const down = handlePointerDown({
      worldPos: { x: 50, y: 40 },
      shiftKey: false,
      camera: baseCamera,
      mode: 'select',
      shapes: [lockedRect],
      selectedIds: [],
      state: createInteractionState(),
    });

    expect(down.nextState.mode).toBe('marquee');
  });

  it('marquee-selects shapes', () => {
    const shapes: Shape[] = [
      rectShape,
      { ...rectShape, id: 'rect-2', x: 150, y: 150 },
    ];

    const down = handlePointerDown({
      worldPos: { x: -10, y: -10 },
      shiftKey: false,
      camera: baseCamera,
      mode: 'select',
      shapes,
      selectedIds: [],
      state: createInteractionState(),
    });

    expect(down.nextState.mode).toBe('marquee');

    const move = handlePointerMove({
      worldPos: { x: 260, y: 260 },
      movement: { x: 270, y: 270 },
      camera: baseCamera,
      mode: 'select',
      shapes,
      selectedIds: [],
      state: down.nextState,
    });

    expect(move.patches).toContainEqual({
      type: 'setSelectedIds',
      ids: ['rect-1', 'rect-2'],
    });
  });

  it('saves history on interaction end', () => {
    const state: InteractionState = {
      ...createInteractionState(),
      mode: 'dragging',
    };

    const up = handlePointerUp({ state });
    expect(up.patches).toContainEqual({ type: 'saveHistory' });
  });
});

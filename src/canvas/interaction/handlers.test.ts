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
      shiftKey: false,
      camera: baseCamera,
      mode: 'select',
      pixelSnapEnabled: true,
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
      shiftKey: false,
      camera: baseCamera,
      mode: 'select',
      pixelSnapEnabled: true,
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
      shiftKey: false,
      camera: baseCamera,
      mode: 'select',
      pixelSnapEnabled: true,
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
      shiftKey: false,
      camera: baseCamera,
      mode: 'select',
      pixelSnapEnabled: true,
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

  it('rotates multi-selection around shared bounds center', () => {
    const rectA: Shape = { ...rectShape, id: 'rect-a', x: 0, y: 0, width: 100, height: 100, rotation: 0 };
    const rectB: Shape = { ...rectShape, id: 'rect-b', x: 120, y: 0, width: 100, height: 100, rotation: 0 };
    const shapes = [rectA, rectB];
    const selectedIds = ['rect-a', 'rect-b'];

    const down = handlePointerDown({
      worldPos: { x: 110, y: -30 },
      shiftKey: false,
      camera: baseCamera,
      mode: 'select',
      shapes,
      selectedIds,
      state: createInteractionState(),
    });

    expect(down.nextState.mode).toBe('rotating');

    const move = handlePointerMove({
      worldPos: { x: 210, y: 50 },
      movement: { x: 0, y: 0 },
      shiftKey: false,
      camera: baseCamera,
      mode: 'select',
      pixelSnapEnabled: true,
      shapes,
      selectedIds,
      state: down.nextState,
    });

    const updateA = move.patches.find(
      (patch) => patch.type === 'updateShape' && patch.id === 'rect-a'
    );
    const updateB = move.patches.find(
      (patch) => patch.type === 'updateShape' && patch.id === 'rect-b'
    );

    expect(updateA && updateA.type === 'updateShape' ? updateA.updates.rotation : null).toBe(90);
    expect(updateB && updateB.type === 'updateShape' ? updateB.updates.rotation : null).toBe(90);
  });

  it('snaps rotation angle to 15 degrees when shift is held', () => {
    const down = handlePointerDown({
      worldPos: { x: 50, y: -30 },
      shiftKey: false,
      camera: baseCamera,
      mode: 'select',
      shapes: [rectShape],
      selectedIds: [rectShape.id],
      state: createInteractionState(),
    });

    expect(down.nextState.mode).toBe('rotating');

    const move = handlePointerMove({
      worldPos: { x: 80, y: -10 },
      movement: { x: 0, y: 0 },
      shiftKey: true,
      camera: baseCamera,
      mode: 'select',
      pixelSnapEnabled: true,
      shapes: [rectShape],
      selectedIds: [rectShape.id],
      state: down.nextState,
    });

    const update = move.patches.find(
      (patch) => patch.type === 'updateShape' && patch.id === rectShape.id
    );
    expect(update && update.type === 'updateShape' ? update.updates.rotation : null).toBe(30);
  });

  it('resizes multi-selection from corner handle', () => {
    const rectA: Shape = { ...rectShape, id: 'rect-a', x: 0, y: 0, width: 100, height: 100 };
    const rectB: Shape = { ...rectShape, id: 'rect-b', x: 120, y: 0, width: 100, height: 100 };
    const shapes = [rectA, rectB];
    const selectedIds = ['rect-a', 'rect-b'];

    const down = handlePointerDown({
      worldPos: { x: 220, y: 100 },
      shiftKey: false,
      camera: baseCamera,
      mode: 'select',
      shapes,
      selectedIds,
      state: createInteractionState(),
    });

    expect(down.nextState.mode).toBe('resizing');
    expect(down.nextState.activeHandleId).toBe('multi-se');

    const move = handlePointerMove({
      worldPos: { x: 260, y: 140 },
      movement: { x: 0, y: 0 },
      shiftKey: false,
      camera: baseCamera,
      mode: 'select',
      pixelSnapEnabled: true,
      shapes,
      selectedIds,
      state: down.nextState,
    });

    const updateA = move.patches.find((patch) => patch.type === 'updateShape' && patch.id === 'rect-a');
    const updateB = move.patches.find((patch) => patch.type === 'updateShape' && patch.id === 'rect-b');
    expect(updateA).toBeTruthy();
    expect(updateB).toBeTruthy();
  });

  it('ignores hit on child shape outside clipping frame bounds', () => {
    const frame: Shape = {
      id: 'frame-1',
      type: 'frame',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      fill: '#fff',
      stroke: '#000',
      strokeWidth: 1,
      rotation: 0,
      clipContent: true,
      locked: false,
    };
    const child: Shape = {
      ...rectShape,
      id: 'child-1',
      x: 80,
      y: 20,
      width: 80,
      height: 60,
      frameId: frame.id,
    };

    const down = handlePointerDown({
      worldPos: { x: 140, y: 40 },
      shiftKey: false,
      camera: baseCamera,
      mode: 'select',
      shapes: [frame, child],
      selectedIds: [],
      state: createInteractionState(),
    });

    expect(down.nextState.mode).toBe('marquee');
  });

  it('drags nested frame descendants when parent frame is dragged', () => {
    const parentFrame: Shape = {
      id: 'frame-parent',
      type: 'frame',
      x: 0,
      y: 0,
      width: 260,
      height: 220,
      fill: '#fff',
      stroke: '#000',
      strokeWidth: 1,
      rotation: 0,
      clipContent: true,
      locked: false,
    };
    const childFrame: Shape = {
      id: 'frame-child',
      type: 'frame',
      x: 20,
      y: 20,
      width: 120,
      height: 120,
      fill: '#fff',
      stroke: '#000',
      strokeWidth: 1,
      rotation: 0,
      clipContent: true,
      frameId: parentFrame.id,
      locked: false,
    };
    const nestedRect: Shape = {
      ...rectShape,
      id: 'nested-rect',
      x: 40,
      y: 40,
      width: 50,
      height: 40,
      frameId: childFrame.id,
    };
    const shapes: Shape[] = [parentFrame, childFrame, nestedRect];

    const down = handlePointerDown({
      worldPos: { x: 30, y: 30 },
      shiftKey: false,
      camera: baseCamera,
      mode: 'select',
      shapes,
      selectedIds: [parentFrame.id],
      state: createInteractionState(),
    });

    expect(down.nextState.mode).toBe('dragging');

    const move = handlePointerMove({
      worldPos: { x: 50, y: 55 },
      movement: { x: 20, y: 25 },
      shiftKey: false,
      camera: baseCamera,
      mode: 'select',
      pixelSnapEnabled: false,
      shapes,
      selectedIds: [parentFrame.id],
      state: down.nextState,
    });

    const childPatch = move.patches.find(
      (patch) => patch.type === 'updateShape' && patch.id === childFrame.id
    );
    const nestedPatch = move.patches.find(
      (patch) => patch.type === 'updateShape' && patch.id === nestedRect.id
    );

    expect(childPatch).toBeTruthy();
    expect(nestedPatch).toBeTruthy();
    if (!childPatch || !nestedPatch || childPatch.type !== 'updateShape' || nestedPatch.type !== 'updateShape') {
      return;
    }

    const childDx = (childPatch.updates.x as number) - childFrame.x;
    const childDy = (childPatch.updates.y as number) - childFrame.y;
    const nestedDx = (nestedPatch.updates.x as number) - nestedRect.x;
    const nestedDy = (nestedPatch.updates.y as number) - nestedRect.y;

    expect(childDx).toBe(nestedDx);
    expect(childDy).toBe(nestedDy);
  });
});

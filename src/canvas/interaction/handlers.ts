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
  shiftKey: boolean;
  camera: Camera;
  mode: Mode;
  pixelSnapEnabled: boolean;
  shapes: Shape[];
  selectedIds: string[];
  state: InteractionState;
};

type PointerUpInput = {
  state: InteractionState;
};

const snap = (value: number) => Math.round(value / GRID_SIZE) * GRID_SIZE;
const ROTATION_HANDLE_DISTANCE = 30;
const ROTATION_HANDLE_SIZE = 10;
const MIN_MULTI_SIZE = 4;

const getShapeBounds = (shape: Shape) => {
  if (shape.type === 'line' || shape.type === 'arrow') {
    return {
      minX: Math.min(shape.x, shape.x2),
      minY: Math.min(shape.y, shape.y2),
      maxX: Math.max(shape.x, shape.x2),
      maxY: Math.max(shape.y, shape.y2),
    };
  }

  return {
    minX: Math.min(shape.x, shape.x + shape.width),
    minY: Math.min(shape.y, shape.y + shape.height),
    maxX: Math.max(shape.x, shape.x + shape.width),
    maxY: Math.max(shape.y, shape.y + shape.height),
  };
};

const getSelectionBounds = (selectedShapes: Shape[]) => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  selectedShapes.forEach((shape) => {
    const bounds = getShapeBounds(shape);
    minX = Math.min(minX, bounds.minX);
    minY = Math.min(minY, bounds.minY);
    maxX = Math.max(maxX, bounds.maxX);
    maxY = Math.max(maxY, bounds.maxY);
  });

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }

  return { minX, minY, maxX, maxY };
};

const isOnMultiRotateHandle = (
  worldPos: Point,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  zoom: number
) => {
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = bounds.minY - ROTATION_HANDLE_DISTANCE / zoom;
  const threshold = ROTATION_HANDLE_SIZE / zoom;
  return Math.abs(worldPos.x - cx) <= threshold && Math.abs(worldPos.y - cy) <= threshold;
};

const getMultiResizeHandleAtPos = (
  worldPos: Point,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  zoom: number
): string | null => {
  const threshold = 10 / zoom;
  const handles = [
    { id: 'multi-nw', x: bounds.minX, y: bounds.minY },
    { id: 'multi-ne', x: bounds.maxX, y: bounds.minY },
    { id: 'multi-sw', x: bounds.minX, y: bounds.maxY },
    { id: 'multi-se', x: bounds.maxX, y: bounds.maxY },
  ];
  const hit = handles.find(
    (h) => Math.abs(worldPos.x - h.x) <= threshold && Math.abs(worldPos.y - h.y) <= threshold
  );
  return hit?.id ?? null;
};

const isOnMultiPivotHandle = (
  worldPos: Point,
  pivot: Point,
  zoom: number
) => {
  const threshold = 9 / zoom;
  return Math.abs(worldPos.x - pivot.x) <= threshold && Math.abs(worldPos.y - pivot.y) <= threshold;
};

const buildMultiResizeBounds = (
  handleId: string,
  original: { minX: number; minY: number; maxX: number; maxY: number },
  worldPos: Point
) => {
  const next = { ...original };
  switch (handleId) {
    case 'multi-nw':
      next.minX = Math.min(worldPos.x, original.maxX - MIN_MULTI_SIZE);
      next.minY = Math.min(worldPos.y, original.maxY - MIN_MULTI_SIZE);
      break;
    case 'multi-ne':
      next.maxX = Math.max(worldPos.x, original.minX + MIN_MULTI_SIZE);
      next.minY = Math.min(worldPos.y, original.maxY - MIN_MULTI_SIZE);
      break;
    case 'multi-sw':
      next.minX = Math.min(worldPos.x, original.maxX - MIN_MULTI_SIZE);
      next.maxY = Math.max(worldPos.y, original.minY + MIN_MULTI_SIZE);
      break;
    case 'multi-se':
      next.maxX = Math.max(worldPos.x, original.minX + MIN_MULTI_SIZE);
      next.maxY = Math.max(worldPos.y, original.minY + MIN_MULTI_SIZE);
      break;
    default:
      break;
  }
  return next;
};

const rotatePoint = (point: Point, pivot: Point, angleRad: number): Point => {
  const dx = point.x - pivot.x;
  const dy = point.y - pivot.y;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return {
    x: pivot.x + dx * cos - dy * sin,
    y: pivot.y + dx * sin + dy * cos,
  };
};

const buildShapesById = (shapes: Shape[]) => new Map(shapes.map((shape) => [shape.id, shape]));

const isPointVisibleThroughFrames = (point: Point, shape: Shape, shapesById: Map<string, Shape>) => {
  const visited = new Set<string>();
  let currentFrameId = shape.frameId;

  while (currentFrameId && !visited.has(currentFrameId)) {
    visited.add(currentFrameId);
    const frame = shapesById.get(currentFrameId);
    if (!frame || frame.type !== 'frame') break;
    if (frame.clipContent !== false && !isPointInShape(point, frame)) {
      return false;
    }
    currentFrameId = frame.frameId;
  }

  return true;
};

const getFrameDescendantIds = (frameIds: Set<string>, shapes: Shape[]): string[] => {
  const descendants = new Set<string>();
  const pending = [...frameIds];

  while (pending.length > 0) {
    const frameId = pending.pop();
    if (!frameId) continue;

    shapes.forEach((shape) => {
      if (shape.frameId !== frameId || descendants.has(shape.id)) return;
      descendants.add(shape.id);
      if (shape.type === 'frame') {
        pending.push(shape.id);
      }
    });
  }

  return Array.from(descendants);
};

export const handlePointerDown = ({ worldPos, shiftKey, camera, mode, shapes, selectedIds, state }: PointerDownInput): InteractionResult => {
  const patches: InteractionPatch[] = [];
  const shapesById = buildShapesById(shapes);

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

  if (selectedIds.length > 1) {
    const selectedShapes = shapes.filter((shape) => selectedIds.includes(shape.id));
    const hasLockedSelection = selectedShapes.some((shape) => shape.locked);
    if (!hasLockedSelection) {
      const bounds = getSelectionBounds(selectedShapes);
      const pivot = state.selectionPivot ?? (bounds
        ? {
            x: (bounds.minX + bounds.maxX) / 2,
            y: (bounds.minY + bounds.maxY) / 2,
          }
        : null);
      if (bounds && pivot && isOnMultiPivotHandle(worldPos, pivot, camera.zoom)) {
        return {
          nextState: createPointerDownState(state, 'pivoting', {
            selectionPivot: pivot,
          }),
          patches,
        };
      }

      const multiResizeHandle = bounds ? getMultiResizeHandleAtPos(worldPos, bounds, camera.zoom) : null;
      if (bounds && multiResizeHandle) {
        const rotationSnapshots = selectedShapes.map((shape) => {
          if (shape.type === 'line' || shape.type === 'arrow') {
            return {
              id: shape.id,
              kind: 'line' as const,
              rotation: shape.rotation || 0,
              x: shape.x,
              y: shape.y,
              x2: shape.x2,
              y2: shape.y2,
            };
          }
          return {
            id: shape.id,
            kind: 'shape' as const,
            center: { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 },
            width: shape.width,
            height: shape.height,
            rotation: shape.rotation || 0,
          };
        });

        return {
          nextState: createPointerDownState(state, 'resizing', {
            activeHandleId: multiResizeHandle,
            multiBounds: bounds,
            rotationSnapshots,
            selectionPivot: pivot,
          }),
          patches,
        };
      }

      if (bounds && pivot && isOnMultiRotateHandle(worldPos, bounds, camera.zoom)) {
        const startAngle = Math.atan2(worldPos.y - pivot.y, worldPos.x - pivot.x) * (180 / Math.PI);

        const rotationSnapshots = selectedShapes.map((shape) => {
          if (shape.type === 'line' || shape.type === 'arrow') {
            return {
              id: shape.id,
              kind: 'line' as const,
              rotation: shape.rotation || 0,
              x: shape.x,
              y: shape.y,
              x2: shape.x2,
              y2: shape.y2,
            };
          }

          return {
            id: shape.id,
            kind: 'shape' as const,
            center: { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 },
            width: shape.width,
            height: shape.height,
            rotation: shape.rotation || 0,
          };
        });

        return {
          nextState: createPointerDownState(state, 'rotating', {
            rotationStartAngle: startAngle,
            rotationPivot: pivot,
            rotationSnapshots,
            selectionPivot: pivot,
            multiBounds: bounds,
          }),
          patches,
        };
      }
    }
  }

  const hit = [...shapes]
    .reverse()
    .find(
      (shape) =>
        !shape.locked &&
        isPointInShape(worldPos, shape) &&
        isPointVisibleThroughFrames(worldPos, shape, shapesById)
    );

  if (hit) {
    if (shiftKey) {
      patches.push({ type: 'toggleSelection', id: hit.id });
    } else if (!selectedIds.includes(hit.id)) {
      patches.push({ type: 'setSelectedIds', ids: [hit.id] });
    }

    const currentSelected = selectedIds.includes(hit.id) ? selectedIds : [hit.id];
    const selectedFrameIds = new Set(
      shapes
        .filter((shape) => currentSelected.includes(shape.id) && shape.type === 'frame')
        .map((shape) => shape.id)
    );
    const idsForDrag = selectedFrameIds.size
      ? Array.from(new Set([...currentSelected, ...getFrameDescendantIds(selectedFrameIds, shapes)]))
      : currentSelected;
    const dragOffsetById: InteractionState['dragOffsetById'] = {};
    idsForDrag.forEach((id) => {
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

export const handlePointerMove = ({ worldPos, movement, shiftKey, camera, mode, pixelSnapEnabled, shapes, selectedIds, state }: PointerMoveInput): InteractionResult => {
  const patches: InteractionPatch[] = [];

  if (mode === 'pan' && state.mode === 'panning') {
    patches.push({
      type: 'setCamera',
      camera: { ...camera, x: camera.x + movement.x, y: camera.y + movement.y },
    });
    return { nextState: state, patches };
  }

  if (state.mode === 'pivoting') {
    return {
      nextState: {
        ...state,
        selectionPivot: { x: worldPos.x, y: worldPos.y },
      },
      patches,
    };
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

  if (state.mode === 'rotating' && state.rotationPivot && state.rotationSnapshots.length > 0) {
    const currentAngle =
      Math.atan2(worldPos.y - state.rotationPivot.y, worldPos.x - state.rotationPivot.x) * (180 / Math.PI);
    let delta = currentAngle - state.rotationStartAngle;
    if (shiftKey) {
      delta = Math.round(delta / 15) * 15;
    }
    const deltaRad = (delta * Math.PI) / 180;

    state.rotationSnapshots.forEach((snapshot) => {
      if (snapshot.kind === 'line') {
        const p1 = rotatePoint({ x: snapshot.x, y: snapshot.y }, state.rotationPivot as Point, deltaRad);
        const p2 = rotatePoint({ x: snapshot.x2, y: snapshot.y2 }, state.rotationPivot as Point, deltaRad);
        patches.push({
          type: 'updateShape',
          id: snapshot.id,
          updates: {
            x: p1.x,
            y: p1.y,
            x2: p2.x,
            y2: p2.y,
            width: Math.abs(p2.x - p1.x),
            height: Math.abs(p2.y - p1.y),
            rotation: Math.round(snapshot.rotation + delta),
          },
        });
        return;
      }

      const rotatedCenter = rotatePoint(snapshot.center, state.rotationPivot as Point, deltaRad);
      patches.push({
        type: 'updateShape',
        id: snapshot.id,
        updates: {
          x: rotatedCenter.x - snapshot.width / 2,
          y: rotatedCenter.y - snapshot.height / 2,
          rotation: Math.round(snapshot.rotation + delta),
        },
      });
    });

    return { nextState: state, patches };
  }

  if (
    state.mode === 'resizing' &&
    state.activeHandleId?.startsWith('multi-') &&
    state.multiBounds &&
    state.rotationSnapshots.length > 0
  ) {
    const original = state.multiBounds;
    const nextBounds = buildMultiResizeBounds(state.activeHandleId, original, worldPos);
    const originalWidth = Math.max(MIN_MULTI_SIZE, original.maxX - original.minX);
    const originalHeight = Math.max(MIN_MULTI_SIZE, original.maxY - original.minY);
    const nextWidth = Math.max(MIN_MULTI_SIZE, nextBounds.maxX - nextBounds.minX);
    const nextHeight = Math.max(MIN_MULTI_SIZE, nextBounds.maxY - nextBounds.minY);
    const scaleX = nextWidth / originalWidth;
    const scaleY = nextHeight / originalHeight;

    state.rotationSnapshots.forEach((snapshot) => {
      if (snapshot.kind === 'line') {
        const nx1 = nextBounds.minX + (snapshot.x - original.minX) * scaleX;
        const ny1 = nextBounds.minY + (snapshot.y - original.minY) * scaleY;
        const nx2 = nextBounds.minX + (snapshot.x2 - original.minX) * scaleX;
        const ny2 = nextBounds.minY + (snapshot.y2 - original.minY) * scaleY;
        patches.push({
          type: 'updateShape',
          id: snapshot.id,
          updates: {
            x: nx1,
            y: ny1,
            x2: nx2,
            y2: ny2,
            width: Math.abs(nx2 - nx1),
            height: Math.abs(ny2 - ny1),
          },
        });
        return;
      }

      const originalLeft = snapshot.center.x - snapshot.width / 2;
      const originalTop = snapshot.center.y - snapshot.height / 2;
      const newLeft = nextBounds.minX + (originalLeft - original.minX) * scaleX;
      const newTop = nextBounds.minY + (originalTop - original.minY) * scaleY;
      const newWidth = Math.max(1, snapshot.width * scaleX);
      const newHeight = Math.max(1, snapshot.height * scaleY);

      patches.push({
        type: 'updateShape',
        id: snapshot.id,
        updates: {
          x: newLeft,
          y: newTop,
          width: newWidth,
          height: newHeight,
        },
      });
    });

    return { nextState: state, patches };
  }

  if (state.mode === 'rotating' && selectedIds.length === 1) {
    const shape = shapes.find((candidate) => candidate.id === selectedIds[0]);
    if (shape && !shape.locked) {
      const dx = worldPos.x - (shape.x + shape.width / 2);
      const dy = worldPos.y - (shape.y + shape.height / 2);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI) - 90;
      let newRotation = angle - state.rotationStartAngle;
      if (shiftKey) {
        newRotation = Math.round(newRotation / 15) * 15;
      }
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
      dragOffsetById: state.dragOffsetById,
      snapEnabled: pixelSnapEnabled,
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

  if (state.mode !== 'idle' && state.mode !== 'panning' && state.mode !== 'pivoting') {
    patches.push({ type: 'saveHistory' });
  }

  return {
    nextState: {
      ...createInteractionState(),
      selectionPivot: state.selectionPivot,
    },
    patches,
    marqueeRect: null,
    smartGuides: [],
  };
};

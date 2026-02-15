import type { Point } from '../../engine/types';

export type InteractionMode =
  | 'idle'
  | 'marquee'
  | 'dragging'
  | 'resizing'
  | 'rotating'
  | 'radius'
  | 'panning';

export type DragOffsetMap = Record<string, Point>;

export type InteractionState = {
  mode: InteractionMode;
  activeHandleId: string | null;
  dragOffsetById: DragOffsetMap;
  marqueeStart: Point | null;
  rotationStartAngle: number;
};

export const createInteractionState = (): InteractionState => ({
  mode: 'idle',
  activeHandleId: null,
  dragOffsetById: {},
  marqueeStart: null,
  rotationStartAngle: 0,
});

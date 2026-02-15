import type { Point } from '../../engine/types';

export type InteractionMode =
  | 'idle'
  | 'marquee'
  | 'dragging'
  | 'resizing'
  | 'rotating'
  | 'pivoting'
  | 'radius'
  | 'panning';

export type DragOffsetMap = Record<string, Point>;

export type RotationSnapshot =
  | {
      id: string;
      kind: 'shape';
      center: Point;
      width: number;
      height: number;
      rotation: number;
    }
  | {
      id: string;
      kind: 'line';
      rotation: number;
      x: number;
      y: number;
      x2: number;
      y2: number;
    };

export type InteractionState = {
  mode: InteractionMode;
  activeHandleId: string | null;
  dragOffsetById: DragOffsetMap;
  marqueeStart: Point | null;
  rotationStartAngle: number;
  rotationPivot: Point | null;
  selectionPivot: Point | null;
  multiBounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
  rotationSnapshots: RotationSnapshot[];
};

export const createInteractionState = (): InteractionState => ({
  mode: 'idle',
  activeHandleId: null,
  dragOffsetById: {},
  marqueeStart: null,
  rotationStartAngle: 0,
  rotationPivot: null,
  selectionPivot: null,
  multiBounds: null,
  rotationSnapshots: [],
});

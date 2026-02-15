import type { Point, Shape } from '../../engine/types';

import { getEdgeHandleAtPos, getHandleAtPos } from '../../utils/CommonFunctions';

import type { InteractionState } from './types';

export const createPointerDownState = ( state: InteractionState, mode: InteractionState['mode'], extra: Partial<InteractionState> = {}): InteractionState => ({
  ...state,
  mode,
  activeHandleId: null,
  dragOffsetById: {},
  marqueeStart: null,
  ...extra,
});

export const getPointerDownResizeHandleId = (
  worldPos: Point,
  selectedShape: Shape,
  zoom: number
): string | null => {
  const cornerOrEndpointHandle = getHandleAtPos(worldPos, selectedShape, zoom);
  if (cornerOrEndpointHandle) {
    return cornerOrEndpointHandle.id;
  }

  // Lines resize only from endpoints; body clicks should drag the line.
  if (selectedShape.type === 'line') {
    return null;
  }

  const edgeHandle = getEdgeHandleAtPos(worldPos, selectedShape, zoom);
  return edgeHandle?.id ?? null;
};

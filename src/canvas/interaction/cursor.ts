import type { Point, Shape } from '../../engine/types';

import { getEdgeHandleAtPos, getHandleAtPos, getRadiusHandleAtPos, getRotationHandleAtPos } from '../../utils/CommonFunctions';

type CursorInput = {
  mode: 'select' | 'pan' | 'pen' | 'line' | 'arrow';
  selectedShape: Shape | null;
  worldPos: Point;
  zoom: number;
};

export const getCanvasCursor = ({
  mode,
  selectedShape,
  worldPos,
  zoom,
}: CursorInput): string => {
  if (mode === 'pan') {
    return 'grab';
  }

  if (!selectedShape) {
    return 'default';
  }

  if (selectedShape.locked) {
    return 'not-allowed';
  }

  const rotationHandle = getRotationHandleAtPos(worldPos, selectedShape, zoom);
  const radiusHandle = getRadiusHandleAtPos(worldPos, selectedShape, zoom);
  const handle = getHandleAtPos(worldPos, selectedShape, zoom);
  const edgeHandle =
    selectedShape.type === 'line' || selectedShape.type === 'arrow'
      ? null
      : getEdgeHandleAtPos(worldPos, selectedShape, zoom);
  const threshold = 6 / zoom;

  if (rotationHandle) {
    return 'grab';
  }

  if (radiusHandle) {
    return 'pointer';
  }

  if (handle) {
    if (handle.id === 'nw' || handle.id === 'se') return 'nwse-resize';
    if (handle.id === 'ne' || handle.id === 'sw') return 'nesw-resize';
  }

  if (edgeHandle) {
    if (edgeHandle.id === 'e' || edgeHandle.id === 'w') return 'ew-resize';
    return 'ns-resize';
  }

  if (selectedShape.type !== 'line' && selectedShape.type !== 'arrow') {
    const isNearLeft = Math.abs(worldPos.x - selectedShape.x) < threshold;
    const isNearRight =
      Math.abs(worldPos.x - (selectedShape.x + selectedShape.width)) < threshold;
    const isNearTop = Math.abs(worldPos.y - selectedShape.y) < threshold;
    const isNearBottom =
      Math.abs(worldPos.y - (selectedShape.y + selectedShape.height)) < threshold;

    if (isNearLeft || isNearRight) return 'ew-resize';
    if (isNearTop || isNearBottom) return 'ns-resize';
  }

  return 'default';
};

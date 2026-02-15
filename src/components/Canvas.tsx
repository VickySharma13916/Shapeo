import React, { useEffect, useMemo, useRef, useState } from 'react';

import { useCamera } from '../hooks/useCamera';

import { useStore } from '../store/useStore';

import { screenToWorld } from '../engine/utils';
import type { Point, Shape } from '../engine/types';
import { type AlignmentGuide } from '../engine/smartGuides';

import { 
  handlePointerDown, handlePointerMove, handlePointerUp, type InteractionPatch, type MarqueeRect
} from '../canvas/interaction/handlers';
import { getCanvasCursor } from '../canvas/interaction/cursor';
import { createInteractionState, type InteractionState } from '../canvas/interaction/types';
import { drawScene } from '../canvas/render/drawScene';

const Canvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const interactionRef = useRef<InteractionState>(createInteractionState());
  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null);
  const [smartGuides, setSmartGuides] = useState<AlignmentGuide[]>([]);
  const [cursor, setCursor] = useState<string>('default');
  const [imageRenderTick, setImageRenderTick] = useState(0);

  const { camera } = useCamera(canvasRef);
  const {
    selectedIds, setSelectedIds, toggleSelection, updateShape, mode, theme, showGrid, pixelSnapEnabled, setCamera, saveHistory, currentPageId, pages, bringToFront,
  } = useStore();

  const shapes = useMemo(
    () => pages.find((page) => page.id === currentPageId)?.shapes || [],
    [pages, currentPageId]
  );
  const groups = useMemo(
    () => pages.find((page) => page.id === currentPageId)?.groups || [],
    [pages, currentPageId]
  );

  const applyPatches = (patches: InteractionPatch[]) => {
    patches.forEach((patch) => {
      switch (patch.type) {
        case 'updateShape':
          updateShape(patch.id, patch.updates);
          break;
        case 'setSelectedIds':
          setSelectedIds(patch.ids);
          break;
        case 'toggleSelection':
          toggleSelection(patch.id);
          break;
        case 'bringToFront':
          bringToFront();
          break;
        case 'setCamera':
          setCamera(patch.camera);
          break;
        case 'saveHistory':
          saveHistory();
          break;
        default:
          break;
      }
    });
  };

  const getWorldPos = (event: React.PointerEvent<HTMLCanvasElement>): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    return screenToWorld(
      { x: event.clientX - rect.left, y: event.clientY - rect.top },
      camera
    );
  };

  const handlePointerDownEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const worldPos = getWorldPos(event);
    if (!worldPos) {
      return;
    }

    const result = handlePointerDown({
      worldPos,
      shiftKey: event.shiftKey,
      camera,
      mode,
      shapes,
      selectedIds,
      state: interactionRef.current,
    });

    interactionRef.current = result.nextState;
    applyPatches(result.patches);

    if (result.marqueeRect !== undefined) {
      setMarqueeRect(result.marqueeRect ?? null);
    }
    if (result.smartGuides !== undefined) {
      setSmartGuides(result.smartGuides);
    }
  };

  const handlePointerMoveEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const worldPos = getWorldPos(event);
    if (!worldPos) {
      return;
    }

    const selectedShape: Shape | null =
      selectedIds.length === 1
        ? shapes.find((shape) => shape.id === selectedIds[0]) ?? null
        : null;

    const selectedShapes = shapes.filter((shape) => selectedIds.includes(shape.id));
    const multiSelectionCursor =
      selectedShapes.length > 1
        ? (() => {
            let minX = Infinity;
            let minY = Infinity;
            let maxX = -Infinity;
            let maxY = -Infinity;
            selectedShapes.forEach((shape) => {
              const bounds =
                shape.type === 'line'
                  ? {
                      minX: Math.min(shape.x, shape.x2),
                      minY: Math.min(shape.y, shape.y2),
                      maxX: Math.max(shape.x, shape.x2),
                      maxY: Math.max(shape.y, shape.y2),
                    }
                  : {
                      minX: Math.min(shape.x, shape.x + shape.width),
                      minY: Math.min(shape.y, shape.y + shape.height),
                      maxX: Math.max(shape.x, shape.x + shape.width),
                      maxY: Math.max(shape.y, shape.y + shape.height),
                    };
              minX = Math.min(minX, bounds.minX);
              minY = Math.min(minY, bounds.minY);
              maxX = Math.max(maxX, bounds.maxX);
              maxY = Math.max(maxY, bounds.maxY);
            });
            const handleX = (minX + maxX) / 2;
            const handleY = minY - 30 / camera.zoom;
            const pivot = interactionRef.current.selectionPivot ?? {
              x: (minX + maxX) / 2,
              y: (minY + maxY) / 2,
            };
            const threshold = 10 / camera.zoom;
            const cornerThreshold = 8 / camera.zoom;
            const corners = [
              { x: minX, y: minY, cursor: 'nwse-resize' },
              { x: maxX, y: minY, cursor: 'nesw-resize' },
              { x: minX, y: maxY, cursor: 'nesw-resize' },
              { x: maxX, y: maxY, cursor: 'nwse-resize' },
            ];
            const cornerHit = corners.find(
              (c) =>
                Math.abs(worldPos.x - c.x) <= cornerThreshold &&
                Math.abs(worldPos.y - c.y) <= cornerThreshold
            );
            if (cornerHit) return cornerHit.cursor;
            const isOverRotateHandle =
              Math.abs(worldPos.x - handleX) <= threshold &&
              Math.abs(worldPos.y - handleY) <= threshold;
            const isOverPivot =
              Math.abs(worldPos.x - pivot.x) <= threshold &&
              Math.abs(worldPos.y - pivot.y) <= threshold;
            if (isOverPivot) return 'move';
            return isOverRotateHandle ? 'grab' : 'default';
          })()
        : null;

    setCursor(
      multiSelectionCursor ??
        getCanvasCursor({
          mode,
          selectedShape,
          worldPos,
          zoom: camera.zoom,
        })
    );

    const result = handlePointerMove({
      worldPos,
      movement: { x: event.movementX, y: event.movementY },
      shiftKey: event.shiftKey,
      camera,
      mode,
      pixelSnapEnabled,
      shapes,
      selectedIds,
      state: interactionRef.current,
    });

    interactionRef.current = result.nextState;
    applyPatches(result.patches);

    if (result.marqueeRect !== undefined) {
      setMarqueeRect(result.marqueeRect ?? null);
    }
    if (result.smartGuides !== undefined) {
      setSmartGuides(result.smartGuides);
    }
  };

  const handlePointerUpEvent = () => {
    const result = handlePointerUp({ state: interactionRef.current });

    interactionRef.current = result.nextState;
    applyPatches(result.patches);

    if (result.marqueeRect !== undefined) {
      setMarqueeRect(result.marqueeRect ?? null);
    }
    if (result.smartGuides !== undefined) {
      setSmartGuides(result.smartGuides);
    }
  };

  useEffect(() => {
    const handleImageLoaded = () => {
      setImageRenderTick((value) => value + 1);
    };
    window.addEventListener('shapeo:image-loaded', handleImageLoaded);
    return () => window.removeEventListener('shapeo:image-loaded', handleImageLoaded);
  }, []);

  useEffect(() => {
    if (selectedIds.length <= 1) {
      interactionRef.current.selectionPivot = null;
    }
  }, [selectedIds]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;

    drawScene({
      canvas,
      ctx,
      dpr,
      camera,
      shapes,
      groups,
      selectedIds,
      showGrid,
      marqueeRect,
      smartGuides,
      theme,
      selectionPivot: interactionRef.current.selectionPivot,
    });
  }, [camera, shapes, groups, selectedIds, showGrid, marqueeRect, smartGuides, imageRenderTick, theme]);

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDownEvent}
      onPointerMove={handlePointerMoveEvent}
      onPointerUp={handlePointerUpEvent}
      onPointerLeave={handlePointerUpEvent}
      className="w-screen h-screen fixed block touch-none"
      style={{ cursor }}
    />
  );
};

export default Canvas;

import React, { useRef, useEffect, useState, useMemo } from 'react';

import { useCamera } from '../hooks/useCamera';

import { useStore } from '../store/useStore';

import { GRID_SIZE, MIN_SIZE } from '../utils/Common';

import { screenToWorld, isPointInShape } from '../engine/utils';
import type { Point, Shape } from '../engine/types';

const Canvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef(false);
  const isDraggingRadiusRef = useRef(false);
  const dragOffset = useRef<{ [key: string]: { x: number; y: number } }>({});
  const activeHandleRef = useRef<string | null>(null);
  const isDraggingCanvasRef = useRef(false);
  
  const marqueeStartRef = useRef<{ x: number; y: number } | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<{ x: number, y: number, w: number, h: number } | null>(null);

  const snap = (val: number) => Math.round(val / GRID_SIZE) * GRID_SIZE;

  const { camera } = useCamera(canvasRef);
  const { 
    selectedIds, setSelectedIds, toggleSelection, updateShape, mode,
    showGrid, setCamera, saveHistory, currentPageId, pages, bringToFront 
  } = useStore();

  const shapes = useMemo(
    () => pages.find(p => p.id === currentPageId)?.shapes || [],
    [pages, currentPageId]
  );

  const [cursor, setCursor] = useState<string>('default');

  // Helper to find radius handles in any of the 4 corners
  const getRadiusHandleAtPos = (worldPos: Point, shape: Shape, zoom: number) => {
    const rMargin = Math.min(shape.width, shape.height, 64 / zoom) * 0.15;
    const size = 12 / zoom;
    
    const positions = [
      { id: 'tl', x: shape.x + rMargin, y: shape.y + rMargin },
      { id: 'tr', x: shape.x + shape.width - rMargin, y: shape.y + rMargin },
      { id: 'bl', x: shape.x + rMargin, y: shape.y + shape.height - rMargin },
      { id: 'br', x: shape.x + shape.width - rMargin, y: shape.y + shape.height - rMargin }
    ];
    
    return positions.find(p => 
      Math.abs(worldPos.x - p.x) < size && Math.abs(worldPos.y - p.y) < size
    );
  };

  const updateCursor = (worldPos: Point) => {
    if (mode === 'pan') {
      setCursor('grab');
      return;
    }

    if (selectedIds.length === 1) {
      const shape = shapes.find(s => s.id === selectedIds[0]);
      if (shape) {
        const handle = getHandleAtPos(worldPos, shape, camera.zoom);
        const threshold = 4 / camera.zoom;
        
        if (handle) {
          if (handle.id === 'nw' || handle.id === 'se') setCursor('nwse-resize');
          else if (handle.id === 'ne' || handle.id === 'sw') setCursor('nesw-resize');
          return;
        }

        // Edge detection for N/S/E/W resizing
        const isNearLeft = Math.abs(worldPos.x - shape.x) < threshold;
        const isNearRight = Math.abs(worldPos.x - (shape.x + shape.width)) < threshold;
        const isNearTop = Math.abs(worldPos.y - shape.y) < threshold;
        const isNearBottom = Math.abs(worldPos.y - (shape.y + shape.height)) < threshold;

        if (isNearLeft || isNearRight) setCursor('ew-resize');
        else if (isNearTop || isNearBottom) setCursor('ns-resize');
        else setCursor('default');
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const worldPos = screenToWorld({ x: e.clientX - rect.left, y: e.clientY - rect.top }, camera);

    if (mode === 'pan') {
      isDraggingCanvasRef.current = true;
      return;
    }

    if (selectedIds.length === 1) {
      const selectedShape = shapes.find(s => s.id === selectedIds[0]);
      if (selectedShape) {
        // Check for Radius Handle First
        if (getRadiusHandleAtPos(worldPos, selectedShape, camera.zoom)) {
          isDraggingRadiusRef.current = true;
          return;
        }

        const handle = getHandleAtPos(worldPos, selectedShape, camera.zoom);
        if (handle) {
          activeHandleRef.current = handle.id;
          return;
        }
      }
    }

    const hit = [...shapes].reverse().find(s => isPointInShape(worldPos, s));

    if (hit) {
      if (e.shiftKey) toggleSelection(hit.id);
      else if (!selectedIds.includes(hit.id)) setSelectedIds([hit.id]);

      bringToFront(); 
      isDraggingRef.current = true;

      const currentSelected = selectedIds.includes(hit.id) ? selectedIds : [hit.id];
      currentSelected.forEach(id => {
        const s = shapes.find(shape => shape.id === id);
        if (s) dragOffset.current[id] = { x: worldPos.x - s.x, y: worldPos.y - s.y };
      });
    } else {
      if (!e.shiftKey) setSelectedIds([]);
      marqueeStartRef.current = worldPos;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const worldPos = screenToWorld({ x: e.clientX - rect.left, y: e.clientY - rect.top }, camera);

    updateCursor(worldPos);

    if (mode === 'pan' && isDraggingCanvasRef.current) {
      setCamera({ ...camera, x: camera.x + e.movementX, y: camera.y + e.movementY });
      return;
    }

    if (marqueeStartRef.current) {
      const start = marqueeStartRef.current;
      const currentMarquee = {
        x: Math.min(start.x, worldPos.x),
        y: Math.min(start.y, worldPos.y),
        w: Math.abs(worldPos.x - start.x),
        h: Math.abs(worldPos.y - start.y)
      };
      setMarqueeRect(currentMarquee);
      const hits = shapes.filter(s => 
        s.x < currentMarquee.x + currentMarquee.w &&
        s.x + s.width > currentMarquee.x &&
        s.y < currentMarquee.y + currentMarquee.h &&
        s.y + s.height > currentMarquee.y
      ).map(s => s.id);
      setSelectedIds(hits);
      return;
    }

    // Handle Radius Dragging
    if (isDraggingRadiusRef.current && selectedIds.length === 1) {
      const shape = shapes.find(s => s.id === selectedIds[0]);
      if (shape) {
        // Calculate distance from the nearest edge to the mouse
        const dx = Math.min(Math.abs(worldPos.x - shape.x), Math.abs(worldPos.x - (shape.x + shape.width)));
        const dy = Math.min(Math.abs(worldPos.y - shape.y), Math.abs(worldPos.y - (shape.y + shape.height)));
        
        // Figma logic: Use the smaller of the two distances as the new radius
        const newRadius = Math.min(dx, dy, shape.width / 2, shape.height / 2);
        updateShape(shape.id, { cornerRadius: Math.max(0, Math.round(newRadius)) });
      }
      return;
    }

    // Handle Resize
    if (activeHandleRef.current && selectedIds.length === 1) {
      const shape = shapes.find(s => s.id === selectedIds[0]);
      if (!shape) return;
      let { x, y, width, height } = shape;
      if (activeHandleRef.current.includes('e')) width = Math.max(MIN_SIZE, worldPos.x - shape.x);
      if (activeHandleRef.current.includes('w')) { x = worldPos.x; width = shape.x + shape.width - worldPos.x; }
      if (activeHandleRef.current.includes('s')) height = Math.max(MIN_SIZE, worldPos.y - shape.y);
      if (activeHandleRef.current.includes('n')) { y = worldPos.y; height = shape.y + shape.height - worldPos.y; }
      updateShape(selectedIds[0], { x, y, width, height });
      return;
    }

    // Handle Dragging
    if (isDraggingRef.current) {
      selectedIds.forEach(id => {
        const offset = dragOffset.current[id];
        if (offset) {
          updateShape(id, { x: snap(worldPos.x - offset.x), y: snap(worldPos.y - offset.y) });
        }
      });
    }
  };

  const handleMouseUp = () => {
    if (isDraggingRef.current || activeHandleRef.current || marqueeStartRef.current || isDraggingRadiusRef.current) {
      saveHistory(); 
    }
    isDraggingRef.current = false;
    isDraggingRadiusRef.current = false;
    activeHandleRef.current = null;
    isDraggingCanvasRef.current = false;
    marqueeStartRef.current = null;
    setMarqueeRect(null);
    dragOffset.current = {};
  };

  const getHandleAtPos = (worldPos: { x: number; y: number }, shape: Shape, zoom: number) => {
    const handleSize = 10 / zoom;
    const handles = [
      { id: 'nw', x: shape.x, y: shape.y },
      { id: 'ne', x: shape.x + shape.width, y: shape.y },
      { id: 'sw', x: shape.x, y: shape.y + shape.height },
      { id: 'se', x: shape.x + shape.width, y: shape.y + shape.height },
    ];
    return handles.find(h => 
      worldPos.x >= h.x - handleSize/2 && worldPos.x <= h.x + handleSize/2 &&
      worldPos.y >= h.y - handleSize/2 && worldPos.y <= h.y + handleSize/2
    );
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);

    const render = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); 
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      
      ctx.save();
      ctx.translate(camera.x, camera.y);
      ctx.scale(camera.zoom, camera.zoom);

      // Render Grid
      if (showGrid) {
        const width = canvas.width / (camera.zoom * dpr);
        const height = canvas.height / (camera.zoom * dpr);
        const startX = Math.floor(-camera.x / camera.zoom / GRID_SIZE) * GRID_SIZE;
        const startY = Math.floor(-camera.y / camera.zoom / GRID_SIZE) * GRID_SIZE;
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'; 
        ctx.lineWidth = 1 / camera.zoom;
        for (let x = startX; x < startX + width + GRID_SIZE * 2; x += GRID_SIZE) {
          ctx.moveTo(x, startY); ctx.lineTo(x, startY + height + GRID_SIZE * 2);
        }
        for (let y = startY; y < startY + height + GRID_SIZE * 2; y += GRID_SIZE) {
          ctx.moveTo(startX, y); ctx.lineTo(startX + width + GRID_SIZE * 2, y);
        }
        ctx.stroke();
      }

      shapes.forEach(shape => {
        ctx.save();
        ctx.globalAlpha = shape.opacity ?? 1;

        if (shape.shadow?.enabled) {
          ctx.shadowColor = shape.shadow.color;
          ctx.shadowBlur = shape.shadow.blur;
          ctx.shadowOffsetX = shape.shadow.x;
          ctx.shadowOffsetY = shape.shadow.y;
        }

        ctx.beginPath();
        const radius = shape.cornerRadius ?? 0;
        if (radius > 0) ctx.roundRect(shape.x, shape.y, shape.width, shape.height, radius);
        else ctx.rect(shape.x, shape.y, shape.width, shape.height);

        if (shape.type === 'image') {
          // Check if we need to load the image into a cached element
          if (!shape.imageElement && shape.src) {
            const img = new Image();
            img.src = shape.src;
            img.onload = () => {
              (shape as any).imageElement = img;
              // No extra logic needed, the next frame will pick up the element
            };
          }

          const imgElement = (shape as any).imageElement;
          if (imgElement instanceof HTMLImageElement && imgElement.complete) {
            ctx.save();
            ctx.clip();
            ctx.drawImage(imgElement, shape.x, shape.y, shape.width, shape.height);
            ctx.restore();
          } else {
            ctx.fillStyle = '#1a1a1a'; 
            ctx.fill();
          }
        } else {
          ctx.fillStyle = shape.fill; ctx.fill();
        }

        if (shape.strokeWidth > 0) {
          ctx.strokeStyle = shape.stroke;
          ctx.lineWidth = shape.strokeWidth;
          ctx.stroke();
        }

        // Selection Visuals
        if (selectedIds.includes(shape.id)) {
          const fontSize = 11 / camera.zoom;
          ctx.font = `600 ${fontSize}px Inter, sans-serif`; // Semi-bold for legibility
          
          const label = `${Math.round(shape.width)} × ${Math.round(shape.height)}`;
          const textWidth = ctx.measureText(label).width;
          
          // Position label 12px below the shape
          const labelY = shape.y + shape.height + (12 / camera.zoom);
          const labelX = shape.x + (shape.width / 2) - (textWidth / 2);
          const paddingH = 6 / camera.zoom;
          const paddingV = 3 / camera.zoom;

          // Background Pill
          ctx.beginPath();
          ctx.roundRect(
            labelX - paddingH, 
            labelY - fontSize, 
            textWidth + (paddingH * 2), 
            fontSize + (paddingV * 2), 
            4 / camera.zoom
          );
          ctx.fillStyle = '#18A0FB';
          ctx.fill();

          // Label Text
          ctx.fillStyle = 'white';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, labelX, labelY - (fontSize / 2) + paddingV);

          if (selectedIds.includes(shape.id) && selectedIds.length === 1) {
            const rHandleSize = 4 / camera.zoom;
            // Set a maximum margin so handles don't overlap in small shapes
            const rMargin = Math.min(shape.width, shape.height, 64 / camera.zoom) * 0.15;
            const squareSize = 8 / camera.zoom;
            
            // 1. Draw the main selection bounding box
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 1 / camera.zoom;
            ctx.beginPath();
            ctx.rect(shape.x, shape.y, shape.width, shape.height);
            ctx.stroke();
            
            // 2. Define the 4 corners for the square resize handles
            const corners = [
              { x: shape.x, y: shape.y },               // Top-Left
              { x: shape.x + shape.width, y: shape.y }, // Top-Right
              { x: shape.x, y: shape.y + shape.height }, // Bottom-Left
              { x: shape.x + shape.width, y: shape.y + shape.height } // Bottom-Right
            ];
            
            ctx.fillStyle = 'white';
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 1 / camera.zoom;
            
            corners.forEach(c => {
              ctx.beginPath();
              ctx.rect(c.x - squareSize / 2, c.y - squareSize / 2, squareSize, squareSize);
              ctx.fill();
              ctx.stroke();
            });
            
            // 3. Draw Radius handles ONLY inside the shape
            // We adjust the direction of the margin based on which corner we are in
            const radiusPositions = [
              { x: shape.x + rMargin, y: shape.y + rMargin },               // Top-Left (Move In)
              { x: shape.x + shape.width - rMargin, y: shape.y + rMargin }, // Top-Right (Move Left/Down)
              { x: shape.x + rMargin, y: shape.y + shape.height - rMargin }, // Bottom-Left (Move Right/Up)
              { x: shape.x + shape.width - rMargin, y: shape.y + shape.height - rMargin } // Bottom-Right (Move Left/Up)
            ];
            
            radiusPositions.forEach(p => {
              ctx.beginPath();
              ctx.arc(p.x, p.y, rHandleSize, 0, Math.PI * 2);
              ctx.fillStyle = 'white';
              ctx.fill();
              ctx.stroke();
            });

            // 4. Dimensions Label (Figma-style Blue Pill)
            const fontSize = 11 / camera.zoom;
            ctx.font = `600 ${fontSize}px Inter, sans-serif`;
            const label = `${Math.round(shape.width)} × ${Math.round(shape.height)}`;
            const textWidth = ctx.measureText(label).width;
            
            const labelY = shape.y + shape.height + (12 / camera.zoom);
            const labelX = shape.x + (shape.width / 2) - (textWidth / 2);
            const paddingH = 6 / camera.zoom;
            const paddingV = 3 / camera.zoom;

            ctx.beginPath();
            ctx.roundRect(
                labelX - paddingH, 
                labelY - fontSize, 
                textWidth + (paddingH * 2), 
                fontSize + (paddingV * 2), 
                4 / camera.zoom
            );
            ctx.fillStyle = '#3b82f6';
            ctx.fill();

            ctx.fillStyle = 'white';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, labelX, labelY - (fontSize / 2) + paddingV);
          }
        }
        ctx.restore();
      });

      if (marqueeRect) {
        ctx.strokeStyle = '#3b82f6';
        ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
        ctx.lineWidth = 1 / camera.zoom;
        ctx.fillRect(marqueeRect.x, marqueeRect.y, marqueeRect.w, marqueeRect.h);
        ctx.strokeRect(marqueeRect.x, marqueeRect.y, marqueeRect.w, marqueeRect.h);
      }
      ctx.restore();
    };
    render();
  }, [camera, shapes, selectedIds, showGrid, marqueeRect]);

  return (
    <canvas
      ref={canvasRef} 
      onPointerDown={handleMouseDown}
      onPointerMove={handleMouseMove}
      onPointerUp={handleMouseUp}
      onPointerLeave={handleMouseUp}
      className='w-screen h-screen fixed block touch-none'
      style={{ cursor }}
    />
  );
};

export default Canvas;

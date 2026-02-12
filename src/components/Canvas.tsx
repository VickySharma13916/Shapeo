import React, { useRef, useEffect, useState, useMemo } from 'react';

import { useCamera } from '../hooks/useCamera';

import { useStore } from '../store/useStore';

import { GRID_SIZE, MIN_SIZE } from '../utils/Common';

import { screenToWorld, isPointInShape } from '../engine/utils';
import type { Point } from '../engine/types';
import { findSmartGuides, drawSmartGuides, type AlignmentGuide } from '../engine/smartGuides';

import { getEdgeHandleAtPos, getHandleAtPos, getRadiusHandleAtPos, getRotationHandleAtPos } from '../utils/CommonFunctions';

const Canvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef(false);
  const isDraggingRadiusRef = useRef(false);
  const isDraggingRotationRef = useRef(false);
  const rotationStartAngleRef = useRef(0);
  const dragOffset = useRef<{ [key: string]: { x: number; y: number } }>({});
  const activeHandleRef = useRef<string | null>(null);
  const isDraggingCanvasRef = useRef(false);
  
  const marqueeStartRef = useRef<{ x: number; y: number } | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
  const [smartGuides, setSmartGuides] = useState<AlignmentGuide[]>([]);

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

  const updateCursor = (worldPos: Point) => {
    if (mode === 'pan') {
      setCursor('grab');
      return;
    }

    if (selectedIds.length === 1) {
      const shape = shapes.find(s => s.id === selectedIds[0]);
      if (shape) {
        const rotationHandle = getRotationHandleAtPos(worldPos, shape, camera.zoom);
        const radiusHandle = getRadiusHandleAtPos(worldPos, shape, camera.zoom);
        const handle = getHandleAtPos(worldPos, shape, camera.zoom);
        const edgeHandle = getEdgeHandleAtPos(worldPos, shape, camera.zoom);
        const threshold = 6 / camera.zoom;
        
        if (rotationHandle) {
          setCursor('grab');
          return;
        }
        
        if (radiusHandle) {
          setCursor('pointer');
          return;
        }

        if (handle) {
          if (handle.id === 'nw' || handle.id === 'se') setCursor('nwse-resize');
          else if (handle.id === 'ne' || handle.id === 'sw') setCursor('nesw-resize');
          return;
        }

        if (edgeHandle) {
          if (edgeHandle.id === 'e' || edgeHandle.id === 'w') setCursor('ew-resize');
          else setCursor('ns-resize');
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
        // Rotation handle gets highest priority
        if (getRotationHandleAtPos(worldPos, selectedShape, camera.zoom)) {
          isDraggingRotationRef.current = true;
          const dx = worldPos.x - (selectedShape.x + selectedShape.width / 2);
          const dy = worldPos.y - (selectedShape.y + selectedShape.height / 2);
          rotationStartAngleRef.current = Math.atan2(dy, dx) * (180 / Math.PI) - 90 - (selectedShape.rotation || 0);
          return;
        }
        
        // Radius handles get priority when directly hit
        if (getRadiusHandleAtPos(worldPos, selectedShape, camera.zoom)) {
          isDraggingRadiusRef.current = true;
          return;
        }

        const handle = getHandleAtPos(worldPos, selectedShape, camera.zoom);
        if (handle) {
          activeHandleRef.current = handle.id;
          return;
        }

        const edgeHandle = getEdgeHandleAtPos(worldPos, selectedShape, camera.zoom);
        if (edgeHandle) {
          activeHandleRef.current = edgeHandle.id;
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

    // Handle Rotation Dragging
    if (isDraggingRotationRef.current && selectedIds.length === 1) {
      const shape = shapes.find(s => s.id === selectedIds[0]);
      if (shape) {
        const dx = worldPos.x - (shape.x + shape.width / 2);
        const dy = worldPos.y - (shape.y + shape.height / 2);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI) - 90;
        const newRotation = angle - rotationStartAngleRef.current;
        updateShape(shape.id, { rotation: Math.round(newRotation) });
      }
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
      
      if (shape.type === 'line') {
        if (activeHandleRef.current === 'start') {
          updateShape(shape.id, { x: snap(worldPos.x), y: snap(worldPos.y) });
        } else if (activeHandleRef.current === 'end') {
          updateShape((shape as any).id, { x2: snap(worldPos.x), y2: snap(worldPos.y) });
        }
        return;
      }

      let { x, y, width, height } = shape;
      const aspectRatio = shape.width / shape.height;
      
      // Calculate new dimensions based on handle
      if (activeHandleRef.current.includes('e')) width = Math.max(MIN_SIZE, worldPos.x - shape.x);
      if (activeHandleRef.current.includes('w')) { x = worldPos.x; width = shape.x + shape.width - worldPos.x; }
      if (activeHandleRef.current.includes('s')) height = Math.max(MIN_SIZE, worldPos.y - shape.y);
      if (activeHandleRef.current.includes('n')) { y = worldPos.y; height = shape.y + shape.height - worldPos.y; }
      
      // Apply aspect ratio constraint if locked

      if (shape.aspectRatioLocked) {
        const handle = activeHandleRef.current;
        
        // Corner handles: use both dimensions, prefer the larger change
        if (handle.length === 2) { // Corner handles like 'ne', 'se', 'sw', 'nw'
          const widthChange = Math.abs(width - shape.width);
          const heightChange = Math.abs(height - shape.height);
          
          if (widthChange > heightChange) {
            // Width changed more, adjust height
            const newHeight = width / aspectRatio;
            if (handle.includes('n')) {
              y = shape.y + shape.height - newHeight;
            }
            height = newHeight;
          } else {
            // Height changed more, adjust width
            const newWidth = height * aspectRatio;
            if (handle.includes('w')) {
              x = shape.x + shape.width - newWidth;
            }
            width = newWidth;
          }
        } else {
          // Edge handles: adjust the other dimension
          if (handle.includes('e') || handle.includes('w')) {
            // Horizontal edge: adjust height
            const newHeight = width / aspectRatio;
            height = newHeight;
          } else if (handle.includes('n') || handle.includes('s')) {
            // Vertical edge: adjust width
            const newWidth = height * aspectRatio;
            width = newWidth;
          }
        }
      }
      
      updateShape(selectedIds[0], { x, y, width, height });
      return;
    }

    // Handle Dragging with Smart Guides
    if (isDraggingRef.current) {
      const draggedShapes = shapes.filter(s => selectedIds.includes(s.id));
      
     if (draggedShapes.length > 0) {
        // Calculate potential new positions
        const primaryShape = draggedShapes[0];
        const offset = dragOffset.current[primaryShape.id];
        
        if (offset) {
          const baseX = worldPos.x - offset.x;
          const baseY = worldPos.y - offset.y;
          
          // Create temporary shapes at new positions for snap detection
          const tempShapes = draggedShapes.map(shape => ({
            ...shape,
            x: shape === primaryShape ? baseX : shape.x + (baseX - primaryShape.x),
            y: shape === primaryShape ? baseY : shape.y + (baseY - primaryShape.y),
          }));
          
          // Find smart guides and snap offset
          const { guides, snapOffset } = findSmartGuides(tempShapes, shapes);
          
          // Apply positions with snap offset
          selectedIds.forEach(id => {
            const shape = shapes.find(s => s.id === id);
            const dragOffset_val = dragOffset.current[id];
            if (dragOffset_val && shape) {
              const newX = worldPos.x - dragOffset_val.x + snapOffset.x;
              const newY = worldPos.y - dragOffset_val.y + snapOffset.y;
              updateShape(id, { x: snap(newX), y: snap(newY) });
            }
          });
          
          // Update smart guides display
          setSmartGuides(guides);
        }
      }
    }
  };

  const handleMouseUp = () => {
    if (isDraggingRef.current || activeHandleRef.current || marqueeStartRef.current || isDraggingRadiusRef.current || isDraggingRotationRef.current) {
      saveHistory(); 
    }
    isDraggingRef.current = false;
    isDraggingRadiusRef.current = false;
    isDraggingRotationRef.current = false;
    activeHandleRef.current = null;
    isDraggingCanvasRef.current = false;
    marqueeStartRef.current = null;
    setMarqueeRect(null);
    setSmartGuides([]); // Clear smart guides
    dragOffset.current = {};
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

        // Apply rotation transform
        if (shape.rotation && shape.rotation !== 0) {
          const centerX = shape.x + shape.width / 2;
          const centerY = shape.y + shape.height / 2;
          ctx.translate(centerX, centerY);
          ctx.rotate((shape.rotation * Math.PI) / 180);
          ctx.translate(-centerX, -centerY);
        }

        if (shape.shadow?.enabled) {
          ctx.shadowColor = shape.shadow.color;
          ctx.shadowBlur = shape.shadow.blur;
          ctx.shadowOffsetX = shape.shadow.x;
          ctx.shadowOffsetY = shape.shadow.y;
        }

        ctx.beginPath();
        
        // Shape-specific rendering
        if (shape.type === 'line') {
          ctx.moveTo(shape.x, shape.y);
          ctx.lineTo(shape.x2, shape.y2);
          if (shape.lineCap) ctx.lineCap = shape.lineCap;
          
          if (shape.strokeWidth > 0) {
            ctx.strokeStyle = shape.stroke;
            ctx.lineWidth = shape.strokeWidth;
            ctx.stroke();
          }
        } else if (shape.type === 'circle' || shape.type === 'ellipse') {
          const centerX = shape.x + shape.width / 2;
          const centerY = shape.y + shape.height / 2;
          const rx = Math.abs(shape.width / 2);
          const ry = Math.abs(shape.height / 2);
          
          ctx.ellipse(centerX, centerY, rx, ry, 0, 0, Math.PI * 2);
          ctx.fillStyle = shape.fill;
          ctx.fill();
          
          if (shape.strokeWidth > 0) {
            ctx.strokeStyle = shape.stroke;
            ctx.lineWidth = shape.strokeWidth;
            ctx.stroke();
          }
        } else {
          // Rectangle and Image shapes
          const radius = shape.cornerRadius ?? 0;
          if (radius > 0) ctx.roundRect(shape.x, shape.y, shape.width, shape.height, radius);
          else ctx.rect(shape.x, shape.y, shape.width, shape.height);

          if (shape.type === 'image') {
            if (!shape.imageElement && shape.src) {
              const img = new Image();
              img.src = shape.src;
              img.onload = () => { shape.imageElement = img; };
            }

            const imgElement = shape.imageElement;
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
            ctx.fillStyle = shape.fill; 
            ctx.fill();
          }

          if (shape.strokeWidth > 0) {
            ctx.strokeStyle = shape.stroke;
            ctx.lineWidth = shape.strokeWidth;
            ctx.stroke();
          }
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
            const handleSize = 8 / camera.zoom;
            const rotationHandleDistance = 30 / camera.zoom;
            const rotationHandleSize = 5 / camera.zoom;
            
            // Shape-specific selection handles
            if (shape.type === 'line') {
              // LINE: Show only endpoint handles
              ctx.strokeStyle = '#3b82f6';
              ctx.lineWidth = 1.5 / camera.zoom;
              
              // Draw line connecting endpoints for visual feedback
              ctx.beginPath();
              ctx.moveTo(shape.x, shape.y);
              ctx.lineTo(shape.x2, shape.y2);
              ctx.stroke();
              
              // Endpoint handles
              const endpoints = [
                { x: shape.x, y: shape.y },
                { x: shape.x2, y: shape.y2 }
              ];
              
              ctx.fillStyle = 'white';
              ctx.strokeStyle = '#3b82f6';
              ctx.lineWidth = 1 / camera.zoom;
              
              endpoints.forEach(point => {
                ctx.beginPath();
                ctx.rect(point.x - handleSize / 2, point.y - handleSize / 2, handleSize, handleSize);
                ctx.fill();
                ctx.stroke();
              });
              
            } else if (shape.type === 'ellipse') {
              // ELLIPSE: Show edge handles at cardinal points
              ctx.strokeStyle = '#3b82f6';
              ctx.lineWidth = 1 / camera.zoom;
              
              // Draw selection outline
              const centerX = shape.x + shape.width / 2;
              const centerY = shape.y + shape.height / 2;
              ctx.beginPath();
              ctx.ellipse(centerX, centerY, shape.rx, shape.ry, 0, 0, Math.PI * 2);
              ctx.stroke();
              
              // Edge handles at cardinal points (N, S, E, W)
              const edgePoints = [
                { x: centerX, y: centerY - shape.ry }, // Top
                { x: centerX, y: centerY + shape.ry }, // Bottom
                { x: centerX - shape.rx, y: centerY }, // Left
                { x: centerX + shape.rx, y: centerY }, // Right
              ];
              
              ctx.fillStyle = 'white';
              ctx.strokeStyle = '#3b82f6';
              
              edgePoints.forEach(point => {
                ctx.beginPath();
                ctx.arc(point.x, point.y, handleSize / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
              });
              
              // Corner handles for bounding box
              const corners = [
                { x: shape.x, y: shape.y },
                { x: shape.x + shape.width, y: shape.y },
                { x: shape.x, y: shape.y + shape.height },
                { x: shape.x + shape.width, y: shape.y + shape.height }
              ];
              
              corners.forEach(c => {
                ctx.beginPath();
                ctx.rect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
                ctx.fill();
                ctx.stroke();
              });
              
              // Rotation handle
              const handleX = shape.x + shape.width / 2;
              const handleY = shape.y - rotationHandleDistance;
              
              ctx.beginPath();
              ctx.moveTo(handleX, shape.y);
              ctx.lineTo(handleX, handleY);
              ctx.strokeStyle = '#3b82f6';
              ctx.lineWidth = 1.5 / camera.zoom;
              ctx.stroke();
              
              ctx.beginPath();
              ctx.arc(handleX, handleY, rotationHandleSize, 0, Math.PI * 2);
              ctx.fillStyle = 'white';
              ctx.strokeStyle = '#3b82f6';
              ctx.fill();
              ctx.stroke();
              
            } else {
              // RECTANGLE, CIRCLE, IMAGE: Show corner handles and rotation
              const rHandleSize = 4 / camera.zoom;
              const baseMargin = Math.min(shape.width, shape.height, 64 / camera.zoom) * 0.15;
              const rMargin = Math.max(baseMargin, 12 / camera.zoom);
              
              // Selection bounding box
              ctx.strokeStyle = '#3b82f6';
              ctx.lineWidth = 1 / camera.zoom;
              ctx.beginPath();
              ctx.rect(shape.x, shape.y, shape.width, shape.height);
              ctx.stroke();
              
              // Corner resize handles
              const corners = [
                { x: shape.x, y: shape.y },
                { x: shape.x + shape.width, y: shape.y },
                { x: shape.x, y: shape.y + shape.height },
                { x: shape.x + shape.width, y: shape.y + shape.height }
              ];
              
              ctx.fillStyle = 'white';
              ctx.strokeStyle = '#3b82f6';
              ctx.lineWidth = 1 / camera.zoom;
              
              corners.forEach(c => {
                ctx.beginPath();
                ctx.rect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
                ctx.fill();
                ctx.stroke();
              });
              
              // Radius handles (for rectangles)
              if (shape.type === 'rect') {
                const radiusPositions = [
                  { x: shape.x + rMargin, y: shape.y + rMargin },
                  { x: shape.x + shape.width - rMargin, y: shape.y + rMargin },
                  { x: shape.x + rMargin, y: shape.y + shape.height - rMargin },
                  { x: shape.x + shape.width - rMargin, y: shape.y + shape.height - rMargin }
                ];
                
                radiusPositions.forEach(p => {
                  ctx.beginPath();
                  ctx.arc(p.x, p.y, rHandleSize, 0, Math.PI * 2);
                  ctx.fillStyle = 'white';
                  ctx.fill();
                  ctx.stroke();
                });
              }
              
              // Rotation handle
              const handleX = shape.x + shape.width / 2;
              const handleY = shape.y - rotationHandleDistance;
              
              ctx.beginPath();
              ctx.moveTo(handleX, shape.y);
              ctx.lineTo(handleX, handleY);
              ctx.strokeStyle = '#3b82f6';
              ctx.lineWidth = 1.5 / camera.zoom;
              ctx.stroke();
              
              ctx.beginPath();
              ctx.arc(handleX, handleY, rotationHandleSize, 0, Math.PI * 2);
              ctx.fillStyle = 'white';
              ctx.strokeStyle = '#3b82f6';
              ctx.lineWidth = 1.5 / camera.zoom;
              ctx.fill();
              ctx.stroke();
            }

            // Dimensions Label (for all shapes)
            const fontSize = 11 / camera.zoom;
            ctx.font = `600 ${fontSize}px Inter, sans-serif`;
            
            let label: string;
            let labelY: number;
            let labelX: number;
            
            if (shape.type === 'line') {
              // For lines, show actual length
              const length = Math.sqrt(Math.pow(shape.x2 - shape.x, 2) + Math.pow(shape.y2 - shape.y, 2));
              label = `${Math.round(length)}`;
              const midX = (shape.x + shape.x2) / 2;
              const midY = (shape.y + shape.y2) / 2;
              labelX = midX;
              labelY = midY + (12 / camera.zoom);
            } else {
              label = `${Math.round(shape.width)} × ${Math.round(shape.height)}`;
              labelY = shape.y + shape.height + (12 / camera.zoom);
              labelX = shape.x + (shape.width / 2);
            }
            
            const textWidth = ctx.measureText(label).width;
            labelX = labelX - (textWidth / 2);
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

      // Draw smart guides
      if (smartGuides.length > 0) {
        drawSmartGuides(ctx, smartGuides, shapes, camera.zoom);
      }
      ctx.restore();
    };
    render();
  }, [camera, shapes, selectedIds, showGrid, marqueeRect, smartGuides]);

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

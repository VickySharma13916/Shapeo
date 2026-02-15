import { useCallback, useEffect } from 'react';

import { useStore } from '../store/useStore';

export const useCamera = (canvasRef: React.RefObject<HTMLCanvasElement | null>) => {
  // Bind directly to the global store
  const camera = useStore((state) => state.camera);
  const setCamera = useStore((state) => state.setCamera);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const SCROLL_SENSITIVITY = 0.0015;
    const delta = -e.deltaY;
    const zoomFactor = Math.exp(delta * SCROLL_SENSITIVITY);

    const newZoom = Math.min(Math.max(camera.zoom * zoomFactor, 0.05), 50);
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setCamera({
      zoom: newZoom,
      x: mouseX - (mouseX - camera.x) * (newZoom / camera.zoom),
      y: mouseY - (mouseY - camera.y) * (newZoom / camera.zoom),
    });
  }, [canvasRef, camera, setCamera]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (e.buttons === 4 || (e.buttons === 1 && e.shiftKey)) {
      setCamera({
        ...camera,
        x: camera.x + e.movementX,
        y: camera.y + e.movementY,
      });
    }
  }, [camera, setCamera]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleWheel, handleMouseMove, canvasRef]);

  return { camera };
};
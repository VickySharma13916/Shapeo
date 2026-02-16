import { useEffect } from 'react';

import { useStore } from '../store/useStore';
import { getVisibleLayerShapeIds } from '../store/layerTree';
import { ShapeType } from '../engine/types';

import type { Shape } from '../engine/types';

export const useKeyboard = () => {
  // Use the updated pluralized actions from your store
  const {
    copy, paste, deleteShapes, selectedIds, setSelectedIds, undo, redo, cut, setMode, pages, currentPageId, updateShape, 
    saveHistory, toggleRightSidebar, toggleLeftSidebar, moveForward, moveBackward, bringToFront, sendToBack, groupSelectedLayers, 
    ungroupSelectedLayers, toggleLockSelected, addShape,
  } = useStore();

  useEffect(() => {
    const currentPageShapes = pages.find(p => p.id === currentPageId)?.shapes || [];
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if the user is typing in a sidebar input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isMod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      const step = e.shiftKey ? 10 : 1;

      if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        const currentPage = pages.find((page) => page.id === currentPageId);
        if (!currentPage) return;

        const orderedShapeIds = getVisibleLayerShapeIds(currentPage);
        if (orderedShapeIds.length === 0) return;

        const selectedInOrder = selectedIds.filter((id) => orderedShapeIds.includes(id));
        const anchorId =
          selectedInOrder.length > 0 ? selectedInOrder[selectedInOrder.length - 1] : orderedShapeIds[0];
        const anchorIndex = Math.max(0, orderedShapeIds.indexOf(anchorId));
        const delta = e.key === 'ArrowUp' ? -1 : 1;
        const targetIndex = Math.max(0, Math.min(orderedShapeIds.length - 1, anchorIndex + delta));
        const targetId = orderedShapeIds[targetIndex];

        if (!targetId || targetId === anchorId) {
          e.preventDefault();
          return;
        }

        const isSelected = selectedIds.includes(targetId);
        const nextSelectedIds = isSelected
          ? selectedIds.filter((id) => id !== targetId)
          : [...selectedIds, targetId];
        setSelectedIds(nextSelectedIds);
        e.preventDefault();
        return;
      }

      // --- CLIPBOARD ACTIONS ---
      if (selectedIds.length > 0 && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        
        selectedIds.forEach(id => {
          const currentPage = pages.find(p => p.id === currentPageId);
          const shape = currentPage?.shapes.find((s: Shape) => s.id === id);
          if (!shape) return;

          let updates = {};
          if (e.key === 'ArrowUp') updates = { y: shape.y - step };
          if (e.key === 'ArrowDown') updates = { y: shape.y + step };
          if (e.key === 'ArrowLeft') updates = { x: shape.x - step };
          if (e.key === 'ArrowRight') updates = { x: shape.x + step };
          
          updateShape(id, updates);
        });
        
        saveHistory();
      };

      // --- SELECTION ACTIONS ---
      if (isMod && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const allIds = currentPageShapes?.map(s => s.id);
        setSelectedIds(allIds);
      }
      // Copy: Mod + C
      if (isMod && key === 'c') {
        e.preventDefault();
        copy();
      }

      // Cut: Mod + X
      if (isMod && key === 'x') {
        e.preventDefault();
        cut();
      }

      // Paste: Mod + V
      if (isMod && key === 'v') {
        e.preventDefault();
        paste();
      }

      // Duplicate: Mod + D
      if (isMod && key === 'd') {
        e.preventDefault();
        copy();
        paste();
      }

      // --- HISTORY ACTIONS ---
      // Undo: Mod + Z
      if (isMod && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Redo: Mod + Shift + Z or Mod + Y
      if (isMod && ( (key === 'z' && e.shiftKey) || key === 'y' )) {
        e.preventDefault();
        redo();
      }

      // Delete: Backspace or Delete
      if ((key === 'backspace' || key === 'delete') && selectedIds.length > 0) {
        e.preventDefault();
        deleteShapes();
      }

      // --- TOOL SWITCHING (Figma Style) ---
      // V for Select Mode
      if (key === 'v' && !isMod) {
        setMode('select');
      }
      // H for Hand/Pan Mode
      if (key === 'h' && !isMod) {
        setMode('pan');
      }
      if (key === 'p' && !isMod) {
        setMode('pen');
      }
      if (key === 'l' && !isMod) {
        setMode('line');
      }
      if (key === 'a' && !isMod) {
        setMode('arrow');
      }
      if (key === 'f' && !isMod) {
        addShape(ShapeType.Frame);
      }

      if (isMod && e.key === '\\') {
        e.preventDefault();
        if (e.shiftKey) {
          toggleRightSidebar();
        } else {
          toggleLeftSidebar();
        }
      }

      // --- LAYER ORDER (Figma Style) ---
      if (isMod && e.code === 'BracketRight') {
        e.preventDefault();
        if (e.shiftKey) {
          bringToFront();
        } else {
          moveForward();
        }
      }

      if (isMod && e.code === 'BracketLeft') {
        e.preventDefault();
        if (e.shiftKey) {
          sendToBack();
        } else {
          moveBackward();
        }
      }

      // --- GROUPING (Figma Style) ---
      if (isMod && key === 'g') {
        e.preventDefault();
        if (e.shiftKey) {
          ungroupSelectedLayers();
        } else {
          groupSelectedLayers();
        }
      }

      // --- LOCKING (Figma Style) ---
      if (isMod && e.shiftKey && key === 'l') {
        e.preventDefault();
        toggleLockSelected();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    copy, paste, deleteShapes, selectedIds, setSelectedIds, undo, redo, cut, setMode, pages, currentPageId, updateShape, 
    saveHistory, toggleLeftSidebar, toggleRightSidebar, moveForward, moveBackward, bringToFront, sendToBack, groupSelectedLayers, 
    ungroupSelectedLayers, toggleLockSelected, addShape,
  ]);
};

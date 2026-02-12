import { useEffect } from 'react';

import { useStore } from '../store/useStore';

import type { Shape } from '../engine/types';

export const useKeyboard = () => {
  // Use the updated pluralized actions from your store
  const { copy, paste, deleteShapes, selectedIds, setSelectedIds, undo, redo, cut, setMode, pages, currentPageId, updateShape, saveHistory, toggleRightSidebar, toggleLeftSidebar } = useStore();

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

      if (isMod && e.key === '\\') {
        e.preventDefault();
        if (e.shiftKey) {
          toggleRightSidebar();
        } else {
          toggleLeftSidebar();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [copy, paste, deleteShapes, selectedIds, setSelectedIds, undo, redo, cut, setMode, pages, currentPageId, updateShape, saveHistory, toggleLeftSidebar, toggleRightSidebar]);
};
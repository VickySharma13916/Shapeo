import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { ShapeType } from '../engine/types';
import type { Mode, Shape, Page } from '../engine/types';

interface SceneState {
  // --- Core State ---
  pages: Page[];
  currentPageId: string;
  confirmDeleteId: string | null;
  selectedIds: string[];
  camera: { x: number; y: number; zoom: number };
  mode: Mode;
  showGrid: boolean;
  
  // --- UI & Clipboard ---
  clipboard: Shape[] | null;
  leftSidebarVisible: boolean;
  rightSidebarVisible: boolean;

  // --- History State ---
  history: Shape[][];
  historyIndex: number;

  // --- Actions ---
  setCamera: (camera: { x: number; y: number; zoom: number }) => void;
  setSelectedIds: (ids: string[]) => void;
  toggleSelection: (id: string) => void;
  setMode: (mode: Mode) => void;
  toggleGrid: () => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  
  // --- Page Actions ---
  addPage: () => void;
  setCurrentPage: (id: string) => void;
  setConfirmDeleteId: (id: string | null) => void;
  deletePage: (id: string) => void;
  
  // --- Object Manipulation ---
  addShape: (type: ShapeType) => void;
  updateShape: (id: string, updates: Partial<Shape>, commitToHistory?: boolean) => void;
  deleteShapes: () => void;
  bringToFront: () => void;
  sendToBack: () => void;
  moveForward: () => void;
  moveBackward: () => void;
  centerObject: (id: string) => void;

  // --- View Actions ---
  zoomIn: () => void;
  zoomOut: () => void;

  // --- History & Clipboard Actions ---
  saveHistory: () => void;
  undo: () => void;
  redo: () => void;
  copy: () => void;
  paste: () => void;
  cut: () => void;
  
  // --- Image Actions ---
  addImage: (file: File) => void;
  deleteImage: (id: string) => void;
}

export const useStore = create<SceneState>()(
  persist(
    (set, get) => ({
      // --- Initial State ---
      pages: [{ id: 'page-1', name: 'Page 1', shapes: [] }],
      currentPageId: 'page-1',
      selectedIds: [],
      camera: { x: 0, y: 0, zoom: 1 },
      mode: 'select',
      showGrid: false,
      history: [[]],
      historyIndex: 0,
      clipboard: null,
      leftSidebarVisible: true,
      rightSidebarVisible: true,

      // --- Basic Setters ---
      setCamera: (camera) => set({ camera }),
      setSelectedIds: (ids) => set({ selectedIds: ids }),
      toggleSelection: (id) => set((state) => {
        const isSelected = state.selectedIds.includes(id);
        return {
          selectedIds: isSelected
            ? state.selectedIds.filter(sid => sid !== id)
            : [...state.selectedIds, id]
        };
      }),
      setMode: (mode) => set({ mode }),
      toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
      toggleLeftSidebar: () => set((state) => ({ leftSidebarVisible: !state.leftSidebarVisible })),
      toggleRightSidebar: () => set((state) => ({ rightSidebarVisible: !state.rightSidebarVisible })),

      // --- Page Management ---
      addPage: () => {
        const newPage = { id: Math.random().toString(36).substring(7), name: `Page ${get().pages.length + 1}`, shapes: [] };
        set({ pages: [...get().pages, newPage], currentPageId: newPage.id, selectedIds: [] });
      },
      setCurrentPage: (id) => set({ currentPageId: id, selectedIds: [], history: [[]], historyIndex: 0 }),

      deletePage: (id: string) => {
        const { pages, currentPageId } = get();
        if (pages.length <= 1) return;

        const updatedPages = pages.filter(p => p.id !== id);
        const nextId = id === currentPageId ? updatedPages[0].id : currentPageId;

        set({ 
          pages: updatedPages, 
          currentPageId: nextId, 
          selectedIds: [] 
        });
      },
      confirmDeleteId: null,
      setConfirmDeleteId: (id) => set({ confirmDeleteId: id }),

      // --- Object Logic (All targeting current Page) ---
      addShape: (type) => {
        const { camera, pages, currentPageId, saveHistory } = get();
        const newId = Math.random().toString(36).substring(7);
        const centerX = (window.innerWidth / 2 - camera.x) / camera.zoom;
        const centerY = (window.innerHeight / 2 - camera.y) / camera.zoom;

        const newShape: Shape = {
          id: newId, type, x: centerX - 50, y: centerY - 50,
          width: 100, height: 100, fill: '#D9D9D9',
          stroke: '#000000', strokeWidth: 1, rotation: 0,
          ...(type === ShapeType.Image ? { src: '' } : {}),
        } as Shape;

        const updatedPages = pages.map(p => 
          p.id === currentPageId ? { ...p, shapes: [...p.shapes, newShape] } : p
        );

        set({ pages: updatedPages, selectedIds: [newId] });
        saveHistory();
      },

      updateShape: (id, updates, commitToHistory = false) => {
        set((state) => {
          const updatedPages = state.pages.map(p => p.id === state.currentPageId ? {
            ...p,
            shapes: p.shapes.map(s => s.id === id ? ({ ...s, ...updates } as Shape) : s)
          } : p);
          return { pages: updatedPages };
        });
        if (commitToHistory) get().saveHistory();
      },

      deleteShapes: () => {
        const { selectedIds, pages, currentPageId, saveHistory } = get();
        if (selectedIds.length === 0) return;
        const updatedPages = pages.map(p => p.id === currentPageId ? {
          ...p, shapes: p.shapes.filter(s => !selectedIds.includes(s.id))
        } : p);
        set({ pages: updatedPages, selectedIds: [] });
        saveHistory();
      },

      bringToFront: () => {
        const { selectedIds, pages, currentPageId, saveHistory } = get();
        if (selectedIds.length === 0) return;
        const updatedPages = pages.map(p => {
          if (p.id !== currentPageId) return p;
          const selected = p.shapes.filter(s => selectedIds.includes(s.id));
          const others = p.shapes.filter(s => !selectedIds.includes(s.id));
          return { ...p, shapes: [...others, ...selected] };
        });
        set({ pages: updatedPages });
        saveHistory();
      },

      sendToBack: () => {
        const { selectedIds, pages, currentPageId, saveHistory } = get();
        if (selectedIds.length === 0) return;
        const updatedPages = pages.map(p => {
          if (p.id !== currentPageId) return p;
          const selected = p.shapes.filter(s => selectedIds.includes(s.id));
          const others = p.shapes.filter(s => !selectedIds.includes(s.id));
          return { ...p, shapes: [...selected, ...others] };
        });
        set({ pages: updatedPages });
        saveHistory();
      },

      moveForward: () => {
        const { selectedIds, pages, currentPageId, saveHistory } = get();
        if (selectedIds.length === 0) return;
        const updatedPages = pages.map(p => {
          if (p.id !== currentPageId) return p;
          const shapes = [...p.shapes];
          
          // Move each selected shape forward one position
          for (let i = shapes.length - 2; i >= 0; i--) {
            if (selectedIds.includes(shapes[i].id) && !selectedIds.includes(shapes[i + 1].id)) {
              [shapes[i], shapes[i + 1]] = [shapes[i + 1], shapes[i]];
            }
          }
          return { ...p, shapes };
        });
        set({ pages: updatedPages });
        saveHistory();
      },

      moveBackward: () => {
        const { selectedIds, pages, currentPageId, saveHistory } = get();
        if (selectedIds.length === 0) return;
        const updatedPages = pages.map(p => {
          if (p.id !== currentPageId) return p;
          const shapes = [...p.shapes];
          
          // Move each selected shape backward one position
          for (let i = 1; i < shapes.length; i++) {
            if (selectedIds.includes(shapes[i].id) && !selectedIds.includes(shapes[i - 1].id)) {
              [shapes[i], shapes[i - 1]] = [shapes[i - 1], shapes[i]];
            }
          }
          return { ...p, shapes };
        });
        set({ pages: updatedPages });
        saveHistory();
      },

      centerObject: (id) => {
        const { pages, currentPageId, camera } = get();
        const shapes = pages.find(p => p.id === currentPageId)?.shapes || [];
        const shape = shapes.find(s => s.id === id);
        if (!shape) return;
        set({
          camera: {
            ...camera,
            x: (window.innerWidth / 2) - (shape.x + shape.width / 2) * camera.zoom,
            y: (window.innerHeight / 2) - (shape.y + shape.height / 2) * camera.zoom,
          }
        });
      },

      zoomIn: () => {
        const { camera } = get();
        const newZoom = Math.min(camera.zoom * 1.2, 50);
        set({ camera: { ...camera, zoom: newZoom } });
      },

      zoomOut: () => {
        const { camera } = get();
        const newZoom = Math.max(camera.zoom / 1.2, 0.05);
        set({ camera: { ...camera, zoom: newZoom } });
      },

      // --- History ---
      saveHistory: () => {
        const { pages, currentPageId, history, historyIndex } = get();
        const currentShapes = pages.find(p => p.id === currentPageId)?.shapes || [];
        const cleanHistory = history.slice(0, historyIndex + 1);
        set({
          history: [...cleanHistory, JSON.parse(JSON.stringify(currentShapes))],
          historyIndex: cleanHistory.length,
        });
      },

      undo: () => {
        const { history, historyIndex, pages, currentPageId } = get();
        if (historyIndex > 0) {
          const prevShapes = history[historyIndex - 1];
          const updatedPages = pages.map(p => p.id === currentPageId ? { ...p, shapes: prevShapes } : p);
          set({ pages: updatedPages, historyIndex: historyIndex - 1, selectedIds: [] });
        }
      },

      redo: () => {
        const { history, historyIndex, pages, currentPageId } = get();
        if (historyIndex < history.length - 1) {
          const nextShapes = history[historyIndex + 1];
          const updatedPages = pages.map(p => p.id === currentPageId ? { ...p, shapes: nextShapes } : p);
          set({ pages: updatedPages, historyIndex: historyIndex + 1 });
        }
      },

      // --- Clipboard ---
      copy: () => {
        const { selectedIds, pages, currentPageId } = get();
        const shapes = pages.find(p => p.id === currentPageId)?.shapes || [];
        const selected = shapes.filter(s => selectedIds.includes(s.id));
        if (selected.length > 0) set({ clipboard: JSON.parse(JSON.stringify(selected)) });
      },

      paste: () => {
        const { clipboard, pages, currentPageId, saveHistory } = get();
        if (!clipboard) return;
        const newShapes = clipboard.map(s => ({
          ...s, id: Math.random().toString(36).substring(7), x: s.x + 20, y: s.y + 20
        }));
        const updatedPages = pages.map(p => p.id === currentPageId ? { ...p, shapes: [...p.shapes, ...newShapes] } : p);
        set({ pages: updatedPages, selectedIds: newShapes.map(s => s.id) });
        saveHistory();
      },

      cut: () => { get().copy(); get().deleteShapes(); },

      addImage: (file: File) => {
        const { camera, pages, currentPageId, saveHistory } = get();
        const reader = new FileReader();

        reader.onload = (f) => {
          const src = f.target?.result as string;
          const img = new Image();
          
          img.onload = () => {
            const newId = Math.random().toString(36).substring(7);
            const centerX = (window.innerWidth / 2 - camera.x) / camera.zoom;
            const centerY = (window.innerHeight / 2 - camera.y) / camera.zoom;

            // Inside addImage in useStore.ts
            const newImageShape: Shape = {
              id: newId,
              type: ShapeType.Image,
              x: centerX - img.width / 4,
              y: centerY - img.height / 4,
              width: img.width / 2,
              height: img.height / 2,
              src: src,
              fill: 'transparent',
              stroke: '#000000',
              strokeWidth: 0,
              rotation: 0,
              opacity: 1,
              cornerRadius: 0,
              shadow: { enabled: false, color: '#000000', blur: 10, x: 0, y: 0 }
            };

            const updatedPages = pages.map(p => 
              p.id === currentPageId ? { ...p, shapes: [...p.shapes, newImageShape] } : p
            );

            set({ pages: updatedPages, selectedIds: [newId] });
            saveHistory();
          };
          img.src = src;
        };
        reader.readAsDataURL(file);
      },

      deleteImage: (id: string) => {
        const { pages, currentPageId, saveHistory } = get();
        const updatedPages = pages.map(p => p.id === currentPageId ? {
          ...p, shapes: p.shapes.filter(s => s.id !== id)
        } : p);
        set({ pages: updatedPages });
        saveHistory();
      },
    }),
    { 
      name: 'vector-engine-storage',
      partialize: (state) => ({
        pages: state.pages,
        currentPageId: state.currentPageId,
        camera: state.camera,
        showGrid: state.showGrid,
        leftSidebarVisible: state.leftSidebarVisible,
        rightSidebarVisible: state.rightSidebarVisible
      }),
    }
  )
);
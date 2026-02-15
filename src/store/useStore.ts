import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { ShapeType } from '../engine/types';
import type { Mode, Shape, Page } from '../engine/types';

import { duplicateShapeForPaste } from './clipboard';

import {
  deleteGroupBranch, ensureLayerTree, getGroupDescendantShapeIds, groupShapes, moveLayerNode as moveLayerNodeInTree, 
  moveLayerNodeToRootEnd as moveLayerNodeToRootEndInTree, renameLayerGroup, ungroupByGroupIds, type DropPosition, type LayerNodeKey
} from './layerTree';

import { bringSelectedToFront, moveSelectedBackward, moveSelectedForward, sendSelectedToBack } from './layerOrder';

type ShapeUpdates = Partial<Shape> & {
  x2?: number;
  y2?: number;
};

const unique = <T,>(values: T[]) => [...new Set(values)];

type HistoryEntry = {
  pages: Page[];
  currentPageId: string;
  selectedIds: string[];
};

type ThemeMode = 'dark' | 'light';

const cloneHistoryEntry = (entry: HistoryEntry): HistoryEntry =>
  JSON.parse(JSON.stringify(entry)) as HistoryEntry;

const createHistoryEntry = (state: {
  pages: Page[];
  currentPageId: string;
  selectedIds: string[];
}): HistoryEntry =>
  cloneHistoryEntry({
    pages: state.pages,
    currentPageId: state.currentPageId,
    selectedIds: state.selectedIds,
  });

const initialPages: Page[] = [{ id: 'page-1', name: 'Page 1', shapes: [], groups: [] }];
const initialCurrentPageId = 'page-1';

interface SceneState {
  // --- Core State ---
  pages: Page[];
  currentPageId: string;
  confirmDeleteId: string | null;
  confirmDeleteGroupId: string | null;
  selectedIds: string[];
  camera: { x: number; y: number; zoom: number };
  mode: Mode;
  theme: ThemeMode;
  showGrid: boolean;
  
  // --- UI & Clipboard ---
  clipboard: Shape[] | null;
  leftSidebarVisible: boolean;
  rightSidebarVisible: boolean;

  // --- History State ---
  history: HistoryEntry[];
  historyIndex: number;

  // --- Actions ---
  setCamera: (camera: { x: number; y: number; zoom: number }) => void;
  setSelectedIds: (ids: string[]) => void;
  toggleSelection: (id: string) => void;
  setMode: (mode: Mode) => void;
  toggleTheme: () => void;
  toggleGrid: () => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  
  // --- Page Actions ---
  addPage: () => void;
  setCurrentPage: (id: string) => void;
  renamePage: (id: string, name: string) => void;
  setConfirmDeleteId: (id: string | null) => void;
  setConfirmDeleteGroupId: (id: string | null) => void;
  deletePage: (id: string) => void;
  
  // --- Object Manipulation ---
  addShape: (type: ShapeType) => void;
  updateShape: (id: string, updates: ShapeUpdates, commitToHistory?: boolean) => void;
  deleteShapes: () => void;
  bringToFront: () => void;
  sendToBack: () => void;
  moveForward: () => void;
  moveBackward: () => void;
  centerObject: (id: string) => void;
  groupSelectedLayers: () => void;
  ungroupSelectedLayers: () => void;
  renameGroup: (groupId: string, name: string) => void;
  deleteGroup: (groupId: string) => void;
  toggleGroupLock: (groupId: string) => void;
  moveLayerNode: (dragNodeKey: LayerNodeKey, targetNodeKey: LayerNodeKey, position: DropPosition) => void;
  moveLayerNodeToRootEnd: (dragNodeKey: LayerNodeKey) => void;
  toggleGroupCollapse: (groupId: string) => void;
  toggleShapeLock: (id: string) => void;
  toggleLockSelected: () => void;
  
  // --- Alignment Actions ---
  alignLeft: () => void;
  alignCenter: () => void;
  alignRight: () => void;
  alignTop: () => void;
  alignMiddle: () => void;
  alignBottom: () => void;
  
  // --- Constraint Actions ---
  toggleAspectRatioLock: (id: string) => void;

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
      pages: initialPages,
      currentPageId: initialCurrentPageId,
      confirmDeleteGroupId: null,
      selectedIds: [],
      camera: { x: 0, y: 0, zoom: 1 },
      mode: 'select',
      theme: 'dark',
      showGrid: false,
      history: [
        createHistoryEntry({
          pages: initialPages,
          currentPageId: initialCurrentPageId,
          selectedIds: [],
        }),
      ],
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
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
      toggleLeftSidebar: () => set((state) => ({ leftSidebarVisible: !state.leftSidebarVisible })),
      toggleRightSidebar: () => set((state) => ({ rightSidebarVisible: !state.rightSidebarVisible })),

      // --- Page Management ---
      addPage: () => {
        const { pages, saveHistory } = get();
        const newPage = {
          id: Math.random().toString(36).substring(7),
          name: `Page ${pages.length + 1}`,
          shapes: [],
          groups: [],
        };
        set({ pages: [...pages, newPage], currentPageId: newPage.id, selectedIds: [] });
        saveHistory();
      },
      setCurrentPage: (id) => set({ currentPageId: id, selectedIds: [] }),
      renamePage: (id, name) => {
        const { pages, saveHistory } = get();
        const trimmedName = name.trim();
        if (!trimmedName) return;
        const page = pages.find((entry) => entry.id === id);
        if (!page || page.name === trimmedName) return;
        set({
          pages: pages.map((page) => (page.id === id ? { ...page, name: trimmedName } : page)),
        });
        saveHistory();
      },

      deletePage: (id: string) => {
        const { pages, currentPageId, saveHistory } = get();
        if (pages.length <= 1) return;

        const updatedPages = pages.filter(p => p.id !== id);
        const nextId = id === currentPageId ? updatedPages[0].id : currentPageId;

        set({ 
          pages: updatedPages, 
          currentPageId: nextId, 
          selectedIds: [] 
        });
        saveHistory();
      },
      confirmDeleteId: null,
      setConfirmDeleteId: (id) => set({ confirmDeleteId: id }),
      setConfirmDeleteGroupId: (id) => set({ confirmDeleteGroupId: id }),

      // --- Object Logic (All targeting current Page) ---
      addShape: (type) => {
        const { camera, pages, currentPageId, saveHistory, theme } = get();
        const newId = Math.random().toString(36).substring(7);
        const centerX = (window.innerWidth / 2 - camera.x) / camera.zoom;
        const centerY = (window.innerHeight / 2 - camera.y) / camera.zoom;
        const defaultStroke = theme === 'dark' ? '#e5e7eb' : '#0f172a';
        const defaultFill = theme === 'dark' ? '#4b5563' : '#d9d9d9';

        let newShape: Shape;

        if (type === ShapeType.Line) {
          newShape = {
            id: newId,
            name: 'Line',
            type: 'line',
            x: centerX - 50,
            y: centerY,
            x2: centerX + 50,
            y2: centerY,
            locked: false,
            width: 100,
            height: 0,
            fill: 'transparent',
            stroke: defaultStroke,
            strokeWidth: 2,
            rotation: 0,
            lineCap: 'round',
          };
        } else if (type === ShapeType.Ellipse) {
          newShape = {
            id: newId,
            name: 'Ellipse',
            type: 'ellipse',
            x: centerX - 50,
            y: centerY - 30,
            locked: false,
            width: 100,
            height: 60,
            rx: 50,
            ry: 30,
            fill: defaultFill,
            stroke: defaultStroke,
            strokeWidth: 1,
            rotation: 0,
          };
        } else {
          newShape = {
            id: newId, name: type === ShapeType.Image ? 'Image' : 'Rectangle', type, x: centerX - 50, y: centerY - 50,
            locked: false,
            width: 100, height: 100, fill: defaultFill,
            stroke: defaultStroke, strokeWidth: 1, rotation: 0,
            ...(type === ShapeType.Image ? { src: '' } : {}),
          } as Shape;
        }

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
            shapes: p.shapes.map(s => {
              if (s.id !== id) return s;
              if (s.locked) return s;
              
              const updatedShape = { ...s, ...updates };
              
              // Handle aspect ratio locking
              if (s.aspectRatioLocked && (updates.width !== undefined || updates.height !== undefined)) {
                const aspectRatio = s.width / s.height;
                if (updates.width !== undefined && updates.height === undefined) {
                  updatedShape.height = updates.width / aspectRatio;
                } else if (updates.height !== undefined && updates.width === undefined) {
                  updatedShape.width = updates.height * aspectRatio;
                }
              }
              
              // Sync properties for specific shape types
              if (updatedShape.type === 'ellipse') {
                if (updatedShape.width !== undefined) updatedShape.rx = updatedShape.width / 2;
                if (updatedShape.height !== undefined) updatedShape.ry = updatedShape.height / 2;
              } else if (updatedShape.type === 'line') {
                const lineShape = updatedShape as Extract<Shape, { type: 'line' }>;
                if (updates.x !== undefined || updates.y !== undefined || updates.x2 !== undefined || updates.y2 !== undefined) {
                  lineShape.width = Math.abs(lineShape.x2 - lineShape.x);
                  lineShape.height = Math.abs(lineShape.y2 - lineShape.y);
                }
              }
              
              return updatedShape as Shape;
            })



          } : p);
          return { pages: updatedPages };
        });
        if (commitToHistory) get().saveHistory();
      },

      deleteShapes: () => {
        const { selectedIds, pages, currentPageId, saveHistory } = get();
        if (selectedIds.length === 0) return;
        let changed = false;
        const updatedPages = pages.map(p => {
          if (p.id !== currentPageId) return p;
          const nextShapes = p.shapes.filter(s => !(selectedIds.includes(s.id) && !s.locked));
          changed = nextShapes.length !== p.shapes.length;
          const groups = (p.groups ?? []).filter((group) =>
            nextShapes.some((shape) => shape.groupId === group.id)
          );
          const cleanedShapes = nextShapes.map((shape) =>
            shape.groupId && !groups.some((group) => group.id === shape.groupId)
              ? { ...shape, groupId: undefined }
              : shape
          );
          return { ...p, shapes: cleanedShapes, groups };
        });
        if (!changed) return;
        set({ pages: updatedPages, selectedIds: [] });
        saveHistory();
      },

      bringToFront: () => {
        const { selectedIds, pages, currentPageId, saveHistory } = get();
        if (selectedIds.length === 0) return;
        let changed = false;
        const updatedPages = pages.map(p => {
          if (p.id !== currentPageId) return p;
          const treePage = ensureLayerTree(p);
          const reordered = bringSelectedToFront(treePage.shapes, selectedIds);
          changed = reordered.changed;
          if (!changed) return treePage;
          return ensureLayerTree({ ...treePage, shapes: reordered.shapes });
        });
        if (!changed) return;
        set({ pages: updatedPages });
        saveHistory();
      },

      sendToBack: () => {
        const { selectedIds, pages, currentPageId, saveHistory } = get();
        if (selectedIds.length === 0) return;
        let changed = false;
        const updatedPages = pages.map(p => {
          if (p.id !== currentPageId) return p;
          const treePage = ensureLayerTree(p);
          const reordered = sendSelectedToBack(treePage.shapes, selectedIds);
          changed = reordered.changed;
          if (!changed) return treePage;
          return ensureLayerTree({ ...treePage, shapes: reordered.shapes });
        });
        if (!changed) return;
        set({ pages: updatedPages });
        saveHistory();
      },

      moveForward: () => {
        const { selectedIds, pages, currentPageId, saveHistory } = get();
        if (selectedIds.length === 0) return;
        let changed = false;
        const updatedPages = pages.map(p => {
          if (p.id !== currentPageId) return p;
          const treePage = ensureLayerTree(p);
          const reordered = moveSelectedForward(treePage.shapes, selectedIds);
          changed = reordered.changed;
          if (!changed) return treePage;
          return ensureLayerTree({ ...treePage, shapes: reordered.shapes });
        });
        if (!changed) return;
        set({ pages: updatedPages });
        saveHistory();
      },

      moveBackward: () => {
        const { selectedIds, pages, currentPageId, saveHistory } = get();
        if (selectedIds.length === 0) return;
        let changed = false;
        const updatedPages = pages.map(p => {
          if (p.id !== currentPageId) return p;
          const treePage = ensureLayerTree(p);
          const reordered = moveSelectedBackward(treePage.shapes, selectedIds);
          changed = reordered.changed;
          if (!changed) return treePage;
          return ensureLayerTree({ ...treePage, shapes: reordered.shapes });
        });
        if (!changed) return;
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

      groupSelectedLayers: () => {
        const { selectedIds, pages, currentPageId, saveHistory } = get();
        if (selectedIds.length < 2) return;

        let changed = false;
        const updatedPages = pages.map((page) => {
          if (page.id !== currentPageId) return page;
          const grouped = groupShapes(page, selectedIds);
          changed = grouped.changed;
          return grouped.page;
        });

        if (!changed) return;
        set({ pages: updatedPages });
        saveHistory();
      },

      ungroupSelectedLayers: () => {
        const { selectedIds, pages, currentPageId, saveHistory } = get();
        if (selectedIds.length === 0) return;

        let changed = false;
        const updatedPages = pages.map((page) => {
          if (page.id !== currentPageId) return page;
          const treePage = ensureLayerTree(page);
          const selectedSet = new Set(selectedIds);
          const groupIds = unique(
            treePage.shapes
              .filter((shape) => selectedSet.has(shape.id) && shape.groupId)
              .map((shape) => shape.groupId as string)
          );
          const ungrouped = ungroupByGroupIds(treePage, groupIds);
          changed = ungrouped.changed;
          return ungrouped.page;
        });

        if (!changed) return;
        set({ pages: updatedPages });
        saveHistory();
      },

      renameGroup: (groupId, name) => {
        const { pages, currentPageId } = get();
        const updatedPages = pages.map((page) =>
          page.id === currentPageId ? renameLayerGroup(page, groupId, name) : page
        );
        set({ pages: updatedPages });
      },

      deleteGroup: (groupId) => {
        const { pages, currentPageId, selectedIds, saveHistory } = get();
        let changed = false;
        let deletedShapeIds: string[] = [];

        const updatedPages = pages.map((page) => {
          if (page.id !== currentPageId) return page;
          const result = deleteGroupBranch(page, groupId);
          changed = result.changed;
          deletedShapeIds = result.deletedShapeIds;
          return result.page;
        });

        if (!changed) return;
        const deletedSet = new Set(deletedShapeIds);
        set({
          pages: updatedPages,
          selectedIds: selectedIds.filter((id) => !deletedSet.has(id)),
        });
        saveHistory();
      },

      toggleGroupLock: (groupId) => {
        const { pages, currentPageId, saveHistory } = get();
        let changed = false;

        const updatedPages = pages.map((page) => {
          if (page.id !== currentPageId) return page;
          const shapeIds = getGroupDescendantShapeIds(page, groupId);
          if (shapeIds.length === 0) return page;

          const shapeSet = new Set(shapeIds);
          const targetLockState = page.shapes
            .filter((shape) => shapeSet.has(shape.id))
            .some((shape) => !shape.locked);

          const nextShapes = page.shapes.map((shape) => {
            if (!shapeSet.has(shape.id)) return shape;
            if ((shape.locked ?? false) === targetLockState) return shape;
            changed = true;
            return { ...shape, locked: targetLockState };
          });

          return { ...page, shapes: nextShapes };
        });

        if (!changed) return;
        set({ pages: updatedPages });
        saveHistory();
      },

      moveLayerNode: (dragNodeKey, targetNodeKey, position) => {
        const { pages, currentPageId, saveHistory } = get();
        let changed = false;
        const updatedPages = pages.map((page) => {
          if (page.id !== currentPageId) return page;
          const moved = moveLayerNodeInTree(page, dragNodeKey, targetNodeKey, position);
          changed = moved.changed;
          return moved.page;
        });
        if (!changed) return;
        set({ pages: updatedPages });
        saveHistory();
      },

      moveLayerNodeToRootEnd: (dragNodeKey) => {
        const { pages, currentPageId, saveHistory } = get();
        let changed = false;
        const updatedPages = pages.map((page) => {
          if (page.id !== currentPageId) return page;
          const moved = moveLayerNodeToRootEndInTree(page, dragNodeKey);
          changed = moved.changed;
          return moved.page;
        });
        if (!changed) return;
        set({ pages: updatedPages });
        saveHistory();
      },

      toggleGroupCollapse: (groupId) => {
        const { pages, currentPageId } = get();
        const updatedPages = pages.map((page) => {
          if (page.id !== currentPageId) return page;
          return {
            ...page,
            groups: (page.groups ?? []).map((group) =>
              group.id === groupId ? { ...group, collapsed: !group.collapsed } : group
            ),
          };
        });
        set({ pages: updatedPages });
      },

      toggleShapeLock: (id) => {
        const { pages, currentPageId, saveHistory } = get();
        const updatedPages = pages.map((page) => {
          if (page.id !== currentPageId) return page;
          return {
            ...page,
            shapes: page.shapes.map((shape) =>
              shape.id === id ? { ...shape, locked: !shape.locked } : shape
            ),
          };
        });
        set({ pages: updatedPages });
        saveHistory();
      },

      toggleLockSelected: () => {
        const { pages, currentPageId, selectedIds, saveHistory } = get();
        if (selectedIds.length === 0) return;

        let changed = false;
        const updatedPages = pages.map((page) => {
          if (page.id !== currentPageId) return page;

          const selectedSet = new Set(selectedIds);
          const selectedShapes = page.shapes.filter((shape) => selectedSet.has(shape.id));
          if (selectedShapes.length === 0) return page;

          const shouldLock = selectedShapes.some((shape) => !shape.locked);
          const nextShapes = page.shapes.map((shape) => {
            if (!selectedSet.has(shape.id)) return shape;
            if ((shape.locked ?? false) === shouldLock) return shape;
            changed = true;
            return { ...shape, locked: shouldLock };
          });

          return { ...page, shapes: nextShapes };
        });

        if (!changed) return;
        set({ pages: updatedPages });
        saveHistory();
      },

      // --- Alignment Functions ---
      alignLeft: () => {
        const { selectedIds, pages, currentPageId, saveHistory } = get();
        if (selectedIds.length < 2) return;
        
        const currentPage = pages.find(p => p.id === currentPageId);
        if (!currentPage) return;
        
        const selectedShapes = currentPage.shapes.filter(s => selectedIds.includes(s.id));
        const leftmost = Math.min(...selectedShapes.map(s => s.x));
        
        const updatedPages = pages.map(p => {
          if (p.id !== currentPageId) return p;
          return {
            ...p,
            shapes: p.shapes.map(s => 
              selectedIds.includes(s.id) ? { ...s, x: leftmost } : s
            )
          };
        });
        
        set({ pages: updatedPages });
        saveHistory();
      },

      alignCenter: () => {
        const { selectedIds, pages, currentPageId, saveHistory } = get();
        if (selectedIds.length < 2) return;
        
        const currentPage = pages.find(p => p.id === currentPageId);
        if (!currentPage) return;
        
        const selectedShapes = currentPage.shapes.filter(s => selectedIds.includes(s.id));
        const leftmost = Math.min(...selectedShapes.map(s => s.x));
        const rightmost = Math.max(...selectedShapes.map(s => s.x + s.width));
        const centerX = (leftmost + rightmost) / 2;
        
        const updatedPages = pages.map(p => {
          if (p.id !== currentPageId) return p;
          return {
            ...p,
            shapes: p.shapes.map(s => 
              selectedIds.includes(s.id) 
                ? { ...s, x: centerX - s.width / 2 } 
                : s
            )
          };
        });
        
        set({ pages: updatedPages });
        saveHistory();
      },

      alignRight: () => {
        const { selectedIds, pages, currentPageId, saveHistory } = get();
        if (selectedIds.length < 2) return;
        
        const currentPage = pages.find(p => p.id === currentPageId);
        if (!currentPage) return;
        
        const selectedShapes = currentPage.shapes.filter(s => selectedIds.includes(s.id));
        const rightmost = Math.max(...selectedShapes.map(s => s.x + s.width));
        
        const updatedPages = pages.map(p => {
          if (p.id !== currentPageId) return p;
          return {
            ...p,
            shapes: p.shapes.map(s => 
              selectedIds.includes(s.id) 
                ? { ...s, x: rightmost - s.width } 
                : s
            )
          };
        });
        
        set({ pages: updatedPages });
        saveHistory();
      },

      alignTop: () => {
        const { selectedIds, pages, currentPageId, saveHistory } = get();
        if (selectedIds.length < 2) return;
        
        const currentPage = pages.find(p => p.id === currentPageId);
        if (!currentPage) return;
        
        const selectedShapes = currentPage.shapes.filter(s => selectedIds.includes(s.id));
        const topmost = Math.min(...selectedShapes.map(s => s.y));
        
        const updatedPages = pages.map(p => {
          if (p.id !== currentPageId) return p;
          return {
            ...p,
            shapes: p.shapes.map(s => 
              selectedIds.includes(s.id) ? { ...s, y: topmost } : s
            )
          };
        });
        
        set({ pages: updatedPages });
        saveHistory();
      },

      alignMiddle: () => {
        const { selectedIds, pages, currentPageId, saveHistory } = get();
        if (selectedIds.length < 2) return;
        
        const currentPage = pages.find(p => p.id === currentPageId);
        if (!currentPage) return;
        
        const selectedShapes = currentPage.shapes.filter(s => selectedIds.includes(s.id));
        const topmost = Math.min(...selectedShapes.map(s => s.y));
        const bottommost = Math.max(...selectedShapes.map(s => s.y + s.height));
        const centerY = (topmost + bottommost) / 2;
        
        const updatedPages = pages.map(p => {
          if (p.id !== currentPageId) return p;
          return {
            ...p,
            shapes: p.shapes.map(s => 
              selectedIds.includes(s.id) 
                ? { ...s, y: centerY - s.height / 2 } 
                : s
            )
          };
        });
        
        set({ pages: updatedPages });
        saveHistory();
      },

      alignBottom: () => {
        const { selectedIds, pages, currentPageId, saveHistory } = get();
        if (selectedIds.length < 2) return;
        
        const currentPage = pages.find(p => p.id === currentPageId);
        if (!currentPage) return;
        
        const selectedShapes = currentPage.shapes.filter(s => selectedIds.includes(s.id));
        const bottommost = Math.max(...selectedShapes.map(s => s.y + s.height));
        
        const updatedPages = pages.map(p => {
          if (p.id !== currentPageId) return p;
          return {
            ...p,
            shapes: p.shapes.map(s => 
              selectedIds.includes(s.id) 
                ? { ...s, y: bottommost - s.height } 
                : s
            )
          };
        });
        
        set({ pages: updatedPages });
        saveHistory();
      },

      // --- Constraint Functions ---
      toggleAspectRatioLock: (id) => {
        const { pages, currentPageId, saveHistory } = get();
        
        const updatedPages = pages.map(p => {
          if (p.id !== currentPageId) return p;
          return {
            ...p,
            shapes: p.shapes.map(s => 
              s.id === id 
                ? { ...s, aspectRatioLocked: !s.aspectRatioLocked } 
                : s
            )
          };
        });
        
        set({ pages: updatedPages });
        saveHistory();
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
        const { pages, currentPageId, selectedIds, history, historyIndex } = get();
        const snapshot = createHistoryEntry({ pages, currentPageId, selectedIds });
        const current = history[historyIndex];
        if (
          current &&
          JSON.stringify(current.pages) === JSON.stringify(snapshot.pages) &&
          current.currentPageId === snapshot.currentPageId &&
          JSON.stringify(current.selectedIds) === JSON.stringify(snapshot.selectedIds)
        ) {
          return;
        }
        const cleanHistory = history.slice(0, historyIndex + 1);
        set({
          history: [...cleanHistory, snapshot],
          historyIndex: cleanHistory.length,
        });
      },

      undo: () => {
        const { history, historyIndex } = get();
        if (historyIndex > 0) {
          const prev = cloneHistoryEntry(history[historyIndex - 1]);
          set({
            pages: prev.pages,
            currentPageId: prev.currentPageId,
            selectedIds: prev.selectedIds,
            historyIndex: historyIndex - 1,
          });
        }
      },

      redo: () => {
        const { history, historyIndex } = get();
        if (historyIndex < history.length - 1) {
          const next = cloneHistoryEntry(history[historyIndex + 1]);
          set({
            pages: next.pages,
            currentPageId: next.currentPageId,
            selectedIds: next.selectedIds,
            historyIndex: historyIndex + 1,
          });
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
        const newShapes = clipboard.map(duplicateShapeForPaste);
        const updatedPages = pages.map(p => p.id === currentPageId ? { ...p, shapes: [...p.shapes, ...newShapes] } : p);
        set({ pages: updatedPages, selectedIds: newShapes.map(s => s.id) });
        saveHistory();
      },

      cut: () => { get().copy(); get().deleteShapes(); },

      addImage: (file: File) => {
        const { camera, pages, currentPageId, saveHistory, theme } = get();
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
              name: 'Image',
              type: ShapeType.Image,
              locked: false,
              x: centerX - img.width / 4,
              y: centerY - img.height / 4,
              width: img.width / 2,
              height: img.height / 2,
              src: src,
              fill: 'transparent',
              stroke: theme === 'dark' ? '#e5e7eb' : '#0f172a',
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
        theme: state.theme,
        showGrid: state.showGrid,
        leftSidebarVisible: state.leftSidebarVisible,
        rightSidebarVisible: state.rightSidebarVisible
      }),
    }
  )
);

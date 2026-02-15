import { beforeEach, describe, expect, it } from 'vitest';

import type { Page, Shape } from '../engine/types';

import { useStore } from './useStore';

type HistoryEntry = {
  pages: Page[];
  currentPageId: string;
  selectedIds: string[];
};

const makeRect = (id: string): Shape => ({
  id,
  name: `Rect ${id}`,
  type: 'rect',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  fill: '#fff',
  stroke: '#000',
  strokeWidth: 1,
  rotation: 0,
  locked: false,
});

const cloneEntry = (entry: HistoryEntry): HistoryEntry =>
  JSON.parse(JSON.stringify(entry)) as HistoryEntry;

const resetStore = (pages: Page[], currentPageId = 'page-1', selectedIds: string[] = []) => {
  const firstEntry = cloneEntry({ pages, currentPageId, selectedIds });
  useStore.setState({
    pages,
    currentPageId,
    selectedIds,
    history: [firstEntry],
    historyIndex: 0,
    clipboard: null,
    camera: { x: 0, y: 0, zoom: 1 },
    mode: 'select',
    showGrid: false,
    confirmDeleteId: null,
    confirmDeleteGroupId: null,
    leftSidebarVisible: true,
    rightSidebarVisible: true,
  });
};

describe('useStore history snapshots', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    if ((useStore as unknown as { persist?: { clearStorage?: () => void } }).persist?.clearStorage) {
      (useStore as unknown as { persist: { clearStorage: () => void } }).persist.clearStorage();
    }
  });

  it('undo/redo restores grouping and z-index changes', () => {
    const initialPages: Page[] = [
      {
        id: 'page-1',
        name: 'Page 1',
        shapes: [makeRect('a'), makeRect('b'), makeRect('c')],
        groups: [],
        rootLayerIds: ['shape:a', 'shape:b', 'shape:c'],
      },
    ];
    resetStore(initialPages, 'page-1', ['a', 'b']);

    const store = useStore.getState();
    store.groupSelectedLayers();

    const afterGroup = useStore.getState();
    expect(afterGroup.pages[0].groups?.length).toBe(1);

    afterGroup.bringToFront();
    const afterBringFront = useStore.getState();
    expect(afterBringFront.historyIndex).toBeGreaterThan(1);

    afterBringFront.undo();
    const afterUndoBringFront = useStore.getState();
    expect(afterUndoBringFront.pages[0].groups?.length).toBe(1);

    afterUndoBringFront.undo();
    const afterUndoGroup = useStore.getState();
    expect(afterUndoGroup.pages[0].groups?.length ?? 0).toBe(0);
    expect(afterUndoGroup.pages[0].shapes.every((shape) => !shape.groupId)).toBe(true);

    afterUndoGroup.redo();
    const afterRedoGroup = useStore.getState();
    expect(afterRedoGroup.pages[0].groups?.length).toBe(1);
  });

  it('undo/redo restores lock state', () => {
    const initialPages: Page[] = [
      {
        id: 'page-1',
        name: 'Page 1',
        shapes: [makeRect('a')],
        groups: [],
        rootLayerIds: ['shape:a'],
      },
    ];
    resetStore(initialPages, 'page-1', ['a']);

    const store = useStore.getState();
    store.toggleShapeLock('a');
    expect(useStore.getState().pages[0].shapes[0].locked).toBe(true);

    useStore.getState().undo();
    expect(useStore.getState().pages[0].shapes[0].locked).toBe(false);

    useStore.getState().redo();
    expect(useStore.getState().pages[0].shapes[0].locked).toBe(true);
  });

  it('bulk lock toggle works for selection and is undoable', () => {
    const initialPages: Page[] = [
      {
        id: 'page-1',
        name: 'Page 1',
        shapes: [makeRect('a'), makeRect('b')],
        groups: [],
        rootLayerIds: ['shape:a', 'shape:b'],
      },
    ];
    resetStore(initialPages, 'page-1', ['a', 'b']);

    useStore.getState().toggleLockSelected();
    const lockedState = useStore.getState();
    expect(lockedState.pages[0].shapes.every((shape) => shape.locked)).toBe(true);

    lockedState.undo();
    const unlockedState = useStore.getState();
    expect(unlockedState.pages[0].shapes.every((shape) => !shape.locked)).toBe(true);
  });

  it('group lock toggle locks descendants and is undoable', () => {
    const initialPages: Page[] = [
      {
        id: 'page-1',
        name: 'Page 1',
        shapes: [
          { ...makeRect('a'), groupId: 'g1' },
          { ...makeRect('b'), groupId: 'g1' },
        ],
        groups: [{ id: 'g1', name: 'Group 1', childIds: ['shape:a', 'shape:b'] }],
        rootLayerIds: ['group:g1'],
      },
    ];
    resetStore(initialPages, 'page-1', []);

    useStore.getState().toggleGroupLock('g1');
    const lockedState = useStore.getState();
    expect(lockedState.pages[0].shapes.every((shape) => shape.locked)).toBe(true);

    lockedState.undo();
    const unlockedState = useStore.getState();
    expect(unlockedState.pages[0].shapes.every((shape) => !shape.locked)).toBe(true);
  });

  it('undo handles page add/rename/delete sequence', () => {
    const initialPages: Page[] = [
      {
        id: 'page-1',
        name: 'Page 1',
        shapes: [],
        groups: [],
        rootLayerIds: [],
      },
    ];
    resetStore(initialPages);

    useStore.getState().addPage();
    const afterAdd = useStore.getState();
    const addedPageId = afterAdd.currentPageId;
    expect(afterAdd.pages.length).toBe(2);

    useStore.getState().renamePage('page-1', 'Home');
    expect(useStore.getState().pages.find((page) => page.id === 'page-1')?.name).toBe('Home');

    useStore.getState().deletePage(addedPageId);
    const afterDelete = useStore.getState();
    expect(afterDelete.pages.length).toBe(1);

    afterDelete.undo();
    const undoDelete = useStore.getState();
    expect(undoDelete.pages.length).toBe(2);

    undoDelete.undo();
    const undoRename = useStore.getState();
    expect(undoRename.pages.find((page) => page.id === 'page-1')?.name).toBe('Page 1');

    undoRename.undo();
    const undoAdd = useStore.getState();
    expect(undoAdd.pages.length).toBe(1);
  });
});

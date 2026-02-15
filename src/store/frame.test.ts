import { beforeEach, describe, expect, it } from 'vitest';

import type { Page, Shape } from '../engine/types';
import { ShapeType } from '../engine/types';
import { useStore } from './useStore';

const makeRect = (id: string, x: number): Shape => ({
  id,
  name: `Rect ${id}`,
  type: 'rect',
  x,
  y: 0,
  width: 100,
  height: 100,
  fill: '#fff',
  stroke: '#000',
  strokeWidth: 1,
  rotation: 0,
  locked: false,
});

const resetStore = (pages: Page[], selectedIds: string[]) => {
  useStore.setState({
    pages,
    currentPageId: 'page-1',
    selectedIds,
    history: [{ pages, currentPageId: 'page-1', selectedIds }],
    historyIndex: 0,
    clipboard: null,
    camera: { x: 0, y: 0, zoom: 1 },
    mode: 'select',
    showGrid: false,
    pixelSnapEnabled: true,
    confirmDeleteId: null,
    confirmDeleteGroupId: null,
    leftSidebarVisible: true,
    rightSidebarVisible: true,
  });
};

describe('frame behavior', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear();
    if ((useStore as unknown as { persist?: { clearStorage?: () => void } }).persist?.clearStorage) {
      (useStore as unknown as { persist: { clearStorage: () => void } }).persist.clearStorage();
    }
  });

  it('creates a frame from current selection and assigns frameId', () => {
    const pages: Page[] = [
      {
        id: 'page-1',
        name: 'Page 1',
        shapes: [makeRect('a', 0), makeRect('b', 140)],
        groups: [],
      },
    ];
    resetStore(pages, ['a', 'b']);

    useStore.getState().createFrameFromSelection();
    const page = useStore.getState().pages[0];
    const frame = page.shapes.find((shape) => shape.type === ShapeType.Frame);

    expect(frame).toBeTruthy();
    if (!frame || frame.type !== ShapeType.Frame) return;
    expect(frame.clipContent).toBe(true);

    const childShapes = page.shapes.filter((shape) => shape.id === 'a' || shape.id === 'b');
    expect(childShapes.every((shape) => shape.frameId === frame.id)).toBe(true);
    expect(useStore.getState().selectedIds).toEqual([frame.id]);
  });

  it('keeps parent frame hierarchy when creating nested frame from selection', () => {
    const parentFrame: Shape = {
      id: 'parent-frame',
      name: 'Parent Frame',
      type: ShapeType.Frame,
      x: -20,
      y: -20,
      width: 400,
      height: 300,
      fill: '#fff',
      stroke: '#000',
      strokeWidth: 1,
      rotation: 0,
      clipContent: true,
      locked: false,
    };
    const childA = { ...makeRect('a', 0), frameId: parentFrame.id };
    const childB = { ...makeRect('b', 140), frameId: parentFrame.id };
    const pages: Page[] = [
      {
        id: 'page-1',
        name: 'Page 1',
        shapes: [parentFrame, childA, childB],
        groups: [],
      },
    ];
    resetStore(pages, ['a', 'b']);

    useStore.getState().createFrameFromSelection();
    const page = useStore.getState().pages[0];
    const nestedFrame = page.shapes.find(
      (shape) => shape.type === ShapeType.Frame && shape.id !== parentFrame.id
    );

    expect(nestedFrame).toBeTruthy();
    if (!nestedFrame) return;
    expect(nestedFrame.frameId).toBe(parentFrame.id);

    const children = page.shapes.filter((shape) => shape.id === 'a' || shape.id === 'b');
    expect(children.every((shape) => shape.frameId === nestedFrame.id)).toBe(true);
  });

  it('moves selection into selected frame and can remove it back out', () => {
    const frame: Shape = {
      id: 'frame-1',
      name: 'Frame 1',
      type: ShapeType.Frame,
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      fill: '#fff',
      stroke: '#000',
      strokeWidth: 1,
      rotation: 0,
      clipContent: true,
      locked: false,
    };
    const rectA = makeRect('a', 10);
    const pages: Page[] = [
      {
        id: 'page-1',
        name: 'Page 1',
        shapes: [frame, rectA],
        groups: [],
      },
    ];
    resetStore(pages, ['frame-1', 'a']);

    useStore.getState().moveSelectionIntoFrame('frame-1');
    expect(useStore.getState().pages[0].shapes.find((shape) => shape.id === 'a')?.frameId).toBe('frame-1');

    useStore.getState().setSelectedIds(['a']);
    useStore.getState().removeSelectionFromFrame();
    expect(useStore.getState().pages[0].shapes.find((shape) => shape.id === 'a')?.frameId).toBeUndefined();
  });
});

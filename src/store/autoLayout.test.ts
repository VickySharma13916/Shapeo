import { beforeEach, describe, expect, it } from 'vitest';

import type { Page, Shape } from '../engine/types';
import { ShapeType } from '../engine/types';
import { useStore } from './useStore';

const makeRect = (
  id: string,
  x: number,
  y: number,
  width = 50,
  height = 30,
  frameId?: string
): Shape => ({
  id,
  name: `Rect ${id}`,
  type: 'rect',
  x,
  y,
  width,
  height,
  fill: '#fff',
  stroke: '#000',
  strokeWidth: 1,
  rotation: 0,
  locked: false,
  ...(frameId ? { frameId } : {}),
});

const makeFrame = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  frameId?: string
): Shape => ({
  id,
  name: `Frame ${id}`,
  type: ShapeType.Frame,
  x,
  y,
  width,
  height,
  fill: '#fff',
  stroke: '#000',
  strokeWidth: 1,
  rotation: 0,
  locked: false,
  clipContent: true,
  ...(frameId ? { frameId } : {}),
});

const resetStore = (pages: Page[]) => {
  useStore.setState({
    pages,
    currentPageId: 'page-1',
    selectedIds: [],
    history: [{ pages, currentPageId: 'page-1', selectedIds: [] }],
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

describe('auto-layout behavior', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear();
    if ((useStore as unknown as { persist?: { clearStorage?: () => void } }).persist?.clearStorage) {
      (useStore as unknown as { persist: { clearStorage: () => void } }).persist.clearStorage();
    }
  });

  it('applies horizontal auto-layout to direct frame children', () => {
    const frame = makeFrame('f1', 0, 0, 300, 200);
    const a = makeRect('a', 180, 140, 50, 30, frame.id);
    const b = makeRect('b', 220, 170, 50, 30, frame.id);
    resetStore([{ id: 'page-1', name: 'Page 1', shapes: [frame, a, b], groups: [] }]);

    useStore.getState().updateShape(frame.id, {
      layoutMode: 'horizontal',
      layoutGap: 10,
      layoutPadding: { top: 20, right: 20, bottom: 20, left: 20 },
      primaryAxisAlign: 'start',
      crossAxisAlign: 'start',
    });

    const shapes = useStore.getState().pages[0].shapes;
    const nextA = shapes.find((shape) => shape.id === 'a');
    const nextB = shapes.find((shape) => shape.id === 'b');
    expect(nextA?.x).toBe(20);
    expect(nextA?.y).toBe(20);
    expect(nextB?.x).toBe(80);
    expect(nextB?.y).toBe(20);
  });

  it('recomputes child positions when auto-layout frame is resized', () => {
    const frame = makeFrame('f2', 0, 0, 300, 200);
    const a = makeRect('a', 0, 0, 50, 20, frame.id);
    const b = makeRect('b', 0, 0, 50, 20, frame.id);
    resetStore([{ id: 'page-1', name: 'Page 1', shapes: [frame, a, b], groups: [] }]);

    useStore.getState().updateShape(frame.id, {
      layoutMode: 'horizontal',
      layoutGap: 10,
      layoutPadding: { top: 10, right: 10, bottom: 10, left: 10 },
      primaryAxisAlign: 'center',
      crossAxisAlign: 'center',
    });
    useStore.getState().updateShape(frame.id, { width: 400 });

    const shapes = useStore.getState().pages[0].shapes;
    const nextA = shapes.find((shape) => shape.id === 'a');
    const nextB = shapes.find((shape) => shape.id === 'b');
    expect(nextA?.x).toBe(145);
    expect(nextA?.y).toBe(90);
    expect(nextB?.x).toBe(205);
    expect(nextB?.y).toBe(90);
  });

  it('reflows nested frame children after parent frame movement', () => {
    const parent = makeFrame('parent', 0, 0, 260, 180);
    const childFrame: Shape = {
      id: 'child-frame',
      name: 'Frame child-frame',
      type: ShapeType.Frame,
      x: 20,
      y: 20,
      width: 120,
      height: 100,
      fill: '#fff',
      stroke: '#000',
      strokeWidth: 1,
      rotation: 0,
      locked: false,
      clipContent: true,
      frameId: parent.id,
      layoutMode: 'vertical',
      layoutGap: 8,
      layoutPadding: { top: 5, right: 5, bottom: 5, left: 5 },
      primaryAxisAlign: 'start',
      crossAxisAlign: 'start',
    };
    const childRect = makeRect('child-rect', 25, 25, 30, 20, childFrame.id);
    resetStore([{ id: 'page-1', name: 'Page 1', shapes: [parent, childFrame, childRect], groups: [] }]);

    useStore.getState().updateShape(parent.id, {
      layoutMode: 'horizontal',
      layoutGap: 10,
      layoutPadding: { top: 10, right: 10, bottom: 10, left: 10 },
      primaryAxisAlign: 'start',
      crossAxisAlign: 'start',
    });
    useStore.getState().updateShape(parent.id, { x: 100 });

    const shapes = useStore.getState().pages[0].shapes;
    const nextChildFrame = shapes.find((shape) => shape.id === childFrame.id);
    const nextChildRect = shapes.find((shape) => shape.id === childRect.id);
    expect(nextChildFrame?.x).toBe(110);
    expect(nextChildFrame?.y).toBe(10);
    expect(nextChildRect?.x).toBe(115);
    expect(nextChildRect?.y).toBe(15);
  });

  it('auto-layout updates are undoable/redoable', () => {
    const frame = makeFrame('f3', 0, 0, 260, 180);
    const a = makeRect('a', 140, 80, 40, 20, frame.id);
    resetStore([{ id: 'page-1', name: 'Page 1', shapes: [frame, a], groups: [] }]);

    useStore.getState().updateShape(
      frame.id,
      {
        layoutMode: 'horizontal',
        layoutGap: 10,
        layoutPadding: { top: 10, right: 10, bottom: 10, left: 10 },
      },
      true
    );

    expect(useStore.getState().pages[0].shapes.find((shape) => shape.id === 'a')?.x).toBe(10);

    useStore.getState().undo();
    expect(useStore.getState().pages[0].shapes.find((shape) => shape.id === 'a')?.x).toBe(140);

    useStore.getState().redo();
    expect(useStore.getState().pages[0].shapes.find((shape) => shape.id === 'a')?.x).toBe(10);
  });

  it('reflows frame children after z-order bring-to-front reordering', () => {
    const frame = makeFrame('f4', 0, 0, 300, 180);
    const a = makeRect('a', 0, 0, 40, 20, frame.id);
    const b = makeRect('b', 0, 0, 40, 20, frame.id);
    resetStore([{ id: 'page-1', name: 'Page 1', shapes: [frame, a, b], groups: [] }]);

    useStore.getState().updateShape(frame.id, {
      layoutMode: 'horizontal',
      layoutGap: 10,
      layoutPadding: { top: 10, right: 10, bottom: 10, left: 10 },
      primaryAxisAlign: 'start',
      crossAxisAlign: 'start',
    });
    useStore.getState().setSelectedIds(['a']);
    useStore.getState().bringToFront();

    const shapes = useStore.getState().pages[0].shapes;
    const nextA = shapes.find((shape) => shape.id === 'a');
    const nextB = shapes.find((shape) => shape.id === 'b');
    expect(nextB?.x).toBe(10);
    expect(nextA?.x).toBe(60);
  });

  it('reflows frame children after Layers panel drag-drop reorder', () => {
    const frame = makeFrame('f5', 0, 0, 300, 180);
    const a = makeRect('a', 0, 0, 40, 20, frame.id);
    const b = makeRect('b', 0, 0, 40, 20, frame.id);
    resetStore([
      {
        id: 'page-1',
        name: 'Page 1',
        shapes: [frame, a, b],
        groups: [],
        rootLayerIds: ['shape:f5', 'shape:a', 'shape:b'],
      },
    ]);

    useStore.getState().updateShape(frame.id, {
      layoutMode: 'horizontal',
      layoutGap: 10,
      layoutPadding: { top: 10, right: 10, bottom: 10, left: 10 },
      primaryAxisAlign: 'start',
      crossAxisAlign: 'start',
    });
    useStore.getState().moveLayerNode('shape:b', 'shape:a', 'before');

    const shapes = useStore.getState().pages[0].shapes;
    const nextA = shapes.find((shape) => shape.id === 'a');
    const nextB = shapes.find((shape) => shape.id === 'b');
    expect(nextB?.x).toBe(10);
    expect(nextA?.x).toBe(60);
  });

  it('supports space-between primary alignment', () => {
    const frame = makeFrame('f6', 0, 0, 300, 120);
    const a = makeRect('a', 0, 0, 40, 20, frame.id);
    const b = makeRect('b', 0, 0, 40, 20, frame.id);
    const c = makeRect('c', 0, 0, 40, 20, frame.id);
    resetStore([{ id: 'page-1', name: 'Page 1', shapes: [frame, a, b, c], groups: [] }]);

    useStore.getState().updateShape(frame.id, {
      layoutMode: 'horizontal',
      layoutGap: 10,
      layoutPadding: { top: 10, right: 10, bottom: 10, left: 10 },
      primaryAxisAlign: 'space-between',
      crossAxisAlign: 'start',
    });

    const shapes = useStore.getState().pages[0].shapes;
    const nextA = shapes.find((shape) => shape.id === 'a');
    const nextB = shapes.find((shape) => shape.id === 'b');
    const nextC = shapes.find((shape) => shape.id === 'c');
    expect(nextA?.x).toBe(10);
    expect(nextB?.x).toBe(130);
    expect(nextC?.x).toBe(250);
  });

  it('enforces auto-layout frame minimum size from children and padding', () => {
    const frame = makeFrame('f7', 0, 0, 300, 120);
    const a = makeRect('a', 0, 0, 100, 20, frame.id);
    const b = makeRect('b', 0, 0, 100, 20, frame.id);
    resetStore([{ id: 'page-1', name: 'Page 1', shapes: [frame, a, b], groups: [] }]);

    useStore.getState().updateShape(frame.id, {
      layoutMode: 'horizontal',
      layoutGap: 10,
      layoutPadding: { top: 10, right: 10, bottom: 10, left: 10 },
      primaryAxisAlign: 'start',
      crossAxisAlign: 'start',
    });
    useStore.getState().updateShape(frame.id, { width: 50, height: 5 });

    const resized = useStore.getState().pages[0].shapes.find((shape) => shape.id === frame.id);
    expect(resized?.width).toBe(230);
    expect(resized?.height).toBe(40);
  });
});

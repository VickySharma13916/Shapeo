import { describe, expect, it } from 'vitest';

import type { Shape } from '../../engine/types';

import { getCanvasCursor } from './cursor';

const rectShape: Shape = {
  id: 'rect-1',
  type: 'rect',
  x: 0,
  y: 0,
  width: 100,
  height: 80,
  fill: '#ffffff',
  stroke: '#000000',
  strokeWidth: 1,
  rotation: 0,
};

const lineShape: Shape = {
  id: 'line-1',
  type: 'line',
  x: 10,
  y: 10,
  x2: 110,
  y2: 10,
  width: 100,
  height: 0,
  fill: '#000000',
  stroke: '#000000',
  strokeWidth: 2,
  rotation: 0,
};

describe('interaction cursor', () => {
  it('does not show edge-resize cursor on line body', () => {
    const cursor = getCanvasCursor({
      mode: 'select',
      selectedShape: lineShape,
      worldPos: { x: 60, y: 10 },
      zoom: 1,
    });

    expect(cursor).toBe('default');
  });

  it('shows edge-resize cursor for non-line edge hover', () => {
    const cursor = getCanvasCursor({
      mode: 'select',
      selectedShape: rectShape,
      worldPos: { x: 50, y: 0 },
      zoom: 1,
    });

    expect(cursor).toBe('ns-resize');
  });

  it('shows not-allowed cursor for locked selected shape', () => {
    const cursor = getCanvasCursor({
      mode: 'select',
      selectedShape: { ...rectShape, locked: true },
      worldPos: { x: 50, y: 0 },
      zoom: 1,
    });

    expect(cursor).toBe('not-allowed');
  });
});

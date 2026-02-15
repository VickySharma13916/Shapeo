import { describe, expect, it } from 'vitest';

import type { Shape } from '../engine/types';

import { bringSelectedToFront, moveSelectedBackward, moveSelectedForward, sendSelectedToBack } from './layerOrder';

const createRect = (id: string): Shape => ({
  id,
  type: 'rect',
  x: 0,
  y: 0,
  width: 10,
  height: 10,
  fill: '#fff',
  stroke: '#000',
  strokeWidth: 1,
  rotation: 0,
});

describe('layer order helpers', () => {
  const shapes = [createRect('a'), createRect('b'), createRect('c'), createRect('d')];

  it('brings selected to front preserving relative order', () => {
    const result = bringSelectedToFront(shapes, ['b', 'd']);
    expect(result.shapes.map((shape) => shape.id)).toEqual(['a', 'c', 'b', 'd']);
    expect(result.changed).toBe(true);
  });

  it('sends selected to back preserving relative order', () => {
    const result = sendSelectedToBack(shapes, ['b', 'd']);
    expect(result.shapes.map((shape) => shape.id)).toEqual(['b', 'd', 'a', 'c']);
    expect(result.changed).toBe(true);
  });

  it('moves contiguous selection forward as one step', () => {
    const result = moveSelectedForward(shapes, ['b', 'c']);
    expect(result.shapes.map((shape) => shape.id)).toEqual(['a', 'd', 'b', 'c']);
    expect(result.changed).toBe(true);
  });

  it('moves contiguous selection backward as one step', () => {
    const result = moveSelectedBackward(shapes, ['b', 'c']);
    expect(result.shapes.map((shape) => shape.id)).toEqual(['b', 'c', 'a', 'd']);
    expect(result.changed).toBe(true);
  });

  it('returns unchanged when already at front', () => {
    const result = moveSelectedForward(shapes, ['d']);
    expect(result.shapes.map((shape) => shape.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(result.changed).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import type { Shape } from '../engine/types';
import { duplicateShapeForPaste } from './clipboard';

describe('clipboard paste duplication', () => {
  it('offsets both endpoints for lines', () => {
    const line: Shape = {
      id: 'line-1',
      type: 'line',
      x: 10,
      y: 20,
      x2: 110,
      y2: 80,
      width: 100,
      height: 60,
      fill: '#000000',
      stroke: '#000000',
      strokeWidth: 2,
      rotation: 0,
      lineCap: 'round',
    };

    const pasted = duplicateShapeForPaste(line);
    expect(pasted.type).toBe('line');
    if (pasted.type !== 'line') {
      throw new Error('Expected a line shape');
    }
    expect(pasted.x).toBe(30);
    expect(pasted.y).toBe(40);
    expect(pasted.x2).toBe(130);
    expect(pasted.y2).toBe(100);
  });

  it('offsets rect position while preserving size', () => {
    const rect: Shape = {
      id: 'rect-1',
      type: 'rect',
      x: 5,
      y: 6,
      width: 100,
      height: 100,
      fill: '#fff',
      stroke: '#000',
      strokeWidth: 1,
      rotation: 0,
    };

    const pasted = duplicateShapeForPaste(rect);
    expect(pasted.x).toBe(25);
    expect(pasted.y).toBe(26);
    expect(pasted.width).toBe(100);
    expect(pasted.height).toBe(100);
  });
});

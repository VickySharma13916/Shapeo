import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Shape } from './types';
import { exportSelectionToPNG, exportToPNG } from './export';

type MockCtx = {
  beginPath: ReturnType<typeof vi.fn>;
  roundRect: ReturnType<typeof vi.fn>;
  rect: ReturnType<typeof vi.fn>;
  clip: ReturnType<typeof vi.fn>;
  fill: ReturnType<typeof vi.fn>;
  fillRect: ReturnType<typeof vi.fn>;
  stroke: ReturnType<typeof vi.fn>;
  moveTo: ReturnType<typeof vi.fn>;
  lineTo: ReturnType<typeof vi.fn>;
  ellipse: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  restore: ReturnType<typeof vi.fn>;
  translate: ReturnType<typeof vi.fn>;
  rotate: ReturnType<typeof vi.fn>;
  drawImage: ReturnType<typeof vi.fn>;
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  lineCap: CanvasLineCap;
  globalAlpha: number;
};

const makeCtx = (): MockCtx => ({
  beginPath: vi.fn(),
  roundRect: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
  fill: vi.fn(),
  fillRect: vi.fn(),
  stroke: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  ellipse: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  drawImage: vi.fn(),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  lineCap: 'butt',
  globalAlpha: 1,
});

class MockImage {
  onload: null | (() => void) = null;
  onerror: null | (() => void) = null;
  complete = false;
  naturalWidth = 100;
  naturalHeight = 100;
  private _src = '';

  set src(value: string) {
    this._src = value;
    this.complete = true;
    queueMicrotask(() => {
      this.onload?.();
    });
  }

  get src() {
    return this._src;
  }
}

describe('export regressions', () => {
  const originalDocument = globalThis.document;
  const originalImage = globalThis.Image;

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.document = originalDocument;
    globalThis.Image = originalImage;
  });

  it('exports a single image after reload when only src exists', async () => {
    const ctx = makeCtx();
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ctx),
      toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
    };
    const link = {
      download: '',
      href: '',
      click: vi.fn(),
    };

    globalThis.document = {
      createElement: vi.fn((tag: string) => {
        if (tag === 'canvas') return canvas;
        if (tag === 'a') return link;
        return {};
      }),
    } as unknown as Document;
    globalThis.Image = MockImage as unknown as typeof Image;

    const imageShape: Shape = {
      id: 'img-1',
      name: 'Image',
      type: 'image',
      x: 10,
      y: 20,
      width: 200,
      height: 120,
      src: 'data:image/png;base64,something',
      fill: 'transparent',
      stroke: '#000000',
      strokeWidth: 0,
      rotation: 0,
      opacity: 1,
      locked: false,
    };

    await exportToPNG(imageShape);

    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
    expect(link.click).toHaveBeenCalledTimes(1);
    expect(link.download).toContain('image-');
  });

  it('exports mixed grouped selection containing image, rect, and line', async () => {
    const ctx = makeCtx();
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ctx),
      toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
    };
    const link = {
      download: '',
      href: '',
      click: vi.fn(),
    };

    globalThis.document = {
      createElement: vi.fn((tag: string) => {
        if (tag === 'canvas') return canvas;
        if (tag === 'a') return link;
        return {};
      }),
    } as unknown as Document;
    globalThis.Image = MockImage as unknown as typeof Image;

    const shapes: Shape[] = [
      {
        id: 'img-1',
        name: 'Image',
        type: 'image',
        x: 0,
        y: 0,
        width: 80,
        height: 80,
        src: 'data:image/png;base64,image',
        fill: 'transparent',
        stroke: '#000000',
        strokeWidth: 0,
        rotation: 0,
        opacity: 1,
        locked: false,
      },
      {
        id: 'rect-1',
        type: 'rect',
        x: 100,
        y: 10,
        width: 90,
        height: 70,
        fill: '#ff0000',
        stroke: '#000000',
        strokeWidth: 1,
        rotation: 0,
        locked: false,
      },
      {
        id: 'line-1',
        type: 'line',
        x: 20,
        y: 120,
        x2: 200,
        y2: 120,
        width: 180,
        height: 0,
        fill: 'transparent',
        stroke: '#000000',
        strokeWidth: 2,
        rotation: 0,
        locked: false,
      },
    ];

    await exportSelectionToPNG(shapes);

    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
    expect(link.click).toHaveBeenCalledTimes(1);
    expect(link.download).toBe('selection-3-objects.png');
  });
});

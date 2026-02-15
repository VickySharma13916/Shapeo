import type { Shape } from '../engine/types';

type Padding = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

const DEFAULT_PADDING: Padding = { top: 16, right: 16, bottom: 16, left: 16 };

const normalizePadding = (shape: Shape): Padding => {
  if (shape.type !== 'frame') return DEFAULT_PADDING;
  return {
    top: shape.layoutPadding?.top ?? DEFAULT_PADDING.top,
    right: shape.layoutPadding?.right ?? DEFAULT_PADDING.right,
    bottom: shape.layoutPadding?.bottom ?? DEFAULT_PADDING.bottom,
    left: shape.layoutPadding?.left ?? DEFAULT_PADDING.left,
  };
};

const getFrameDepth = (frame: Shape, shapeById: Map<string, Shape>): number => {
  const visited = new Set<string>();
  let depth = 0;
  let parentId = frame.frameId;

  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = shapeById.get(parentId);
    if (!parent || parent.type !== 'frame') break;
    depth += 1;
    parentId = parent.frameId;
  }

  return depth;
};

const getAlignedOffset = (
  contentSize: number,
  containerSize: number,
  align: 'start' | 'center' | 'end' | 'space-between'
): number => {
  if (align === 'space-between') return 0;
  if (align === 'center') return (containerSize - contentSize) / 2;
  if (align === 'end') return containerSize - contentSize;
  return 0;
};

const moveShapeTo = (shape: Shape, x: number, y: number): Shape => {
  if (shape.type === 'line') {
    const dx = x - shape.x;
    const dy = y - shape.y;
    return {
      ...shape,
      x,
      y,
      x2: shape.x2 + dx,
      y2: shape.y2 + dy,
    };
  }

  return { ...shape, x, y };
};

export const applyAutoLayoutToShapes = (inputShapes: Shape[]): Shape[] => {
  const frames = inputShapes.filter(
    (shape) => shape.type === 'frame' && (shape.layoutMode ?? 'none') !== 'none'
  );
  if (frames.length === 0) return inputShapes;

  let shapes = inputShapes;
  const byId = new Map(shapes.map((shape) => [shape.id, shape]));
  const sortedFrames = [...frames].sort(
    (a, b) => getFrameDepth(a, byId) - getFrameDepth(b, byId)
  );

  sortedFrames.forEach((frameRef) => {
    const frame = byId.get(frameRef.id);
    if (!frame || frame.type !== 'frame') return;

    const mode = frame.layoutMode ?? 'none';
    if (mode === 'none') return;

    const children = shapes.filter((shape) => shape.frameId === frame.id);
    if (children.length === 0) return;

    const padding = normalizePadding(frame);
    const gap = Math.max(0, frame.layoutGap ?? 0);
    const primaryAlign = frame.primaryAxisAlign ?? 'start';
    const crossAlign = frame.crossAxisAlign ?? 'start';
    const innerWidth = Math.max(0, frame.width - padding.left - padding.right);
    const innerHeight = Math.max(0, frame.height - padding.top - padding.bottom);
    const isHorizontal = mode === 'horizontal';
    const totalPrimary =
      children.reduce(
        (sum, child) => sum + Math.max(0, isHorizontal ? child.width : child.height),
        0
      ) +
      gap * Math.max(0, children.length - 1);
    const primaryContainer = isHorizontal ? innerWidth : innerHeight;
    const crossContainer = isHorizontal ? innerHeight : innerWidth;
    const basePrimary = children.reduce(
      (sum, child) => sum + Math.max(0, isHorizontal ? child.width : child.height),
      0
    );
    const dynamicGap =
      primaryAlign === 'space-between' && children.length > 1
        ? Math.max(0, (primaryContainer - basePrimary) / (children.length - 1))
        : gap;
    let cursor = (isHorizontal ? frame.x + padding.left : frame.y + padding.top) +
      getAlignedOffset(totalPrimary, primaryContainer, primaryAlign);

    const nextById = new Map<string, Shape>();
    children.forEach((child) => {
      const crossSize = Math.max(0, isHorizontal ? child.height : child.width);
      const crossOffset = getAlignedOffset(crossSize, crossContainer, crossAlign);
      const x = isHorizontal ? cursor : frame.x + padding.left + crossOffset;
      const y = isHorizontal ? frame.y + padding.top + crossOffset : cursor;
      nextById.set(child.id, moveShapeTo(child, x, y));
      cursor += Math.max(0, isHorizontal ? child.width : child.height) + dynamicGap;
    });

    shapes = shapes.map((shape) => nextById.get(shape.id) ?? shape);
    byId.clear();
    shapes.forEach((shape) => byId.set(shape.id, shape));
  });

  return shapes;
};

export const getFrameAutoLayoutMinSize = (
  frame: Extract<Shape, { type: 'frame' }>,
  shapes: Shape[]
) => {
  const mode = frame.layoutMode ?? 'none';
  if (mode === 'none') {
    return { minWidth: 1, minHeight: 1 };
  }

  const children = shapes.filter((shape) => shape.frameId === frame.id);
  const padding = normalizePadding(frame);
  const gap = Math.max(0, frame.layoutGap ?? 0);
  const isHorizontal = mode === 'horizontal';
  const childrenPrimary = children.reduce(
    (sum, child) => sum + Math.max(0, isHorizontal ? child.width : child.height),
    0
  );
  const childrenCross = children.reduce(
    (max, child) => Math.max(max, Math.max(0, isHorizontal ? child.height : child.width)),
    0
  );
  const spacing = gap * Math.max(0, children.length - 1);

  if (isHorizontal) {
    return {
      minWidth: Math.max(1, padding.left + padding.right + childrenPrimary + spacing),
      minHeight: Math.max(1, padding.top + padding.bottom + childrenCross),
    };
  }

  return {
    minWidth: Math.max(1, padding.left + padding.right + childrenCross),
    minHeight: Math.max(1, padding.top + padding.bottom + childrenPrimary + spacing),
  };
};

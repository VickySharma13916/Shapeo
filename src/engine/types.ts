export type Point = {
  x: number;
  y: number;
};

export type Camera = {
  x: number;
  y: number;
  zoom: number;
};

export const ShapeType = {
  Rectangle: 'rect',
  Circle: 'circle',
  Line: 'line',
  Ellipse: 'ellipse',
  Image: 'image',
  Plus: "plus",
} as const;

export type ShapeType = typeof ShapeType[keyof typeof ShapeType];

// Added support for professional styling properties
export interface BaseShape {
  id: string;
  name?: string;
  type: ShapeType;
  groupId?: string;
  locked?: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  fillOpacity?: number;
  stroke: string;
  strokeWidth: number;
  strokeOpacity?: number;
  strokeAlignment?: 'Inside' | 'Center' | 'Outside';
  rotation: number;
  opacity?: number;
  cornerRadius?: number;
  aspectRatioLocked?: boolean;
  shadow?: {
    color: string;
    blur: number;
    x: number;
    y: number;
    enabled: boolean;
  };
}

export interface RectShape extends BaseShape {
  type: 'rect';
}

export interface CircleShape extends BaseShape {
  type: 'circle';
}

export interface ImageShape extends BaseShape {
  type: 'image';
  src: string;
  imageElement?: HTMLImageElement;
}

export interface LineShape extends BaseShape {
  type: 'line';
  x2: number;
  y2: number;
  lineCap?: 'butt' | 'round' | 'square';
}

export interface EllipseShape extends BaseShape {
  type: 'ellipse';
  rx: number;
  ry: number;
}

export type Shape = RectShape | CircleShape | ImageShape | LineShape | EllipseShape;


export type Handle = 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se';

export type Mode = 'select' | 'pan';

// New: For Page-based organization
export interface LayerGroup {
  id: string;
  name: string;
  parentGroupId?: string;
  childIds?: string[];
  collapsed?: boolean;
}

export interface Page {
  id: string;
  name: string;
  shapes: Shape[];
  rootLayerIds?: string[];
  groups?: LayerGroup[];
}

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
  Image: 'image',
} as const;

export type ShapeType = typeof ShapeType[keyof typeof ShapeType];

// Added support for professional styling properties
export interface BaseShape {
  id: string;
  type: ShapeType;
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

export type Shape = RectShape | CircleShape | ImageShape;

export type Handle = 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se';

export type Mode = 'select' | 'pan';

// New: For Page-based organization
export interface Page {
  id: string;
  name: string;
  shapes: Shape[];
}
export type ElementType = 
  | 'round-table' 
  | 'long-table' 
  | 'chair' 
  | 'centerpiece' 
  | 'stage' 
  | 'dance-floor'
  | 'aisle'
  | 'arch'
  | 'buffet'
  | 'bar'
  | 'cake-table'
  | 'vip-table';

export interface LayoutElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  rotation: number;
  width: number; // in meters
  height: number; // in meters
  radius?: number; // in meters (for round tables)
  chairCount?: number;
  color?: string;
  label?: string;
}

export interface VenueDimensions {
  width: number; // in meters
  height: number; // in meters
}

export interface WeddingLayout {
  id?: string;
  userId: string;
  name: string;
  elements: LayoutElement[];
  venueDimensions: VenueDimensions;
  createdAt?: any;
  updatedAt?: any;
}

export const SCALE = 50; // 1 meter = 50 pixels

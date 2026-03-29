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
  | 'vip-table'
  | 'custom-rect'
  | 'custom-triangle'
  | 'custom-hexagon'
  | 'akad-table';

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
  chairLabels?: string[];
  color?: string;
  label?: string;
  groupId?: string;
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

export interface PersistentRuler {
  id: string;
  p1: { x: number; y: number };
  p2: { x: number; y: number };
}

export const SCALE = 50; // 1 meter = 50 pixels

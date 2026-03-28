import { LayoutElement } from './types';

export const DEFAULT_ELEMENTS: Record<string, Partial<LayoutElement>> = {
  'round-table': {
    type: 'round-table',
    radius: 0.9, // 1.8m diameter
    chairCount: 8,
    color: '#ffffff',
    label: 'Round Table',
  },
  'long-table': {
    type: 'long-table',
    width: 1.8,
    height: 0.75,
    chairCount: 6,
    color: '#ffffff',
    label: 'Long Table',
  },
  'chair': {
    type: 'chair',
    width: 0.45,
    height: 0.45,
    color: '#e5e7eb',
    label: 'Chair',
  },
  'stage': {
    type: 'stage',
    width: 6,
    height: 3,
    color: '#374151',
    label: 'Stage',
  },
  'dance-floor': {
    type: 'dance-floor',
    width: 5,
    height: 5,
    color: '#f3f4f6',
    label: 'Dance Floor',
  },
  'centerpiece': {
    type: 'centerpiece',
    width: 0.3,
    height: 0.3,
    color: '#fcd34d',
    label: 'Centerpiece',
  },
  'aisle': {
    type: 'aisle',
    width: 1.5,
    height: 10,
    color: '#ffffff',
    label: 'Aisle Runner',
  },
  'arch': {
    type: 'arch',
    width: 2,
    height: 0.6,
    color: '#d4af37',
    label: 'Wedding Arch',
  },
  'buffet': {
    type: 'buffet',
    width: 3,
    height: 0.9,
    color: '#ffffff',
    label: 'Buffet Table',
  },
  'bar': {
    type: 'bar',
    width: 2,
    height: 0.7,
    color: '#1f2937',
    label: 'Bar',
  },
  'cake-table': {
    type: 'cake-table',
    radius: 0.5,
    color: '#ffffff',
    label: 'Cake Table',
  },
  'vip-table': {
    type: 'vip-table',
    width: 3.6,
    height: 0.9,
    chairCount: 10,
    color: '#fef3c7',
    label: 'Bridal Table',
  }
};

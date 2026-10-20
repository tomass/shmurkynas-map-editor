export const mapTypes = ["public", "private"];

// Types of living (housing) a living point can represent
export const livingTypes = ["flat1", "flat2", "house1", "house2"];

// Color mapping for characters
export const tileTypes = {
  'Ž': '#baf455',
  'G': '#454a59', // Light green
  'M': '#7aa21d', // Light blue
  'P': '#4d2926', // Light yellow
  'V': '#5877dd', // Light purple
  '': '#ffffff' // White for empty cells
};// Point classes. These can be added on each map as points.
export const defaultTileType = 'Ž';

// The order in which the fields of a point are written out. Points read from a
// file keep the order they had there; this is only used for points the editor
// creates, and to decide where a field the editor adds later belongs.
export const pointFieldOrder = {
  transfer: ['x', 'y', 'map', 'map_x', 'map_y'],
  living: ['x', 'y', 'type', 'map', 'owner', 'price', 'maintenance'],
};

// Same idea for the attribute lines between [map=...] and [tiles].
export const mapAttrOrder = ['type', 'origin_x', 'origin_y'];

export class TransferPoint {
  constructor(x, y) {
    this.type = 'transfer';
    this.x = x;
    this.y = y;
    this.map = '';
    this.map_x = 0;
    this.map_y = 0;
    this.fields = [...pointFieldOrder.transfer];
    this.extra = {};
  }
}

export class LivingPoint {
  constructor(x, y, livingType) {
    this.type = 'living';
    this.livingType = livingTypes.includes(livingType) ? livingType : livingTypes[0];
    this.x = x;
    this.y = y;
    this.map = '';
    this.owner = '';
    this.price = 0;
    this.maintenance = 0;
    this.fields = [...pointFieldOrder.living];
    this.extra = {};
  }
}

export const mapTypes = ["public", "private"];

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

export class TransferPoint {
  constructor(x, y) {
    this.type = 'transfer';
    this.x = x;
    this.y = y;
    this.map = '';
  }
}

export class LivingPoint {
  constructor(x, y) {
    this.type = 'living';
    this.x = x;
    this.y = y;
    this.map = '';
    this.owner = '';
    this.price = 0;
    this.maintenance = 0;
  }
}

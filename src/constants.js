export const mapTypes = ["public", "private"];

// Types of living (housing) a living point can represent
export const livingTypes = ["flat1", "flat2", "house1", "house2"];

// Tile characters, in toolbar order. Characters are case sensitive: `g` and
// `G`, `p` and `P` are different tiles.
export const tileTypes = {
  'Ž': { color: '#baf455', name: 'Žolė (grass) – numatytoji, vaikščiojama kaladėlė' },
  'G': { color: '#454a59', name: 'Gatvė (road)' },
  'M': { color: '#7aa21d', name: 'Medis (tree)' },
  'P': { color: '#4d2926', name: 'Pastatas (building)' },
  'V': { color: '#5877dd', name: 'Vanduo (water)' },
  // Inside a flat
  'g': { color: '#d2a86e', name: 'Grindys (floor) – buto vidus' },
  'S': { color: '#9e9e9e', name: 'Siena (wall) – buto vidus' },
  'p': { color: '#a8dadc', name: 'Plytelės (tiles) – buto vidus' },
};
export const defaultTileType = 'Ž';

// What to show for a tile character, including one this editor does not know.
export function tileColor(char) {
  return (tileTypes[char] || tileTypes[defaultTileType]).color;
}

export function tileDescription(char) {
  return tileTypes[char] ? `${char} – ${tileTypes[char].name}` : `${char} – nežinoma kaladėlė`;
}

// The order in which the fields of a point are written out. Points read from a
// file keep the order they had there; this is only used for points the editor
// creates, and to decide where a field the editor adds later belongs.
export const pointFieldOrder = {
  transfer: ['x', 'y', 'map', 'map_x', 'map_y'],
  // `id` sits directly after the `living:` line, before x=.
  living: ['id', 'x', 'y', 'type', 'map', 'owner', 'price', 'maintenance'],
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
    // No id until one is minted for it, so a point never writes out a blank one.
    this.fields = pointFieldOrder.living.filter(key => key !== 'id');
    this.extra = {};
  }
}

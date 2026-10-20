import {
  mapTypes,
  mapAttrOrder,
  pointFieldOrder,
  defaultTileType,
  TransferPoint,
  LivingPoint,
} from './constants.js';

// Attributes of a [map=...] section the editor understands. Everything else in
// the attribute area is carried through untouched, in the place it was found.
const KNOWN_MAP_ATTRS = new Set(mapAttrOrder);

// Field name in the file -> property on the point model. A field that is not
// listed here is unknown to the editor and is kept verbatim in `point.extra`,
// so that things like a stable `id=` survive a round trip.
const POINT_FIELD_PROPS = {
  x: 'x',
  y: 'y',
  type: 'livingType',
  map: 'map',
  map_x: 'map_x',
  map_y: 'map_y',
  owner: 'owner',
  price: 'price',
  maintenance: 'maintenance',
};

const NUMERIC_POINT_FIELDS = new Set(['x', 'y', 'map_x', 'map_y', 'price', 'maintenance']);

// Whole integers only, and a value we cannot read as one is left alone rather
// than silently turned into 0.
function toIntOr(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function createMap(name = 'unnamed', options = {}) {
  return {
    name,
    type: options.type || mapTypes[0],
    // World coordinate of the tile at file column 0, bottom file row.
    originX: options.originX || 0,
    originY: options.originY || 0,
    grid: options.grid || Array.from({ length: 10 }, () => Array(10).fill(defaultTileType)),
    points: options.points || [],
    // Attribute keys in the order they are written out.
    attrs: options.attrs || ['type'],
    // Values of the attributes the editor does not understand.
    extraAttrs: options.extraAttrs || {},
  };
}

// --- world coordinates -----------------------------------------------------
//
// The game stores every piece of persistent state - coins, adventures, bought
// living spaces, player positions - in world coordinates, so a tile's world
// coordinate must not change when the map around it grows. `row` is counted
// from the top of the file, as the editor draws it; the loader reverses the
// rows, which is why y is measured from the bottom.

export function tileToWorld(map, col, row) {
  return {
    x: col + map.originX,
    y: (map.grid.length - 1 - row) + map.originY,
  };
}

export function worldToTile(map, worldX, worldY) {
  return {
    col: worldX - map.originX,
    row: map.grid.length - 1 - (worldY - map.originY),
  };
}

// --- map attributes --------------------------------------------------------

export function getMapAttr(map, key) {
  if (key === 'type') return map.type;
  if (key === 'origin_x') return map.originX;
  if (key === 'origin_y') return map.originY;
  return map.extraAttrs[key];
}

function setMapAttr(map, key, value) {
  if (key === 'type') map.type = value;
  else if (key === 'origin_x') map.originX = toIntOr(value, 0);
  else if (key === 'origin_y') map.originY = toIntOr(value, 0);
  else map.extraAttrs[key] = value;
  if (!map.attrs.includes(key)) insertInOrder(map.attrs, key, mapAttrOrder);
}

// --- point fields ----------------------------------------------------------

export function hasPointField(point, key) {
  return point.fields.includes(key);
}

export function getPointField(point, key) {
  const prop = POINT_FIELD_PROPS[key];
  return prop ? point[prop] : point.extra[key];
}

export function setPointField(point, key, value) {
  const prop = POINT_FIELD_PROPS[key];
  if (prop) point[prop] = value;
  else point.extra[key] = value;
  if (!point.fields.includes(key)) {
    insertInOrder(point.fields, key, pointFieldOrder[point.type] || []);
  }
}

// Move a coordinate field by `delta`. A field the file did not have is not
// invented, and one we cannot read as a number is left as it is.
export function bumpPointField(point, key, delta) {
  if (delta === 0 || !hasPointField(point, key)) return;
  const value = getPointField(point, key);
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || String(parsed) !== String(value).trim()) return;
  setPointField(point, key, parsed + delta);
}

// Put `key` where the canonical order says it belongs, so a field the editor
// adds to an existing point does not land at the end of an otherwise tidy block.
function insertInOrder(keys, key, canonical) {
  const rank = canonical.indexOf(key);
  if (rank === -1) {
    keys.push(key);
    return;
  }
  const at = keys.findIndex(existing => {
    const existingRank = canonical.indexOf(existing);
    return existingRank !== -1 && existingRank > rank;
  });
  if (at === -1) keys.push(key);
  else keys.splice(at, 0, key);
}

// --- parsing ---------------------------------------------------------------

export function parseMapFile(text) {
  const maps = [];
  let map = null;
  let section = null;
  let point = null;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
    const trimmed = line.trim();

    const mapStart = /^\[map=(.*)\]$/.exec(trimmed);
    if (mapStart) {
      map = createMap(mapStart[1], { grid: [], points: [], attrs: [] });
      maps.push(map);
      section = 'attrs';
      point = null;
      continue;
    }
    if (!map) continue;

    if (trimmed === '[tiles]') {
      section = 'tiles';
      point = null;
      continue;
    }
    if (trimmed === '[points]') {
      section = 'points';
      point = null;
      continue;
    }

    if (section === 'tiles') {
      if (trimmed !== '') map.grid.push(Array.from(line));
      continue;
    }

    if (section === 'points') {
      const pointStart = /^(transfer|living):$/.exec(trimmed);
      if (pointStart) {
        point = createEmptyPoint(pointStart[1]);
        map.points.push(point);
        continue;
      }
      if (point) readField(line, (key, value) => {
        setPointField(point, key, NUMERIC_POINT_FIELDS.has(key) ? toIntOr(value, value) : value);
      });
      continue;
    }

    if (section === 'attrs') {
      readField(line, (key, value) => setMapAttr(map, key, value));
    }
  }

  maps.forEach(normalizeGrid);
  return maps;
}

// A point with no fields at all; the file decides which ones it has. The
// constructors still give the model sane values for fields the file omits, so
// the sidebar has something to show.
function createEmptyPoint(kind) {
  const point = kind === 'transfer' ? new TransferPoint(0, 0) : new LivingPoint(0, 0);
  point.fields = [];
  point.extra = {};
  return point;
}

// `key=value`, split on the first `=` so that a value may contain one.
function readField(line, assign) {
  const at = line.indexOf('=');
  if (at === -1) return;
  const key = line.slice(0, at).trim();
  if (key) assign(key, line.slice(at + 1).trim());
}

// The game's parser does not pad ragged rows, it would hand the game
// `undefined` tiles, so the matrix is kept strictly rectangular here.
export function normalizeGrid(map) {
  const width = map.grid.reduce((widest, row) => Math.max(widest, row.length), 0);
  for (const row of map.grid) {
    while (row.length < width) row.push(defaultTileType);
  }
}

// --- writing ---------------------------------------------------------------

export function serializeMaps(maps) {
  let content = '';

  for (const map of maps) {
    content += `[map=${map.name}]\n`;

    for (const key of attrsToWrite(map)) {
      const value = getMapAttr(map, key);
      // An origin of 0 is the default, so maps that were never extended keep
      // clean diffs.
      if (KNOWN_MAP_ATTRS.has(key) && key !== 'type' && !value) continue;
      if (value === undefined || value === null) continue;
      content += `${key}=${value}\n`;
    }

    content += '[tiles]\n';
    content += map.grid.map(row => row.join('')).join('\n');
    content += '\n[points]\n';

    for (const point of map.points) {
      content += `${point.type}:\n`;
      for (const key of point.fields) {
        const value = getPointField(point, key);
        if (value === undefined || value === null) continue;
        content += `${key}=${value}\n`;
      }
    }
  }

  return content;
}

function attrsToWrite(map) {
  const keys = [...map.attrs];
  for (const key of ['origin_x', 'origin_y']) {
    if (getMapAttr(map, key) && !keys.includes(key)) insertInOrder(keys, key, mapAttrOrder);
  }
  return keys;
}

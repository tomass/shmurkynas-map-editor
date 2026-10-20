import { defaultTileType } from './constants.js';
import { bumpPointField, getPointField, hasPointField } from './mapFormat.js';

// Growing or trimming a map must not move any tile that already existed: the
// world coordinate of a tile is what the server stores for coins, adventures,
// bought living spaces and player positions, so a map that grows on the west or
// the south side pays for it with its origin instead.
//
//   worldX = col + origin_x
//   worldY = (height - 1 - row) + origin_y
//
// North and south behave differently because origin_y compensates for the
// height, while a point's y= is a plain file row counted from the top:
//
//   east  by N: nothing else changes.
//   west  by N: origin_x -= N; x= += N here; map_x= += N wherever a transfer
//               point in any map targets this one.
//   north by N: origin_y unchanged (the height and the row index grow by the
//               same N and cancel out); y= += N here; map_y= += N in transfers
//               targeting this map.
//   south by N: origin_y -= N; y= and map_y= unchanged.
//
// Trimming is the mirror image, which is what a negative delta means below.

// Does a resize of this shape cut tiles away?
function cuts(delta) {
  return {
    left: Math.max(0, -delta.left),
    right: Math.max(0, -delta.right),
    top: Math.max(0, -delta.top),
    bottom: Math.max(0, -delta.bottom),
  };
}

function normalizeDelta(delta) {
  return {
    left: delta.left || 0,
    right: delta.right || 0,
    top: delta.top || 0,
    bottom: delta.bottom || 0,
  };
}

/**
 * Work out whether a resize can be done without losing anything.
 *
 * Returns `{ ok, width, height, blocking, reason }`. `blocking` lists the
 * points that sit on tiles a trim would cut away - the ones in the map itself
 * and the transfer points elsewhere that aim at those tiles - so the caller can
 * say which points are in the way instead of dropping them.
 */
export function planResize(maps, mapIndex, delta) {
  const map = maps[mapIndex];
  if (!map) return { ok: false, reason: 'no map', blocking: [] };

  const d = normalizeDelta(delta);
  const height = map.grid.length;
  const width = map.grid.reduce((widest, row) => Math.max(widest, row.length), 0);
  const newWidth = width + d.left + d.right;
  const newHeight = height + d.top + d.bottom;

  if (newWidth < 1 || newHeight < 1) {
    return { ok: false, reason: 'empty', width: newWidth, height: newHeight, blocking: [] };
  }

  const cut = cuts(d);
  const isCut = (x, y) =>
    x < cut.left || x >= width - cut.right || y < cut.top || y >= height - cut.bottom;

  const blocking = [];
  if (cut.left || cut.right || cut.top || cut.bottom) {
    for (const point of map.points) {
      if (isCut(point.x, point.y)) {
        blocking.push({ mapName: map.name, point, x: point.x, y: point.y, target: false });
      }
    }
    for (const other of maps) {
      for (const point of other.points) {
        if (!targetsMap(point, map)) continue;
        if (!hasPointField(point, 'map_x') || !hasPointField(point, 'map_y')) continue;
        const x = Number(getPointField(point, 'map_x'));
        const y = Number(getPointField(point, 'map_y'));
        if (!Number.isNaN(x) && !Number.isNaN(y) && isCut(x, y)) {
          blocking.push({ mapName: other.name, point, x, y, target: true });
        }
      }
    }
  }

  return {
    ok: blocking.length === 0,
    reason: blocking.length ? 'points in the way' : '',
    width: newWidth,
    height: newHeight,
    blocking,
  };
}

function targetsMap(point, map) {
  return point.type === 'transfer' && point.map === map.name;
}

/**
 * Resize a map and fix up every coordinate that depends on its size, as one
 * edit: either the whole thing happens or nothing does.
 */
export function applyResize(maps, mapIndex, delta) {
  const plan = planResize(maps, mapIndex, delta);
  if (!plan.ok) return plan;

  const map = maps[mapIndex];
  const d = normalizeDelta(delta);

  for (const row of map.grid) {
    if (d.left > 0) row.unshift(...Array(d.left).fill(defaultTileType));
    else if (d.left < 0) row.splice(0, -d.left);
    if (d.right > 0) row.push(...Array(d.right).fill(defaultTileType));
    else if (d.right < 0) row.splice(d.right);
  }

  const newRows = count =>
    Array.from({ length: count }, () => Array(plan.width).fill(defaultTileType));
  if (d.top > 0) map.grid.unshift(...newRows(d.top));
  else if (d.top < 0) map.grid.splice(0, -d.top);
  if (d.bottom > 0) map.grid.push(...newRows(d.bottom));
  else if (d.bottom < 0) map.grid.splice(d.bottom);

  // Tiles keep their world coordinate: the origin absorbs what was added on
  // the west and the south side.
  map.originX -= d.left;
  map.originY -= d.bottom;

  // Points are addressed in file coordinates, so they follow the tiles.
  for (const point of map.points) {
    bumpPointField(point, 'x', d.left);
    bumpPointField(point, 'y', d.top);
  }
  for (const other of maps) {
    for (const point of other.points) {
      if (!targetsMap(point, map)) continue;
      bumpPointField(point, 'map_x', d.left);
      bumpPointField(point, 'map_y', d.top);
    }
  }

  return plan;
}

// A resize the game cannot read yet: shared/mapParser.js does not understand
// origin_x / origin_y, so a map with a non-zero origin is still misread there.
export function hasOrigin(map) {
  return Boolean(map && (map.originX || map.originY));
}

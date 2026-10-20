import { setPointField } from './mapFormat.js';

// A living point's id is what ownership hangs on: the server follows the id, so
// the owner moves with the house. That makes the id an identity, not a label -
// it is never derived from where the point sits, never rewritten when the point
// moves, and never handed to a second point. An id that came back would give a
// child somebody else's home.
//
//   <map>-<flat|house>-NN     base-flat-07, base-house-03

const ID_PATTERN = /^(.*)-(\d+)$/;

export function livingKind(livingType) {
  return String(livingType).startsWith('house') ? 'house' : 'flat';
}

export function idPrefix(mapName, livingType) {
  return `${String(mapName).toLowerCase()}-${livingKind(livingType)}`;
}

// Two digits, and more than two only once a map runs past 99 of a kind.
function format(prefix, number) {
  return `${prefix}-${String(number).padStart(2, '0')}`;
}

/**
 * Remembers every id the session has seen, including the ids of points that
 * have since been deleted: the highest number per prefix only ever goes up, so
 * deleting the last flat on a map does not free its number for the next one.
 */
export function createIdRegistry(maps = []) {
  const seen = new Set();
  const highWater = new Map();

  function remember(id) {
    if (!id) return;
    seen.add(id);
    const match = ID_PATTERN.exec(id);
    if (!match) return;
    const [, prefix, digits] = match;
    const number = parseInt(digits, 10);
    if (!Number.isNaN(number)) {
      highWater.set(prefix, Math.max(highWater.get(prefix) ?? 0, number));
    }
  }

  for (const map of maps) {
    for (const point of map.points) {
      if (point.type === 'living') remember(point.id);
    }
  }

  return {
    has: id => seen.has(id),
    remember,
    // The next free id for this map and kind: the highest already used plus
    // one, skipping anything already taken anywhere in the file.
    mint(mapName, livingType) {
      const prefix = idPrefix(mapName, livingType);
      let number = (highWater.get(prefix) ?? 0) + 1;
      let id = format(prefix, number);
      while (seen.has(id)) id = format(prefix, ++number);
      remember(id);
      return id;
    },
  };
}

/**
 * Give an id to every living point that has none, in file order. A map file
 * written before ids existed still loads in the game - it falls back to the
 * point's place and warns once - but the editor fills the gap so the next save
 * is a proper one.
 */
export function assignMissingLivingIds(maps, registry) {
  const assigned = [];
  for (const map of maps) {
    for (const point of map.points) {
      if (point.type !== 'living' || point.id) continue;
      const id = registry.mint(map.name, point.livingType);
      setPointField(point, 'id', id);
      assigned.push(id);
    }
  }
  return assigned;
}

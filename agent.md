# AI Agent Guide for [Shmurkynas game map editor]

## **1. Project Overview**
**Purpose**:
A multiplayer tile-based game for kids where players explore maps, complete tasks, and customize living spaces.
Features:
- **Tile types**: Grass, roads, buildings, trees, *transfer tiles* (teleport to other maps), *living tiles* (purchasable homes).
- **Multiplayer**: Real-time player movement, shared world state, and living space customization.
- **Tech Stack**: Vite (frontend), Three.js (3D rendering), [Backend: WebSockets].

**Target Audience**:
Kids aged 6–12 (simple controls, bright visuals, collaborative tasks).

---

## **2. How AI Agents Can Help**
### **Common Tasks**
| Task Type     | Examples                                        | Notes                               |
|---------------|-------------------------------------------------|-------------------------------------|
| **UI/UX**     | Improve mobile controls for tile selection.     | Uses `pointer-lock` for movement.   |

### **Out of Scope**
- **Avoid**: Changing the core tile grid system (fixed 16x16 chunks).
- **Avoid**: Modifying Three.js shader code (custom shaders are legacy).
- **Never**: Hardcode API keys (use `.env` for Firebase/WS endpoints).

---

## **3. Repository Structure**
/
├── /src
│   ├── constants.js      # Project constants, types
│   ├── file.js           # Map uploading, downloading
│   ├── mapFormat.js      # Reading and writing the map file, world coordinates
│   ├── resize.js         # Growing/trimming a map and the coordinate fixups
│   ├── livingIds.js      # Minting and keeping the ids of living points
│   ├── main.js           # Main Game map editor logic
│   └── style.css         # Style file
├── agent.md              # Information about project (this file)
└── index.html            # Main webapp page

**Key Files**:
- `main.js`: Main logic goes here while editor is still small

---

## **4. Conventions & Gotchas**
### **Tile System**
- **Grid**: Chunked tiles (each tile = 42x42 unit in Three.js).
- **Tile Types** which are defined in main.js variable charColors:
  | Type     | Char in setup  | Notes                  |
  |----------|----------------|------------------------|
  | Grass    | `Ž`            | Default walkable tile. |
  | Road     | `G`            |                        |
  | Tree     | `M`            |                        |
  | Building | `P`            |                        |
  | Water    | `V`            |                        |

- **Coordinates**: `(x, y)` = tile grid position; `(x, 0, z)` in Three.js space.

### Map origin and world coordinates
Every persistent piece of state the server keeps - coins and treasure-map pieces
(gamePoints.json), adventures (adventures.json), bought living spaces
(livingSpaces.json) and player positions (players.json) - is in **world**
coordinates. A tile's world coordinate must therefore not change when the map
around it grows, which is what `origin_x` / `origin_y` are for:

    worldX = col + origin_x
    worldY = (height - 1 - row) + origin_y

`col` is counted from the left and `row` from the top of the file, as the editor
draws it; `height` is the number of tile rows of that map. The loader reverses
the rows, which is why y is measured from the bottom. Both attributes are
optional integers, may be negative, and default to 0 - which is exactly the old
behaviour. The editor writes them out only when they are non-zero.

The `x=` / `y=` of a point, and the `map_x=` / `map_y=` of a transfer point, stay
in **file** coordinates with y counted from the top. The loader converts them.

Keeping that invariant across a resize is `resize.js`:

| Resize            | origin        | points in this map | transfers targeting this map |
|-------------------|---------------|--------------------|------------------------------|
| east  (right) +N  | -             | -                  | -                            |
| west  (left)  +N  | `origin_x -= N` | `x += N`         | `map_x += N`                 |
| north (top)   +N  | -             | `y += N`           | `map_y += N`                 |
| south (bottom) +N | `origin_y -= N` | -                | -                            |

North and south differ because `origin_y` compensates for the height, while a
point's `y=` is a plain file row. Trimming is the mirror image, and is refused
outright when it would cut away a tile that carries a point.

`shared/mapParser.js` reads both attributes and turns each point's `x=` / `y=`
into world coordinates as it loads; `map_x=` / `map_y=` are deliberately left
alone there, because they belong to the map a transfer point leads to. A map
with a non-zero origin therefore has to be deployed together with a game that
reads them, which is what the editor's banner says.

### Living point ids
A living point carries an `id=`, written directly after the `living:` line, and
it is what ownership hangs on: the server follows the id, so an owner moves with
the house.

    <map>-<flat|house>-NN      base-flat-07, base-house-03

- Two digits, lowercase; three only once a map passes 99 of a kind.
- `<flat|house>` comes from the living type (flat1/flat2, house1/house2).
- A new living point gets the highest number already used for that map and kind,
  plus one, and the editor gives an id to any living point it loads without one.
- An id is never rewritten: not when the point moves, not when a map is resized,
  not when its living type changes, and never derived from the coordinates.
- An id is never reused and existing points are never renumbered, so
  `livingIds.js` keeps the highest number per map and kind for the whole session
  - deleting the last flat on a map does not free its number. That high-water
  mark is rebuilt from the file on every upload, which is as far back as the
  editor can see.

### Gotchas
- The tile matrix must stay strictly rectangular; the game's parser does not pad
  ragged rows and would hand the game `undefined` tiles. New tiles are `Ž`.
- Attributes and point fields the editor does not recognise are carried through
  a round trip untouched, in the place they were found (`extraAttrs` on a map,
  `extra` on a point). A point's `fields` list is what decides which lines are
  written, and in which order: a field read from a file keeps the place it had
  there, and only a field the editor adds later is put where the canonical order
  says. Use `setPointField` rather than assigning to a point directly.
- Loading a map file written before ids existed is the one time the editor
  changes a file it was only asked to read: it adds the missing `id=` lines, and
  says so. Everything else round-trips byte for byte.

### **Setup file example**
- Setup file consists of multiple maps, all of which have such components:
- [map=base] where base is the name of the map
- optional attribute lines before [tiles]: `type=` (public/private) and
  `origin_x=` / `origin_y=` (see "Map origin and world coordinates")
- [tiles] followed by a character matrix of tile type characters like ŽGMPV.
- [points] lists points in that map
- each point starts with a text "transfer:" for transfer points and "living:" for living points
- after point type all attributes are listed on a separate line, like:
x=29
y=10
type=flat1
map=butas_mazas
owner=
price=0
maintenance=0
- for living points `type=` is the type of living: flat1, flat2, house1 or house2
  (defined in `livingTypes` in constants.js, chosen in the toolbar next to the "Living" tool
  and editable in the point properties sidebar)

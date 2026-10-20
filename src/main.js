import { mapTypes, livingTypes, tileTypes, TransferPoint, LivingPoint, defaultTileType } from './constants';
import { downloadMap, uploadMap } from './file';
import { createMap, tileToWorld, setPointField } from './mapFormat';
import { applyResize, hasOrigin } from './resize';

// Toolbar-1
const newMapBtn = document.getElementById('new-map');
const mapSelect = document.getElementById('map-select');
const mapNameInput = document.getElementById('map-name');
const mapTypeSelect = document.getElementById('map-type-select');
const originXInput = document.getElementById('origin-x');
const originYInput = document.getElementById('origin-y');

const widthInput = document.getElementById('width');
const heightInput = document.getElementById('height');

const generateBtn = document.getElementById('generate'); // TODO: Not actually used, as map is created with new-map
                                                         //       this actually clears the map

const downloadBtn = document.getElementById('download');
const uploadBtn = document.getElementById('upload');
const fileInput = document.getElementById('file-input');

const addRowTopBtn = document.getElementById('add-row-top');
const addRowBottomBtn = document.getElementById('add-row-bottom');
const addColLeftBtn = document.getElementById('add-col-left');
const addColRightBtn = document.getElementById('add-col-right');

const removeRowTopBtn = document.getElementById('remove-row-top');
const removeRowBottomBtn = document.getElementById('remove-row-bottom');
const removeColLeftBtn = document.getElementById('remove-col-left');
const removeColRightBtn = document.getElementById('remove-col-right');

// Toolbar-2
const charButtons = document.querySelectorAll('.char-btn');
const toolButtons = document.querySelectorAll('.tool-btn');
const livingTypeLabel = document.getElementById('living-type-label');
const livingTypeSelect = document.getElementById('living-type-select');

// Properties sidebar
const propertiesSidebar = document.getElementById('properties-sidebar');
const propertiesContent = document.getElementById('properties-content');
const savePropertiesBtn = document.getElementById('save-properties');

// Map area
const gridContainer = document.getElementById('grid');
const coordReadout = document.getElementById('coord-readout');
const originWarning = document.getElementById('origin-warning');
const notice = document.getElementById('notice');

// State
export let maps = [];
let currentMapIndex = 0;
let selectedChar = 'Ž';
let selectedTool = 'select';
let isDrawing = false;
let selectedPoint = null;

// Initialize
function init() {
  createNewMap();
  updateMapTypeSelect();
  updateLivingTypeSelect();
}

export function setCurrentMapIndex(index) {
  currentMapIndex = index;
}

// Create a new map
function createNewMap(name = 'unnamed', grid, points, type) {
  const newMap = createMap(name, { grid, points, type });
  maps.push(newMap);
  currentMapIndex = maps.length - 1;
  renderCurrentMap();
  updateMapSelect();
  updateMapTypeSelect();
}

export function renderCurrentMap() {
  const map = maps[currentMapIndex];
  if (!map) return;

  const { grid, points } = map;
  const currentHeight = grid.length;
  const currentWidth = grid[0]?.length || 0;

  gridContainer.innerHTML = '';
  gridContainer.style.gridTemplateColumns = `repeat(${currentWidth}, 30px)`;

  grid.forEach((row, rowIdx) => {
    row.forEach((cell, colIdx) => {
      const cellElement = document.createElement('div');
      cellElement.className = 'cell';
      cellElement.style.backgroundColor = tileTypes[cell] || tileTypes[defaultTileType];

      const world = tileToWorld(map, colIdx, rowIdx);
      cellElement.title = describeTile(world, colIdx, rowIdx);

      const point = points.find(p => p.x === colIdx && p.y === rowIdx);
      if (point) {
        cellElement.textContent = point.type === 'transfer' ? 'T' : 'L';
        cellElement.style.color = 'red';
        cellElement.style.fontWeight = 'bold';
      }

      cellElement.addEventListener('mousedown', () => handleCellMouseDown(rowIdx, colIdx));
      cellElement.addEventListener('mouseenter', () => handleCellMouseEnter(rowIdx, colIdx));
      gridContainer.appendChild(cellElement);
    });
  });

  widthInput.value = currentWidth;
  heightInput.value = currentHeight;
  mapNameInput.value = map.name;
  mapTypeSelect.value = map.type;
  originXInput.value = map.originX;
  originYInput.value = map.originY;
  updateOriginWarning();
}

// The world coordinate is the one the server logs and the JSON state files
// (gamePoints.json, adventures.json, livingSpaces.json, players.json) use, so
// it goes first; the file coordinate is what the editor and the map file use.
function describeTile(world, col, row) {
  return `pasaulio (${world.x}, ${world.y}) \u00b7 faile (${col}, ${row})`;
}

// shared/mapParser.js does not understand origin_x / origin_y yet, so a map
// with a non-zero origin is still misread by the game.
function updateOriginWarning() {
  const map = maps[currentMapIndex];
  if (!hasOrigin(map)) {
    originWarning.classList.add('hidden');
    return;
  }
  originWarning.textContent =
    `Dėmesio: šio žemėlapio pradžia yra origin_x=${map.originX}, origin_y=${map.originY}. `
    + 'Žaidimas šių atributų kol kas neskaito, todėl prieš diegiant šį žemėlapį '
    + 'reikia atnaujinti shared/mapParser.js ir visas vietas, kurios naudoja map.tiles.';
  originWarning.classList.remove('hidden');
}

function showNotice(message) {
  notice.textContent = message;
  notice.classList.remove('hidden');
}

function clearNotice() {
  notice.textContent = '';
  notice.classList.add('hidden');
}

function updateMapTypeSelect() {
  mapTypeSelect.innerHTML = '';
  mapTypes.forEach(type => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    mapTypeSelect.appendChild(option);
  });
}

function updateLivingTypeSelect() {
  livingTypeSelect.innerHTML = '';
  livingTypes.forEach(type => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    livingTypeSelect.appendChild(option);
  });
}

function updateMapType() {
  const newType = mapTypeSelect.value;
  if (newType && maps[currentMapIndex]) {
    maps[currentMapIndex].type = newType;
  }
}

export function updateMapSelect() {
  mapSelect.innerHTML = '';
  maps.forEach((map, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = map.name;
    if (index === currentMapIndex) {
      option.selected = true;
    }
    mapSelect.appendChild(option);
  });
}

function updateMapName() {
  const newName = mapNameInput.value.trim();
  if (newName && maps[currentMapIndex]) {
    maps[currentMapIndex].name = newName;
    updateMapSelect();
  }
}

// Handle cell interactions
function handleCellMouseDown(row, col) {
  const map = maps[currentMapIndex];
  if (!map) return;

  if (selectedTool === 'select') {
    selectedPoint = map.points.find(p => p.x === col && p.y === row) || null;
    if (selectedPoint) {
      renderPropertiesSidebar();
      propertiesSidebar.classList.remove('hidden');
    } else {
      propertiesSidebar.classList.add('hidden');
    }
  } else if (selectedTool === 'transfer' || selectedTool === 'living') {
    const existingPointIndex = map.points.findIndex(p => p.x === col && p.y === row);
    if (existingPointIndex !== -1) {
      return;
    }
    const newPoint = selectedTool === 'transfer'
      ? new TransferPoint(col, row)
      : new LivingPoint(col, row, livingTypeSelect.value);
    map.points.push(newPoint);
    renderCurrentMap();
  } else if (selectedTool === 'draw') {
    isDrawing = true;
    updateCell(row, col);
  }
}

function handleCellMouseEnter(row, col) {
  const map = maps[currentMapIndex];
  if (map) {
    coordReadout.textContent = describeTile(tileToWorld(map, col, row), col, row);
  }
  if (isDrawing) {
    updateCell(row, col);
  }
}

function updateCell(row, col) {
  const map = maps[currentMapIndex];
  if (!map) return;

  map.grid[row][col] = selectedChar;
  const currentWidth = map.grid[0]?.length || 0;
  const cells = gridContainer.querySelectorAll('.cell');
  const index = row * currentWidth + col;
  const cellElement = cells[index];
  cellElement.style.backgroundColor = tileTypes[selectedChar] || tileTypes[''];
}

function handleCellMouseUp() {
  isDrawing = false;
}

// Event Listeners
newMapBtn.addEventListener('click', () => createNewMap());

mapSelect.addEventListener('change', (e) => {
  currentMapIndex = parseInt(e.target.value, 10);
  renderCurrentMap();
});

mapNameInput.addEventListener('change', updateMapName);
mapTypeSelect.addEventListener('change', updateMapType);

// Re-anchoring a map by hand. Resizing keeps the origin right on its own; this
// is for a map that was grown before the origin existed and has to be told
// where it really starts.
function updateOrigin() {
  const map = maps[currentMapIndex];
  if (!map) return;
  map.originX = parseInt(originXInput.value, 10) || 0;
  map.originY = parseInt(originYInput.value, 10) || 0;
  renderCurrentMap();
}

originXInput.addEventListener('change', updateOrigin);
originYInput.addEventListener('change', updateOrigin);

generateBtn.addEventListener('click', () => {
  const map = maps[currentMapIndex];
  if (!map) return;

  const width = parseInt(widthInput.value, 10);
  const height = parseInt(heightInput.value, 10);

  map.grid = Array(height).fill().map(() => Array(width).fill(defaultTileType));
  map.points = []; // Also reset points on generation
  renderCurrentMap();
});

downloadBtn.addEventListener('click', downloadMap);

uploadBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', uploadMap);

function updateLivingTypeVisibility() {
  livingTypeLabel.classList.toggle('hidden', selectedTool !== 'living');
}

charButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    // Deselect all char buttons
    charButtons.forEach(b => b.classList.remove('selected'));
    // Deselect all tool buttons
    toolButtons.forEach(b => b.classList.remove('selected'));

    // Select the clicked char button
    btn.classList.add('selected');
    selectedChar = btn.textContent;
    selectedTool = 'draw'; // Set tool to 'draw'
    updateLivingTypeVisibility();
  });
});

gridContainer.addEventListener('mouseup', handleCellMouseUp);
gridContainer.addEventListener('mouseleave', () => {
  handleCellMouseUp();
  coordReadout.textContent = '';
});

// Render properties sidebar
function renderPropertiesSidebar() {
  if (!selectedPoint) {
    propertiesContent.innerHTML = '';
    return;
  }

  const map = maps[currentMapIndex];
  const world = tileToWorld(map, selectedPoint.x, selectedPoint.y);

  let content = `<h4>${selectedPoint.type} Point</h4>
      <p class="point-coords">
        Pasaulio: <strong>(${world.x}, ${world.y})</strong><br>
        Faile: (${selectedPoint.x}, ${selectedPoint.y})
      </p>
      <label>Map:
        <input type="text" id="prop-map" value="${selectedPoint.map}">
      </label><br>`;

  if (selectedPoint.type === 'transfer') {
    content += `
      <label>Transfer to X:
        <input type="number" step="1" id="prop-map-x" value="${selectedPoint.map_x}">
      </label><br>
      <label>Transfer to Y:
        <input type="number" step="1" id="prop-map-y" value="${selectedPoint.map_y}">
      </label><br>
      <p class="point-coords">${describeTransferTarget(selectedPoint)}</p>`;
  }
  if (selectedPoint.type === 'living') {
    content += `
      <label>Type:
        <select id="prop-living-type">
          ${livingTypes.map(type => `<option value="${type}"${type === selectedPoint.livingType ? ' selected' : ''}>${type}</option>`).join('')}
        </select>
      </label><br>
      <label>Owner:
        <input type="text" id="prop-owner" value="${selectedPoint.owner}">
      </label><br>
      <label>Price:
        <input type="number" id="prop-price" value="${selectedPoint.price}">
      </label><br>
      <label>Maintenance:
        <input type="number" id="prop-maintenance" value="${selectedPoint.maintenance}">
      </label><br>`;
  }
  propertiesContent.innerHTML = content;
}

// map_x / map_y are file coordinates of the target map, with map_y counted
// from the top, so the world coordinate they land on has to be worked out
// against that map's own height and origin.
function describeTransferTarget(point) {
  const target = maps.find(m => m.name === point.map);
  if (!target) return `Žemėlapis „${point.map}“ nerastas.`;
  const world = tileToWorld(target, Number(point.map_x), Number(point.map_y));
  return `Nusileidžia į „${point.map}“ pasaulio (${world.x}, ${world.y}).`;
}

// Save properties
savePropertiesBtn.addEventListener('click', () => {
  if (!selectedPoint) return;

  setPointField(selectedPoint, 'map', document.getElementById('prop-map').value);

  if (selectedPoint.type === 'transfer') {
    setPointField(selectedPoint, 'map_x', parseInt(document.getElementById('prop-map-x').value, 10) || 0);
    setPointField(selectedPoint, 'map_y', parseInt(document.getElementById('prop-map-y').value, 10) || 0);
  }
  if (selectedPoint.type === 'living') {
    setPointField(selectedPoint, 'type', document.getElementById('prop-living-type').value);
    setPointField(selectedPoint, 'owner', document.getElementById('prop-owner').value);
    setPointField(selectedPoint, 'price', parseInt(document.getElementById('prop-price').value, 10) || 0);
    setPointField(selectedPoint, 'maintenance', parseInt(document.getElementById('prop-maintenance').value, 10) || 0);
  }

  propertiesSidebar.classList.add('hidden');
  selectedPoint = null;
  // No need to re-render grid as properties are not displayed on it
});

toolButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    // Deselect all tool buttons
    toolButtons.forEach(b => b.classList.remove('selected'));
    // Deselect all char buttons
    charButtons.forEach(b => b.classList.remove('selected'));

    // Select the clicked tool button
    btn.classList.add('selected');
    selectedTool = btn.id.replace('tool-', ''); // 'select', 'transfer', or 'living'
    isDrawing = false; // Stop drawing when a tool is selected
    updateLivingTypeVisibility();
  });
});

// Growing or trimming a map, and every coordinate that depends on its size,
// as a single edit: the padding and the coordinate bumps are never saved
// apart from each other. applyResize does nothing at all if the resize would
// cut away a tile that carries a point.
function resizeCurrentMap(delta) {
  const map = maps[currentMapIndex];
  if (!map) return;

  const result = applyResize(maps, currentMapIndex, delta);
  if (!result.ok) {
    showNotice(result.blocking.length
      ? `Negalima: nurodyti laukeliai turi taškų. ${describeBlocking(result.blocking)}`
      : 'Negalima: žemėlapyje turi likti bent viena eilutė ir vienas stulpelis.');
    return;
  }

  clearNotice();
  renderCurrentMap();
}

function describeBlocking(blocking) {
  return blocking
    .map(b => b.target
      ? `persikėlimo taškas žemėlapyje „${b.mapName}“ nurodo į (${b.x}, ${b.y})`
      : `„${b.mapName}“: ${b.point.type} (${b.x}, ${b.y})`)
    .join('; ');
}

// Event Listeners for new buttons
addRowTopBtn.addEventListener('click', () => resizeCurrentMap({ top: 1 }));
addRowBottomBtn.addEventListener('click', () => resizeCurrentMap({ bottom: 1 }));
addColLeftBtn.addEventListener('click', () => resizeCurrentMap({ left: 1 }));
addColRightBtn.addEventListener('click', () => resizeCurrentMap({ right: 1 }));

removeRowTopBtn.addEventListener('click', () => resizeCurrentMap({ top: -1 }));
removeRowBottomBtn.addEventListener('click', () => resizeCurrentMap({ bottom: -1 }));
removeColLeftBtn.addEventListener('click', () => resizeCurrentMap({ left: -1 }));
removeColRightBtn.addEventListener('click', () => resizeCurrentMap({ right: -1 }));

// Start
init();

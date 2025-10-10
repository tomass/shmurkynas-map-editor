import { mapTypes, tileTypes, TransferPoint, LivingPoint, defaultTileType } from './constants';
import { downloadMap, uploadMap } from './file';

// Toolbar-1
const newMapBtn = document.getElementById('new-map');
const mapSelect = document.getElementById('map-select');
const mapNameInput = document.getElementById('map-name');
const mapTypeSelect = document.getElementById('map-type-select');

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

// Toolbar-2
const charButtons = document.querySelectorAll('.char-btn');
const toolButtons = document.querySelectorAll('.tool-btn');

// Properties sidebar
const propertiesSidebar = document.getElementById('properties-sidebar');
const propertiesContent = document.getElementById('properties-content');
const savePropertiesBtn = document.getElementById('save-properties');

// Map area
const gridContainer = document.getElementById('grid');

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
}

export function setCurrentMapIndex(index) {
  currentMapIndex = index;
}

// Create a new map
function createNewMap(name = 'unnamed', grid, points, type) {
  const newMap = {
    name: name,
    type: type || mapTypes[0],
    grid: grid || Array(10).fill(defaultTileType).map(() => Array(10).fill(defaultTileType)),
    points: points || []
  };
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
      : new LivingPoint(col, row);
    map.points.push(newPoint);
    renderCurrentMap();
  } else if (selectedTool === 'draw') {
    isDrawing = true;
    updateCell(row, col);
  }
}

function handleCellMouseEnter(row, col) {
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

generateBtn.addEventListener('click', () => {
  const map = maps[currentMapIndex];
  if (!map) return;

  const width = parseInt(widthInput.value, 10);
  const height = parseInt(heightInput.value, 10);

  map.grid = Array(height).fill().map(() => Array(width).fill(''));
  map.points = []; // Also reset points on generation
  renderCurrentMap();
});

downloadBtn.addEventListener('click', downloadMap);

uploadBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', uploadMap);

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
  });
});

gridContainer.addEventListener('mouseup', handleCellMouseUp);
gridContainer.addEventListener('mouseleave', handleCellMouseUp);

// Render properties sidebar
function renderPropertiesSidebar() {
  if (!selectedPoint) {
    propertiesContent.innerHTML = '';
    return;
  }

  let content = `<h4>${selectedPoint.type} Point (${selectedPoint.x}, ${selectedPoint.y})</h4>`;

  if (selectedPoint.type === 'transfer' || selectedPoint.type === 'living') {
    content += `
      <label>Map:
        <input type="text" id="prop-map" value="${selectedPoint.map}">
      </label><br>`;
  }
  if (selectedPoint.type === 'living') {
    content += `
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

// Save properties
savePropertiesBtn.addEventListener('click', () => {
  if (!selectedPoint) return;

  if (selectedPoint.type === 'transfer' || selectedPoint.type === 'living') {
    selectedPoint.map = document.getElementById('prop-map').value;
  }
  if (selectedPoint.type === 'living') {
    selectedPoint.owner = document.getElementById('prop-owner').value;
    selectedPoint.price = parseInt(document.getElementById('prop-price').value, 10);
    selectedPoint.maintenance = parseInt(document.getElementById('prop-maintenance').value, 10);
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
  });
});

// Function to add a row to the top
function addRowTop() {
  const map = maps[currentMapIndex];
  if (!map) return;
  const currentWidth = map.grid[0]?.length || 0;
  map.grid.unshift(Array(currentWidth).fill(''));
  map.points.forEach(p => p.y++);
  renderCurrentMap();
}

// Function to add a row to the bottom
function addRowBottom() {
  const map = maps[currentMapIndex];
  if (!map) return;
  const currentWidth = map.grid[0]?.length || 0;
  map.grid.push(Array(currentWidth).fill(''));
  renderCurrentMap();
}

// Function to add a column to the left
function addColLeft() {
  const map = maps[currentMapIndex];
  if (!map) return;
  map.grid.forEach(row => row.unshift(''));
  map.points.forEach(p => p.x++);
  renderCurrentMap();
}

// Function to add a column to the right
function addColRight() {
  const map = maps[currentMapIndex];
  if (!map) return;
  map.grid.forEach(row => row.push(''));
  renderCurrentMap();
}

// Event Listeners for new buttons
addRowTopBtn.addEventListener('click', addRowTop);
addRowBottomBtn.addEventListener('click', addRowBottom);
addColLeftBtn.addEventListener('click', addColLeft);
addColRightBtn.addEventListener('click', addColRight);

// Start
init();

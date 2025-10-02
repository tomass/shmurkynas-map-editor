// Point classes
class TransferPoint {
  constructor(x, y) {
    this.type = 'transfer';
    this.x = x;
    this.y = y;
    this.map = '';
  }
}

class LivingPoint {
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

// DOM Elements
const widthInput = document.getElementById('width');
const heightInput = document.getElementById('height');
const charButtons = document.querySelectorAll('.char-btn');
const gridContainer = document.getElementById('grid');
const downloadBtn = document.getElementById('download');
const generateBtn = document.getElementById('generate');
const uploadBtn = document.getElementById('upload');
const fileInput = document.getElementById('file-input');
const gridWrapper = document.getElementById('grid-wrapper');

const addRowTopBtn = document.getElementById('add-row-top');
const addRowBottomBtn = document.getElementById('add-row-bottom');
const addColLeftBtn = document.getElementById('add-col-left');
const addColRightBtn = document.getElementById('add-col-right');

const newMapBtn = document.getElementById('new-map');
const mapSelect = document.getElementById('map-select');
const mapNameInput = document.getElementById('map-name');

// Tool UI elements
const toolButtons = document.querySelectorAll('.tool-btn');
const propertiesSidebar = document.getElementById('properties-sidebar');
const propertiesContent = document.getElementById('properties-content');
const savePropertiesBtn = document.getElementById('save-properties');

// Color mapping for characters
const charColors = {
  'Ž': '#baf455',
  'G': '#454a59', // Light green
  'M': '#7aa21d', // Light blue
  'P': '#4d2926', // Light yellow
  'V': '#5877ddff', // Light purple
  '': '#ffffff'    // White for empty cells
};

// State
let maps = [];
let currentMapIndex = 0;
let selectedChar = 'Ž';
let selectedTool = 'select';
let isDrawing = false;
let selectedPoint = null;

// Initialize
function init() {
  createNewMap();
}

// Create a new map
function createNewMap(name = 'unnamed', grid, points) {
  const newMap = {
    name: name,
    grid: grid || Array(10).fill().map(() => Array(10).fill('')),
    points: points || []
  };
  maps.push(newMap);
  currentMapIndex = maps.length - 1;
  renderCurrentMap();
  updateMapSelect();
}

function renderCurrentMap() {
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
      cellElement.style.backgroundColor = charColors[cell] || charColors[''];

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
}

function updateMapSelect() {
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
  cellElement.style.backgroundColor = charColors[selectedChar] || charColors[''];
}

function handleCellMouseUp() {
  isDrawing = false;
}

// Download map
function downloadMap() {
  let content = '';
  maps.forEach(map => {
    content += `[map=${map.name}]\n`;
    content += '[tiles]\n';
    content += map.grid.map(row => row.join('')).join('\n');
    content += '\n[points]\n';

    map.points.forEach(p => {
      content += `${p.type}:\n`;
      content += `x=${p.x}\n`;
      content += `y=${p.y}\n`;
      if (p.map !== undefined) content += `map=${p.map}\n`;
      if (p.owner !== undefined) content += `owner=${p.owner}\n`;
      if (p.price !== undefined) content += `price=${p.price}\n`;
      if (p.maintenance !== undefined) content += `maintenance=${p.maintenance}\n`;
    });
  });

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'map.txt';
  a.click();
}

// Upload map
function uploadMap(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const content = e.target.result;
    const newMaps = [];
    const mapSections = content.split('[map=').filter(s => s.trim());

    mapSections.forEach(section => {
      const nameEndIndex = section.indexOf(']');
      const name = section.substring(0, nameEndIndex);
      const restOfSection = section.substring(nameEndIndex + 1);

      const tilesIndex = restOfSection.indexOf('[tiles]');
      const pointsIndex = restOfSection.indexOf('[points]');

      let grid = [];
      if (tilesIndex !== -1) {
        const tilesSection = restOfSection.substring(
          tilesIndex + '[tiles]'.length,
          pointsIndex !== -1 ? pointsIndex : undefined
        ).trim();
        grid = tilesSection.split('\n').map(line => line.split(''));
      }

      let points = [];
      if (pointsIndex !== -1) {
        const pointsSection = restOfSection.substring(pointsIndex + '[points]'.length).trim();
        const pointBlocks = pointsSection.split(/(?=transfer:|living:)/).filter(b => b.trim());

        pointBlocks.forEach(block => {
          const lines = block.trim().split('\n');
          const typeLine = lines.shift();
          const type = typeLine.replace(':', '');
          const pointData = {};
          lines.forEach(line => {
            const [key, value] = line.split('=');
            if (key && value !== undefined) pointData[key.trim()] = value.trim();
          });

          const x = parseInt(pointData.x, 10);
          const y = parseInt(pointData.y, 10);

          if (!isNaN(x) && !isNaN(y)) {
            let newPoint;
            if (type === 'transfer') {
              newPoint = new TransferPoint(x, y);
              newPoint.map = pointData.map || '';
            } else if (type === 'living') {
              newPoint = new LivingPoint(x, y);
              newPoint.map = pointData.map || '';
              newPoint.owner = pointData.owner || '';
              newPoint.price = parseInt(pointData.price, 10) || 0;
              newPoint.maintenance = parseInt(pointData.maintenance, 10) || 0;
            }
            if (newPoint) points.push(newPoint);
          }
        });
      }
      newMaps.push({ name, grid, points });
    });

    if (newMaps.length > 0) {
      maps = newMaps;
      currentMapIndex = 0;
      renderCurrentMap();
      updateMapSelect();
    }
  };
  reader.readAsText(file);
}

// Event Listeners
newMapBtn.addEventListener('click', () => createNewMap());

mapSelect.addEventListener('change', (e) => {
  currentMapIndex = parseInt(e.target.value, 10);
  renderCurrentMap();
});

mapNameInput.addEventListener('change', updateMapName);

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

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

// New UI elements
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
let grid = [];
let points = []; // Array to store transfer/living points
let selectedChar = 'Ž';
let selectedTool = 'select'; // 'select', 'transfer', 'living', or 'draw'
let isDrawing = false;
let selectedPoint = null;
let currentWidth = 20;
let currentHeight = 20;

// Initialize
function init() {
  currentWidth = parseInt(widthInput.value) || 10;
  currentHeight = parseInt(heightInput.value) || 10;
  generateGrid();
}

// Generate empty grid
function generateGrid() {
  grid = Array(currentHeight).fill().map(() => Array(currentWidth).fill(''));
  points = []; // Reset points
  renderGrid();
}

// Render grid to DOM
function renderGrid() {
  gridContainer.innerHTML = '';
  gridContainer.style.gridTemplateColumns = `repeat(${currentWidth}, 30px)`;

  grid.forEach((row, rowIdx) => {
    row.forEach((cell, colIdx) => {
      const cellElement = document.createElement('div');
      cellElement.className = 'cell';
      // cellElement.textContent = cell || ''; // Hide character
      cellElement.style.backgroundColor = charColors[cell] || charColors[''];

      // Draw points
      const point = points.find(p => p.x === colIdx && p.y === rowIdx);
      if (point) {
        cellElement.textContent = point.type === 'transfer' ? 'T' : 'L';
        cellElement.style.color = 'red'; // Example color for points
        cellElement.style.fontWeight = 'bold';
      }

      cellElement.addEventListener('mousedown', () => handleCellMouseDown(rowIdx, colIdx));
      cellElement.addEventListener('mouseenter', () => handleCellMouseEnter(rowIdx, colIdx));
      gridContainer.appendChild(cellElement);
    });
  });
}

// Handle cell interactions
function handleCellMouseDown(row, col) {
  if (selectedTool === 'select') {
    selectedPoint = points.find(p => p.x === col && p.y === row) || null;
    if (selectedPoint) {
      renderPropertiesSidebar();
      propertiesSidebar.classList.remove('hidden');
    } else {
      propertiesSidebar.classList.add('hidden');
    }
  } else if (selectedTool === 'transfer' || selectedTool === 'living') {
    const existingPointIndex = points.findIndex(p => p.x === col && p.y === row);
    if (existingPointIndex !== -1) {
      return;
    }
    const newPoint = selectedTool === 'transfer'
      ? new TransferPoint(col, row)
      : new LivingPoint(col, row);
    points.push(newPoint);
    renderGrid();
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
  grid[row][col] = selectedChar;
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
  let content = '[map=base]\n';
  content += '[tiles]\n';
  content += grid.map(row => row.join('')).join('\n');
  content += '\n[points]\n';

  points.forEach(p => {
    content += `${p.type}:\n`;
    content += `x=${p.x}\n`;
    content += `y=${p.y}\n`;
    if (p.map !== undefined) content += `map=${p.map}\n`;
    if (p.owner !== undefined) content += `owner=${p.owner}\n`;
    if (p.price !== undefined) content += `price=${p.price}\n`;
    if (p.maintenance !== undefined) content += `maintenance=${p.maintenance}\n`;
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

    // Reset grid and points
    grid = [];
    points = [];

    const tilesIndex = content.indexOf('[tiles]');
    const pointsIndex = content.indexOf('[points]');

    if (tilesIndex !== -1) {
        const tilesSection = content.substring(
            tilesIndex + '[tiles]'.length,
            pointsIndex !== -1 ? pointsIndex : undefined
        ).trim();
        const tileLines = tilesSection.split('\n');
        grid = tileLines.map(line => line.split(''));

        currentHeight = grid.length;
        currentWidth = grid[0] ? grid[0].length : 0;
        widthInput.value = currentWidth;
        heightInput.value = currentHeight;
    }

    if (pointsIndex !== -1) {
        const pointsSection = content.substring(pointsIndex + '[points]'.length).trim();
        const pointBlocks = pointsSection.split(/(?=transfer:|living:)/).filter(b => b.trim());

        pointBlocks.forEach(block => {
            const lines = block.trim().split('\n');
            const typeLine = lines.shift();
            const type = typeLine.replace(':', '');
            const pointData = {};
            lines.forEach(line => {
                const [key, value] = line.split('=');
                if (key && value !== undefined) {
                    pointData[key.trim()] = value.trim();
                }
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
                if (newPoint) {
                    points.push(newPoint);
                }
            }
        });
    }

    renderGrid();
  };
  reader.readAsText(file);
}

// Event Listeners
generateBtn.addEventListener('click', () => {
  currentWidth = parseInt(widthInput.value) || 10;
  currentHeight = parseInt(heightInput.value) || 10;
  generateGrid();
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
  grid.unshift(Array(currentWidth).fill(''));
  currentHeight++;
  heightInput.value = currentHeight;
  renderGrid();
}

// Function to add a row to the bottom
function addRowBottom() {
  grid.push(Array(currentWidth).fill(''));
  currentHeight++;
  heightInput.value = currentHeight;
  renderGrid();
}

// Function to add a column to the left
function addColLeft() {
  grid.forEach(row => row.unshift(''));
  currentWidth++;
  widthInput.value = currentWidth;
  renderGrid();
}

// Function to add a column to the right
function addColRight() {
  grid.forEach(row => row.push(''));
  currentWidth++;
  widthInput.value = currentWidth;
  renderGrid();
}

// Event Listeners for new buttons
addRowTopBtn.addEventListener('click', addRowTop);
addRowBottomBtn.addEventListener('click', addRowBottom);
addColLeftBtn.addEventListener('click', addColLeft);
addColRightBtn.addEventListener('click', addColRight);

// Start
init();

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
let selectedChar = 'Ž';
let isDrawing = false;
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
      cellElement.textContent = cell || '';
      cellElement.style.backgroundColor = charColors[cell] || charColors[''];

      cellElement.addEventListener('mousedown', () => handleCellMouseDown(rowIdx, colIdx));
      cellElement.addEventListener('mouseenter', () => handleCellMouseEnter(rowIdx, colIdx));
      gridContainer.appendChild(cellElement);
    });
  });
}

// Handle cell interactions
function handleCellMouseDown(row, col) {
  isDrawing = true;
  updateCell(row, col);
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
  cellElement.textContent = selectedChar;
  cellElement.style.backgroundColor = charColors[selectedChar] || charColors[''];
}

function handleCellMouseUp() {
  isDrawing = false;
}

// Download map
function downloadMap() {
  const text = grid.map(row => row.join('')).join('\n');
  const blob = new Blob([text], { type: 'text/plain' });
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
    const lines = content.split('\n').filter(line => line.trim() !== '');

    // Update grid dimensions to match file
    currentHeight = lines.length;
    currentWidth = lines[0] ? lines[0].length : 0;

    // Update input fields
    widthInput.value = currentWidth;
    heightInput.value = currentHeight;

    // Parse content into grid
    grid = lines.map(line => line.split(''));

    // Ensure all rows have same length
    grid = grid.map(row =>
      Array(currentWidth).fill('').map((_, i) => row[i] || '')
    );

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
    charButtons.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedChar = btn.textContent;
  });
});

gridContainer.addEventListener('mouseup', handleCellMouseUp);
gridContainer.addEventListener('mouseleave', handleCellMouseUp);

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

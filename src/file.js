import { maps, setCurrentMapIndex, renderCurrentMap, updateMapSelect } from './main';
import { TransferPoint, LivingPoint, mapTypes } from './constants';

// Download map
export function downloadMap() {
  let content = '';
  maps.forEach(map => {
    content += `[map=${map.name}]\n`;
    if (map.type) {
      content += `type=${map.type}\n`;
    }
    content += '[tiles]\n';
    content += map.grid.map(row => row.join('')).join('\n');
    content += '\n[points]\n';

    map.points.forEach(p => {
      content += `${p.type}:\n`;
      content += `x=${p.x}\n`;
      content += `y=${p.y}\n`;
      if (p.map !== undefined) content += `map=${p.map}\n`;
      if (p.map_x !== undefined) content += `map_x=${p.map_x}\n`;
      if (p.map_y !== undefined) content += `map_y=${p.map_y}\n`;
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
export function uploadMap(event) {
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
      const restOfSection = section.substring(nameEndIndex + 1).trim();

      let type = mapTypes[0];
      const typeEndIndex = restOfSection.indexOf('\n');
      if (typeEndIndex !== -1 && restOfSection.substring(0, typeEndIndex).startsWith('type=')) {
        type = restOfSection.substring(5, typeEndIndex);
      }

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
              newPoint.map = pointData.map || 'base';
              newPoint.map_x = pointData.map_x || '1';
              newPoint.map_y = pointData.map_y || '1';
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
      newMaps.push({ name, grid, points, type });
    });

    if (newMaps.length > 0) {
      maps.length = 0;
      maps.push(...newMaps);
      //maps = newMaps;
      setCurrentMapIndex(0);
      renderCurrentMap();
      updateMapSelect();
    }
  };
  reader.readAsText(file);
}

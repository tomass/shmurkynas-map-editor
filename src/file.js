import { maps, adoptMaps } from './main';
import { parseMapFile, serializeMaps } from './mapFormat';

// Download map
export function downloadMap() {
  const blob = new Blob([serializeMaps(maps)], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'map.txt';
  a.click();
  URL.revokeObjectURL(url);
}

// Upload map
export function uploadMap(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const newMaps = parseMapFile(e.target.result);

    if (newMaps.length > 0) {
      adoptMaps(newMaps);
    }
  };
  reader.readAsText(file);
}

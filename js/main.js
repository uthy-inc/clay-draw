import { initEngine } from './canvasEngine.js';
import { initTools } from './tools.js';
import { initHistory } from './history.js';
import { initTimezones } from './timezones.js';
import { initColors } from './colors.js';
import './pwa.js';

const stage = document.getElementById('stage');
const drawCanvas = document.getElementById('drawCanvas');
const overlayCanvas = document.getElementById('overlayCanvas');
const zoomLabel = document.getElementById('zoomLabel');

const engine = initEngine({ stage, drawCanvas, overlayCanvas, zoomLabel });
const history = initHistory(engine);
initTools(engine, history);
initColors();
initTimezones();

// Keyboard shortcuts
window.addEventListener('keydown', (e)=>{
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); history.undo(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); history.redo(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); document.getElementById('exportPNGBtn').click(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') { e.preventDefault(); document.getElementById('importBtn').click(); }
});
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

// Enhance keyboard focus management and ARIA for modal and toolbar overflow
(function(){
  const toolbar = document.getElementById('toolbar');
  if (toolbar){
    // Enable horizontal wheel scroll to pan toolbar when overflowed
    toolbar.addEventListener('wheel', (e) => {
      if (toolbar.scrollWidth > toolbar.clientWidth){
        toolbar.scrollLeft += (e.deltaY || e.deltaX);
        // prevent vertical page scroll when we used it to pan toolbar
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) e.preventDefault();
      }
    }, { passive: false });
  }

  // Modal focus trap (zonesModal)
  const zonesModal = document.getElementById('zonesModal');
  const closeZones = document.getElementById('closeZones');
  if (zonesModal){
    let lastFocused;
    const open = () => {
      lastFocused = document.activeElement;
      zonesModal.hidden = false;
      zonesModal.setAttribute('aria-modal','true');
      zonesModal.setAttribute('role','dialog');
      const focusable = zonesModal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      (focusable[0] || zonesModal).focus();
      document.addEventListener('keydown', onKey);
    };
    const close = () => {
      zonesModal.hidden = true;
      zonesModal.removeAttribute('aria-modal');
      zonesModal.removeAttribute('role');
      document.removeEventListener('keydown', onKey);
      lastFocused?.focus();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab'){
        const focusable = zonesModal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length-1];
        if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
      }
    };
    // Expose open function if browsing all zones is triggered
    const listZonesBtn = document.getElementById('listZonesBtn');
    if (listZonesBtn){ listZonesBtn.addEventListener('click', open); }
    if (closeZones){ closeZones.addEventListener('click', () => close()); }
  }
})();
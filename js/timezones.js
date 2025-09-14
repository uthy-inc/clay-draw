import { $, $$ } from './pwa.js';

const API = 'https://worldtimeapi.org';

function cardTemplate({ timezone, datetime }){
  const date = new Date(datetime);
  const hh = String(date.getHours()).padStart(2,'0');
  const mm = String(date.getMinutes()).padStart(2,'0');
  const ss = String(date.getSeconds()).padStart(2,'0');
  const day = date.toLocaleDateString(undefined, { weekday:'short', year:'numeric', month:'short', day:'numeric' });
  return `<div class="card" data-tz="${timezone}">
    <div class="depth"></div>
    <h4>${timezone}</h4>
    <div class="clock">${hh}:${mm}:${ss}</div>
    <div class="date">${day}</div>
  </div>`;
}

async function fetchJSON(url){
  const res = await fetch(url);
  if (!res.ok) throw new Error('Network error');
  return res.json();
}

export function initTimezones(){
  const container = document.getElementById('timeCards');
  const addBtn = document.getElementById('addTimezoneBtn');
  const listBtn = document.getElementById('listZonesBtn');
  const modal = document.getElementById('zonesModal');
  const closeBtn = document.getElementById('closeZones');
  const zonesList = document.getElementById('zonesList');
  const zoneSearch = document.getElementById('zoneSearch');

  // Track visible time cards for efficient ticking (basic virtualization)
  const visibleCards = new Set();
  const io = new IntersectionObserver((entries)=>{
    for (const ent of entries){
      const el = ent.target;
      if (ent.isIntersecting) visibleCards.add(el); else visibleCards.delete(el);
    }
  }, { root: null, threshold: 0.1 });

  function addCardDOM(data, position='beforeend'){
    if (position === 'afterbegin') container.insertAdjacentHTML('afterbegin', cardTemplate(data));
    else container.insertAdjacentHTML('beforeend', cardTemplate(data));
    const el = position === 'afterbegin' ? container.firstElementChild : container.lastElementChild;
    if (el) io.observe(el);
  }

  // Add local IP timezone first
  fetchJSON(`${API}/api/ip`).then(data=>{
    addCardDOM(data, 'afterbegin');
  }).catch(()=>{});

  addBtn.addEventListener('click', async ()=>{
    const tz = prompt('Enter IANA timezone (e.g., Europe/Paris)');
    if (!tz) return;
    try{
      const data = await fetchJSON(`${API}/api/timezone/${encodeURIComponent(tz)}`);
      addCardDOM(data, 'beforeend');
    }catch(err){ alert('Failed to fetch timezone'); }
  });

  // Progressive render for the giant timezones list (avoids blocking UI)
  function progressiveRenderZones(zones){
    zonesList.innerHTML = '';
    const CHUNK = 200; let i = 0;
    const schedule = window.requestIdleCallback || ((fn)=> setTimeout(()=>fn({ timeRemaining:()=>16 }), 0));
    function renderChunk(){
      const end = Math.min(i + CHUNK, zones.length);
      const frag = document.createDocumentFragment();
      for (; i < end; i++){
        const z = zones[i];
        const item = document.createElement('div');
        item.className = 'zone-item'; item.textContent = z; item.tabIndex = 0;
        item.addEventListener('click', async ()=>{
          try{ const data = await fetchJSON(`${API}/api/timezone/${encodeURIComponent(z)}`); addCardDOM(data, 'beforeend'); }
          catch(err){ alert('Failed to add timezone'); }
        });
        frag.appendChild(item);
      }
      zonesList.appendChild(frag);
      if (i < zones.length){ schedule(renderChunk); }
    }
    renderChunk();
  }

  listBtn.addEventListener('click', async ()=>{
    modal.hidden = false;
    zonesList.innerHTML = '<p>Loading…</p>';
    try{
      const zones = await fetchJSON(`${API}/api/timezone`);
      progressiveRenderZones(zones);
      // filter
      zoneSearch.oninput = ()=>{
        const q = zoneSearch.value.toLowerCase();
        $$('.zone-item', zonesList).forEach(el=>{ el.style.display = el.textContent.toLowerCase().includes(q)? '' : 'none'; });
      };
    }catch(err){ zonesList.innerHTML = '<p>Error loading timezones.</p>'; }
  });

  closeBtn.addEventListener('click', ()=>{ modal.hidden = true; });

  // Update clocks every second (only update visible cards for performance)
  setInterval(()=>{
    if (visibleCards.size === 0) return;
    const now = new Date();
    for (const card of visibleCards){
      const tz = card.getAttribute('data-tz');
      try{
        const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false });
        const d = new Intl.DateTimeFormat(undefined, { timeZone: tz, weekday:'short', year:'numeric', month:'short', day:'numeric' });
        const parts = f.format(now);
        card.querySelector('.clock').textContent = parts;
        card.querySelector('.date').textContent = d.format(now);
      }catch{
        // ignore
      }
    }
  }, 1000);
}
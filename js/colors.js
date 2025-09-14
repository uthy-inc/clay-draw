export function initColors(){
  const toolbar = document.getElementById('toolbar');
  const colorInput = document.getElementById('colorPicker');
  if (!toolbar || !colorInput) return;

  const wrap = document.createElement('div');
  wrap.className = 'tool-group';
  wrap.style.alignItems = 'center';
  wrap.style.gap = '.4rem';

  const recentWrap = document.createElement('div');
  recentWrap.style.display = 'flex';
  recentWrap.style.gap = '.3rem';
  recentWrap.style.alignItems = 'center';

  const title = document.createElement('span');
  title.textContent = 'Recent';
  title.style.fontSize = '.85rem';
  title.style.color = 'var(--muted)';
  recentWrap.appendChild(title);

  const chips = document.createElement('div');
  chips.id = 'recentColors';
  chips.style.display = 'flex';
  chips.style.gap = '.3rem';
  recentWrap.appendChild(chips);

  const schemeSel = document.createElement('select');
  schemeSel.id = 'schemeSelect';
  schemeSel.title = 'Color Schemes';

  const schemes = {
    Pastels: ['#ffd1dc','#c1f7dc','#cfe0ff','#fff1b6','#e0c3fc','#d2f5e3'],
    Warm: ['#ffadad','#ffd6a5','#fdffb6','#ffd1a9','#f7b267','#f79d65'],
    Cool: ['#a0c4ff','#bdb2ff','#caffbf','#9bf6ff','#8ecae6','#219ebc'],
    MonoInk: ['#111111','#333333','#555555','#777777','#999999','#bbbbbb']
  };
  for (const name of Object.keys(schemes)){
    const opt = document.createElement('option'); opt.value = name; opt.textContent = name; schemeSel.appendChild(opt);
  }

  wrap.appendChild(recentWrap);
  wrap.appendChild(schemeSel);
  toolbar.appendChild(wrap);

  const RECENT_KEY = 'claydraw_recent_colors';
  function loadRecent(){
    try{ return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }catch{ return []; }
  }
  function saveRecent(arr){ localStorage.setItem(RECENT_KEY, JSON.stringify(arr.slice(0,10))); }
  function renderRecent(){
    chips.innerHTML = '';
    const arr = loadRecent();
    for (const c of arr){
      const b = document.createElement('button');
      b.title = c; b.style.width = '24px'; b.style.height = '24px'; b.style.borderRadius='6px'; b.style.boxShadow='var(--shadow)';
      b.style.background = c; b.addEventListener('click', ()=>{ colorInput.value = toHex(c); colorInput.dispatchEvent(new Event('input')); });
      chips.appendChild(b);
    }
  }
  function toHex(c){
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.fillStyle = c; return ctx.fillStyle; // normalize
  }
  colorInput.addEventListener('input', ()=>{
    const c = colorInput.value; const arr = loadRecent();
    const hex = toHex(c);
    const idx = arr.indexOf(hex); if (idx!==-1) arr.splice(idx,1);
    arr.unshift(hex); saveRecent(arr); renderRecent();
  });
  schemeSel.addEventListener('change', ()=>{
    const name = schemeSel.value; const arr = schemes[name] || [];
    // replace recent with scheme for quick access but keep localStorage history
    chips.innerHTML = '';
    for (const c of arr){
      const b = document.createElement('button'); b.title=c; b.style.width='24px'; b.style.height='24px'; b.style.borderRadius='6px'; b.style.boxShadow='var(--shadow)'; b.style.background=c;
      b.addEventListener('click', ()=>{ colorInput.value = toHex(c); colorInput.dispatchEvent(new Event('input')); });
      chips.appendChild(b);
    }
  });

  renderRecent();
}
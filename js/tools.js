import { setCurrentTool } from './canvasEngine.js';

export function initTools(engine, history){
  const overlay = document.getElementById('overlayCanvas');
  const color = document.getElementById('colorPicker');
  const size = document.getElementById('sizePicker');

  // Selection state and helpers
  const octx = overlay.getContext('2d');
  const sel = {
    active: false,
    rect: null,          // in world coords: {x,y,w,h}
    originalRect: null,  // original before move/resize
    img: null,           // offscreen canvas of selection
    mode: null,          // 'creating' | 'moving' | 'resizing'
    handle: null,        // which handle when resizing
    lastVP: null,        // last viewport point for move calculations
    prevTool: null,
  };
  const HANDLE_SIZE = 8; // px in viewport

  function normalizeRect(r){
    const x = Math.min(r.x, r.x + r.w);
    const y = Math.min(r.y, r.y + r.h);
    const w = Math.abs(r.w);
    const h = Math.abs(r.h);
    return {x,y,w,h};
  }
  function worldToViewportRect(r){
    const { toViewport } = engine.getDrawContext();
    const tl = toViewport(r.x, r.y);
    const br = toViewport(r.x + r.w, r.y + r.h);
    const x = Math.min(tl.x, br.x);
    const y = Math.min(tl.y, br.y);
    const w = Math.abs(br.x - tl.x);
    const h = Math.abs(br.y - tl.y);
    return {x,y,w,h};
  }
  function drawSelectionOverlay(){
    if (!sel.active || !sel.rect) return;
    // clear overlay first (non-destructive to main drawing preview blocks)
    octx.setTransform(1,0,0,1,0,0);
    // don't clear entire overlay here to not fight with live shape preview; instead draw on top
    const vp = worldToViewportRect(sel.rect);
    octx.save();
    octx.strokeStyle = '#3b82f6aa';
    octx.lineWidth = 1;
    octx.setLineDash([6,4]);
    octx.strokeRect(vp.x, vp.y, vp.w, vp.h);
    octx.setLineDash([]);
    // handles
    const handles = getHandleRects(vp);
    octx.fillStyle = '#ffffff';
    octx.strokeStyle = '#3b82f6';
    handles.forEach(h=>{ octx.fillRect(h.x, h.y, h.w, h.h); octx.strokeRect(h.x, h.y, h.w, h.h); });
    octx.restore();
  }
  function getHandleRects(vp){
    const s = HANDLE_SIZE; const hs = s; const midX = vp.x + vp.w/2; const midY = vp.y + vp.h/2;
    return [
      {name:'nw', x:vp.x - hs/2, y:vp.y - hs/2, w:hs, h:hs},
      {name:'n',  x:midX - hs/2, y:vp.y - hs/2, w:hs, h:hs},
      {name:'ne', x:vp.x + vp.w - hs/2, y:vp.y - hs/2, w:hs, h:hs},
      {name:'e',  x:vp.x + vp.w - hs/2, y:midY - hs/2, w:hs, h:hs},
      {name:'se', x:vp.x + vp.w - hs/2, y:vp.y + vp.h - hs/2, w:hs, h:hs},
      {name:'s',  x:midX - hs/2, y:vp.y + vp.h - hs/2, w:hs, h:hs},
      {name:'sw', x:vp.x - hs/2, y:vp.y + vp.h - hs/2, w:hs, h:hs},
      {name:'w',  x:vp.x - hs/2, y:midY - hs/2, w:hs, h:hs},
    ];
  }
  function hitTestHandle(vx, vy){
    if (!sel.active || !sel.rect) return null;
    const vp = worldToViewportRect(sel.rect);
    const hs = getHandleRects(vp);
    for (const h of hs){
      if (vx >= h.x && vx <= h.x+h.w && vy >= h.y && vy <= h.y+h.h) return h.name;
    }
    return null;
  }
  function pointInViewportRect(vx, vy, vp){ return vx>=vp.x && vx<=vp.x+vp.w && vy>=vp.y && vy<=vp.y+vp.h; }

  // Keep selection overlay persistent across renders
  function drawOverlayFrame(){
    if (!sel.active || !sel.rect) return;
    // When moving/resizing we also preview the selected image content
    if (sel.img && (sel.mode==='moving' || sel.mode==='resizing' || sel.mode===null)){
      const vpr = worldToViewportRect(normalizeRect(sel.rect));
      octx.setTransform(1,0,0,1,0,0);
      octx.drawImage(sel.img, vpr.x, vpr.y, vpr.w, vpr.h);
    }
    drawSelectionOverlay();
  }
  engine.onOverlay(drawOverlayFrame);

  let tool = 'pencil';
  const setTool = (t)=>{ tool = t; setCurrentTool(t); if (t !== 'select'){ sel.mode=null; /* don't clear selection immediately to allow switching back */ } };

  document.getElementById('toolbar').addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-tool]'); if (!btn) return;
    setTool(btn.dataset.tool);
  });

  function getPos(e){
    if (e.touches?.length) return {x:e.touches[0].clientX, y:e.touches[0].clientY};
    return {x:e.clientX, y:e.clientY};
  }

  let drawing = false; let start = null; let last = null;

  overlay.addEventListener('pointerdown', (e)=>{
    if (tool==='pan') return; // engine handles
    overlay.setPointerCapture(e.pointerId);
    drawing = true; start = getPos(e); last = start;
    if (tool==='text'){
      const { fromViewport } = engine.getDrawContext();
      const pt = fromViewport(start.x, start.y);
      const txt = prompt('Enter text:'); if (!txt) return;
      const { ctx, requestRender, commit } = engine.getDrawContext();
      ctx.fillStyle = color.value; ctx.font = `${Math.max(12, parseInt(size.value)*6)}px Inter, sans-serif`; ctx.textBaseline='top';
      ctx.fillText(txt, pt.x, pt.y);
      requestRender(); commit(); drawing=false; return;
    }
    if (tool==='eraser' || tool==='pencil' || tool==='brush'){
      const { ctx } = engine.getDrawContext();
      ctx.lineJoin = ctx.lineCap = 'round';
      ctx.globalCompositeOperation = (tool==='eraser'? 'destination-out' : 'source-over');
      ctx.strokeStyle = color.value;
      ctx.lineWidth = parseInt(size.value);
      const { fromViewport } = engine.getDrawContext();
      const p = fromViewport(start.x, start.y);
      ctx.beginPath(); ctx.moveTo(p.x, p.y);
    }
  });
  overlay.addEventListener('pointermove', (e)=>{
    if (!drawing) return; const pos = getPos(e);
    if (tool==='eraser' || tool==='pencil' || tool==='brush'){
      const { ctx, requestRender, fromViewport } = engine.getDrawContext();
      const p = fromViewport(pos.x, pos.y);
      ctx.lineTo(p.x, p.y); ctx.stroke(); requestRender();
    }
    last = pos;
  });
  overlay.addEventListener('pointerup', ()=>{
    if (!drawing) return; drawing=false;
    if (tool==='eraser' || tool==='pencil' || tool==='brush' || tool==='rect' || tool==='circle'){
      engine.getDrawContext().commit();
    }
  });

  // Shapes via drag on overlay with live preview
  const octx2 = overlay.getContext('2d');
  overlay.addEventListener('pointerdown', (e)=>{
    if (tool!=='rect' && tool!=='circle') return; overlay.setPointerCapture(e.pointerId);
    drawing = true; start = getPos(e); last = start;
    // Clear overlay before preview loop starts
    octx2.setTransform(1,0,0,1,0,0); octx2.clearRect(0,0,overlay.width, overlay.height);
  });
  overlay.addEventListener('pointermove', (e)=>{
    if (!drawing || (tool!=='rect' && tool!=='circle')) return; const pos = getPos(e); last = pos;
    const { fromViewport } = engine.getDrawContext();
    // Redraw overlay preview
    octx2.setTransform(1,0,0,1,0,0); octx2.clearRect(0,0,overlay.width, overlay.height);
    const sp = fromViewport(start.x, start.y); const ep = fromViewport(pos.x, pos.y);
    const minx = Math.min(sp.x, ep.x), miny = Math.min(sp.y, ep.y), w = Math.abs(sp.x-ep.x), h = Math.abs(sp.y-sp.y);
    octx2.strokeStyle = '#00000055'; octx2.lineWidth = 1; octx2.setLineDash([6,4]);
    if (tool==='rect') octx2.strokeRect(Math.min(start.x, pos.x), Math.min(start.y, pos.y), Math.abs(pos.x-start.x), Math.abs(pos.y-start.y));
    else { const cx = (start.x+pos.x)/2, cy = (start.y+pos.y)/2; const rx = Math.abs(pos.x-start.x)/2, ry = Math.abs(pos.y-start.y)/2; octx2.beginPath(); octx2.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2); octx2.stroke(); }
  });
  overlay.addEventListener('pointerup', (e)=>{
    if (!(tool==='rect' || tool==='circle')) return; const pos = getPos(e);
    const { ctx, requestRender, commit, fromViewport } = engine.getDrawContext();
    const sp = fromViewport(start.x, start.y); const ep = fromViewport(pos.x, pos.y);
    const r = normalizeRect({x:sp.x, y:sp.y, w:ep.x-sp.x, h:ep.y-sp.y});
    ctx.strokeStyle = color.value; ctx.lineWidth = parseInt(size.value); ctx.fillStyle = color.value + '44';
    if (tool==='rect') { ctx.fillRect(r.x, r.y, r.w, r.h); ctx.strokeRect(r.x, r.y, r.w, r.h); }
    else { ctx.beginPath(); ctx.ellipse(r.x + r.w/2, r.y + r.h/2, r.w/2, r.h/2, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke(); }
    requestRender(); commit();
    octx2.setTransform(1,0,0,1,0,0); octx2.clearRect(0,0,overlay.width, overlay.height);
  });

  // Selection tool interactions
  overlay.addEventListener('pointerdown', (e)=>{
    if (tool !== 'select') return; overlay.setPointerCapture(e.pointerId);
    const { fromViewport, state } = engine.getDrawContext();
    const vp = getPos(e); sel.lastVP = vp;
    if (sel.active && sel.rect){
      const vpRect = worldToViewportRect(sel.rect);
      const handle = hitTestHandle(vp.x, vp.y);
      if (handle){ sel.mode='resizing'; sel.handle = handle; return; }
      if (pointInViewportRect(vp.x, vp.y, vpRect)){ sel.mode='moving'; return; }
    }
    // start creating new selection
    sel.mode = 'creating';
    const p = fromViewport(vp.x, vp.y);
    sel.rect = {x:p.x, y:p.y, w:0, h:0};
    sel.active = true; sel.img = null; sel.originalRect = null; sel.handle=null;
    // clear overlay to start fresh marquee
    octx.setTransform(1,0,0,1,0,0); octx.clearRect(0,0,overlay.width, overlay.height);
  });

  overlay.addEventListener('pointermove', (e)=>{
    if (tool !== 'select' || !sel.active || !sel.mode) return;
    const { fromViewport } = engine.getDrawContext();
    const vp = getPos(e);
    if (sel.mode === 'creating'){
      const p = fromViewport(vp.x, vp.y);
      sel.rect.w = p.x - sel.rect.x; sel.rect.h = p.y - sel.rect.y;
      drawSelectionOverlay();
    } else if (sel.mode === 'moving'){
      const last = sel.lastVP; sel.lastVP = vp;
      const p0 = fromViewport(last.x, last.y); const p1 = fromViewport(vp.x, vp.y);
      const dx = p1.x - p0.x, dy = p1.y - p0.y;
      sel.rect.x += dx; sel.rect.y += dy;
      // preview selected content if captured
      octx.setTransform(1,0,0,1,0,0); octx.clearRect(0,0,overlay.width, overlay.height);
      if (sel.img){
        const vpr = worldToViewportRect(sel.rect);
        octx.drawImage(sel.img, vpr.x, vpr.y, vpr.w, vpr.h);
      }
      drawSelectionOverlay();
    } else if (sel.mode === 'resizing'){
      const r = sel.rect; const p = fromViewport(vp.x, vp.y);
      // determine which edges move
      const h = sel.handle;
      const left = h.includes('w'); const right = h.includes('e'); const top = h.includes('n'); const bottom = h.includes('s');
      if (left){ const x2 = r.x + r.w; r.x = p.x; r.w = x2 - r.x; }
      if (right){ r.w = p.x - r.x; }
      if (top){ const y2 = r.y + r.h; r.y = p.y; r.h = y2 - r.y; }
      if (bottom){ r.h = p.y - r.y; }
      // preview
      octx.setTransform(1,0,0,1,0,0); octx.clearRect(0,0,overlay.width, overlay.height);
      const nr = normalizeRect(r);
      if (sel.img){ const vpr = worldToViewportRect(nr); octx.drawImage(sel.img, vpr.x, vpr.y, vpr.w, vpr.h); }
      drawSelectionOverlay();
    }
  });

  overlay.addEventListener('pointerup', (e)=>{
    if (tool !== 'select' || !sel.active) return;
    const { fromViewport, state } = engine.getDrawContext();
    if (sel.mode === 'creating'){
      // finalize creation and capture pixels
      sel.rect = normalizeRect(sel.rect);
      if (sel.rect.w < 1 || sel.rect.h < 1){ sel.active=false; sel.mode=null; octx.clearRect(0,0,overlay.width, overlay.height); return; }
      const layerCtx = engine.getDrawContext().ctx;
      const temp = document.createElement('canvas'); temp.width = sel.rect.w; temp.height = sel.rect.h;
      temp.getContext('2d').drawImage(layerCtx.canvas, sel.rect.x, sel.rect.y, sel.rect.w, sel.rect.h, 0, 0, sel.rect.w, sel.rect.h);
      sel.img = temp; sel.originalRect = {...sel.rect};
      // draw preview on overlay
      const vpr = worldToViewportRect(sel.rect);
      octx.setTransform(1,0,0,1,0,0); octx.clearRect(0,0,overlay.width, overlay.height);
      octx.drawImage(sel.img, vpr.x, vpr.y, vpr.w, vpr.h);
      drawSelectionOverlay();
      sel.mode = null;
    } else if (sel.mode === 'moving' || sel.mode === 'resizing'){
      // apply to layer: clear original area, draw at new rect (normalized)
      const r = normalizeRect(sel.rect);
      const ctx = engine.getDrawContext().ctx;
      // clear original
      const o = normalizeRect(sel.originalRect || r);
      ctx.save();
      ctx.clearRect(o.x, o.y, o.w, o.h);
      // draw new
      ctx.drawImage(sel.img, r.x, r.y, r.w, r.h);
      ctx.restore();
      engine.requestRender(); engine.getDrawContext().commit();
      // reset selection
      octx.setTransform(1,0,0,1,0,0); octx.clearRect(0,0,overlay.width, overlay.height);
      sel.active=false; sel.mode=null; sel.img=null; sel.rect=null; sel.originalRect=null; sel.handle=null;
    }
  });

  // Keyboard shortcuts for tools + spacebar pan hold
  const keyMap = { v:'select', p:'pencil', b:'brush', e:'eraser', r:'rect', c:'circle', t:'text' };
  window.addEventListener('keydown', (e)=>{
    const k = e.key.toLowerCase();
    if (keyMap[k]){ e.preventDefault(); setTool(keyMap[k]); }
    if (k === ' '){ if (tool !== 'pan'){ sel.prevTool = tool; setTool('pan'); } e.preventDefault(); }
  });
  window.addEventListener('keyup', (e)=>{
    const k = e.key.toLowerCase();
    if (k === ' ' && sel.prevTool){ setTool(sel.prevTool); sel.prevTool=null; }
  });
}
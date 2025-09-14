function createCanvas(w, h){
  const c = document.createElement('canvas');
  c.width = w; c.height = h; return c;
}

export function initEngine({ stage, drawCanvas, overlayCanvas, zoomLabel }){
  const state = {
    width: 1600,
    height: 1000,
    zoom: 1,
    pan: {x:0, y:0},
    layers: [],
    currentLayer: 0,
    blendMode: 'source-over',
    opacity: 1,
    committing: null,
    commitHandlers: [],
    // overlay render hooks allow tools to redraw overlays after each render
    overlayHandlers: [],
  };

  const ctx = drawCanvas.getContext('2d');
  const octx = overlayCanvas.getContext('2d');

  function resizeStage(){
    const rect = stage.getBoundingClientRect();
    drawCanvas.width = overlayCanvas.width = rect.width;
    drawCanvas.height = overlayCanvas.height = rect.height;
    requestRender();
  }
  window.addEventListener('resize', resizeStage);
  resizeStage();

  function addLayer(){
    const off = createCanvas(state.width, state.height);
    state.layers.push({canvas: off, opacity: 1, blend: 'source-over', visible: true, name: `Layer ${state.layers.length+1}`});
    state.currentLayer = state.layers.length - 1;
    rebuildLayersUI();
    requestRender();
  }

  function clearAllLayers(){
    state.layers = [];
    addLayer();
  }

  function setBlendMode(mode){ state.blendMode = mode; const layer = getCurrentLayer(); if(layer){ layer.blend = mode; requestRender(); } }
  function setOpacity(op){ state.opacity = op; const layer = getCurrentLayer(); if(layer){ layer.opacity = op; requestRender(); } }

  function getCurrentLayer(){ return state.layers[state.currentLayer]; }

  function requestRender(){
    const { width, height, zoom, pan } = state;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,drawCanvas.width, drawCanvas.height);
    octx.setTransform(1,0,0,1,0,0);
    octx.clearRect(0,0,overlayCanvas.width, overlayCanvas.height);

    // Center content
    const scale = zoom;
    const offsetX = (drawCanvas.width - width*scale)/2 + pan.x;
    const offsetY = (drawCanvas.height - height*scale)/2 + pan.y;

    for (const layer of state.layers){
      if (!layer.visible) continue;
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = layer.blend;
      ctx.setTransform(scale,0,0,scale, offsetX, offsetY);
      ctx.drawImage(layer.canvas, 0, 0);
    }

    // Overlay could draw selection boxes, cursors, etc.
    zoomLabel.textContent = Math.round(state.zoom*100)+"%";
    // invoke overlay render hooks after clearing overlay each frame
    state.overlayHandlers.forEach(fn=>{ try{ fn(); }catch(_){} });
  }

  function panBy(dx, dy){ state.pan.x += dx; state.pan.y += dy; requestRender(); }
  function setZoom(z){ state.zoom = Math.min(8, Math.max(0.1, z)); requestRender(); }

  // Tools integration API
  function getDrawContext(){ return { ctx: getCurrentLayer().canvas.getContext('2d'), state, requestRender, commit, toViewport, fromViewport }; }

  function toViewport(x, y){
    const { width, height, zoom, pan } = state;
    const offsetX = (drawCanvas.width - width*zoom)/2 + pan.x;
    const offsetY = (drawCanvas.height - height*zoom)/2 + pan.y;
    return { x: x*zoom + offsetX, y: y*zoom + offsetY };
  }
  function fromViewport(vx, vy){
    const { width, height, zoom, pan } = state;
    const offsetX = (drawCanvas.width - width*zoom)/2 + pan.x;
    const offsetY = (drawCanvas.height - height*zoom)/2 + pan.y;
    return { x: (vx - offsetX)/zoom, y: (vy - offsetY)/zoom };
  }

  function commit(){ state.commitHandlers.forEach(h=>h()); }
  function onCommit(fn){ state.commitHandlers.push(fn); }
  function onOverlay(fn){ state.overlayHandlers.push(fn); }

  // Mouse/touch pan and zoom controls
  let panning = false; let last = {x:0,y:0};
  overlayCanvas.addEventListener('mousedown', (e)=>{ if (currentTool==='pan' || e.button===1){ panning=true; last={x:e.clientX,y:e.clientY}; }});
  overlayCanvas.addEventListener('mousemove', (e)=>{ if (panning){ panBy(e.clientX-last.x, e.clientY-last.y); last={x:e.clientX,y:e.clientY}; }});
  window.addEventListener('mouseup', ()=>{ panning=false; });
  overlayCanvas.addEventListener('wheel', (e)=>{ e.preventDefault(); const factor = e.deltaY>0? 0.9:1.1; setZoom(state.zoom*factor); }, {passive:false});

  // UI controls
  document.getElementById('zoomIn').addEventListener('click', ()=>setZoom(state.zoom*1.1));
  document.getElementById('zoomOut').addEventListener('click', ()=>setZoom(state.zoom*0.9));
  document.getElementById('resetView').addEventListener('click', ()=>{ state.zoom=1; state.pan={x:0,y:0}; requestRender(); });

  // Layers UI
  const list = document.getElementById('layersList');
  function rebuildLayersUI(){
    list.innerHTML = '';
    state.layers.slice().reverse().forEach((layer, idxRev)=>{
      const li = document.createElement('li');
      const idx = state.layers.length-1-idxRev;
      li.innerHTML = `<span>${layer.name}</span><span><input type="checkbox" ${layer.visible? 'checked':''} data-act="vis"> <button data-act="sel">Use</button></span>`;
      li.querySelector('[data-act="vis"]').addEventListener('change', (e)=>{ layer.visible = e.target.checked; requestRender(); });
      li.querySelector('[data-act="sel"]').addEventListener('click', ()=>{ state.currentLayer = idx; requestRender(); });
      list.appendChild(li);
    });
  }
  document.getElementById('addLayerBtn').addEventListener('click', addLayer);

  // Blend/opacity controls
  document.getElementById('blendMode').addEventListener('change', (e)=> setBlendMode(e.target.value));
  document.getElementById('layerOpacity').addEventListener('input', (e)=> setOpacity(parseFloat(e.target.value)));

  // Export/Import/Resize/Rotate
  function exportPNG(returnDataOnly=false){
    const comp = createCanvas(state.width, state.height);
    const cctx = comp.getContext('2d');
    for (const layer of state.layers){ if (!layer.visible) continue; cctx.globalAlpha = layer.opacity; cctx.globalCompositeOperation = layer.blend; cctx.drawImage(layer.canvas, 0, 0); }
    const url = comp.toDataURL('image/png');
    if (returnDataOnly) return url;
    const a = document.createElement('a'); a.href = url; a.download = 'clay-draw.png'; a.click();
  }
  function exportJPG(){
    const comp = createCanvas(state.width, state.height);
    const cctx = comp.getContext('2d'); cctx.fillStyle = '#ffffff'; cctx.fillRect(0,0,comp.width, comp.height);
    for (const layer of state.layers){ if (!layer.visible) continue; cctx.globalAlpha = layer.opacity; cctx.globalCompositeOperation = layer.blend; cctx.drawImage(layer.canvas, 0, 0); }
    const a = document.createElement('a'); a.href = comp.toDataURL('image/jpeg', 0.92); a.download='clay-draw.jpg'; a.click();
  }
  function exportSVG(){
    // Basic SVG wrapper of raster layers
    const svgParts = [`<svg xmlns="http://www.w3.org/2000/svg" width="${state.width}" height="${state.height}">`];
    for (const layer of state.layers){ if (!layer.visible) continue; svgParts.push(`<image href="${layer.canvas.toDataURL()}" opacity="${layer.opacity}" style="mix-blend-mode:${layer.blend}"/>`); }
    svgParts.push('</svg>');
    const blob = new Blob(svgParts, {type:'image/svg+xml'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download='clay-draw.svg'; a.click();
    URL.revokeObjectURL(url);
  }

  document.getElementById('exportPNGBtn').addEventListener('click', ()=>exportPNG());
  document.getElementById('exportJPGBtn').addEventListener('click', exportJPG);
  document.getElementById('exportSVGBtn').addEventListener('click', exportSVG);

  // Import
  const fileInput = document.getElementById('fileInput');
  document.getElementById('importBtn').addEventListener('click', ()=>fileInput.click());
  fileInput.addEventListener('change', async (e)=>{
    const file = e.target.files?.[0]; if (!file) return;
    if (file.type === 'image/svg+xml'){
      const txt = await file.text();
      const img = new Image();
      const blob = new Blob([txt], {type:'image/svg+xml'});
      const url = URL.createObjectURL(blob);
      img.onload = ()=>{ getCurrentLayer().canvas.getContext('2d').drawImage(img, 0,0); URL.revokeObjectURL(url); requestRender(); commit(); };
      img.src = url;
    } else {
      const img = new Image();
      img.onload = ()=>{ getCurrentLayer().canvas.getContext('2d').drawImage(img, 0,0); requestRender(); commit(); };
      img.src = URL.createObjectURL(file);
    }
  });

  // Resize and Rotate
  document.getElementById('resizeBtn').addEventListener('click', ()=>{
    const w = parseInt(prompt('Canvas width (px):', state.width));
    const h = parseInt(prompt('Canvas height (px):', state.height));
    if(!w||!h) return;
    state.width = w; state.height = h;
    for (const layer of state.layers){
      const old = layer.canvas; const n = createCanvas(w,h); n.getContext('2d').drawImage(old, 0,0,w,h); layer.canvas = n;
    }
    requestRender(); commit();
  });
  document.getElementById('rotateBtn').addEventListener('click', ()=>{
    [state.width, state.height] = [state.height, state.width];
    for (const layer of state.layers){
      const old = layer.canvas; const n = createCanvas(old.height, old.width);
      const nctx = n.getContext('2d');
      nctx.translate(n.width/2, n.height/2); nctx.rotate(Math.PI/2); nctx.drawImage(old, -old.width/2, -old.height/2);
      layer.canvas = n;
    }
    requestRender(); commit();
  });

  // Init
  clearAllLayers();

  // Public API
  return {
    getDrawContext, requestRender, setZoom, panBy, onCommit, exportPNG, clearAllLayers,
    drawImageOnCurrentLayer: (img)=>{ getCurrentLayer().canvas.getContext('2d').drawImage(img,0,0); },
    onOverlay,
  };
}

// global tool variable for pan mouse logic
let currentTool = 'pencil';
export function setCurrentTool(t){ currentTool = t; }
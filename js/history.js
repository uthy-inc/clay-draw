export function initHistory(engine){
  const stack = [];
  const redoStack = [];
  const MAX = 50;
  const push = () => {
    const snapshot = engine.exportPNG(true); // get dataURL of current composite
    stack.push(snapshot);
    if (stack.length > MAX) stack.shift();
    redoStack.length = 0;
  };
  const applySnapshot = (dataUrl)=>{
    const img = new Image();
    img.onload = ()=>{
      engine.clearAllLayers();
      engine.drawImageOnCurrentLayer(img);
      engine.requestRender();
    };
    img.src = dataUrl;
  };
  document.getElementById('undoBtn').addEventListener('click', ()=>{
    if (stack.length){
      const current = engine.exportPNG(true);
      redoStack.push(current);
      const last = stack.pop();
      applySnapshot(last);
    }
  });
  document.getElementById('redoBtn').addEventListener('click', ()=>{
    if (redoStack.length){
      const current = engine.exportPNG(true);
      stack.push(current);
      applySnapshot(redoStack.pop());
    }
  });
  // Record after each stroke
  engine.onCommit(push);
  return { undo: ()=>document.getElementById('undoBtn').click(), redo: ()=>document.getElementById('redoBtn').click(), push };
}
export const $ = (sel, root=document)=>root.querySelector(sel);
export const $$ = (sel, root=document)=>Array.from(root.querySelectorAll(sel));

// PWA install
const installBtn = $('#installBtn');
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn?.classList.add('show');
});
installBtn?.addEventListener('click', async ()=>{
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
});

// Register SW
if ('serviceWorker' in navigator) {
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('./sw.js');
  });
}
// Hash router with role guards. #/login, #/pjt, #/admin, #/reset (password recovery).
import { store } from './data/store.js';
import { loadAnime } from './anim.js';
import { errorMessage, esc } from './ui.js';
import { mountLogin, mountReset } from './views/login.js';
import { mountPjt } from './views/pjt.js';
import { mountAdmin } from './views/admin.js';

const root = document.getElementById('app');
let recovering = false;

const homeFor = (s) => (s.role === 'admin' ? '#/admin' : '#/pjt');

async function route() {
  document.getElementById('modal-root').innerHTML = '';
  // Each view installs its own delegated handlers; clear the previous view's.
  root.onclick = root.onchange = root.oninput = root.onsubmit = window.onfocus = null;
  let session = null;
  try {
    session = await store.getSession();
  } catch (e) {
    root.innerHTML = `<div class="loading"><div class="error-box" style="max-width:520px">${esc(errorMessage(e))}</div></div>`;
    return;
  }
  let hash = location.hash || '#/login';
  if (recovering) hash = '#/reset';
  else if (!session) hash = '#/login';
  else if (hash === '#/login' || hash === '#/reset' || hash !== homeFor(session)) hash = homeFor(session);
  if (location.hash !== hash) { location.replace(hash); return; }
  window.scrollTo(0, 0);

  const ctx = {
    store, session,
    go: (h) => { if (location.hash === h) route(); else location.hash = h; },
    signOut: async () => { await store.signOut(); ctx.go('#/login'); }
  };
  if (hash === '#/reset') return mountReset(root, { ...ctx, done: () => { recovering = false; ctx.go('#/login'); } });
  if (hash === '#/pjt') return mountPjt(root, ctx);
  if (hash === '#/admin') return mountAdmin(root, ctx);
  return mountLogin(root, ctx);
}

async function start() {
  root.innerHTML = '<div class="loading"><div class="spinner" role="img" aria-label="กำลังโหลด"></div></div>';
  await loadAnime();
  if (store.onPasswordRecovery) {
    try { await store.onPasswordRecovery(() => { recovering = true; route(); }); } catch (e) { /* config error shown by route() */ }
  }
  window.addEventListener('hashchange', route);
  route();
}
start();

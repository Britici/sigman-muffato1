// ============================================================
// SIGMAN v2.0 — main.js
// Entry point: inicializa tema, auto-login e eventos globais
// ============================================================

import { doLogin, doLogout, tryAutoLogin } from './auth.js';
import { toggleSB, closeSB, toggleTheme, loadTheme } from './nav.js';
import { openM, closeM } from './utils.js';

// ── Tema ──────────────────────────────────────────────────────
loadTheme();

// ── Eventos globais ───────────────────────────────────────────
document.getElementById('btn-login')?.addEventListener('click', doLogin);
document.getElementById('btn-logout')?.addEventListener('click', doLogout);
document.getElementById('btn-sb-tog')?.addEventListener('click', toggleSB);
document.getElementById('th-btn')?.addEventListener('click', toggleTheme);
document.getElementById('sb-ov')?.addEventListener('click', closeSB);

// Fecha modal ao clicar no backdrop ou em botão data-close
document.addEventListener('click', e => {
  if (e.target.classList.contains('mb')) {
    e.target.classList.remove('on');
  }
  const closeBtn = e.target.closest('[data-close]');
  if (closeBtn) closeM(closeBtn.dataset.close);
});

// Enter no login
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const ls = document.getElementById('login-screen');
    if (ls && ls.style.display !== 'none') doLogin();
  }
});

// ── Inicialização ─────────────────────────────────────────────
async function init() {
  const loggedIn = await tryAutoLogin();
  if (!loggedIn) {
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('login-screen').style.display   = 'flex';
  }
}

init();

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

// Esc fecha QUALQUER coisa que se sobrepõe na tela — modal (.mb.on),
// dropdown de prioridade (.psel.open), dropdown de ações (.dd.open,
// usado em Ativos) ou a sidebar mobile. Ordem: modal > dropdown >
// sidebar (se houver modal aberto, fecha só ele; senão tenta os
// dropdowns; por último a sidebar).
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const modais = document.querySelectorAll('.mb.on');
  if (modais.length) { modais[modais.length-1].classList.remove('on'); return; }
  const dropdowns = document.querySelectorAll('.psel.open, .dd.open');
  if (dropdowns.length) { dropdowns.forEach(d => d.classList.remove('open')); return; }
  closeSB();
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

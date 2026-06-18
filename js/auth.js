// ============================================================
// SIGMAN v2.0 — auth.js
// Login, sessão e controle de menus por perfil
// ============================================================

import { getDB, syncAll } from './api.js';
import { sv, showToast } from './utils.js';
import { initRouter, goTo } from './router.js';
import { buildNav, updateNavDots } from './nav.js';

export let CU = null; // usuário logado

export const ROLES = {
  administracao: {
    label: 'Administração',
    menus: ['dashboard','os-planejadas','os-executadas','os-abertura','inspecao','pcm','solicitacao','ativos','usuarios'],
  },
  supervisao: {
    label: 'Supervisão',
    menus: ['dashboard','os-planejadas','os-executadas','os-abertura','inspecao','pcm','solicitacao','ativos'],
  },
  planejamento: {
    label: 'Planejamento',
    menus: ['dashboard','os-planejadas','os-executadas','os-planejamento','inspecao-tmpl','preventiva','analise-causa-raiz','ativos'],
  },
  manutencao: {
    label: 'Manutenção',
    menus: ['dashboard','os-planejadas','os-executadas','os-abertura','inspecao'],
  },
  producao: {
    label: 'Produção',
    menus: ['solicitacao'],
  },
  diretoria: {
    label: 'Diretoria',
    menus: ['dashboard','os-executadas','solicitacao'],
  },
};

export async function doLogin() {
  const login = document.getElementById('l-u')?.value?.trim();
  const senha = document.getElementById('l-p')?.value?.trim();
  if (!login || !senha) { lAlert('Preencha usuário e senha.'); return; }

  const db = getDB();
  const user = db.usuarios.find(u => u.login === login && u.senha === senha);
  if (!user) { lAlert('Usuário ou senha incorretos.'); return; }

  CU = user;
  localStorage.setItem('sigman_sess', JSON.stringify({ login, senha }));
  await enterApp();
}

export function doLogout() {
  localStorage.removeItem('sigman_sess');
  CU = null;
  document.getElementById('app').classList.remove('on');
  document.getElementById('login-screen').style.display = 'flex';
}

export async function tryAutoLogin() {
  const sess = localStorage.getItem('sigman_sess');
  if (!sess) return false;
  try {
    const { login, senha } = JSON.parse(sess);
    const db = getDB();
    const user = db.usuarios.find(u => u.login === login && u.senha === senha);
    if (!user) return false;
    CU = user;
    await enterApp();
    return true;
  } catch(e) {
    localStorage.removeItem('sigman_sess');
    return false;
  }
}

async function enterApp() {
  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('login-screen').style.display   = 'none';
  document.getElementById('app').classList.add('on');

  // Avatar e info do usuário
  const ini = CU.nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  document.getElementById('u-av').textContent = ini;
  document.getElementById('u-nm').textContent = CU.nome;
  document.getElementById('u-rl').textContent = ROLES[CU.perfil]?.label || CU.perfil;

  // Contador OS hoje na topbar
  const tbStat = document.getElementById('tb-stat');
  if (tbStat) tbStat.style.display = CU.perfil !== 'producao' ? 'flex' : 'none';

  // Pré-preenche nome do manutentor nos formulários
  if (CU.perfil !== 'producao') {
    ['ab-mn','insp-mn','insp-tmpl-mn','prev-mn','mc-mn'].forEach(id => sv(id, CU.nome));
  }

  buildNav();
  updateNavDots();
  updOSHoje();

  // Rota inicial por perfil
  const menus = ROLES[CU.perfil]?.menus || [];
  const first = menus[0] === 'pcm' ? 'os-planejamento' : (menus[0] || 'dashboard');
  initRouter(first);

  // Sync em background
  syncAll(true).then(() => updateNavDots());
}

export function updOSHoje() {
  const db = getDB();
  const t  = new Date().toISOString().slice(0, 10);
  const el = document.getElementById('th-hj');
  if (el) el.textContent = db.ordens.filter(o => o.data === t).length;
}

function lAlert(msg, type = 'err') {
  const el = document.getElementById('l-alert');
  if (!el) return;
  el.textContent = msg;
  el.className   = `lalert ${type} show`;
  setTimeout(() => el.classList.remove('show'), 3500);
}

// Atalho Enter no login
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('login-screen')?.style.display !== 'none') {
    doLogin();
  }
});

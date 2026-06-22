// ============================================================
// SIGMAN v2.0 — auth.js
// Login, sessão e controle de menus por perfil
// ============================================================

import { getDB, saveDB, syncAll } from './api.js';
import { sv, showToast } from './utils.js';
import { initRouter, goTo } from './router.js';
import { buildNav, updateNavDots } from './nav.js';

export let CU = null; // usuário logado

// ── Perfis e permissões ───────────────────────────────────────
// menus: ids de página visíveis na nav (incluindo 'pcm' = grupo)
// pcmSub: ids de subitens do grupo PCM visíveis (só quem tem 'pcm' em menus)
export const ROLES = {
  admin: {
    label: 'Administrador',
    menus: ['dashboard','os-planejadas','os-executadas','os-abertura','inspecao','pcm','solicitacao','ativos','usuarios'],
    pcmSub: ['os-planejamento','analise-causa-raiz','inspecao-tmpl','preventiva'],
  },
  pcm: {
    label: 'PCM',
    menus: ['dashboard','os-planejadas','os-executadas','os-abertura','inspecao','pcm','solicitacao','ativos'],
    pcmSub: ['os-planejamento','analise-causa-raiz','inspecao-tmpl','preventiva'],
  },
  manutencao: {
    label: 'Manutenção',
    menus: ['dashboard','os-planejadas','os-executadas','os-abertura','inspecao','solicitacao'],
    pcmSub: [],
  },
  administrativo: {
    label: 'Administrativo',
    menus: ['dashboard','os-executadas'],
    pcmSub: [],
  },
  producao: {
    label: 'Produção',
    menus: ['os-abertura','os-executadas','solicitacao'],
    pcmSub: [],
  },
};

// ── Hash de senha (SHA-256 via Web Crypto API) ─────────────────
// Nota: hash client-side é proteção contra leitura casual do
// código-fonte/localStorage, NÃO substitui hashing server-side
// com salt (bcrypt/argon2) que o backend Express deverá fazer.
export async function hashPassword(senhaPlana) {
  const enc  = new TextEncoder().encode(senhaPlana);
  const buf  = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function _checkSenha(user, senhaPlana) {
  // Suporta transição: se senhaHash existe, compara hash;
  // caso contrário (dado legado ainda não migrado), compara texto puro
  // e migra para hash na hora.
  if (user.senhaHash) {
    const h = await hashPassword(senhaPlana);
    return h === user.senhaHash;
  }
  if (user.senha && user.senha === senhaPlana) {
    user.senhaHash = await hashPassword(senhaPlana);
    delete user.senha;
    return true;
  }
  return false;
}

// ── Troca obrigatória de senha (primeiro acesso ou pós-reset) ──
// Modal criado dinamicamente em JS (reaproveita as classes .mb/.modal
// já existentes no CSS) para não depender de marcação fixa no index.html.
// Sem botão de fechar — só resolve a Promise quando a senha é trocada
// com sucesso, bloqueando a entrada no app até lá.
function _forcarTrocaSenha() {
  return new Promise((resolve) => {
    // Esconde a tela de login para que o listener global de Enter
    // (ligado em #login-screen) não chame doLogin() de novo enquanto
    // este modal estiver aberto.
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) loginScreen.style.display = 'none';

    let overlay = document.getElementById('m-troca-senha');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'm-troca-senha';
      overlay.className = 'mb on';
      overlay.innerHTML = `
        <div class="modal" style="max-width:420px">
          <div class="mhd">
            <div class="mtit">🔒 Troca de Senha Obrigatória</div>
          </div>
          <div class="alert inf show" style="display:block;font-size:12px;margin-bottom:14px">
            Este é seu primeiro acesso (ou sua senha foi resetada).
            Defina uma nova senha para continuar.
          </div>
          <div class="fg">
            <label>Nova senha</label>
            <input type="password" id="ts-nova" placeholder="Mínimo 6 caracteres">
          </div>
          <div class="fg" style="margin-top:10px">
            <label>Confirmar nova senha</label>
            <input type="password" id="ts-conf" placeholder="Repita a nova senha">
          </div>
          <div id="ts-alert" class="alert er" style="display:none;margin-top:10px;font-size:12px"></div>
          <div class="fa" style="margin-top:18px">
            <button class="btn btn-p btn-sm" id="ts-btn-salvar">Salvar e Entrar</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
    } else {
      overlay.classList.add('on');
    }

    // Trava de segurança: main.js tem um listener global em document que
    // fecha QUALQUER elemento com classe .mb ao clicar no fundo escuro
    // (document.addEventListener('click', e => { if (e.target.classList
    // .contains('mb')) e.target.classList.remove('on') ... })).
    // Esse modal é obrigatório — clicar fora não pode fechá-lo. Paramos
    // a propagação no próprio overlay, antes do clique chegar em document.
    overlay.onclick = (e) => e.stopPropagation();

    const elNova = document.getElementById('ts-nova');
    const elConf = document.getElementById('ts-conf');
    const elAl   = document.getElementById('ts-alert');
    const elBtn  = document.getElementById('ts-btn-salvar');

    const erro = (msg) => { elAl.textContent = msg; elAl.style.display = 'block'; };

    const submeter = async () => {
      const nova = elNova.value;
      const conf = elConf.value;
      elAl.style.display = 'none';

      if (!nova || nova.length < 6) { erro('A senha deve ter ao menos 6 caracteres.'); return; }
      if (nova !== conf)             { erro('As senhas não coincidem.'); return; }
      if (nova === CU.login)         { erro('A nova senha não pode ser igual ao login.'); return; }

      CU.senhaHash = await hashPassword(nova);
      CU.primeiroAcesso = false;
      saveDB();

      overlay.classList.remove('on');
      overlay.remove();
      elBtn.removeEventListener('click', submeter);
      resolve();
    };

    elBtn.addEventListener('click', submeter);
    elConf.addEventListener('keydown', (e) => { if (e.key === 'Enter') submeter(); });
  });
}

export async function doLogin() {
  const login = document.getElementById('l-u')?.value?.trim();
  const senha = document.getElementById('l-p')?.value?.trim();
  if (!login || !senha) { lAlert('Preencha usuário e senha.'); return; }

  const db   = getDB();
  const user = db.usuarios.find(u => u.login === login && u.ativo !== false);
  if (!user || !(await _checkSenha(user, senha))) {
    lAlert('Usuário ou senha incorretos.');
    return;
  }

  CU = user;
  // Nunca persistir a senha em texto puro na sessão
  localStorage.setItem('sigman_sess', JSON.stringify({ login }));

  if (CU.primeiroAcesso) {
    await _forcarTrocaSenha();
  }

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
    const { login } = JSON.parse(sess);
    const db   = getDB();
    const user = db.usuarios.find(u => u.login === login && u.ativo !== false);
    if (!user) { localStorage.removeItem('sigman_sess'); return false; }
    CU = user;
    if (CU.primeiroAcesso) {
      await _forcarTrocaSenha();
    }
    await enterApp();
    return true;
  } catch (e) {
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

  // Contador OS hoje na topbar (oculto só para produção)
  const tbStat = document.getElementById('tb-stat');
  if (tbStat) tbStat.style.display = CU.perfil !== 'producao' ? 'flex' : 'none';

  // Pré-preenche nome do manutentor nos formulários
  if (CU.perfil !== 'producao') {
    ['ab-mn','insp-mn','insp-tmpl-mn','prev-mn','mc-mn'].forEach(id => sv(id, CU.nome));
  }

  buildNav();
  updateNavDots();
  updOSHoje();

  // Rota inicial: Dashboard para todos, exceto Produção → Abertura de O.S.
  initRouter(CU.perfil === 'producao' ? 'os-abertura' : 'dashboard');

  // Sync em background
  syncAll(true).then(() => updateNavDots());
}

export function updOSHoje() {
  const db = getDB();
  const t  = new Date().toISOString().slice(0, 10);
  const el = document.getElementById('th-hj');
  if (el) el.textContent = db.ordens.filter(o => o.data === t).length;
}

// ── Helper de permissão para uso em outras páginas ─────────────
export function podeAcessar(pageId) {
  if (!CU) return false;
  const role = ROLES[CU.perfil];
  if (!role) return false;
  if (role.menus.includes(pageId)) return true;
  if (role.menus.includes('pcm') && role.pcmSub.includes(pageId)) return true;
  return false;
}

export function isAdmin() {
  return CU?.perfil === 'admin';
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

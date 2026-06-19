// ============================================================
// SIGMAN v2.0 — router.js
// Hash router: #dashboard, #os, #preventiva, etc.
// Cada página é um módulo JS independente em js/pages/
// ============================================================

import { getDB } from './api.js';
import { showToast } from './utils.js';
import { podeAcessar } from './auth.js';

// Mapa hash → { title, pageId, loader }
// loader é importado dinamicamente — só carrega quando necessário
const ROUTES = {
  'dashboard':          { title:'Dashboard',                 pageId:'pg-dashboard'          },
  'os-executadas':      { title:'O.S. Executadas',           pageId:'pg-executadas'          },
  'os-abertura':        { title:'Abertura de O.S.',          pageId:'pg-abertura'            },
  'os-planejadas':      { title:'O.S. Planejadas',           pageId:'pg-planejadas'          },
  'os-planejamento':    { title:'PCM — Planejamento de O.S.',pageId:'pg-planejamento'        },
  'solicitacao':        { title:'Solicitação de O.S.',       pageId:'pg-solicitacao'         },
  'inspecao':           { title:'Inspeção Diária',           pageId:'pg-inspecao'            },
  'inspecao-tmpl':      { title:'PCM — Inspeção de Rota',   pageId:'pg-inspecao-tmpl'       },
  'preventiva':         { title:'PCM — Manutenção Preventiva', pageId:'pg-preventiva'        },
  'analise-causa-raiz': { title:'PCM — Análise de Causa Raiz', pageId:'pg-analise-causa-raiz'},
  'ativos':             { title:'Ativos',                    pageId:'pg-ativos'              },
  'usuarios':           { title:'Usuários',                  pageId:'pg-usuarios'            },
  'configuracoes':      { title:'Configurações',             pageId:'pg-configuracoes'       },
};

// Mapa de loader dinâmico por rota
const PAGE_LOADERS = {
  'dashboard':          () => import('./pages/dashboard.js'),
  'os-executadas':      () => import('./pages/os-executadas.js'),
  'os-abertura':        () => import('./pages/os-abertura.js'),
  'os-planejadas':      () => import('./pages/os-planejadas.js'),
  'os-planejamento':    () => import('./pages/os-planejamento.js'),
  'solicitacao':        () => import('./pages/solicitacao.js'),
  'inspecao':           () => import('./pages/inspecao.js'),
  'inspecao-tmpl':      () => import('./pages/inspecao-tmpl.js'),
  'preventiva':         () => import('./pages/preventiva.js'),
  'analise-causa-raiz': () => import('./pages/analise-causa-raiz.js'),
  'ativos':             () => import('./pages/ativos.js'),
  'usuarios':           () => import('./pages/usuarios.js'),
  'configuracoes':      () => import('./pages/configuracoes.js'),
};

let _currentRoute = null;
let _routerStarted = false; // garante que o listener de hashchange só seja registrado 1x por carregamento de página
let _defaultRoute  = 'dashboard';
const _loaded = {}; // cache de módulos já importados

function _onHashChange() {
  const hash = location.hash.replace('#', '') || _defaultRoute;
  navigate(hash);
}

export async function navigate(hash) {
  const route = ROUTES[hash];
  if (!route) {
    console.warn('[router] Rota não encontrada:', hash);
    return;
  }

  // ── Guarda de permissão ──────────────────────────────────────
  // Mesmo com a nav escondendo itens, um usuário pode digitar o
  // hash direto na URL (#usuarios, #ativos, etc). Bloqueia aqui
  // antes de montar a página, independente do que a UI mostra.
  if (!podeAcessar(hash)) {
    showToast('Você não tem permissão para acessar esta página.', 'er');
    // Redireciona para o hash anterior válido, ou dashboard como fallback
    if (_currentRoute && podeAcessar(_currentRoute)) {
      location.hash = _currentRoute;
    } else {
      location.hash = 'dashboard';
    }
    return;
  }

  // Oculta todas as páginas; ativa a correta
  document.querySelectorAll('.pg').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('.nv-item, .nv-sub-item').forEach(n => n.classList.remove('act'));

  const pg = document.getElementById(route.pageId);
  if (pg) pg.classList.add('on');

  // Marca nav ativo
  const ni = document.querySelector(`[data-page="${hash}"]`);
  if (ni) ni.classList.add('act');

  // Atualiza título da topbar
  const tb = document.getElementById('tb-t');
  if (tb) tb.textContent = route.title;

  _currentRoute = hash;

  // Carrega e executa o módulo da página
  const loader = PAGE_LOADERS[hash];
  if (loader) {
    try {
      if (!_loaded[hash]) _loaded[hash] = await loader();
      const mod = _loaded[hash];
      if (typeof mod.init === 'function') await mod.init();
      else if (typeof mod.render === 'function') mod.render();
    } catch(e) {
      console.error('[router] Erro ao carregar página:', hash, e);
      showToast('Erro ao carregar página.', 'er');
    }
  }
}

export function getCurrentRoute() { return _currentRoute; }

// Inicializa o roteamento por hash
export function initRouter(defaultRoute = 'dashboard') {
  _defaultRoute = defaultRoute;

  if (!_routerStarted) {
    window.addEventListener('hashchange', _onHashChange);
    _routerStarted = true;
  }

  // Rota inicial
  const initial = location.hash.replace('#', '') || defaultRoute;
  navigate(initial);
}

// Helper para navegar programaticamente
export function goTo(hash) {
  location.hash = hash;
}

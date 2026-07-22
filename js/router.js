// ============================================================
// SIGMAN v2.0 — router.js
// Hash router: #dashboard, #os, #preventiva, etc.
// Cada página é um módulo JS independente em js/pages/
// ============================================================

import { getDB } from './api.js?v=20260718a';
import { showToast } from './utils.js?v=20260718a';
import { podeAcessar } from './auth.js?v=20260718a';

// Mapa hash → { title, pageId, loader }
// loader é importado dinamicamente — só carrega quando necessário
const ROUTES = {
  'dashboard':          { title:'Dashboard',                 pageId:'pg-dashboard'          },
  'os-executadas':      { title:'O.S. Executadas',           pageId:'pg-executadas'          },
  'os-abertura':        { title:'Abertura de O.S.',          pageId:'pg-abertura'            },
  'os-planejadas':      { title:'O.S. Planejadas',           pageId:'pg-planejadas'          },
  'os-planejamento':    { title:'PCM — Planejamento de O.S.',pageId:'pg-planejamento'        },
  'inspecao':           { title:'Inspeção Diária',           pageId:'pg-inspecao'            },
  'preventiva':         { title:'PCM — Manutenção Preventiva', pageId:'pg-preventiva'        },
  'analise-causa-raiz': { title:'PCM — Análise de Causa Raiz', pageId:'pg-analise-causa-raiz'},
  'ativos':             { title:'Ativos',                    pageId:'pg-ativos'              },
  'usuarios':           { title:'Usuários',                  pageId:'pg-usuarios'            },
  'configuracoes':      { title:'Configurações',             pageId:'pg-configuracoes'       },
};

// Mapa de loader dinâmico por rota
// ?v=SIGMAN_VER evita cache stale — sem isso, o navegador pode
// continuar servindo uma versão antiga de um js/pages/*.js já em
// cache mesmo depois de aplicar um zip novo, sem erro visível.
// Só aqui usamos a variável (não um literal fixo): como o loader é
// dinâmico, basta bumpar window.SIGMAN_VER no index.html — não
// precisa editar este arquivo de novo a cada sessão.
const _V = window.SIGMAN_VER || '';
const PAGE_LOADERS = {
  'dashboard':          () => import(`./pages/dashboard.js?v=${_V}`),
  'os-executadas':      () => import(`./pages/os-executadas.js?v=${_V}`),
  'os-abertura':        () => import(`./pages/os-abertura.js?v=${_V}`),
  'os-planejadas':      () => import(`./pages/os-planejadas.js?v=${_V}`),
  'os-planejamento':    () => import(`./pages/os-planejamento.js?v=${_V}`),
  'inspecao':           () => import(`./pages/inspecao.js?v=${_V}`),
  'preventiva':         () => import(`./pages/preventiva.js?v=${_V}`),
  'analise-causa-raiz': () => import(`./pages/analise-causa-raiz.js?v=${_V}`),
  'ativos':             () => import(`./pages/ativos.js?v=${_V}`),
  'usuarios':           () => import(`./pages/usuarios.js?v=${_V}`),
  'configuracoes':      () => import(`./pages/configuracoes.js?v=${_V}`),
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

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
  'inspecao':           { title:'Inspeção Diária',           pageId:'pg-inspecao'            },
  'preventiva':         { title:'PCM — Manutenção Preventiva', pageId:'pg-preventiva'        },
  'oc-solicitacao':     { title:'PCM — Solicitação de Compras',    pageId:'pg-oc-solicitacao'    },
  'oc-acompanhamento':  { title:'PCM — Acompanhamento de Compras', pageId:'pg-oc-acompanhamento' },
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
//
// ⚠️ Os loaders abaixo NÃO levam ?v= — mesmo sendo imports dinâmicos
// (que aceitariam a variável _V). Motivo: vários desses arquivos
// TAMBÉM são importados estaticamente por OUTRO módulo de página
// (ex.: os-planejadas.js importa abrirConcluir de os-executadas.js;
// os-executadas.js importa de analise-causa-raiz.js). Import estático
// exige string literal, então essas referências cruzadas nunca têm
// ?v=. Se o loader abaixo tivesse ?v=${_V}, o mesmo arquivo seria
// buscado sob DUAS URLs diferentes → o navegador cria DUAS instâncias
// separadas do módulo, cada uma com seu próprio estado (_concluirId,
// _bound, etc.) — bug real e sério, achado em 2026-08-05 (conclusão de
// O.S. Planejada falhando com "item não encontrado" mesmo com o dado
// existindo, porque o clique de Salvar rodava numa instância que nunca
// recebeu o id certo). Cache-busting de página fica só por conta do
// hard refresh (Ctrl+Shift+R) — não reintroduzir ?v= aqui.
const PAGE_LOADERS = {
  'dashboard':          () => import(`./pages/dashboard.js`),
  'os-executadas':      () => import(`./pages/os-executadas.js`),
  'os-abertura':        () => import(`./pages/os-abertura.js`),
  'os-planejadas':      () => import(`./pages/os-planejadas.js`),
  'os-planejamento':    () => import(`./pages/os-planejamento.js`),
  'inspecao':           () => import(`./pages/inspecao.js`),
  'preventiva':         () => import(`./pages/preventiva.js`),
  'oc-solicitacao':     () => import(`./pages/oc-solicitacao.js`),
  'oc-acompanhamento':  () => import(`./pages/oc-acompanhamento.js`),
  'analise-causa-raiz': () => import(`./pages/analise-causa-raiz.js`),
  'ativos':             () => import(`./pages/ativos.js`),
  'usuarios':           () => import(`./pages/usuarios.js`),
  'configuracoes':      () => import(`./pages/configuracoes.js`),
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

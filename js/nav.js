// ============================================================
// SIGMAN v2.0 — nav.js
// buildNav(), updateNavDots(), toggleSB(), toggleTheme()
// ============================================================

import { CU, ROLES } from './auth.js';
import { getDB } from './api.js';
import { goTo } from './router.js';

const NAV = [
  { id:'dashboard',       ic:'📊', lbl:'Dashboard'               },
  { id:'os-planejadas',   ic:'📅', lbl:'O.S. Planejadas',   dot:true },
  { id:'os-executadas',   ic:'✅', lbl:'O.S. Executadas'         },
  { id:'os-abertura',     ic:'🔧', lbl:'Abertura de O.S.'        },
  { id:'inspecao',        ic:'🔍', lbl:'Inspeção Diária'         },
  { id:'pcm', ic:'📋', lbl:'PCM', sub:[
      { id:'os-planejamento',    ic:'📋', lbl:'Planejamento de O.S.'   },
      { id:'analise-causa-raiz', ic:'🔴', lbl:'Análise de Causa Raiz'  },
      { id:'inspecao-tmpl',      ic:'📄', lbl:'Inspeção de Rota'       },
      { id:'preventiva',         ic:'🔩', lbl:'Manutenção Preventiva'  },
  ]},
  { id:'ativos',          ic:'🏭', lbl:'Ativos'                  },
  { id:'usuarios',        ic:'👥', lbl:'Usuários'                },
];

let _pcmOpen = true;

export function buildNav() {
  const nav = document.getElementById('sb-nav');
  if (!nav || !CU) return;

  const role   = ROLES[CU.perfil];
  const menus  = role?.menus  || [];
  const pcmSub = role?.pcmSub || [];
  nav.innerHTML = '';

  NAV.filter(n => menus.includes(n.id)).forEach(n => {
    if (n.sub) {
      // Grupo PCM: visibilidade dos subitens vem de pcmSub do perfil,
      // não de 'menus' (que só guarda o id do grupo 'pcm').
      const visibleSubs = n.sub.filter(s => pcmSub.includes(s.id));
      if (!visibleSubs.length) return;

      const grp = document.createElement('div');
      grp.className = 'nv-grp' + (_pcmOpen ? ' nv-grp-open' : '');
      grp.innerHTML = `
        <div class="nv-grp-hd" onclick="window._togglePCM(this)">
          <div class="nv-ic">${n.ic}</div>
          <div class="nv-lbl sc">${n.lbl}</div>
          <span class="nv-grp-chev">▶</span>
        </div>
        <div class="nv-sub-items">
          ${visibleSubs.map(s => `
            <div class="nv-sub-item" data-page="${s.id}" onclick="location.hash='${s.id}'">
              <span>${s.ic}</span><span>${s.lbl}</span>
            </div>`).join('')}
        </div>`;
      nav.appendChild(grp);
    } else {
      const el = document.createElement('div');
      el.className = 'nv-item';
      el.setAttribute('data-page', n.id);
      el.setAttribute('data-label', n.lbl);
      el.onclick = () => { location.hash = n.id; closeSB(); };
      el.innerHTML = `
        <div class="nv-ic">${n.ic}</div>
        <div class="nv-lbl sc">${n.lbl}</div>
        ${n.dot ? `<span class="nv-dot" id="dot-${n.id}"></span>` : ''}`;
      nav.appendChild(el);
    }
  });

  updateNavDots();
}

// Exposto globalmente para uso no onclick inline do submenu
window._togglePCM = function(el) {
  const grp = el.parentElement;
  grp.classList.toggle('nv-grp-open');
  _pcmOpen = grp.classList.contains('nv-grp-open');
};

export function updateNavDots() {
  const db = getDB();

  const dotPl = document.getElementById('dot-os-planejadas');
  if (dotPl) {
    const atrasadas = db.planejadas.filter(p => p.status === 'Atrasada').length;
    const urgentes  = db.planejadas.filter(p => p.prioridade === '1' && p.status !== 'Concluída').length;
    const abertas   = db.planejadas.filter(p => p.status !== 'Concluída').length;
    if (atrasadas > 0 || urgentes > 0) dotPl.className = 'nv-dot nd-red';
    else if (abertas > 0)              dotPl.className = 'nv-dot nd-org';
    else                               dotPl.className = 'nv-dot nd-grn';
  }
}

export function toggleSB() {
  const sb = document.getElementById('sb');
  if (window.innerWidth <= 768) {
    sb.classList.toggle('mob');
    document.getElementById('sb-ov').style.display = sb.classList.contains('mob') ? 'block' : 'none';
  } else {
    sb.classList.toggle('col');
  }
}

export function closeSB() {
  document.getElementById('sb')?.classList.remove('mob');
  const ov = document.getElementById('sb-ov');
  if (ov) ov.style.display = 'none';
}

export function toggleTheme() {
  const h    = document.documentElement;
  const dark = h.getAttribute('data-theme') === 'dark';
  h.setAttribute('data-theme', dark ? 'light' : 'dark');
  const btn = document.getElementById('th-btn');
  if (btn) btn.textContent = dark ? '☀️' : '🌙';
  localStorage.setItem('sigman_theme', dark ? 'light' : 'dark');
}

export function loadTheme() {
  const t = localStorage.getItem('sigman_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', t);
  const btn = document.getElementById('th-btn');
  if (btn) btn.textContent = t === 'dark' ? '🌙' : '☀️';
}

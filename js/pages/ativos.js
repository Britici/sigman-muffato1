// ============================================================
// SIGMAN v2.0 — pages/ativos.js
// Cadastro de Ativos: hierarquia Unidade → Local → Ambiente →
// Sala → Máquina. Acesso restrito a 'admin' e 'pcm'.
//
// Edição de Unidade/Local/Ambiente/Sala: não têm listagem própria.
// São editadas clicando no nome dentro da célula correspondente
// na tabela de Máquinas (decisão confirmada com Tiago em 2026-06-23).
// Consequência aceita: um nível recém-criado sem nenhuma máquina
// ainda não aparece em nenhuma linha — não há como editá-lo até
// que exista ao menos 1 máquina embaixo dele na hierarquia.
// ============================================================

import { getDB, saveDB } from '../api.js?v=20260718a';
import { podeGerenciarAtivos } from '../auth.js?v=20260718a';
import { showToast, openM, closeM, fd } from '../utils.js?v=20260718a';

// ── Estado do módulo ────────────────────────────────────────
let _view = 'estrutura'; // 'estrutura' | 'familias' — abas da página Ativos
let _sortAtivos   = { col: 'sala',   dir: 'asc' };
let _sortInativos = { col: 'sala',   dir: 'asc' };
let _filtros = {
  unidadeId: '', localId: '', ambienteId: '', salaId: '',
  nome: '', tag: '', crit: '', period: '', criadoEm: '',
};
let _editCtx = null; // { tipo, id } — null = criando
let _globalBound = false; // evita registrar o listener de fechar dropdown mais de 1x

const NOVO = '__novo__';

const CRIT_LABEL = { 1: '1 – Crítico', 2: '2 – Alta', 3: '3 – Média', 4: '4 – Baixa' };
const UNID_LABEL = { dias: ['dia', 'dias'], semanas: ['semana', 'semanas'], mes: ['mês', 'meses'], ano: ['ano', 'anos'] };

// Cores do gráfico de Criticidade — mesmas cores das badges .crit-1..4
// da tabela (unificado: criticidade 3 = azul nos dois lugares).
const CHART_COLORS = ['#ff2244', 'var(--org)', 'var(--blu)', 'var(--grn)'];
const CHART_GRAY = 'var(--txt3)';

// Colunas que devem se auto-ajustar ao conteúdo (uma linha só, sem
// sobra de espaço). "nome" (Ativo/Máquina) fica de fora de propósito:
// é a única que pode quebrar em 2-3 linhas em vez de cortar o texto.
const NOWRAP_COLS = ['unidade', 'local', 'ambiente', 'sala', 'tag', 'crit', 'period', 'ultPrev', 'ativo', 'criadoEm'];

// Colunas com filtro de texto livre (substring, sem acento/case).
// Períodos comparam contra o rótulo já formatado (ex: "30 dias").
// "Última Preventiva" e "Ativo" ficam de fora de propósito — ver
// observação enviada ao Tiago.
const TEXT_FIL_COLS = ['nome', 'tag', 'period', 'criadoEm'];

// Normaliza para comparação: minúsculas + remove acentos.
function _norm(s) {
  return (s ?? '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

const COLS = [
  { key: 'unidade',  label: 'Unidade' },
  { key: 'local',    label: 'Local' },
  { key: 'ambiente', label: 'Ambiente' },
  { key: 'sala',     label: 'Sala' },
  { key: 'nome',     label: 'Ativo/Máquina' },
  { key: 'tag',      label: 'TAG' },
  { key: 'crit',     label: 'Criticidade' },
  { key: 'period',   label: 'Periodicidade' },
  { key: 'ultPrev',  label: 'Última Preventiva' },
  { key: 'ativo',    label: 'Ativo' },
  { key: 'criadoEm', label: 'Criado em' },
];

export function init() {
  render();
  _bindGlobalOnce();
}

// ============================================================
// RENDER PRINCIPAL
// ============================================================
export function render() {
  const root = document.getElementById('pg-at');
  const alertBox = document.getElementById('al-at');
  if (!root) return;

  // Trava de segurança: bloqueia mesmo se alguém navegar via hash direto
  if (!podeGerenciarAtivos()) {
    root.innerHTML = `
      <div class="alert er on">
        🔒 Acesso restrito. Apenas os perfis <strong>Administrador</strong> e
        <strong>PCM</strong> podem gerenciar Ativos.
      </div>`;
    if (alertBox) alertBox.innerHTML = '';
    return;
  }

  root.innerHTML = `
    <div class="tabs" style="display:flex;gap:8px;margin-bottom:16px;border-bottom:1px solid var(--bord)">
      <button type="button" class="at-tab ${_view === 'estrutura' ? 'on' : ''}" data-view="estrutura">🗂️ Estrutura</button>
      <button type="button" class="at-tab ${_view === 'familias' ? 'on' : ''}" data-view="familias">🔧 Famílias de Equipamento</button>
    </div>
    <div id="pg-at-body"></div>`;
  root.querySelectorAll('.at-tab').forEach(btn => {
    btn.addEventListener('click', () => { _view = btn.dataset.view; render(); });
  });

  if (_view === 'familias') { _renderFamilias(); return; }
  _renderAbaEstrutura();
}

function _renderAbaEstrutura() {
  const root = document.getElementById('pg-at-body');
  if (!root) return;

  const db = getDB();
  const linhas = _linhas(db);
  const linhasFiltradas = _aplicarFiltros(linhas);

  const ativas   = linhasFiltradas.filter(l => l.m.ativo !== false)
    .sort((a, b) => _cmp(a, b, _sortAtivos.col) * (_sortAtivos.dir === 'asc' ? 1 : -1));
  const inativas = linhasFiltradas.filter(l => l.m.ativo === false)
    .sort((a, b) => _cmp(a, b, _sortInativos.col) * (_sortInativos.dir === 'asc' ? 1 : -1));

  root.innerHTML = `
    ${_chartCardHtml(db)}
    <div class="card">
      <div class="card-t">Ativos (${ativas.length})</div>
      <div class="tw">
        <table>
          <thead><tr>${COLS.map(c => _thHtml(db, c, 'ativos')).join('')}<th style="min-width:90px">Ações</th></tr></thead>
          <tbody>${ativas.map(l => _rowHtml(l)).join('') || _emptyRow()}</tbody>
        </table>
      </div>
    </div>
    <div class="card">
      <div class="card-t">Inativos${inativas.length ? ` (${inativas.length})` : ''}</div>
      <div class="tw">
        <table>
          <thead><tr>${COLS.map(c => _thHtml(db, c, 'inativos')).join('')}<th style="min-width:90px">Ações</th></tr></thead>
          <tbody>${inativas.map(l => _rowHtml(l)).join('') || _emptyRow()}</tbody>
        </table>
      </div>
    </div>`;

  _bindDropdownNovo();
  _bindEstrutura();
  _bindImportar();
  _bindFiltroSelects();
  _bindColFiltrosTexto();
  _bindSortHeaders();
  _bindHierLinks();
  _bindRowActions(ativas.concat(inativas));
}

function _emptyRow() {
  return `<tr><td colspan="12" class="empty"><div class="ei">📭</div><p>Nenhuma máquina encontrada.</p></td></tr>`;
}

// ============================================================
// RESOLUÇÃO DE HIERARQUIA
// ============================================================
function _getU(db, id) { return db.unidades.find(x => x.id === id); }
function _getL(db, id) { return db.locais.find(x => x.id === id); }
function _getA(db, id) { return db.ambientes.find(x => x.id === id); }
function _getS(db, id) { return db.salas.find(x => x.id === id); }

function _chain(db, m) {
  const sala     = _getS(db, m.salaId);
  const ambiente = sala     ? _getA(db, sala.ambienteId)     : null;
  const local    = ambiente ? _getL(db, ambiente.localId)    : null;
  const unidade  = local    ? _getU(db, local.unidadeId)     : null;
  return { unidade, local, ambiente, sala };
}

// "Linha" = máquina já com toda a cadeia resolvida (evita recalcular várias vezes)
function _linhas(db) {
  return db.maquinas.map(m => ({ m, chain: _chain(db, m) }));
}

function _aplicarFiltros(linhas) {
  return linhas.filter(({ m, chain }) => {
    if (_filtros.salaId     && chain.sala?.id     !== _filtros.salaId)     return false;
    if (_filtros.ambienteId && chain.ambiente?.id !== _filtros.ambienteId) return false;
    if (_filtros.localId    && chain.local?.id    !== _filtros.localId)   return false;
    if (_filtros.unidadeId  && chain.unidade?.id  !== _filtros.unidadeId) return false;
    if (_filtros.nome     && !_norm(m.nome).includes(_norm(_filtros.nome)))    return false;
    if (_filtros.tag      && !_norm(m.tag).includes(_norm(_filtros.tag)))      return false;
    if (_filtros.crit     && String(m.criticidade) !== _filtros.crit)         return false;
    if (_filtros.period   && !_norm(_periodLabel(m.periodicidadeNumero, m.periodicidadeUnidade)).includes(_norm(_filtros.period))) return false;
    if (_filtros.criadoEm && !_norm(fd(m.criadoEm)).includes(_norm(_filtros.criadoEm))) return false;
    return true;
  });
}

function _cmp(a, b, col) {
  const A = a.chain, B = b.chain;
  switch (col) {
    case 'unidade':  return (A.unidade?.nome  || '').localeCompare(B.unidade?.nome  || '', 'pt-BR', { sensitivity: 'base' });
    case 'local':     return (A.local?.nome    || '').localeCompare(B.local?.nome    || '', 'pt-BR', { sensitivity: 'base' });
    case 'ambiente':  return (A.ambiente?.nome || '').localeCompare(B.ambiente?.nome || '', 'pt-BR', { sensitivity: 'base' });
    case 'sala':      return (A.sala?.nome     || '').localeCompare(B.sala?.nome     || '', 'pt-BR', { sensitivity: 'base' });
    case 'tag':       return (a.m.tag  || '').localeCompare(b.m.tag  || '', 'pt-BR', { sensitivity: 'base' });
    case 'crit':      return (a.m.criticidade || 0) - (b.m.criticidade || 0);
    case 'period':    return (a.m.periodicidadeNumero || 0) - (b.m.periodicidadeNumero || 0);
    case 'ativo':     return (a.m.ativo === false ? 0 : 1) - (b.m.ativo === false ? 0 : 1);
    case 'criadoEm':  return (a.m.criadoEm || '').localeCompare(b.m.criadoEm || '');
    case 'nome':
    default:          return (a.m.nome || '').localeCompare(b.m.nome || '', 'pt-BR', { sensitivity: 'base' });
  }
}

// ============================================================
// CABEÇALHOS (ordenação + filtro cascateado nas 4 colunas de hierarquia)
// ============================================================
const HIER_COLS = ['unidade', 'local', 'ambiente', 'sala'];

function _thHtml(db, c, group) {
  const sort = group === 'ativos' ? _sortAtivos : _sortInativos;
  const active = sort.col === c.key ? sort.dir : '';
  const label = `<span class="th-label sortable ${active}" data-col="${c.key}" data-group="${group}">${c.label}</span>`;
  const nw = NOWRAP_COLS.includes(c.key) ? ' th-fit' : '';

  // Hierarquia (Unidade/Local/Ambiente/Sala): select cascateado, já existia.
  if (HIER_COLS.includes(c.key)) {
    const opts = _filtroOpcoes(db, c.key);
    const selectHtml = `
      <select class="col-fil" data-level="${c.key}">
        <option value="">Todas</option>
        ${opts.map(o => `<option value="${o.id}" ${_filtros[`${c.key}Id`] === o.id ? 'selected' : ''}>${_esc(o.nome)}</option>`).join('')}
      </select>`;
    return `<th class="th-fil${nw}">${label}${selectHtml}</th>`;
  }

  // Criticidade: select de enum (1–4), não texto livre.
  if (c.key === 'crit') {
    const selectHtml = `
      <select class="col-fil" data-filter-key="crit">
        <option value="">Todas</option>
        ${[1, 2, 3, 4].map(n => `<option value="${n}" ${_filtros.crit === String(n) ? 'selected' : ''}>${CRIT_LABEL[n]}</option>`).join('')}
      </select>`;
    return `<th class="th-fil${nw}">${label}${selectHtml}</th>`;
  }

  // Colunas de texto livre (Ativo/Máquina, TAG, Periodicidade, Criado em).
  if (TEXT_FIL_COLS.includes(c.key)) {
    const inputHtml = `
      <input type="text" class="col-fil-txt" data-filter-key="${c.key}" value="${_esc(_filtros[c.key])}" placeholder="Filtrar...">`;
    return `<th class="th-fil${nw}">${label}${inputHtml}</th>`;
  }

  // "Ativo" não tem filtro próprio: o card já separa Ativos/Inativos,
  // então um filtro aqui seria redundante (sempre o mesmo valor por
  // card). "Última Preventiva" também fica fora, pois hoje sempre
  // retorna "—" (sem dado de execução de preventiva ainda).
  return `<th${nw ? ` class="${nw.trim()}"` : ''}>${label}</th>`;
}

function _filtroOpcoes(db, nivel) {
  if (nivel === 'unidade') return [...db.unidades].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  if (nivel === 'local') {
    const arr = _filtros.unidadeId ? db.locais.filter(l => l.unidadeId === _filtros.unidadeId) : db.locais;
    return [...arr].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }
  if (nivel === 'ambiente') {
    let arr = db.ambientes;
    if (_filtros.localId)        arr = arr.filter(a => a.localId === _filtros.localId);
    else if (_filtros.unidadeId) arr = arr.filter(a => _getL(db, a.localId)?.unidadeId === _filtros.unidadeId);
    return [...arr].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }
  if (nivel === 'sala') {
    let arr = db.salas;
    if (_filtros.ambienteId)     arr = arr.filter(s => s.ambienteId === _filtros.ambienteId);
    else if (_filtros.localId)   arr = arr.filter(s => _getA(db, s.ambienteId)?.localId === _filtros.localId);
    else if (_filtros.unidadeId) arr = arr.filter(s => _getL(db, _getA(db, s.ambienteId)?.localId)?.unidadeId === _filtros.unidadeId);
    return [...arr].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }
  return [];
}

function _bindFiltroSelects() {
  document.querySelectorAll('#pg-at .col-fil').forEach(sel => {
    sel.addEventListener('click', e => e.stopPropagation());
    sel.addEventListener('change', () => {
      // Select de coluna "solta" (hoje só Criticidade), identificado
      // por data-filter-key em vez de data-level.
      if (sel.dataset.filterKey) {
        _filtros[sel.dataset.filterKey] = sel.value;
        render();
        return;
      }
      const nivel = sel.dataset.level;
      _filtros[`${nivel}Id`] = sel.value;
      // Zera filtros de níveis abaixo, que deixam de ser coerentes
      if (nivel === 'unidade') { _filtros.localId = ''; _filtros.ambienteId = ''; _filtros.salaId = ''; }
      if (nivel === 'local')    { _filtros.ambienteId = ''; _filtros.salaId = ''; }
      if (nivel === 'ambiente') { _filtros.salaId = ''; }
      render();
    });
  });
}

// Filtros de texto livre (Ativo/Máquina, TAG, Periodicidade, Criado em).
// render() reconstrói toda a tabela a cada chamada — sem isso, o
// campo perderia o foco e o cursor a cada tecla digitada.
function _bindColFiltrosTexto() {
  document.querySelectorAll('#pg-at .col-fil-txt').forEach(inp => {
    inp.addEventListener('click', e => e.stopPropagation());
    inp.addEventListener('input', () => {
      const key = inp.dataset.filterKey;
      const caret = inp.selectionStart;
      _filtros[key] = inp.value;
      render();
      const again = document.querySelector(`#pg-at [data-filter-key="${key}"]`);
      if (again) { again.focus(); again.setSelectionRange(caret, caret); }
    });
  });
}

function _bindSortHeaders() {
  document.querySelectorAll('#pg-at .th-label.sortable').forEach(el => {
    el.addEventListener('click', () => {
      const sort = el.dataset.group === 'ativos' ? _sortAtivos : _sortInativos;
      sort.dir = (sort.col === el.dataset.col && sort.dir === 'asc') ? 'desc' : 'asc';
      sort.col = el.dataset.col;
      render();
    });
  });
}

// ============================================================
// LINHA DA TABELA
// ============================================================
function _rowHtml({ m, chain }) {
  const { unidade, local, ambiente, sala } = chain;
  const hier = (tipo, node) => node
    ? `<span class="hier-link" data-tipo="${tipo}" data-id="${node.id}">${_esc(node.nome)}</span>`
    : '<span style="color:var(--txt3)">—</span>';

  return `
    <tr>
      <td class="td-cap td-fit">${hier('unidade', unidade)}</td>
      <td class="td-cap td-fit">${hier('local', local)}</td>
      <td class="td-cap td-fit">${hier('ambiente', ambiente)}</td>
      <td class="td-cap td-fit">${hier('sala', sala)}</td>
      <td class="td-cap"><span class="hier-link" data-tipo="maquina" data-id="${m.id}">${_esc(m.nome)}</span></td>
      <td class="td-cap td-fit"><code>${_esc(m.tag || '—')}</code></td>
      <td class="td-fit">${_critBadge(m.criticidade)}</td>
      <td class="td-cap td-fit">${_periodLabel(m.periodicidadeNumero, m.periodicidadeUnidade)}</td>
      <td class="td-cap td-fit" style="color:var(--txt3)">${_ultimaPreventiva(m.id)}</td>
      <td class="td-fit"><span class="badge ${m.ativo !== false ? 'bg-green' : 'bg-gray'}">${m.ativo !== false ? 'Sim' : 'Não'}</span></td>
      <td class="td-cap td-fit">${fd(m.criadoEm)}</td>
      <td>
        <button class="btn btn-sm btn-gh" data-acao="editar-maquina" data-id="${m.id}" title="Editar">✏️</button>
        <button class="btn btn-sm btn-gh" data-acao="toggle-maquina" data-id="${m.id}" title="${m.ativo !== false ? 'Inativar' : 'Reativar'}">${m.ativo !== false ? '🚫' : '✅'}</button>
      </td>
    </tr>`;
}

function _critBadge(c) {
  return `<span class="badge crit-${c}"><span class="pdot crit-dot-${c}"></span>${CRIT_LABEL[c] || c}</span>`;
}

function _periodLabel(num, unidade) {
  const par = UNID_LABEL[unidade] || ['', ''];
  return `${num} ${num === 1 ? par[0] : par[1]}`;
}

// Preventiva/Inspeção hoje é só impressão (sem registro de execução no sistema).
// Se um histórico de execução for implementado no futuro, desenhar a
// estrutura do zero — não reaproveitar preventiva_execucoes (removida).
function _ultimaPreventiva(_maquinaId) {
  return '—';
}

function _bindHierLinks() {
  document.querySelectorAll('#pg-at .hier-link').forEach(el => {
    el.addEventListener('click', () => _openForm(el.dataset.tipo, el.dataset.id));
  });
}

function _bindRowActions(linhas) {
  linhas.forEach(({ m }) => {
    document.querySelector(`[data-acao="editar-maquina"][data-id="${m.id}"]`)
      ?.addEventListener('click', () => _openForm('maquina', m.id));
    document.querySelector(`[data-acao="toggle-maquina"][data-id="${m.id}"]`)
      ?.addEventListener('click', () => _toggleAtivoNode('maquina', m.id));
  });
}

// ============================================================
// GRÁFICO DE CRITICIDADE (SVG puro) + BOTÃO "+ ADICIONAR"
// ============================================================
function _chartCardHtml(db) {
  const ativas = db.maquinas.filter(m => m.ativo !== false);
  const counts = [1, 2, 3, 4].map(c => ativas.filter(m => m.criticidade === c).length);
  const total = counts.reduce((a, b) => a + b, 0);

  return `
    <div class="chart-row">
      <div class="card" style="margin-bottom:0">
        <div class="card-t">Criticidade das Máquinas</div>
        <div class="chart-grid">
          <div>
            <div class="sc-lbl">Visão Geral</div>
            <div class="donut-wrap">
              ${_svgDonut(counts, total)}
              <div class="donut-legend">
                ${counts.map((c, i) => `
                  <div class="legend-item">
                    <span class="legend-dot" style="background:${CHART_COLORS[i]}"></span>
                    <span>${i + 1} ${total ? Math.round((c / total) * 100) : 0}%</span>
                  </div>`).join('')}
              </div>
            </div>
          </div>
          <div>
            <div class="sc-lbl">Quantidade da Distribuição</div>
            ${_svgBars(counts, total)}
          </div>
        </div>
      </div>
      <div class="chart-row-actions">
        <button class="btn btn-gh btn-sm" id="btn-estrutura" type="button">🗂️ Estrutura</button>
        <button class="btn btn-gh btn-sm" id="btn-importar" type="button">📥 Importar Estrutura</button>
        <div class="dd" id="dd-novo">
          <button class="btn btn-p btn-sm" id="btn-dd-novo" type="button">+ Adicionar ▾</button>
          <div class="dd-menu">
            <button class="dd-item" data-novo="unidade" type="button">🏢 Unidade</button>
            <button class="dd-item" data-novo="local" type="button">📍 Local</button>
            <button class="dd-item" data-novo="ambiente" type="button">🏭 Ambiente</button>
            <button class="dd-item" data-novo="sala" type="button">🚪 Sala</button>
            <button class="dd-item" data-novo="maquina" type="button">⚙️ Máquina / Ativo</button>
          </div>
        </div>
      </div>
    </div>`;
}

function _svgDonut(counts, total) {
  const r = 46, cx = 60, cy = 60, sw = 20;
  const circ = 2 * Math.PI * r;
  let acc = 0, segs = '';
  counts.forEach((c, i) => {
    if (!total || !c) return;
    const len = (c / total) * circ;
    const rot = (acc / circ) * 360 - 90;
    segs += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${CHART_COLORS[i]}" stroke-width="${sw}" stroke-dasharray="${len} ${circ - len}" transform="rotate(${rot} ${cx} ${cy})"/>`;
    acc += len;
  });
  return `
    <svg viewBox="0 0 120 120" width="120" height="120">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--bord)" stroke-width="${sw}"/>
      ${segs}
      <text x="${cx}" y="${cy + 7}" text-anchor="middle" font-family="var(--fw)" font-size="24" font-weight="800" fill="var(--txt)">${total}</text>
    </svg>`;
}

function _svgBars(counts, total) {
  const labels = ['1', '2', '3', '4', 'Total'];
  const colors = [...CHART_COLORS, CHART_GRAY];
  const values = [...counts, total];
  const max = Math.max(...values, 1);
  const W = 280, H = 130, barW = 30, gap = 22, baseY = H - 22, top = 18;
  let x = 6, bars = '';
  values.forEach((v, i) => {
    const h = Math.max((v / max) * (baseY - top), v ? 4 : 0);
    const y = baseY - h;
    bars += `
      <text x="${x + barW / 2}" y="${y - 8}" text-anchor="middle" font-family="var(--fw)" font-size="13" font-weight="800" fill="var(--txt)">${v}</text>
      <rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="4" fill="${colors[i]}"/>
      <text x="${x + barW / 2}" y="${baseY + 16}" text-anchor="middle" font-family="var(--fw)" font-size="11" font-weight="700" fill="var(--txt3)">${labels[i]}</text>`;
    x += barW + gap;
  });
  return `<svg viewBox="0 0 ${x} ${H}" width="100%" height="${H}" style="max-width:300px">${bars}</svg>`;
}

function _bindDropdownNovo() {
  const dd  = document.getElementById('dd-novo');
  const btn = document.getElementById('btn-dd-novo');
  if (!dd || !btn) return;
  btn.addEventListener('click', e => { e.stopPropagation(); dd.classList.toggle('open'); });
  dd.querySelectorAll('.dd-item').forEach(it => {
    it.addEventListener('click', () => { dd.classList.remove('open'); _openForm(it.dataset.novo, null); });
  });
}

// ============================================================
// MODAL "ESTRUTURA" — árvore Unidade → Local → Ambiente → Sala
// já cadastrada, com contagem por nó e "+" pra criar filho direto
// (resolve a limitação de nível recém-criado ficar invisível até
// existir 1 máquina embaixo dele).
// ============================================================
function _bindEstrutura() {
  document.getElementById('btn-estrutura')?.addEventListener('click', () => {
    _renderEstrutura();
    openM('m-estrutura');
  });
}

function _renderEstrutura() {
  const db = getDB();
  const body = document.getElementById('estrutura-b');
  if (!body) return;

  const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR');
  const locaisDe    = uId => db.locais.filter(l => l.unidadeId === uId && l.ativo !== false).sort(porNome);
  const ambientesDe = lId => db.ambientes.filter(a => a.localId === lId && a.ativo !== false).sort(porNome);
  const salasDe      = aId => db.salas.filter(s => s.ambienteId === aId && s.ativo !== false).sort(porNome);
  const maqCount     = sId => db.maquinas.filter(m => m.salaId === sId && m.ativo !== false).length;
  const unidades = [...db.unidades].filter(u => u.ativo !== false).sort(porNome);

  const addBtn = (tipo, parentId, txt) =>
    `<button class="btn btn-sm btn-gh estr-add" data-add="${tipo}" data-parent="${parentId ?? ''}" type="button">+ ${txt}</button>`;

  const linhaSala = s => `
    <div class="estr-leaf estr-leaf-click" data-sala="${s.id}">🚪 ${_esc(s.nome)} <span class="estr-count">${maqCount(s.id)} máquina(s)</span></div>`;

  const nodeAmbiente = a => `
    <details class="estr-node" open>
      <summary><span class="estr-row">
        <span>🏭 ${_esc(a.nome)} <span class="estr-count">${salasDe(a.id).length} sala(s)</span></span>
        ${addBtn('sala', a.id, 'Sala')}
      </span></summary>
      <div class="estr-children">
        ${salasDe(a.id).map(linhaSala).join('') || '<div class="estr-empty">Nenhuma sala cadastrada.</div>'}
      </div>
    </details>`;

  const nodeLocal = l => `
    <details class="estr-node" open>
      <summary><span class="estr-row">
        <span>📍 ${_esc(l.nome)} <span class="estr-count">${ambientesDe(l.id).length} ambiente(s)</span></span>
        ${addBtn('ambiente', l.id, 'Ambiente')}
      </span></summary>
      <div class="estr-children">
        ${ambientesDe(l.id).map(nodeAmbiente).join('') || '<div class="estr-empty">Nenhum ambiente cadastrado.</div>'}
      </div>
    </details>`;

  const nodeUnidade = u => `
    <details class="estr-node" open>
      <summary><span class="estr-row">
        <span>🏢 ${_esc(u.nome)} <span class="estr-count">${locaisDe(u.id).length} local(is)</span></span>
        ${addBtn('local', u.id, 'Local')}
      </span></summary>
      <div class="estr-children">
        ${locaisDe(u.id).map(nodeLocal).join('') || '<div class="estr-empty">Nenhum local cadastrado.</div>'}
      </div>
    </details>`;

  body.innerHTML = `
    <div class="fa" style="border-top:none;padding-top:0;margin-top:0;margin-bottom:10px">
      ${addBtn('unidade', '', 'Unidade')}
    </div>
    ${unidades.map(nodeUnidade).join('') || '<div class="estr-empty">Nenhuma Unidade cadastrada ainda.</div>'}`;

  // Botões "+" ficam dentro do <summary> — sem isso, o clique também
  // alterna o open/close do <details> (comportamento nativo do navegador).
  body.querySelectorAll('[data-add]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      closeM('m-estrutura');
      _openForm(btn.dataset.add, null, btn.dataset.parent || null);
    });
  });

  // Clique na Sala abre o form de edição (aprovadores, etc.) — antes só
  // existia esse caminho clicando numa Máquina já cadastrada na sala
  // (hier-link), o que deixava as salas com 0 máquinas inacessíveis.
  body.querySelectorAll('[data-sala]').forEach(leaf => {
    leaf.addEventListener('click', () => {
      closeM('m-estrutura');
      _openForm('sala', leaf.dataset.sala);
    });
  });
}

// ============================================================
// IMPORTAÇÃO EM MASSA — cola lista de texto, 1 linha por Sala:
//   Unidade;Local;Ambiente;Sala
// Localiza por nome (case/acento-insensitive) o que já existe em
// cada nível e só cria o que faltar — idempotente, pode colar a
// mesma lista de novo sem duplicar. Não mexe em Máquinas (Bloco
// fora de escopo aqui — isso é só estrutura).
// ============================================================
function _bindImportar() {
  document.getElementById('btn-importar')?.addEventListener('click', () => {
    const ta = document.getElementById('imp-texto');
    const res = document.getElementById('imp-resultado');
    if (ta) ta.value = '';
    if (res) res.innerHTML = '';
    openM('m-importar');
  });
  document.getElementById('btn-imp-processar')?.addEventListener('click', _processarImportar);
}

function _findOrCreate(db, arr, prefix, parentKey, parentId, nome) {
  const nomeN = _normNome(nome);
  if (!nomeN) return null;
  let item = arr.find(x => (parentKey === null || x[parentKey] === parentId) && _normNome(x.nome) === nomeN);
  if (item) return { item, criado: false };
  item = parentKey === null
    ? { id: _genId(prefix, nome), nome: nomeN, ativo: true, criadoEm: new Date().toISOString() }
    : { id: _genId(prefix, nome), [parentKey]: parentId, nome: nomeN, ativo: true, criadoEm: new Date().toISOString() };
  arr.push(item);
  return { item, criado: true };
}

function _processarImportar() {
  const db = getDB();
  const texto = document.getElementById('imp-texto')?.value || '';
  const res = document.getElementById('imp-resultado');
  const linhas = texto.split('\n').map(l => l.trim()).filter(Boolean);

  if (!linhas.length) {
    if (res) res.innerHTML = '<div class="alert er show" style="display:block">Cole ao menos 1 linha no formato Unidade;Local;Ambiente;Sala.</div>';
    return;
  }

  let criadosUni = 0, criadosLoc = 0, criadosAmb = 0, criadosSala = 0, jaExistiam = 0;
  const erros = [];

  linhas.forEach((linha, i) => {
    const partes = linha.split(';').map(p => p.trim());
    if (partes.length !== 4 || partes.some(p => !p)) {
      erros.push(`Linha ${i + 1}: esperado 4 campos (Unidade;Local;Ambiente;Sala), recebido "${linha}".`);
      return;
    }
    const [nomeUni, nomeLoc, nomeAmb, nomeSala] = partes;

    const ru = _findOrCreate(db, db.unidades, 'UNI', null, null, nomeUni);
    if (ru.criado) criadosUni++;
    const uId = ru.item.id;

    const rl = _findOrCreate(db, db.locais, 'LOC', 'unidadeId', uId, nomeLoc);
    if (rl.criado) criadosLoc++;
    const lId = rl.item.id;

    const ra = _findOrCreate(db, db.ambientes, 'AMB', 'localId', lId, nomeAmb);
    if (ra.criado) criadosAmb++;
    const aId = ra.item.id;

    const rs = _findOrCreate(db, db.salas, 'SAL', 'ambienteId', aId, nomeSala);
    if (rs.criado) criadosSala++; else jaExistiam++;
  });

  saveDB();

  const totalCriados = criadosUni + criadosLoc + criadosAmb + criadosSala;
  if (res) {
    res.innerHTML = `
      <div class="alert ${erros.length ? 'er' : 'ok'} show" style="display:block">
        ✅ ${totalCriados} item(ns) novo(s) criado(s)
        (${criadosUni} Unidade, ${criadosLoc} Local, ${criadosAmb} Ambiente, ${criadosSala} Sala).
        ${jaExistiam} sala(s) já existiam e foram ignoradas.
        ${erros.length ? `<br><br>⚠️ ${erros.length} linha(s) com erro:<br>${erros.join('<br>')}` : ''}
      </div>`;
  }
  showToast(`Importação concluída: ${totalCriados} item(ns) novo(s).`, erros.length ? 'er' : 'ok');
  if (!erros.length) render(); // só re-renderiza a tabela de fato se não há nada pendente de correção
}

function _bindGlobalOnce() {
  if (_globalBound) return;
  _globalBound = true;
  document.addEventListener('click', () => {
    document.getElementById('dd-novo')?.classList.remove('open');
  });
}

// ============================================================
// VALIDAÇÕES DE NOME ÚNICO POR PAI / TAG ÚNICA GLOBAL
// ============================================================
function _normNome(s) { return String(s || '').trim().toUpperCase(); }

function _nomeDuplicado(db, tipo, parentId, nome, excludeId) {
  const nomeN = _normNome(nome);
  const checks = {
    unidade:  () => db.unidades.some(x => x.id !== excludeId && _normNome(x.nome) === nomeN),
    local:    () => db.locais.some(x => x.id !== excludeId && x.unidadeId === parentId && _normNome(x.nome) === nomeN),
    ambiente: () => db.ambientes.some(x => x.id !== excludeId && x.localId === parentId && _normNome(x.nome) === nomeN),
    sala:     () => db.salas.some(x => x.id !== excludeId && x.ambienteId === parentId && _normNome(x.nome) === nomeN),
  };
  return checks[tipo] ? checks[tipo]() : false;
}

function _tagDuplicada(db, tag, excludeId) {
  const tagN = _normNome(tag);
  return db.maquinas.some(x => x.id !== excludeId && _normNome(x.tag) === tagN);
}

function _genId(prefix, nome) {
  const slug = String(nome).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
  return `${prefix}_${slug || 'X'}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

// ============================================================
// INATIVAÇÃO / REATIVAÇÃO EM CASCATA
// ============================================================
function _temFilhosAtivos(db, tipo, id) {
  if (tipo === 'unidade')  return db.locais.some(l => l.unidadeId === id && l.ativo !== false);
  if (tipo === 'local')    return db.ambientes.some(a => a.localId === id && a.ativo !== false);
  if (tipo === 'ambiente') return db.salas.some(s => s.ambienteId === id && s.ativo !== false);
  if (tipo === 'sala')     return db.maquinas.some(m => m.salaId === id && m.ativo !== false);
  return false;
}

function _inativarCascata(db, tipo, id) {
  if (tipo === 'unidade') {
    const u = _getU(db, id); if (u) u.ativo = false;
    db.locais.filter(l => l.unidadeId === id).forEach(l => _inativarCascata(db, 'local', l.id));
  } else if (tipo === 'local') {
    const l = _getL(db, id); if (l) l.ativo = false;
    db.ambientes.filter(a => a.localId === id).forEach(a => _inativarCascata(db, 'ambiente', a.id));
  } else if (tipo === 'ambiente') {
    const a = _getA(db, id); if (a) a.ativo = false;
    db.salas.filter(s => s.ambienteId === id).forEach(s => _inativarCascata(db, 'sala', s.id));
  } else if (tipo === 'sala') {
    const s = _getS(db, id); if (s) s.ativo = false;
    db.maquinas.filter(m => m.salaId === id).forEach(m => { m.ativo = false; });
  } else if (tipo === 'maquina') {
    const m = db.maquinas.find(x => x.id === id); if (m) m.ativo = false;
  }
}

function _nodeArr(db, tipo) {
  return { unidade: db.unidades, local: db.locais, ambiente: db.ambientes, sala: db.salas, maquina: db.maquinas }[tipo];
}

const _NOME_TIPO = { unidade: 'Unidade', local: 'Local', ambiente: 'Ambiente', sala: 'Sala', maquina: 'Máquina' };

async function _toggleAtivoNode(tipo, id) {
  const db = getDB();
  const node = _nodeArr(db, tipo)?.find(x => x.id === id);
  if (!node) return;

  if (node.ativo === false) {
    if (!confirm(`Reativar ${_NOME_TIPO[tipo]} "${node.nome}"?\n\nOs itens abaixo na hierarquia continuam inativos até reativação manual individual de cada um.`)) return;
    node.ativo = true;
    saveDB();
    showToast(`"${node.nome}" reativado(a).`, 'ok');
    closeM('m-edit');
    render();
    return;
  }

  const msg = _temFilhosAtivos(db, tipo, id)
    ? `Ao inativar "${node.nome}", todos os itens dentro da hierarquia serão inativados também. Continuar?`
    : `Inativar ${_NOME_TIPO[tipo]} "${node.nome}"?`;
  if (!confirm(msg)) return;

  _inativarCascata(db, tipo, id);
  saveDB();
  showToast(`"${node.nome}" inativado(a).`, 'ok');
  closeM('m-edit');
  render();
}

// ============================================================
// FORMULÁRIOS (reaproveita o modal genérico #m-edit)
// ============================================================
function _esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function _escAttr(str) { return _esc(str).replace(/`/g, '&#96;'); }

function _setModalWidth(px) {
  const modal = document.querySelector('#m-edit .modal');
  if (modal) modal.style.maxWidth = px ? `${px}px` : '';
}

function _openForm(tipo, id, preParentId = null) {
  _editCtx = { tipo, id };
  const fns = {
    unidade:  _formUnidade,
    local:    _formLocal,
    ambiente: _formAmbiente,
    sala:     _formSala,
    maquina:  _formMaquina,
  };
  (fns[tipo] || (() => {}))(id, preParentId);
}

function _statusToggleHtml(tipo, node) {
  if (!node) return '';
  return `
    <div class="fa" style="justify-content:flex-start;border-top:none;padding-top:0;margin-top:0">
      <button class="btn btn-sm ${node.ativo !== false ? 'btn-d' : 'btn-g'}" type="button" id="btn-toggle-node">
        ${node.ativo !== false ? '🚫 Inativar' : '✅ Reativar'}
      </button>
    </div>`;
}

// ── Unidade ──────────────────────────────────────────────────
function _formUnidade(id) {
  const db = getDB();
  const u = id ? _getU(db, id) : null;
  _setModalWidth(400);
  document.getElementById('me-t').textContent = u ? `Editar Unidade — ${u.nome}` : 'Nova Unidade';
  document.getElementById('me-b').innerHTML = `
    <div class="fg"><label>Nome da Unidade</label>
      <input type="text" id="f-nome" value="${u ? _escAttr(u.nome) : ''}" placeholder="Ex: Muffato Foods">
    </div>
    ${_statusToggleHtml('unidade', u)}`;

  document.getElementById('btn-toggle-node')?.addEventListener('click', () => _toggleAtivoNode('unidade', id));
  document.getElementById('btn-edit-save').onclick = () => {
    const nome = document.getElementById('f-nome').value.trim();
    if (!nome) { showToast('Informe o nome da Unidade.', 'er'); return; }
    if (_nomeDuplicado(db, 'unidade', null, nome, id)) { showToast('Já existe uma Unidade com esse nome.', 'er'); return; }

    if (u) { u.nome = _normNome(nome); }
    else {
      db.unidades.push({ id: _genId('UNI', nome), nome: _normNome(nome), ativo: true, criadoEm: new Date().toISOString() });
    }
    saveDB(); closeM('m-edit'); showToast(u ? 'Unidade atualizada.' : 'Unidade criada.', 'ok'); render();
  };
  openM('m-edit');
}

// ── Local ────────────────────────────────────────────────────
function _formLocal(id, preParentId) {
  const db = getDB();
  const l = id ? _getL(db, id) : null;
  _setModalWidth(420);
  document.getElementById('me-t').textContent = l ? `Editar Local — ${l.nome}` : 'Novo Local';

  const unidadeIdSel = l ? l.unidadeId : (preParentId || '');
  const unidadesOpt = db.unidades
    .filter(u => u.ativo !== false || u.id === l?.unidadeId)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    .map(u => `<option value="${u.id}" ${unidadeIdSel === u.id ? 'selected' : ''}>${_esc(u.nome)}</option>`).join('');

  document.getElementById('me-b').innerHTML = `
    ${!db.unidades.length ? `<div class="alert er on">Cadastre uma Unidade antes.</div>` : ''}
    <div class="fg"><label>Unidade</label><select id="f-pai">${unidadesOpt}</select></div>
    <div class="fg"><label>Nome do Local</label>
      <input type="text" id="f-nome" value="${l ? _escAttr(l.nome) : ''}" placeholder="Ex: Pato Branco - PR">
    </div>
    ${_statusToggleHtml('local', l)}`;

  document.getElementById('btn-toggle-node')?.addEventListener('click', () => _toggleAtivoNode('local', id));
  document.getElementById('btn-edit-save').onclick = () => {
    const unidadeId = document.getElementById('f-pai')?.value;
    const nome = document.getElementById('f-nome').value.trim();
    if (!unidadeId) { showToast('Cadastre/selecione uma Unidade.', 'er'); return; }
    if (!nome) { showToast('Informe o nome do Local.', 'er'); return; }
    if (_nomeDuplicado(db, 'local', unidadeId, nome, id)) { showToast('Já existe um Local com esse nome nessa Unidade.', 'er'); return; }

    if (l) { l.nome = _normNome(nome); l.unidadeId = unidadeId; }
    else {
      db.locais.push({ id: _genId('LOC', nome), unidadeId, nome: _normNome(nome), ativo: true, criadoEm: new Date().toISOString() });
    }
    saveDB(); closeM('m-edit'); showToast(l ? 'Local atualizado.' : 'Local criado.', 'ok'); render();
  };
  openM('m-edit');
}

// ── Ambiente ─────────────────────────────────────────────────
function _formAmbiente(id, preParentId) {
  const db = getDB();
  const a = id ? _getA(db, id) : null;
  const curLocal = a ? _getL(db, a.localId) : (preParentId ? _getL(db, preParentId) : null);
  _setModalWidth(420);
  document.getElementById('me-t').textContent = a ? `Editar Ambiente — ${a.nome}` : 'Novo Ambiente';

  const unidadesOpt = (u0) => db.unidades
    .filter(u => u.ativo !== false || u.id === u0)
    .sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR'))
    .map(u => `<option value="${u.id}" ${u0 === u.id ? 'selected' : ''}>${_esc(u.nome)}</option>`).join('');
  const locaisOpt = (unidadeId, l0) => db.locais
    .filter(l => l.unidadeId === unidadeId && (l.ativo !== false || l.id === l0))
    .sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR'))
    .map(l => `<option value="${l.id}" ${l0 === l.id ? 'selected' : ''}>${_esc(l.nome)}</option>`).join('');

  const unidadeIdAtual = curLocal?.unidadeId || db.unidades[0]?.id || '';
  const localIdAtual = a ? a.localId : (preParentId || curLocal?.id || '');

  document.getElementById('me-b').innerHTML = `
    ${!db.unidades.length ? `<div class="alert er on">Cadastre uma Unidade antes.</div>` : ''}
    <div class="fg"><label>Unidade</label><select id="f-unidade">${unidadesOpt(unidadeIdAtual)}</select></div>
    <div class="fg"><label>Local</label><select id="f-pai">${locaisOpt(unidadeIdAtual, localIdAtual)}</select></div>
    <div class="fg"><label>Nome do Ambiente</label>
      <input type="text" id="f-nome" value="${a ? _escAttr(a.nome) : ''}" placeholder="Ex: Produção">
    </div>
    ${_statusToggleHtml('ambiente', a)}`;

  document.getElementById('f-unidade')?.addEventListener('change', e => {
    document.getElementById('f-pai').innerHTML = locaisOpt(e.target.value, null);
  });

  document.getElementById('btn-toggle-node')?.addEventListener('click', () => _toggleAtivoNode('ambiente', id));
  document.getElementById('btn-edit-save').onclick = () => {
    const localId = document.getElementById('f-pai')?.value;
    const nome = document.getElementById('f-nome').value.trim();
    if (!localId) { showToast('Cadastre/selecione um Local.', 'er'); return; }
    if (!nome) { showToast('Informe o nome do Ambiente.', 'er'); return; }
    if (_nomeDuplicado(db, 'ambiente', localId, nome, id)) { showToast('Já existe um Ambiente com esse nome nesse Local.', 'er'); return; }

    if (a) { a.nome = _normNome(nome); a.localId = localId; }
    else {
      db.ambientes.push({ id: _genId('AMB', nome), localId, nome: _normNome(nome), ativo: true, criadoEm: new Date().toISOString() });
    }
    saveDB(); closeM('m-edit'); showToast(a ? 'Ambiente atualizado.' : 'Ambiente criado.', 'ok'); render();
  };
  openM('m-edit');
}

// ── Sala (+ aprovadores) ─────────────────────────────────────
function _formSala(id, preParentId) {
  const db = getDB();
  const s = id ? _getS(db, id) : null;
  const curAmb   = s ? _getA(db, s.ambienteId) : (preParentId ? _getA(db, preParentId) : null);
  const curLocal = curAmb ? _getL(db, curAmb.localId) : null;
  _setModalWidth(460);
  document.getElementById('me-t').textContent = s ? `Editar Sala — ${s.nome}` : 'Nova Sala';

  const unidadesOpt = (u0) => db.unidades
    .filter(u => u.ativo !== false || u.id === u0)
    .sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR'))
    .map(u => `<option value="${u.id}" ${u0 === u.id ? 'selected' : ''}>${_esc(u.nome)}</option>`).join('');
  const locaisOpt = (unidadeId, l0) => db.locais
    .filter(l => l.unidadeId === unidadeId && (l.ativo !== false || l.id === l0))
    .sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR'))
    .map(l => `<option value="${l.id}" ${l0 === l.id ? 'selected' : ''}>${_esc(l.nome)}</option>`).join('');
  const ambientesOpt = (localId, a0) => db.ambientes
    .filter(a => a.localId === localId && (a.ativo !== false || a.id === a0))
    .sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR'))
    .map(a => `<option value="${a.id}" ${a0 === a.id ? 'selected' : ''}>${_esc(a.nome)}</option>`).join('');

  const unidadeIdAtual = curLocal?.unidadeId || db.unidades[0]?.id || '';
  const localIdAtual   = curAmb?.localId     || '';
  const ambienteIdSel  = s ? s.ambienteId : (preParentId || '');

  document.getElementById('me-b').innerHTML = `
    ${!db.unidades.length ? `<div class="alert er on">Cadastre uma Unidade antes.</div>` : ''}
    <div class="fg"><label>Unidade</label><select id="f-unidade">${unidadesOpt(unidadeIdAtual)}</select></div>
    <div class="fg"><label>Local</label><select id="f-local">${locaisOpt(unidadeIdAtual, localIdAtual)}</select></div>
    <div class="fg"><label>Ambiente</label><select id="f-pai">${ambientesOpt(localIdAtual, ambienteIdSel)}</select></div>
    <div class="fg"><label>Nome da Sala</label>
      <input type="text" id="f-nome" value="${s ? _escAttr(s.nome) : ''}" placeholder="Ex: Carne Moída">
    </div>
    <div style="font-size:12px;color:var(--txt3);padding:4px 2px">
      Quem aprova OS desta Sala é definido pelo nível/escopo do usuário,
      em 🧑‍💼 Usuários — não mais aqui.
    </div>
    ${_statusToggleHtml('sala', s)}`;

  document.getElementById('f-unidade')?.addEventListener('change', e => {
    document.getElementById('f-local').innerHTML = locaisOpt(e.target.value, null);
    document.getElementById('f-pai').innerHTML = ambientesOpt(null, null);
  });
  document.getElementById('f-local')?.addEventListener('change', e => {
    document.getElementById('f-pai').innerHTML = ambientesOpt(e.target.value, null);
  });

  document.getElementById('btn-toggle-node')?.addEventListener('click', () => _toggleAtivoNode('sala', id));
  document.getElementById('btn-edit-save').onclick = () => {
    const ambienteId = document.getElementById('f-pai')?.value;
    const nome = document.getElementById('f-nome').value.trim();
    if (!ambienteId) { showToast('Cadastre/selecione um Ambiente.', 'er'); return; }
    if (!nome) { showToast('Informe o nome da Sala.', 'er'); return; }
    if (_nomeDuplicado(db, 'sala', ambienteId, nome, id)) { showToast('Já existe uma Sala com esse nome nesse Ambiente.', 'er'); return; }

    let salaId = id;
    if (s) { s.nome = _normNome(nome); s.ambienteId = ambienteId; }
    else {
      salaId = _genId('SAL', nome);
      db.salas.push({ id: salaId, ambienteId, nome: _normNome(nome), ativo: true, criadoEm: new Date().toISOString() });
    }

    saveDB(); closeM('m-edit'); showToast(s ? 'Sala atualizada.' : 'Sala criada.', 'ok'); render();
  };
  openM('m-edit');
}

// ── Máquina (cascata completa, com criação inline de nível faltante) ──
function _formMaquina(id) {
  const db = getDB();
  const m = id ? db.maquinas.find(x => x.id === id) : null;
  const chain = m ? _chain(db, m) : {};
  _setModalWidth(520);
  document.getElementById('me-t').textContent = m ? `Editar Máquina — ${m.nome}` : 'Nova Máquina / Ativo';

  const unidadeId0  = chain.unidade?.id  || '';
  const localId0    = chain.local?.id    || '';
  const ambienteId0 = chain.ambiente?.id || '';
  const salaId0     = chain.sala?.id     || '';

  document.getElementById('me-b').innerHTML = `
    <div class="fg"><label>Unidade</label>
      <select id="f-unidade">${_optsComNovo(db.unidades, unidadeId0, 'Unidade')}</select>
      <input type="text" id="f-unidade-novo" placeholder="Nome da nova Unidade" style="display:none;margin-top:6px">
    </div>
    <div class="fg"><label>Local</label>
      <select id="f-local"></select>
      <input type="text" id="f-local-novo" placeholder="Nome do novo Local" style="display:none;margin-top:6px">
    </div>
    <div class="fg"><label>Ambiente</label>
      <select id="f-ambiente"></select>
      <input type="text" id="f-ambiente-novo" placeholder="Nome do novo Ambiente" style="display:none;margin-top:6px">
    </div>
    <div class="fg"><label>Sala</label>
      <select id="f-sala"></select>
      <input type="text" id="f-sala-novo" placeholder="Nome da nova Sala" style="display:none;margin-top:6px">
    </div>
    <div class="fg"><label>Nome da Máquina</label>
      <input type="text" id="f-nome" value="${m ? _escAttr(m.nome) : ''}" placeholder="Ex: Cubadora Universal MHS 2000">
    </div>
    <div class="fg"><label>TAG (única no sistema)</label>
      <input type="text" id="f-tag" value="${m ? _escAttr(m.tag || '') : ''}" placeholder="Ex: 095-CUB001">
    </div>
    <div class="fg"><label>Família de Equipamento <span style="color:var(--txt3);font-weight:400">(checklist de preventiva)</span></label>
      <select id="f-familia">
        <option value="">Sem família / checklist</option>
        ${(db.familias || []).filter(f => f.ativo !== false).sort((a, b) => `${a.fabricante} ${a.tipo}`.localeCompare(`${b.fabricante} ${b.tipo}`, 'pt-BR'))
          .map(f => `<option value="${f.id}" ${m?.familiaId === f.id ? 'selected' : ''}>${_esc(f.fabricante)} — ${_esc(f.tipo)}</option>`).join('')}
      </select>
    </div>
    <div class="fg-row">
      <div class="fg"><label>Criticidade</label>
        <select id="f-crit">${[1, 2, 3, 4].map(c => `<option value="${c}" ${(m?.criticidade ?? 3) === c ? 'selected' : ''}>${CRIT_LABEL[c]}</option>`).join('')}</select>
      </div>
      <div class="fg"><label>Periodicidade Preventiva</label>
        <div style="display:flex;gap:6px">
          <input type="number" min="1" id="f-pnum" value="${m?.periodicidadeNumero ?? 1}" style="width:70px">
          <select id="f-punid" style="flex:1">
            ${['dias', 'semanas', 'mes', 'ano'].map(u => `<option value="${u}" ${(m?.periodicidadeUnidade || 'mes') === u ? 'selected' : ''}>${UNID_LABEL[u][1]}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>
    ${_statusToggleHtml('maquina', m)}`;

  _wireCascadeMaquina(db, { unidadeId0, localId0, ambienteId0, salaId0 });

  document.getElementById('btn-toggle-node')?.addEventListener('click', () => _toggleAtivoNode('maquina', id));
  document.getElementById('btn-edit-save').onclick = () => _salvarMaquina(db, m);
  openM('m-edit');
}

function _optsComNovo(list, currentId, rotulo) {
  const ativos = list.filter(x => x.ativo !== false || x.id === currentId)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  let html = ativos.map(x => `<option value="${x.id}" ${x.id === currentId ? 'selected' : ''}>${_esc(x.nome)}</option>`).join('');
  html += `<option value="${NOVO}">+ Criar novo ${rotulo}...</option>`;
  if (!ativos.length && !currentId) html = `<option value="${NOVO}" selected>+ Criar novo ${rotulo}...</option>`;
  return html;
}

function _wireCascadeMaquina(db, ids) {
  const selU = document.getElementById('f-unidade');
  const selL = document.getElementById('f-local');
  const selA = document.getElementById('f-ambiente');
  const selS = document.getElementById('f-sala');
  const novU = document.getElementById('f-unidade-novo');
  const novL = document.getElementById('f-local-novo');
  const novA = document.getElementById('f-ambiente-novo');
  const novS = document.getElementById('f-sala-novo');

  function toggleNovo(sel, inp) { inp.style.display = sel.value === NOVO ? 'block' : 'none'; }

  function popLocal(localIdSel) {
    const uid = selU.value;
    const arr = uid === NOVO ? [] : db.locais.filter(l => l.unidadeId === uid);
    selL.innerHTML = _optsComNovo(arr, localIdSel, 'Local');
    toggleNovo(selL, novL);
    popAmbiente(null);
  }
  function popAmbiente(ambienteIdSel) {
    const lid = selL.value;
    const arr = (lid === NOVO || !lid) ? [] : db.ambientes.filter(a => a.localId === lid);
    selA.innerHTML = _optsComNovo(arr, ambienteIdSel, 'Ambiente');
    toggleNovo(selA, novA);
    popSala(null);
  }
  function popSala(salaIdSel) {
    const aid = selA.value;
    const arr = (aid === NOVO || !aid) ? [] : db.salas.filter(s => s.ambienteId === aid);
    selS.innerHTML = _optsComNovo(arr, salaIdSel, 'Sala');
    toggleNovo(selS, novS);
  }

  // Estado inicial (preenche a cadeia já existente, se for edição)
  toggleNovo(selU, novU);
  popLocal(ids.localId0);
  selL.value = ids.localId0 || selL.value;
  popAmbiente(ids.ambienteId0);
  selA.value = ids.ambienteId0 || selA.value;
  popSala(ids.salaId0);
  selS.value = ids.salaId0 || selS.value;

  selU.addEventListener('change', () => { toggleNovo(selU, novU); popLocal(null); });
  selL.addEventListener('change', () => { toggleNovo(selL, novL); popAmbiente(null); });
  selA.addEventListener('change', () => { toggleNovo(selA, novA); popSala(null); });
  selS.addEventListener('change', () => toggleNovo(selS, novS));
}

function _salvarMaquina(db, m) {
  const selU = document.getElementById('f-unidade');
  const selL = document.getElementById('f-local');
  const selA = document.getElementById('f-ambiente');
  const selS = document.getElementById('f-sala');

  const nome = document.getElementById('f-nome').value.trim();
  const tag  = document.getElementById('f-tag').value.trim();
  const crit = parseInt(document.getElementById('f-crit').value, 10);
  const pnum = parseInt(document.getElementById('f-pnum').value, 10);
  const punid = document.getElementById('f-punid').value;
  const familiaId = document.getElementById('f-familia').value || null;

  if (!nome) { showToast('Informe o nome da Máquina.', 'er'); return; }
  if (!tag)  { showToast('Informe a TAG da Máquina.', 'er'); return; }
  if (!pnum || pnum < 1) { showToast('Periodicidade deve ser maior que zero.', 'er'); return; }
  if (_tagDuplicada(db, tag, m?.id)) { showToast(`A TAG "${tag}" já está em uso em outra máquina.`, 'er'); return; }

  // Resolve a cadeia, criando inline qualquer nível marcado como "novo"
  let unidadeId = selU.value;
  if (unidadeId === NOVO) {
    const novoNome = document.getElementById('f-unidade-novo').value.trim();
    if (!novoNome) { showToast('Informe o nome da nova Unidade.', 'er'); return; }
    if (_nomeDuplicado(db, 'unidade', null, novoNome, null)) { showToast('Já existe uma Unidade com esse nome.', 'er'); return; }
    unidadeId = _genId('UNI', novoNome);
    db.unidades.push({ id: unidadeId, nome: _normNome(novoNome), ativo: true, criadoEm: new Date().toISOString() });
  }

  let localId = selL.value;
  if (localId === NOVO) {
    const novoNome = document.getElementById('f-local-novo').value.trim();
    if (!novoNome) { showToast('Informe o nome do novo Local.', 'er'); return; }
    if (_nomeDuplicado(db, 'local', unidadeId, novoNome, null)) { showToast('Já existe um Local com esse nome nessa Unidade.', 'er'); return; }
    localId = _genId('LOC', novoNome);
    db.locais.push({ id: localId, unidadeId, nome: _normNome(novoNome), ativo: true, criadoEm: new Date().toISOString() });
  }

  let ambienteId = selA.value;
  if (ambienteId === NOVO) {
    const novoNome = document.getElementById('f-ambiente-novo').value.trim();
    if (!novoNome) { showToast('Informe o nome do novo Ambiente.', 'er'); return; }
    if (_nomeDuplicado(db, 'ambiente', localId, novoNome, null)) { showToast('Já existe um Ambiente com esse nome nesse Local.', 'er'); return; }
    ambienteId = _genId('AMB', novoNome);
    db.ambientes.push({ id: ambienteId, localId, nome: _normNome(novoNome), ativo: true, criadoEm: new Date().toISOString() });
  }

  let salaId = selS.value;
  if (salaId === NOVO) {
    const novoNome = document.getElementById('f-sala-novo').value.trim();
    if (!novoNome) { showToast('Informe o nome da nova Sala.', 'er'); return; }
    if (_nomeDuplicado(db, 'sala', ambienteId, novoNome, null)) { showToast('Já existe uma Sala com esse nome nesse Ambiente.', 'er'); return; }
    salaId = _genId('SAL', novoNome);
    db.salas.push({ id: salaId, ambienteId, nome: _normNome(novoNome), ativo: true, criadoEm: new Date().toISOString() });
  }

  if (m) {
    m.nome = _normNome(nome);
    m.tag  = _normNome(tag);
    m.salaId = salaId;
    m.criticidade = crit;
    m.periodicidadeNumero = pnum;
    m.periodicidadeUnidade = punid;
    m.familiaId = familiaId;
  } else {
    db.maquinas.push({
      id: _genId('MAQ', nome), salaId, nome: _normNome(nome), tag: _normNome(tag),
      criticidade: crit, periodicidadeNumero: pnum, periodicidadeUnidade: punid, familiaId,
      ativo: true, criadoEm: new Date().toISOString(),
    });
  }

  saveDB();
  closeM('m-edit');
  showToast(m ? 'Máquina atualizada.' : 'Máquina criada.', 'ok');
  render();
}

// ============================================================
// FAMÍLIAS DE EQUIPAMENTO + CHECKLIST DE PREVENTIVA (aba nova)
// ============================================================
// "Família" = fabricante + tipo (ex: ULMA / Termoformadora). Cada
// família tem um checklist reutilizável (preventivaTemplates) que
// qualquer máquina vinculada a ela herda automaticamente na tela de
// Preventiva (só impressão, ver js/pages/preventiva.js). Antes desta
// aba, isso só dava pra cadastrar editando mock/db.js na mão.

const AREA_OPTS = ['Mecânico', 'Elétrico'];
const CRITICIDADE_TPL_LABEL = { A: 'A – Crítica', B: 'B – Importante', C: 'C – Desejável' };
const PERIODICIDADE_OPTS = ['Diária', 'Semanal', 'Quinzenal', 'Mensal', 'Trimestral', 'Semestral', 'Anual'];

function _renderFamilias() {
  const root = document.getElementById('pg-at-body');
  if (!root) return;
  const db = getDB();
  const familias = [...(db.familias || [])].sort((a, b) => `${a.fabricante} ${a.tipo}`.localeCompare(`${b.fabricante} ${b.tipo}`, 'pt-BR'));

  root.innerHTML = `
    <div class="card">
      <div class="card-t" style="display:flex;justify-content:space-between;align-items:center">
        <span>Famílias de Equipamento (${familias.length})</span>
        <button class="btn btn-sm btn-p" id="btn-nova-familia">+ Nova Família</button>
      </div>
      ${familias.length ? familias.map(f => _familiaCardHtml(db, f)).join('') : `
        <div class="empty"><div class="ei">🔧</div><p>Nenhuma família cadastrada ainda.</p></div>`}
    </div>`;

  document.getElementById('btn-nova-familia')?.addEventListener('click', () => _abrirFamiliaForm(null));
  root.querySelectorAll('[data-familia-editar]').forEach(btn =>
    btn.addEventListener('click', () => _abrirFamiliaForm(btn.dataset.familiaEditar)));
  root.querySelectorAll('[data-familia-checklist]').forEach(btn =>
    btn.addEventListener('click', () => _abrirChecklist(btn.dataset.familiaChecklist)));
  root.querySelectorAll('[data-familia-excluir]').forEach(btn =>
    btn.addEventListener('click', () => _excluirFamilia(btn.dataset.familiaExcluir)));
}

function _familiaCardHtml(db, f) {
  const nTarefas = (db.preventivaTemplates || []).filter(t => t.familiaId === f.id && t.ativo !== false).length;
  const nMaquinas = (db.maquinas || []).filter(m => m.familiaId === f.id && m.ativo !== false).length;
  return `
    <div class="dr" style="align-items:center;justify-content:space-between">
      <div style="display:flex;flex-direction:column;gap:2px">
        <span class="dv" style="font-weight:700">${_esc(f.fabricante)} — ${_esc(f.tipo)}</span>
        <span style="font-size:12px;color:var(--txt3)">${_esc(f.descricao || '')} · ${nMaquinas} máquina${nMaquinas === 1 ? '' : 's'} vinculada${nMaquinas === 1 ? '' : 's'} · ${nTarefas} tarefa${nTarefas === 1 ? '' : 's'} no checklist</span>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0">
        <button class="btn btn-sm btn-gh" data-familia-checklist="${f.id}">📋 Checklist</button>
        <button class="btn btn-sm btn-gh" data-familia-editar="${f.id}">✎ Editar</button>
        <button class="btn btn-d" data-familia-excluir="${f.id}">✕</button>
      </div>
    </div>`;
}

function _abrirFamiliaForm(id) {
  const db = getDB();
  const f = id ? db.familias.find(x => x.id === id) : null;
  _setModalWidth(440);
  document.getElementById('me-t').textContent = f ? `Editar Família — ${f.fabricante} ${f.tipo}` : 'Nova Família de Equipamento';
  document.getElementById('me-b').innerHTML = `
    <div class="fg"><label>Fabricante</label><input type="text" id="ff-fab" value="${f ? _escAttr(f.fabricante) : ''}" placeholder="Ex: ULMA"></div>
    <div class="fg"><label>Tipo de Equipamento</label><input type="text" id="ff-tipo" value="${f ? _escAttr(f.tipo) : ''}" placeholder="Ex: Termoformadora"></div>
    <div class="fg"><label>Descrição</label><textarea id="ff-desc" placeholder="Opcional">${f ? _esc(f.descricao || '') : ''}</textarea></div>`;
  document.getElementById('btn-edit-save').onclick = () => {
    const fabricante = document.getElementById('ff-fab').value.trim();
    const tipo = document.getElementById('ff-tipo').value.trim();
    const descricao = document.getElementById('ff-desc').value.trim();
    if (!fabricante || !tipo) { showToast('Informe fabricante e tipo.', 'er'); return; }
    const dup = db.familias.some(x => x.id !== id && _normNome(x.fabricante) === _normNome(fabricante) && _normNome(x.tipo) === _normNome(tipo));
    if (dup) { showToast('Já existe uma família com esse fabricante + tipo.', 'er'); return; }
    if (f) {
      Object.assign(f, { fabricante, tipo, descricao });
    } else {
      db.familias.push({ id: _genId('FAM', `${fabricante}_${tipo}`), fabricante, tipo, descricao, ativo: true, criadoEm: new Date().toISOString() });
    }
    saveDB();
    closeM('m-edit');
    showToast(f ? 'Família atualizada.' : 'Família criada.', 'ok');
    _renderFamilias();
  };
  openM('m-edit');
}

function _excluirFamilia(id) {
  const db = getDB();
  const nMaquinas = db.maquinas.filter(m => m.familiaId === id && m.ativo !== false).length;
  if (nMaquinas > 0) {
    showToast(`Não dá pra excluir: ${nMaquinas} máquina(s) ainda vinculada(s) a essa família. Troque a família delas primeiro (em Ativos → Editar Máquina).`, 'er');
    return;
  }
  if (!confirm('Excluir esta família e todo o checklist dela?')) return;
  db.familias = db.familias.filter(f => f.id !== id);
  db.preventivaTemplates = (db.preventivaTemplates || []).filter(t => t.familiaId !== id);
  saveDB();
  showToast('Família excluída.', 'ok');
  _renderFamilias();
}

function _abrirChecklist(familiaId) {
  const db = getDB();
  const f = db.familias.find(x => x.id === familiaId);
  if (!f) return;
  _setModalWidth(560);
  document.getElementById('me-t').textContent = `Checklist — ${f.fabricante} ${f.tipo}`;
  _renderChecklistBody(familiaId);
  document.getElementById('btn-edit-save').onclick = () => closeM('m-edit'); // tudo já salva na hora, botão só fecha
  openM('m-edit');
}

function _renderChecklistBody(familiaId) {
  const db = getDB();
  const tarefas = (db.preventivaTemplates || []).filter(t => t.familiaId === familiaId).sort((a, b) => a.ordem - b.ordem);
  document.getElementById('me-b').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px">
      ${tarefas.length ? tarefas.map(t => `
        <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--surf2);border:1px solid var(--bord);border-radius:var(--rs)">
          <span class="badge" style="flex-shrink:0">${t.area}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px">${_esc(t.tarefa)}</div>
            <div style="font-size:11px;color:var(--txt3)">${t.periodicidade} · Criticidade ${CRITICIDADE_TPL_LABEL[t.criticidade] || t.criticidade}${t.tempoEstimadoMin ? ` · ~${t.tempoEstimadoMin}min` : ''}</div>
          </div>
          <button type="button" class="btn btn-d" data-rm-tarefa="${t.id}">✕</button>
        </div>`).join('') : `<div style="text-align:center;color:var(--txt3);padding:12px;font-size:13px">Nenhuma tarefa ainda.</div>`}
    </div>
    <div class="card-t" style="margin-bottom:8px">+ Adicionar Tarefa</div>
    <div class="fg-row">
      <div class="fg"><label>Área</label><select id="ft-area">${AREA_OPTS.map(a => `<option>${a}</option>`).join('')}</select></div>
      <div class="fg"><label>Periodicidade</label><select id="ft-per">${PERIODICIDADE_OPTS.map(p => `<option ${p === 'Mensal' ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
      <div class="fg"><label>Criticidade</label><select id="ft-crit">${Object.entries(CRITICIDADE_TPL_LABEL).map(([k, v]) => `<option value="${k}" ${k === 'B' ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <div class="fg"><label>Tempo Estimado (min)</label><input type="number" id="ft-tempo" min="1" value="15"></div>
      <div class="fg fg-full"><label>Tarefa</label><input type="text" id="ft-tarefa" placeholder="Ex: Verificar tensão das correias"></div>
    </div>
    <div class="fa" style="border-top:none;padding-top:0">
      <button type="button" class="btn btn-p" id="btn-add-tarefa">+ Adicionar</button>
    </div>`;

  document.getElementById('me-b').querySelectorAll('[data-rm-tarefa]').forEach(btn => {
    btn.addEventListener('click', () => {
      db.preventivaTemplates = db.preventivaTemplates.filter(t => t.id !== btn.dataset.rmTarefa);
      saveDB();
      _renderChecklistBody(familiaId);
    });
  });
  document.getElementById('btn-add-tarefa').addEventListener('click', () => {
    const area = document.getElementById('ft-area').value;
    const periodicidade = document.getElementById('ft-per').value;
    const criticidade = document.getElementById('ft-crit').value;
    const tempoEstimadoMin = parseInt(document.getElementById('ft-tempo').value) || null;
    const tarefa = document.getElementById('ft-tarefa').value.trim();
    if (!tarefa) { showToast('Descreva a tarefa.', 'er'); return; }
    const ordem = tarefas.filter(t => t.area === area).length + 1;
    db.preventivaTemplates = db.preventivaTemplates || [];
    db.preventivaTemplates.push({
      id: _genId('PT', tarefa), familiaId, area, tarefa, periodicidade,
      tempoEstimadoMin, criticidade, ordem, ativo: true,
    });
    saveDB();
    showToast('Tarefa adicionada.', 'ok');
    _renderChecklistBody(familiaId);
  });
}

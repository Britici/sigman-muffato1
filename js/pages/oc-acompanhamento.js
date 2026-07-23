// ============================================================
// SIGMAN v2.0 — pages/oc-acompanhamento.js
// Acompanhamento de Ordens de Compra — stepper 7 etapas
// Portado de modulo-compras-acompanhamento.js (V1/Google Sheets)
// para ES6 + mock/localStorage (mesmo padrão do resto do V2).
// ============================================================

import { getDB, saveDB } from '../api.js?v=20260722';

// ── Prazos em dias úteis por prioridade (mesmo do V1) ──────────────────────
const PRAZOS = {
  '1': [0,  0,  0,  0,  0],   // Emergencial
  '2': [2,  3,  5,  3,  2],   // Urgente
  '3': [7, 15,  7,  7, 10],   // Médio
  '4': [7, 30, 13, 10, 30],   // Baixo
};
const PRAZO_NF = 7; // etapa 7 (NF)

const ETAPAS = [
  { idx: 1, label: 'Solicitação',   editavel: false },
  { idx: 2, label: 'Orçamento',     editavel: true  },
  { idx: 3, label: 'RC / Pedido',   editavel: true  },
  { idx: 4, label: 'Aprovação',     editavel: true  },
  { idx: 5, label: 'Envio Fornec.', editavel: true  },
  { idx: 6, label: 'Prev. Entrega', editavel: true, note: 'Data prevista pelo fornecedor (pode ser futura)' },
  { idx: 7, label: 'Lançamento NF', editavel: true  },
];

const PRI_LABEL = { '1': 'Emergencial', '2': 'Urgente', '3': 'Médio', '4': 'Baixo' };
const PRI_COR   = { '1': '#ef4444', '2': '#eab308', '3': '#3b82f6', '4': '#22c55e' };

let _abaAtiva = 'em_andamento';
let _bound = false;

export function init() {
  const wrap = document.getElementById('oca-wrap');
  if (!wrap) return;
  if (!_bound) {
    _bound = true;
    document.getElementById('oca-tab-andamento')?.addEventListener('click', () => _setAba('em_andamento'));
    document.getElementById('oca-tab-concluida')?.addEventListener('click', () => _setAba('concluida'));
    document.getElementById('oca-fil-pri')?.addEventListener('change',  () => { _renderTabelaPrazos(); _renderLista(); });
    document.getElementById('oca-fil-sala')?.addEventListener('change', _renderLista);
    document.getElementById('oca-search')?.addEventListener('input',    _renderLista);
    document.getElementById('oca-prazos-toggle')?.addEventListener('click', _toggleTabelaPrazos);
    // Fechar modal com Esc (delegado no body — não duplica porque o modal remove a si mesmo)
  }
  _renderTabelaPrazos();
  _populateFiltroSala();
  _renderLista();
}

// ── Tabela de Prazos por Prioridade ──────────────────────────────────────────

function _toggleTabelaPrazos() {
  const body  = document.getElementById('oca-prazos-body');
  const arrow = document.getElementById('oca-prazos-arrow');
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  arrow.textContent  = isOpen ? '▼ clique para expandir' : '▲ clique para recolher';
}

let _prazoSortDir = null; // null | 'asc' | 'desc'

function _renderTabelaPrazos() {
  const body = document.getElementById('oca-prazos-body');
  if (!body) return;

  const cols = [
    { idx: 1, label: '1) Solicitação'     },
    { idx: 2, label: '2) Orçamento'       },
    { idx: 3, label: '3) Gerar RC/Pedido' },
    { idx: 4, label: '4) Aprovação'       },
    { idx: 5, label: '5) Envio Fornec.'   },
    { idx: 6, label: '6) Previsão Entrega', destaque: true },
    { idx: 7, label: '7) Lançamento NF'   },
  ];

  const filPri = document.getElementById('oca-fil-pri')?.value || '';

  let prioridades = ['1', '2', '3', '4'].map(pri => ({
    pri,
    total: cols.filter(c => c.idx !== 6).reduce((sum, c) => sum + _prazoEtapa(pri, c.idx), 0),
  }));

  if (_prazoSortDir) {
    prioridades.sort((a, b) => _prazoSortDir === 'asc' ? a.total - b.total : b.total - a.total);
  }

  const rows = prioridades.map(({ pri, total }, i) => {
    const emDestaque = filPri && filPri === pri;
    const zebraBg = i % 2 === 1 ? 'var(--surf)' : 'transparent';
    const cells = cols.map(c => {
      const dias = _prazoEtapa(pri, c.idx);
      const txt  = dias === 0 ? '0 dias' : `Até ${dias} dias`;
      return `<td style="padding:9px 12px;text-align:center;font-size:13px;${c.destaque ? 'color:#ef4444;font-weight:600' : 'color:var(--txt2)'}">${txt}</td>`;
    }).join('');
    return `<tr style="border-top:1px solid var(--bord);background:${emDestaque ? 'rgba(196,18,48,.10)' : zebraBg};${emDestaque ? 'box-shadow:inset 3px 0 0 #C41230' : ''}">
      <td style="padding:9px 12px;text-align:center">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:${PRI_COR[pri]};color:#fff;font-size:12px;font-weight:700">${pri}</span>
      </td>
      ${cells}
      <td style="padding:9px 12px;text-align:center;font-size:13px;font-weight:700;color:${emDestaque ? '#fca5a5' : 'var(--txt1)'}">${total} dias</td>
    </tr>`;
  }).join('');

  const arrowSort = _prazoSortDir === 'asc' ? '▲' : _prazoSortDir === 'desc' ? '▼' : '↕';

  body.innerHTML = `
  <div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;min-width:760px">
      <thead>
        <tr>
          <th style="padding:8px 12px;text-align:center;font-size:11px;color:var(--txt3);text-transform:uppercase;letter-spacing:.05em">#</th>
          ${cols.map(c => `<th style="padding:8px 12px;text-align:center;font-size:11px;color:var(--txt3);text-transform:uppercase;letter-spacing:.05em;white-space:nowrap" ${c.destaque ? `title="Cumulativa: soma das etapas 1 a 5, não é somada de novo no Tempo Total"` : ''}>${c.label}${c.destaque ? ' 🛈' : ''}</th>`).join('')}
          <th id="oca-prazos-sort" style="padding:8px 12px;text-align:center;font-size:11px;color:var(--txt3);text-transform:uppercase;letter-spacing:.05em;cursor:pointer;user-select:none;white-space:nowrap">Tempo Total <span style="font-size:10px">${arrowSort}</span></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div style="font-size:11px;color:var(--txt3);margin-top:8px">🛈 A coluna <b>Previsão Entrega</b> é cumulativa (soma das etapas 1 a 5) — por isso não é somada de novo no Tempo Total.</div>`;

  document.getElementById('oca-prazos-sort')?.addEventListener('click', () => {
    _prazoSortDir = _prazoSortDir === 'asc' ? 'desc' : _prazoSortDir === 'desc' ? null : 'asc';
    _renderTabelaPrazos();
  });
}

// ── Abas ────────────────────────────────────────────────────────────────────

function _setAba(aba) {
  _abaAtiva = aba;
  document.querySelectorAll('.oca-tab').forEach(t => t.classList.remove('ativo'));
  document.getElementById(`oca-tab-${aba === 'em_andamento' ? 'andamento' : 'concluida'}`)?.classList.add('ativo');
  _renderLista();
}

// ── Filtros ─────────────────────────────────────────────────────────────────

function _populateFiltroSala() {
  const db   = getDB();
  const ocs  = db.ordensCompra || [];
  const sel  = document.getElementById('oca-fil-sala');
  if (!sel) return;
  const ids = [...new Set(ocs.map(o => o.salaId).filter(Boolean))];
  const salas = (db.salas || []).filter(s => ids.includes(s.id)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  sel.innerHTML = '<option value="">Todas as salas</option>' +
    salas.map(s => `<option value="${s.id}">${s.nome}</option>`).join('');
}

// ── Render lista ─────────────────────────────────────────────────────────────

function _renderLista() {
  const db     = getDB();
  const lista  = document.getElementById('oca-lista');
  if (!lista) return;

  const filPri  = document.getElementById('oca-fil-pri')?.value  || '';
  const filSala = document.getElementById('oca-fil-sala')?.value || '';
  const busca   = (document.getElementById('oca-search')?.value || '').toLowerCase();

  const isAndamento = o => o.status === 'em_andamento';
  const isConcluida = o => o.status === 'concluida' || o.status === 'orcamento_recusado';

  const filtrar = o => {
    if (filPri  && o.prioridade !== filPri)  return false;
    if (filSala && o.salaId     !== filSala) return false;
    if (busca && !(
      (o.id         || '').toLowerCase().includes(busca) ||
      (o.descricao  || '').toLowerCase().includes(busca) ||
      (o.tipoAcao   || '').toLowerCase().includes(busca)
    )) return false;
    return true;
  };

  const ocs = db.ordensCompra || [];
  const andamento = ocs.filter(o => isAndamento(o) && filtrar(o));
  const concluidas = ocs.filter(o => isConcluida(o) && filtrar(o));

  // Atualizar contadores nas abas
  const cntA = document.getElementById('oca-cnt-andamento');
  const cntC = document.getElementById('oca-cnt-concluida');
  if (cntA) cntA.textContent = andamento.length;
  if (cntC) cntC.textContent = concluidas.length;

  const atual = _abaAtiva === 'em_andamento' ? andamento : concluidas;

  if (!atual.length) {
    lista.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--txt3);font-size:14px">
      Nenhuma ordem encontrada.</div>`;
    return;
  }

  lista.innerHTML = atual.map(oc => _buildCard(oc, db)).join('');

  // Eventos dos cards
  lista.querySelectorAll('.oca-card-head').forEach(h =>
    h.addEventListener('click', function () {
      const body   = this.closest('.oca-card').querySelector('.oca-card-body');
      const arrow  = this.querySelector('.oca-arrow');
      const isOpen = body.style.display === 'block';
      body.style.display = isOpen ? 'none' : 'block';
      if (arrow) arrow.textContent = isOpen ? '▼' : '▲';
    })
  );

  lista.querySelectorAll('.oca-btn-etapa').forEach(btn =>
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const db2 = getDB();
      const oc  = db2.ordensCompra.find(o => o.id === btn.dataset.id);
      if (oc) _abrirModal(oc, Number(btn.dataset.etapa));
    })
  );

  lista.querySelectorAll('.oca-btn-recusar').forEach(btn =>
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const db2 = getDB();
      const oc  = db2.ordensCompra.find(o => o.id === btn.dataset.id);
      if (oc) _recusarOrcamento(oc);
    })
  );
}

// ── Build card ───────────────────────────────────────────────────────────────

function _buildCard(oc, db) {
  const pri      = oc.prioridade || '2';
  const priLabel = PRI_LABEL[pri] || '';
  const priCor   = PRI_COR[pri]   || '#3b82f6';
  const isConcl  = oc.status === 'concluida' || oc.status === 'orcamento_recusado';
  const atrasada = !isConcl && _estaAtrasada(oc);

  const statusLabel = {
    em_andamento:       'Em Andamento',
    concluida:          '✅ Concluída',
    orcamento_recusado: '🚫 Orç. Recusado',
  }[oc.status] || oc.status;

  const sala = db.salas?.find(s => s.id === oc.salaId);
  const maq  = db.maquinas?.find(m => m.id === oc.maqId);

  const statusColor = atrasada ? '#ef4444' : (oc.status === 'concluida' ? '#22c55e' : oc.status === 'orcamento_recusado' ? '#ef4444' : '#3b82f6');
  const statusTxt   = atrasada ? '⚠️ Atrasada' : statusLabel;

  const steps = ETAPAS.map(et => _buildStep(oc, et)).join('');

  // Fotos da solicitação
  const fotosHtml = (oc.fotos || []).length
    ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
        <div style="font-size:11px;color:var(--txt3);width:100%;font-weight:700;text-transform:uppercase;letter-spacing:.07em">📎 Fotos da Solicitação</div>
        ${(oc.fotos || []).map(src => `<img src="${src}" style="width:64px;height:64px;object-fit:cover;border-radius:6px;border:1px solid var(--bord);cursor:zoom-in" onclick="(function(s){var o=document.getElementById('oca-lightbox');o.querySelector('img').src=s;o.style.display='flex';})(this.src)">`).join('')}
      </div>` : '';

  // Obs e fotos por etapa já preenchidas
  const etapaObsHtml = ETAPAS.filter(et => {
    const e = oc.etapas?.[et.idx];
    return e && (e.obs || e.foto);
  }).map(et => {
    const e = oc.etapas[et.idx];
    return `<div style="margin-top:8px;padding:8px 10px;background:var(--surf);border-radius:6px;border-left:3px solid #22c55e;font-size:13px;color:var(--txt2)">
      <b style="font-size:11px;font-weight:700;color:#86efac;text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:2px">Etapa ${et.idx} — ${et.label}</b>
      ${e.obs ? `<div>${e.obs}</div>` : ''}
      ${e.foto ? `<img src="${e.foto}" style="margin-top:6px;width:64px;height:64px;object-fit:cover;border-radius:6px;border:1px solid var(--bord);cursor:zoom-in" onclick="(function(s){var o=document.getElementById('oca-lightbox');o.querySelector('img').src=s;o.style.display='flex';})(this.src)">` : ''}
    </div>`;
  }).join('');

  const mostrarRecusar = !isConcl && oc.etapas?.[2] && !oc.etapas?.[2]?.orcamentoRecusado;

  return `
<div class="oca-card" style="background:var(--surf2);border:1px solid var(--bord);border-left:4px solid ${priCor};border-radius:var(--rs);margin-bottom:12px;overflow:hidden;${isConcl?'opacity:.8':''}">
  <div class="oca-card-head" style="display:flex;align-items:center;gap:12px;padding:13px 16px;cursor:pointer;user-select:none;flex-wrap:wrap">
    <span style="font-size:11px;font-weight:700;color:var(--txt3);font-family:monospace">${oc.id}</span>
    <span style="flex:1;font-size:14px;color:var(--txt1);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0">${oc.descricao || '—'}</span>
    <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
      <span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;border:1px solid ${priCor};color:${priCor};background:${priCor}22">${priLabel}</span>
      <span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;border:1px solid ${statusColor};color:${statusColor};background:${statusColor}22">${statusTxt}</span>
      <span class="oca-arrow" style="color:var(--txt3);font-size:13px">▼</span>
    </div>
  </div>
  <div class="oca-card-body" style="display:none;padding:0 16px 16px;border-top:1px solid var(--bord)">
    <div style="display:flex;gap:18px;flex-wrap:wrap;padding:12px 0 14px;font-size:13px;color:var(--txt3)">
      <span><b style="color:var(--txt2)">Sala:</b> ${sala?.nome || oc.salaId}</span>
      <span><b style="color:var(--txt2)">Máquina:</b> ${maq?.nome || oc.maqId}</span>
      <span><b style="color:var(--txt2)">Qtd:</b> ${oc.quantidade || '—'}</span>
      <span><b style="color:var(--txt2)">Tipo:</b> ${oc.tipoAcao || '—'}</span>
      ${oc.fornecedor  ? `<span><b style="color:var(--txt2)">Fornecedor:</b> ${oc.fornecedor}</span>` : ''}
      ${oc.etapas?.[2]?.numeroRC ? `<span><b style="color:var(--txt2)">RC:</b> ${oc.etapas[2].numeroRC}</span>` : ''}
      ${oc.etapas?.[7]?.numeroNF ? `<span><b style="color:var(--txt2)">NF:</b> ${oc.etapas[7].numeroNF}</span>` : ''}
      ${oc.etapas?.[2]?.valorOrcamento ? `<span><b style="color:var(--txt2)">Orçamento:</b> R$ ${oc.etapas[2].valorOrcamento}</span>` : ''}
      <span><b style="color:var(--txt2)">Data:</b> ${_fmtDate(oc.criadoEm)}</span>
      <span><b style="color:var(--txt2)">Solicitante:</b> ${oc.solicitante || '—'}</span>
    </div>
    <!-- Stepper -->
    <div style="display:flex;align-items:flex-start;gap:0;overflow-x:auto;padding:4px 0 14px">${steps}</div>
    ${mostrarRecusar ? `<div style="margin-top:8px">
      <button class="oca-btn-recusar" data-id="${oc.id}"
        style="padding:5px 13px;border-radius:6px;border:1px solid rgba(239,68,68,.4);background:rgba(239,68,68,.08);color:#fca5a5;font-size:12px;cursor:pointer">
        🚫 Recusar Orçamento
      </button>
    </div>` : ''}
    ${fotosHtml}
    ${etapaObsHtml}
    ${oc.acaoPreventiva ? `<div style="margin-top:10px;padding:10px 12px;background:var(--surf);border-radius:7px;border-left:3px solid var(--bord);font-size:13px;color:var(--txt2)"><b style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px">Ação Preventiva</b>${oc.acaoPreventiva}</div>` : ''}
  </div>
</div>`;
}

// ── Build step ────────────────────────────────────────────────────────────────

function _buildStep(oc, et) {
  const etDone = oc.etapas?.[et.idx];
  const isDone = !!etDone?.data;
  const state  = _getStepState(oc, et.idx);

  const dotColor = isDone ? '#22c55e' : (state === 'active-late' ? '#ef4444' : state === 'active-ok' ? '#3b82f6' : 'var(--bord)');
  const dotBg    = isDone ? '#22c55e' : (state === 'active-late' ? 'rgba(239,68,68,.12)' : state === 'active-ok' ? 'rgba(59,130,246,.12)' : 'var(--surf)');
  const dotTxt   = isDone ? '✓' : et.idx;
  const lineColor = isDone ? '#22c55e' : 'var(--bord)';

  const dateHtml  = isDone ? `<span style="font-size:10px;color:#22c55e;margin-top:2px;text-align:center">${_fmtDateShort(etDone.data)}</span>` : '';
  const prazoHtml = (state === 'active-ok' || state === 'active-late')
    ? `<span style="font-size:10px;color:#ef4444;margin-top:2px;text-align:center">${_prazoLabel(oc, et.idx)}</span>` : '';

  const isConcl  = oc.status === 'concluida' || oc.status === 'orcamento_recusado';
  const canEdit  = et.editavel && !isConcl;
  const btnLabel = isDone ? '✏️ Editar' : (state === 'active-late' ? '🔴 Preencher' : '📝 Preencher');

  const btnHtml = canEdit ? `
    <button class="oca-btn-etapa" data-id="${oc.id}" data-etapa="${et.idx}"
      style="margin-top:8px;padding:4px 10px;border-radius:6px;border:1px solid ${isDone ? 'rgba(34,197,94,.4)' : 'var(--bord)'};background:${isDone ? 'rgba(34,197,94,.07)' : 'transparent'};color:${isDone ? '#86efac' : 'var(--txt2)'};font-size:11px;cursor:pointer">
      ${btnLabel}
    </button>` : '';

  const isLast = et.idx === 7;
  const lineHtml = !isLast ? `<div style="position:absolute;top:14px;left:calc(50% + 14px);right:calc(-50% + 14px);height:2px;background:${lineColor};z-index:0"></div>` : '';

  return `
<div style="display:flex;flex-direction:column;align-items:center;flex:1;min-width:80px;position:relative">
  ${lineHtml}
  <div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;z-index:1;position:relative;background:${dotBg};border:2px solid ${dotColor};color:${isDone ? '#fff' : dotColor === 'var(--bord)' ? 'var(--txt3)' : dotColor}">
    ${dotTxt}
  </div>
  <span style="font-size:10px;color:var(--txt3);margin-top:6px;text-align:center;line-height:1.3;max-width:72px">${et.label}</span>
  ${dateHtml}
  ${prazoHtml}
  ${btnHtml}
</div>`;
}

// ── Estado e prazos ───────────────────────────────────────────────────────────

function _getStepState(oc, idx) {
  if (oc.etapas?.[idx]?.data) return 'done';
  if (oc.status === 'concluida' || oc.status === 'orcamento_recusado') return 'pending';
  // Etapa é a atual se todas as anteriores estão preenchidas
  const isAtual = ETAPAS.filter(e => e.idx < idx).every(e => !!oc.etapas?.[e.idx]?.data);
  if (!isAtual) return 'pending';
  const prazoDias = _prazoEtapa(oc.prioridade || '2', idx);
  const inicio    = _inicioEtapa(oc, idx);
  if (!inicio) return 'active-ok';
  const diff = Math.floor((Date.now() - inicio.getTime()) / 86400000);
  return diff > prazoDias ? 'active-late' : 'active-ok';
}

function _estaAtrasada(oc) {
  return ETAPAS.some(et => _getStepState(oc, et.idx) === 'active-late');
}

function _prazoEtapa(pri, idx) {
  const arr = PRAZOS[pri] || PRAZOS['2'];
  if (idx <= 5) return arr[idx - 1] ?? 0;     // etapas 1-5 → arr[0..4]
  if (idx === 6) return arr.reduce((a, b) => a + b, 0); // Prev. Entrega = soma
  return PRAZO_NF;                             // etapa 7 NF
}

function _inicioEtapa(oc, idx) {
  if (idx <= 1) return oc.criadoEm ? new Date(oc.criadoEm) : null;
  const prev = oc.etapas?.[idx - 1];
  return prev?.data ? new Date(prev.data) : null;
}

function _prazoLabel(oc, idx) {
  const prazoDias = _prazoEtapa(oc.prioridade || '2', idx);
  const inicio    = _inicioEtapa(oc, idx);
  if (!inicio) return '';
  const diff = Math.floor((Date.now() - inicio.getTime()) / 86400000);
  if (prazoDias === 0) return diff === 0 ? 'Hoje' : `+${diff}d`;
  if (diff > prazoDias) return `+${diff - prazoDias}d atraso`;
  const rest = prazoDias - diff;
  return `${rest}d restante${rest === 1 ? '' : 's'}`;
}

// ── Modal de etapa ────────────────────────────────────────────────────────────

function _abrirModal(oc, etapaIdx) {
  const et     = ETAPAS.find(e => e.idx === etapaIdx);
  if (!et) return;
  const etDone = oc.etapas?.[etapaIdx];
  const isDone = !!etDone?.data;
  const hoje   = new Date().toISOString().split('T')[0];

  let _fotoB64 = null;

  // Campos extras por etapa
  let extraHtml = '';
  if (etapaIdx === 2) {
    extraHtml = `
      <div class="fg" style="margin-top:8px">
        <label>Valor do Orçamento (R$)</label>
        <input type="number" id="ocm-valor" min="0" step="0.01" placeholder="0,00" value="${etDone?.valorOrcamento || ''}">
      </div>
      <div style="display:flex;align-items:center;gap:10px;margin-top:8px;padding:8px 0">
        <label for="ocm-recusado" style="font-size:14px;color:var(--txt1);cursor:pointer;flex:1">Orçamento Recusado?</label>
        <input type="checkbox" id="ocm-recusado" ${etDone?.orcamentoRecusado ? 'checked' : ''} style="width:18px;height:18px;cursor:pointer">
      </div>`;
  } else if (etapaIdx === 3) {
    extraHtml = `<div class="fg" style="margin-top:8px">
      <label>N° RC / Pedido</label>
      <input type="text" id="ocm-rc" placeholder="RC-000..." value="${etDone?.numeroRC || ''}">
    </div>`;
  } else if (etapaIdx === 7) {
    extraHtml = `<div class="fg" style="margin-top:8px">
      <label>N° Nota Fiscal</label>
      <input type="text" id="ocm-nf" placeholder="NF-000..." value="${etDone?.numeroNF || ''}">
    </div>`;
  }

  const dataVal = isDone ? etDone.data : hoje;
  const dataDisp = dataVal.split('-').reverse().join('/');

  const html = `
<div id="ocm-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:9990;display:flex;align-items:center;justify-content:center;padding:20px">
  <div style="background:var(--surf2);border:1px solid var(--bord);border-radius:var(--rs);width:100%;max-width:480px;max-height:92vh;overflow-y:auto;box-shadow:0 24px 60px rgba(0,0,0,.55)">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--bord)">
      <span style="font-size:15px;font-weight:700;color:var(--txt1)">${isDone ? '✏️ Editar' : '📝 Preencher'} Etapa ${etapaIdx} — ${et.label}</span>
      <button id="ocm-close" style="background:none;border:none;color:var(--txt3);font-size:18px;cursor:pointer;padding:4px;line-height:1">✕</button>
    </div>
    <div style="padding:20px">
      <p style="font-size:13px;color:var(--txt3);margin:0 0 16px">Ordem: <b style="color:var(--txt2)">${oc.id}</b> <span style="margin-left:8px">${oc.descricao || ''}</span></p>
      ${et.note ? `<p style="font-size:12px;color:var(--txt3);margin:0 0 14px">${et.note}</p>` : ''}
      <div class="fg">
        <label>Data de Conclusão <span style="color:#C41230">*</span></label>
        <input type="text" id="ocm-data-disp" placeholder="dd/mm/aaaa" maxlength="10" value="${dataDisp}"
          style="font-size:16px" oninput="
            var v=this.value.replace(/\D/g,'');
            if(v.length>2)v=v.slice(0,2)+'/'+v.slice(2);
            if(v.length>5)v=v.slice(0,5)+'/'+v.slice(5);
            this.value=v;
            var p=v.split('/');
            document.getElementById('ocm-data').value=(p[2]&&p[1]&&p[0])?p[2]+'-'+p[1]+'-'+p[0]:'';
          ">
        <input type="hidden" id="ocm-data" value="${dataVal}">
      </div>
      ${extraHtml}
      <div class="fg" style="margin-top:12px">
        <label>Observações <span style="font-weight:400;color:var(--txt3)">(opcional)</span></label>
        <textarea id="ocm-obs" rows="2" style="resize:vertical" placeholder="Anotações desta etapa...">${etDone?.obs || ''}</textarea>
      </div>
      <div class="fg" style="margin-top:12px">
        <label>Foto <span style="font-weight:400;color:var(--txt3)">(opcional)</span></label>
        ${etDone?.foto ? `<img src="${etDone.foto}" style="width:64px;height:64px;object-fit:cover;border-radius:6px;border:1px solid var(--bord);margin-bottom:8px;display:block">` : ''}
        <div id="ocm-drop" style="border:2px dashed var(--bord);border-radius:7px;padding:14px;text-align:center;cursor:pointer;color:var(--txt3);font-size:13px">
          📷 ${etDone?.foto ? 'Substituir foto' : 'Clique para anexar foto'}
          <input type="file" id="ocm-foto-inp" accept="image/*" style="display:none">
        </div>
        <div id="ocm-foto-prev"></div>
      </div>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:10px;padding:14px 20px;border-top:1px solid var(--bord)">
      <button id="ocm-cancel" class="btn btn-gh">Cancelar</button>
      <button id="ocm-salvar" class="btn btn-p">${isDone ? '✏️ Atualizar' : 'Salvar Etapa'}</button>
    </div>
  </div>
</div>`;

  document.body.insertAdjacentHTML('beforeend', html);
  const overlay = document.getElementById('ocm-overlay');

  // Foto bind
  const drop = overlay.querySelector('#ocm-drop');
  const inp  = overlay.querySelector('#ocm-foto-inp');
  drop.addEventListener('click', () => inp.click());
  inp.addEventListener('change', function () {
    const file = this.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const MAX_W = 1900, MAX_H = 1080;
        let { width: w, height: h } = img;
        if (w > MAX_W || h > MAX_H) { const r = Math.min(MAX_W/w, MAX_H/h); w=Math.round(w*r); h=Math.round(h*r); }
        const c = document.createElement('canvas'); c.width=w; c.height=h;
        c.getContext('2d').drawImage(img,0,0,w,h);
        _fotoB64 = c.toDataURL('image/jpeg', 0.85);
        overlay.querySelector('#ocm-foto-prev').innerHTML =
          `<img src="${_fotoB64}" style="width:64px;height:64px;object-fit:cover;border-radius:6px;border:1px solid var(--bord);margin-top:6px">`;
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  const fechar = () => overlay.remove();
  overlay.querySelector('#ocm-close').addEventListener('click', fechar);
  overlay.querySelector('#ocm-cancel').addEventListener('click', fechar);
  overlay.addEventListener('click', e => { if (e.target === overlay) fechar(); });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { fechar(); document.removeEventListener('keydown', esc); }
  });

  // Salvar
  overlay.querySelector('#ocm-salvar').addEventListener('click', function () {
    const dataIso = overlay.querySelector('#ocm-data').value;
    if (!dataIso) { alert('Informe a data.'); return; }

    const db = getDB();
    const oc2 = db.ordensCompra.find(o => o.id === oc.id);
    if (!oc2) return;

    oc2.etapas = oc2.etapas || {};
    oc2.etapas[etapaIdx] = {
      ...(oc2.etapas[etapaIdx] || {}),
      data: dataIso,
      obs:  overlay.querySelector('#ocm-obs')?.value?.trim() || '',
      foto: _fotoB64 || oc2.etapas[etapaIdx]?.foto || '',
    };

    // Campos extras
    if (etapaIdx === 2) {
      oc2.etapas[2].valorOrcamento  = overlay.querySelector('#ocm-valor')?.value  || '';
      oc2.etapas[2].orcamentoRecusado = overlay.querySelector('#ocm-recusado')?.checked || false;
      if (oc2.etapas[2].orcamentoRecusado) oc2.status = 'orcamento_recusado';
    }
    if (etapaIdx === 3) oc2.etapas[3].numeroRC = overlay.querySelector('#ocm-rc')?.value || '';
    if (etapaIdx === 7) {
      oc2.etapas[7].numeroNF = overlay.querySelector('#ocm-nf')?.value || '';
      oc2.status = 'concluida';
    }

    saveDB();
    fechar();
    _populateFiltroSala();
    _renderLista();
    _toast(`✅ Etapa ${etapaIdx} ${isDone ? 'atualizada' : 'registrada'}!`, 'ok');
  });
}

// ── Recusar orçamento ─────────────────────────────────────────────────────────

function _recusarOrcamento(oc) {
  if (!confirm(`Recusar o orçamento da ordem ${oc.id}?\nEssa ação encerrará a ordem como "Orçamento Recusado".`)) return;
  const db  = getDB();
  const oc2 = db.ordensCompra.find(o => o.id === oc.id);
  if (!oc2) return;
  oc2.status = 'orcamento_recusado';
  oc2.etapas[2] = { ...(oc2.etapas[2] || {}), orcamentoRecusado: true, data: oc2.etapas[2]?.data || new Date().toISOString().split('T')[0] };
  saveDB();
  _renderLista();
  _toast('🚫 Orçamento recusado. Ordem encerrada.', 'warn');
}

// ── Utils ─────────────────────────────────────────────────────────────────────

function _fmtDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('pt-BR'); } catch { return iso; }
}

function _fmtDateShort(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
  } catch { return iso; }
}

function _toast(msg, type) {
  let t = document.getElementById('oca-toast');
  if (!t) { t = document.createElement('div'); t.id = 'oca-toast'; document.body.appendChild(t); }
  const colors = { ok: { bg:'#14532d',color:'#86efac',border:'#22c55e' }, warn: { bg:'#713f12',color:'#fde68a',border:'#eab308' }, err: { bg:'#7f1d1d',color:'#fca5a5',border:'#ef4444' } };
  const c = colors[type] || colors.ok;
  Object.assign(t.style, { position:'fixed',bottom:'24px',right:'24px',zIndex:'9999',padding:'12px 20px',borderRadius:'8px',fontSize:'14px',fontWeight:'500',maxWidth:'360px',background:c.bg,color:c.color,border:`1px solid ${c.border}`,opacity:'1',transform:'translateY(0)',transition:'all .3s' });
  t.textContent = msg;
  clearTimeout(t._tid);
  t._tid = setTimeout(() => Object.assign(t.style, { opacity:'0', transform:'translateY(10px)' }), 5000);
}

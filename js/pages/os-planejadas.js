// SIGMAN v2.0 — pages/os-planejadas.js
// Rastreamento/execução das O.S. Planejadas (criadas em Planejamento
// PCM, ainda um stub separado — ver js/pages/os-planejamento.js).
// O fluxo de "Concluir" (marcar andamento / concluir de fato, gerando
// uma OS nova em db.ordens) já estava 100% implementado dentro de
// os-executadas.js (abrirConcluir + _concluir, tipo 'plan') — só
// reaproveitamos aqui, sem duplicar lógica.
import { getDB, saveDB } from '../api.js?v=20260718a';
import { v, fd, today, prio, tipoBadge, stBadge, openM, closeM, showToast, debounce } from '../utils.js?v=20260718a';
import { abrirConcluir } from './os-executadas.js?v=20260718a';

let _sort = { col: 'prazo', dir: 'asc' };
let _bound = false;

export function init() {
  if (!_bound) {
    _bound = true;
    document.getElementById('fp-tx')?.addEventListener('input', debounce(render, 280));
    ['fp-tp', 'fp-sl'].forEach(id => document.getElementById(id)?.addEventListener('change', render));
    document.querySelectorAll('#pg-planejadas th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.col;
        _sort = _sort.col === col ? { col, dir: _sort.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' };
        render();
      });
    });
    document.getElementById('mdp-editar-btn')?.addEventListener('click', () => {
      if (_curNumero) _abrirEditar(_curNumero);
    });
    document.getElementById('mdp-concluir-btn')?.addEventListener('click', () => {
      if (_curNumero) { closeM('m-det-plan'); abrirConcluir(_curNumero, 'plan'); }
    });
  }
  render();
}

// Status "efetivo" pra exibição: nada no app hoje marca uma planejada
// como 'Atrasada' automaticamente (só existia no enum e no mock) —
// calculamos aqui comparando prazo x hoje, sem alterar o status
// gravado (evita sobrescrever 'Em andamento' já registrado).
function _statusEfetivo(p) {
  if (p.status === 'Concluída') return 'Concluída';
  if (p.prazo && p.prazo < today()) return 'Atrasada';
  return p.status || 'Pendente';
}

function _populateFiltros() {
  const db = getDB();
  const slSel = document.getElementById('fp-sl');
  if (slSel) {
    const cur = slSel.value;
    const nomes = [...new Set((db.salas || []).map(s => s.nome))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    slSel.innerHTML = '<option value="">Todas as Salas</option>';
    nomes.forEach(s => slSel.innerHTML += `<option value="${s}">${s}</option>`);
    if (cur) slSel.value = cur;
  }
}

export function render() {
  const db = getDB();
  _populateFiltros();
  const tx = v('fp-tx').toLowerCase(), tp = v('fp-tp'), sl = v('fp-sl');
  let data = [...(db.planejadas || [])];
  if (tx) data = data.filter(p => [p.numero, p.sala, p.maq, p.descricao].some(x => x && x.toLowerCase().includes(tx)));
  if (tp) data = data.filter(p => p.tipo === tp);
  if (sl) data = data.filter(p => p.sala === sl);
  const pm = { '1': 1, '2': 2, '3': 3, '4': 4, 'Alta': 2, 'Média': 3, 'Baixa': 4, 'Urgente': 1 };
  data.sort((a, b) => {
    let va = a[_sort.col] || '', vb = b[_sort.col] || '';
    if (_sort.col === 'prioridade') { va = pm[va] || 9; vb = pm[vb] || 9; return _sort.dir === 'asc' ? va - vb : vb - va; }
    const c = String(va).localeCompare(String(vb), 'pt-BR', { numeric: true });
    return _sort.dir === 'asc' ? c : -c;
  });
  document.querySelectorAll('#pg-planejadas th.sortable').forEach(th => {
    th.classList.remove('asc', 'desc');
    if (th.dataset.col === _sort.col) th.classList.add(_sort.dir);
  });
  const nc = data.filter(p => _statusEfetivo(p) !== 'Concluída');
  const c  = data.filter(p => _statusEfetivo(p) === 'Concluída');
  _renderSecao('tb-plan-nc', nc, '✅', 'Nenhuma O.S. planejada pendente.');
  _renderSecao('tb-plan-c',  c,  '📋', 'Nenhuma O.S. planejada concluída ainda.');
  const ctNc = document.getElementById('ctp-nc'); if (ctNc) ctNc.textContent = `Não Concluídas (${nc.length})`;
  const ctC  = document.getElementById('ctp-c');  if (ctC)  ctC.textContent  = `Concluídas (${c.length})`;
  window._verDetPlan  = verDet;
  window._delPlan     = delPlanejada;
  window._concluirPlan = numero => abrirConcluir(numero, 'plan');
}

function _renderSecao(tbId, data, icone, msgVazia) {
  const tb = document.getElementById(tbId);
  if (!tb) return;
  if (!data.length) {
    const cls = icone === '✅' ? 'ei-ok' : 'ei';
    tb.innerHTML = `<tr><td colspan="8"><div class="empty"><div class="${cls}">${icone}</div><p>${msgVazia}</p></div></td></tr>`;
    return;
  }
  tb.innerHTML = data.map(_rowHtml).join('');
}

function _rowHtml(p) {
  const status = _statusEfetivo(p);
  const concluida = status === 'Concluída';
  const acoes = concluida
    ? `<button class="btn btn-sm btn-gh" onclick="window._verDetPlan('${p.numero}')">Ver</button>`
    : `<button class="btn btn-sm btn-p" onclick="window._concluirPlan('${p.numero}')">▶ Concluir</button>
       <button class="btn btn-sm btn-gh" onclick="window._verDetPlan('${p.numero}')">Ver</button>`;
  return `<tr>
    <td><span class="osn">${p.numero}</span></td>
    <td>${p.sala}</td>
    <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${p.maq}">${p.maq}</td>
    <td>${tipoBadge(p.tipo)}</td>
    <td>${prio(p.prioridade)}</td>
    <td style="font-size:12px;white-space:nowrap">${fd(p.prazo)}</td>
    <td>${stBadge(status)}</td>
    <td><div style="display:flex;gap:4px;flex-wrap:wrap">
      ${acoes}
      <button class="btn btn-d" onclick="window._delPlan('${p.numero}')">✕</button>
    </div></td>
  </tr>`;
}

let _curNumero = null;

function verDet(numero) {
  const db = getDB();
  const p = db.planejadas.find(x => x.numero === numero);
  if (!p) { showToast('Item não encontrado.', 'er'); return; }
  _curNumero = numero;
  const status = _statusEfetivo(p);
  const concluida = status === 'Concluída';
  document.getElementById('mdp-tit').textContent = p.numero;
  document.getElementById('mdp-b').innerHTML = `
    <div class="dr"><span class="dl">Sala</span><span class="dv">${p.sala}</span></div>
    <div class="dr"><span class="dl">Máquina</span><span class="dv">${p.maq}</span></div>
    <div class="dr"><span class="dl">Tipo</span><span class="dv">${tipoBadge(p.tipo)}</span></div>
    <div class="dr"><span class="dl">Prioridade</span><span class="dv">${prio(p.prioridade)}</span></div>
    <div class="dr"><span class="dl">Prazo</span><span class="dv">${fd(p.prazo)}</span></div>
    <div class="dr"><span class="dl">Horas Previstas</span><span class="dv">${p.horas || '—'}h</span></div>
    <div class="dr"><span class="dl">Status</span><span class="dv">${stBadge(status)}</span></div>
    <div class="dr" style="flex-direction:column;gap:8px"><span class="dl">Descrição do Serviço Planejado</span><span class="dv">${p.descricao || '—'}</span></div>
    ${p.manutExec || p.manut ? `<div class="dr"><span class="dl">Manutentor</span><span class="dv">${p.manutExec || p.manut}</span></div>` : ''}
    ${p.dataExec ? `<div class="dr"><span class="dl">Data Execução</span><span class="dv">${fd(p.dataExec)} · ${p.inicio || '—'}–${p.fim || '—'}</span></div>` : ''}
    ${p.servicoExec || p.desc2 ? `<div class="dr" style="flex-direction:column;gap:8px"><span class="dl">Serviço Executado</span><span class="dv">${p.servicoExec || p.desc2}</span></div>` : ''}
  `;
  const btnConcluir = document.getElementById('mdp-concluir-btn');
  if (btnConcluir) {
    btnConcluir.style.display = concluida ? 'none' : 'inline-block';
    btnConcluir.textContent = status === 'Em andamento' ? '▶ Continuar' : '▶ Concluir';
  }
  openM('m-det-plan');
}

function delPlanejada(numero) {
  if (!confirm(`Excluir ${numero}?`)) return;
  const db = getDB();
  db.planejadas = db.planejadas.filter(p => p.numero !== numero);
  saveDB();
  showToast(`${numero} excluída.`, 'ok');
  render();
}

// Edição dos campos "de planejamento" (tipo/prioridade/prazo/horas/
// descrição). Sala e Máquina ficam de fora de propósito — trocar o
// ativo de uma planejada já criada exigiria os mesmos dropdowns em
// cascata de Local/Ambiente/Sala/Máquina que existem na Abertura de
// OS (hierarquia.js); escopo maior, deixado pra quando o Planejamento
// PCM (js/pages/os-planejamento.js, ainda stub) for implementado.
function _abrirEditar(numero) {
  const db = getDB();
  const p = db.planejadas.find(x => x.numero === numero);
  if (!p) return;
  closeM('m-det-plan');
  document.getElementById('me-t').textContent = `Editar ${p.numero}`;
  document.getElementById('me-b').innerHTML = `
    <div class="fg-row">
      <div class="fg"><label>Tipo de Serviço</label>
        <select id="mep-tp">
          ${['Corretiva','Preventiva','Preditiva','Inspeção','Melhoria'].map(t=>`<option${t===p.tipo?' selected':''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="fg"><label>Prioridade</label>
        <select id="mep-pr">
          <option value="1"${p.prioridade==='1'?' selected':''}>1 – Crítico (Parada de Máquina)</option>
          <option value="2"${p.prioridade==='2'?' selected':''}>2 – Alta (Risco de Parada)</option>
          <option value="3"${p.prioridade==='3'?' selected':''}>3 – Média (Preventiva)</option>
          <option value="4"${p.prioridade==='4'?' selected':''}>4 – Baixa (Melhoria)</option>
        </select>
      </div>
      <div class="fg"><label>Prazo Limite</label><input type="date" id="mep-pz" value="${p.prazo||''}"></div>
      <div class="fg"><label>Horas por Turno</label><input type="number" id="mep-horas" min="1" max="24" value="${p.horas||8}"></div>
      <div class="fg fg-full"><label>Descrição do Serviço Planejado</label><textarea id="mep-ds">${p.descricao||''}</textarea></div>
    </div>`;
  document.getElementById('btn-edit-save').onclick = () => {
    const tipo = v('mep-tp'), prioridade = v('mep-pr'), prazo = v('mep-pz'),
          horas = parseInt(v('mep-horas')) || 8, descricao = v('mep-ds').trim();
    if (!descricao) { showToast('Descreva o serviço planejado.', 'er'); return; }
    Object.assign(p, { tipo, prioridade, prazo, horas, descricao });
    saveDB(); closeM('m-edit');
    showToast(`${p.numero} atualizada.`, 'ok');
    render();
  };
  openM('m-edit');
}

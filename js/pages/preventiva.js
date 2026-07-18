// ============================================================
// SIGMAN v2.0 — pages/preventiva.js
// ============================================================
// Portado de sigprod-muffato/js/preventiva.js (V1), adaptado ao
// modelo de dados do v2: lá o checklist era por "modelo" (texto livre,
// buscado via Google Apps Script `planos_list`/`planos_get`); aqui
// usa `familias_equipamento` + `preventiva_templates`, já desenhadas
// no schema.sql numa sessão anterior mas nunca usadas — ver
// mock/db.js (`familias`, `preventivaTemplates`, `preventivaExecucoes`).
//
// ⚠️ Escopo desta leva: só 3 famílias de exemplo têm checklist
// cadastrado (Termoformadora ULMA, Embutideira Handtmann, Fatiadora
// Weber — ver mock/db.js), cobrindo ~13 das 68 máquinas do mock. As
// tarefas são boas-práticas genéricas de manutenção industrial, não
// o histórico real de cada máquina — checklists das demais famílias
// (e revisão destas) ficam pendentes de cadastro (mesma convenção do
// projeto: mudança estrutural = editar mock/db.js direto, ou uma
// futura tela de administração de famílias/checklists).
// ============================================================

import { getDB, saveDB } from '../api.js?v=20260718a';
import { CU } from '../auth.js?v=20260718a';
import { v, sv, fd, today, showToast } from '../utils.js?v=20260718a';

let PLANO_ATUAL = { maquina: null, familia: null, tarefas: [] }; // tarefas: [{id,area,tarefa,...}]
let _bound = false;

export function init() {
  _populateSalas();
  _populateMaquinas();
  if (!_bound) {
    _bound = true;
    document.getElementById('prev-sala')?.addEventListener('change', _populateMaquinas);
    document.getElementById('prev-maq')?.addEventListener('change', _carregarChecklist);
    document.getElementById('btn-prev-save')?.addEventListener('click', _salvar);
    document.getElementById('btn-prev-print')?.addEventListener('click', _imprimir);
  }
  sv('prev-dt', '');
  sv('prev-hi', '');
  sv('prev-hf', '');
  if (CU?.perfil !== 'producao') sv('prev-mn', CU?.nome || '');
  document.getElementById('prev-body').innerHTML = '';
  PLANO_ATUAL = { maquina: null, familia: null, tarefas: [] };
}

function _populateSalas() {
  const db  = getDB();
  const sel = document.getElementById('prev-sala');
  if (!sel) return;
  const cur = sel.value;
  const nomes = [...new Set((db.salas || []).map(s => s.nome))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  sel.innerHTML = '<option value="">Todas as Salas</option>' + nomes.map(s => `<option value="${s}">${s}</option>`).join('');
  if (cur) sel.value = cur;
}

function _populateMaquinas() {
  const db  = getDB();
  const sel = document.getElementById('prev-maq');
  if (!sel) return;
  const salaNome = v('prev-sala');
  const salaIds = salaNome ? db.salas.filter(s => s.nome === salaNome).map(s => s.id) : null;
  const maqs = (db.maquinas || [])
    .filter(m => m.ativo !== false && (!salaIds || salaIds.includes(m.salaId)))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  sel.innerHTML = '<option value="">Selecione...</option>' +
    maqs.map(m => `<option value="${m.id}">${m.nome}${m.tag ? ' – ' + m.tag : ''}</option>`).join('');
  document.getElementById('prev-body').innerHTML = '';
  PLANO_ATUAL = { maquina: null, familia: null, tarefas: [] };
}

function _carregarChecklist() {
  const db   = getDB();
  const body = document.getElementById('prev-body');
  const maqId = v('prev-maq');
  if (!maqId) { body.innerHTML = ''; PLANO_ATUAL = { maquina: null, familia: null, tarefas: [] }; return; }

  const maq = db.maquinas.find(m => m.id === maqId);
  if (!maq) return;

  if (!maq.familiaId) {
    body.innerHTML = `<div class="card" style="padding:16px;text-align:center;color:var(--txt3)">
      Esta máquina ainda não tem família de equipamento cadastrada (sem checklist de preventiva vinculado).<br>
      <span style="font-size:12px">Cadastro de famílias/checklists é feito direto em <code>mock/db.js</code> por enquanto.</span>
    </div>`;
    PLANO_ATUAL = { maquina: maq, familia: null, tarefas: [] };
    return;
  }
  const familia = db.familias.find(f => f.id === maq.familiaId);
  const tarefas = (db.preventivaTemplates || [])
    .filter(t => t.familiaId === maq.familiaId && t.ativo !== false)
    .sort((a, b) => a.ordem - b.ordem);

  if (!tarefas.length) {
    body.innerHTML = `<div class="card" style="padding:16px;text-align:center;color:var(--txt3)">
      Família <b>${familia?.fabricante} ${familia?.tipo}</b> não tem tarefas de checklist cadastradas ainda.
    </div>`;
    PLANO_ATUAL = { maquina: maq, familia, tarefas: [] };
    return;
  }

  PLANO_ATUAL = { maquina: maq, familia, tarefas };
  const grupos = {};
  tarefas.forEach(t => { (grupos[t.area] = grupos[t.area] || []).push(t); });

  body.innerHTML = Object.entries(grupos).map(([area, ts]) => `
    <div class="card" style="margin-bottom:10px">
      <div class="card-t">${area}</div>
      ${ts.map(t => `
        <div class="prev-row" data-id="${t.id}" style="display:grid;grid-template-columns:1fr auto 1.5fr;gap:8px;align-items:center;padding:7px 0;border-bottom:1px solid var(--bord)">
          <div style="font-size:15px">${t.tarefa}</div>
          <div style="display:flex;gap:5px">
            <button type="button" class="iok" onclick="window._prevSetStatus('${t.id}','ok',this)">OK</button>
            <button type="button" class="inok" onclick="window._prevSetStatus('${t.id}','nok',this)">NOK</button>
            <button type="button" class="ina" onclick="window._prevSetStatus('${t.id}','na',this)">NA</button>
          </div>
          <div><input type="text" placeholder="Materiais / Observações" id="pvobs-${t.id}"
            style="background:var(--inp);border:1px solid var(--bord);border-radius:4px;color:var(--txt);font-size:14px;padding:4px 8px;width:100%;outline:none"></div>
          <input type="hidden" id="pvst-${t.id}" value="">
        </div>`).join('')}
    </div>`).join('');
  window._prevSetStatus = _setStatus;
}

function _setStatus(taskId, status, btn) {
  sv('pvst-' + taskId, status);
  const row = btn.closest('.prev-row');
  row.querySelectorAll('.iok,.inok,.ina').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
}

function _salvar() {
  const db = getDB();
  const { maquina, tarefas } = PLANO_ATUAL;
  const data = v('prev-dt'), manut = v('prev-mn').trim(), per = v('prev-periodo');
  const horaIni = v('prev-hi'), horaFim = v('prev-hf');

  if (!maquina || !data || !manut) { showToast('Selecione máquina, data e manutentor.', 'er'); return; }
  if (!tarefas.length) { showToast('Esta máquina não tem checklist carregado.', 'er'); return; }

  const agora = new Date().toISOString();
  let algumPreenchido = false;

  db.preventivaExecucoes = db.preventivaExecucoes || [];
  tarefas.forEach(t => {
    const status = v('pvst-' + t.id);
    if (!status) return;
    algumPreenchido = true;
    db.preventivaExecucoes.push({
      id: crypto.randomUUID(), maquinaId: maquina.id, templateId: t.id,
      tarefa: t.tarefa, area: t.area, periodicidade: per,
      manutentorLogin: CU?.login || '', manutentorNome: manut,
      dataExecucao: data, horaInicio: horaIni, horaFim: horaFim,
      materiais: v('pvobs-' + t.id), status, observacoes: '', criadoEm: agora,
    });
  });

  if (!algumPreenchido) { showToast('Marque OK/NOK/NA em pelo menos uma tarefa.', 'er'); return; }
  saveDB();
  showToast('Preventiva salva!', 'ok');
}

function _imprimir() {
  const { maquina, familia, tarefas } = PLANO_ATUAL;
  if (!maquina || !tarefas.length) { showToast('Carregue o checklist de uma máquina antes de imprimir.', 'er'); return; }

  const data = v('prev-dt') || '___/___/____', manut = v('prev-mn') || '_______________', per = v('prev-periodo') || 'Mensal';
  const horaIni = v('prev-hi') || '___:___', horaFim = v('prev-hf') || '___:___';
  const grupos = {};
  tarefas.forEach(t => { (grupos[t.area] = grupos[t.area] || []).push(t); });

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>ORDEM DE MANUTENÇÃO PREVENTIVA</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:13px;color:#000;padding:15mm}
h1{font-size:17px;text-align:center;color:#C41230;margin-bottom:4px}
h2{font-size:14px;margin:10px 0 4px;background:#f0f0f0;padding:4px 8px;border-left:3px solid #C41230}
.header{display:flex;justify-content:space-between;border-bottom:2px solid #C41230;padding-bottom:8px;margin-bottom:10px}
.info-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px}
.info-box{border:1px solid #ccc;border-radius:3px;padding:5px 8px}
.info-label{font-size:10px;color:#666;text-transform:uppercase}
.info-val{font-size:14px;font-weight:bold}
table{width:100%;border-collapse:collapse;margin-bottom:8px}
th{background:#C41230;color:#fff;padding:5px 7px;text-align:left;font-size:11px}
td{padding:5px 7px;border:1px solid #ddd}
.cb{width:14px;height:14px;border:1px solid #999;border-radius:2px;display:inline-block}
.assinatura{border-top:1px solid #000;width:180px;margin-top:30px;padding-top:4px;font-size:10px}
@media print{body{padding:10mm}}
</style></head><body>
<div class="header">
  <div><b>MUFFATO FOODS</b><br>Gestão de Manutenção — PCM</div>
  <div><h1>ORDEM DE MANUTENÇÃO PREVENTIVA</h1></div>
  <div style="text-align:right;font-size:11px">Doc: SIGMAN-PREV<br>Rev: 02</div>
</div>
<div class="info-grid">
  <div class="info-box"><div class="info-label">Máquina</div><div class="info-val">${maquina.nome}</div></div>
  <div class="info-box"><div class="info-label">Tag</div><div class="info-val">${maquina.tag || '___'}</div></div>
  <div class="info-box"><div class="info-label">Data</div><div class="info-val">${data === '___/___/____' ? data : fd(data)}</div></div>
  <div class="info-box"><div class="info-label">Periodicidade</div><div class="info-val">${per}</div></div>
  <div class="info-box" style="grid-column:span 2"><div class="info-label">Manutentor</div><div class="info-val">${manut}</div></div>
  <div class="info-box"><div class="info-label">Hora Início</div><div class="info-val">${horaIni}</div></div>
  <div class="info-box"><div class="info-label">Hora Fim</div><div class="info-val">${horaFim}</div></div>
</div>
${Object.entries(grupos).map(([area, ts]) => `
<h2>${area}</h2>
<table>
<tr><th style="width:60%">Tarefa</th><th style="width:8%">OK</th><th style="width:8%">NOK</th><th style="width:8%">NA</th><th>Materiais / Observações</th></tr>
${ts.map(t => `<tr>
  <td>${t.tarefa}</td>
  <td style="text-align:center"><span class="cb"></span></td>
  <td style="text-align:center"><span class="cb"></span></td>
  <td style="text-align:center"><span class="cb"></span></td>
  <td></td>
</tr>`).join('')}
</table>`).join('')}
<div style="display:flex;justify-content:space-between;margin-top:15px">
  <div><div class="assinatura">Assinatura do Manutentor</div></div>
  <div><div class="assinatura">Aprovação do Supervisor</div></div>
  <div><div class="assinatura">Revisão Próxima</div></div>
</div>
<script>window.print();<\/script></body></html>`);
  win.document.close();
}

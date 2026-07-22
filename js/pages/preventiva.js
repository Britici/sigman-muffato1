// ============================================================
// SIGMAN v2.0 — pages/preventiva.js
// ============================================================
// Só template de impressão — NÃO salva execução no app. Fluxo real:
//   1. PCM cria a O.S. Planejada (tipo Preventiva/Inspeção) em
//      Planejamento (os-planejamento.js).
//   2. Manutentor vem aqui, escolhe MÁQUINA + TIPO (Preventiva ou
//      Inspeção) e IMPRIME o checklist em branco (baseado na família
//      de equipamento — ver mock/db.js: familias / preventivaTemplates)
//      e preenche na mão durante o serviço.
//   3. De volta ao app, o manutentor dá baixa na O.S. Planejada
//      (O.S. Planejadas → Concluir), que gera a O.S. correlata em
//      Executadas — esse é o único registro que fica salvo no banco.
// Ou seja: esta tela não tem "Salvar", só "Imprimir". Fundida a
// partir de preventiva.js + inspecao-tmpl.js (eram duas telas quase
// idênticas, só cabeçalho do PDF mudava) — Tiago pediu unificar em
// um único menu com opção de tipo de documento na impressão.
// ============================================================

import { getDB } from '../api.js?v=20260722';

const DOCS = {
  preventiva: { titulo: 'ORDEM DE MANUTENÇÃO PREVENTIVA', doc: 'SIGMAN-PREV' },
  inspecao:   { titulo: 'ORDEM DE INSPEÇÃO',              doc: 'SIGMAN-INSP' },
};

let PLANO_ATUAL = { maquina: null, familia: null, tarefas: [] };
let TIPO_ATUAL = 'preventiva';
let _bound = false;

export function init() {
  _populateSalas();
  _populateMaquinas();
  if (!_bound) {
    _bound = true;
    document.getElementById('prev-sala')?.addEventListener('change', _populateMaquinas);
    document.getElementById('prev-maq')?.addEventListener('change', _carregarChecklist);
    document.getElementById('btn-prev-print')?.addEventListener('click', _imprimir);
    document.querySelectorAll('input[name="prev-tipo"]').forEach(r => {
      r.addEventListener('change', e => { TIPO_ATUAL = e.target.value; });
    });
  }
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
  const salaNome = document.getElementById('prev-sala')?.value || '';
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
  const maqId = document.getElementById('prev-maq')?.value;
  if (!maqId) { body.innerHTML = ''; PLANO_ATUAL = { maquina: null, familia: null, tarefas: [] }; return; }

  const maq = db.maquinas.find(m => m.id === maqId);
  if (!maq) return;

  if (!maq.familiaId) {
    body.innerHTML = `<div class="card" style="padding:16px;text-align:center;color:var(--txt3)">
      Esta máquina ainda não tem família de equipamento cadastrada (sem checklist vinculado).<br>
      <span style="font-size:12px">Cadastre a família em Ativos → Famílias de Equipamento.</span>
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

  // Só pré-visualização — sem botões OK/NOK/NA, sem input, nada disso
  // fica salvo no banco. O preenchimento de verdade é na folha impressa.
  body.innerHTML = `<div class="card"><div class="card-t">${familia.fabricante} ${familia.tipo} — pré-visualização do checklist</div>` +
    Object.entries(grupos).map(([area, ts]) => `
      <div style="margin-bottom:10px">
        <div style="font-family:var(--fw);font-size:12px;color:var(--txt3);font-variant:small-caps;margin-bottom:4px">${area}</div>
        ${ts.map(t => `<div style="font-size:14px;padding:5px 0;border-bottom:1px solid var(--bord)">${t.tarefa}</div>`).join('')}
      </div>`).join('') + `</div>`;
}

function _imprimir() {
  const { maquina, familia, tarefas } = PLANO_ATUAL;
  if (!maquina || !tarefas.length) { alert('Selecione uma máquina com checklist cadastrado antes de imprimir.'); return; }

  const { titulo, doc } = DOCS[TIPO_ATUAL] || DOCS.preventiva;
  const grupos = {};
  tarefas.forEach(t => { (grupos[t.area] = grupos[t.area] || []).push(t); });

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>${titulo}</title>
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
  <div><h1>${titulo}</h1></div>
  <div style="text-align:right;font-size:11px">Doc: ${doc}<br>Rev: 02</div>
</div>
<div class="info-grid">
  <div class="info-box"><div class="info-label">Máquina</div><div class="info-val">${maquina.nome}</div></div>
  <div class="info-box"><div class="info-label">Tag</div><div class="info-val">${maquina.tag || '___'}</div></div>
  <div class="info-box"><div class="info-label">Data</div><div class="info-val">___/___/____</div></div>
  <div class="info-box"><div class="info-label">Periodicidade</div><div class="info-val">_______________</div></div>
  <div class="info-box" style="grid-column:span 2"><div class="info-label">Manutentor</div><div class="info-val">_______________________________</div></div>
  <div class="info-box"><div class="info-label">Hora Início</div><div class="info-val">___:___</div></div>
  <div class="info-box"><div class="info-label">Hora Fim</div><div class="info-val">___:___</div></div>
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
<h2>Observações</h2>
<div style="border:1px solid #ccc;border-radius:3px;padding:8px 10px">
  ${Array.from({length:5}).map(() => `<div style="border-bottom:1px solid #ccc;height:22px"></div>`).join('')}
</div>
<div style="display:flex;justify-content:space-between;margin-top:15px">
  <div><div class="assinatura">Assinatura do Manutentor</div></div>
  <div><div class="assinatura">Aprovação do Supervisor</div></div>
  <div><div class="assinatura">Revisão Próxima</div></div>
</div>
<script>window.print();<\/script></body></html>`);
  win.document.close();
}

// ============================================================
// SIGMAN v2.0 — pages/inspecao.js
// Inspeção Diária (checklist por turno, OK/NÃO OK por equipamento)
// Portado de sigprod-muffato/js/inspecao.js (V1/Google Sheets)
// para ES6 + mock/localStorage (mesmo padrão do resto do V2).
//
// Diferença de arquitetura vs V1: o V1 usava uma lista hardcoded
// (INSP_TMPL) de salas/equipamentos com IDs fixos, desacoplada do
// cadastro real. Aqui o checklist é gerado dinamicamente a partir
// de db.maquinas (via Sala), restrito às máquinas com
// criticidade === 1 ("Crítico" — ver CRIT_LABEL em ativos.js),
// pra não duplicar/divergir do cadastro Ativos como fonte única
// de verdade. Sub-itens fixos (TESTE DE VÁCUO / IMPRESSORA) do V1
// eram específicos de termoformadoras ULMA — aqui viram sub-itens
// automáticos quando o nome da máquina contém "TERMOFORMADORA".
// ============================================================

import { getDB, saveDB, _genINSP } from '../api.js?v=20260722';
import { v, fd, openM, showAlert, showToast } from '../utils.js?v=20260722';
import { CU } from '../auth.js?v=20260722';

let _bound = false;
let _tmplCache = null; // [{sala, equips:[{id,nome,subs:[{id,nome}]}]}]

export function init() {
  _tmplCache = null; // recadastro pode ter mudado desde a última visita
  _populateManutentor();
  sv('insp-dt', today());
  _buildChecklist();
  if (!_bound) {
    _bound = true;
    document.getElementById('btn-insp-save')?.addEventListener('click', _salvar);
    document.getElementById('btn-insp-save2')?.addEventListener('click', _salvar);
    document.getElementById('btn-insp-rel')?.addEventListener('click', _gerarRelatorio);
    document.getElementById('btn-insp-rel2')?.addEventListener('click', _gerarRelatorio);
    document.getElementById('btn-insp-print')?.addEventListener('click', _imprimir);
    document.getElementById('btn-insp-print2')?.addEventListener('click', _imprimir);
  }
}

function sv(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
function today() { return new Date().toISOString().slice(0, 10); }

function _populateManutentor() {
  const el = document.getElementById('insp-mn');
  if (el && !el.value && CU?.nome) el.value = CU.nome;
}

// ── Monta o template a partir do cadastro Ativos ─────────────

function _buildTemplate() {
  if (_tmplCache) return _tmplCache;
  const db = getDB();
  const salasMap = new Map(db.salas.map(s => [s.id, s]));
  const porSala = new Map();

  db.maquinas
    .filter(m => m.ativo && m.criticidade === 1)
    .forEach(m => {
      const sala = salasMap.get(m.salaId);
      const salaNome = sala ? sala.nome : (m.salaId || 'SEM SALA');
      if (!porSala.has(salaNome)) porSala.set(salaNome, []);
      const subs = /TERMOFORMADORA/i.test(m.nome)
        ? [
            { id: m.id + '_VAC', nome: 'TESTE DE VÁCUO' },
            { id: m.id + '_IMP', nome: 'TESTE DE IMPRESSORA' },
          ]
        : [];
      porSala.get(salaNome).push({ id: m.id, nome: m.nome, subs });
    });

  _tmplCache = [...porSala.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([sala, equips]) => ({ sala, equips }));
  return _tmplCache;
}

// ── Render do checklist ───────────────────────────────────────

function _buildChecklist() {
  const c = document.getElementById('insp-secs');
  if (!c) return;
  const tmpl = _buildTemplate();

  if (!tmpl.length) {
    c.innerHTML = `<div class="alert er on" style="position:static">
      Nenhuma máquina com criticidade "1 – Crítico" cadastrada em Ativos.
      Marque as máquinas críticas em Ativos para que apareçam aqui.
    </div>`;
    return;
  }

  c.innerHTML = tmpl.map(sec => `
    <div class="insp-sec open">
      <div class="insp-hd">
        <div class="insp-ht">${sec.sala}</div>
        <span class="insp-chev">▶</span>
      </div>
      <div class="insp-bd">
        ${sec.equips.map(_renderEquip).join('')}
      </div>
    </div>`).join('');

  c.querySelectorAll('.insp-hd').forEach(hd =>
    hd.addEventListener('click', () => hd.parentElement.classList.toggle('open')));
  c.querySelectorAll('.iok, .inok').forEach(btn =>
    btn.addEventListener('click', () => _setStatus(btn)));
}

function _renderEquip(eq) {
  let html = `
    <div class="insp-row" id="row-${eq.id}">
      <div class="insp-eq">${eq.nome}</div>
      <div class="insp-btns">
        <button type="button" class="iok" data-id="${eq.id}" data-st="ok">OK</button>
        <button type="button" class="inok" data-id="${eq.id}" data-st="nok">NÃO OK</button>
      </div>
      <div class="itime"><input type="time" id="t-${eq.id}"></div>
      <div class="iobs"><input type="text" id="o-${eq.id}" placeholder="Observações..."></div>
    </div>`;
  if (eq.subs.length) {
    html += `<div class="insp-sub-lbl">${eq.nome} — Sub-itens</div><div class="insp-sub">`;
    html += eq.subs.map(s => `
      <div class="insp-row" id="row-${s.id}">
        <div class="insp-eq">${s.nome}</div>
        <div class="insp-btns">
          <button type="button" class="iok" data-id="${s.id}" data-st="ok">OK</button>
          <button type="button" class="inok" data-id="${s.id}" data-st="nok">NÃO OK</button>
        </div>
        <div class="itime"><input type="time" id="t-${s.id}"></div>
        <div class="iobs"><input type="text" id="o-${s.id}" placeholder="Observações..."></div>
      </div>`).join('');
    html += '</div>';
  }
  return html;
}

function _setStatus(btn) {
  const id = btn.dataset.id, st = btn.dataset.st;
  const row = document.getElementById('row-' + id);
  if (!row) return;
  row.querySelectorAll('.iok, .inok').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  row.dataset.status = st;
  if (st === 'ok') {
    const ti = document.getElementById('t-' + id);
    if (ti && !ti.value) {
      const now = new Date();
      ti.value = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    }
  }
}

// ── Coleta / salvar ────────────────────────────────────────────

function _collect() {
  const tmpl = _buildTemplate();
  return tmpl.map(sec => ({
    sala: sec.sala,
    equips: sec.equips.map(eq => {
      const row = document.getElementById('row-' + eq.id);
      const subs = eq.subs.map(s => {
        const sr = document.getElementById('row-' + s.id);
        return sr ? { id: s.id, nome: s.nome, status: sr.dataset.status || '', hora: v('t-' + s.id), obs: v('o-' + s.id) } : null;
      }).filter(Boolean);
      return {
        id: eq.id, nome: eq.nome,
        status: row?.dataset.status || '', hora: v('t-' + eq.id), obs: v('o-' + eq.id),
        subs,
      };
    }),
  }));
}

async function _salvar() {
  const data = v('insp-dt'), turno = v('insp-tn'), manut = v('insp-mn').trim();
  const horas = parseInt(v('insp-horas')) || 8;
  if (!data || !manut) { showAlert('al-insp', 'Informe data e manutentor.', 'er'); return; }

  const itens = _collect();
  const totalAvaliado = itens.reduce((n, sec) =>
    n + sec.equips.filter(e => e.status).length + sec.equips.reduce((m, e) => m + e.subs.filter(s => s.status).length, 0), 0);
  if (totalAvaliado === 0) { showAlert('al-insp', 'Marque OK/NÃO OK em pelo menos um item.', 'er'); return; }

  const db = getDB();
  const numero = _genINSP();
  db.inspecoes.push({
    id: numero, numero, data, turno, horasTurno: horas, manut, itens,
    criadoEm: new Date().toISOString(),
  });
  saveDB();
  showAlert('al-insp', `Inspeção ${numero} salva! ${totalAvaliado} itens registrados.`, 'ok');
  showToast(`Inspeção ${numero} salva.`, 'ok');
}

// ── Relatório (texto pra WhatsApp) ──────────────────────────────

function _gerarTexto(insp) {
  let txt = `*INSPEÇÃO DIÁRIA — ${fd(insp.data)} — ${insp.turno}*\n*Manutentor: ${insp.manut}*\n\n`;
  if (!insp.itens?.length) return txt + '(sem itens registrados)';
  insp.itens.forEach(sec => {
    const linhas = [];
    sec.equips.forEach(eq => {
      if (eq.status) linhas.push(`${eq.nome} / ${eq.status === 'ok' ? 'ok' : 'Não vai rodar'}${eq.hora ? ' ' + eq.hora + 'h' : ''}${eq.obs ? ' – ' + eq.obs : ''}`);
      (eq.subs || []).forEach(s => {
        if (s.status) linhas.push(`  ${s.nome} / ${s.status === 'ok' ? 'ok' : 'Não vai rodar'}${s.hora ? ' ' + s.hora + 'h' : ''}${s.obs ? ' – ' + s.obs : ''}`);
      });
    });
    if (linhas.length) txt += `● Sala: ${sec.sala}\n${linhas.join('\n')}\n\n`;
  });
  return txt;
}

function _gerarRelatorio() {
  const pgAtiva = document.getElementById('pg-inspecao')?.classList.contains('on');
  let txt = '';
  if (pgAtiva) {
    const itens = _collect();
    txt = _gerarTexto({ data: v('insp-dt'), turno: v('insp-tn'), manut: v('insp-mn'), itens });
  } else {
    const db = getDB();
    const last = [...db.inspecoes].sort((a, b) => (b.data || '').localeCompare(a.data || ''))[0];
    if (last) txt = _gerarTexto(last);
  }
  if (!txt) { showToast('Nenhuma inspeção pra gerar relatório.', 'war'); return; }
  const body = document.getElementById('m-rel-b');
  if (body) body.textContent = txt;
  openM('m-rel');
}

// ── Impressão ────────────────────────────────────────────────
// Mesmo padrão visual de preventiva.js: cabeçalho MUFFATO FOODS,
// tabela por seção, bloco "Observações" com 5 linhas em branco
// antes das assinaturas. Imprime o estado atual do checklist na
// tela (itens já marcados aparecem com X; itens em branco saem
// como caixa vazia, pra preencher à mão se necessário).

function _imprimir() {
  const itens = _collect();
  const temItem = itens.some(sec => sec.equips.length);
  if (!temItem) { showToast('Nenhum item no checklist pra imprimir.', 'war'); return; }

  const data = v('insp-dt'), turno = v('insp-tn'), manut = v('insp-mn'), horas = v('insp-horas');

  const linhas = itens.map(sec => {
    const rows = [];
    sec.equips.forEach(eq => {
      rows.push(_linhaImpressao(eq.nome, eq.status, eq.hora, eq.obs, false));
      (eq.subs || []).forEach(s => rows.push(_linhaImpressao(s.nome, s.status, s.hora, s.obs, true)));
    });
    if (!rows.length) return '';
    return `<h2>${sec.sala}</h2>
<table>
<tr><th style="width:50%">Equipamento</th><th style="width:8%">OK</th><th style="width:8%">NOK</th><th>Hora / Observações</th></tr>
${rows.join('')}
</table>`;
  }).join('');

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>INSPEÇÃO DIÁRIA</title>
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
.cb{width:14px;height:14px;border:1px solid #999;border-radius:2px;display:inline-block;text-align:center;line-height:14px;font-weight:bold}
.assinatura{border-top:1px solid #000;width:180px;margin-top:30px;padding-top:4px;font-size:10px}
@media print{body{padding:10mm}}
</style></head><body>
<div class="header">
  <div><b>MUFFATO FOODS</b><br>Gestão de Manutenção — PCM</div>
  <div><h1>INSPEÇÃO DIÁRIA</h1></div>
  <div style="text-align:right;font-size:11px">Doc: SIGMAN-INSP<br>Rev: 01</div>
</div>
<div class="info-grid">
  <div class="info-box"><div class="info-label">Data</div><div class="info-val">${data ? fd(data) : '___/___/____'}</div></div>
  <div class="info-box"><div class="info-label">Turno</div><div class="info-val">${turno || '_______________'}</div></div>
  <div class="info-box"><div class="info-label">Horas do Turno</div><div class="info-val">${horas || '___'}h</div></div>
  <div class="info-box"><div class="info-label">Manutentor</div><div class="info-val">${manut || '_______________________________'}</div></div>
</div>
${linhas}
<h2>Observações</h2>
<div style="border:1px solid #ccc;border-radius:3px;padding:8px 10px">
  ${Array.from({length:5}).map(() => `<div style="border-bottom:1px solid #ccc;height:22px"></div>`).join('')}
</div>
<div style="display:flex;justify-content:space-between;margin-top:15px">
  <div><div class="assinatura">Assinatura do Manutentor</div></div>
  <div><div class="assinatura">Visto do Supervisor</div></div>
</div>
<script>window.print();<\/script></body></html>`);
  win.document.close();
}

function _linhaImpressao(nome, status, hora, obs, isSub) {
  const ok = status === 'ok', nok = status === 'nok';
  const nomeCel = isSub ? `<span style="padding-left:14px;font-size:11px;color:#444">↳ ${nome}</span>` : nome;
  return `<tr>
  <td>${nomeCel}</td>
  <td style="text-align:center"><span class="cb">${ok ? 'X' : ''}</span></td>
  <td style="text-align:center"><span class="cb">${nok ? 'X' : ''}</span></td>
  <td>${hora ? hora + 'h' : ''}${obs ? ' — ' + obs : ''}</td>
</tr>`;
}

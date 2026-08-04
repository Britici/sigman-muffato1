// ============================================================
// SIGMAN v2.0 — pages/analise-causa-raiz.js
// ============================================================
// PCM · Qualidade — RAC (Relatório de Análise de Causa Raiz).
// Portado da V1 (sigman-muffato/js/racr.js), adaptado ao schema e
// convenções da V2 — layout das 7 seções idêntico à V1, sem o bloco
// de fotos/upload (V2 não tem backend de Drive; se precisar, revisar
// junto com a decisão de storage do projeto).
//
// IMPORTANTE: o modal #mb-rac e os campos rac-* JÁ EXISTIAM em
// index.html, e o gatilho "Gerar RAC" a partir de uma O.S. corretiva
// (abrirRAC(os), em os-executadas.js) já estava implementado e
// funcional — só faltava este módulo pra fechar o ciclo. Os nomes de
// campo e o padrão window._racOsRef seguem o que já estava lá, sem
// renomear (evita quebrar a integração existente).
// ============================================================

import { getDB, saveDB, _genRAC } from '../api.js?v=20260803b';
import { CU } from '../auth.js?v=20260803b';
import { v, sv, fd, today, openM, closeM, showAlert, showToast, setupPhotoPreview } from '../utils.js?v=20260803b';
import { salasNoEscopo } from '../hierarquia.js?v=20260803b';

// DOM desta página é estático (router só alterna .on) — bind único.
let _bound = false;
// Fotos anexadas no modal (mesmo padrão do modal de Concluir em
// os-executadas.js: só o preview visual e esta variável são resetados
// ao abrir um RAC novo — o array interno de setupPhotoPreview não tem
// um método de reset externo).
let _fotosDataUrl = [];

export function init() {
  if (!_bound) {
    _bound = true;
    document.getElementById('btn-novo-rac')?.addEventListener('click', _abrirNovo);
    document.getElementById('rac-sala')?.addEventListener('change', _populateEquip);
    document.getElementById('btn-rac-save')?.addEventListener('click', _salvar);
    document.getElementById('btn-rac-print')?.addEventListener('click', _imprimir);
    setupPhotoPreview('rac-photo-input', 'rac-photo-preview', (dataUrls) => { _fotosDataUrl = dataUrls; });
  }
  _render();
}

// Usado tanto por _abrirNovo() (botão local) quanto por abrirRAC() em
// os-executadas.js (RAC gerado a partir de uma OS) — os dois abrem um
// RAC "em branco" quanto a fotos/anexos.
export function resetFotos() {
  _fotosDataUrl = [];
  const prev = document.getElementById('rac-photo-preview');
  if (prev) prev.innerHTML = '<span style="color:var(--txt3);font-size:13px">📷 Clique para anexar foto(s)</span>';
  const inputFoto = document.getElementById('rac-photo-input');
  if (inputFoto) inputFoto.value = '';
}

// ── Abrir modal em branco (botão "+ Novo RAC" da página) ──────────
function _abrirNovo() {
  window._racOsRef = null;
  const db = getDB();
  const salaSel = document.getElementById('rac-sala');
  if (salaSel) {
    const escopo = salasNoEscopo(CU);
    const salas = (db.salas || [])
      .filter(s => s.ativo !== false && (escopo === null || escopo.includes(s.id)))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    salaSel.innerHTML = '<option value="">Selecione...</option>' +
      salas.map(s => `<option value="${s.nome}">${s.nome}</option>`).join('');
    salaSel.removeAttribute('disabled');
  }
  const equipSel = document.getElementById('rac-equip');
  if (equipSel) { equipSel.innerHTML = '<option value="">Selecione a sala</option>'; equipSel.removeAttribute('disabled'); }
  ['rac-falha', 'rac-causa', 'rac-p1', 'rac-p2', 'rac-p3', 'rac-p4', 'rac-p5',
   'rac-imediata', 'rac-preventiva', 'rac-resp-prod', 'rac-resp-manu', 'rac-exec'].forEach(id => sv(id, ''));
  sv('rac-data', today());
  sv('rac-hora', new Date().toTimeString().slice(0, 5));
  resetFotos();
  const btnSave = document.getElementById('btn-rac-save');
  if (btnSave) btnSave.style.display = '';
  openM('mb-rac');
}

function _populateEquip() {
  const db = getDB();
  const equipSel = document.getElementById('rac-equip');
  if (!equipSel) return;
  const salaNome = v('rac-sala');
  if (!salaNome) { equipSel.innerHTML = '<option value="">Selecione a sala</option>'; return; }
  const maqs = (db.maquinas || [])
    .filter(m => m.ativo !== false && (db.salas || []).find(s => s.id === m.salaId)?.nome === salaNome)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  equipSel.innerHTML = '<option value="">Selecione...</option>' +
    maqs.map(m => `<option value="${m.nome}">${m.nome}</option>`).join('');
}

// ── Salvar RAC (novo) ───────────────────────────────────────────────
function _salvar() {
  const db = getDB();
  const falha = v('rac-falha').trim();
  if (!falha) { showAlert('al-rac', 'Informe a falha identificada.', 'er'); return; }
  const equipamento = v('rac-equip').trim(), sala = v('rac-sala').trim();
  if (!equipamento || !sala) { showAlert('al-rac', 'Selecione sala e equipamento.', 'er'); return; }

  const maq = (db.maquinas || []).find(m => m.nome === equipamento);
  const criticidade = maq?.criticidade || '';
  const numero = _genRAC();
  const agora = new Date().toISOString();
  const rac = {
    numero, dataAbertura: v('rac-data') || today(), osRef: window._racOsRef || '',
    equipamento, sala, criticidade, tempoParada: 0,
    falha,
    causaRaiz: v('rac-causa').trim(),
    why1: v('rac-p1').trim(), why2: v('rac-p2').trim(), why3: v('rac-p3').trim(),
    why4: v('rac-p4').trim(), why5: v('rac-p5').trim(),
    acaoImediata: v('rac-imediata').trim(), acaoPreventiva: v('rac-preventiva').trim(),
    respProd: v('rac-resp-prod').trim(), respManu: v('rac-resp-manu').trim(), executantes: v('rac-exec').trim(),
    status: 'Aberto', dataFechamento: '', fechadoPor: '', criadoEm: agora,
    fotos: _fotosDataUrl.slice(),
  };
  db.racs = db.racs || [];
  db.racs.push(rac);
  saveDB();
  closeM('mb-rac');
  window._racOsRef = null;
  resetFotos();
  showToast(`${numero} criado.`, 'ok');
  _render();
}

// ── Encerrar / Ver ───────────────────────────────────────────────────
function _encerrar(numero) {
  if (!confirm('Confirmar encerramento deste RAC?')) return;
  const db = getDB();
  const r = (db.racs || []).find(x => x.numero === numero);
  if (!r) return;
  r.status = 'Fechado';
  r.dataFechamento = today();
  r.fechadoPor = CU?.nome || '';
  saveDB();
  showToast(`${numero} encerrado.`, 'ok');
  _render();
}

// Modal de visualização é somente-leitura: status "Fechado" é imutável,
// e reabrir um "Aberto" pra edição não foi pedido como caso de uso.
// Salvar cria um RAC NOVO se clicado (mesmo _salvar do form em branco),
// então escondemos o botão aqui pra não induzir a um clique enganoso.
function _ver(numero) {
  const db = getDB();
  const r = (db.racs || []).find(x => x.numero === numero);
  if (!r) return;
  window._racOsRef = r.osRef || null;
  const salaSel = document.getElementById('rac-sala');
  if (salaSel) { salaSel.innerHTML = `<option value="${r.sala}">${r.sala}</option>`; salaSel.setAttribute('disabled', ''); }
  const equipSel = document.getElementById('rac-equip');
  if (equipSel) { equipSel.innerHTML = `<option value="${r.equipamento}">${r.equipamento}</option>`; equipSel.setAttribute('disabled', ''); }
  sv('rac-data', r.dataAbertura); sv('rac-hora', '');
  sv('rac-falha', r.falha); sv('rac-causa', r.causaRaiz);
  sv('rac-p1', r.why1); sv('rac-p2', r.why2); sv('rac-p3', r.why3); sv('rac-p4', r.why4); sv('rac-p5', r.why5);
  sv('rac-imediata', r.acaoImediata); sv('rac-preventiva', r.acaoPreventiva);
  sv('rac-resp-prod', r.respProd); sv('rac-resp-manu', r.respManu); sv('rac-exec', r.executantes);
  const prev = document.getElementById('rac-photo-preview');
  if (prev) {
    const fotos = r.fotos || [];
    prev.innerHTML = fotos.length
      ? `<div style="display:flex;flex-wrap:wrap;gap:8px">${fotos.map(url =>
          `<img src="${url}" class="photo-thumb" alt="Evidência">`).join('')}</div>`
      : `<span style="color:var(--txt3);font-size:13px">Sem fotos anexadas</span>`;
  }
  const inputFoto = document.getElementById('rac-photo-input');
  if (inputFoto) inputFoto.value = '';
  const btnSave = document.getElementById('btn-rac-save');
  if (btnSave) btnSave.style.display = 'none';
  openM('mb-rac');
}

// ── Renderiza as duas tabelas ─────────────────────────────────────────
function _render() {
  const tbAbertos = document.getElementById('tb-rac-abertos');
  const tbFechados = document.getElementById('tb-rac-fechados');
  if (!tbAbertos || !tbFechados) return;
  const db = getDB();
  const todos = db.racs || [];
  const abertos = todos.filter(r => r.status !== 'Fechado');
  const fechados = todos.filter(r => r.status === 'Fechado');

  tbAbertos.innerHTML = abertos.length ? abertos.map(r => `
    <tr>
      <td class="osn">${r.numero}</td>
      <td>${fd(r.dataAbertura)}</td>
      <td>${r.equipamento || '—'}</td>
      <td style="max-width:220px;white-space:normal">${r.falha || '—'}</td>
      <td><span class="badge">${r.status}</span></td>
      <td style="display:flex;gap:5px;flex-wrap:wrap">
        <button class="btn btn-sm btn-gh" onclick="window._racVer('${r.numero}')">👁 Ver</button>
        <button class="btn btn-sm btn-g" onclick="window._racEncerrar('${r.numero}')">✅ Encerrar</button>
      </td>
    </tr>`).join('')
    : `<tr><td colspan="6" class="empty"><div class="ei">✅</div><p>Nenhum RAC em aberto</p></td></tr>`;

  tbFechados.innerHTML = fechados.length ? fechados.map(r => `
    <tr>
      <td class="osn">${r.numero}</td>
      <td>${fd(r.dataAbertura)}</td>
      <td>${r.equipamento || '—'}</td>
      <td>${fd(r.dataFechamento)}</td>
      <td><button class="btn btn-sm btn-gh" onclick="window._racVer('${r.numero}')">👁 Ver</button></td>
    </tr>`).join('')
    : `<tr><td colspan="5" class="empty"><div class="ei">✅</div><p>Nenhum RAC encerrado</p></td></tr>`;

  window._racVer = _ver;
  window._racEncerrar = _encerrar;
}

// ── Impressão ──────────────────────────────────────────────────────
function _imprimir() {
  const win = window.open('', '_blank');
  const data = v('rac-data') || today(), hora = v('rac-hora') || '';
  const campo = id => (document.getElementById(id)?.value || '—');
  win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
  <title>RAC — ${campo('rac-equip')}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:12px;color:#000;padding:10mm 12mm}
    h1{font-size:18px;font-weight:800;color:#C41230}
    .sub{font-size:11px;color:#555;margin-bottom:10px}
    .bar{background:linear-gradient(90deg,#d99a1f,#B8972A);color:#fff;font-weight:700;font-size:12px;
      padding:5px 10px;margin:10px 0 6px;text-transform:uppercase;letter-spacing:.5px;border-radius:2px}
    .grid{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px}
    .field label{font-size:9px;font-weight:700;color:#888;text-transform:uppercase;display:block}
    .field p{border-bottom:1px solid #ccc;min-height:16px;padding:2px 0;font-size:12px}
    .why-item{display:flex;gap:6px;margin-bottom:8px;align-items:flex-start}
    .why-num{background:#C41230;color:#fff;font-weight:700;font-size:10px;border-radius:50%;
      width:16px;height:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .why-line{flex:1;border-bottom:1px solid #ccc;min-height:14px;padding:1px 0}
    .assinaturas{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:24px}
    .ass{border-top:1px solid #000;padding-top:4px;font-size:11px;text-align:center}
    @media print{body{padding:6mm 8mm}}
  </style></head><body>
  <h1>RELATÓRIO DE ANÁLISE DE CAUSA RAIZ</h1>
  <div class="sub">Muffato Foods — SIGMAN · ${fd(data)} ${hora}</div>

  <div class="bar">1 — Identificação</div>
  <div class="grid">
    <div class="field"><label>Sala</label><p>${campo('rac-sala')}</p></div>
    <div class="field"><label>Equipamento</label><p>${campo('rac-equip')}</p></div>
    <div class="field"><label>Data</label><p>${fd(data)}</p></div>
    <div class="field"><label>Hora da Parada</label><p>${hora || '—'}</p></div>
  </div>

  <div class="bar">2 — Falha / Defeito Identificado</div>
  <div class="field"><p style="min-height:26px">${campo('rac-falha')}</p></div>

  <div class="bar">3 — Causa Raiz</div>
  <div class="field"><p style="min-height:26px">${campo('rac-causa')}</p></div>

  <div class="bar">4 — Análise dos 5 Porquês</div>
  ${['rac-p1', 'rac-p2', 'rac-p3', 'rac-p4', 'rac-p5'].map((id, i) => `
  <div class="why-item"><div class="why-num">${i + 1}</div><div class="why-line">${campo(id)}</div></div>`).join('')}

  <div class="bar">5 — Ação Imediata</div>
  <div class="field"><p style="min-height:26px">${campo('rac-imediata')}</p></div>

  <div class="bar">6 — Ação Preventiva</div>
  <div class="field"><p style="min-height:26px">${campo('rac-preventiva')}</p></div>

  <div class="bar">7 — Equipe Responsável</div>
  <div class="field"><label>Resp. Produção</label><p>${campo('rac-resp-prod')}</p></div>
  <div class="field"><label>Resp. Manutenção</label><p>${campo('rac-resp-manu')}</p></div>
  <div class="field"><label>Executantes</label><p>${campo('rac-exec')}</p></div>

  <div class="assinaturas">
    <div class="ass">Responsável Produção</div>
    <div class="ass">Responsável Manutenção</div>
    <div class="ass">Coordenador / Supervisor</div>
  </div>
  <script>window.print();<\/script>
  </body></html>`);
  win.document.close();
}

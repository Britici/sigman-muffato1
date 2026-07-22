// ============================================================
// SIGMAN v2.0 — pages/oc-solicitacao.js
// Solicitação de Ordem de Compra
// Portado de modulo-compras-solicitacao.js (V1/Google Sheets)
// para ES6 + mock/localStorage (mesmo padrão do resto do V2).
// ============================================================

import { getDB, saveDB, _genOC } from '../api.js?v=20260722';

const PRIORIDADES = [
  { val: '1', label: '1 – Emergencial', desc: 'Processo parado – compra imediata' },
  { val: '2', label: '2 – Urgente',     desc: 'Risco de parada em até 15 dias'   },
  { val: '3', label: '3 – Médio',       desc: 'Entrega em até 45 dias'            },
  { val: '4', label: '4 – Baixo',       desc: 'Entrega em até 90 dias'            },
];
const TIPOS_ACAO = ['Corretiva', 'Preventiva', 'Melhoria', 'Instalação', 'Reforma', 'Outros'];

let _fotos = [];
let _bound = false;

export function init() {
  _render();
  if (!_bound) {
    _bound = true;
    document.getElementById('ocs-sala')?.addEventListener('change', _onSalaChange);
    document.getElementById('ocs-btn-limpar')?.addEventListener('click', _limpar);
    document.getElementById('form-ocs')?.addEventListener('submit', _submit);
    _bindFotos();
  }
  _populateSalas();
}

// ── Render ─────────────────────────────────────────────────────────────────

function _render() {
  const body = document.getElementById('ocs-body');
  if (!body) return;

  const opsPri = PRIORIDADES.map(p =>
    `<option value="${p.val}">${p.label} · ${p.desc}</option>`).join('');
  const opsTipo = TIPOS_ACAO.map(t =>
    `<option value="${t}">${t}</option>`).join('');

  body.innerHTML = `
<form id="form-ocs" novalidate autocomplete="off">

  <!-- IDENTIFICAÇÃO -->
  <div class="card">
    <div class="card-t">Identificação</div>
    <div class="fg-row">
      <div class="fg">
        <label>Prioridade <span style="color:#C41230">*</span></label>
        <select id="ocs-prioridade" required>
          <option value="">Selecione...</option>${opsPri}
        </select>
      </div>
      <div class="fg">
        <label>Tipo de Ação <span style="color:#C41230">*</span></label>
        <select id="ocs-tipo" required>
          <option value="">Selecione...</option>${opsTipo}
        </select>
      </div>
    </div>
    <div class="fg-row">
      <div class="fg"><label>Sala / Local <span style="color:#C41230">*</span></label>
        <select id="ocs-sala" required><option value="">Selecione...</option></select>
      </div>
      <div class="fg"><label>Máquina / Ativo <span style="color:#C41230">*</span></label>
        <select id="ocs-maq" required disabled><option value="">Selecione a sala</option></select>
      </div>
    </div>
  </div>

  <!-- ITEM -->
  <div class="card">
    <div class="card-t">Item de Compra</div>
    <div class="fg">
      <label>Descrição do Item <span style="color:#C41230">*</span></label>
      <textarea id="ocs-descricao" rows="3" required
        placeholder="Especificações, modelo, referência..."></textarea>
    </div>
    <div class="fg-row" style="margin-top:10px">
      <div class="fg">
        <label>Quantidade <span style="color:#C41230">*</span></label>
        <input type="number" id="ocs-qtd" min="0.01" step="any" required placeholder="0">
      </div>
      <div class="fg">
        <label>Fornecedor Sugerido <span style="color:var(--txt3);font-weight:400">(opcional)</span></label>
        <input type="text" id="ocs-fornecedor" placeholder="Nome do fornecedor preferencial...">
      </div>
    </div>
  </div>

  <!-- AÇÃO PREVENTIVA -->
  <div class="card">
    <div class="card-t">Ação Preventiva <span style="font-weight:400;font-size:12px;color:var(--txt3)">(opcional)</span></div>
    <div class="fg">
      <textarea id="ocs-preventiva" rows="2"
        placeholder="Ação para evitar recorrência desta falha..."></textarea>
    </div>
  </div>

  <!-- FOTOS -->
  <div class="card">
    <div class="card-t">Fotos <span style="font-weight:400;font-size:12px;color:var(--txt3)">(opcional)</span></div>
    <div id="ocs-drop" style="border:2px dashed var(--bord);border-radius:8px;padding:24px;text-align:center;color:var(--txt3);cursor:pointer;transition:border-color .2s,background .2s;font-size:14px">
      📷 Clique para anexar fotos ou arraste aqui
      <input type="file" id="ocs-foto-input" accept="image/*" multiple style="display:none">
    </div>
    <div id="ocs-preview" style="display:flex;flex-wrap:wrap;gap:10px;margin-top:12px"></div>
  </div>

  <!-- AÇÕES -->
  <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:4px;padding-top:12px;border-top:1px solid var(--bord)">
    <button type="button" id="ocs-btn-limpar" class="btn btn-gh">Limpar</button>
    <button type="submit" id="ocs-btn-submit" class="btn btn-p">🛒 Enviar Solicitação</button>
  </div>

</form>
<div id="ocs-toast" style="position:fixed;bottom:24px;right:24px;z-index:9999;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:500;opacity:0;pointer-events:none;transform:translateY(10px);transition:all .3s;max-width:360px"></div>`;
}

// ── Populate ────────────────────────────────────────────────────────────────

function _populateSalas() {
  const db  = getDB();
  const sel = document.getElementById('ocs-sala');
  if (!sel) return;
  const salas = (db.salas || [])
    .filter(s => s.ativo !== false)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  sel.innerHTML = '<option value="">Selecione...</option>' +
    salas.map(s => `<option value="${s.id}">${s.nome}</option>`).join('');
}

function _onSalaChange() {
  const db    = getDB();
  const salaId = document.getElementById('ocs-sala').value;
  const sel   = document.getElementById('ocs-maq');
  if (!salaId) { sel.innerHTML = '<option value="">Selecione a sala</option>'; sel.disabled = true; return; }
  const maqs = (db.maquinas || [])
    .filter(m => m.ativo !== false && m.salaId === salaId)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  sel.innerHTML = maqs.length
    ? '<option value="">Selecione...</option>' +
      maqs.map(m => `<option value="${m.id}">${m.nome}${m.tag ? ' – ' + m.tag : ''}</option>`).join('')
    : '<option value="">Nenhum ativo cadastrado</option>';
  sel.disabled = !maqs.length;
}

// ── Fotos ───────────────────────────────────────────────────────────────────

function _bindFotos() {
  const drop = document.getElementById('ocs-drop');
  const inp  = document.getElementById('ocs-foto-input');
  if (!drop || !inp) return;
  drop.addEventListener('click', () => inp.click());
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.style.borderColor = '#C41230'; drop.style.background = 'rgba(196,18,48,.06)'; });
  drop.addEventListener('dragleave', () => { drop.style.borderColor = ''; drop.style.background = ''; });
  drop.addEventListener('drop', e => {
    e.preventDefault(); drop.style.borderColor = ''; drop.style.background = '';
    _addFotos(Array.from(e.dataTransfer.files));
  });
  inp.addEventListener('change', () => { _addFotos(Array.from(inp.files)); inp.value = ''; });
}

function _addFotos(files) {
  files.forEach(f => {
    if (!f.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => {
      // Auto-resize 1900×1080 (mesmo padrão OS Abertura/Atender)
      const img = new Image();
      img.onload = () => {
        const MAX_W = 1900, MAX_H = 1080;
        let { width: w, height: h } = img;
        if (w > MAX_W || h > MAX_H) {
          const ratio = Math.min(MAX_W / w, MAX_H / h);
          w = Math.round(w * ratio); h = Math.round(h * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        _fotos.push({ name: f.name, b64: canvas.toDataURL('image/jpeg', 0.85) });
        _renderPreview();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(f);
  });
}

function _renderPreview() {
  const c = document.getElementById('ocs-preview');
  if (!c) return;
  c.innerHTML = _fotos.map((f, i) => `
    <div style="position:relative;width:88px;height:88px;border-radius:6px;overflow:hidden;border:1px solid var(--bord);flex-shrink:0">
      <img src="${f.b64}" style="width:100%;height:100%;object-fit:cover">
      <button type="button" data-i="${i}"
        style="position:absolute;top:3px;right:3px;background:rgba(0,0,0,.75);border:none;color:#fff;border-radius:50%;width:20px;height:20px;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>
    </div>`).join('');
  c.querySelectorAll('button[data-i]').forEach(btn =>
    btn.addEventListener('click', () => { _fotos.splice(+btn.dataset.i, 1); _renderPreview(); })
  );
}

// ── Submit ──────────────────────────────────────────────────────────────────

function _submit(e) {
  e.preventDefault();
  const db = getDB();

  const prioridade = document.getElementById('ocs-prioridade').value;
  const tipo       = document.getElementById('ocs-tipo').value;
  const salaId     = document.getElementById('ocs-sala').value;
  const maqId      = document.getElementById('ocs-maq').value;
  const descricao  = document.getElementById('ocs-descricao').value.trim();
  const qtd        = document.getElementById('ocs-qtd').value;

  if (!prioridade || !tipo || !salaId || !maqId || !descricao || !qtd) {
    _toast('⚠️ Preencha todos os campos obrigatórios.', 'warn'); return;
  }

  const btn = document.getElementById('ocs-btn-submit');
  btn.disabled = true; btn.textContent = 'Salvando...';

  try {
    const id = _genOC();
    // Etapa 1 (Solicitação) já vem preenchida automaticamente
    const oc = {
      id,
      solicitante: db.usuarioAtual?.nome || '',
      salaId,
      maqId,
      tipoAcao: tipo,
      prioridade,
      descricao,
      quantidade: qtd,
      fornecedor: document.getElementById('ocs-fornecedor').value.trim(),
      acaoPreventiva: document.getElementById('ocs-preventiva').value.trim(),
      fotos: _fotos.map(f => f.b64),
      status: 'em_andamento',
      etapas: {
        1: { data: new Date().toISOString().split('T')[0], obs: '', foto: '' },
        2: null, 3: null, 4: null, 5: null, 6: null, 7: null,
      },
      criadoEm: new Date().toISOString(),
    };
    db.ordensCompra = db.ordensCompra || [];
    db.ordensCompra.unshift(oc);
    saveDB();
    _toast(`✅ Ordem de Compra ${id} criada!`, 'ok');
    setTimeout(_limpar, 1800);
  } catch (err) {
    _toast('❌ Erro ao salvar: ' + err.message, 'err');
  } finally {
    btn.disabled = false; btn.textContent = '🛒 Enviar Solicitação';
  }
}

// ── Utils ───────────────────────────────────────────────────────────────────

function _limpar() {
  _fotos = [];
  document.getElementById('form-ocs')?.reset();
  const maq = document.getElementById('ocs-maq');
  if (maq) { maq.innerHTML = '<option value="">Selecione a sala</option>'; maq.disabled = true; }
  document.getElementById('ocs-preview').innerHTML = '';
  _populateSalas();
}

function _toast(msg, type) {
  const t = document.getElementById('ocs-toast');
  if (!t) return;
  t.textContent = msg;
  const colors = {
    ok:   { bg: '#14532d', color: '#86efac', border: '#22c55e' },
    warn: { bg: '#713f12', color: '#fde68a', border: '#eab308' },
    err:  { bg: '#7f1d1d', color: '#fca5a5', border: '#ef4444' },
  };
  const c = colors[type] || colors.ok;
  Object.assign(t.style, { background: c.bg, color: c.color, border: `1px solid ${c.border}`, opacity: '1', transform: 'translateY(0)' });
  clearTimeout(t._tid);
  t._tid = setTimeout(() => Object.assign(t.style, { opacity: '0', transform: 'translateY(10px)' }), 5000);
}

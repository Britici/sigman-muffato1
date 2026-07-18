// ============================================================
// SIGMAN v2.0 — pages/os-planejamento.js
// ============================================================
// Tela do PCM pra CRIAR uma O.S. Planejada (db.planejadas). O
// rastreamento/execução dela (marcar andamento, concluir, gerar a OS
// de verdade) já está em os-planejadas.js — este módulo só cobre o
// formulário "Nova O.S. Planejada".
// Cascata Sala→Máquina segue o mesmo padrão de os-abertura.js, mas
// achatada em 1 nível só (o form já tem um único campo "Sala / Local",
// sem Ambiente separado) — lista direto todas as salas no escopo do
// usuário.
// ============================================================

import { getDB, saveDB, _genPL } from '../api.js?v=20260718a';
import { CU } from '../auth.js?v=20260718a';
import { v, sv, today, showAlert } from '../utils.js?v=20260718a';
import { salasNoEscopo } from '../hierarquia.js?v=20260718a';

// Mesmo padrão de guarda de os-abertura.js: init() roda a cada
// navegação, mas o DOM desta página é estático (router só alterna a
// classe .on) — sem isto, os listeners empilhavam a cada visita.
let _bound = false;

export function init() {
  _populateSalas();
  if (!_bound) {
    _bound = true;
    document.getElementById('pl-sl')?.addEventListener('change', _populateMaquinas);
    document.getElementById('btn-pl-clear')?.addEventListener('click', _limpar);
    document.getElementById('btn-pl-save')?.addEventListener('click', _salvar);
    _bindPrioridadeDropdown();
  }
  _limpar();
}

const PRIORIDADE_LABEL = {
  1: '1 – Emergencial (Parada)', 2: '2 – Urgente (Corretiva Programada)',
  3: '3 – Média (Preventiva)', 4: '4 – Baixa (Melhoria)',
};
const PRIORIDADE_COR = { 1: 'var(--red)', 2: 'var(--yel)', 3: 'var(--blu)', 4: 'var(--grn)' };

function _bindPrioridadeDropdown() {
  const wrap = document.getElementById('pl-pr-sel');
  const btn  = document.getElementById('pl-pr-btn');
  if (!wrap || !btn) return;
  btn.addEventListener('click', e => {
    e.stopPropagation();
    wrap.classList.toggle('open');
  });
  wrap.querySelectorAll('.psel-item').forEach(item => {
    item.addEventListener('click', () => {
      _setPrioridade(item.dataset.val);
      wrap.classList.remove('open');
    });
  });
  document.addEventListener('click', () => wrap.classList.remove('open'));
}

function _setPrioridade(val) {
  sv('pl-pr', val);
  const txt = document.getElementById('pl-pr-txt');
  if (!txt) return;
  if (val) {
    txt.innerHTML = `<span class="psel-dot" style="display:inline-block;background:${PRIORIDADE_COR[val]}"></span>${PRIORIDADE_LABEL[val]}`;
    txt.classList.remove('psel-placeholder');
  } else {
    txt.textContent = 'Selecione...';
    txt.classList.add('psel-placeholder');
  }
}

// Achatado em 1 nível: todas as salas no escopo do usuário, sem passar
// por um select de Ambiente antes (diferente da Abertura). Se algum
// dia o Planejamento precisar do mesmo filtro por Ambiente da
// Abertura, replicar _populateAmbientes()/_populateSalas() de lá.
function _populateSalas() {
  const db  = getDB();
  const sel = document.getElementById('pl-sl');
  if (!sel) return;
  const cur = sel.value;
  const escopo = salasNoEscopo(CU); // null = sem restrição (admin / nível 1)
  const salas = (db.salas || [])
    .filter(s => s.ativo !== false && (escopo === null || escopo.includes(s.id)))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  sel.innerHTML = '<option value="">Selecione...</option>' +
    salas.map(s => `<option value="${s.id}">${s.nome}</option>`).join('');
  if (cur) sel.value = cur;
  _populateMaquinas();
}

function _populateMaquinas() {
  const db  = getDB();
  const sel = document.getElementById('pl-mq');
  if (!sel) return;
  const salaId = v('pl-sl');
  if (!salaId) { sel.innerHTML = '<option value="">Selecione a sala</option>'; return; }
  const maqs = (db.maquinas || []).filter(m => m.salaId === salaId && m.ativo !== false)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  sel.innerHTML = '<option value="">Selecione...</option>' +
    maqs.map(m => `<option value="${m.id}">${m.nome}</option>`).join('') +
    '<option value="__outros__">Outro / não cadastrado</option>';
}

function _limpar() {
  sv('pl-sl', '');
  _populateSalas();
  ['pl-tp', 'pl-pz', 'pl-ds'].forEach(id => sv(id, ''));
  sv('pl-horas', '8');
  _setPrioridade('');
}

async function _salvar() {
  const db = getDB();
  const salaId = v('pl-sl'), maqId = v('pl-mq'), tipo = v('pl-tp'),
        prioridade = v('pl-pr'), prazo = v('pl-pz'),
        horas = parseInt(v('pl-horas')) || 8, descricao = v('pl-ds').trim();

  if (!salaId || !maqId || !tipo || !prioridade || !prazo || !descricao) {
    showAlert('al-pl', 'Preencha sala, máquina, tipo, prioridade, prazo e a descrição do serviço.', 'er');
    return;
  }
  const sala = db.salas.find(s => s.id === salaId);
  const maq  = maqId === '__outros__' ? null : db.maquinas.find(m => m.id === maqId);
  if (!sala) { showAlert('al-pl', 'Sala inválida.', 'er'); return; }

  const numero = _genPL();
  const item = {
    numero, sala: sala.nome, maq: maq ? maq.nome : 'Outro / não cadastrado', tag: maq?.tag || '',
    tipo, prioridade, prazo, horas, descricao,
    status: 'Pendente', manutExec: '', dataExec: '', inicio: '', fim: '', duracao: 0,
    servicoExec: '', criadoEm: new Date().toISOString(), concluidoEm: '',
  };
  db.planejadas.push(item);
  saveDB();
  showAlert('al-pl', `${numero} criada — aparece em O.S. Planejadas.`, 'ok');
  _limpar();
}

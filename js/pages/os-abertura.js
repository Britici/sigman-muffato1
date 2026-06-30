// ============================================================
// SIGMAN v2.0 — pages/os-abertura.js
// ============================================================
// Abertura unificada de O.S. — substitui a antiga dupla
// Abertura/Solicitação. Todo perfil abre aqui, direto:
//   • Produção: só relata (sala, máquina, tipo, prioridade,
//     problema). Não sabe ainda quem/quando vai atender → OS
//     nasce em status 'aberta'. Aprovação de produção fica
//     pré-atribuída a quem abriu (ela mesma aprova depois).
//   • Manutenção / PCM / Admin: já atendeu no ato → preenche
//     tudo (igual ao "Concluir" de planejada antigo) → OS nasce
//     direto em 'aguardando_aprovacao' (não passa por produção —
//     decisão: dispensada quando quem abre não é produção).
// Quem "atende" uma OS aberta por produção faz isso em
// O.S. Executadas (botão "Atender"), não aqui.
// ============================================================

import { getDB, saveDB, apiPost, _genOS } from '../api.js';
import { CU } from '../auth.js';
import { v, sv, today, showAlert, showToast, setupPhotoPreview } from '../utils.js';
import { salasNoEscopo } from '../hierarquia.js';

let _fotoDataUrl = null;

export function init() {
  _populateSalas();
  _populateManutentores();
  _toggleCamposPorPerfil();
  document.getElementById('ab-sl')?.addEventListener('change', _populateMaquinas);
  document.getElementById('btn-ab-clear')?.addEventListener('click', _limpar);
  document.getElementById('btn-ab-save')?.addEventListener('click', _salvar);
  setupPhotoPreview('ab-photo-input', 'ab-photo-preview', (b64, file) => {
    _fotoDataUrl = `data:${file.type};base64,${b64}`;
  });
  _limpar();
}

// Esconde os campos que só fazem sentido pra quem já atendeu no ato
// (produção normalmente abre e some — não tem como preencher isso).
function _toggleCamposPorPerfil() {
  const ehProducao = CU?.perfil === 'producao';
  const tempo  = document.getElementById('card-ab-tempo');
  const exec   = document.getElementById('ab-bloco-execucao');
  const mnWrap = document.getElementById('ab-mn-wrap');
  if (tempo)  tempo.style.display  = ehProducao ? 'none' : '';
  if (exec)   exec.style.display   = ehProducao ? 'none' : '';
  if (mnWrap) mnWrap.style.display = ehProducao ? 'none' : '';
}

function _populateSalas() {
  const db  = getDB();
  const sel = document.getElementById('ab-sl');
  if (!sel) return;
  const cur = sel.value;
  const escopo = salasNoEscopo(CU); // null = sem restrição (nível 1)
  const salas = (db.salas || [])
    .filter(s => s.ativo !== false && (escopo === null || escopo.includes(s.id)))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  sel.innerHTML = '<option value="">Selecione...</option>' +
    salas.map(s => `<option value="${s.id}">${s.nome}</option>`).join('');
  if (cur) sel.value = cur;
}

function _populateMaquinas() {
  const db  = getDB();
  const sel = document.getElementById('ab-mq');
  if (!sel) return;
  const salaId = v('ab-sl');
  if (!salaId) { sel.innerHTML = '<option value="">Selecione a sala</option>'; return; }
  const maqs = (db.maquinas || []).filter(m => m.salaId === salaId && m.ativo !== false)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  sel.innerHTML = '<option value="">Selecione...</option>' +
    maqs.map(m => `<option value="${m.id}">${m.nome}</option>`).join('') +
    '<option value="__outros__">Outro / não cadastrado</option>';
}

// Manutentor responsável = usuário real (login), não mais texto livre —
// só perfis que de fato executam serviço (manutenção/PCM/admin).
function _populateManutentores() {
  const db  = getDB();
  const sel = document.getElementById('ab-mn');
  if (!sel) return;
  const cur   = sel.value;
  const users = (db.usuarios || [])
    .filter(u => ['manutencao','pcm','admin'].includes(u.perfil) && u.ativo !== false)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  sel.innerHTML = '<option value="">Selecione...</option>' +
    users.map(u => `<option value="${u.login}">${u.nome}</option>`).join('');
  sel.value = cur || '';
}

function _limpar() {
  ['ab-tp', 'ab-pr', 'ab-pb', 'ab-ac', 'ab-ap', 'ab-in', 'ab-fm', 'ab-parada'].forEach(id => sv(id, ''));
  sv('ab-sl', '');
  document.getElementById('ab-mq').innerHTML = '<option value="">Selecione a sala</option>';
  sv('ab-dt', today());
  sv('ab-mn', CU?.perfil !== 'producao' ? (CU?.login || '') : '');
  _fotoDataUrl = null;
  const prev = document.getElementById('ab-photo-preview');
  if (prev) prev.innerHTML = '<span style="color:var(--txt3);font-size:13px">📷 Clique para anexar foto</span>';
  const inputFoto = document.getElementById('ab-photo-input');
  if (inputFoto) inputFoto.value = '';
}

async function _salvar() {
  const db = getDB();
  const salaId = v('ab-sl'), maqId = v('ab-mq'), tipo = v('ab-tp'),
        prioridade = v('ab-pr'), problema = v('ab-pb').trim();

  if (!salaId || !maqId || !tipo || !prioridade || !problema) {
    showAlert('al-ab', 'Preencha sala, máquina, tipo, prioridade e o problema.', 'er');
    return;
  }
  const sala = db.salas.find(s => s.id === salaId);
  const maq  = maqId === '__outros__' ? null : db.maquinas.find(m => m.id === maqId);
  if (!sala) { showAlert('al-ab', 'Sala inválida.', 'er'); return; }

  const ehProducao = CU?.perfil === 'producao';
  const manutLogin = v('ab-mn');
  const manutUser  = manutLogin ? db.usuarios.find(u => u.login === manutLogin) : null;
  const acaoExec   = v('ab-ac').trim();

  if (!ehProducao && !manutLogin) { showAlert('al-ab', 'Selecione o manutentor responsável.', 'er'); return; }
  if (!ehProducao && !acaoExec)   { showAlert('al-ab', 'Descreva a ação executada.', 'er'); return; }

  const ini = ehProducao ? '' : v('ab-in');
  const fim = ehProducao ? '' : v('ab-fm');
  let durMin = 0, paradaMin = ehProducao ? 0 : (parseInt(v('ab-parada')) || 0);
  if (ini && fim) {
    const [h1, m1] = ini.split(':').map(Number), [h2, m2] = fim.split(':').map(Number);
    durMin = Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1));
    if (!paradaMin) paradaMin = durMin;
  }

  const numero = _genOS();
  const agora  = new Date().toISOString();
  const os = {
    id: crypto.randomUUID(), numero,
    data: v('ab-dt') || today(),
    sala: sala.nome, maq: maq ? maq.nome : 'Outro / não cadastrado', tag: maq?.tag || '',
    tipo, prioridade,
    prob: problema,
    manut: ehProducao ? '' : (manutUser?.nome || manutLogin),
    manutLogin: ehProducao ? '' : manutLogin,
    ini, fim, durMin, paradaMin,
    acao: ehProducao ? '' : acaoExec,
    acaoPrev: ehProducao ? '' : v('ab-ap').trim(),
    fotoUrl: ehProducao ? '' : (_fotoDataUrl || ''),
    pecas: '', origem: 'direta', ref: '', criadoEm: agora,
    // ── Solicitante / fluxo de aprovação ──────────────────────
    solicitante: CU?.nome || '', solicitanteLogin: CU?.login || '',
    status: ehProducao ? 'aberta' : 'aguardando_aprovacao',
    // Aprovação de produção: só se aplica quando quem abriu É produção
    // (ela mesma aprova depois) — decisão tomada no brainstorm: quando
    // manutenção/PCM/admin abre a própria OS, fica dispensada (null).
    aprovadorProd: ehProducao ? CU.nome : '',
    aprovadorProdLogin: ehProducao ? CU.login : '',
    aprovadoProdEm: '', aprovadoManutEm: '',
    aprovadorManut: '', aprovadorManutLogin: '',
  };
  db.ordens.push(os);
  saveDB();
  _logEdit('Abriu OS', numero, `${os.sala} · ${os.maq}`);

  showAlert('al-ab', ehProducao
    ? `${numero} registrada — aguardando atendimento da manutenção.`
    : `${numero} registrada — aguardando aprovação.`, 'ok');
  showToast(`${numero} registrada.`, 'ok');
  _limpar();

  apiPost({
    action: 'append', sheet: 'ordens',
    row: {
      OS_Numero: numero, Data: os.data, Sala: os.sala, Maquina: os.maq,
      Tipo: tipo, Prioridade: prioridade, Manutentor: os.manut,
      Hora_Inicio: os.ini, Hora_Fim: os.fim, Duracao_Min: os.durMin,
      Tempo_Parada_Min: os.paradaMin, Problema: problema, Acao_Executada: os.acao,
      Origem: 'direta', Criado_Em: agora,
    },
  });
}

function _logEdit(acao, numero, detalhe) {
  if (!CU) return;
  const db = getDB(), agora = new Date().toISOString();
  db.historico.unshift({ ts: agora, user: CU.nome, login: CU.login, acao, numero, detalhe });
  if (db.historico.length > 200) db.historico.pop();
  saveDB();
  apiPost({ action: 'append', sheet: 'historico', row: { ID: agora, Data_Hora: agora, Usuario: CU.nome, Login: CU.login, Acao: acao, Numero_Ref: numero, Detalhe: detalhe } });
}

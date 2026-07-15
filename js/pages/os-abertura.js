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
import { salasNoEscopo, ambientesNoEscopo } from '../hierarquia.js';

let _fotosDataUrl = [];
// ⚠️ Este módulo tem DOM ESTÁTICO em index.html (o router só alterna
// a classe .on em navegação, não recria o markup) — mas init() roda
// a cada navegação. Sem esta guarda, addEventListener empilha 1
// listener a mais por visita à página, e "Registrar Ordem" passaria
// a salvar a mesma OS N vezes depois de N visitas. Bug encontrado e
// corrigido em 2026-06-30 (já afetava todos os listeners deste
// módulo antes do dropdown de Prioridade existir).
let _bound = false;

export function init() {
  _populateUnidadeLocal();
  _populateAmbientes();
  _populateSalas();
  _populateManutentores();
  _toggleCamposPorPerfil();
  if (!_bound) {
    _bound = true;
    document.getElementById('ab-amb')?.addEventListener('change', _populateSalas);
    document.getElementById('ab-sl')?.addEventListener('change', _populateMaquinas);
    document.getElementById('btn-ab-clear')?.addEventListener('click', _limpar);
    document.getElementById('btn-ab-save')?.addEventListener('click', _salvar);
    setupPhotoPreview('ab-photo-input', 'ab-photo-preview', (dataUrls) => {
      _fotosDataUrl = dataUrls;
    });
    _bindPrioridadeDropdown();
  }
  _limpar();
}

// Dropdown customizado de Prioridade (Bloco 2) — <select> nativo não
// permite estilizar bolinha colorida por option de forma confiável
// entre navegadores. Ordem de cor confirmada com Tiago: 1 vermelho,
// 2 amarelo, 3 azul, 4 verde.
const PRIORIDADE_LABEL = { 1: '1 – Crítico', 2: '2 – Alta', 3: '3 – Média', 4: '4 – Baixa' };
const PRIORIDADE_COR   = { 1: 'var(--red)', 2: 'var(--yel)', 3: 'var(--blu)', 4: 'var(--grn)' };

function _bindPrioridadeDropdown() {
  const wrap = document.getElementById('ab-pr-sel');
  const btn  = document.getElementById('ab-pr-btn');
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
  sv('ab-pr', val || '');
  const txt = document.getElementById('ab-pr-txt');
  if (!txt) return;
  if (!val) {
    txt.className = 'psel-placeholder';
    txt.innerHTML = 'Selecione...';
  } else {
    txt.className = '';
    txt.innerHTML = `<span class="psel-dot" style="display:inline-block;background:${PRIORIDADE_COR[val]}"></span>${PRIORIDADE_LABEL[val]}`;
  }
}

// Esconde os campos que só fazem sentido pra quem já atendeu no ato
// (produção normalmente abre e some — não tem como preencher isso).
// Bloco 4 (2026-06-30): antes escondia o card Tempo de Intervenção e o
// bloco de Execução inteiros pra Produção (display:none) — layout
// ficava visualmente diferente entre os 2 perfis. Agora os 2 sempre
// veem os mesmos cards, na mesma ordem; pra Produção, os campos que
// ela não preenche ficam travados (opacidade + pointer-events:none +
// disabled), com uma tag "🔒 Preenchido pela Manutenção". _salvar()
// já ignora esses valores pra Produção independente do que estiver
// no DOM (força '' / 0), então travar em vez de esconder não muda o
// dado salvo — só a experiência visual.
function _toggleCamposPorPerfil() {
  const ehProducao = CU?.perfil === 'producao';
  const tempoCard = document.getElementById('card-ab-tempo');
  const execBloco = document.getElementById('ab-bloco-execucao');
  const mnWrap    = document.getElementById('ab-mn-wrap');

  tempoCard?.classList.toggle('card-locked', ehProducao);
  execBloco?.classList.toggle('card-locked', ehProducao);
  document.getElementById('ab-tempo-tag')?.style.setProperty('display', ehProducao ? '' : 'none');
  document.getElementById('ab-exec-tag')?.style.setProperty('display', ehProducao ? '' : 'none');
  document.getElementById('ab-mn-tag')?.style.setProperty('display', ehProducao ? '' : 'none');

  [tempoCard, execBloco, mnWrap].forEach(el => {
    el?.querySelectorAll('input,select,textarea').forEach(f => { f.disabled = ehProducao; });
  });
  if (mnWrap) mnWrap.classList.toggle('card-locked', ehProducao);
}

// Unidade/Local: hoje só existe 1 de cada (bootstrap) — mostrados
// fixos/read-only. ⚠️ TODO: quando existirem múltiplas Unidades/Locais
// reais, trocar por select dependente do escopo do usuário (igual
// Ambiente/Sala abaixo), em vez de pegar sempre o [0].
function _populateUnidadeLocal() {
  const db = getDB();
  const unidade = db.unidades[0];
  const local = db.locais[0];
  sv('ab-unid', unidade?.nome || '');
  sv('ab-local', local?.nome || '');
}

function _populateAmbientes() {
  const db  = getDB();
  const sel = document.getElementById('ab-amb');
  if (!sel) return;
  const cur = sel.value;
  const escopo = ambientesNoEscopo(CU); // null = sem restrição
  const ambientes = (db.ambientes || [])
    .filter(a => a.ativo !== false && (escopo === null || escopo.includes(a.id)))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  sel.innerHTML = '<option value="">Selecione...</option>' +
    ambientes.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
  // Pré-preenche automaticamente quando o usuário só tem 1 Ambiente
  // no escopo (caso comum: supervisor/manutentor de Ambiente único).
  if (cur) sel.value = cur;
  else if (ambientes.length === 1) sel.value = ambientes[0].id;
}

function _populateSalas() {
  const db  = getDB();
  const sel = document.getElementById('ab-sl');
  if (!sel) return;
  const cur = sel.value;
  const ambienteId = v('ab-amb');
  if (!ambienteId) { sel.innerHTML = '<option value="">Selecione o ambiente</option>'; _populateMaquinas(); return; }
  const escopo = salasNoEscopo(CU); // null = sem restrição (admin / nível 1)
  const salas = (db.salas || [])
    .filter(s => s.ativo !== false && s.ambienteId === ambienteId && (escopo === null || escopo.includes(s.id)))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  sel.innerHTML = '<option value="">Selecione...</option>' +
    salas.map(s => `<option value="${s.id}">${s.nome}</option>`).join('');
  if (cur) sel.value = cur;
  _populateMaquinas();
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
  ['ab-tp', 'ab-pb', 'ab-ac', 'ab-ap', 'ab-in', 'ab-fm', 'ab-parada'].forEach(id => sv(id, ''));
  _setPrioridade('');
  sv('ab-amb', '');
  _populateAmbientes(); // repopula e re-aplica pré-seleção (Ambiente único no escopo)
  sv('ab-sl', '');
  _populateSalas();
  sv('ab-dt', today());
  sv('ab-mn', CU?.perfil !== 'producao' ? (CU?.login || '') : '');
  const cbConcluida = document.getElementById('ab-concluida');
  if (cbConcluida) cbConcluida.checked = true;
  _fotosDataUrl = [];
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

  // Checkbox "Concluída" — só faz sentido pra quem preenche execução
  // no ato (Produção nunca preenche, então pra ela é sempre "aberta",
  // igual já era antes desta feature). Desmarcada = o que já foi feito
  // agora vira o 1º registro de historico_intervalos[] (mesmo padrão
  // do Bloco 5 em O.S. Executadas), campos ativos nascem limpos, OS
  // nasce direto em "aberta" — some da lista de "Atender" só depois
  // de concluída de fato.
  const concluida = ehProducao ? true : (document.getElementById('ab-concluida')?.checked !== false);
  const acaoPrevRaw = ehProducao ? '' : v('ab-ap').trim();
  const fotosRaw = ehProducao ? [] : _fotosDataUrl;
  const fotoRaw = fotosRaw[0] || ''; // compatibilidade: fotoUrl (singular) segue existindo
  // em todo o resto do app (detalhe, histórico, etc) até O.S. Executadas
  // ser atualizada pra exibir múltiplas fotos — ver `fotos[]` abaixo.
  const temIntervaloPreenchido = !ehProducao && (ini || fim || acaoExec || paradaMin || fotoRaw);

  const numero = _genOS();
  const agora  = new Date().toISOString();
  const historicoInicial = (!ehProducao && !concluida && temIntervaloPreenchido) ? [{
    manut: manutUser?.nome || manutLogin, manutLogin,
    ini, fim, durMin, paradaMin, acao: acaoExec, acaoPrev: acaoPrevRaw, fotoUrl: fotoRaw, fotos: fotosRaw,
    registradoEm: agora,
  }] : [];
  // Campos ativos: se ficou "não concluída" e o que foi digitado virou
  // histórico acima, a OS nasce com os 7 campos ativos zerados (igual
  // ao padrão de _registrarIntervaloParcial em os-executadas.js).
  const camposAtivos = (!ehProducao && !concluida)
    ? { ini: '', fim: '', durMin: 0, paradaMin: 0, acao: '', acaoPrev: '', fotoUrl: '', fotos: [] }
    : { ini, fim, durMin, paradaMin, acao: ehProducao ? '' : acaoExec, acaoPrev: acaoPrevRaw, fotoUrl: fotoRaw, fotos: fotosRaw };

  const os = {
    id: crypto.randomUUID(), numero,
    data: v('ab-dt') || today(),
    sala: sala.nome, maq: maq ? maq.nome : 'Outro / não cadastrado', tag: maq?.tag || '',
    tipo, prioridade,
    prob: problema,
    manut: ehProducao ? '' : (manutUser?.nome || manutLogin),
    manutLogin: ehProducao ? '' : manutLogin,
    ...camposAtivos,
    historico_intervalos: historicoInicial,
    pecas: '', origem: 'direta', ref: '', criadoEm: agora,
    // ── Solicitante / fluxo de aprovação ──────────────────────
    solicitante: CU?.nome || '', solicitanteLogin: CU?.login || '',
    status: ehProducao ? 'aberta' : (concluida ? 'aguardando_aprovacao' : 'aberta'),
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
    : (concluida
        ? `${numero} registrada — aguardando aprovação.`
        : `${numero} registrada — ainda não concluída, aparece em O.S. Executadas pra continuar.`),
    'ok');
  showToast(`${numero} registrada.`, 'ok');
  _limpar();

  apiPost({
    action: 'append', sheet: 'ordens',
    row: {
      OS_Numero: numero, Data: os.data, Sala: os.sala, Maquina: os.maq,
      Tipo: tipo, Prioridade: prioridade, Manutentor: os.manut,
      Hora_Inicio: os.ini, Hora_Fim: os.fim, Duracao_Min: os.durMin,
      Tempo_Parada_Min: os.paradaMin, Problema: problema, Acao_Executada: os.acao,
      Status: os.status, Origem: 'direta', Criado_Em: agora,
    },
  });
  if (historicoInicial.length) {
    apiPost({
      action: 'append', sheet: 'os_intervalos',
      row: {
        OS_Numero: numero, Manutentor: historicoInicial[0].manut,
        Hora_Inicio: ini, Hora_Fim: fim, Duracao_Min: durMin, Tempo_Parada_Min: paradaMin,
        Tarefas_Executadas: acaoExec, Registrado_Em: agora,
      },
    });
  }
}

function _logEdit(acao, numero, detalhe) {
  if (!CU) return;
  const db = getDB(), agora = new Date().toISOString();
  db.historico.unshift({ ts: agora, user: CU.nome, login: CU.login, acao, numero, detalhe });
  if (db.historico.length > 200) db.historico.pop();
  saveDB();
  apiPost({ action: 'append', sheet: 'historico', row: { ID: agora, Data_Hora: agora, Usuario: CU.nome, Login: CU.login, Acao: acao, Numero_Ref: numero, Detalhe: detalhe } });
}

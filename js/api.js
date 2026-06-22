// ============================================================
// SIGMAN v2.0 — api.js
// Camada de acesso a dados.
// MODE='mock'   → usa mock/db.js (sem servidor)
// MODE='sheets' → Google Apps Script (GAS) endpoint
// MODE='rest'   → Express backend v2
// Para migrar: só trocar MODE e as constantes abaixo.
// ============================================================

import { getMockDB } from '../mock/db.js';
import { showToast } from './utils.js';

// ── Configuração ─────────────────────────────────────────────
const MODE = 'mock'; // 'mock' | 'sheets' | 'rest'

// ATENÇÃO: ao trocar para 'sheets', substitua pela URL real do deploy
const GAS_URL  = 'https://script.google.com/macros/s/AKfycbwzcntvx4_QfBYotW2Sz2H8TiwprqkmAyWolYlbIeCfTR2Uhj2VIgVC7Mun1mTaFXohuA/exec';
const REST_URL = 'http://localhost:3000/api';

// ── Estado em memória ─────────────────────────────────────────
let _db = null;

export function getDB() {
  if (!_db) _db = _loadFromStorage();
  return _db;
}

export function saveDB() {
  try {
    localStorage.setItem('sigman_v2', JSON.stringify({
      usuarios:     _db.usuarios,
      salas:        _db.salas,
      maquinas:     _db.maquinas,
      ordens:       _db.ordens,
      planejadas:   _db.planejadas,
      solicitacoes: _db.solicitacoes,
      inspecoes:    _db.inspecoes,
      racs:         _db.racs,
      historico:    _db.historico,
      osC:  _db.osC,
      plC:  _db.plC,
      solC: _db.solC,
      racC: _db.racC,
    }));
  } catch (e) { console.warn('[saveDB]', e); }
}

function _loadFromStorage() {
  try {
    const raw = localStorage.getItem('sigman_v2');
    if (raw) {
      const parsed = JSON.parse(raw);
      const mock   = getMockDB();
      // Mescla: dados locais prevalecem. Configurações ainda vêm do mock
      // (tela de configurações não persiste ainda — fica para quando
      // configuracoes.js for implementado).
      return {
        ...mock,
        ...parsed,
        configuracoes: mock.configuracoes,
      };
    }
  } catch (e) { /* storage corrompido — recai no mock */ }
  return getMockDB();
}

// ── Geração de números sequenciais ───────────────────────────
export function _genOS() {
  const db  = getDB();
  const set = new Set(db.ordens.map(o => o.numero));
  let n = db.osC;
  let num;
  do { num = 'OS-' + String(n++).padStart(4, '0'); } while (set.has(num));
  db.osC = n;
  return num;
}

export function _genPL() {
  const db = getDB();
  const num = 'PL-' + String(db.plC).padStart(4, '0');
  db.plC++;
  return num;
}

export function _genSOL() {
  const db = getDB();
  const num = 'SOL-' + String(db.solC).padStart(4, '0');
  db.solC++;
  return num;
}

export function _genRAC() {
  const db = getDB();
  const num = 'RAC-' + String(db.racC).padStart(4, '0');
  db.racC++;
  return num;
}

// ── Sync com fonte remota ─────────────────────────────────────
export async function syncAll(silent = false) {
  if (MODE === 'mock') {
    if (!silent) console.log('[API] Modo mock — sem sincronização remota.');
    return true;
  }

  try {
    const url  = MODE === 'sheets' ? GAS_URL  : REST_URL;
    const path = MODE === 'sheets'
      ? `${url}?action=readAll`
      : `${url}/sync`;

    const res = await fetch(path, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error('HTTP ' + res.status);

    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Resposta inválida');

    _mergeRemote(json.data);
    saveDB();
    if (!silent) showToast('Dados sincronizados.', 'ok');
    return true;
  } catch (e) {
    if (!silent) showToast('Falha ao sincronizar: ' + e.message, 'er');
    return false;
  }
}

// ── Merge: converte formato GAS → formato interno v2 ─────────
function _mergeRemote(data) {
  if (!_db) _db = getMockDB();

  if (data.ordens?.length)       _db.ordens       = data.ordens.map(_mapOS);
  if (data.planejadas?.length)   _db.planejadas   = data.planejadas.map(_mapPL);
  if (data.solicitacoes?.length) _db.solicitacoes = data.solicitacoes.map(_mapSOL);
  if (data.inspecoes?.length)    _db.inspecoes    = data.inspecoes;
  if (data.racs?.length)         _db.racs         = data.racs.map(_mapRAC);
  if (data.salas?.length)        _db.salas        = data.salas.map(_mapSala);
  if (data.maquinas?.length)     _db.maquinas     = data.maquinas.map(_mapMaq);
  if (data.historico?.length)    _db.historico    = data.historico;

  // Atualiza contadores com base nos dados remotos
  _db.osC  = _nextCounter(_db.ordens,       'numero', 'OS-');
  _db.plC  = _nextCounter(_db.planejadas,   'numero', 'PL-');
  _db.solC = _nextCounter(_db.solicitacoes, 'numero', 'SOL-');
  _db.racC = _nextCounter(_db.racs,         'numero', 'RAC-');
}

function _nextCounter(arr, field, prefix) {
  if (!arr?.length) return 1;
  const nums = arr
    .map(r => parseInt((r[field] || '').replace(prefix, ''), 10))
    .filter(n => !isNaN(n));
  return nums.length ? Math.max(...nums) + 1 : 1;
}

// ── Mappers GAS → v2 ─────────────────────────────────────────
// GAS retorna campos com nomes do schema da planilha (PascalCase_Snake).
// Aqui normalizamos para o formato camelCase usado internamente.

function _mapOS(r) {
  return {
    numero:    r.OS_Numero      || '',
    data:      r.Data           || '',
    sala:      r.Sala           || '',
    maq:       r.Maquina        || '',
    tag:       r.Tag_Maquina    || '',
    tipo:      r.Tipo           || '',
    prioridade:String(r.Prioridade || ''),
    manut:     r.Manutentor     || '',
    inicio:    r.Hora_Inicio    || '',
    fim:       r.Hora_Fim       || '',
    duracao:   Number(r.Duracao_Min       || 0),
    parada:    Number(r.Tempo_Parada_Min  || 0),
    problema:  r.Problema       || '',
    acao:      r.Acao_Executada || '',
    acao_prev: r.Acao_Preventiva|| '',
    foto:      r.Foto_URL       || '',
    pecas:     r.Pecas_Utilizadas|| '',
    origem:    r.Origem         || 'direta',
    ref:       r.OS_Origem_Ref  || '',
    criadoEm:  r.Criado_Em      || '',
  };
}

function _mapPL(r) {
  return {
    numero:     r.PL_Numero          || '',
    sala:       r.Sala               || '',
    maq:        r.Maquina            || '',
    tag:        r.Tag_Maquina        || '',
    tipo:       r.Tipo               || '',
    prioridade: String(r.Prioridade  || ''),
    prazo:      r.Prazo_Limite       || '',
    horas:      Number(r.Horas_Turno || 8),
    descricao:  r.Descricao_Planejada|| '',
    status:     r.Status             || 'Pendente',
    manutExec:  r.Manutentor_Exec    || '',
    dataExec:   r.Data_Execucao      || '',
    inicio:     r.Hora_Inicio        || '',
    fim:        r.Hora_Fim           || '',
    duracao:    Number(r.Duracao_Min || 0),
    servicoExec:r.Servico_Executado  || '',
    criadoEm:   r.Criado_Em          || '',
    concluidoEm:r.Concluido_Em       || '',
  };
}

function _mapSOL(r) {
  return {
    numero:     r.SOL_Numero         || '',
    sala:       r.Sala               || '',
    maq:        r.Maquina            || '',
    tipo:       r.Tipo               || '',
    prioridade: String(r.Prioridade  || ''),
    descricao:  r.Descricao          || '',
    status:     r.Status             || 'Não Executada',
    solicitante:r.Solicitante        || '',
    manutExec:  r.Manutentor_Exec    || '',
    dataExec:   r.Data_Execucao      || '',
    servicoExec:r.Servico_Executado  || '',
    criadoEm:   r.Criado_Em          || '',
    concluidoEm:r.Concluido_Em       || '',
  };
}

function _mapRAC(r) {
  return {
    numero:       r.ID               || '',
    dataAbertura: r.Data_Abertura    || '',
    osRef:        r.OS_Numero        || '',
    equipamento:  r.Equipamento      || '',
    sala:         r.Sala             || '',
    criticidade:  r.Criticidade      || '',
    tempoParada:  Number(r.Tempo_Parada_Min || 0),
    falha:        r.Falha            || '',
    causaRaiz:    r.Causa_Raiz       || '',
    why1: r.Why1 || '', why2: r.Why2 || '', why3: r.Why3 || '',
    why4: r.Why4 || '', why5: r.Why5 || '',
    acaoImediata:  r.Acao_Imediata   || '',
    acaoPreventiva:r.Acao_Preventiva || '',
    respProd:      r.Resp_Producao   || '',
    respManu:      r.Resp_Manutencao || '',
    executantes:   r.Executantes     || '',
    status:        r.Status          || 'Aberto',
    dataFechamento:r.Data_Fechamento || '',
    fechadoPor:    r.Fechado_Por     || '',
    criadoEm:      r.Data_Criacao    || '',
  };
}

function _mapSala(r) {
  return {
    id:    r.ID_Sala || r.Nome?.toUpperCase().replace(/\s+/g, '_') || '',
    nome:  r.Nome    || '',
    ativo: r.Ativo === 'sim' || r.Ativo === true,
  };
}

function _mapMaq(r) {
  return {
    id:           r.ID_Maquina              || '',
    sala:         r.Sala                    || '',
    nome:         r.Nome                    || '',
    tag:          r.Tag                     || '',
    criticidade:  Number(r.Criticidade      || 3),
    periodicidade:r.Periodicidade_Preventiva|| 'Mensal',
    ativo:        r.Ativo === 'sim' || r.Ativo === true,
  };
}

// ── POST genérico ─────────────────────────────────────────────
export async function apiPost(body) {
  if (MODE === 'mock') return { ok: true }; // no-op em mock

  const url = MODE === 'sheets' ? GAS_URL : `${REST_URL}/action`;

  try {
    const res = await fetch(url, {
      method:  'POST',
      // GAS requer Content-Type text/plain para evitar CORS preflight
      headers: { 'Content-Type': 'text/plain' },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(25000),
    });
    const json = await res.json();
    if (!json.ok) { _queueFailed(body); return null; }
    return json;
  } catch (e) {
    _queueFailed(body);
    return null;
  }
}

// ── Helpers de escrita mapeados para GAS ─────────────────────

// Append de OS executada
export function gasAppendOS(os) {
  return apiPost({
    action: 'append',
    sheet:  'ordens',
    row: {
      OS_Numero:       os.numero,
      Data:            os.data,
      Sala:            os.sala,
      Maquina:         os.maq,
      Tag_Maquina:     os.tag       || '',
      Tipo:            os.tipo,
      Prioridade:      os.prioridade,
      Manutentor:      os.manut,
      Hora_Inicio:     os.inicio    || '',
      Hora_Fim:        os.fim       || '',
      Duracao_Min:     os.duracao   || 0,
      Tempo_Parada_Min:os.parada    || 0,
      Problema:        os.problema  || '',
      Acao_Executada:  os.acao      || '',
      Acao_Preventiva: os.acao_prev || '',
      Foto_URL:        os.foto      || '',
      Pecas_Utilizadas:os.pecas     || '',
      Origem:          os.origem    || 'direta',
      OS_Origem_Ref:   os.ref       || '',
      Criado_Em:       os.criadoEm  || new Date().toISOString(),
    },
  });
}

// Append de OS Planejada
export function gasAppendPL(pl) {
  return apiPost({
    action: 'append',
    sheet:  'planejadas',
    row: {
      PL_Numero:         pl.numero,
      Sala:              pl.sala,
      Maquina:           pl.maq,
      Tag_Maquina:       pl.tag         || '',
      Tipo:              pl.tipo,
      Prioridade:        pl.prioridade,
      Prazo_Limite:      pl.prazo       || '',
      Horas_Turno:       pl.horas       || 8,
      Descricao_Planejada:pl.descricao  || '',
      Status:            pl.status      || 'Pendente',
      Manutentor_Exec:   pl.manutExec   || '',
      Data_Execucao:     pl.dataExec    || '',
      Hora_Inicio:       pl.inicio      || '',
      Hora_Fim:          pl.fim         || '',
      Duracao_Min:       pl.duracao     || 0,
      Servico_Executado: pl.servicoExec || '',
      Criado_Em:         pl.criadoEm    || new Date().toISOString(),
      Concluido_Em:      pl.concluidoEm || '',
    },
  });
}

// Update de OS Planejada (ex: ao concluir)
export function gasUpdatePL(pl) {
  return apiPost({
    action: 'update',
    sheet:  'planejadas',
    idCol:  'PL_Numero',
    id:     pl.numero,
    row: {
      Status:            pl.status,
      Manutentor_Exec:   pl.manutExec    || '',
      Data_Execucao:     pl.dataExec     || '',
      Hora_Inicio:       pl.inicio       || '',
      Hora_Fim:          pl.fim          || '',
      Duracao_Min:       pl.duracao      || 0,
      Servico_Executado: pl.servicoExec  || '',
      Concluido_Em:      pl.concluidoEm  || '',
    },
  });
}

// Append de Solicitação
export function gasAppendSOL(sol) {
  return apiPost({
    action: 'append',
    sheet:  'solicitacoes',
    row: {
      SOL_Numero:        sol.numero,
      Sala:              sol.sala,
      Maquina:           sol.maq,
      Tipo:              sol.tipo,
      Prioridade:        sol.prioridade,
      Descricao:         sol.descricao   || '',
      Status:            sol.status      || 'Não Executada',
      Solicitante:       sol.solicitante || '',
      Manutentor_Exec:   sol.manutExec   || '',
      Data_Execucao:     sol.dataExec    || '',
      Servico_Executado: sol.servicoExec || '',
      Criado_Em:         sol.criadoEm    || new Date().toISOString(),
      Concluido_Em:      sol.concluidoEm || '',
    },
  });
}

// Update de Solicitação (ex: ao concluir)
export function gasUpdateSOL(sol) {
  return apiPost({
    action: 'update',
    sheet:  'solicitacoes',
    idCol:  'SOL_Numero',
    id:     sol.numero,
    row: {
      Status:            sol.status,
      Manutentor_Exec:   sol.manutExec   || '',
      Data_Execucao:     sol.dataExec    || '',
      Servico_Executado: sol.servicoExec || '',
      Concluido_Em:      sol.concluidoEm || '',
    },
  });
}

// Append de RAC
export function gasAppendRAC(rac) {
  return apiPost({
    action: 'salvarRACR',
    racr: {
      ID:               rac.numero,
      Data_Abertura:    rac.dataAbertura  || '',
      OS_Numero:        rac.osRef         || '',
      Equipamento:      rac.equipamento   || '',
      Sala:             rac.sala          || '',
      Criticidade:      rac.criticidade   || '',
      Tempo_Parada_Min: rac.tempoParada   || 0,
      Falha:            rac.falha         || '',
      Causa_Raiz:       rac.causaRaiz     || '',
      Why1: rac.why1 || '', Why2: rac.why2 || '', Why3: rac.why3 || '',
      Why4: rac.why4 || '', Why5: rac.why5 || '',
      Acao_Imediata:    rac.acaoImediata  || '',
      Acao_Preventiva:  rac.acaoPreventiva|| '',
      Resp_Producao:    rac.respProd      || '',
      Resp_Manutencao:  rac.respManu      || '',
      Executantes:      rac.executantes   || '',
      Status:           rac.status        || 'Aberto',
      Usuario_Criacao:  rac.criadoPor     || '',
      Data_Criacao:     rac.criadoEm      || new Date().toISOString(),
    },
  });
}

// Encerrar RAC
export function gasEncerrarRAC(id) {
  return apiPost({ action: 'encerrarRACR', id });
}

// Append de Histórico
export function gasLogHistorico(usuario, login, acao, ref, detalhe) {
  return apiPost({
    action: 'append',
    sheet:  'historico',
    row: {
      ID:          new Date().toISOString(),
      Data_Hora:   new Date().toISOString(),
      Usuario:     usuario,
      Login:       login,
      Acao:        acao,
      Numero_Ref:  ref,
      Detalhe:     detalhe,
    },
  });
}

// Upload de foto
export function gasUploadFoto(numero, fileName, mimeType, base64) {
  return apiPost({ action: 'uploadFoto', numero, fileName, mimeType, base64 });
}

// ── Fila offline ──────────────────────────────────────────────
function _queueFailed(body) {
  try {
    const q = JSON.parse(localStorage.getItem('sigman_queue') || '[]');
    q.push({ body, ts: Date.now() });
    localStorage.setItem('sigman_queue', JSON.stringify(q));
  } catch (e) {}
}

export async function flushQueue() {
  if (MODE === 'mock') return;
  try {
    const q = JSON.parse(localStorage.getItem('sigman_queue') || '[]');
    if (!q.length) return;
    const remaining = [];
    for (const item of q) {
      const ok = await apiPost(item.body);
      if (!ok) remaining.push(item);
    }
    localStorage.setItem('sigman_queue', JSON.stringify(remaining));
    if (!remaining.length) showToast('Dados pendentes sincronizados.', 'ok');
  } catch (e) {}
}

// Tenta reenviar fila a cada 30s
setInterval(flushQueue, 30000);

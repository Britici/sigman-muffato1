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

const GAS_URL  = 'https://script.google.com/macros/s/SEU_SCRIPT_ID/exec';
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
      salas:       _db.salas,
      maquinas:    _db.maquinas,
      ordens:      _db.ordens,
      planejadas:  _db.planejadas,
      solicitacoes:_db.solicitacoes,
      inspecoes:   _db.inspecoes,
      racs:        _db.racs,
      historico:   _db.historico,
      osC: _db.osC, plC: _db.plC, solC: _db.solC, racC: _db.racC,
    }));
  } catch(e) { console.warn('[saveDB]', e); }
}

function _loadFromStorage() {
  try {
    const raw = localStorage.getItem('sigman_v2');
    if (raw) {
      const parsed = JSON.parse(raw);
      // Mescla com mock para garantir usuários e configurações sempre atuais
      const mock = getMockDB();
      return { ...mock, ...parsed, usuarios: mock.usuarios, configuracoes: mock.configuracoes };
    }
  } catch(e) {}
  return getMockDB();
}

// ── Sync com fonte remota ─────────────────────────────────────
export async function syncAll(silent = false) {
  if (MODE === 'mock') {
    if (!silent) console.log('[API] Modo mock — sem sincronização remota.');
    return true;
  }
  try {
    const url  = MODE === 'sheets' ? GAS_URL : REST_URL;
    const path = MODE === 'sheets' ? `${url}?action=readAll` : `${url}/sync`;
    const res  = await fetch(path, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Resposta inválida');
    _mergeRemote(json.data);
    saveDB();
    if (!silent) showToast('Dados sincronizados.', 'ok');
    return true;
  } catch(e) {
    if (!silent) showToast('Falha ao sincronizar: ' + e.message, 'er');
    return false;
  }
}

function _mergeRemote(data) {
  if (!_db) _db = getMockDB();
  // Merge seletivo — mantém estrutura local, atualiza dados remotos
  if (data.ordens?.length)      _db.ordens      = data.ordens;
  if (data.planejadas?.length)  _db.planejadas  = data.planejadas;
  if (data.solicitacoes?.length)_db.solicitacoes = data.solicitacoes;
  if (data.inspecoes?.length)   _db.inspecoes   = data.inspecoes;
  if (data.racs?.length)        _db.racs        = data.racs;
  if (data.salas?.length)       _db.salas       = data.salas;
  if (data.maquinas?.length)    _db.maquinas    = data.maquinas;
}

// ── POST genérico ─────────────────────────────────────────────
export async function apiPost(body) {
  if (MODE === 'mock') return { ok: true }; // no-op em mock

  const url = MODE === 'sheets' ? GAS_URL : `${REST_URL}/action`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
    const json = await res.json();
    if (!json.ok) { _queueFailed(body); return null; }
    return json;
  } catch(e) {
    _queueFailed(body);
    return null;
  }
}

// ── Fila offline ──────────────────────────────────────────────
function _queueFailed(body) {
  try {
    const q = JSON.parse(localStorage.getItem('sigman_queue') || '[]');
    q.push({ body, ts: Date.now() });
    localStorage.setItem('sigman_queue', JSON.stringify(q));
  } catch(e) {}
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
  } catch(e) {}
}

// Tenta reenviar fila a cada 30s
setInterval(flushQueue, 30000);

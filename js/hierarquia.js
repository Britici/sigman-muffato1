// ============================================================
// SIGMAN v2.0 — js/hierarquia.js
// ============================================================
// Hierarquia organizacional (2026-06-27) — substitui o checkbox
// manual de aprovadores por Sala (aprovadoresLocal). Aprovação e
// escopo de pré-preenchimento agora vêm do cargo da pessoa:
//   nivel 1 Diretoria        (lado 'ambos', escopo universal)
//   nivel 2 Gerência/Coordenador  (escopo: Local)
//   nivel 3 Coordenação/Supervisor (escopo: Ambiente)
//   nivel 4 Produção/Manutenção    (escopo: Ambiente)
// usuarios[].escopoIds guarda ids de Local (nível 2) ou Ambiente
// (níveis 3/4) — nível 1 ignora (sempre universal).
// ============================================================

import { getDB } from './api.js';

// ordens.sala guarda o NOME da sala (modelo legado de OS) — aprovação
// e escopo são pelo modelo relacional do Ativos (ids). Esta função é
// a ponte entre os dois.
export function salaIdPorNome(nome) {
  const db = getDB();
  return db.salas.find(s => s.nome === nome)?.id || null;
}

// O usuário `u` tem escopo sobre a Sala `salaId`?
export function escopoContemSala(u, salaId) {
  if (!u || !u.nivel) return false;
  if (u.nivel === 1) return true; // diretoria — escopo universal
  const db = getDB();
  const sala = db.salas.find(s => s.id === salaId);
  if (!sala) return false;
  const ambiente = db.ambientes.find(a => a.id === sala.ambienteId);
  if (!ambiente) return false;
  const ids = u.escopoIds || [];
  return u.nivel === 2 ? ids.includes(ambiente.localId) : ids.includes(ambiente.id);
}

// Elegíveis a aprovar um certo "lado" (produção/manutenção) de uma OS:
// níveis 1-3 do lado (ou 'ambos') cujo escopo cobre a Sala da OS.
// Nível 4 nunca entra aqui (só aprova a própria OS — tratado fora,
// onde o aprovadorProdLogin já foi fixado na abertura). Conflito de
// interesse: quem executou o serviço não aprova manutenção da própria
// OS. Sem ninguém elegível → cai para o admin (caso extremo).
export function elegiveisAprovacao(o, lado) {
  const db = getDB();
  const salaId = salaIdPorNome(o.sala);
  if (!salaId) return [];
  let logins = [...new Set(
    db.usuarios
      .filter(u => u.ativo !== false && u.nivel >= 1 && u.nivel <= 3)
      .filter(u => u.lado === lado || u.lado === 'ambos')
      .filter(u => escopoContemSala(u, salaId))
      .map(u => u.login)
  )];
  if (lado === 'manutencao') logins = logins.filter(login => login !== o.manutLogin);
  if (!logins.length) logins = db.usuarios.filter(u => u.perfil === 'admin' && u.ativo !== false).map(u => u.login);
  return logins;
}

// Aprovação de produção: quem abriu (nível 4 aprova a própria, decisão
// já tomada) + qualquer nível 1-3 do escopo (pode aprovar no lugar/além
// do solicitante — ex: ele está de férias).
export function elegiveisProd(o) {
  const base = elegiveisAprovacao(o, 'producao');
  return o.aprovadorProdLogin ? [...new Set([o.aprovadorProdLogin, ...base])] : base;
}

export function elegiveisManut(o) {
  return elegiveisAprovacao(o, 'manutencao');
}

// Todas as Salas dentro do escopo do usuário — usado pra restringir o
// select de Sala na Abertura de OS. Nível 1 = sem restrição (null).
export function salasNoEscopo(u) {
  if (!u || !u.nivel || u.nivel === 1) return null; // null = sem restrição
  const db = getDB();
  const ids = u.escopoIds || [];
  return db.salas.filter(s => {
    const ambiente = db.ambientes.find(a => a.id === s.ambienteId);
    if (!ambiente) return false;
    return u.nivel === 2 ? ids.includes(ambiente.localId) : ids.includes(ambiente.id);
  }).map(s => s.id);
}

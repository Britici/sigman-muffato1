// ============================================================
// SIGMAN v2.0 — js/hierarquia.js
// ============================================================
// Hierarquia organizacional (2026-06-30, Bloco 7) — substitui o
// checkbox manual de aprovadores por Sala (aprovadoresLocal). Admin
// NÃO entra neste esquema de níveis — comando universal, controlado
// à parte por isAdmin()/perfil (ver auth.js). Aprovação e escopo de
// pré-preenchimento dos demais perfis vêm do cargo da pessoa:
//   nivel 1 Local    — Diretoria + Coordenadores (escopo: Local)
//   nivel 2 Ambiente — Supervisores               (escopo: Ambiente)
//   nivel 3 Sala     — Produção/Manutenção (operacional, nunca
//                       aprova terceiros — só a própria OS, já fixado
//                       em aprovadorProdLogin na abertura). Escopo:
//                       Sala diretamente (sem herança automática).
// usuarios[].escopoIds guarda ids de Local (nível 1), Ambiente
// (nível 2) ou Sala (nível 3), conforme o nível.
// ⚠️ TODO (pendência aberta): nível 3 hoje aponta pra todas as Salas
// existentes como placeholder — Tiago precisa revisar e atribuir as
// Salas reais de cada manutentor/produção individualmente.
// ============================================================

import { getDB } from './api.js?v=20260718a';

// ordens.sala guarda o NOME da sala (modelo legado de OS) — aprovação
// e escopo são pelo modelo relacional do Ativos (ids). Esta função é
// a ponte entre os dois.
export function salaIdPorNome(nome) {
  const db = getDB();
  return db.salas.find(s => s.nome === nome)?.id || null;
}

// O usuário `u` tem escopo sobre a Sala `salaId`? Admin nunca passa
// por aqui — sempre verificado à parte via isAdmin() pelo chamador.
export function escopoContemSala(u, salaId) {
  if (!u || !u.nivel) return false;
  const db = getDB();
  const sala = db.salas.find(s => s.id === salaId);
  if (!sala) return false;
  const ids = u.escopoIds || [];
  if (u.nivel === 3) return ids.includes(sala.id);
  const ambiente = db.ambientes.find(a => a.id === sala.ambienteId);
  if (!ambiente) return false;
  return u.nivel === 1 ? ids.includes(ambiente.localId) : ids.includes(ambiente.id);
}

// Elegíveis a aprovar um certo "lado" (produção/manutenção) de uma OS:
// níveis 1-2 do lado (ou 'ambos') cujo escopo cobre a Sala da OS, mais
// admin sempre (comando universal, fora do esquema de níveis). Nível
// 3 nunca entra aqui (só aprova a própria OS — tratado fora, onde o
// aprovadorProdLogin já foi fixado na abertura). Conflito de
// interesse: quem executou o serviço não aprova manutenção da própria
// OS.
export function elegiveisAprovacao(o, lado) {
  const db = getDB();
  const salaId = salaIdPorNome(o.sala);
  if (!salaId) return [];
  let logins = [...new Set(
    db.usuarios
      .filter(u => u.ativo !== false)
      .filter(u => u.perfil === 'admin' ||
        (u.nivel >= 1 && u.nivel <= 2 && (u.lado === lado || u.lado === 'ambos') && escopoContemSala(u, salaId)))
      .map(u => u.login)
  )];
  if (lado === 'manutencao') logins = logins.filter(login => login !== o.manutLogin);
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
// select de Sala na Abertura de OS. Admin/nível 1 sem nível = sem
// restrição (null). Nível 1 tem escopo de Local (não mais universal).
export function salasNoEscopo(u) {
  if (!u) return null;
  if (u.perfil === 'admin') return null; // comando universal
  if (!u.nivel) return null;
  const db = getDB();
  const ids = u.escopoIds || [];
  if (u.nivel === 3) return ids; // escopo já é direto em Salas
  return db.salas.filter(s => {
    const ambiente = db.ambientes.find(a => a.id === s.ambienteId);
    if (!ambiente) return false;
    return u.nivel === 1 ? ids.includes(ambiente.localId) : ids.includes(ambiente.id);
  }).map(s => s.id);
}

// Todos os Ambientes dentro do escopo do usuário — usado pra
// restringir o select de Ambiente na árvore da Abertura de OS.
// Admin / nível 1 (Local) sem mais filtro de Ambiente = sem restrição
// (null). Nível 3 (Sala) deriva o(s) Ambiente(s) a partir das Salas
// no seu escopoIds (já que não tem escopo de Ambiente próprio).
export function ambientesNoEscopo(u) {
  if (!u) return null;
  if (u.perfil === 'admin') return null;
  if (!u.nivel || u.nivel === 1) return null; // sem restrição de Ambiente
  const db = getDB();
  if (u.nivel === 2) return u.escopoIds || [];
  // nivel === 3: ambientes das salas no escopo
  const salaIds = u.escopoIds || [];
  const ambIds = db.salas.filter(s => salaIds.includes(s.id)).map(s => s.ambienteId);
  return [...new Set(ambIds)];
}

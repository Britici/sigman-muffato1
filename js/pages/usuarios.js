// ============================================================
// SIGMAN v2.0 — pages/usuarios.js
// Gestão de Usuários — acesso EXCLUSIVO ao perfil 'admin'
// ============================================================

import { getDB, saveDB } from '../api.js';
import { CU, ROLES, hashPassword, isAdmin } from '../auth.js';
import { showToast, openM, closeM } from '../utils.js';

let _editId = null; // login do usuário em edição (null = criando novo)
let _sortAtivos   = { col: 'nome', dir: 'asc' }; // ordenação do card "Ativos"
let _sortInativos = { col: 'nome', dir: 'asc' }; // ordenação do card "Desativados"

const COLS = [
  { key: 'nome',   label: 'Nome'   },
  { key: 'cargo',  label: 'Cargo'  },
  { key: 'login',  label: 'Login'  },
  { key: 'perfil', label: 'Perfil' },
];

export function init() {
  render();
}

export function render() {
  const root = document.getElementById('pg-ul');
  const alertBox = document.getElementById('al-usr');
  if (!root) return;

  // ── Trava de segurança: bloqueia mesmo se alguém navegar via hash direto ──
  if (!isAdmin()) {
    root.innerHTML = `
      <div class="alert er show" style="display:block">
        🔒 Acesso restrito. Apenas o perfil <strong>Administrador</strong>
        pode gerenciar usuários.
      </div>`;
    if (alertBox) alertBox.innerHTML = '';
    return;
  }

  const db = getDB();

  const ativos = db.usuarios
    .filter(u => u.ativo !== false)
    .sort((a, b) => {
      const r = _compareUsuarios(a, b, _sortAtivos.col);
      return _sortAtivos.dir === 'asc' ? r : -r;
    });

  const inativos = db.usuarios
    .filter(u => u.ativo === false)
    .sort((a, b) => {
      const r = _compareUsuarios(a, b, _sortInativos.col);
      return _sortInativos.dir === 'asc' ? r : -r;
    });

  root.innerHTML = `
    <div class="card">
      <div class="card-t">Usuários Ativos (${ativos.length})</div>
      <div class="tw">
        <table>
          <thead><tr>
            ${COLS.map(c => _thHtml(c, 'ativos')).join('')}
            <th style="min-width:170px">Ações</th>
          </tr></thead>
          <tbody>${ativos.map(_rowUsuario).join('')}</tbody>
        </table>
      </div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-t">Usuários Desativados${inativos.length ? ` (${inativos.length})` : ''}</div>
      <div class="tw">
        <table>
          <thead><tr>
            ${COLS.map(c => _thHtml(c, 'inativos')).join('')}
            <th style="min-width:170px">Ações</th>
          </tr></thead>
          <tbody>${inativos.map(_rowUsuario).join('')}</tbody>
        </table>
      </div>
    </div>`;

  document.getElementById('btn-usr-novo').onclick = () => _openForm(null);

  _bindSortHeaders();

  [...ativos, ...inativos].forEach(u => {
    document.getElementById(`btn-edit-${u.login}`)?.addEventListener('click', () => _openForm(u.login));
    document.getElementById(`btn-reset-${u.login}`)?.addEventListener('click', () => _resetSenha(u.login));
    document.getElementById(`btn-toggle-${u.login}`)?.addEventListener('click', () => _toggleAtivo(u.login));
  });
}

function _thHtml(c, group) {
  const sort = group === 'ativos' ? _sortAtivos : _sortInativos;
  const active = sort.col === c.key ? sort.dir : '';
  return `<th class="sortable ${active}" data-col="${c.key}" data-group="${group}">${c.label}</th>`;
}

function _bindSortHeaders() {
  document.querySelectorAll('#pg-ul th.sortable').forEach(th => {
    th.addEventListener('click', () => _onSort(th.dataset.col, th.dataset.group));
  });
}

function _onSort(col, group) {
  const sort = group === 'ativos' ? _sortAtivos : _sortInativos;
  sort.dir = (sort.col === col && sort.dir === 'asc') ? 'desc' : 'asc';
  sort.col = col;
  render();
}

function _compareUsuarios(a, b, col) {
  switch (col) {
    case 'nome':
      return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
    case 'cargo':
      return (a.cargo || '').localeCompare(b.cargo || '', 'pt-BR', { sensitivity: 'base' });
    case 'login':
      return a.login.localeCompare(b.login, 'pt-BR', { sensitivity: 'base' });
    case 'perfil': {
      const la = ROLES[a.perfil]?.label || a.perfil;
      const lb = ROLES[b.perfil]?.label || b.perfil;
      return la.localeCompare(lb, 'pt-BR', { sensitivity: 'base' });
    }
    default:
      return 0;
  }
}

function _rowUsuario(u) {
  const isSelf = CU?.login === u.login;
  const roleLabel = ROLES[u.perfil]?.label || u.perfil;

  return `
    <tr>
      <td class="td-cap">${_esc(u.nome)}</td>
      <td class="td-cap">${_esc(u.cargo || '—')}</td>
      <td class="td-cap"><code>${_esc(u.login)}</code></td>
      <td class="td-cap">${_esc(roleLabel)}</td>
      <td>
        <button class="btn btn-sm btn-gh" id="btn-edit-${u.login}" title="Editar">✏️ Editar</button>
        <button class="btn btn-sm btn-gh" id="btn-reset-${u.login}" title="Resetar senha para o login">🔑 Resetar</button>
        ${isSelf
          ? `<span title="Você não pode desativar sua própria conta" style="opacity:.4;font-size:11px;margin-left:6px">(você)</span>`
          : `<button class="btn btn-sm btn-gh" id="btn-toggle-${u.login}" title="${u.ativo !== false ? 'Desativar' : 'Reativar'}">${u.ativo !== false ? '🚫 Desativar' : '✅ Reativar'}</button>`
        }
      </td>
    </tr>`;
}

// ── Modal de criação/edição ────────────────────────────────────
function _openForm(login) {
  _editId = login;
  const db = getDB();
  const u  = login ? db.usuarios.find(x => x.login === login) : null;

  const me = document.getElementById('me-t');
  const mb = document.getElementById('me-b');
  if (me) me.textContent = u ? `Editar Usuário — ${u.nome}` : 'Novo Usuário';

  const perfilOptions = Object.entries(ROLES)
    .map(([key, r]) => `<option value="${key}" ${u?.perfil === key ? 'selected' : ''}>${r.label}</option>`)
    .join('');

  if (mb) {
    mb.innerHTML = `
      <div class="fg">
        <label>Nome completo</label>
        <input type="text" id="me-nome" value="${u ? _escAttr(u.nome) : ''}" placeholder="Ex: João da Silva">
      </div>
      <div class="fg" style="margin-top:10px">
        <label>Cargo</label>
        <input type="text" id="me-cargo" value="${u ? _escAttr(u.cargo || '') : ''}" placeholder="Ex: Técnico de Manutenção">
      </div>
      <div class="fg" style="margin-top:10px">
        <label>Login ${u ? '(não editável)' : '(gerado a partir do nome)'}</label>
        <input type="text" id="me-login" value="${u ? _escAttr(u.login) : ''}" placeholder="ex: joao.silva" ${u ? 'disabled' : ''}>
      </div>
      <div class="fg" style="margin-top:10px">
        <label>Perfil de Acesso</label>
        <select id="me-perfil">${perfilOptions}</select>
      </div>
      ${!u ? `
      <div class="alert inf show" style="display:block;margin-top:10px;font-size:12px">
        ℹ️ A senha provisória será igual ao login. O usuário deve trocá-la
        no primeiro acesso, ou o administrador pode resetá-la depois.
      </div>` : ''}`;

    // Auto-gera login a partir do nome (só na criação)
    if (!u) {
      document.getElementById('me-nome').addEventListener('input', (e) => {
        const slug = _slugify(e.target.value);
        document.getElementById('me-login').value = slug;
      });
    }
  }

  document.getElementById('btn-edit-save').onclick = _saveForm;
  openM('m-edit');
}

async function _saveForm() {
  const nome   = document.getElementById('me-nome')?.value?.trim();
  const cargo  = document.getElementById('me-cargo')?.value?.trim() || '';
  const login  = document.getElementById('me-login')?.value?.trim().toLowerCase();
  const perfil = document.getElementById('me-perfil')?.value;

  if (!nome || !login || !perfil) {
    showToast('Preencha todos os campos.', 'er');
    return;
  }
  if (!ROLES[perfil]) {
    showToast('Perfil inválido.', 'er');
    return;
  }

  const db = getDB();

  if (_editId) {
    // ── Edição: nome, cargo e perfil. Login é imutável. ──
    const u = db.usuarios.find(x => x.login === _editId);
    if (!u) { showToast('Usuário não encontrado.', 'er'); return; }

    // Trava extra: impedir que o admin remova o próprio perfil admin
    // (evita lockout — ninguém mais poderia gerenciar usuários)
    if (u.login === CU.login && u.perfil === 'admin' && perfil !== 'admin') {
      const outrosAdmins = db.usuarios.some(x => x.login !== u.login && x.perfil === 'admin' && x.ativo !== false);
      if (!outrosAdmins) {
        showToast('Não é possível remover o último administrador do sistema.', 'er');
        return;
      }
    }

    u.nome   = nome;
    u.cargo  = cargo;
    u.perfil = perfil;
  } else {
    // ── Criação ──
    if (db.usuarios.some(x => x.login === login)) {
      showToast('Já existe um usuário com esse login.', 'er');
      return;
    }
    const senhaHash = await hashPassword(login); // senha provisória = login
    db.usuarios.push({ login, nome, cargo, perfil, senhaHash, ativo: true, primeiroAcesso: true });
  }

  saveDB();
  closeM('m-edit');
  showToast(_editId ? 'Usuário atualizado.' : 'Usuário criado.', 'ok');
  render();
}

// ── Resetar senha para login ───────────────────────────────────
async function _resetSenha(login) {
  if (!confirm(`Resetar a senha de "${login}" para o valor padrão (igual ao login)?`)) return;

  const db = getDB();
  const u  = db.usuarios.find(x => x.login === login);
  if (!u) return;

  u.senhaHash = await hashPassword(login);
  u.primeiroAcesso = true;
  saveDB();
  showToast(`Senha de ${u.nome} resetada para o padrão.`, 'ok');
}

// ── Ativar/Desativar (soft-delete) ──────────────────────────────
function _toggleAtivo(login) {
  const db = getDB();
  const u  = db.usuarios.find(x => x.login === login);
  if (!u) return;

  if (u.login === CU.login) {
    showToast('Você não pode desativar sua própria conta.', 'er');
    return;
  }

  // Trava extra: impedir desativar o último admin ativo
  if (u.perfil === 'admin' && u.ativo !== false) {
    const outrosAdmins = db.usuarios.some(x => x.login !== u.login && x.perfil === 'admin' && x.ativo !== false);
    if (!outrosAdmins) {
      showToast('Não é possível desativar o último administrador do sistema.', 'er');
      return;
    }
  }

  const novoStatus = u.ativo === false;
  if (!novoStatus && !confirm(`Desativar o acesso de "${u.nome}"? Ele(a) não poderá mais fazer login.`)) return;

  u.ativo = novoStatus;
  saveDB();
  showToast(novoStatus ? `${u.nome} reativado.` : `${u.nome} desativado.`, 'ok');
  render();
}

// ── Helpers locais ───────────────────────────────────────────
function _slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .trim()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9.\-]/g, '');
}

function _esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;',
  }[c]));
}

function _escAttr(str) {
  return _esc(str).replace(/`/g, '&#96;');
}

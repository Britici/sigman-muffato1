// ============================================================
// SIGMAN v2.0 — utils.js
// Helpers idênticos ao v1 + funções de UI globais
// ============================================================

export const v   = id => { const el = document.getElementById(id); return el ? el.value : ''; };
export const sv  = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
export const today = () => new Date().toISOString().slice(0, 10);

export function fd(d) {
  if (!d) return '—';
  const s = String(d).slice(0, 10);
  const p = s.split('-');
  return p.length === 3 && p[0].length === 4 ? `${p[2]}/${p[1]}/${p[0]}` : s;
}

export function debounce(fn, ms = 300) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// ── Badges ──────────────────────────────────────────────────
export function prio(p) {
  if (!p) return '';
  const c = { '1':'b-c1','2':'b-c2','3':'b-c3','4':'b-c4','Alta':'b-c2','Média':'b-c3','Baixa':'b-c4','Urgente':'b-c1' };
  const d = { '1':'d-1','2':'d-2','3':'d-3','4':'d-4','Alta':'d-2','Média':'d-3','Baixa':'d-4','Urgente':'d-1' };
  const lbl = { '1':'1 – Crítico','2':'2 – Alta','3':'3 – Média','4':'4 – Baixa' };
  return `<span class="badge ${c[p]||''}"><span class="pdot ${d[p]||''}"></span>${lbl[p]||p}</span>`;
}

export function tipoBadge(t) {
  if (!t) return '';
  const c = { Corretiva:'b-cor',Preventiva:'b-pre',Preditiva:'b-prd',Melhoria:'b-mel','Inspeção':'b-ins' };
  return `<span class="badge ${c[t]||''}">${t}</span>`;
}

export function stBadge(s) {
  const c = { Pendente:'b-pen',Concluída:'b-con',Atrasada:'b-atr',Executada:'b-con','Não Executada':'b-nexe','Em andamento':'b-pen',Aberta:'b-pen','Aguardando Aprovação':'b-atr' };
  return `<span class="badge ${c[s]||''}">${s}</span>`;
}

export function roleBadge(t) {
  const c = { administracao:'b-adm',manutencao:'b-man',producao:'b-pro',diretoria:'b-adm',supervisao:'b-man',planejamento:'b-man' };
  const l = { administracao:'Administração',manutencao:'Manutenção',producao:'Produção',diretoria:'Diretoria',supervisao:'Supervisão',planejamento:'Planejamento' };
  return `<span class="badge ${c[t]||''}">${l[t]||t}</span>`;
}

// ── Modais ───────────────────────────────────────────────────
export function openM(id) { document.getElementById(id)?.classList.add('on'); }
export function closeM(id) { document.getElementById(id)?.classList.remove('on'); }

// ── Alert inline ─────────────────────────────────────────────
export function showAlert(id, msg, type = 'ok') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = `alert ${type} on`;
  setTimeout(() => el.classList.remove('on'), 4000);
}

// ── Toast ─────────────────────────────────────────────────────
export function showToast(msg, type = 'ok', dur = 3500) {
  let cont = document.getElementById('toast-cont');
  if (!cont) {
    cont = document.createElement('div');
    cont.id = 'toast-cont';
    document.body.appendChild(cont);
  }
  const icons = { ok:'✅', er:'❌', inf:'ℹ️', war:'⚠️' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
  cont.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, dur);
}

// ── Numeração ─────────────────────────────────────────────────
export function genNumero(prefix, contador, existentes) {
  let c = contador;
  const set = new Set(existentes);
  while (set.has(`${prefix}-${String(c).padStart(4,'0')}`)) c++;
  return `${prefix}-${String(c).padStart(4,'0')}`;
}

// ── Foto preview ──────────────────────────────────────────────
export function setupPhotoPreview(inputId, previewId, onReady) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Foto maior que 5MB.','er'); input.value=''; return; }
    const reader = new FileReader();
    reader.onload = e => {
      const b64 = e.target.result.split(',')[1];
      const prev = document.getElementById(previewId);
      if (prev) prev.innerHTML = `
        <img src="${e.target.result}" class="photo-thumb" alt="Foto">
        <div style="font-size:12px;color:var(--txt2)">
          <strong>${file.name}</strong><br>
          <span style="color:var(--txt3)">${(file.size/1024).toFixed(0)} KB</span>
        </div>`;
      if (onReady) onReady(b64, file);
    };
    reader.readAsDataURL(file);
  });
}

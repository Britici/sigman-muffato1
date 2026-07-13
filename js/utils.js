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
  // ⚠️ BUG encontrado na sessão anterior (2026-07-01) e corrigido agora:
  // a zona visível (.photo-zone, pai do input) nunca tinha um listener
  // de clique que chamasse input.click() — só o <input> escondido
  // reagia a 'change'. Clicar em "📷 Clique para anexar foto" não
  // abria o seletor de arquivo nenhuma vez. A zona pode conter outros
  // elementos (preview/imagem já escolhida) — o clique precisa
  // funcionar em qualquer ponto dela, não só numa área vazia.
  const zone = input.closest('.photo-zone') || input.parentElement;
  if (zone && !zone.dataset.photoZoneBound) {
    zone.dataset.photoZoneBound = '1'; // evita duplo bind se setupPhotoPreview for chamada 2x pro mesmo input
    zone.addEventListener('click', () => input.click());
  }
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Foto maior que 5MB.','er'); input.value=''; return; }
    const reader = new FileReader();
    reader.onload = e => {
      _resizeImage(e.target.result, 1900, 1080).then(({dataUrl, b64, w, h}) => {
        const prev = document.getElementById(previewId);
        if (prev) prev.innerHTML = `
          <img src="${dataUrl}" class="photo-thumb" alt="Foto">
          <div style="font-size:12px;color:var(--txt2)">
            <strong>${file.name}</strong><br>
            <span style="color:var(--txt3)">${w}×${h}px</span>
          </div>`;
        // onReady recebe o b64 já reduzido, não o arquivo original —
        // é isso que vai pra fotoUrl (data:...;base64,${b64}).
        if (onReady) onReady(b64, file);
      }).catch(() => {
        showToast('Não foi possível processar a foto.', 'er');
        input.value = '';
      });
    };
    reader.readAsDataURL(file);
  });
}

// Reduz a imagem pra caber em maxW×maxH (mantém proporção, nunca
// amplia foto menor). Reencoda sempre em JPEG 0.85 — o que entra pela
// câmera de celular hoje em dia costuma vir em 3000px+/HEIC, e como
// fotoUrl vira base64 dentro do localStorage (ver pendência crítica
// no contexto do projeto), cada foto sem redução pesa MB e estoura a
// cota do navegador rápido com poucas OS. 1900x1080 é resolução Full
// HD+ — sobra nitidez pra olhar detalhe de peça/painel, sem inflar o
// storage.
function _resizeImage(dataUrl, maxW, maxH) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width: w, height: h } = img;
      const scale = Math.min(1, maxW / w, maxH / h); // nunca amplia (scale > 1 vira 1)
      w = Math.round(w * scale);
      h = Math.round(h * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const outDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      resolve({ dataUrl: outDataUrl, b64: outDataUrl.split(',')[1], w, h });
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

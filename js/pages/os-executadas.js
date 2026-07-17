// ============================================================
// SIGMAN v2.0 — pages/os-executadas.js
// ============================================================

import { getDB, saveDB, apiPost } from '../api.js';
import { CU, updOSHoje } from '../auth.js';
import { v, sv, fd, today, prio, tipoBadge, stBadge, openM, closeM, showToast, debounce, setupPhotoPreview } from '../utils.js';
import { elegiveisProd, elegiveisManut } from '../hierarquia.js';

let _sort = { col:'numero', dir:'desc' };
let _curOS = null;
let _concluirId = null, _concluirTipo = null;
// ⚠️ Mesmo bug do os-abertura.js (corrigido lá em 2026-06-30): o
// router alterna .on mas não recria o DOM desta página, e init() roda
// a cada navegação. Sem esta guarda, cada visita empilhava mais um
// listener em btn-concluir/btn-export-csv/md-*-btn + todos os filtros
// e headers de ordenação — N visitas = _concluir() disparando N vezes
// por clique (apiPost/historico duplicados). Encontrado e corrigido
// em 2026-07-01, antes do Bloco 5.
let _bound = false;
let _fotosDataUrl = []; // fotos anexadas no modal de Atender/Concluir (múltiplas)
let _waText = ''; // texto do whatsapp em memória — card visual removido, só o botão "Copiar" fica

export function init() {
  _populateFiltros();
  if (!_bound) {
    _bound = true;
    _bindFiltros();
    _bindSortHeaders();
    document.getElementById('md-wa-btn')?.addEventListener('click', () => {
      navigator.clipboard.writeText(_waText||'').then(()=>showToast('Copiado!'));
    });
    document.getElementById('md-print-btn')?.addEventListener('click', _imprimirOS);
    document.getElementById('md-continuar-btn')?.addEventListener('click', () => { if (_curOS) _continuarOS(_curOS.numero); });
    document.getElementById('md-rac-btn')?.addEventListener('click', () => { if(_curOS) abrirRAC(_curOS); });
    document.getElementById('btn-concluir')?.addEventListener('click', _concluir);
    document.getElementById('btn-export-csv')?.addEventListener('click', exportCSV);
    setupPhotoPreview('mc-photo-input', 'mc-photo-preview', (dataUrls) => {
      _fotosDataUrl = dataUrls;
    });
  }
  render();
}

function _populateFiltros() {
  const db = getDB();
  const slSel = document.getElementById('fe-sl');
  if (slSel) {
    const cur = slSel.value;
    const nomes = [...new Set((db.salas||[]).map(s=>s.nome))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
    slSel.innerHTML = '<option value="">Todas as Salas</option>';
    nomes.forEach(s => slSel.innerHTML += `<option value="${s}">${s}</option>`);
    if (cur) slSel.value = cur;
  }
  const mnSel = document.getElementById('fe-mn');
  if (mnSel) {
    const cur = mnSel.value;
    const manuts = [...new Set(db.ordens.map(o=>o.manut).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
    mnSel.innerHTML = '<option value="">Todos os Manut.</option>';
    manuts.forEach(m => mnSel.innerHTML += `<option value="${m}">${m}</option>`);
    if (cur) mnSel.value = cur;
  }
}

function _bindFiltros() {
  const renderD = debounce(render, 280);
  document.getElementById('fe-tx')?.addEventListener('input', renderD);
  ['fe-tp','fe-st','fe-sl','fe-mn','fe-dt-ini','fe-dt-fim'].forEach(id =>
    document.getElementById(id)?.addEventListener('change', render));
}

function _bindSortHeaders() {
  document.querySelectorAll('#pg-executadas th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      _sort.dir = (_sort.col===col && _sort.dir==='asc') ? 'desc' : 'asc';
      _sort.col = col;
      render();
    });
  });
}

export function render() {
  const db = getDB();
  _populateFiltros();
  const tx=v('fe-tx').toLowerCase(), tp=v('fe-tp'), st=v('fe-st'), sl=v('fe-sl'),
        mn=v('fe-mn'), dtI=v('fe-dt-ini'), dtF=v('fe-dt-fim');
  let data = [...db.ordens];
  if (tx)  data = data.filter(o=>[o.numero,o.sala,o.maq,o.manut,o.tipo,o.prob].some(x=>x&&x.toLowerCase().includes(tx)));
  if (tp)  data = data.filter(o=>o.tipo===tp);
  if (st)  data = data.filter(o=>_status(o)===st);
  if (sl)  data = data.filter(o=>o.sala===sl);
  if (mn)  data = data.filter(o=>o.manut===mn);
  if (dtI) data = data.filter(o=>o.data>=dtI);
  if (dtF) data = data.filter(o=>o.data<=dtF);
  const pm = {'1':1,'2':2,'3':3,'4':4,'Alta':2,'Média':3,'Baixa':4,'Urgente':1};
  data.sort((a,b)=>{
    let va=a[_sort.col]||'', vb=b[_sort.col]||'';
    if (_sort.col==='prioridade'){va=pm[va]||9;vb=pm[vb]||9;return _sort.dir==='asc'?va-vb:vb-va;}
    const c=String(va).localeCompare(String(vb),'pt-BR',{numeric:true});
    return _sort.dir==='asc'?c:-c;
  });
  document.querySelectorAll('#pg-executadas th.sortable').forEach(th=>{
    th.classList.remove('asc','desc');
    if(th.dataset.col===_sort.col) th.classList.add(_sort.dir);
  });
  const tb = document.getElementById('tb-exec');
  if (!tb) return;
  if (!data.length) { tb.innerHTML=`<tr><td colspan="11"><div class="empty"><div class="ei">📋</div><p>Nenhuma ordem encontrada.</p></div></td></tr>`; return; }
  tb.innerHTML = data.map(o=>{
    const status = _status(o);
    const temHist = (o.historico_intervalos || []).length > 0;
    const acoes = status==='aberta'
      ? (temHist
          ? `<button class="btn btn-sm btn-p" onclick="window._continuarOS('${o.numero}')">▶ Continuar</button>`
          : `<button class="btn btn-sm btn-p" onclick="window._atender('${o.numero}')">▶ Atender</button>`)
      : `<button class="btn btn-sm btn-gh" onclick="window._verDet('${o.numero}')">Ver</button>`;
    return `<tr>
    <td style="white-space:nowrap">
      <div style="display:flex;align-items:center;gap:4px">
        ${_precisaRAC(o)?`<span class="rac-dot" title="RAC obrigatório"></span>`:''}
        <span class="osn">${o.numero}</span>
      </div>
    </td>
    <td style="font-size:12px;white-space:nowrap">${fd(o.data)}</td>
    <td>${o.sala}</td>
    <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${o.maq}">${o.maq}</td>
    <td>${tipoBadge(o.tipo)}</td>
    <td>${prio(o.prioridade)}</td>
    <td>${stBadge(_statusLabel(status))}</td>
    <td style="font-size:12px">${o.manut||'—'}</td>
    <td style="font-family:var(--fm);font-size:11px;white-space:nowrap">
      ${o.ini&&o.fim?`${o.ini}–${o.fim}`:'—'}
      ${o.durMin?`<br><span style="color:var(--txt3)">${o.durMin}min</span>`:''}
    </td>
    <td>${_thumbLista(o)}</td>
    <td><div style="display:flex;gap:4px">
      ${acoes}
      <button class="btn btn-d" onclick="window._delOS('${o.numero}')">✕</button>
    </div></td>
  </tr>`;
  }).join('');
  window._verDet  = verDet;
  window._delOS   = delOS;
  window._atender = numero => abrirConcluir(numero, 'os');
  window._continuarOS = _continuarOS;
  window._ampliarFoto = _ampliarFoto;
}

// Miniatura da 1ª foto da OS na listagem (Executadas). Se houver mais
// de uma, só a 1ª aparece aqui — a galeria completa fica na tela de
// detalhe (Ver → 📷 Fotos). Clicar amplia a mesma 1ª foto em tamanho
// real; pra ver as demais, usar "Ver".
function _thumbLista(o) {
  const url = (o.fotos && o.fotos[0]) || o.fotoUrl;
  if (!url) return '<span style="color:var(--txt3)">—</span>';
  return `<img src="${url}" alt="Foto" title="Clique pra ampliar"
    style="width:40px;height:40px;object-fit:cover;border-radius:4px;cursor:pointer;border:1px solid var(--bord)"
    onclick="window._ampliarFoto('${url}')">`;
}

// Lightbox simples — cria um overlay full-screen com a foto em
// tamanho real, sem precisar de mais um modal fixo no index.html.
// Clicar em qualquer lugar (ou Esc) fecha.
function _ampliarFoto(url) {
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;cursor:zoom-out;padding:24px';
  ov.innerHTML = `<img src="${url}" style="max-width:100%;max-height:100%;border-radius:var(--rs);box-shadow:var(--shad)" alt="Foto ampliada">`;
  const fechar = () => { ov.remove(); document.removeEventListener('keydown', onEsc); };
  const onEsc = e => { if (e.key === 'Escape') fechar(); };
  ov.addEventListener('click', fechar);
  document.addEventListener('keydown', onEsc);
  document.body.appendChild(ov);
}

// Status efetivo de uma OS. Registros antigos (legado, criados antes
// do conceito de status existir) não têm o campo — tratamos como
// concluída, igual sempre foram na prática.
function _status(o) { return o.status || 'concluida'; }
function _statusLabel(status) {
  return { aberta:'Aberta', aguardando_aprovacao:'Aguardando Aprovação', concluida:'Concluída' }[status] || 'Concluída';
}

export function verDet(numero) {
  const db=getDB(), o=db.ordens.find(x=>x.numero===numero);
  if (!o) return;
  _curOS = o;
  document.getElementById('md-n').textContent = o.numero;
  document.getElementById('md-t').textContent = `${o.sala} · ${o.maq}`;
  document.getElementById('md-b').innerHTML = `
    <div class="dr"><span class="dl">Status</span><span class="dv">${stBadge(_statusLabel(_status(o)))}</span></div>
    <div class="dr"><span class="dl">Sala</span><span class="dv">${o.sala}</span></div>
    <div class="dr"><span class="dl">Máquina</span><span class="dv">${o.maq}</span></div>
    <div class="dr"><span class="dl">Tipo</span><span class="dv">${tipoBadge(o.tipo)}</span></div>
    <div class="dr"><span class="dl">Prioridade</span><span class="dv">${prio(o.prioridade)}</span></div>
    ${o.solicitante?`<div class="dr"><span class="dl">Solicitante</span><span class="dv">${o.solicitante}</span></div>`:''}
    <div class="dr"><span class="dl">Data</span><span class="dv">${fd(o.data)}</span></div>
    ${o.paradaMin?`<div class="dr"><span class="dl">Parada</span><span class="dv">${o.paradaMin}min</span></div>`:''}
    <div class="dr"><span class="dl">Problema</span><span class="dv">${o.prob||'—'}</span></div>
    ${_listaServicosDet(o)}
    ${o.acaoPrev?`<div class="dr"><span class="dl">Ação Preventiva</span><span class="dv">${o.acaoPrev}</span></div>`:''}
    ${_galeriaFotos(o.fotos, o.fotoUrl)}
    ${o.origem&&o.origem!=='direta'?`<div class="dr"><span class="dl">Origem</span><span class="dv" style="color:var(--red)">${o.origemNum||o.origem}</span></div>`:''}
    ${_blocoConcluidaDet(o)}
    ${_blocoAprovacao(o)}`;
  const servicosWa = _todosServicos(o).map(s => `${s.dataLabel} ${s.ini}–${s.fim} (${s.manut}):\n${s.acao}`).join('\n\n');
  _waText=`*${o.numero} — Ordem de Serviço*\n\n*Sala:* ${o.sala}\n*Máquina:* ${o.maq}\n*Problema:* ${o.prob||'—'}\n*Tipo:* ${o.tipo}\n*Prioridade:* ${o.prioridade}\n*Parada:* ${o.paradaMin||'?'}min\n\n${servicosWa||o.acao||''}`;
  const waBtn=document.getElementById('md-wa-btn');
  if(waBtn) waBtn.style.display='inline-block';
  document.getElementById('md-print-btn').style.display='inline-block';
  // Bloco 6 — "Continuar O.S.": só faz sentido pra quem já foi
  // atendida parcialmente (status 'aberta' MAS já tem histórico de
  // intervalo — se nunca foi atendida, o botão certo é "▶ Atender",
  // que já existe na listagem).
  const btnContinuar = document.getElementById('md-continuar-btn');
  if (btnContinuar) {
    const temHistorico = _status(o) === 'aberta' && (o.historico_intervalos || []).length > 0;
    btnContinuar.style.display = temHistorico ? 'block' : 'none';
  }
  document.getElementById('md-rac-btn').style.display=_precisaRAC(o)?'inline-block':'none';
  window._aprovarProd  = _aprovarProd;
  window._aprovarManut = _aprovarManut;
  window._toggleConcluidaDet = _toggleConcluidaDet;
  window._continuarOS  = _continuarOS;
  openM('m-det');
}

// Bloco 5 — checkbox "Concluída" no detalhe da OS (m-det). Só faz
// sentido pra status que já têm um intervalo ativo preenchido
// (aguardando_aprovacao/concluida) — pra 'aberta' não há nada ativo
// pra "desconcluir"; mostra só um resumo do histórico, se existir, e
// aponta pro botão Atender.
// Todos os serviços já executados nesta OS, em ordem cronológica:
// cada intervalo do histórico + o atendimento atual (se já tiver algo
// preenchido). Cada item = {manut, dataLabel, ini, fim, acao}.
function _todosServicos(o) {
  const hist = (o.historico_intervalos || []).map(h => ({
    manut: h.manut || '—', dataLabel: h.registradoEm ? fd(h.registradoEm.slice(0,10)) : fd(o.data),
    ini: h.ini || '—', fim: h.fim || '—', acao: h.acao || '—',
  }));
  const atual = (o.acao || o.ini || o.fim) ? [{
    manut: o.manut || '—', dataLabel: fd(o.data), ini: o.ini || '—', fim: o.fim || '—', acao: o.acao || '—',
  }] : [];
  return [...hist, ...atual];
}

// Bloco "Serviços Executados" no Detalhe — todos os atendimentos
// (histórico + atual), cada um com manutentor, data, horário e
// descrição completa do que foi feito. Substitui as linhas soltas de
// Manutentor/Horário/Ação Executada quando há mais de 1 atendimento.
function _listaServicosDet(o) {
  const servicos = _todosServicos(o);
  if (!servicos.length) return '<div class="dr"><span class="dl">Ação Executada</span><span class="dv">—</span></div>';
  return `<div class="dr" style="flex-direction:column;gap:8px">
    <span class="dl">Serviços Executados${servicos.length>1?` (${servicos.length})`:''}</span>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${servicos.map(s => `
        <div style="background:var(--surf2);border:1px solid var(--bord);border-radius:var(--rs);padding:10px 12px">
          <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;font-size:11px;color:var(--txt3);margin-bottom:6px">
            <span>👤 ${s.manut}</span><span>📅 ${s.dataLabel} · ${s.ini}–${s.fim}</span>
          </div>
          <div style="font-size:13px;color:var(--txt)">${s.acao}</div>
        </div>`).join('')}
    </div>
  </div>`;
}

function _blocoConcluidaDet(o) {
  const hist = o.historico_intervalos || [];
  const histThumbs = _thumbsHistorico(hist);
  if (o.status === 'aberta') {
    if (!hist.length) return '';
    return `<div class="dr" style="flex-direction:column;gap:8px"><span class="dl">Histórico</span><span class="dv" style="color:var(--txt3)">${hist.length} intervalo(s) anterior(es) — use "▶ Continuar O.S." abaixo pra continuar</span>${histThumbs}</div>`;
  }
  if (o.status !== 'aguardando_aprovacao' && o.status !== 'concluida') return '';
  const histTag = hist.length ? ` <span style="color:var(--txt3);font-weight:400">(+${hist.length} intervalo(s) anterior(es))</span>` : '';
  return `
    <div class="dr" style="align-items:center;gap:8px">
      <input type="checkbox" id="det-concluida" checked class="chk-quad"
        onchange="window._toggleConcluidaDet('${o.numero}', this.checked)">
      <label for="det-concluida" style="margin:0;font-weight:600;cursor:pointer">Concluída${histTag}</label>
    </div>
    ${histThumbs}`;
}

// Galeria de fotos da OS (campo ativo). Usa o.fotos[] quando existe;
// registros antigos (antes desta mudança) só têm o.fotoUrl singular —
// fallback garante que continuam aparecendo normalmente.
function _galeriaFotos(fotos, fotoUrlLegado) {
  const lista = (fotos && fotos.length) ? fotos : (fotoUrlLegado ? [fotoUrlLegado] : []);
  if (!lista.length) return '';
  return `<div class="dr" style="flex-direction:column;gap:8px"><span class="dl">📷 Foto${lista.length>1?`s (${lista.length})`:''}</span>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      ${lista.map((url,i) => `<a href="${url}" target="_blank"><img src="${url}" style="max-width:180px;max-height:180px;border-radius:var(--rs);object-fit:cover;border:1px solid var(--bord)" alt="Foto OS ${i+1}"></a>`).join('')}
    </div></div>`;
}

// Miniaturas (120x120, mesma classe .photo-thumb do upload) das fotos
// dos intervalos anteriores — cada intervalo pode ter várias fotos
// (o.fotos[]); fallback pro fotoUrl singular em registros antigos.
function _thumbsHistorico(hist) {
  const comFoto = hist.filter(h => (h.fotos && h.fotos.length) || h.fotoUrl);
  if (!comFoto.length) return '';
  return `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
    ${comFoto.map((h) => {
      const fotos = (h.fotos && h.fotos.length) ? h.fotos : [h.fotoUrl];
      const tip = `${h.manut||''} · ${h.ini||'?'}–${h.fim||'?'} · ${fd(h.registradoEm)}`;
      return fotos.map((url,i) => `
        <a href="${url}" target="_blank" title="${tip}">
          <img src="${url}" class="photo-thumb" alt="Foto intervalo ${i+1}">
        </a>`).join('');
    }).join('')}
  </div>`;
}

// Desmarcar aqui = mesma ação do checkbox no modal de Atender, mas a
// partir dos dados JÁ salvos na OS (não de um formulário aberto).
// Marcar de volta não faz nada por si só (não existe ação simétrica —
// reabrir uma OS concluída não é o mesmo que "concluir de novo" sem
// passar pelo fluxo de aprovação); por isso só tratamos o uncheck.
function _toggleConcluidaDet(numero, checked) {
  if (checked) { verDet(numero); return; } // ignora recheck, só re-renderiza como estava
  const db = getDB(), o = db.ordens.find(x => x.numero === numero);
  if (!o) return;
  if (!confirm(`Marcar ${o.numero} como NÃO concluída? O intervalo atual (${o.ini||'?'}–${o.fim||'?'}) vai pro histórico e a OS volta pra "Aberta".`)) {
    verDet(numero); // reverte visualmente o checkbox (re-renderiza como estava)
    return;
  }
  const agora = new Date().toISOString();
  _registrarIntervaloParcial(o, {
    manut: o.manut, manutLogin: o.manutLogin, ini: o.ini, fim: o.fim,
    durMin: o.durMin, paradaMin: o.paradaMin, acao: o.acao, agora,
  });
  saveDB();
  showToast(`${o.numero} — voltou pra "Aberta", intervalo no histórico.`, 'ok');
  verDet(numero); render(); updOSHoje();
}

function _blocoAprovacao(o) {
  const status = _status(o);
  if (status === 'aberta' || status === 'concluida') return '';
  const prodPendente  = !!o.aprovadorProdLogin && !o.aprovadoProdEm;
  const manutPendente = !o.aprovadoManutEm;
  const podeProd  = prodPendente  && elegiveisProd(o).includes(CU?.login);
  const podeManut = manutPendente && elegiveisManut(o).includes(CU?.login);
  return `
    <div class="dr" style="margin-top:10px;padding-top:10px;border-top:1px solid var(--bord);flex-direction:column;gap:8px;align-items:stretch">
      <div class="dr"><span class="dl">Aprovação Produção</span><span class="dv">${
        !o.aprovadorProdLogin ? 'Não se aplica' : (o.aprovadoProdEm ? `✅ ${o.aprovadorProd}` : `⏳ Pendente (${o.aprovadorProd})`)
      }</span></div>
      <div class="dr"><span class="dl">Aprovação Manutenção</span><span class="dv">${
        o.aprovadoManutEm ? `✅ ${o.aprovadorManut}` : '⏳ Pendente'
      }</span></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${podeProd  ? `<button class="btn btn-sm btn-g" onclick="window._aprovarProd('${o.numero}')">✓ Aprovar Produção</button>`  : ''}
        ${podeManut ? `<button class="btn btn-sm btn-g" onclick="window._aprovarManut('${o.numero}')">✓ Aprovar Manutenção</button>` : ''}
      </div>
    </div>`;
}

function _tentarConcluir(o) {
  const prodOK  = !o.aprovadorProdLogin || !!o.aprovadoProdEm;
  const manutOK = !!o.aprovadoManutEm;
  if (prodOK && manutOK) { o.status = 'concluida'; o.concluidoEm = new Date().toISOString(); }
}

function _aprovarProd(numero) {
  const db=getDB(), o=db.ordens.find(x=>x.numero===numero);
  if (!o || !elegiveisProd(o).includes(CU?.login)) return;
  o.aprovadorProd = CU.nome; o.aprovadorProdLogin = CU.login; // registra quem de fato aprovou
  o.aprovadoProdEm = new Date().toISOString();
  _tentarConcluir(o);
  saveDB(); _logEdit('Aprovou (Produção)', o.numero, `${o.sala} · ${o.maq}`);
  showToast(`${o.numero} — produção aprovou.`,'ok');
  verDet(numero); render(); updOSHoje();
}

function _aprovarManut(numero) {
  const db=getDB(), o=db.ordens.find(x=>x.numero===numero);
  if (!o || !elegiveisManut(o).includes(CU?.login)) return;
  o.aprovadorManut = CU.nome; o.aprovadorManutLogin = CU.login;
  o.aprovadoManutEm = new Date().toISOString();
  _tentarConcluir(o);
  saveDB(); _logEdit('Aprovou (Manutenção)', o.numero, `${o.sala} · ${o.maq}`);
  showToast(`${o.numero} — manutenção aprovou.${o.status==='concluida'?' OS concluída.':''}`,'ok');
  verDet(numero); render(); updOSHoje();
}

export function delOS(numero) {
  if (!confirm(`Excluir ${numero}?`)) return;
  const db=getDB(), os=db.ordens.find(o=>o.numero===numero);
  if (!os) return;
  db.ordens=db.ordens.filter(o=>o.numero!==numero);
  _logEdit('Excluiu OS', numero, `${os.sala} · ${os.maq}`);
  saveDB(); render(); updOSHoje();
  apiPost({action:'delete',sheet:'ordens',id:numero,idCol:'OS_Numero'});
  showToast(`${numero} excluída.`,'war');
}

// Bloco 6 — "Continuar O.S.": mesma modal de Atender/Concluir
// (m-con), mas em vez de abrir em branco, usa o último registro de
// historico_intervalos[] como ponto de partida — evita retypar o que
// já tinha sido levantado no atendimento anterior. Datas/horários
// ficam em branco de propósito (é um novo período de trabalho sendo
// registrado agora, não o mesmo horário de antes); só o texto do
// serviço executado e o manutentor vêm sugeridos, editáveis.
function _continuarOS(numero) {
  closeM('m-det');
  abrirConcluir(numero, 'os'); // já reseta os campos e abre o modal
  const db = getDB();
  const o = db.ordens.find(x => x.numero === numero);
  const hist = o?.historico_intervalos || [];
  if (!hist.length) return;
  const ultimo = hist[hist.length - 1];
  document.getElementById('mc-tit').textContent = `Continuar ${numero}`;
  sv('mc-ds', ultimo.acao || '');
  if (ultimo.manutLogin) sv('mc-mn', ultimo.manutLogin);
  showToast(`Retomando de onde parou — ${hist.length} intervalo(s) anterior(es) no histórico.`);
}

export function abrirConcluir(id, tipo) {
  const db=getDB();
  _concluirId=id; _concluirTipo=tipo;
  const item = tipo==='plan' ? db.planejadas.find(x=>x.numero===id)
             : tipo==='os'   ? db.ordens.find(x=>x.numero===id)
             : null;
  if(!item){showToast('Item não encontrado.','er');return;}
  const desc = tipo==='os' ? item.prob : item.descricao;
  document.getElementById('mc-tit').textContent = tipo==='os' ? 'Atender Ordem de Serviço' : 'Concluir O.S. Planejada';
  document.getElementById('mc-inf').innerHTML=`
    <div style="background:var(--surf2);border:1px solid var(--bord);border-radius:var(--rs);padding:12px">
      <div class="osdisp">${item.numero}</div>
      <div style="font-weight:600;margin:4px 0">${item.sala} · ${item.maq}</div>
      <div style="font-size:12px;color:var(--txt3)">${item.tipo} · ${item.prioridade||''}</div>
      ${desc?`<div style="font-size:12px;color:var(--txt2);margin-top:8px;padding-top:8px;border-top:1px solid var(--bord)">${desc}</div>`:''}
    </div>`;
  sv('mc-dt',today()); _populateManutentoresModal(); sv('mc-mn',CU?.login||'');
  ['mc-in','mc-fm','mc-ds','mc-parada'].forEach(id=>sv(id,''));
  const cb = document.getElementById('mc-concluida');
  if (cb) cb.checked = true; // padrão: marcada (fluxo normal, igual antes do Bloco 5)
  _fotosDataUrl = [];
  const prev = document.getElementById('mc-photo-preview');
  if (prev) prev.innerHTML = '<span style="color:var(--txt3);font-size:13px">📷 Clique para anexar foto</span>';
  const inputFoto = document.getElementById('mc-photo-input');
  if (inputFoto) inputFoto.value = '';
  openM('m-con');
}

// Manutentor = usuário real (login), não mais texto livre.
function _populateManutentoresModal() {
  const db = getDB(), sel = document.getElementById('mc-mn');
  if (!sel) return;
  const users = (db.usuarios||[])
    .filter(u => ['manutencao','pcm','admin'].includes(u.perfil) && u.ativo!==false)
    .sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
  sel.innerHTML = '<option value="">Selecione...</option>' +
    users.map(u=>`<option value="${u.login}">${u.nome}</option>`).join('');
}

async function _concluir() {
  const db=getDB();
  const manutLogin=v('mc-mn'), desc=v('mc-ds').trim(),
        data=v('mc-dt'), ini=v('mc-in'), fim=v('mc-fm'),
        parada=parseInt(v('mc-parada'))||0;
  const concluida = document.getElementById('mc-concluida')?.checked !== false;
  if(!manutLogin||!desc){showToast('Selecione o manutentor e preencha o serviço executado.','er');return;}
  const manutUser=db.usuarios.find(u=>u.login===manutLogin);
  const manut=manutUser?.nome||manutLogin;
  const agora=new Date().toISOString();
  let durMin=0, paradaMin=parada;
  if(ini&&fim){const[h1,m1]=ini.split(':').map(Number),[h2,m2]=fim.split(':').map(Number);durMin=Math.max(0,(h2*60+m2)-(h1*60+m1));if(!paradaMin)paradaMin=durMin;}

  if (_concluirTipo === 'os') {
    const o = db.ordens.find(x=>x.numero===_concluirId);
    if(!o){showToast('OS não encontrada.','er');return;}

    if (!concluida) {
      // Bloco 5: atendimento parcial — snapshot do intervalo ativo vai
      // pro histórico, campos ativos limpam, status volta pra 'aberta'
      // (retomável depois via "Continuar O.S.", Bloco 6, ainda não
      // implementado). manut/manutLogin ficam (útil como sugestão de
      // quem continua) — só os 7 campos de intervalo são limpos, igual
      // à regra combinada.
      _registrarIntervaloParcial(o, {manut,manutLogin,ini,fim,durMin,paradaMin,acao:desc,fotoUrl:_fotosDataUrl[0]||'',fotos:_fotosDataUrl,agora});
      saveDB(); closeM('m-con');
      render(); updOSHoje();
      showToast(`${o.numero} — intervalo registrado, OS continua aberta.`,'ok');
      return;
    }

    // Atender uma OS aberta por produção: atualiza o mesmo registro,
    // não cria uma nova OS. aprovadorProdLogin já foi definido na
    // abertura (quem relatou o problema) — mantém.
    Object.assign(o,{manut,manutLogin,ini,fim,durMin,paradaMin,acao:desc,fotoUrl:_fotosDataUrl[0]||'',fotos:_fotosDataUrl,status:'aguardando_aprovacao'});
    saveDB(); closeM('m-con');
    _logEdit('Atendeu OS',o.numero,`${o.sala} · ${o.maq}`);
    render(); updOSHoje();
    showToast(`${o.numero} atendida — aguardando aprovação.`,'ok');
    apiPost({action:'update',sheet:'ordens',id:o.numero,idCol:'OS_Numero',row:{Manutentor:manut,Hora_Inicio:ini,Hora_Fim:fim,Duracao_Min:durMin,Tempo_Parada_Min:paradaMin,Acao_Executada:desc,Foto_Url:_fotosDataUrl[0]||''}});
    return;
  }

  // tipo 'plan'
  const item=db.planejadas.find(x=>x.numero===_concluirId);
  if(!item){showToast('Item não encontrado.','er');return;}

  if (!concluida) {
    // Bloco 5: planejada sem OS gerada ainda — não existe histórico de
    // intervalos pra ela (schema não modela isso, e não faz sentido:
    // só nasce 1 OS no momento da conclusão de fato). "Não concluída"
    // aqui só grava a tentativa mais recente nos mesmos campos de
    // execução do item (sobrescreve a anterior, se houver) e marca
    // 'Em andamento' — status já existe no enum planejada_status.
    Object.assign(item,{status:'Em andamento',manut,manutLogin,dtExec:data,ini,fim,durMin,paradaMin,desc2:desc});
    saveDB(); closeM('m-con');
    _logEdit('Registrou andamento',item.numero,`${item.sala} · ${item.maq}`);
    render(); updOSHoje();
    showToast(`${item.numero} — andamento registrado, ainda não concluída.`,'ok');
    apiPost({action:'update',sheet:'planejadas',id:item.numero,idCol:'PL_Numero',row:{Status:'Em andamento',Manutentor_Exec:manut,Data_Execucao:data,Hora_Inicio:ini,Hora_Fim:fim,Duracao_Min:durMin,Servico_Executado:desc}});
    return;
  }

  // concluir planejada, gera uma OS nova
  const numero=_genOS();
  const os={
    id:crypto.randomUUID(),numero,sala:item.sala,maq:item.maq,tipo:item.tipo,prioridade:item.prioridade,
    manut,manutLogin,data:data||today(),ini,fim,durMin,paradaMin,prob:item.descricao||'',acao:desc,fotoUrl:_fotosDataUrl[0]||'',fotos:_fotosDataUrl,
    criadoEm:agora,origem:_concluirTipo,origemNum:item.numero,
    status:'aguardando_aprovacao',
    // Planejada não tem solicitante de produção → aprovação de
    // produção não se aplica (mesma regra de quem abre por conta própria).
    solicitante:'',solicitanteLogin:'',aprovadorProd:'',aprovadorProdLogin:'',
    aprovadoProdEm:'',aprovadoManutEm:'',aprovadorManut:'',aprovadorManutLogin:'',
  };
  Object.assign(item,{status:'Concluída',concluidoEm:agora,manut,ini,fim,dtExec:data,desc2:desc,durMin});
  db.ordens.push(os); db.osC++;
  saveDB(); closeM('m-con');
  _logEdit('Concluiu',item.numero,`${item.sala} · ${item.maq}`);
  render(); updOSHoje();
  showToast(`${item.numero} concluída → ${numero} registrada.`,'ok');
  apiPost({action:'update',sheet:'planejadas',id:item.numero,idCol:'PL_Numero',row:{Status:'Concluída',Manutentor_Exec:manut,Data_Execucao:data,Hora_Inicio:ini,Hora_Fim:fim,Duracao_Min:durMin,Servico_Executado:desc,Concluido_Em:agora}});
  apiPost({action:'append',sheet:'ordens',row:{OS_Numero:numero,Data:data||today(),Sala:item.sala,Maquina:item.maq,Tipo:item.tipo,Prioridade:item.prioridade,Manutentor:manut,Hora_Inicio:ini,Hora_Fim:fim,Duracao_Min:durMin,Tempo_Parada_Min:paradaMin,Problema:item.descricao||'',Acao_Executada:desc,Foto_Url:_fotosDataUrl[0]||'',Origem:_concluirTipo,OS_Origem_Ref:item.numero,Criado_Em:agora}});
}

// Bloco 5 — move o intervalo ativo (o que acabou de ser preenchido no
// modal, para uma OS que já existia com status 'aberta'/'aguardando_
// aprovacao') pro histórico e limpa os campos ativos, deixando a OS
// pronta pra ser retomada. Reaproveitada tanto pelo modal de Atender
// quanto pelo checkbox no detalhe (m-det).
function _registrarIntervaloParcial(o, {manut, manutLogin, ini, fim, durMin, paradaMin, acao, fotoUrl, fotos, agora}) {
  o.historico_intervalos = o.historico_intervalos || [];
  o.historico_intervalos.push({
    manut, manutLogin, ini, fim, durMin, paradaMin,
    acao: acao || '', acaoPrev: o.acaoPrev || '',
    fotoUrl: fotoUrl || o.fotoUrl || '', fotos: (fotos && fotos.length) ? fotos : (o.fotos || []),
    registradoEm: agora,
  });
  // Campos ativos limpos (regra combinada: só estes 7, manut/manutLogin
  // ficam como estavam — sugestão de quem continua depois).
  Object.assign(o, {ini:'', fim:'', durMin:0, paradaMin:0, acao:'', acaoPrev:'', fotoUrl:'', fotos:[], status:'aberta',
    aprovadoProdEm:'', aprovadoManutEm:''}); // reabrir exige nova aprovação quando o trabalho for retomado
  _logEdit('Registrou intervalo (não concluída)', o.numero, `${o.sala} · ${o.maq}`);
  apiPost({action:'update',sheet:'ordens',id:o.numero,idCol:'OS_Numero',row:{Status:'aberta',Hora_Inicio:'',Hora_Fim:'',Duracao_Min:0,Tempo_Parada_Min:0,Acao_Executada:''}});
  apiPost({action:'append',sheet:'os_intervalos',row:{OS_Numero:o.numero,Manutentor:manut,Hora_Inicio:ini,Hora_Fim:fim,Duracao_Min:durMin,Tempo_Parada_Min:paradaMin,Tarefas_Executadas:acao,Foto_Url:fotoUrl||'',Registrado_Em:agora}});
}

export function abrirRAC(os) {
  closeM('m-det');
  const salaSel=document.getElementById('rac-sala');
  if(salaSel){salaSel.innerHTML=`<option value="${os.sala}">${os.sala}</option>`;salaSel.setAttribute('disabled','');}
  const equipSel=document.getElementById('rac-equip');
  if(equipSel){equipSel.innerHTML=`<option value="${os.maq}">${os.maq}</option>`;equipSel.setAttribute('disabled','');}
  sv('rac-data',os.data||today()); sv('rac-hora',os.ini||new Date().toTimeString().slice(0,5));
  sv('rac-falha',os.prob||''); sv('rac-imediata',os.acao||''); sv('rac-resp-manu',os.manut||'');
  ['rac-causa','rac-p1','rac-p2','rac-p3','rac-p4','rac-p5','rac-preventiva','rac-resp-prod','rac-exec'].forEach(id=>sv(id,''));
  window._racOsRef=os.numero;
  openM('mb-rac');
}

function _imprimirOS() {
  if(!_curOS) return;
  const o=_curOS;
  const win=window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>OS ${o.numero}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:11px;padding:15mm}
  .header{display:flex;justify-content:space-between;border-bottom:2px solid #C41230;padding-bottom:8px;margin-bottom:12px}
  h1{font-size:15px;color:#C41230}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}
  .f label{font-size:9px;font-weight:700;color:#888;text-transform:uppercase;display:block}
  .f p{border-bottom:1px solid #ccc;min-height:18px;padding:2px 0}
  .s-t{font-size:11px;font-weight:bold;background:#f0f0f0;padding:5px 8px;border-left:3px solid #C41230;margin-bottom:6px}
  .s-c{border:1px solid #ddd;padding:8px;min-height:40px;line-height:1.6;margin-bottom:10px}
  .ass{border-top:1px solid #000;width:200px;margin-top:40px;padding-top:4px;font-size:9px}
  @media print{body{padding:10mm}}</style></head><body>
  <div class="header">
    <div style="display:flex;align-items:center;gap:10px">
      <img src="https://muffatofoods.com.br/assets/images/foods_logo.png" style="height:40px" alt="M">
      <div><b>MUFFATO FOODS</b><br><span style="font-size:10px;color:#666">SIGMAN — Gestão de Manutenção</span></div>
    </div>
    <div style="text-align:center"><h1>ORDEM DE SERVIÇO</h1><b style="color:#C41230">${o.numero}</b></div>
    <div style="text-align:right;font-size:9px;color:#666">Doc: SIGMAN<br>Rev: 01</div>
  </div>
  <div class="grid">
    <div class="f"><label>Sala</label><p>${o.sala}</p></div>
    <div class="f"><label>Máquina</label><p>${o.maq}</p></div>
    <div class="f"><label>Tipo</label><p>${o.tipo}</p></div>
    <div class="f"><label>Prioridade</label><p>${o.prioridade||'—'}</p></div>
    <div class="f"><label>Manutentor</label><p>${o.manut||'—'}</p></div>
    <div class="f"><label>Data</label><p>${fd(o.data)}</p></div>
    <div class="f"><label>Início</label><p>${o.ini||'—'}</p></div>
    <div class="f"><label>Fim</label><p>${o.fim||'—'}</p></div>
    <div class="f"><label>Parada (min)</label><p>${o.paradaMin||'—'}</p></div>
  </div>
  <div class="s-t">Problema / Ocorrência</div><div class="s-c">${o.prob||'—'}</div>
  ${_todosServicos(o).map(s => `
  <div class="s-t">Serviço Executado — ${s.dataLabel} · ${s.ini}–${s.fim} · ${s.manut}</div>
  <div class="s-c">${s.acao}</div>`).join('') || '<div class="s-t">Ação / Serviço Executado</div><div class="s-c">—</div>'}
  ${o.acaoPrev?`<div class="s-t">Ação Preventiva</div><div class="s-c">${o.acaoPrev}</div>`:''}
  <div style="display:flex;justify-content:space-between;margin-top:20px">
    <div><div class="ass">Assinatura do Manutentor</div></div>
    <div><div class="ass">Visto do Supervisor</div></div>
  </div>
  <script>window.print();<\/script></body></html>`);
  win.document.close();
}

export function exportCSV() {
  const db=getDB(), tp=v('fe-tp'), sl=v('fe-sl'), dtI=v('fe-dt-ini'), dtF=v('fe-dt-fim');
  let data=[...db.ordens];
  if(tp) data=data.filter(o=>o.tipo===tp);
  if(sl) data=data.filter(o=>o.sala===sl);
  if(dtI) data=data.filter(o=>o.data>=dtI);
  if(dtF) data=data.filter(o=>o.data<=dtF);
  if(!data.length){showToast('Sem dados para exportar.','war');return;}
  const h=['OS_Numero','Data','Sala','Maquina','Tipo','Prioridade','Manutentor','Hora_Inicio','Hora_Fim','Duracao_Min','Tempo_Parada_Min','Problema','Acao_Executada','Origem'];
  const rows=data.map(o=>[o.numero,o.data,o.sala,o.maq,o.tipo,o.prioridade||'',o.manut||'',o.ini||'',o.fim||'',o.durMin||0,o.paradaMin||0,(o.prob||'').replace(/,/g,'|'),(o.acao||'').replace(/,/g,'|'),o.origem||'direta']);
  const csv=[h,...rows].map(r=>r.join(',')).join('\n');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'}));
  a.download=`SIGMAN_OS_${today()}${tp?'_'+tp:''}${sl?'_'+sl:''}.csv`;
  a.click();
  showToast('CSV exportado.','ok');
}

function _precisaRAC(o) {
  if(o.tipo!=='Corretiva') return false;
  const parada=o.paradaMin||o.durMin||0; if(parada<=0) return false;
  const db=getDB(), maq=db.maquinas.find(m=>m.nome===o.maq);
  const crit=parseInt(maq?.criticidade)||3;
  const lim={1:60,2:120,3:10080,4:20160}[crit]??120;
  if(parada<=lim) return false;
  return !(db.racs||[]).find(r=>r.osNumero===o.numero&&r.status==='Fechado');
}

function _genOS() {
  const db=getDB(), set=new Set(db.ordens.map(o=>o.numero));
  while(set.has(`OS-${String(db.osC).padStart(4,'0')}`)) db.osC++;
  return `OS-${String(db.osC).padStart(4,'0')}`;
}

function _logEdit(acao, numero, detalhe) {
  if(!CU) return;
  const db=getDB(), agora=new Date().toISOString();
  db.historico.unshift({ts:agora,user:CU.nome,login:CU.login,acao,numero,detalhe});
  if(db.historico.length>200) db.historico.pop();
  saveDB();
  apiPost({action:'append',sheet:'historico',row:{ID:agora,Data_Hora:agora,Usuario:CU.nome,Login:CU.login,Acao:acao,Numero_Ref:numero,Detalhe:detalhe}});
}

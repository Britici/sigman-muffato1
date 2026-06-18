// ============================================================
// SIGMAN v2.0 — pages/os-executadas.js
// ============================================================

import { getDB, saveDB, apiPost } from '../api.js';
import { CU, updOSHoje } from '../auth.js';
import { v, sv, fd, today, prio, tipoBadge, openM, closeM, showToast, debounce } from '../utils.js';

let _sort = { col:'numero', dir:'desc' };
let _curOS = null;
let _concluirId = null, _concluirTipo = null;

export function init() {
  _populateFiltros();
  _bindFiltros();
  _bindSortHeaders();
  document.getElementById('md-wa-btn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(document.getElementById('md-wa')?.textContent||'').then(()=>showToast('Copiado!'));
  });
  document.getElementById('md-print-btn')?.addEventListener('click', _imprimirOS);
  document.getElementById('md-rac-btn')?.addEventListener('click', () => { if(_curOS) abrirRAC(_curOS); });
  document.getElementById('btn-concluir')?.addEventListener('click', _concluir);
  document.getElementById('btn-export-csv')?.addEventListener('click', exportCSV);
  render();
}

function _populateFiltros() {
  const db = getDB();
  const slSel = document.getElementById('fe-sl');
  if (slSel) {
    const cur = slSel.value;
    slSel.innerHTML = '<option value="">Todas as Salas</option>';
    [...db.salas].sort().forEach(s => slSel.innerHTML += `<option value="${s}">${s}</option>`);
    if (cur) slSel.value = cur;
  }
  const mnSel = document.getElementById('fe-mn');
  if (mnSel) {
    const cur = mnSel.value;
    const manuts = [...new Set(db.ordens.map(o=>o.manut).filter(Boolean))].sort();
    mnSel.innerHTML = '<option value="">Todos os Manut.</option>';
    manuts.forEach(m => mnSel.innerHTML += `<option value="${m}">${m}</option>`);
    if (cur) mnSel.value = cur;
  }
}

function _bindFiltros() {
  const renderD = debounce(render, 280);
  document.getElementById('fe-tx')?.addEventListener('input', renderD);
  ['fe-tp','fe-sl','fe-mn','fe-dt-ini','fe-dt-fim'].forEach(id =>
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
  const tx=v('fe-tx').toLowerCase(), tp=v('fe-tp'), sl=v('fe-sl'),
        mn=v('fe-mn'), dtI=v('fe-dt-ini'), dtF=v('fe-dt-fim');
  let data = [...db.ordens];
  if (tx)  data = data.filter(o=>[o.numero,o.sala,o.maq,o.manut,o.tipo,o.prob].some(x=>x&&x.toLowerCase().includes(tx)));
  if (tp)  data = data.filter(o=>o.tipo===tp);
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
  if (!data.length) { tb.innerHTML=`<tr><td colspan="9"><div class="empty"><div class="ei">📋</div><p>Nenhuma ordem encontrada.</p></div></td></tr>`; return; }
  tb.innerHTML = data.map(o=>`<tr>
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
    <td style="font-size:12px">${o.manut||'—'}</td>
    <td style="font-family:var(--fm);font-size:11px;white-space:nowrap">
      ${o.ini&&o.fim?`${o.ini}–${o.fim}`:'—'}
      ${o.durMin?`<br><span style="color:var(--txt3)">${o.durMin}min</span>`:''}
    </td>
    <td><div style="display:flex;gap:4px">
      <button class="btn btn-sm btn-gh" onclick="window._verDet('${o.numero}')">Ver</button>
      <button class="btn btn-d" onclick="window._delOS('${o.numero}')">✕</button>
    </div></td>
  </tr>`).join('');
  window._verDet = verDet;
  window._delOS  = delOS;
}

export function verDet(numero) {
  const db=getDB(), o=db.ordens.find(x=>x.numero===numero);
  if (!o) return;
  _curOS = o;
  document.getElementById('md-n').textContent = o.numero;
  document.getElementById('md-t').textContent = `${o.sala} · ${o.maq}`;
  document.getElementById('md-b').innerHTML = `
    <div class="dr"><span class="dl">Sala</span><span class="dv">${o.sala}</span></div>
    <div class="dr"><span class="dl">Máquina</span><span class="dv">${o.maq}</span></div>
    <div class="dr"><span class="dl">Tipo</span><span class="dv">${tipoBadge(o.tipo)}</span></div>
    <div class="dr"><span class="dl">Prioridade</span><span class="dv">${prio(o.prioridade)}</span></div>
    <div class="dr"><span class="dl">Manutentor</span><span class="dv">${o.manut||'—'}</span></div>
    <div class="dr"><span class="dl">Data</span><span class="dv">${fd(o.data)}</span></div>
    <div class="dr"><span class="dl">Horário</span><span class="dv">${o.ini||'—'} – ${o.fim||'—'}${o.durMin?` (${o.durMin}min)`:''}</span></div>
    ${o.paradaMin?`<div class="dr"><span class="dl">Parada</span><span class="dv">${o.paradaMin}min</span></div>`:''}
    <div class="dr"><span class="dl">Problema</span><span class="dv">${o.prob||'—'}</span></div>
    <div class="dr"><span class="dl">Ação Executada</span><span class="dv">${o.acao||'—'}</span></div>
    ${o.acaoPrev?`<div class="dr"><span class="dl">Ação Preventiva</span><span class="dv">${o.acaoPrev}</span></div>`:''}
    ${o.fotoUrl?`<div class="dr" style="flex-direction:column;gap:8px"><span class="dl">📷 Foto</span><a href="${o.fotoUrl}" target="_blank"><img src="${o.fotoUrl}" style="max-width:100%;max-height:220px;border-radius:var(--rs);object-fit:contain;border:1px solid var(--bord)" alt="Foto OS"></a></div>`:''}
    ${o.origem&&o.origem!=='direta'?`<div class="dr"><span class="dl">Origem</span><span class="dv" style="color:var(--red)">${o.origemNum||o.origem}</span></div>`:''}`;
  const wa=`*${o.numero} — Ordem de Serviço*\n\n*Sala:* ${o.sala}\n*Máquina:* ${o.maq}\n*Problema:* ${o.prob||'—'}\n*Tipo:* ${o.tipo}\n*Prioridade:* ${o.prioridade}\n*Tempo:* ${o.ini||'?'} – ${o.fim||'?'} (${o.durMin||'?'}min)\n*Parada:* ${o.paradaMin||'?'}min\n\n${o.acao||''}\n\n_Manutentor: ${o.manut}_`;
  const waEl=document.getElementById('md-wa'), waBtn=document.getElementById('md-wa-btn');
  if(waEl){waEl.textContent=wa;waEl.style.display='block';}
  if(waBtn) waBtn.style.display='inline-block';
  document.getElementById('md-print-btn').style.display='inline-block';
  document.getElementById('md-rac-btn').style.display=_precisaRAC(o)?'inline-block':'none';
  openM('m-det');
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

export function abrirConcluir(id, tipo) {
  const db=getDB();
  _concluirId=id; _concluirTipo=tipo;
  const item=tipo==='plan'?db.planejadas.find(x=>x.numero===id):db.solicitacoes.find(x=>x.numero===id);
  if(!item){showToast('Item não encontrado.','er');return;}
  document.getElementById('mc-inf').innerHTML=`
    <div style="background:var(--surf2);border:1px solid var(--bord);border-radius:var(--rs);padding:12px">
      <div class="osdisp">${item.numero}</div>
      <div style="font-weight:600;margin:4px 0">${item.sala} · ${item.maq}</div>
      <div style="font-size:12px;color:var(--txt3)">${item.tipo} · ${item.prioridade||''}</div>
      ${item.desc?`<div style="font-size:12px;color:var(--txt2);margin-top:8px;padding-top:8px;border-top:1px solid var(--bord)">${item.desc}</div>`:''}
    </div>`;
  sv('mc-dt',today()); sv('mc-mn',CU?.nome||'');
  ['mc-in','mc-fm','mc-ds','mc-parada'].forEach(id=>sv(id,''));
  openM('m-con');
}

async function _concluir() {
  const db=getDB();
  const manut=v('mc-mn').trim(), desc=v('mc-ds').trim(),
        data=v('mc-dt'), ini=v('mc-in'), fim=v('mc-fm'),
        parada=parseInt(v('mc-parada'))||0;
  if(!manut||!desc){showToast('Preencha manutentor e serviço executado.','er');return;}
  const item=_concluirTipo==='plan'?db.planejadas.find(x=>x.numero===_concluirId):db.solicitacoes.find(x=>x.numero===_concluirId);
  if(!item){showToast('Item não encontrado.','er');return;}
  const agora=new Date().toISOString();
  let durMin=0, paradaMin=parada;
  if(ini&&fim){const[h1,m1]=ini.split(':').map(Number),[h2,m2]=fim.split(':').map(Number);durMin=Math.max(0,(h2*60+m2)-(h1*60+m1));if(!paradaMin)paradaMin=durMin;}
  const numero=_genOS();
  const os={id:crypto.randomUUID(),numero,sala:item.sala,maq:item.maq,tipo:item.tipo,prioridade:item.prioridade,manut,data:data||today(),ini,fim,durMin,paradaMin,prob:item.desc||'',acao:desc,criadoEm:agora,origem:_concluirTipo,origemNum:item.numero};
  Object.assign(item,{status:'Concluída',concluidoEm:agora,manut,ini,fim,dtExec:data,desc2:desc,durMin});
  db.ordens.push(os); db.osC++;
  saveDB(); closeM('m-con');
  _logEdit('Concluiu',item.numero,`${item.sala} · ${item.maq}`);
  render(); updOSHoje();
  showToast(`${item.numero} concluída → ${numero} registrada.`,'ok');
  const sheet=_concluirTipo==='plan'?'planejadas':'solicitacoes';
  const idCol=_concluirTipo==='plan'?'PL_Numero':'SOL_Numero';
  apiPost({action:'update',sheet,id:item.numero,idCol,row:{Status:'Concluída',Manutentor_Exec:manut,Data_Execucao:data,Hora_Inicio:ini,Hora_Fim:fim,Duracao_Min:durMin,Servico_Executado:desc,Concluido_Em:agora}});
  apiPost({action:'append',sheet:'ordens',row:{OS_Numero:numero,Data:data||today(),Sala:item.sala,Maquina:item.maq,Tipo:item.tipo,Prioridade:item.prioridade,Manutentor:manut,Hora_Inicio:ini,Hora_Fim:fim,Duracao_Min:durMin,Tempo_Parada_Min:paradaMin,Problema:item.desc||'',Acao_Executada:desc,Origem:_concluirTipo,OS_Origem_Ref:item.numero,Criado_Em:agora}});
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
  <div class="s-t">Ação / Serviço Executado</div><div class="s-c">${o.acao||'—'}</div>
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

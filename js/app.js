// js/app.js — FinanzasPK v3 — Aplicación completa
'use strict';

// ════════════════════════════════════════════════════
//  ESTADO GLOBAL
// ════════════════════════════════════════════════════
const ST = {
  mes:  new Date().getMonth()+1,
  anio: new Date().getFullYear(),
  screen: 'dashboard',
  cats: [],
  cfg:  {},
  _analTab: 'cats',
  _txFilter: {tipo:'',q:''},
};

// ════════════════════════════════════════════════════
//  CONTROLADOR PRINCIPAL
// ════════════════════════════════════════════════════
const A = {

  // ── AUTH ────────────────────────────────────────
  init() {
    if(sessionStorage.getItem('fpk_ok')==='1') this._boot();
    document.getElementById('pwd').addEventListener('keydown',e=>{if(e.key==='Enter')this.login();});
  },
  login() {
    if(document.getElementById('pwd').value === CFG.APP_PASS) {
      sessionStorage.setItem('fpk_ok','1');
      document.getElementById('login-error')&&(document.getElementById('login-error').style.display='none');
      this._boot();
    } else {
      const e=document.getElementById('login-err');
      if(e){e.style.display='block';}
      document.getElementById('pwd').value='';
      document.getElementById('pwd').focus();
    }
  },
  logout() {
    sessionStorage.removeItem('fpk_ok');
    document.getElementById('app').style.display='none';
    document.getElementById('login').style.display='flex';
    document.getElementById('pwd').value='';
    document.getElementById('pwd').focus();
  },
  async _boot() {
    document.getElementById('login').style.display='none';
    document.getElementById('app').style.display='flex';
    document.getElementById('sb-user').textContent=CFG.NOMBRE;
    this._updateMoLbl();
    try {
      [ST.cats, ST.cfg] = await Promise.all([API.cats(), API.config()]);
    } catch(e) { ST.cats=[]; ST.cfg={}; }
    this.go('dashboard');
  },

  // ── NAVEGACIÓN ──────────────────────────────────
  go(screen, el) {
    ST.screen=screen;
    document.querySelectorAll('.ni,.bn').forEach(b=>b.classList.toggle('on',b.dataset.s===screen));
    this.closeSb();
    const fn={
      dashboard:  renderDash,
      txs:        renderTxs,
      analytics:  renderAnalytics,
      presupuesto:renderPresupuesto,
      proyeccion: renderProyeccion,
      deudas:     renderDeudas,
      metas:      renderMetas,
      junta:      renderJunta,
      cobrar:     renderCobrar,
      settings:   renderSettings,
      precios:    renderPrecios,
      balance:    renderBalancePK,
    }[screen];
    if(fn) fn();
  },

  // ── MES ────────────────────────────────────────
  prevMes() {
    ST.mes--; if(ST.mes<1){ST.mes=12;ST.anio--;}
    this._updateMoLbl(); this.go(ST.screen);
  },
  nextMes() {
    const h=new Date(); if(ST.anio===h.getFullYear()&&ST.mes>=h.getMonth()+1) return;
    ST.mes++; if(ST.mes>12){ST.mes=1;ST.anio++;}
    this._updateMoLbl(); this.go(ST.screen);
  },
  _updateMoLbl() {
    const l=U.mesLbl(ST.mes,ST.anio);
    ['mo-lbl','mob-mo'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=l;});
  },

  // ── SIDEBAR MÓVIL ───────────────────────────────
  toggleSb() { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('sb-ov').classList.toggle('show'); },
  closeSb()  { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sb-ov').classList.remove('show'); },

  // ── MODAL ───────────────────────────────────────
  openModal(title, html) {
    document.getElementById('modal-ttl').textContent=title;
    document.getElementById('modal-body').innerHTML=html;
    document.getElementById('modal-bg').classList.add('open');
  },
  closeModal(e) {
    if(e&&e.target!==document.getElementById('modal-bg')) return;
    document.getElementById('modal-bg').classList.remove('open');
  },
  openTxModal: (tx) => openTxModal(tx),
};

// ════════════════════════════════════════════════════
//  PANTALLA: DASHBOARD
// ════════════════════════════════════════════════════
async function renderDash() {
  const sc=document.getElementById('screen');
  sc.innerHTML=loadingHtml('Cargando dashboard...');
  let d; try{ d=await API.dashboard(ST.mes,ST.anio); }catch(e){sc.innerHTML=errHtml(e);return;}

  const scoreColor = d.score>=80?'var(--success)':d.score>=60?'var(--warning)':'var(--danger)';
  const dayName = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const maxDay  = Math.max(...d.porDia)||1;

  sc.innerHTML=`
  <div class="ph">
    <div class="ph-row">
      <div>
        <div class="page-title">Dashboard</div>
        <div class="page-sub">${U.MESES[ST.mes-1]} ${ST.anio} · ${CFG.NOMBRE}</div>
      </div>
      <button class="btn btn-p btn-sm" onclick="A.openTxModal(null)">+ Agregar</button>
    </div>
  </div>

  <!-- KPIs -->
  <div class="kpis">
    <div class="kpi kpi-g"><div class="kpi-lbl">Ingresos</div><div class="kpi-val">${U.fmtI(d.ing)}</div><div class="kpi-sub">este mes</div></div>
    <div class="kpi kpi-r"><div class="kpi-lbl">Gastos</div><div class="kpi-val">${U.fmtI(d.gas)}</div><div class="kpi-sub">este mes</div></div>
    <div class="kpi kpi-b" style="color:${d.bal>=0?'#1e3a8a':'#7f1d1d'}">
      <div class="kpi-lbl">Balance</div><div class="kpi-val">${U.fmtI(d.bal)}</div><div class="kpi-sub">este mes</div>
    </div>
    <div class="kpi kpi-a"><div class="kpi-lbl">Ahorro</div><div class="kpi-val">${U.fmtI(d.aho)}</div><div class="kpi-sub">registrado</div></div>
    <div class="kpi kpi-p"><div class="kpi-lbl">Deuda total</div><div class="kpi-val">${U.fmtI(d.totalDeuda)}</div><div class="kpi-sub">cuotas: ${U.fmtI(d.totalCuotas)}/mes</div></div>
    ${d.totalCobrar>0?`<div class="kpi kpi-i"><div class="kpi-lbl">Por cobrar</div><div class="kpi-val">${U.fmtI(d.totalCobrar)}</div><div class="kpi-sub">pendientes</div></div>`:''}
  </div>

  <!-- Balance P/K (widget inline) -->
  ${d.balPK&&d.balPK.hayDeuda?`
  <div class="card" style="border-left:3px solid var(--danger);margin-bottom:14px;cursor:pointer" onclick="A.go('balance')">
    <div style="display:flex;align-items:center;gap:12px">
      <div style="font-size:28px">⚖️</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:700">Balance Paola & Kelwin</div>
        <div style="font-size:12px;color:var(--text2)">${d.balPK.deudor} le debe ${U.fmtI(d.balPK.diferencia)} a ${d.balPK.acreedor} este mes</div>
      </div>
      <span class="badge b-r">${U.fmtI(d.balPK.diferencia)}</span>
    </div>
  </div>`:''}

  <!-- Score + Presupuesto -->
  <div class="g2" style="margin-bottom:14px">
    <div class="card">
      <div class="health-gauge">
        <div class="score-ring" style="border-color:${scoreColor};color:${scoreColor}">
          <div class="score-num">${d.score}</div>
          <div class="score-lbl">score</div>
        </div>
        <div style="flex:1">
          <div class="card-title" style="margin-bottom:8px">Salud financiera</div>
          ${[['Ahorro',d.scores.ahorro,30,'var(--success)'],['Deuda',d.scores.deuda,25,'var(--primary)'],['Presupuesto',d.scores.ppto,25,'var(--warning)'],['Metas',d.scores.metas,20,'var(--purple)']]
            .map(([n,v,mx,col])=>`
            <div class="hg-dim"><span style="font-size:11px">${n}</span><span style="font-size:11px;font-weight:600">${v}/${mx}</span></div>
            <div class="hg-bar"><div class="hg-fill" style="width:${Math.round(v/mx*100)}%;background:${col}"></div></div>`).join('')}
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Presupuesto mensual</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-size:13px">Gastado: <strong>${U.fmtI(d.gas)}</strong></span>
        <span style="font-size:14px;font-weight:700;color:${U.semaforo(d.pctPpto)}">${Math.round(d.pctPpto*100)}%</span>
      </div>
      <div class="pbar"><div class="pbar-fill" style="width:${Math.min(100,Math.round(d.pctPpto*100))}%;background:${U.semaforo(d.pctPpto)}"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text2);margin-top:5px">
        <span>Total: ${U.fmtI(d.ppto)}</span>
        <span>Restante: ${U.fmtI(Math.max(0,d.ppto-d.gas))}</span>
      </div>
      ${d.deficit>0?`<div class="ins ins-d" style="margin-top:10px"><div class="ins-ico">📉</div><div><div class="ins-title">Proyección: déficit de ${U.fmtI(d.deficit)}</div><div class="ins-text">Al ritmo actual superarás el presupuesto al cierre del mes.</div></div></div>`:''}
      ${d.recs.length?`<div class="ins ins-w" style="margin-top:8px"><div class="ins-ico">🔔</div><div><div class="ins-title">Recurrentes hoy (${d.recs.length})</div><div class="ins-text">${d.recs.map(r=>r.Nombre+': '+U.fmtI(r.Monto)).join(' · ')}</div></div></div>`:''}
    </div>
  </div>

  <!-- Alertas automáticas -->
  ${genAlertas(d)}

  <!-- Top categorías + Gasto por día -->
  <div class="g2" style="margin-bottom:14px">
    <div class="card">
      <div class="card-title">Top gastos del mes</div>
      ${d.topCats.length?d.topCats.map(c=>{
        const ico=ST.cats.find(x=>x.Nombre===c.nombre)?.Ícono||'📦';
        const pct=d.gas>0?Math.round(c.total/d.gas*100):0;
        return `<div class="catbar"><div class="catbar-hd"><span class="catbar-nm">${ico} ${c.nombre}</span><span>${U.fmtI(c.total)} <span class="catbar-pct">${pct}%</span></span></div>
          <div class="pbar"><div class="pbar-fill" style="width:${pct}%;background:var(--primary)"></div></div></div>`;
      }).join(''):'<div class="empty"><div class="empty-txt">Sin gastos</div></div>'}
    </div>
    <div class="card">
      <div class="card-title">Gasto por día de semana</div>
      <div style="display:flex;gap:4px;align-items:flex-end;height:90px">
        ${d.porDia.map((v,i)=>`
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">
            <div style="width:100%;background:${v===Math.max(...d.porDia)?'var(--primary)':'var(--border)'};border-radius:4px 4px 0 0;height:${maxDay>0?Math.round(v/maxDay*70):4}px;min-height:4px;transition:height .4s ease"></div>
            <span style="font-size:10px;color:var(--text3)">${dayName[i]}</span>
          </div>`).join('')}
      </div>
    </div>
  </div>

  <!-- Transacciones recientes -->
  <div class="card">
    <div class="sec-hd">
      <div class="card-title" style="margin:0">Transacciones recientes</div>
      <button class="btn btn-g btn-sm" onclick="A.go('txs')">Ver todo →</button>
    </div>
    ${renderTxTable(d.recientes, true)}
  </div>`;
}

function genAlertas(d) {
  const als=[];
  if(d.pctPpto>=1)    als.push(['ins-d','🚨','Presupuesto agotado',`Superaron el límite en ${U.fmtI(d.gas-d.ppto)}.`]);
  if(d.bal<0)         als.push(['ins-d','📉','Déficit mensual',`Gastaste ${U.fmtI(Math.abs(d.bal))} más de lo que ingresaste.`]);
  if(d.deuPct>0.40)   als.push(['ins-w','💳',`Deuda alta (${Math.round(d.deuPct*100)}%)`,`Las cuotas consumen más del 40% del ingreso.`]);
  if(d.totalCobrar>0) als.push(['ins-b','🔄',`Tienes S/. ${U.fmtI(d.totalCobrar)} por cobrar`,`Revisa el módulo de Cuentas por Cobrar.`]);
  if(!als.length) return '';
  return `<div style="margin-bottom:14px">${als.map(([cl,ico,tt,tx])=>`<div class="ins ${cl}"><div class="ins-ico">${ico}</div><div><div class="ins-title">${tt}</div><div class="ins-text">${tx}</div></div></div>`).join('')}</div>`;
}

// ════════════════════════════════════════════════════
//  PANTALLA: TRANSACCIONES
// ════════════════════════════════════════════════════
async function renderTxs() {
  const sc=document.getElementById('screen');
  sc.innerHTML=loadingHtml();
  let txs;
  try{ txs=await API.txs(ST.mes,ST.anio,ST._txFilter.tipo,ST._txFilter.q); }catch(e){sc.innerHTML=errHtml(e);return;}

  const totGas=txs.filter(t=>t.Tipo==='Gasto').reduce((s,t)=>s+Number(t.Monto||0),0);
  const totIng=txs.filter(t=>t.Tipo==='Ingreso').reduce((s,t)=>s+Number(t.Monto||0),0);

  sc.innerHTML=`
  <div class="ph"><div class="ph-row">
    <div><div class="page-title">Transacciones</div>
    <div class="page-sub">${txs.length} registros · Gastos ${U.fmtI(totGas)} · Ingresos ${U.fmtI(totIng)}</div></div>
    <button class="btn btn-p btn-sm" onclick="A.openTxModal(null)">+ Agregar</button>
  </div></div>
  <div class="filter-row">
    <input class="fi" type="text" placeholder="🔍 Buscar..." value="${ST._txFilter.q}"
      oninput="ST._txFilter.q=this.value;renderTxs()">
    <div class="tab-pills">
      ${['','Gasto','Ingreso','Ahorro'].map((t,i)=>`<button class="pill ${ST._txFilter.tipo===t?'on':''}" onclick="ST._txFilter.tipo='${t}';renderTxs()">${['Todos','Gastos','Ingresos','Ahorro'][i]}</button>`).join('')}
    </div>
  </div>
  <div class="card card-sm">${renderTxTable(txs,false)}</div>`;
}

function renderTxTable(txs, compact) {
  if(!txs?.length) return `<div class="empty"><div class="empty-ico">📭</div><div class="empty-txt">Sin transacciones</div></div>`;
  return `<table class="tx-tbl"><thead><tr>
    <th>Transacción</th>
    ${!compact?'<th>Método</th>':''}
    <th>Monto</th>
    ${!compact?'<th></th>':''}
  </tr></thead><tbody>
  ${txs.map(t=>{
    const ico=ST.cats.find(c=>c.Nombre===t['Categoría'])?.Ícono||'📦';
    const cls=U.tipoClass(t.Tipo), sgn=U.tipoSign(t.Tipo);
    const id=t.ID;
    return `<tr>
      <td><div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:18px">${ico}</span>
        <div>
          <div class="tx-name">${t['Descripción']||t['Categoría']||'—'}</div>
          <div class="tx-meta">${t['Categoría']}${t['Lugar/Tienda']?' · '+t['Lugar/Tienda']:''}${t.Fecha?' · '+U.fecha(t.Fecha):''}</div>
        </div>
      </div></td>
      ${!compact?`<td><span class="badge b-gr">${t['Método de Pago']||'—'}</span></td>`:''}
      <td><span class="tx-amount ${cls}">${sgn}${U.fmtI(t.Monto)}</span></td>
      ${!compact?`<td>
        <button class="act-btn" onclick='openTxModal(${JSON.stringify(t).replace(/'/g,"&#39;")})' title="Editar">✏️</button>
        <button class="act-btn del" onclick="delTx('${id}')" title="Eliminar">🗑</button>
      </td>`:''}
    </tr>`;
  }).join('')}
  </tbody></table>`;
}

async function delTx(id){
  if(!confirm('¿Eliminar esta transacción?')) return;
  try{ await API.delTx(id); U.toast('🗑 Eliminada'); renderTxs(); }
  catch(e){ U.toast('❌ '+e.message); }
}

// ── Modal TX ─────────────────────────────────────────
function openTxModal(tx) {
  const isEdit=!!tx;
  const catOpts=ST.cats.map(c=>`<option value="${c.Nombre}" ${tx&&tx['Categoría']===c.Nombre?'selected':''}>${c.Ícono} ${c.Nombre}</option>`).join('');
  const metOpts=['Tarjeta Crédito Amex','Yape','Plin','Efectivo','Tarjeta Débito','Tarjeta Crédito Visa','Transferencia','Interbank','BBVA','BCP'].map(m=>`<option ${tx&&tx['Método de Pago']===m?'selected':''}>${m}</option>`).join('');
  const respOpts=['Paola y Kelwin','Paola','Kelwin'].map(r=>`<option ${(tx?.Responsable||'Paola y Kelwin')===r?'selected':''}>${r}</option>`).join('');

  A.openModal(isEdit?'Editar transacción':'Nueva transacción',`
    <div class="fr">
      <div class="form-g"><label class="fl">Fecha</label><input type="date" class="fi" id="tf-fecha" value="${tx?.Fecha||U.hoy()}"></div>
      <div class="form-g"><label class="fl">Tipo</label>
        <select class="fi" id="tf-tipo">
          ${['Gasto','Ingreso','Ahorro'].map(t=>`<option ${(tx?.Tipo||'Gasto')===t?'selected':''}>${t}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-g"><label class="fl">Monto (S/.)</label>
      <input type="number" class="fi" id="tf-monto" placeholder="0.00" step="0.01" min="0" value="${tx?.Monto||''}">
    </div>
    <div class="fr">
      <div class="form-g"><label class="fl">Categoría</label>
        <select class="fi" id="tf-cat" onchange="updSubcat(this.value,'${tx?.Subcategoría||''}')">
          <option value="">— Seleccionar —</option>${catOpts}
        </select>
      </div>
      <div class="form-g"><label class="fl opt">Subcategoría</label>
        <select class="fi" id="tf-sub"><option value="">—</option></select>
      </div>
    </div>
    <div class="form-g"><label class="fl opt">Descripción</label>
      <input type="text" class="fi" id="tf-desc" placeholder="Ej: Yogurt Griego 4kg" value="${tx?.Descripción||''}">
    </div>
    <div class="fr">
      <div class="form-g"><label class="fl opt">Lugar / Tienda</label>
        <input type="text" class="fi" id="tf-lugar" placeholder="Ej: Makro" value="${tx?.['Lugar/Tienda']||''}">
      </div>
      <div class="form-g"><label class="fl">Método de pago</label>
        <select class="fi" id="tf-met">${metOpts}</select>
      </div>
    </div>
    <div class="fr">
      <div class="form-g"><label class="fl opt">Cantidad</label>
        <input type="text" class="fi" id="tf-cant" placeholder="—" value="${tx?.Cantidad||''}" oninput="autoCalc()">
      </div>
      <div class="form-g"><label class="fl opt">Precio unitario</label>
        <input type="number" class="fi" id="tf-pu" placeholder="—" step="0.01" value="${tx?.['Precio Unitario']||''}" oninput="autoCalc()">
      </div>
    </div>
    <div class="fr">
      <div class="form-g"><label class="fl">Responsable</label>
        <select class="fi" id="tf-resp">${respOpts}</select>
      </div>
      <div class="form-g"><label class="fl opt">Quien pagó</label>
        <select class="fi" id="tf-quien">
          ${['— Mismo —','Paola','Kelwin'].map(r=>`<option ${tx?.['Quien Pagó']===r?'selected':''}>${r}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="btn-row">
      <button class="btn btn-p" onclick="submitTx('${isEdit?tx.ID:''}')">
        ${isEdit?'💾 Actualizar':'+ Registrar'}
      </button>
      <button class="btn btn-g" onclick="A.closeModal()">Cancelar</button>
    </div>`);
  if(tx?.['Categoría']) setTimeout(()=>updSubcat(tx['Categoría'],tx.Subcategoría||''),50);
}

function updSubcat(catNom, selected='') {
  const cat=ST.cats.find(c=>c.Nombre===catNom);
  const subs=Array.isArray(cat?.Subcategorías)?cat.Subcategorías:[];
  const el=document.getElementById('tf-sub'); if(!el) return;
  el.innerHTML='<option value="">—</option>'+subs.map(s=>`<option ${s===selected?'selected':''}>${s}</option>`).join('');
}

function autoCalc() {
  const c=parseFloat(document.getElementById('tf-cant')?.value), p=parseFloat(document.getElementById('tf-pu')?.value);
  if(c>0&&p>0) document.getElementById('tf-monto').value=(c*p).toFixed(2);
}

async function submitTx(editId) {
  const data={
    fecha:document.getElementById('tf-fecha').value,
    tipo:document.getElementById('tf-tipo').value,
    monto:document.getElementById('tf-monto').value,
    categoria:document.getElementById('tf-cat').value,
    subcategoria:document.getElementById('tf-sub').value,
    descripcion:document.getElementById('tf-desc').value,
    lugar:document.getElementById('tf-lugar').value,
    metodo:document.getElementById('tf-met').value,
    cantidad:document.getElementById('tf-cant').value,
    precio_unit:document.getElementById('tf-pu').value,
    responsable:document.getElementById('tf-resp').value,
    quien_pago:document.getElementById('tf-quien').value,
  };
  if(!data.fecha||!data.monto||!data.categoria){U.toast('❌ Fecha, monto y categoría son requeridos');return;}
  const btn=document.querySelector('#modal-body .btn-p');
  if(btn){btn.disabled=true;btn.textContent='Guardando...';}
  try {
    if(editId){await API.updTx(editId,data);U.toast('✅ Actualizada');}
    else{await API.addTx(data);U.toast('✅ Registrada');}
    A.closeModal();
    A.go(ST.screen); // refresca la pantalla actual siempre
  } catch(e){U.toast('❌ '+e.message);if(btn){btn.disabled=false;btn.textContent=editId?'💾 Actualizar':'+ Registrar';}}
}

// ════════════════════════════════════════════════════
//  PANTALLA: ANÁLISIS
// ════════════════════════════════════════════════════
async function renderAnalytics() {
  const sc=document.getElementById('screen');
  sc.innerHTML=loadingHtml('Calculando análisis...');
  let an,dash;
  try{ [an,dash]=await Promise.all([API.analytics(ST.mes,ST.anio),API.dashboard(ST.mes,ST.anio)]); }
  catch(e){sc.innerHTML=errHtml(e);return;}

  const tabs=['cats','5030','trend','tiendas','insights','metodos'];
  const tabLabels=['🗂 Categorías','⚖️ 50/30/20','📈 Tendencia','🏪 Tiendas','💡 Insights','💳 Métodos'];

  sc.innerHTML=`
    <div class="page-title" style="margin-bottom:16px">Análisis Financiero — ${U.mesLbl(ST.mes,ST.anio)}</div>
    <div class="tab-pills" style="margin-bottom:16px;flex-wrap:wrap">
      ${tabs.map((t,i)=>`<button class="pill ${ST._analTab===t?'on':''}" onclick="ST._analTab='${t}';renderAnalContent(${JSON.stringify(an)},${JSON.stringify(dash)})">${tabLabels[i]}</button>`).join('')}
    </div>
    <div id="anal-content"></div>`;
  renderAnalContent(an,dash);
}

function renderAnalContent(an,dash) {
  const el=document.getElementById('anal-content'); if(!el) return;
  const t=ST._analTab;

  if(t==='cats') {
    el.innerHTML=`<div class="card"><div class="card-title">Gastos por categoría — ${U.fmtI(an.totalGas)} total</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:center">
        <div>${an.categorias.length?an.categorias.map(c=>{
          const ico=ST.cats.find(x=>x.Nombre===c.nombre)?.Ícono||'📦';
          const p=Math.round(c.pct*100);
          return `<div class="catbar"><div class="catbar-hd"><span class="catbar-nm">${ico} ${c.nombre}</span><span>${U.fmtI(c.total)} <span class="catbar-pct">${p}%</span></span></div>
            <div class="pbar"><div class="pbar-fill" style="width:${p}%;background:var(--primary)"></div></div></div>`;
        }).join(''):nodata()}</div>
        <div class="chart-wrap"><canvas id="ch-cats"></canvas></div>
      </div>
    </div>`;
    if(an.categorias.length) setTimeout(()=>U.doughnut('ch-cats',an.categorias.map(c=>c.nombre),an.categorias.map(c=>c.total),an.categorias.map((_,i)=>['#2563eb','#dc2626','#d97706','#059669','#7c3aed','#ea580c','#0891b2','#db2777'][i%8])),50);

  } else if(t==='5030') {
    const {nec,gus,fin,aho} = an.rule;
    const cfg=ST.cfg; const ing=Number(cfg.ingreso_base)||8780;
    const regla=(nom,actual,meta,color)=>{
      const p=ing>0?Math.round(actual/ing*100):0, ok=actual<=ing*meta*1.05;
      return `<div style="display:flex;align-items:center;gap:10px;padding:12px;background:var(--surface2);border-radius:var(--r-md);margin-bottom:8px">
        <div style="width:44px;height:44px;border-radius:50%;background:${color}20;color:${color};font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">${Math.round(meta*100)}%</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600">${nom}</div>
          <div style="font-size:11px;color:var(--text2)">Real: ${U.fmtI(actual)} · Meta: ${U.fmtI(ing*meta)}</div>
          <div class="pbar" style="margin-top:5px"><div class="pbar-fill" style="width:${Math.min(100,p)}%;background:${color}"></div></div>
        </div>
        <span style="font-size:14px;font-weight:700;color:${ok?'var(--success)':'var(--danger)'}">${ok?'✅':'⚠️'} ${p}%</span>
      </div>`;
    };
    const ahoPct=ing>0?Math.round((1-dash.gas/ing)*100):0;
    el.innerHTML=`<div class="card">
      <div class="card-title">Regla 50 / 30 / 20</div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:12px">Ingreso base: ${U.fmtI(ing)}</div>
      ${regla('🏠 Necesidades (50%)',nec,0.50,'var(--primary)')}
      ${regla('🎉 Gustos y ocio (30%)',gus,0.30,'var(--warning)')}
      ${regla('💰 Ahorro + Deudas (20%)',fin+aho,0.20,'var(--success)')}
    </div>
    <div class="g2 keep" style="margin-top:12px">
      <div class="card card-sm" style="text-align:center">
        <div class="card-title">Tasa de ahorro</div>
        <div style="font-size:30px;font-weight:800;color:${ahoPct>=20?'var(--success)':'var(--danger)'}">${ahoPct}%</div>
        <div style="font-size:11px;color:var(--text2)">meta: ≥20%</div>
      </div>
      <div class="card card-sm" style="text-align:center">
        <div class="card-title">Deuda / Ingreso</div>
        <div style="font-size:30px;font-weight:800;color:${dash.deuPct<=0.35?'var(--success)':'var(--danger)'}">${Math.round(dash.deuPct*100)}%</div>
        <div style="font-size:11px;color:var(--text2)">límite recomendado: 35%</div>
      </div>
    </div>`;

  } else if(t==='trend') {
    el.innerHTML=`<div class="card"><div class="card-title">Tendencia 6 meses</div>
      <div class="chart-wrap chart-wrap-lg"><canvas id="ch-trend"></canvas></div>
      <div style="display:flex;gap:16px;justify-content:center;margin-top:10px;font-size:12px">
        <span style="color:var(--success)">● Ingresos</span>
        <span style="color:var(--danger)">● Gastos</span>
        <span style="color:var(--primary)">● Ahorro</span>
      </div>
    </div>
    <div class="card" style="margin-top:12px"><div class="card-title">Detalle mensual</div>
      <table class="tx-tbl"><thead><tr><th>Mes</th><th>Ingresos</th><th>Gastos</th><th>Balance</th></tr></thead><tbody>
      ${an.tendencia.map(t=>{
        const bal=t.ing-t.gas;
        return `<tr><td style="font-weight:600">${t.label}</td>
          <td class="pos">${U.fmtI(t.ing)}</td>
          <td class="neg">${U.fmtI(t.gas)}</td>
          <td style="font-weight:700;color:${bal>=0?'var(--success)':'var(--danger)'}">${bal>=0?'+':''}${U.fmtI(bal)}</td></tr>`;
      }).join('')}
      </tbody></table>
    </div>`;
    setTimeout(()=>U.lineChart('ch-trend',an.tendencia.map(t=>t.label),[
      {label:'Ingresos',data:an.tendencia.map(t=>t.ing),borderColor:'#059669',backgroundColor:'rgba(5,150,105,.06)'},
      {label:'Gastos',data:an.tendencia.map(t=>t.gas),borderColor:'#dc2626',backgroundColor:'rgba(220,38,38,.06)',borderDash:[4,2]},
      {label:'Ahorro',data:an.tendencia.map(t=>t.aho),borderColor:'#2563eb',backgroundColor:'rgba(37,99,235,.06)',borderDash:[2,4]},
    ]),50);

  } else if(t==='tiendas') {
    el.innerHTML=`<div class="card"><div class="card-title">Gastos por tienda / lugar (top 8)</div>
      <div class="chart-wrap chart-wrap-lg"><canvas id="ch-tiendas"></canvas></div>
    </div>
    <div class="card" style="margin-top:12px">
      ${an.topTiendas.map((ti,i)=>`
        <div class="catbar">
          <div class="catbar-hd"><span class="catbar-nm">#${i+1} ${ti.nombre}</span><span>${U.fmtI(ti.total)}</span></div>
          <div class="pbar"><div class="pbar-fill" style="width:${an.topTiendas[0].total>0?Math.round(ti.total/an.topTiendas[0].total*100):0}%;background:var(--primary)"></div></div>
        </div>`).join('')}
    </div>`;
    setTimeout(()=>U.barChart('ch-tiendas',an.topTiendas.map(t=>t.nombre),[
      {label:'Total',data:an.topTiendas.map(t=>t.total),backgroundColor:'#2563eb'}]),50);

  } else if(t==='insights') {
    const ins=[];
    if(dash.bal<0) ins.push(['ins-d','📉','Déficit mensual',`Gastaste ${U.fmtI(Math.abs(dash.bal))} más de lo que ingresaste.`]);
    if(dash.pctPpto>=1) ins.push(['ins-d','🚨','Presupuesto agotado',`Excediste en ${U.fmtI(dash.gas-dash.ppto)}.`]);
    else if(dash.pctPpto>=.85) ins.push(['ins-w','⚠️',`Presupuesto al ${Math.round(dash.pctPpto*100)}%`,`Quedan ${U.fmtI(dash.ppto-dash.gas)}.`]);
    else ins.push(['ins-s','✅','Mes saludable',`Balance positivo de ${U.fmtI(dash.bal)}.`]);
    an.anomalias.forEach(a=>ins.push(['ins-w','📊',`Gasto inusual: ${a.categoria}`,`${U.fmtI(a.actual)} este mes vs promedio ${U.fmtI(a.promedio)} (${a.ratio}%).`]));
    if(dash.deuPct>0.40) ins.push(['ins-d','💳',`Deudas altas (${Math.round(dash.deuPct*100)}%)`,`Las cuotas consumen más del 40% del ingreso.`]);
    if(an.topTiendas[0]) ins.push(['ins-b','🏪',`Principal tienda: ${an.topTiendas[0].nombre}`,`Acumulas ${U.fmtI(an.topTiendas[0].total)} este mes.`]);

    el.innerHTML=`<div class="card"><div class="card-title">Insights automáticos — ${U.mesLbl(ST.mes,ST.anio)}</div>
      ${ins.map(([cl,ico,tt,tx])=>`<div class="ins ${cl}"><div class="ins-ico">${ico}</div><div><div class="ins-title">${tt}</div><div class="ins-text">${tx}</div></div></div>`).join('')}
    </div>`;

  } else if(t==='metodos') {
    el.innerHTML=`<div class="card"><div class="card-title">Gastos por método de pago</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:center">
        <div>${an.metodos.map(m=>{
          const max=an.metodos[0]?.total||1;
          return `<div class="catbar"><div class="catbar-hd"><span class="catbar-nm">💳 ${m.nombre}</span><span>${U.fmtI(m.total)}</span></div>
            <div class="pbar"><div class="pbar-fill" style="width:${Math.round(m.total/max*100)}%;background:var(--purple)"></div></div></div>`;
        }).join('')}</div>
        <div class="chart-wrap"><canvas id="ch-met"></canvas></div>
      </div>
    </div>`;
    if(an.metodos.length) setTimeout(()=>U.doughnut('ch-met',an.metodos.map(m=>m.nombre),an.metodos.map(m=>m.total),['#7c3aed','#2563eb','#0891b2','#059669','#d97706','#dc2626','#ea580c','#db2777']),50);
  }
}

// ════════════════════════════════════════════════════
//  PANTALLA: PRESUPUESTO
// ════════════════════════════════════════════════════
async function renderPresupuesto() {
  const sc=document.getElementById('screen');
  sc.innerHTML=loadingHtml();
  let pres,cats;
  try{ [pres,cats]=await Promise.all([API.presupuesto(ST.mes,ST.anio),API.cats()]); }
  catch(e){sc.innerHTML=errHtml(e);return;}

  const totalPlan=pres.reduce((s,p)=>s+p.planificado,0);
  const totalReal=pres.reduce((s,p)=>s+p.real,0);
  const filtGasto=cats.filter(c=>c.Tipo!=='ing'&&c.Tipo!=='aho');

  sc.innerHTML=`
  <div class="ph"><div class="ph-row">
    <div><div class="page-title">Presupuesto</div>
    <div class="page-sub">${U.mesLbl(ST.mes,ST.anio)} · Planificado ${U.fmtI(totalPlan)} · Real ${U.fmtI(totalReal)}</div></div>
    <button class="btn btn-p btn-sm" onclick="openPptoModal()">Editar presupuesto</button>
  </div></div>
  <div class="card">
    <div class="card-title">Ejecución por categoría</div>
    ${pres.length?pres.map(p=>{
      const pct=p.planificado>0?p.real/p.planificado:0;
      const ico=cats.find(c=>c.Nombre===p.categoria)?.Ícono||'📦';
      return `<div class="ppto-row">
        <div class="ppto-hd">
          <span class="ppto-name">${ico} ${p.categoria}</span>
          <span class="ppto-vs ${p.diff>0?'ppto-err':'ppto-ok'}">${p.diff>0?'▲':'▼'} ${U.fmtI(Math.abs(p.diff))} · <span class="badge ${U.semaforoClass(pct)}">${Math.round(pct*100)}%</span></span>
        </div>
        <div class="pbar"><div class="pbar-fill" style="width:${Math.min(100,Math.round(pct*100))}%;background:${U.semaforo(pct)}"></div></div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text2);margin-top:4px">
          <span>Real: ${U.fmtI(p.real)}</span><span>Plan: ${U.fmtI(p.planificado)}</span>
        </div>
      </div>`;
    }).join(''):`<div class="empty"><div class="empty-ico">📅</div><div class="empty-txt">No hay presupuesto para este mes.<br>Haz clic en "Editar presupuesto" para configurarlo.</div></div>`}
  </div>`;
}

function openPptoModal() {
  const cats=ST.cats.filter(c=>c.Tipo!=='ing'&&c.Tipo!=='aho');
  A.openModal('Editar presupuesto — '+U.mesLbl(ST.mes,ST.anio),`
    <p style="font-size:12px;color:var(--text2);margin-bottom:12px">Ingresa el monto planificado por categoría para este mes.</p>
    ${cats.map(c=>`
      <div class="form-g" style="display:flex;align-items:center;gap:10px">
        <span style="font-size:18px;width:24px">${c.Ícono}</span>
        <label style="flex:1;font-size:12px;font-weight:600">${c.Nombre}</label>
        <input type="number" class="fi" id="pp-${c.Nombre}" placeholder="0" step="10" style="width:100px">
      </div>`).join('')}
    <div class="btn-row">
      <button class="btn btn-p" onclick="savePpto()">💾 Guardar</button>
      <button class="btn btn-g" onclick="A.closeModal()">Cancelar</button>
    </div>`);
}

async function savePpto() {
  const cats=ST.cats.filter(c=>c.Tipo!=='ing'&&c.Tipo!=='aho');
  const promises=cats.map(c=>{
    const v=document.getElementById('pp-'+c.Nombre)?.value;
    if(v&&parseFloat(v)>0) return API.updPpto(c.Nombre,ST.mes,ST.anio,parseFloat(v));
  }).filter(Boolean);
  if(!promises.length){U.toast('⚠️ Ingresa al menos un valor');return;}
  try{ await Promise.all(promises); U.toast('✅ Presupuesto guardado'); A.closeModal(); renderPresupuesto(); }
  catch(e){ U.toast('❌ '+e.message); }
}

// ════════════════════════════════════════════════════
//  PANTALLA: PROYECCIÓN
// ════════════════════════════════════════════════════
async function renderProyeccion() {
  const sc=document.getElementById('screen');
  sc.innerHTML=loadingHtml();
  let p; try{ p=await API.proyeccion(ST.mes,ST.anio); }catch(e){sc.innerHTML=errHtml(e);return;}

  const efColor=p.mesesEmerg>=6?'var(--success)':p.mesesEmerg>=3?'var(--warning)':'var(--danger)';

  sc.innerHTML=`
  <div class="page-title" style="margin-bottom:4px">Proyección Financiera</div>
  <div class="page-sub" style="margin-bottom:18px">Flujo de caja estimado próximos 6 meses</div>

  <!-- Cierre de mes -->
  <div class="g2" style="margin-bottom:14px">
    <div class="card">
      <div class="card-title">Proyección cierre de mes</div>
      <div style="font-size:28px;font-weight:800;color:${p.deficit>0?'var(--danger)':'var(--success)'}">${U.fmtI(p.proyFin)}</div>
      <div style="font-size:12px;color:var(--text2);margin-top:4px">Gasto proyectado al ${new Date(+ST.anio,+ST.mes-1+0,0).getDate()}/${ST.mes}</div>
      <div class="ins ${p.deficit>0?'ins-d':'ins-s'}" style="margin-top:10px">
        <div class="ins-ico">${p.deficit>0?'⚠️':'✅'}</div>
        <div><div class="ins-title">${p.deficit>0?'Déficit proyectado de '+U.fmtI(p.deficit):'Superávit proyectado de '+U.fmtI(Math.abs(p.deficit))}</div>
        <div class="ins-text">Tasa diaria actual: ${U.fmtI(p.tasaDiaria)}/día · Quedan ${p.diasRest} días</div></div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Fondo de emergencia</div>
      <div style="font-size:28px;font-weight:800;color:${efColor}">${(p.mesesEmerg||0).toFixed(1)} meses</div>
      <div style="font-size:12px;color:var(--text2);margin-top:4px">Objetivo: 6 meses = ${U.fmtI(p.gastoMensProm*6)}</div>
      <div class="pbar" style="margin-top:10px"><div class="pbar-fill" style="width:${Math.min(100,Math.round((p.mesesEmerg||0)/6*100))}%;background:${efColor}"></div></div>
      <div style="font-size:11px;color:var(--text2);margin-top:5px">Ahorro total: ${U.fmtI(p.totalAhorro)}</div>
    </div>
  </div>

  <!-- Gráfico proyección 6 meses -->
  <div class="card" style="margin-bottom:14px">
    <div class="card-title">Proyección 6 meses</div>
    <div class="chart-wrap chart-wrap-lg"><canvas id="ch-proy"></canvas></div>
    <div style="display:flex;gap:16px;justify-content:center;margin-top:8px;font-size:12px">
      <span style="color:var(--success)">● Ingreso</span>
      <span style="color:var(--danger)">● Gasto fijo</span>
      <span style="color:var(--warning)">● Gasto variable</span>
    </div>
  </div>

  <!-- Composición de gastos -->
  <div class="card">
    <div class="card-title">Composición estimada mensual</div>
    <div class="g2 keep">
      <div>
        ${[['Ingresos',p.ingBase,'var(--success)'],['Gastos fijos',p.fixos,'var(--danger)'],['Gastos variables',Math.max(0,p.gastoMensProm-p.fixos),'var(--warning)'],['Ahorro potencial',Math.max(0,p.ingBase-p.gastoMensProm),'var(--primary)']].map(([n,v,c])=>
          `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f8fafc;font-size:13px">
            <span><span style="color:${c}">●</span> ${n}</span><strong>${U.fmtI(v)}</strong>
          </div>`).join('')}
      </div>
      <div style="font-size:12px;color:var(--text2);line-height:1.6">
        <strong style="color:var(--text)">Gasto mensual promedio</strong><br>
        Últimos 3 meses: ${U.fmtI(p.gastoMensProm)}<br><br>
        <strong style="color:var(--text)">Compromisos fijos</strong><br>
        Cuotas + recurrentes: ${U.fmtI(p.fixos)}<br><br>
        <strong style="color:var(--text)">Margen disponible</strong><br>
        ${U.fmtI(Math.max(0,p.ingBase-p.gastoMensProm))}/mes
      </div>
    </div>
  </div>`;

  setTimeout(()=>U.barChart('ch-proy',p.proyMeses.map(m=>m.label),[
    {label:'Ingreso',data:p.proyMeses.map(m=>m.ingreso),backgroundColor:'rgba(5,150,105,.7)'},
    {label:'Gasto fijo',data:p.proyMeses.map(m=>m.gastoFijo),backgroundColor:'rgba(220,38,38,.7)'},
    {label:'Gasto variable',data:p.proyMeses.map(m=>m.gastoVariable),backgroundColor:'rgba(217,119,6,.7)'},
  ]),50);
}

// ════════════════════════════════════════════════════
//  PANTALLA: DEUDAS
// ════════════════════════════════════════════════════
async function renderDeudas() {
  const sc=document.getElementById('screen');
  sc.innerHTML=loadingHtml();
  let deudas; try{ deudas=await API.debts(); }catch(e){sc.innerHTML=errHtml(e);return;}
  const totDeu=deudas.reduce((s,d)=>s+Number(d['Saldo Actual']||0),0);
  const totCuo=deudas.reduce((s,d)=>s+Number(d['Pago Mensual']||0),0);
  const ingBase=Number(ST.cfg.ingreso_base)||8780;
  const deuPct=ingBase>0?totCuo/ingBase:0;

  sc.innerHTML=`
  <div class="ph"><div class="ph-row">
    <div><div class="page-title">Deudas</div>
    <div class="page-sub">${deudas.length} deudas activas</div></div>
    <button class="btn btn-p btn-sm" onclick="openDeudaModal(null)">+ Agregar</button>
  </div></div>

  <div class="kpis">
    <div class="kpi kpi-r"><div class="kpi-lbl">Deuda total</div><div class="kpi-val">${U.fmtI(totDeu)}</div></div>
    <div class="kpi kpi-a"><div class="kpi-lbl">Cuota mensual</div><div class="kpi-val">${U.fmtI(totCuo)}</div></div>
    <div class="kpi ${deuPct>0.40?'kpi-r':'kpi-g'}"><div class="kpi-lbl">% Ingresos</div><div class="kpi-val">${Math.round(deuPct*100)}%</div><div class="kpi-sub">límite: 35%</div></div>
  </div>

  ${deudas.length?deudas.map(d=>{
    const sal=Number(d['Saldo Actual']||0), orig=Number(d['Monto Original']||sal);
    const prog=orig>0?Math.min(100,Math.round((1-sal/orig)*100)):0;
    const pc=prog>=80?'var(--success)':prog>=50?'var(--warning)':'var(--primary)';
    return `<div class="debt-card">
      <div class="debt-hd">
        <div><div class="debt-name">${d.Nombre}</div><div class="debt-type">${d.Tipo||''} ${d.Responsable?'· '+d.Responsable:''}</div></div>
        <div style="text-align:right">
          <div class="debt-bal">${U.fmtI(sal)}</div>
          <div style="display:flex;gap:6px;margin-top:4px;justify-content:flex-end">
            <button class="btn btn-g btn-xs" onclick='openDeudaModal(${JSON.stringify(d).replace(/'/g,"&#39;")})'>✏️</button>
            <button class="btn btn-g btn-xs" onclick="delDeuda('${d.ID}')">🗑</button>
          </div>
        </div>
      </div>
      <div class="pbar"><div class="pbar-fill" style="width:${prog}%;background:${pc}"></div></div>
      <div style="font-size:11px;color:var(--text2);margin:3px 0 8px">${prog}% pagado</div>
      <div class="debt-stats">
        <div class="ds"><div class="ds-lbl">Cuota/mes</div><div class="ds-val">${U.fmtI(d['Pago Mensual'])}</div></div>
        <div class="ds"><div class="ds-lbl">Tiempo restante</div><div class="ds-val">${d.mesesRestantes||U.calcMeses(sal,d['Pago Mensual'],d['Tasa (%)'])}</div></div>
        <div class="ds"><div class="ds-lbl">Tasa anual</div><div class="ds-val">${d['Tasa (%)']>0?d['Tasa (%)']+'%':'Sin int.'}</div></div>
      </div>
    </div>`;
  }).join(''):'<div class="empty"><div class="empty-ico">🎉</div><div class="empty-txt">Sin deudas registradas</div></div>'}

  ${deudas.length>1?renderEstrategia(deudas):''}`;
}

function renderEstrategia(deudas) {
  const extra=300;
  const sim=(sorted)=>{
    let ds=sorted.map(d=>({sal:Number(d['Saldo Actual']||0),pago:Number(d['Pago Mensual']||0),tasa:Number(d['Tasa (%)']||0)/100/12}));
    let m=0,int=0;
    while(ds.some(d=>d.sal>0)&&m<600){
      m++;let rem=extra;
      ds.forEach(d=>{if(d.sal<=0)return;const i=d.sal*d.tasa;int+=i;d.sal=Math.max(0,d.sal+i-d.pago);rem-=d.pago;});
      const f=ds.find(d=>d.sal>0);if(f&&rem>0)f.sal=Math.max(0,f.sal-rem);
    }
    return {m,int:Math.round(int)};
  };
  const av=sim([...deudas].sort((a,b)=>Number(b['Tasa (%)']||0)-Number(a['Tasa (%)']||0)));
  const sn=sim([...deudas].sort((a,b)=>Number(a['Saldo Actual']||0)-Number(b['Saldo Actual']||0)));
  const avGana=av.int<sn.int;
  return `<div class="card" style="margin-top:12px">
    <div class="card-title">Estrategia de pago (con S/. ${extra} extra/mes)</div>
    <div class="strat-grid">
      <div class="strat-card ${avGana?'win':''}">
        <div class="strat-name">🏔 Avalancha ${avGana?'<span class="badge b-g">Recomendado</span>':''}</div>
        <div style="font-size:11px;color:var(--text2);margin-bottom:8px">Mayor tasa primero</div>
        <div class="strat-val">${av.m} meses</div>
        <div class="strat-sub" style="color:var(--danger)">Intereses: ${U.fmtI(av.int)}</div>
      </div>
      <div class="strat-card ${!avGana?'win':''}">
        <div class="strat-name">⛄ Bola de nieve ${!avGana?'<span class="badge b-g">Recomendado</span>':''}</div>
        <div style="font-size:11px;color:var(--text2);margin-bottom:8px">Menor saldo primero</div>
        <div class="strat-val">${sn.m} meses</div>
        <div class="strat-sub" style="color:var(--danger)">Intereses: ${U.fmtI(sn.int)}</div>
      </div>
    </div>
  </div>`;
}

function openDeudaModal(d) {
  const isEdit=!!d;
  A.openModal(isEdit?'Editar deuda':'Nueva deuda',`
    <div class="form-g"><label class="fl">Nombre</label>
      <input type="text" class="fi" id="df-nom" value="${d?.Nombre||''}" placeholder="Ej: Interbank Crédito"></div>
    <div class="form-g"><label class="fl">Tipo</label>
      <select class="fi" id="df-tipo">
        ${['Tarjeta Crédito','Préstamo Personal','Crédito Vehicular','Cuota Bien','Hipoteca','Seguro','Otro'].map(t=>`<option ${d?.Tipo===t?'selected':''}>${t}</option>`).join('')}
      </select></div>
    <div class="fr">
      <div class="form-g"><label class="fl opt">Monto original (S/.)</label>
        <input type="number" class="fi" id="df-orig" value="${d?.['Monto Original']||''}" placeholder="0.00"></div>
      <div class="form-g"><label class="fl">Saldo actual (S/.)</label>
        <input type="number" class="fi" id="df-sal" value="${d?.['Saldo Actual']||''}" placeholder="0.00"></div>
    </div>
    <div class="fr">
      <div class="form-g"><label class="fl opt">Tasa anual (%)</label>
        <input type="number" class="fi" id="df-tasa" value="${d?.['Tasa (%)']||0}" placeholder="0"></div>
      <div class="form-g"><label class="fl">Cuota mensual (S/.)</label>
        <input type="number" class="fi" id="df-pago" value="${d?.['Pago Mensual']||''}" placeholder="0.00"></div>
    </div>
    <div class="form-g"><label class="fl opt">Responsable</label>
      <select class="fi" id="df-resp">
        ${['Paola y Kelwin','Paola','Kelwin'].map(r=>`<option ${(d?.Responsable||'Paola y Kelwin')===r?'selected':''}>${r}</option>`).join('')}
      </select></div>
    <div class="form-g"><label class="fl opt">Notas</label>
      <input type="text" class="fi" id="df-notas" value="${d?.Notas||''}" placeholder="—"></div>
    <div class="btn-row">
      <button class="btn btn-p" onclick="submitDeuda('${isEdit?d.ID:''}')">${isEdit?'💾 Actualizar':'+ Agregar'}</button>
      <button class="btn btn-g" onclick="A.closeModal()">Cancelar</button>
    </div>`);
}

async function submitDeuda(editId) {
  const data={nombre:document.getElementById('df-nom').value,tipo:document.getElementById('df-tipo').value,
    monto_original:document.getElementById('df-orig').value,saldo_actual:document.getElementById('df-sal').value,
    tasa:document.getElementById('df-tasa').value,pago_mensual:document.getElementById('df-pago').value,
    responsable:document.getElementById('df-resp').value,notas:document.getElementById('df-notas').value};
  if(!data.nombre||!data.saldo_actual||!data.pago_mensual){U.toast('❌ Completa nombre, saldo y cuota');return;}
  try{
    if(editId){await API.updDebt(editId,data);U.toast('✅ Actualizada');}
    else{await API.addDebt(data);U.toast('✅ Deuda guardada');}
    A.closeModal();renderDeudas();
  }catch(e){U.toast('❌ '+e.message);}
}

async function delDeuda(id){
  if(!confirm('¿Eliminar esta deuda?'))return;
  try{await API.delDebt(id);U.toast('🗑 Eliminada');renderDeudas();}
  catch(e){U.toast('❌ '+e.message);}
}

// ════════════════════════════════════════════════════
//  PANTALLA: METAS
// ════════════════════════════════════════════════════
async function renderMetas() {
  const sc=document.getElementById('screen');
  sc.innerHTML=loadingHtml();
  let metas; try{metas=await API.goals();}catch(e){sc.innerHTML=errHtml(e);return;}

  sc.innerHTML=`
  <div class="ph"><div class="ph-row">
    <div><div class="page-title">Metas de ahorro</div>
    <div class="page-sub">${metas.length} metas activas</div></div>
    <button class="btn btn-p btn-sm" onclick="openMetaModal(null)">+ Nueva meta</button>
  </div></div>
  ${metas.length?metas.map(m=>{
    const tot=Number(m['Monto Total']||0),ya=Number(m['Ya Ahorrado']||0);
    const cuota=Number(m['Cuota Mensual']||0);
    const prog=tot>0?Math.min(100,Math.round(ya/tot*100)):0;
    const meses=cuota>0?Math.ceil((tot-ya)/cuota):'—';
    const emoji=m.Emoji||U.metaEmoji(m.Nombre);
    return `<div class="goal-card">
      <div class="goal-hd">
        <div class="goal-emo">${emoji}</div>
        <div style="flex:1">
          <div class="goal-name">${m.Nombre}</div>
          <div class="goal-meta">${typeof meses==='number'?meses+' meses para lograrlo·':''} ${U.prioBadge(m.Prioridad)}</div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-g btn-xs" onclick='openMetaModal(${JSON.stringify(m).replace(/'/g,"&#39;")})'>✏️</button>
          <button class="btn btn-g btn-xs" onclick="delMeta('${m.ID}')">🗑</button>
        </div>
      </div>
      <div class="goal-nums"><span>Ahorrado: <strong>${U.fmtI(ya)}</strong></span><span>Meta: <strong>${U.fmtI(tot)}</strong></span></div>
      <div class="pbar"><div class="pbar-fill" style="width:${prog}%;background:var(--primary)"></div></div>
      <div style="text-align:right;font-size:11px;color:var(--text2);margin-top:5px">${prog}% completado${cuota>0?' · cuota '+U.fmtI(cuota)+'/mes':''}</div>
    </div>`;
  }).join(''):'<div class="empty"><div class="empty-ico">🎯</div><div class="empty-txt">Sin metas. Crea tu primera meta de ahorro.</div></div>'}`;
}

let _metaMode='A';
function openMetaModal(m){
  const isEdit=!!m;
  A.openModal(isEdit?'Editar meta':'Nueva meta',`
    <div class="form-g"><label class="fl">Nombre de la meta</label>
      <input type="text" class="fi" id="mf-nom" value="${m?.Nombre||''}" placeholder="Ej: Viaje a Cusco"></div>
    <div class="fr">
      <div class="form-g"><label class="fl">Monto objetivo (S/.)</label>
        <input type="number" class="fi" id="mf-tot" value="${m?.['Monto Total']||''}" placeholder="0.00" oninput="calcMetaPrev()"></div>
      <div class="form-g"><label class="fl opt">Ya ahorrado (S/.)</label>
        <input type="number" class="fi" id="mf-ya" value="${m?.['Ya Ahorrado']||0}" placeholder="0.00" oninput="calcMetaPrev()"></div>
    </div>
    <div class="tab-pills" style="margin-bottom:12px">
      <button class="pill ${_metaMode==='A'?'on':''}" onclick="_metaMode='A';this.parentElement.querySelectorAll('.pill').forEach(b=>b.classList.remove('on'));this.classList.add('on');calcMetaPrev()">Definir cuota mensual</button>
      <button class="pill ${_metaMode==='B'?'on':''}" onclick="_metaMode='B';this.parentElement.querySelectorAll('.pill').forEach(b=>b.classList.remove('on'));this.classList.add('on');calcMetaPrev()">Definir meses</button>
    </div>
    <div id="mf-inp-a" style="display:${_metaMode==='A'?'block':'none'}">
      <div class="form-g"><label class="fl">Cuota mensual (S/.)</label>
        <input type="number" class="fi" id="mf-cuota" value="${m?.['Cuota Mensual']||''}" placeholder="Ej: 500" oninput="calcMetaPrev()"></div>
    </div>
    <div id="mf-inp-b" style="display:${_metaMode==='B'?'block':'none'}">
      <div class="form-g"><label class="fl">En cuántos meses</label>
        <input type="number" class="fi" id="mf-meses" value="${m?.['Meses Objetivo']||''}" placeholder="Ej: 18" oninput="calcMetaPrev()"></div>
    </div>
    <div id="mf-prev" class="ins ins-b" style="display:none;margin-bottom:10px"></div>
    <div class="fr">
      <div class="form-g"><label class="fl">Prioridad</label>
        <select class="fi" id="mf-prio">${['Alta','Media','Baja'].map(p=>`<option ${(m?.Prioridad||'Media')===p?'selected':''}>${p}</option>`).join('')}</select></div>
      <div class="form-g"><label class="fl opt">Emoji</label>
        <input type="text" class="fi" id="mf-emoji" value="${m?.Emoji||''}" placeholder="🎯" maxlength="4"></div>
    </div>
    <div class="btn-row">
      <button class="btn btn-p" onclick="submitMeta('${isEdit?m.ID:''}')">${isEdit?'💾 Actualizar':'+ Guardar meta'}</button>
      <button class="btn btn-g" onclick="A.closeModal()">Cancelar</button>
    </div>`);
}

function calcMetaPrev(){
  const tot=parseFloat(document.getElementById('mf-tot')?.value)||0;
  const ya=parseFloat(document.getElementById('mf-ya')?.value)||0;
  const falt=Math.max(0,tot-ya);
  const prev=document.getElementById('mf-prev'); if(!prev)return;
  let txt='';
  if(_metaMode==='A'){
    const c=parseFloat(document.getElementById('mf-cuota')?.value)||0;
    if(tot>0&&c>0){txt=`💡 Con S/.${c}/mes lo logras en ${Math.ceil(falt/c)} meses`;}
  }else{
    const mes=parseInt(document.getElementById('mf-meses')?.value)||0;
    if(tot>0&&mes>0){txt=`💡 Necesitas ahorrar ${U.fmtI(Math.ceil(falt/mes))}/mes`;}
  }
  prev.style.display=txt?'flex':'none';
  if(txt){prev.innerHTML=`<div class="ins-ico">💡</div><div>${txt}</div>`;}
}

async function submitMeta(editId){
  let cuota=0,meses=0;
  const tot=parseFloat(document.getElementById('mf-tot')?.value)||0;
  const ya=parseFloat(document.getElementById('mf-ya')?.value)||0;
  if(_metaMode==='A'){cuota=parseFloat(document.getElementById('mf-cuota')?.value)||0;meses=cuota>0?Math.ceil((tot-ya)/cuota):0;}
  else{meses=parseInt(document.getElementById('mf-meses')?.value)||0;cuota=meses>0?Math.ceil((tot-ya)/meses):0;}
  const data={nombre:document.getElementById('mf-nom').value,monto_total:tot,ya_ahorrado:ya,
    cuota_mensual:cuota,meses_objetivo:meses,prioridad:document.getElementById('mf-prio').value,
    emoji:document.getElementById('mf-emoji').value||U.metaEmoji(document.getElementById('mf-nom').value)};
  if(!data.nombre||!data.monto_total){U.toast('❌ Completa nombre y monto objetivo');return;}
  try{
    if(editId){await API.updGoal(editId,data);U.toast('✅ Meta actualizada');}
    else{await API.addGoal(data);U.toast('✅ Meta guardada');}
    A.closeModal();renderMetas();
  }catch(e){U.toast('❌ '+e.message);}
}

async function delMeta(id){
  if(!confirm('¿Eliminar esta meta?'))return;
  try{await API.delGoal(id);U.toast('🗑 Eliminada');renderMetas();}
  catch(e){U.toast('❌ '+e.message);}
}

// ════════════════════════════════════════════════════
//  PANTALLA: JUNTA
// ════════════════════════════════════════════════════
async function renderJunta(){
  const sc=document.getElementById('screen');
  sc.innerHTML=loadingHtml();
  let junta; try{junta=await API.junta();}catch(e){sc.innerHTML=errHtml(e);return;}

  const avatarColors=['#2563eb','#dc2626','#059669','#7c3aed','#d97706','#0891b2'];
  sc.innerHTML=`
  <div class="ph"><div class="ph-row">
    <div><div class="page-title">Junta</div>
    <div class="page-sub">Ahorro rotativo · Total recaudado: ${U.fmtI(junta.total)}</div></div>
    <button class="btn btn-p btn-sm" onclick="openJuntaModal()">+ Registrar</button>
  </div></div>

  <div class="g2" style="margin-bottom:14px">
    <div class="card">
      <div class="card-title">Saldo por miembro</div>
      ${junta.saldos.map((s,i)=>`
        <div class="junta-member">
          <div class="jm-avatar" style="background:${avatarColors[i%avatarColors.length]}20;color:${avatarColors[i%avatarColors.length]}">${(s.miembro||'?')[0].toUpperCase()}</div>
          <div class="jm-name">${s.miembro}</div>
          <div class="jm-total">${U.fmtI(s.total)}</div>
        </div>`).join('')}
    </div>
    <div class="card">
      <div class="card-title">Resumen</div>
      <div style="font-size:28px;font-weight:800;color:var(--primary)">${U.fmtI(junta.total)}</div>
      <div style="font-size:12px;color:var(--text2);margin-top:4px">Total recaudado</div>
      <div style="margin-top:12px;font-size:13px">
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f8fafc">
          <span>Cuota por persona</span><strong>${U.fmtI(junta.cuotaMes)}/mes</strong>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f8fafc">
          <span>Miembros</span><strong>${junta.saldos.length}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0">
          <span>Recaudo mensual</span><strong>${U.fmtI(junta.cuotaMes*junta.saldos.length)}</strong>
        </div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-title">Historial de movimientos</div>
    ${junta.movimientos.length?`<table class="tx-tbl"><thead><tr><th>Fecha</th><th>Descripción</th><th>Miembro</th><th>Monto</th></tr></thead><tbody>
    ${[...junta.movimientos].reverse().slice(0,20).map(r=>`
      <tr>
        <td style="white-space:nowrap;font-size:12px">${U.fecha(r.Fecha)}</td>
        <td>${r['Descripción']||'—'}</td>
        <td><span class="badge b-b">${r['Quien Pagó']||r.Responsable}</span></td>
        <td class="pos">${U.fmtI(r.Monto)}</td>
      </tr>`).join('')}
    </tbody></table>`:'<div class="empty"><div class="empty-txt">Sin movimientos registrados</div></div>'}
  </div>`;
}

function openJuntaModal(){
  A.openModal('Registrar movimiento Junta',`
    <div class="fr">
      <div class="form-g"><label class="fl">Fecha</label>
        <input type="date" class="fi" id="jf-fecha" value="${U.hoy()}"></div>
      <div class="form-g"><label class="fl">Tipo</label>
        <select class="fi" id="jf-tipo"><option>Ingreso</option><option>Pago</option></select></div>
    </div>
    <div class="form-g"><label class="fl">Quien pagó</label>
      <select class="fi" id="jf-quien">
        ${['Paola','Kelwin','Glicerio','Joel','Yolanda','Lady'].map(m=>`<option>${m}</option>`).join('')}
      </select></div>
    <div class="form-g"><label class="fl">Monto (S/.)</label>
      <input type="number" class="fi" id="jf-monto" placeholder="500.00" value="500"></div>
    <div class="form-g"><label class="fl opt">Descripción</label>
      <input type="text" class="fi" id="jf-desc" placeholder="Junta de..."></div>
    <div class="btn-row">
      <button class="btn btn-p" onclick="submitJunta()">+ Registrar</button>
      <button class="btn btn-g" onclick="A.closeModal()">Cancelar</button>
    </div>`);
}

async function submitJunta(){
  const data={fecha:document.getElementById('jf-fecha').value,tipo:document.getElementById('jf-tipo').value,
    quien_pago:document.getElementById('jf-quien').value,monto:document.getElementById('jf-monto').value,
    descripcion:document.getElementById('jf-desc').value,responsable:document.getElementById('jf-quien').value,metodo:'Yape'};
  if(!data.monto){U.toast('❌ Ingresa el monto');return;}
  try{await API.addJunta(data);U.toast('✅ Registrado');A.closeModal();renderJunta();}
  catch(e){U.toast('❌ '+e.message);}
}

// ════════════════════════════════════════════════════
//  PANTALLA: CUENTAS POR COBRAR
// ════════════════════════════════════════════════════
async function renderCobrar(){
  const sc=document.getElementById('screen');
  sc.innerHTML=loadingHtml();
  let cco; try{cco=await API.cco();}catch(e){sc.innerHTML=errHtml(e);return;}

  sc.innerHTML=`
  <div class="ph"><div class="ph-row">
    <div><div class="page-title">Cuentas por Cobrar</div>
    <div class="page-sub">Total pendiente: ${U.fmtI(cco.totalPendiente)}</div></div>
    <button class="btn btn-p btn-sm" onclick="openCCOModal()">+ Registrar</button>
  </div></div>

  ${cco.saldos.length?`<div class="card" style="margin-bottom:14px">
    <div class="card-title">Saldo por deudor</div>
    ${cco.saldos.map(s=>`
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px;background:var(--danger-bg);border-radius:var(--r-md);margin-bottom:6px">
        <div><div style="font-size:13px;font-weight:700">${s.deudor}</div><div style="font-size:11px;color:var(--danger)">Debe pagar</div></div>
        <div style="font-size:20px;font-weight:800;color:var(--danger)">${U.fmtI(s.total)}</div>
      </div>`).join('')}
  </div>`:''}

  <div class="card" style="margin-bottom:14px">
    <div class="card-title">Pendientes de cobro</div>
    ${cco.pendientes.length?cco.pendientes.map((c,i)=>`
      <div class="cco-row">
        <div style="flex:1">
          <div class="cco-deudor">👤 ${c.Deudor}</div>
          <div class="cco-desc">${c['Descripción']||'—'}${c.Fecha?' · '+U.fecha(c.Fecha):''}</div>
        </div>
        <div style="text-align:right">
          <div class="cco-amount">${U.fmtI(c.Monto)}</div>
          <button class="btn btn-s btn-xs" style="margin-top:4px" onclick="marcarCobrado(${i+1})">✓ Cobrado</button>
        </div>
      </div>`).join(''):'<div class="empty"><div class="empty-txt">Sin cuentas pendientes</div></div>'}
  </div>

  ${cco.cobradas.length?`<div class="card">
    <div class="card-title">Historial cobrado</div>
    ${cco.cobradas.slice(0,10).map(c=>`
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f8fafc;font-size:13px">
        <div><strong>${c.Deudor}</strong> · <span style="color:var(--text2)">${c['Descripción']||'—'}</span></div>
        <span class="badge b-g">+${U.fmtI(c.Monto)}</span>
      </div>`).join('')}
  </div>`:''}`;
}

function openCCOModal(){
  A.openModal('Registrar pago por tercero',`
    <div class="fr">
      <div class="form-g"><label class="fl">Fecha</label>
        <input type="date" class="fi" id="cco-fecha" value="${U.hoy()}"></div>
      <div class="form-g"><label class="fl">Monto (S/.)</label>
        <input type="number" class="fi" id="cco-monto" placeholder="0.00" step="0.01"></div>
    </div>
    <div class="form-g"><label class="fl">Deudor (quien te debe)</label>
      <input type="text" class="fi" id="cco-deudor" placeholder="Ej: Gustavo, Gilmar"></div>
    <div class="form-g"><label class="fl">Descripción del gasto</label>
      <input type="text" class="fi" id="cco-desc" placeholder="Ej: Almuerzo Pardo Chicken"></div>
    <div class="fr">
      <div class="form-g"><label class="fl">Quien pagó</label>
        <select class="fi" id="cco-quien">
          ${['Kelwin','Paola'].map(r=>`<option>${r}</option>`).join('')}
        </select></div>
      <div class="form-g"><label class="fl opt">Categoría</label>
        <select class="fi" id="cco-cat">
          <option value="">—</option>${ST.cats.map(c=>`<option>${c.Nombre}</option>`).join('')}
        </select></div>
    </div>
    <div class="btn-row">
      <button class="btn btn-p" onclick="submitCCO()">+ Registrar</button>
      <button class="btn btn-g" onclick="A.closeModal()">Cancelar</button>
    </div>`);
}

async function submitCCO(){
  const data={fecha:document.getElementById('cco-fecha').value,monto:document.getElementById('cco-monto').value,
    deudor:document.getElementById('cco-deudor').value,descripcion:document.getElementById('cco-desc').value,
    quien_pago:document.getElementById('cco-quien').value,categoria:document.getElementById('cco-cat').value};
  if(!data.monto||!data.deudor){U.toast('❌ Completa monto y deudor');return;}
  try{await API.addCCO(data);U.toast('✅ Registrado');A.closeModal();renderCobrar();}
  catch(e){U.toast('❌ '+e.message);}
}

async function marcarCobrado(idx){
  if(!confirm('¿Marcar como cobrado?'))return;
  try{await API.cobrado(idx);U.toast('✅ Cobrado registrado');renderCobrar();}
  catch(e){U.toast('❌ '+e.message);}
}

// ════════════════════════════════════════════════════
//  PANTALLA: CONFIGURACIÓN
// ════════════════════════════════════════════════════
async function renderSettings(){
  const sc=document.getElementById('screen');
  sc.innerHTML=loadingHtml();
  let cfg,cats,recs;
  try{[cfg,cats,recs]=await Promise.all([API.config(),API.cats(),API.recs()]);}
  catch(e){sc.innerHTML=errHtml(e);return;}
  ST.cfg=cfg; ST.cats=cats;

  const TIPO_MAP={nec:'🏠 Necesidad',gus:'🎉 Gusto',fin:'💳 Finanzas',ing:'💼 Ingreso',aho:'🏦 Ahorro',otr:'📦 Otro'};

  sc.innerHTML=`
  <div class="page-title" style="margin-bottom:4px">Configuración</div>
  <div class="page-sub" style="margin-bottom:18px">Parámetros del sistema</div>

  <!-- Parámetros financieros -->
  <div class="card" style="margin-bottom:14px">
    <div class="card-title">Parámetros financieros</div>
    <div class="fr">
      <div class="form-g"><label class="fl">Ingreso base mensual (S/.)</label>
        <input type="number" class="fi" id="scfg-ing" value="${cfg.ingreso_base||8780}"></div>
      <div class="form-g"><label class="fl">Presupuesto mensual (S/.)</label>
        <input type="number" class="fi" id="scfg-bud" value="${cfg.presupuesto_mes||6300}"></div>
    </div>
    <div class="fr">
      <div class="form-g"><label class="fl opt">Cuota Junta (S/.)</label>
        <input type="number" class="fi" id="scfg-junta" value="${cfg.junta_cuota||500}"></div>
      <div class="form-g"><label class="fl opt">Alquiler mensual (S/.)</label>
        <input type="number" class="fi" id="scfg-alq" value="${cfg.alquiler||1020}"></div>
    </div>
    <button class="btn btn-p btn-sm" onclick="saveCfg()">💾 Guardar parámetros</button>
  </div>

  <!-- Recurrentes -->
  <div class="card" style="margin-bottom:14px">
    <div class="sec-hd"><div class="card-title" style="margin:0">Gastos recurrentes (${recs.length})</div>
    <button class="btn btn-p btn-sm" onclick="openRecModal()">+ Nueva</button></div>
    <p style="font-size:12px;color:var(--text2);margin-bottom:10px">Gastos fijos mensuales que se proponen automáticamente (Netflix, gym, etc.).</p>
    ${recs.length?recs.map(r=>`
      <div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--surface2);border-radius:var(--r-md);margin-bottom:6px">
        <span style="font-size:20px">${cats.find(c=>c.Nombre===r['Categoría'])?.Ícono||'💸'}</span>
        <div style="flex:1"><div style="font-size:13px;font-weight:600">${r.Nombre}</div>
        <div style="font-size:11px;color:var(--text2)">Día ${r['Día del Mes']} · ${r['Método de Pago']||''}</div></div>
        <div style="font-weight:700">${U.fmtI(r.Monto)}</div>
        <button class="btn btn-s btn-xs" onclick="aplicarRec('${r.ID}')">✓</button>
        <button class="act-btn del" onclick="delRec('${r.ID}')">🗑</button>
      </div>`).join(''):'<div class="empty" style="padding:20px"><div class="empty-txt">Sin recurrentes configuradas</div></div>'}
  </div>

  <!-- Categorías -->
  <div class="card">
    <div class="sec-hd"><div class="card-title" style="margin:0">Categorías (${cats.length})</div>
    <button class="btn btn-p btn-sm" onclick="openCatModal(null)">+ Nueva</button></div>
    <div id="cat-list">
      ${cats.map(c=>`
        <div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--surface2);border-radius:var(--r-sm);margin-bottom:5px">
          <span style="font-size:18px">${c.Ícono}</span>
          <span style="flex:1;font-size:13px;font-weight:600">${c.Nombre}</span>
          <span class="type-chip tc-${c.Tipo}">${TIPO_MAP[c.Tipo]||c.Tipo}</span>
          <button class="act-btn" onclick='openCatModal(${JSON.stringify(c).replace(/'/g,"&#39;")})'>✏️</button>
          <button class="act-btn del" onclick="delCat('${c.ID}')">🗑</button>
        </div>`).join('')}
    </div>
  </div>`;
}

async function saveCfg(){
  try{
    await Promise.all([
      API.setCfg('ingreso_base',document.getElementById('scfg-ing').value),
      API.setCfg('presupuesto_mes',document.getElementById('scfg-bud').value),
      API.setCfg('junta_cuota',document.getElementById('scfg-junta').value),
      API.setCfg('alquiler',document.getElementById('scfg-alq').value),
    ]);
    const cfg=await API.config(); ST.cfg=cfg;
    U.toast('✅ Parámetros guardados');
  }catch(e){U.toast('❌ '+e.message);}
}

function openRecModal(){
  A.openModal('Nueva recurrente',`
    <div class="form-g"><label class="fl">Nombre</label>
      <input type="text" class="fi" id="rf-nom" placeholder="Ej: Netflix, Smartfit"></div>
    <div class="fr">
      <div class="form-g"><label class="fl">Categoría</label>
        <select class="fi" id="rf-cat"><option value="">—</option>
          ${ST.cats.map(c=>`<option>${c.Nombre}</option>`).join('')}</select></div>
      <div class="form-g"><label class="fl">Monto (S/.)</label>
        <input type="number" class="fi" id="rf-monto" placeholder="0.00"></div>
    </div>
    <div class="fr">
      <div class="form-g"><label class="fl">Día del mes</label>
        <input type="number" class="fi" id="rf-dia" placeholder="1-28" min="1" max="28"></div>
      <div class="form-g"><label class="fl">Método</label>
        <select class="fi" id="rf-met">
          ${['Yape','Plin','Tarjeta Crédito Amex','Transferencia','Efectivo'].map(m=>`<option>${m}</option>`).join('')}
        </select></div>
    </div>
    <div class="btn-row">
      <button class="btn btn-p" onclick="submitRec()">+ Guardar</button>
      <button class="btn btn-g" onclick="A.closeModal()">Cancelar</button>
    </div>`);
}

async function submitRec(){
  const data={nombre:document.getElementById('rf-nom').value,categoria:document.getElementById('rf-cat').value,
    monto:document.getElementById('rf-monto').value,dia:document.getElementById('rf-dia').value,
    metodo:document.getElementById('rf-met').value};
  if(!data.nombre||!data.monto){U.toast('❌ Completa nombre y monto');return;}
  try{await API.addRec(data);U.toast('✅ Recurrente guardada');A.closeModal();renderSettings();}
  catch(e){U.toast('❌ '+e.message);}
}

async function aplicarRec(id){
  try{await API.aplicarRec(id);U.toast('✅ Gasto registrado desde recurrente');}
  catch(e){U.toast('❌ '+e.message);}
}

async function delRec(id){
  if(!confirm('¿Desactivar esta recurrente?'))return;
  try{await API.delRec(id);U.toast('🗑 Eliminada');renderSettings();}
  catch(e){U.toast('❌ '+e.message);}
}

const EMOJIS='🛒🍽️🚌🏠⚡🏢🔒🏥🐕🧴🍦🏋️📺👕🎁🎂📱📚💳🔴🚗🤝🚨👔💼🔧💰💵🏦🔄📦✈️🏖️🎓🍕☕🚲💅🎵🎮💊💅'.split('');
function openCatModal(cat){
  const isEdit=!!cat;
  A.openModal(isEdit?'Editar categoría':'Nueva categoría',`
    <div class="fr">
      <div class="form-g" style="flex:2"><label class="fl">Nombre</label>
        <input type="text" class="fi" id="cf-nom" value="${cat?.Nombre||''}" placeholder="Ej: Cumpleañero"></div>
      <div class="form-g"><label class="fl">Ícono</label>
        <input type="text" class="fi" id="cf-ico" value="${cat?.Ícono||'📦'}" maxlength="4" oninput="document.getElementById('cf-ico-prev').textContent=this.value||'📦'" style="text-align:center;font-size:18px"></div>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px">
      ${EMOJIS.map(e=>`<button onclick="document.getElementById('cf-ico').value='${e}';document.getElementById('cf-ico-prev').textContent='${e}'" style="font-size:18px;width:34px;height:34px;border-radius:6px;background:var(--surface2);border:1px solid var(--border)">${e}</button>`).join('')}
    </div>
    <div class="form-g"><label class="fl">Tipo (regla 50/30/20)</label>
      <select class="fi" id="cf-tipo">
        ${[['nec','🏠 Necesidad'],['gus','🎉 Gusto'],['fin','💳 Finanzas'],['ing','💼 Ingreso'],['aho','🏦 Ahorro'],['otr','📦 Otro']].map(([v,l])=>`<option value="${v}" ${(cat?.Tipo||'otr')===v?'selected':''}>${l}</option>`).join('')}
      </select></div>
    <div class="form-g"><label class="fl opt">Subcategorías (separadas por coma)</label>
      <input type="text" class="fi" id="cf-subs" value="${Array.isArray(cat?.Subcategorías)?cat.Subcategorías.join(', '):''}" placeholder="Ej: Restaurante,Delivery"></div>
    <div class="btn-row">
      <button class="btn btn-p" onclick="submitCat('${isEdit?cat.ID:''}')">${isEdit?'💾 Actualizar':'+ Crear'}</button>
      <button class="btn btn-g" onclick="A.closeModal()">Cancelar</button>
    </div>`);
}

async function submitCat(editId){
  const data={nombre:document.getElementById('cf-nom').value.trim(),tipo:document.getElementById('cf-tipo').value,
    icono:document.getElementById('cf-ico').value||'📦',
    subs:document.getElementById('cf-subs').value.split(',').map(s=>s.trim()).filter(Boolean)};
  if(!data.nombre){U.toast('❌ El nombre es requerido');return;}
  try{
    if(editId){await API.updCat(editId,data);U.toast('✅ Actualizada');}
    else{await API.addCat(data);U.toast('✅ Creada');}
    ST.cats=await API.cats();A.closeModal();renderSettings();
  }catch(e){U.toast('❌ '+e.message);}
}

async function delCat(id){
  if(!confirm('¿Eliminar esta categoría?'))return;
  try{await API.delCat(id);ST.cats=await API.cats();U.toast('🗑 Eliminada');renderSettings();}
  catch(e){U.toast('❌ '+e.message);}
}

// ════════════════════════════════════════════════════
//  HELPERS UI
// ════════════════════════════════════════════════════
function loadingHtml(msg='Cargando...'){
  return `<div class="loading"><div class="spin"></div><p>${msg}</p></div>`;
}
function errHtml(e){
  return `<div class="empty"><div class="empty-ico">⚠️</div><div class="empty-txt">${e?.message||e}</div>
    <button class="btn btn-g btn-sm" style="margin-top:12px" onclick="A.go('${ST.screen}')">↻ Reintentar</button></div>`;
}
function nodata(){ return '<div class="empty" style="padding:20px"><div class="empty-txt">Sin datos</div></div>'; }

// ════════════════════════════════════════════════════
//  INICIO
// ════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => A.init());

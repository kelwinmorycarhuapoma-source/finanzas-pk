// js/utils.js — FinanzasPK v3
const U = {
  // ── FORMATO ─────────────────────────────────────
  fmt:  n => 'S/. ' + (parseFloat(n)||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2}),
  fmtI: n => 'S/. ' + Math.round(parseFloat(n)||0).toLocaleString('es-PE'),
  pct:  n => Math.round((parseFloat(n)||0)*100) + '%',
  fecha:(s) => { if(!s) return '—'; const d=new Date(s+'T12:00:00'); return d.toLocaleDateString('es-PE',{day:'2-digit',month:'short',year:'numeric'}); },
  hoy:  () => new Date().toISOString().split('T')[0],
  mesLbl:(m,a) => ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][m-1]+' '+a,
  MESES: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],

  // ── SEMÁFORO ─────────────────────────────────────
  semaforo: pct => pct>=1?'var(--danger)':pct>=.85?'var(--warning)':'var(--success)',
  semaforoClass: pct => pct>=1?'b-r':pct>=.85?'b-a':'b-g',

  // ── TIPO DE TX ────────────────────────────────────
  tipoSign:  t => t==='Ingreso'?'+':t==='Ahorro'?'~':'-',
  tipoClass: t => t==='Ingreso'?'pos':t==='Ahorro'?'neu':'neg',
  tipoIcon:  t => t==='Ingreso'?'💰':t==='Ahorro'?'🏦':'💸',

  // ── CÁLCULO DEUDA ─────────────────────────────────
  calcMeses: (sal,cuota,tasa) => {
    const s=parseFloat(sal)||0, c=parseFloat(cuota)||0, t=(parseFloat(tasa)||0)/100/12;
    if(c<=0) return '—';
    if(t<=0) return Math.ceil(s/c)+'m';
    if(c<=s*t) return 'Rev.';
    return Math.ceil(Math.log(c/(c-s*t))/Math.log(1+t))+'m';
  },

  // ── META EMOJI ─────────────────────────────────────
  metaEmoji: n => {
    const lc=(n||'').toLowerCase();
    if(lc.includes('carro')||lc.includes('vehículo')||lc.includes('auto')) return '🚗';
    if(lc.includes('viaje')||lc.includes('vacac')) return '✈️';
    if(lc.includes('casa')||lc.includes('viviend')||lc.includes('depa')) return '🏠';
    if(lc.includes('emergencia')||lc.includes('fondo')) return '🛡️';
    if(lc.includes('tecno')||lc.includes('celular')||lc.includes('compu')) return '💻';
    if(lc.includes('educac')||lc.includes('curso')||lc.includes('estudio')) return '📚';
    return '🎯';
  },

  // ── PRIORIDAD ─────────────────────────────────────
  prioBadge: p => ({Alta:'<span class="badge b-r">Alta</span>',Media:'<span class="badge b-a">Media</span>',Baja:'<span class="badge b-g">Baja</span>'}[p]||''),

  // ── TOAST ─────────────────────────────────────────
  toast(msg, ms=2800) {
    const el=document.getElementById('toast');
    el.textContent=msg; el.classList.add('show');
    clearTimeout(U._t);
    U._t=setTimeout(()=>el.classList.remove('show'),ms);
  },
  _t:null,

  // ── CHARTS ────────────────────────────────────────
  charts:{},
  makeChart(id, type, data, opts={}) {
    const canvas=document.getElementById(id);
    if(!canvas||!window.Chart) return;
    if(U.charts[id]){U.charts[id].destroy();}
    U.charts[id]=new Chart(canvas, {type, data, options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false},...(opts.plugins||{})},
      ...opts,
    }});
    return U.charts[id];
  },

  lineChart(id, labels, datasets) {
    return U.makeChart(id,'line',{labels,datasets:datasets.map(ds=>({
      ...ds, tension:.4, fill:false, borderWidth:2, pointRadius:3,
    }))},{scales:{y:{ticks:{callback:v=>'S/.'+Math.round(v).toLocaleString('es-PE'),font:{size:10}},grid:{color:'rgba(0,0,0,.05)'}},x:{grid:{display:false},ticks:{font:{size:10}}}}});
  },

  doughnut(id, labels, data, colors) {
    return U.makeChart(id,'doughnut',
      {labels, datasets:[{data, backgroundColor:colors, borderWidth:1}]},
      {plugins:{legend:{display:true,position:'bottom',labels:{font:{size:11},boxWidth:10,padding:8}}},cutout:'65%'}
    );
  },

  barChart(id, labels, datasets) {
    return U.makeChart(id,'bar',{labels,datasets:datasets.map(ds=>({...ds,borderRadius:4,borderWidth:0}))},
      {scales:{y:{ticks:{callback:v=>'S/.'+Math.round(v).toLocaleString('es-PE'),font:{size:10}},grid:{color:'rgba(0,0,0,.05)'}},x:{grid:{display:false},ticks:{font:{size:10}}}}}
    );
  },
};

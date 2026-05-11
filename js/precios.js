// js/precios.js v2 — FinanzasPK — Comparador de Precios CORRECTO
// ════════════════════════════════════════════════════════════════
// Usa catálogos maestros PRODUCTOS + TIENDAS para garantizar
// nombres canónicos y comparaciones correctas entre tiendas.

// ── API v2 (agrega a api.js) ──────────────────────────────────
// Object.assign(API, {
//   tiendas:         ()      => API.get({action:'tiendas'}),
//   productosMaestro:()      => API.get({action:'productos_maestro'}),
//   productosPrecios:()      => API.get({action:'productos_precios'}),
//   precioDetalle:   id      => API.get({action:'precio_detalle', id}),
//   tiendasRanking:  ()      => API.get({action:'tiendas_rank'}),
//   precioAlertas:   ()      => API.get({action:'precio_alertas'}),
//   sugerirProd:     texto   => API.get({action:'sugerir_prod', texto}),
//   addPrecio:       d       => API.post({action:'addPrecio', data:d}),
//   addProducto:     d       => API.post({action:'addProducto', data:d}),
//   updProducto:     (id,d)  => API.post({action:'updProducto', id, data:d}),
//   delProducto:     id      => API.post({action:'delProducto', id}),
//   addTienda:       d       => API.post({action:'addTienda', data:d}),
//   updTienda:       (id,d)  => API.post({action:'updTienda', id, data:d}),
//   delTienda:       id      => API.post({action:'delTienda', id}),
// });

// ── ESTADO LOCAL ──────────────────────────────────────────────
const PREC = {
  tab: 'lista',      // 'lista' | 'tiendas' | 'alertas' | 'catalogo'
  filtro: '',
  productoSeleccionado: null,
  cache: { productos: null, tiendas: null, alertas: null },
};

// ════════════════════════════════════════════════════════════════
//  PANTALLA PRINCIPAL
// ════════════════════════════════════════════════════════════════
async function renderPrecios() {
  const sc = document.getElementById('screen');
  sc.innerHTML = loadingHtml('Cargando comparador de precios...');

  let productos, alertas, tiendas;
  try {
    [productos, alertas, tiendas] = await Promise.all([
      API.productosPrecios(),
      API.precioAlertas(),
      API.tiendas(),
    ]);
    PREC.cache.productos = productos;
    PREC.cache.tiendas   = tiendas;
    PREC.cache.alertas   = alertas;
  } catch(e) { sc.innerHTML = errHtml(e); return; }

  const tiendasConPrecios = tiendas.length;
  const productosConCompar = productos.filter(p => p.num_tiendas >= 2).length;

  sc.innerHTML = `
  <div class="ph">
    <div class="ph-row">
      <div>
        <div class="page-title">Comparador de Precios</div>
        <div class="page-sub">${productos.length} productos · ${tiendasConPrecios} tiendas · ${productosConCompar} con comparación entre tiendas</div>
      </div>
      <button class="btn btn-p btn-sm" onclick="openRegistrarPrecioModal()">+ Registrar precio</button>
    </div>
  </div>

  <!-- Alerta de configuración si no hay datos -->
  ${productos.length === 0 ? `
  <div class="ins ins-b" style="margin-bottom:14px">
    <div class="ins-ico">ℹ️</div>
    <div>
      <div class="ins-title">El comparador se activa con el uso</div>
      <div class="ins-text">Registra precios al hacer tus compras: selecciona el producto del catálogo, la tienda y el precio por unidad. Con cada compra el sistema aprende y empieza a comparar.</div>
    </div>
  </div>` : ''}

  ${alertas.length ? `
  <div style="margin-bottom:14px">
    ${alertas.slice(0,2).map(a=>`
    <div class="ins ins-w">
      <div class="ins-ico">📈</div>
      <div>
        <div class="ins-title">${a.producto} subió ${a.delta}% vs mes anterior</div>
        <div class="ins-text">${U.fmt(a.prev)} → ${U.fmt(a.curr)} · Mejor precio actual: ${U.fmt(a.mejor_precio)} en ${a.mejor_tienda}</div>
      </div>
    </div>`).join('')}
  </div>` : ''}

  <!-- Buscador -->
  <div style="margin-bottom:12px">
    <input class="fi" id="prec-busq" type="text" placeholder="🔍 Buscar producto (Huevo, Pollo, Leche...)"
      value="${PREC.filtro}" oninput="PREC.filtro=this.value;renderPrecListado()">
  </div>

  <!-- Tabs -->
  <div class="tab-pills" style="margin-bottom:14px">
    <button class="pill ${PREC.tab==='lista'?'on':''}" onclick="PREC.tab='lista';renderPrecListado()">
      🛒 Productos (${productos.length})
    </button>
    <button class="pill ${PREC.tab==='tiendas'?'on':''}" onclick="PREC.tab='tiendas';renderTiendasTab()">
      🏪 Tiendas (${tiendasConPrecios})
    </button>
    <button class="pill ${PREC.tab==='alertas'?'on':''}" onclick="PREC.tab='alertas';renderAlertasTab()">
      🔔 Alertas${alertas.length?` (${alertas.length})`:''}
    </button>
    <button class="pill ${PREC.tab==='catalogo'?'on':''}" onclick="PREC.tab='catalogo';renderCatalogoTab()">
      📚 Catálogo
    </button>
  </div>

  <div id="prec-body">
    ${PREC.tab==='lista' ? _renderListaProductos(_filtrarProductos(productos, PREC.filtro)) : ''}
  </div>`;

  if (PREC.tab === 'tiendas')  renderTiendasTab();
  if (PREC.tab === 'alertas')  renderAlertasTab();
  if (PREC.tab === 'catalogo') renderCatalogoTab();
}

// ── Listado de productos ──────────────────────────────────────
function _filtrarProductos(lista, q) {
  if (!q) return lista;
  const ql = q.toLowerCase();
  return lista.filter(p => p.nombre.toLowerCase().includes(ql) || (p.categoria||'').toLowerCase().includes(ql));
}

function renderPrecListado() {
  const el = document.getElementById('prec-body'); if (!el) return;
  const prods = _filtrarProductos(PREC.cache.productos || [], PREC.filtro);
  if (PREC.tab === 'lista') el.innerHTML = _renderListaProductos(prods);
}

function _renderListaProductos(lista) {
  if (!lista.length) return `<div class="empty"><div class="empty-ico">🔍</div>
    <div class="empty-txt">No hay productos. Comienza registrando precios en tus compras.</div></div>`;

  const TICONS = { up:'📈', down:'📉', stable:'➡️' };
  const TCLS   = { up:'b-r', down:'b-g', stable:'b-gr' };

  return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px">
    ${lista.map(p => `
    <div class="card" style="cursor:pointer" onclick="verDetalle('${p.id}')">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <div>
          <div style="font-size:13px;font-weight:700">${p.nombre}</div>
          <div style="font-size:11px;color:var(--text2);margin-top:2px">${p.categoria} · ${p.num_obs} obs. · ${p.num_tiendas} tienda${p.num_tiendas!==1?'s':''}</div>
        </div>
        <span class="badge ${TCLS[p.tendencia]}">${TICONS[p.tendencia]}</span>
      </div>
      ${p.num_tiendas >= 2 ? `
      <div style="display:flex;justify-content:space-between;align-items:flex-end">
        <div>
          <div style="font-size:11px;color:var(--text2)">Mejor precio</div>
          <div style="font-size:22px;font-weight:800;color:var(--success)">${U.fmt(p.mejor_precio)}</div>
          <div style="font-size:11px;color:var(--text2)">en <strong>${p.mejor_tienda}</strong></div>
        </div>
        <div style="text-align:right">
          <div class="badge b-g" style="font-size:13px">−${p.ahorro_pct}%</div>
          <div style="font-size:11px;color:var(--success);margin-top:3px">vs ${p.peor_tienda}</div>
        </div>
      </div>` : `
      <div>
        <div style="font-size:11px;color:var(--text2)">Precio registrado</div>
        <div style="font-size:20px;font-weight:800;color:var(--primary)">${U.fmt(p.mejor_precio)}</div>
        <div style="font-size:11px;color:var(--text2)">en ${p.mejor_tienda} · Solo 1 tienda registrada</div>
      </div>`}
    </div>`).join('')}
  </div>`;
}

// ── Detalle de un producto ────────────────────────────────────
async function verDetalle(productoId) {
  const sc = document.getElementById('screen');
  sc.innerHTML = `<button class="btn btn-g btn-sm" onclick="renderPrecios()" style="margin-bottom:14px">← Volver</button>
    ${loadingHtml('Cargando detalle...')}`;

  let d;
  try { d = await API.precioDetalle(productoId); }
  catch(e) { sc.innerHTML = errHtml(e); return; }

  const STORE_COLS = ['#2563eb','#059669','#d97706','#dc2626','#7c3aed','#0891b2'];

  sc.innerHTML = `
  <button class="btn btn-g btn-sm" onclick="renderPrecios()" style="margin-bottom:14px">← Volver al comparador</button>

  <div class="page-title" style="margin-bottom:4px">${d.nombre}</div>
  <div class="page-sub" style="margin-bottom:16px">${d.categoria} · ${d.unidad_base} · ${d.total_obs} observaciones · ${d.num_tiendas} tiendas</div>

  ${d.num_tiendas < 2 ? `
  <div class="ins ins-b" style="margin-bottom:14px">
    <div class="ins-ico">💡</div>
    <div><div class="ins-title">Necesitas datos de más tiendas</div>
    <div class="ins-text">Para comparar, registra el precio de este producto en al menos 2 tiendas diferentes. Haz clic en "+ Registrar precio" arriba.</div></div>
  </div>` : `
  <div class="card" style="border:2px solid var(--success);margin-bottom:14px">
    <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      <div style="flex:1">
        <div style="font-size:11px;font-weight:700;color:var(--success);text-transform:uppercase">Mejor precio actual</div>
        <div style="font-size:32px;font-weight:800;color:var(--success)">${U.fmt(d.mejor_precio)}</div>
        <div style="font-size:14px">en <strong>${d.mejor_tienda}</strong> por ${d.unidad_base}</div>
      </div>
      ${d.ahorro_monto > 0 ? `
      <div style="padding:14px;background:var(--success-bg);border-radius:var(--r-md);text-align:right">
        <div style="font-size:11px;font-weight:700;color:var(--success)">Ahorro vs ${d.peor_tienda}</div>
        <div style="font-size:24px;font-weight:800;color:var(--success)">−${U.fmt(d.ahorro_monto)}</div>
        <div style="font-size:11px;color:var(--success)">por ${d.unidad_base} (${d.ahorro_pct}%)</div>
      </div>` : ''}
    </div>
  </div>`}

  <div class="g2" style="margin-bottom:14px">
    <div class="card">
      <div class="card-title">Precio por tienda (último registrado)</div>
      ${d.porTienda.map((t,i) => {
        const max = d.peor_precio || 1;
        const pct = Math.round(t.precio / max * 100);
        return `<div style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <span style="font-size:13px;font-weight:600;color:${STORE_COLS[i%STORE_COLS.length]}">${i===0?'🏆 ':''}${t.tienda}</span>
            <div>
              <span style="font-size:15px;font-weight:800;color:${i===0?'var(--success)':'var(--text)'}">${U.fmt(t.precio)}</span>
              <span style="font-size:11px;color:var(--text2)"> / ${d.unidad_base}</span>
            </div>
          </div>
          <div style="font-size:10px;color:var(--text2);margin-bottom:4px">Observado: ${U.fecha(t.fecha)}</div>
          <div class="pbar"><div class="pbar-fill" style="width:${pct}%;background:${i===0?'var(--success)':STORE_COLS[i%STORE_COLS.length]}"></div></div>
        </div>`;
      }).join('')}
    </div>
    <div class="card">
      <div class="card-title">Evolución del precio promedio</div>
      ${d.evolucion.length >= 2
        ? `<div class="chart-wrap"><canvas id="ch-prec-ev"></canvas></div>`
        : `<div class="empty" style="padding:20px"><div class="empty-txt">Necesitas observaciones en 2+ meses para ver la evolución.</div></div>`}
    </div>
  </div>

  <div class="card" style="margin-bottom:14px">
    <div class="card-title">Historial completo (${d.total_obs} registros)</div>
    <table class="tx-tbl">
      <thead><tr><th>Fecha</th><th>Tienda</th><th>Precio/und</th><th>Cantidad</th><th>Fuente</th></tr></thead>
      <tbody>
      ${d.historial.map(r => `
        <tr>
          <td style="font-size:12px;white-space:nowrap">${U.fecha(r.fecha)}</td>
          <td style="font-weight:600">${r.tienda}</td>
          <td style="font-weight:700;color:var(--primary)">${U.fmt(r.precio)}</td>
          <td style="color:var(--text2)">${r.cantidad} ${r.unidad}</td>
          <td><span class="badge ${r.fuente==='Manual'?'b-p':r.fuente==='Auto-TX'?'b-b':'b-gr'}">${r.fuente}</span></td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <div style="text-align:center">
    <button class="btn btn-p" onclick="openRegistrarPrecioModal('${productoId}')">+ Registrar nuevo precio de ${d.nombre}</button>
  </div>`;

  if (d.evolucion.length >= 2) {
    setTimeout(() => U.lineChart('ch-prec-ev', d.evolucion.map(e => e.mes), [{
      label: 'Precio promedio', data: d.evolucion.map(e => e.promedio),
      borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,.08)', fill: true,
    }]), 50);
  }
}

// ── Tiendas tab ───────────────────────────────────────────────
async function renderTiendasTab() {
  const el = document.getElementById('prec-body'); if (!el) return;
  el.innerHTML = loadingHtml();
  let data;
  try { data = await API.tiendasRanking(); }
  catch(e) { el.innerHTML = errHtml(e); return; }

  if (!data.length) { el.innerHTML = `<div class="empty"><div class="empty-ico">🏪</div><div class="empty-txt">Sin datos de tiendas todavía.</div></div>`; return; }

  const maxObs = data[0]?.num_obs || 1;
  el.innerHTML = `
  <div class="ins ins-b" style="margin-bottom:12px">
    <div class="ins-ico">📊</div>
    <div><div class="ins-text">Comparativa basada en ${data.reduce((s,t)=>s+t.num_obs,0)} observaciones de precios con tienda explícita.</div></div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px">
    ${data.map((t,i) => `
    <div class="card">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <div style="width:32px;height:32px;border-radius:50%;background:var(--primary-bg);color:var(--primary);font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center">#${i+1}</div>
        <div>
          <div style="font-size:14px;font-weight:700">${t.nombre}</div>
          <div style="font-size:11px;color:var(--text2)">${t.tipo}</div>
        </div>
      </div>
      <div class="pbar" style="margin-bottom:8px">
        <div class="pbar-fill" style="width:${Math.round(t.num_obs/maxObs*100)}%;background:var(--primary)"></div>
      </div>
      <div class="g2 keep" style="gap:6px">
        <div class="ds"><div class="ds-lbl">Observaciones</div><div class="ds-val">${t.num_obs}</div></div>
        <div class="ds"><div class="ds-lbl">Mejor precio en</div><div class="ds-val" style="color:var(--success)">${t.mejor_precio_en} prod.</div></div>
      </div>
      ${t.pct_mejor > 0 ? `<div style="margin-top:8px;font-size:11px;color:var(--success)">✅ Más barato en ${t.pct_mejor}% de los productos</div>` : ''}
      ${t.monto_total_compras > 0 ? `<div style="margin-top:4px;font-size:11px;color:var(--text2)">Compras totales: ${U.fmtI(t.monto_total_compras)}</div>` : ''}
    </div>`).join('')}
  </div>`;
}

// ── Alertas tab ───────────────────────────────────────────────
function renderAlertasTab() {
  const el = document.getElementById('prec-body'); if (!el) return;
  const alertas = PREC.cache.alertas || [];
  if (!alertas.length) {
    el.innerHTML = `<div class="empty"><div class="empty-ico">✅</div><div class="empty-txt">Sin alertas de precio. Los precios están estables.</div></div>`;
    return;
  }
  el.innerHTML = alertas.map(a => `
  <div class="card" style="border-left:3px solid var(--danger);margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <div>
        <div style="font-size:14px;font-weight:700">${a.producto}</div>
        <div style="font-size:12px;color:var(--text2)">${U.fmt(a.prev)} → ${U.fmt(a.curr)} (+${a.delta}%)</div>
      </div>
      <span class="badge b-r">+${a.delta}%</span>
    </div>
    <div class="ins ins-b" style="margin-top:10px">
      <div class="ins-ico">💡</div>
      <div><div class="ins-text">Precio más bajo: <strong>${U.fmt(a.mejor_precio)}</strong> en ${a.mejor_tienda}</div></div>
    </div>
  </div>`).join('');
}

// ── Catálogo tab (PRODUCTOS + TIENDAS) ────────────────────────
async function renderCatalogoTab() {
  const el = document.getElementById('prec-body'); if (!el) return;
  el.innerHTML = loadingHtml();
  let prods, tiendas;
  try { [prods, tiendas] = await Promise.all([API.productosMaestro(), API.tiendas()]); }
  catch(e) { el.innerHTML = errHtml(e); return; }

  el.innerHTML = `
  <div class="g2" style="gap:14px">

    <!-- Productos -->
    <div class="card">
      <div class="sec-hd">
        <div class="card-title" style="margin:0">Productos (${prods.length})</div>
        <button class="btn btn-p btn-xs" onclick="openModalProducto(null)">+ Nuevo</button>
      </div>
      <p style="font-size:11px;color:var(--text2);margin-bottom:10px">Nombres canónicos para comparar entre tiendas.</p>
      <div style="max-height:320px;overflow-y:auto">
        ${prods.map(p => `
        <div style="display:flex;align-items:center;gap:8px;padding:7px;background:var(--surface2);border-radius:var(--r-sm);margin-bottom:5px">
          <div style="flex:1">
            <div style="font-size:12px;font-weight:700">${p['Nombre_Canónico']}</div>
            <div style="font-size:10px;color:var(--text2)">${p['Categoría']} · ${p['Unidad_Base']}</div>
          </div>
          <button class="act-btn" onclick='openModalProducto(${JSON.stringify(p).replace(/'/g,"&#39;")})'>✏️</button>
          <button class="act-btn del" onclick="delProd('${p.ID}')">🗑</button>
        </div>`).join('')}
      </div>
    </div>

    <!-- Tiendas -->
    <div class="card">
      <div class="sec-hd">
        <div class="card-title" style="margin:0">Tiendas (${tiendas.length})</div>
        <button class="btn btn-p btn-xs" onclick="openModalTienda(null)">+ Nueva</button>
      </div>
      <p style="font-size:11px;color:var(--text2);margin-bottom:10px">Lista de tiendas reconocidas por el sistema.</p>
      <div style="max-height:320px;overflow-y:auto">
        ${tiendas.map(t => `
        <div style="display:flex;align-items:center;gap:8px;padding:7px;background:var(--surface2);border-radius:var(--r-sm);margin-bottom:5px">
          <div style="flex:1">
            <div style="font-size:12px;font-weight:700">🏪 ${t.Nombre}</div>
            <div style="font-size:10px;color:var(--text2)">${t.Tipo}${t.Aliases?' · '+t.Aliases:''}</div>
          </div>
          <button class="act-btn" onclick='openModalTienda(${JSON.stringify(t).replace(/'/g,"&#39;")})'>✏️</button>
          <button class="act-btn del" onclick="delTie('${t.ID}')">🗑</button>
        </div>`).join('')}
      </div>
    </div>

  </div>`;
}

// ════════════════════════════════════════════════════════════════
//  MODAL: REGISTRAR PRECIO
// ════════════════════════════════════════════════════════════════
async function openRegistrarPrecioModal(productoIdPresel = null) {
  let prods = PREC.cache.productos;
  let tiendas = PREC.cache.tiendas;
  if (!prods) { try { prods = await API.productosPrecios(); PREC.cache.productos = prods; } catch { prods = []; } }
  if (!tiendas) { try { tiendas = await API.tiendas(); PREC.cache.tiendas = tiendas; } catch { tiendas = []; } }

  // También obtener la lista maestra para el dropdown
  let maestro;
  try { maestro = await API.productosMaestro(); } catch { maestro = []; }

  const prodOpts = maestro.map(p => `<option value="${p.ID}" data-nombre="${p['Nombre_Canónico']}" ${p.ID === productoIdPresel ? 'selected' : ''}>${p['Nombre_Canónico']} (${p['Unidad_Base']})</option>`).join('');
  const tieOpts  = tiendas.map(t => `<option value="${t.ID}" data-nombre="${t.Nombre}">${t.Nombre} (${t.Tipo})</option>`).join('');

  A.openModal('Registrar precio de producto', `
  <div class="ins ins-b" style="margin-bottom:12px">
    <div class="ins-ico">💡</div>
    <div><div class="ins-text">Registra el precio <strong>por unidad</strong> (S/./kg, S/./unidad, etc.). Puedes registrar sin comprar, solo para comparar.</div></div>
  </div>
  <div class="form-g">
    <label class="fl">Producto (del catálogo)</label>
    <select class="fi" id="rp-prod">
      <option value="">— Seleccionar producto —</option>
      ${prodOpts}
    </select>
    <div style="font-size:11px;color:var(--text2);margin-top:4px">¿No aparece? Ve a Catálogo → Productos y agrégalo primero.</div>
  </div>
  <div class="form-g">
    <label class="fl">Tienda</label>
    <select class="fi" id="rp-tie">
      <option value="">— Seleccionar tienda —</option>
      ${tieOpts}
    </select>
    <div style="font-size:11px;color:var(--text2);margin-top:4px">¿No aparece? Ve a Catálogo → Tiendas y agrégala primero.</div>
  </div>
  <div class="fr">
    <div class="form-g">
      <label class="fl">Precio por unidad (S/.)</label>
      <input type="number" class="fi" id="rp-precio" placeholder="0.00" step="0.01" min="0">
    </div>
    <div class="form-g">
      <label class="fl">Fecha de observación</label>
      <input type="date" class="fi" id="rp-fecha" value="${U.hoy()}">
    </div>
  </div>
  <div class="fr">
    <div class="form-g">
      <label class="fl opt">Cantidad</label>
      <input type="text" class="fi" id="rp-cant" placeholder="Ej: 1, 500gr, 1kg">
    </div>
    <div class="form-g">
      <label class="fl opt">Unidad</label>
      <select class="fi" id="rp-unid">
        <option>und</option><option>kg</option><option>gr</option>
        <option>lt</option><option>ml</option><option>paq</option>
      </select>
    </div>
  </div>
  <div class="form-g">
    <label class="fl opt">Notas</label>
    <input type="text" class="fi" id="rp-notas" placeholder="Ej: oferta especial, empaque grande...">
  </div>
  <div class="btn-row">
    <button class="btn btn-p" onclick="submitRegistrarPrecio()">💾 Guardar precio</button>
    <button class="btn btn-g" onclick="A.closeModal()">Cancelar</button>
  </div>`);
}

async function submitRegistrarPrecio() {
  const prodEl  = document.getElementById('rp-prod');
  const tieEl   = document.getElementById('rp-tie');
  const prodId  = prodEl.value;
  const tieId   = tieEl.value;
  const prodNom = prodEl.options[prodEl.selectedIndex]?.dataset.nombre || '';
  const tieNom  = tieEl.options[tieEl.selectedIndex]?.dataset.nombre || '';
  const precio  = document.getElementById('rp-precio').value;
  const fecha   = document.getElementById('rp-fecha').value;

  if (!prodId)  { U.toast('❌ Selecciona un producto del catálogo'); return; }
  if (!tieId)   { U.toast('❌ Selecciona una tienda'); return; }
  if (!precio)  { U.toast('❌ Ingresa el precio por unidad'); return; }

  const btn = document.querySelector('#modal-body .btn-p');
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }
  try {
    await API.addPrecio({
      fecha, producto_id: prodId, producto_nombre: prodNom,
      tienda_id: tieId, tienda_nombre: tieNom,
      precio_unitario: parseFloat(precio),
      cantidad: document.getElementById('rp-cant').value || '1',
      unidad: document.getElementById('rp-unid').value,
      fuente: 'Manual',
      notas: document.getElementById('rp-notas').value,
    });
    U.toast('✅ Precio registrado');
    PREC.cache.productos = null;
    PREC.cache.alertas   = null;
    A.closeModal();
    renderPrecios();
  } catch(e) {
    U.toast('❌ ' + e.message);
    if (btn) { btn.disabled = false; btn.textContent = '💾 Guardar precio'; }
  }
}

// ════════════════════════════════════════════════════════════════
//  MODALES DE CATÁLOGO
// ════════════════════════════════════════════════════════════════
function openModalProducto(prod) {
  const isEdit = !!prod;
  const catOpts = (ST.cats||[]).map(c=>`<option value="${c.Nombre}" ${(prod?.Categoría||'')===c.Nombre?'selected':''}>${c.Nombre}</option>`).join('');

  A.openModal(isEdit ? 'Editar producto' : 'Nuevo producto canónico', `
  <div class="ins ins-b" style="margin-bottom:12px">
    <div class="ins-ico">📚</div>
    <div><div class="ins-text">El <strong>Nombre Canónico</strong> es cómo el sistema identifica este producto para comparar precios entre tiendas. Los <strong>aliases</strong> son variaciones del nombre en tus tickets.</div></div>
  </div>
  <div class="form-g">
    <label class="fl">Nombre canónico</label>
    <input type="text" class="fi" id="pm-nom" value="${prod?.['Nombre_Canónico']||''}" placeholder="Ej: Pechuga de Pollo">
  </div>
  <div class="fr">
    <div class="form-g">
      <label class="fl">Categoría</label>
      <select class="fi" id="pm-cat"><option value="">—</option>${catOpts}</select>
    </div>
    <div class="form-g">
      <label class="fl">Unidad base de comparación</label>
      <select class="fi" id="pm-unid">
        ${['und','kg','gr','litro','ml','paq','docena'].map(u=>`<option ${(prod?.['Unidad_Base']||'und')===u?'selected':''}>${u}</option>`).join('')}
      </select>
    </div>
  </div>
  <div class="form-g">
    <label class="fl">Aliases (separados por coma)</label>
    <input type="text" class="fi" id="pm-aliases" value="${prod?.Aliases||''}" placeholder="Ej: Filete Pechuga,Pechuga ARO,Makro Pechuga">
    <div style="font-size:11px;color:var(--text2);margin-top:4px">Copia aquí los nombres que usas en tus transacciones para que el sistema los reconozca automáticamente.</div>
  </div>
  <div class="btn-row">
    <button class="btn btn-p" onclick="submitProducto('${isEdit?prod.ID:''}')">${isEdit?'💾 Actualizar':'+ Crear producto'}</button>
    <button class="btn btn-g" onclick="A.closeModal()">Cancelar</button>
  </div>`);
}

async function submitProducto(editId) {
  const data = {
    nombre:     document.getElementById('pm-nom').value.trim(),
    categoria:  document.getElementById('pm-cat').value,
    unidad_base:document.getElementById('pm-unid').value,
    aliases:    document.getElementById('pm-aliases').value.split(',').map(s=>s.trim()).filter(Boolean),
  };
  if (!data.nombre) { U.toast('❌ El nombre es requerido'); return; }
  try {
    if (editId) { await API.updProducto(editId, data); U.toast('✅ Producto actualizado'); }
    else        { await API.addProducto(data);         U.toast('✅ Producto creado'); }
    PREC.cache.productos = null;
    A.closeModal(); renderCatalogoTab();
  } catch(e) { U.toast('❌ ' + e.message); }
}

async function delProd(id) {
  if (!confirm('¿Eliminar este producto? Sus observaciones de precio se conservan.')) return;
  try { await API.delProducto(id); PREC.cache.productos = null; U.toast('🗑 Eliminado'); renderCatalogoTab(); }
  catch(e) { U.toast('❌ ' + e.message); }
}

function openModalTienda(tie) {
  const isEdit = !!tie;
  A.openModal(isEdit ? 'Editar tienda' : 'Nueva tienda', `
  <div class="form-g">
    <label class="fl">Nombre oficial de la tienda</label>
    <input type="text" class="fi" id="tm-nom" value="${tie?.Nombre||''}" placeholder="Ej: Makro">
  </div>
  <div class="form-g">
    <label class="fl">Tipo</label>
    <select class="fi" id="tm-tipo">
      ${['Mayorista','Supermercado','Minimarket','Bodega','Farmacia','Restaurante','Mercado','Online','Otro']
        .map(t=>`<option ${(tie?.Tipo||'Supermercado')===t?'selected':''}>${t}</option>`).join('')}
    </select>
  </div>
  <div class="form-g">
    <label class="fl opt">Aliases (nombres alternativos)</label>
    <input type="text" class="fi" id="tm-alias" value="${tie?.Aliases||''}" placeholder="Ej: Marko (si aparece mal escrito en tus registros)">
  </div>
  <div class="btn-row">
    <button class="btn btn-p" onclick="submitTienda('${isEdit?tie.ID:''}')">${isEdit?'💾 Actualizar':'+ Crear tienda'}</button>
    <button class="btn btn-g" onclick="A.closeModal()">Cancelar</button>
  </div>`);
}

async function submitTienda(editId) {
  const data = {
    nombre:  document.getElementById('tm-nom').value.trim(),
    tipo:    document.getElementById('tm-tipo').value,
    aliases: document.getElementById('tm-alias').value.split(',').map(s=>s.trim()).filter(Boolean),
  };
  if (!data.nombre) { U.toast('❌ El nombre es requerido'); return; }
  try {
    if (editId) { await API.updTienda(editId, data); U.toast('✅ Tienda actualizada'); }
    else        { await API.addTienda(data);         U.toast('✅ Tienda creada'); }
    PREC.cache.tiendas = null;
    A.closeModal(); renderCatalogoTab();
  } catch(e) { U.toast('❌ ' + e.message); }
}

async function delTie(id) {
  if (!confirm('¿Eliminar esta tienda?')) return;
  try { await API.delTienda(id); PREC.cache.tiendas = null; U.toast('🗑 Eliminada'); renderCatalogoTab(); }
  catch(e) { U.toast('❌ ' + e.message); }
}// ════════════════════════════════════════════════════════════════
//  AGREGAR ESTO AL FINAL DE precios.js (después de delTie)
//  Balance P/K — Liquidación mensual entre Paola y Kelwin
// ════════════════════════════════════════════════════════════════

async function renderBalancePK() {
  const sc = document.getElementById('screen');
  sc.innerHTML = loadingHtml('Calculando balance...');
  let d;
  try { d = await API.balancePK(ST.mes, ST.anio); }
  catch(e) { sc.innerHTML = errHtml(e); return; }

  sc.innerHTML = `
  <div class="ph">
    <div class="page-title">Balance Paola & Kelwin</div>
    <div class="page-sub">${U.mesLbl(ST.mes,ST.anio)} · Gastos compartidos</div>
  </div>

  <div class="card" style="margin-bottom:14px;${d.hayDeuda?'border:2px solid var(--danger)':''}">
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;padding:8px 0">

      <div style="text-align:center;flex:1;min-width:110px">
        <div style="font-size:36px;margin-bottom:6px">👩</div>
        <div style="font-size:14px;font-weight:700">Paola</div>
        <div style="font-size:11px;color:var(--text2);margin-bottom:4px">Pagó en gastos compartidos</div>
        <div style="font-size:22px;font-weight:800;color:${d.pagoPaola>=d.cadaUnoDebePagar?'var(--success)':'var(--danger)'}">
          ${U.fmtI(d.pagoPaola)}
        </div>
      </div>

      <div style="text-align:center;padding:16px 20px;background:${d.hayDeuda?'var(--danger-bg)':'var(--success-bg)'};border-radius:var(--r-lg);flex-shrink:0">
        ${d.hayDeuda ? `
          <div style="font-size:28px;font-weight:800;color:var(--danger)">${U.fmtI(d.diferencia)}</div>
          <div style="font-size:12px;font-weight:700;color:var(--danger);margin-top:4px">${d.deudor} → ${d.acreedor}</div>
          <div style="font-size:11px;color:var(--danger)">debe transferir</div>
        ` : `
          <div style="font-size:32px">✅</div>
          <div style="font-size:13px;font-weight:700;color:var(--success);margin-top:4px">Están al día</div>
        `}
      </div>

      <div style="text-align:center;flex:1;min-width:110px">
        <div style="font-size:36px;margin-bottom:6px">👨</div>
        <div style="font-size:14px;font-weight:700">Kelwin</div>
        <div style="font-size:11px;color:var(--text2);margin-bottom:4px">Pagó en gastos compartidos</div>
        <div style="font-size:22px;font-weight:800;color:${d.pagoKelwin>=d.cadaUnoDebePagar?'var(--success)':'var(--danger)'}">
          ${U.fmtI(d.pagoKelwin)}
        </div>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text2);padding-top:12px;margin-top:12px;border-top:1px solid var(--border)">
      <span>Total compartido: <strong style="color:var(--text)">${U.fmtI(d.totalCompartido)}</strong></span>
      <span>Cada uno debería pagar: <strong style="color:var(--text)">${U.fmtI(d.cadaUnoDebePagar)}</strong></span>
    </div>
  </div>

  ${d.hayDeuda ? `
  <div class="ins ins-b" style="margin-bottom:14px">
    <div class="ins-ico">💡</div>
    <div>
      <div class="ins-title">Cómo liquidar este mes</div>
      <div class="ins-text">
        <strong>${d.deudor}</strong> transfiere <strong>${U.fmtI(d.diferencia)}</strong>
        a <strong>${d.acreedor}</strong> por Yape o Plin para quedar a mano.
      </div>
    </div>
  </div>` : ''}

  <div class="card">
    <div class="card-title">Detalle gastos compartidos · ${d.detalles.length} transacciones</div>
    ${d.detalles.length ? `
    <table class="tx-tbl">
      <thead><tr>
        <th>Fecha</th><th>Descripción</th><th>Monto</th><th>Pagó</th>
      </tr></thead>
      <tbody>
      ${d.detalles.map(r => `
        <tr>
          <td style="font-size:12px;white-space:nowrap">${U.fecha(r.fecha)}</td>
          <td>
            <div class="tx-name">${r.descripcion}</div>
            <div class="tx-meta">${r.categoria}</div>
          </td>
          <td class="neg" style="font-weight:700">${U.fmtI(r.monto)}</td>
          <td>
            <span class="badge ${r.quien_pago.toLowerCase().includes('paola')?'b-p':'b-b'}">
              ${r.quien_pago||'Ambos'}
            </span>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>` : `
    <div class="empty">
      <div class="empty-ico">📋</div>
      <div class="empty-txt">Sin gastos compartidos este mes.<br>
      Las transacciones compartidas deben tener<br>
      <strong>Responsable = "Paola y Kelwin"</strong></div>
    </div>`}
  </div>`;
}

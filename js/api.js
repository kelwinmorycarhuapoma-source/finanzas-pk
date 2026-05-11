// js/api.js — FinanzasPK v4
const API = {

  async get(p) {
    const u = new URL(CFG.API_URL);
    u.searchParams.set('key', CFG.API_KEY);
    Object.entries(p).forEach(([k, v]) => { if (v != null && v !== '') u.searchParams.set(k, v); });
    const r = await fetch(u.toString());
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || 'Error del servidor');
    return j.data;
  },

  async post(b) {
    // GET con _method=post evita preflight CORS en Chrome Android
    const u = new URL(CFG.API_URL);
    u.searchParams.set('key', CFG.API_KEY);
    u.searchParams.set('_method', 'post');
    u.searchParams.set('_data', JSON.stringify(b));
    const r = await fetch(u.toString());
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || 'Error del servidor');
    return j.data;
  },

  // ── GET ──
  dashboard:   (m, a)      => API.get({ action: 'dashboard',    mes: m, anio: a }),
  txs:         (m, a, t, q)=> API.get({ action: 'transactions', mes: m, anio: a, tipo: t, busq: q }),
  analytics:   (m, a)      => API.get({ action: 'analytics',    mes: m, anio: a }),
  proyeccion:  (m, a)      => API.get({ action: 'proyeccion',   mes: m, anio: a }),
  presupuesto: (m, a)      => API.get({ action: 'presupuesto',  mes: m, anio: a }),
  debts:       ()           => API.get({ action: 'debts' }),
  goals:       ()           => API.get({ action: 'goals' }),
  junta:       ()           => API.get({ action: 'junta' }),
  cco:         ()           => API.get({ action: 'cco' }),
  cats:        ()           => API.get({ action: 'categories' }),
  recs:        ()           => API.get({ action: 'recurrentes' }),
  config:      ()           => API.get({ action: 'config' }),
  // Comparador de Precios v4
  tiendas:          ()      => API.get({ action: 'tiendas' }),
  productosMaestro: ()      => API.get({ action: 'productos_maestro' }),
  productosPrecios: ()      => API.get({ action: 'productos_precios' }),
  precioDetalle:    id      => API.get({ action: 'precio_detalle', id }),
  tiendasRanking:   ()      => API.get({ action: 'tiendas_rank' }),
  precioAlertas:    ()      => API.get({ action: 'precio_alertas' }),
  sugerirProd:      texto   => API.get({ action: 'sugerir_prod', texto }),
  balancePK:        (m, a)  => API.get({ action: 'balance_pk', mes: m, anio: a }),

  // ── POST ──
  addTx:       d            => API.post({ action: 'addTx',      data: d }),
  updTx:       (id, d)      => API.post({ action: 'updTx',      id, data: d }),
  delTx:       id           => API.post({ action: 'delTx',      id }),
  addDebt:     d            => API.post({ action: 'addDebt',    data: d }),
  updDebt:     (id, d)      => API.post({ action: 'updDebt',    id, data: d }),
  delDebt:     id           => API.post({ action: 'delDebt',    id }),
  addGoal:     d            => API.post({ action: 'addGoal',    data: d }),
  updGoal:     (id, d)      => API.post({ action: 'updGoal',    id, data: d }),
  delGoal:     id           => API.post({ action: 'delGoal',    id }),
  addCat:      d            => API.post({ action: 'addCat',     data: d }),
  updCat:      (id, d)      => API.post({ action: 'updCat',     id, data: d }),
  delCat:      id           => API.post({ action: 'delCat',     id }),
  addRec:      d            => API.post({ action: 'addRec',     data: d }),
  delRec:      id           => API.post({ action: 'delRec',     id }),
  aplicarRec:  id           => API.post({ action: 'aplicarRec', id }),
  updPpto:     (c, m, a, v) => API.post({ action: 'updPpto',    categoria: c, mes: m, anio: a, monto: v }),
  addJunta:    d            => API.post({ action: 'addJunta',   data: d }),
  addCCO:      d            => API.post({ action: 'addCCO',     data: d }),
  cobrado:     idx          => API.post({ action: 'cobrado',    idx }),
  setCfg:      (c, v)       => API.post({ action: 'setCfg',     clave: c, valor: v }),
  // Comparador de Precios v4
  addPrecio:   d            => API.post({ action: 'addPrecio',   data: d }),
  addProducto: d            => API.post({ action: 'addProducto', data: d }),
  updProducto: (id, d)      => API.post({ action: 'updProducto', id, data: d }),
  delProducto: id           => API.post({ action: 'delProducto', id }),
  addTienda:   d            => API.post({ action: 'addTienda',   data: d }),
  updTienda:   (id, d)      => API.post({ action: 'updTienda',   id, data: d }),
  delTienda:   id           => API.post({ action: 'delTienda',   id }),
};

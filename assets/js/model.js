/*
  Modelo de riesgo en tres niveles.
  1. Variables a categorías: suma ponderada.
  2. Categorías a componentes: suma ponderada.
  3. Riesgo = (Amenaza × Exposición × Vulnerabilidad)^(1/3), sin pesos.

  DATOS DE PRUEBA: las capas se generan aquí con patrones inventados sobre
  el contorno real del área de estudio. Cuando estén las capas reales,
  se reemplaza la función crearCapas() por la lectura de los rásteres.
*/
(function () {
  const ESTRUCTURA = [
    {
      id: 'A', nombre: 'Amenaza', color: '#A8402C',
      categorias: [
        { id: 'veg', nombre: 'Vegetación y combustible', variables: [
          ['tipo_comb', 'Tipo de combustible', 'bosque'],
          ['carga_comb', 'Carga total de combustible', 'bosque'],
          ['dur_comb', 'Duración del combustible', 'bosque'],
          ['retamo', 'Retamo espinoso', 'borde'],
          ['ndmi', 'Humedad de la vegetación (NDMI)', 'bosque_inv'] ] },
        { id: 'clima', nombre: 'Clima', variables: [
          ['precip', 'Precipitación', 'sur'],
          ['temp', 'Temperatura', 'norte'],
          ['rad', 'Radiación solar', 'norte'],
          ['viento', 'Velocidad del viento', 'pendiente'],
          ['humedad', 'Humedad', 'sur'] ] },
        { id: 'relieve', nombre: 'Relieve', variables: [
          ['pendiente', 'Pendiente', 'pendiente'],
          ['orientacion', 'Orientación de ladera', 'parches'] ] },
        { id: 'ignicion', nombre: 'Ignición antrópica de borde', variables: [
          ['vias', 'Vías, caminos y senderos', 'borde'] ] },
        { id: 'historico', nombre: 'Registro histórico', variables: [
          ['kernel', 'Densidad de incendios (kernel)', 'borde'],
          ['quemada', 'Área quemada', 'parches'] ] }
      ]
    },
    {
      id: 'E', nombre: 'Exposición', color: '#B8860B',
      categorias: [
        { id: 'poblacion', nombre: 'Población', variables: [
          ['dens_pob', 'Densidad poblacional', 'ciudad'] ] },
        { id: 'evac', nombre: 'Equipamientos de evacuación dependiente', variables: [
          ['jardines', 'Jardines infantiles', 'ciudad'],
          ['educativos', 'Centros educativos', 'ciudad'],
          ['salud', 'Centros de salud', 'ciudad'],
          ['geriatricos', 'Hogares geriátricos', 'ciudad'] ] },
        { id: 'intermitente', nombre: 'Equipamientos de ocupación intermitente', variables: [
          ['culto', 'Centros de culto', 'ciudad'],
          ['salones', 'Salones comunales', 'borde'],
          ['culturales', 'Centros culturales', 'ciudad'],
          ['funcion_pub', 'Función pública', 'ciudad'] ] },
        { id: 'bienes', nombre: 'Bienes e infraestructura vital', variables: [
          ['tanques', 'Tanques de agua', 'borde'],
          ['energia', 'Energía', 'ciudad'],
          ['dens_const', 'Densidad de construcciones', 'ciudad'],
          ['dist_veg', 'Distancia entre construcción y vegetación', 'borde'] ] }
      ]
    },
    {
      id: 'V', nombre: 'Vulnerabilidad de borde', color: '#2F6B4F',
      categorias: [
        { id: 'fisica', nombre: 'Fragilidad física del borde', variables: [
          ['materialidad', 'Materialidad de construcciones', 'borde'],
          ['vetustez', 'Vetustez de la construcción', 'sur'],
          ['dens_const', 'Densidad de construcciones', 'ciudad'] ] },
        { id: 'socio', nombre: 'Fragilidad socioeconómica del borde', variables: [
          ['informales', 'Asentamientos y ocupaciones informales', 'borde'],
          ['estrato', 'Estratificación', 'sur'],
          ['legalizacion', 'Barrios en proceso de legalización', 'borde'],
          ['ipm', 'Índice de pobreza multidimensional (IPM)', 'sur'],
          ['sensible', 'Población sensible', 'ciudad'],
          ['tmi', 'Tratamiento de Mejoramiento Integral', 'sur'],
          ['franja', 'Franja de Adecuación', 'borde'] ] },
        { id: 'respuesta', nombre: 'Capacidad de respuesta', variables: [
          ['tiempo', 'Tiempo de respuesta', 'bosque'],
          ['hidrantes', 'Hidrantes', 'bosque'],
          ['hidrologia', 'Hidrología (fuentes de abastecimiento)', 'parches'] ] },
        { id: 'acceso', nombre: 'Accesibilidad para la emergencia', variables: [
          ['ancho_via', 'Ancho de vía', 'borde'],
          ['calzada', 'Estado de la calzada', 'sur'],
          ['callejones', 'Callejones cerrados', 'borde'],
          ['andenes', 'Andenes', 'borde'],
          ['pendiente', 'Pendiente', 'pendiente'] ] }
      ]
    }
  ];

  let grid = null;
  const capas = {};

  function b64(s) {
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0) / 4294967295;
  }

  function crearCapas() {
    const { nx, ny } = grid;
    const ids = new Set();
    ESTRUCTURA.forEach(c => c.categorias.forEach(k => k.variables.forEach(v => ids.add(v[0] + '|' + v[2]))));
    ids.forEach(key => {
      const [id, patron] = key.split('|');
      const s = hash(id);
      const a1 = 3 + s * 9, a2 = 4 + (1 - s) * 11, f = s * 6.28;
      const arr = new Float32Array(nx * ny);
      for (let j = 0; j < ny; j++) {
        const lat = j / ny;
        for (let i = 0; i < nx; i++) {
          const k = j * nx + i;
          if (!grid.mask[k]) continue;
          const t = grid.t[k] / 255;
          const ruido = 0.5 + 0.5 * Math.sin(a1 * i / nx * 6.28 + f) * Math.cos(a2 * lat * 6.28 + f * 0.7);
          let base;
          switch (patron) {
            case 'bosque': base = t; break;
            case 'bosque_inv': base = 0.15 + 0.85 * t * (0.6 + 0.4 * lat); break;
            case 'ciudad': base = Math.max(0, 1 - t * 2.2); break;
            case 'borde': base = Math.max(0, 1 - Math.abs(t - 0.22) * 4); break;
            case 'pendiente': base = Math.max(0, 1 - Math.abs(t - 0.5) * 2.4); break;
            case 'norte': base = 1 - lat; break;
            case 'sur': base = lat; break;
            default: base = ruido;
          }
          const v = 0.72 * base + 0.28 * ruido;
          arr[k] = 1 + Math.round(Math.min(1, Math.max(0, v)) * 4);
        }
      }
      capas[id] = arr;
    });
    // Exposición en 0 dentro del bosque, donde no hay nada expuesto.
    ESTRUCTURA[1].categorias.forEach(c => c.variables.forEach(v => {
      const arr = capas[v[0]];
      for (let k = 0; k < arr.length; k++) if (grid.mask[k] && grid.t[k] / 255 > 0.72) arr[k] = 0;
    }));
  }

  function pesosIguales() {
    const p = { variables: {}, categorias: {} };
    ESTRUCTURA.forEach(c => c.categorias.forEach(k => {
      p.categorias[k.id] = 5;
      p.variables[k.id] = {};
      k.variables.forEach(v => { p.variables[k.id][v[0]] = 5; });
    }));
    return p;
  }

  function normalizar(obj) {
    const total = Object.values(obj).reduce((a, b) => a + b, 0);
    const out = {};
    Object.keys(obj).forEach(k => { out[k] = total > 0 ? obj[k] / total : 1 / Object.keys(obj).length; });
    return out;
  }

  function mapaCategoria(cat, pesos) {
    const n = grid.nx * grid.ny;
    const out = new Float32Array(n);
    const w = normalizar(pesos.variables[cat.id]);
    cat.variables.forEach(v => {
      const capa = capas[v[0]], wi = w[v[0]];
      if (!wi) return;
      for (let k = 0; k < n; k++) out[k] += wi * capa[k];
    });
    return out;
  }

  function mapaComponente(comp, pesos) {
    const n = grid.nx * grid.ny;
    const out = new Float32Array(n);
    const sub = {};
    comp.categorias.forEach(c => { sub[c.id] = pesos.categorias[c.id]; });
    const w = normalizar(sub);
    comp.categorias.forEach(c => {
      if (!w[c.id]) return;
      const m = mapaCategoria(c, pesos);
      for (let k = 0; k < n; k++) out[k] += w[c.id] * m[k];
    });
    return out;
  }

  function calcular(pesos) {
    const [A, E, V] = ESTRUCTURA.map(c => mapaComponente(c, pesos));
    const n = A.length, R = new Float32Array(n);
    for (let k = 0; k < n; k++) R[k] = Math.cbrt(A[k] * E[k] * V[k]);
    return { A, E, V, R };
  }

  async function cargar(base) {
    if (grid) return grid;
    const r = await fetch((base || '') + 'data/grid.json');
    const g = await r.json();
    grid = { ...g, mask: b64(g.mask), t: b64(g.t) };
    crearCapas();
    return grid;
  }

  window.Modelo = {
    ESTRUCTURA, cargar, calcular, mapaCategoria, mapaComponente, pesosIguales,
    capa: id => capas[id], get grid() { return grid; }
  };
})();

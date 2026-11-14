/* Mapas con MapLibre: vista plana (2D) o cerros en relieve (3D) con la capa de resultados encima. */
(function () {
  const RAMPA = ['#FFF1BF', '#F9C74F', '#F3722C', '#C8302C', '#6A1B2A'];
  const CLASES = ['Muy baja', 'Baja', 'Media', 'Alta', 'Muy alta'];
  const CERO = [205, 212, 203, 140];
  const RGB = RAMPA.map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)));
  const QUIETO = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/';
  const OPACIDAD = 0.8;

  // Cortes de intervalos iguales entre 1 y 5, como en la tesis.
  function clase(v) {
    if (!(v > 0)) return -1;
    return Math.min(4, Math.max(0, Math.floor((v - 1) / 0.8)));
  }

  // Vistas de cámara para el modo 3D (se mira desde la ciudad hacia los cerros).
  const VISTAS = {
    todo: { center: [-74.05, 4.64], zoom: 10.7, pitch: 60, bearing: 78 },
    usaquen: { center: [-74.022, 4.735], zoom: 12.4, pitch: 64, bearing: 72 },
    chapinero: { center: [-74.048, 4.645], zoom: 12.5, pitch: 64, bearing: 84 },
    sancristobal: { center: [-74.078, 4.555], zoom: 12.4, pitch: 64, bearing: 70 },
    usme: { center: [-74.098, 4.49], zoom: 12.5, pitch: 62, bearing: 60 }
  };

  let areaGeo = null;
  async function area(base) {
    if (!areaGeo) areaGeo = await (await fetch((base || '') + 'data/area.geojson')).json();
    return areaGeo;
  }

  function webglDisponible() {
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
  }

  async function crear(el, opciones) {
    const op = Object.assign({ base: '', modo: '2d', orbita: false, cambiarModo: false, etiqueta: 'Valor' }, opciones);
    const grid = await Modelo.cargar(op.base);
    const sur = grid.north - grid.ny * grid.res, este = grid.west + grid.nx * grid.res;
    const esquinas = [[grid.west, grid.north], [este, grid.north], [este, sur], [grid.west, sur]];

    if (!webglDisponible()) {
      el.innerHTML = '<p class="sin-mapa">Tu navegador no puede mostrar este mapa. Prueba con una versión reciente de Chrome, Edge, Firefox o Safari.</p>';
      return { pintar: () => ({ cuenta: [0, 0, 0, 0, 0, 0], total: 1 }), volar() {}, modo() {}, etiqueta() {}, detenerGiro() {} };
    }

    const canvas = document.createElement('canvas');
    canvas.width = grid.nx; canvas.height = grid.ny;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(grid.nx, grid.ny);
    const geo = await area(op.base);

    const mapa = new maplibregl.Map({
      container: el,
      style: {
        version: 8,
        sources: {
          gris: { type: 'raster', tiles: [ESRI + 'Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 16, attribution: 'Mapa base &copy; Esri, HERE, Garmin, OpenStreetMap' },
          grisRef: { type: 'raster', tiles: [ESRI + 'Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 16 },
          satelite: { type: 'raster', tiles: [ESRI + 'World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 18, attribution: 'Imagen &copy; Esri, Maxar, Earthstar Geographics' },
          relieve: { type: 'raster-dem', tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'], encoding: 'terrarium', tileSize: 256, maxzoom: 14, attribution: 'Relieve: Mapzen, AWS Terrain Tiles' },
          resultado: { type: 'image', url: canvas.toDataURL(), coordinates: esquinas },
          area: { type: 'geojson', data: geo }
        },
        layers: [
          { id: 'fondo', type: 'background', paint: { 'background-color': '#EEF3EE' } },
          { id: 'gris', type: 'raster', source: 'gris' },
          { id: 'satelite', type: 'raster', source: 'satelite', layout: { visibility: 'none' }, paint: { 'raster-saturation': -0.25 } },
          { id: 'sombras', type: 'hillshade', source: 'relieve', layout: { visibility: 'none' }, paint: { 'hillshade-exaggeration': 0.35, 'hillshade-shadow-color': '#1C2A22' } },
          { id: 'resultado', type: 'raster', source: 'resultado', paint: { 'raster-opacity': OPACIDAD, 'raster-resampling': 'nearest', 'raster-fade-duration': 0, 'raster-opacity-transition': { duration: 260 } } },
          { id: 'grisRef', type: 'raster', source: 'grisRef' },
          { id: 'borde', type: 'line', source: 'area', paint: { 'line-color': '#1C2A22', 'line-width': 1.6, 'line-opacity': 0.85 } }
        ]
      },
      bounds: [[grid.west, sur], [este, grid.north]],
      fitBoundsOptions: { padding: 16 },
      scrollZoom: false,
      attributionControl: { compact: true },
      maxPitch: 75,
      locale: { 'NavigationControl.ZoomIn': 'Acercar', 'NavigationControl.ZoomOut': 'Alejar', 'NavigationControl.ResetBearing': 'Volver al norte' }
    });
    mapa.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-left');
    // Basta con que el estilo esté listo; no se espera a que carguen todas las teselas.
    await new Promise(r => { if (mapa.isStyleLoaded()) r(); else mapa.once('style.load', r); });

    let modoActual = '2d';
    function modo(m, animar) {
      modoActual = m;
      const tres = m === '3d';
      mapa.setLayoutProperty('gris', 'visibility', tres ? 'none' : 'visible');
      mapa.setLayoutProperty('grisRef', 'visibility', tres ? 'none' : 'visible');
      mapa.setLayoutProperty('satelite', 'visibility', tres ? 'visible' : 'none');
      mapa.setLayoutProperty('sombras', 'visibility', tres ? 'visible' : 'none');
      mapa.setTerrain(tres ? { source: 'relieve', exaggeration: 1.6 } : null);
      if (tres) {
        if (animar && !QUIETO) mapa.easeTo({ ...VISTAS.todo, duration: 1400 }); else mapa.jumpTo(VISTAS.todo);
      } else {
        mapa.fitBounds([[grid.west, sur], [este, grid.north]], { padding: 16, pitch: 0, bearing: 0, duration: animar && !QUIETO ? 900 : 0 });
      }
    }

    function volar(nombre) {
      const v = VISTAS[nombre] || VISTAS.todo;
      if (QUIETO) mapa.jumpTo(v); else mapa.flyTo({ ...v, duration: 2200 });
    }

    // Giro lento de la cámara hasta que la persona toque el mapa.
    let girando = false;
    function girar() {
      if (!girando) return;
      mapa.setBearing(mapa.getBearing() + 0.035);
      requestAnimationFrame(girar);
    }
    function detenerGiro() { girando = false; }
    if (op.orbita && !QUIETO) {
      ['mousedown', 'touchstart', 'wheel', 'keydown'].forEach(e => el.addEventListener(e, detenerGiro, { passive: true }));
    }

    // Valor de la celda bajo el cursor.
    let valoresActuales = null, etiqueta = op.etiqueta;
    const globo = document.createElement('div');
    globo.className = 'globo'; globo.hidden = true;
    el.appendChild(globo);
    mapa.on('mousemove', e => {
      if (!valoresActuales) return;
      const i = Math.floor((e.lngLat.lng - grid.west) / grid.res), j = Math.floor((grid.north - e.lngLat.lat) / grid.res);
      if (i < 0 || j < 0 || i >= grid.nx || j >= grid.ny || !grid.mask[j * grid.nx + i]) { globo.hidden = true; return; }
      const v = valoresActuales[j * grid.nx + i], c = clase(v);
      globo.innerHTML = `<span class="globo-muestra" style="background:${c < 0 ? '#CDD4CB' : RAMPA[c]}"></span><strong>${etiqueta}:</strong> ${c < 0 ? 'nada expuesto' : CLASES[c].toLowerCase()} <span class="globo-num">${v.toFixed(1).replace('.', ',')}</span>`;
      globo.style.transform = `translate(${e.point.x + 14}px, ${e.point.y + 14}px)`;
      globo.hidden = false;
    });
    mapa.on('mouseout', () => { globo.hidden = true; });

    function pintar(valores, suave) {
      valoresActuales = valores;
      const d = img.data, cuenta = [0, 0, 0, 0, 0, 0];
      let total = 0;
      for (let k = 0; k < valores.length; k++) {
        const p = k * 4;
        if (!grid.mask[k]) { d[p + 3] = 0; continue; }
        total++;
        const c = clase(valores[k]);
        if (c < 0) { d[p] = CERO[0]; d[p + 1] = CERO[1]; d[p + 2] = CERO[2]; d[p + 3] = CERO[3]; cuenta[5]++; continue; }
        const rgb = RGB[c];
        d[p] = rgb[0]; d[p + 1] = rgb[1]; d[p + 2] = rgb[2]; d[p + 3] = 255;
        cuenta[c]++;
      }
      ctx.putImageData(img, 0, 0);
      const url = canvas.toDataURL();
      const fuente = mapa.getSource('resultado');
      if (suave && !QUIETO) {
        mapa.setPaintProperty('resultado', 'raster-opacity', 0.1);
        setTimeout(() => { fuente.updateImage({ url, coordinates: esquinas }); mapa.setPaintProperty('resultado', 'raster-opacity', OPACIDAD); }, 260);
      } else {
        fuente.updateImage({ url, coordinates: esquinas });
      }
      return { cuenta, total };
    }

    if (op.modo === '3d') modo('3d', false);
    if (op.orbita && !QUIETO) { girando = true; requestAnimationFrame(girar); }

    if (op.cambiarModo) {
      const boton = document.createElement('button');
      boton.type = 'button'; boton.className = 'boton-modo';
      const poner = () => { boton.textContent = modoActual === '3d' ? 'Ver en 2D' : 'Ver en 3D'; boton.setAttribute('aria-pressed', String(modoActual === '3d')); };
      boton.addEventListener('click', () => { modo(modoActual === '3d' ? '2d' : '3d', true); poner(); });
      poner();
      el.appendChild(boton);
    }

    new ResizeObserver(() => mapa.resize()).observe(el);

    return { mapa, pintar, volar, modo, etiqueta: t => { etiqueta = t; }, detenerGiro };
  }

  function leyenda(el, conCero) {
    let html = '<ul class="leyenda-lista">';
    CLASES.forEach((n, i) => { html += `<li><span class="muestra" style="background:${RAMPA[i]}"></span>${n}</li>`; });
    if (conCero) html += '<li><span class="muestra muestra-cero"></span>Nada expuesto</li>';
    el.innerHTML = html + '</ul>';
  }

  window.Mapa = { crear, leyenda, RAMPA, CLASES };
})();

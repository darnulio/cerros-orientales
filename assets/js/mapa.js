/* Mapa base, contorno del área de estudio y capa de resultados pintada en un canvas. */
(function () {
  const RAMPA = ['#FFF1BF', '#F9C74F', '#F3722C', '#C8302C', '#6A1B2A'];
  const CLASES = ['Muy baja', 'Baja', 'Media', 'Alta', 'Muy alta'];
  const CERO = [205, 212, 203, 150];

  function hexRgb(h) { return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); }
  const RGB = RAMPA.map(hexRgb);

  // Cortes de intervalos iguales entre 1 y 5, como en la tesis.
  function clase(v) {
    if (!(v > 0)) return -1;
    return Math.min(4, Math.max(0, Math.floor((v - 1) / 0.8)));
  }

  let areaGeo = null;
  async function area(base) {
    if (!areaGeo) areaGeo = await (await fetch((base || '') + 'data/area.geojson')).json();
    return areaGeo;
  }

  async function crear(el, opciones) {
    const op = Object.assign({ base: '', zoom: true }, opciones);
    const grid = await Modelo.cargar(op.base);
    const sur = grid.north - grid.ny * grid.res, este = grid.west + grid.nx * grid.res;
    const limites = [[sur, grid.west], [grid.north, este]];
    const mapa = L.map(el, {
      scrollWheelZoom: false, zoomControl: op.zoom, attributionControl: true,
      zoomSnap: 0.25
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18, subdomains: 'abcd',
      attribution: '&copy; OpenStreetMap &copy; CARTO'
    }).addTo(mapa);
    mapa.fitBounds(limites, { padding: [8, 8] });

    const canvas = document.createElement('canvas');
    canvas.width = grid.nx; canvas.height = grid.ny;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(grid.nx, grid.ny);
    const capa = L.imageOverlay(canvas.toDataURL(), limites, { opacity: 0.86, className: 'capa-raster', interactive: false }).addTo(mapa);

    const geo = await area(op.base);
    L.geoJSON(geo, { style: { color: '#1C2A22', weight: 1.5, fill: false, opacity: 0.8 }, interactive: false }).addTo(mapa);

    function pintar(valores) {
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
      capa.setUrl(canvas.toDataURL());
      return { cuenta, total };
    }

    return { mapa, pintar };
  }

  function leyenda(el, conCero) {
    let html = '<ul class="leyenda-lista">';
    CLASES.forEach((n, i) => { html += `<li><span class="muestra" style="background:${RAMPA[i]}"></span>${n}</li>`; });
    if (conCero) html += '<li><span class="muestra muestra-cero"></span>Nada expuesto</li>';
    el.innerHTML = html + '</ul>';
  }

  window.Mapa = { crear, leyenda, RAMPA, CLASES };
})();

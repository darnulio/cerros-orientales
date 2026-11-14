(async function () {
  const vista = await Mapa.crear(document.getElementById('mapa'), { cambiarModo: true, etiqueta: 'Riesgo' });
  const titulos = { R: 'Riesgo', A: 'Amenaza', E: 'Exposición', V: 'Vulnerabilidad' };
  const panel = document.getElementById('panel');
  let pesos = Modelo.pesosIguales();
  let ver = 'R';
  const nombres = { R: 'riesgo alto o muy alto', A: 'amenaza alta o muy alta', E: 'exposición alta o muy alta', V: 'vulnerabilidad de borde alta o muy alta' };

  function control(id, texto, valor, alCambiar) {
    const div = document.createElement('div');
    div.className = 'control';
    div.innerHTML = `<div class="control-fila"><label for="${id}"></label><output for="${id}"></output></div><input id="${id}" type="range" min="0" max="10" step="1">`;
    div.querySelector('label').textContent = texto;
    const input = div.querySelector('input'), out = div.querySelector('output');
    input.value = valor; out.textContent = valor + ' de 10';
    input.addEventListener('input', () => { out.textContent = input.value + ' de 10'; alCambiar(Number(input.value)); });
    return div;
  }

  function armar() {
    panel.innerHTML = '';
    Modelo.ESTRUCTURA.forEach((comp, ci) => {
      const det = document.createElement('details');
      det.className = 'componente';
      if (ci === 0) det.open = true;
      const sum = document.createElement('summary');
      sum.textContent = comp.nombre;
      det.appendChild(sum);
      const cuerpo = document.createElement('div');
      cuerpo.className = 'componente-cuerpo';
      const st = document.createElement('p'); st.className = 'subtitulo'; st.textContent = 'Peso de cada categoría';
      cuerpo.appendChild(st);
      comp.categorias.forEach(c => cuerpo.appendChild(control('c-' + c.id, c.nombre, pesos.categorias[c.id], v => { pesos.categorias[c.id] = v; pedir(); })));
      const st2 = document.createElement('p'); st2.className = 'subtitulo'; st2.textContent = 'Capas dentro de cada categoría';
      cuerpo.appendChild(st2);
      comp.categorias.forEach(c => {
        const dc = document.createElement('details');
        dc.className = 'categoria';
        const s = document.createElement('summary');
        s.textContent = c.nombre + ' (' + c.variables.length + (c.variables.length === 1 ? ' capa)' : ' capas)');
        dc.appendChild(s);
        const caja = document.createElement('div'); caja.className = 'controles-variables';
        if (c.variables.length === 1) { const p = document.createElement('p'); p.className = 'nota'; p.textContent = 'Una sola capa: su mapa es la capa tal cual.'; caja.appendChild(p); }
        else c.variables.forEach(v => caja.appendChild(control('v-' + c.id + '-' + v[0], v[1], pesos.variables[c.id][v[0]], x => { pesos.variables[c.id][v[0]] = x; pedir(); })));
        dc.appendChild(caja);
        cuerpo.appendChild(dc);
      });
      det.appendChild(cuerpo);
      panel.appendChild(det);
    });
  }

  let pendiente = false;
  function pintar(suave) {
    pendiente = false;
    const r = Modelo.calcular(pesos);
    vista.etiqueta(titulos[ver]);
    const { cuenta, total } = vista.pintar(r[ver], suave === true);
    Mapa.leyenda(document.getElementById('leyenda'), ver === 'E' || ver === 'R');
    const alto = Math.round((cuenta[3] + cuenta[4]) / total * 100);
    document.getElementById('resumen').innerHTML = `Con tus pesos, <strong>${alto} %</strong> del área queda con ${nombres[ver]}.`;
  }
  function pedir() { if (!pendiente) { pendiente = true; requestAnimationFrame(pintar); } }

  document.querySelectorAll('[data-ver]').forEach(b => b.addEventListener('click', () => {
    ver = b.dataset.ver;
    document.querySelectorAll('[data-ver]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    pintar(true);
  }));
  document.getElementById('reiniciar').addEventListener('click', () => { pesos = Modelo.pesosIguales(); armar(); pintar(); });
  armar();
  pintar();
})();

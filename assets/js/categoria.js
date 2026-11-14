(async function () {
  const vista = await Mapa.crear(document.getElementById('mapa'));
  const selector = document.getElementById('selector');
  const caja = document.getElementById('controles');
  const pertenece = document.getElementById('pertenece');
  const pesos = Modelo.pesosIguales();
  const categorias = {};
  const compartidas = contarCompartidas();

  Modelo.ESTRUCTURA.forEach(comp => {
    const grupo = document.createElement('optgroup');
    grupo.label = comp.nombre;
    comp.categorias.forEach(c => {
      categorias[c.id] = { ...c, componente: comp };
      const o = document.createElement('option');
      o.value = c.id; o.textContent = c.nombre;
      grupo.appendChild(o);
    });
    selector.appendChild(grupo);
  });

  function contarCompartidas() {
    const n = {};
    Modelo.ESTRUCTURA.forEach(c => c.categorias.forEach(k => k.variables.forEach(v => { n[v[0]] = (n[v[0]] || 0) + 1; })));
    return n;
  }

  let pendiente = false;
  function pintar() {
    pendiente = false;
    const c = categorias[selector.value];
    vista.pintar(Modelo.mapaCategoria(c, pesos));
    Mapa.leyenda(document.getElementById('leyenda'), c.componente.id === 'E');
  }
  function pedir() { if (!pendiente) { pendiente = true; requestAnimationFrame(pintar); } }

  function armar() {
    const c = categorias[selector.value];
    pertenece.textContent = 'Hace parte de ' + c.componente.nombre.toLowerCase() + '.';
    caja.innerHTML = '';
    if (c.variables.length === 1) {
      const p = document.createElement('p');
      p.textContent = 'Esta categoría tiene una sola capa, ' + c.variables[0][1].toLowerCase() + ', así que su mapa es esa capa tal cual.';
      caja.appendChild(p);
    }
    c.variables.forEach(v => {
      if (c.variables.length === 1) return;
      const id = 'v-' + v[0];
      const div = document.createElement('div');
      div.className = 'control';
      div.innerHTML = `<div class="control-fila"><label for="${id}"></label><output for="${id}"></output></div><input id="${id}" type="range" min="0" max="10" step="1">`;
      div.querySelector('label').textContent = v[1];
      const input = div.querySelector('input'), out = div.querySelector('output');
      input.value = pesos.variables[c.id][v[0]];
      out.textContent = input.value + ' de 10';
      if (compartidas[v[0]] > 1) { const s = document.createElement('span'); s.className = 'compartida'; s.textContent = 'También está en otro componente'; div.appendChild(s); }
      input.addEventListener('input', () => { pesos.variables[c.id][v[0]] = Number(input.value); out.textContent = input.value + ' de 10'; pedir(); });
      caja.appendChild(div);
    });
    history.replaceState(null, '', '#' + c.id);
    pintar();
  }

  const inicial = location.hash.slice(1);
  if (categorias[inicial]) selector.value = inicial;
  selector.addEventListener('change', armar);
  document.getElementById('reiniciar').addEventListener('click', () => {
    const nuevos = Modelo.pesosIguales();
    Object.assign(pesos.variables, nuevos.variables);
    armar();
  });
  armar();
})();

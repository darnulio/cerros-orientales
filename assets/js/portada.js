(async function () {
  const vista = await Mapa.crear(document.getElementById('mapa-portada'), { modo: '3d', orbita: true, etiqueta: 'Riesgo' });
  Mapa.leyenda(document.getElementById('leyenda-portada'), true);
  const pesos = Modelo.pesosIguales();
  const entradas = document.querySelectorAll('input[data-cat]');
  let pendiente = false;
  function actualizar() {
    pendiente = false;
    entradas.forEach(i => {
      pesos.categorias[i.dataset.cat] = Number(i.value);
      document.getElementById('o-' + i.dataset.cat).textContent = i.value + ' de 10';
    });
    vista.pintar(Modelo.calcular(pesos).R);
  }
  entradas.forEach(i => i.addEventListener('input', () => { vista.detenerGiro(); if (!pendiente) { pendiente = true; requestAnimationFrame(actualizar); } }));
  actualizar();
})();

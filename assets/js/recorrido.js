(async function () {
  const el = document.getElementById('mapa-recorrido');
  if (!el) return;
  const vista = await Mapa.crear(el, { modo: '3d', etiqueta: 'Riesgo' });
  vista.mapa.dragPan.disable(); vista.mapa.dragRotate.disable(); vista.mapa.touchZoomRotate.disable(); vista.mapa.doubleClickZoom.disable(); vista.mapa.keyboard.disable();
  const r = Modelo.calcular(Modelo.pesosIguales());
  const nombres = { A: 'Amenaza', E: 'Exposición', V: 'Vulnerabilidad', R: 'Riesgo' };
  const pasos = [...document.querySelectorAll('.paso[data-paso]')];
  let actual = null;
  function activar(paso) {
    const id = paso.dataset.paso;
    if (id === actual) return;
    actual = id;
    pasos.forEach(p => p.classList.toggle('activo', p === paso));
    vista.etiqueta(nombres[id]);
    vista.pintar(r[id], true);
    vista.volar(paso.dataset.vista);
    Mapa.leyenda(document.getElementById('leyenda-recorrido'), id === 'E' || id === 'R');
  }
  activar(pasos[0]);
  if (window.ScrollTrigger) {
    pasos.forEach(p => ScrollTrigger.create({ trigger: p, start: 'top 60%', end: 'bottom 40%', onEnter: () => activar(p), onEnterBack: () => activar(p) }));
  } else {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) activar(e.target); }), { rootMargin: '-45% 0px -45% 0px' });
    pasos.forEach(p => io.observe(p));
  }
})();

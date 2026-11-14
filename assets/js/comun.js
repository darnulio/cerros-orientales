(function () {
  const boton = document.querySelector('.boton-menu');
  const menu = document.getElementById('menu');
  if (boton && menu) {
    boton.addEventListener('click', () => {
      const abierto = menu.classList.toggle('abierto');
      boton.setAttribute('aria-expanded', String(abierto));
      boton.textContent = abierto ? 'Cerrar' : 'Menú';
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && menu.classList.contains('abierto')) { menu.classList.remove('abierto'); boton.setAttribute('aria-expanded', 'false'); boton.textContent = 'Menú'; boton.focus(); }
    });
  }

  // Desplazamiento suave. Se apaga para quien pidió reducir el movimiento.
  const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (window.gsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  if (!quieto && window.Lenis) {
    const lenis = new Lenis({ autoRaf: false, anchors: true, lerp: 0.1 });
    window.lenis = lenis;
    if (window.gsap) {
      if (window.ScrollTrigger) lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const bucle = t => { lenis.raf(t); requestAnimationFrame(bucle); };
      requestAnimationFrame(bucle);
    }
  }
})();

// Relleno de los deslizadores hasta el valor elegido.
(function () {
  function pintar(i) { const p = (i.value - i.min) / (i.max - i.min) * 100; i.style.setProperty('--lleno', p + '%'); }
  document.addEventListener('input', e => { if (e.target.matches('input[type=range]')) pintar(e.target); });
  const todos = () => document.querySelectorAll('input[type=range]').forEach(pintar);
  todos();
  new MutationObserver(todos).observe(document.body, { childList: true, subtree: true });
})();

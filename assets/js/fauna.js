/* El colibrí de la portada sigue el cursor con calma; las crestas del paisaje se mueven un poco con el scroll. */
(function () {
  const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ave = document.querySelector('.colibri-volador');
  const portada = document.querySelector('.portada');
  if (ave && portada && !quieto) {
    const conPuntero = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    let x = 0, y = 0, tx = 0, ty = 0, mira = 1, t0 = performance.now();
    const caja = () => portada.getBoundingClientRect();
    function reposo() { const b = caja(); tx = b.width * 0.5; ty = b.height * 0.07; }
    reposo();
    x = tx; y = ty;
    if (conPuntero) {
      portada.addEventListener('pointermove', e => {
        if (e.target.closest('.tablero')) { reposo(); return; }
        const b = caja();
        tx = e.clientX - b.left + 40; ty = e.clientY - b.top - 60;
      });
      portada.addEventListener('pointerleave', reposo);
    }
    window.addEventListener('resize', reposo);
    function paso(t) {
      const dx = tx - x;
      x += dx * 0.045; y += (ty - y) * 0.045;
      if (Math.abs(dx) > 2) mira = dx > 0 ? 1 : -1;
      const flota = Math.sin((t - t0) / 420) * 6;
      ave.style.transform = `translate(${x.toFixed(1)}px, ${(y + flota).toFixed(1)}px) scaleX(${mira})`;
      requestAnimationFrame(paso);
    }
    requestAnimationFrame(paso);
  }
  if (!quieto && window.gsap && window.ScrollTrigger) {
    document.querySelectorAll('.paisaje .cresta').forEach((c, i) => {
      gsap.fromTo(c, { y: 26 * (3 - i) }, { y: 0, ease: 'none', scrollTrigger: { trigger: '.paisaje', start: 'top bottom', end: 'bottom bottom', scrub: true } });
    });
  }
})();

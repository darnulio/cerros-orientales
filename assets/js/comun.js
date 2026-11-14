(function () {
  const boton = document.querySelector('.boton-menu');
  const menu = document.getElementById('menu');
  if (!boton || !menu) return;
  boton.addEventListener('click', () => {
    const abierto = menu.classList.toggle('abierto');
    boton.setAttribute('aria-expanded', String(abierto));
    boton.textContent = abierto ? 'Cerrar' : 'Menú';
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu.classList.contains('abierto')) { menu.classList.remove('abierto'); boton.setAttribute('aria-expanded', 'false'); boton.textContent = 'Menú'; boton.focus(); }
  });
})();

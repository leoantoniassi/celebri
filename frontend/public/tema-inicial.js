// Anti-FOUC: repinta com o tema escuro e a paleta do último acesso antes do primeiro
// paint. Sem isto a tela pisca em branco antes de carregar o React.
(function () {
  try {
    var modoEscuro = localStorage.getItem('celebri:modo-escuro');
    if (modoEscuro === 'dark' || (!modoEscuro && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    var cache = JSON.parse(localStorage.getItem('celebri:tenant') || 'null');
    if (cache && cache.paleta) {
      var raiz = document.documentElement;
      Object.keys(cache.paleta).forEach(function (token) {
        raiz.style.setProperty('--color-' + token, cache.paleta[token]);
      });
    }
  } catch (e) {
    // Storage indisponível: segue com a paleta compilada no CSS.
  }
})();

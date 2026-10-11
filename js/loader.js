/**
 * Gold Crochet — Luxury Loading Spinner & Transition System
 * Proporciona uma transição suave e estética de Alta-Costura entre páginas HTML tradicionais.
 */

(function () {
  const LOADER_HTML = `
    <div id="luxuryLoader" class="luxury-loader-overlay" aria-live="polite" aria-busy="true">
      <div class="luxury-loader-content">
        <div class="luxury-loader-buzio">
          <img src="${(window.location.pathname.includes('/produtos/') ? '../' : './')}assets/buzio-ouro.png" alt="Búzio Dourado Oficial" class="luxury-loader-buzio-img" width="72" height="100">
        </div>
        <div class="luxury-loader-ring"></div>
        <div class="luxury-loader-brand">
          <span class="luxury-loader-title">GOLD CROCHET</span>
          <span class="luxury-loader-sub" id="luxuryLoaderMessage">ALTA-COSTURA BRASILEIRA</span>
        </div>
      </div>
      <div class="luxury-loader-bar"></div>
    </div>
  `;

  // Injeta o HTML assim que possível
  function injectLoader() {
    if (document.getElementById('luxuryLoader')) return;
    const div = document.createElement('div');
    div.innerHTML = LOADER_HTML;
    document.body.prepend(div.firstElementChild);
  }

  if (document.body) {
    injectLoader();
  } else {
    document.addEventListener('DOMContentLoaded', injectLoader);
  }

  // Esconder o loader com transição suave
  function hideLoader() {
    const el = document.getElementById('luxuryLoader');
    if (!el) return;
    el.classList.add('fade-out');
    setTimeout(() => {
      el.classList.remove('active', 'fade-out');
      el.style.display = 'none';
      el.setAttribute('aria-busy', 'false');
    }, 400);
  }

  // Exibir o loader
  function showLoader(message = 'CARREGANDO...') {
    injectLoader();
    const el = document.getElementById('luxuryLoader');
    if (!el) return;
    const msgEl = document.getElementById('luxuryLoaderMessage');
    if (msgEl && message) msgEl.textContent = message;
    el.style.display = 'flex';
    el.classList.remove('fade-out');
    void el.offsetWidth; // Force reflow
    el.classList.add('active');
    el.setAttribute('aria-busy', 'true');
  }

  // Global methods
  window.GoldLoader = {
    show: showLoader,
    hide: hideLoader
  };

  // Desativa loader após carregamento completo
  window.addEventListener('load', () => {
    setTimeout(hideLoader, 180);
  });

  // Fallback de segurança se demorar mais que 2.5s
  setTimeout(hideLoader, 2500);

  // Intercepta cliques em links de navegação tradicional para transição cinematográfica
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href) return;
    
    // Ignora links externos, âncoras locais, javascript e nova aba
    if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('https://wa.me')) return;
    if (link.target === '_blank' || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (href.startsWith('http://') || href.startsWith('https://')) {
      if (!href.includes(window.location.hostname)) return;
    }

    // Apenas navegações de páginas locais HTML
    if (href.endsWith('.html') || href.startsWith('./') || href.startsWith('../') || href === '/' || href.includes('/produtos/')) {
      e.preventDefault();
      showLoader('ENTRANDO...');
      setTimeout(() => {
        window.location.href = href;
      }, 150);
    }
  });

  // Trata restauração via histórico (ex.: botão voltar ou avançar do navegador)
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      hideLoader();
    }
  });
})();

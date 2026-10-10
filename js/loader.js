/**
 * Gold Crochet — Luxury Loading Spinner & Transition System
 * Proporciona uma transição suave e estética de Alta-Costura entre páginas HTML tradicionais.
 */

(function () {
  const LOADER_HTML = `
    <div id="luxuryLoader" class="luxury-loader-overlay" aria-live="polite" aria-busy="true">
      <div class="luxury-loader-content">
        <div class="luxury-loader-buzio">
          <svg viewBox="0 0 512 512" width="68" height="68" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="ldrGoldShine" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#fff8db"/>
                <stop offset="25%" stop-color="#f8dc7e"/>
                <stop offset="50%" stop-color="#d9a832"/>
                <stop offset="75%" stop-color="#b88318"/>
                <stop offset="100%" stop-color="#805608"/>
              </linearGradient>
              <linearGradient id="ldrGoldBase" x1="20%" y1="0%" x2="80%" y2="100%">
                <stop offset="0%" stop-color="#f6e08c"/>
                <stop offset="40%" stop-color="#d4a32c"/>
                <stop offset="80%" stop-color="#a77717"/>
                <stop offset="100%" stop-color="#694605"/>
              </linearGradient>
              <radialGradient id="ldrHighlightGlow" cx="45%" cy="35%" r="50%">
                <stop offset="0%" stop-color="#ffffff" stop-opacity="0.8"/>
                <stop offset="50%" stop-color="#fae28f" stop-opacity="0.4"/>
                <stop offset="100%" stop-color="#c59424" stop-opacity="0"/>
              </radialGradient>
              <filter id="ldrGlow">
                <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#c59424" flood-opacity="0.45"/>
              </filter>
            </defs>
            <g filter="url(#ldrGlow)">
              <!-- Lado Esquerdo -->
              <path d="M 244 88 C 230 86, 218 96, 204 116 C 176 156, 150 216, 150 274 C 150 336, 178 392, 210 416 C 226 428, 238 428, 246 422 C 249 420, 249 414, 247 406 C 241 386, 239 366, 240 334 C 241 300, 243 250, 242 208 C 241 164, 242 128, 249 98 C 250 90, 247 88, 244 88 Z" fill="url(#ldrGoldBase)" stroke="#744d06" stroke-width="2"/>
              <path d="M 244 88 C 230 86, 218 96, 204 116 C 176 156, 150 216, 150 274 C 150 336, 178 392, 210 416 C 226 428, 238 428, 246 422 C 249 420, 249 414, 247 406 C 241 386, 239 366, 240 334 C 241 300, 243 250, 242 208 C 241 164, 242 128, 249 98 C 250 90, 247 88, 244 88 Z" fill="url(#ldrGoldShine)" opacity="0.85"/>
              <path d="M 226 104 C 198 140, 168 200, 166 268 C 164 326, 186 376, 214 404 C 192 374, 178 322, 180 270 C 182 216, 204 158, 232 118 Z" fill="url(#ldrHighlightGlow)"/>
              <!-- Costelas Esquerda -->
              <path d="M 246 122 Q 224 124 206 130 Q 225 133 245 131 Z" fill="#543703"/>
              <path d="M 245 146 Q 215 148 194 156 Q 216 160 244 157 Z" fill="#543703"/>
              <path d="M 244 174 Q 206 177 182 186 Q 208 190 243 186 Z" fill="#543703"/>
              <path d="M 243 204 Q 198 207 172 218 Q 202 222 243 216 Z" fill="#543703"/>
              <path d="M 242 236 Q 194 238 168 250 Q 198 254 242 248 Z" fill="#543703"/>
              <path d="M 242 268 Q 192 270 166 282 Q 196 286 242 280 Z" fill="#543703"/>
              <path d="M 241 300 Q 196 303 172 316 Q 200 318 241 312 Z" fill="#543703"/>
              <path d="M 242 332 Q 202 335 180 348 Q 206 350 242 344 Z" fill="#543703"/>
              <path d="M 244 364 Q 212 368 194 378 Q 216 380 244 374 Z" fill="#543703"/>

              <!-- Lado Direito -->
              <path d="M 264 88 C 272 88, 282 98, 296 118 C 328 162, 358 224, 358 280 C 358 338, 332 394, 302 418 C 288 428, 276 428, 268 422 C 265 420, 265 414, 267 404 C 273 382, 275 358, 273 328 C 271 292, 267 246, 268 206 C 269 164, 272 126, 266 98 C 264 90, 263 88, 264 88 Z" fill="url(#ldrGoldBase)" stroke="#744d06" stroke-width="2"/>
              <path d="M 264 88 C 272 88, 282 98, 296 118 C 328 162, 358 224, 358 280 C 358 338, 332 394, 302 418 C 288 428, 276 428, 268 422 C 265 420, 265 414, 267 404 C 273 382, 275 358, 273 328 C 271 292, 267 246, 268 206 C 269 164, 272 126, 266 98 C 264 90, 263 88, 264 88 Z" fill="url(#ldrGoldShine)" opacity="0.85"/>
              <path d="M 284 108 C 314 148, 342 208, 342 274 C 342 334, 320 382, 296 408 C 316 376, 330 326, 328 274 C 326 218, 302 160, 276 120 Z" fill="url(#ldrHighlightGlow)"/>
              <!-- Costelas Direita -->
              <path d="M 265 124 Q 284 126 300 132 Q 284 135 266 132 Z" fill="#543703"/>
              <path d="M 266 150 Q 292 153 312 162 Q 290 165 267 160 Z" fill="#543703"/>
              <path d="M 267 180 Q 298 184 322 196 Q 296 198 268 192 Z" fill="#543703"/>
              <path d="M 268 214 Q 304 218 330 232 Q 302 235 269 226 Z" fill="#543703"/>
              <path d="M 269 248 Q 308 252 334 268 Q 304 271 270 260 Z" fill="#543703"/>
              <path d="M 270 282 Q 308 286 332 302 Q 304 305 271 294 Z" fill="#543703"/>
              <path d="M 271 316 Q 304 320 326 336 Q 300 338 271 328 Z" fill="#543703"/>
              <path d="M 271 350 Q 298 354 316 368 Q 294 370 270 360 Z" fill="#543703"/>

              <!-- Abertura Central -->
              <path d="M 248 94 C 246 140, 245 200, 246 260 C 247 320, 248 370, 249 414 L 264 414 C 266 370, 267 320, 267 260 C 267 200, 266 140, 264 94 Z" fill="#3b2602" opacity="0.4"/>
            </g>
          </svg>
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

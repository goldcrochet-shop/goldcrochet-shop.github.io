/**
 * Gold Crochet — Shared Luxury UI & Cart Engine
 * Unifica Header, Footer, Gaveta de Carrinho (WhatsApp) e Favoritos
 * em todas as páginas HTML tradicionais independentes.
 */

(function () {
  const CART_KEY = 'gc_cart_items_v2';
  const FAV_KEY = 'gc_fav_items_v2';
  const WHATSAPP_PHONE = '5521999999999'; // Número oficial do ateliê

  // Helper para obter caminho relativo até a raiz do site
  function getRootPath() {
    const path = window.location.pathname;
    if (path.includes('/produtos/')) return '../';
    return './';
  }

  const root = getRootPath();

  // Búzio Dourado Inline SVG para garantir nitidez sem falhas de assets
  const BUZIO_SVG = `
    <svg class="gc-logo-buzio" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="navGoldShine" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fff8db"/>
          <stop offset="25%" stop-color="#f8dc7e"/>
          <stop offset="50%" stop-color="#d9a832"/>
          <stop offset="75%" stop-color="#b88318"/>
          <stop offset="100%" stop-color="#805608"/>
        </linearGradient>
        <linearGradient id="navGoldBase" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stop-color="#f6e08c"/>
          <stop offset="40%" stop-color="#d4a32c"/>
          <stop offset="80%" stop-color="#a77717"/>
          <stop offset="100%" stop-color="#694605"/>
        </linearGradient>
      </defs>
      <g>
        <path d="M 244 88 C 230 86, 218 96, 204 116 C 176 156, 150 216, 150 274 C 150 336, 178 392, 210 416 C 226 428, 238 428, 246 422 C 249 420, 249 414, 247 406 C 241 386, 239 366, 240 334 C 241 300, 243 250, 242 208 C 241 164, 242 128, 249 98 C 250 90, 247 88, 244 88 Z" fill="url(#navGoldBase)" stroke="#744d06" stroke-width="2"/>
        <path d="M 244 88 C 230 86, 218 96, 204 116 C 176 156, 150 216, 150 274 C 150 336, 178 392, 210 416 C 226 428, 238 428, 246 422 C 249 420, 249 414, 247 406 C 241 386, 239 366, 240 334 C 241 300, 243 250, 242 208 C 241 164, 242 128, 249 98 C 250 90, 247 88, 244 88 Z" fill="url(#navGoldShine)" opacity="0.85"/>
        <path d="M 264 88 C 272 88, 282 98, 296 118 C 328 162, 358 224, 358 280 C 358 338, 332 394, 302 418 C 288 428, 276 428, 268 422 C 265 420, 265 414, 267 404 C 273 382, 275 358, 273 328 C 271 292, 267 246, 268 206 C 269 164, 272 126, 266 98 C 264 90, 263 88, 264 88 Z" fill="url(#navGoldBase)" stroke="#744d06" stroke-width="2"/>
        <path d="M 264 88 C 272 88, 282 98, 296 118 C 328 162, 358 224, 358 280 C 358 338, 332 394, 302 418 C 288 428, 276 428, 268 422 C 265 420, 265 414, 267 404 C 273 382, 275 358, 273 328 C 271 292, 267 246, 268 206 C 269 164, 272 126, 266 98 C 264 90, 263 88, 264 88 Z" fill="url(#navGoldShine)" opacity="0.85"/>
        <path d="M 248 94 C 246 140, 245 200, 246 260 C 247 320, 248 370, 249 414 L 264 414 C 266 370, 267 320, 267 260 C 267 200, 266 140, 264 94 Z" fill="#3b2602" opacity="0.45"/>
      </g>
    </svg>
  `;

  // Identifica a página ativa atual
  function getActivePage() {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('colecoes')) return 'colecoes';
    if (path.includes('pecas')) return 'pecas';
    if (path.includes('novidades')) return 'novidades';
    if (path.includes('casa-gold')) return 'casa-gold';
    if (path.includes('admin')) return 'admin';
    return 'inicio';
  }

  const activePage = getActivePage();

  // Injeta Cabeçalho de Alta-Costura
  function renderHeader() {
    const existingHeader = document.querySelector('.gc-header');
    if (existingHeader) return;

    const header = document.createElement('header');
    header.className = 'gc-header';
    header.innerHTML = `
      <div class="gc-header-inner">
        <!-- Links de Navegação (Desktop) -->
        <nav aria-label="Navegação Principal">
          <ul class="gc-nav-links">
            <li><a href="${root}index.html" class="gc-nav-link ${activePage === 'inicio' ? 'active' : ''}">Início</a></li>
            <li><a href="${root}colecoes.html" class="gc-nav-link ${activePage === 'colecoes' ? 'active' : ''}">Coleções</a></li>
            <li><a href="${root}pecas.html" class="gc-nav-link ${activePage === 'pecas' ? 'active' : ''}">Peças</a></li>
            <li><a href="${root}novidades.html" class="gc-nav-link ${activePage === 'novidades' ? 'active' : ''}">Novidades</a></li>
            <li><a href="${root}casa-gold.html" class="gc-nav-link ${activePage === 'casa-gold' ? 'active' : ''}">Casa Gold</a></li>
          </ul>
        </nav>

        <!-- Logo Central / Búzio Dourado -->
        <a href="${root}index.html" class="gc-logo-brand" title="Gold Crochet — Alta-Costura">
          ${BUZIO_SVG}
          <div class="gc-logo-text">
            <span class="gc-logo-title">GOLD CROCHET</span>
            <span class="gc-logo-subtitle">ATELIÊ DE ALTA-COSTURA</span>
          </div>
        </a>

        <!-- Ações do Cabeçalho -->
        <div class="gc-header-actions">
          <a href="${root}admin.html" class="gc-action-btn" title="Painel do Ateliê">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span class="gc-action-label" style="display:none">Ateliê</span>
          </a>

          <button id="gcFavTrigger" class="gc-action-btn" title="Favoritos" aria-label="Favoritos">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <span id="gcFavCount" class="gc-badge-count hidden">0</span>
          </button>

          <button id="gcCartTrigger" class="gc-action-btn" title="Sacola de Compras" aria-label="Sacola de Compras">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            <span id="gcCartCount" class="gc-badge-count hidden">0</span>
          </button>

          <!-- Toggle Menu Mobile -->
          <button id="gcMobileToggle" class="gc-mobile-toggle" aria-label="Abrir Menu">
            <svg viewBox="0 0 24 24" width="26" height="26" stroke="currentColor" stroke-width="2" fill="none">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    `;

    document.body.prepend(header);
  }

  // Injeta Gaveta Mobile e Gaveta do Carrinho
  function renderDrawers() {
    if (document.getElementById('gcMobileDrawer')) return;

    const drawersWrap = document.createElement('div');
    drawersWrap.innerHTML = `
      <!-- Drawer Menu Mobile -->
      <div id="gcMobileDrawer" class="gc-mobile-drawer" aria-hidden="true">
        <div class="gc-mobile-drawer-content">
          <div class="gc-mobile-drawer-header">
            <span class="gc-logo-title" style="font-size:1.1rem">GOLD CROCHET</span>
            <button id="gcMobileClose" class="gc-mobile-drawer-close" aria-label="Fechar">&times;</button>
          </div>
          <ul class="gc-mobile-nav-list">
            <li class="gc-mobile-nav-item"><a href="${root}index.html" class="${activePage === 'inicio' ? 'active' : ''}">Início</a></li>
            <li class="gc-mobile-nav-item"><a href="${root}colecoes.html" class="${activePage === 'colecoes' ? 'active' : ''}">Coleções</a></li>
            <li class="gc-mobile-nav-item"><a href="${root}pecas.html" class="${activePage === 'pecas' ? 'active' : ''}">Peças</a></li>
            <li class="gc-mobile-nav-item"><a href="${root}novidades.html" class="${activePage === 'novidades' ? 'active' : ''}">Novidades</a></li>
            <li class="gc-mobile-nav-item"><a href="${root}casa-gold.html" class="${activePage === 'casa-gold' ? 'active' : ''}">Casa Gold</a></li>
            <li class="gc-mobile-nav-item"><a href="${root}admin.html">Painel do Ateliê</a></li>
          </ul>
        </div>
      </div>

      <!-- Drawer de Carrinho / Sacola de Compras -->
      <div id="gcCartDrawer" class="gc-cart-drawer" aria-hidden="true">
        <div class="gc-cart-drawer-box">
          <div class="gc-cart-header">
            <h3 class="gc-cart-title">Sacola de Compras</h3>
            <button id="gcCartClose" class="gc-cart-close" aria-label="Fechar">&times;</button>
          </div>
          <div id="gcCartBody" class="gc-cart-body">
            <!-- Itens injetados via JS -->
          </div>
          <div class="gc-cart-footer">
            <div class="gc-cart-total-row">
              <span class="gc-cart-total-label">Total Estimado</span>
              <span id="gcCartTotalVal" class="gc-cart-total-value">R$ 0,00</span>
            </div>
            <button id="gcCheckoutBtn" class="gc-btn-checkout">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              Finalizar no WhatsApp
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(drawersWrap);
  }

  // Injeta Rodapé de Alta-Costura
  function renderFooter() {
    const existingFooter = document.querySelector('.gc-footer');
    if (existingFooter) return;

    const footer = document.createElement('footer');
    footer.className = 'gc-footer';
    footer.innerHTML = `
      <div class="gc-footer-inner">
        <div class="gc-footer-col">
          <h4>Gold Crochet</h4>
          <p>Alta-costura artesanal brasileira. Cada ponto tecido à mão com fios nobres e acabamento impecável de ateliê.</p>
          <p style="margin-top:12px;font-size:0.8rem;color:var(--color-gold-deep);font-weight:600">Peças sob medida e pronta-entrega exclusiva.</p>
        </div>
        <div class="gc-footer-col">
          <h4>Navegação</h4>
          <ul class="gc-footer-links">
            <li><a href="${root}index.html">Início</a></li>
            <li><a href="${root}colecoes.html">Coleções</a></li>
            <li><a href="${root}pecas.html">Todas as Peças</a></li>
            <li><a href="${root}novidades.html">Novidades</a></li>
            <li><a href="${root}casa-gold.html">Casa Gold</a></li>
          </ul>
        </div>
        <div class="gc-footer-col">
          <h4>Atendimento</h4>
          <ul class="gc-footer-links">
            <li><a href="https://wa.me/${WHATSAPP_PHONE}" target="_blank" rel="noopener">WhatsApp Ateliê</a></li>
            <li><a href="https://instagram.com" target="_blank" rel="noopener">Instagram Oficial</a></li>
            <li><a href="${root}admin.html">Acesso Restrito</a></li>
          </ul>
        </div>
        <div class="gc-footer-col">
          <h4>Ateliê Exclusivo</h4>
          <p>Deseja uma peça personalizada com cores e medidas específicas? Converse com nossa estilista artesã.</p>
          <a href="https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent('Olá, gostaria de encomendar uma peça personalizada sob medida na Gold Crochet!')}" target="_blank" class="gc-filter-pill" style="display:inline-block;margin-top:14px;text-decoration:none;border-color:var(--color-gold);color:var(--color-gold-deep)">
            Solicitar Encomenda
          </a>
        </div>
      </div>
      <div class="gc-footer-bottom">
        <span>&copy; ${new Date().getFullYear()} Gold Crochet. Todos os direitos reservados. Feito à mão no Brasil.</span>
        <span>Símbolo Sagrado: Búzio Dourado</span>
      </div>
    `;

    document.body.appendChild(footer);
  }

  // ════════════════════════════════════════
  // GERENCIAMENTO DO CARRINHO (CART)
  // ════════════════════════════════════════
  function getCart() {
    try {
      const data = localStorage.getItem(CART_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      updateCartUI();
    } catch (e) {}
  }

  function addToCart(product, qty = 1, selectedColor = '') {
    const cart = getCart();
    const existing = cart.find(item => item.id === product.id && item.color === selectedColor);
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price || 0,
        image: product.image || (product.gallery && product.gallery[0]) || '',
        slug: product.slug || '',
        color: selectedColor,
        qty: qty
      });
    }
    saveCart(cart);
    openCart();
  }

  function updateItemQty(index, change) {
    const cart = getCart();
    if (!cart[index]) return;
    cart[index].qty += change;
    if (cart[index].qty <= 0) {
      cart.splice(index, 1);
    }
    saveCart(cart);
  }

  function removeFromCart(index) {
    const cart = getCart();
    cart.splice(index, 1);
    saveCart(cart);
  }

  function updateCartUI() {
    const cart = getCart();
    const badge = document.getElementById('gcCartCount');
    const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);

    if (badge) {
      badge.textContent = totalCount;
      if (totalCount > 0) {
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }

    const body = document.getElementById('gcCartBody');
    const totalValEl = document.getElementById('gcCartTotalVal');
    if (!body || !totalValEl) return;

    if (cart.length === 0) {
      body.innerHTML = `
        <div class="gc-cart-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" stroke-width="1.5">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
          <p>Sua sacola está vazia.</p>
          <a href="${root}pecas.html" class="gc-filter-pill" style="text-decoration:none;background:var(--color-gold);color:white">Explorar Peças</a>
        </div>
      `;
      totalValEl.textContent = 'R$ 0,00';
      return;
    }

    let total = 0;
    body.innerHTML = cart.map((item, idx) => {
      const itemTotal = (item.price || 0) * item.qty;
      total += itemTotal;
      const formattedPrice = item.price ? `R$ ${(item.price).toFixed(2).replace('.', ',')}` : 'Sob Consulta';

      return `
        <div class="gc-cart-item">
          <img src="${item.image || root + 'assets/icon.svg'}" alt="${item.name}" class="gc-cart-item-img" onerror="this.src='${root}assets/icon.svg'">
          <div class="gc-cart-item-info">
            <h4>${item.name}</h4>
            <div class="gc-cart-item-meta">${item.color ? 'Cor: ' + item.color : 'Artesanal'}</div>
            <div class="gc-cart-item-price">${formattedPrice}</div>
          </div>
          <div class="gc-cart-item-qty">
            <button class="gc-qty-btn" onclick="window.GoldCart.changeQty(${idx}, -1)">-</button>
            <span style="font-size:0.85rem;font-weight:600">${item.qty}</span>
            <button class="gc-qty-btn" onclick="window.GoldCart.changeQty(${idx}, 1)">+</button>
          </div>
        </div>
      `;
    }).join('');

    totalValEl.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
  }

  function openCart() {
    const drawer = document.getElementById('gcCartDrawer');
    if (drawer) {
      drawer.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
      updateCartUI();
    }
  }

  function closeCart() {
    const drawer = document.getElementById('gcCartDrawer');
    if (drawer) {
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
    }
  }

  function checkoutWhatsApp() {
    const cart = getCart();
    if (!cart.length) {
      alert('Sua sacola está vazia.');
      return;
    }

    let total = 0;
    let msg = `✨ *Pedido Gold Crochet — Alta-Costura*\n\nOlá, gostaria de encomendar os seguintes itens:\n\n`;

    cart.forEach(item => {
      const itemTotal = (item.price || 0) * item.qty;
      total += itemTotal;
      const priceStr = item.price ? `R$ ${(item.price).toFixed(2).replace('.', ',')}` : 'Sob consulta';
      msg += `▪ ${item.qty}x *${item.name}* ${item.color ? `(Cor: ${item.color})` : ''} — ${priceStr}\n`;
    });

    msg += `\n*Total Estimado:* R$ ${total.toFixed(2).replace('.', ',')}\n\n`;
    msg += `Poderiam me informar o prazo de envio e dados para pagamento?`;

    const url = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  }

  // ════════════════════════════════════════
  // GERENCIAMENTO DE FAVORITOS (FAVORITES)
  // ════════════════════════════════════════
  function getFavs() {
    try {
      const data = localStorage.getItem(FAV_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function toggleFav(id) {
    let favs = getFavs();
    const idx = favs.indexOf(id);
    if (idx >= 0) {
      favs.splice(idx, 1);
    } else {
      favs.push(id);
    }
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(favs));
    } catch (e) {}
    updateFavUI();
    return idx < 0; // retorna true se adicionou, false se removeu
  }

  function updateFavUI() {
    const favs = getFavs();
    const badge = document.getElementById('gcFavCount');
    if (badge) {
      badge.textContent = favs.length;
      if (favs.length > 0) {
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }

    document.querySelectorAll('.gc-card-fav-btn').forEach(btn => {
      const id = parseInt(btn.dataset.id);
      if (favs.includes(id)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // Catálogo Global Helper
  window.fetchCatalog = async function () {
    try {
      const res = await fetch(`${root}data.json?v=${Date.now()}`);
      if (!res.ok) throw new Error('Falha ao carregar catálogo');
      const data = await res.json();
      return data.products || [];
    } catch (e) {
      console.warn('Erro ao carregar data.json, tentando fallback:', e);
      return [];
    }
  };

  // Setup Event Listeners
  function setupEvents() {
    // Mobile Drawer Toggle
    const mobileToggle = document.getElementById('gcMobileToggle');
    const mobileClose = document.getElementById('gcMobileClose');
    const mobileDrawer = document.getElementById('gcMobileDrawer');

    if (mobileToggle && mobileDrawer) {
      mobileToggle.addEventListener('click', () => {
        mobileDrawer.classList.add('open');
        mobileDrawer.setAttribute('aria-hidden', 'false');
      });
    }

    if (mobileClose && mobileDrawer) {
      mobileClose.addEventListener('click', () => {
        mobileDrawer.classList.remove('open');
        mobileDrawer.setAttribute('aria-hidden', 'true');
      });
    }

    if (mobileDrawer) {
      mobileDrawer.addEventListener('click', (e) => {
        if (e.target === mobileDrawer) {
          mobileDrawer.classList.remove('open');
          mobileDrawer.setAttribute('aria-hidden', 'true');
        }
      });
    }

    // Cart Drawer Toggle
    const cartTrigger = document.getElementById('gcCartTrigger');
    const cartClose = document.getElementById('gcCartClose');
    const cartDrawer = document.getElementById('gcCartDrawer');
    const checkoutBtn = document.getElementById('gcCheckoutBtn');

    if (cartTrigger) {
      cartTrigger.addEventListener('click', openCart);
    }

    if (cartClose) {
      cartClose.addEventListener('click', closeCart);
    }

    if (cartDrawer) {
      cartDrawer.addEventListener('click', (e) => {
        if (e.target === cartDrawer) closeCart();
      });
    }

    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', checkoutWhatsApp);
    }

    // Fav trigger (abre lista de peças favoritas se houver)
    const favTrigger = document.getElementById('gcFavTrigger');
    if (favTrigger) {
      favTrigger.addEventListener('click', () => {
        window.location.href = `${root}pecas.html?filtro=favoritos`;
      });
    }

    updateCartUI();
    updateFavUI();
  }

  // Exportar API Global
  window.GoldCart = {
    add: addToCart,
    open: openCart,
    close: closeCart,
    changeQty: updateItemQty,
    remove: removeFromCart,
    checkout: checkoutWhatsApp
  };

  window.GoldFav = {
    toggle: toggleFav,
    list: getFavs,
    updateUI: updateFavUI
  };

  // Inicializa quando o DOM estiver pronto
  function init() {
    renderHeader();
    renderDrawers();
    renderFooter();
    setupEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

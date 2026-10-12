/**
 * Gold Crochet — Shared Luxury UI, Customer Account & Loyalty Engine
 * Integração da identidade oficial (Ouro Metálico, #fdf6d6, #ffffff, #bad7e8),
 * Logo Oficial, Área do Cliente (Firebase), Programa de Brindes e Navegação Orgânica.
 */

(function () {
  const CART_KEY = 'gc_cart_items_v2';
  const FAV_KEY = 'gc_fav_items_v2';
  const USER_KEY = 'gc_customer_account_v2';
  // ════════════════════════════════════════
  // INTEGRAÇÃO WHATSAPP ⇄ PAINEL ADMIN
  // Configuração editável no admin (Firestore: settings/whatsapp).
  // ════════════════════════════════════════
  const WA_DEFAULT_PHONE = '5531984566047';
  const WA_CACHE_KEY = 'gc_wa_settings_v1';
  const WA_FS_URL = 'https://firestore.googleapis.com/v1/projects/lucky-dolphin-861jg/databases/ai-studio-goldcrochetshop-0e84b9ac-6dbb-400f-9959-fc455c1c4776/documents/settings/whatsapp?key=AIzaSyDHHGEuFeQViQutklqIhFoEI5akvAv4Ko8';
  let waSettings = { phone: WA_DEFAULT_PHONE, greeting: 'Olá! Gostaria de falar com o concierge do ateliê Gold Crochet.', checkoutFooter: 'Poderiam me informar o prazo de envio e dados para pagamento?' };
  try { Object.assign(waSettings, JSON.parse(localStorage.getItem(WA_CACHE_KEY) || '{}')); } catch (e) {}
  let WHATSAPP_PHONE = String(waSettings.phone || WA_DEFAULT_PHONE).replace(/\D/g, '') || WA_DEFAULT_PHONE;

  function waUrl(text, phone) {
    const num = String(phone || WHATSAPP_PHONE).replace(/\D/g, '');
    return `https://wa.me/${num}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
  }

  // Reescreve links wa.me já renderizados (inclusive em HTML estático) para o número atual
  function refreshWhatsAppLinks() {
    document.querySelectorAll('a[href*="wa.me/"]').forEach(a => {
      if (a.dataset.waCustomer) return; // links para o telefone da cliente não mudam
      a.setAttribute('href', a.getAttribute('href').replace(/wa\.me\/\d+/, `wa.me/${WHATSAPP_PHONE}`));
    });
  }

  async function loadWhatsAppSettings() {
    try {
      const res = await fetch(WA_FS_URL, { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      const f = json.fields || {};
      const val = k => f[k] && (f[k].stringValue ?? f[k].integerValue);
      const next = {};
      ['phone', 'greeting', 'checkoutFooter'].forEach(k => { if (val(k)) next[k] = String(val(k)); });
      if (!Object.keys(next).length) return;
      Object.assign(waSettings, next);
      localStorage.setItem(WA_CACHE_KEY, JSON.stringify(waSettings));
      WHATSAPP_PHONE = String(waSettings.phone).replace(/\D/g, '') || WA_DEFAULT_PHONE;
      refreshWhatsAppLinks();
      document.dispatchEvent(new CustomEvent('gc:whatsapp-settings', { detail: waSettings }));
    } catch (e) { /* offline: mantém cache */ }
  }

  window.GCWhatsApp = {
    getPhone: () => WHATSAPP_PHONE,
    getSettings: () => ({ ...waSettings }),
    url: waUrl,
    refreshLinks: refreshWhatsAppLinks
  };
  loadWhatsAppSettings();
  document.addEventListener('DOMContentLoaded', refreshWhatsAppLinks);

  function getRootPath() {
    const path = window.location.pathname;
    if (path.includes('/produtos/')) return '../';
    return './';
  }

  const root = getRootPath();

  // Búzio Dourado Oficial Autêntico
  const BUZIO_IMG = `<img src="${root}assets/buzio-ouro.png" class="gc-logo-buzio" alt="Búzio Dourado Oficial">`;

  function getActivePage() {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('cliente')) return 'cliente';
    if (path.includes('colecoes')) return 'colecoes';
    if (path.includes('pecas') || path.includes('/produtos/')) return 'pecas';
    if (path.includes('novidades')) return 'novidades';
    if (path.includes('casa-gold')) return 'casa-gold';
    return 'inicio';
  }

  const activePage = getActivePage();

  // ════════════════════════════════════════
  // 1. RENDER DO HEADER HAUTE COUTURE (COM LOGO OFICIAL E MEGA-MENU)
  // ════════════════════════════════════════
  function renderHeader() {
    const existingHeader = document.querySelector('.gc-header');
    if (existingHeader) return;

    const header = document.createElement('header');
    header.className = 'gc-header gc-header-top-at-crest';
    header.innerHTML = `
      <div class="gc-header-inner">
        <!-- Nível 1: Linha do Topo (Logo Centralizada Ampla no Topo da Página — Efeito Schiaparelli) -->
        <div class="gc-header-crest-row">
          <a href="${root}index.html" class="gc-logo-brand gc-logo-brand-crest" title="Gold Crochet Brasil — Início">
            <img src="${root}assets/logo-brasil-transparent.png" alt="Gold Crochet Brasil" class="gc-logo-official-img">
          </a>
        </div>

        <!-- Nível 2 / Linha Principal de Navegação e Ações -->
        <div class="gc-header-nav-row">
          <!-- 0. Menu Hambúrguer Mobile (44x44px target) -->
          <button id="gcMobileNavToggle" class="gc-header-menu-btn" aria-label="Menu" title="Menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          <!-- 1. Logo Compacta no Canto Esquerdo (Surge suavemente ao rolar a página / Centralizada no Mobile) -->
          <a href="${root}index.html" class="gc-logo-brand gc-logo-brand-compact" title="Gold Crochet Brasil — Início">
            <img src="${root}assets/logo-brasil-transparent.png" alt="Gold Crochet Brasil" class="gc-logo-official-img">
          </a>

          <!-- 2. Navegação Principal -->
          <nav class="gc-header-nav" aria-label="Navegação Principal">
            <ul class="gc-nav-links">
              <li><a href="${root}index.html" class="gc-nav-link ${activePage === 'inicio' ? 'active' : ''}">Início</a></li>
              <li><a href="${root}colecoes.html" class="gc-nav-link ${activePage === 'colecoes' ? 'active' : ''}">Coleções</a></li>
              <li class="gc-nav-item-dropdown">
                <a href="#pecas" id="gcMegaMenuToggle" class="gc-nav-link ${activePage === 'pecas' ? 'active' : ''}" role="button" aria-expanded="false">
                  Peças
                </a>
                <!-- MEGA-MENU SUSPENSO IDÊNTICO À REFERÊNCIA DO ATELIÊ -->
                <div class="gc-mega-menu" id="gcMegaMenuPecas">
                  <div class="gc-mega-menu-inner">
                    <!-- Coluna 1: ESSENCIAIS -->
                    <div class="gc-mega-col">
                      <h4 class="gc-mega-heading">ESSENCIAIS</h4>
                      <div class="gc-mega-subcol-group">
                        <div class="gc-mega-subcol">
                          <h5 class="gc-mega-subheading">PARA ELA</h5>
                          <ul class="gc-mega-list">
                            <li><a href="${root}pecas.html?cat=noite-ela">Roupas para noite</a></li>
                            <li><a href="${root}pecas.html?cat=saias-vestidos">Saias e vestidos</a></li>
                            <li><a href="${root}pecas.html?cat=jaquetas-casacos">Jaquetas e casacos</a></li>
                            <li><a href="${root}pecas.html?cat=tops">Tops</a></li>
                            <li><a href="${root}pecas.html?cat=calcas">Calças</a></li>
                            <li><a href="${root}pecas.html?cat=ela" class="gc-mega-ver-tudo">Ver tudo</a></li>
                          </ul>
                        </div>
                        <div class="gc-mega-subcol">
                          <h5 class="gc-mega-subheading">PARA ELE</h5>
                          <ul class="gc-mega-list">
                            <li><a href="${root}pecas.html?cat=noite-ele">Roupas para noite</a></li>
                            <li><a href="${root}pecas.html?cat=jaquetas-ele">Jaquetas e casacos</a></li>
                            <li><a href="${root}pecas.html?cat=calcas-ele">Calças</a></li>
                            <li><a href="${root}pecas.html?cat=ele" class="gc-mega-ver-tudo">Ver tudo</a></li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <!-- Coluna 2: PEQUENINOS -->
                    <div class="gc-mega-col">
                      <h4 class="gc-mega-heading">PEQUENINOS</h4>
                      <ul class="gc-mega-list">
                        <li><a href="${root}pecas.html?cat=bebe">Bebê</a></li>
                        <li><a href="${root}pecas.html?cat=garotas">Garotas</a></li>
                        <li><a href="${root}pecas.html?cat=garotos">Garotos</a></li>
                        <li><a href="${root}pecas.html?cat=presentes">Presentes</a></li>
                        <li><a href="${root}pecas.html?cat=pequeninos" class="gc-mega-ver-tudo">Ver tudo</a></li>
                      </ul>
                    </div>

                    <!-- Coluna 3: ACESSÓRIOS -->
                    <div class="gc-mega-col">
                      <h4 class="gc-mega-heading">ACESSÓRIOS</h4>
                      <ul class="gc-mega-list">
                        <li><a href="${root}pecas.html?cat=bolsas">Bolsas</a></li>
                        <li><a href="${root}pecas.html?cat=charms">Charms</a></li>
                        <li><a href="${root}pecas.html?cat=acessorios" class="gc-mega-ver-tudo">Ver tudo</a></li>
                      </ul>
                    </div>

                    <!-- Coluna 4: BIJUTERIAS -->
                    <div class="gc-mega-col">
                      <h4 class="gc-mega-heading">BIJUTERIAS</h4>
                      <ul class="gc-mega-list">
                        <li><a href="${root}pecas.html?cat=brincos">Brincos</a></li>
                        <li><a href="${root}pecas.html?cat=colares">Colares</a></li>
                        <li><a href="${root}pecas.html?cat=broches">Broches</a></li>
                        <li><a href="${root}pecas.html?cat=braceletes">Braceletes</a></li>
                        <li><a href="${root}pecas.html?cat=aneis">Anéis</a></li>
                        <li><a href="${root}pecas.html?cat=bijuterias" class="gc-mega-ver-tudo">Ver tudo</a></li>
                      </ul>
                    </div>

                    <!-- Coluna 5: ARTIGOS PARA CASA -->
                    <div class="gc-mega-col">
                      <h4 class="gc-mega-heading">ARTIGOS PARA CASA</h4>
                      <ul class="gc-mega-list">
                        <li><a href="${root}casa-gold.html">Decorações</a></li>
                        <li><a href="${root}casa-gold.html">Mantas &amp; Cobertores</a></li>
                        <li><a href="${root}casa-gold.html">Amigurumis</a></li>
                        <li><a href="${root}casa-gold.html" class="gc-mega-ver-tudo">Ver tudo</a></li>
                      </ul>
                    </div>

                    <!-- Coluna 6: Card Oficial da Marca com Logo Específica da Aba Peças -->
                    <div class="gc-mega-brand-card">
                      <img src="${root}images/logo_pecas_dropdown.png" alt="Gold Crochet Oficial" class="gc-mega-brand-logo">
                    </div>
                  </div>
                </div>
              </li>
              <li><a href="${root}novidades.html" class="gc-nav-link ${activePage === 'novidades' ? 'active' : ''}">Novidades</a></li>
              <li><a href="${root}casa-gold.html" class="gc-nav-link ${activePage === 'casa-gold' ? 'active' : ''}">Casa Gold</a></li>
            </ul>
          </nav>

          <!-- 3. Ações à Direita: Pesquisar, Silhueta Usuário, Silhueta Coração, Sacola -->
          <div class="gc-header-actions">
            <a href="${root}pecas.html" class="gc-header-search-btn" title="Pesquisar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18" aria-hidden="true">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span>Pesquisar</span>
            </a>

            <!-- Silhueta: Área do Cliente -->
            <a href="${root}cliente.html" id="gcUserTrigger" class="gc-action-circle-btn ${activePage === 'cliente' ? 'active' : ''}" title="Minha Conta" aria-label="Minha Conta">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </a>

            <!-- Silhueta: Coração (Favoritos) -->
            <button id="gcFavTrigger" class="gc-action-circle-btn" title="Favoritos" aria-label="Favoritos">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
              <span id="gcFavCount" class="gc-badge-count hidden">0</span>
            </button>

            <!-- Sacola de Compras -->
            <button id="gcCartTrigger" class="gc-action-circle-btn" title="Sacola de Compras" aria-label="Sacola de Compras">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
              <span id="gcCartCount" class="gc-badge-count hidden">0</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  `;

  document.body.prepend(header);
}

  // ════════════════════════════════════════
  // 2. BARRA DE NAVEGAÇÃO FLUTUANTE MOBILE (PÍLULA)
  // ════════════════════════════════════════
  function renderMobileBar() {
    if (document.getElementById('gcMobileBar')) return;

    const bar = document.createElement('nav');
    bar.id = 'gcMobileBar';
    bar.className = 'gc-mobile-bottom-bar';
    bar.setAttribute('aria-label', 'Navegação Rápida Mobile');
    bar.innerHTML = `
      <a href="${root}index.html" class="gc-mobile-tab-btn gc-mobile-bar-item gc-bar-tab ${activePage === 'inicio' ? 'active' : ''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
        <span>Início</span>
      </a>
      <a href="${root}colecoes.html" class="gc-mobile-tab-btn gc-mobile-bar-item gc-bar-tab ${activePage === 'colecoes' ? 'active' : ''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
        <span>Coleções</span>
      </a>
      <a href="${root}pecas.html" class="gc-mobile-tab-btn gc-mobile-bar-item gc-bar-tab ${activePage === 'pecas' ? 'active' : ''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
        <span>Peças</span>
      </a>
      <button class="gc-mobile-tab-btn gc-mobile-bar-item gc-bar-tab" onclick="window.GoldCart.open()" style="background:none;border:none;cursor:pointer;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line></svg>
        <span>Sacola</span>
      </button>
      <a href="${root}cliente.html" class="gc-mobile-tab-btn gc-mobile-bar-item gc-bar-tab ${activePage === 'cliente' ? 'active' : ''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        <span>Conta</span>
      </a>
    `;

    document.body.appendChild(bar);
  }

  // ════════════════════════════════════════
  // 2.5. MENU DRAWER LATERAL RESPONSIVO MOBILE
  // ════════════════════════════════════════
  function renderMobileNavDrawer() {
    if (document.getElementById('gcMobileNavDrawer')) return;

    let backdrop = document.getElementById('gcMobileNavBackdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'gcMobileNavBackdrop';
      backdrop.className = 'gc-drawer-backdrop';
      document.body.appendChild(backdrop);
    }

    const drawer = document.createElement('div');
    drawer.id = 'gcMobileNavDrawer';
    drawer.className = 'gc-mobile-nav-drawer gc-drawer-panel gc-drawer-content';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-label', 'Menu Principal de Navegação');

    drawer.innerHTML = `
      <div class="gc-mobile-nav-box" id="gcMobileNavBox">
        <div class="gc-mobile-nav-header">
          <a href="${root}index.html" class="gc-mobile-nav-logo-link" title="Gold Crochet — Início">
            <img src="${root}assets/logo-brasil-transparent.png" alt="Gold Crochet Brasil">
          </a>
          <button id="gcMobileNavClose" class="gc-mobile-nav-close" aria-label="Fechar menu">&times;</button>
        </div>

        <ul class="gc-mobile-nav-links">
          <li><a href="${root}index.html" class="gc-mobile-nav-link ${activePage === 'inicio' ? 'active' : ''}">Início</a></li>
          <li><a href="${root}colecoes.html" class="gc-mobile-nav-link ${activePage === 'colecoes' ? 'active' : ''}">Coleções</a></li>
          <li><a href="${root}pecas.html" class="gc-mobile-nav-link ${activePage === 'pecas' ? 'active' : ''}">Peças</a></li>
          <li><a href="${root}novidades.html" class="gc-mobile-nav-link ${activePage === 'novidades' ? 'active' : ''}">Novidades</a></li>
          <li><a href="${root}casa-gold.html" class="gc-mobile-nav-link ${activePage === 'casa-gold' ? 'active' : ''}">Casa Gold</a></li>
          <li><a href="${root}cliente.html" class="gc-mobile-nav-link ${activePage === 'cliente' ? 'active' : ''}">Minha Conta</a></li>
          <li><a href="javascript:void(0)" id="gcMobileNavFavLink" class="gc-mobile-nav-link">Favoritos</a></li>
          <li><a href="javascript:void(0)" id="gcMobileNavCartLink" class="gc-mobile-nav-link">Sacola</a></li>
        </ul>

        <div class="gc-mobile-nav-footer">
          <a href="https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent('Olá! Gostaria de falar com o concierge do ateliê Gold Crochet.')}" target="_blank" rel="noopener noreferrer" class="gc-mobile-nav-suporte">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
            <span>Suporte Ateliê</span>
          </a>
        </div>
      </div>
    `;

    document.body.appendChild(drawer);
  }

  function openMobileNav() {
    const drawer = document.getElementById('gcMobileNavDrawer');
    const backdrop = document.getElementById('gcMobileNavBackdrop');
    if (drawer) {
      drawer.classList.add('open');
      drawer.classList.add('active');
    }
    if (backdrop) {
      backdrop.classList.add('open');
      backdrop.classList.add('active');
    }
    document.body.classList.add('gc-scroll-locked');
  }

  function closeMobileNav() {
    const drawer = document.getElementById('gcMobileNavDrawer');
    const backdrop = document.getElementById('gcMobileNavBackdrop');
    if (drawer) {
      drawer.classList.remove('open');
      drawer.classList.remove('active');
    }
    if (backdrop) {
      backdrop.classList.remove('open');
      backdrop.classList.remove('active');
    }
    document.body.classList.remove('gc-scroll-locked');
  }

  // ════════════════════════════════════════
  // 3. MODAL DA CONTA DO CLIENTE COM PROGRAMA DE BRINDES
  // ════════════════════════════════════════
  function renderUserModal() {
    if (document.getElementById('gcUserModal')) return;

    const modal = document.createElement('div');
    modal.id = 'gcUserModal';
    modal.className = 'gc-modal-backdrop';
    modal.innerHTML = `
      <div class="gc-user-modal-box">
        <button id="gcModalClose" class="gc-modal-close-btn" aria-label="Fechar">&times;</button>
        <div id="gcUserModalContent">
          <!-- Conteúdo dinâmico injetado via JS -->
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  // ════════════════════════════════════════
  // 4. GAVETA DE SACOLA DE COMPRAS (IDÊNTICA À REFERÊNCIA DO ATELIÊ)
  // ════════════════════════════════════════
  function renderCartDrawer() {
    if (document.getElementById('gcCartDrawer')) return;

    let backdrop = document.getElementById('gcCartBackdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'gcCartBackdrop';
      backdrop.className = 'gc-drawer-backdrop';
      document.body.appendChild(backdrop);
    }

    const drawer = document.createElement('div');
    drawer.id = 'gcCartDrawer';
    drawer.className = 'gc-cart-drawer';
    drawer.innerHTML = `
      <div class="gc-cart-drawer-box">
        <div class="gc-cart-header">
          <div class="gc-cart-header-actions">
            <a href="${root}pecas.html" class="gc-drawer-head-btn" title="Pesquisa">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <span>Pesquisa</span>
            </a>
            <a href="${root}cliente.html" class="gc-drawer-head-btn" title="Minha Conta">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </a>
            <button class="gc-drawer-head-btn" id="gcDrawerFavBtn" title="Favoritos">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            </button>
            <button class="gc-drawer-head-btn active" title="Sacola">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
            </button>
          </div>
          <button id="gcCartClose" class="gc-cart-close" aria-label="Fechar">&times;</button>
        </div>
        <div id="gcCartBody" class="gc-cart-body" style="padding:0;"></div>
        <div id="gcCartFooter" class="gc-cart-footer">
          <!-- Bloco do Cupom de Desconto Retrátil -->
          <div class="gc-coupon-box" id="gcCouponBox">
            <div style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;margin-bottom:6px" onclick="const f=document.getElementById('gcCouponFormBox'); if(f) f.style.display = (f.style.display==='none' || !f.style.display)?'block':'none';">
              <span style="font-size:0.78rem;letter-spacing:0.06em;text-transform:uppercase;color:var(--color-gold-deep);font-weight:700;display:flex;align-items:center;gap:6px">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                Cupom de Desconto
              </span>
              <span style="font-size:0.74rem;color:var(--color-muted);font-weight:600">Inserir +</span>
            </div>
            <div id="gcCouponFormBox" style="display:none;margin-top:6px">
              <div style="display:flex;gap:6px">
                <input type="text" id="gcCouponInput" class="gc-coupon-input" placeholder="Ex: ATELIER10" autocomplete="off">
                <button type="button" class="gc-coupon-apply-btn" onclick="window.GoldCart.applyCoupon()">Aplicar</button>
              </div>
              <div id="gcCouponFeedback" style="font-size:0.75rem;margin-top:5px;display:none"></div>
            </div>
          </div>

          <div id="gcCartSubtotalRow" class="gc-cart-total-row" style="display:none;margin-bottom:4px">
            <span class="gc-cart-total-label" style="font-size:0.82rem;color:var(--color-muted)">Subtotal</span>
            <span id="gcCartSubtotalVal" style="font-size:0.88rem;color:var(--color-charcoal)">R$ 0,00</span>
          </div>
          <div id="gcCartDiscountRow" class="gc-cart-total-row" style="display:none;margin-bottom:6px;color:#2e7d32">
            <span class="gc-cart-total-label" style="font-size:0.82rem">Desconto (<span id="gcCartDiscountCodeLabel"></span>)</span>
            <span id="gcCartDiscountVal" style="font-size:0.88rem;font-weight:700">- R$ 0,00</span>
          </div>

          <div class="gc-cart-total-row">
            <span class="gc-cart-total-label">Total</span>
            <span id="gcCartTotalVal" class="gc-cart-total-value gc-cart-total-val cart-total">R$ 0,00</span>
          </div>
          <div id="gcCartUserPill" class="gc-cart-user-pill">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span id="gcCartUserPillText">Conectado como <strong>Cliente</strong></span>
          </div>
          <a id="gcCartCheckoutBtn" href="https://wa.me/${WHATSAPP_PHONE}" target="_blank" rel="noopener noreferrer" class="gc-btn-checkout" style="text-decoration:none;display:flex;align-items:center;justify-content:center;">
            Finalizar pelo WhatsApp
          </a>
        </div>
      </div>
    `;

    document.body.appendChild(drawer);
  }

  // ════════════════════════════════════════
  // 4.1 GAVETA LATERAL DE LISTA DE DESEJOS (FAVORITOS)
  // ════════════════════════════════════════
  function renderWishlistDrawer() {
    if (document.getElementById('gcWishlistDrawer')) return;

    let backdrop = document.getElementById('gcCartBackdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'gcCartBackdrop';
      backdrop.className = 'gc-drawer-backdrop';
      document.body.appendChild(backdrop);
    }

    const drawer = document.createElement('div');
    drawer.id = 'gcWishlistDrawer';
    drawer.className = 'gc-cart-drawer gc-wishlist-drawer';
    drawer.innerHTML = `
      <div class="gc-cart-drawer-box">
        <div class="gc-cart-header">
          <div class="gc-cart-header-actions">
            <a href="${root}pecas.html" class="gc-drawer-head-btn" title="Pesquisa">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <span>Pesquisa</span>
            </a>
            <a href="${root}cliente.html" class="gc-drawer-head-btn" title="Minha Conta">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </a>
            <button class="gc-drawer-head-btn active" id="gcWishlistHeadFavBtn" title="Favoritos">
              <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.8" width="18" height="18"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            </button>
            <button class="gc-drawer-head-btn" id="gcWishlistHeadCartBtn" title="Sacola">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
            </button>
          </div>
          <button id="gcWishlistClose" class="gc-cart-close" aria-label="Fechar">&times;</button>
        </div>
        <div id="gcWishlistBody" class="gc-cart-body" style="padding:24px;"></div>
      </div>
    `;

    document.body.appendChild(drawer);
  }

  // ════════════════════════════════════════
  // 5. RODAPÉ DE ALTA-COSTURA
  // ════════════════════════════════════════
  function renderFooter() {
    const existing = document.querySelector('.gc-footer');
    if (existing) return;

    const footer = document.createElement('footer');
    footer.className = 'gc-footer';
    footer.innerHTML = `
      <div class="gc-footer-inner">
        <div class="gc-footer-col">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
            <img src="${root}assets/logo-brasil-transparent.png" alt="Gold Crochet Brasil" style="height:44px;width:auto;">
          </div>
          <p>Alta-costura artesanal brasileira. Cada ponto tecido à mão com fios nobres e acabamento impecável de ateliê.</p>
          <div style="margin-top:14px;display:flex;gap:10px">
            <span class="gc-badge-tag" style="position:static;background:var(--color-secondary)">Fios Nobres</span>
            <span class="gc-badge-tag" style="position:static;background:var(--color-quaternary);color:var(--color-ebony)">100% Manual</span>
          </div>
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
            <li><a href="https://www.instagram.com/goldcrochetbrasil?stkn=Mm5ndmt2cTJzNXRo" target="_blank" rel="noopener">Instagram Oficial</a></li>
            <li><a href="javascript:void(0)" onclick="window.GoldAccount.open()">Área do Cliente</a></li>
          </ul>
        </div>
        <div class="gc-footer-col">
          <h4>Programa Brinde do Ateliê</h4>
          <p>A cada 3 compras registradas em sua conta, você recebe um mimo exclusivo tecido à mão (Porta-copos Búzio Dourado ou Ecobag artesanal).</p>
          <button class="gc-gift-badge-btn" onclick="window.GoldAccount.open()" style="margin-top:10px">Ver Meu Progresso</button>
        </div>
      </div>
      <div class="gc-footer-bottom">
        <span>&copy; ${new Date().getFullYear()} Gold Crochet Brasil. Todos os direitos reservados. Feito à mão no Brasil.</span>
      </div>
    `;

    document.body.appendChild(footer);
  }

  // ════════════════════════════════════════
  // 6. MOTOR DE FIDELIDADE & CONTA DO USUÁRIO (FIREBASE)
  // ════════════════════════════════════════
  function getCustomer() {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  function saveCustomer(customer) {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(customer));
      updateUserUI();
    } catch (e) {}
  }

  const TARGET_PURCHASES_FOR_GIFT = 3;

  function renderUserModalContent() {
    const container = document.getElementById('gcUserModalContent');
    if (!container) return;

    const customer = getCustomer();

    if (customer && customer.name) {
      // USUÁRIO LOGADO / PERFIL COM MEDIDOR CIRCULAR DE BRINDES
      const purchases = customer.purchasesCount || 0;
      const progressMod = purchases % TARGET_PURCHASES_FOR_GIFT;
      const progressPercent = (progressMod / TARGET_PURCHASES_FOR_GIFT) * 100;
      const strokeDash = 220; // 2 * PI * r
      const strokeOffset = strokeDash - (strokeDash * (progressPercent / 100));
      const remaining = TARGET_PURCHASES_FOR_GIFT - progressMod;
      const giftsUnlocked = Math.floor(purchases / TARGET_PURCHASES_FOR_GIFT);

      container.innerHTML = `
        <div style="text-align:center;margin-bottom:20px">
          <div style="width:68px;height:68px;border-radius:50%;background:var(--gradient-gold-metallic);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;box-shadow:var(--shadow-gold-glow)">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
          <h3 style="font-family:var(--font-display);font-size:1.4rem;color:var(--color-ebony);margin:0 0 4px">${customer.name}</h3>
          <span style="font-size:0.82rem;color:var(--color-muted)">${customer.email || 'Cliente Ateliê Gold Crochet'}</span>
        </div>

        <!-- Card do Medidor de Brindes (Circular) -->
        <div class="gc-gift-tracker-card">
          <div class="gc-gift-circle-wrap">
            <svg class="gc-gift-circle-svg" viewBox="0 0 100 100">
              <circle class="gc-gift-circle-bg" cx="50" cy="50" r="35"></circle>
              <circle class="gc-gift-circle-progress" cx="50" cy="50" r="35" stroke-dasharray="220" stroke-dashoffset="${strokeOffset}"></circle>
            </svg>
            <div class="gc-gift-circle-center">
              <span>${purchases}</span>
              <span style="font-size:0.6rem;color:var(--color-muted);font-weight:600">PEDIDOS</span>
            </div>
          </div>
          <div class="gc-gift-info">
            <h4>Brinde do Ateliê</h4>
            <p>${remaining === 0 ? '🎉 Parabéns! Você atingiu a meta para resgatar seu brinde!' : `Você já realizou <strong>${purchases}</strong> ${purchases === 1 ? 'compra' : 'compras'}. Faltam <strong>${remaining}</strong> para o brinde!`}</p>
            ${remaining === 0 ? `
              <button class="gc-btn-pill-primary" style="padding:8px 16px;font-size:0.75rem" onclick="window.GoldAccount.claimGift()">
                🎁 Resgatar Brinde Exclusivo
              </button>
            ` : `
              <span class="gc-badge-tag" style="position:static;background:var(--color-secondary);font-size:0.7rem">Próximo: Porta-Copos Búzio</span>
            `}
          </div>
        </div>

        <div style="background:var(--color-tertiary);border-radius:var(--radius-card);padding:18px;border:1px solid var(--color-border);margin-bottom:20px">
          <h5 style="font-family:var(--font-body);font-size:0.85rem;color:var(--color-ebony);margin:0 0 8px;font-weight:700">Registrar Compra do WhatsApp:</h5>
          <p style="font-size:0.78rem;color:var(--color-muted);margin:0 0 12px">Realizou uma encomenda com nossa estilista? Adicione aqui para somar ao seu brinde.</p>
          <div style="display:flex;gap:8px">
            <input type="text" id="gcOrderCodeInput" class="gc-input-pill" placeholder="Ex: GC-${Date.now().toString().slice(-4)}" style="margin-bottom:0;padding:10px 16px;font-size:0.85rem">
            <button class="gc-btn-pill-primary" style="width:auto;padding:10px 18px;font-size:0.8rem;white-space:nowrap" onclick="window.GoldAccount.addPurchase()">
              + Somar
            </button>
          </div>
        </div>

        <a href="${root}cliente.html" class="gc-btn-pill-primary" style="display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;margin-bottom:12px;padding:12px 16px;white-space:nowrap;font-size:0.85rem">
          💎 Acessar Portal Completo da Cliente
        </a>

        <button class="gc-filter-pill" style="width:100%;border-color:rgba(229,62,62,0.3);color:#e53e3e;white-space:nowrap" onclick="window.GoldAccount.logout()">
          Encerrar Sessão
        </button>
      `;
    } else {
      // FORMULÁRIO DE LOGIN / CADASTRO DE CLIENTE
      const customNotice = customAuthModalMsg ? `
        <div style="background:rgba(205,164,52,0.12);border:1px solid var(--color-primary-gold);border-radius:10px;padding:12px 16px;margin-bottom:18px;font-size:0.84rem;color:var(--color-ebony);line-height:1.45;text-align:left;">
          ✨ <strong>${customAuthModalMsg}</strong>
        </div>
      ` : '';

      container.innerHTML = `
        <div style="text-align:center;margin-bottom:20px">
          <div style="width:56px;height:56px;border-radius:50%;background:var(--color-secondary);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;border:1px solid var(--color-border)">
            <img src="${root}assets/buzio-oficial.png" alt="Búzio Dourado Oficial" style="width:36px;height:auto;object-fit:contain;">
          </div>
          <h3 style="font-family:var(--font-display);font-size:1.45rem;color:var(--color-ebony);margin:0 0 4px">Ateliê Gold Crochet</h3>
          <p style="font-size:0.85rem;color:var(--color-muted);margin:0">Acesse sua conta para salvar sacola e favoritos em todos os seus dispositivos.</p>
        </div>

        ${customNotice}

        <button class="gc-btn-pill-google" onclick="window.GoldAccount.loginGoogle()" style="white-space:nowrap">
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.41 7.33 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.94 0 12s.45 3.84 1.24 5.42l4.04-3.15z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.59 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/></svg>
          Entrar com Google
        </button>

        <div style="display:flex;align-items:center;gap:12px;margin:16px 0;color:var(--color-muted);font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em">
          <hr style="flex:1;border:none;border-top:1px solid var(--color-border-subtle)">
          <span>ou com seu e-mail</span>
          <hr style="flex:1;border:none;border-top:1px solid var(--color-border-subtle)">
        </div>

        <form id="gcLoginForm" onsubmit="window.GoldAccount.loginEmail(event)">
          <input type="text" id="gcInputName" class="gc-input-pill" placeholder="Seu nome completo" required>
          <input type="email" id="gcInputEmail" class="gc-input-pill" placeholder="Seu e-mail" required>
          <button type="submit" class="gc-btn-pill-primary" style="white-space:nowrap">Acessar Minha Conta</button>
        </form>

        <a href="${root}cliente.html" class="gc-filter-pill" style="display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;margin-top:12px;font-size:0.85rem;white-space:nowrap">
          Abrir Portal Completo da Cliente &rarr;
        </a>
      `;
    }
  }

  let pendingAuthAction = null;
  let customAuthModalMsg = '';

  function updateUserUI() {
    const customer = getCustomer();
    const btn = document.getElementById('gcUserTrigger');
    if (btn) {
      if (customer && customer.name) {
        btn.classList.add('user-active');
        btn.setAttribute('title', `Conta de ${customer.name}`);
      } else {
        btn.classList.remove('user-active');
        btn.setAttribute('title', 'Minha Conta & Brindes');
      }
    }
    renderUserModalContent();
  }

  function openUserModal(customMsg = '') {
    customAuthModalMsg = customMsg;
    const modal = document.getElementById('gcUserModal');
    if (modal) {
      renderUserModalContent();
      modal.classList.add('open');
      document.body.classList.add('gc-scroll-locked');
    }
  }

  function closeUserModal() {
    customAuthModalMsg = '';
    const modal = document.getElementById('gcUserModal');
    if (modal) {
      modal.classList.remove('open');
      document.body.classList.remove('gc-scroll-locked');
    }
  }

  async function syncUserCrossDevice(cust) {
    if (!cust || !cust.email) return;
    try {
      const fb = window.GoldFirebase;
      const currentAuthUser = fb && fb.auth && fb.auth.currentUser;
      const docId = (currentAuthUser && currentAuthUser.uid) ? currentAuthUser.uid : cust.email.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');

      if (fb && fb.db && currentAuthUser) {
        const { db, fsDoc, setDoc, getDoc } = fb;
        const userRef = fsDoc(db, 'users', docId);
        try {
          const snap = await getDoc(userRef);
          if (snap && snap.exists && snap.exists()) {
            const remote = snap.data();
            if (Array.isArray(remote.favs)) {
              const localFavs = getFavs();
              const mergedFavs = Array.from(new Set([...localFavs, ...remote.favs]));
              localStorage.setItem(FAV_KEY, JSON.stringify(mergedFavs));
              updateFavUI();
            }
            if (remote.measurements) {
              cust.measurements = { ...remote.measurements, ...(cust.measurements || {}) };
            }
            if (remote.address) {
              cust.address = { ...remote.address, ...(cust.address || {}) };
            }
            if (remote.purchasesCount !== undefined) {
              cust.purchasesCount = Math.max(cust.purchasesCount || 0, remote.purchasesCount || 0);
            }
            saveCustomer(cust);
          }
        } catch(e) {}

        await setDoc(userRef, {
          id: cleanId,
          name: cust.name || 'Cliente Gold',
          email: cust.email,
          role: 'customer',
          cart: getCart(),
          favs: getFavs(),
          measurements: cust.measurements || {},
          address: cust.address || {},
          purchasesCount: cust.purchasesCount || 0,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log('☁️ [Gold Crochet] Dados salvos e sincronizados com Firestore!');
      }
    } catch(err) {
      console.warn('⚠️ Sincronização offline ou local:', err.message);
    }
  }

  async function completeAuth(cust) {
    saveCustomer(cust);
    updateUserUI();
    closeUserModal();
    await syncUserCrossDevice(cust);

    if (pendingAuthAction) {
      const act = pendingAuthAction;
      pendingAuthAction = null;
      if (act.type === 'cart') {
        addToCart(act.product, act.qty, act.selectedColor);
      } else if (act.type === 'fav') {
        toggleFav(act.id);
      }
    }
  }

  async function loginWithGoogle() {
    if (window.GoldFirebase && window.GoldFirebase.auth && window.GoldFirebase.signInWithPopup) {
      try {
        const { auth, googleProvider, signInWithPopup } = window.GoldFirebase;
        const res = await signInWithPopup(auth, googleProvider);
        if (res && res.user) {
          const u = res.user;
          const existing = getCustomer() || {};
          const cust = {
            name: u.displayName || 'Cliente Gold',
            email: u.email || 'cliente@goldcrochet.com.br',
            purchasesCount: existing.purchasesCount || 0,
            giftsClaimed: existing.giftsClaimed || 0,
            measurements: existing.measurements || {},
            address: existing.address || {}
          };
          await completeAuth(cust);
          return;
        }
      } catch(err) {
        console.warn('Tentando login com fallback ateliê:', err.message);
      }
    }
    const fallbackName = prompt('Digite seu nome para acessar a conta do ateliê:', 'Cliente Gold');
    if (fallbackName) {
      const cleanEmail = fallbackName.toLowerCase().replace(/[^a-z0-9]/g, '') + '@cliente.goldcrochet.com.br';
      const cust = {
        name: fallbackName,
        email: cleanEmail,
        purchasesCount: 0,
        giftsClaimed: 0,
        measurements: {},
        address: {}
      };
      await completeAuth(cust);
    }
  }

  async function loginWithEmail(e) {
    if (e) e.preventDefault();
    const nameEl = document.getElementById('gcInputName');
    const emailEl = document.getElementById('gcInputEmail');
    if (!nameEl || !emailEl) return;
    const name = nameEl.value.trim();
    const email = emailEl.value.trim();
    if (!name || !email) return;

    const existing = getCustomer() || {};
    const cust = {
      name: name,
      email: email,
      purchasesCount: existing.purchasesCount !== undefined ? existing.purchasesCount : 0,
      giftsClaimed: existing.giftsClaimed || 0,
      measurements: existing.measurements || {},
      address: existing.address || {}
    };
    await completeAuth(cust);
  }

  function addCustomerPurchase() {
    const cust = getCustomer();
    if (!cust) return;
    const codeInput = document.getElementById('gcOrderCodeInput');
    const code = codeInput ? codeInput.value.trim() : '';
    cust.purchasesCount = (cust.purchasesCount || 0) + 1;
    saveCustomer(cust);
    syncUserCrossDevice(cust);
    alert(`🎉 Pedido registrado com sucesso! Você tem agora ${cust.purchasesCount} compras computadas.`);
    if (codeInput) codeInput.value = '';
  }

  function claimCustomerGift() {
    const cust = getCustomer();
    if (!cust) return;
    const msg = `🎁 *Resgate de Brinde — Ateliê Gold Crochet*\n\nOlá, sou *${cust.name}* e completei minhas compras para resgate do meu brinde exclusivo do ateliê!\n\nEmail da conta: ${cust.email}\nTotal de compras: ${cust.purchasesCount}`;
    const url = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  }

  function logoutCustomer() {
    localStorage.removeItem(USER_KEY);
    updateUserUI();
    closeUserModal();
  }

  // ════════════════════════════════════════
  // 7. MOTOR DO CARRINHO (CART) & FAVORITOS
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
    const customer = getCustomer();
    if (!customer || !customer.email) {
      pendingAuthAction = { type: 'cart', product, qty, selectedColor };
      openUserModal('Crie sua conta ou faça login para adicionar itens à sua sacola e sincronizá-los em todos os seus aparelhos.');
      return;
    }

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
    syncUserCrossDevice(customer);
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

  function updateCartUI() {
    const cart = getCart();
    const customer = getCustomer();
    const badge = document.getElementById('gcCartCount');
    const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);

    if (badge) {
      badge.textContent = totalCount;
      if (totalCount > 0) badge.classList.remove('hidden');
      else badge.classList.add('hidden');
    }

    const body = document.getElementById('gcCartBody');
    const totalValEl = document.getElementById('gcCartTotalVal');
    if (!body || !totalValEl) return;

    const footerEl = document.getElementById('gcCartFooter');
    const bagSvg = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="gc-cart-empty-bag-svg" width="60" height="60">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <path d="M16 10a4 4 0 0 1-8 0"></path>
      </svg>
    `;

    if (cart.length === 0) {
      if (footerEl) footerEl.style.display = 'none';
      body.style.padding = '0';

      if (customer && customer.name) {
        // Usuário Conectado & Sacola Vazia: mostra apenas "Sua sacola está vazia" (sem convite de login)
        body.innerHTML = `
          <div class="gc-cart-empty-view" style="justify-content:center;min-height:360px;">
            <div class="gc-cart-empty-top">
              <div class="gc-cart-bag-icon-wrap">${bagSvg}</div>
              <h3 class="gc-cart-empty-heading">Sua sacola está vazia.</h3>
              <a href="${root}pecas.html" class="gc-cart-explore-link">Explore nossas peças!</a>
            </div>
          </div>
        `;
      } else {
        // Sem Login & Sacola Vazia: mostra a mensagem e convite para conectar
        body.innerHTML = `
          <div class="gc-cart-empty-view">
            <div class="gc-cart-empty-top">
              <div class="gc-cart-bag-icon-wrap">${bagSvg}</div>
              <h3 class="gc-cart-empty-heading">Sua sacola está vazia.</h3>
              <a href="${root}pecas.html" class="gc-cart-explore-link">Explore nossas peças!</a>
            </div>
            <div class="gc-cart-empty-bottom">
              <h4 class="gc-cart-account-title">Pegue sua bolsa</h4>
              <p class="gc-cart-account-desc">Faça login na Minha Conta para acessar sua sacola em todos os seus dispositivos.</p>
              <button class="gc-btn-solid-gold gc-cart-login-action-btn" onclick="window.GoldAccount.open()">
                Entrar na Minha Conta
              </button>
            </div>
          </div>
        `;
      }
      totalValEl.textContent = 'R$ 0,00';
      return;
    }

    if (footerEl) footerEl.style.display = 'flex';
    body.style.padding = '24px';

    // Atualiza o pill de usuário conectado no rodapé da sacola
    const userPill = document.getElementById('gcCartUserPillText');
    if (userPill) {
      if (customer && customer.name) {
        userPill.innerHTML = `Conectado como <strong>${customer.name}</strong>`;
      } else {
        userPill.innerHTML = `Conectado como <strong>Visitante</strong>`;
      }
    }

    let subtotal = 0;
    body.innerHTML = cart.map((item, idx) => {
      const itemTotal = (item.price || 0) * item.qty;
      subtotal += itemTotal;
      const formattedPrice = item.price ? `R$ ${(item.price).toFixed(2).replace('.', ',')}` : 'Sob Consulta';

      return `
        <div class="gc-cart-item cart-item">
          <img src="${item.image || root + 'assets/icon.svg'}" alt="${item.name}" class="gc-cart-item-img" onerror="this.src='${root}assets/icon.svg'">
          <div class="gc-cart-item-info">
            <h4>${item.name}</h4>
            <div class="gc-cart-item-meta">${item.color ? 'Cor: ' + item.color : 'Artesanal'}</div>
            <div class="gc-cart-item-price">${formattedPrice}</div>
          </div>
          <div class="gc-cart-item-qty">
            <button class="gc-qty-btn gc-cart-qty-dec btn-dec" onclick="window.GoldCart.changeQty(${idx}, -1)">-</button>
            <span style="font-size:0.85rem;font-weight:700">${item.qty}</span>
            <button class="gc-qty-btn gc-cart-qty-inc btn-inc" onclick="window.GoldCart.changeQty(${idx}, 1)">+</button>
          </div>
        </div>
      `;
    }).join('');

    // Cálculo dinâmico do cupom de desconto
    let discountVal = 0;
    if (appliedCoupon && subtotal > 0) {
      if (appliedCoupon.type === 'percent') {
        discountVal = subtotal * (Number(appliedCoupon.discount || 0) / 100);
      } else {
        discountVal = Math.min(Number(appliedCoupon.discount || 0), subtotal);
      }
    }
    const finalTotal = Math.max(0, subtotal - discountVal);

    const subtotalRow = document.getElementById('gcCartSubtotalRow');
    const subtotalValEl = document.getElementById('gcCartSubtotalVal');
    const discountRow = document.getElementById('gcCartDiscountRow');
    const discountValEl = document.getElementById('gcCartDiscountVal');
    const discountCodeLabel = document.getElementById('gcCartDiscountCodeLabel');

    if (appliedCoupon && discountVal > 0) {
      if (subtotalRow) {
        subtotalRow.style.display = 'flex';
        subtotalValEl.textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
      }
      if (discountRow) {
        discountRow.style.display = 'flex';
        discountValEl.textContent = `- R$ ${discountVal.toFixed(2).replace('.', ',')}`;
        if (discountCodeLabel) discountCodeLabel.textContent = appliedCoupon.code;
      }
    } else {
      if (subtotalRow) subtotalRow.style.display = 'none';
      if (discountRow) discountRow.style.display = 'none';
    }

    totalValEl.textContent = `R$ ${finalTotal.toFixed(2).replace('.', ',')}`;

    const checkoutBtn = document.getElementById('gcCartCheckoutBtn') || document.getElementById('gcCheckoutBtn');
    if (checkoutBtn) {
      let msg = `✨ *Pedido Gold Crochet Brasil — Alta-Costura*\n\n`;
      if (customer && customer.name) msg += `👤 Cliente: *${customer.name}*\n\n`;
      msg += `Gostaria de encomendar os seguintes itens:\n\n`;
      cart.forEach(item => {
        const pStr = item.price ? `R$ ${(item.price).toFixed(2).replace('.', ',')}` : 'Sob consulta';
        msg += `▪ ${item.qty}x *${item.name}* ${item.color ? `(Cor: ${item.color})` : ''} — ${pStr}\n`;
      });
      if (appliedCoupon && discountVal > 0) {
        msg += `\nSubtotal: R$ ${subtotal.toFixed(2).replace('.', ',')}\n`;
        msg += `🏷 *Cupom de Desconto:* ${appliedCoupon.code} (-R$ ${discountVal.toFixed(2).replace('.', ',')})\n`;
      }
      msg += `\n*Total Estimado:* R$ ${finalTotal.toFixed(2).replace('.', ',')}\n\nPoderiam me informar o prazo de envio e dados para pagamento?`;
      checkoutBtn.setAttribute('href', `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`);
    }
  }

  let appliedCoupon = null;

  async function applyCoupon() {
    const input = document.getElementById('gcCouponInput');
    const feedback = document.getElementById('gcCouponFeedback');
    if (!input || !feedback) return;
    const code = input.value.trim().toUpperCase();
    if (!code) {
      feedback.style.display = 'block';
      feedback.style.color = '#e53e3e';
      feedback.textContent = 'Por favor, digite o código do cupom.';
      return;
    }

    try {
      const res = await fetch(`${root}data.json?v=${Date.now()}`);
      const data = await res.json();
      const list = data.coupons || [
        { code: 'ATELIER10', discount: 10, type: 'percent', description: '10% OFF Ateliê', active: true },
        { code: 'OURO20', discount: 20, type: 'percent', description: '20% OFF Lançamento', active: true },
        { code: 'FRETEGRATIS', discount: 50, type: 'fixed', description: 'R$ 50 OFF Frete Cortesia', active: true }
      ];
      const match = list.find(c => c.code && c.code.toUpperCase() === code && c.active);

      if (!match) {
        feedback.style.display = 'block';
        feedback.style.color = '#e53e3e';
        feedback.textContent = 'Cupom inválido ou expirado.';
        appliedCoupon = null;
        updateCartUI();
        return;
      }

      appliedCoupon = match;
      feedback.style.display = 'block';
      feedback.style.color = '#2e7d32';
      feedback.textContent = `✨ Cupom ${match.code} aplicado com sucesso!`;
      updateCartUI();
    } catch(err) {
      if (code === 'ATELIER10' || code === 'OURO20' || code === 'FRETEGRATIS') {
        appliedCoupon = { code, discount: code === 'ATELIER10' ? 10 : (code === 'OURO20' ? 20 : 50), type: code === 'FRETEGRATIS' ? 'fixed' : 'percent' };
        feedback.style.display = 'block';
        feedback.style.color = '#2e7d32';
        feedback.textContent = `✨ Cupom ${code} aplicado com sucesso!`;
        updateCartUI();
      } else {
        feedback.style.display = 'block';
        feedback.style.color = '#e53e3e';
        feedback.textContent = 'Não foi possível validar o cupom.';
      }
    }
  }

  function openCart() {
    closeWishlist();
    closeMobileNav();
    const drawer = document.getElementById('gcCartDrawer');
    const backdrop = document.getElementById('gcCartBackdrop');
    if (drawer) {
      drawer.classList.add('open', 'active');
      document.body.classList.add('gc-scroll-locked');
      if (backdrop) backdrop.classList.add('open', 'active');
      updateCartUI();
    }
  }

  function closeCart() {
    const drawer = document.getElementById('gcCartDrawer');
    const backdrop = document.getElementById('gcCartBackdrop');
    if (drawer) {
      drawer.classList.remove('open', 'active');
      if (backdrop) backdrop.classList.remove('open', 'active');
    }
    const wishlist = document.getElementById('gcWishlistDrawer');
    const mobileNav = document.getElementById('gcMobileNavDrawer');
    const isWishlistOpen = wishlist && (wishlist.classList.contains('open') || wishlist.classList.contains('active'));
    const isMobileNavOpen = mobileNav && (mobileNav.classList.contains('open') || mobileNav.classList.contains('active'));
    if (!isWishlistOpen && !isMobileNavOpen) {
      document.body.classList.remove('gc-scroll-locked');
    }
  }

  function checkoutWhatsApp(ev) {
    // O botão é um <a href>; evita abrir 2 abas (href + window.open)
    if (ev && ev.preventDefault) ev.preventDefault();
    const cart = getCart();
    if (!cart.length) {
      alert('Sua sacola está vazia.');
      return;
    }

    const customer = getCustomer();
    const orderCode = 'GC' + Date.now().toString(36).toUpperCase().slice(-6);
    let subtotal = 0;
    let msg = `✨ *Pedido Gold Crochet Brasil — Alta-Costura*\n`;
    msg += `🧾 Código: *${orderCode}*\n\n`;
    if (customer && customer.name) {
      msg += `👤 Cliente: *${customer.name}*\n\n`;
    }
    msg += `Gostaria de encomendar os seguintes itens:\n\n`;

    cart.forEach(item => {
      const itemTotal = (item.price || 0) * item.qty;
      subtotal += itemTotal;
      const priceStr = item.price ? `R$ ${(item.price).toFixed(2).replace('.', ',')}` : 'Sob consulta';
      msg += `▪ ${item.qty}x *${item.name}* ${item.color ? `(Cor: ${item.color})` : ''} — ${priceStr}\n`;
    });

    let discountVal = 0;
    if (appliedCoupon && subtotal > 0) {
      if (appliedCoupon.type === 'percent') {
        discountVal = subtotal * (Number(appliedCoupon.discount || 0) / 100);
      } else {
        discountVal = Math.min(Number(appliedCoupon.discount || 0), subtotal);
      }
      msg += `\nSubtotal: R$ ${subtotal.toFixed(2).replace('.', ',')}\n`;
      msg += `🏷 *Cupom de Desconto:* ${appliedCoupon.code} (-R$ ${discountVal.toFixed(2).replace('.', ',')})\n`;
    }

    const finalTotal = Math.max(0, subtotal - discountVal);
    msg += `\n*Total Estimado:* R$ ${finalTotal.toFixed(2).replace('.', ',')}\n\n`;
    msg += waSettings.checkoutFooter || 'Poderiam me informar o prazo de envio e dados para pagamento?';

    if (customer) {
      customer.purchasesCount = (customer.purchasesCount || 0) + 1;
      saveCustomer(customer);
      syncUserCrossDevice(customer);
    }

    // Abre o WhatsApp imediatamente (antes de await, para não ser bloqueado como pop-up)
    window.open(waUrl(msg), '_blank');

    // Registra o pedido no Firestore → aparece ao vivo no painel admin
    registerWhatsAppOrder({ orderCode, cart, subtotal, discountVal, finalTotal, customer });
  }

  async function registerWhatsAppOrder({ orderCode, cart, subtotal, discountVal, finalTotal, customer }) {
    try {
      const fb = window.GoldFirebase;
      const user = fb && fb.auth && fb.auth.currentUser;
      if (!fb || !fb.db || !user) return; // regras exigem login
      await fb.setDoc(fb.fsDoc(fb.db, 'orders', orderCode), {
        code: orderCode,
        source: 'whatsapp-checkout',
        userId: user.uid,
        userName: (customer && customer.name) || user.displayName || '',
        userEmail: (customer && customer.email) || user.email || '',
        phone: String((customer && (customer.phone || customer.whatsapp)) || user.phoneNumber || '').replace(/\D/g, ''),
        items: cart.slice(0, 100).map(i => ({ name: i.name || '', qty: Number(i.qty) || 1, price: Number(i.price) || 0, color: i.color || '' })),
        subtotal: Number(subtotal.toFixed(2)),
        discount: Number(discountVal.toFixed(2)),
        coupon: appliedCoupon ? appliedCoupon.code : '',
        total: Number(finalTotal.toFixed(2)),
        status: 'pendente',
        createdAt: fb.serverTimestamp()
      });
    } catch (err) {
      console.warn('[Checkout] Pedido não registrado no Firestore:', err && err.message);
    }
  }

  // Favoritos
  function getFavs() {
    try {
      const data = localStorage.getItem(FAV_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function toggleFav(id) {
    const customer = getCustomer();
    if (!customer || !customer.email) {
      pendingAuthAction = { type: 'fav', id };
      openUserModal('Crie sua conta ou faça login para salvar peças no coração e sincronizá-las em todos os seus aparelhos.');
      return false;
    }

    let favs = getFavs();
    const idx = favs.indexOf(id);
    if (idx >= 0) favs.splice(idx, 1);
    else favs.push(id);
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(favs));
    } catch (e) {}
    updateFavUI();
    syncUserCrossDevice(customer);
    return idx < 0;
  }

  function updateFavUI() {
    const favs = getFavs();
    const badge = document.getElementById('gcFavCount');
    if (badge) {
      badge.textContent = favs.length;
      if (favs.length > 0) badge.classList.remove('hidden');
      else badge.classList.add('hidden');
    }

    document.querySelectorAll('.gc-card-fav-btn').forEach(btn => {
      const id = parseInt(btn.dataset.id);
      if (favs.includes(id)) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    updateWishlistUI();
  }

  window.fetchCatalog = async function () {
    try {
      const cached = localStorage.getItem('gc_cached_products');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch(err) {}
      }
      const res = await fetch(`${root}data.json?v=${Date.now()}`);
      if (!res.ok) throw new Error('Falha ao carregar catálogo');
      const data = await res.json();
      return data.products || [];
    } catch (e) {
      return [];
    }
  };

  // Motor da Gaveta de Desejos (Wishlist Lateral)
  let cachedProductsForWishlist = null;
  async function updateWishlistUI() {
    const body = document.getElementById('gcWishlistBody');
    if (!body) return;

    const favs = getFavs();
    if (!favs || favs.length === 0) {
      body.innerHTML = `
        <div class="gc-cart-empty-view" style="justify-content:center;min-height:360px;">
          <div class="gc-cart-empty-top">
            <div class="gc-cart-bag-icon-wrap" style="color:var(--color-primary-gold);">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="60" height="60">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </div>
            <h3 class="gc-cart-empty-heading">Sua lista de desejos está vazia.</h3>
            <p style="font-size:0.85rem;color:var(--color-muted);max-width:280px;margin:0 auto 18px;line-height:1.5;">Guarde suas peças autorais prediletas para encomendar com nossa estilista.</p>
            <a href="${root}pecas.html" class="gc-cart-explore-link">Explorar Coleções</a>
          </div>
        </div>
      `;
      return;
    }

    if (!cachedProductsForWishlist) {
      body.innerHTML = `<div style="text-align:center;padding:40px;color:var(--color-muted);font-size:0.9rem">Carregando seus desejos...</div>`;
      cachedProductsForWishlist = await window.fetchCatalog();
    }

    const items = cachedProductsForWishlist.filter(p => favs.includes(p.id));

    if (items.length === 0) {
      body.innerHTML = `
        <div class="gc-cart-empty-view" style="justify-content:center;min-height:360px;">
          <div class="gc-cart-empty-top">
            <h3 class="gc-cart-empty-heading">Nenhuma peça encontrada.</h3>
            <a href="${root}pecas.html" class="gc-cart-explore-link">Explorar Catálogo</a>
          </div>
        </div>
      `;
      return;
    }

    body.innerHTML = `
      <div style="margin-bottom:18px;display:flex;align-items:center;justify-content:space-between">
        <h4 style="font-family:var(--font-display);font-size:1.25rem;color:var(--color-ebony);margin:0">Peças Salvas (${items.length})</h4>
      </div>
      <div style="display:flex;flex-direction:column;gap:16px;">
        ${items.map(p => {
          const img = p.image || (p.gallery && p.gallery[0]) || `${root}assets/icon.svg`;
          const formattedPrice = p.price ? `R$ ${Number(p.price).toFixed(2).replace('.', ',')}` : 'Sob Consulta';
          const safeName = (p.name || '').replace(/'/g, "\\'");
          return `
            <div class="gc-cart-item" style="align-items:center;gap:14px;padding:14px;border:1px solid var(--color-border);border-radius:14px;background:#fff">
              <img src="${img}" alt="${p.name}" class="gc-cart-item-img" style="width:72px;height:90px;object-fit:cover;border-radius:10px" onerror="this.src='${root}assets/icon.svg'">
              <div class="gc-cart-item-info" style="flex:1">
                <h4 style="margin:0 0 4px;font-size:0.92rem;font-weight:600;color:var(--color-ebony)">${p.name}</h4>
                <div style="font-size:0.78rem;color:var(--color-muted);margin-bottom:6px">${p.category ? p.category.toUpperCase() : 'ALTA-COSTURA'}</div>
                <div style="font-weight:700;color:var(--color-ebony);font-size:0.95rem">${formattedPrice}</div>
                <div style="display:flex;gap:8px;margin-top:8px">
                  <button class="gc-btn-checkout" onclick="window.GoldCart.add({id:${p.id},name:'${safeName}',price:${p.price || 0},image:'${img}',slug:'${p.slug || ''}'}, 1); closeWishlist();" style="padding:6px 14px;font-size:0.78rem;width:auto;white-space:nowrap;color:#fff!important;background:var(--color-ebony);">
                    + Adicionar à Sacola
                  </button>
                  <button onclick="window.GoldFav.toggle(${p.id}); updateWishlistUI();" style="background:none;border:none;color:#e53e3e;font-size:0.75rem;cursor:pointer;padding:6px 8px;text-decoration:underline">
                    Remover
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function openWishlist() {
    closeCart();
    closeMobileNav();
    const drawer = document.getElementById('gcWishlistDrawer');
    const backdrop = document.getElementById('gcCartBackdrop');
    if (drawer) {
      drawer.classList.add('open', 'active');
      document.body.classList.add('gc-scroll-locked');
      if (backdrop) backdrop.classList.add('open', 'active');
      updateWishlistUI();
    }
  }

  function closeWishlist() {
    const drawer = document.getElementById('gcWishlistDrawer');
    const backdrop = document.getElementById('gcCartBackdrop');
    if (drawer) {
      drawer.classList.remove('open', 'active');
      if (backdrop) backdrop.classList.remove('open', 'active');
    }
    const cart = document.getElementById('gcCartDrawer');
    const mobileNav = document.getElementById('gcMobileNavDrawer');
    const isCartOpen = cart && (cart.classList.contains('open') || cart.classList.contains('active'));
    const isMobileNavOpen = mobileNav && (mobileNav.classList.contains('open') || mobileNav.classList.contains('active'));
    if (!isCartOpen && !isMobileNavOpen) {
      document.body.classList.remove('gc-scroll-locked');
    }
  }

  // Eventos Globais
  function setupEvents() {
    const modalClose = document.getElementById('gcModalClose');
    const modal = document.getElementById('gcUserModal');

    if (modalClose) modalClose.addEventListener('click', closeUserModal);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeUserModal();
      });
    }

    const cartTrigger = document.getElementById('gcCartTrigger');
    const cartClose = document.getElementById('gcCartClose');
    const cartDrawer = document.getElementById('gcCartDrawer');

    if (cartTrigger) {
      cartTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        openCart();
      });
    }
    if (cartClose) {
      cartClose.addEventListener('click', closeCart);
    }

    const wishlistClose = document.getElementById('gcWishlistClose');
    if (wishlistClose) {
      wishlistClose.addEventListener('click', closeWishlist);
    }

    const wishlistHeadCartBtn = document.getElementById('gcWishlistHeadCartBtn');
    if (wishlistHeadCartBtn) {
      wishlistHeadCartBtn.addEventListener('click', () => {
        closeWishlist();
        openCart();
      });
    }

    document.querySelectorAll('.gc-drawer-backdrop').forEach(b => {
      b.addEventListener('click', () => {
        closeMobileNav();
        closeCart();
        closeWishlist();
      });
    });
    if (cartDrawer) {
      cartDrawer.addEventListener('click', (e) => {
        if (e.target === cartDrawer) closeCart();
      });
    }

    const wishlistDrawer = document.getElementById('gcWishlistDrawer');
    if (wishlistDrawer) {
      wishlistDrawer.addEventListener('click', (e) => {
        if (e.target === wishlistDrawer) closeWishlist();
      });
    }

    const cartCheckoutBtn = document.getElementById('gcCartCheckoutBtn') || document.getElementById('gcCheckoutBtn');
    if (cartCheckoutBtn) cartCheckoutBtn.addEventListener('click', checkoutWhatsApp);

    const favTrigger = document.getElementById('gcFavTrigger');
    if (favTrigger) {
      favTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        openWishlist();
      });
    }

    const drawerFavBtn = document.getElementById('gcDrawerFavBtn');
    if (drawerFavBtn) {
      drawerFavBtn.addEventListener('click', (e) => {
        closeCart();
        openWishlist();
      });
    }

    // Interatividade do Mega-Menu ao Clicar / Passar o mouse em Peças
    const megaToggle = document.getElementById('gcMegaMenuToggle');
    const megaMenu = document.getElementById('gcMegaMenuPecas');
    const megaDropdownItem = megaToggle ? megaToggle.closest('.gc-nav-item-dropdown') : null;

    if (megaToggle && megaMenu && megaDropdownItem) {
      let closeTimer = null;

      function openMega() {
        if (window.innerWidth > 960) {
          if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
          megaMenu.classList.add('open');
          megaToggle.classList.add('mega-active');
          megaToggle.setAttribute('aria-expanded', 'true');
        }
      }

      function scheduleCloseMega() {
        if (window.innerWidth > 960) {
          if (closeTimer) clearTimeout(closeTimer);
          closeTimer = setTimeout(() => {
            megaMenu.classList.remove('open');
            megaToggle.classList.remove('mega-active');
            megaToggle.setAttribute('aria-expanded', 'false');
          }, 320); // Janela confortável para transição do cursor
        }
      }

      megaDropdownItem.addEventListener('mouseenter', openMega);
      megaDropdownItem.addEventListener('mouseleave', scheduleCloseMega);
      megaMenu.addEventListener('mouseenter', openMega);
      megaMenu.addEventListener('mouseleave', scheduleCloseMega);

      megaToggle.addEventListener('click', (e) => {
        if (window.innerWidth > 960) {
          e.preventDefault();
          const isOpen = megaMenu.classList.toggle('open');
          megaToggle.classList.toggle('mega-active', isOpen);
          megaToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }
      });

      document.addEventListener('click', (e) => {
        if (!megaMenu.contains(e.target) && !megaToggle.contains(e.target)) {
          megaMenu.classList.remove('open');
          megaToggle.classList.remove('mega-active');
          megaToggle.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // Interatividade do Drawer de Navegação Mobile
    const mobileNavToggle = document.getElementById('gcMobileNavToggle');
    const mobileNavClose = document.getElementById('gcMobileNavClose');
    const mobileNavDrawer = document.getElementById('gcMobileNavDrawer');
    const mobileNavBackdrop = document.getElementById('gcMobileNavBackdrop');
    const mobileNavCartLink = document.getElementById('gcMobileNavCartLink');
    const mobileNavFavLink = document.getElementById('gcMobileNavFavLink');

    if (mobileNavToggle) mobileNavToggle.addEventListener('click', openMobileNav);
    if (mobileNavClose) mobileNavClose.addEventListener('click', closeMobileNav);
    if (mobileNavBackdrop) mobileNavBackdrop.addEventListener('click', closeMobileNav);
    if (mobileNavDrawer) {
      mobileNavDrawer.addEventListener('click', (e) => {
        if (e.target === mobileNavDrawer) closeMobileNav();
      });
      // Auto-fechamento ao selecionar qualquer link comum do menu
      mobileNavDrawer.querySelectorAll('.gc-mobile-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
          if (link.id !== 'gcMobileNavCartLink' && link.id !== 'gcMobileNavFavLink') {
            closeMobileNav();
          }
        });
      });
    }
    if (mobileNavCartLink) {
      mobileNavCartLink.addEventListener('click', () => {
        closeMobileNav();
        openCart();
      });
    }
    if (mobileNavFavLink) {
      mobileNavFavLink.addEventListener('click', () => {
        closeMobileNav();
        openWishlist();
      });
    }

    // Efeito Dinâmico Schiaparelli no Cabeçalho com Histerese (Estável, sem jitter ou travamentos)
    let isHeaderCompact = false;
    function updateSchiaparelliHeader() {
      const headerEl = document.querySelector('.gc-header');
      if (!headerEl) return;
      if (window.innerWidth <= 960) {
        headerEl.classList.remove('gc-header-top-at-crest');
        return;
      }
      const y = window.scrollY;
      if (!isHeaderCompact && y > 60) {
        isHeaderCompact = true;
        headerEl.classList.remove('gc-header-top-at-crest');
      } else if (isHeaderCompact && y < 15) {
        isHeaderCompact = false;
        headerEl.classList.add('gc-header-top-at-crest');
      }
    }

    window.addEventListener('scroll', updateSchiaparelliHeader, { passive: true });
    updateSchiaparelliHeader();

    // Tecla ESC fecha gavetas e modais abertos
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeMobileNav();
        closeCart();
        closeWishlist();
        closeUserModal();
      }
    });

    updateCartUI();
    updateFavUI();
    updateUserUI();
  }

  // APIs Globais
  window.openCart = openCart;
  window.closeCart = closeCart;
  window.openFavorites = openWishlist;
  window.closeFavorites = closeWishlist;
  window.openWishlist = openWishlist;
  window.closeWishlist = closeWishlist;

  window.GoldCart = {
    add: addToCart,
    open: openCart,
    close: closeCart,
    toggle: () => {
      const d = document.getElementById('gcCartDrawer');
      if (d && (d.classList.contains('open') || d.classList.contains('active'))) closeCart();
      else openCart();
    },
    changeQty: updateItemQty,
    checkout: checkoutWhatsApp,
    applyCoupon: applyCoupon
  };

  window.GoldFav = {
    toggle: toggleFav,
    list: getFavs,
    updateUI: updateFavUI,
    openWishlist: openWishlist,
    closeWishlist: closeWishlist,
    updateWishlistUI: updateWishlistUI
  };

  window.GoldAccount = {
    open: openUserModal,
    close: closeUserModal,
    loginGoogle: loginWithGoogle,
    loginEmail: loginWithEmail,
    addPurchase: addCustomerPurchase,
    claimGift: claimCustomerGift,
    logout: logoutCustomer,
    getCustomer: getCustomer
  };

  window.GoldMobileNav = {
    open: openMobileNav,
    close: closeMobileNav
  };

  function init() {
    renderHeader();
    renderMobileNavDrawer();
    renderMobileBar();
    renderUserModal();
    renderCartDrawer();
    renderWishlistDrawer();
    renderFooter();
    setupEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

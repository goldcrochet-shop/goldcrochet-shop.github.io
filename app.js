// =============================================================================
// GOLD CROCHET - APP PRINCIPAL (MODULARIZADO)
// Alta Moda Brasileira & Atelier Artesanal
// =============================================================================

import { auth, db, onAuthStateChanged } from "./js/firebase.js";
import { 
  handleAccountAction, handleAccountFromMenu, openUserModal, closeUserModal, 
  loginWithGoogle, handleEmailAuth, logoutUser, resetPassword, 
  togglePasswordVisibility, showLogin, showRegister, updateProfileData, 
  updateUserUI, openUserModalFromCart
} from "./js/auth.js";
import { 
  initRouter, showPage, openProductRoute, closeProductRoute, 
  getRouteFromHash, setRouteHash 
} from "./js/router.js";
import { 
  catalogState, setCatalogData, setFilter, setSectionFilter, 
  setSectionGenderFilter, setCollectionFilter, clearAllFilters, 
  setColecaoFilter, onSearch, clearSearch, onSearchOverlay, 
  clearSearchOverlayInput, renderFilters, renderProducts, 
  renderCollections, renderSpotlight, renderNewArrivals, formatBRL
} from "./js/catalog.js";
import { 
  openProductPage, closeProductPage, renderProductPageContent, 
  switchMainProductImage, selectProductColor, addProductToCart, 
  orderOnWhatsApp, shareProductLink, currentProduct, selectedColor
} from "./js/product-view.js";
import { 
  cart, addToCart, removeFromCart, changeQty, openCart, closeCart, 
  toggleCart, updateCartUI, checkout
} from "./js/cart.js";
import { 
  favorites, toggleFavorite, isFavorite, openFavorites, closeFavorites, 
  updateFavoritesUI, renderFavoritesList, syncHeartButtons
} from "./js/favorites.js";
import { 
  showToast, initParticles, initMouseFollower, initHeaderScroll, 
  toggleLeftMenu, closeLeftMenu, toggleSearchOverlay, openSearchOverlay, 
  closeSearchOverlay, initKeyboardShortcuts, acceptCookies, checkCookieConsent 
} from "./js/ui.js";
import { handleNewsletterSubmit } from "./js/newsletter.js";
import { setupProductSwipeDismiss } from "./js/product-gestures.js";

// Dados padrão de contingência (Jamstack offline-first)
const defaultProducts = [
  { id:1, name:'Amigurumi Ursinho', emoji:'🧸', category:'amigurumi', section:'casa', gender:null, collection:'Dia a Dia', desc:'Ursinho de crochê feito à mão com fios macios e enchimento hipoalergênico.', price:65, colors:[{name:'Dourado',hex:'#d4af37'},{name:'Marfim',hex:'#fdf6d6'}], badge:'Popular', discount:0, image:'./images/amigurumi-ursinho-1.jpg', gallery:['./images/amigurumi-ursinho-1.jpg'] },
  { id:2, name:'Bolsa de Crochê', emoji:'👜', category:'bolsas', section:'acessorios', gender:null, collection:'Alta-Costura', desc:'Bolsa artesanal em crochê com alça estruturada e forro acetinado.', price:120, colors:[{name:'Dourado',hex:'#d4af37'},{name:'Preto',hex:'#2c2c2c'}], badge:'', discount:0, image:'./images/bolsa-de-croche-1.jpg', gallery:['./images/bolsa-de-croche-1.jpg'] },
  { id:3, name:'Manta Ponto Concha', emoji:'🛋️', category:'mantas', section:'casa', gender:null, collection:'Alta-Costura', desc:'Manta artesanal confeccionada em ponto concha com toque aveludado.', price:280, colors:[{name:'Marfim',hex:'#fdf6d6'}], badge:'Destaque', discount:10, image:'./images/manta-ponto-concha-1.jpg', gallery:['./images/manta-ponto-concha-1.jpg'] },
  { id:4, name:'Vestido Trancoso Midi', emoji:'👗', category:'saias-vestidos', section:'dia-a-dia', gender:'feminino', collection:'Alta-Costura', desc:'Vestido midi exclusivo com pontos rendados e caimento refinado.', price:450, colors:[{name:'Dourado Nobre',hex:'#cda434'},{name:'Areia',hex:'#e8cd82'}], badge:'Exclusivo', discount:0, image:'./images/vestido-trancoso-midi-1.jpg', gallery:['./images/vestido-trancoso-midi-1.jpg'] },
  { id:5, name:'Bolsa Dunas', emoji:'👜', category:'bolsas', section:'acessorios', gender:null, collection:'Alta-Costura', desc:'Bolsa de mão estruturada em fio de seda dourado com fechamento magnético.', price:280, colors:[{name:'Dourado',hex:'#cda434'},{name:'Terracota',hex:'#c86d51'}], badge:'Novo', discount:0, image:'./images/bolsa-dunas-1.jpg', gallery:['./images/bolsa-dunas-1.jpg'] }
];

const defaultCollections = [
  { id:'alta-costura', name:'Alta-Costura', desc:'Peças exclusivas com fios nobres e acabamento de alta costura.', emoji:'👑', filter:'Alta-Costura' },
  { id:'dia-a-dia', name:'Coleção Maré de Ouro', desc:'Peças versáteis inspiradas na luz do litoral brasileiro.', emoji:'🌊', filter:'Dia a Dia' }
];

const defaultCategories = [
  'amigurumi','bolsas','mantas','vestuario','personalizado',
  'roupas-noite','saias-vestidos','jaquetas-casacos','tops','calcas','pequeninos',
  'bebe','garotas','garotos','presentes',
  'charms','brincos','colares','broches','braceletes','aneis',
  'decoracoes'
];

// Helper DOM
const $ = (id) => document.getElementById(id);

// -----------------------------------------------------------------------------
// LOGOS E IMAGENS COM FALLBACK RESILIENTE
// -----------------------------------------------------------------------------
function setupLogos() {
  const navImg = $('navLogoImg');
  if (navImg) {
    navImg.addEventListener('error', function() {
      this.style.display = 'none';
      if (this.parentElement) {
        this.parentElement.innerHTML = '<span class="nav-logo-text-fallback" style="font-family:\'DM Serif Display\',serif;font-size:1.5rem;color:var(--gold-main);letter-spacing:0.05em;">Gold Crochet</span>';
      }
    });
  }
}

// -----------------------------------------------------------------------------
// GESTÃO DE NAVEGAÇÃO E MEGA MENUS
// -----------------------------------------------------------------------------
let megaCloseTimer = null;

function positionNavDropdowns() {
  const nav = $('mainNav');
  if (!nav) return;
  const navHeight = nav.getBoundingClientRect().height;
  document.querySelectorAll('.mega-menu').forEach(m => { 
    m.style.top = navHeight + 'px'; 
  });
}

function openMega(menuId) {
  clearTimeout(megaCloseTimer);
  document.querySelectorAll('.mega-menu').forEach(m => {
    if (m.id !== menuId) m.classList.remove('open');
  });
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('mega-active'));
  
  const m = $(menuId);
  if (m) m.classList.add('open');

  const triggerId = menuId === 'megaMenuPecas' ? 'nav-produtos' : 'nav-sobre';
  const trigger = $(triggerId);
  if (trigger) trigger.classList.add('mega-active');
  positionNavDropdowns();
}

function closeMega() {
  document.querySelectorAll('.mega-menu').forEach(m => m.classList.remove('open'));
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('mega-active'));
}

function scheduleCloseMega() {
  clearTimeout(megaCloseTimer);
  megaCloseTimer = setTimeout(closeMega, 250);
}

function initMegaMenus() {
  const pecasLink = $('nav-produtos');
  const sobreLink = $('nav-sobre');
  const otherLinks = document.querySelectorAll('.nav-links a:not(#nav-produtos):not(#nav-sobre)');
  const isDesktop = () => window.matchMedia('(min-width: 821px)').matches;

  function attach(link, menuId) {
    if (!link) return;
    link.addEventListener('mouseenter', () => { if (isDesktop()) openMega(menuId); });
    link.addEventListener('focus', () => { if (isDesktop()) openMega(menuId); });
    link.addEventListener('click', (e) => {
      e.preventDefault(); 
      e.stopPropagation();
      if (!isDesktop()) { 
        showPage(menuId === 'megaMenuPecas' ? 'produtos' : 'sobre'); 
        return; 
      }
      const m = $(menuId);
      if (m && m.classList.contains('open')) closeMega(); else openMega(menuId);
    });
  }

  attach(pecasLink, 'megaMenuPecas');
  attach(sobreLink, 'megaMenuCasa');

  otherLinks.forEach(l => l.addEventListener('mouseenter', () => { if (isDesktop()) scheduleCloseMega(); }));
  document.querySelectorAll('.mega-menu').forEach(m => {
    m.addEventListener('mouseenter', () => clearTimeout(megaCloseTimer));
    m.addEventListener('mouseleave', () => { if (isDesktop()) scheduleCloseMega(); });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#mainNav') && !e.target.closest('.mega-menu')) closeMega();
  });

  window.addEventListener('resize', () => { 
    positionNavDropdowns(); 
    if (!isDesktop()) closeMega(); 
  });
  window.addEventListener('scroll', positionNavDropdowns, { passive: true });
}

// Mega menu actions
function megaGoTo(page, category) {
  closeMega(); 
  showPage(page);
  if (page === 'produtos' && category) setTimeout(() => setFilter(category), 30);
  else if (page === 'produtos') setTimeout(() => setFilter('todos'), 30);
}

function megaGoToCategory(category, gender) {
  closeMega(); 
  showPage('produtos');
  setTimeout(() => setFilter(category, gender || null), 30);
}

function megaGoToSection(section) {
  closeMega(); 
  showPage('produtos');
  setTimeout(() => setSectionFilter(section), 30);
}

function megaGoToSectionGender(section, gender) {
  closeMega(); 
  showPage('produtos');
  setTimeout(() => setSectionGenderFilter(section, gender), 30);
}

// Menu lateral mobile submenus
function togglePecasSubmenu(event) {
  if (event) event.preventDefault();
  const sub = $('leftMenuPecasSub');
  const toggle = $('left-nav-produtos');
  if (!sub || !toggle) return;
  const isOpen = sub.classList.toggle('open');
  toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

function toggleCasaSubmenu(event) {
  if (event) event.preventDefault();
  const sub = $('leftMenuCasaSub');
  const toggle = $('left-nav-sobre');
  if (!sub || !toggle) return;
  const isOpen = sub.classList.toggle('open');
  toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

function navigateFromMenu(page) { 
  closeLeftMenu(); 
  setTimeout(() => showPage(page), 120); 
}

function navigateFromSubMenu(category, gender) {
  closeLeftMenu();
  setTimeout(() => {
    showPage('produtos');
    if (category) setFilter(category);
  }, 120);
}

function openSearchFromMenu() { closeLeftMenu(); setTimeout(openSearchOverlay, 150); }
function openFavoritesFromMenu() { closeLeftMenu(); setTimeout(openFavorites, 150); }
function openCartFromMenu() { closeLeftMenu(); setTimeout(openCart, 150); }

// Modal / Dialog Close Handler
function closeModal() {
  const overlay = $('modalOverlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

function goBackPage() {
  closeProductRoute();
  return true;
}

// Quick Add helper
window.addToCartById = (productId) => {
  const allProducts = window._productsData || catalogState.products || [];
  const p = allProducts.find(x => x.id === Number(productId));
  if (p) addToCart(p, (p.colors && p.colors[0]?.name) || '');
};

// -----------------------------------------------------------------------------
// CARREGAMENTO DE DADOS (JSON JAMSTACK + GITHUB PAGES)
// -----------------------------------------------------------------------------
async function loadData() {
  try {
    const resp = await fetch('./data.json?t=' + Date.now(), { cache: 'no-store' });
    if (resp.ok) {
      const data = await resp.json();
      setCatalogData({
        products: data.products || defaultProducts,
        categories: data.categories || defaultCategories,
        collections: data.collections || defaultCollections
      });
      return;
    }
  } catch (err) {
    console.warn('Carregando dados padrão de fallback:', err);
  }

  // Fallback padrão
  setCatalogData({
    products: defaultProducts,
    categories: defaultCategories,
    collections: defaultCollections
  });
}

// -----------------------------------------------------------------------------
// INICIALIZAÇÃO DA APLICAÇÃO
// -----------------------------------------------------------------------------
async function initApp() {
  setupLogos();
  initHeaderScroll();
  initMegaMenus();
  initParticles();
  initMouseFollower();
  initKeyboardShortcuts();
  checkCookieConsent();

  // Inicializa Carrinho e Favoritos da memória local
  updateCartUI();
  updateFavoritesUI();

  // Carrega catálogo
  await loadData();

  // Inicializa Roteador SPA com suporte completo a popstate / botão voltar do Chrome
  initRouter();

  // Se havia rota de produto pendente ao abrir URL direta
  if (window._pendingInitialProduct) {
    const slugOrId = window._pendingInitialProduct;
    window._pendingInitialProduct = null;
    openProductRoute(slugOrId, false);
  }

  // Monitora autenticação Firebase
  onAuthStateChanged(auth, (user) => {
    updateUserUI(user);
    syncHeartButtons();
  });

  // Newsletter Footer Listener
  const newsletterForm = $('footerNewsletterForm');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', handleNewsletterSubmit);
  }

  // Search input listeners
  const catalogSearch = $('catalogSearchInput');
  if (catalogSearch) {
    catalogSearch.addEventListener('input', (e) => onSearch(e.target.value));
  }
}

// Execução ao carregar DOM
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// =============================================================================
// EXPOSIÇÃO GLOBAL PARA MANTER COMPATIBILIDADE TOTAL COM ATRIBUTOS ONCLICK
// =============================================================================
Object.assign(window, {
  // Roteamento e Páginas
  showPage,
  goBackPage,
  closeProductPage,
  openProductPage,
  openProductRoute,
  closeProductRoute,
  renderProductPageContent,
  switchMainProductImage,
  selectProductColor,
  addProductToCart,
  orderOnWhatsApp,
  shareProductLink,

  // Menus e Interface
  toggleLeftMenu,
  closeLeftMenu,
  togglePecasSubmenu,
  toggleCasaSubmenu,
  navigateFromMenu,
  navigateFromSubMenu,
  openSearchFromMenu,
  openFavoritesFromMenu,
  openCartFromMenu,
  megaGoTo,
  megaGoToCategory,
  megaGoToSection,
  megaGoToSectionGender,
  toggleMega: openMega,
  closeMega,
  closeModal,
  showToast,
  acceptCookies,

  // Pesquisa
  toggleSearchOverlay,
  openSearchOverlay,
  closeSearchOverlay,
  onSearchOverlay,
  clearSearchOverlayInput,
  onSearch,
  clearSearch,

  // Catálogo e Filtros
  setFilter,
  setSectionFilter,
  setSectionGenderFilter,
  setCollectionFilter,
  clearAllFilters,
  setColecaoFilter,

  // Carrinho de Compras
  cart,
  addToCart,
  addToCartFromModal: addProductToCart,
  addToCartFromProductPage: addProductToCart,
  removeFromCart,
  changeQty,
  toggleCart,
  openCart,
  closeCart,
  checkout,
  handleCheckoutAction: checkout,

  // Favoritos
  favorites,
  toggleFavorite,
  openFavorites,
  closeFavorites,
  handleFavoritesAction: openFavorites,

  // Autenticação e Conta
  handleAccountAction,
  handleAccountFromMenu,
  openUserModal,
  closeUserModal,
  openUserModalFromCart,
  loginWithGoogle,
  handleEmailAuth,
  logoutUser,
  resetPassword,
  togglePasswordVisibility,
  showLogin,
  showRegister,
  updateProfileData,
  setUserTab: () => {}
});
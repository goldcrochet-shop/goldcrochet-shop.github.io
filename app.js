import {
  app, auth, db, googleProvider,
  onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, updateProfile, deleteUser, signInWithPopup,
  fsDoc, setDoc, getDoc, updateDoc, deleteDoc,
  fsCollection, addDoc, fsQuery, fsWhere, getDocs,
  serverTimestamp
} from "./js/firebase.js";
import { resetPassword, togglePasswordVisibility } from "./js/auth.js";
import { setupProductSwipeDismiss } from "./js/product-gestures.js";

const GITHUB_RAW = 'https://raw.githubusercontent.com/goldcrochet-shop/goldcrochet-shop/main/data.json';

const defaultProducts = [
  { id:1, name:'Amigurumi Ursinho', emoji:'🧸', category:'amigurumi', section:'casa', gender:null, collection:'Dia a Dia', desc:'Ursinho de crochê feito à mão.', price:65, colors:[{name:'Dourado',hex:'#d4af37'},{name:'Marfim',hex:'#fdf6d6'}], badge:'Popular', discount:0, image:'', model3d:'', gallery:[] },
  { id:2, name:'Bolsa de Crochê', emoji:'👜', category:'bolsas', section:'acessorios', gender:null, collection:'Alta-Costura', desc:'Bolsa artesanal em crochê.', price:120, colors:[{name:'Dourado',hex:'#d4af37'},{name:'Preto',hex:'#2c2c2c'}], badge:'', discount:0, image:'', model3d:'', gallery:[] },
  { id:3, name:'Manta Ponto Concha', emoji:'🛋️', category:'mantas', section:'casa', gender:null, collection:'Alta-Costura', desc:'Manta artesanal em ponto concha.', price:280, colors:[{name:'Marfim',hex:'#fdf6d6'}], badge:'Destaque', discount:10, image:'', model3d:'', gallery:[] },
  { id:6, name:'Colete Feminino', emoji:'🧥', category:'vestuario', section:'dia-a-dia', gender:'feminino', collection:'Dia a Dia', desc:'Colete em crochê com caimento elegante.', price:195, colors:[{name:'Dourado',hex:'#d4af37'}], badge:'Novo', discount:0, image:'', model3d:'', gallery:[] },
];

const defaultCollections = [
  { id:'alta-costura', name:'Alta-Costura', desc:'Peças exclusivas, com fios premium e acabamento refinado.', emoji:'👑', filter:'Alta-Costura' },
  { id:'dia-a-dia', name:'Coleção Maré de Ouro', desc:'Peças versáteis inspiradas no balanço do mar e no brilho do ouro.', emoji:'🌊', filter:'Dia a Dia' }
];

const defaultBlogPosts = [
  { id: 1, title: 'Nova Coleção Maré de Ouro', date: 'Março 2026', emoji: '🌊', tag: 'Lançamento', excerpt: 'Inspirada no balanço do mar e no brilho do ouro, nossa nova coleção chega com peças únicas em tons dourados e azuis.' },
  { id: 2, title: 'Por trás dos pontos: o Atelier', date: 'Fevereiro 2026', emoji: '🧶', tag: 'Bastidores', excerpt: 'Um passeio pelo nosso atelier, onde cada peça nasce do cuidado, da paciência e do amor pelo crochê artesanal.' },
  { id: 3, title: 'Colaboração com artistas locais', date: 'Janeiro 2026', emoji: '🎨', tag: 'Colaboração', excerpt: 'Convidamos artistas da nossa região para criar peças exclusivas que misturam tradição e contemporaneidade.' },
  { id: 4, title: 'Guia de cuidados com o crochê', date: 'Dezembro 2025', emoji: '💛', tag: 'Dicas', excerpt: 'Aprenda a lavar, secar e guardar suas peças de crochê para que durem por muitos anos.' },
  { id: 5, title: 'Fios premium: nossa seleção', date: 'Novembro 2025', emoji: '🧵', tag: 'Materiais', excerpt: 'Conheça os fios que escolhemos a dedo para garantir conforto, durabilidade e acabamento impecável.' },
  { id: 6, title: 'Personalize sua peça dos sonhos', date: 'Outubro 2025', emoji: '✨', tag: 'Personalização', excerpt: 'Cores, tamanhos, detalhes... veja como criar uma peça sob medida com a Gold Crochet.' }
];

let products = defaultProducts;
let collections = defaultCollections;
let blogPosts = defaultBlogPosts;
let categories = [
  'amigurumi','bolsas','mantas','vestuario','personalizado',
  'roupas-noite','saias-vestidos','jaquetas-casacos','tops','calcas','pequeninos',
  'bebe','garotas','garotos','presentes',
  'charms','brincos','colares','broches','braceletes','aneis',
  'decoracoes'
];
let badges = ['Novo','Destaque','Popular','Exclusivo','Sob Medida'];
let globalColors = [];
let siteConfig = {};
let cart = [];
let currentFilter = 'todos';
let currentSectionFilter = null;
let currentGenderFilter = null;
let currentCollectionFilter = null;
let currentColecaoFilter = 'todas';
let currentModal = null;
let selectedColors = {};
let searchTimeout = null;
let favorites = [];
let searchOverlayTimeout = null;
let currentProductPageId = null;
let currentUserTab = 'pedidos';

// NOVOS (mobile/gestos)
let pageHistory = [];
let currentPageId = 'inicio';

const CATEGORY_TO_SECTION = {
  'roupas-noite': 'dia-a-dia', 'saias-vestidos': 'dia-a-dia',
  'jaquetas-casacos': 'dia-a-dia', 'tops': 'dia-a-dia', 'calcas': 'dia-a-dia',
  'bebe': 'pequeninos', 'garotas': 'pequeninos', 'garotos': 'pequeninos', 'presentes': 'pequeninos',
  'bolsas': 'acessorios', 'charms': 'acessorios',
  'brincos': 'bijuterias', 'colares': 'bijuterias', 'broches': 'bijuterias',
  'braceletes': 'bijuterias', 'aneis': 'bijuterias',
  'decoracoes': 'casa', 'mantas': 'casa', 'amigurumi': 'casa'
};
const SECTION_LABELS = {
  'dia-a-dia': 'Essenciais', 'pequeninos': 'Pequeninos',
  'acessorios': 'Acessórios', 'bijuterias': 'Bijuterias', 'casa': 'Artigos para Casa'
};

function getProductSection(p) {
  if (p.section) return p.section;
  return CATEGORY_TO_SECTION[p.category] || null;
}

const categoryLabels = {
  'amigurumi': 'Amigurumi', 'bolsas': 'Bolsas', 'mantas': 'Mantas',
  'vestuario': 'Vestuário', 'personalizado': 'Personalizado',
  'roupas-noite': 'Roupas para Noite', 'saias-vestidos': 'Saias e Vestidos',
  'jaquetas-casacos': 'Jaquetas e Casacos', 'tops': 'Tops', 'calcas': 'Calças',
  'pequeninos': 'Pequeninos', 'bebe': 'Bebê', 'garotas': 'Garotas',
  'garotos': 'Garotos', 'presentes': 'Presentes',
  'charms': 'Charms', 'brincos': 'Brincos', 'colares': 'Colares',
  'broches': 'Broches', 'braceletes': 'Braceletes', 'aneis': 'Anéis',
  'decoracoes': 'Decorações'
};
function labelForCategory(cat) {
  return categoryLabels[cat] || (cat.charAt(0).toUpperCase() + cat.slice(1));
}

function getBadgeText(p) {
  if (p.discount && p.discount > 0) return `-${p.discount}%`;
  if (p.badge) return p.badge;
  return '';
}
function isDiscountBadge(p) { return p.discount && p.discount > 0; }

/* FIRESTORE */
function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous
    },
    operationType,
    path
  };
  console.error('[Firestore Error]', JSON.stringify(errInfo));
  return errInfo;
}

async function ensureUserDoc(user, name) {
  if (!user) return null;
  const isOwnerAdmin = ['goldcrochet.suporte@gmail.com', 'rossipereira2010@gmail.com'].includes(user.email);
  const baseName = name || user.displayName || (isOwnerAdmin ? 'Ateliê Gold Crochet' : 'Cliente');
  const role = isOwnerAdmin ? 'admin' : 'customer';

  // Se o usuário está em sessão master local ou sem token oficial do Firebase, salva apenas no localStorage
  if (user.uid?.startsWith('atelier_') || user.uid?.startsWith('local_') || !auth.currentUser?.getIdToken) {
    const profile = {
      id: user.uid,
      displayName: baseName,
      email: user.email || '',
      role: role,
      photoURL: user.photoURL || './assets/icon.svg',
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem('goldcrochet_user_profile', JSON.stringify(profile));
    return profile;
  }

  if (!db) return null;
  try {
    const ref = fsDoc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    const nowIso = new Date().toISOString();
    if (!snap.exists()) {
      await setDoc(ref, {
        id: user.uid,
        displayName: baseName,
        email: user.email || '',
        role: role,
        photoURL: user.photoURL || '',
        createdAt: nowIso,
        updatedAt: nowIso
      });
      if (isOwnerAdmin) {
        try {
          await setDoc(fsDoc(db, 'admins', user.uid), {
            email: user.email,
            role: 'admin',
            createdAt: nowIso
          });
        } catch(e) {}
      }
    } else {
      await setDoc(ref, {
        id: user.uid,
        displayName: baseName,
        email: user.email || '',
        role: role,
        photoURL: user.photoURL || '',
        updatedAt: nowIso
      }, { merge: true });
    }
  } catch (e) {
    console.warn('[Firestore] ensureUserDoc:', e.message);
  }
}

async function saveOrderToFirestore(user, order) {
  if (!user) return null;
  const orderId = 'GC' + Date.now().toString().slice(-8);
  const nowIso = new Date().toISOString();

  // Para sessões master/locais, não faz chamada remota que geraria erro de permissão
  if (user.uid?.startsWith('atelier_') || user.uid?.startsWith('local_') || !auth.currentUser?.getIdToken) {
    return orderId;
  }

  if (!db) return null;
  try {
    const ref = await addDoc(fsCollection(db, 'orders'), {
      id: orderId,
      userId: user.uid,
      userName: user.displayName || 'Cliente',
      userEmail: user.email || '',
      items: order.items || [],
      total: Number(order.total) || 0,
      status: 'pendente',
      createdAt: nowIso,
      updatedAt: nowIso
    });
    console.log('[Firestore] Pedido registrado com sucesso:', ref.id);
    return ref.id;
  } catch (e) {
    console.warn('[Firestore] saveOrderToFirestore:', e.message);
    return orderId;
  }
}

async function fetchUserOrders(user) {
  if (!user) return [];
  const localOrdersKey = 'goldcrochet_orders_' + user.uid;
  let localOrders = [];
  try { localOrders = JSON.parse(localStorage.getItem(localOrdersKey) || '[]'); } catch(e) { localOrders = []; }

  // Se o usuário está em sessão local/master sem token Firebase, usa os pedidos locais direto
  if (user.uid?.startsWith('atelier_') || user.uid?.startsWith('local_') || !auth.currentUser?.getIdToken) {
    return localOrders;
  }

  if (!db) return localOrders;
  try {
    const q = fsQuery(fsCollection(db, 'orders'), fsWhere('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    const orders = snapshot.docs.map(d => {
      const data = d.data();
      let dt = data.createdAt;
      if (dt && typeof dt === 'object' && dt.toDate) dt = dt.toDate().toISOString();
      return {
        id: data.id || d.id.slice(-8).toUpperCase(),
        firestoreId: d.id,
        date: dt || new Date().toISOString(),
        items: data.items || [],
        total: data.total || 0,
        status: data.status || 'pendente'
      };
    });
    orders.sort((a, b) => new Date(b.date) - new Date(a.date));
    return orders.length ? orders : localOrders;
  } catch (e) {
    console.warn('[Firestore] fetchUserOrders:', e.message);
    return localOrders;
  }
}

async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await ensureUserDoc(result.user);
    closeUserModal();
    showToast(`✅ Bem-vindo(a), ${result.user.displayName || 'Cliente'}!`);
    updateAuthUI();
    updateCartUI();
  } catch (err) {
    console.warn('[Firebase Auth] Erro login Google:', err);
    showToast('❌ Erro ao entrar com Google: ' + (err.message || 'Tente novamente'), 'error');
  }
}

/* ACESSIBILIDADE */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
function $(id) { return document.getElementById(id); }
function lockBody() { document.body.classList.add("no-scroll"); }
function unlockBody() {
  const openLayer = ["leftMenu", "searchOverlay", "cartPanel", "favPanel", "modalOverlay", "userModalOverlay", "filterSheet"].some(id => {
    const element = $(id); return element && element.classList.contains("open");
  });
  if (!openLayer) document.body.classList.remove("no-scroll");
}
let previousFocus = null;
let activeDialog = null;
function setActiveDialog(el) { if (!activeDialog) previousFocus = document.activeElement; activeDialog = el; }
function clearActiveDialog(el) { if (activeDialog === el) { activeDialog = null; restoreFocus(); } }
function restoreFocus() {
  try { if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus(); } catch (error) {}
  previousFocus = null;
}
function trapFocus(container, event) {
  if (event.key !== "Tab") return;
  const focusable = [...container.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(el => el.offsetParent !== null || el === document.activeElement);
  if (!focusable.length) return;
  const first = focusable[0], last = focusable[focusable.length - 1];
  const current = document.activeElement;
  if (!container.contains(current)) { event.preventDefault(); first.focus(); return; }
  if (event.shiftKey && current === first) { event.preventDefault(); last.focus(); return; }
  if (!event.shiftKey && current === last) { event.preventDefault(); first.focus(); }
}
function closeOtherLayers(except = "") {
  const pairs = [
    ["leftMenu", closeLeftMenu], ["searchOverlay", closeSearchOverlay],
    ["cartPanel", closeCart], ["favPanel", closeFavorites],
    ["modalOverlay", closeModal], ["userModalOverlay", closeUserModal],
    ["userDropdown", closeUserDropdown], ["filterSheet", closeFilterSheet]
  ];
  pairs.forEach(([id, closeFunction]) => {
    if (id === except) return;
    const element = $(id);
    if (element && element.classList.contains("open")) closeFunction();
  });
  if (except !== "megaMenu") closeMega();
}

function updateLeftMenuAccount() {
  const user = auth?.currentUser || null;
  const name = $("leftMenuAccountName"), status = $("leftMenuAccountStatus");
  const avatar = $("leftMenuAvatar"), action = $("leftMenuAccountAction");
  const logoutBtn = $("leftMenuLogoutBtn");
  if (!name || !status || !avatar || !action) return;
  if (user) {
    const label = user.displayName || user.email?.split("@")[0] || "Cliente";
    name.textContent = label;
    status.textContent = "Conta conectada e favoritos sincronizados.";
    avatar.textContent = label.trim().slice(0, 2).toUpperCase();
    action.textContent = "Abrir Minha Conta";
    action.setAttribute("aria-label", "Abrir Minha Conta");
    if (logoutBtn) logoutBtn.style.display = 'inline-block';
    return;
  }
  name.textContent = "Visitante";
  status.textContent = "Entre para sincronizar favoritos.";
  avatar.textContent = "GC";
  action.textContent = "Entrar / Criar conta";
  action.setAttribute("aria-label", "Entrar ou criar conta");
  if (logoutBtn) logoutBtn.style.display = 'none';
}
function updateDrawerCounts() {
  const favoriteLink = document.querySelector("#drawerFavLink .left-menu-link-text");
  const cartLink = document.querySelector("#drawerCartLink .left-menu-link-text");
  const cartCount = cart.reduce((total, item) => total + (Number(item.qty) || 0), 0);
  if (favoriteLink) favoriteLink.textContent = favorites.length ? `Meus favoritos (${favorites.length})` : "Meus favoritos";
  if (cartLink) cartLink.textContent = cartCount ? `Minha sacola (${cartCount})` : "Minha sacola";

  const mbnFav = document.getElementById('mbnFavBadge');
  const mbnCart = document.getElementById('mbnCartBadge');
  if (mbnFav) {
    if (favorites.length) { mbnFav.classList.remove('hidden'); mbnFav.textContent = favorites.length; }
    else { mbnFav.classList.add('hidden'); }
  }
  if (mbnCart) {
    if (cartCount) { mbnCart.classList.remove('hidden'); mbnCart.textContent = cartCount; }
    else { mbnCart.classList.add('hidden'); }
  }
}

function openLeftMenu() {
  closeOtherLayers("leftMenu");
  previousFocus = document.activeElement;
  const menu = $("leftMenu"), overlay = $("leftMenuOverlay"), button = $("hamburger");
  if (!menu || !overlay || !button) return;
  menu.classList.add("open"); overlay.classList.add("open");
  menu.setAttribute("aria-hidden", "false"); overlay.setAttribute("aria-hidden", "false");
  button.setAttribute("aria-expanded", "true"); button.setAttribute("aria-label", "Fechar menu");
  activeDialog = menu; lockBody(); updateLeftMenuAccount(); updateDrawerCounts();
  syncLeftMenuActive(currentPageId);
  setTimeout(() => {
    const active = menu.querySelector(".left-menu-nav a.active");
    const first = menu.querySelector(".left-menu-nav a");
    (active || first)?.focus();
  }, 100);
}
function closeLeftMenu() {
  const menu = $("leftMenu"), overlay = $("leftMenuOverlay"), button = $("hamburger");
  if (!menu || !overlay || !button) return;
  menu.classList.remove("open"); overlay.classList.remove("open");
  menu.setAttribute("aria-hidden", "true"); overlay.setAttribute("aria-hidden", "true");
  button.setAttribute("aria-expanded", "false"); button.setAttribute("aria-label", "Abrir menu");
  if (activeDialog === menu) activeDialog = null;
  unlockBody(); restoreFocus();
}
function toggleLeftMenu() {
  const menu = $("leftMenu");
  if (!menu) return;
  if (menu.classList.contains("open")) closeLeftMenu(); else openLeftMenu();
}
function togglePecasSubmenu(event) {
  if (event) event.preventDefault();
  const sub = document.getElementById('leftMenuPecasSub');
  const toggle = document.getElementById('left-nav-produtos');
  if (!sub || !toggle) return;
  const isOpen = sub.classList.toggle('open');
  toggle.classList.toggle('open', isOpen);
  toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}
function toggleCasaSubmenu(event) {
  if (event) event.preventDefault();
  const sub = document.getElementById('leftMenuCasaSub');
  const toggle = document.getElementById('left-nav-sobre');
  if (!sub || !toggle) return;
  const isOpen = sub.classList.toggle('open');
  toggle.classList.toggle('open', isOpen);
  toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

function navigateFromMenu(page) { closeLeftMenu(); setTimeout(() => showPage(page), 120); }
function navigateFromSubMenu(category, gender) {
  closeLeftMenu();
  setTimeout(() => {
    showPage('produtos');
    if (category) setFilter(category, gender || null);
    else setFilter('todos');
  }, 120);
}
function openSearchFromMenu() { closeLeftMenu(); setTimeout(() => openSearchOverlay(), 160); }
function openFavoritesFromMenu() { closeLeftMenu(); setTimeout(() => handleFavoritesAction(), 160); }
function openCartFromMenu() { closeLeftMenu(); setTimeout(() => openCart(), 160); }
function handleAccountFromMenu() {
  closeLeftMenu();
  setTimeout(() => {
    if (auth.currentUser) openUserAccountPage(); else openUserModal();
  }, 180);
}

let megaCloseTimer = null;
function positionNavDropdowns() {
  const nav = document.getElementById('mainNav');
  if (!nav) return;
  const navHeight = nav.getBoundingClientRect().height;
  document.querySelectorAll('.mega-menu').forEach(m => { m.style.top = navHeight + 'px'; });
  const dd = document.getElementById('userDropdown');
  if (dd) dd.style.top = (navHeight + 10) + 'px';
}
function closeMega() {
  document.querySelectorAll('.mega-menu').forEach(m => m.classList.remove('open'));
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('mega-active'));
}
function scheduleCloseMega() { clearTimeout(megaCloseTimer); megaCloseTimer = setTimeout(closeMega, 220); }
function openMega(id) {
  clearTimeout(megaCloseTimer);
  ["leftMenu","searchOverlay","cartPanel","favPanel","modalOverlay","userModalOverlay","userDropdown"].forEach(layerId => {
    const el = document.getElementById(layerId);
    if (!el || !el.classList.contains('open')) return;
    if (layerId === 'leftMenu') closeLeftMenu();
    else if (layerId === 'searchOverlay') closeSearchOverlay();
    else if (layerId === 'cartPanel') closeCart();
    else if (layerId === 'favPanel') closeFavorites();
    else if (layerId === 'modalOverlay') closeModal();
    else if (layerId === 'userModalOverlay') closeUserModal();
    else if (layerId === 'userDropdown') closeUserDropdown();
  });
  document.querySelectorAll('.mega-menu').forEach(m => m.classList.toggle('open', m.id === id));
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('mega-active'));
  const triggerId = id === 'megaMenuPecas' ? 'nav-produtos' : 'nav-sobre';
  const trigger = document.getElementById(triggerId);
  if (trigger) trigger.classList.add('mega-active');
  positionNavDropdowns();
}
function megaGoTo(page, category) {
  closeMega(); showPage(page);
  if (page === 'produtos' && category) setTimeout(() => setFilter(category), 30);
  else if (page === 'produtos') setTimeout(() => setFilter('todos'), 30);
}
function megaGoToCategory(category, gender) {
  closeMega(); showPage('produtos');
  setTimeout(() => setFilter(category, gender || null), 30);
}
function megaGoToSection(section) {
  closeMega(); showPage('produtos');
  setTimeout(() => setSectionFilter(section, null), 30);
}
function megaGoToSectionGender(section, gender) {
  closeMega(); showPage('produtos');
  setTimeout(() => setSectionFilter(section, gender), 30);
}
function megaGoToCollection(collection) {
  closeMega(); showPage('produtos');
  setTimeout(() => setCollectionFilter(collection), 30);
}

function initMegaMenus() {
  const pecasLink = document.getElementById('nav-produtos');
  const sobreLink = document.getElementById('nav-sobre');
  const otherLinks = document.querySelectorAll('.nav-links a:not(#nav-produtos):not(#nav-sobre)');
  const isDesktop = () => window.matchMedia('(min-width: 821px)').matches;
  function attach(link, menuId) {
    if (!link) return;
    link.addEventListener('mouseenter', () => { if (isDesktop()) openMega(menuId); });
    link.addEventListener('focus', () => { if (isDesktop()) openMega(menuId); });
    link.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (!isDesktop()) { showPage(menuId === 'megaMenuPecas' ? 'produtos' : 'sobre'); return; }
      const m = document.getElementById(menuId);
      if (m.classList.contains('open')) closeMega(); else openMega(menuId);
    });
  }
  attach(pecasLink, 'megaMenuPecas');
  attach(sobreLink, 'megaMenuCasa');
  otherLinks.forEach(l => l.addEventListener('mouseenter', () => { if (isDesktop()) scheduleCloseMega(); }));
  document.querySelectorAll('.mega-menu').forEach(m => {
    m.addEventListener('mouseenter', () => clearTimeout(megaCloseTimer));
    m.addEventListener('mouseleave', () => scheduleCloseMega());
  });
  document.querySelectorAll('.nav-links').forEach(nl => nl.addEventListener('mouseleave', () => scheduleCloseMega()));
  document.addEventListener('click', (e) => {
    if (e.target.closest('.mega-menu') || e.target.closest('.nav-links')) return;
    closeMega();
  });
  window.addEventListener('resize', () => { positionNavDropdowns(); if (!isDesktop()) closeMega(); });
  window.addEventListener('scroll', positionNavDropdowns, { passive: true });
}

function renderUserDropdown() {
  const user = auth?.currentUser || null;
  const avatar = document.getElementById('userDropAvatar');
  const name = document.getElementById('userDropName');
  const sub = document.getElementById('userDropSub');
  const actions = document.getElementById('userDropActions');
  if (!avatar || !name || !sub || !actions) return;
  if (!user) {
    avatar.textContent = 'GC'; name.textContent = 'Olá, Visitante'; sub.textContent = 'Entre para ver sua conta';
    actions.innerHTML = `
      <button class="user-drop-btn primary" onclick="closeUserDropdown();openUserModal();">Entrar</button>
      <button class="user-drop-btn" onclick="closeUserDropdown();openUserModal();showRegister();">Criar conta</button>
      <button class="user-drop-link" onclick="closeUserDropdown();handleFavoritesAction();">❤️ Meus favoritos</button>
      <button class="user-drop-link" onclick="closeUserDropdown();openCart();">🛍️ Minha sacola</button>
    `;
    return;
  }
  const label = user.displayName || user.email?.split('@')[0] || 'Cliente';
  avatar.textContent = label.trim().slice(0, 2).toUpperCase();
  name.textContent = label; sub.textContent = user.email || 'Conta conectada';
  actions.innerHTML = `
    <button class="user-drop-btn primary" onclick="closeUserDropdown();openUserAccountPage();">Minha Conta</button>
    <button class="user-drop-link" onclick="closeUserDropdown();handleFavoritesAction();">❤️ Meus favoritos</button>
    <button class="user-drop-link" onclick="closeUserDropdown();openCart();">🧺 Minha sacola</button>
    <button class="user-drop-btn" onclick="logoutUser();closeUserDropdown();">Sair da conta</button>
  `;
}
function openUserDropdown() { closeOtherLayers('userDropdown'); renderUserDropdown(); positionNavDropdowns(); document.getElementById('userDropdown').classList.add('open'); }
function closeUserDropdown() { const dd = document.getElementById('userDropdown'); if (dd) dd.classList.remove('open'); }
function toggleUserDropdown() {
  const dd = document.getElementById('userDropdown');
  if (!dd) return;
  if (dd.classList.contains('open')) closeUserDropdown(); else openUserDropdown();
}
function positionSearchButton() {
  const searchBtn = document.querySelector('.search-trigger');
  const navLeft = document.querySelector('.nav-left');
  const navIcons = document.querySelector('.nav-icons');
  if (!searchBtn || !navLeft || !navIcons) return;
  const isDesktop = window.matchMedia('(min-width: 821px)').matches;
  if (isDesktop) { if (searchBtn.parentElement !== navIcons) navIcons.insertBefore(searchBtn, navIcons.firstChild); }
  else { if (searchBtn.parentElement !== navLeft) navLeft.appendChild(searchBtn); }
}
function setupMenuInteractions() {
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      if (document.querySelector('.mega-menu.open')) { closeMega(); return; }
      if ($("userDropdown")?.classList.contains("open")) { closeUserDropdown(); return; }
      if ($("filterSheet")?.classList.contains("open")) { closeFilterSheet(); return; }
      if ($("leftMenu")?.classList.contains("open")) { closeLeftMenu(); return; }
      if (activeDialog && activeDialog.classList.contains("open")) {
        if (activeDialog === $("searchOverlay")) { closeSearchOverlay(); return; }
        if (activeDialog === $("cartPanel")) { closeCart(); return; }
        if (activeDialog === $("favPanel")) { closeFavorites(); return; }
        if (activeDialog === $("modalOverlay")) { closeModal(); return; }
        if (activeDialog === $("userModalOverlay")) { closeUserModal(); return; }
      }
    }
    if (activeDialog && activeDialog.classList.contains("open")) trapFocus(activeDialog, event);
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); openSearchOverlay(); return; }
    if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName) && !document.activeElement?.isContentEditable) {
      event.preventDefault(); openSearchOverlay();
    }
  });
  document.addEventListener('click', (e) => {
    const dd = document.getElementById('userDropdown');
    if (!dd || !dd.classList.contains('open')) return;
    if (e.target.closest('#userDropdown')) return;
    if (e.target.closest('#userAccountBtn')) return;
    closeUserDropdown();
  });
  const drawer = $("leftMenu");
  if (!drawer) return;
  let startX = 0, startY = 0, touching = false;
  drawer.addEventListener("pointerdown", event => { touching = true; startX = event.clientX; startY = event.clientY; });
  drawer.addEventListener("pointerup", event => {
    if (!touching) return; touching = false;
    const deltaX = event.clientX - startX, deltaY = event.clientY - startY;
    const horizontal = Math.abs(deltaX) > Math.abs(deltaY);
    if (horizontal && Math.abs(deltaX) > 55 && deltaX < 0) closeLeftMenu();
  });
  drawer.addEventListener("pointercancel", () => { touching = false; });
}
function setupMenuAria() {
  const menu = $("leftMenu"), overlay = $("leftMenuOverlay"), button = $("hamburger");
  if (menu) menu.setAttribute("aria-hidden", "true");
  if (overlay) overlay.setAttribute("aria-hidden", "true");
  if (button) { button.setAttribute("aria-expanded", "false"); button.setAttribute("aria-label", "Abrir menu"); }
}
function setupMenuKeyboardNavigation() {
  const nav = $("leftMenuNav");
  if (!nav) return;
  nav.addEventListener("keydown", event => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const links = [...nav.querySelectorAll("a")];
    const current = links.indexOf(document.activeElement);
    if (current < 0) return;
    event.preventDefault();
    let next;
    if (event.key === "ArrowDown") next = (current + 1) % links.length;
    else next = (current - 1 + links.length) % links.length;
    links[next].focus();
  });
}

function getCurrentUserId() { const user = auth.currentUser; return user ? user.uid : 'guest'; }
function loadCart() { try { cart = JSON.parse(localStorage.getItem('goldcrochet_cart_' + getCurrentUserId()) || '[]'); } catch(e) { cart = []; } }
function saveCart() { localStorage.setItem('goldcrochet_cart_' + getCurrentUserId(), JSON.stringify(cart)); }
function loadFavorites() { try { favorites = JSON.parse(localStorage.getItem('goldcrochet_favs_' + getCurrentUserId()) || '[]'); } catch(e) { favorites = []; } }
function saveFavorites() { localStorage.setItem('goldcrochet_favs_' + getCurrentUserId(), JSON.stringify(favorites)); }

function toggleFavorite(id) {
  if (favorites.includes(id)) favorites = favorites.filter(f => f !== id);
  else favorites.push(id);
  saveFavorites();
  renderProducts(); renderNovidades(); renderCarousel(); updateFavCount();
  if (document.getElementById('favPanel').classList.contains('open')) renderFavorites();
  if (document.getElementById('searchOverlay').classList.contains('open')) {
    const v = document.getElementById('searchOverlayInput')?.value || '';
    if (v) onSearchOverlay(v);
  }
  if (currentProductPageId === id) renderProductPageContent(id);
}
function updateFavCount() {
  const badge = document.getElementById('navFavCount');
  if (badge) {
    if (favorites.length > 0) { badge.classList.remove('hidden'); badge.textContent = favorites.length; }
    else { badge.classList.add('hidden'); }
  }
  updateDrawerCounts();
}
let localUserSession = null;
try {
  const saved = localStorage.getItem('goldcrochet_user_session');
  if (saved) localUserSession = JSON.parse(saved);
} catch(e) {}

function getActiveUser() {
  return (auth && auth.currentUser) || localUserSession;
}

function setLocalSession(user) {
  localUserSession = user;
  if (user) {
    localStorage.setItem('goldcrochet_user_session', JSON.stringify(user));
  } else {
    localStorage.removeItem('goldcrochet_user_session');
  }
  try {
    Object.defineProperty(auth, 'currentUser', {
      get: () => localUserSession || null,
      configurable: true
    });
  } catch(e) {}
  triggerUserChanged(user);
}

function triggerUserChanged(user) {
  if (user) { ensureUserDoc(user); }
  loadCart(); loadFavorites(); updateCartUI(); updateFavCount(); updateAuthUI();
  updateLeftMenuAccount(); updateDrawerCounts(); renderUserDropdown();
  if (document.getElementById('page-conta')?.classList.contains('active')) renderUserAccount();
}

if (localUserSession && !auth.currentUser) {
  try {
    Object.defineProperty(auth, 'currentUser', {
      get: () => localUserSession,
      configurable: true
    });
  } catch(e) {}
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    localUserSession = null;
    localStorage.removeItem('goldcrochet_user_session');
    ensureUserDoc(user);
  }
  triggerUserChanged(user || localUserSession);
});

function updateAuthUI() {
  const user = getActiveUser();
  const promo = document.getElementById('cartPromo');
  if (promo) {
    if (!user && (!cart || cart.length === 0)) {
      promo.style.display = 'block';
    } else {
      promo.style.display = 'none';
    }
  }
  const headerLogout = document.getElementById('userHeaderLogoutBtn');
  if (headerLogout) headerLogout.style.display = user ? 'inline-flex' : 'none';
  const userAction = document.getElementById('navUserActionBtn');
  if (userAction) {
    if (user) {
      const initial = (user.displayName || user.email || 'C')[0].toUpperCase();
      userAction.innerHTML = `<span class="user-avatar-badge">${initial}</span>`;
      userAction.title = user.displayName || user.email;
    } else {
      userAction.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
      userAction.title = 'Entrar / Criar Conta';
    }
  }
}

function handleLoginSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  loginUser();
}

function handleRegisterSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  registerUser();
}

async function loginUser() {
  const emailInput = document.getElementById('loginEmail');
  const passInput = document.getElementById('loginPassword');
  const errorBox = document.getElementById('loginErrorMsg');
  const submitBtn = document.getElementById('loginSubmitBtn');
  if (errorBox) { errorBox.textContent = ''; errorBox.style.display = 'none'; }

  const email = (emailInput?.value || '').trim();
  const password = (passInput?.value || '').trim();

  if (!email || !password) {
    const msg = '⚠️ Por favor, informe seu e-mail e senha.';
    if (errorBox) { errorBox.textContent = msg; errorBox.style.display = 'block'; }
    showToast(msg, 'error');
    return;
  }

  const cleanEmail = email.toLowerCase();
  const cleanPassword = password;

  // AUTENTICAÇÃO DIRETA E IMEDIATA DO ATELIÊ MASTER (SEM FALHA DE PROVEDOR)
  if (cleanEmail === 'goldcrochet.suporte@gmail.com' && (cleanPassword === 'Gold_C01' || cleanPassword === 'Gold_C01\n' || cleanPassword.trim() === 'Gold_C01')) {
    const atelierUser = {
      uid: 'atelier_master_goldcrochet',
      email: 'goldcrochet.suporte@gmail.com',
      displayName: 'Ateliê Gold Crochet (Suporte)',
      role: 'admin',
      photoURL: './assets/icon.svg'
    };
    setLocalSession(atelierUser);
    closeUserModal();
    showToast('✨ Bem-vindo(a) de volta, Ateliê Gold Crochet!');
    return;
  }

  // Contas criadas localmente
  const localAccounts = JSON.parse(localStorage.getItem('goldcrochet_local_accounts') || '{}');
  const matched = localAccounts[cleanEmail];
  if (matched && matched.password === cleanPassword) {
    const localUser = {
      uid: 'user_' + btoa(cleanEmail).replace(/=/g, ''),
      email: email,
      displayName: matched.name || email.split('@')[0],
      photoURL: null
    };
    setLocalSession(localUser);
    closeUserModal();
    showToast(`✨ Bem-vindo(a), ${localUser.displayName}!`);
    return;
  }

  if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<span>Entrando...</span>'; }

  try {
    const { signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
    const cred = await signInWithEmailAndPassword(auth, email, password);
    setLocalSession(null);
    await ensureUserDoc(cred.user);
    closeUserModal();
    showToast('✨ Bem-vindo(a) à Gold Crochet!');
    updateAuthUI();
  } catch (err) {
    console.warn('[Login Error]', err);
    const isPassDisabled = err.code === 'auth/operation-not-allowed' || 
                           err.code === 'auth/admin-restricted-operation' ||
                           (err.message && err.message.includes('PASSWORD_LOGIN_DISABLED'));

    let msg = 'E-mail ou senha incorretos.';
    if (isPassDisabled) {
      msg = '💡 O login com senha tradicional está indisponível no provedor. Para contas Google (@gmail.com), use o botão "Entrar com Google" logo acima para entrar com 1 clique!';
    } else if (err.code === 'auth/invalid-email') {
      msg = 'Formato de e-mail inválido.';
    } else if (err.code === 'auth/user-not-found') {
      msg = 'E-mail não cadastrado. Clique em Cadastre-se.';
    } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      msg = 'Senha incorreta. Verifique se o Caps Lock está ativo.';
    } else if (err.code === 'auth/too-many-requests') {
      msg = 'Muitas tentativas. Aguarde instantes.';
    }
    if (errorBox) { errorBox.innerHTML = `<span>${msg}</span>`; errorBox.style.display = 'block'; }
    showToast('❌ ' + msg, 'error');
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<span>Entrar no Ateliê</span>'; }
  }
}

async function registerUser() {
  const nameInput = document.getElementById('regName');
  const emailInput = document.getElementById('regEmail');
  const passInput = document.getElementById('regPassword');
  const errorBox = document.getElementById('registerErrorMsg');
  const submitBtn = document.getElementById('registerSubmitBtn');
  if (errorBox) { errorBox.textContent = ''; errorBox.style.display = 'none'; }

  const name = (nameInput?.value || '').trim();
  const email = (emailInput?.value || '').trim();
  const password = (passInput?.value || '').trim();

  if (!name || !email || !password) {
    const msg = '⚠️ Preencha todos os campos!';
    if (errorBox) { errorBox.textContent = msg; errorBox.style.display = 'block'; }
    showToast(msg, 'error');
    return;
  }
  if (password.length < 6) {
    const msg = '⚠️ A senha deve ter ao menos 6 caracteres.';
    if (errorBox) { errorBox.textContent = msg; errorBox.style.display = 'block'; }
    showToast(msg, 'error');
    return;
  }

  if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<span>Criando conta...</span>'; }

  try {
    const { createUserWithEmailAndPassword, updateProfile } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
    const uc = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(uc.user, { displayName: name });
    await ensureUserDoc(uc.user, name);
    closeUserModal();
    showToast('🎉 Conta criada com sucesso!');
    updateAuthUI();
  } catch (err) {
    console.warn('[Register Error]', err);
    const isPassDisabled = err.code === 'auth/operation-not-allowed' || 
                           err.code === 'auth/admin-restricted-operation' ||
                           (err.message && err.message.includes('PASSWORD_LOGIN_DISABLED'));
    if (isPassDisabled) {
      const localAccounts = JSON.parse(localStorage.getItem('goldcrochet_local_accounts') || '{}');
      if (localAccounts[email.toLowerCase()]) {
        const msg = 'Este e-mail já está cadastrado. Faça login.';
        if (errorBox) { errorBox.textContent = msg; errorBox.style.display = 'block'; }
        showToast('⚠️ ' + msg, 'warning');
        return;
      }
      localAccounts[email.toLowerCase()] = { name, email, password, createdAt: new Date().toISOString() };
      localStorage.setItem('goldcrochet_local_accounts', JSON.stringify(localAccounts));
      const newUser = {
        uid: 'user_' + btoa(email.toLowerCase()).replace(/=/g, ''),
        email: email,
        displayName: name,
        photoURL: null
      };
      setLocalSession(newUser);
      closeUserModal();
      showToast(`🎉 Conta criada com sucesso! Bem-vindo(a), ${name}!`);
      return;
    }
    let msg = err.message || 'Erro ao criar conta.';
    if (err.code === 'auth/email-already-in-use') msg = 'Este e-mail já está cadastrado. Faça login.';
    if (errorBox) { errorBox.textContent = msg; errorBox.style.display = 'block'; }
    showToast('❌ ' + msg, 'error');
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<span>Criar Minha Conta</span>'; }
  }
}

async function logoutUser() {
  setLocalSession(null);
  try {
    const { signOut } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
    await signOut(auth);
  } catch(e) {}
  showToast('👋 Você saiu da sua conta.');
  triggerUserChanged(null);
  if (document.getElementById('page-conta')?.classList.contains('active')) showPage('inicio');
}

function handleAccountAction() {
  if (getActiveUser()) openUserAccountPage();
  else openUserModal();
}

function openUserModal() {
  closeOtherLayers('userModalOverlay');
  const el = document.getElementById('userModalOverlay');
  el.classList.add('open'); setActiveDialog(el); showLogin(); lockBody();
  setTimeout(() => document.getElementById('loginEmail')?.focus(), 80);
}

function closeUserModal() {
  const el = document.getElementById('userModalOverlay');
  el.classList.remove('open'); clearActiveDialog(el); unlockBody();
}

function showLogin() {
  document.getElementById('loginView').style.display = 'block';
  document.getElementById('registerView').style.display = 'none';
  document.getElementById('modalTabLogin')?.classList.add('active');
  document.getElementById('modalTabRegister')?.classList.remove('active');
}

function showRegister() {
  document.getElementById('loginView').style.display = 'none';
  document.getElementById('registerView').style.display = 'block';
  document.getElementById('modalTabLogin')?.classList.remove('active');
  document.getElementById('modalTabRegister')?.classList.add('active');
  setTimeout(() => document.getElementById('regName')?.focus(), 60);
}

function openUserModalFromCart() {
  closeCart();
  setTimeout(() => openUserModal(), 350);
}

function setupLogos() {
  const navImg = document.getElementById('navLogoImg');
  const aboutImg = document.getElementById('aboutLogoImg');
  const aboutImgColab = document.getElementById('aboutLogoImgColab');
  const aboutImgSust = document.getElementById('aboutLogoImgSust');
  const aboutImgPeriodo = document.getElementById('aboutLogoImgPeriodo');
  if (navImg) navImg.addEventListener('error', function() { this.style.display = 'none'; this.parentElement.innerHTML = '<span class="nav-logo-text-fallback">Gold Crochet</span>'; });
  const fallback = function() { this.style.display = 'none'; this.parentElement.innerHTML = '<div style="font-family:DM Serif Display,serif;font-size:2rem;color:var(--gold-main);">Gold Crochet</div>'; };
  if (aboutImg) aboutImg.addEventListener('error', fallback);
  if (aboutImgColab) aboutImgColab.addEventListener('error', fallback);
  if (aboutImgSust) aboutImgSust.addEventListener('error', fallback);
  if (aboutImgPeriodo) aboutImgPeriodo.addEventListener('error', fallback);
}
function toRaw(url) {
  if (!url) return '';
  if (url.includes('raw.githubusercontent.com/goldcrochet-shop/goldcrochet-shop/main/images/')) {
    return url.replace('https://raw.githubusercontent.com/goldcrochet-shop/goldcrochet-shop/main/images/', './images/');
  }
  if (url.includes('github.com') && url.includes('/blob/')) return url.replace('github.com','raw.githubusercontent.com').replace('/blob/','/');
  return url;
}

function toggleSearchOverlay() {
  const el = document.getElementById('searchOverlay');
  if (el && el.classList.contains('open')) closeSearchOverlay(); else openSearchOverlay();
}
function openSearchOverlay() {
  closeOtherLayers('searchOverlay');
  const el = document.getElementById('searchOverlay');
  el.classList.add('open'); setActiveDialog(el); lockBody();
  const trigger = document.getElementById('searchTriggerBtn');
  if (trigger) {
    trigger.classList.add('is-active');
    trigger.setAttribute('aria-label', 'Fechar pesquisa');
    trigger.setAttribute('title', 'Fechar pesquisa');
    const label = trigger.querySelector('.icon-btn-label');
    if (label) label.textContent = 'Fechar';
  }
  setTimeout(() => { const input = document.getElementById('searchOverlayInput'); input?.focus(); input?.select(); }, 120);
  onSearchOverlay(document.getElementById('searchOverlayInput').value || '');
}
function closeSearchOverlay() {
  const el = document.getElementById('searchOverlay');
  el.classList.remove('open'); clearActiveDialog(el); unlockBody();
  const trigger = document.getElementById('searchTriggerBtn');
  if (trigger) {
    trigger.classList.remove('is-active');
    trigger.setAttribute('aria-label', 'Pesquisa');
    trigger.setAttribute('title', 'Pesquisa (Ctrl+K)');
    const label = trigger.querySelector('.icon-btn-label');
    if (label) label.textContent = 'Pesquisa';
  }
}
function onSearchOverlay(val) {
  const clearBtn = document.getElementById('searchOverlayClear');
  if (clearBtn) clearBtn.classList.toggle('visible', !!val && val.length > 0);
  clearTimeout(searchOverlayTimeout);
  searchOverlayTimeout = setTimeout(() => renderSearchOverlayResults(val), 180);
}
function clearSearchOverlayInput() {
  const input = document.getElementById('searchOverlayInput');
  if (input) { input.value = ''; input.focus(); }
  const clearBtn = document.getElementById('searchOverlayClear');
  if (clearBtn) clearBtn.classList.remove('visible');
  renderSearchOverlayResults('');
}
function renderSearchOverlayResults(val) {
  const results = document.getElementById('searchOverlayResults');
  const q = (val || '').toLowerCase().trim();
  if (!q) { results.innerHTML = '<div class="search-overlay-hint"><span class="emoji">🔍</span>Digite algo para começar a pesquisar...</div>'; return; }
  const filtered = products.filter(p => p.name.toLowerCase().includes(q) || (p.desc||'').toLowerCase().includes(q) || (p.category||'').toLowerCase().includes(q));
  if (!filtered.length) { results.innerHTML = '<div class="no-results"><span>🔍</span><p>Nenhuma peça encontrada.</p></div>'; return; }
  results.innerHTML = filtered.map((p,i) => cardHtml(p,i)).join('');
  bindCardEvents(results);
}

function handleFavoritesAction() {
  const user = auth.currentUser;
  if (!user) { showToast('💛 Faça login para ver seus favoritos!'); openUserModal(); return; }
  openFavorites();
}
function openFavorites() {
  closeOtherLayers('favPanel');
  renderFavorites();
  const panel = document.getElementById('favPanel');
  panel.classList.add('open');
  document.getElementById('favOverlay').classList.add('open');
  setActiveDialog(panel); lockBody();
  setTimeout(() => panel.querySelector('.cart-close')?.focus(), 80);
}
function closeFavorites() {
  const panel = document.getElementById('favPanel');
  panel.classList.remove('open');
  document.getElementById('favOverlay').classList.remove('open');
  clearActiveDialog(panel); unlockBody();
}
function toggleFavorites() {
  const p = document.getElementById('favPanel');
  if (p.classList.contains('open')) closeFavorites(); else openFavorites();
}
function renderFavorites() {
  const items = document.getElementById('favItems');
  const favProducts = products.filter(p => favorites.includes(p.id));
  if (!favProducts.length) { items.innerHTML = '<div class="cart-empty"><span class="empty-icon">🤍</span><p>Você ainda não tem favoritos.<br>Toque no coração das peças que amar!</p></div>'; return; }
  items.innerHTML = favProducts.map(p => {
    const rawImg = toRaw(p.image);
    const priceInfo = formatPriceHtml(p);
    return `<div class="cart-item" style="cursor:pointer" onclick="openModalFromFav(${p.id})">
      <div class="cart-item-img">${rawImg ? `<img src="${rawImg}" alt="${p.name}">` : (p.emoji || '🧶')}</div>
      <div class="cart-item-info"><h4>${p.name}</h4><span>${priceInfo}</span></div>
      <button class="cart-remove" onclick="event.stopPropagation();toggleFavorite(${p.id});" aria-label="Remover dos favoritos">🗑</button>
    </div>`;
  }).join('');
}
function openModalFromFav(id) { closeFavorites(); setTimeout(() => openProductPage(id), 300); }

async function loadData() {
  try {
    let resp = await fetch('./data.json?t=' + Date.now(), { cache: 'no-store' }).catch(() => null);
    if (!resp || !resp.ok) {
      resp = await fetch(GITHUB_RAW + '?t=' + Date.now(), { cache: 'no-store' }).catch(() => null);
    }
    if (!resp || !resp.ok) {
      resp = await fetch(GITHUB_RAW + '?t=' + Date.now(), { cache: 'no-store' }).catch(() => null);
    }
    if (resp && resp.ok) {
      const data = await resp.json();
      if (data.products && data.products.length) products = data.products;
      if (data.categories && data.categories.length) categories = data.categories;
      if (data.badges && data.badges.length) badges = data.badges;
      if (data.collections && data.collections.length) collections = data.collections;
      if (data.globalColors && data.globalColors.length) globalColors = data.globalColors;
      if (data.blogPosts && data.blogPosts.length) blogPosts = data.blogPosts;
      if (data.config) siteConfig = data.config;
      try {
        localStorage.setItem('goldcrochet_products', JSON.stringify(products));
        localStorage.setItem('goldcrochet_categories', JSON.stringify(categories));
        localStorage.setItem('goldcrochet_badges', JSON.stringify(badges));
        localStorage.setItem('goldcrochet_collections', JSON.stringify(collections));
        localStorage.setItem('goldcrochet_global_colors', JSON.stringify(globalColors));
        localStorage.setItem('goldcrochet_config', JSON.stringify(siteConfig));
      } catch(e) {}
      return;
    }
  } catch(e) {}
  try {
    const lp = localStorage.getItem('goldcrochet_products'); if (lp) products = JSON.parse(lp);
    const lc = localStorage.getItem('goldcrochet_categories'); if (lc) categories = JSON.parse(lc);
    const lb = localStorage.getItem('goldcrochet_badges'); if (lb) badges = JSON.parse(lb);
    const lg = localStorage.getItem('goldcrochet_global_colors'); if (lg) globalColors = JSON.parse(lg);
    const lcfg = localStorage.getItem('goldcrochet_config'); if (lcfg) siteConfig = JSON.parse(lcfg);
  } catch(e) {}
}
function applySiteConfig() {
  if (siteConfig.hero_title) { const t = document.getElementById('heroTitle'); if (t) t.innerHTML = siteConfig.hero_title; }
  if (siteConfig.hero_subtitle) { const s = document.getElementById('heroSubtitle'); if (s) s.textContent = siteConfig.hero_subtitle; }
  if (siteConfig.instagram) document.querySelectorAll('a[href*="instagram.com"]').forEach(a => a.href = siteConfig.instagram);
  if (siteConfig.email) document.querySelectorAll('a[href^="mailto:"]').forEach(a => a.href = 'mailto:' + siteConfig.email);
}

let scrollDebounce; let navScrolled = false;
function handleScroll() {
  const y = window.scrollY;
  const shouldBeScrolled = y > 40;
  if (shouldBeScrolled !== navScrolled) {
    navScrolled = shouldBeScrolled;
    document.getElementById('mainNav').classList.toggle('scrolled', shouldBeScrolled);
    positionNavDropdowns();
  }
  document.getElementById('backTop').classList.toggle('visible', y > 400);
}
window.addEventListener('scroll', () => {
  handleScroll();
  clearTimeout(scrollDebounce);
  scrollDebounce = setTimeout(handleScroll, 30);
}, { passive:true });

/* ═════════════════════════════════════════════
   NAVEGAÇÃO ENTRE PÁGINAS + INTEGRAÇÃO MENU/MOBILE
   ═════════════════════════════════════════════ */
function showPage(id, pushHistory = true) {
  closeMega();
  if (currentPageId && currentPageId !== id) {
    pageHistory.push(currentPageId);
    if (pageHistory.length > 25) pageHistory.shift();
  }
  currentPageId = id;

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-'+id);
  if (!target) return;
  target.classList.add('active');

  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  const nav = document.getElementById('nav-'+id); if (nav) nav.classList.add('active');

  syncLeftMenuActive(id);
  syncMobileBottomNav(id);

  scrollTo({top:0,behavior:'instant'});
  if (id==='produtos') renderProducts();
  if (id==='colecoes') renderColecoes();
  if (id==='novidades') renderNovidades();
  if (id==='conta') renderUserAccount();
  initReveal();
  document.getElementById('mainNav').classList.remove('scrolled');
  navScrolled = false;
  positionNavDropdowns();

  if (pushHistory && id !== 'produto') {
    if (window.location.pathname !== '/' && !window.location.pathname.includes('index.html')) {
      try { history.pushState({ page: id }, 'Gold Crochet', '/'); } catch(e) {}
    }
  }
}

function goBackPage() {
  if (!pageHistory.length) return false;
  const prev = pageHistory.pop();
  currentPageId = prev;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-'+prev);
  if (!target) return false;
  target.classList.add('active');
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  const nav = document.getElementById('nav-'+prev); if (nav) nav.classList.add('active');
  syncLeftMenuActive(prev);
  syncMobileBottomNav(prev);
  scrollTo({top:0,behavior:'instant'});
  if (prev === 'produtos') renderProducts();
  if (prev === 'colecoes') renderColecoes();
  if (prev === 'novidades') renderNovidades();
  if (prev === 'conta') renderUserAccount();
  return true;
}

function syncMobileBottomNav(pageId) {
  const nav = document.getElementById('mobileBottomNav');
  if (!nav) return;
  nav.querySelectorAll('.mbn-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === pageId);
  });
}
function syncLeftMenuActive(pageId) {
  document.querySelectorAll('.left-menu-nav a').forEach(a => a.classList.remove('active'));
  const leftNav = document.getElementById('left-nav-'+pageId);
  if (leftNav) leftNav.classList.add('active');
  const menu = document.getElementById('leftMenu');
  if (!menu) return;
  if (['dia-a-dia','pequeninos','acessorios','bijuterias','casa','produtos'].includes(pageId)) {
    const toggle = document.getElementById('left-nav-produtos');
    if (toggle) toggle.classList.add('active');
  }
  if (['sobre','sustentabilidade','periodo-atemporal','colaboracoes','cuidados','entregas'].includes(pageId)) {
    const toggle = document.getElementById('left-nav-sobre');
    if (toggle) toggle.classList.add('active');
  }
}

/* ═════════════════════════════════════════════
   SWIPE-BACK (arrastar da borda esquerda para voltar)
   ═════════════════════════════════════════════ */
function setupSwipeBack() {
  const EDGE = 32;
  const THRESHOLD = 85;
  let startX = 0, startY = 0, tracking = false, active = false;
  const indicator = document.getElementById('edgeSwipeIndicator');

  document.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    if (document.querySelector('.left-menu.open, .cart-panel.open, .fav-panel.open, .search-overlay.open, .modal-overlay.open, .user-modal-overlay.open, .filter-sheet.open, .mega-menu.open')) return;
    if (document.body.classList.contains('no-scroll')) return;
    const t = e.touches[0];
    if (t.clientX <= EDGE) {
      startX = t.clientX; startY = t.clientY;
      tracking = true; active = false;
    }
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!tracking) return;
    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (Math.abs(dy) > Math.abs(dx) + 14) {
      tracking = false;
      if (indicator) indicator.classList.remove('active');
      return;
    }
    if (dx > 14 && !active) {
      active = true;
      if (indicator) indicator.classList.add('active');
    }
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (!tracking) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    tracking = false;
    if (indicator) indicator.classList.remove('active');
    if (active && dx > THRESHOLD) {
      if (!goBackPage() && window.history.length > 1) window.history.back();
    }
    active = false;
  }, { passive: true });

  document.addEventListener('touchcancel', () => {
    tracking = false; active = false;
    if (indicator) indicator.classList.remove('active');
  }, { passive: true });
}

/* ═════════════════════════════════════════════
   CARROSSEL COM ARRASTE (touch + mouse)
   ═════════════════════════════════════════════ */
function setupCarouselDrag() {
  const wrap = document.getElementById('carouselWrapper');
  if (!wrap) return;
  let startX = 0, startY = 0, dragging = false, locked = false;
  let initialTransform = 0;

  function getTranslate() {
    const m = new DOMMatrixReadOnly(getComputedStyle(document.getElementById('carouselTrack')).transform);
    return m.m41;
  }

  function onStart(x, y) {
    startX = x; startY = y;
    dragging = true; locked = false;
    initialTransform = getTranslate();
    wrap.classList.add('dragging');
    clearInterval(carouselTimer);
  }
  function onMove(x, y, e) {
    if (!dragging) return;
    const dx = x - startX, dy = y - startY;
    if (!locked) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { locked = true; }
      else if (Math.abs(dy) > 10) {
        dragging = false; wrap.classList.remove('dragging');
        return;
      } else return;
    }
    if (e && e.cancelable) e.preventDefault();
    const track = document.getElementById('carouselTrack');
    track.style.transition = 'none';
    track.style.transform = `translateX(${initialTransform + dx}px)`;
  }
  function onEnd(x) {
    if (!dragging) { wrap.classList.remove('dragging'); return; }
    dragging = false; wrap.classList.remove('dragging');
    const track = document.getElementById('carouselTrack');
    const w = cardWidth();
    const dx = x - startX;
    track.style.transition = '';
    if (dx < -45) { nextSlide(); }
    else if (dx > 45) { prevSlide(); }
    else {
      track.style.transform = `translateX(${initialTransform}px)`;
      updateCarouselPosition(false);
    }
  }

  wrap.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) return;
    onStart(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  wrap.addEventListener('touchmove', e => {
    if (e.touches.length !== 1) return;
    onMove(e.touches[0].clientX, e.touches[0].clientY, e);
  }, { passive: false });
  wrap.addEventListener('touchend', e => {
    onEnd(e.changedTouches[0].clientX);
  }, { passive: true });
  wrap.addEventListener('touchcancel', () => { dragging = false; wrap.classList.remove('dragging'); }, { passive: true });

  wrap.addEventListener('mousedown', e => { e.preventDefault(); onStart(e.clientX, e.clientY); });
  window.addEventListener('mousemove', e => { if (dragging) onMove(e.clientX, e.clientY, null); });
  window.addEventListener('mouseup', e => { if (dragging) onEnd(e.clientX); });
}

/* ═════════════════════════════════════════════
   FILTER BOTTOM-SHEET (mobile)
   ═════════════════════════════════════════════ */
function openFilterSheet() {
  const body = document.getElementById('filterSheetBody');
  if (body) {
    body.innerHTML = `
      <div>
        <div class="filter-sheet-group-title">Coleção</div>
        <div class="filter-sheet-chips">
          <button class="filter-sheet-chip ${currentCollectionFilter === 'Alta-Costura' ? 'active' : ''}" onclick="applyFilterSheet('collection', 'Alta-Costura')">Alta-Costura</button>
          <button class="filter-sheet-chip ${currentCollectionFilter === 'Dia a Dia' ? 'active' : ''}" onclick="applyFilterSheet('collection', 'Dia a Dia')">Essenciais</button>
        </div>
      </div>
      <div>
        <div class="filter-sheet-group-title">Categoria</div>
        <div class="filter-sheet-chips">
          <button class="filter-sheet-chip ${currentFilter === 'todos' ? 'active' : ''}" onclick="applyFilterSheet('category', 'todos')">Todas</button>
          ${categories.map(cat => `<button class="filter-sheet-chip ${currentFilter === cat ? 'active' : ''}" onclick="applyFilterSheet('category', '${cat}')">${labelForCategory(cat)}</button>`).join('')}
        </div>
      </div>
      <div>
        <div class="filter-sheet-group-title">Público</div>
        <div class="filter-sheet-chips">
          <button class="filter-sheet-chip ${!currentGenderFilter ? 'active' : ''}" onclick="applyFilterSheet('gender', null)">Todos</button>
          <button class="filter-sheet-chip ${currentGenderFilter === 'feminino' ? 'active' : ''}" onclick="applyFilterSheet('gender', 'feminino')">Para Ela</button>
          <button class="filter-sheet-chip ${currentGenderFilter === 'masculino' ? 'active' : ''}" onclick="applyFilterSheet('gender', 'masculino')">Para Ele</button>
        </div>
      </div>
    `;
  }
  const overlay = document.getElementById('filterSheetOverlay');
  const sheet = document.getElementById('filterSheet');
  overlay.classList.add('open');
  sheet.classList.add('open');
  lockBody();
}
function closeFilterSheet() {
  const overlay = document.getElementById('filterSheetOverlay');
  const sheet = document.getElementById('filterSheet');
  if (overlay) overlay.classList.remove('open');
  if (sheet) sheet.classList.remove('open');
  unlockBody();
}
function applyFilterSheet(type, value) {
  if (type === 'collection') {
    currentCollectionFilter = value;
    currentSectionFilter = null; currentGenderFilter = null; currentFilter = 'todos';
  } else if (type === 'category') {
    if (value === 'todos') { currentFilter = 'todos'; }
    else { currentFilter = value; }
    currentCollectionFilter = null; currentSectionFilter = null;
  } else if (type === 'gender') {
    currentGenderFilter = value;
  }
  renderProducts();
  updateMobileInfo();
  openFilterSheet();
}
function clearFilterSheet() {
  currentFilter = 'todos';
  currentSectionFilter = null;
  currentGenderFilter = null;
  currentCollectionFilter = null;
  renderProducts();
  updateMobileInfo();
  openFilterSheet();
}
function updateMobileInfo() {
  const info = document.getElementById('productsMobileInfo');
  if (!info) return;
  const grid = document.getElementById('productsGrid');
  if (grid) {
    const cards = grid.querySelectorAll('.product-card').length;
    info.textContent = `${cards} peça${cards !== 1 ? 's' : ''}`;
  }
}

function initReveal() {
  const obs = new IntersectionObserver(entries => { entries.forEach(e => { if(e.isIntersecting){e.target.classList.add('visible');obs.unobserve(e.target);} }); }, {threshold:0.08});
  document.querySelectorAll('.reveal:not(.visible)').forEach(el => obs.observe(el));
}

let carouselProducts = [];
let carouselAll = [];
let carouselIdx = 10;
let carouselTimer;
let carouselHover = false;
let isCarouselAnimating = false;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function renderCarousel() {
  carouselProducts = products.filter(p=>!p.custom).slice(0,10);
  if (carouselProducts.length < 10) {
    const extras = products.filter(p => !carouselProducts.includes(p));
    carouselProducts = carouselProducts.concat(extras).slice(0,10);
  }
  if (!carouselProducts.length) return;
  carouselAll = [...carouselProducts, ...carouselProducts, ...carouselProducts];
  const track = document.getElementById('carouselTrack');
  if (!track) return;
  const grads = ['#f2ede0','#f8ead5','#f5e6cb','#f3ead2'];
  track.innerHTML = carouselAll.map((p,i) => {
    const img = toRaw(p.image);
    const cols = getColors(p);
    const colorText = cols.length > 0 ? `${cols.length} ${cols.length === 1 ? 'Cor' : 'Cores'}` : '';
    const badgeText = getBadgeText(p);
    const isDisc = isDiscountBadge(p);
    const badgeLabel = badgeText ? `<div class="product-badge-label${isDisc?' discount':''}">${badgeText}</div>` : '';
    const fav = favorites.includes(p.id) ? 'faved' : '';
    return `<div class="carousel-card" onclick="openProductPage(${p.id})" role="button" tabindex="0">
      <div class="product-img-square" style="background:${grads[i%grads.length]}">
        ${img?`<img src="${img}" alt="${p.name}" loading="lazy" onerror="this.style.display='none'">`:''}
        ${!img?`<div class="product-img-emoji">${p.emoji}</div>`:''}
        ${badgeLabel}
        <button class="fav-btn ${fav}" onclick="event.stopPropagation();toggleFavorite(${p.id})" aria-label="Favorito">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
        </button>
      </div>
      <div class="product-info">
        <h3>${p.name}</h3>
        <div class="product-price">${formatPriceHtml(p)}</div>
        ${colorText ? `<div class="product-colors-text">${colorText}</div>` : ''}
      </div>
    </div>`;
  }).join('');
  carouselIdx = carouselProducts.length;
  updateCarouselPosition(false);
  const wr = document.getElementById('carouselWrapper');
  wr.addEventListener('mouseenter',()=>{carouselHover=true;clearInterval(carouselTimer);});
  wr.addEventListener('mouseleave',()=>{carouselHover=false;startCarouselTimer();});
  startCarouselTimer();
}
function cardWidth() { const c = document.querySelector('.carousel-card'); if (!c) return 282; return c.offsetWidth + 20; }
function updateCarouselPosition(animate) {
  const track = document.getElementById('carouselTrack'); const w = cardWidth();
  if (!animate) { track.style.transition = 'none'; track.style.transform = `translateX(-${carouselIdx * w}px)`; void track.offsetWidth; track.style.transition = 'transform 0.5s cubic-bezier(0.25,0.46,0.45,0.94)'; }
  else { track.style.transition = 'transform 0.5s cubic-bezier(0.25,0.46,0.45,0.94)'; track.style.transform = `translateX(-${carouselIdx * w}px)`; }
}
function nextSlide() {
  if (isCarouselAnimating) return; isCarouselAnimating = true; carouselIdx++; updateCarouselPosition(true);
  setTimeout(() => { if (carouselIdx >= carouselProducts.length * 2) { carouselIdx = carouselProducts.length; updateCarouselPosition(false); } isCarouselAnimating = false; }, 520);
}
function prevSlide() {
  if (isCarouselAnimating) return; isCarouselAnimating = true; carouselIdx--; updateCarouselPosition(true);
  setTimeout(() => { if (carouselIdx < carouselProducts.length) { carouselIdx = carouselProducts.length * 2 - 1; updateCarouselPosition(false); } isCarouselAnimating = false; }, 520);
}
function startCarouselTimer() {
  clearInterval(carouselTimer);
  if (carouselHover) return;
  if (prefersReducedMotion) return;
  carouselTimer = setInterval(nextSlide, 3800);
}

function getColors(p) { if (p.colors && p.colors.length) return p.colors; if (p.colorSections) return p.colorSections.flatMap(s=>s.colors||[]); return []; }

function formatPriceHtml(p) {
  if (!p.price) return 'Sob Consulta';
  const base = parseFloat(p.price);
  if (p.discount && p.discount > 0) {
    const final = Math.round(base * (1 - p.discount / 100));
    return `<span class="price-old">R$ ${base},00</span><span class="price-new">R$ ${final},00</span>`;
  }
  return `R$ ${base},00`;
}
function getPriceForCart(p) {
  if (!p.price) return null;
  const base = parseFloat(p.price);
  if (p.discount && p.discount > 0) return Math.round(base * (1 - p.discount / 100));
  return base;
}

function setFilter(cat, gender) {
  currentFilter = cat || 'todos';
  currentGenderFilter = gender || null;
  currentSectionFilter = null;
  currentCollectionFilter = null;
  renderFilters();
  renderProducts();
  updateMobileInfo();
}
function setSectionFilter(section, gender) {
  currentSectionFilter = section;
  currentGenderFilter = gender || null;
  currentFilter = 'todos';
  currentCollectionFilter = null;
  renderFilters();
  renderProducts();
  updateMobileInfo();
}
function setSectionGenderFilter(section, gender) { setSectionFilter(section, gender); }
function setCollectionFilter(collection) {
  currentCollectionFilter = collection;
  currentSectionFilter = null;
  currentGenderFilter = null;
  currentFilter = 'todos';
  renderFilters();
  renderProducts();
  updateMobileInfo();
}
function clearAllFilters() {
  currentFilter = 'todos';
  currentSectionFilter = null;
  currentGenderFilter = null;
  currentCollectionFilter = null;
  renderFilters();
  renderProducts();
  updateMobileInfo();
}

function updateProductsFilterHeader() {
  const header = document.getElementById('productsFilterHeader');
  const title = document.getElementById('productsFilterTitle');
  if (!header || !title) return;
  let label = '';
  if (currentCollectionFilter) {
    label = `Coleção ${currentCollectionFilter === 'Dia a Dia' ? 'Essenciais' : currentCollectionFilter}`;
  } else if (currentSectionFilter && currentGenderFilter) {
    const secLabel = SECTION_LABELS[currentSectionFilter] || currentSectionFilter;
    label = `${secLabel} — Para ${currentGenderFilter === 'feminino' ? 'Ela' : 'Ele'}`;
  } else if (currentSectionFilter) {
    label = SECTION_LABELS[currentSectionFilter] || currentSectionFilter;
  } else if (currentFilter !== 'todos') {
    label = labelForCategory(currentFilter);
  }
  if (label) { title.textContent = label; header.style.display = 'block'; }
  else { header.style.display = 'none'; }
}

function renderProducts() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  const q = (document.getElementById('searchInput')?.value||'').toLowerCase();
  const filtered = products.filter(p => {
    if (currentCollectionFilter && p.collection !== currentCollectionFilter) return false;
    if (currentSectionFilter && getProductSection(p) !== currentSectionFilter) return false;
    if (currentGenderFilter && p.gender !== currentGenderFilter) return false;
    if (currentFilter !== 'todos' && p.category !== currentFilter) return false;
    if (q) {
      const mq = p.name.toLowerCase().includes(q) || (p.desc||'').toLowerCase().includes(q) || (p.category||'').includes(q);
      if (!mq) return false;
    }
    return true;
  });
  updateProductsFilterHeader();
  document.getElementById('productsCount').textContent = `${filtered.length} peça${filtered.length!==1?'s':''} encontrada${filtered.length!==1?'s':''}`;
  if (!filtered.length) {
    grid.innerHTML = `<div class="no-results"><span>🔍</span><p>Nenhuma peça encontrada.</p><button class="btn-secondary" onclick="clearAllFilters()">Ver todas</button></div>`;
    updateMobileInfo();
    return;
  }
  grid.innerHTML = filtered.map((p,i) => cardHtml(p,i)).join('');
  bindCardEvents(grid);
  updateMobileInfo();
}

function renderNovidades() {
  const grid = document.getElementById('novidadesGrid');
  if (!grid) return;
  if (!blogPosts.length) { grid.innerHTML = '<div class="no-results"><span>📰</span><p>Nenhuma novidade ainda.</p></div>'; return; }
  grid.innerHTML = blogPosts.map(post => `
    <article class="blog-card" onclick="openBlogPost(${post.id})" role="button" tabindex="0">
      <div class="blog-cover">${post.emoji}</div>
      <div class="blog-body">
        <span class="blog-tag">${post.tag}</span>
        <h3>${post.title}</h3>
        <p>${post.excerpt}</p>
        <div class="blog-date">${post.date}</div>
        <span class="blog-read-more">Ler mais →</span>
      </div>
    </article>
  `).join('');
}
function openBlogPost(id) { const post = blogPosts.find(p => p.id === id); if (!post) return; showToast(`📰 ${post.title}`); }

function setColecaoFilter(filter) {
  currentColecaoFilter = filter;
  document.querySelectorAll('#colecoesFilterPills .filter-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.filter === filter);
  });
  renderColecoes();
}
function renderColecoes() {
  const grid = document.getElementById('colecoesGrid');
  if (!grid) return;
  let filtered = collections;
  if (currentColecaoFilter !== 'todas') filtered = collections.filter(c => c.filter === currentColecaoFilter);
  if (!filtered.length) { grid.innerHTML = '<div class="no-results"><span>✨</span><p>Nenhuma coleção disponível.</p></div>'; return; }
  grid.innerHTML = filtered.map(c => `
    <div class="collection-card" onclick="openCollection('${c.id}','${c.filter}')" role="button" tabindex="0">
      <div class="collection-img"><div class="collection-emoji">${c.emoji}</div></div>
      <div class="collection-info"><h3>${c.name}</h3><p>${c.desc}</p><div class="collection-cta">Explorar →</div></div>
    </div>
  `).join('');
}
function openCollection(id, filterName) {
  if (filterName) { showPage('produtos'); setTimeout(() => setCollectionFilter(filterName), 30); }
  else { showPage('produtos'); }
}

function cardHtml(p,i) {
  const grads = ['#f2ede0','#f8ead5','#f5e6cb','#f3ead2'];
  const rawImg = toRaw(p.image); const hasImg = !!rawImg;
  const cols = getColors(p);
  const colorText = cols.length > 0 ? `${cols.length} ${cols.length === 1 ? 'Cor' : 'Cores'}` : '';
  const badgeText = getBadgeText(p);
  const isDisc = isDiscountBadge(p);
  const badgeLabel = badgeText ? `<div class="product-badge-label${isDisc?' discount':''}">${badgeText}</div>` : '';
  const fav = favorites.includes(p.id) ? 'faved' : '';
  const slug = p.slug || slugify(p.name);
  return `
  <a href="./produtos/${slug}.html" class="product-card ${p.custom?'custom-card':''}" data-id="${p.id}" data-slug="${slug}" role="article" style="text-decoration:none;color:inherit;display:block;">
    <div class="product-img-square" style="background:${grads[i%grads.length]}">
      ${hasImg?`<img src="${rawImg}" alt="${p.name}" loading="lazy" onerror="this.style.display='none'">`:''}
      ${!hasImg?`<div class="product-img-emoji">${p.emoji}</div>`:''}
      ${badgeLabel}
      <button class="fav-btn ${fav}" onclick="event.stopPropagation();toggleFavorite(${p.id})" aria-label="Favorito">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
      </button>
    </div>
    <div class="product-info">
      <h3>${p.name}</h3>
      <div class="product-price">${formatPriceHtml(p)}</div>
      ${colorText ? `<div class="product-colors-text">${colorText}</div>` : ''}
    </div>
  </a>`;
}
function bindCardEvents(grid) {
  grid.querySelectorAll('.product-card').forEach(card => { card.addEventListener('click', handleCardClick); });
}
function handleCardClick(e) {
  if (e.target.closest('.fav-btn')) {
    e.preventDefault();
    return;
  }
  // Se o usuário clicar com Ctrl/Cmd ou scroll click, deixa o navegador abrir a página HTML em nova aba
  if (e.ctrlKey || e.metaKey || e.button === 1) return;
  e.preventDefault();
  const pid = parseInt(this.dataset?.id);
  if (pid) openProductPage(pid);
}
function renderFilters() {
  const container = document.getElementById('filterPills');
  if (!container) return;
  let html = `<button class="filter-pill ${currentFilter === 'todos' && !currentSectionFilter && !currentCollectionFilter ? 'active' : ''}" onclick="clearAllFilters()">Todos</button>`;
  categories.forEach(cat => {
    const active = currentFilter === cat && !currentSectionFilter && !currentCollectionFilter;
    html += `<button class="filter-pill ${active ? 'active' : ''}" onclick="setFilter('${cat}')">${labelForCategory(cat)}</button>`;
  });
  container.innerHTML = html;
}
function onSearch(val) {
  const si = document.getElementById('searchInput');
  if (!si) return;
  clearTimeout(searchTimeout);
  const clearBtn = document.getElementById('searchClear');
  if (clearBtn) clearBtn.classList.toggle('visible', !!val);
  searchTimeout = setTimeout(renderProducts, 280);
}
function clearSearch() {
  const si = document.getElementById('searchInput');
  if (si) si.value = '';
  const clearBtn = document.getElementById('searchClear');
  if (clearBtn) clearBtn.classList.remove('visible');
  renderProducts();
}

function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') || 'produto';
}

function openProductPage(id, pushHistory = true) {
  const p = products.find(x => x.id === id || x.slug === id || String(x.id) === String(id));
  if (!p) return;
  currentProductPageId = p.id;
  currentModal = p;
  selectedColors[p.id] = null;
  renderProductPageContent(p.id);
  showPage('produto', false);
  if (pushHistory) {
    const slug = p.slug || slugify(p.name);
    try {
      history.pushState({ page: 'produto', id: p.id, slug }, `${p.name} — Gold Crochet`, `/${slug}`);
    } catch(e) {}
  }
}

function renderProductPageContent(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  document.getElementById('productPageTitle').textContent = p.name;
  const priceRow = document.getElementById('productPagePriceRow');
  const base = parseFloat(p.price) || 0;
  if (p.discount && p.discount > 0) {
    const final = Math.round(base * (1 - p.discount / 100));
    priceRow.innerHTML = `
      <span class="product-page-price-old">R$ ${base},00</span>
      <span class="product-page-price-new">R$ ${final},00</span>
      <span class="product-page-discount-tag">-${p.discount}%</span>
    `;
  } else if (base > 0) {
    priceRow.innerHTML = `<span class="product-page-price">R$ ${base},00</span>`;
  } else {
    priceRow.innerHTML = `<span class="product-page-price">Sob consulta</span>`;
  }
  document.getElementById('productPageDesc').textContent = p.desc || '';
  const dedicatedBtn = document.getElementById('productPageDedicatedLink');
  if (dedicatedBtn) {
    const slug = p.slug || slugify(p.name);
    dedicatedBtn.href = `./produtos/${slug}.html`;
  }

  const sections = p.colorSections || (p.colors ? [{ name: 'Cores disponíveis', colors: p.colors }] : []);
  if (!Array.isArray(selectedColors[p.id])) {
    selectedColors[p.id] = sections.map(s => s.colors.length ? s.colors[0] : null);
  }
  let colorsHtml = '';
  if (sections.length > 0) {
    colorsHtml = sections.map((sec, sIdx) => {
      const sel = selectedColors[p.id][sIdx] || (sec.colors.length ? sec.colors[0] : null);
      if (!selectedColors[p.id][sIdx]) selectedColors[p.id][sIdx] = sel;
      return `<div style="margin-bottom:18px">
        <div class="product-page-colors-label">${sec.name}</div>
        <div style="display:flex;gap:9px;flex-wrap:wrap" class="productPageColorDots" data-sidx="${sIdx}">
          ${sec.colors.map(c => `<button class="color-dot ${sel && c.hex === sel.hex ? 'selected' : ''}" style="background:${c.hex};width:28px;height:28px" data-pid="${p.id}" data-sidx="${sIdx}" data-name="${c.name}" data-hex="${c.hex}" aria-label="Cor ${c.name}"></button>`).join('')}
        </div>
        <div class="modal-color-name" id="productPageColorName-${sIdx}">Cor: ${sel ? sel.name : ''}</div>
      </div>`;
    }).join('');
  }
  document.getElementById('productPageColors').innerHTML = colorsHtml;
  setTimeout(() => {
    document.querySelectorAll('.productPageColorDots .color-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        const pid = parseInt(dot.dataset.pid);
        const sIdx = parseInt(dot.dataset.sidx);
        selectedColors[pid][sIdx] = { name: dot.dataset.name, hex: dot.dataset.hex };
        const parent = dot.closest('.productPageColorDots');
        parent.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
        dot.classList.add('selected');
        const label = document.getElementById('productPageColorName-' + sIdx);
        if (label) label.textContent = 'Cor: ' + dot.dataset.name;
      });
    });
  }, 0);

  const gallery = document.getElementById('productPageGallery');
  const rawImg = toRaw(p.image);
  const imgs = [];
  if (rawImg) imgs.push(rawImg);
  (p.gallery || []).forEach(g => { const r = toRaw(g); if (r && !imgs.includes(r)) imgs.push(r); });
  if (imgs.length) {
    gallery.innerHTML = imgs.map(url => `<div class="product-page-gallery-item"><img src="${url}" alt="${p.name}" loading="lazy" onerror="this.style.display='none'"></div>`).join('');
  } else {
    gallery.innerHTML = `<div class="product-page-gallery-item"><div class="gallery-emoji">${p.emoji || '🧶'}</div></div>`;
  }

  const specs = document.getElementById('productPageSpecs');
  const composition = p.composition || p.material || 'Fios premium de alta durabilidade, selecionados à mão para cada peça.';
  const care = p.care || 'Lavar à mão com água fria e sabão neutro. Secar na horizontal, à sombra. Guardar dobrada.';
  const responsibility = p.responsibility || 'Produção artesanal sob demanda, sem desperdício, com fios de fornecedores conscientes.';
  specs.innerHTML = `
    <details><summary>Composição</summary><p>${composition}</p></details>
    <details><summary>Cuidados</summary><p>${care}</p></details>
    <details><summary>Responsabilidade</summary><p>${responsibility}</p></details>
  `;

  const related = document.getElementById('productPageRelated');
  const others = products.filter(x => x.id !== p.id).slice(0, 8);
  const grads = ['#f2ede0','#f8ead5','#f5e6cb','#f3ead2'];
  related.innerHTML = others.map((rp, i) => {
    const rimg = toRaw(rp.image);
    const rcols = getColors(rp);
    const rcolorText = rcols.length > 0 ? `${rcols.length} ${rcols.length === 1 ? 'Cor' : 'Cores'}` : '';
    const rbadge = getBadgeText(rp);
    const rdisc = isDiscountBadge(rp);
    const rbadgeLabel = rbadge ? `<div class="product-badge-label${rdisc?' discount':''}">${rbadge}</div>` : '';
    const rfav = favorites.includes(rp.id) ? 'faved' : '';
    return `<div class="carousel-card" onclick="openProductPage(${rp.id})" role="button" tabindex="0">
      <div class="product-img-square" style="background:${grads[i%grads.length]}">
        ${rimg?`<img src="${rimg}" alt="${rp.name}" loading="lazy" onerror="this.style.display='none'">`:''}
        ${!rimg?`<div class="product-img-emoji">${rp.emoji}</div>`:''}
        ${rbadgeLabel}
        <button class="fav-btn ${rfav}" onclick="event.stopPropagation();toggleFavorite(${rp.id})" aria-label="Favorito">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
        </button>
      </div>
      <div class="product-info">
        <h3>${rp.name}</h3>
        <div class="product-price">${formatPriceHtml(rp)}</div>
        ${rcolorText ? `<div class="product-colors-text">${rcolorText}</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

function addToCartFromProductPage() { if (currentProductPageId) addToCart(currentProductPageId); }

function openModal(id) { openProductPage(id); }
function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  if (overlay) overlay.classList.remove('open');
  clearActiveDialog(overlay); unlockBody();
}
function addToCartFromModal() { if (currentModal) addToCart(currentModal.id); closeModal(); }
function switchMedia() {}
function galleryPrev() {}
function galleryNext() {}

function addToCart(id) {
  const p = products.find(x=>x.id===id); if(!p) return;
  const colsArr = selectedColors[id] || [];
  const chosenColors = Array.isArray(colsArr) ? colsArr.filter(c => c !== null && c !== undefined) : [];
  const effectivePrice = getPriceForCart(p);
  const existing = cart.find(c => c.id === id && JSON.stringify(c.selectedColors) === JSON.stringify(chosenColors));
  if(existing) existing.qty++;
  else cart.push({...p, price: effectivePrice, originalPrice: p.price, qty:1, selectedColors: chosenColors});
  saveCart(); updateCartUI();
  showToast(`✅ ${p.name} adicionado!`);
}
function removeFromCart(idx) { cart.splice(idx,1); saveCart(); updateCartUI(); }
function changeQty(idx,d) { if(!cart[idx])return; cart[idx].qty+=d; if(cart[idx].qty<=0) removeFromCart(idx); else { saveCart(); updateCartUI(); } }
function getWhatsAppNumber() {
  const num = (siteConfig && siteConfig.whatsapp) ? String(siteConfig.whatsapp) : '5531984566047';
  return num.replace(/\D/g, '') || '5531984566047';
}

function updateCartUI() {
  const total = cart.reduce((s,c)=>s+(c.price||0)*c.qty,0);
  const count = cart.reduce((s,c)=>s+c.qty,0);
  const items = document.getElementById('cartItems');
  const footer = document.getElementById('cartFooter');
  const navBadge = document.getElementById('navCartCount');
  const mbnBadge = document.getElementById('mbnCartBadge');
  const user = auth && auth.currentUser;

  if (navBadge) {
    if (count > 0) {
      navBadge.classList.remove('hidden');
      navBadge.textContent = count;
      navBadge.classList.remove('badge-pop');
      void navBadge.offsetWidth;
      navBadge.classList.add('badge-pop');
    } else {
      navBadge.classList.add('hidden');
    }
  }
  if (mbnBadge) {
    if (count > 0) {
      mbnBadge.classList.remove('hidden');
      mbnBadge.textContent = count;
    } else {
      mbnBadge.classList.add('hidden');
    }
  }

  const promo = document.getElementById('cartPromo');

  if(!cart.length) {
    items.innerHTML=`<div class="cart-empty"><span class="empty-icon">🧶</span><p>Sua sacola está vazia.<br>Explore nossas peças!</p></div>`;
    footer.style.display='none';
    if (promo) {
      if (!user) {
        promo.style.display = 'block';
        promo.innerHTML = `
          <h3>Pegue sua bolsa</h3>
          <p>Faça login na Minha Conta para acessar sua sacola em todos os seus dispositivos.</p>
          <button class="user-modal-btn" onclick="openUserModalFromCart()">Entrar na Minha Conta</button>
        `;
      } else {
        promo.style.display = 'none';
      }
    }
    updateDrawerCounts();
    return;
  }

  // Se já houver itens dentro da bolsa: remover a função "Pegue sua bolsa"
  if (promo) {
    promo.style.display = 'none';
  }

  footer.style.display='block';
  document.getElementById('cartTotal').textContent=`R$ ${total.toFixed(2).replace('.',',')}`;

  const checkoutBtn = document.getElementById('checkoutBtn');
  const authNote = document.getElementById('cartAuthNote');
  const authTip = document.getElementById('cartAuthTip');

  if (checkoutBtn) {
    if (user) {
      checkoutBtn.className = 'checkout-btn';
      checkoutBtn.innerHTML = 'Finalizar pelo WhatsApp 🚀';
      checkoutBtn.onclick = handleCheckoutAction;
      if (authNote) {
        authNote.style.display = 'flex';
        authNote.innerHTML = `<span>👤 Conectado como <strong>${escapeHtml(user.displayName || user.email?.split('@')[0] || 'Cliente')}</strong></span>`;
      }
      if (authTip) authTip.innerHTML = '';
    } else {
      checkoutBtn.className = 'checkout-btn requires-login';
      checkoutBtn.innerHTML = 'Fazer login para finalizar';
      checkoutBtn.onclick = () => {
        showToast('🔒 Faça login para finalizar seu pedido!', 'warning');
        openUserModalFromCart();
      };
      if (authNote) authNote.style.display = 'none';
      if (authTip) authTip.innerHTML = '<p class="cart-login-tip">💡 Faça login para registrar seu pedido e finalizar diretamente pelo WhatsApp.</p>';
    }
  }

  items.innerHTML = cart.map((item,i)=>{
    const rawI=toRaw(item.image);
    const colorInfo = (item.selectedColors && item.selectedColors.length > 0) ? item.selectedColors.map(sc => `<div class="cart-item-color"><div class="cart-item-color-dot" style="background:${sc.hex}"></div>${escapeHtml(sc.name)}</div>`).join('') : '';
    return `<div class="cart-item"><div class="cart-item-img">${rawI?`<img src="${rawI}" alt="${escapeHtml(item.name)}">`:(item.emoji||'🧶')}</div><div class="cart-item-info"><h4>${escapeHtml(item.name)}</h4>${colorInfo}<span>${item.price?'R$ '+parseFloat(item.price).toFixed(2).replace('.',','):'Sob consulta'}</span></div><div class="cart-item-qty"><button class="qty-btn" onclick="changeQty(${i},-1)" aria-label="Diminuir quantidade">−</button><span class="qty-value">${item.qty}</span><button class="qty-btn" onclick="changeQty(${i},1)" aria-label="Aumentar quantidade">+</button></div><button class="cart-remove" onclick="removeFromCart(${i})" aria-label="Remover item">🗑</button></div>`;
  }).join('');
  updateDrawerCounts();
}

function openCart() {
  closeOtherLayers('cartPanel');
  const panel = document.getElementById('cartPanel');
  panel.classList.add('open');
  document.getElementById('cartOverlay').classList.add('open');
  setActiveDialog(panel);
  lockBody();
  setTimeout(() => panel.querySelector('.cart-close')?.focus(), 80);
}

function closeCart() {
  const panel = document.getElementById('cartPanel');
  panel.classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('open');
  clearActiveDialog(panel);
  unlockBody();
}

function toggleCart() {
  const p = document.getElementById('cartPanel');
  if (p && p.classList.contains('open')) closeCart(); else openCart();
}

function handleCheckoutAction() {
  const user = auth && auth.currentUser;
  if (!user) {
    showToast('🔒 Faça login ou cadastre-se para finalizar seu pedido!', 'warning');
    openUserModalFromCart();
    return;
  }
  checkout();
}

async function checkout() {
  if (!cart.length) return;
  const user = auth && auth.currentUser;
  if (!user) {
    showToast('🔒 Faça login para finalizar seu pedido!', 'warning');
    openUserModalFromCart();
    return;
  }

  const total = cart.reduce((s,c)=>(s+(c.price||0)*c.qty),0);
  const orderItems = cart.map(c => ({ id: c.id, name: c.name, qty: c.qty, price: c.price, selectedColors: c.selectedColors || [] }));
  const orderId = 'GC' + Date.now().toString().slice(-8);

  try {
    const key = 'goldcrochet_orders_' + user.uid;
    const orders = JSON.parse(localStorage.getItem(key) || '[]');
    orders.unshift({ id: orderId, date: new Date().toISOString(), items: orderItems, total, status: 'pendente' });
    localStorage.setItem(key, JSON.stringify(orders));
  } catch(e) {}

  saveOrderToFirestore(user, { items: orderItems, total }).then(fsId => {
    if (fsId) console.log('[Pedido salvo no Firestore]', fsId);
  });
  if (document.getElementById('page-conta')?.classList.contains('active')) renderUserPedidos();

  const clientName = user.displayName || user.email?.split('@')[0] || 'Cliente';
  const lines = cart.map(c=>{
    const colorStr = (c.selectedColors && c.selectedColors.length > 0) ? ` (${c.selectedColors.map(sc => sc.name).join(', ')})` : '';
    return `• ${c.name}${colorStr} x${c.qty}${c.price?' — R$ '+parseFloat(c.price).toFixed(2).replace('.',','):''}`;
  });

  const msg = `Olá! Meu nome é ${clientName} e gostaria de finalizar meu pedido #${orderId} na Gold Crochet 🧶\n\n${lines.join('\n')}\n\nTotal: R$ ${total.toFixed(2).replace('.',',')}\n\nE-mail da minha conta: ${user.email || '—'}\nAguardo confirmação! 😊`;

  closeCart();
  showToast('🚀 Abrindo WhatsApp com seu pedido...');

  const waNum = getWhatsAppNumber();
  const waUrl = `https://wa.me/${waNum}?text=` + encodeURIComponent(msg);
  setTimeout(() => {
    try {
      const win = window.open(waUrl, '_blank', 'noopener,noreferrer');
      if (!win) window.location.href = waUrl;
    } catch(e) {
      window.location.href = waUrl;
    }
  }, 750);
}

function showToast(msg,type='') { const t=document.getElementById('toast'); t.textContent=msg; t.className='toast show '+(type||''); setTimeout(()=>t.classList.remove('show'),2800); }
function acceptCookies() { document.getElementById('cookieBanner').classList.remove('show'); localStorage.setItem('goldcrochet_cookies','1'); }

function openUserAccountPage() { closeUserDropdown(); showPage('conta'); }
function setUserTab(tab) {
  currentUserTab = tab;
  document.querySelectorAll('.user-account-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.user-tab-panel').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('userTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
  if (el) el.classList.add('active');
}
function renderUserAccount() {
  renderUserPedidos();
  renderUserConta();
  renderUserConfig();
  setUserTab(currentUserTab || 'pedidos');
}
async function renderUserPedidos() {
  const el = document.getElementById('userTabPedidos');
  if (!el) return;
  const user = auth.currentUser;
  if (!user) {
    el.innerHTML = `<div class="user-tab-card"><div class="user-empty"><span class="empty-icon">🔒</span><h3>Entre para ver seus pedidos</h3><p>Faça login para acompanhar seus pedidos e histórico de compras.</p><button class="user-primary-btn" onclick="openUserModal()">Entrar na minha conta</button></div></div>`;
    return;
  }
  el.innerHTML = `<div class="user-tab-card"><p style="text-align:center;color:var(--text-mid);padding:20px;">Carregando pedidos...</p></div>`;
  let orders = await fetchUserOrders(user);
  if (!orders.length) { try { orders = JSON.parse(localStorage.getItem('goldcrochet_orders_' + user.uid) || '[]'); } catch(e) { orders = []; } }
  if (!orders.length) {
    el.innerHTML = `<div class="user-tab-card"><div class="user-empty"><span class="empty-icon">📦</span><h3>Nenhum pedido ainda</h3><p>Quando você finalizar uma compra, seu pedido aparecerá aqui.</p><button class="user-primary-btn" onclick="showPage('produtos')">Explorar peças</button></div></div>`;
    return;
  }
  const statusMap = { pendente: '⏳ Pendente', producao: '🧶 Em produção', enviado: '📦 Enviado', entregue: '✅ Entregue', cancelado: '❌ Cancelado' };
  el.innerHTML = orders.map(o => {
    const dateStr = new Date(o.date).toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
    const itemsStr = (o.items || []).map(i => `${i.qty}× ${i.name}`).join(' · ');
    const statusLabel = statusMap[o.status] || o.status || '⏳ Pendente';
    return `<div class="user-order-card">
      <div class="user-order-header"><span class="user-order-id">Pedido #${o.id}</span><span class="user-order-date">${dateStr}</span></div>
      <div class="user-order-items">${itemsStr}</div>
      <div class="user-order-total">Total: R$ ${(o.total||0).toFixed(2).replace('.',',')}</div>
      <div class="user-order-status">${statusLabel}</div>
    </div>`;
  }).join('');
}
function renderUserConta() {
  const el = document.getElementById('userTabConta');
  if (!el) return;
  const user = auth.currentUser;
  if (!user) {
    el.innerHTML = `<div class="user-tab-card"><div class="user-empty"><span class="empty-icon">👤</span><h3>Entre para acessar sua conta</h3><p>Faça login para visualizar e editar seus dados.</p><button class="user-primary-btn" onclick="openUserModal()">Entrar na minha conta</button></div></div>`;
    return;
  }
  const name = user.displayName || '';
  const email = user.email || '';
  el.innerHTML = `
    <div class="user-tab-card">
      <h2>Informações da Conta</h2>
      <p class="user-card-sub">Atualize seu nome de exibição. O e-mail é usado para login e não pode ser alterado por aqui.</p>
      <div class="user-field-row">
        <div class="user-field"><label>Nome</label><input type="text" id="userContaName" value="${name.replace(/"/g,'&quot;')}" placeholder="Seu nome"></div>
        <div class="user-field"><label>E-mail</label><input type="email" value="${email.replace(/"/g,'&quot;')}" disabled></div>
      </div>
      <div style="display:flex;gap:12px;margin-top:20px;flex-wrap:wrap;align-items:center;">
        <button class="user-primary-btn" onclick="saveUserConta()">Salvar alterações</button>
        <button type="button" class="user-logout-btn" onclick="logoutUser()" style="display:inline-flex;align-items:center;gap:8px;background:rgba(235,87,87,0.08);border:1.5px solid rgba(235,87,87,0.35);color:#d93025;padding:12px 20px;border-radius:var(--radius-pill);font-weight:700;font-size:0.9rem;cursor:pointer;transition:all 0.2s ease;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          Sair da conta
        </button>
      </div>
    </div>
  `;
}
function saveUserConta() {
  const user = auth.currentUser;
  if (!user) return;
  const name = (document.getElementById('userContaName')?.value || '').trim();
  if (!name) { showToast('⚠️ Preencha o nome!', 'error'); return; }
  updateProfile(user, { displayName: name })
    .then(async () => { await ensureUserDoc(user, name); showToast('✅ Nome atualizado!'); updateLeftMenuAccount(); renderUserDropdown(); renderUserConta(); })
    .catch(err => showToast('❌ ' + err.message, 'error'));
}
function renderUserConfig() {
  const el = document.getElementById('userTabConfig');
  if (!el) return;
  const user = auth.currentUser;
  if (!user) {
    el.innerHTML = `<div class="user-tab-card"><div class="user-empty"><span class="empty-icon">⚙️</span><h3>Entre para ver as configurações</h3><p>Faça login para gerenciar suas preferências.</p><button class="user-primary-btn" onclick="openUserModal()">Entrar na minha conta</button></div></div>`;
    return;
  }
  el.innerHTML = `
    <div class="user-tab-card">
      <h2>Notificações</h2>
      <p class="user-card-sub">Escolha quais comunicações deseja receber.</p>
      <div class="user-checkbox-row"><input type="checkbox" id="cfgPromo" checked><label for="cfgPromo"><strong>Promoções e lançamentos</strong><small>Novidades, descontos exclusivos e novas coleções.</small></label></div>
      <div class="user-checkbox-row"><input type="checkbox" id="cfgPedidos" checked><label for="cfgPedidos"><strong>Atualizações de pedido</strong><small>Status de produção, envio e entrega.</small></label></div>
      <div class="user-checkbox-row"><input type="checkbox" id="cfgNews"><label for="cfgNews"><strong>Newsletter Gold Crochet</strong><small>Bastidores, artigos sobre crochê e inspirações.</small></label></div>
    </div>
    <div class="user-tab-card">
      <h2>Sessão</h2>
      <p class="user-card-sub">Finalize sua sessão neste dispositivo com segurança.</p>
      <button type="button" class="user-logout-btn" onclick="logoutUser()" style="display:inline-flex;align-items:center;gap:8px;background:rgba(235,87,87,0.08);border:1.5px solid rgba(235,87,87,0.35);color:#d93025;padding:12px 20px;border-radius:var(--radius-pill);font-weight:700;font-size:0.9rem;cursor:pointer;transition:all 0.2s ease;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        Sair da minha conta
      </button>
    </div>
    <div class="user-tab-card">
      <h2>Privacidade</h2>
      <p class="user-card-sub">Você pode excluir sua conta e dados a qualquer momento.</p>
      <button class="user-danger-btn" onclick="deleteUserAccount()">Excluir minha conta</button>
    </div>
  `;
}
function deleteUserAccount() {
  const user = auth.currentUser;
  if (!user) return;
  if (!confirm('Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.')) return;
  deleteUser(user)
    .then(() => { showToast('Conta excluída.'); showPage('inicio'); })
    .catch(err => showToast('❌ ' + err.message + ' (talvez seja necessário fazer login novamente)', 'error'));
}

document.getElementById('searchOverlay').addEventListener('click', (e) => { if (e.target === document.getElementById('searchOverlay')) closeSearchOverlay(); });

async function initApp() {
  setupLogos();
  setupMenuAria();
  setupMenuInteractions();
  setupMenuKeyboardNavigation();
  initMegaMenus();
  positionSearchButton();
  positionNavDropdowns();

  // NOVAS FEATURES
  setupSwipeBack();
  setupCarouselDrag();
  setupProductSwipeDismiss();

  loadCart(); loadFavorites();
  handleScroll();
  updateFavCount();
  updateAuthUI();
  updateLeftMenuAccount();
  updateDrawerCounts();
  renderUserDropdown();

  document.getElementById('productsGrid').innerHTML = Array(6).fill('<div class="skeleton skeleton-card"></div>').join('');
  await loadData();
  applySiteConfig();
  renderCarousel(); renderFilters(); renderProducts(); renderNovidades(); renderColecoes(); updateCartUI();
  updateFavCount();
  updateLeftMenuAccount();
  updateDrawerCounts();
  renderUserDropdown();
  initReveal();
  positionNavDropdowns();
  syncMobileBottomNav('inicio');
  syncLeftMenuActive('inicio');
  if(!localStorage.getItem('goldcrochet_cookies')) setTimeout(()=>document.getElementById('cookieBanner').classList.add('show'),2200);
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

window.addEventListener('resize', () => {
  positionSearchButton();
  positionNavDropdowns();
});

async function handleNewsletterSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  const input = document.getElementById('footerNewsletterEmail');
  const btn = document.getElementById('footerNewsletterBtn');
  const msg = document.getElementById('footerNewsletterMsg');
  if (!input || !btn) return;

  const email = (input.value || '').trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    if (msg) {
      msg.textContent = '⚠️ Por favor, insira um e-mail válido.';
      msg.className = 'footer-newsletter-msg error';
    }
    return;
  }

  btn.disabled = true;
  const originalBtnHtml = btn.innerHTML;
  btn.innerHTML = '<span>Cadastrando...</span>';
  if (msg) {
    msg.textContent = '';
    msg.className = 'footer-newsletter-msg';
  }

  try {
    // 1. Salvar no Firestore (se conectado)
    try {
      const subId = 'sub_' + Date.now();
      await setDoc(fsDoc(db, 'newsletter', subId), {
        email,
        active: true,
        source: 'footer',
        subscribedAt: new Date().toISOString()
      });
    } catch (fsErr) {
      console.warn('[Firestore] Inscrição salva localmente:', fsErr);
    }

    // 2. Salvar localmente no navegador (Jamstack)
    try {
      const list = JSON.parse(localStorage.getItem('goldcrochet_newsletter') || '[]');
      if (!list.some(item => item.email === email)) {
        list.push({ email, subscribedAt: new Date().toISOString(), source: 'footer' });
        localStorage.setItem('goldcrochet_newsletter', JSON.stringify(list));
      }
    } catch(e) {}

    localStorage.setItem('goldcrochet_newsletter_email', email);
    input.value = '';
    btn.innerHTML = '<span>Inscrito(a)! ✨</span>';
    if (msg) {
      msg.textContent = '✨ Parabéns! Você agora faz parte do Clube Gold Crochet.';
      msg.className = 'footer-newsletter-msg success';
    }
    showToast('💌 Inscrição confirmada com sucesso!');

    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = originalBtnHtml;
    }, 4000);
  } catch (err) {
    console.error('Erro ao cadastrar newsletter:', err);
    btn.disabled = false;
    btn.innerHTML = originalBtnHtml;
    if (msg) {
      msg.textContent = '❌ Erro ao cadastrar. Tente novamente mais tarde.';
      msg.className = 'footer-newsletter-msg error';
    }
  }
}

Object.assign(window, {
  showPage, goBackPage, toggleLeftMenu, closeLeftMenu, navigateFromMenu,
  navigateFromSubMenu, togglePecasSubmenu, toggleCasaSubmenu,
  openSearchFromMenu, openFavoritesFromMenu, openCartFromMenu,
  handleAccountFromMenu, handleAccountAction, handleFavoritesAction,
  megaGoTo, megaGoToCategory, megaGoToSection, megaGoToSectionGender,
  megaGoToCollection,
  toggleSearchOverlay, openSearchOverlay, closeSearchOverlay,
  onSearchOverlay, clearSearchOverlayInput,
  openProductPage, openModal, toggleFavorite, setFilter, setSectionFilter,
  setSectionGenderFilter, setCollectionFilter, clearAllFilters,
  setColecaoFilter, openCollection, onSearch, clearSearch,
  toggleCart, closeCart, openCart, checkout, handleCheckoutAction, removeFromCart, changeQty,
  addToCart, addToCartFromModal, addToCartFromProductPage, openUserModalFromCart,
  openFavorites, closeFavorites, openModalFromFav,
  closeModal, switchMedia, galleryPrev, galleryNext,
  openUserModal, closeUserModal, showLogin, showRegister,
  loginUser, loginWithGoogle, registerUser, logoutUser, openUserAccountPage,
  handleLoginSubmit, handleRegisterSubmit, resetPassword, togglePasswordVisibility,
  closeUserDropdown, openUserDropdown, toggleUserDropdown,
  setUserTab, saveUserConta, deleteUserAccount,
  prevSlide, nextSlide,
  openBlogPost,
  acceptCookies,
  openFilterSheet, closeFilterSheet, applyFilterSheet, clearFilterSheet,
  syncMobileBottomNav, syncLeftMenuActive,
  handleNewsletterSubmit
});
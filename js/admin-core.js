/**
 * Gold Crochet — Admin Core Engine (2026)
 * Gerenciamento em tempo real com Firebase Auth, Firestore e GitHub.
 */

// Chaves e configurações
const GH_OWNER = 'goldcrochet-shop';
const GH_REPO = 'goldcrochet-shop.github.io';
const GH_BRANCH = 'main';
const DEFAULT_GH_TOKEN = '';
const ADMIN_EMAILS = ['goldcrochet.suporte@gmail.com', 'rossipereira2010@gmail.com'];
const MASTER_PASSWORD = 'goldcrochet2026';

// Estado global da aplicação admin
export const adminState = {
  currentUser: null,
  isAuthenticated: false,
  products: [],
  categories: [],
  collections: [],
  activeGallery: [],
  orders: [],
  customers: [],
  coupons: [],
  logs: [],
  metrics: {
    totalRevenue: 0,
    activeOrders: 0,
    totalProducts: 0,
    totalCategories: 0,
    avgTicket: 0
  },
  currentView: 'overview',
  catalogDisplayMode: localStorage.getItem('gc_catalog_display_mode') || 'cards',
  searchQuery: '',
  selectedCategoryFilter: 'all',
  customerSearchQuery: '',
  orderStatusFilter: 'all',
  orderSearchQuery: '',
  activeDetailOrderId: null,
  editingProductId: null,
  isSyncing: false,
  audioAlertsEnabled: localStorage.getItem('gc_admin_audio') !== 'false',
  theme: localStorage.getItem('gc_admin_theme') || 'light'
};

// Utilitários de Formatação
export function formatBRL(val) {
  const num = Number(val) || 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(timestamp) {
  if (!timestamp) return '—';
  try {
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch (e) {
    return '—';
  }
}

export function showToast(message, type = 'info') {
  const container = document.getElementById('adminToastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `admin-toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
    <span class="toast-msg">${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

export function logActivity(action, details = '') {
  const entry = {
    id: Date.now(),
    action,
    details,
    time: new Date().toISOString()
  };
  adminState.logs.unshift(entry);
  if (adminState.logs.length > 50) adminState.logs.pop();
  try {
    localStorage.setItem('gc_admin_logs', JSON.stringify(adminState.logs));
  } catch(e) {}
}

// ════════════════════════════════════════
// AUTENTICAÇÃO FIREBASE AUTH
// ════════════════════════════════════════

export async function loginWithEmail(email, password) {
  if (!email || !password) {
    showToast('Informe seu e-mail e senha.', 'error');
    return false;
  }

  // Suporte a bypass com senha master
  if (password === MASTER_PASSWORD && (!email || ADMIN_EMAILS.includes(email.trim().toLowerCase()) || email === 'admin')) {
    const mockUser = {
      email: email && email !== 'admin' ? email : 'rossipereira2010@gmail.com',
      displayName: 'Administradora Rossi Pereira',
      uid: 'master-session-' + Date.now()
    };
    setSessionUser(mockUser);
    showToast('Acesso master concedido com sucesso!', 'success');
    logActivity('Login Master', mockUser.email);
    return true;
  }

  const fb = window.GoldFirebase;
  if (!fb || !fb.auth) {
    showToast('Firebase SDK não disponível.', 'error');
    return false;
  }

  try {
    const cred = await fb.signInWithEmailAndPassword(fb.auth, email.trim(), password);
    const user = cred.user;
    setSessionUser(user);
    showToast(`Bem-vinda, ${user.displayName || user.email}!`, 'success');
    logActivity('Login Firebase Auth', user.email);
    return true;
  } catch (err) {
    console.error('[Admin Auth Error]', err);
    let msg = 'Erro ao realizar login.';
    if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
      msg = 'E-mail ou senha incorretos.';
    } else if (err.code === 'auth/user-not-found') {
      msg = 'Usuário não cadastrado no Firebase Auth.';
    } else if (err.code === 'auth/too-many-requests') {
      msg = 'Muitas tentativas. Aguarde instantes ou use a chave master.';
    }
    showToast(msg, 'error');
    return false;
  }
}

export async function loginWithGoogle() {
  const fb = window.GoldFirebase;
  if (!fb || !fb.auth || !fb.googleProvider) {
    showToast('Autenticação Google não configurada.', 'error');
    return false;
  }

  try {
    const cred = await fb.signInWithPopup(fb.auth, fb.googleProvider);
    const user = cred.user;
    if (ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      setSessionUser(user);
      showToast(`Conectado como ${user.displayName || user.email}!`, 'success');
      logActivity('Login Google Auth', user.email);
      return true;
    } else {
      showToast(`O e-mail ${user.email} não possui permissão de administrador.`, 'error');
      await fb.signOut(fb.auth);
      return false;
    }
  } catch (err) {
    console.error('[Admin Google Auth Error]', err);
    showToast('Falha no login com Google: ' + err.message, 'error');
    return false;
  }
}

export function logout() {
  const fb = window.GoldFirebase;
  if (fb && fb.auth) {
    fb.signOut(fb.auth).catch(() => {});
  }
  adminState.currentUser = null;
  adminState.isAuthenticated = false;
  sessionStorage.removeItem('gc_admin_user');
  localStorage.removeItem('gc_admin_session');
  document.getElementById('adminApp').classList.add('hidden');
  document.getElementById('loginScreen').classList.remove('hidden');
  showToast('Sessão encerrada com segurança.', 'info');
}

function setSessionUser(user) {
  adminState.currentUser = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email.split('@')[0],
    photoURL: user.photoURL || null
  };
  adminState.isAuthenticated = true;
  sessionStorage.setItem('gc_admin_user', JSON.stringify(adminState.currentUser));
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('adminApp').classList.remove('hidden');
  updateAdminHeaderUI();
  initDashboardData();
}

export function initAuthStateListener() {
  const fb = window.GoldFirebase;
  if (!fb || !fb.auth) {
    checkSavedSession();
    return;
  }

  fb.onAuthStateChanged(fb.auth, (user) => {
    if (user && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      setSessionUser(user);
    } else {
      checkSavedSession();
    }
  });
}

function checkSavedSession() {
  try {
    const saved = sessionStorage.getItem('gc_admin_user');
    if (saved) {
      const u = JSON.parse(saved);
      if (u && u.email) {
        setSessionUser(u);
      }
    }
  } catch(e) {}
}

function updateAdminHeaderUI() {
  const emailEl = document.getElementById('adminUserEmail');
  const nameEl = document.getElementById('adminUserName');
  const avatarEl = document.getElementById('adminUserAvatar');

  if (adminState.currentUser) {
    if (emailEl) emailEl.textContent = adminState.currentUser.email;
    if (nameEl) nameEl.textContent = adminState.currentUser.displayName || 'Gestora Ateliê';
    if (avatarEl && adminState.currentUser.photoURL) {
      avatarEl.src = adminState.currentUser.photoURL;
    }
  }
}

// ════════════════════════════════════════
// SINCRONIZAÇÃO EM TEMPO REAL & FIRESTORE
// ════════════════════════════════════════

export async function initDashboardData() {
  adminState.isSyncing = true;
  updateSyncBadge('sincronizando');

  // Carrega do cache local primeiro para resposta instantânea (<30ms)
  loadLocalCache();
  renderCurrentView();

  // Conecta ao Firestore
  try {
    await Promise.all([
      syncProductsFromFirestore(),
      syncCategoriesFromFirestore(),
      syncCollectionsFromFirestore(),
      syncOrdersFromFirestore(),
      syncCustomersFromFirestore()
    ]);
    calculateMetrics();
    renderCurrentView();
    updateSyncBadge('online');
  } catch (err) {
    console.warn('[Admin Sync Notice] Operando com cache local resiliente:', err);
    updateSyncBadge('local');
  } finally {
    adminState.isSyncing = false;
  }
}

function updateSyncBadge(status) {
  const badge = document.getElementById('dbSyncStatusBadge');
  if (!badge) return;
  if (status === 'online') {
    badge.className = 'status-pill status-online';
    badge.innerHTML = '<span class="status-dot"></span> Firestore Online';
  } else if (status === 'sincronizando') {
    badge.className = 'status-pill status-syncing';
    badge.innerHTML = '<span class="status-dot"></span> Sincronizando...';
  } else {
    badge.className = 'status-pill status-local';
    badge.innerHTML = '<span class="status-dot"></span> Modo Local';
  }
}

function loadLocalCache() {
  try {
    const localProds = localStorage.getItem('gc_cached_products');
    if (localProds) adminState.products = JSON.parse(localProds);

    const localCats = localStorage.getItem('gc_cached_categories');
    if (localCats) adminState.categories = JSON.parse(localCats);

    const localOrders = localStorage.getItem('gc_cached_orders');
    if (localOrders) adminState.orders = JSON.parse(localOrders);

    const localLogs = localStorage.getItem('gc_admin_logs');
    if (localLogs) adminState.logs = JSON.parse(localLogs);
  } catch (e) {}

  // Se o catálogo estiver vazio, carrega de data.json
  if (!adminState.products.length) {
    fetchDefaultCatalog();
  }
}

async function fetchDefaultCatalog() {
  try {
    const res = await fetch('./data.json?v=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      if (data.products && data.products.length) {
        adminState.products = data.products;
        localStorage.setItem('gc_cached_products', JSON.stringify(data.products));
      }
      if (data.categories && data.categories.length) {
        adminState.categories = data.categories.map(c => typeof c === 'string' ? { id: c, name: c.toUpperCase(), slug: c } : c);
        localStorage.setItem('gc_cached_categories', JSON.stringify(adminState.categories));
      }
      calculateMetrics();
      renderCurrentView();
    }
  } catch(e) {}
}

export async function syncProductsFromFirestore() {
  const fb = window.GoldFirebase;
  if (!fb || !fb.db) return;

  try {
    const colRef = fb.fsCollection(fb.db, 'products');
    const snapshot = await fb.getDocs(colRef);

    if (!snapshot.empty) {
      const list = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      adminState.products = list;
      localStorage.setItem('gc_cached_products', JSON.stringify(list));
    } else if (adminState.products.length) {
      // Primeira inicialização: semeia os produtos locais no Firestore
      console.log('✨ [Admin] Semeando catálogo inicial no Firestore...');
      for (const p of adminState.products) {
        const docId = String(p.id || p.slug || Date.now());
        await fb.setDoc(fb.fsDoc(fb.db, 'products', docId), p, { merge: true });
      }
    }
  } catch (err) {
    console.warn('[Firestore Products Read]', err.message);
  }
}

export async function syncCategoriesFromFirestore() {
  const fb = window.GoldFirebase;
  if (!fb || !fb.db) return;

  try {
    const colRef = fb.fsCollection(fb.db, 'categories');
    const snapshot = await fb.getDocs(colRef);

    if (!snapshot.empty) {
      const list = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      adminState.categories = list;
      localStorage.setItem('gc_cached_categories', JSON.stringify(list));
    } else if (adminState.categories.length) {
      for (const c of adminState.categories) {
        const docId = String(c.id || c.slug);
        await fb.setDoc(fb.fsDoc(fb.db, 'categories', docId), c, { merge: true });
      }
    }
  } catch (err) {
    console.warn('[Firestore Categories Read]', err.message);
  }
}

export async function syncOrdersFromFirestore() {
  const fb = window.GoldFirebase;
  if (!fb || !fb.db) return;
  loadWhatsAppSettings();

  try {
    const colRef = fb.fsCollection(fb.db, 'orders');
    const q = fb.fsQuery(colRef, fb.orderBy ? fb.orderBy('createdAt', 'desc') : fb.where('total', '>=', 0));
    const snapshot = await fb.getDocs(q);

    const list = [];
    snapshot.forEach(docSnap => {
      list.push({ id: docSnap.id, ...docSnap.data() });
    });
    adminState.orders = list;
    localStorage.setItem('gc_cached_orders', JSON.stringify(list));

    // Ouvinte em tempo real para novos pedidos
    if (fb.onSnapshot) {
      let isFirstSnapshot = true;
      fb.onSnapshot(colRef, (liveSnap) => {
        const liveList = [];
        liveSnap.forEach(d => liveList.push({ id: d.id, ...d.data() }));
        
        // Verifica se há pedido novo após o carregamento inicial
        if (!isFirstSnapshot && liveList.length > adminState.orders.length) {
          playOrderNotificationChime();
          showToast('🔔 Novo pedido recebido no Ateliê!', 'success');
        }
        isFirstSnapshot = false;

        adminState.orders = liveList;
        try { localStorage.setItem('gc_cached_orders', JSON.stringify(liveList)); } catch(e) {}
        calculateMetrics();
        if (adminState.currentView === 'orders' || adminState.currentView === 'overview') {
          renderCurrentView();
        }
      });
    }
  } catch (err) {
    console.warn('[Firestore Orders Read]', err.message);
  }
}

export async function syncCustomersFromFirestore() {
  const fb = window.GoldFirebase;
  if (!fb || !fb.db) return;

  try {
    const colRef = fb.fsCollection(fb.db, 'users');
    const snapshot = await fb.getDocs(colRef).catch(() => null);

    const list = [];
    if (snapshot && !snapshot.empty) {
      snapshot.forEach(docSnap => {
        const u = docSnap.data();
        if (u.role !== 'admin') {
          list.push({ id: docSnap.id, ...u });
        }
      });
    }

    // Mescla com compradores identificados nos pedidos para garantir que ninguém fique de fora
    adminState.orders.forEach(o => {
      if (o.userEmail && !list.some(c => c.email && c.email.toLowerCase() === o.userEmail.toLowerCase())) {
        list.push({
          id: o.userId || ('client_' + Math.abs(o.userEmail.split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0))),
          name: o.userName || 'Cliente Gold',
          email: o.userEmail,
          phone: o.phone || '',
          purchasesCount: 1,
          giftsClaimed: 0
        });
      }
    });

    adminState.customers = list;
    try { localStorage.setItem('gc_cached_customers', JSON.stringify(list)); } catch(e) {}
    
    const badge = document.getElementById('navBadgeCustomers');
    if (badge) badge.textContent = list.length;

    if (adminState.currentView === 'customers') {
      renderCustomersList();
    }
  } catch (err) {
    console.warn('[Firestore Customers Read]', err.message);
  }
}

export function playOrderNotificationChime() {
  if (!adminState.audioAlertsEnabled) return;
  try {
    const audio = document.getElementById('gcOrderAudioNotification');
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  } catch(e) {}
}

export function calculateMetrics() {
  let rev = 0;
  let active = 0;
  let validOrdersCount = 0;

  adminState.orders.forEach(o => {
    const val = Number(o.total) || 0;
    if (o.status !== 'cancelado') {
      rev += val;
      validOrdersCount++;
    }
    if (o.status === 'pendente' || o.status === 'producao') active++;
  });

  const avg = validOrdersCount > 0 ? (rev / validOrdersCount) : 0;

  adminState.metrics = {
    totalRevenue: rev,
    activeOrders: active,
    totalProducts: adminState.products.length,
    totalCategories: adminState.categories.length || 6,
    avgTicket: avg
  };

  updateSidebarBadges();
}

export function updateSidebarBadges() {
  const pBadge = document.getElementById('navBadgeProducts');
  const cBadge = document.getElementById('navBadgeCategories');
  const oBadge = document.getElementById('navBadgeOrders');
  const activeCounter = document.getElementById('adminActiveOrdersCounter');

  if (pBadge) pBadge.textContent = adminState.products.length;
  if (cBadge) cBadge.textContent = adminState.categories.length;
  if (oBadge) oBadge.textContent = adminState.orders.length;
  if (activeCounter) activeCounter.textContent = `${adminState.metrics.activeOrders} pedidos em andamento`;

  // Atualiza contadores nas abas de filtros de pedidos
  const counts = { all: adminState.orders.length, pendente: 0, producao: 0, enviado: 0, entregue: 0, cancelado: 0 };
  adminState.orders.forEach(o => {
    const st = o.status || 'pendente';
    if (counts[st] !== undefined) counts[st]++;
  });

  ['All', 'Pendente', 'Producao', 'Enviado', 'Entregue', 'Cancelado'].forEach(st => {
    const el = document.getElementById('countOrder' + st);
    if (el) el.textContent = counts[st.toLowerCase()] || 0;
  });
}

// ════════════════════════════════════════
// CRUD DE PRODUTOS
// ════════════════════════════════════════

export async function saveProduct(productData) {
  const isEdit = !!adminState.editingProductId;
  const id = isEdit ? adminState.editingProductId : Date.now();

  const fullProduct = {
    ...productData,
    id,
    updatedAt: new Date().toISOString()
  };

  // 1. Atualização Otimista Imediata
  if (isEdit) {
    const idx = adminState.products.findIndex(p => String(p.id) === String(id));
    if (idx !== -1) adminState.products[idx] = fullProduct;
  } else {
    adminState.products.unshift(fullProduct);
  }

  localStorage.setItem('gc_cached_products', JSON.stringify(adminState.products));
  calculateMetrics();
  renderCurrentView();
  closeProductModal();
  showToast(isEdit ? 'Peça atualizada com sucesso!' : 'Nova peça cadastrada!', 'success');
  logActivity(isEdit ? 'Atualizou Produto' : 'Cadastrou Produto', fullProduct.name);

  // 2. Gravação em segundo plano no Firestore
  const fb = window.GoldFirebase;
  if (fb && fb.db) {
    try {
      const docRef = fb.fsDoc(fb.db, 'products', String(id));
      await fb.setDoc(docRef, fullProduct, { merge: true });
      showToast('☁️ Sincronizado no Firestore!', 'success');
    } catch (err) {
      console.warn('[Firestore Save Error]', err);
    }
  }
}

export async function deleteProduct(productId) {
  if (!confirm('Tem certeza de que deseja remover esta peça do catálogo?')) return;

  const idx = adminState.products.findIndex(p => String(p.id) === String(productId));
  if (idx === -1) return;

  const removed = adminState.products.splice(idx, 1)[0];
  localStorage.setItem('gc_cached_products', JSON.stringify(adminState.products));
  calculateMetrics();
  renderCurrentView();
  showToast('Peça removida do catálogo.', 'info');
  logActivity('Removeu Produto', removed.name);

  const fb = window.GoldFirebase;
  if (fb && fb.db) {
    try {
      const docRef = fb.fsDoc(fb.db, 'products', String(productId));
      await fb.deleteDoc(docRef);
    } catch(err) {
      console.warn('[Firestore Delete Error]', err);
    }
  }
}

// ════════════════════════════════════════
// CRUD DE CATEGORIAS
// ════════════════════════════════════════

export async function saveCategory(name, slug, icon = '🧶', description = '') {
  if (!name) return;
  const catSlug = slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const cat = {
    id: catSlug,
    name: name.trim(),
    slug: catSlug,
    icon,
    description
  };

  const existingIdx = adminState.categories.findIndex(c => c.slug === catSlug);
  if (existingIdx !== -1) {
    adminState.categories[existingIdx] = cat;
  } else {
    adminState.categories.push(cat);
  }

  localStorage.setItem('gc_cached_categories', JSON.stringify(adminState.categories));
  renderCurrentView();
  showToast(`Categoria "${name}" salva!`, 'success');
  logActivity('Salvou Categoria', name);

  const fb = window.GoldFirebase;
  if (fb && fb.db) {
    try {
      await fb.setDoc(fb.fsDoc(fb.db, 'categories', catSlug), cat, { merge: true });
    } catch(e) {}
  }
}

export async function deleteCategory(categorySlug) {
  if (!confirm(`Deseja excluir a categoria "${categorySlug}"?`)) return;

  adminState.categories = adminState.categories.filter(c => c.slug !== categorySlug);
  localStorage.setItem('gc_cached_categories', JSON.stringify(adminState.categories));
  renderCurrentView();
  showToast('Categoria removida.', 'info');
  logActivity('Removeu Categoria', categorySlug);

  const fb = window.GoldFirebase;
  if (fb && fb.db) {
    try {
      await fb.deleteDoc(fb.fsDoc(fb.db, 'categories', categorySlug));
    } catch(e) {}
  }
}

// ════════════════════════════════════════
// CRUD DE COLEÇÕES EXCLUSIVAS DO ATELIÊ
// ════════════════════════════════════════

export async function syncCollectionsFromFirestore() {
  try {
    const fb = window.GoldFirebase;
    if (fb && fb.db && fb.getDocs && fb.fsCollection) {
      const snap = await fb.getDocs(fb.fsCollection(fb.db, 'collections')).catch(() => null);
      if (snap && !snap.empty) {
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        adminState.collections = list;
        localStorage.setItem('gc_cached_collections', JSON.stringify(list));
        return;
      }
    }
  } catch(e) {
    console.warn('[Collections Firestore Error]', e);
  }

  // Fallback padrão se não houver coleções no Firestore
  if (!adminState.collections.length) {
    const cached = localStorage.getItem('gc_cached_collections');
    if (cached) {
      try { adminState.collections = JSON.parse(cached); } catch(e) {}
    }
    if (!adminState.collections.length) {
      adminState.collections = [
        { id: 'essenciais', slug: 'Essenciais', name: 'Coleção Essenciais', icon: '🧶', desc: 'O luxo despretensioso das formas puras e peças atemporais para qualquer ocasião.', image: './assets/hero-tropical-bg.jpg' },
        { id: 'alto-verao', slug: 'alto-verao', name: 'Alto Verão & Resort', icon: '☀️', desc: 'Leveza e fluidez sob a luz tropical: vestidos, regatas e bolsas de palha e algodão.', image: './assets/peca-personalizada.png' },
        { id: 'casa-brasil', slug: 'casa-brasil', name: 'Coleção Casa Brasil', icon: '🏡', desc: 'Aconchego botânico e requinte à mesa posta em peças de puro algodão.', image: './assets/hero-tropical-bg.jpg' }
      ];
      localStorage.setItem('gc_cached_collections', JSON.stringify(adminState.collections));
    }
  }
}

export function openCollectionModal(col = null) {
  const modal = document.getElementById('collectionModal');
  if (!modal) return;

  const idInput = document.getElementById('colModalId');
  const nameInput = document.getElementById('colModalName');
  const slugInput = document.getElementById('colModalSlug');
  const iconInput = document.getElementById('colModalIcon');
  const descInput = document.getElementById('colModalDesc');
  const imageInput = document.getElementById('colModalImage');
  const title = document.getElementById('collectionModalTitle');

  if (col) {
    if (title) title.textContent = `Editar Coleção: ${col.name}`;
    if (idInput) idInput.value = col.id || col.slug;
    if (nameInput) nameInput.value = col.name || '';
    if (slugInput) slugInput.value = col.slug || '';
    if (iconInput) iconInput.value = col.icon || '✨';
    if (descInput) descInput.value = col.desc || '';
    if (imageInput) imageInput.value = col.image || '';
  } else {
    if (title) title.textContent = 'Nova Coleção Exclusiva';
    if (idInput) idInput.value = '';
    if (nameInput) nameInput.value = '';
    if (slugInput) slugInput.value = '';
    if (iconInput) iconInput.value = '✨';
    if (descInput) descInput.value = '';
    if (imageInput) imageInput.value = '';
  }

  modal.classList.remove('hidden');
}

export function closeCollectionModal() {
  const modal = document.getElementById('collectionModal');
  if (modal) modal.classList.add('hidden');
}

export async function saveCollection(data) {
  const slug = (data.slug || data.name).toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  const id = data.id || slug;
  const colObj = {
    id,
    name: data.name.trim(),
    slug: data.slug.trim() || slug,
    icon: data.icon || '✨',
    desc: data.desc || '',
    image: data.image || '',
    updatedAt: new Date().toISOString()
  };

  const idx = adminState.collections.findIndex(c => c.id === id || c.slug === colObj.slug);
  if (idx !== -1) {
    adminState.collections[idx] = colObj;
  } else {
    adminState.collections.push(colObj);
  }

  localStorage.setItem('gc_cached_collections', JSON.stringify(adminState.collections));
  renderCollectionsList();
  closeCollectionModal();
  showToast(`Coleção "${colObj.name}" salva com sucesso!`, 'success');
  logActivity('Salvou Coleção', colObj.name);

  const fb = window.GoldFirebase;
  if (fb && fb.db) {
    try {
      await fb.setDoc(fb.fsDoc(fb.db, 'collections', String(id)), colObj, { merge: true });
    } catch(err) {
      console.warn('[Firestore Collection Save Error]', err);
    }
  }
}

export async function deleteCollection(idOrSlug) {
  if (!confirm(`Deseja excluir a coleção "${idOrSlug}"?`)) return;

  adminState.collections = adminState.collections.filter(c => c.id !== idOrSlug && c.slug !== idOrSlug);
  localStorage.setItem('gc_cached_collections', JSON.stringify(adminState.collections));
  renderCollectionsList();
  showToast('Coleção excluída.', 'info');
  logActivity('Removeu Coleção', idOrSlug);

  const fb = window.GoldFirebase;
  if (fb && fb.db) {
    try {
      await fb.deleteDoc(fb.fsDoc(fb.db, 'collections', String(idOrSlug)));
    } catch(e) {}
  }
}

export function renderCollectionsList() {
  const grid = document.getElementById('collectionsGrid');
  if (!grid) return;

  const badge = document.getElementById('navBadgeCollections');
  if (badge) badge.textContent = adminState.collections.length;

  if (!adminState.collections.length) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1">Nenhuma coleção cadastrada no momento.</div>';
    return;
  }

  grid.innerHTML = adminState.collections.map(col => {
    const productsInCol = adminState.products.filter(p => p.collection === col.name || p.collection === col.slug || (p.category && p.category.toLowerCase() === col.slug.toLowerCase())).length;

    return `
      <div class="category-card" style="display:flex;flex-direction:column;justify-content:space-between;border:1px solid var(--border);border-radius:var(--radius-md);padding:20px;background:var(--surface)">
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <span style="font-size:2rem">${col.icon || '✨'}</span>
            <span class="status-pill status-online" style="font-size:0.75rem">${productsInCol} peças ativas</span>
          </div>
          <h4 style="font-family:var(--font-display);font-size:1.15rem;margin:0 0 4px">${col.name}</h4>
          <span style="font-size:0.75rem;color:var(--text-muted);font-family:var(--font-mono)">slug: ${col.slug}</span>
          <p style="font-size:0.83rem;color:var(--text-muted);margin:10px 0 0;line-height:1.4">${col.desc || 'Sem descrição editorial.'}</p>
        </div>
        <div style="display:flex;gap:8px;margin-top:18px;justify-content:flex-end">
          <button class="btn-action edit" onclick="window.AdminCore.editCollection('${col.id || col.slug}')" title="Editar Coleção">✏️</button>
          <button class="btn-action delete" onclick="window.AdminCore.deleteCollection('${col.id || col.slug}')" title="Excluir Coleção">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

// ════════════════════════════════════════
// GESTÃO DE PEDIDOS
// ════════════════════════════════════════

export async function updateOrderStatus(orderId, newStatus) {
  const order = adminState.orders.find(o => String(o.id) === String(orderId));
  if (!order) return;

  order.status = newStatus;
  localStorage.setItem('gc_cached_orders', JSON.stringify(adminState.orders));
  calculateMetrics();
  renderCurrentView();
  showToast(`Pedido ${orderCode(order)} atualizado para "${newStatus}".`, 'success');
  logActivity('Atualizou Status Pedido', `${orderCode(order)} -> ${newStatus}`);

  // Oferece avisar a cliente pelo WhatsApp com a mensagem do status
  if (confirm(`Avisar ${order.userName || 'a cliente'} pelo WhatsApp sobre o novo status?`)) {
    window.open(buildCustomerWhatsAppLink(order, newStatus), '_blank');
  }

  const fb = window.GoldFirebase;
  if (fb && fb.db) {
    try {
      const docRef = fb.fsDoc(fb.db, 'orders', String(orderId));
      await fb.updateDoc(docRef, { status: newStatus });
    } catch (e) {
      showToast('Status não salvo no Firestore: ' + e.message, 'error');
    }
  }
}

// ════════════════════════════════════════
// INTEGRAÇÃO GITHUB PUSH
// ════════════════════════════════════════

export async function pushCatalogToGitHub(token = '') {
  const ghToken = token || localStorage.getItem('gh_token') || DEFAULT_GH_TOKEN;
  if (!ghToken) {
    showToast('Token do GitHub não fornecido.', 'error');
    return false;
  }

  showToast('Conectando ao GitHub...', 'info');
  const payloadData = {
    products: adminState.products,
    categories: adminState.categories.map(c => c.slug || c),
    _meta: {
      updated: new Date().toISOString(),
      version: '5.0',
      syncedBy: adminState.currentUser?.email || 'admin'
    }
  };

  const contentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(payloadData, null, 2))));
  const apiUrl = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/data.json`;

  try {
    // 1. Obtém o SHA atual do arquivo
    let sha = '';
    const getRes = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${ghToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    if (getRes.ok) {
      const curFile = await getRes.json();
      sha = curFile.sha;
    }

    // 2. Faz o commit / PUT com o novo conteúdo
    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${ghToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Admin: Atualização do catálogo Gold Crochet (${adminState.products.length} peças)`,
        content: contentBase64,
        sha: sha || undefined,
        branch: GH_BRANCH
      })
    });

    if (!putRes.ok) {
      const errJson = await putRes.json();
      throw new Error(errJson.message || 'Falha ao salvar no repositório');
    }

    localStorage.setItem('gh_token', ghToken);
    showToast('🚀 Catálogo enviado para o GitHub com sucesso!', 'success');
    logActivity('GitHub Push Concluído', `Commit data.json em ${GH_BRANCH}`);
    return true;
  } catch (err) {
    console.error('[GitHub API Push Error]', err);
    showToast('Erro no envio ao GitHub: ' + err.message, 'error');
    return false;
  }
}

// ════════════════════════════════════════
// RENDERIZAÇÃO DA INTERFACE DO PAINEL
// ════════════════════════════════════════

export function switchView(viewName) {
  adminState.currentView = viewName;
  document.querySelectorAll('.view-container').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.admin-nav-item').forEach(el => el.classList.remove('active'));

  const targetView = document.getElementById(`view${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`);
  if (targetView) targetView.classList.remove('hidden');

  const activeBtn = document.querySelector(`[data-view="${viewName}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  renderCurrentView();
}

export function renderCurrentView() {
  switch (adminState.currentView) {
    case 'overview':
      renderOverview();
      break;
    case 'products':
      renderProductsList();
      break;
    case 'categories':
      renderCategoriesList();
      break;
    case 'collections':
      renderCollectionsList();
      break;
    case 'orders':
      renderOrdersList();
      break;
    case 'customers':
      renderCustomersList();
      break;
    case 'sync':
      renderSyncView();
      break;
    case 'whatsapp':
      loadWhatsAppSettings();
      break;
  }
}

function renderOverview() {
  // Atualiza os KPIs
  const revEl = document.getElementById('kpiRevenue');
  const ordersEl = document.getElementById('kpiOrders');
  const prodsEl = document.getElementById('kpiProducts');
  const catsEl = document.getElementById('kpiCategories');

  if (revEl) revEl.textContent = formatBRL(adminState.metrics.totalRevenue);
  if (ordersEl) ordersEl.textContent = adminState.metrics.activeOrders;
  if (prodsEl) prodsEl.textContent = adminState.metrics.totalProducts;
  if (catsEl) catsEl.textContent = adminState.metrics.totalCategories;

  // Renderiza pedidos recentes na Visão Geral
  const recentOrdersEl = document.getElementById('overviewRecentOrders');
  if (recentOrdersEl) {
    const recents = adminState.orders.slice(0, 5);
    if (!recents.length) {
      recentOrdersEl.innerHTML = `<tr><td colspan="5" class="empty-state">Nenhum pedido recente registrado.</td></tr>`;
    } else {
      recentOrdersEl.innerHTML = recents.map(o => `
        <tr>
          <td><span class="order-id">#${(o.id || '').slice(-6)}</span></td>
          <td><strong>${o.userName || o.userEmail || 'Cliente VIP'}</strong></td>
          <td>${formatDate(o.createdAt)}</td>
          <td><strong>${formatBRL(o.total)}</strong></td>
          <td>
            <span class="status-chip status-${o.status || 'pendente'}">${o.status || 'pendente'}</span>
          </td>
        </tr>
      `).join('');
    }
  }

  // Renderiza logs recentes
  const logsEl = document.getElementById('overviewLogs');
  if (logsEl) {
    logsEl.innerHTML = adminState.logs.slice(0, 6).map(l => `
      <div class="log-item">
        <span class="log-bullet">•</span>
        <div class="log-info">
          <strong>${l.action}</strong>
          <small>${l.details ? `— ${l.details}` : ''}</small>
        </div>
        <span class="log-time">${new Date(l.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    `).join('') || '<p class="empty-state">Nenhuma atividade recente.</p>';
  }
}

export function setCatalogDisplayMode(mode) {
  adminState.catalogDisplayMode = mode;
  try { localStorage.setItem('gc_catalog_display_mode', mode); } catch(e) {}
  
  const btnCards = document.getElementById('btnViewCards');
  const btnTable = document.getElementById('btnViewTable');
  const cardsWrap = document.getElementById('productsCardsContainer');
  const tableWrap = document.getElementById('productsTableContainer');

  if (btnCards) btnCards.classList.toggle('active', mode === 'cards');
  if (btnTable) btnTable.classList.toggle('active', mode === 'table');
  if (cardsWrap) cardsWrap.style.display = mode === 'cards' ? 'grid' : 'none';
  if (tableWrap) tableWrap.style.display = mode === 'table' ? 'block' : 'none';

  renderProductsList();
}

export function renderProductsList() {
  const tbody = document.getElementById('productsTableBody');
  const cardsContainer = document.getElementById('productsCardsContainer');
  const tableWrap = document.getElementById('productsTableContainer');

  const mode = adminState.catalogDisplayMode || 'cards';
  if (cardsContainer) cardsContainer.style.display = mode === 'cards' ? 'grid' : 'none';
  if (tableWrap) tableWrap.style.display = mode === 'table' ? 'block' : 'none';

  const btnCards = document.getElementById('btnViewCards');
  const btnTable = document.getElementById('btnViewTable');
  if (btnCards) btnCards.classList.toggle('active', mode === 'cards');
  if (btnTable) btnTable.classList.toggle('active', mode === 'table');

  const query = (adminState.searchQuery || '').toLowerCase();
  const catFilter = adminState.selectedCategoryFilter;

  let filtered = adminState.products.filter(p => {
    const matchName = (p.name || '').toLowerCase().includes(query) || String(p.id).includes(query);
    const matchCat = catFilter === 'all' || p.category === catFilter;
    return matchName && matchCat;
  });

  // Ordenação configurável
  const sortMode = adminState.productSort || 'newest';
  if (sortMode === 'price-asc') {
    filtered.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
  } else if (sortMode === 'price-desc') {
    filtered.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
  } else if (sortMode === 'name') {
    filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  if (!filtered.length) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Nenhuma criação encontrada para os filtros aplicados.</td></tr>`;
    if (cardsContainer) cardsContainer.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px 20px;" class="empty-state">Nenhuma criação encontrada no catálogo.</div>`;
    return;
  }

  // 1. Renderiza Cards Vitrine Haute Couture
  if (cardsContainer) {
    cardsContainer.innerHTML = filtered.map(p => {
      const img = p.image || (p.gallery && p.gallery[0]) || './assets/icon.svg';
      const priceText = p.price ? formatBRL(p.price) : 'Sob Consulta';
      const inStock = p.inStock !== false;
      const stockBadge = inStock ? 
        `<span class="luxury-product-stock-tag in-stock" onclick="window.AdminCore.toggleProductStock('${p.id}')" style="cursor:pointer" title="Alternar estoque">✓ Pronta Entrega</span>` : 
        `<span class="luxury-product-stock-tag out-of-stock" onclick="window.AdminCore.toggleProductStock('${p.id}')" style="cursor:pointer" title="Alternar estoque">⏳ Sob Medida</span>`;
      const badgeHtml = p.badge ? `<div class="luxury-product-badge">${p.badge}</div>` : '';
      const catLabel = (p.category || 'peça').toUpperCase();

      return `
        <div class="luxury-product-card">
          <div class="luxury-product-thumb-wrap">
            <img src="${img}" alt="${p.name}" class="luxury-product-thumb" onerror="this.src='./assets/icon.svg'">
            ${badgeHtml}
            ${stockBadge}
          </div>
          <div class="luxury-product-body">
            <div class="luxury-product-meta">
              <span class="category-tag">${catLabel}</span>
              ${p.prod_time ? `<span>⏱ ${p.prod_time} dias</span>` : ''}
            </div>
            <h4 class="luxury-product-title">${p.name}</h4>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:10px;line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">
              ${p.desc || p.material || 'Peça autoral tecida à mão em fios nobres.'}
            </div>
            <div class="luxury-product-price-row">
              <div>
                <span style="font-size:0.7rem;color:var(--text-muted);display:block;text-transform:uppercase;">Valor Ateliê</span>
                <span class="luxury-product-price">${priceText}</span>
              </div>
              <div class="luxury-card-actions">
                <button class="btn-action edit" onclick="window.AdminCore.editProduct('${p.id}')" title="Editar Peça">✏️</button>
                <button class="btn-action" onclick="window.AdminCore.duplicateProduct('${p.id}')" title="Duplicar Peça">📋</button>
                <button class="btn-action view" onclick="window.open('./produtos/${p.slug || 'bolsa-paraty'}.html', '_blank')" title="Ver na Loja">👁</button>
                <button class="btn-action delete" onclick="window.AdminCore.deleteProduct('${p.id}')" title="Excluir Peça">🗑</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // 2. Renderiza Tabela Técnica
  if (tbody) {
    tbody.innerHTML = filtered.map(p => {
      const img = p.image || (p.gallery && p.gallery[0]) || './assets/icon.svg';
      const priceText = p.price ? formatBRL(p.price) : '<span style="color:#8b7a5a">Sob Consulta</span>';
      const discountBadge = p.discount ? `<span class="badge-discount">-${p.discount}%</span>` : '';
      const badgeText = p.badge ? `<span class="badge-featured">${p.badge}</span>` : '';
      const inStock = p.inStock !== false;
      const stockPill = inStock ? 
        `<span class="stock-pill in-stock" onclick="window.AdminCore.toggleProductStock('${p.id}')" style="cursor:pointer" title="Clique para alternar estoque">✓ Em Estoque</span>` : 
        `<span class="stock-pill out-of-stock" onclick="window.AdminCore.toggleProductStock('${p.id}')" style="cursor:pointer" title="Clique para alternar estoque">⏳ Sob Medida</span>`;
      const prodTime = p.prod_time ? `<br><small style="color:var(--text-muted);font-size:0.75rem">${p.prod_time} dias prod.</small>` : '';

      return `
        <tr>
          <td style="width:56px">
            <img src="${img}" alt="${p.name}" class="product-thumb" onerror="this.src='./assets/icon.svg'">
          </td>
          <td>
            <div class="product-name-cell">
              <strong>${p.name}</strong>
              <small>ID: ${p.id} ${p.slug ? `· /${p.slug}` : ''}</small>
            </div>
          </td>
          <td>
            <span class="category-tag">${(p.category || 'vestuario').toUpperCase()}</span>
          </td>
          <td>
            <div class="price-cell">
              ${priceText} ${discountBadge}
            </div>
          </td>
          <td>${badgeText || '—'}</td>
          <td>
            ${stockPill}${prodTime}
          </td>
          <td class="table-actions">
            <button class="btn-action edit" onclick="window.AdminCore.editProduct('${p.id}')" title="Editar Peça">✏️</button>
            <button class="btn-action" onclick="window.AdminCore.duplicateProduct('${p.id}')" title="Duplicar Peça">📋</button>
            <button class="btn-action view" onclick="window.open('./produtos/${p.slug || 'bolsa-paraty'}.html', '_blank')" title="Ver na Loja ao Vivo">👁</button>
            <button class="btn-action delete" onclick="window.AdminCore.deleteProduct('${p.id}')" title="Excluir Peça">🗑</button>
          </td>
        </tr>
      `;
    }).join('');
  }
}

export function renderCategoriesList() {
  const container = document.getElementById('categoriesGrid');
  if (!container) return;

  const cats = adminState.categories.length ? adminState.categories : [
    { id: 'bolsas', name: 'Bolsas', slug: 'bolsas', icon: '👜' },
    { id: 'vestuario', name: 'Vestuário', slug: 'vestuario', icon: '👗' },
    { id: 'casa-gold', name: 'Casa Gold', slug: 'casa-gold', icon: '🏡' },
    { id: 'amigurumi', name: 'Amigurumi', slug: 'amigurumi', icon: '🧸' }
  ];

  container.innerHTML = cats.map(c => {
    const slug = c.slug || c.id || c;
    const name = c.name || (typeof c === 'string' ? c.toUpperCase() : slug);
    const count = adminState.products.filter(p => p.category === slug).length;

    return `
      <div class="category-card">
        <div class="category-card-top">
          <span class="category-icon">${c.icon || '🧶'}</span>
          <button class="btn-icon-subtle" onclick="window.AdminCore.deleteCategory('${slug}')" title="Excluir categoria">×</button>
        </div>
        <h4 class="category-name">${name}</h4>
        <span class="category-count">${count} ${count === 1 ? 'peça vinculada' : 'peças vinculadas'}</span>
        <div class="category-card-footer">
          <code>/${slug}</code>
        </div>
      </div>
    `;
  }).join('');
}

// ════════════════════════════════════════
// WHATSAPP ⇄ PEDIDOS
// ════════════════════════════════════════
const WA_STATUS_TEMPLATES = {
  pendente: 'Olá {nome}! Recebemos seu pedido {codigo} no Ateliê Gold Crochet ✨ Em breve enviaremos os dados de pagamento e prazo.',
  producao: 'Olá {nome}! Seu pedido {codigo} já está em produção no ateliê 🧶 Cada ponto feito à mão com carinho!',
  enviado: 'Olá {nome}! Seu pedido {codigo} foi enviado 📦 Em breve você recebe o código de rastreio.',
  entregue: 'Olá {nome}! Seu pedido {codigo} consta como entregue ✅ Esperamos que ame sua peça Gold Crochet!',
  cancelado: 'Olá {nome}. Seu pedido {codigo} foi cancelado. Qualquer dúvida, estamos à disposição por aqui.'
};

function getWaTemplates() {
  return { ...WA_STATUS_TEMPLATES, ...((adminState.waSettings && adminState.waSettings.templates) || {}) };
}

function orderCode(o) {
  return o.code || `#${String(o.id || '').slice(-6).toUpperCase()}`;
}

export function buildCustomerWhatsAppLink(o, status) {
  const tpl = getWaTemplates()[status || o.status || 'pendente'] || WA_STATUS_TEMPLATES.pendente;
  const text = tpl
    .replace(/\{nome\}/g, (o.userName || '').split(' ')[0] || '')
    .replace(/\{codigo\}/g, orderCode(o))
    .replace(/\{total\}/g, formatBRL(o.total));
  let phone = String(o.phone || '').replace(/\D/g, '');
  if (phone && phone.length <= 11) phone = '55' + phone; // DDD+número BR sem DDI
  // Sem telefone salvo: wa.me sem número abre o seletor de contatos
  return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function renderOrdersList() {
  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;

  const searchQuery = (adminState.orderSearchQuery || '').toLowerCase().trim();
  const statusFilter = adminState.orderStatusFilter || 'all';

  let filtered = [...adminState.orders];

  if (statusFilter !== 'all') {
    filtered = filtered.filter(o => (o.status || 'pendente') === statusFilter);
  }

  if (searchQuery) {
    filtered = filtered.filter(o => {
      const code = String(orderCode(o)).toLowerCase();
      const name = String(o.userName || '').toLowerCase();
      const email = String(o.userEmail || '').toLowerCase();
      const phone = String(o.phone || '').replace(/\D/g, '');
      return code.includes(searchQuery) || name.includes(searchQuery) || email.includes(searchQuery) || phone.includes(searchQuery);
    });
  }

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Nenhum pedido encontrado para os filtros selecionados.</td></tr>`;
    return;
  }

  const sorted = filtered.sort((a, b) => {
    const ta = (a.createdAt && (a.createdAt.seconds || Date.parse(a.createdAt) / 1000)) || 0;
    const tb = (b.createdAt && (b.createdAt.seconds || Date.parse(b.createdAt) / 1000)) || 0;
    return tb - ta;
  });

  tbody.innerHTML = sorted.map(o => {
    const dateStr = formatDate(o.createdAt);
    const totalStr = formatBRL(o.total);
    const items = Array.isArray(o.items) ? o.items : [];
    const itemsCount = items.reduce((s, i) => s + (Number(i.qty) || 1), 0) || 1;
    const itemsTitle = items.map(i => `${i.qty || 1}x ${i.name || ''}${i.color ? ` (${i.color})` : ''}`).join('\n').replace(/"/g, '&quot;');
    const sourceBadge = o.source === 'whatsapp-checkout' ? '<small style="color:var(--gold-deep)">💬 via WhatsApp</small>' : '';
    const phoneClean = String(o.phone || '').replace(/\D/g, '');
    const phoneDisplay = phoneClean ? `📱 (${phoneClean.slice(0,2)}) ${phoneClean.slice(2)}` : `<span style="color:var(--warning)">sem telefone</span>`;
    const trackingBadge = o.trackingCode ? `<br><small style="color:var(--info);font-family:var(--font-mono)">📦 ${o.trackingCode}</small>` : '';

    return `
      <tr>
        <td>
          <a href="javascript:void(0)" onclick="window.AdminCore.viewOrderDetail('${o.id}')" style="font-weight:800;color:var(--gold-deep);text-decoration:none">
            ${orderCode(o)}
          </a>
          <br>${sourceBadge}${trackingBadge}
        </td>
        <td>
          <div class="customer-cell">
            <strong>${o.userName || 'Cliente VIP'}</strong>
            <small>${o.userEmail || '—'}</small>
            <small>${phoneDisplay}</small>
          </div>
        </td>
        <td><small>${dateStr}</small></td>
        <td title="${itemsTitle}" style="cursor:help">
          <strong>${totalStr}</strong><br>
          <small style="color:var(--text-muted)">${itemsCount} ${itemsCount === 1 ? 'peça' : 'peças'}</small>
        </td>
        <td>
          <select class="status-select status-${o.status || 'pendente'}" onchange="window.AdminCore.updateOrderStatus('${o.id}', this.value)">
            <option value="pendente" ${o.status === 'pendente' ? 'selected' : ''}>⏳ Pendente</option>
            <option value="producao" ${o.status === 'producao' ? 'selected' : ''}>🧶 Em Produção</option>
            <option value="enviado" ${o.status === 'enviado' ? 'selected' : ''}>📦 Enviado</option>
            <option value="entregue" ${o.status === 'entregue' ? 'selected' : ''}>✅ Entregue</option>
            <option value="cancelado" ${o.status === 'cancelado' ? 'selected' : ''}>❌ Cancelado</option>
          </select>
        </td>
        <td class="table-actions">
          <button class="btn-action" onclick="window.AdminCore.viewOrderDetail('${o.id}')" title="Ver Detalhes do Pedido">🔍</button>
          <a href="${buildCustomerWhatsAppLink(o)}" target="_blank" rel="noopener" class="btn-action whatsapp" title="Avisar cliente pelo WhatsApp">💬</a>
          <button class="btn-action" onclick="window.AdminCore.printSingleOrder('${o.id}')" title="Imprimir Comprovante / Etiqueta">🖨️</button>
          <button class="btn-action edit" onclick="window.AdminCore.editOrderPhone('${o.id}')" title="Editar Telefone">📱</button>
          <button class="btn-action delete" onclick="window.AdminCore.deleteOrder('${o.id}')" title="Excluir Pedido">🗑</button>
        </td>
      </tr>
    `;
  }).join('');
}

export function filterOrdersByStatus(status) {
  adminState.orderStatusFilter = status;
  document.querySelectorAll('#orderStatusFilters .filter-tab-pill').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-filter') === status);
  });
  renderOrdersList();
}

export function viewOrderDetail(orderId) {
  const o = adminState.orders.find(x => String(x.id) === String(orderId));
  if (!o) return;

  adminState.activeDetailOrderId = orderId;
  document.getElementById('orderDetailTitle').textContent = `Pedido ${orderCode(o)}`;
  document.getElementById('orderDetailDate').textContent = formatDate(o.createdAt);
  
  const statusBadge = document.getElementById('orderDetailStatusBadge');
  if (statusBadge) {
    statusBadge.innerHTML = `<span class="status-chip status-${o.status || 'pendente'}">${(o.status || 'pendente').toUpperCase()}</span>`;
  }

  document.getElementById('orderDetailCustomerName').textContent = o.userName || 'Cliente VIP';
  document.getElementById('orderDetailCustomerEmail').textContent = o.userEmail || 'Não informado';
  
  const phone = String(o.phone || '').replace(/\D/g, '');
  document.getElementById('orderDetailCustomerPhone').textContent = phone ? `+55 ${phone}` : 'Não cadastrado';
  
  const waBtn = document.getElementById('orderDetailWhatsAppBtn');
  if (waBtn) {
    waBtn.href = buildCustomerWhatsAppLink(o);
  }

  const trackInput = document.getElementById('orderTrackingInput');
  if (trackInput) trackInput.value = o.trackingCode || '';

  // Renderiza Itens
  const itemsList = document.getElementById('orderDetailItemsList');
  if (itemsList) {
    const items = Array.isArray(o.items) && o.items.length ? o.items : [
      { name: 'Peça Artesanal Autoral', qty: 1, price: o.total || 0, color: 'Padrão' }
    ];
    itemsList.innerHTML = items.map(i => `
      <div class="order-item-row">
        <div>
          <strong>${i.name || 'Peça Gold Crochet'}</strong>
          ${i.color ? `<div style="font-size:0.75rem;color:var(--text-muted)">Cor/Fio: ${i.color}</div>` : ''}
        </div>
        <div style="text-align:right">
          <div>${i.qty || 1}x ${formatBRL(i.price || 0)}</div>
          <strong style="color:var(--gold-deep)">${formatBRL((Number(i.qty) || 1) * (Number(i.price) || 0))}</strong>
        </div>
      </div>
    `).join('');
  }

  document.getElementById('orderDetailSubtotal').textContent = formatBRL(o.subtotal || o.total || 0);
  document.getElementById('orderDetailDiscount').textContent = o.discount ? `- ${formatBRL(o.discount)}` : 'R$ 0,00';
  document.getElementById('orderDetailTotal').textContent = formatBRL(o.total || 0);

  document.getElementById('orderDetailModal').classList.remove('hidden');
}

export function closeOrderDetailModal() {
  document.getElementById('orderDetailModal').classList.add('hidden');
  adminState.activeDetailOrderId = null;
}

export async function saveOrderTracking() {
  const orderId = adminState.activeDetailOrderId;
  if (!orderId) return;
  const o = adminState.orders.find(x => String(x.id) === String(orderId));
  if (!o) return;

  const trackInput = document.getElementById('orderTrackingInput');
  const code = (trackInput && trackInput.value || '').trim().toUpperCase();
  o.trackingCode = code;

  try {
    const fb = window.GoldFirebase;
    if (fb && fb.db) {
      await fb.updateDoc(fb.fsDoc(fb.db, 'orders', String(orderId)), { trackingCode: code });
    }
    localStorage.setItem('gc_cached_orders', JSON.stringify(adminState.orders));
    showToast('Código de rastreio gravado com sucesso!', 'success');
    logActivity('Rastreio Atualizado', `${orderCode(o)}: ${code}`);
    renderOrdersList();
  } catch(e) {
    showToast('Erro ao salvar rastreio: ' + e.message, 'error');
  }
}

export function sendTrackingWhatsApp() {
  const orderId = adminState.activeDetailOrderId;
  if (!orderId) return;
  const o = adminState.orders.find(x => String(x.id) === String(orderId));
  if (!o) return;

  const code = o.trackingCode || (document.getElementById('orderTrackingInput') || {}).value || '';
  if (!code) {
    showToast('Informe o código de rastreio primeiro.', 'error');
    return;
  }

  const firstName = (o.userName || 'Cliente').split(' ')[0];
  const msg = `Olá, ${firstName}! ✨ Seu pedido ${orderCode(o)} da Gold Crochet foi postado com carinho! 📦\n\nCódigo de rastreio: *${code}*\nAcompanhe pelo site dos Correios. Gratidão por valorizar nossa arte manual!`;
  
  let phone = String(o.phone || '').replace(/\D/g, '');
  if (phone && phone.length <= 11) phone = '55' + phone;

  const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

export function copyOrderSummary() {
  const orderId = adminState.activeDetailOrderId;
  if (!orderId) return;
  const o = adminState.orders.find(x => String(x.id) === String(orderId));
  if (!o) return;

  const items = Array.isArray(o.items) ? o.items.map(i => `• ${i.qty || 1}x ${i.name || ''} (${formatBRL(i.price || 0)})`).join('\n') : '';
  const text = `🧾 RESUMO DE PEDIDO — GOLD CROCHET\nCódigo: ${orderCode(o)}\nData: ${formatDate(o.createdAt)}\nCliente: ${o.userName || 'VIP'} (${o.phone || 'Sem fone'})\nStatus: ${(o.status || 'pendente').toUpperCase()}\n\nItens:\n${items}\n\nTOTAL: ${formatBRL(o.total || 0)}`;

  navigator.clipboard.writeText(text).then(() => {
    showToast('Resumo copiado para a área de transferência!', 'success');
  }).catch(() => {
    showToast('Não foi possível copiar automaticamente.', 'info');
  });
}

export function printOrderSlip() {
  const orderId = adminState.activeDetailOrderId;
  if (!orderId) return;
  printSingleOrder(orderId);
}

export function printSingleOrder(orderId) {
  const o = adminState.orders.find(x => String(x.id) === String(orderId));
  if (!o) return;

  const slip = document.getElementById('printableSlip');
  if (!slip) return;

  const items = Array.isArray(o.items) ? o.items.map(i => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #ddd">${i.qty || 1}x ${i.name || 'Peça'} ${i.color ? `(${i.color})` : ''}</td>
      <td style="padding:8px 0;border-bottom:1px solid #ddd;text-align:right">${formatBRL(i.price || 0)}</td>
    </tr>
  `).join('') : '';

  slip.innerHTML = `
    <div style="font-family:sans-serif;max-width:400px;margin:20px auto;padding:24px;border:1px solid #cda434;border-radius:12px;background:#fff;color:#181614">
      <div style="text-align:center;border-bottom:2px dashed #cda434;padding-bottom:12px;margin-bottom:16px">
        <h2 style="margin:0;font-size:1.4rem;color:#a67c00">ATELIÊ GOLD CROCHET</h2>
        <small style="color:#666">Alta-Costura &amp; Peças Autorais Feitas à Mão</small><br>
        <strong style="font-size:1.1rem;margin-top:6px;display:inline-block">COMPROVANTE DE PEDIDO ${orderCode(o)}</strong>
      </div>
      <p style="margin:4px 0"><strong>Data:</strong> ${formatDate(o.createdAt)}</p>
      <p style="margin:4px 0"><strong>Cliente:</strong> ${o.userName || 'Cliente VIP'}</p>
      <p style="margin:4px 0"><strong>Contato:</strong> ${o.phone || '—'} ${o.userEmail ? `• ${o.userEmail}` : ''}</p>
      <p style="margin:4px 0"><strong>Status:</strong> ${(o.status || 'pendente').toUpperCase()}</p>
      ${o.trackingCode ? `<p style="margin:4px 0"><strong>Rastreio:</strong> ${o.trackingCode}</p>` : ''}

      <div style="margin:16px 0">
        <table style="width:100%;border-collapse:collapse;font-size:0.9rem">
          <thead>
            <tr style="border-bottom:1px solid #000;text-align:left">
              <th>Item</th>
              <th style="text-align:right">Valor</th>
            </tr>
          </thead>
          <tbody>${items}</tbody>
        </table>
      </div>

      <div style="text-align:right;border-top:2px solid #000;padding-top:8px;font-size:1.15rem">
        <strong>TOTAL: ${formatBRL(o.total || 0)}</strong>
      </div>

      <div style="text-align:center;margin-top:24px;font-size:0.75rem;color:#888">
        Gold Crochet Brasil • Peça autêntica tecida à mão com afeto e exclusividade ✨
      </div>
    </div>
  `;

  slip.style.display = 'block';
  window.print();
  setTimeout(() => { slip.style.display = 'none'; }, 1000);
}

export function openCreateOrderModal() {
  document.getElementById('createOrderForm').reset();
  document.getElementById('createOrderModal').classList.remove('hidden');
}

export function closeCreateOrderModal() {
  document.getElementById('createOrderModal').classList.add('hidden');
}

export async function createManualOrder(data) {
  const code = 'GC-' + Math.floor(100000 + Math.random() * 900000);
  const newOrder = {
    id: code,
    code,
    source: 'admin-manual',
    userId: 'manual-' + Date.now(),
    userName: data.name.trim(),
    userEmail: (data.email || '').trim(),
    phone: data.phone.replace(/\D/g, ''),
    items: [{ name: data.itemName.trim(), qty: Number(data.qty) || 1, price: Number(data.total) || 0, color: 'Autoral' }],
    subtotal: Number(data.total) || 0,
    discount: 0,
    total: Number(data.total) || 0,
    status: data.status || 'pendente',
    createdAt: new Date().toISOString()
  };

  adminState.orders.unshift(newOrder);
  try { localStorage.setItem('gc_cached_orders', JSON.stringify(adminState.orders)); } catch(e) {}
  calculateMetrics();
  renderOrdersList();
  closeCreateOrderModal();
  showToast(`Pedido ${code} criado com sucesso!`, 'success');
  logActivity('Criou Pedido Manual', `${code} para ${data.name}`);

  const fb = window.GoldFirebase;
  if (fb && fb.db) {
    try {
      await fb.setDoc(fb.fsDoc(fb.db, 'orders', code), newOrder);
      showToast('☁️ Salvo no Firestore!', 'success');
    } catch(e) {
      console.warn('Erro ao salvar pedido manual no Firestore:', e);
    }
  }
}

export function exportOrdersCSV() {
  if (!adminState.orders.length) {
    showToast('Nenhum pedido para exportar.', 'info');
    return;
  }

  const header = ['Codigo', 'Cliente', 'Email', 'Telefone', 'Data', 'Status', 'Rastreio', 'Total'];
  const rows = adminState.orders.map(o => [
    orderCode(o),
    `"${(o.userName || '').replace(/"/g, '""')}"`,
    `"${(o.userEmail || '').replace(/"/g, '""')}"`,
    `"${o.phone || ''}"`,
    `"${formatDate(o.createdAt)}"`,
    o.status || 'pendente',
    `"${o.trackingCode || ''}"`,
    (Number(o.total) || 0).toFixed(2)
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [header.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `pedidos-goldcrochet-${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('📊 Planilha CSV gerada e baixada com sucesso!', 'success');
}

export function exportCatalogJSON() {
  const data = {
    products: adminState.products,
    categories: adminState.categories,
    collections: adminState.collections,
    exportedAt: new Date().toISOString()
  };
  const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
  const link = document.createElement('a');
  link.setAttribute('href', jsonStr);
  link.setAttribute('download', `catalogo-goldcrochet-${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Catálogo baixado em formato JSON!', 'success');
}

export function exportFullBackup() {
  const backup = {
    products: adminState.products,
    categories: adminState.categories,
    collections: adminState.collections,
    orders: adminState.orders,
    customers: adminState.customers,
    version: '2026.1',
    exportedAt: new Date().toISOString()
  };
  const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
  const link = document.createElement('a');
  link.setAttribute('href', jsonStr);
  link.setAttribute('download', `backup-geral-goldcrochet-${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('📦 Backup geral completo baixado com sucesso!', 'success');
}

export function setProductSort(sortType) {
  adminState.productSort = sortType;
  renderProductsList();
}

export function editCurrentOrderPhone() {
  if (adminState.activeDetailOrderId) {
    editOrderPhone(adminState.activeDetailOrderId);
  }
}

export async function editOrderPhone(orderId) {
  const o = adminState.orders.find(x => String(x.id) === String(orderId));
  if (!o) return;
  const val = prompt('WhatsApp da cliente (com DDD):', o.phone || '');
  if (val === null) return;
  o.phone = val.replace(/\D/g, '');
  try {
    const fb = window.GoldFirebase;
    if (fb && fb.db) await fb.updateDoc(fb.fsDoc(fb.db, 'orders', String(orderId)), { phone: o.phone });
    localStorage.setItem('gc_cached_orders', JSON.stringify(adminState.orders));
    showToast('Telefone atualizado!', 'success');
  } catch (err) {
    showToast('Erro ao salvar telefone: ' + err.message, 'error');
  }
  renderOrdersList();
  if (adminState.activeDetailOrderId === orderId) {
    viewOrderDetail(orderId);
  }
}

export function deleteCurrentOrder() {
  if (adminState.activeDetailOrderId) {
    deleteOrder(adminState.activeDetailOrderId);
  }
}

export async function deleteOrder(orderId) {
  const o = adminState.orders.find(x => String(x.id) === String(orderId));
  if (!o) return;

  const code = orderCode(o);
  if (!confirm(`Tem certeza de que deseja apagar o pedido ${code} (${o.userName || 'Cliente VIP'})?\nEsta ação não poderá ser desfeita.`)) {
    return;
  }

  const idx = adminState.orders.findIndex(x => String(x.id) === String(orderId));
  if (idx !== -1) {
    adminState.orders.splice(idx, 1);
  }

  try {
    localStorage.setItem('gc_cached_orders', JSON.stringify(adminState.orders));
  } catch(e) {}

  calculateMetrics();
  renderOrdersList();
  if (adminState.activeDetailOrderId === orderId) {
    closeOrderDetailModal();
  }

  showToast(`Pedido ${code} excluído com sucesso!`, 'info');
  logActivity('Excluiu Pedido', code);

  const fb = window.GoldFirebase;
  if (fb && fb.db) {
    try {
      const docRef = fb.fsDoc(fb.db, 'orders', String(orderId));
      await fb.deleteDoc(docRef);
      console.log(`[Firestore] Pedido ${orderId} removido do Firestore.`);
    } catch (err) {
      console.warn('[Firestore Delete Order Error]', err);
    }
  }
}

export function duplicateProduct(productId) {
  const p = adminState.products.find(x => String(x.id) === String(productId));
  if (!p) return;

  const clone = {
    ...p,
    id: Date.now(),
    name: `${p.name} (Cópia)`,
    slug: `${p.slug || 'produto'}-copia-${Math.floor(Math.random()*1000)}`,
    createdAt: new Date().toISOString()
  };

  adminState.products.unshift(clone);
  try { localStorage.setItem('gc_cached_products', JSON.stringify(adminState.products)); } catch(e) {}
  calculateMetrics();
  renderProductsList();
  showToast(`Peça "${clone.name}" duplicada com sucesso!`, 'success');
  logActivity('Duplicou Produto', clone.name);

  const fb = window.GoldFirebase;
  if (fb && fb.db) {
    fb.setDoc(fb.fsDoc(fb.db, 'products', String(clone.id)), clone, { merge: true }).catch(() => {});
  }
}

export function toggleProductStock(productId) {
  const p = adminState.products.find(x => String(x.id) === String(productId));
  if (!p) return;

  p.inStock = p.inStock === false ? true : false;
  try { localStorage.setItem('gc_cached_products', JSON.stringify(adminState.products)); } catch(e) {}
  renderProductsList();
  showToast(`Estoque de "${p.name}": ${p.inStock ? 'Em estoque' : 'Sob Encomenda'}`, 'info');

  const fb = window.GoldFirebase;
  if (fb && fb.db) {
    fb.setDoc(fb.fsDoc(fb.db, 'products', String(p.id)), { inStock: p.inStock }, { merge: true }).catch(() => {});
  }
}

export function toggleTheme() {
  const isDark = document.body.getAttribute('data-theme') === 'dark';
  const newTheme = isDark ? 'light' : 'dark';
  document.body.setAttribute('data-theme', newTheme);
  localStorage.setItem('gc_admin_theme', newTheme);
  adminState.theme = newTheme;

  const icon = document.getElementById('themeToggleIcon');
  const text = document.getElementById('themeToggleText');
  if (icon) icon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
  if (text) text.textContent = newTheme === 'dark' ? 'Modo Dia' : 'Modo Noite';
}

export function toggleAudioAlert() {
  adminState.audioAlertsEnabled = !adminState.audioAlertsEnabled;
  localStorage.setItem('gc_admin_audio', adminState.audioAlertsEnabled);
  const icon = document.getElementById('audioToggleIcon');
  if (icon) icon.textContent = adminState.audioAlertsEnabled ? '🔔' : '🔕';
  showToast(adminState.audioAlertsEnabled ? 'Som de notificação ativado' : 'Som de notificação silenciado', 'info');
  if (adminState.audioAlertsEnabled) playOrderNotificationChime();
}

export function toggleSidebar() {
  const sidebar = document.getElementById('adminSidebar');
  if (sidebar) sidebar.classList.toggle('open');
}

export function clearLogs() {
  if (!confirm('Deseja limpar todo o histórico de atividades local?')) return;
  adminState.logs = [];
  try { localStorage.removeItem('gc_admin_logs'); } catch(e) {}
  renderOverview();
  showToast('Histórico de atividades limpo.', 'info');
}

// ════════════════════════════════════════
// CONFIGURAÇÕES DO WHATSAPP (settings/whatsapp — lido pelo site)
// ════════════════════════════════════════
export async function loadWhatsAppSettings() {
  const fb = window.GoldFirebase;
  try {
    if (fb && fb.db) {
      const snap = await fb.getDoc(fb.fsDoc(fb.db, 'settings', 'whatsapp'));
      if (snap.exists()) adminState.waSettings = snap.data();
    }
  } catch (err) {
    console.warn('[WhatsApp Settings]', err.message);
  }
  adminState.waSettings = adminState.waSettings || {};
  fillWhatsAppForm();
}

function fillWhatsAppForm() {
  const s = adminState.waSettings || {};
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
  set('waPhoneInput', s.phone || '5531984566047');
  set('waGreetingInput', s.greeting || 'Olá! Gostaria de falar com o concierge do ateliê Gold Crochet.');
  set('waCheckoutFooterInput', s.checkoutFooter || 'Poderiam me informar o prazo de envio e dados para pagamento?');
  const tpls = getWaTemplates();
  Object.keys(WA_STATUS_TEMPLATES).forEach(k => set(`waTpl_${k}`, tpls[k]));
}

export async function saveWhatsAppSettings() {
  const get = id => (document.getElementById(id) || {}).value || '';
  const phone = get('waPhoneInput').replace(/\D/g, '');
  if (phone.length < 12) {
    showToast('Informe o número com DDI + DDD (ex: 5531984566047).', 'error');
    return;
  }
  const templates = {};
  Object.keys(WA_STATUS_TEMPLATES).forEach(k => { templates[k] = get(`waTpl_${k}`).trim() || WA_STATUS_TEMPLATES[k]; });
  const data = {
    phone,
    greeting: get('waGreetingInput').trim(),
    checkoutFooter: get('waCheckoutFooterInput').trim(),
    templates,
    updatedAt: new Date().toISOString()
  };
  try {
    const fb = window.GoldFirebase;
    if (!fb || !fb.db) throw new Error('Firestore indisponível');
    await fb.setDoc(fb.fsDoc(fb.db, 'settings', 'whatsapp'), data);
    adminState.waSettings = data;
    logActivity('WhatsApp atualizado', `Número ${phone}`);
    showToast('✅ WhatsApp salvo! O site já usa o novo número.', 'success');
    renderOrdersList();
  } catch (err) {
    showToast('Erro ao salvar: ' + err.message, 'error');
  }
}

export function testWhatsAppNumber() {
  const phone = ((document.getElementById('waPhoneInput') || {}).value || '').replace(/\D/g, '');
  const msg = (document.getElementById('waGreetingInput') || {}).value || '';
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ════════════════════════════════════════
// MÓDULO DE CLIENTES & ACOMPANHAMENTO DE BRINDES
// ════════════════════════════════════════

export function renderCustomersList() {
  const tbody = document.getElementById('customersTableBody');
  if (!tbody) return;

  const query = (adminState.customerSearchQuery || '').toLowerCase().trim();
  let filtered = [...adminState.customers];

  if (query) {
    filtered = filtered.filter(c => {
      const name = String(c.name || '').toLowerCase();
      const email = String(c.email || '').toLowerCase();
      const phone = String(c.phone || '').replace(/\D/g, '');
      return name.includes(query) || email.includes(query) || phone.includes(query);
    });
  }

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Nenhum cliente encontrado.</td></tr>`;
    return;
  }

  // Ordena por maior número de compras
  filtered.sort((a, b) => (Number(b.purchasesCount) || 0) - (Number(a.purchasesCount) || 0));

  tbody.innerHTML = filtered.map(c => {
    const purchases = Number(c.purchasesCount) || 0;
    const giftsClaimed = Number(c.giftsClaimed) || 0;
    const phoneClean = String(c.phone || '').replace(/\D/g, '');
    const phoneDisplay = phoneClean ? `📱 (${phoneClean.slice(0,2)}) ${phoneClean.slice(2)}` : `<span style="color:var(--text-muted)">Sem telefone</span>`;

    const mod3 = purchases % 3;
    const remaining = 3 - mod3;
    const giftsEarnedTotal = Math.floor(purchases / 3);
    const giftsAvailableToClaim = Math.max(0, giftsEarnedTotal - giftsClaimed);

    let giftStatusBadge = '';
    if (giftsAvailableToClaim > 0) {
      giftStatusBadge = `<span class="gift-level-badge gift-ready">🎁 ${giftsAvailableToClaim} ${giftsAvailableToClaim === 1 ? 'brinde pronto' : 'brindes prontos'}!</span>`;
    } else {
      giftStatusBadge = `<span class="gift-level-badge gift-progress">⏳ Faltam ${remaining} ${remaining === 1 ? 'compra' : 'compras'}</span>`;
    }

    const waMsg = `Olá, ${c.name ? c.name.split(' ')[0] : 'Cliente'}! ✨ Aqui é do Ateliê Gold Crochet! Vimos que você já tem ${purchases} compras computadas no seu perfil e queríamos falar sobre seu brinde exclusivo de alta-costura feito à mão! 🎁`;
    const waLink = phoneClean ? `https://wa.me/55${phoneClean}?text=${encodeURIComponent(waMsg)}` : `https://wa.me/?text=${encodeURIComponent(waMsg)}`;

    return `
      <tr>
        <td>
          <div class="customer-gift-row">
            <div class="gift-mini-circle" title="${purchases} compras computadas">${purchases}</div>
            <div>
              <strong>${c.name || 'Cliente Gold'}</strong>
              <div style="font-size:0.75rem;color:var(--text-muted)">ID: ${String(c.id).slice(0, 10)}...</div>
            </div>
          </div>
        </td>
        <td>
          <div>${c.email || 'Não informado'}</div>
          <small>${phoneDisplay}</small>
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:6px">
            <strong style="font-size:1.1rem;color:var(--gold-deep)">${purchases}</strong>
            <button class="btn-action" style="width:24px;height:24px;font-size:0.75rem" onclick="window.AdminCore.adjustCustomerPurchases('${c.id}', 1)" title="Adicionar 1 compra">+1</button>
            <button class="btn-action" style="width:24px;height:24px;font-size:0.75rem" onclick="window.AdminCore.adjustCustomerPurchases('${c.id}', -1)" title="Remover 1 compra">-1</button>
          </div>
        </td>
        <td>
          <div style="font-size:0.85rem">
            ${giftsEarnedTotal} ${giftsEarnedTotal === 1 ? 'mimo conquistado' : 'mimos conquistados'}<br>
            <small style="color:var(--text-muted)">(${giftsClaimed} entregues / ${giftsAvailableToClaim} pendentes)</small>
          </div>
        </td>
        <td>
          ${giftStatusBadge}
        </td>
        <td class="table-actions">
          <button class="btn-action edit" onclick="window.AdminCore.editCustomer('${c.id}')" title="Editar Perfil e Brindes">✏️</button>
          <button class="btn-action" onclick="window.AdminCore.adjustCustomerGiftsClaimed('${c.id}', 1)" title="Marcar +1 Brinde Entregue">🎁+1</button>
          <a href="${waLink}" target="_blank" rel="noopener" class="btn-action whatsapp" title="Falar no WhatsApp sobre o Brinde">💬</a>
        </td>
      </tr>
    `;
  }).join('');
}

export function openManualCustomerModal() {
  document.getElementById('customerForm').reset();
  document.getElementById('custModalId').value = '';
  document.getElementById('customerModalTitle').textContent = 'Novo Cliente';
  document.getElementById('custModalPurchases').value = 0;
  document.getElementById('custModalGiftsClaimed').value = 0;
  document.getElementById('customerModal').classList.remove('hidden');
}

export function closeCustomerModal() {
  document.getElementById('customerModal').classList.add('hidden');
}

export function editCustomer(customerId) {
  const c = adminState.customers.find(x => String(x.id) === String(customerId));
  if (!c) return;

  document.getElementById('custModalId').value = c.id;
  document.getElementById('customerModalTitle').textContent = `Editar: ${c.name || 'Cliente'}`;
  document.getElementById('custModalName').value = c.name || '';
  document.getElementById('custModalEmail').value = c.email || '';
  document.getElementById('custModalPhone').value = c.phone || '';
  document.getElementById('custModalPurchases').value = Number(c.purchasesCount) || 0;
  document.getElementById('custModalGiftsClaimed').value = Number(c.giftsClaimed) || 0;

  document.getElementById('customerModal').classList.remove('hidden');
}

export async function saveCustomer(data) {
  const id = data.id || ('cli_' + Date.now().toString(36));
  const payload = {
    id,
    uid: id,
    name: data.name.trim(),
    email: data.email.trim(),
    phone: data.phone.replace(/\D/g, ''),
    purchasesCount: Number(data.purchasesCount) || 0,
    giftsClaimed: Number(data.giftsClaimed) || 0,
    role: 'customer',
    updatedAt: new Date().toISOString()
  };

  const existingIdx = adminState.customers.findIndex(c => String(c.id) === String(id));
  if (existingIdx !== -1) {
    adminState.customers[existingIdx] = { ...adminState.customers[existingIdx], ...payload };
  } else {
    adminState.customers.unshift(payload);
  }

  try { localStorage.setItem('gc_cached_customers', JSON.stringify(adminState.customers)); } catch(e) {}
  renderCustomersList();
  closeCustomerModal();
  showToast(`Cliente ${payload.name} e brindes salvos!`, 'success');
  logActivity('Atualizou Cliente/Brindes', `${payload.name} (${payload.purchasesCount} compras)`);

  const fb = window.GoldFirebase;
  if (fb && fb.db) {
    try {
      await fb.setDoc(fb.fsDoc(fb.db, 'users', String(id)), payload, { merge: true });
    } catch(err) {
      console.warn('[Firestore Customer Save Error]', err);
    }
  }
}

export async function adjustCustomerPurchases(customerId, delta) {
  const c = adminState.customers.find(x => String(x.id) === String(customerId));
  if (!c) return;

  c.purchasesCount = Math.max(0, (Number(c.purchasesCount) || 0) + delta);
  try { localStorage.setItem('gc_cached_customers', JSON.stringify(adminState.customers)); } catch(e) {}
  renderCustomersList();
  showToast(`Compras de ${c.name} atualizadas para ${c.purchasesCount}!`, 'info');

  const fb = window.GoldFirebase;
  if (fb && fb.db) {
    fb.setDoc(fb.fsDoc(fb.db, 'users', String(c.id)), { purchasesCount: c.purchasesCount }, { merge: true }).catch(() => {});
  }
}

export async function adjustCustomerGiftsClaimed(customerId, delta) {
  const c = adminState.customers.find(x => String(x.id) === String(customerId));
  if (!c) return;

  c.giftsClaimed = Math.max(0, (Number(c.giftsClaimed) || 0) + delta);
  try { localStorage.setItem('gc_cached_customers', JSON.stringify(adminState.customers)); } catch(e) {}
  renderCustomersList();
  showToast(`Brindes entregues de ${c.name}: ${c.giftsClaimed}`, 'success');

  const fb = window.GoldFirebase;
  if (fb && fb.db) {
    fb.setDoc(fb.fsDoc(fb.db, 'users', String(c.id)), { giftsClaimed: c.giftsClaimed }, { merge: true }).catch(() => {});
  }
}

// ════════════════════════════════════════
// MODAIS DE EDIÇÃO DE PRODUTO
// ════════════════════════════════════════

export function switchProdModalTab(tabId, btn) {
  document.querySelectorAll('.editor-tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.editor-tab-btn').forEach(b => b.classList.remove('active'));

  const target = document.getElementById(tabId);
  if (target) target.classList.remove('hidden');
  if (btn) btn.classList.add('active');
}

export function renderProdGalleryUI() {
  const grid = document.getElementById('prodGalleryGrid');
  const countEl = document.getElementById('galleryCount');
  const coverInput = document.getElementById('prodCoverImgUrl');
  if (!grid) return;

  const list = adminState.activeGallery || [];
  if (countEl) countEl.textContent = list.length;

  const currentCover = coverInput ? coverInput.value : (list[0] || '');

  if (!list.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:16px;color:var(--text-muted);font-size:0.8rem">Nenhuma imagem adicionada. Arraste arquivos para cá.</div>';
    return;
  }

  grid.innerHTML = list.map((url, idx) => {
    const isCover = url === currentCover || (!currentCover && idx === 0);
    return `
      <div style="position:relative;width:100%;padding-top:100%;border-radius:var(--radius-sm);overflow:hidden;border:2px solid ${isCover ? 'var(--gold-primary)' : 'var(--border-subtle)'};background:#fff;">
        <img src="${url}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" onerror="this.src='./assets/icon.svg'">
        <button type="button" onclick="event.stopPropagation(); window.AdminCore.setProdCover('${url}')" style="position:absolute;top:4px;left:4px;width:24px;height:24px;border-radius:50%;background:${isCover ? 'var(--gold-primary)' : 'rgba(0,0,0,0.5)'};color:#fff;border:none;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;" title="${isCover ? 'Capa Principal' : 'Definir como Capa'}">
          ${isCover ? '★' : '☆'}
        </button>
        <button type="button" onclick="event.stopPropagation(); window.AdminCore.removeGalleryItem(${idx})" style="position:absolute;top:4px;right:4px;width:24px;height:24px;border-radius:50%;background:rgba(229,62,62,0.85);color:#fff;border:none;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;" title="Remover Foto">
          ✕
        </button>
        ${isCover ? '<span style="position:absolute;bottom:0;inset-x:0;background:var(--gold-primary);color:#fff;font-size:9px;text-align:center;font-weight:700;padding:2px 0;width:100%">CAPA</span>' : ''}
      </div>
    `;
  }).join('');
}

export function setProdCover(url) {
  const coverInput = document.getElementById('prodCoverImgUrl');
  if (coverInput) coverInput.value = url;
  renderProdGalleryUI();
  showToast('Foto definida como capa principal da peça!', 'info');
}

export function removeGalleryItem(index) {
  if (adminState.activeGallery && adminState.activeGallery[index]) {
    adminState.activeGallery.splice(index, 1);
    const coverInput = document.getElementById('prodCoverImgUrl');
    if (coverInput && !adminState.activeGallery.includes(coverInput.value)) {
      coverInput.value = adminState.activeGallery[0] || '';
    }
    renderProdGalleryUI();
  }
}

export function addMediaUrlToGallery() {
  const input = document.getElementById('prodImageUrl');
  const url = input ? input.value.trim() : '';
  if (!url) return;

  if (!adminState.activeGallery) adminState.activeGallery = [];
  if (!adminState.activeGallery.includes(url)) {
    adminState.activeGallery.push(url);
    const coverInput = document.getElementById('prodCoverImgUrl');
    if (coverInput && !coverInput.value) coverInput.value = url;
    renderProdGalleryUI();
    showToast('Imagem adicionada à galeria!', 'success');
  }
  if (input) input.value = '';
}

export function openNewProductModal() {
  adminState.editingProductId = null;
  adminState.activeGallery = [];
  document.getElementById('modalTitle').textContent = 'Nova Criação Autoral';
  const form = document.getElementById('productForm');
  if (form) form.reset();
  
  const coverInput = document.getElementById('prodCoverImgUrl');
  if (coverInput) coverInput.value = '';
  renderProdGalleryUI();

  // Reseta para a primeira aba
  switchProdModalTab('prodTabGeneral', document.querySelector('.editor-tab-btn[data-tab="prodTabGeneral"]'));

  document.getElementById('productModal').classList.remove('hidden');
}

export function editProduct(productId) {
  const p = adminState.products.find(item => String(item.id) === String(productId));
  if (!p) return;

  adminState.editingProductId = productId;
  document.getElementById('modalTitle').textContent = `Editar Criação: ${p.name}`;
  document.getElementById('prodName').value = p.name || '';
  document.getElementById('prodSlug').value = p.slug || '';
  document.getElementById('prodPrice').value = p.price || '';
  document.getElementById('prodDiscount').value = p.discount || 0;
  document.getElementById('prodCategory').value = p.category || 'bolsas';
  document.getElementById('prodBadge').value = p.badge || '';
  document.getElementById('prodProdTime').value = p.prod_time || 8;
  document.getElementById('prodMaterial').value = p.material || 'Fio 100% Algodão Nobre';
  document.getElementById('prodDesc').value = p.desc || '';
  
  const coverInput = document.getElementById('prodCoverImgUrl');
  const mainImg = p.image || (p.gallery && p.gallery[0]) || '';
  if (coverInput) coverInput.value = mainImg;

  // Carrega galeria
  adminState.activeGallery = Array.isArray(p.gallery) && p.gallery.length ? [...p.gallery] : (mainImg ? [mainImg] : []);
  if (mainImg && !adminState.activeGallery.includes(mainImg)) {
    adminState.activeGallery.unshift(mainImg);
  }
  renderProdGalleryUI();

  const inStockEl = document.getElementById('prodInStock');
  if (inStockEl) inStockEl.value = p.inStock === false ? 'false' : 'true';

  const colorsEl = document.getElementById('prodColors');
  if (colorsEl) {
    colorsEl.value = Array.isArray(p.colors) ? p.colors.join(', ') : (p.colors || '');
  }

  // Abre na primeira aba
  switchProdModalTab('prodTabGeneral', document.querySelector('.editor-tab-btn[data-tab="prodTabGeneral"]'));

  document.getElementById('productModal').classList.remove('hidden');
}

export function closeProductModal() {
  document.getElementById('productModal').classList.add('hidden');
  adminState.editingProductId = null;
  adminState.activeGallery = [];
}

// Inicializador Global no window
if (typeof window !== 'undefined') {
  window.AdminCore = {
    loginWithEmail,
    loginWithGoogle,
    logout,
    initDashboardData,
    switchView,
    openNewProductModal,
    closeProductModal,
    editProduct,
    deleteProduct,
    saveProduct,
    saveCategory,
    deleteCategory,
    updateOrderStatus,
    editOrderPhone,
    editCurrentOrderPhone,
    saveWhatsAppSettings,
    testWhatsAppNumber,
    pushCatalogToGitHub,
    showToast,
    viewOrderDetail,
    closeOrderDetailModal,
    saveOrderTracking,
    sendTrackingWhatsApp,
    copyOrderSummary,
    printOrderSlip,
    printSingleOrder,
    openCreateOrderModal,
    closeCreateOrderModal,
    createManualOrder,
    exportOrdersCSV,
    exportCatalogJSON,
    duplicateProduct,
    toggleProductStock,
    toggleTheme,
    toggleAudioAlert,
    toggleSidebar,
    clearLogs,
    filterOrdersByStatus,
    deleteOrder,
    deleteCurrentOrder,
    setCatalogDisplayMode,
    switchProdModalTab,
    openManualCustomerModal,
    closeCustomerModal,
    editCustomer,
    adjustCustomerPurchases,
    adjustCustomerGiftsClaimed,
    openCollectionModal,
    closeCollectionModal,
    saveCollection,
    deleteCollection,
    renderCollectionsList,
    editCollection: (id) => {
      const col = adminState.collections.find(c => c.id === id || c.slug === id);
      if (col) openCollectionModal(col);
    },
    setProdCover,
    removeGalleryItem,
    addMediaUrlToGallery,
    exportFullBackup,
    setProductSort
  };

  // Inicializa quando o DOM estiver pronto
  document.addEventListener('DOMContentLoaded', () => {
    // 1. Aplica tema salvo
    if (adminState.theme === 'dark') {
      document.body.setAttribute('data-theme', 'dark');
      const icon = document.getElementById('themeToggleIcon');
      const text = document.getElementById('themeToggleText');
      if (icon) icon.textContent = '☀️';
      if (text) text.textContent = 'Modo Dia';
    }

    // 2. Relógio em tempo real no cabeçalho
    const clockEl = document.getElementById('adminLiveClock');
    if (clockEl) {
      const updateClock = () => {
        clockEl.textContent = new Date().toLocaleTimeString('pt-BR');
      };
      updateClock();
      setInterval(updateClock, 1000);
    }

    initAuthStateListener();

    // Eventos do Formulário de Login
    const loginForm = document.getElementById('adminLoginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const pass = document.getElementById('loginPass').value;
        const btn = document.getElementById('loginSubmitBtn');
        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Autenticando...';
        }
        await loginWithEmail(email, pass);
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Entrar no Ateliê →';
        }
      });
    }

    // Botão de Login com Google
    const googleBtn = document.getElementById('loginGoogleBtn');
    if (googleBtn) {
      googleBtn.addEventListener('click', () => loginWithGoogle());
    }

    // Formulário do Produto
    const prodForm = document.getElementById('productForm');
    if (prodForm) {
      prodForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const colorsRaw = document.getElementById('prodColors') ? document.getElementById('prodColors').value : '';
        const colorsArr = colorsRaw ? colorsRaw.split(',').map(c => c.trim()).filter(Boolean) : [];
        const inStockVal = document.getElementById('prodInStock') ? document.getElementById('prodInStock').value !== 'false' : true;

        const coverInput = document.getElementById('prodCoverImgUrl');
        const mainCover = (coverInput && coverInput.value) || (adminState.activeGallery && adminState.activeGallery[0]) || document.getElementById('prodImageUrl').value || './assets/icon.svg';
        const finalGallery = (adminState.activeGallery && adminState.activeGallery.length) ? [...adminState.activeGallery] : [mainCover];
        if (!finalGallery.includes(mainCover)) finalGallery.unshift(mainCover);

        const pData = {
          name: document.getElementById('prodName').value.trim(),
          slug: document.getElementById('prodSlug').value.trim() || document.getElementById('prodName').value.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          price: Number(document.getElementById('prodPrice').value) || null,
          discount: Number(document.getElementById('prodDiscount').value) || 0,
          category: document.getElementById('prodCategory').value,
          badge: document.getElementById('prodBadge').value.trim(),
          prod_time: document.getElementById('prodProdTime').value,
          material: document.getElementById('prodMaterial').value,
          desc: document.getElementById('prodDesc').value,
          inStock: inStockVal,
          colors: colorsArr,
          image: mainCover,
          gallery: finalGallery
        };
        saveProduct(pData);
      });
    }

    // Formulário de Criação Manual de Pedido
    const createOrderForm = document.getElementById('createOrderForm');
    if (createOrderForm) {
      createOrderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {
          name: document.getElementById('manualOrderName').value,
          phone: document.getElementById('manualOrderPhone').value,
          email: document.getElementById('manualOrderEmail').value,
          status: document.getElementById('manualOrderStatus').value,
          itemName: document.getElementById('manualOrderItemName').value,
          qty: document.getElementById('manualOrderQty').value,
          total: document.getElementById('manualOrderTotal').value
        };
        createManualOrder(data);
      });
    }

    // Input de busca de produtos em tempo real
    const searchInput = document.getElementById('productSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        adminState.searchQuery = e.target.value;
        renderProductsList();
      });
    }

    // Input de busca de pedidos em tempo real
    const orderSearchInput = document.getElementById('orderSearchInput');
    if (orderSearchInput) {
      orderSearchInput.addEventListener('input', (e) => {
        adminState.orderSearchQuery = e.target.value;
        renderOrdersList();
      });
    }

    // Filtro de categoria de produtos
    const catSelect = document.getElementById('productCategoryFilter');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        adminState.selectedCategoryFilter = e.target.value;
        renderProductsList();
      });
    }

    // Suporte a Múltiplos Arquivos e Drag & Drop na Galeria
    const handleFiles = (files) => {
      if (!files || !files.length) return;
      Array.from(files).forEach(file => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (re) => {
          const b64 = re.target.result;
          if (!adminState.activeGallery) adminState.activeGallery = [];
          adminState.activeGallery.push(b64);
          const coverInput = document.getElementById('prodCoverImgUrl');
          if (coverInput && !coverInput.value) coverInput.value = b64;
          renderProdGalleryUI();
        };
        reader.readAsDataURL(file);
      });
      showToast(`${files.length} foto(s) adicionada(s) à galeria!`, 'success');
    };

    const fileInput = document.getElementById('prodImageFileInput');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
      });
    }

    const dropZone = document.getElementById('prodDropZone');
    if (dropZone) {
      ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropZone.style.borderColor = 'var(--gold-deep)';
          dropZone.style.background = 'rgba(205, 164, 52, 0.12)';
        });
      });
      ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropZone.style.borderColor = 'var(--gold-primary)';
          dropZone.style.background = 'var(--surface-subtle)';
        });
      });
      dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files.length) {
          handleFiles(dt.files);
        }
      });
    }

    // Input de busca de clientes em tempo real
    const customerSearchInput = document.getElementById('customerSearchInput');
    if (customerSearchInput) {
      customerSearchInput.addEventListener('input', (e) => {
        adminState.customerSearchQuery = e.target.value;
        renderCustomersList();
      });
    }

    // Formulário de Cliente & Brindes
    const customerForm = document.getElementById('customerForm');
    if (customerForm) {
      customerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveCustomer({
          id: document.getElementById('custModalId').value,
          name: document.getElementById('custModalName').value,
          email: document.getElementById('custModalEmail').value,
          phone: document.getElementById('custModalPhone').value,
          purchasesCount: document.getElementById('custModalPurchases').value,
          giftsClaimed: document.getElementById('custModalGiftsClaimed').value
        });
      });
    }

    // Formulário de Coleções
    const collectionForm = document.getElementById('collectionForm');
    if (collectionForm) {
      collectionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveCollection({
          id: document.getElementById('colModalId').value,
          name: document.getElementById('colModalName').value,
          slug: document.getElementById('colModalSlug').value,
          icon: document.getElementById('colModalIcon').value,
          desc: document.getElementById('colModalDesc').value,
          image: document.getElementById('colModalImage').value
        });
      });
    }
  });
}

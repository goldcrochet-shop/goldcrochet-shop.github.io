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
  orders: [],
  coupons: [],
  logs: [],
  metrics: {
    totalRevenue: 0,
    activeOrders: 0,
    totalProducts: 0,
    totalCategories: 0
  },
  currentView: 'overview',
  searchQuery: '',
  selectedCategoryFilter: 'all',
  editingProductId: null,
  isSyncing: false
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
      syncOrdersFromFirestore()
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
      fb.onSnapshot(colRef, (liveSnap) => {
        const liveList = [];
        liveSnap.forEach(d => liveList.push({ id: d.id, ...d.data() }));
        adminState.orders = liveList;
        localStorage.setItem('gc_cached_orders', JSON.stringify(liveList));
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

export function calculateMetrics() {
  let rev = 0;
  let active = 0;

  adminState.orders.forEach(o => {
    const val = Number(o.total) || 0;
    if (o.status !== 'cancelado') rev += val;
    if (o.status === 'pendente' || o.status === 'producao') active++;
  });

  adminState.metrics = {
    totalRevenue: rev,
    activeOrders: active,
    totalProducts: adminState.products.length,
    totalCategories: adminState.categories.length || 6
  };
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
// GESTÃO DE PEDIDOS
// ════════════════════════════════════════

export async function updateOrderStatus(orderId, newStatus) {
  const order = adminState.orders.find(o => String(o.id) === String(orderId));
  if (!order) return;

  order.status = newStatus;
  localStorage.setItem('gc_cached_orders', JSON.stringify(adminState.orders));
  calculateMetrics();
  renderCurrentView();
  showToast(`Pedido #${orderId.slice(-6)} atualizado para "${newStatus}".`, 'success');
  logActivity('Atualizou Status Pedido', `#${orderId.slice(-6)} -> ${newStatus}`);

  const fb = window.GoldFirebase;
  if (fb && fb.db) {
    try {
      const docRef = fb.fsDoc(fb.db, 'orders', String(orderId));
      await fb.updateDoc(docRef, { status: newStatus });
    } catch(e) {}
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
    case 'orders':
      renderOrdersList();
      break;
    case 'sync':
      renderSyncView();
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

export function renderProductsList() {
  const tbody = document.getElementById('productsTableBody');
  if (!tbody) return;

  const query = (adminState.searchQuery || '').toLowerCase();
  const catFilter = adminState.selectedCategoryFilter;

  const filtered = adminState.products.filter(p => {
    const matchName = (p.name || '').toLowerCase().includes(query) || String(p.id).includes(query);
    const matchCat = catFilter === 'all' || p.category === catFilter;
    return matchName && matchCat;
  });

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Nenhuma criação encontrada para os filtros aplicados.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const img = p.image || (p.gallery && p.gallery[0]) || './assets/icon.svg';
    const priceText = p.price ? formatBRL(p.price) : '<span style="color:#8b7a5a">Sob Consulta</span>';
    const discountBadge = p.discount ? `<span class="badge-discount">-${p.discount}%</span>` : '';
    const badgeText = p.badge ? `<span class="badge-featured">${p.badge}</span>` : '';

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
          <span class="stock-pill in-stock">Ateliê Ativo</span>
        </td>
        <td class="table-actions">
          <button class="btn-action edit" onclick="window.AdminCore.editProduct('${p.id}')" title="Editar">✏️</button>
          <button class="btn-action view" onclick="window.open('./produtos/${p.slug || 'bolsa-paraty'}.html', '_blank')" title="Ver na Loja">👁</button>
          <button class="btn-action delete" onclick="window.AdminCore.deleteProduct('${p.id}')" title="Excluir">🗑</button>
        </td>
      </tr>
    `;
  }).join('');
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

export function renderOrdersList() {
  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;

  if (!adminState.orders.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Nenhum pedido registrado no Firestore ainda.</td></tr>`;
    return;
  }

  tbody.innerHTML = adminState.orders.map(o => {
    const dateStr = formatDate(o.createdAt);
    const totalStr = formatBRL(o.total);
    const itemsCount = (o.items && o.items.length) || 1;
    const clientPhone = o.phone || '5531984566047';
    const whatsappLink = `https://wa.me/${clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${o.userName || ''}! Somos do Ateliê Gold Crochet falando sobre seu pedido #${(o.id||'').slice(-6)}.`)}`;

    return `
      <tr>
        <td><strong>#${(o.id || '').slice(-6)}</strong></td>
        <td>
          <div class="customer-cell">
            <strong>${o.userName || 'Cliente VIP'}</strong>
            <small>${o.userEmail || '—'}</small>
          </div>
        </td>
        <td>${dateStr}</td>
        <td><strong>${totalStr}</strong> <small>(${itemsCount} itens)</small></td>
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
          <a href="${whatsappLink}" target="_blank" class="btn-action whatsapp" title="Conversar no WhatsApp">💬</a>
        </td>
      </tr>
    `;
  }).join('');
}

function renderSyncView() {
  const tokenInput = document.getElementById('ghTokenInput');
  if (tokenInput && !tokenInput.value) {
    tokenInput.value = localStorage.getItem('gh_token') || DEFAULT_GH_TOKEN;
  }
}

// ════════════════════════════════════════
// MODAIS DE EDIÇÃO DE PRODUTO
// ════════════════════════════════════════

export function openNewProductModal() {
  adminState.editingProductId = null;
  document.getElementById('modalTitle').textContent = 'Nova Criação Autoral';
  document.getElementById('productForm').reset();
  document.getElementById('prodPreviewImg').src = './assets/icon.svg';
  document.getElementById('productModal').classList.remove('hidden');
}

export function editProduct(productId) {
  const p = adminState.products.find(item => String(item.id) === String(productId));
  if (!p) return;

  adminState.editingProductId = productId;
  document.getElementById('modalTitle').textContent = `Editar: ${p.name}`;
  document.getElementById('prodName').value = p.name || '';
  document.getElementById('prodSlug').value = p.slug || '';
  document.getElementById('prodPrice').value = p.price || '';
  document.getElementById('prodDiscount').value = p.discount || 0;
  document.getElementById('prodCategory').value = p.category || 'bolsas';
  document.getElementById('prodBadge').value = p.badge || '';
  document.getElementById('prodProdTime').value = p.prod_time || 8;
  document.getElementById('prodMaterial').value = p.material || 'Fio de Algodão 100% Puro';
  document.getElementById('prodDesc').value = p.desc || '';
  document.getElementById('prodImageUrl').value = p.image || '';

  const img = p.image || (p.gallery && p.gallery[0]) || './assets/icon.svg';
  document.getElementById('prodPreviewImg').src = img;

  document.getElementById('productModal').classList.remove('hidden');
}

export function closeProductModal() {
  document.getElementById('productModal').classList.add('hidden');
  adminState.editingProductId = null;
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
    pushCatalogToGitHub,
    showToast
  };

  // Inicializa quando o DOM estiver pronto
  document.addEventListener('DOMContentLoaded', () => {
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
          image: document.getElementById('prodImageUrl').value || document.getElementById('prodPreviewImg').src,
          gallery: [document.getElementById('prodImageUrl').value || document.getElementById('prodPreviewImg').src]
        };
        saveProduct(pData);
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

    // Filtro de categoria de produtos
    const catSelect = document.getElementById('productCategoryFilter');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        adminState.selectedCategoryFilter = e.target.value;
        renderProductsList();
      });
    }

    // Upload de Imagem Local com Preview Otimizado
    const fileInput = document.getElementById('prodImageFileInput');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (re) => {
          document.getElementById('prodPreviewImg').src = re.target.result;
          document.getElementById('prodImageUrl').value = re.target.result;
        };
        reader.readAsDataURL(file);
      });
    }
  });
}

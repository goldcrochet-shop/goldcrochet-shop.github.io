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

// Mapeamento Canônico de Taxonomia (5 Departamentos & 24 Subcategorias)
export const TAXONOMY_MAP = {
  "Para Ela": [
    "Roupas para noite",
    "Saias e vestidos",
    "Jaquetas e casacos",
    "Tops",
    "Calças",
    "Praia & Resort",
    "Sob Medida"
  ],
  "Para Ele": [
    "Roupas para noite",
    "Jaquetas e casacos",
    "Calças",
    "Camisas & Polos",
    "Suéteres & Cardigans",
    "Bermudas & Shorts"
  ],
  "Pequeninos": [
    "Bebê",
    "Garotas",
    "Garotos",
    "Presentes",
    "Sapatinhos & Toucas",
    "Mantinhas Baby"
  ],
  "Acessórios": [
    "Bolsas",
    "Charms",
    "Chaveiros",
    "Faixas de Cabelo"
  ],
  "Bijuterias": [
    "Brincos",
    "Colares",
    "Broches",
    "Braceletes",
    "Anéis"
  ],
  "Artigos Para Casa": [
    "Decorações",
    "Mantas & Cobertores",
    "Amigurumis",
    "Sousplats & Mesas",
    "Almofadas"
  ]
};

// Aliases retrocompatíveis não-enumeráveis para testes e integrações legadas
Object.defineProperty(TAXONOMY_MAP, "Para Casa", {
  get() { return TAXONOMY_MAP["Artigos Para Casa"]; },
  enumerable: false,
  configurable: true
});
Object.defineProperty(TAXONOMY_MAP, "Acessórios & Bijuterias", {
  get() { return [...TAXONOMY_MAP["Acessórios"], ...TAXONOMY_MAP["Bijuterias"]]; },
  enumerable: false,
  configurable: true
});

export function resolveCanonicalDepartment(dept) {
  if (!dept) return null;
  const raw = String(dept).trim();
  if (TAXONOMY_MAP[raw]) return raw;
  const lower = raw.toLowerCase();
  if (lower === 'para casa' || lower === 'artigos para casa' || lower === 'casa' || lower === 'casa-gold') {
    return 'Artigos Para Casa';
  }
  if (lower === 'acessórios & bijuterias' || lower === 'acessorios & bijuterias' || lower === 'acessórios e bijuterias' || lower === 'acessorios e bijuterias') {
    return 'Acessórios & Bijuterias';
  }
  for (const key of Object.keys(TAXONOMY_MAP)) {
    if (key.toLowerCase() === lower) {
      return key;
    }
  }
  const noAccents = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const key of Object.keys(TAXONOMY_MAP)) {
    if (key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === noAccents) {
      return key;
    }
  }
  return null;
}

export function resolveProductTaxonomy(p) {
  if (!p) return { department: 'Para Ela', subcategory: 'Saias e vestidos' };

  let dept = resolveCanonicalDepartment(p.department) || p.department;
  let subcat = p.subcategory;

  // 1. Normalização de Departamento Legado
  if (dept === 'Para Casa') {
    dept = 'Artigos Para Casa';
  } else if (dept === 'Acessórios & Bijuterias') {
    const subLower = (subcat || '').toLowerCase();
    const nameLower = (p.name || '').toLowerCase();
    if (subLower.includes('brinco') || subLower.includes('colar') || subLower.includes('broche') || 
        subLower.includes('bracelete') || subLower.includes('anel') || subLower.includes('anéis') ||
        nameLower.includes('brinco') || nameLower.includes('colar') || nameLower.includes('anel')) {
      dept = 'Bijuterias';
    } else {
      dept = 'Acessórios';
    }
  }

  // 2. Se temos departamento válido no TAXONOMY_MAP
  if (dept && TAXONOMY_MAP[dept]) {
    const validSubcats = TAXONOMY_MAP[dept];
    if (subcat) {
      if (subcat === 'Calças e Shorts' && (dept === 'Para Ela' || dept === 'Para Ele')) {
        return { department: dept, subcategory: 'Calças' };
      }
      if (subcat === 'Mantas e Cobertores' && dept === 'Artigos Para Casa') {
        return { department: dept, subcategory: 'Mantas & Cobertores' };
      }
      if (subcat === 'Bijuterias & Brincos' && (dept === 'Bijuterias' || dept === 'Acessórios')) {
        return { department: 'Bijuterias', subcategory: 'Brincos' };
      }
      if (subcat === 'Roupas Infantis' && dept === 'Pequeninos') {
        return { department: dept, subcategory: 'Garotas' };
      }
      if (subcat === 'Brinquedos Amigurumi' && dept === 'Pequeninos') {
        return { department: dept, subcategory: 'Presentes' };
      }
      if (subcat === 'Acessórios Masculinos' && dept === 'Para Ele') {
        return { department: dept, subcategory: 'Roupas para noite' };
      }

      const match = validSubcats.find(s => s.toLowerCase() === subcat.toLowerCase());
      if (match) {
        return { department: dept, subcategory: match };
      }
    }
    return { department: dept, subcategory: validSubcats[0] };
  }

  // 3. Fallbacks heurísticos baseados em campos legados
  const cat = (p.category || '').toLowerCase();
  const sec = (p.section || '').toLowerCase();
  const gen = (p.gender || '').toLowerCase();
  const name = (p.name || '').toLowerCase();

  // Bijuterias
  if (name.includes('brinco') || cat.includes('brinco') || name.includes('colar') || name.includes('broche') || name.includes('bracelete') || name.includes('anel')) {
    let matchedSub = 'Brincos';
    if (name.includes('colar')) matchedSub = 'Colares';
    else if (name.includes('broche')) matchedSub = 'Broches';
    else if (name.includes('bracelete')) matchedSub = 'Braceletes';
    else if (name.includes('anel')) matchedSub = 'Anéis';
    return { department: 'Bijuterias', subcategory: matchedSub };
  }

  // Acessórios
  if (cat === 'bolsas' || sec === 'acessorios' || name.includes('bolsa') || name.includes('charm') || name.includes('chaveiro') || name.includes('faixa')) {
    let matchedSub = 'Bolsas';
    if (name.includes('charm')) matchedSub = 'Charms';
    else if (name.includes('chaveiro')) matchedSub = 'Chaveiros';
    else if (name.includes('faixa')) matchedSub = 'Faixas de Cabelo';
    return { department: 'Acessórios', subcategory: matchedSub };
  }

  // Artigos Para Casa
  if (cat === 'casa-gold' || cat === 'decoracoes' || sec === 'casa' || cat === 'amigurumi' || 
      name.includes('trilho') || name.includes('americano') || name.includes('celestial') || 
      name.includes('almofada') || name.includes('manta') || name.includes('sousplat')) {
    if (name.includes('trilho') || name.includes('americano') || name.includes('sousplat')) {
      return { department: 'Artigos Para Casa', subcategory: 'Sousplats & Mesas' };
    }
    if (cat === 'amigurumi' || name.includes('amigurumi') || name.includes('ursinho')) {
      return { department: 'Artigos Para Casa', subcategory: 'Amigurumis' };
    }
    if (name.includes('manta') || name.includes('cobertor')) {
      return { department: 'Artigos Para Casa', subcategory: 'Mantas & Cobertores' };
    }
    if (name.includes('almofada')) {
      return { department: 'Artigos Para Casa', subcategory: 'Almofadas' };
    }
    return { department: 'Artigos Para Casa', subcategory: 'Decorações' };
  }

  // Pequeninos
  if (cat === 'pequeninos' || cat === 'bebe' || cat === 'garotas' || cat === 'garotos' || 
      name.includes('baby') || name.includes('infantil') || name.includes('sapatinho') || name.includes('touca')) {
    if (name.includes('sapatinho') || name.includes('touca')) {
      return { department: 'Pequeninos', subcategory: 'Sapatinhos & Toucas' };
    }
    if (name.includes('manta') || name.includes('mantinha')) {
      return { department: 'Pequeninos', subcategory: 'Mantinhas Baby' };
    }
    if (cat === 'garotos' || name.includes('garoto')) {
      return { department: 'Pequeninos', subcategory: 'Garotos' };
    }
    if (cat === 'garotas' || name.includes('garota')) {
      return { department: 'Pequeninos', subcategory: 'Garotas' };
    }
    if (name.includes('presente')) {
      return { department: 'Pequeninos', subcategory: 'Presentes' };
    }
    return { department: 'Pequeninos', subcategory: 'Bebê' };
  }

  // Para Ele
  if (gen === 'masculino' || name.includes('camisa') || name.includes('bermuda') || name.includes('sueter') || name.includes('arpoador')) {
    if (name.includes('camisa') || name.includes('polo') || name.includes('arpoador')) {
      return { department: 'Para Ele', subcategory: 'Camisas & Polos' };
    }
    if (name.includes('bermuda') || name.includes('short')) {
      return { department: 'Para Ele', subcategory: 'Bermudas & Shorts' };
    }
    if (name.includes('jaqueta') || name.includes('casaco')) {
      return { department: 'Para Ele', subcategory: 'Jaquetas e casacos' };
    }
    if (name.includes('calça') || name.includes('calca')) {
      return { department: 'Para Ele', subcategory: 'Calças' };
    }
    if (name.includes('noite')) {
      return { department: 'Para Ele', subcategory: 'Roupas para noite' };
    }
    return { department: 'Para Ele', subcategory: 'Suéteres & Cardigans' };
  }

  // Para Ela
  if (cat === 'personalizado' || name.includes('personalizada') || p.custom) {
    return { department: 'Para Ela', subcategory: 'Sob Medida' };
  }
  if (cat === 'saias-vestidos' || name.includes('vestido') || name.includes('saia') || name.includes('bossa')) {
    return { department: 'Para Ela', subcategory: 'Saias e vestidos' };
  }
  if (cat === 'tops' || name.includes('regata') || name.includes('top') || name.includes('cropped')) {
    return { department: 'Para Ela', subcategory: 'Tops' };
  }
  if (cat === 'calcas' || name.includes('short') || name.includes('calça') || name.includes('noronha')) {
    return { department: 'Para Ela', subcategory: 'Calças' };
  }
  if (cat === 'jaquetas-casacos' || name.includes('jaqueta') || name.includes('casaco')) {
    return { department: 'Para Ela', subcategory: 'Jaquetas e casacos' };
  }
  if (cat === 'roupas-noite' || name.includes('noite')) {
    return { department: 'Para Ela', subcategory: 'Roupas para noite' };
  }
  if (cat === 'praia-resort' || name.includes('praia') || name.includes('resort')) {
    return { department: 'Para Ela', subcategory: 'Praia & Resort' };
  }

  return { department: 'Para Ela', subcategory: 'Saias e vestidos' };
}

export function computeLegacyCategory(department, subcategory) {
  const dept = resolveCanonicalDepartment(department) || department || '';
  const subcat = (subcategory || '').toLowerCase();

  if (dept === 'Acessórios' || dept === 'Bijuterias' || dept === 'Acessórios & Bijuterias') {
    return 'bolsas';
  }
  if (dept === 'Artigos Para Casa' || dept === 'Para Casa') {
    if (subcat.includes('amigurumi')) return 'amigurumi';
    if (subcat.includes('decora') || subcat.includes('sousplat')) return 'decoracoes';
    return 'casa-gold';
  }
  if (dept === 'Pequeninos') {
    if (subcat.includes('amigurumi')) return 'amigurumi';
    return 'pequeninos';
  }
  if (dept === 'Para Ele') {
    if (subcat.includes('camisa') || subcat.includes('polo')) return 'tops';
    if (subcat.includes('bermuda') || subcat.includes('short') || subcat.includes('calça')) return 'calcas';
    return 'vestuario';
  }
  if (dept === 'Para Ela') {
    if (subcat.includes('medida')) return 'personalizado';
    if (subcat.includes('top')) return 'tops';
    if (subcat.includes('calça') || subcat.includes('calca') || subcat.includes('short')) return 'calcas';
    if (subcat.includes('saia') || subcat.includes('vestido')) return 'saias-vestidos';
    if (subcat.includes('noite')) return 'roupas-noite';
    if (subcat.includes('jaqueta') || subcat.includes('casaco')) return 'jaquetas-casacos';
    if (subcat.includes('praia') || subcat.includes('resort')) return 'praia-resort';
    return 'vestuario';
  }
  return 'vestuario';
}

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
  selectedDepartmentFilter: 'all',
  selectedSubcategoryFilter: 'all',
  customerSearchQuery: '',
  orderStatusFilter: 'all',
  orderSearchQuery: '',
  activeDetailOrderId: null,
  editingProductId: null,
  isSyncing: false,
  selectedStockFilter: 'all',
  selectedProductIds: new Set(),
  quickViewProductId: null,
  undoStack: [],
  activeModalsStack: [],
  columnVisibility: JSON.parse(localStorage.getItem('gc_col_vis') || '{"select":true,"thumb":true,"name":true,"category":true,"price":true,"badge":true,"stock":true,"actions":true}'),
  audioAlertsEnabled: localStorage.getItem('gc_admin_audio') !== 'false',
  theme: localStorage.getItem('gc_admin_theme') || 'light'
};

// Utilitários de Formatação & Pesquisa
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

export function normalizeSearchTerm(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function highlightSearchMatch(text, query) {
  if (!text || !query || !query.trim()) return text || '';
  const rawQuery = query.trim();
  const cleanQuery = rawQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${cleanQuery})`, 'gi');
  return String(text).replace(regex, '<mark class="gc-search-mark">$1</mark>');
}

export function clearSearchInput(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.value = '';
  if (inputId === 'productSearchInput') {
    adminState.searchQuery = '';
    renderProductsList();
  } else if (inputId === 'orderSearchInput') {
    adminState.orderSearchQuery = '';
    renderOrdersList();
  } else if (inputId === 'customerSearchInput') {
    adminState.customerSearchQuery = '';
    renderCustomersList();
  }
  input.focus();
  const clearBtn = input.parentElement?.querySelector('.btn-clear-search');
  if (clearBtn) clearBtn.classList.add('hidden');
}

export function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('adminToastContainer');
  if (!container) return;

  while (container.children.length >= 3) {
    container.removeChild(container.firstChild);
  }

  const toast = document.createElement('div');
  toast.className = `admin-toast toast-${type}`;
  const icon = type === 'success' ? '✓' : (type === 'error' ? '✕' : (type === 'warning' ? '⚠️' : (type === 'gold' ? '✨' : 'ℹ')));
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-msg">${message}</span>
    <div class="toast-progress-bar" style="animation-duration:${duration}ms"></div>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function showToastWithUndo(message, undoAction, duration = 5000) {
  const container = document.getElementById('adminToastContainer');
  if (!container) return;

  while (container.children.length >= 3) {
    container.removeChild(container.firstChild);
  }

  const toast = document.createElement('div');
  toast.className = 'admin-toast toast-gold';
  toast.innerHTML = `
    <span class="toast-icon">✨</span>
    <span class="toast-msg">${message}</span>
    <button type="button" class="toast-undo-btn">Desfazer</button>
    <div class="toast-progress-bar" style="animation-duration:${duration}ms"></div>
  `;

  let undone = false;
  const undoBtn = toast.querySelector('.toast-undo-btn');
  if (undoBtn) {
    undoBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!undone && typeof undoAction === 'function') {
        undone = true;
        undoAction();
        toast.remove();
      }
    });
  }

  container.appendChild(toast);

  setTimeout(() => {
    if (!undone) {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
}

export function testAudioChime() {
  if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
      showToast('Sino do ateliê testado com sucesso!', 'gold');
    } catch(e) {}
  }
}

export function copyToClipboardWithFeedback(text, btnElement) {
  navigator.clipboard.writeText(text).then(() => {
    if (btnElement) {
      const originalHtml = btnElement.innerHTML;
      btnElement.innerHTML = '✓ Copiado!';
      btnElement.classList.add('copied');
      setTimeout(() => {
        btnElement.innerHTML = originalHtml;
        btnElement.classList.remove('copied');
      }, 2000);
    }
    showToast('Copiado para a área de transferência!', 'success');
  }).catch(() => {
    showToast(`Conteúdo: ${text}`, 'info');
  });
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

export function getDefaultCollections() {
  return [
    {
      id: 'raizes-douradas',
      slug: 'raizes-douradas',
      name: 'Raízes Douradas',
      icon: '✨',
      desc: 'A essência do crochê autoral refinado em fios nobres e tramas douradas que celebram a ancestralidade brasileira.',
      image: './assets/hero-tropical-bg.jpg',
      productIds: [1789954142890, 1789954688278]
    },
    {
      id: 'botanica-serena',
      slug: 'botanica-serena',
      name: 'Botânica Serena',
      icon: '🌿',
      desc: 'Tons terrosos, verde-oliva e formas orgânicas inspiradas na exuberância e no frescor da flora tropical.',
      image: './assets/peca-personalizada.png',
      productIds: [1789955083971]
    },
    {
      id: 'alto-verao',
      slug: 'alto-verao',
      name: 'Alto Verão & Resort',
      icon: '☀️',
      desc: 'Leveza e fluidez sob a luz tropical: vestidos, regatas e bolsas de palha e algodão.',
      image: './assets/peca-personalizada.png',
      productIds: [1789954688278, 1789955083971]
    },
    {
      id: 'casa-brasil',
      slug: 'casa-brasil',
      name: 'Casa Brasil & Mesa Posta',
      icon: '🏡',
      desc: 'Aconchego botânico e requinte à mesa posta em peças de puro algodão e tramas aveludadas.',
      image: './assets/hero-tropical-bg.jpg',
      productIds: []
    },
    {
      id: 'essenciais',
      slug: 'Essenciais',
      name: 'Coleção Essenciais',
      icon: '🧶',
      desc: 'O luxo despretensioso das formas puras e peças atemporais para qualquer ocasião.',
      image: './assets/hero-tropical-bg.jpg',
      productIds: [1789954142890, 1789954688278]
    }
  ];
}

export function loadLocalCache() {
  try {
    const localProds = localStorage.getItem('gc_cached_products');
    if (localProds) adminState.products = JSON.parse(localProds);

    const localCats = localStorage.getItem('gc_cached_categories');
    if (localCats) adminState.categories = JSON.parse(localCats);

    const localCols = localStorage.getItem('gc_collections_v2') || localStorage.getItem('gc_cached_collections');
    if (localCols) adminState.collections = JSON.parse(localCols);

    const localOrders = localStorage.getItem('gc_cached_orders');
    if (localOrders) adminState.orders = JSON.parse(localOrders);

    const localLogs = localStorage.getItem('gc_admin_logs');
    if (localLogs) adminState.logs = JSON.parse(localLogs);
  } catch (e) {}

  if (!adminState.collections || !adminState.collections.length) {
    adminState.collections = getDefaultCollections();
    try {
      localStorage.setItem('gc_cached_collections', JSON.stringify(adminState.collections));
      localStorage.setItem('gc_collections_v2', JSON.stringify(adminState.collections));
    } catch(e) {}
  }

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
  if (cBadge) cBadge.textContent = (adminState.categories && adminState.categories.length) ? adminState.categories.length : 33;
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
        localStorage.setItem('gc_collections_v2', JSON.stringify(list));
        return;
      }
    }
  } catch(e) {
    console.warn('[Collections Firestore Error]', e);
  }

  // Fallback padrão se não houver coleções no Firestore
  if (!adminState.collections.length) {
    const cached = localStorage.getItem('gc_collections_v2') || localStorage.getItem('gc_cached_collections');
    if (cached) {
      try { adminState.collections = JSON.parse(cached); } catch(e) {}
    }
    if (!adminState.collections.length) {
      adminState.collections = getDefaultCollections();
      localStorage.setItem('gc_cached_collections', JSON.stringify(adminState.collections));
      localStorage.setItem('gc_collections_v2', JSON.stringify(adminState.collections));
    }
  }
}

export function updateColCounter() {
  const checklist = document.getElementById('colProductChecklist');
  const counter = document.getElementById('colSelectedCounter');
  if (!counter) return;
  const count = checklist ? checklist.querySelectorAll('input[type="checkbox"]:checked').length : 0;
  counter.textContent = `${count} selecionada${count === 1 ? '' : 's'}`;
}

export function filterColProductChecklist(query = '') {
  const checklist = document.getElementById('colProductChecklist');
  if (!checklist) return;
  const q = String(query || '').trim().toLowerCase();
  const rows = checklist.querySelectorAll('.col-prod-row');
  rows.forEach(r => {
    const searchData = (r.getAttribute('data-search') || r.innerText || '').toLowerCase();
    if (!q || searchData.includes(q)) {
      r.style.display = 'flex';
    } else {
      r.style.display = 'none';
    }
  });
}

export function toggleAllColProducts(checkState = true) {
  const checklist = document.getElementById('colProductChecklist');
  if (!checklist) return;
  const cbs = checklist.querySelectorAll('input[type="checkbox"]');
  cbs.forEach(cb => {
    cb.checked = Boolean(checkState);
    const row = cb.closest('.col-prod-row');
    if (row) {
      row.style.background = cb.checked ? 'rgba(205,164,52,0.06)' : 'transparent';
      row.style.borderColor = cb.checked ? 'rgba(205,164,52,0.35)' : 'var(--border-subtle)';
    }
  });
  updateColCounter();
}

export function onColProductToggle(cb) {
  if (!cb) return;
  const row = cb.closest('.col-prod-row');
  if (row) {
    row.style.background = cb.checked ? 'rgba(205,164,52,0.06)' : 'transparent';
    row.style.borderColor = cb.checked ? 'rgba(205,164,52,0.35)' : 'var(--border-subtle)';
  }
  updateColCounter();
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
  const searchInput = document.getElementById('colProductSearchInput');
  const checklist = document.getElementById('colProductChecklist');

  if (searchInput) searchInput.value = '';

  let selectedIds = [];
  if (col) {
    if (title) title.textContent = `Editar Coleção: ${col.name}`;
    if (idInput) idInput.value = col.id || col.slug;
    if (nameInput) nameInput.value = col.name || '';
    if (slugInput) slugInput.value = col.slug || '';
    if (iconInput) iconInput.value = col.icon || '✨';
    if (descInput) descInput.value = col.desc || '';
    if (imageInput) imageInput.value = col.image || '';

    if (Array.isArray(col.productIds) && col.productIds.length) {
      selectedIds = col.productIds.map(Number);
    } else {
      selectedIds = adminState.products
        .filter(p => p.collection === col.name || p.collection === col.slug || (Array.isArray(p.collections) && (p.collections.includes(col.slug) || p.collections.includes(col.name))))
        .map(p => Number(p.id));
    }
  } else {
    if (title) title.textContent = 'Nova Coleção Exclusiva';
    if (idInput) idInput.value = '';
    if (nameInput) nameInput.value = '';
    if (slugInput) slugInput.value = '';
    if (iconInput) iconInput.value = '✨';
    if (descInput) descInput.value = '';
    if (imageInput) imageInput.value = '';
  }

  // Render checklist items
  if (checklist) {
    if (!adminState.products || !adminState.products.length) {
      checklist.innerHTML = '<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:0.82rem">Nenhum produto cadastrado no catálogo.</div>';
    } else {
      checklist.innerHTML = adminState.products.map(p => {
        const pid = Number(p.id);
        const isChecked = selectedIds.includes(pid);
        const img = p.image || (p.gallery && p.gallery[0]) || './assets/icon.svg';
        const priceStr = p.price ? `R$ ${Number(p.price).toFixed(2).replace('.', ',')}` : 'Sob Consulta';
        const dept = p.department || '';
        const subcat = p.subcategory || p.category || '';
        const searchTerms = `${p.name} ${dept} ${subcat} ${p.collection || ''} ${p.id}`.toLowerCase();

        return `
          <label class="col-prod-row" data-id="${p.id}" data-search="${searchTerms}" style="display:flex;align-items:center;gap:12px;padding:8px 10px;border-radius:6px;cursor:pointer;border:1px solid ${isChecked ? 'rgba(205,164,52,0.35)' : 'var(--border-subtle)'};background:${isChecked ? 'rgba(205,164,52,0.06)' : 'transparent'};transition:all 0.15s">
            <input type="checkbox" class="col-prod-cb" value="${p.id}" ${isChecked ? 'checked' : ''} onchange="window.AdminCore.onColProductToggle(this)">
            <img src="${img}" alt="${p.name}" style="width:38px;height:46px;object-fit:cover;border-radius:4px;border:1px solid var(--border-subtle)">
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:0.86rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</div>
              <div style="font-size:0.75rem;color:var(--text-muted)">${subcat || dept || 'Ateliê'} • ${priceStr}</div>
            </div>
            <span style="font-size:0.72rem;padding:2px 8px;border-radius:12px;background:var(--surface-subtle);color:var(--text-muted)">${p.collection || 'Sem coleção'}</span>
          </label>
        `;
      }).join('');
    }
  }

  updateColCounter();
  modal.classList.remove('hidden');
}

export function closeCollectionModal() {
  const modal = document.getElementById('collectionModal');
  if (modal) modal.classList.add('hidden');
}

export async function saveCollection(data) {
  const slug = (data.slug || data.name).toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  const id = data.id || slug;

  let selectedIds = [];
  const checklist = document.getElementById('colProductChecklist');
  const checkedBoxes = checklist ? Array.from(checklist.querySelectorAll('input[type="checkbox"]:checked')) : [];
  if (checkedBoxes.length > 0) {
    selectedIds = checkedBoxes.map(cb => Number(cb.value));
  } else if (Array.isArray(data.productIds) && data.productIds.length > 0) {
    selectedIds = data.productIds.map(Number);
  }

  const colObj = {
    id,
    name: (data.name || '').trim(),
    slug: (data.slug || '').trim() || slug,
    icon: data.icon || '✨',
    desc: data.desc || '',
    image: data.image || '',
    productIds: selectedIds,
    updatedAt: new Date().toISOString()
  };

  const idx = adminState.collections.findIndex(c => c.id === id || c.slug === colObj.slug);
  if (idx !== -1) {
    adminState.collections[idx] = colObj;
  } else {
    adminState.collections.push(colObj);
  }

  // Sincronização Bidirecional com adminState.products
  if (Array.isArray(adminState.products)) {
    adminState.products.forEach(p => {
      const pid = Number(p.id);
      if (!Array.isArray(p.collections)) p.collections = [];
      if (selectedIds.includes(pid)) {
        p.collection = colObj.name;
        if (!p.collections.includes(colObj.slug)) p.collections.push(colObj.slug);
      } else {
        p.collections = p.collections.filter(s => s !== colObj.slug && s !== colObj.name);
        if (p.collection === colObj.name || p.collection === colObj.slug) {
          p.collection = p.collections[0] || 'Essenciais';
        }
      }
    });
    localStorage.setItem('gc_cached_products', JSON.stringify(adminState.products));
  }

  localStorage.setItem('gc_cached_collections', JSON.stringify(adminState.collections));
  localStorage.setItem('gc_collections_v2', JSON.stringify(adminState.collections));

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
  localStorage.setItem('gc_collections_v2', JSON.stringify(adminState.collections));
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
    const productsInCol = adminState.products.filter(p => {
      if (Array.isArray(col.productIds) && col.productIds.includes(Number(p.id))) return true;
      if (p.collection === col.name || p.collection === col.slug) return true;
      if (Array.isArray(p.collections) && (p.collections.includes(col.slug) || p.collections.includes(col.name))) return true;
      return false;
    }).length;

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
// POPUP & FLUXO DE TOKEN DO GITHUB
// ════════════════════════════════════════

let pendingProductSaveData = null;

export function openGhTokenModal(pendingData = null) {
  pendingProductSaveData = pendingData;
  const modal = document.getElementById('ghTokenModal');
  const input = document.getElementById('ghModalTokenInput');
  if (input) {
    input.value = localStorage.getItem('gh_token') || '';
  }
  if (modal) modal.classList.remove('hidden');
}

export function closeGhTokenModal() {
  const modal = document.getElementById('ghTokenModal');
  if (modal) modal.classList.add('hidden');
  pendingProductSaveData = null;
}

export async function confirmGhTokenAndSave() {
  const input = document.getElementById('ghModalTokenInput');
  const token = (input && input.value ? input.value.trim() : '') || localStorage.getItem('gh_token') || '';

  if (!token) {
    showToast('Por favor, informe seu token do GitHub.', 'warning');
    if (input) input.focus();
    return;
  }

  localStorage.setItem('gh_token', token);
  const ghTokenInput = document.getElementById('ghTokenInput');
  if (ghTokenInput) ghTokenInput.value = token;

  const dataToSave = pendingProductSaveData;
  closeGhTokenModal();

  if (dataToSave) {
    await executeSaveAndPush(dataToSave, token);
  } else {
    showToast('Token do GitHub salvo com sucesso!', 'success');
  }
}

export async function executeSaveAndPush(pData, token = '') {
  const btn = document.getElementById('btnSubmitProduct');
  const oldText = btn ? btn.textContent : '';
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Salvando e publicando...';
  }

  try {
    // 1. Salva localmente e no Firestore
    await saveProduct(pData);
    // 2. Envia para o GitHub Pages
    await pushCatalogToGitHub(token);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = oldText;
    }
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

export function setDepartmentFilter(dept) {
  adminState.selectedDepartmentFilter = dept || 'all';
  const deptSelect = document.getElementById('productDepartmentFilter');
  if (deptSelect && deptSelect.value !== adminState.selectedDepartmentFilter) {
    deptSelect.value = adminState.selectedDepartmentFilter;
  }
  updateSubcategoryFilterOptions(dept);
  adminState.selectedSubcategoryFilter = 'all';
  renderActiveFilterChips();
  renderProductsList();
}

export function setSubcategoryFilter(subcat) {
  adminState.selectedSubcategoryFilter = subcat || 'all';
  const subSelect = document.getElementById('productSubcategoryFilter');
  if (subSelect && subSelect.value !== adminState.selectedSubcategoryFilter) {
    subSelect.value = adminState.selectedSubcategoryFilter;
  }
  renderActiveFilterChips();
  renderProductsList();
}

export function setStockFilter(status) {
  adminState.selectedStockFilter = status || 'all';
  document.querySelectorAll('#productStockFilters .filter-tab-pill').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-stock') === adminState.selectedStockFilter);
  });
  renderActiveFilterChips();
  renderProductsList();
}

export function clearAllProductFilters() {
  adminState.selectedDepartmentFilter = 'all';
  adminState.selectedSubcategoryFilter = 'all';
  adminState.selectedStockFilter = 'all';
  adminState.selectedCategoryFilter = 'all';
  adminState.searchQuery = '';
  const searchInput = document.getElementById('productSearchInput');
  if (searchInput) searchInput.value = '';
  const deptSelect = document.getElementById('productDepartmentFilter');
  if (deptSelect) deptSelect.value = 'all';
  updateSubcategoryFilterOptions('all');
  const stockBtns = document.querySelectorAll('#productStockFilters .filter-tab-pill');
  stockBtns.forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-stock') === 'all'));
  renderActiveFilterChips();
  renderProductsList();
}

export function updateSubcategoryFilterOptions(dept) {
  const select = document.getElementById('productSubcategoryFilter');
  if (!select) return;
  const curVal = adminState.selectedSubcategoryFilter;
  const canonDept = resolveCanonicalDepartment(dept);
  if (!dept || dept === 'all') {
    const allSubcats = new Set();
    Object.values(TAXONOMY_MAP).forEach(subList => subList.forEach(s => allSubcats.add(s)));
    select.innerHTML = '<option value="all">Todas as Subcategorias</option>' + 
      Array.from(allSubcats).sort().map(s => `<option value="${s}">${s}</option>`).join('');
  } else if (canonDept && TAXONOMY_MAP[canonDept]) {
    select.innerHTML = '<option value="all">Todas as Subcategorias</option>' + 
      TAXONOMY_MAP[canonDept].map(s => `<option value="${s}">${s}</option>`).join('');
  }
  if (Array.from(select.options).some(o => o.value === curVal)) {
    select.value = curVal;
  } else {
    select.value = 'all';
    adminState.selectedSubcategoryFilter = 'all';
  }
}

export function renderActiveFilterChips() {
  const container = document.getElementById('activeFiltersContainer');
  const chipsList = document.getElementById('activeFilterChips');
  if (!container || !chipsList) return;

  const chips = [];
  if (adminState.selectedDepartmentFilter && adminState.selectedDepartmentFilter !== 'all') {
    chips.push({ label: `Linha: ${adminState.selectedDepartmentFilter}`, key: 'dept' });
  }
  if (adminState.selectedSubcategoryFilter && adminState.selectedSubcategoryFilter !== 'all') {
    chips.push({ label: `Subcat: ${adminState.selectedSubcategoryFilter}`, key: 'subcat' });
  }
  if (adminState.selectedStockFilter && adminState.selectedStockFilter !== 'all') {
    chips.push({ label: adminState.selectedStockFilter === 'in_stock' ? 'Pronta Entrega' : 'Sob Encomenda', key: 'stock' });
  }
  if (adminState.searchQuery && adminState.searchQuery.trim()) {
    chips.push({ label: `Busca: "${adminState.searchQuery.trim()}"`, key: 'search' });
  }

  if (chips.length > 0) {
    container.classList.remove('hidden');
    chipsList.innerHTML = chips.map(c => `
      <span class="active-filter-chip">
        <span>${c.label}</span>
        <button type="button" onclick="window.AdminCore.removeSingleFilter('${c.key}')" title="Remover filtro">×</button>
      </span>
    `).join('');
  } else {
    container.classList.add('hidden');
    chipsList.innerHTML = '';
  }
}

export function removeSingleFilter(key) {
  if (key === 'dept') {
    setDepartmentFilter('all');
  } else if (key === 'subcat') {
    setSubcategoryFilter('all');
  } else if (key === 'stock') {
    setStockFilter('all');
  } else if (key === 'search') {
    clearSearchInput('productSearchInput');
  }
}

export function calculateInventoryStats() {
  const inStockProducts = adminState.products.filter(p => p.inStock !== false);
  const capital = inStockProducts.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
  const lowStock = adminState.products.filter(p => p.inStock === false).length;
  const avgPrice = adminState.products.length ? 
    (adminState.products.reduce((sum, p) => sum + (Number(p.price) || 0), 0) / adminState.products.length) : 0;

  const capEl = document.getElementById('statInventoryCapital');
  const totalValEl = document.getElementById('totalInventoryValue');
  if (capEl) capEl.textContent = formatBRL(capital);
  if (totalValEl) totalValEl.textContent = formatBRL(capital);

  const lowEl = document.getElementById('statLowStockCount');
  if (lowEl) lowEl.textContent = `${lowStock} sob encomenda`;

  const countEl = document.getElementById('totalStockCount');
  if (countEl) countEl.textContent = `${adminState.products.length} peças`;

  const avgEl = document.getElementById('statAvgProductPrice');
  if (avgEl) avgEl.textContent = formatBRL(avgPrice);

  renderDeptDistribution();
}

export function renderDeptDistribution() {
  const distBar = document.getElementById('deptDistributionBar');
  const legend = document.getElementById('deptDistLegend');
  if (!distBar) return;

  const deptCounts = {};
  Object.keys(TAXONOMY_MAP).forEach(d => deptCounts[d] = 0);
  adminState.products.forEach(p => {
    const tax = resolveProductTaxonomy(p);
    if (deptCounts[tax.department] !== undefined) {
      deptCounts[tax.department]++;
    }
  });

  const total = adminState.products.length || 1;
  const colors = {
    'Para Ela': '#d4af37',
    'Para Ele': '#5c768d',
    'Pequeninos': '#d48872',
    'Acessórios': '#a67c00',
    'Bijuterias': '#cda434',
    'Artigos Para Casa': '#82957b',
    'Para Casa': '#82957b',
    'Acessórios & Bijuterias': '#a67c00'
  };

  distBar.innerHTML = Object.entries(deptCounts).map(([dept, count]) => {
    const pct = Math.round((count / total) * 100);
    if (!count) return '';
    return `<div class="dept-dist-segment" style="width:${pct}%;background:${colors[dept] || '#cda434'}" title="${dept}: ${count} (${pct}%)"></div>`;
  }).join('');

  if (legend) {
    legend.innerHTML = Object.entries(deptCounts).map(([dept, count]) => {
      const pct = Math.round((count / total) * 100);
      return `
        <div class="dept-dist-legend-item">
          <span class="dept-dist-dot" style="background:${colors[dept] || '#cda434'}"></span>
          <span>${dept}: <strong>${count}</strong> (${pct}%)</span>
        </div>
      `;
    }).join('');
  }
}

export function animateNumericCounter(elementId, targetValue, isCurrency = false) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const target = Number(targetValue) || 0;
  let start = 0;
  const duration = 600;
  const startTime = performance.now();

  function updateStep(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const current = start + (target - start) * easeOut;
    el.textContent = isCurrency ? formatBRL(current) : Math.round(current);
    if (progress < 1) {
      requestAnimationFrame(updateStep);
    } else {
      el.textContent = isCurrency ? formatBRL(target) : target;
    }
  }
  requestAnimationFrame(updateStep);
}

export function toggleSelectAllProducts(checked) {
  if (!adminState.selectedProductIds) adminState.selectedProductIds = new Set();
  if (checked) {
    adminState.products.forEach(p => adminState.selectedProductIds.add(String(p.id)));
  } else {
    adminState.selectedProductIds.clear();
  }
  document.querySelectorAll('.product-select-chk').forEach(chk => {
    chk.checked = checked;
  });
  const master = document.getElementById('masterSelectAllCheckbox');
  if (master) master.checked = checked;
  updateBulkToolbar();
}

export function onProductSelectChange(id, checked, event) {
  if (!adminState.selectedProductIds) adminState.selectedProductIds = new Set();
  const strId = String(id);
  if (checked) {
    adminState.selectedProductIds.add(strId);
  } else {
    adminState.selectedProductIds.delete(strId);
  }
  const master = document.getElementById('masterSelectAllCheckbox');
  if (master) {
    master.checked = adminState.selectedProductIds.size === adminState.products.length && adminState.products.length > 0;
  }
  updateBulkToolbar();
}

export function clearProductSelection() {
  if (adminState.selectedProductIds) adminState.selectedProductIds.clear();
  document.querySelectorAll('.product-select-chk').forEach(chk => chk.checked = false);
  const master = document.getElementById('masterSelectAllCheckbox');
  if (master) master.checked = false;
  updateBulkToolbar();
}

export function updateBulkToolbar() {
  const toolbar = document.getElementById('bulkActionsToolbar');
  if (!toolbar) return;
  const count = adminState.selectedProductIds ? adminState.selectedProductIds.size : 0;
  const countEl = document.getElementById('bulkSelectionCount');
  const countAltEl = document.getElementById('bulkSelectedCount');
  if (countEl) countEl.textContent = count;
  if (countAltEl) countAltEl.textContent = count;

  if (count > 0) {
    toolbar.classList.remove('hidden');
  } else {
    toolbar.classList.add('hidden');
  }
}

export async function bulkDeleteSelectedProducts() {
  const count = adminState.selectedProductIds ? adminState.selectedProductIds.size : 0;
  if (!count) return;
  if (!confirm(`Tem certeza que deseja excluir as ${count} criações selecionadas?`)) return;

  const idsToDelete = new Set(adminState.selectedProductIds);
  const deletedProducts = adminState.products.filter(p => idsToDelete.has(String(p.id)));
  adminState.products = adminState.products.filter(p => !idsToDelete.has(String(p.id)));

  localStorage.setItem('gc_cached_products', JSON.stringify(adminState.products));
  clearProductSelection();
  renderProductsList();
  calculateInventoryStats();

  showToastWithUndo(`${count} criação(ões) excluída(s).`, () => {
    adminState.products.unshift(...deletedProducts);
    localStorage.setItem('gc_cached_products', JSON.stringify(adminState.products));
    renderProductsList();
    calculateInventoryStats();
    showToast('Exclusão desfeita com sucesso!', 'success');
  });

  const fb = window.GoldFirebase;
  if (fb && fb.db) {
    for (const pid of idsToDelete) {
      try {
        await fb.deleteDoc(fb.fsDoc(fb.db, 'products', String(pid)));
      } catch(e) {}
    }
  }
}

export async function bulkSetStock(isInStock) {
  const count = adminState.selectedProductIds ? adminState.selectedProductIds.size : 0;
  if (!count) return;

  adminState.products.forEach(p => {
    if (adminState.selectedProductIds.has(String(p.id))) {
      p.inStock = isInStock;
    }
  });

  localStorage.setItem('gc_cached_products', JSON.stringify(adminState.products));
  renderProductsList();
  calculateInventoryStats();
  showToast(`${count} peça(s) marcadas como ${isInStock ? 'Pronta Entrega' : 'Sob Encomenda'}.`, 'success');

  const fb = window.GoldFirebase;
  if (fb && fb.db) {
    for (const pid of adminState.selectedProductIds) {
      try {
        await fb.setDoc(fb.fsDoc(fb.db, 'products', String(pid)), { inStock: isInStock }, { merge: true });
      } catch(e) {}
    }
  }
}

export function openBulkCollectionModal() {
  const select = document.getElementById('bulkCollectionSelect');
  const modal = document.getElementById('bulkCollectionModal');
  if (!select || !modal) return;
  select.innerHTML = adminState.collections.map(c => `<option value="${c.slug}">${c.name}</option>`).join('');
  modal.classList.remove('hidden');
}

export function bulkAssignToCollection(colSlug) {
  const col = adminState.collections.find(c => c.slug === colSlug);
  if (!col) return;
  if (!Array.isArray(col.productIds)) col.productIds = [];

  adminState.selectedProductIds.forEach(id => {
    const numId = Number(id);
    if (!col.productIds.includes(numId)) col.productIds.push(numId);
    const p = adminState.products.find(item => String(item.id) === String(id));
    if (p) {
      p.collection = col.name;
      if (!Array.isArray(p.collections)) p.collections = [];
      if (!p.collections.includes(col.slug)) p.collections.push(col.slug);
    }
  });

  localStorage.setItem('gc_cached_products', JSON.stringify(adminState.products));
  localStorage.setItem('gc_cached_collections', JSON.stringify(adminState.collections));
  localStorage.setItem('gc_collections_v2', JSON.stringify(adminState.collections));

  const modal = document.getElementById('bulkCollectionModal');
  if (modal) modal.classList.add('hidden');
  clearProductSelection();
  renderProductsList();
  renderCollectionsList();
  showToast(`Peças atribuídas à coleção "${col.name}"!`, 'success');
}

export function openProductQuickView(productId) {
  const p = adminState.products.find(item => String(item.id) === String(productId));
  if (!p) return;
  adminState.quickViewProductId = p.id;

  const qvModal = document.getElementById('productQuickViewModal');
  if (!qvModal) return;

  const tax = resolveProductTaxonomy(p);
  const img = p.image || (p.gallery && p.gallery[0]) || './assets/icon.svg';

  const nameEl = document.getElementById('qvName');
  const priceEl = document.getElementById('qvPrice');
  const descEl = document.getElementById('qvDesc');
  const deptEl = document.getElementById('qvDeptBadge');
  const stockEl = document.getElementById('qvStockBadge');
  const matEl = document.getElementById('qvMaterial');
  const timeEl = document.getElementById('qvProdTime');
  const colorsEl = document.getElementById('qvColors');
  const mainImg = document.getElementById('qvMainImage');
  const thumbs = document.getElementById('qvGalleryThumbs');

  if (nameEl) nameEl.textContent = p.name;
  if (priceEl) priceEl.textContent = p.price ? formatBRL(p.price) : 'Sob Consulta';
  if (descEl) descEl.textContent = p.desc || p.material || 'Peça autoral tecida à mão em fios nobres.';
  if (deptEl) deptEl.textContent = `${tax.department} · ${tax.subcategory}`;
  if (matEl) matEl.textContent = p.material || 'Fio 100% Algodão Nobre';
  if (timeEl) timeEl.textContent = p.prod_time ? `${p.prod_time} dias úteis` : '8 dias úteis';
  if (colorsEl) colorsEl.textContent = Array.isArray(p.colors) ? p.colors.join(', ') : (p.colors || 'Sob Encomenda');

  if (mainImg) mainImg.src = img;

  const inStock = p.inStock !== false;
  if (stockEl) {
    stockEl.className = `stock-pill ${inStock ? 'in-stock' : 'out-of-stock'}`;
    stockEl.textContent = inStock ? '✓ EM ESTOQUE' : '⏳ SOB ENCOMENDA';
  }

  if (thumbs) {
    const gallery = Array.isArray(p.gallery) && p.gallery.length ? p.gallery : [img];
    thumbs.innerHTML = gallery.map(gImg => `
      <img src="${gImg}" class="qv-thumb-img ${gImg === img ? 'active' : ''}" 
           onclick="document.getElementById('qvMainImage').src='${gImg}'; document.querySelectorAll('.qv-thumb-img').forEach(el=>el.classList.remove('active')); this.classList.add('active');" 
           onerror="this.src='./assets/icon.svg'">
    `).join('');
  }

  qvModal.classList.remove('hidden');
}

export function closeProductQuickView() {
  const qvModal = document.getElementById('productQuickViewModal');
  if (qvModal) qvModal.classList.add('hidden');
  adminState.quickViewProductId = null;
}

export function quickViewToggleStock() {
  if (!adminState.quickViewProductId) return;
  toggleProductStock(adminState.quickViewProductId);
  const p = adminState.products.find(item => String(item.id) === String(adminState.quickViewProductId));
  if (p) {
    const inStock = p.inStock !== false;
    const stockEl = document.getElementById('qvStockBadge');
    if (stockEl) {
      stockEl.className = `stock-pill ${inStock ? 'in-stock' : 'out-of-stock'}`;
      stockEl.textContent = inStock ? '✓ EM ESTOQUE' : '⏳ SOB ENCOMENDA';
    }
  }
}

export function quickViewCopyPublicLink() {
  if (!adminState.quickViewProductId) return;
  const p = adminState.products.find(item => String(item.id) === String(adminState.quickViewProductId));
  if (!p) return;
  const slug = p.slug || 'bolsa-paraty';
  const url = `https://goldcrochet-shop.github.io/produtos/${slug}.html`;
  navigator.clipboard.writeText(url).then(() => {
    showToast('Link da vitrine copiado para a área de transferência!', 'success');
  }).catch(() => {
    showToast(`Link: ${url}`, 'info');
  });
}

export function quickViewProceedToEdit() {
  const pid = adminState.quickViewProductId;
  closeProductQuickView();
  if (pid) {
    editProduct(pid);
  }
}

export function initKeyboardShortcuts() {
  if (window.__adminShortcutsInitialized) return;
  window.__adminShortcutsInitialized = true;

  window.addEventListener('keydown', (e) => {
    // 1. Ctrl+K / Cmd+K -> Focus Search
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      let targetInput = document.getElementById('productSearchInput');
      if (adminState.currentView === 'orders') {
        targetInput = document.getElementById('orderSearchInput');
      } else if (adminState.currentView === 'customers') {
        targetInput = document.getElementById('customerSearchInput');
      }
      if (targetInput) {
        targetInput.focus();
        targetInput.select();
      }
      return;
    }

    // 2. Escape -> Close Topmost Modal
    if (e.key === 'Escape' || e.code === 'Escape') {
      closeTopmostModal();
      return;
    }

    // 3. Ctrl+S / Cmd+S -> Save Active Modal Form
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      saveCurrentActiveModal();
      return;
    }

    // 4. Ctrl+N / Cmd+N -> New item in active view
    if ((e.ctrlKey || e.metaKey) && (e.key === 'n' || e.key === 'N')) {
      e.preventDefault();
      triggerNewCreationShortcut();
      return;
    }

    // 5. ? (Shift + /) -> Shortcuts Guide
    if (e.key === '?' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
      e.preventDefault();
      openShortcutsModal();
    }
  });
}

export function closeTopmostModal() {
  const modals = [
    document.getElementById('shortcutsGuideModal'),
    document.getElementById('bulkCollectionModal'),
    document.getElementById('productQuickViewModal'),
    document.getElementById('productModal'),
    document.getElementById('orderDetailModal'),
    document.getElementById('createOrderModal'),
    document.getElementById('customerModal'),
    document.getElementById('collectionModal')
  ];
  for (const m of modals) {
    if (m && !m.classList.contains('hidden')) {
      m.classList.add('hidden');
      return true;
    }
  }
  if (adminState.selectedProductIds && adminState.selectedProductIds.size > 0) {
    clearProductSelection();
    return true;
  }
  return false;
}

export function saveCurrentActiveModal() {
  const pModal = document.getElementById('productModal');
  if (pModal && !pModal.classList.contains('hidden')) {
    const form = document.getElementById('productForm');
    if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    return;
  }
  const colModal = document.getElementById('collectionModal');
  if (colModal && !colModal.classList.contains('hidden')) {
    const form = document.getElementById('collectionForm');
    if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    return;
  }
  const custModal = document.getElementById('customerModal');
  if (custModal && !custModal.classList.contains('hidden')) {
    const form = document.getElementById('customerForm');
    if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    return;
  }
  const createOrdModal = document.getElementById('createOrderModal');
  if (createOrdModal && !createOrdModal.classList.contains('hidden')) {
    const form = document.getElementById('createOrderForm');
    if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    return;
  }
}

export function triggerNewCreationShortcut() {
  if (adminState.currentView === 'products') {
    openNewProductModal();
  } else if (adminState.currentView === 'orders') {
    openCreateOrderModal();
  } else if (adminState.currentView === 'collections') {
    openCollectionModal();
  } else if (adminState.currentView === 'customers') {
    openManualCustomerModal();
  }
}

export function openShortcutsModal() {
  const m = document.getElementById('shortcutsGuideModal');
  if (m) m.classList.remove('hidden');
}

export function closeShortcutsModal() {
  const m = document.getElementById('shortcutsGuideModal');
  if (m) m.classList.add('hidden');
}

export function printProductPriceTags(selectedProductIds) {
  const ids = Array.isArray(selectedProductIds) && selectedProductIds.length ?
    selectedProductIds : (adminState.selectedProductIds.size ? Array.from(adminState.selectedProductIds) : adminState.products.map(p => p.id));

  const slip = document.getElementById('printableSlip');
  if (!slip) return;

  const targetProducts = adminState.products.filter(p => ids.includes(p.id) || ids.includes(String(p.id)));

  slip.innerHTML = `
    <div style="font-family:sans-serif;padding:20px;display:grid;grid-template-columns:repeat(2, 1fr);gap:20px;">
      ${targetProducts.map(p => {
        const tax = resolveProductTaxonomy(p);
        return `
          <div style="border:2px solid #cda434;border-radius:10px;padding:16px;text-align:center;background:#fff;page-break-inside:avoid">
            <h3 style="margin:0 0 4px;font-size:1.1rem;color:#a67c00">ATELIÊ GOLD CROCHET</h3>
            <div style="font-size:0.75rem;color:#888;text-transform:uppercase;letter-spacing:1px">${tax.department} · ${tax.subcategory}</div>
            <h2 style="margin:10px 0;font-size:1.25rem;color:#181614">${p.name}</h2>
            <div style="font-size:1.5rem;font-weight:800;color:#cda434;margin:8px 0">${formatBRL(p.price || 0)}</div>
            <p style="font-size:0.75rem;color:#555;margin:6px 0">Fio: ${p.material || '100% Algodão Nobre'} • Feito à mão</p>
            <div style="font-size:0.68rem;color:#aaa;border-top:1px dashed #ddd;padding-top:6px;margin-top:8px">goldcrochet-shop.github.io • Peça Autoral Exclusiva</div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  slip.style.display = 'block';
  window.print();
  setTimeout(() => { slip.style.display = 'none'; }, 1000);
}

export function exportFilteredProductsJSON() {
  const query = (adminState.searchQuery || '').toLowerCase();
  const catFilter = adminState.selectedCategoryFilter;
  const deptFilter = adminState.selectedDepartmentFilter || 'all';
  const subcatFilter = adminState.selectedSubcategoryFilter || 'all';
  const stockFilter = adminState.selectedStockFilter || 'all';

  const filtered = adminState.products.filter(p => {
    const tax = resolveProductTaxonomy(p);
    const inStock = p.inStock !== false;
    const matchQuery = !query || (p.name || '').toLowerCase().includes(query) || String(p.id).includes(query);
    const matchDept = deptFilter === 'all' || tax.department === deptFilter;
    const matchSubcat = subcatFilter === 'all' || tax.subcategory === subcatFilter;
    const matchCat = !catFilter || catFilter === 'all' || p.category === catFilter;
    const matchStock = stockFilter === 'all' || (stockFilter === 'in_stock' ? inStock : !inStock);
    return matchQuery && matchDept && matchSubcat && matchCat && matchStock;
  });

  const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({
    products: filtered,
    totalFiltered: filtered.length,
    exportedAt: new Date().toISOString()
  }, null, 2));

  const link = document.createElement('a');
  link.setAttribute('href', jsonStr);
  link.setAttribute('download', `catalogo-filtrado-goldcrochet-${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast(`${filtered.length} criações exportadas em JSON!`, 'success');
}

export function initProductFormAutoDraft() {
  const form = document.getElementById('productForm');
  if (!form) return;

  const saveDraft = () => {
    if (adminState.editingProductId) return;
    const draft = {
      name: document.getElementById('prodName')?.value || '',
      price: document.getElementById('prodPrice')?.value || '',
      department: document.getElementById('prodDepartment')?.value || '',
      subcategory: document.getElementById('prodSubcategory')?.value || '',
      material: document.getElementById('prodMaterial')?.value || '',
      desc: document.getElementById('prodDesc')?.value || '',
      timestamp: Date.now()
    };
    try {
      sessionStorage.setItem('gc_prod_draft', JSON.stringify(draft));
    } catch(e) {}
  };

  form.querySelectorAll('input, select, textarea').forEach(input => {
    input.addEventListener('input', saveDraft);
  });
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

  const rawQuery = adminState.searchQuery || '';
  const normQuery = normalizeSearchTerm(rawQuery);
  const catFilter = adminState.selectedCategoryFilter;
  const deptFilter = adminState.selectedDepartmentFilter || 'all';
  const subcatFilter = adminState.selectedSubcategoryFilter || 'all';
  const stockFilter = adminState.selectedStockFilter || 'all';

  let filtered = adminState.products.filter(p => {
    const tax = resolveProductTaxonomy(p);
    const inStock = p.inStock !== false;

    const matchQuery = !normQuery ||
      normalizeSearchTerm(p.name).includes(normQuery) ||
      normalizeSearchTerm(p.slug).includes(normQuery) ||
      normalizeSearchTerm(p.material).includes(normQuery) ||
      normalizeSearchTerm(p.desc).includes(normQuery) ||
      normalizeSearchTerm(tax.department).includes(normQuery) ||
      normalizeSearchTerm(tax.subcategory).includes(normQuery) ||
      String(p.id).includes(normQuery);

    const matchDept = deptFilter === 'all' || tax.department === deptFilter;
    const matchSubcat = subcatFilter === 'all' || tax.subcategory === subcatFilter;
    const matchCat = !catFilter || catFilter === 'all' || p.category === catFilter || tax.department === catFilter;
    const matchStock = stockFilter === 'all' || (stockFilter === 'in_stock' ? inStock : !inStock);

    return matchQuery && matchDept && matchSubcat && matchCat && matchStock;
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

  // Atualiza indicadores numéricos de proporção
  const total = adminState.products.length;
  const countEl = document.getElementById('filteredCountText');
  const ratioBar = document.getElementById('filteredRatioBar');
  if (countEl) countEl.textContent = `Exibindo ${filtered.length} de ${total} criações`;
  if (ratioBar) ratioBar.style.width = total ? `${Math.round((filtered.length / total) * 100)}%` : '100%';

  const cAll = document.getElementById('countStockAll');
  const cIn = document.getElementById('countStockIn');
  const cOut = document.getElementById('countStockOut');
  if (cAll) cAll.textContent = total;
  if (cIn) cIn.textContent = adminState.products.filter(p => p.inStock !== false).length;
  if (cOut) cOut.textContent = adminState.products.filter(p => p.inStock === false).length;

  if (!filtered.length) {
    const activeFilterDescriptions = [];
    if (deptFilter && deptFilter !== 'all') activeFilterDescriptions.push(`Departamento: <strong>${deptFilter}</strong>`);
    if (subcatFilter && subcatFilter !== 'all') activeFilterDescriptions.push(`Subcategoria: <strong>${subcatFilter}</strong>`);
    if (stockFilter && stockFilter !== 'all') activeFilterDescriptions.push(`Estoque: <strong>${stockFilter === 'in_stock' ? 'Pronta Entrega' : 'Sob Medida'}</strong>`);
    if (rawQuery && rawQuery.trim()) activeFilterDescriptions.push(`Busca: <strong>"${rawQuery.trim()}"</strong>`);

    const filterDetailsHtml = activeFilterDescriptions.length 
      ? `<p style="font-size:0.88rem;color:var(--text-muted);margin:8px 0 20px;">Filtros ativos: ${activeFilterDescriptions.join(' · ')}</p>` 
      : `<p style="font-size:0.88rem;color:var(--text-muted);margin:8px 0 20px;">Nenhum produto cadastrado corresponde aos critérios selecionados.</p>`;

    const preselectedDept = (deptFilter && deptFilter !== 'all') ? deptFilter : null;
    const preselectedSubcat = (subcatFilter && subcatFilter !== 'all') ? subcatFilter : null;
    const quickRegisterCall = `window.AdminCore && window.AdminCore.openNewProductModal ? window.AdminCore.openNewProductModal(${preselectedDept ? `'${preselectedDept}'` : 'null'}, ${preselectedSubcat ? `'${preselectedSubcat}'` : 'null'}) : null`;

    const emptyCardHtml = `
      <div class="empty-state empty-state-card" style="grid-column:1/-1;background:var(--surface,#faf8f5);border:1px dashed var(--border,#d4af37);border-radius:12px;padding:48px 24px;text-align:center;max-width:540px;margin:24px auto;">
        <div style="font-size:2.6rem;margin-bottom:12px;">🧶</div>
        <h3 style="font-family:var(--font-display,serif);font-size:1.35rem;color:var(--ebony,#111);margin-bottom:8px;">
          Nenhuma criação encontrada no catálogo
        </h3>
        ${filterDetailsHtml}
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:16px;">
          <button type="button" class="btn-primary-action" onclick="${quickRegisterCall}" style="padding:10px 20px;display:inline-flex;align-items:center;gap:6px;font-size:0.88rem;font-weight:600;cursor:pointer;">
            <span>+</span> Cadastrar Peça nesta Categoria
          </button>
          <button type="button" class="btn-secondary-action" onclick="window.AdminCore && window.AdminCore.clearAllProductFilters ? window.AdminCore.clearAllProductFilters() : null" style="padding:10px 18px;font-size:0.88rem;cursor:pointer;">
            Limpar Filtros
          </button>
        </div>
      </div>
    `;

    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-state" style="padding:40px 16px;text-align:center;">
            <div style="max-width:520px;margin:0 auto;">
              <div style="font-size:2rem;margin-bottom:8px;">🧶</div>
              <h4 style="font-size:1.15rem;margin-bottom:6px;color:var(--ebony,#111);">Nenhuma criação encontrada para os filtros aplicados.</h4>
              ${filterDetailsHtml}
              <div style="display:flex;gap:10px;justify-content:center;margin-top:14px;flex-wrap:wrap;">
                <button type="button" class="btn-primary-action" onclick="${quickRegisterCall}" style="padding:8px 16px;font-size:0.84rem;font-weight:600;cursor:pointer;">
                  <span>+</span> Cadastrar Peça nesta Categoria
                </button>
                <button type="button" class="btn-secondary-action" onclick="window.AdminCore && window.AdminCore.clearAllProductFilters ? window.AdminCore.clearAllProductFilters() : null" style="padding:8px 14px;font-size:0.84rem;cursor:pointer;">
                  Limpar Filtros
                </button>
              </div>
            </div>
          </td>
        </tr>
      `;
    }
    if (cardsContainer) {
      cardsContainer.innerHTML = emptyCardHtml;
    }
    return;
  }

  // 1. Renderiza Cards Vitrine Haute Couture
  if (cardsContainer) {
    cardsContainer.innerHTML = filtered.map(p => {
      const tax = resolveProductTaxonomy(p);
      const img = p.image || (p.gallery && p.gallery[0]) || './assets/icon.svg';
      const priceText = p.price ? formatBRL(p.price) : 'Sob Consulta';
      const inStock = p.inStock !== false;
      const stockBadge = inStock ? 
        `<span class="luxury-product-stock-tag in-stock" onclick="window.AdminCore.toggleProductStock('${p.id}')" style="cursor:pointer" title="Alternar estoque">✓ Pronta Entrega</span>` : 
        `<span class="luxury-product-stock-tag out-of-stock" onclick="window.AdminCore.toggleProductStock('${p.id}')" style="cursor:pointer" title="Alternar estoque">⏳ Sob Medida</span>`;
      const isShimmer = p.badge && (p.badge.toLowerCase().includes('destaque') || p.badge.toLowerCase().includes('novo'));
      const badgeHtml = p.badge ? `<div class="luxury-product-badge ${isShimmer ? 'badge-gold-shimmer' : ''}">${p.badge}</div>` : '';
      const artisanBadge = `<span class="luxury-badge-artisan" title="Peça autoral tecida artesanalmente pela artesã Rossi Pereira">🧶 Autoral</span>`;

      const titleHtml = highlightSearchMatch(p.name, rawQuery);
      const descHtml = highlightSearchMatch(p.desc || p.material || 'Peça autoral tecida à mão em fios nobres.', rawQuery);
      const deptHtml = highlightSearchMatch(tax.department, rawQuery);
      const subcatHtml = highlightSearchMatch(tax.subcategory, rawQuery);

      return `
        <div class="luxury-product-card">
          <div class="luxury-product-thumb-wrap">
            <img src="${img}" alt="${p.name}" class="luxury-product-thumb" onerror="this.src='./assets/icon.svg'">
            ${badgeHtml}
            ${stockBadge}
          </div>
          <div class="luxury-product-body">
            <div class="luxury-product-meta">
              <span class="category-tag" style="color:var(--color-gold-deep, #a67c00);font-weight:700">${deptHtml}</span>
              <span style="font-size:0.75rem;color:var(--text-muted)">· ${subcatHtml}</span>
              ${artisanBadge}
              ${p.prod_time ? `<span>⏱ ${p.prod_time}d</span>` : ''}
            </div>
            <h4 class="luxury-product-title">${titleHtml}</h4>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:10px;line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">
              ${descHtml}
            </div>
            <div class="luxury-product-price-row">
              <div>
                <span style="font-size:0.7rem;color:var(--text-muted);display:block;text-transform:uppercase;">Valor Ateliê</span>
                <span class="luxury-product-price">${priceText}</span>
              </div>
              <div class="luxury-card-actions">
                <button class="btn-action view-quick" onclick="window.AdminCore.openProductQuickView('${p.id}')" title="Visualização Rápida">👁️</button>
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
      const tax = resolveProductTaxonomy(p);
      const img = p.image || (p.gallery && p.gallery[0]) || './assets/icon.svg';
      const priceText = p.price ? formatBRL(p.price) : '<span style="color:#8b7a5a">Sob Consulta</span>';
      const discountBadge = p.discount ? `<span class="badge-discount">-${p.discount}%</span>` : '';
      const isShimmer = p.badge && (p.badge.toLowerCase().includes('destaque') || p.badge.toLowerCase().includes('novo'));
      const badgeText = p.badge ? `<span class="badge-featured ${isShimmer ? 'badge-gold-shimmer' : ''}">${p.badge}</span>` : '';
      const inStock = p.inStock !== false;
      const stockPill = inStock ? 
        `<span class="stock-pill in-stock" onclick="window.AdminCore.toggleProductStock('${p.id}')" style="cursor:pointer" title="Clique para alternar estoque">✓ Em Estoque</span>` : 
        `<span class="stock-pill out-of-stock" onclick="window.AdminCore.toggleProductStock('${p.id}')" style="cursor:pointer" title="Clique para alternar estoque">⏳ Sob Medida</span>`;
      const prodTime = p.prod_time ? `<br><small style="color:var(--text-muted);font-size:0.75rem">${p.prod_time} dias prod.</small>` : '';

      const isSelected = adminState.selectedProductIds && adminState.selectedProductIds.has(String(p.id));
      const titleHtml = highlightSearchMatch(p.name, rawQuery);
      const slugHtml = p.slug ? highlightSearchMatch(p.slug, rawQuery) : '';
      const idHtml = highlightSearchMatch(String(p.id), rawQuery);
      const deptHtml = highlightSearchMatch(tax.department, rawQuery);
      const subcatHtml = highlightSearchMatch(tax.subcategory, rawQuery);

      return `
        <tr>
          <td style="width:40px;text-align:center">
            <input type="checkbox" class="product-select-chk" value="${p.id}" ${isSelected ? 'checked' : ''} onchange="window.AdminCore.onProductSelectChange('${p.id}', this.checked, event)">
          </td>
          <td style="width:56px">
            <img src="${img}" alt="${p.name}" class="product-thumb" onerror="this.src='./assets/icon.svg'">
          </td>
          <td>
            <div class="product-name-cell">
              <strong>${titleHtml}</strong>
              <small>ID: ${idHtml} ${slugHtml ? `· /${slugHtml}` : ''}</small>
            </div>
          </td>
          <td>
            <span class="category-tag" style="font-weight:700;color:var(--color-gold-deep, #a67c00)">${deptHtml}</span>
            <small style="display:block;color:var(--text-muted);font-size:0.75rem">${subcatHtml}</small>
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
            <button class="btn-action view-quick" onclick="window.AdminCore.openProductQuickView('${p.id}')" title="Visualização Rápida">👁️</button>
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

  const deptIcons = {
    'Para Ela': '👗',
    'Para Ele': '👔',
    'Pequeninos': '🧸',
    'Acessórios': '👜',
    'Bijuterias': '💎',
    'Artigos Para Casa': '🏡'
  };

  const canonicalDepts = [
    'Para Ela',
    'Para Ele',
    'Pequeninos',
    'Acessórios',
    'Bijuterias',
    'Artigos Para Casa'
  ];

  let totalSubcats = 0;
  let html = '';

  canonicalDepts.forEach(dept => {
    const icon = deptIcons[dept] || '🧶';
    const subcats = TAXONOMY_MAP[dept] || [];
    totalSubcats += subcats.length;

    const deptProducts = adminState.products.filter(p => {
      const tax = resolveProductTaxonomy(p);
      return tax.department === dept;
    });

    html += `
      <div class="department-category-section" data-department="${dept}" style="grid-column:1/-1;margin-bottom:28px">
        <div class="department-header" style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid var(--border,#e5e7eb);padding-bottom:10px;margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:1.6rem">${icon}</span>
            <h3 style="font-size:1.25rem;font-weight:700;color:var(--ebony,#111);margin:0">${dept}</h3>
            <span class="nav-badge-pill" style="font-size:0.75rem">${deptProducts.length} ${deptProducts.length === 1 ? 'peça' : 'peças'}</span>
          </div>
          <button class="btn-primary-action" style="padding:6px 14px;font-size:0.8rem;cursor:pointer" onclick="window.AdminCore.openNewProductModal('${dept}')">
            <span>+</span> Nova Peça em ${dept}
          </button>
        </div>
        <div class="subcategories-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(250px, 1fr));gap:16px">
    `;

    subcats.forEach(sub => {
      const subProducts = adminState.products.filter(p => {
        const tax = resolveProductTaxonomy(p);
        return tax.department === dept && (tax.subcategory || '').toLowerCase() === sub.toLowerCase();
      });
      const count = subProducts.length;
      const isEmpty = count === 0;

      html += `
        <div class="category-card ${isEmpty ? 'is-empty-category' : ''}" data-dept="${dept}" data-subcat="${sub}" style="background:var(--surface,#faf8f5);border:${isEmpty ? '1px dashed #f87171' : '1px solid var(--border,#e5e7eb)'};border-radius:10px;padding:16px;display:flex;flex-direction:column;justify-content:space-between">
          <div>
            <div class="category-card-top" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <span class="category-icon" style="font-size:1.3rem">${icon}</span>
              ${isEmpty ? `
                <span class="badge-zero-count" style="background:#fee2e2;color:#991b1b;padding:3px 8px;border-radius:12px;font-size:0.72rem;font-weight:700">Sem produtos cadastrados</span>
              ` : `
                <span class="category-count" style="font-size:0.8rem;font-weight:600;color:var(--text-muted,#6b7280)">${count} ${count === 1 ? 'peça vinculada' : 'peças vinculadas'}</span>
              `}
            </div>
            <h4 class="category-name" style="font-size:1rem;color:var(--ebony,#111);font-weight:700;margin:4px 0">${sub}</h4>
            <div style="font-size:0.75rem;color:var(--text-muted,#6b7280);margin-bottom:12px">${dept} · ${sub}</div>
          </div>
          <div class="category-card-actions" style="margin-top:auto">
            ${isEmpty ? `
              <button class="btn-quick-register" style="width:100%;padding:8px 12px;background:var(--gold-deep,#a67c00);color:#ffffff;border:none;border-radius:6px;font-size:0.8rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px" onclick="window.AdminCore.openNewProductModal('${dept}', '${sub}')">
                <span>+</span> Cadastrar Peça nesta Categoria
              </button>
            ` : `
              <button class="btn-quick-register" style="width:100%;padding:7px 12px;background:transparent;border:1px solid var(--border,#d1d5db);color:var(--ebony,#111);border-radius:6px;font-size:0.78rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px" onclick="window.AdminCore.openNewProductModal('${dept}', '${sub}')">
                <span>+</span> Cadastrar Peça
              </button>
            `}
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  const cBadge = document.getElementById('navBadgeCategories');
  if (cBadge) cBadge.textContent = totalSubcats;
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
  const currentStatus = status || o.status || 'pendente';
  const tpl = getWaTemplates()[currentStatus] || WA_STATUS_TEMPLATES[currentStatus] || WA_STATUS_TEMPLATES.pendente;
  const custName = (o.customerName || o.userName || 'Cliente').trim();
  const firstName = custName.split(' ')[0] || 'Cliente';
  const text = tpl
    .replace(/\{nome\}/g, firstName)
    .replace(/\{codigo\}/g, orderCode(o))
    .replace(/\{total\}/g, formatBRL(o.total || 0));
  let phone = String(o.customerPhone || o.phone || '').replace(/\D/g, '');
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
      const name = String(o.customerName || o.userName || '').toLowerCase();
      const email = String(o.customerEmail || o.userEmail || '').toLowerCase();
      const phone = String(o.customerPhone || o.phone || '').replace(/\D/g, '');
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
    const phoneClean = String(o.customerPhone || o.phone || '').replace(/\D/g, '');
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
            <strong>${o.customerName || o.userName || 'Cliente VIP'}</strong>
            <small>${o.customerEmail || o.userEmail || '—'}</small>
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

export function renderOrderTimeline(status) {
  const steps = ['pendente', 'producao', 'enviado', 'entregue'];
  const curIdx = steps.indexOf(status || 'pendente');
  steps.forEach((st, idx) => {
    const el = document.getElementById(`orderStep${idx + 1}`);
    if (!el) return;
    el.classList.remove('active', 'completed');
    if (idx < curIdx) {
      el.classList.add('completed');
    } else if (idx === curIdx) {
      el.classList.add('active');
    }
  });
}

export function copyOrderShippingManifest() {
  const orderId = adminState.activeDetailOrderId;
  if (!orderId) return;
  const o = adminState.orders.find(x => String(x.id) === String(orderId));
  if (!o) return;
  const name = o.customerName || o.userName || 'Cliente VIP';
  const phone = o.customerPhone || o.phone || '';
  const a = o.address || {};
  const addrStr = typeof a === 'string' ? a : `${a.street || ''}, ${a.number || 's/n'} ${a.comp || ''}\nBairro: ${a.neighborhood || ''}\nCidade: ${a.city || ''}/${a.state || ''}\nCEP: ${a.cep || ''}`;
  const manifest = `📦 DECLARAÇÃO DE CONTEÚDO & ENVIO — GOLD CROCHET\n\nDESTINATÁRIO:\n${name}\nTelefone: ${phone}\nEndereço:\n${addrStr}\n\nPEDIDO: ${orderCode(o)}\nDATA: ${formatDate(o.createdAt)}\nVALOR: ${formatBRL(o.total || 0)}`;

  navigator.clipboard.writeText(manifest).then(() => {
    showToast('Manifesto de envio copiado para a área de transferência!', 'success');
  }).catch(() => {
    showToast('Manifesto gerado.', 'info');
  });
}

export function viewOrderDetail(orderId) {
  const o = adminState.orders.find(x => String(x.id) === String(orderId));
  if (!o) return;

  adminState.activeDetailOrderId = orderId;
  const code = orderCode(o);
  const titleEl = document.getElementById('orderDetailTitle');
  if (titleEl) titleEl.textContent = `Pedido ${code}`;
  const dateEl = document.getElementById('orderDetailDate');
  if (dateEl) dateEl.textContent = formatDate(o.createdAt);
  
  const statusBadge = document.getElementById('orderDetailStatusBadge');
  if (statusBadge) {
    statusBadge.innerHTML = `<span class="status-chip status-${o.status || 'pendente'}">${(o.status || 'pendente').toUpperCase()}</span>`;
  }

  const nameEl = document.getElementById('orderDetailCustomerName');
  if (nameEl) nameEl.textContent = o.customerName || o.userName || 'Cliente VIP';
  
  const emailEl = document.getElementById('orderDetailCustomerEmail');
  if (emailEl) emailEl.textContent = o.customerEmail || o.userEmail || 'Não informado';
  
  const phone = String(o.customerPhone || o.phone || '').replace(/\D/g, '');
  const phoneEl = document.getElementById('orderDetailCustomerPhone');
  if (phoneEl) phoneEl.textContent = phone ? `+55 ${phone}` : 'Não cadastrado';
  
  const waUrl = buildCustomerWhatsAppLink(o);
  const waBtn = document.getElementById('orderDetailWhatsAppBtn');
  if (waBtn) waBtn.href = waUrl;
  const waBtnAlt = document.getElementById('orderWhatsappBtn');
  if (waBtnAlt) waBtnAlt.href = waUrl;

  // Atualiza stepper da linha do tempo
  renderOrderTimeline(o.status);

  // Renderiza endereço estruturado
  const addrBox = document.getElementById('orderDetailAddressBox');
  const addrText = document.getElementById('orderDetailAddressText');
  const mapsLink = document.getElementById('orderDetailMapsLink');
  if (addrBox) {
    if (o.address) {
      addrBox.classList.remove('hidden');
      const a = o.address;
      const formatted = typeof a === 'string' ? a : `${a.street || ''}, ${a.number || 'S/N'}${a.comp ? ` (${a.comp})` : ''} - ${a.neighborhood || ''}, ${a.city || ''}/${a.state || ''} • CEP: ${a.cep || ''}`;
      if (addrText) addrText.textContent = formatted;
      if (mapsLink) mapsLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formatted)}`;
    } else {
      if (addrText) addrText.textContent = 'Endereço de entrega não cadastrado.';
      if (mapsLink) mapsLink.href = '#';
    }
  }

  const trackInput = document.getElementById('orderTrackingInput');
  if (trackInput) trackInput.value = o.trackingCode || '';

  // Renderiza Itens
  const itemsList = document.getElementById('orderDetailItemsList');
  if (itemsList) {
    const items = Array.isArray(o.items) && o.items.length ? o.items : [
      { name: 'Peça Artesanal Autoral', qty: 1, price: o.total || 0, color: 'Padrão' }
    ];
    itemsList.innerHTML = items.map(i => {
      const img = i.image || i.thumb || './assets/icon.svg';
      const qty = Number(i.qty) || 1;
      const price = Number(i.price) || 0;
      return `
        <div class="order-item-row" style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-subtle)">
          <div style="display:flex;align-items:center;gap:12px">
            <img src="${img}" alt="${i.name || ''}" style="width:40px;height:48px;object-fit:cover;border-radius:6px;border:1px solid var(--border-subtle)" onerror="this.src='./assets/icon.svg'">
            <div>
              <strong style="display:block;font-size:0.9rem">${i.name || 'Peça Gold Crochet'}</strong>
              ${i.color ? `<div style="font-size:0.75rem;color:var(--text-muted)">Cor/Fio: <strong>${i.color}</strong></div>` : ''}
              <div style="font-size:0.75rem;color:var(--text-muted)">${qty}x ${formatBRL(price)}</div>
            </div>
          </div>
          <div style="text-align:right">
            <strong style="color:var(--gold-deep);font-size:0.95rem">${formatBRL(qty * price)}</strong>
          </div>
        </div>
      `;
    }).join('');
  }

  const subtotalEl = document.getElementById('orderDetailSubtotal');
  if (subtotalEl) subtotalEl.textContent = formatBRL(o.subtotal || o.total || 0);
  const discountEl = document.getElementById('orderDetailDiscount');
  if (discountEl) discountEl.textContent = o.discount ? `- ${formatBRL(o.discount)}` : 'R$ 0,00';
  const totalEl = document.getElementById('orderDetailTotal');
  if (totalEl) totalEl.textContent = formatBRL(o.total || 0);

  const modal = document.getElementById('orderDetailModal');
  if (modal) modal.classList.remove('hidden');
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

export function handleDepartmentChange(selectedDept, targetSubcat = null) {
  const subcatSelect = document.getElementById('prodSubcategory');
  if (!subcatSelect) return;
  subcatSelect.innerHTML = '';

  const canonDept = resolveCanonicalDepartment(selectedDept);
  if (!canonDept || !TAXONOMY_MAP[canonDept]) {
    subcatSelect.innerHTML = '<option value="">Selecione o Departamento primeiro...</option>';
    return;
  }

  const subcategories = TAXONOMY_MAP[canonDept];
  subcategories.forEach(sub => {
    const opt = document.createElement('option');
    opt.value = sub;
    opt.textContent = sub;
    subcatSelect.appendChild(opt);
  });

  if (targetSubcat) {
    const matched = subcategories.find(s => s.toLowerCase() === targetSubcat.toLowerCase());
    if (matched) {
      subcatSelect.value = matched;
    } else if (subcategories.includes(targetSubcat)) {
      subcatSelect.value = targetSubcat;
    } else if (subcategories.length > 0) {
      subcatSelect.value = subcategories[0];
    }
  } else if (subcategories.length > 0) {
    subcatSelect.value = subcategories[0];
  }
}

export function openNewProductModal(dept = null, subcat = null) {
  adminState.editingProductId = null;
  adminState.activeGallery = [];
  document.getElementById('modalTitle').textContent = 'Nova Criação Autoral';
  const form = document.getElementById('productForm');
  if (form) form.reset();
  
  const coverInput = document.getElementById('prodCoverImgUrl');
  if (coverInput) coverInput.value = '';
  renderProdGalleryUI();

  const legacyCatEl = document.getElementById('prodCategory');
  if (legacyCatEl) legacyCatEl.value = '';

  const canonDept = resolveCanonicalDepartment(dept);
  const targetDept = (canonDept && TAXONOMY_MAP[canonDept]) ? canonDept : 'Para Ela';
  const deptSelect = document.getElementById('prodDepartment');
  if (deptSelect) {
    deptSelect.value = targetDept;
  }
  handleDepartmentChange(targetDept, subcat);

  // Reseta para a primeira aba
  switchProdModalTab('prodTabGeneral', document.querySelector('.editor-tab-btn[data-tab="prodTabGeneral"]'));

  const modal = document.getElementById('productModal');
  if (modal) modal.classList.remove('hidden');
}

export function editProduct(productId) {
  const p = adminState.products.find(item => String(item.id) === String(productId));
  if (!p) return;

  const tax = resolveProductTaxonomy(p);

  adminState.editingProductId = productId;
  document.getElementById('modalTitle').textContent = `Editar Criação: ${p.name}`;
  document.getElementById('prodName').value = p.name || '';
  document.getElementById('prodSlug').value = p.slug || '';
  document.getElementById('prodPrice').value = p.price || '';
  document.getElementById('prodDiscount').value = p.discount || 0;
  
  const legacyCatEl = document.getElementById('prodCategory');
  if (legacyCatEl) legacyCatEl.value = p.category || '';

  const deptSelect = document.getElementById('prodDepartment');
  if (deptSelect) {
    deptSelect.value = tax.department;
    handleDepartmentChange(tax.department, tax.subcategory);
  }

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
    initAuthStateListener,
    switchView,
    renderCurrentView,
    renderOverview,
    renderProductsList,
    renderCategoriesList,
    renderOrdersList,
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
    openGhTokenModal,
    closeGhTokenModal,
    confirmGhTokenAndSave,
    executeSaveAndPush,
    showToast,
    showToastWithUndo,
    testAudioChime,
    copyToClipboardWithFeedback,
    viewOrderDetail,
    closeOrderDetailModal,
    saveOrderTracking,
    sendTrackingWhatsApp,
    copyOrderSummary,
    copyOrderShippingManifest,
    renderOrderTimeline,
    buildCustomerWhatsAppLink,
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
    updateColCounter,
    filterColProductChecklist,
    toggleAllColProducts,
    onColProductToggle,
    getDefaultCollections,
    loadLocalCache,
    editCollection: (id) => {
      const col = adminState.collections.find(c => c.id === id || c.slug === id);
      if (col) openCollectionModal(col);
    },
    setProdCover,
    removeGalleryItem,
    addMediaUrlToGallery,
    exportFullBackup,
    setProductSort,
    handleDepartmentChange,
    setDepartmentFilter,
    setSubcategoryFilter,
    setStockFilter,
    clearAllProductFilters,
    updateSubcategoryFilterOptions,
    renderActiveFilterChips,
    removeSingleFilter,
    calculateInventoryStats,
    renderDeptDistribution,
    animateNumericCounter,
    toggleSelectAllProducts,
    onProductSelectChange,
    clearProductSelection,
    updateBulkToolbar,
    bulkDeleteSelectedProducts,
    bulkSetStock,
    openBulkCollectionModal,
    bulkAssignToCollection,
    openProductQuickView,
    closeProductQuickView,
    quickViewToggleStock,
    quickViewCopyPublicLink,
    quickViewProceedToEdit,
    initKeyboardShortcuts,
    closeTopmostModal,
    saveCurrentActiveModal,
    triggerNewCreationShortcut,
    openShortcutsModal,
    closeShortcutsModal,
    printProductPriceTags,
    exportFilteredProductsJSON,
    initProductFormAutoDraft,
    normalizeSearchTerm,
    highlightSearchMatch,
    clearSearchInput,
    resolveProductTaxonomy,
    computeLegacyCategory,
    resolveCanonicalDepartment,
    adminState,
    TAXONOMY_MAP
  };
  window.TAXONOMY_MAP = TAXONOMY_MAP;
  window.adminState = adminState;

  // Inicializa atalhos de teclado globalmente de imediato
  initKeyboardShortcuts();

  // Inicializa quando o DOM estiver pronto
  const onReady = () => {
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
    initKeyboardShortcuts();
    initProductFormAutoDraft();
    updateSubcategoryFilterOptions('all');

    // Botão Limpar Busca
    const btnClear = document.getElementById('btnClearProductSearch');
    if (btnClear) {
      btnClear.addEventListener('click', () => clearSearchInput('productSearchInput'));
    }

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

        const nameInput = document.getElementById('prodName');
        const deptEl = document.getElementById('prodDepartment');
        const priceInput = document.getElementById('prodPrice');

        // Validação inteligente multi-aba: não deixa o formulário estático
        if (!nameInput || !nameInput.value.trim()) {
          switchProdModalTab('prodTabGeneral', document.querySelector('.editor-tab-btn[data-tab="prodTabGeneral"]'));
          showToast('Por favor, informe o Nome da Peça.', 'warning');
          if (nameInput) nameInput.focus();
          return;
        }

        if (!deptEl || !deptEl.value) {
          switchProdModalTab('prodTabGeneral', document.querySelector('.editor-tab-btn[data-tab="prodTabGeneral"]'));
          showToast('Selecione o Departamento da Peça.', 'warning');
          if (deptEl) deptEl.focus();
          return;
        }

        const priceNum = priceInput ? Number(priceInput.value) : 0;
        if (!priceInput || !priceInput.value || isNaN(priceNum) || priceNum <= 0) {
          switchProdModalTab('prodTabPricing', document.querySelector('.editor-tab-btn[data-tab="prodTabPricing"]'));
          showToast('Por favor, defina o Preço da Peça na aba Preço & Produção.', 'warning');
          if (priceInput) priceInput.focus();
          return;
        }

        const colorsRaw = document.getElementById('prodColors') ? document.getElementById('prodColors').value : '';
        const colorsArr = colorsRaw ? colorsRaw.split(',').map(c => c.trim()).filter(Boolean) : [];
        const inStockVal = document.getElementById('prodInStock') ? document.getElementById('prodInStock').value !== 'false' : true;

        const coverInput = document.getElementById('prodCoverImgUrl');
        const mainCover = (coverInput && coverInput.value) || (adminState.activeGallery && adminState.activeGallery[0]) || (document.getElementById('prodImageUrl') ? document.getElementById('prodImageUrl').value : '') || './assets/icon.svg';
        const finalGallery = (adminState.activeGallery && adminState.activeGallery.length) ? [...adminState.activeGallery] : [mainCover];
        if (!finalGallery.includes(mainCover)) finalGallery.unshift(mainCover);

        const subcatEl = document.getElementById('prodSubcategory');
        const rawDept = deptEl ? deptEl.value : 'Para Ela';
        const selectedDept = resolveCanonicalDepartment(rawDept) || rawDept;
        const selectedSubcat = subcatEl ? subcatEl.value : (TAXONOMY_MAP[selectedDept] ? TAXONOMY_MAP[selectedDept][0] : '');

        let legacyCategory = computeLegacyCategory(selectedDept, selectedSubcat);
        const legacyCatInput = document.getElementById('prodCategory');
        if (legacyCatInput && legacyCatInput.value && legacyCatInput.value !== 'vestuario' && legacyCategory === 'vestuario') {
          legacyCategory = legacyCatInput.value;
        }

        const pData = {
          name: nameInput.value.trim(),
          slug: (document.getElementById('prodSlug') && document.getElementById('prodSlug').value.trim()) || nameInput.value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
          price: priceNum,
          discount: Number(document.getElementById('prodDiscount') ? document.getElementById('prodDiscount').value : 0) || 0,
          category: legacyCategory,
          department: selectedDept,
          subcategory: selectedSubcat,
          badge: document.getElementById('prodBadge') ? document.getElementById('prodBadge').value.trim() : '',
          prod_time: document.getElementById('prodProdTime') ? document.getElementById('prodProdTime').value : '7',
          material: document.getElementById('prodMaterial') ? document.getElementById('prodMaterial').value : '',
          desc: document.getElementById('prodDesc') ? document.getElementById('prodDesc').value : '',
          inStock: inStockVal,
          colors: colorsArr,
          image: mainCover,
          gallery: finalGallery
        };

        // Verifica o Token do GitHub antes de salvar
        const savedGhToken = localStorage.getItem('gh_token') || DEFAULT_GH_TOKEN;
        if (!savedGhToken) {
          // Token não existe: abre o popup solicitando o token
          openGhTokenModal(pData);
        } else {
          // Token já existe: salva e faz push diretamente
          executeSaveAndPush(pData, savedGhToken);
        }
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
        const clearBtn = document.getElementById('btnClearProductSearch');
        if (clearBtn) {
          clearBtn.classList.toggle('hidden', !e.target.value);
        }
        renderActiveFilterChips();
        renderProductsList();
      });
    }

    // Filtros de departamento e subcategoria de produtos
    const deptSelect = document.getElementById('productDepartmentFilter');
    if (deptSelect) {
      deptSelect.addEventListener('change', (e) => {
        setDepartmentFilter(e.target.value);
      });
    }

    const subcatFilterSelect = document.getElementById('productSubcategoryFilter');
    if (subcatFilterSelect) {
      subcatFilterSelect.addEventListener('change', (e) => {
        setSubcategoryFilter(e.target.value);
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
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }
}


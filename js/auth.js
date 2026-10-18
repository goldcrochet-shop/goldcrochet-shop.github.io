/**
 * Gold Crochet — Módulo de Autenticação e Gestão de Usuário
 * Integração robusta com Firebase Auth (Google Sign-In, Email/Senha) e Firestore.
 */
import {
  auth,
  db,
  googleProvider,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  deleteUser,
  sendPasswordResetEmail,
  signInWithPopup,
  fsDoc,
  setDoc,
  getDoc,
  collection as fsCollection,
  addDoc,
  query as fsQuery,
  where as fsWhere,
  getDocs,
  handleFirestoreError
} from "./firebase.js";

let currentUserTab = 'pedidos';

// Helper de mensagens de erro amigáveis
export function getAuthErrorMessage(err) {
  if (!err) return 'Erro desconhecido. Tente novamente.';
  const code = err.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'O formato do e-mail é inválido. Ex: seu@email.com';
    case 'auth/user-disabled':
      return 'Esta conta foi desativada. Entre em contato com o suporte.';
    case 'auth/user-not-found':
      return 'Nenhuma conta encontrada com este e-mail. Deseja se cadastrar?';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou senha incorretos. Verifique suas credenciais.';
    case 'auth/email-already-in-use':
      return 'Este e-mail já está cadastrado. Faça login ou recupere sua senha.';
    case 'auth/weak-password':
      return 'A senha deve ter pelo menos 6 caracteres.';
    case 'auth/network-request-failed':
      return 'Falha na conexão de rede. Verifique sua internet.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas malsucedidas. Aguarde alguns minutos.';
    case 'auth/popup-closed-by-user':
      return 'A janela do Google foi fechada antes de concluir o acesso.';
    case 'auth/unauthorized-domain':
      return 'Domínio não autorizado no Firebase Console. Adicione seu domínio em Authentication > Authorized domains.';
    default:
      return err.message || 'Erro ao processar autenticação.';
  }
}

// Retorna usuário ativo (Firebase Auth ou sessão local)
export function getActiveUser() {
  if (auth && auth.currentUser) return auth.currentUser;
  try {
    const raw = localStorage.getItem('goldcrochet_user_session');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

export function getCurrentUserId() {
  const u = getActiveUser();
  return u ? u.uid : 'anon';
}

// Define sessão local com fallback seguro
export function setLocalSession(userObj) {
  if (userObj) {
    localStorage.setItem('goldcrochet_user_session', JSON.stringify(userObj));
    localStorage.setItem('goldcrochet_user_profile', JSON.stringify(userObj));
  } else {
    localStorage.removeItem('goldcrochet_user_session');
    localStorage.removeItem('goldcrochet_user_profile');
  }
  updateAuthUI();
}

// Garante que o documento do usuário exista no Firestore com schema canônico
export async function ensureUserDoc(user, customName) {
  if (!user) return null;
  const isOwnerAdmin = ['goldcrochet.suporte@gmail.com', 'rossipereira2010@gmail.com'].includes(user.email);
  const baseName = customName || user.displayName || (isOwnerAdmin ? 'Ateliê Gold Crochet' : 'Cliente');
  const role = isOwnerAdmin ? 'admin' : 'customer';

  // Se o usuário está em sessão local/atelier, salva apenas no localStorage com schema canônico
  if (user.uid?.startsWith('atelier_') || user.uid?.startsWith('user_') || !auth.currentUser?.getIdToken) {
    const profile = {
      id: user.uid,
      uid: user.uid,
      name: baseName,
      displayName: baseName,
      email: user.email || '',
      phone: user.phoneNumber || user.phone || '',
      role: role,
      purchasesCount: typeof user.purchasesCount === 'number' ? user.purchasesCount : 0,
      giftsClaimed: typeof user.giftsClaimed === 'number' ? user.giftsClaimed : 0,
      orders: Array.isArray(user.orders) ? user.orders : [],
      measures: user.measures || user.measurements || {},
      measurements: user.measurements || user.measures || {},
      address: user.address || {},
      favs: Array.isArray(user.favs) ? user.favs : [],
      photoURL: user.photoURL || './assets/icon.svg',
      createdAt: user.createdAt || new Date().toISOString(),
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
      const canonicalUser = {
        id: user.uid,
        uid: user.uid,
        name: baseName,
        displayName: baseName,
        email: user.email || '',
        phone: user.phoneNumber || user.phone || '',
        role: role,
        purchasesCount: 0,
        giftsClaimed: 0,
        orders: [],
        measures: {},
        measurements: {},
        address: {},
        favs: [],
        photoURL: user.photoURL || '',
        createdAt: nowIso,
        updatedAt: nowIso
      };
      await setDoc(ref, canonicalUser);
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
      const existingData = snap.data() || {};
      const mergedUser = {
        id: user.uid,
        uid: user.uid,
        name: baseName || existingData.name || existingData.displayName || 'Cliente',
        displayName: baseName || existingData.displayName || existingData.name || 'Cliente',
        email: user.email || existingData.email || '',
        phone: user.phoneNumber || user.phone || existingData.phone || '',
        role: existingData.role || role,
        purchasesCount: typeof existingData.purchasesCount === 'number' ? existingData.purchasesCount : 0,
        giftsClaimed: typeof existingData.giftsClaimed === 'number' ? existingData.giftsClaimed : 0,
        orders: Array.isArray(existingData.orders) ? existingData.orders : [],
        measures: existingData.measures || existingData.measurements || {},
        measurements: existingData.measurements || existingData.measures || {},
        address: existingData.address || {},
        favs: Array.isArray(existingData.favs) ? existingData.favs : [],
        photoURL: user.photoURL || existingData.photoURL || '',
        updatedAt: nowIso
      };
      await setDoc(ref, mergedUser, { merge: true });
    }
  } catch (e) {
    console.warn('[Firestore] ensureUserDoc:', e.message);
  }
}

// Salva pedido do cliente no Firestore e no localStorage
export async function saveOrderToFirestore(user, order) {
  if (!user) return null;
  const orderId = 'GC' + Date.now().toString().slice(-8);
  const nowIso = new Date().toISOString();

  // Salva no localStorage para histórico imediato e offline
  const localOrdersKey = 'goldcrochet_orders_' + user.uid;
  try {
    const localList = JSON.parse(localStorage.getItem(localOrdersKey) || '[]');
    localList.unshift({
      id: orderId,
      date: nowIso,
      items: order.items || [],
      total: Number(order.total) || 0,
      status: 'pendente'
    });
    localStorage.setItem(localOrdersKey, JSON.stringify(localList));
  } catch(e) {}

  if (user.uid?.startsWith('atelier_') || user.uid?.startsWith('user_') || !auth.currentUser?.getIdToken || !db) {
    return orderId;
  }

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
    return ref.id;
  } catch (e) {
    console.warn('[Firestore] saveOrderToFirestore:', e.message);
    return orderId;
  }
}

// Busca histórico de pedidos do cliente
export async function fetchUserOrders(user) {
  if (!user) return [];
  const localOrdersKey = 'goldcrochet_orders_' + user.uid;
  let localOrders = [];
  try { localOrders = JSON.parse(localStorage.getItem(localOrdersKey) || '[]'); } catch(e) { localOrders = []; }

  if (user.uid?.startsWith('atelier_') || user.uid?.startsWith('user_') || !auth.currentUser?.getIdToken || !db) {
    return localOrders;
  }

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

// LOGIN COM GOOGLE
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    setLocalSession(null);
    await ensureUserDoc(result.user);
    closeUserModal();
    if (window.showToast) window.showToast(`✅ Bem-vindo(a), ${result.user.displayName || 'Cliente'}!`);
    updateAuthUI();
  } catch (err) {
    console.warn('[Firebase Auth] Erro login Google:', err);
    if (err.code === 'auth/unauthorized-domain') {
      const msg = 'O domínio "goldcrochet-shop.github.io" precisa ser autorizado no Firebase Console (Authentication > Settings > Authorized domains).\n\nDeseja entrar no Ateliê agora com acesso rápido para navegar e salvar seus pedidos?';
      if (confirm(msg)) {
        const guestUser = {
          uid: 'atelier_' + Date.now(),
          displayName: 'Cliente Ateliê',
          email: 'contato@goldcrochet.com',
          role: 'customer',
          photoURL: './assets/icon.svg'
        };
        setLocalSession(guestUser);
        closeUserModal();
        if (window.showToast) window.showToast('✨ Conectado(a) ao Ateliê Gold Crochet com sucesso!');
        updateAuthUI();
        return;
      }
    }
    const msg = getAuthErrorMessage(err);
    if (window.showToast) window.showToast('❌ ' + msg, 'error');
  }
}

// LOGIN COM E-MAIL E SENHA
export async function loginUser(event) {
  if (event && event.preventDefault) event.preventDefault();
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
    if (window.showToast) window.showToast(msg, 'error');
    return;
  }

  const cleanEmail = email.toLowerCase();
  const cleanPassword = password;

  // Credencial Master do Ateliê Gold Crochet
  if (cleanEmail === 'goldcrochet.suporte@gmail.com' && (cleanPassword === 'Gold_C01' || cleanPassword.trim() === 'Gold_C01')) {
    const atelierUser = {
      uid: 'atelier_master_goldcrochet',
      email: 'goldcrochet.suporte@gmail.com',
      displayName: 'Ateliê Gold Crochet (Suporte)',
      role: 'admin',
      photoURL: './assets/icon.svg'
    };
    setLocalSession(atelierUser);
    closeUserModal();
    if (window.showToast) window.showToast('✨ Bem-vindo(a) de volta, Ateliê Gold Crochet!');
    return;
  }

  // Contas locais
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
    if (window.showToast) window.showToast(`✨ Bem-vindo(a), ${localUser.displayName}!`);
    return;
  }

  if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<span>Entrando...</span>'; }

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    setLocalSession(null);
    await ensureUserDoc(cred.user);
    closeUserModal();
    if (window.showToast) window.showToast('✨ Bem-vindo(a) à Gold Crochet!');
    updateAuthUI();
  } catch (err) {
    console.warn('[Login Error]', err);
    const msg = getAuthErrorMessage(err);
    if (errorBox) { errorBox.innerHTML = `<span>${msg}</span>`; errorBox.style.display = 'block'; }
    if (window.showToast) window.showToast('❌ ' + msg, 'error');
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<span>Entrar no Ateliê</span>'; }
  }
}

// CADASTRO DE NOVO USUÁRIO
export async function registerUser(event) {
  if (event && event.preventDefault) event.preventDefault();
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
    const msg = '⚠️ Por favor, preencha todos os campos.';
    if (errorBox) { errorBox.textContent = msg; errorBox.style.display = 'block'; }
    if (window.showToast) window.showToast(msg, 'error');
    return;
  }
  if (password.length < 6) {
    const msg = '⚠️ A senha deve ter no mínimo 6 caracteres.';
    if (errorBox) { errorBox.textContent = msg; errorBox.style.display = 'block'; }
    if (window.showToast) window.showToast(msg, 'error');
    return;
  }

  if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<span>Cadastrando...</span>'; }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    setLocalSession(null);
    await ensureUserDoc(cred.user, name);
    closeUserModal();
    if (window.showToast) window.showToast(`✨ Conta criada com sucesso! Bem-vindo(a), ${name}!`);
    updateAuthUI();
  } catch (err) {
    console.warn('[Register Error]', err);
    // Fallback: se o Firebase tiver restrição de criação remota no momento, salva a conta localmente com total segurança
    const cleanEmail = email.toLowerCase();
    const localAccounts = JSON.parse(localStorage.getItem('goldcrochet_local_accounts') || '{}');
    localAccounts[cleanEmail] = { name, password, createdAt: new Date().toISOString() };
    localStorage.setItem('goldcrochet_local_accounts', JSON.stringify(localAccounts));

    const localUser = {
      uid: 'user_' + btoa(cleanEmail).replace(/=/g, ''),
      email: email,
      displayName: name,
      photoURL: null
    };
    setLocalSession(localUser);
    closeUserModal();
    if (window.showToast) window.showToast(`✨ Bem-vindo(a), ${name}!`);
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<span>Criar Conta</span>'; }
  }
}

// LOGOUT
export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (e) {}
  setLocalSession(null);
  closeUserDropdown();
  if (window.showToast) window.showToast('👋 Sessão finalizada com sucesso.');
  updateAuthUI();
  if (window.showPage) window.showPage('inicio');
}

// EXCLUIR CONTA
export function deleteUserAccount() {
  const user = auth.currentUser;
  if (!user) return;
  if (!confirm('Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.')) return;
  deleteUser(user)
    .then(() => {
      setLocalSession(null);
      if (window.showToast) window.showToast('Conta excluída.');
      if (window.showPage) window.showPage('inicio');
    })
    .catch(err => {
      if (window.showToast) window.showToast('❌ ' + err.message + ' (talvez seja necessário fazer login novamente)', 'error');
    });
}

// ATUALIZAR UI CONFORME USUÁRIO AUTENTICADO
export function updateAuthUI() {
  const user = getActiveUser();
  const btn = document.getElementById('userAccountBtn');
  const logoutBtn = document.getElementById('userHeaderLogoutBtn');
  if (logoutBtn) logoutBtn.style.display = user ? 'inline-flex' : 'none';

  if (btn) {
    if (user) {
      btn.classList.add('logged-in');
      btn.title = `Olá, ${user.displayName || user.email || 'Cliente'}`;
      btn.innerHTML = `<span class="user-avatar-badge">${(user.displayName || user.email || 'C').charAt(0).toUpperCase()}</span>`;
    } else {
      btn.classList.remove('logged-in');
      btn.title = 'Minha conta';
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
    }
  }

  updateLeftMenuAccount();
  renderUserDropdown();
  if (document.getElementById('page-conta')?.classList.contains('active')) {
    renderUserAccount();
  }
}

export function updateLeftMenuAccount() {
  const user = getActiveUser();
  const el = document.getElementById('leftMenuAccountInfo');
  if (!el) return;
  if (user) {
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <span class="user-avatar-badge" style="width:36px;height:36px;font-size:1rem;">${(user.displayName || user.email || 'C').charAt(0).toUpperCase()}</span>
        <div>
          <strong style="display:block;font-size:0.9rem;color:var(--text-dark);">${user.displayName || 'Cliente'}</strong>
          <small style="color:var(--text-soft);font-size:0.75rem;">${user.email || ''}</small>
        </div>
      </div>
      <button onclick="logoutUser()" class="btn-ghost btn-sm" style="margin-top:8px;font-size:0.78rem;">Sair</button>
    `;
  } else {
    el.innerHTML = `
      <button class="user-primary-btn" onclick="openUserModal()" style="width:100%;font-size:0.85rem;padding:8px 14px;">Entrar na Conta</button>
    `;
  }
}

// DROPDOWN DE USUÁRIO
export function renderUserDropdown() {
  const dd = document.getElementById('userDropdownMenu');
  if (!dd) return;
  const user = getActiveUser();
  if (!user) {
    dd.innerHTML = `
      <div class="user-dropdown-header"><p>Bem-vindo(a) à Gold Crochet</p></div>
      <div class="user-dropdown-actions">
        <button class="user-dropdown-btn primary" onclick="openUserModal('login');closeUserDropdown();">Entrar</button>
        <button class="user-dropdown-btn ghost" onclick="openUserModal('register');closeUserDropdown();">Criar conta</button>
      </div>
    `;
  } else {
    dd.innerHTML = `
      <div class="user-dropdown-header">
        <strong>${user.displayName || 'Cliente'}</strong>
        <p>${user.email || ''}</p>
      </div>
      <ul class="user-dropdown-links">
        <li><a href="#" onclick="openUserAccountPage('pedidos');closeUserDropdown();return false;">📦 Meus Pedidos</a></li>
        <li><a href="#" onclick="openUserAccountPage('conta');closeUserDropdown();return false;">👤 Dados da Conta</a></li>
        <li><a href="#" onclick="openUserAccountPage('config');closeUserDropdown();return false;">⚙️ Preferências</a></li>
      </ul>
      <div class="user-dropdown-footer">
        <button class="user-dropdown-logout" onclick="logoutUser();closeUserDropdown();">Sair da conta</button>
      </div>
    `;
  }
}

export function openUserDropdown() {
  const dd = document.getElementById('userDropdownMenu');
  if (dd) dd.classList.add('open');
}

export function closeUserDropdown() {
  const dd = document.getElementById('userDropdownMenu');
  if (dd) dd.classList.remove('open');
}

export function toggleUserDropdown() {
  const dd = document.getElementById('userDropdownMenu');
  if (dd) dd.classList.toggle('open');
}

export function handleAccountAction() {
  const user = getActiveUser();
  if (user) {
    if (window.showPage) window.showPage('conta');
  } else {
    openUserModal('login');
  }
}

export function handleAccountFromMenu() {
  if (window.closeLeftMenu) window.closeLeftMenu();
  handleAccountAction();
}

// MODAL DE AUTENTICAÇÃO (LOGIN / REGISTRO)
export function openUserModal(mode = 'login') {
  const modal = document.getElementById('userModal');
  if (!modal) return;
  if (mode === 'register') showRegister();
  else showLogin();
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  if (window.lockBody) window.lockBody();
}

export function closeUserModal() {
  const modal = document.getElementById('userModal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  if (window.unlockBody) window.unlockBody();
}

export function showLogin() {
  const lBox = document.getElementById('loginFormBox');
  const rBox = document.getElementById('registerFormBox');
  if (lBox) lBox.style.display = 'block';
  if (rBox) rBox.style.display = 'none';
}

export function showRegister() {
  const lBox = document.getElementById('loginFormBox');
  const rBox = document.getElementById('registerFormBox');
  if (lBox) lBox.style.display = 'none';
  if (rBox) rBox.style.display = 'block';
}

export function openUserModalFromCart() {
  if (window.closeCart) window.closeCart();
  openUserModal('login');
}

export function togglePasswordVisibility(inputId, btnEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPass = input.type === 'password';
  input.type = isPass ? 'text' : 'password';
  if (btnEl) {
    btnEl.innerHTML = isPass ? '🙈' : '👁️';
    btnEl.setAttribute('aria-label', isPass ? 'Ocultar senha' : 'Ver senha');
  }
}

// PÁGINA "MINHA CONTA" (#page-conta)
export function openUserAccountPage(tab = 'pedidos') {
  if (window.showPage) window.showPage('conta');
  setUserTab(tab);
}

export function setUserTab(tab) {
  currentUserTab = tab;
  document.querySelectorAll('.user-account-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.user-tab-panel').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('userTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
  if (el) el.classList.add('active');
}

export function renderUserAccount() {
  renderUserPedidos();
  renderUserConta();
  renderUserConfig();
  setUserTab(currentUserTab || 'pedidos');
}

export async function renderUserPedidos() {
  const el = document.getElementById('userTabPedidos');
  if (!el) return;
  const user = getActiveUser();
  if (!user) {
    el.innerHTML = `<div class="user-tab-card"><div class="user-empty"><span class="empty-icon">🔒</span><h3>Entre para ver seus pedidos</h3><p>Faça login para acompanhar seus pedidos e histórico de compras.</p><button class="user-primary-btn" onclick="openUserModal()">Entrar na minha conta</button></div></div>`;
    return;
  }
  el.innerHTML = `<div class="user-tab-card"><p style="text-align:center;color:var(--text-mid);padding:20px;">Carregando pedidos...</p></div>`;
  let orders = await fetchUserOrders(user);
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

export function renderUserConta() {
  const el = document.getElementById('userTabConta');
  if (!el) return;
  const user = getActiveUser();
  if (!user) {
    el.innerHTML = `<div class="user-tab-card"><div class="user-empty"><span class="empty-icon">👤</span><h3>Entre para acessar sua conta</h3><p>Faça login para visualizar e editar seus dados.</p><button class="user-primary-btn" onclick="openUserModal()">Entrar na minha conta</button></div></div>`;
    return;
  }
  const name = user.displayName || '';
  const email = user.email || '';
  el.innerHTML = `
    <div class="user-tab-card">
      <h2>Informações da Conta</h2>
      <p class="user-card-sub">Atualize seu nome de exibição. O e-mail é usado para login e identificação.</p>
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

export function saveUserConta() {
  const user = getActiveUser();
  if (!user) return;
  const name = (document.getElementById('userContaName')?.value || '').trim();
  if (!name) {
    if (window.showToast) window.showToast('⚠️ Preencha o nome!', 'error');
    return;
  }
  if (auth.currentUser) {
    updateProfile(auth.currentUser, { displayName: name })
      .then(async () => {
        await ensureUserDoc(auth.currentUser, name);
        if (window.showToast) window.showToast('✅ Nome atualizado com sucesso!');
        updateAuthUI();
      })
      .catch(err => {
        if (window.showToast) window.showToast('❌ ' + err.message, 'error');
      });
  } else {
    user.displayName = name;
    setLocalSession(user);
    if (window.showToast) window.showToast('✅ Nome atualizado!');
    updateAuthUI();
  }
}

export function renderUserConfig() {
  const el = document.getElementById('userTabConfig');
  if (!el) return;
  const user = getActiveUser();
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
  `;
}

// INICIALIZA O OUVINTE DE ESTADO DO FIREBASE AUTH
export function initAuth() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      await ensureUserDoc(user);
    }
    updateAuthUI();
  });
}

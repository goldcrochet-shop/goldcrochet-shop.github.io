// Gold Crochet - Módulo de Autenticação
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
  getDoc,
  setDoc,
  handleFirestoreError
} from "./firebase.js";

// Helper de traduções amigáveis de erros Firebase
function getAuthErrorMessage(err) {
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
    default:
      return err.message || 'Erro ao processar login.';
  }
}

// Garante documento do usuário no Firestore
export async function ensureUserDoc(user, customName) {
  if (!user || !db) return null;
  try {
    const ref = fsDoc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    const baseName = customName || user.displayName || (snap.exists() ? (snap.data().displayName || snap.data().name) : '') || 'Cliente';
    const isOwnerAdmin = ['goldcrochet.suporte@gmail.com', 'rossipereira2010@gmail.com'].includes(user.email);
    const role = isOwnerAdmin ? 'admin' : (snap.exists() ? (snap.data().role || 'customer') : 'customer');
    const nowIso = new Date().toISOString();

    if (!snap.exists()) {
      const newDoc = {
        id: user.uid,
        displayName: baseName,
        email: user.email || '',
        role: role,
        photoURL: user.photoURL || '',
        createdAt: nowIso,
        updatedAt: nowIso
      };
      await setDoc(ref, newDoc);
      localStorage.setItem('goldcrochet_user_profile', JSON.stringify(newDoc));
      return newDoc;
    } else {
      const data = snap.data();
      localStorage.setItem('goldcrochet_user_profile', JSON.stringify({ id: user.uid, ...data }));
      return { id: user.uid, ...data };
    }
  } catch (e) {
    handleFirestoreError(e, 'get/set', `users/${user.uid}`);
    return null;
  }
}

// Alternar visibilidade de senha
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

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.dataset.originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span>Entrando no ateliê...</span>';
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await ensureUserDoc(cred.user);
    closeUserModal();
    if (window.showToast) window.showToast('✨ Bem-vindo(a) à Gold Crochet!');
    updateAuthUI();
  } catch (err) {
    console.warn('[Login Error]', err);
    const friendlyMsg = getAuthErrorMessage(err);
    if (errorBox) {
      errorBox.innerHTML = `<span>${friendlyMsg}</span>`;
      errorBox.style.display = 'block';
    }
    if (window.showToast) window.showToast('❌ ' + friendlyMsg, 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = submitBtn.dataset.originalText || 'Entrar';
    }
  }
}

// CADASTRO COM E-MAIL E SENHA
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
    const msg = '⚠️ Preencha nome, e-mail e uma senha!';
    if (errorBox) { errorBox.textContent = msg; errorBox.style.display = 'block'; }
    if (window.showToast) window.showToast(msg, 'error');
    return;
  }

  if (password.length < 6) {
    const msg = '⚠️ A senha deve conter pelo menos 6 caracteres.';
    if (errorBox) { errorBox.textContent = msg; errorBox.style.display = 'block'; }
    if (window.showToast) window.showToast(msg, 'error');
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.dataset.originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span>Criando conta...</span>';
  }

  try {
    const uc = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(uc.user, { displayName: name });
    await ensureUserDoc(uc.user, name);
    closeUserModal();
    if (window.showToast) window.showToast('🎉 Conta criada com sucesso! Seja bem-vindo(a).');
    updateAuthUI();
  } catch (err) {
    console.warn('[Register Error]', err);
    const friendlyMsg = getAuthErrorMessage(err);
    if (errorBox) {
      errorBox.innerHTML = `<span>${friendlyMsg}</span>`;
      errorBox.style.display = 'block';
    }
    if (window.showToast) window.showToast('❌ ' + friendlyMsg, 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = submitBtn.dataset.originalText || 'Cadastrar';
    }
  }
}

// LOGIN COM GOOGLE
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await ensureUserDoc(result.user);
    closeUserModal();
    const name = result.user.displayName || 'Cliente';
    if (window.showToast) window.showToast(`✨ Bem-vindo(a), ${name}!`);
    updateAuthUI();
  } catch (err) {
    console.warn('[Firebase Auth] Erro login Google:', err);
    const friendlyMsg = getAuthErrorMessage(err);
    if (window.showToast) window.showToast('❌ ' + friendlyMsg, 'error');
  }
}

// RECUPERAR SENHA
export async function resetPassword() {
  const emailInput = document.getElementById('loginEmail');
  const errorBox = document.getElementById('loginErrorMsg');
  const email = (emailInput?.value || '').trim();

  if (!email || !email.includes('@')) {
    const msg = '⚠️ Digite seu e-mail no campo acima para receber o link de recuperação.';
    if (errorBox) { errorBox.textContent = msg; errorBox.style.display = 'block'; }
    if (window.showToast) window.showToast(msg, 'error');
    emailInput?.focus();
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    const msg = `📬 Enviamos um link de redefinição para ${email}. Verifique sua caixa de entrada e spam.`;
    if (errorBox) { errorBox.textContent = msg; errorBox.style.display = 'block'; errorBox.style.color = '#2e7d32'; }
    if (window.showToast) window.showToast('📧 E-mail de recuperação enviado!');
  } catch (err) {
    const msg = getAuthErrorMessage(err);
    if (errorBox) { errorBox.textContent = msg; errorBox.style.display = 'block'; }
    if (window.showToast) window.showToast('❌ ' + msg, 'error');
  }
}

// LOGOUT
export async function logoutUser() {
  try {
    await signOut(auth);
    localStorage.removeItem('goldcrochet_user_profile');
    if (window.showToast) window.showToast('👋 Você saiu da sua conta.');
    updateAuthUI();
    const contaPage = document.getElementById('page-conta');
    if (contaPage && contaPage.classList.contains('active')) {
      if (window.showPage) window.showPage('inicio');
    }
  } catch (e) {
    console.warn('Erro ao sair:', e);
  }
}

// MODAL VIEW TOGGLES
export function showLogin() {
  const lView = document.getElementById('loginView');
  const rView = document.getElementById('registerView');
  const loginTab = document.getElementById('modalTabLogin');
  const regTab = document.getElementById('modalTabRegister');
  if (lView) lView.style.display = 'block';
  if (rView) rView.style.display = 'none';
  if (loginTab) loginTab.classList.add('active');
  if (regTab) regTab.classList.remove('active');
  const errBox = document.getElementById('loginErrorMsg');
  if (errBox) { errBox.textContent = ''; errBox.style.display = 'none'; }
}

export function showRegister() {
  const lView = document.getElementById('loginView');
  const rView = document.getElementById('registerView');
  const loginTab = document.getElementById('modalTabLogin');
  const regTab = document.getElementById('modalTabRegister');
  if (lView) lView.style.display = 'none';
  if (rView) rView.style.display = 'block';
  if (loginTab) loginTab.classList.remove('active');
  if (regTab) regTab.classList.add('active');
  const errBox = document.getElementById('registerErrorMsg');
  if (errBox) { errBox.textContent = ''; errBox.style.display = 'none'; }
}

export function openUserModal() {
  const el = document.getElementById('userModalOverlay');
  if (!el) return;
  el.classList.add('open');
  showLogin();
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('loginEmail')?.focus(), 100);
}

export function closeUserModal() {
  const el = document.getElementById('userModalOverlay');
  if (!el) return;
  el.classList.remove('open');
  document.body.style.overflow = '';
}

export function handleAccountAction() {
  if (auth.currentUser) {
    if (window.openUserAccountPage) window.openUserAccountPage();
  } else {
    openUserModal();
  }
}

export function updateAuthUI() {
  const user = auth.currentUser;
  const promo = document.getElementById('cartPromo');
  if (promo) promo.style.display = user ? 'none' : 'block';

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

  // Sincroniza menu lateral
  const sideName = document.getElementById('leftMenuAccountName');
  const sideStatus = document.getElementById('leftMenuAccountStatus');
  const sideBtn = document.getElementById('leftMenuAccountAction');
  if (sideName && sideStatus && sideBtn) {
    if (user) {
      sideName.textContent = user.displayName || user.email.split('@')[0];
      sideStatus.textContent = user.email;
      sideBtn.textContent = 'Minha Conta →';
      sideBtn.onclick = () => { if (window.closeLeftMenu) window.closeLeftMenu(); if (window.openUserAccountPage) window.openUserAccountPage(); };
    } else {
      sideName.textContent = 'Visitante';
      sideStatus.textContent = 'Entre para acompanhar seus pedidos.';
      sideBtn.textContent = 'Entrar / Criar conta';
      sideBtn.onclick = () => { if (window.closeLeftMenu) window.closeLeftMenu(); openUserModal(); };
    }
  }
}

// Inicializa escuta de autenticação
onAuthStateChanged(auth, (user) => {
  if (user) {
    ensureUserDoc(user);
  }
  updateAuthUI();
});

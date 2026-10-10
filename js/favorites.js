// Gold Crochet - Módulo de Favoritos
import { auth, db, fsDoc, getDoc, setDoc } from "./firebase.js";

export let favorites = JSON.parse(localStorage.getItem('goldcrochet_favs') || '[]');

export function saveFavorites() {
  localStorage.setItem('goldcrochet_favs', JSON.stringify(favorites));
  updateFavoritesUI();

  // Sincroniza com o usuário no Firestore se logado
  const user = auth.currentUser;
  if (user && db) {
    try {
      const ref = fsDoc(db, 'users', user.uid);
      setDoc(ref, { favorites: favorites }, { merge: true });
    } catch (e) {
      console.warn('Erro ao salvar favoritos no Firestore:', e);
    }
  }
}

export function toggleFavorite(productId) {
  const id = Number(productId);
  const index = favorites.indexOf(id);
  if (index > -1) {
    favorites.splice(index, 1);
    if (window.showToast) window.showToast('Item removido dos favoritos');
  } else {
    favorites.push(id);
    if (window.showToast) window.showToast('✨ Peça adicionada aos seus favoritos!');
  }
  saveFavorites();
  syncHeartButtons();
}

export function isFavorite(productId) {
  return favorites.includes(Number(productId));
}

export function syncHeartButtons() {
  document.querySelectorAll('.btn-fav-card, .btn-fav-detail').forEach(btn => {
    const pid = Number(btn.dataset.id || btn.getAttribute('data-product-id'));
    if (pid) {
      const active = isFavorite(pid);
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
  });
}

export function openFavorites() {
  const overlay = document.getElementById('favOverlay');
  if (overlay) overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  renderFavoritesList();
}

export function closeFavorites() {
  const overlay = document.getElementById('favOverlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

export function updateFavoritesUI() {
  const badge = document.getElementById('navFavCount');
  const drawerBadge = document.getElementById('drawerFavCount');
  const count = favorites.length;

  if (badge) {
    badge.textContent = count;
    badge.classList.toggle('hidden', count === 0);
  }
  if (drawerBadge) {
    drawerBadge.textContent = count;
    drawerBadge.classList.toggle('hidden', count === 0);
  }
  syncHeartButtons();
}

export function renderFavoritesList() {
  const container = document.getElementById('favItems');
  if (!container) return;

  const allProducts = window._productsData || [];
  const favProducts = allProducts.filter(p => favorites.includes(p.id));

  if (favProducts.length === 0) {
    container.innerHTML = `
      <div class="fav-empty-state">
        <span class="empty-icon">🤍</span>
        <p>Você ainda não favoritou nenhuma peça.</p>
        <button class="btn-continue-shopping" onclick="closeFavorites()">Ver Catálogo</button>
      </div>
    `;
    return;
  }

  container.innerHTML = favProducts.map(p => {
    const priceStr = p.price ? Number(p.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Sob Consulta';
    return `
      <div class="fav-item">
        <img src="${p.image || './assets/logo.png'}" alt="${p.name}" class="fav-item-img" onclick="openProductPage(${p.id}); closeFavorites();">
        <div class="fav-item-info">
          <h4 onclick="openProductPage(${p.id}); closeFavorites();">${p.name}</h4>
          <span class="fav-item-price">${priceStr}</span>
          <div class="fav-item-actions">
            <button class="btn-add-cart-fav" onclick="window.addToCartById(${p.id});">Adicionar à Sacola</button>
            <button class="btn-remove-fav" onclick="toggleFavorite(${p.id}); renderFavoritesList();">Remover</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

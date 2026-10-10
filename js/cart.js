// Gold Crochet - Módulo do Carrinho e Sacola de Compras
import { auth, db, fsCollection, addDoc, serverTimestamp } from "./firebase.js";

export let cart = JSON.parse(localStorage.getItem('goldcrochet_cart') || '[]');

export function saveCart() {
  localStorage.setItem('goldcrochet_cart', JSON.stringify(cart));
  updateCartUI();
}

export function formatBRL(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function addToCart(product, colorName, qty = 1) {
  if (!product) return;
  const existing = cart.find(item => item.id === product.id && item.color === colorName);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image || (product.gallery && product.gallery[0]) || '',
      color: colorName || (product.colors && product.colors[0]?.name) || '',
      qty: qty
    });
  }
  saveCart();
  if (window.showToast) {
    window.showToast(`🛍️ ${product.name} adicionado à sacola!`);
  }
  openCart();
}

export function removeFromCart(index) {
  if (index >= 0 && index < cart.length) {
    cart.splice(index, 1);
    saveCart();
  }
}

export function changeQty(index, delta) {
  if (cart[index]) {
    cart[index].qty += delta;
    if (cart[index].qty <= 0) {
      removeFromCart(index);
    } else {
      saveCart();
    }
  }
}

export function openCart() {
  const overlay = document.getElementById('cartOverlay');
  if (overlay) overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

export function closeCart() {
  const overlay = document.getElementById('cartOverlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

export function toggleCart() {
  const overlay = document.getElementById('cartOverlay');
  if (overlay && overlay.classList.contains('open')) {
    closeCart();
  } else {
    openCart();
  }
}

export function updateCartUI() {
  const countEl = document.getElementById('cartCount');
  const itemsContainer = document.getElementById('cartItems');
  const subtotalEl = document.getElementById('cartSubtotal');
  const totalCount = cart.reduce((acc, item) => acc + item.qty, 0);

  if (countEl) {
    countEl.textContent = totalCount;
    countEl.classList.toggle('hidden', totalCount === 0);
  }

  // Drawer mobile badge
  const drawerCount = document.getElementById('drawerCartCount');
  if (drawerCount) {
    drawerCount.textContent = totalCount;
    drawerCount.classList.toggle('hidden', totalCount === 0);
  }

  let totalValue = 0;

  if (itemsContainer) {
    if (cart.length === 0) {
      itemsContainer.innerHTML = `
        <div class="cart-empty-state">
          <span class="empty-icon">🛍️</span>
          <p>Sua sacola está vazia.</p>
          <button class="btn-continue-shopping" onclick="closeCart()">Explorar Coleções</button>
        </div>
      `;
    } else {
      itemsContainer.innerHTML = cart.map((item, index) => {
        const itemTotal = (item.price || 0) * item.qty;
        totalValue += itemTotal;
        return `
          <div class="cart-item">
            <img src="${item.image || './assets/logo.png'}" alt="${item.name}" class="cart-item-img">
            <div class="cart-item-details">
              <h4>${item.name}</h4>
              ${item.color ? `<span class="cart-item-color">Cor: ${item.color}</span>` : ''}
              <div class="cart-item-price">${formatBRL(item.price)}</div>
              <div class="cart-item-qty">
                <button onclick="changeQty(${index}, -1)" aria-label="Diminuir">-</button>
                <span>${item.qty}</span>
                <button onclick="changeQty(${index}, 1)" aria-label="Aumentar">+</button>
                <button class="cart-item-remove" onclick="removeFromCart(${index})" title="Remover">✕</button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  } else {
    totalValue = cart.reduce((acc, item) => acc + ((item.price || 0) * item.qty), 0);
  }

  if (subtotalEl) {
    subtotalEl.textContent = formatBRL(totalValue);
  }
}

export async function checkout() {
  if (cart.length === 0) {
    if (window.showToast) window.showToast('⚠️ Sua sacola está vazia!', 'error');
    return;
  }

  const user = auth.currentUser;
  const total = cart.reduce((sum, i) => sum + (Number(i.price) || 0) * i.qty, 0);

  // Se logado, registra pedido no Firestore
  if (user && db) {
    try {
      const orderRef = fsCollection(db, 'orders');
      await addDoc(orderRef, {
        userId: user.uid,
        userEmail: user.email || '',
        userName: user.displayName || 'Cliente',
        items: cart,
        total: total,
        status: 'pendente',
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Erro ao salvar pedido no Firestore:', e);
    }
  }

  // Prepara mensagem WhatsApp
  let text = `Olá, Gold Crochet! Gostaria de encomendar as seguintes peças:\n\n`;
  cart.forEach(item => {
    text += `• ${item.name} (${item.color || 'Padrão'}) x${item.qty} - ${formatBRL((item.price || 0) * item.qty)}\n`;
  });
  text += `\n*Total:* ${formatBRL(total)}\n`;
  if (user) {
    text += `*Cliente:* ${user.displayName || user.email}\n`;
  }
  text += `\nPoderiam me informar sobre prazos de confecção e envio? ✨`;

  const phone = '5531984566047';
  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  window.open(waUrl, '_blank', 'noopener,noreferrer');
}

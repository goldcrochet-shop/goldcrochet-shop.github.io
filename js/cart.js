// Gold Crochet - Módulo do Carrinho e Sacola de Compras
import {
  auth,
  db,
  fsDoc,
  setDoc,
  fsCollection,
  writeBatch,
  increment,
  arrayUnion,
  serverTimestamp
} from "./firebase.js";

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

  // Se a interface global do ateliê estiver disponível, delega ao checkout padronizado
  if (window.GoldCart && typeof window.GoldCart.checkout === 'function' && document.getElementById('gcCartDrawer')) {
    return window.GoldCart.checkout();
  }

  const user = auth.currentUser;
  let customer = null;
  try {
    const raw = localStorage.getItem('gc_customer_account_v2');
    if (raw) customer = JSON.parse(raw);
  } catch (e) {}

  const orderCode = 'GC' + Date.now().toString(36).toUpperCase().slice(-6);
  const total = cart.reduce((sum, i) => sum + (Number(i.price) || 0) * i.qty, 0);
  const targetUserId = (user && user.uid) || (customer && (customer.id || customer.uid)) || 'guest-' + Date.now();
  const userName = (customer && customer.name) || (user && user.displayName) || 'Cliente VIP';
  const userEmail = (customer && customer.email) || (user && user.email) || '';
  const rawPhone = (customer && (customer.phone || customer.whatsapp)) || (user && user.phoneNumber) || '';
  const normPhone = window.GoldPhone ? window.GoldPhone.normalize(rawPhone) : String(rawPhone).replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');

  const orderPayload = {
    code: orderCode,
    source: 'whatsapp-checkout',
    userId: targetUserId,
    userName: userName,
    userEmail: userEmail,
    phone: normPhone,
    items: cart.map(i => ({ name: i.name || '', qty: Number(i.qty) || 1, price: Number(i.price) || 0, color: i.color || '' })),
    total: Number(total.toFixed(2)),
    status: 'pendente',
    address: (customer && customer.address) || {},
    createdAt: (serverTimestamp && serverTimestamp()) || new Date().toISOString()
  };

  const clientOrderItem = {
    id: orderCode,
    code: orderCode,
    date: new Date().toLocaleDateString('pt-BR'),
    item: cart.map(i => `${i.qty}x ${i.name}`).join(', '),
    color: cart[0]?.color || 'Artesanal Gold',
    total: formatBRL(total),
    step: 1,
    status: 'pendente'
  };

  // Salva no cache local de pedidos
  try {
    const cachedOrders = JSON.parse(localStorage.getItem('gc_cached_orders') || '[]');
    cachedOrders.unshift({ ...orderPayload, id: orderCode, createdAt: new Date().toISOString() });
    localStorage.setItem('gc_cached_orders', JSON.stringify(cachedOrders.slice(0, 100)));
  } catch (e) {}

  // Atualiza perfil local da cliente se existir
  if (customer) {
    customer.purchasesCount = (customer.purchasesCount || 0) + 1;
    if (!Array.isArray(customer.orders)) customer.orders = [];
    customer.orders.unshift(clientOrderItem);
    try {
      localStorage.setItem('gc_customer_account_v2', JSON.stringify(customer));
    } catch (e) {}
  }

  // Gravação atômica no Firestore via writeBatch ou setDoc
  if (db && fsDoc) {
    try {
      const orderRef = fsDoc(db, 'orders', orderCode);
      const isRealUser = targetUserId && !targetUserId.startsWith('guest');

      if (writeBatch && isRealUser) {
        const batch = writeBatch(db);
        batch.set(orderRef, orderPayload);
        const userRef = fsDoc(db, 'users', targetUserId);
        batch.set(userRef, {
          purchasesCount: increment ? increment(1) : ((customer && customer.purchasesCount) || 1),
          orders: arrayUnion ? arrayUnion(clientOrderItem) : [clientOrderItem],
          updatedAt: (serverTimestamp && serverTimestamp()) || new Date().toISOString()
        }, { merge: true });
        await batch.commit();
      } else {
        await setDoc(orderRef, orderPayload);
        if (isRealUser) {
          const userRef = fsDoc(db, 'users', targetUserId);
          await setDoc(userRef, {
            purchasesCount: increment ? increment(1) : ((customer && customer.purchasesCount) || 1),
            orders: arrayUnion ? arrayUnion(clientOrderItem) : [clientOrderItem],
            updatedAt: (serverTimestamp && serverTimestamp()) || new Date().toISOString()
          }, { merge: true }).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('[Cart Checkout] Erro na gravação Firestore:', err);
    }
  }

  // Dispara evento reativo de novo pedido
  const eventDetail = { orderCode, order: orderPayload, customer };
  document.dispatchEvent(new CustomEvent('gc:order-placed', { detail: eventDetail }));
  window.dispatchEvent(new CustomEvent('gc:order-placed', { detail: eventDetail }));

  // Prepara mensagem WhatsApp sem duplicação de 55
  let text = `✨ *Pedido Gold Crochet Brasil — Alta-Costura*\n`;
  text += `🧾 Código: *${orderCode}*\n\n`;
  if (userName) text += `👤 Cliente: *${userName}*\n`;
  if (normPhone) {
    const displayPhone = window.GoldPhone && typeof window.GoldPhone.formatDisplay === 'function'
      ? window.GoldPhone.formatDisplay(normPhone)
      : normPhone;
    text += `📱 WhatsApp: *${displayPhone}*\n`;
  }
  text += `\nGostaria de encomendar as seguintes peças:\n\n`;
  cart.forEach(item => {
    text += `▪ ${item.qty}x *${item.name}* ${item.color ? `(Cor: ${item.color})` : ''} — ${formatBRL((item.price || 0) * item.qty)}\n`;
  });
  text += `\n*Total Estimado:* ${formatBRL(total)}\n\n`;
  text += `Poderiam me informar sobre prazos de confecção e envio? ✨`;

  const atelierPhone = (window.GCWhatsApp && typeof window.GCWhatsApp.getPhone === 'function' && window.GCWhatsApp.getPhone()) || '31984566047';
  const waUrl = window.GoldPhone && typeof window.GoldPhone.formatWhatsAppLink === 'function'
    ? window.GoldPhone.formatWhatsAppLink(atelierPhone, text)
    : `https://wa.me/55${atelierPhone}?text=${encodeURIComponent(text)}`;

  window.open(waUrl, '_blank', 'noopener,noreferrer');
  cart = [];
  saveCart();
}

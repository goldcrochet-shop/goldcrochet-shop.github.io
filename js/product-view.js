// Gold Crochet - Módulo de Visualização de Detalhes da Peça
import { catalogState, formatBRL } from "./catalog.js";
import { openProductRoute, closeProductRoute } from "./router.js";
import { addToCart } from "./cart.js";
import { favorites, isFavorite, toggleFavorite } from "./favorites.js";
import { setupProductSwipeDismiss } from "./product-gestures.js";

export let currentProduct = null;
export let selectedColors = {};

export function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export function openProductPage(id, pushHistory = true) {
  openProductRoute(id, pushHistory);
}

export function closeProductPage() {
  closeProductRoute();
}

export function renderProductPageContent(id) {
  const allProducts = window._productsData || catalogState.products || [];
  const p = allProducts.find(x => x.id === id || x.slug === id || String(x.id) === String(id));
  if (!p) {
    console.warn('Produto não encontrado:', id);
    return;
  }

  currentProduct = p;

  // Atualiza título
  const titleEl = document.getElementById('productPageTitle');
  if (titleEl) titleEl.textContent = p.name;

  // Atualiza preço e desconto
  const priceRow = document.getElementById('productPagePriceRow');
  if (priceRow) {
    const base = parseFloat(p.price) || 0;
    if (p.discount && p.discount > 0) {
      const finalPrice = Math.round(base * (1 - p.discount / 100));
      priceRow.innerHTML = `
        <span class="product-page-price-old">R$ ${base.toFixed(2).replace('.', ',')}</span>
        <span class="product-page-price-new">R$ ${finalPrice.toFixed(2).replace('.', ',')}</span>
        <span class="product-page-discount-tag">-${p.discount}%</span>
      `;
    } else if (base > 0) {
      priceRow.innerHTML = `<span class="product-page-price">R$ ${base.toFixed(2).replace('.', ',')}</span>`;
    } else {
      priceRow.innerHTML = `<span class="product-page-price">Sob consulta</span>`;
    }
  }

  // Descrição
  const descEl = document.getElementById('productPageDesc');
  if (descEl) descEl.textContent = p.desc || 'Peça artesanal exclusiva produzida à mão com acabamento premium e fios nobres selecionados.';

  // Link para página dedicada estática (HTML individual)
  const dedicatedBtn = document.getElementById('productPageDedicatedLink');
  if (dedicatedBtn) {
    const slug = p.slug || slugify(p.name);
    dedicatedBtn.href = `./produtos/${slug}.html`;
  }

  // Galeria de imagens
  const gallery = document.getElementById('productPageGallery');
  if (gallery) {
    const imgs = [];
    if (p.image) imgs.push(p.image);
    if (Array.isArray(p.gallery)) {
      p.gallery.forEach(img => {
        if (img && !imgs.includes(img)) imgs.push(img);
      });
    }

    if (imgs.length) {
      gallery.innerHTML = imgs.map((url, i) => `
        <div class="product-page-gallery-item">
          <img src="${url}" alt="${p.name} - Foto ${i+1}" loading="lazy" onerror="this.style.display='none'">
        </div>
      `).join('');
    } else {
      gallery.innerHTML = `
        <div class="product-page-gallery-item">
          <div class="gallery-emoji">${p.emoji || '🧶'}</div>
        </div>
      `;
    }
  }

  // Seletor de Cores
  const colorsContainer = document.getElementById('productPageColors');
  if (colorsContainer) {
    const sections = p.colorSections || (p.colors ? [{ name: 'Cores disponíveis', colors: p.colors }] : []);
    if (!Array.isArray(selectedColors[p.id])) {
      selectedColors[p.id] = sections.map(s => s.colors.length ? s.colors[0] : null);
    }

    if (sections.length > 0) {
      colorsContainer.innerHTML = sections.map((sec, sIdx) => {
        const sel = selectedColors[p.id][sIdx] || (sec.colors.length ? sec.colors[0] : null);
        if (!selectedColors[p.id][sIdx]) selectedColors[p.id][sIdx] = sel;
        return `
          <div style="margin-bottom:18px">
            <div class="product-page-colors-label">${sec.name}</div>
            <div style="display:flex;gap:9px;flex-wrap:wrap" class="productPageColorDots" data-sidx="${sIdx}">
              ${sec.colors.map(c => `
                <button class="color-dot ${sel && c.hex === sel.hex ? 'selected' : ''}" 
                        style="background:${c.hex};width:28px;height:28px" 
                        data-pid="${p.id}" 
                        data-sidx="${sIdx}" 
                        data-name="${c.name}" 
                        data-hex="${c.hex}" 
                        onclick="window.selectColorDot(${p.id}, ${sIdx}, '${c.name}', '${c.hex}')"
                        aria-label="Cor ${c.name}">
                </button>
              `).join('')}
            </div>
            <div class="modal-color-name" id="productPageColorName-${sIdx}">Cor selecionada: ${sel ? sel.name : ''}</div>
          </div>
        `;
      }).join('');
    } else {
      colorsContainer.innerHTML = '';
    }
  }

  // Especificações técnicas (Composição, Cuidados, Sustentabilidade)
  const specs = document.getElementById('productPageSpecs');
  if (specs) {
    const composition = p.composition || p.material || 'Fios premium de alta durabilidade e toque nobre, selecionados à mão para cada peça.';
    const care = p.care || 'Lavar à mão com água fria e sabão neutro. Secar na horizontal, à sombra. Guardar dobrada para preservar os pontos.';
    const responsibility = p.responsibility || 'Produção artesanal ética sob demanda, sem desperdício e valorizando o trabalho manual brasileiro.';
    specs.innerHTML = `
      <details><summary>Composição & Fios</summary><p>${composition}</p></details>
      <details><summary>Cuidados com a Peça</summary><p>${care}</p></details>
      <details><summary>Produção Consciente</summary><p>${responsibility}</p></details>
    `;
  }

  // Peças Relacionadas (Você pode gostar)
  const related = document.getElementById('productPageRelated');
  if (related) {
    const others = allProducts.filter(x => x.id !== p.id).slice(0, 8);
    const grads = ['#f2ede0','#f8ead5','#f5e6cb','#f3ead2'];
    related.innerHTML = others.map((rp, i) => {
      const rimg = rp.image || (rp.gallery && rp.gallery[0]) || '';
      const rbadge = rp.discount ? `-${rp.discount}%` : (rp.badge || '');
      const rbadgeLabel = rbadge ? `<div class="product-badge-label${rp.discount ? ' discount' : ''}">${rbadge}</div>` : '';
      const rfav = favorites.includes(rp.id) ? 'faved' : '';
      const priceStr = rp.price ? formatBRL(rp.price) : 'Sob consulta';

      return `
        <div class="carousel-card" onclick="window.openProductPage(${rp.id})" role="button" tabindex="0">
          <div class="product-img-square" style="background:${grads[i % grads.length]}">
            ${rimg ? `<img src="${rimg}" alt="${rp.name}" loading="lazy" onerror="this.style.display='none'">` : ''}
            ${!rimg ? `<div class="product-img-emoji">${rp.emoji || '🧶'}</div>` : ''}
            ${rbadgeLabel}
            <button class="fav-btn ${rfav}" onclick="event.stopPropagation(); window.toggleFavorite(${rp.id})" aria-label="Favorito">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            </button>
          </div>
          <div class="product-info">
            <h3>${rp.name}</h3>
            <div class="product-price">${priceStr}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Inicializa gesto swipe para fechar
  const pageProductEl = document.getElementById('page-produto');
  if (pageProductEl) {
    setupProductSwipeDismiss(pageProductEl, () => {
      window.closeProductPage();
    });
  }
}

export function selectColorDot(pid, sIdx, name, hex) {
  if (!selectedColors[pid]) selectedColors[pid] = [];
  selectedColors[pid][sIdx] = { name, hex };

  const nameEl = document.getElementById(`productPageColorName-${sIdx}`);
  if (nameEl) nameEl.textContent = `Cor selecionada: ${name}`;

  const container = document.querySelector(`.productPageColorDots[data-sidx="${sIdx}"]`);
  if (container) {
    container.querySelectorAll('.color-dot').forEach(btn => {
      btn.classList.toggle('selected', btn.getAttribute('data-hex') === hex);
    });
  }
}

export function addProductToCart() {
  if (!currentProduct) return;
  const colors = selectedColors[currentProduct.id] || [];
  const chosenColor = colors[0]?.name || (currentProduct.colors && currentProduct.colors[0]?.name) || '';
  addToCart(currentProduct, chosenColor, 1);
}

export function orderOnWhatsApp() {
  if (!currentProduct) return;
  const p = currentProduct;
  const colors = selectedColors[p.id] || [];
  const chosenColor = colors[0]?.name || (p.colors && p.colors[0]?.name) || '';
  const colorStr = chosenColor ? ` (Cor: ${chosenColor})` : '';
  const priceStr = p.price ? formatBRL(p.price) : 'Sob Consulta';

  const text = `Olá, Atelier Gold Crochet! ✨\n\nGostaria de encomendar a peça *${p.name}*${colorStr} no valor de ${priceStr}.\n\nPoderiam me passar detalhes sobre prazos de confecção e opções de frete?`;
  const phone = '5531984566047';
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function shareProductLink(slugOrId) {
  const cleanUrl = `${window.location.origin}${window.location.pathname}#/produto/${slugOrId}`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(cleanUrl).then(() => {
      if (window.showToast) window.showToast('🔗 Link copiado para a área de transferência!');
    }).catch(() => {
      prompt('Copie o link da peça:', cleanUrl);
    });
  } else {
    prompt('Copie o link da peça:', cleanUrl);
  }
}

// Vincula ao window
window.selectColorDot = selectColorDot;

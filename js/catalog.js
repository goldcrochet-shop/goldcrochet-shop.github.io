// Gold Crochet - Módulo de Catálogo, Filtros e Busca de Produtos
import { openProductRoute } from "./router.js";
import { isFavorite, toggleFavorite } from "./favorites.js";

export let catalogState = {
  products: [],
  categories: [],
  collections: [],
  currentFilter: 'todos',
  currentSectionFilter: null,
  currentGenderFilter: null,
  currentCollectionFilter: null,
  currentColecaoFilter: 'todas',
  searchQuery: ''
};

export const CATEGORY_TO_SECTION = {
  'roupas-noite': 'dia-a-dia', 'saias-vestidos': 'dia-a-dia',
  'jaquetas-casacos': 'dia-a-dia', 'tops': 'dia-a-dia', 'calcas': 'dia-a-dia',
  'bebe': 'pequeninos', 'garotas': 'pequeninos', 'garotos': 'pequeninos', 'presentes': 'pequeninos',
  'bolsas': 'acessorios', 'charms': 'acessorios',
  'brincos': 'bijuterias', 'colares': 'bijuterias', 'broches': 'bijuterias',
  'braceletes': 'bijuterias', 'aneis': 'bijuterias',
  'decoracoes': 'casa', 'mantas': 'casa', 'amigurumi': 'casa'
};

export const SECTION_LABELS = {
  'dia-a-dia': 'Essenciais', 'pequeninos': 'Pequeninos',
  'acessorios': 'Acessórios', 'bijuterias': 'Bijuterias', 'casa': 'Artigos para Casa'
};

export const categoryLabels = {
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

export function getProductSection(p) {
  if (p.section) return p.section;
  return CATEGORY_TO_SECTION[p.category] || null;
}

export function labelForCategory(cat) {
  return categoryLabels[cat] || (cat.charAt(0).toUpperCase() + cat.slice(1));
}

export function formatBRL(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function setCatalogData(data) {
  if (data.products) {
    catalogState.products = data.products;
    window._productsData = data.products;
  }
  if (data.collections) catalogState.collections = data.collections;
  if (data.categories) catalogState.categories = data.categories;

  renderFilters();
  renderProducts();
  renderCollections();
  renderSpotlight();
  renderNewArrivals();
}

export function renderFilters() {
  const container = document.getElementById('filterPills');
  if (!container) return;

  const isActiveAll = catalogState.currentFilter === 'todos' && 
                      !catalogState.currentSectionFilter && 
                      !catalogState.currentCollectionFilter;

  let html = `<button class="filter-pill ${isActiveAll ? 'active' : ''}" onclick="window.clearAllFilters()">Todos</button>`;

  if (catalogState.categories && catalogState.categories.length) {
    catalogState.categories.forEach(cat => {
      const active = catalogState.currentFilter === cat ? 'active' : '';
      html += `<button class="filter-pill ${active}" onclick="window.setFilter('${cat}')">${labelForCategory(cat)}</button>`;
    });
  }

  container.innerHTML = html;
}

export function renderProducts() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  let filtered = [...catalogState.products];

  // Filtro de Categoria
  if (catalogState.currentFilter !== 'todos') {
    filtered = filtered.filter(p => p.category === catalogState.currentFilter);
  }

  // Filtro de Seção
  if (catalogState.currentSectionFilter) {
    filtered = filtered.filter(p => getProductSection(p) === catalogState.currentSectionFilter);
  }

  // Filtro de Gênero
  if (catalogState.currentGenderFilter) {
    filtered = filtered.filter(p => p.gender === catalogState.currentGenderFilter);
  }

  // Filtro de Coleção
  if (catalogState.currentCollectionFilter) {
    filtered = filtered.filter(p => p.collection === catalogState.currentCollectionFilter);
  }

  // Filtro de Busca
  if (catalogState.searchQuery) {
    const q = catalogState.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(p => 
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.desc && p.desc.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; padding: 60px 20px; text-align: center;">
        <span style="font-size: 3rem; display: block; margin-bottom: 12px;">🧶</span>
        <h3 style="font-family: 'DM Serif Display', serif; font-size: 1.5rem; margin-bottom: 8px;">Nenhuma peça encontrada</h3>
        <p style="color: var(--text-muted); margin-bottom: 20px;">Tente ajustar os filtros ou pesquisar por outro termo.</p>
        <button class="filter-pill active" onclick="window.clearAllFilters()">Limpar Filtros</button>
      </div>
    `;
    return;
  }

  const grads = [
    'linear-gradient(135deg, #1b1610 0%, #2a2216 100%)',
    'linear-gradient(135deg, #18191c 0%, #272218 100%)',
    'linear-gradient(135deg, #201a14 0%, #2e261a 100%)'
  ];

  grid.innerHTML = filtered.map((p, i) => {
    const img = p.image || (p.gallery && p.gallery[0]) || '';
    const isFaved = isFavorite(p.id);
    const badgeText = p.discount ? `-${p.discount}%` : (p.badge || '');
    const priceText = p.price ? formatBRL(p.price) : 'Sob Consulta';

    let colorDots = '';
    if (p.colors && p.colors.length) {
      colorDots = `
        <div class="product-color-dots">
          ${p.colors.slice(0, 4).map(c => `<span class="color-dot" style="background-color:${c.hex}" title="${c.name}"></span>`).join('')}
          ${p.colors.length > 4 ? `<span class="color-dot-more">+${p.colors.length - 4}</span>` : ''}
        </div>
      `;
    }

    return `
      <article class="product-card" onclick="window.openProductPage(${p.id})" tabindex="0" role="button" aria-label="${p.name}">
        <div class="product-card-thumb" style="background:${grads[i % grads.length]}">
          ${img ? `<img src="${img}" alt="${p.name}" loading="lazy" class="product-card-img" onerror="this.style.display='none'">` : ''}
          ${!img ? `<div class="product-card-emoji">${p.emoji || '🧶'}</div>` : ''}
          ${badgeText ? `<span class="product-card-badge">${badgeText}</span>` : ''}
          <button class="btn-fav-card ${isFaved ? 'active' : ''}" 
                  data-id="${p.id}" 
                  onclick="event.stopPropagation(); window.toggleFavorite(${p.id});" 
                  aria-label="Favoritar ${p.name}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
        </div>
        <div class="product-card-body">
          <span class="product-card-cat">${labelForCategory(p.category)}</span>
          <h3 class="product-card-title">${p.name}</h3>
          ${colorDots}
          <div class="product-card-footer">
            <span class="product-card-price">${priceText}</span>
            <span class="product-card-cta">Ver Peça →</span>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

export function setFilter(cat) {
  catalogState.currentFilter = cat;
  catalogState.currentSectionFilter = null;
  catalogState.currentCollectionFilter = null;
  renderFilters();
  renderProducts();
}

export function setSectionFilter(section) {
  catalogState.currentSectionFilter = section;
  catalogState.currentFilter = 'todos';
  catalogState.currentCollectionFilter = null;
  renderFilters();
  renderProducts();
  if (window.showPage) window.showPage('produtos');
}

export function setSectionGenderFilter(section, gender) {
  catalogState.currentSectionFilter = section;
  catalogState.currentGenderFilter = gender;
  catalogState.currentFilter = 'todos';
  renderFilters();
  renderProducts();
  if (window.showPage) window.showPage('produtos');
}

export function setCollectionFilter(collectionName) {
  catalogState.currentCollectionFilter = collectionName;
  catalogState.currentFilter = 'todos';
  catalogState.currentSectionFilter = null;
  renderFilters();
  renderProducts();
  if (window.showPage) window.showPage('produtos');
}

export function clearAllFilters() {
  catalogState.currentFilter = 'todos';
  catalogState.currentSectionFilter = null;
  catalogState.currentGenderFilter = null;
  catalogState.currentCollectionFilter = null;
  catalogState.searchQuery = '';
  const searchInput = document.getElementById('catalogSearchInput');
  if (searchInput) searchInput.value = '';
  renderFilters();
  renderProducts();
}

export function onSearch(query) {
  catalogState.searchQuery = query;
  renderProducts();
}

export function clearSearch() {
  catalogState.searchQuery = '';
  const searchInput = document.getElementById('catalogSearchInput');
  if (searchInput) searchInput.value = '';
  renderProducts();
}

export function renderCollections() {
  const container = document.getElementById('collectionsGrid');
  if (!container || !catalogState.collections) return;

  container.innerHTML = catalogState.collections.map(c => `
    <div class="collection-card" onclick="window.setCollectionFilter('${c.filter || c.name}')" role="button" tabindex="0">
      <div class="collection-card-icon">${c.emoji || '👑'}</div>
      <h3>${c.name}</h3>
      <p>${c.desc}</p>
      <span class="collection-card-link">Explorar Coleção →</span>
    </div>
  `).join('');
}

export function renderSpotlight() {
  const container = document.getElementById('spotlightCarousel');
  if (!container) return;

  const featured = catalogState.products.slice(0, 6);
  container.innerHTML = featured.map(p => {
    const img = p.image || (p.gallery && p.gallery[0]) || '';
    return `
      <div class="spotlight-card" onclick="window.openProductPage(${p.id})" role="button" tabindex="0">
        <div class="spotlight-img-wrap">
          ${img ? `<img src="${img}" alt="${p.name}" loading="lazy">` : `<span class="spotlight-emoji">${p.emoji || '🧶'}</span>`}
        </div>
        <h4>${p.name}</h4>
        <span>${formatBRL(p.price)}</span>
      </div>
    `;
  }).join('');
}

export function renderNewArrivals() {
  const container = document.getElementById('newArrivalsGrid');
  if (!container) return;

  const news = catalogState.products.filter(p => p.badge === 'Novo' || p.discount).slice(0, 4);
  const items = news.length ? news : catalogState.products.slice(0, 4);

  container.innerHTML = items.map(p => {
    const img = p.image || (p.gallery && p.gallery[0]) || '';
    return `
      <div class="new-arrival-item" onclick="window.openProductPage(${p.id})">
        <img src="${img || './assets/logo.png'}" alt="${p.name}" loading="lazy">
        <div class="new-arrival-info">
          <h5>${p.name}</h5>
          <span>${formatBRL(p.price)}</span>
        </div>
      </div>
    `;
  }).join('');
}

export function onSearchOverlay(query) {
  const resultsEl = document.getElementById('searchOverlayResults');
  const clearBtn = document.getElementById('searchOverlayClear');
  if (!resultsEl) return;

  if (clearBtn) clearBtn.style.display = query ? 'flex' : 'none';

  if (!query || query.trim().length < 2) {
    resultsEl.innerHTML = '<p class="search-empty-hint">Digite pelo menos 2 letras para pesquisar peças artesanais...</p>';
    return;
  }

  const q = query.toLowerCase().trim();
  const matched = catalogState.products.filter(p => 
    (p.name && p.name.toLowerCase().includes(q)) ||
    (p.desc && p.desc.toLowerCase().includes(q)) ||
    (p.category && p.category.toLowerCase().includes(q))
  );

  if (matched.length === 0) {
    resultsEl.innerHTML = `
      <div class="search-no-results">
        <p>Nenhuma peça encontrada para "<strong>${query}</strong>".</p>
      </div>
    `;
    return;
  }

  resultsEl.innerHTML = matched.map(p => `
    <div class="search-result-item" onclick="window.openProductPage(${p.id}); window.closeSearchOverlay();">
      <img src="${p.image || './assets/logo.png'}" alt="${p.name}">
      <div>
        <h4>${p.name}</h4>
        <span>${formatBRL(p.price)}</span>
      </div>
    </div>
  `).join('');
}

export function clearSearchOverlayInput() {
  const input = document.getElementById('searchOverlayInput');
  if (input) {
    input.value = '';
    onSearchOverlay('');
    input.focus();
  }
}

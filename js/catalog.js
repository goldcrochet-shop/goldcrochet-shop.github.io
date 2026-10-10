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
  if (data.blogPosts) catalogState.blogPosts = data.blogPosts;

  renderFilters();
  renderProducts();
  renderColecoes();
  renderNovidades();
  renderSpotlight();
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

export const defaultBlogPosts = [
  { id: 1, title: 'Nova Coleção Maré de Ouro', date: 'Março 2026', emoji: '🌊', tag: 'Lançamento', excerpt: 'Inspirada no balanço do mar e no brilho do ouro, nossa nova coleção chega com peças únicas em tons dourados e azuis.' },
  { id: 2, title: 'Por trás dos pontos: o Atelier', date: 'Fevereiro 2026', emoji: '🧶', tag: 'Bastidores', excerpt: 'Um passeio pelo nosso atelier, onde cada peça nasce do cuidado, da paciência e do amor pelo crochê artesanal.' },
  { id: 3, title: 'Colaboração com artistas locais', date: 'Janeiro 2026', emoji: '🎨', tag: 'Colaboração', excerpt: 'Convidamos artistas da nossa região para criar peças exclusivas que misturam tradição e contemporaneidade.' },
  { id: 4, title: 'Guia de cuidados com o crochê', date: 'Dezembro 2025', emoji: '💛', tag: 'Dicas', excerpt: 'Aprenda a lavar, secar e guardar suas peças de crochê para que durem por muitos anos.' },
  { id: 5, title: 'Fios premium: nossa seleção', date: 'Novembro 2025', emoji: '🧵', tag: 'Materiais', excerpt: 'Conheça os fios que escolhemos a dedo para garantir conforto, durabilidade e acabamento impecável.' },
  { id: 6, title: 'Personalize sua peça dos sonhos', date: 'Outubro 2025', emoji: '✨', tag: 'Personalização', excerpt: 'Cores, tamanhos, detalhes... veja como criar uma peça sob medida com a Gold Crochet.' }
];

export function renderColecoes() {
  const container = document.getElementById('colecoesGrid') || document.getElementById('collectionsGrid');
  if (!container || !catalogState.collections) return;

  let filtered = catalogState.collections;
  if (catalogState.currentColecaoFilter && catalogState.currentColecaoFilter !== 'todas') {
    filtered = catalogState.collections.filter(c => c.filter === catalogState.currentColecaoFilter || c.name === catalogState.currentColecaoFilter);
  }

  if (!filtered.length) {
    container.innerHTML = '<div class="no-results" style="grid-column:1/-1;text-align:center;padding:50px 20px;"><span style="font-size:2.5rem;">✨</span><p style="color:var(--text-mid);margin-top:10px;">Nenhuma coleção disponível nesta categoria.</p></div>';
    return;
  }

  container.innerHTML = filtered.map(c => `
    <div class="collection-card" onclick="window.openCollection('${c.id}','${c.filter || c.name}')" role="button" tabindex="0">
      <div class="collection-card-icon" style="font-size:3rem;margin-bottom:12px;">${c.emoji || '👑'}</div>
      <h3 style="font-family:'DM Serif Display',serif;font-size:1.4rem;color:var(--text-dark);margin-bottom:8px;">${c.name}</h3>
      <p style="color:var(--text-mid);font-size:0.9rem;line-height:1.5;margin-bottom:14px;">${c.desc}</p>
      <span class="collection-card-link" style="color:var(--gold-main);font-weight:700;font-size:0.85rem;text-transform:uppercase;letter-spacing:0.05em;">Explorar Peças →</span>
    </div>
  `).join('');
}

export const renderCollections = renderColecoes;

export function setColecaoFilter(filter) {
  catalogState.currentColecaoFilter = filter;
  document.querySelectorAll('#colecoesFilterPills .filter-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.filter === filter);
  });
  renderColecoes();
}

export function openCollection(id, filterName) {
  if (window.showPage) window.showPage('produtos');
  setTimeout(() => {
    if (filterName) setCollectionFilter(filterName);
  }, 50);
}

export function renderNovidades() {
  const container = document.getElementById('novidadesGrid') || document.getElementById('newArrivalsGrid');
  if (!container) return;

  const posts = (catalogState.blogPosts && catalogState.blogPosts.length) ? catalogState.blogPosts : defaultBlogPosts;

  container.innerHTML = posts.map(post => `
    <article class="blog-card" onclick="window.openBlogPost(${post.id})" role="button" tabindex="0">
      <div class="blog-cover" style="font-size:2.5rem;padding:24px;background:var(--gold-pale);text-align:center;border-radius:12px 12px 0 0;">${post.emoji || '✨'}</div>
      <div class="blog-body" style="padding:20px;">
        <span class="blog-tag" style="display:inline-block;font-size:0.75rem;font-weight:700;color:var(--gold-deep);background:var(--gold-pale);padding:3px 10px;border-radius:20px;text-transform:uppercase;margin-bottom:8px;">${post.tag || 'Novidade'}</span>
        <h3 style="font-family:'DM Serif Display',serif;font-size:1.25rem;color:var(--text-dark);margin-bottom:8px;">${post.title}</h3>
        <p style="color:var(--text-mid);font-size:0.88rem;line-height:1.5;margin-bottom:14px;">${post.excerpt}</p>
        <div class="blog-date" style="font-size:0.78rem;color:var(--text-soft);">${post.date}</div>
        <span class="blog-read-more" style="display:inline-block;margin-top:8px;font-size:0.82rem;font-weight:700;color:var(--gold-main);">Ler mais →</span>
      </div>
    </article>
  `).join('');
}

export function openBlogPost(id) {
  const posts = (catalogState.blogPosts && catalogState.blogPosts.length) ? catalogState.blogPosts : defaultBlogPosts;
  const post = posts.find(p => p.id === id);
  if (post && window.showToast) {
    window.showToast(`📰 ${post.title}`);
  }
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
  renderNovidades();
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

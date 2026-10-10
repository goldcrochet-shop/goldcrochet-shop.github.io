// Gold Crochet - Módulo de Roteamento SPA e Gestão de Histórico do Navegador
// Resolve conflitos com botão 'Voltar' do navegador (Chrome/Safari/Firefox/Mobile)

let currentRoute = { page: 'inicio', param: null };
let historyStack = ['inicio'];
let savedScrollPositions = {};

export function getRouteFromHash() {
  const hash = window.location.hash.replace(/^#\/?/, '').trim();
  if (!hash) return { page: 'inicio', param: null };

  const parts = hash.split('/');
  const page = parts[0] || 'inicio';
  const param = parts.slice(1).join('/');

  // Mapeamentos amigáveis
  if (page === 'catalogo') return { page: 'produtos', param };
  return { page, param };
}

export function setRouteHash(page, param = null, replace = false) {
  let newHash = `#/${page}`;
  if (param) newHash += `/${param}`;

  if (window.location.hash !== newHash) {
    if (replace) {
      window.location.replace(newHash);
    } else {
      window.location.hash = newHash;
    }
  }
}

export function showPage(pageId, pushHistory = true, param = null) {
  // Salva posição de scroll da página atual
  if (currentRoute && currentRoute.page) {
    savedScrollPositions[currentRoute.page] = window.scrollY;
  }

  // Fecha eventuais modais ou menus abertos
  if (window.closeMega) window.closeMega();
  if (window.closeLeftMenu) window.closeLeftMenu();

  const pages = document.querySelectorAll('.page');
  const target = document.getElementById('page-' + pageId);

  if (!target) {
    console.warn(`Página #page-${pageId} não encontrada. Redirecionando para 'inicio'.`);
    pageId = 'inicio';
  }

  pages.forEach(p => p.classList.remove('active'));
  const activeTarget = document.getElementById('page-' + pageId);
  if (activeTarget) {
    activeTarget.classList.add('active');
  }

  // Atualiza tabs da navbar
  document.querySelectorAll('#navLinks a, .mobile-bottom-nav a').forEach(a => {
    a.classList.remove('active');
  });
  const navLink = document.getElementById(`nav-${pageId}`) || 
                  document.querySelector(`[onclick*="showPage('${pageId}')"]`);
  if (navLink) navLink.classList.add('active');

  // Atualiza histórico interno
  if (currentRoute.page !== pageId) {
    historyStack.push(pageId);
    if (historyStack.length > 30) historyStack.shift();
  }

  currentRoute = { page: pageId, param: param };

  // Atualiza hash na URL se solicitado
  if (pushHistory) {
    setRouteHash(pageId, param);
  }

  // Restaura ou reseta scroll
  if (savedScrollPositions[pageId] !== undefined && pageId !== 'inicio') {
    window.scrollTo({ top: savedScrollPositions[pageId], behavior: 'auto' });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

export function openProductRoute(productOrId, pushHistory = true) {
  const allProducts = window._productsData || [];
  let p = null;
  if (typeof productOrId === 'object' && productOrId !== null) {
    p = productOrId;
  } else {
    p = allProducts.find(x => x.id === productOrId || x.slug === productOrId || String(x.id) === String(productOrId));
  }

  if (!p) {
    console.warn('Produto não encontrado:', productOrId);
    return;
  }

  const slug = p.slug || (p.name ? p.name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-') : String(p.id));
  
  // Salva a página anterior caso venha do catálogo
  const prevPage = currentRoute.page || 'produtos';
  savedScrollPositions[prevPage] = window.scrollY;

  // Renderiza detalhes do produto
  if (window.renderProductPageContent) {
    window.renderProductPageContent(p.id);
  }

  // Ativa página do produto
  showPage('produto', false, slug);

  // Se pushHistory for true, atualiza o hash para permitir voltar pelo navegador
  if (pushHistory) {
    setRouteHash('produto', slug, false);
  }
}

export function closeProductRoute() {
  // Se houver histórico do navegador com o hash anterior, usamos history.back()
  const pageProductEl = document.getElementById('page-produto');
  if (pageProductEl) {
    pageProductEl.classList.remove('active');
  }

  // Retorna para o catálogo ou para a página anterior
  const targetPage = historyStack.length > 1 ? historyStack[historyStack.length - 2] : 'produtos';
  const cleanPage = targetPage === 'produto' ? 'produtos' : targetPage;
  
  // Se o hash atual é do produto, atualiza o hash para a página limpa
  if (window.location.hash.includes('produto')) {
    setRouteHash(cleanPage, null, false);
  }
  showPage(cleanPage, false);
}

export function handlePopState(e) {
  // Chamado quando o usuário clica na seta 'Voltar' ou 'Avançar' do Chrome/navegador (ou Alt + Seta Esquerda)
  const route = getRouteFromHash();

  // 1. Se houver algum modal aberto (carrinho, favoritos, usuário, pesquisa), feche-o primeiro
  const overlays = [
    { el: document.getElementById('cartOverlay'), close: window.closeCart },
    { el: document.getElementById('favOverlay'), close: window.closeFavorites },
    { el: document.getElementById('userModalOverlay'), close: window.closeUserModal },
    { el: document.getElementById('searchOverlay'), close: window.closeSearchOverlay },
    { el: document.getElementById('modalOverlay'), close: window.closeModal }
  ];

  let closedAny = false;
  for (const item of overlays) {
    if (item.el && item.el.classList.contains('open')) {
      if (typeof item.close === 'function') item.close();
      closedAny = true;
    }
  }

  // 2. Se a rota atual no hash for um produto específico
  if (route.page === 'produto' && route.param) {
    const allProducts = window._productsData || [];
    const p = allProducts.find(x => x.slug === route.param || String(x.id) === String(route.param));
    if (p) {
      openProductRoute(p, false);
      return;
    }
  }

  // 3. Se a rota NÃO é mais produto mas a página de produto ainda estava visível, garante fechamento
  const productSection = document.getElementById('page-produto');
  if (productSection && productSection.classList.contains('active') && route.page !== 'produto') {
    productSection.classList.remove('active');
  }

  // 4. Caso normal: transiciona para a rota indicada pelo hash
  showPage(route.page, false, route.param);
}

export function initRouter() {
  window.addEventListener('popstate', handlePopState);
  window.addEventListener('hashchange', handlePopState);

  // Captura explicitamente Alt + Seta para a Esquerda e Escape para sair do produto
  window.addEventListener('keydown', (e) => {
    const isProductOpen = document.getElementById('page-produto')?.classList.contains('active');
    if (isProductOpen) {
      if ((e.altKey && e.key === 'ArrowLeft') || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeProductRoute();
      }
    }
  });

  // Verifica rota inicial ao carregar a página
  const initialRoute = getRouteFromHash();
  if (initialRoute.page === 'produto' && initialRoute.param) {
    // Será aberto após os produtos serem carregados em app.js
    window._pendingInitialProduct = initialRoute.param;
  } else if (initialRoute.page && initialRoute.page !== 'inicio') {
    showPage(initialRoute.page, false, initialRoute.param);
  } else {
    showPage('inicio', false);
  }
}

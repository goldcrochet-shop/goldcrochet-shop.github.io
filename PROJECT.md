# Project: Gold Crochet Mobile Redesign & Deep Responsiveness Optimization

## Architecture
Gold Crochet is a high-fashion crochet atelier storefront deployed on GitHub Pages.
- **Frontend Core**: Multi-page architecture (`index.html`, `pecas.html`, `colecoes.html`, `novidades.html`, `casa-gold.html`, `cliente.html`, `produtos/*.html`).
- **Shared UI Layer**: `js/shared-ui.js` dynamically renders global chrome (Header, Mobile Bottom Bar, Cart Drawer, User Drawer, Toast notifications, Favorites manager).
- **Styling Architecture**: `css/luxury-core.css` and `style.css` provide design tokens, luxury aesthetics, CSS Grid layouts, and responsive breakpoints.
- **Storage & State**: `localStorage` (`gc_cart_items_v2`, `gc_fav_items_v2`, `gold_user`) manages cart state, favorites, and user session offline.
- **Checkout Channel**: Direct WhatsApp order payload generator directed to official atelier concierge (`5531984566047`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Viewport & Zero Horizontal Overflow | Confinar transbordamento com `overflow-x: hidden; max-width: 100%` em `html, body`; eliminar overflow em botões, formulários e banners em viewports de 320px a 480px. | M1 | R1, Survey Exp 1 |
| F2 | Cabeçalho Mobile 3 Zonas Limpo | Reestruturar cabeçalho em `js/shared-ui.js` e CSS: botão hambúrguer 44px à esquerda, logo oficial centralizada, busca e sacola à direita sem encavalamento. | M1 | R1, R2, Survey Exp 1 |
| F3 | Escalonamento Tipográfico & Tokens de Cor | Tipografia fluida com `clamp()`, definição dos tokens faltantes (`--color-gold`, `--color-gold-glow`, `--color-sand`) e padronização visual orgânica. | M1 | R1, R3, Survey Exp 1 |
| F4 | Menu Lateral Mobile com Trava de Scroll | Menu drawer tátil disparado pelo hambúrguer, trava de rolagem no `body` (`overflow: hidden`), fechamento suave ao clicar em link ou backdrop. | M1 | R2, Survey Exp 2 |
| F5 | Barra Inferior Móvel & Safe Area Insets | Barra de navegação inferior (`.gc-mobile-bottom-bar`) com atalhos táteis de 44x44px, estados ativos corretos (inclusive `/produtos/`), padding de compensação no rodapé e `env(safe-area-inset-*)`. | M1 | R2, R10, Survey Exp 1, 2, 3 |
| F6 | Hero Mobile & Primeira Dobra | Hero compacto (<800px no mobile), botão pílula "Explorar Peças" sem setas (mínimo 48px de altura, `max-width: 100%`), contraste botânico nítido. | M2 | R3, Survey Exp 1 |
| F7 | Catálogo Mobile em 2 Colunas & Cartões | Grade móvel em 2 colunas (`grid-template-columns: repeat(2, minmax(0, 1fr))`), proporção de imagem 4:5, preços em preto sólido (`#000000`), sem parcelamento, favoritos no `localStorage`. | M3 | R4, Survey Exp 2, 3 |
| F8 | Carrossel com Deslize Tátil & Momentum | Carrossel em `index.html` com suporte a Pointer/Touch events, inércia, prevenção de falso clique durante o arraste (`__gcCarouselDragged`), `touch-action: pan-y` e botões de 44px. | M2 | R5, Survey Exp 2, 3 |
| F9 | Busca, Filtros & Estados Vazios | Busca instantânea com foco automático, filtros por categoria/ordenação e mensagem acolhedora de estado vazio. | M3 | R6, Survey Exp 2 |
| F10 | Detalhes do Produto & Compra Exclusiva | Páginas `produtos/*.html` com destaque para algodão sob medida e tempo de produção, botão exclusivo "Adicionar à Sacola" fixo no mobile, sem atalho avulso de WhatsApp. | M3 | R7, Survey Exp 2 |
| F11 | Sacola em 3 Estados & Checkout WhatsApp | Gaveta da sacola em 3 estados estritos: 1) vazia/deslogada com SVG + login; 2) vazia/logada sem banner; 3) com itens + botão sólido WhatsApp; trava de rolagem e altura adaptada a teclados. | M4 | R8, Survey Exp 2 |
| F12 | Performance, CLS < 0.1 & Reduced Motion | Imagens com `width`/`height`/`aspect-ratio` explícitos, `loading="lazy"`, scripts com `defer` e `@media (prefers-reduced-motion: reduce)`. | M2, M4 | R9, Survey Exp 1, 3 |
| F13 | Acessibilidade WCAG AA & Input Zoom Fix | Contraste tipográfico testado: texto ébano `#2a2210` sobre ouro (6.72:1), preços `#000000` (19:1), inputs com `font-size: 16px` para eliminar auto-zoom no Safari iOS. | M1 | R10, Survey Exp 3 |
| F14 | Metatags Completas & Cross-Device | Open Graph e Twitter Cards completos em todas as páginas, `viewport-fit=cover` no `404.html`. | M1 | R10, Survey Exp 1, 3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Fundação Responsiva, Tokens, Header, Menu & Metatags | F1, F2, F3, F4, F5, F13, F14 | none | PLANNED |
| M2 | Hero Mobile, Identidade Visual & Carrossel Touch | F6, F8, F12 (Hero/Carousel) | M1 | PLANNED |
| M3 | Catálogo em 2 Colunas, Cartões, Busca & Detalhes | F7, F9, F10 | M1 | PLANNED |
| M4 | Sacola em 3 Estados, Checkout WhatsApp & Performance | F11, F12 (Cart/Scripts) | M1, M3 | PLANNED |
| M5 | Validação Final E2E Tiers 1-4 & Hardening Tier 5 | Passagem de 100% dos testes E2E + Hardening Adversarial | M1, M2, M3, M4, TEST_READY | PLANNED |

## Interface Contracts

### Shared UI Component Contract (`js/shared-ui.js` <-> Storefront Pages)
- Header container: `.gc-header` with 3 zones:
  - Left: `.gc-header-menu-btn` (aria-label="Abrir menu de navegação", 44x44px, toggles `#gcMobileNavDrawer`).
  - Center: `.gc-logo-brand` with centered official logo image.
  - Right: `.gc-header-actions` containing search link, favorites button, and cart trigger (`#gcCartTrigger`, 44x44px).
- Mobile Drawer: `#gcMobileNavDrawer` with backdrop `.gc-drawer-backdrop`, closes on click or ESC, triggers `document.body.classList.toggle('gc-scroll-locked')`.
- Mobile Bottom Bar: `#gcMobileBar` fixed with safe-area spacing:
  - Tabs: Início (`index.html`), Coleções (`colecoes.html`), Peças (`pecas.html`), Sacola (opens `#gcCartDrawer`), Conta (`cliente.html`).
  - Active detection: maps `/produtos/` to Peças, `/index.html` or `/` to Início.
  - Tap target: min 44x44px padding/box.

### Catalog & Product Contract (`produtos/*.html` & `pecas.html` <-> `js/shared-ui.js`)
- Price format: `.gc-price-val` rendered in solid black `#000000 !important`, no installment subtitles.
- Cart action: `addToCartCurrent()` or `window.GoldCart.addItem(...)` exclusively channels into cart drawer.
- Product Card: `.gc-product-card` with `border-radius: 14px 14px 8px 8px;`, image wrapper `aspect-ratio: 4 / 5;`.

### Design Tokens & CSS Variables (`css/luxury-core.css` & `style.css`)
- `:root`:
  - `--color-gold: #cda434;`
  - `--color-gold-glow: rgba(205, 164, 52, 0.25);`
  - `--color-gold-deep: #a67c00;`
  - `--color-sand: #fdf6d6;`
  - `--color-ebony: #2a2210;`
  - `--safe-top: env(safe-area-inset-top, 0px);`
  - `--safe-bottom: env(safe-area-inset-bottom, 0px);`

## Code Layout
- `index.html`: Home storefront, hero, brand story, product carousel, testimonials, newsletter.
- `pecas.html`: Complete product catalog, search bar, category filters, empty state.
- `colecoes.html`, `novidades.html`, `casa-gold.html`, `cliente.html`, `404.html`: Core subpages.
- `produtos/*.html`: 10 individual product showcase pages.
- `css/luxury-core.css`: Master responsive stylesheet, design tokens, layout grids, components.
- `css/style.css`: Legacy theme styles and fallbacks.
- `js/shared-ui.js`: Universal runtime chrome injection (Header, Drawers, Mobile Bar, Cart, Favorites).
- `js/loader.js`: Asset and script orchestration.
- `tests/`: Automated E2E test suite (Python 3.11 + Chrome Headless CDP runner).

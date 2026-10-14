# Project: Gold Crochet — Taxonomy Synchronization, Collections & Admin Enhancements

## Architecture
Gold Crochet is a luxury crochet atelier storefront deployed on GitHub Pages.
- **Frontend Core**: Multi-page architecture (`index.html`, `pecas.html`, `colecoes.html`, `novidades.html`, `casa-gold.html`, `cliente.html`, `produtos/*.html`, `admin.html`).
- **Shared UI Layer**: `js/shared-ui.js` provides global chrome (Header, Mobile Bottom Bar, Cart Drawer, User Drawer, Toast notifications, Favorites manager, `GoldCarousel`).
- **Admin Core**: `admin.html` and `js/admin-core.js` manage catalog, collections, orders, customers, and cloud synchronization.
- **Styling Architecture**: `css/luxury-core.css`, `css/style.css`, and embedded `<style>` in `admin.html`.
- **Data & State**: `data.json`, `localStorage` (`gc_cart_items_v2`, `gc_fav_items_v2`, `gc_cached_collections`, `gc_collections_v2`, `gc_cached_products`), and optional Cloud Firestore mirror.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Canonical Taxonomy Data Model | Add `department` and `subcategory` to `data.json`, `adminState.products`, `TAXONOMY_MAP` across 5 departments and 24 subcategories. | M1 | R1, Survey Exp 1 (DONE) |
| F2 | Admin Product Form Dynamic Selects | In `#productModal` (`admin.html`), implement `<select id="prodDepartment">` and dynamic `<select id="prodSubcategory">` populated on change via `TAXONOMY_MAP`. | M1 | R1, Survey Exp 1 (DONE) |
| F3 | Customer-Facing Taxonomy Tags & Badges | Unhide `.gc-product-category` in `css/luxury-core.css`, render luxury `.gc-product-tax-badges` (`.gc-badge-dept`, `.gc-badge-subcat`) in cards across `index.html`, `novidades.html`, `colecoes.html`, `cliente.html`, `pecas.html`. | M1 | R1, Survey Exp 1 (DONE) |
| F4 | Dynamic 2-Tier Filters on `pecas.html` | Department pills + dynamic Subcategory pills with multi-criteria isolation and URL query parameter sync (`?departamento=...&subcategoria=...`). | M1 | R1, Survey Exp 1 (DONE) |
| F5 | Admin Collections Product Association UI | In `#collectionModal` (`admin.html`), add `#colProductSearchInput` and `#colProductChecklist` with interactive checkboxes, thumbnails, and quick search. | M2 | R2, Survey Exp 2 (DONE) |
| F6 | Bidirectional Collections Sync | In `js/admin-core.js`, sync `colObj.productIds` with `p.collection`/`p.collections`, persist to `gc_cached_collections` / `gc_collections_v2`, handle offline/online sync. | M2 | R2, Survey Exp 2 (DONE) |
| F7 | Continuous Infinite Circular Carousels | Fix loop math in `colecoes.html` (`scrollWidth / 3`, center start, bounds check) and unify with `window.GoldCarousel` in `js/shared-ui.js` with momentum drag and click protection. | M2 | R2, Survey Exp 2 (DONE) |
| F8 | Collections Storefront Reflection & URL Sync | Dynamic reflection of collections on `colecoes.html` and Home (`index.html`), plus catalog filtering by `?colecao=${slug}` in `pecas.html`. | M2 | R2, Survey Exp 2 (DONE) |
| F9 | Admin Suite: Quick Filters & Search Highlight | Quick filters by department, subcategory, stock status; real-time search with `<mark>` keyword highlighting in catalog, orders, customers. | M3 | R3, Survey Exp 3 |
| F10 | Admin Suite: Inventory Stats & Batch Actions | KPI stat cards (total inventory value, counts per dept, avg ticket); floating bulk actions bar (bulk delete, bulk status, bulk collection). | M3 | R3, Survey Exp 3 |
| F11 | Admin Suite: Quick View & Enhanced Orders | Quick View product modal without leaving table; Order details with customer info, items, address, and 1-click WhatsApp concierge link. | M3 | R3, Survey Exp 3 |
| F12 | Admin Suite: Shortcuts, Badges, Toasts & Table Utils | Global shortcuts (Ctrl+K, Esc, Ctrl+S); gold shimmer badges; luxury toast notifications with undo; table column sort and export tools (50 items total). | M3 | R3, Survey Exp 3 |
| F13 | E2E Testing, Syntax Validation & Git Push | Update and pass E2E tests, verify `node --check` 0 errors on all JS, git commit and push to `goldcrochet-shop.github.io`. | M4 | AC, Survey Exp 1-3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Sincronização de Taxonomia de Produtos (Admin & Vitrine) | F1, F2, F3, F4 | none | DONE |
| M2 | Gestão de Coleções no Admin & Carrosséis Infinitos Circulares | F5, F6, F7, F8 | M1 | DONE |
| M3 | Suíte de 50 Melhorias Utilitárias e Visuais no Admin | F9, F10, F11, F12 | M1, M2 | DONE |
| M4 | Validação E2E, Verificação de Sintaxe & Git Push | F13 | M1, M2, M3 | DONE |

## Code Layout
- `admin.html`: Admin layout, modals (`#productModal`, `#collectionModal`, `#quickViewModal`, `#orderDetailModal`), quick filters, stats.
- `js/admin-core.js`: Admin reactive state, taxonomy mapping, product/collection CRUD, 50 enhancements, keyboard shortcuts, exports.
- `colecoes.html`: Storefront collections view, infinite circular loop carousels.
- `index.html`: Storefront Home, featured carousel, dynamic collections carousels.
- `pecas.html`: Storefront catalog with `?colecao=${slug}` filter support.
- `js/shared-ui.js`: Universal UI chrome, `window.GoldCarousel.setup`.
- `tests/`: Automated E2E test runner (`tests/test_taxonomy_collections_admin.py`).

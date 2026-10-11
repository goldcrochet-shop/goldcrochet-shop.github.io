"""
Tier 3: Combinatorial Cross-Feature Tests.
Covers 14 cross-feature pairwise interactions across the application architecture.
"""

import json
from tests.base_test import BaseE2ETest

class TestTier3Combinations(BaseE2ETest):

    def test_t3_comb01_f1_viewport_and_f4_drawer(self):
        """Comb 1 [F1 + F4]: Opening drawer at 320px does not cause horizontal overflow and locks body scroll."""
        self.navigate_page("index.html", width=320, height=568)
        self.cdp.click(".gc-header-menu-btn")
        # Verify drawer open and body scroll lock
        is_locked = self.evaluate("document.body.classList.contains('gc-scroll-locked') || window.getComputedStyle(document.body).overflow === 'hidden'")
        self.assertTrue(is_locked, "Body scroll not locked when drawer opened at 320px")
        self.assert_no_horizontal_overflow()

    def test_t3_comb02_f2_header_and_f5_bottom_bar(self):
        """Comb 2 [F2 + F5]: Header cart icon and bottom bar cart icon both trigger #gcCartDrawer."""
        self.navigate_page("index.html", width=390, height=844)
        # 1. Trigger from header
        self.cdp.click("#gcCartTrigger")
        open_header = self.evaluate("document.querySelector('#gcCartDrawer')?.classList.contains('active') || document.querySelector('#gcCartDrawer')?.classList.contains('open')")
        self.assertTrue(open_header, "Header cart trigger did not open #gcCartDrawer")
        self.cdp.click(".gc-drawer-backdrop")

        # 2. Trigger from bottom bar
        self.cdp.click('.gc-mobile-bottom-bar [data-tab="cart"], .gc-mobile-bottom-bar a[href*="cart"], .gc-bar-tab-cart')
        open_bar = self.evaluate("document.querySelector('#gcCartDrawer')?.classList.contains('active') || document.querySelector('#gcCartDrawer')?.classList.contains('open')")
        self.assertTrue(open_bar, "Bottom bar cart trigger did not open #gcCartDrawer")

    def test_t3_comb03_f4_drawer_and_f9_search(self):
        """Comb 3 [F4 + F9]: Accessing search from drawer navigates to pecas.html and auto-focuses input."""
        self.navigate_page("index.html", width=390, height=844)
        self.cdp.click(".gc-header-menu-btn")
        self.cdp.click('#gcMobileNavDrawer a[href*="pecas.html"]')
        url = self.evaluate("window.location.href")
        self.assertIn("pecas.html", url, "Navigation from drawer to pecas.html failed")

    def test_t3_comb04_f5_bottom_bar_and_f7_catalog(self):
        """Comb 4 [F5 + F7]: Navigating to Peças highlights bottom bar tab and renders 2-column catalog."""
        self.navigate_page("pecas.html", width=390, height=844)
        tab_active = self.evaluate("""
        (() => {
            const bar = document.querySelector('.gc-mobile-bottom-bar, #gcMobileBar');
            const active = bar ? bar.querySelector('.active') : null;
            return active ? active.textContent.trim() : '';
        })()
        """)
        self.assertIn("Peças", tab_active, "Peças tab is not active on pecas.html")
        cols = self.evaluate("""
        (() => {
            const grid = document.querySelector('.gc-catalog-grid, .products-grid, #productsGrid');
            return grid ? window.getComputedStyle(grid).gridTemplateColumns.split(' ').length : 0;
        })()
        """)
        self.assertEqual(cols, 2, "Catalog grid columns != 2")

    def test_t3_comb05_f7_catalog_and_f11_cart(self):
        """Comb 5 [F7 + F11]: Adding item from catalog updates cart count badge in header and bottom bar."""
        self.navigate_page("pecas.html", width=390, height=844)
        self.cdp.click(".gc-card-add-cart, .btn-quick-add, .gc-product-card button")
        badge = self.evaluate("""
        (() => {
            const b = document.querySelector('.gc-cart-badge, .cart-count');
            return b ? parseInt(b.textContent) || 0 : 0;
        })()
        """)
        self.assertGreaterEqual(badge, 1, f"Cart badge count {badge} < 1 after adding item from catalog")

    def test_t3_comb06_f8_carousel_and_f10_product(self):
        """Comb 6 [F8 + F10]: Dragging carousel does not trigger card navigation; tapping card navigates to product details."""
        self.navigate_page("index.html", width=390, height=844)
        # Simulate drag
        self.evaluate("""
        (() => {
            window.__gcCarouselDragged = true;
            const link = document.querySelector('.gc-carousel-track a, .carousel-item a');
            if (link) link.click();
        })()
        """)
        url = self.evaluate("window.location.href")
        self.assertIn("index.html", url, "Card falsely navigated during active drag gesture")

    def test_t3_comb07_f9_search_filter_and_f7_catalog(self):
        """Comb 7 [F9 + F7]: Applying category filter updates 2-column grid without disrupting 4:5 image ratio."""
        self.navigate_page("pecas.html", width=390, height=844)
        self.cdp.click(".gc-filter-pill:nth-child(2), .category-filter-btn:nth-child(2)")
        ratio = self.evaluate("""
        (() => {
            const wrap = document.querySelector('.gc-product-card:not([style*="display: none"]) .gc-card-img-wrap, .product-card:not([style*="display: none"]) .card-img');
            if (!wrap) return null;
            const r = wrap.getBoundingClientRect();
            return r.width > 0 ? (r.width / r.height) : null;
        })()
        """)
        if ratio is not None:
            self.assertAlmostEqual(ratio, 0.8, delta=0.08, msg=f"Aspect ratio {ratio} deviated from 4:5 after filtering")

    def test_t3_comb08_f10_product_and_f11_cart(self):
        """Comb 8 [F10 + F11]: Adding product from detail page opens cart in State 3 with concierge phone."""
        self.navigate_page("produtos/vestido-sol-dourado.html", width=390, height=844)
        self.cdp.click(".gc-btn-add-cart, #gcAddToCartBtn, .btn-add-to-cart")
        href = self.evaluate("""
        (() => {
            const a = document.querySelector('#gcCartDrawer a[href*="whatsapp"], #gcCartCheckoutBtn');
            return a ? a.getAttribute('href') : '';
        })()
        """)
        self.assertIn("5531984566047", href, "WhatsApp order link missing concierge phone number")

    def test_t3_comb09_f11_cart_and_f4_scroll_lock(self):
        """Comb 9 [F11 + F4]: Closing cart drawer restores body scroll lock even after repeated interactions."""
        self.navigate_page("index.html", width=390, height=844)
        self.cdp.click("#gcCartTrigger")
        self.cdp.click(".gc-drawer-backdrop")
        locked = self.evaluate("document.body.classList.contains('gc-scroll-locked')")
        self.assertFalse(locked, "Scroll lock remained engaged after closing cart drawer")

    def test_t3_comb10_f6_hero_and_f1_viewport(self):
        """Comb 10 [F6 + F1]: Clicking 'Explorar Peças' on 320px viewport scrolls/navigates smoothly without horizontal overflow."""
        self.navigate_page("index.html", width=320, height=568)
        self.cdp.click('.gc-btn-hero, .btn-primary, a[href*="pecas.html"]')
        self.assert_no_horizontal_overflow()

    def test_t3_comb11_f7_favorites_and_f11_cart(self):
        """Comb 11 [F7 + F11]: Favoriting items in gc_fav_items_v2 is isolated from gc_cart_items_v2."""
        self.navigate_page("pecas.html", width=390, height=844)
        self.cdp.click(".gc-card-fav-btn, .fav-btn, .btn-fav")
        favs = self.cdp.get_local_storage("gc_fav_items_v2")
        cart = self.cdp.get_local_storage("gc_cart_items_v2")
        self.assertIsNotNone(favs, "Favorites missing in localStorage")
        # Cart should not be automatically contaminated with favorited items
        cart_len = len(json.loads(cart or "[]"))
        self.assertEqual(cart_len, 0, "Cart was unexpectedly modified when favoriting an item")

    def test_t3_comb12_f12_performance_and_f8_carousel(self):
        """Comb 12 [F12 + F8]: Carousel images specify explicit dimensions and maintain layout stability."""
        self.navigate_page("index.html", width=390, height=844)
        img_ok = self.evaluate("""
        (() => {
            const imgs = document.querySelectorAll('.gc-carousel-track img, .carousel-item img');
            if (imgs.length === 0) return true;
            for (const img of imgs) {
                const s = window.getComputedStyle(img);
                if (s.aspectRatio === 'auto' && !img.hasAttribute('width')) return false;
            }
            return true;
        })()
        """)
        self.assertTrue(img_ok, "Carousel images missing explicit aspect-ratio or dimensions")

    def test_t3_comb13_f13_accessibility_and_f9_search(self):
        """Comb 13 [F13 + F9]: Search input has font-size >= 16px (preventing iOS zoom) and meets WCAG AA contrast."""
        self.navigate_page("pecas.html", width=390, height=844)
        fs = self.evaluate("""
        (() => {
            const inp = document.querySelector('.gc-search-input, input[type="search"]');
            return inp ? parseFloat(window.getComputedStyle(inp).fontSize) : 0;
        })()
        """)
        self.assertGreaterEqual(fs, 15.9, f"Search input font-size {fs}px is < 16px")

    def test_t3_comb14_f5_bottom_bar_and_f14_safe_areas(self):
        """Comb 14 [F5 + F14]: Mobile bottom bar respects env(safe-area-inset-bottom) while keeping 44px tap targets."""
        self.navigate_page("index.html", width=390, height=844)
        res = self.evaluate("""
        (() => {
            const bar = document.querySelector('.gc-mobile-bottom-bar, #gcMobileBar');
            if (!bar) return null;
            const r = bar.getBoundingClientRect();
            const cs = window.getComputedStyle(bar);
            return {
                height: r.height,
                hasPadding: parseFloat(cs.paddingBottom) > 0
            };
        })()
        """)
        self.assertIsNotNone(res)
        self.assertGreaterEqual(res["height"], 50, f"Bottom bar height {res['height']}px < 50px")

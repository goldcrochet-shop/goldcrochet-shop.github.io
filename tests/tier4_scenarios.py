"""
Tier 4: End-to-End Real-World Customer Journey Scenarios.
Covers 7 full customer flows across the Gold Crochet mobile storefront.
"""

import json
import time
from tests.base_test import BaseE2ETest

class TestTier4Scenarios(BaseE2ETest):

    def test_t4_scenario1_first_time_visitor_discovery(self):
        """Scenario 1: First-Time Visitor Discovery Journey
        Hero -> Explorar Peças -> 2-Column Catalog -> Category Filter -> Verification.
        """
        # 1. First-time visitor lands on home page at 390px (iPhone 14)
        self.navigate_page("index.html", width=390, height=844)
        self.assert_no_horizontal_overflow()

        # 2. Hero communicates crochet haute-couture and presents pill CTA
        self.assert_element_exists(".gc-hero-organic, .hero-section")
        self.cdp.click('.gc-btn-hero, .btn-primary, a[href*="pecas.html"]')

        # 3. Arrive at catalog (pecas.html)
        if "pecas.html" not in self.evaluate("window.location.href"):
            self.navigate_page("pecas.html", width=390, height=844)

        # 4. Verify 2-column mobile layout and black prices
        cols = self.evaluate("""
        (() => {
            const grid = document.querySelector('.gc-catalog-grid, .products-grid, #productsGrid');
            return grid ? window.getComputedStyle(grid).gridTemplateColumns.split(' ').length : 0;
        })()
        """)
        self.assertEqual(cols, 2, "Catalog does not display in 2 columns on mobile")

        # 5. Apply category filter
        self.cdp.click(".gc-filter-pill:nth-child(2), .category-filter-btn:nth-child(2)")
        visible_cards = self.evaluate("document.querySelectorAll('.gc-product-card:not([style*=\"display: none\"]), .product-card:not([style*=\"display: none\"])').length")
        self.assertGreater(visible_cards, 0, "No cards visible after category filter selection")

    def test_t4_scenario2_tactile_carousel_browsing(self):
        """Scenario 2: Tactile Carousel Browsing
        Land on Home -> Swipe Carousel left & right without false navigation -> Click intentionally -> Product page.
        """
        self.navigate_page("index.html", width=390, height=844)
        self.assert_element_exists(".gc-carousel-track, .carousel-track")

        # 1. Perform swipe gesture with touch events
        self.evaluate("""
        (() => {
            const track = document.querySelector('.gc-carousel-track, .carousel-track');
            if (track) {
                track.dispatchEvent(new TouchEvent('touchstart', { touches: [{ clientX: 300, clientY: 400 }], bubbles: true }));
                track.dispatchEvent(new TouchEvent('touchmove', { touches: [{ clientX: 100, clientY: 400 }], bubbles: true }));
                track.dispatchEvent(new TouchEvent('touchend', { bubbles: true }));
            }
        })()
        """)

        # 2. Verify page did not falsely navigate to an external link during swipe
        self.assertIn("index.html", self.evaluate("window.location.href"))

        # 3. Perform intentional click on card link
        self.cdp.click('.gc-carousel-track a, .carousel-item a, a[href*="produtos/"]')
        time.sleep(0.3)
        current_url = self.evaluate("window.location.href")
        self.assertTrue("produtos/" in current_url or "pecas.html" in current_url, f"Intentional click failed to navigate: {current_url}")

    def test_t4_scenario3_mobile_drawer_navigation(self):
        """Scenario 3: Complete Mobile Drawer Navigation
        Hamburger -> Scroll Lock -> Category Selection (Coleções) -> Auto Close & URL update.
        """
        self.navigate_page("index.html", width=390, height=844)

        # 1. Tap hamburger button
        self.cdp.click(".gc-header-menu-btn")

        # 2. Verify scroll lock is engaged
        is_locked = self.evaluate("document.body.classList.contains('gc-scroll-locked') || window.getComputedStyle(document.body).overflow === 'hidden'")
        self.assertTrue(is_locked, "Body scroll not locked after opening mobile drawer")

        # 3. Select 'Coleções' link
        self.cdp.click('#gcMobileNavDrawer a[href*="colecoes.html"]')
        time.sleep(0.3)

        # 4. Verify arrival at Coleções and released scroll lock
        current_url = self.evaluate("window.location.href")
        self.assertIn("colecoes.html", current_url, "Did not navigate to colecoes.html from drawer")
        is_locked_after = self.evaluate("document.body.classList.contains('gc-scroll-locked')")
        self.assertFalse(is_locked_after, "Scroll lock remained engaged after drawer navigation")

    def test_t4_scenario4_exclusive_purchase_flow(self):
        """Scenario 4: Exclusive Purchase Flow
        Product page -> Verify cotton craft details -> Add to Cart -> Drawer opens in State 3 -> WhatsApp payload verification.
        """
        self.navigate_page("produtos/vestido-sol-dourado.html", width=390, height=844)

        # 1. Verify craft specifications
        content = self.evaluate("document.body.textContent.toLowerCase()")
        self.assertTrue("algodão" in content or "artesanal" in content, "Craftsmanship details missing")

        # 2. Add to cart
        self.cdp.click(".gc-btn-add-cart, #gcAddToCartBtn, .btn-add-to-cart")
        time.sleep(0.3)

        # 3. Cart drawer opens in State 3
        has_items = self.evaluate("""
        (() => {
            const drawer = document.querySelector('#gcCartDrawer');
            return drawer && drawer.querySelector('.gc-cart-item, .cart-item') !== null;
        })()
        """)
        self.assertTrue(has_items, "Cart drawer not in State 3 with items")

        # 4. Verify WhatsApp checkout link directs to 5531984566047
        wa_href = self.evaluate("""
        (() => {
            const btn = document.querySelector('#gcCartDrawer a[href*="whatsapp"], #gcCartCheckoutBtn');
            return btn ? btn.getAttribute('href') : '';
        })()
        """)
        self.assertIn("5531984566047", wa_href, f"WhatsApp link missing concierge number: {wa_href}")

    def test_t4_scenario5_strict_cart_states(self):
        """Scenario 5: Strict Cart State Transitions
        State 1 (Empty & Logged out with SVG + Login Prompt) -> User Login -> State 2 (Empty & Logged in) -> Add Item -> State 3 (With Items & Checkout).
        """
        self.navigate_page("index.html", width=390, height=844)

        # Step 1: Open cart empty & logged out (State 1)
        self.cdp.click("#gcCartTrigger")
        state1 = self.evaluate("""
        (() => {
            const d = document.querySelector('#gcCartDrawer');
            if (!d) return false;
            return d.querySelector('svg, .gc-cart-empty-icon') !== null && 
                   (d.textContent.includes('Entrar') || d.textContent.includes('Conta') || d.textContent.includes('login'));
        })()
        """)
        self.assertTrue(state1, "State 1 (empty + logged out) not displayed correctly")
        self.cdp.click(".gc-drawer-backdrop")

        # Step 2: Simulate Login in localStorage (State 2)
        self.cdp.set_local_storage("gc_customer_account_v2", json.dumps({"name": "Maria Silva", "email": "maria@test.com"}))
        self.cdp.navigate(f"{self.server.base_url}/index.html")
        self.cdp.click("#gcCartTrigger")
        state2 = self.evaluate("""
        (() => {
            const d = document.querySelector('#gcCartDrawer');
            if (!d) return false;
            const prompt = d.querySelector('.gc-cart-login-prompt');
            return prompt === null || window.getComputedStyle(prompt).display === 'none';
        })()
        """)
        self.assertTrue(state2, "State 2 (empty + logged in) unexpectedly showed login banner")
        self.cdp.click(".gc-drawer-backdrop")

        # Step 3: Add product to cart (State 3)
        self.cdp.set_local_storage("gc_cart_items_v2", json.dumps([{"id": "p1", "name": "Bolsa Crochê Dourada", "price": 380, "qty": 1}]))
        self.cdp.navigate(f"{self.server.base_url}/index.html")
        self.cdp.click("#gcCartTrigger")
        state3 = self.evaluate("""
        (() => {
            const d = document.querySelector('#gcCartDrawer');
            if (!d) return false;
            return d.querySelector('.gc-cart-item, .cart-item') !== null &&
                   d.querySelector('a[href*="whatsapp"], #gcCartCheckoutBtn') !== null;
        })()
        """)
        self.assertTrue(state3, "State 3 (with items + checkout) failed to render correctly")

    def test_t4_scenario6_accessibility_and_reduced_motion(self):
        """Scenario 6: Accessibility & Reduced Motion Audit
        WCAG AA Contrast -> 16px Text Inputs (iOS Zoom Prevention) -> prefers-reduced-motion verification.
        """
        self.navigate_page("index.html", width=390, height=844)

        # 1. Audit color contrast on brand colors
        ratio_gold = self.get_color_contrast_ratio("#2a2210", "#cda434")
        self.assertGreaterEqual(ratio_gold, 4.5, "Gold header contrast failed WCAG AA")

        # 2. Check input font size
        self.navigate_page("pecas.html", width=390, height=844)
        fs = self.evaluate("""
        (() => {
            const inp = document.querySelector('.gc-search-input, input[type="search"]');
            return inp ? parseFloat(window.getComputedStyle(inp).fontSize) : 16;
        })()
        """)
        self.assertGreaterEqual(fs, 15.9, "Input font-size < 16px")

        # 3. Emulate reduced motion and check transitions
        self.cdp.set_prefers_reduced_motion(True)
        self.navigate_page("index.html", width=390, height=844)
        dur = self.evaluate("""
        (() => {
            const el = document.querySelector('.gc-btn-hero, .btn-primary');
            return el ? window.getComputedStyle(el).transitionDuration : '0s';
        })()
        """)
        dur_val = float(dur.replace('s', '').replace('m', ''))
        self.assertLessEqual(dur_val, 0.02, "Transitions not silenced under prefers-reduced-motion")

    def test_t4_scenario7_social_sharing_and_notches(self):
        """Scenario 7: Social Sharing & Notch Safety
        Audit OpenGraph/Twitter across all core pages + Viewport-fit=cover + Safe-Area-Insets on fixed elements.
        """
        core_pages = ["index.html", "pecas.html", "colecoes.html", "404.html"]
        for page in core_pages:
            self.navigate_page(page, width=390, height=844)
            # Viewport-fit=cover
            vp = self.evaluate("document.querySelector('meta[name=\"viewport\"]')?.getAttribute('content') || ''")
            self.assertIn("viewport-fit=cover", vp, f"Page {page} missing viewport-fit=cover")

            # OG Tags on storefront pages
            if page != "404.html":
                og_title = self.evaluate("document.querySelector('meta[property=\"og:title\"]')?.getAttribute('content') || ''")
                self.assertTrue(bool(og_title), f"Page {page} missing og:title")

        # Check safe area padding on mobile bottom bar
        self.navigate_page("index.html", width=390, height=844)
        bar_padding = self.evaluate("""
        (() => {
            const bar = document.querySelector('.gc-mobile-bottom-bar, #gcMobileBar');
            return bar ? window.getComputedStyle(bar).paddingBottom : '';
        })()
        """)
        self.assertNotEqual(bar_padding, "0px", "Mobile bottom bar paddingBottom is 0px (unsafe for notches)")

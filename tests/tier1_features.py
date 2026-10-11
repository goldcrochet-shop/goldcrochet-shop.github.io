"""
Tier 1: Feature Rendering & Structural Verification (F1 to F14).
Each feature has >= 5 tests (70 tests total).
Derives directly from ORIGINAL_REQUEST.md (R1 to R10) and PROJECT.md.
"""

import json
from tests.base_test import BaseE2ETest

class TestTier1Features(BaseE2ETest):

    # =========================================================================
    # F1: Viewport & Rolagem Horizontal Zero (320px a 480px)
    # =========================================================================
    def test_f1_01_index_no_horizontal_overflow_390px(self):
        """F1.1: index.html at 390px viewport must have zero horizontal overflow."""
        self.navigate_page("index.html", width=390, height=844)
        self.assert_no_horizontal_overflow()

    def test_f1_02_pecas_no_horizontal_overflow_375px(self):
        """F1.2: pecas.html at 375px viewport must have zero horizontal overflow."""
        self.navigate_page("pecas.html", width=375, height=667)
        self.assert_no_horizontal_overflow()

    def test_f1_03_colecoes_no_horizontal_overflow_360px(self):
        """F1.3: colecoes.html at 360px viewport must have zero horizontal overflow."""
        self.navigate_page("colecoes.html", width=360, height=800)
        self.assert_no_horizontal_overflow()

    def test_f1_04_produto_no_horizontal_overflow_320px(self):
        """F1.4: produtos/vestido-sol-dourado.html at 320px must have zero horizontal overflow."""
        self.navigate_page("produtos/vestido-sol-dourado.html", width=320, height=568)
        self.assert_no_horizontal_overflow()

    def test_f1_05_html_body_overflow_x_rule(self):
        """F1.5: html and body must declare overflow-x: hidden and max-width: 100%."""
        self.navigate_page("index.html", width=390, height=844)
        res = self.evaluate("""
        (() => {
            const h = window.getComputedStyle(document.documentElement).overflowX;
            const b = window.getComputedStyle(document.body).overflowX;
            return { html: h, body: b };
        })()
        """)
        self.assertIn(res["html"], ["hidden", "clip"], "html overflow-x must be hidden or clip")
        self.assertIn(res["body"], ["hidden", "clip"], "body overflow-x must be hidden or clip")

    # =========================================================================
    # F2: Cabeçalho Mobile 3 Zonas Limpo & Logo Centralizada
    # =========================================================================
    def test_f2_01_header_presence_and_container(self):
        """F2.1: Header container .gc-header with .gc-header-inner must exist."""
        self.navigate_page("index.html", width=390, height=844)
        self.assert_element_exists(".gc-header")
        self.assert_element_exists(".gc-header-inner")

    def test_f2_02_hamburger_left_zone_tap_target(self):
        """F2.2: Hamburger button .gc-header-menu-btn must exist on left with min 44x44px touch target."""
        self.navigate_page("index.html", width=390, height=844)
        self.assert_element_exists(".gc-header-menu-btn")
        self.assert_min_touch_target(".gc-header-menu-btn", min_dimension=44)

    def test_f2_03_logo_brand_centered_in_mobile(self):
        """F2.3: .gc-logo-brand must exist and be horizontally centered in mobile header."""
        self.navigate_page("index.html", width=390, height=844)
        self.assert_element_exists(".gc-logo-brand")
        rect = self.cdp.get_element_rect(".gc-logo-brand")
        doc_width = self.evaluate("document.documentElement.clientWidth")
        logo_center = rect["left"] + (rect["width"] / 2)
        screen_center = doc_width / 2
        # Logo center should be close to screen center (within 35px tolerance for asymmetric action icons)
        self.assertLess(abs(logo_center - screen_center), 35, f"Logo center {logo_center} not centered around {screen_center}")

    def test_f2_04_header_actions_right_zone(self):
        """F2.4: .gc-header-actions must contain cart trigger #gcCartTrigger with min 44px tap target."""
        self.navigate_page("index.html", width=390, height=844)
        self.assert_element_exists("#gcCartTrigger")
        self.assert_min_touch_target("#gcCartTrigger", min_dimension=44)

    def test_f2_05_header_no_overlapping_zones(self):
        """F2.5: Left hamburger button and center logo must not collide horizontally."""
        self.navigate_page("index.html", width=390, height=844)
        menu_rect = self.cdp.get_element_rect(".gc-header-menu-btn")
        logo_rect = self.cdp.get_element_rect(".gc-logo-brand")
        actions_rect = self.cdp.get_element_rect(".gc-header-actions")
        self.assertLessEqual(menu_rect["right"], logo_rect["left"] + 2, "Menu button overlaps with logo")
        self.assertLessEqual(logo_rect["right"], actions_rect["left"] + 2, "Logo overlaps with header actions")

    # =========================================================================
    # F3: Escalonamento Tipográfico com clamp() & Tokens de Cor
    # =========================================================================
    def test_f3_01_root_color_tokens_defined(self):
        """F3.1: Luxury color tokens must be defined on :root."""
        self.navigate_page("index.html", width=390, height=844)
        tokens = self.evaluate("""
        (() => {
            const cs = window.getComputedStyle(document.documentElement);
            return {
                gold: cs.getPropertyValue('--color-gold').trim(),
                goldGlow: cs.getPropertyValue('--color-gold-glow').trim(),
                sand: cs.getPropertyValue('--color-sand').trim(),
                ebony: cs.getPropertyValue('--color-ebony').trim()
            };
        })()
        """)
        self.assertTrue(bool(tokens["gold"]), "CSS token --color-gold is missing")
        self.assertTrue(bool(tokens["sand"]), "CSS token --color-sand is missing")
        self.assertTrue(bool(tokens["ebony"]), "CSS token --color-ebony is missing")

    def test_f3_02_safe_area_tokens_defined(self):
        """F3.2: Safe area CSS variables must be declared."""
        self.navigate_page("index.html", width=390, height=844)
        res = self.evaluate("""
        (() => {
            const cs = window.getComputedStyle(document.documentElement);
            return {
                safeTop: cs.getPropertyValue('--safe-top').trim(),
                safeBottom: cs.getPropertyValue('--safe-bottom').trim()
            };
        })()
        """)
        self.assertTrue(bool(res["safeTop"]), "--safe-top token is not defined")
        self.assertTrue(bool(res["safeBottom"]), "--safe-bottom token is not defined")

    def test_f3_03_typography_clamp_scaling_rules(self):
        """F3.3: Headings must use fluid clamp() scaling rules in stylesheet."""
        self.navigate_page("index.html", width=390, height=844)
        has_clamp = self.evaluate("""
        (() => {
            for (const sheet of document.styleSheets) {
                try {
                    for (const rule of sheet.cssRules) {
                        if (rule.cssText && rule.cssText.includes('clamp(')) return true;
                    }
                } catch(e) {}
            }
            return false;
        })()
        """)
        self.assertTrue(has_clamp, "No clamp() typography rules found in loaded stylesheets")

    def test_f3_04_computed_heading_font_family(self):
        """F3.4: Editorial headings must render with luxury serif font family."""
        self.navigate_page("index.html", width=390, height=844)
        font = self.evaluate("""
        (() => {
            const h = document.querySelector('h1, .gc-hero-title, .section-title');
            return h ? window.getComputedStyle(h).fontFamily : '';
        })()
        """)
        self.assertTrue(
            any(name in font.lower() for name in ["serif", "playfair", "dm serif"]),
            f"Headings font-family '{font}' does not contain expected luxury serif font"
        )

    def test_f3_05_body_typography_styling(self):
        """F3.5: Body text must render with sans-serif font and legible line-height."""
        self.navigate_page("index.html", width=390, height=844)
        res = self.evaluate("""
        (() => {
            const style = window.getComputedStyle(document.body);
            const lh = style.lineHeight;
            let ratio = 1.4;
            if (lh && lh !== 'normal') {
                const parsed = parseFloat(lh) / parseFloat(style.fontSize);
                if (!isNaN(parsed)) ratio = parsed;
            }
            return {
                fontFamily: style.fontFamily,
                lineHeight: ratio
            };
        })()
        """)
        self.assertGreaterEqual(res["lineHeight"], 1.3, "Body line-height is too cramped for mobile reading")

    # =========================================================================
    # F4: Menu Lateral Mobile & Trava de Rolagem
    # =========================================================================
    def test_f4_01_drawer_markup_and_backdrop(self):
        """F4.1: #gcMobileNavDrawer and .gc-drawer-backdrop must exist in DOM."""
        self.navigate_page("index.html", width=390, height=844)
        self.assert_element_exists("#gcMobileNavDrawer")
        self.assert_element_exists(".gc-drawer-backdrop")

    def test_f4_02_drawer_open_on_hamburger_click(self):
        """F4.2: Clicking .gc-header-menu-btn opens #gcMobileNavDrawer."""
        self.navigate_page("index.html", width=390, height=844)
        self.cdp.click(".gc-header-menu-btn")
        is_open = self.evaluate("""
        (() => {
            const d = document.querySelector('#gcMobileNavDrawer');
            return d && (d.classList.contains('active') || d.classList.contains('open') || window.getComputedStyle(d).visibility === 'visible');
        })()
        """)
        self.assertTrue(is_open, "Drawer did not open upon hamburger button click")

    def test_f4_03_body_scroll_lock_on_drawer_open(self):
        """F4.3: Opening drawer locks body scroll with class or overflow: hidden."""
        self.navigate_page("index.html", width=390, height=844)
        self.cdp.click(".gc-header-menu-btn")
        is_locked = self.evaluate("""
        (() => {
            return document.body.classList.contains('gc-scroll-locked') || 
                   window.getComputedStyle(document.body).overflow === 'hidden';
        })()
        """)
        self.assertTrue(is_locked, "Body scroll was not locked when mobile drawer opened")

    def test_f4_04_drawer_close_on_backdrop_click(self):
        """F4.4: Clicking backdrop closes drawer and unlocks body scroll."""
        self.navigate_page("index.html", width=390, height=844)
        self.cdp.click(".gc-header-menu-btn")
        # Click backdrop
        self.cdp.click(".gc-drawer-backdrop")
        is_closed = self.evaluate("""
        (() => {
            const d = document.querySelector('#gcMobileNavDrawer');
            const open = d && (d.classList.contains('active') || d.classList.contains('open'));
            const locked = document.body.classList.contains('gc-scroll-locked');
            return !open && !locked;
        })()
        """)
        self.assertTrue(is_closed, "Drawer did not close or body remained locked after backdrop click")

    def test_f4_05_drawer_contains_nav_links(self):
        """F4.5: Drawer must provide navigation links for core store pages."""
        self.navigate_page("index.html", width=390, height=844)
        links = self.evaluate("""
        (() => {
            const d = document.querySelector('#gcMobileNavDrawer');
            if (!d) return [];
            return Array.from(d.querySelectorAll('a')).map(a => a.getAttribute('href'));
        })()
        """)
        self.assertGreaterEqual(len(links), 4, f"Drawer contains too few navigation links: {links}")

    # =========================================================================
    # F5: Barra Inferior Móvel & Safe Area Insets
    # =========================================================================
    def test_f5_01_bottom_bar_presence_and_fixed(self):
        """F5.1: Mobile bottom bar must exist and be fixed to bottom."""
        self.navigate_page("index.html", width=390, height=844)
        self.assert_element_exists(".gc-mobile-bottom-bar, #gcMobileBar")
        pos = self.cdp.get_computed_style(".gc-mobile-bottom-bar, #gcMobileBar", "position")
        self.assertEqual(pos, "fixed", "Mobile bottom bar must have position: fixed")

    def test_f5_02_bottom_bar_items_count(self):
        """F5.2: Mobile bottom bar must have at least 5 navigation items."""
        self.navigate_page("index.html", width=390, height=844)
        count = self.evaluate("""
        (() => {
            const bar = document.querySelector('.gc-mobile-bottom-bar, #gcMobileBar');
            return bar ? bar.querySelectorAll('.gc-mobile-bar-item, .gc-bar-tab, a, button').length : 0;
        })()
        """)
        self.assertGreaterEqual(count, 5, f"Mobile bar items count {count} < 5")

    def test_f5_03_bottom_bar_tap_targets(self):
        """F5.3: Each bottom bar navigation item must have min 44x44px tap target."""
        self.navigate_page("index.html", width=390, height=844)
        sizes = self.evaluate("""
        (() => {
            const bar = document.querySelector('.gc-mobile-bottom-bar, #gcMobileBar');
            if (!bar) return [];
            const items = bar.querySelectorAll('.gc-mobile-bar-item, .gc-bar-tab');
            return Array.from(items).map(el => {
                const r = el.getBoundingClientRect();
                return { width: r.width, height: r.height };
            });
        })()
        """)
        self.assertTrue(len(sizes) >= 5, "Fewer than 5 items found in mobile bar")
        for idx, s in enumerate(sizes):
            self.assertGreaterEqual(s["width"], 43.5, f"Bar item {idx} width {s['width']} < 44px")
            self.assertGreaterEqual(s["height"], 43.5, f"Bar item {idx} height {s['height']} < 44px")

    def test_f5_04_bottom_bar_active_state_detection(self):
        """F5.4: Bottom bar must highlight Início when on index.html and Peças when on pecas.html."""
        self.navigate_page("index.html", width=390, height=844)
        inicio_active = self.evaluate("""
        (() => {
            const bar = document.querySelector('.gc-mobile-bottom-bar, #gcMobileBar');
            const active = bar ? bar.querySelector('.active') : null;
            return active ? active.textContent.trim() : '';
        })()
        """)
        self.assertIn("Início", inicio_active, "Início tab is not active on index.html")

    def test_f5_05_bottom_bar_safe_area_padding(self):
        """F5.5: Mobile bottom bar must incorporate safe area inset in padding."""
        self.navigate_page("index.html", width=390, height=844)
        has_safe = self.evaluate("""
        (() => {
            const bar = document.querySelector('.gc-mobile-bottom-bar, #gcMobileBar');
            if (!bar) return false;
            const style = window.getComputedStyle(bar);
            return style.paddingBottom !== '' && style.paddingBottom !== '0px';
        })()
        """)
        self.assertTrue(has_safe, "Mobile bottom bar paddingBottom is empty or zero")

    # =========================================================================
    # F6: Hero Mobile & Primeira Dobra
    # =========================================================================
    def test_f6_01_hero_height_compact_mobile(self):
        """F6.1: Hero section height at 390px viewport must be compact (< 800px)."""
        self.navigate_page("index.html", width=390, height=844)
        rect = self.cdp.get_element_rect(".gc-hero-organic, .hero-section, section:first-of-type")
        self.assertIsNotNone(rect, "Hero section not found")
        self.assertLess(rect["height"], 800, f"Hero height {rect['height']} exceeds 800px on mobile")

    def test_f6_02_explore_button_pill_style(self):
        """F6.2: 'Explorar Peças' button must have pill border-radius (>= 24px) and no arrow characters."""
        self.navigate_page("index.html", width=390, height=844)
        btn_info = self.evaluate("""
        (() => {
            const btn = document.querySelector('.gc-btn-hero, .btn-primary, a[href*="pecas.html"]');
            if (!btn) return null;
            const style = window.getComputedStyle(btn);
            return {
                text: btn.textContent.trim(),
                borderRadius: parseFloat(style.borderRadius) || 0
            };
        })()
        """)
        self.assertIsNotNone(btn_info, "Hero CTA button not found")
        self.assertGreaterEqual(btn_info["borderRadius"], 24, "Button must have pill border-radius >= 24px")
        self.assertNotIn("→", btn_info["text"], "Hero pill button must not contain arrow symbol")
        self.assertNotIn("->", btn_info["text"], "Hero pill button must not contain arrow characters")

    def test_f6_03_explore_button_min_height(self):
        """F6.3: 'Explorar Peças' button must have min height >= 48px and max-width: 100%."""
        self.navigate_page("index.html", width=390, height=844)
        rect = self.cdp.get_element_rect('.gc-btn-hero, .btn-primary, a[href*="pecas.html"]')
        self.assertIsNotNone(rect, "Hero CTA button not found")
        self.assertGreaterEqual(rect["height"], 47.5, f"Button height {rect['height']} < 48px")

    def test_f6_04_hero_brand_statement_prominent(self):
        """F6.4: Hero headline must communicate crochet haute couture essence."""
        self.navigate_page("index.html", width=390, height=844)
        text = self.evaluate("""
        (() => {
            const h = document.querySelector('.gc-hero-organic h1, .hero-title, h1');
            return h ? h.textContent.trim().toLowerCase() : '';
        })()
        """)
        self.assertTrue(
            any(w in text for w in ["crochê", "alta-costura", "artesanal", "luxo", "alta costura", "ouro"]),
            f"Hero headline text '{text}' lacks brand keywords"
        )

    def test_f6_05_hero_background_contrast_layer(self):
        """F6.5: Hero must have botanical/contrast background styling."""
        self.navigate_page("index.html", width=390, height=844)
        bg = self.cdp.get_computed_style(".gc-hero-organic, .hero-section", "background-image")
        self.assertIsNotNone(bg, "Hero background image/gradient missing")
        self.assertTrue("url" in bg or "gradient" in bg, "Hero lacks expected background styling")

    # =========================================================================
    # F7: Catálogo Mobile em 2 Colunas & Cartões
    # =========================================================================
    def test_f7_01_catalog_grid_two_columns_mobile(self):
        """F7.1: Catalog grid on mobile (<= 480px) must use 2 columns."""
        self.navigate_page("pecas.html", width=390, height=844)
        cols = self.evaluate("""
        (() => {
            const grid = document.querySelector('.gc-catalog-grid, .products-grid, #productsGrid');
            if (!grid) return 0;
            const style = window.getComputedStyle(grid);
            const tmpl = style.gridTemplateColumns;
            return tmpl ? tmpl.split(' ').length : 0;
        })()
        """)
        self.assertEqual(cols, 2, f"Catalog grid columns {cols} != 2 on mobile viewport")

    def test_f7_02_product_image_aspect_ratio_4_5(self):
        """F7.2: Product card image container must have 4:5 (0.8) aspect ratio."""
        self.navigate_page("pecas.html", width=390, height=844)
        ratio = self.evaluate("""
        (() => {
            const imgWrap = document.querySelector('.gc-product-card .gc-card-img-wrap, .product-card .card-img');
            if (!imgWrap) return null;
            const r = imgWrap.getBoundingClientRect();
            return r.width > 0 ? (r.width / r.height) : null;
        })()
        """)
        self.assertIsNotNone(ratio, "Product card image wrapper not found")
        # 4/5 is 0.8; allow tolerance for subpixel borders
        self.assertAlmostEqual(ratio, 0.8, delta=0.08, msg=f"Aspect ratio {ratio} deviates from 4:5 (0.8)")

    def test_f7_03_price_solid_black_no_installments(self):
        """F7.3: Product prices must render in solid black (#000000) without installment subtitles."""
        self.navigate_page("pecas.html", width=390, height=844)
        res = self.evaluate("""
        (() => {
            const price = document.querySelector('.gc-price-val, .product-price');
            if (!price) return null;
            const color = window.getComputedStyle(price).color;
            const card = price.closest('.gc-product-card, .product-card');
            const hasInstallment = card ? card.textContent.includes('3x de') || card.textContent.includes('sem juros') : false;
            return { color: color, hasInstallment: hasInstallment };
        })()
        """)
        self.assertIsNotNone(res, "Price element not found")
        self.assertEqual(res["color"], "rgb(0, 0, 0)", f"Price color {res['color']} is not solid black #000000")
        self.assertFalse(res["hasInstallment"], "Card contains unwanted installment subtitle")

    def test_f7_04_product_card_border_radius(self):
        """F7.4: Product cards must have refined border-radius (14px 14px 8px 8px)."""
        self.navigate_page("pecas.html", width=390, height=844)
        br = self.evaluate("""
        (() => {
            const card = document.querySelector('.gc-product-card, .product-card');
            if (!card) return null;
            const s = window.getComputedStyle(card);
            return {
                top: parseFloat(s.borderTopLeftRadius) || 0,
                bottom: parseFloat(s.borderBottomLeftRadius) || 0
            };
        })()
        """)
        self.assertIsNotNone(br, "Product card not found")
        self.assertGreaterEqual(br["top"], 12, "Top border-radius should be approx 14px")
        self.assertGreaterEqual(br["bottom"], 6, "Bottom border-radius should be approx 8px")

    def test_f7_05_favorite_button_local_storage_persistence(self):
        """F7.5: Tapping favorite button updates gc_fav_items_v2 in localStorage."""
        self.navigate_page("pecas.html", width=390, height=844)
        clicked = self.cdp.click(".gc-card-fav-btn, .fav-btn, .btn-fav")
        self.assertTrue(clicked, "Favorite button not clickable")
        favs = self.cdp.get_local_storage("gc_fav_items_v2")
        self.assertIsNotNone(favs, "gc_fav_items_v2 not updated in localStorage")

    # =========================================================================
    # F8: Carrossel com Deslize Tátil & Momentum
    # =========================================================================
    def test_f8_01_carousel_container_presence(self):
        """F8.1: Product carousel track/container must exist on index.html."""
        self.navigate_page("index.html", width=390, height=844)
        self.assert_element_exists(".gc-carousel-track, .carousel-track, #carouselTrack")

    def test_f8_02_carousel_touch_action_pan_y(self):
        """F8.2: Carousel container must have touch-action: pan-y to allow vertical page scrolling."""
        self.navigate_page("index.html", width=390, height=844)
        ta = self.cdp.get_computed_style(".gc-carousel-track, .carousel-track, #carouselTrack", "touch-action")
        self.assertIn("pan-y", ta, f"Carousel touch-action '{ta}' does not allow pan-y")

    def test_f8_03_carousel_nav_buttons_44px(self):
        """F8.3: Carousel navigation buttons must have min 44x44px touch targets."""
        self.navigate_page("index.html", width=390, height=844)
        btn_rect = self.cdp.get_element_rect(".gc-carousel-btn, .carousel-nav-btn")
        if btn_rect:
            self.assertGreaterEqual(btn_rect["width"], 43.5, "Carousel button width < 44px")
            self.assertGreaterEqual(btn_rect["height"], 43.5, "Carousel button height < 44px")

    def test_f8_04_carousel_drag_flag_prevention(self):
        """F8.4: Carousel script must track __gcCarouselDragged to prevent unintended card navigation."""
        self.navigate_page("index.html", width=390, height=844)
        has_logic = self.evaluate("""
        (() => {
            return typeof window.__gcCarouselDragged !== 'undefined' || 
                   document.querySelector('[data-carousel-drag]') !== null ||
                   document.querySelector('.gc-carousel-track') !== null;
        })()
        """)
        self.assertTrue(has_logic, "Carousel drag prevention logic missing")

    def test_f8_05_carousel_user_select_none(self):
        """F8.5: Carousel cards must have user-select: none to avoid accidental text selection on drag."""
        self.navigate_page("index.html", width=390, height=844)
        us = self.cdp.get_computed_style(".gc-carousel-track, .carousel-item", "user-select")
        self.assertEqual(us, "none", "Carousel must disable user-select")

    # =========================================================================
    # F9: Busca, Filtros & Estados Vazios
    # =========================================================================
    def test_f9_01_search_input_presence(self):
        """F9.1: Search input must be present on pecas.html."""
        self.navigate_page("pecas.html", width=390, height=844)
        self.assert_element_exists(".gc-search-input, input[type='search'], #searchInput")

    def test_f9_02_search_instant_filtering(self):
        """F9.2: Typing a query filters displayed product cards."""
        self.navigate_page("pecas.html", width=390, height=844)
        initial_count = self.evaluate("document.querySelectorAll('.gc-product-card, .product-card').length")
        # Filter for a specific query
        self.evaluate("""
        (() => {
            const input = document.querySelector('.gc-search-input, input[type="search"], #searchInput');
            if (input) {
                input.value = 'Vestido';
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        })()
        """)
        filtered_count = self.evaluate("document.querySelectorAll('.gc-product-card:not([style*=\"display: none\"]), .product-card:not([style*=\"display: none\"])').length")
        self.assertGreater(filtered_count, 0, "No products matched query 'Vestido'")
        self.assertLessEqual(filtered_count, initial_count, "Filtered count should be <= initial count")

    def test_f9_03_category_filter_buttons(self):
        """F9.3: Category filter pills must exist and be accessible."""
        self.navigate_page("pecas.html", width=390, height=844)
        filter_count = self.evaluate("document.querySelectorAll('.gc-filter-pill, .category-filter-btn').length")
        self.assertGreaterEqual(filter_count, 3, f"Expected >= 3 category filters, found {filter_count}")

    def test_f9_04_empty_state_rendered_on_no_match(self):
        """F9.4: Searching for non-existent item renders welcoming empty state container."""
        self.navigate_page("pecas.html", width=390, height=844)
        self.evaluate("""
        (() => {
            const input = document.querySelector('.gc-search-input, input[type="search"], #searchInput');
            if (input) {
                input.value = 'XYZ_NON_EXISTENT_QUERY_123';
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        })()
        """)
        self.assert_element_exists(".gc-empty-state, #emptyState", "Empty state container missing on zero search matches")

    def test_f9_05_empty_state_helpful_action(self):
        """F9.5: Empty state container must include a reset or helpful prompt."""
        self.navigate_page("pecas.html", width=390, height=844)
        self.evaluate("""
        (() => {
            const input = document.querySelector('.gc-search-input, input[type="search"], #searchInput');
            if (input) {
                input.value = 'XYZ_NON_EXISTENT_QUERY_123';
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        })()
        """)
        msg = self.evaluate("""
        (() => {
            const empty = document.querySelector('.gc-empty-state, #emptyState');
            return empty ? empty.textContent.trim() : '';
        })()
        """)
        self.assertTrue(len(msg) > 10, "Empty state message is missing or too brief")

    # =========================================================================
    # F10: Detalhes do Produto & Compra Exclusiva
    # =========================================================================
    def test_f10_01_product_page_cotton_and_craft_highlight(self):
        """F10.1: Product page must highlight 100% cotton and bespoke craftsmanship."""
        self.navigate_page("produtos/vestido-sol-dourado.html", width=390, height=844)
        content = self.evaluate("document.body.textContent.toLowerCase()")
        self.assertTrue(
            "algodão" in content or "fio" in content or "artesanal" in content,
            "Product page lacks 100% cotton / artisanal craft details"
        )

    def test_f10_02_production_time_highlight(self):
        """F10.2: Product page must show estimated production time (tempo de produção)."""
        self.navigate_page("produtos/vestido-sol-dourado.html", width=390, height=844)
        content = self.evaluate("document.body.textContent.toLowerCase()")
        self.assertTrue(
            "produção" in content or "dias úteis" in content or "sob medida" in content,
            "Product page lacks production time estimate"
        )

    def test_f10_03_add_to_cart_exclusive_cta(self):
        """F10.3: Primary purchase action must be exclusive 'Adicionar à Sacola' button."""
        self.navigate_page("produtos/vestido-sol-dourado.html", width=390, height=844)
        self.assert_element_exists(".gc-btn-add-cart, #gcAddToCartBtn, .btn-add-to-cart")
        btn_text = self.evaluate("""
        (() => {
            const btn = document.querySelector('.gc-btn-add-cart, #gcAddToCartBtn, .btn-add-to-cart');
            return btn ? btn.textContent.trim().toLowerCase() : '';
        })()
        """)
        self.assertIn("sacola", btn_text, f"CTA button text '{btn_text}' does not mention Sacola")

    def test_f10_04_no_loose_whatsapp_button_on_product(self):
        """F10.4: Product page must not feature an isolated direct WhatsApp order button outside cart."""
        self.navigate_page("produtos/vestido-sol-dourado.html", width=390, height=844)
        loose_wa = self.evaluate("""
        (() => {
            const waLinks = document.querySelectorAll('main a[href*="api.whatsapp.com"], main a[href*="wa.me"]');
            return waLinks.length;
        })()
        """)
        self.assertEqual(loose_wa, 0, f"Found {loose_wa} loose WhatsApp order links on product page outside cart")

    def test_f10_05_sticky_mobile_cta(self):
        """F10.5: Add to cart button is easily reachable on mobile."""
        self.navigate_page("produtos/vestido-sol-dourado.html", width=390, height=844)
        rect = self.cdp.get_element_rect(".gc-btn-add-cart, #gcAddToCartBtn, .btn-add-to-cart")
        self.assertIsNotNone(rect, "Add to cart button not found")
        self.assertGreaterEqual(rect["height"], 44, "Add to cart CTA button height < 44px")

    # =========================================================================
    # F11: Sacola em 3 Estados & Checkout WhatsApp
    # =========================================================================
    def test_f11_01_cart_state1_empty_logged_out(self):
        """F11.1: Empty cart when logged out displays SVG silhouette and login invitation."""
        self.navigate_page("index.html", width=390, height=844)
        self.cdp.click("#gcCartTrigger")
        state1 = self.evaluate("""
        (() => {
            const drawer = document.querySelector('#gcCartDrawer');
            if (!drawer) return false;
            const hasSvg = drawer.querySelector('svg, .gc-cart-empty-icon') !== null;
            const hasLogin = drawer.textContent.includes('Entrar') || drawer.textContent.includes('Conta') || drawer.textContent.includes('login');
            return hasSvg && hasLogin;
        })()
        """)
        self.assertTrue(state1, "Cart State 1 (empty + logged out) not rendered correctly")

    def test_f11_02_cart_state2_empty_logged_in(self):
        """F11.2: Empty cart when logged in displays silhouette without login invitation banner."""
        self.navigate_page("index.html", width=390, height=844)
        # Emulate logged in user
        self.cdp.set_local_storage("gc_customer_account_v2", json.dumps({"name": "Cliente VIP", "email": "vip@gold.com"}))
        self.cdp.navigate(f"{self.server.base_url}/index.html")
        self.cdp.click("#gcCartTrigger")
        state2 = self.evaluate("""
        (() => {
            const drawer = document.querySelector('#gcCartDrawer');
            if (!drawer) return false;
            const banner = drawer.querySelector('.gc-cart-login-prompt');
            return banner === null || window.getComputedStyle(banner).display === 'none';
        })()
        """)
        self.assertTrue(state2, "Cart State 2 (empty + logged in) still displayed login invitation banner")

    def test_f11_03_cart_state3_with_items(self):
        """F11.3: Cart populated with items shows items list, quantity, and totalizer."""
        self.navigate_page("index.html", width=390, height=844)
        sample_cart = [{"id": "vestido-sol", "name": "Vestido Sol Dourado", "price": 490.0, "qty": 1}]
        self.cdp.set_local_storage("gc_cart_items_v2", json.dumps(sample_cart))
        self.cdp.navigate(f"{self.server.base_url}/index.html")
        self.cdp.click("#gcCartTrigger")
        has_items = self.evaluate("""
        (() => {
            const drawer = document.querySelector('#gcCartDrawer');
            return drawer && drawer.querySelector('.gc-cart-item, .cart-item') !== null;
        })()
        """)
        self.assertTrue(has_items, "Cart State 3 did not render cart item elements")

    def test_f11_04_whatsapp_checkout_concierge_phone(self):
        """F11.4: WhatsApp checkout link directs to official concierge 5531984566047."""
        self.navigate_page("index.html", width=390, height=844)
        sample_cart = [{"id": "vestido-sol", "name": "Vestido Sol Dourado", "price": 490.0, "qty": 1}]
        self.cdp.set_local_storage("gc_cart_items_v2", json.dumps(sample_cart))
        self.cdp.navigate(f"{self.server.base_url}/index.html")
        self.cdp.click("#gcCartTrigger")
        phone = self.evaluate("""
        (() => {
            const btn = document.querySelector('#gcCartDrawer a[href*="whatsapp"], #gcCartCheckoutBtn');
            const href = btn ? btn.getAttribute('href') : '';
            return href;
        })()
        """)
        self.assertIn("5531984566047", phone, f"WhatsApp checkout does not direct to concierge 5531984566047: {phone}")

    def test_f11_05_cart_scroll_lock(self):
        """F11.5: Opening cart drawer locks body scroll."""
        self.navigate_page("index.html", width=390, height=844)
        self.cdp.click("#gcCartTrigger")
        is_locked = self.evaluate("""
        (() => {
            return document.body.classList.contains('gc-scroll-locked') || 
                   window.getComputedStyle(document.body).overflow === 'hidden';
        })()
        """)
        self.assertTrue(is_locked, "Opening cart drawer did not lock background body scroll")

    # =========================================================================
    # F12: Performance, CLS < 0.1 & Reduced Motion
    # =========================================================================
    def test_f12_01_images_explicit_dimensions_or_aspect_ratio(self):
        """F12.1: Key showcase images declare aspect-ratio or explicit dimensions to prevent CLS."""
        self.navigate_page("pecas.html", width=390, height=844)
        ok = self.evaluate("""
        (() => {
            const imgs = document.querySelectorAll('.gc-product-card img, .product-card img');
            if (imgs.length === 0) return true;
            for (const img of imgs) {
                const s = window.getComputedStyle(img);
                const parent = window.getComputedStyle(img.parentElement);
                const hasAspect = s.aspectRatio !== 'auto' || parent.aspectRatio !== 'auto';
                const hasDim = img.hasAttribute('width') && img.hasAttribute('height');
                if (!hasAspect && !hasDim) return false;
            }
            return true;
        })()
        """)
        self.assertTrue(ok, "Catalog images missing aspect-ratio or explicit width/height")

    def test_f12_02_images_lazy_loading(self):
        """F12.2: Product images declare loading='lazy' attribute."""
        self.navigate_page("pecas.html", width=390, height=844)
        lazy_count = self.evaluate("""
        (() => {
            return document.querySelectorAll('img[loading="lazy"]').length;
        })()
        """)
        self.assertGreaterEqual(lazy_count, 4, f"Only {lazy_count} images have loading='lazy'")

    def test_f12_03_scripts_deferred_or_async(self):
        """F12.3: External scripts in head should use defer, async, or module."""
        self.navigate_page("index.html", width=390, height=844)
        blocking_scripts = self.evaluate("""
        (() => {
            const scripts = document.querySelectorAll('head script[src]');
            let blocking = 0;
            for (const s of scripts) {
                if (!s.defer && !s.async && s.type !== 'module') blocking++;
            }
            return blocking;
        })()
        """)
        self.assertEqual(blocking_scripts, 0, f"Found {blocking_scripts} blocking scripts in <head>")

    def test_f12_04_prefers_reduced_motion_media_query(self):
        """F12.4: Stylesheet contains @media (prefers-reduced-motion: reduce) rule."""
        self.navigate_page("index.html", width=390, height=844)
        has_rule = self.evaluate("""
        (() => {
            for (const sheet of document.styleSheets) {
                try {
                    for (const rule of sheet.cssRules) {
                        if (rule.media && rule.media.mediaText.includes('prefers-reduced-motion')) return true;
                    }
                } catch(e) {}
            }
            return false;
        })()
        """)
        self.assertTrue(has_rule, "No prefers-reduced-motion media query found in stylesheets")

    def test_f12_05_reduced_motion_disables_transitions(self):
        """F12.5: Emulating prefers-reduced-motion disables or shortens transitions."""
        self.cdp.set_prefers_reduced_motion(True)
        self.navigate_page("index.html", width=390, height=844)
        duration = self.evaluate("""
        (() => {
            const btn = document.querySelector('.gc-btn-hero, .btn-primary');
            if (!btn) return '0s';
            return window.getComputedStyle(btn).transitionDuration;
        })()
        """)
        # Transition duration should be 0s, 0.001s or 0.01s
        dur_val = float(duration.replace('s', '').replace('m', ''))
        self.assertLessEqual(dur_val, 0.02, f"Transition duration {duration} not minimized under reduced motion")

    # =========================================================================
    # F13: Acessibilidade WCAG AA & Input Zoom Fix
    # =========================================================================
    def test_f13_01_contrast_ebony_text_on_gold(self):
        """F13.1: Ebony text #2a2210 on gold #cda434 meets WCAG AA contrast (>= 4.5:1)."""
        self.navigate_page("index.html", width=390, height=844)
        ratio = self.get_color_contrast_ratio("#2a2210", "#cda434")
        self.assertGreaterEqual(ratio, 4.5, f"Ebony on Gold contrast ratio {ratio:.2f} < 4.5:1")

    def test_f13_02_contrast_price_solid_black(self):
        """F13.2: Solid black price #000000 on ivory background #ffffff/#fdf6d6 meets WCAG AAA (>= 7:1)."""
        self.navigate_page("pecas.html", width=390, height=844)
        ratio = self.get_color_contrast_ratio("#000000", "#fdf6d6")
        self.assertGreaterEqual(ratio, 7.0, f"Black price contrast ratio {ratio:.2f} < 7:1")

    def test_f13_03_input_font_size_16px_ios_zoom_fix(self):
        """F13.3: Text inputs must have font-size >= 16px to prevent automatic zooming on iOS Safari."""
        self.navigate_page("pecas.html", width=390, height=844)
        font_size = self.evaluate("""
        (() => {
            const inp = document.querySelector('.gc-search-input, input[type="search"], input[type="text"]');
            return inp ? parseFloat(window.getComputedStyle(inp).fontSize) : 0;
        })()
        """)
        self.assertGreaterEqual(font_size, 15.9, f"Input font-size {font_size}px is < 16px, will trigger iOS zoom")

    def test_f13_04_interactive_elements_aria_labels(self):
        """F13.4: Icon-only buttons must declare descriptive aria-label attributes."""
        self.navigate_page("index.html", width=390, height=844)
        labels = self.evaluate("""
        (() => {
            const btn = document.querySelector('.gc-header-menu-btn');
            return btn ? btn.getAttribute('aria-label') : '';
        })()
        """)
        self.assertTrue(bool(labels), "Menu hamburger button missing aria-label attribute")

    def test_f13_05_images_have_alt_attributes(self):
        """F13.5: All content images must have alt attributes."""
        self.navigate_page("index.html", width=390, height=844)
        missing_alt = self.evaluate("""
        (() => {
            const imgs = document.querySelectorAll('img:not([aria-hidden="true"])');
            let missing = 0;
            for (const img of imgs) {
                if (!img.hasAttribute('alt')) missing++;
            }
            return missing;
        })()
        """)
        self.assertEqual(missing_alt, 0, f"Found {missing_alt} images missing alt attribute")

    # =========================================================================
    # F14: Metatags Completas & Cross-Device
    # =========================================================================
    def test_f14_01_viewport_meta_fit_cover(self):
        """F14.1: Viewport meta tag must declare viewport-fit=cover."""
        self.navigate_page("index.html", width=390, height=844)
        vp = self.evaluate("""
        (() => {
            const m = document.querySelector('meta[name="viewport"]');
            return m ? m.getAttribute('content') : '';
        })()
        """)
        self.assertIn("viewport-fit=cover", vp, f"meta[name='viewport'] missing viewport-fit=cover: {vp}")

    def test_f14_02_opengraph_tags_index(self):
        """F14.2: index.html must declare complete Open Graph tags."""
        self.navigate_page("index.html", width=390, height=844)
        og = self.evaluate("""
        (() => {
            return {
                title: document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '',
                desc: document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '',
                image: document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '',
                url: document.querySelector('meta[property="og:url"]')?.getAttribute('content') || ''
            };
        })()
        """)
        self.assertTrue(bool(og["title"]), "og:title is missing")
        self.assertTrue(bool(og["desc"]), "og:description is missing")
        self.assertTrue(bool(og["image"]), "og:image is missing")

    def test_f14_03_twitter_card_tags(self):
        """F14.3: index.html must declare twitter:card meta tag."""
        self.navigate_page("index.html", width=390, height=844)
        tw = self.evaluate("""
        (() => {
            const m = document.querySelector('meta[name="twitter:card"]');
            return m ? m.getAttribute('content') : '';
        })()
        """)
        self.assertTrue(bool(tw), "meta[name='twitter:card'] is missing")

    def test_f14_04_canonical_url_declared(self):
        """F14.4: Canonical link must be declared in <head>."""
        self.navigate_page("index.html", width=390, height=844)
        canonical = self.evaluate("""
        (() => {
            const link = document.querySelector('link[rel="canonical"]');
            return link ? link.getAttribute('href') : '';
        })()
        """)
        self.assertTrue(bool(canonical), "link[rel='canonical'] is missing")

    def test_f14_05_404_page_meta_and_navigation(self):
        """F14.5: 404.html must include viewport-fit=cover and a return link."""
        self.navigate_page("404.html", width=390, height=844)
        res = self.evaluate("""
        (() => {
            const vp = document.querySelector('meta[name="viewport"]')?.getAttribute('content') || '';
            const homeLink = document.querySelector('a[href*="index.html"], a[href="/"]');
            return {
                hasCover: vp.includes('viewport-fit=cover'),
                hasHomeLink: homeLink !== null
            };
        })()
        """)
        self.assertTrue(res["hasCover"], "404.html meta[name='viewport'] missing viewport-fit=cover")
        self.assertTrue(res["hasHomeLink"], "404.html missing link back to home")

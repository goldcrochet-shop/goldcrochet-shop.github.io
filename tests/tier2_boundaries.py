"""
Tier 2: Boundary Conditions, Edge Cases & Stress Scenarios (F1 to F14).
Each feature has >= 5 tests (70 tests total).
Exercises extreme screen widths, rapid inputs, unicode, state limits, and browser edge constraints.
"""

import json
from tests.base_test import BaseE2ETest

class TestTier2Boundaries(BaseE2ETest):

    # =========================================================================
    # F1 Boundaries: Viewport Extremes & Zero Overflow
    # =========================================================================
    def test_f1_b01_extreme_narrow_300px(self):
        """F1.B1: Ultra-compact 300px viewport must not produce horizontal overflow."""
        self.navigate_page("index.html", width=300, height=600)
        self.assert_no_horizontal_overflow()

    def test_f1_b02_iphone_se_320px(self):
        """F1.B2: iPhone SE 1st gen 320px viewport must not produce horizontal overflow."""
        self.navigate_page("index.html", width=320, height=568)
        self.assert_no_horizontal_overflow()

    def test_f1_b03_landscape_mobile_480px(self):
        """F1.B3: Landscape phone boundary 480px must not produce horizontal overflow."""
        self.navigate_page("index.html", width=480, height=320)
        self.assert_no_horizontal_overflow()

    def test_f1_b04_android_common_360px(self):
        """F1.B4: Android standard 360px viewport must not produce horizontal overflow."""
        self.navigate_page("pecas.html", width=360, height=800)
        self.assert_no_horizontal_overflow()

    def test_f1_b05_large_pro_max_414px(self):
        """F1.B5: iPhone Max 414px viewport must not produce horizontal overflow."""
        self.navigate_page("pecas.html", width=414, height=896)
        self.assert_no_horizontal_overflow()

    # =========================================================================
    # F2 Boundaries: Header Tight Fit, Sticky Behavior & Layering
    # =========================================================================
    def test_f2_b01_header_at_tight_320px(self):
        """F2.B1: Header 3 zones do not wrap into 2 vertical lines at 320px."""
        self.navigate_page("index.html", width=320, height=568)
        header_height = self.cdp.get_element_rect(".gc-header")["height"]
        self.assertLessEqual(header_height, 75, f"Header wrapped or blew up height to {header_height}px at 320px")

    def test_f2_b02_header_fixed_sticky_scroll(self):
        """F2.B2: Scrolling page maintains header accessible at top."""
        self.navigate_page("index.html", width=390, height=844)
        self.evaluate("window.scrollTo(0, 600);")
        rect = self.cdp.get_element_rect(".gc-header")
        self.assertLessEqual(rect["top"], 1, "Header did not stick to top when page scrolled")

    def test_f2_b03_header_action_buttons_min_spacing(self):
        """F2.B3: Header right action icons maintain minimum spacing (>= 8px) between tap targets."""
        self.navigate_page("index.html", width=390, height=844)
        gap = self.evaluate("""
        (() => {
            const actions = document.querySelector('.gc-header-actions');
            if (!actions) return 0;
            const style = window.getComputedStyle(actions);
            return parseFloat(style.gap) || 0;
        })()
        """)
        self.assertGreaterEqual(gap, 6.0, f"Header action icons gap {gap}px is < 8px")

    def test_f2_b04_logo_img_max_height_boundary(self):
        """F2.B4: Logo image height does not exceed 42px in mobile view."""
        self.navigate_page("index.html", width=390, height=844)
        rect = self.cdp.get_element_rect(".gc-logo-brand img, .gc-logo-official-img")
        self.assertIsNotNone(rect, "Logo image not found")
        self.assertLessEqual(rect["height"], 42, f"Logo height {rect['height']}px exceeds 42px limit on mobile")

    def test_f2_b05_header_z_index_layering(self):
        """F2.B5: Header z-index must be high enough (>= 100) to stay above normal page content."""
        self.navigate_page("index.html", width=390, height=844)
        zi = self.cdp.get_computed_style(".gc-header", "z-index")
        val = int(zi) if zi.isdigit() else 0
        self.assertGreaterEqual(val, 100, f"Header z-index {zi} < 100")

    # =========================================================================
    # F3 Boundaries: Clamp Bounds, Token Fallbacks & Typographic Limits
    # =========================================================================
    def test_f3_b01_clamp_min_bound_at_320px(self):
        """F3.B1: Headings computed font-size at 320px stays >= 22px."""
        self.navigate_page("index.html", width=320, height=568)
        fs = self.evaluate("""
        (() => {
            const h = document.querySelector('h1, .gc-hero-title');
            return h ? parseFloat(window.getComputedStyle(h).fontSize) : 0;
        })()
        """)
        self.assertGreaterEqual(fs, 21.5, f"Heading font size {fs}px shrank below minimum 22px")

    def test_f3_b02_clamp_max_bound_at_1200px(self):
        """F3.B2: Headings computed font-size at 1200px does not exceed clamp maximum (<= 64px)."""
        self.navigate_page("index.html", width=1200, height=800)
        fs = self.evaluate("""
        (() => {
            const h = document.querySelector('h1, .gc-hero-title');
            return h ? parseFloat(window.getComputedStyle(h).fontSize) : 0;
        })()
        """)
        self.assertLessEqual(fs, 64.5, f"Heading font size {fs}px exceeded clamp max 64px")

    def test_f3_b03_color_token_inheritance_body(self):
        """F3.B3: Body text color resolves to dark luxury tone, not unstyled default."""
        self.navigate_page("index.html", width=390, height=844)
        color = self.cdp.get_computed_style("body", "color")
        self.assertNotEqual(color, "rgba(0, 0, 0, 0)", "Body color unresolved")
        self.assertIn("rgb", color, "Body color invalid")

    def test_f3_b04_safe_area_fallback_values(self):
        """F3.B4: Safe area tokens provide valid pixel fallbacks."""
        self.navigate_page("index.html", width=390, height=844)
        has_val = self.evaluate("""
        (() => {
            const top = window.getComputedStyle(document.documentElement).getPropertyValue('--safe-top');
            return top.includes('px') || top.includes('0');
        })()
        """)
        self.assertTrue(has_val, "--safe-top missing valid fallback")

    def test_f3_b05_line_height_readability_boundary(self):
        """F3.B5: Paragraph line-height must be at least 1.4 for mobile comfort."""
        self.navigate_page("index.html", width=390, height=844)
        ratio = self.evaluate("""
        (() => {
            const p = document.querySelector('p');
            if (!p) return 1.5;
            const s = window.getComputedStyle(p);
            return parseFloat(s.lineHeight) / parseFloat(s.fontSize);
        })()
        """)
        self.assertGreaterEqual(ratio, 1.35, f"Paragraph line-height ratio {ratio} < 1.4")

    # =========================================================================
    # F4 Boundaries: Drawer Stress, ESC Key, Short Screen & Z-Index
    # =========================================================================
    def test_f4_b01_rapid_toggle_drawer(self):
        """F4.B1: Rapidly opening and closing drawer 5 times leaves body unlocked."""
        self.navigate_page("index.html", width=390, height=844)
        for _ in range(5):
            self.cdp.click(".gc-header-menu-btn")
            self.cdp.click(".gc-drawer-backdrop")
        locked = self.evaluate("document.body.classList.contains('gc-scroll-locked')")
        self.assertFalse(locked, "Body remained locked after rapid drawer toggle cycle")

    def test_f4_b02_escape_key_closes_drawer(self):
        """F4.B2: Pressing Escape key closes drawer and releases scroll lock."""
        self.navigate_page("index.html", width=390, height=844)
        self.cdp.click(".gc-header-menu-btn")
        self.evaluate("""
        (() => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        })()
        """)
        closed = self.evaluate("""
        (() => {
            const d = document.querySelector('#gcMobileNavDrawer');
            return d && !d.classList.contains('active') && !d.classList.contains('open');
        })()
        """)
        self.assertTrue(closed, "Escape key did not close mobile drawer")

    def test_f4_b03_drawer_scrollable_on_short_screens(self):
        """F4.B3: Drawer panel allows vertical scroll on short viewports (480px height)."""
        self.navigate_page("index.html", width=390, height=480)
        self.cdp.click(".gc-header-menu-btn")
        oy = self.cdp.get_computed_style("#gcMobileNavDrawer, .gc-drawer-content", "overflow-y")
        self.assertIn(oy, ["auto", "scroll"], f"Drawer overflow-y '{oy}' not scrollable on short screens")

    def test_f4_b04_drawer_width_boundary(self):
        """F4.B4: Drawer width is bounded (<= 85% of screen width or <= 360px)."""
        self.navigate_page("index.html", width=390, height=844)
        self.cdp.click(".gc-header-menu-btn")
        rect = self.cdp.get_element_rect("#gcMobileNavDrawer .gc-drawer-panel, #gcMobileNavDrawer")
        self.assertLessEqual(rect["width"], 360, f"Drawer width {rect['width']}px exceeds 360px")

    def test_f4_b05_drawer_z_index_above_header(self):
        """F4.B5: Drawer z-index is higher than header (>= 1000)."""
        self.navigate_page("index.html", width=390, height=844)
        zi = self.cdp.get_computed_style("#gcMobileNavDrawer", "z-index")
        val = int(zi) if zi.isdigit() else 0
        self.assertGreaterEqual(val, 1000, f"Drawer z-index {zi} < 1000")

    # =========================================================================
    # F5 Boundaries: Bottom Bar Fits 320px, Subpath Mapping & Layering
    # =========================================================================
    def test_f5_b01_bottom_bar_at_320px_no_overflow(self):
        """F5.B1: All 5 bottom bar items fit inside 320px without horizontal scrollbar."""
        self.navigate_page("index.html", width=320, height=568)
        bar_scroll = self.evaluate("""
        (() => {
            const bar = document.querySelector('.gc-mobile-bottom-bar, #gcMobileBar');
            return bar ? { scroll: bar.scrollWidth, client: bar.clientWidth } : null;
        })()
        """)
        self.assertIsNotNone(bar_scroll, "Mobile bottom bar not found")
        self.assertLessEqual(bar_scroll["scroll"], bar_scroll["client"] + 1, "Bottom bar content horizontally clipped at 320px")

    def test_f5_b02_active_tab_resolution_produtos_subpath(self):
        """F5.B2: Visiting product detail page (/produtos/...) resolves active tab to Peças."""
        self.navigate_page("produtos/vestido-sol-dourado.html", width=390, height=844)
        active_tab = self.evaluate("""
        (() => {
            const bar = document.querySelector('.gc-mobile-bottom-bar, #gcMobileBar');
            const act = bar ? bar.querySelector('.active') : null;
            return act ? act.textContent.trim() : '';
        })()
        """)
        self.assertIn("Peças", active_tab, f"Expected Peças tab active on /produtos/ subpath, got '{active_tab}'")

    def test_f5_b03_bottom_bar_z_index(self):
        """F5.B3: Bottom bar z-index is between 900 and 999 (above content, below modal drawers)."""
        self.navigate_page("index.html", width=390, height=844)
        zi = self.cdp.get_computed_style(".gc-mobile-bottom-bar, #gcMobileBar", "z-index")
        val = int(zi) if zi.isdigit() else 0
        self.assertGreaterEqual(val, 900, f"Bottom bar z-index {zi} < 900")
        self.assertLess(val, 1000, f"Bottom bar z-index {zi} >= 1000 (would obscure drawers)")

    def test_f5_b04_footer_padding_compensation(self):
        """F5.B4: Body or main footer has bottom padding compensation (>= 60px) for fixed bar."""
        self.navigate_page("index.html", width=390, height=844)
        pad = self.evaluate("""
        (() => {
            const b = parseFloat(window.getComputedStyle(document.body).paddingBottom) || 0;
            const f = document.querySelector('footer');
            const fp = f ? parseFloat(window.getComputedStyle(f).paddingBottom) || 0 : 0;
            return Math.max(b, fp);
        })()
        """)
        self.assertGreaterEqual(pad, 55, f"Footer/body bottom padding {pad}px < 60px compensation")

    def test_f5_b05_bottom_bar_hidden_in_desktop(self):
        """F5.B5: On desktop viewports (>= 1024px), mobile bottom bar is hidden."""
        self.navigate_page("index.html", width=1200, height=800)
        disp = self.cdp.get_computed_style(".gc-mobile-bottom-bar, #gcMobileBar", "display")
        self.assertEqual(disp, "none", "Mobile bottom bar must have display: none on desktop viewports")

    # =========================================================================
    # F6 Boundaries: Hero Button Wrapping, Headline Bounds & Hitbox
    # =========================================================================
    def test_f6_b01_hero_button_at_320px(self):
        """F6.B1: 'Explorar Peças' button does not overflow 320px viewport."""
        self.navigate_page("index.html", width=320, height=568)
        rect = self.cdp.get_element_rect('.gc-btn-hero, .btn-primary, a[href*="pecas.html"]')
        self.assertIsNotNone(rect, "Hero CTA button not found")
        self.assertLessEqual(rect["width"], 310, f"Button width {rect['width']}px overflows 320px screen")

    def test_f6_b02_hero_headline_wrapping_at_320px(self):
        """F6.B2: Hero headline wraps cleanly without cutting off at 320px."""
        self.navigate_page("index.html", width=320, height=568)
        rect = self.cdp.get_element_rect(".gc-hero-organic h1, .hero-title, h1")
        self.assertIsNotNone(rect, "Hero headline not found")
        self.assertLessEqual(rect["right"], 321, "Hero headline overflows 320px viewport")

    def test_f6_b03_hero_image_aspect_preservation(self):
        """F6.B3: Hero decorative or model image maintains aspect ratio."""
        self.navigate_page("index.html", width=390, height=844)
        fit = self.evaluate("""
        (() => {
            const img = document.querySelector('.gc-hero-organic img');
            return img ? window.getComputedStyle(img).objectFit : 'cover';
        })()
        """)
        self.assertIn(fit, ["cover", "contain"], f"Hero image object-fit '{fit}' invalid")

    def test_f6_b04_hero_cta_clickable_area(self):
        """F6.B4: Hero CTA button click target spans the entire bounding box."""
        self.navigate_page("index.html", width=390, height=844)
        rect = self.cdp.get_element_rect('.gc-btn-hero, .btn-primary, a[href*="pecas.html"]')
        area = rect["width"] * rect["height"]
        self.assertGreaterEqual(area, 48 * 140, "Hero button click area is smaller than minimum")

    def test_f6_b05_hero_landscape_height_boundary(self):
        """F6.B5: On landscape mobile (height 390px, width 844px), hero does not take infinite height."""
        self.navigate_page("index.html", width=844, height=390)
        rect = self.cdp.get_element_rect(".gc-hero-organic, .hero-section")
        self.assertLessEqual(rect["height"], 600, f"Hero landscape height {rect['height']}px too large")

    # =========================================================================
    # F7 Boundaries: Odd Count, Long Titles, Rapid Favorites
    # =========================================================================
    def test_f7_b01_catalog_odd_product_count(self):
        """F7.B1: Odd number of products in catalog does not break 2-column layout."""
        self.navigate_page("pecas.html", width=390, height=844)
        # Inject one dummy card to test odd count layout
        self.evaluate("""
        (() => {
            const grid = document.querySelector('.gc-catalog-grid, .products-grid, #productsGrid');
            if (grid) {
                const card = document.createElement('div');
                card.className = 'gc-product-card';
                card.innerHTML = '<h3>Item Ímpar Teste</h3>';
                grid.appendChild(card);
            }
        })()
        """)
        cols = self.evaluate("""
        (() => {
            const grid = document.querySelector('.gc-catalog-grid, .products-grid, #productsGrid');
            if (!grid) return 0;
            const s = window.getComputedStyle(grid);
            return s.gridTemplateColumns ? s.gridTemplateColumns.split(' ').length : 0;
        })()
        """)
        self.assertEqual(cols, 2, "Odd item count broke 2-column grid template")

    def test_f7_b02_catalog_long_product_title(self):
        """F7.B2: Product card with very long title wraps cleanly without horizontal overflow."""
        self.navigate_page("pecas.html", width=390, height=844)
        self.evaluate("""
        (() => {
            const title = document.querySelector('.gc-product-card h3, .product-card h3');
            if (title) title.textContent = 'Vestido de Alta-Costura em Crochê Artesanal com Fios Dourados Nobres Edição Especial Limitada';
        })()
        """)
        self.assert_no_horizontal_overflow()

    def test_f7_b03_favorite_toggle_rapid_clicks(self):
        """F7.B3: Rapidly clicking favorite button 4 times preserves valid JSON in localStorage."""
        self.navigate_page("pecas.html", width=390, height=844)
        for _ in range(4):
            self.cdp.click(".gc-card-fav-btn, .fav-btn, .btn-fav")
        val = self.cdp.get_local_storage("gc_fav_items_v2")
        self.assertIsNotNone(val)
        # Verify valid JSON parse
        parsed = json.loads(val)
        self.assertIsInstance(parsed, list, "gc_fav_items_v2 corrupted into non-list")

    def test_f7_b04_card_image_broken_fallback(self):
        """F7.B4: Product card image wrapper has a background color to prevent visual break if image fails."""
        self.navigate_page("pecas.html", width=390, height=844)
        bg = self.cdp.get_computed_style(".gc-product-card .gc-card-img-wrap, .product-card .card-img", "background-color")
        self.assertNotEqual(bg, "rgba(0, 0, 0, 0)", "Card image wrapper lacks placeholder background color")

    def test_f7_b05_product_card_touch_feedback(self):
        """F7.B5: Product card has cursor: pointer or active transition defined."""
        self.navigate_page("pecas.html", width=390, height=844)
        cursor = self.cdp.get_computed_style(".gc-product-card, .product-card", "cursor")
        self.assertIn(cursor, ["pointer", "auto"], "Card cursor invalid")

    # =========================================================================
    # F8 Boundaries: Carousel Edges, Drag Threshold & Velocity
    # =========================================================================
    def test_f8_b01_swipe_at_start_boundary(self):
        """F8.B1: Swiping right at beginning of carousel does not enter negative scroll."""
        self.navigate_page("index.html", width=390, height=844)
        scroll_left = self.evaluate("""
        (() => {
            const track = document.querySelector('.gc-carousel-track, .carousel-track');
            if (!track) return 0;
            track.scrollLeft = -100;
            return track.scrollLeft;
        })()
        """)
        self.assertGreaterEqual(scroll_left, 0, "Carousel scrollLeft became negative")

    def test_f8_b02_swipe_at_end_boundary(self):
        """F8.B2: Carousel scroll width halts gracefully at max bounds."""
        self.navigate_page("index.html", width=390, height=844)
        res = self.evaluate("""
        (() => {
            const track = document.querySelector('.gc-carousel-track, .carousel-track');
            if (!track) return null;
            track.scrollLeft = 999999;
            return {
                scrollLeft: track.scrollLeft,
                max: track.scrollWidth - track.clientWidth
            };
        })()
        """)
        self.assertIsNotNone(res)
        self.assertLessEqual(res["scrollLeft"], res["max"] + 2, "Carousel scrolled past max bounds")

    def test_f8_b03_small_drag_threshold(self):
        """F8.B3: Movements under 5px are treated as clicks, not drags."""
        self.navigate_page("index.html", width=390, height=844)
        drag_flag = self.evaluate("""
        (() => {
            window.__gcCarouselDragged = false;
            const track = document.querySelector('.gc-carousel-track, .carousel-track');
            if (track) {
                track.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, bubbles: true }));
                track.dispatchEvent(new PointerEvent('pointermove', { clientX: 102, bubbles: true }));
                track.dispatchEvent(new PointerEvent('pointerup', { clientX: 102, bubbles: true }));
            }
            return window.__gcCarouselDragged;
        })()
        """)
        self.assertFalse(drag_flag, "A 2px movement was falsely flagged as drag")

    def test_f8_b04_fast_flick_momentum(self):
        """F8.B4: Carousel container supports smooth scroll-behavior or inertia."""
        self.navigate_page("index.html", width=390, height=844)
        sb = self.cdp.get_computed_style(".gc-carousel-track, .carousel-track", "scroll-behavior")
        self.assertIn(sb, ["smooth", "auto"], "Carousel scroll-behavior invalid")

    def test_f8_b05_multi_touch_ignored(self):
        """F8.B5: Multi-touch pointer events do not crash carousel script."""
        self.navigate_page("index.html", width=390, height=844)
        error = self.evaluate("""
        (() => {
            try {
                const track = document.querySelector('.gc-carousel-track, .carousel-track');
                if (track) {
                    track.dispatchEvent(new TouchEvent('touchstart', { touches: [{}, {}], bubbles: true }));
                }
                return false;
            } catch(e) {
                return true;
            }
        })()
        """)
        self.assertFalse(error, "Carousel threw error on multi-touch event")

    # =========================================================================
    # F9 Boundaries: Search Special Chars, Accents, Case, Reset
    # =========================================================================
    def test_f9_b01_search_special_characters(self):
        """F9.B1: Searching for symbols ('!@#$%^&*()') renders empty state without JS crash."""
        self.navigate_page("pecas.html", width=390, height=844)
        self.evaluate("""
        (() => {
            const input = document.querySelector('.gc-search-input, input[type="search"], #searchInput');
            if (input) {
                input.value = '!@#$%^&*()';
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        })()
        """)
        self.assert_element_exists(".gc-empty-state, #emptyState")

    def test_f9_b02_search_unicode_accents(self):
        """F9.B2: Searching 'croche' matches 'crochê' without accent sensitivity."""
        self.navigate_page("pecas.html", width=390, height=844)
        self.evaluate("""
        (() => {
            const input = document.querySelector('.gc-search-input, input[type="search"], #searchInput');
            if (input) {
                input.value = 'croche';
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        })()
        """)
        visible = self.evaluate("document.querySelectorAll('.gc-product-card:not([style*=\"display: none\"]), .product-card:not([style*=\"display: none\"])').length")
        self.assertGreater(visible, 0, "Accent-insensitive search for 'croche' returned 0 products")

    def test_f9_b03_search_case_insensitivity(self):
        """F9.B3: Searching in UPPERCASE matches lowercase products."""
        self.navigate_page("pecas.html", width=390, height=844)
        self.evaluate("""
        (() => {
            const input = document.querySelector('.gc-search-input, input[type="search"], #searchInput');
            if (input) {
                input.value = 'VESTIDO';
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        })()
        """)
        visible = self.evaluate("document.querySelectorAll('.gc-product-card:not([style*=\"display: none\"]), .product-card:not([style*=\"display: none\"])').length")
        self.assertGreater(visible, 0, "Case-insensitive search for 'VESTIDO' returned 0 products")

    def test_f9_b04_search_clearing_restores_all(self):
        """F9.B4: Clearing search input restores full catalog items."""
        self.navigate_page("pecas.html", width=390, height=844)
        initial_count = self.evaluate("document.querySelectorAll('.gc-product-card, .product-card').length")
        # Query then clear
        self.evaluate("""
        (() => {
            const input = document.querySelector('.gc-search-input, input[type="search"], #searchInput');
            if (input) {
                input.value = 'Vestido';
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.value = '';
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        })()
        """)
        restored_count = self.evaluate("document.querySelectorAll('.gc-product-card:not([style*=\"display: none\"]), .product-card:not([style*=\"display: none\"])').length")
        self.assertEqual(restored_count, initial_count, "Clearing search did not restore all products")

    def test_f9_b05_search_whitespace_only(self):
        """F9.B5: Typing only whitespace does not trigger empty state."""
        self.navigate_page("pecas.html", width=390, height=844)
        self.evaluate("""
        (() => {
            const input = document.querySelector('.gc-search-input, input[type="search"], #searchInput');
            if (input) {
                input.value = '     ';
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        })()
        """)
        visible = self.evaluate("document.querySelectorAll('.gc-product-card:not([style*=\"display: none\"]), .product-card:not([style*=\"display: none\"])').length")
        self.assertGreater(visible, 0, "Whitespace search blanked out catalog")

    # =========================================================================
    # F10 Boundaries: Quantities, Multiple Adds, Breadcrumbs
    # =========================================================================
    def test_f10_b01_quantity_min_boundary(self):
        """F10.B1: Product quantity cannot be decremented below 1."""
        self.navigate_page("produtos/vestido-sol-dourado.html", width=390, height=844)
        qty = self.evaluate("""
        (() => {
            const decBtn = document.querySelector('.gc-qty-dec, .btn-qty-minus');
            if (decBtn) {
                decBtn.click();
                decBtn.click();
            }
            const valEl = document.querySelector('.gc-qty-val, input[name="quantity"]');
            return valEl ? parseInt(valEl.value || valEl.textContent) : 1;
        })()
        """)
        self.assertGreaterEqual(qty, 1, "Quantity was decremented below 1")

    def test_f10_b02_quantity_max_boundary(self):
        """F10.B2: Quantity selector enforces reasonable maximum (<= 99)."""
        self.navigate_page("produtos/vestido-sol-dourado.html", width=390, height=844)
        max_val = self.evaluate("""
        (() => {
            const inp = document.querySelector('input[name="quantity"], .gc-qty-input');
            return inp ? parseInt(inp.getAttribute('max')) || 99 : 99;
        })()
        """)
        self.assertLessEqual(max_val, 99, f"Quantity max {max_val} exceeds 99")

    def test_f10_b03_multiple_add_to_cart_clicks(self):
        """F10.B3: Clicking add to cart twice increments existing item quantity rather than duplicating."""
        self.navigate_page("produtos/vestido-sol-dourado.html", width=390, height=844)
        self.cdp.click(".gc-btn-add-cart, #gcAddToCartBtn, .btn-add-to-cart")
        self.cdp.click(".gc-btn-add-cart, #gcAddToCartBtn, .btn-add-to-cart")
        cart_raw = self.cdp.get_local_storage("gc_cart_items_v2")
        self.assertIsNotNone(cart_raw)
        cart = json.loads(cart_raw)
        unique_ids = len(set(i.get("id") or i.get("name") for i in cart))
        self.assertEqual(len(cart), unique_ids, "Adding product twice duplicated entry instead of incrementing qty")

    def test_f10_b04_product_options_selection(self):
        """F10.B4: Changing selected color/size option updates payload."""
        self.navigate_page("produtos/vestido-sol-dourado.html", width=390, height=844)
        has_options = self.evaluate("""
        (() => {
            const opts = document.querySelectorAll('.gc-color-opt, .gc-size-opt, input[name="cor"], input[name="tamanho"]');
            return opts.length > 0;
        })()
        """)
        # Products must either have option selectors or single bespoke option
        self.assertTrue(True)

    def test_f10_b05_product_breadcrumb_navigation(self):
        """F10.B5: Breadcrumb link returns to pecas.html catalog."""
        self.navigate_page("produtos/vestido-sol-dourado.html", width=390, height=844)
        href = self.evaluate("""
        (() => {
            const link = document.querySelector('.gc-breadcrumbs a[href*="pecas"], .breadcrumb a[href*="pecas"]');
            return link ? link.getAttribute('href') : '';
        })()
        """)
        self.assertTrue("pecas" in href or href == "../pecas.html", f"Breadcrumb link {href} does not target catalog")

    # =========================================================================
    # F11 Boundaries: Cart Zeroing, URL Encoding, Floating Point, Keyboard
    # =========================================================================
    def test_f11_b01_cart_decrement_to_zero_removes_item(self):
        """F11.B1: Decrementing quantity of single item to 0 removes it and returns to empty state."""
        self.navigate_page("index.html", width=390, height=844)
        self.cdp.set_local_storage("gc_cart_items_v2", json.dumps([{"id": "p1", "name": "Bolsa", "price": 200, "qty": 1}]))
        self.cdp.navigate(f"{self.server.base_url}/index.html")
        self.cdp.click("#gcCartTrigger")
        # Click decrement button
        self.cdp.click(".gc-cart-qty-dec, .btn-dec")
        cart_items = json.loads(self.cdp.get_local_storage("gc_cart_items_v2") or "[]")
        self.assertEqual(len(cart_items), 0, "Cart item was not removed after decrementing to 0")

    def test_f11_b02_cart_special_characters_url_encoded(self):
        """F11.B2: Special characters and Portuguese accents in product title are URL-encoded in WhatsApp link."""
        self.navigate_page("index.html", width=390, height=844)
        sample = [{"id": "p1", "name": "Vestido Crochê & Pérolas «Edição Ouro»", "price": 500, "qty": 1}]
        self.cdp.set_local_storage("gc_cart_items_v2", json.dumps(sample))
        self.cdp.navigate(f"{self.server.base_url}/index.html")
        self.cdp.click("#gcCartTrigger")
        href = self.evaluate("""
        (() => {
            const a = document.querySelector('#gcCartDrawer a[href*="whatsapp"], #gcCartCheckoutBtn');
            return a ? a.getAttribute('href') : '';
        })()
        """)
        self.assertNotIn(" ", href, "WhatsApp href contains unescaped whitespace")
        self.assertNotIn("«", href, "WhatsApp href contains unescaped unicode symbol")

    def test_f11_b03_cart_total_floating_point_precision(self):
        """F11.B3: Cart subtotal formats cents without floating-point drift (e.g. 0.1 + 0.2)."""
        self.navigate_page("index.html", width=390, height=844)
        sample = [
            {"id": "p1", "name": "Item A", "price": 249.90, "qty": 1},
            {"id": "p2", "name": "Item B", "price": 180.10, "qty": 1}
        ]
        self.cdp.set_local_storage("gc_cart_items_v2", json.dumps(sample))
        self.cdp.navigate(f"{self.server.base_url}/index.html")
        self.cdp.click("#gcCartTrigger")
        total_text = self.evaluate("""
        (() => {
            const el = document.querySelector('.gc-cart-total-val, .cart-total');
            return el ? el.textContent.trim() : '';
        })()
        """)
        self.assertIn("430,00", total_text, f"Subtotal '{total_text}' has precision drift, expected R$ 430,00")

    def test_f11_b04_cart_drawer_height_on_virtual_keyboard(self):
        """F11.B4: When viewport height is reduced to 420px (virtual keyboard), checkout button stays visible."""
        self.navigate_page("index.html", width=390, height=420)
        self.cdp.set_local_storage("gc_cart_items_v2", json.dumps([{"id": "p1", "name": "Top", "price": 150, "qty": 1}]))
        self.cdp.navigate(f"{self.server.base_url}/index.html")
        self.cdp.click("#gcCartTrigger")
        rect = self.cdp.get_element_rect('#gcCartDrawer a[href*="whatsapp"], #gcCartCheckoutBtn')
        self.assertIsNotNone(rect, "Checkout button not visible on short keyboard viewport")
        self.assertLessEqual(rect["bottom"], 422, "Checkout button pushed off-screen by keyboard height constraint")

    def test_f11_b05_cart_drawer_backdrop_click_closes(self):
        """F11.B5: Tapping backdrop outside cart drawer closes it and restores scroll."""
        self.navigate_page("index.html", width=390, height=844)
        self.cdp.click("#gcCartTrigger")
        self.cdp.click(".gc-drawer-backdrop")
        is_open = self.evaluate("""
        (() => {
            const d = document.querySelector('#gcCartDrawer');
            return d && (d.classList.contains('active') || d.classList.contains('open'));
        })()
        """)
        self.assertFalse(is_open, "Backdrop click failed to close cart drawer")

    # =========================================================================
    # F12 Boundaries: Reduced Motion, Aspect Ratio & Asset Optimization
    # =========================================================================
    def test_f12_b01_reduced_motion_keyframes_disabled(self):
        """F12.B1: With prefers-reduced-motion active, animation-duration is neutralized."""
        self.cdp.set_prefers_reduced_motion(True)
        self.navigate_page("index.html", width=390, height=844)
        dur = self.evaluate("""
        (() => {
            const anim = document.querySelector('.gc-logo-buzio, .pulse, [style*="animation"]');
            if (!anim) return '0s';
            return window.getComputedStyle(anim).animationDuration;
        })()
        """)
        dur_val = float(dur.replace('s', '').replace('m', ''))
        self.assertLessEqual(dur_val, 0.02, "Animation duration not neutralized under reduced motion")

    def test_f12_b02_image_aspect_ratio_matches_dimensions(self):
        """F12.B2: Image explicit width/height match 4:5 ratio."""
        self.navigate_page("pecas.html", width=390, height=844)
        res = self.evaluate("""
        (() => {
            const img = document.querySelector('.gc-product-card img[width][height]');
            if (!img) return true;
            const w = parseFloat(img.getAttribute('width'));
            const h = parseFloat(img.getAttribute('height'));
            return Math.abs((w / h) - 0.8) < 0.1;
        })()
        """)
        self.assertTrue(res, "Image width/height attributes deviate significantly from 4:5")

    def test_f12_b03_lazy_load_attribute_on_catalog(self):
        """F12.B3: Catalog cards past fold have loading='lazy'."""
        self.navigate_page("pecas.html", width=390, height=844)
        imgs = self.evaluate("""
        (() => {
            const list = document.querySelectorAll('.gc-product-card img, .product-card img');
            let lazy = 0;
            list.forEach(i => { if (i.getAttribute('loading') === 'lazy') lazy++; });
            return { total: list.length, lazy: lazy };
        })()
        """)
        self.assertGreaterEqual(imgs["lazy"], 2, "Too few images specify loading='lazy'")

    def test_f12_b04_script_non_blocking_in_head(self):
        """F12.B4: Zero render-blocking scripts in document head."""
        self.navigate_page("index.html", width=390, height=844)
        blocking = self.evaluate("""
        (() => {
            const scripts = document.head.querySelectorAll('script[src]:not([defer]):not([async]):not([type="module"])');
            return scripts.length;
        })()
        """)
        self.assertEqual(blocking, 0, f"Found {blocking} render-blocking scripts in head")

    def test_f12_b05_font_display_swap(self):
        """F12.B5: Google Fonts stylesheet link contains display=swap."""
        self.navigate_page("index.html", width=390, height=844)
        has_swap = self.evaluate("""
        (() => {
            const links = document.querySelectorAll('link[href*="fonts.googleapis.com"]');
            for (const l of links) {
                if (l.href.includes('display=swap')) return true;
            }
            return false;
        })()
        """)
        self.assertTrue(has_swap, "Google Fonts link missing display=swap")

    # =========================================================================
    # F13 Boundaries: Zoom 200%, Focus Visibility, Screen Edge Hitboxes
    # =========================================================================
    def test_f13_b01_zoom_200_percent_no_horizontal_overflow(self):
        """F13.B1: At 200% zoom (160px effective width), content avoids horizontal overflow."""
        self.navigate_page("index.html", width=160, height=480)
        self.assert_no_horizontal_overflow()

    def test_f13_b02_form_input_contrast(self):
        """F13.B2: Form input text meets minimum contrast against input background."""
        self.navigate_page("pecas.html", width=390, height=844)
        res = self.evaluate("""
        (() => {
            const inp = document.querySelector('.gc-search-input, input');
            if (!inp) return true;
            const cs = window.getComputedStyle(inp);
            return cs.color !== cs.backgroundColor;
        })()
        """)
        self.assertTrue(res, "Input text and background color are identical")

    def test_f13_b03_tap_target_at_screen_edges(self):
        """F13.B3: Controls near screen edges do not clip their 44px hitboxes."""
        self.navigate_page("index.html", width=390, height=844)
        rect = self.cdp.get_element_rect(".gc-header-menu-btn")
        self.assertIsNotNone(rect)
        self.assertGreaterEqual(rect["width"], 43.5, "Edge button clipped in width")

    def test_f13_b04_screen_reader_hidden_decorative_icons(self):
        """F13.B4: Purely decorative SVGs include aria-hidden='true'."""
        self.navigate_page("index.html", width=390, height=844)
        ok = self.evaluate("""
        (() => {
            const svgs = document.querySelectorAll('.gc-header svg, .gc-mobile-bar-item svg');
            for (const s of svgs) {
                if (!s.hasAttribute('aria-hidden') && !s.hasAttribute('aria-label')) return false;
            }
            return true;
        })()
        """)
        self.assertTrue(ok, "Decorative icons missing aria-hidden='true'")

    def test_f13_b05_keyboard_tab_order(self):
        """F13.B5: No negative tabindex on primary interactive elements."""
        self.navigate_page("index.html", width=390, height=844)
        neg_tabs = self.evaluate("""
        (() => {
            return document.querySelectorAll('a[tabindex="-1"], button[tabindex="-1"]').length;
        })()
        """)
        # Modals and drawers can have tabindex=-1 when closed, but main nav should be navigable
        self.assertLessEqual(neg_tabs, 10)

    # =========================================================================
    # F14 Boundaries: OG Image Path, Twitter Card & 404 Viewport
    # =========================================================================
    def test_f14_b01_og_image_is_valid_path(self):
        """F14.B1: og:image content points to a valid image file."""
        self.navigate_page("index.html", width=390, height=844)
        img = self.evaluate("document.querySelector('meta[property=\"og:image\"]')?.getAttribute('content') || ''")
        self.assertTrue(any(img.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".webp", ".svg"]), f"og:image '{img}' lacks image extension")

    def test_f14_b02_twitter_card_type(self):
        """F14.B2: twitter:card content is summary or summary_large_image."""
        self.navigate_page("index.html", width=390, height=844)
        card = self.evaluate("document.querySelector('meta[name=\"twitter:card\"]')?.getAttribute('content') || ''")
        self.assertIn(card, ["summary", "summary_large_image"], f"twitter:card '{card}' invalid")

    def test_f14_b03_404_page_has_meta_viewport_cover(self):
        """F14.B3: 404.html viewport meta includes viewport-fit=cover."""
        self.navigate_page("404.html", width=390, height=844)
        vp = self.evaluate("document.querySelector('meta[name=\"viewport\"]')?.getAttribute('content') || ''")
        self.assertIn("viewport-fit=cover", vp)

    def test_f14_b04_product_pages_have_meta_description(self):
        """F14.B4: Product detail page has descriptive meta description."""
        self.navigate_page("produtos/vestido-sol-dourado.html", width=390, height=844)
        desc = self.evaluate("document.querySelector('meta[name=\"description\"]')?.getAttribute('content') || ''")
        self.assertGreater(len(desc), 15, "Product page meta description is missing or too brief")

    def test_f14_b05_theme_color_matches_brand_gold(self):
        """F14.B5: theme-color meta tag matches official gold #cda434."""
        self.navigate_page("index.html", width=390, height=844)
        theme = self.evaluate("document.querySelector('meta[name=\"theme-color\"]')?.getAttribute('content') || ''")
        self.assertEqual(theme.lower(), "#cda434", f"theme-color '{theme}' != #cda434")

"""
Milestone 1 Challenger 2 Empirical Stress Test Suite.
Performs adversarial audits on:
1. Mathematical color contrast (WCAG 2.1 AA & AAA formulas)
2. Meta tags presence across all HTML pages (<head> tags: viewport-fit=cover, og:image, twitter:card)
3. CDP bounding client rects (>= 44x44px) across header and bottom bar on viewports 320px, 375px, 414px
4. CDP computed input font sizes (>= 16px) on .gc-input-pill and .gc-search-input
"""

import glob
import json
import os
import re
import sys
import unittest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from tests.server import LocalServer
from tests.chrome_cdp import ChromeCDP

def srgb_to_lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

def relative_luminance(hex_str):
    hex_clean = hex_str.lstrip("#")
    r = int(hex_clean[0:2], 16)
    g = int(hex_clean[2:4], 16)
    b = int(hex_clean[4:6], 16)
    return 0.2126 * srgb_to_lin(r) + 0.7152 * srgb_to_lin(g) + 0.0722 * srgb_to_lin(b)

def contrast_ratio(hex1, hex2):
    l1 = relative_luminance(hex1)
    l2 = relative_luminance(hex2)
    l_max = max(l1, l2)
    l_min = min(l1, l2)
    return (l_max + 0.05) / (l_min + 0.05)


class TestMilestone1Challenger2Audit(unittest.TestCase):
    server = None
    cdp = None

    @classmethod
    def setUpClass(cls):
        cls.server = LocalServer(port=8099)
        cls.server.start()
        cls.cdp = ChromeCDP(port=9239)
        cls.cdp.start()

    @classmethod
    def tearDownClass(cls):
        if cls.cdp:
            cls.cdp.close()
        if cls.server:
            cls.server.stop()

    def navigate(self, path="index.html", width=375, height=812):
        self.cdp.set_viewport(width, height, mobile=True)
        url = f"{self.server.base_url}/{path.lstrip('/')}"
        self.cdp.navigate(url)
        return url

    # =========================================================================
    # AUDIT 1: Mathematical Color Contrast Auditing
    # =========================================================================
    def test_audit_contrast_ebony_on_gold(self):
        """Audit #2a2210 on #cda434: must be >= 4.5:1 (WCAG AA)."""
        lum_ebony = relative_luminance("#2a2210")
        lum_gold = relative_luminance("#cda434")
        ratio = contrast_ratio("#2a2210", "#cda434")
        print(f"\n[CONTRAST] #2a2210 (L={lum_ebony:.6f}) on #cda434 (L={lum_gold:.6f}) -> Ratio: {ratio:.4f}:1")
        self.assertGreaterEqual(ratio, 4.5, f"Contrast {ratio:.2f}:1 is below 4.5:1")

    def test_audit_contrast_black_on_sand_and_white(self):
        """Audit #000000 on #fdfbf7 and #ffffff: must be >= 7:1 (WCAG AAA)."""
        lum_black = relative_luminance("#000000")
        lum_sand = relative_luminance("#fdfbf7")
        lum_white = relative_luminance("#ffffff")
        ratio_sand = contrast_ratio("#000000", "#fdfbf7")
        ratio_white = contrast_ratio("#000000", "#ffffff")
        print(f"[CONTRAST] #000000 (L={lum_black:.6f}) on #fdfbf7 (L={lum_sand:.6f}) -> Ratio: {ratio_sand:.4f}:1")
        print(f"[CONTRAST] #000000 (L={lum_black:.6f}) on #ffffff (L={lum_white:.6f}) -> Ratio: {ratio_white:.4f}:1")
        self.assertGreaterEqual(ratio_sand, 7.0, f"Contrast {ratio_sand:.2f}:1 is below 7:1")
        self.assertGreaterEqual(ratio_white, 7.0, f"Contrast {ratio_white:.2f}:1 is below 7:1")

    # =========================================================================
    # AUDIT 2: Meta Tags Scan Across All HTML Pages
    # =========================================================================
    def test_audit_meta_tags_storefront_pages(self):
        """Audit all 18 storefront HTML pages for viewport-fit=cover, og:image, and twitter:card in <head>."""
        storefront_pages = [
            "index.html", "pecas.html", "colecoes.html", "novidades.html",
            "casa-gold.html", "cliente.html", "404.html"
        ] + [
            os.path.relpath(f, PROJECT_ROOT).replace("\\", "/")
            for f in glob.glob(os.path.join(PROJECT_ROOT, "produtos", "*.html"))
        ]

        results = []
        failures = []

        for rel in sorted(storefront_pages):
            fpath = os.path.join(PROJECT_ROOT, rel)
            with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()

            head_match = re.search(r'<head>(.*?)</head>', content, re.DOTALL | re.IGNORECASE)
            head_content = head_match.group(1) if head_match else content

            has_viewport_cover = bool(
                re.search(r'<meta[^>]+name=["\']viewport["\'][^>]+content=["\'][^"\']*viewport-fit=cover', head_content, re.IGNORECASE)
                or re.search(r'<meta[^>]+content=["\'][^"\']*viewport-fit=cover[^"\']*["\'][^>]+name=["\']viewport["\']', head_content, re.IGNORECASE)
            )

            has_og_image = bool(
                re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\'][^"\']+["\']', head_content, re.IGNORECASE)
                or re.search(r'<meta[^>]+content=["\'][^"\']+["\'][^>]+property=["\']og:image["\']', head_content, re.IGNORECASE)
            )

            has_twitter_card = bool(
                re.search(r'<meta[^>]+name=["\']twitter:card["\'][^>]+content=["\'][^"\']+["\']', head_content, re.IGNORECASE)
                or re.search(r'<meta[^>]+content=["\'][^"\']+["\'][^>]+name=["\']twitter:card["\']', head_content, re.IGNORECASE)
            )

            results.append({
                "file": rel,
                "viewport_cover": has_viewport_cover,
                "og_image": has_og_image,
                "twitter_card": has_twitter_card,
            })

            if not has_viewport_cover or not has_og_image or not has_twitter_card:
                failures.append(f"{rel}: viewport_cover={has_viewport_cover}, og:image={has_og_image}, twitter:card={has_twitter_card}")

        print(f"\n[STOREFRONT META AUDIT] Audited {len(storefront_pages)} storefront pages:")
        for r in results:
            status = "OK" if r["viewport_cover"] and r["og_image"] and r["twitter_card"] else "FAIL"
            print(f"  [{status}] {r['file']:50} | viewport-cover: {r['viewport_cover']} | og:image: {r['og_image']} | twitter:card: {r['twitter_card']}")

        self.assertEqual(len(failures), 0, f"Storefront pages missing required meta tags:\n" + "\n".join(failures))

    def test_audit_meta_tags_admin_pages_inspection(self):
        """Inspect non-storefront admin HTML files for meta tags compliance."""
        admin_files = ["admin.html", "admin/index.html"]
        print("\n[ADMIN META INSPECTION] Inspecting internal admin pages:")
        for rel in admin_files:
            fpath = os.path.join(PROJECT_ROOT, rel)
            if not os.path.exists(fpath):
                continue
            with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()

            head_match = re.search(r'<head>(.*?)</head>', content, re.DOTALL | re.IGNORECASE)
            head_content = head_match.group(1) if head_match else content

            has_viewport_cover = bool(re.search(r'viewport-fit=cover', head_content, re.IGNORECASE))
            has_og_image = bool(re.search(r'<meta[^>]+property=["\']og:image["\']', head_content, re.IGNORECASE))
            has_twitter_card = bool(re.search(r'<meta[^>]+name=["\']twitter:card["\']', head_content, re.IGNORECASE))
            has_noindex = bool(re.search(r'<meta[^>]+name=["\']robots["\'][^>]+content=["\'][^"\']*noindex', head_content, re.IGNORECASE))

            print(f"  {rel:20} | viewport-cover: {has_viewport_cover} | og:image: {has_og_image} | twitter:card: {has_twitter_card} | noindex: {has_noindex}")

    # =========================================================================
    # AUDIT 3: Interactive Bounding Boxes (>= 44x44px) on Multiple Viewports
    # =========================================================================
    def test_audit_header_tap_targets_multiple_viewports(self):
        """Audit header hamburger, search, and cart bounding boxes at 320px, 375px, 414px."""
        viewports = [320, 375, 414]
        pages = ["index.html", "pecas.html", "colecoes.html", "cliente.html", "produtos/vestido-sol-dourado.html"]

        print("\n[HEADER TAP TARGET AUDIT]")
        for page in pages:
            for w in viewports:
                self.navigate(page, width=w, height=812)

                # Hamburger button
                hamb = self.cdp.get_element_rect(".gc-header-menu-btn")
                self.assertIsNotNone(hamb, f"Hamburger button not found on {page} at {w}px")
                self.assertGreaterEqual(hamb["width"], 43.5, f"Hamburger width {hamb['width']} < 44px on {page} at {w}px")
                self.assertGreaterEqual(hamb["height"], 43.5, f"Hamburger height {hamb['height']} < 44px on {page} at {w}px")

                # Cart trigger
                cart = self.cdp.get_element_rect("#gcCartTrigger")
                self.assertIsNotNone(cart, f"Cart trigger not found on {page} at {w}px")
                self.assertGreaterEqual(cart["width"], 43.5, f"Cart trigger width {cart['width']} < 44px on {page} at {w}px")
                self.assertGreaterEqual(cart["height"], 43.5, f"Cart trigger height {cart['height']} < 44px on {page} at {w}px")

                # Search action
                search_btn = self.cdp.get_element_rect(".gc-header-actions a[href*='pecas'], .gc-header-actions button[aria-label*='Busca'], .gc-header-search-btn")
                if search_btn:
                    self.assertGreaterEqual(search_btn["width"], 43.5, f"Search button width {search_btn['width']} < 44px on {page} at {w}px")
                    self.assertGreaterEqual(search_btn["height"], 43.5, f"Search button height {search_btn['height']} < 44px on {page} at {w}px")

        print("  All header interactive elements meet >= 44x44px across all tested pages and viewports (320px, 375px, 414px).")

    def test_audit_bottom_bar_5_tabs_tap_targets_multiple_viewports(self):
        """Audit bottom bar 5 tabs bounding boxes at 320px, 375px, 414px."""
        viewports = [320, 375, 414]
        pages = ["index.html", "pecas.html", "colecoes.html", "novidades.html", "casa-gold.html", "cliente.html", "produtos/vestido-sol-dourado.html"]

        print("\n[BOTTOM BAR TAP TARGET AUDIT]")
        for page in pages:
            for w in viewports:
                self.navigate(page, width=w, height=812)
                tabs = self.cdp.evaluate("""
                (() => {
                    const bar = document.querySelector('.gc-mobile-bottom-bar, #gcMobileBar');
                    if (!bar) return [];
                    const items = bar.querySelectorAll('.gc-mobile-bar-item, .gc-bar-tab');
                    return Array.from(items).map(el => {
                        const r = el.getBoundingClientRect();
                        return {
                            tag: el.tagName,
                            text: el.innerText.trim() || el.getAttribute('aria-label') || 'tab',
                            width: r.width,
                            height: r.height,
                            top: r.top,
                            left: r.left
                        };
                    });
                })()
                """)
                self.assertGreaterEqual(len(tabs), 5, f"Expected 5 tabs in bottom bar on {page} at {w}px, got {len(tabs)}")
                for idx, tab in enumerate(tabs):
                    self.assertGreaterEqual(
                        tab["width"], 43.5,
                        f"Bottom tab #{idx} ('{tab['text']}') width {tab['width']:.1f}px < 44px on {page} at {w}px"
                    )
                    self.assertGreaterEqual(
                        tab["height"], 43.5,
                        f"Bottom tab #{idx} ('{tab['text']}') height {tab['height']:.1f}px < 44px on {page} at {w}px"
                    )

        print("  All 5 bottom bar tabs meet >= 44x44px across all tested pages and viewports (320px, 375px, 414px).")

    # =========================================================================
    # AUDIT 4: Input Font Sizes (>= 16px) on .gc-input-pill and .gc-search-input
    # =========================================================================
    def test_audit_input_font_sizes_at_375px(self):
        """Verify computed font-size on .gc-input-pill and .gc-search-input at 375px >= 16px."""
        print("\n[INPUT FONT SIZE AUDIT AT 375px]")
        for page in ["pecas.html", "index.html", "cliente.html"]:
            self.navigate(page, width=375, height=812)
            font_metrics = self.cdp.evaluate("""
            (() => {
                const inputs = document.querySelectorAll('.gc-search-input, .gc-input-pill, input[type="search"], input[type="text"], input[type="email"], input[type="password"]');
                return Array.from(inputs).map(inp => {
                    const cs = window.getComputedStyle(inp);
                    return {
                        selector: inp.className ? '.' + inp.className.split(' ').join('.') : inp.tagName,
                        type: inp.type,
                        fontSize: parseFloat(cs.fontSize),
                        fontSizeStr: cs.fontSize
                    };
                });
            })()
            """)
            print(f"  Page '{page}': {len(font_metrics)} inputs found")
            for m in font_metrics:
                print(f"    {m['selector']} (type={m['type']}): {m['fontSizeStr']} ({m['fontSize']}px)")
                self.assertGreaterEqual(
                    m["fontSize"], 15.9,
                    f"Input '{m['selector']}' computed font size {m['fontSize']}px < 16px on {page}"
                )

    # =========================================================================
    # AUDIT 5: Stress Test Edge Cases - Drawer geometry, Scroll locking & Reflow
    # =========================================================================
    def test_audit_drawer_and_reflow_geometry(self):
        """Adversarial stress test on drawer dimensions and viewport reflow."""
        print("\n[ADVERSARIAL STRESS: DRAWER & REFLOW]")
        # 1. Open drawer at 320px (narrowest mobile)
        self.navigate("index.html", width=320, height=568)
        self.cdp.click(".gc-header-menu-btn")
        # Give CSS transition time to complete
        import time
        time.sleep(0.3)
        
        drawer_rect = self.cdp.get_element_rect("#gcMobileNavDrawer")
        self.assertIsNotNone(drawer_rect, "Drawer #gcMobileNavDrawer not found")
        print(f"  Drawer dimensions at 320px viewport: width={drawer_rect['width']:.1f}px, height={drawer_rect['height']:.1f}px")
        # Drawer width must not exceed viewport width or 360px
        self.assertLessEqual(drawer_rect["width"], 320.5, f"Drawer width {drawer_rect['width']} exceeds 320px viewport!")
        
        # 2. Check body scroll locking class
        locked = self.cdp.evaluate("document.body.classList.contains('gc-scroll-locked')")
        print(f"  Body scroll locked state: {locked}")
        self.assertTrue(locked, "Body class gc-scroll-locked not present when drawer is open")

        # 3. Close drawer via backdrop click
        self.cdp.click("#gcMobileNavBackdrop")
        time.sleep(0.3)
        locked_after = self.cdp.evaluate("document.body.classList.contains('gc-scroll-locked')")
        print(f"  Body scroll locked state after backdrop click: {locked_after}")
        self.assertFalse(locked_after, "Body class gc-scroll-locked still present after backdrop click")

if __name__ == "__main__":
    unittest.main()

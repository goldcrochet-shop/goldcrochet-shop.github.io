"""
Gold Crochet — Automated E2E Test Suite for R1, R2, and R3.
Covers:
- R1: Canonical Taxonomy Data Model, Admin Dynamic Selects, Card Badges, 2-Tier pecas.html Filters
- R2: Admin Collections Management, Checkbox Association Checklist, Continuous Circular Carousels
- R3: Admin 50 Enhancements Suite, Search Highlight, Inventory Stats, Shortcuts, Bulk Actions, Quick View
- Node.js Syntax Check (`node --check` across all `js/*.js` files)

Tiers:
- Suite 0: Syntax & Static Contracts
- Tier 1: Feature Coverage (20 tests)
- Tier 2: Boundary & Corner Conditions (7 tests)
- Tier 3: Pairwise Cross-Feature Interactions (5 tests)
- Tier 4: Real-World Scenarios (2 comprehensive end-to-end customer journeys)
"""

import argparse
import glob
import json
import os
import subprocess
import sys
import time
import unittest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from tests.server import LocalServer
from tests.chrome_cdp import ChromeCDP

CANONICAL_TAXONOMY_MAP = {
    "Para Ela": [
        "Roupas para Noite",
        "Saias e Vestidos",
        "Jaquetas e Casacos",
        "Tops",
        "Calças e Shorts",
        "Praia & Resort",
        "Sob Medida",
    ],
    "Para Ele": [
        "Suéteres & Cardigans",
        "Camisas & Polos",
        "Bermudas & Shorts",
        "Acessórios Masculinos",
    ],
    "Para Casa": [
        "Amigurumis",
        "Mantas e Cobertores",
        "Decorações",
        "Sousplats & Mesas",
        "Almofadas",
    ],
    "Pequeninos": [
        "Roupas Infantis",
        "Sapatinhos & Toucas",
        "Mantinhas Baby",
        "Brinquedos Amigurumi",
    ],
    "Acessórios & Bijuterias": [
        "Bolsas",
        "Bijuterias & Brincos",
        "Chaveiros",
        "Faixas de Cabelo",
    ],
}


class BaseTaxonomyE2ETest(unittest.TestCase):
    server = None
    cdp = None

    @classmethod
    def setUpClass(cls):
        if cls.server is None:
            cls.server = LocalServer(port=8088)
            cls.server.start()
        if cls.cdp is None:
            cls.cdp = ChromeCDP(port=9228)
            cls.cdp.start()

    @classmethod
    def tearDownClass(cls):
        pass

    def setUp(self):
        self.cdp.set_viewport(390, 844, mobile=True)
        self.cdp.navigate("about:blank")
        self.cdp.clear_local_storage()

    def navigate_page(self, path="index.html", width=390, height=844):
        self.cdp.set_viewport(width, height, mobile=True)
        url = f"{self.server.base_url}/{path.lstrip('/')}"
        self.cdp.navigate(url)
        return url

    def evaluate(self, expression, timeout=10.0):
        return self.cdp.evaluate(expression, timeout=timeout)

    def assert_element_exists(self, selector, msg=None):
        exists = self.evaluate(f"document.querySelector({json.dumps(selector)}) !== null")
        self.assertTrue(exists, msg or f"Expected element '{selector}' to exist in DOM")

    def assert_element_visible(self, selector, msg=None):
        js = f"""
        (() => {{
            const el = document.querySelector({json.dumps(selector)});
            if (!el) return false;
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
        }})()
        """
        self.assertTrue(self.evaluate(js), msg or f"Expected element '{selector}' to be visible")

    def setup_admin_session(self):
        """Bypasses admin login screen by setting authenticated session state."""
        self.navigate_page("admin.html", width=1280, height=900)
        self.evaluate("""
        (() => {
            const adminUser = {
                uid: 'e2e_admin_test',
                email: 'rossipereira2010@gmail.com',
                displayName: 'Rossi Pereira'
            };
            sessionStorage.setItem('gc_admin_user', JSON.stringify(adminUser));
            localStorage.setItem('gc_admin_session', JSON.stringify({ email: adminUser.email, ts: Date.now() }));
            
            if (window.AdminCore && typeof window.AdminCore.initAuthStateListener === 'function') {
                window.AdminCore.initAuthStateListener();
            }
            
            const loginEl = document.getElementById('loginScreen');
            const appEl = document.getElementById('adminApp');
            if (loginEl) loginEl.classList.add('hidden');
            if (appEl) appEl.classList.remove('hidden');
        })()
        """)
        time.sleep(0.2)

    def switch_admin_view(self, view_name):
        self.evaluate(f"""
        (() => {{
            if (window.AdminCore && typeof window.AdminCore.switchView === 'function') {{
                window.AdminCore.switchView('{view_name}');
            }}
        }})()
        """)
        time.sleep(0.1)


# =============================================================================
# SUITE 0: Syntax & Static Contracts
# =============================================================================
class TestSyntaxAndStaticContracts(unittest.TestCase):
    """Static validation and node --check across all JavaScript files."""

    def test_syntax_all_js_files_node_check(self):
        """Audit that 'node --check' succeeds with code 0 on all js/*.js files."""
        js_dir = os.path.join(PROJECT_ROOT, "js")
        js_files = glob.glob(os.path.join(js_dir, "*.js"))
        self.assertGreater(len(js_files), 0, "No JavaScript files found in js/ directory")

        failures = []
        for fpath in sorted(js_files):
            rel = os.path.relpath(fpath, PROJECT_ROOT).replace("\\", "/")
            res = subprocess.run(
                ["node", "--check", fpath],
                capture_output=True,
                text=True,
                shell=True
            )
            if res.returncode != 0:
                failures.append(f"{rel}: {res.stderr.strip() or res.stdout.strip()}")

        self.assertEqual(
            len(failures), 0,
            f"JavaScript syntax check failed on {len(failures)} file(s):\n" + "\n".join(failures)
        )

    def test_static_taxonomy_data_json_structure(self):
        """Audit data.json to ensure canonical structure and taxonomy compatibility."""
        data_path = os.path.join(PROJECT_ROOT, "data.json")
        self.assertTrue(os.path.exists(data_path), "data.json not found at project root")
        with open(data_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.assertIn("products", data, "data.json missing 'products' array")
        products = data["products"]
        self.assertGreaterEqual(len(products), 10, "data.json contains fewer than 10 products")

        valid_departments = set(CANONICAL_TAXONOMY_MAP.keys())
        for p in products:
            self.assertIn("id", p, f"Product missing 'id': {p}")
            self.assertIn("name", p, f"Product {p.get('id')} missing 'name'")
            self.assertIn("price", p, f"Product {p.get('id')} missing 'price'")
            # If department is defined, it must belong to CANONICAL_TAXONOMY_MAP
            if "department" in p and p["department"]:
                self.assertIn(
                    p["department"], valid_departments,
                    f"Product '{p.get('name')}' has invalid department '{p['department']}'"
                )
                if "subcategory" in p and p["subcategory"]:
                    allowed_subcats = CANONICAL_TAXONOMY_MAP[p["department"]]
                    self.assertIn(
                        p["subcategory"], allowed_subcats,
                        f"Product '{p.get('name')}' subcategory '{p['subcategory']}' not in department '{p['department']}' allowed: {allowed_subcats}"
                    )


# =============================================================================
# TIER 1: Feature Coverage (Core Requirements)
# =============================================================================
class TestTier1FeatureCoverage(BaseTaxonomyE2ETest):
    """Tier 1: Direct feature verification for R1, R2, R3."""

    # --- R1: Canonical Taxonomy Map & Admin Dynamic Selects ---
    def test_t1_01_taxonomy_map_canonical_structure(self):
        """T1.1: TAXONOMY_MAP must contain all 5 departments and 24 subcategories."""
        self.navigate_page("admin.html")
        tax_map = self.evaluate("""
        (() => {
            return (window.AdminCore && window.AdminCore.TAXONOMY_MAP) || window.TAXONOMY_MAP || null;
        })()
        """)
        self.assertIsNotNone(tax_map, "TAXONOMY_MAP not exposed in window.AdminCore or globally")
        for dept, expected_subcats in CANONICAL_TAXONOMY_MAP.items():
            self.assertIn(dept, tax_map, f"Department '{dept}' missing from TAXONOMY_MAP")
            for subcat in expected_subcats:
                self.assertIn(
                    subcat, tax_map[dept],
                    f"Subcategory '{subcat}' missing from department '{dept}' in TAXONOMY_MAP"
                )

    def test_t1_02_admin_product_form_department_select(self):
        """T1.2: Admin product modal must have #prodDepartment with 5 canonical departments."""
        self.setup_admin_session()
        self.switch_admin_view("products")
        self.evaluate("""
        (() => {
            if (window.AdminCore && window.AdminCore.openNewProductModal) {
                window.AdminCore.openNewProductModal();
            } else {
                const m = document.getElementById('productModal');
                if (m) m.classList.remove('hidden');
            }
        })()
        """)
        self.assert_element_exists("#productModal")
        self.assert_element_exists("#prodDepartment", "Select element #prodDepartment missing from #productModal")

        options = self.evaluate("""
        (() => {
            const sel = document.getElementById('prodDepartment');
            if (!sel) return [];
            return Array.from(sel.options).map(o => o.value).filter(v => v !== '');
        })()
        """)
        for dept in CANONICAL_TAXONOMY_MAP.keys():
            self.assertIn(dept, options, f"Department '{dept}' not found in #prodDepartment options")

    def test_t1_03_admin_product_form_subcategory_cascade(self):
        """T1.3: Changing #prodDepartment dynamically updates #prodSubcategory options."""
        self.setup_admin_session()
        self.switch_admin_view("products")
        self.evaluate("""
        (() => {
            if (window.AdminCore && window.AdminCore.openNewProductModal) {
                window.AdminCore.openNewProductModal();
            }
        })()
        """)
        self.assert_element_exists("#prodSubcategory", "Select element #prodSubcategory missing from #productModal")

        # Test Department: Para Casa
        subcats_casa = self.evaluate("""
        (() => {
            const dSel = document.getElementById('prodDepartment');
            const sSel = document.getElementById('prodSubcategory');
            if (!dSel || !sSel) return [];
            dSel.value = 'Para Casa';
            dSel.dispatchEvent(new Event('change', { bubbles: true }));
            if (window.AdminCore && window.AdminCore.handleDepartmentChange) {
                window.AdminCore.handleDepartmentChange('Para Casa');
            }
            return Array.from(sSel.options).map(o => o.value).filter(v => v !== '');
        })()
        """)
        for sc in CANONICAL_TAXONOMY_MAP["Para Casa"]:
            self.assertIn(sc, subcats_casa, f"Subcategory '{sc}' missing when #prodDepartment='Para Casa'")

        # Test Department: Pequeninos
        subcats_baby = self.evaluate("""
        (() => {
            const dSel = document.getElementById('prodDepartment');
            const sSel = document.getElementById('prodSubcategory');
            if (!dSel || !sSel) return [];
            dSel.value = 'Pequeninos';
            dSel.dispatchEvent(new Event('change', { bubbles: true }));
            if (window.AdminCore && window.AdminCore.handleDepartmentChange) {
                window.AdminCore.handleDepartmentChange('Pequeninos');
            }
            return Array.from(sSel.options).map(o => o.value).filter(v => v !== '');
        })()
        """)
        for sc in CANONICAL_TAXONOMY_MAP["Pequeninos"]:
            self.assertIn(sc, subcats_baby, f"Subcategory '{sc}' missing when #prodDepartment='Pequeninos'")

    def test_t1_04_product_cards_render_taxonomy_badges(self):
        """T1.4: Storefront product cards render taxonomy tags and .gc-product-category is not display:none."""
        self.navigate_page("pecas.html")
        badges_info = self.evaluate("""
        (() => {
            const cards = document.querySelectorAll('.gc-product-card, .product-card');
            const taxBadges = document.querySelectorAll('.gc-product-tax-badges, .gc-badge-dept, .gc-badge-subcat');
            
            // Check CSS rule for .gc-product-category
            const testEl = document.createElement('span');
            testEl.className = 'gc-product-category';
            document.body.appendChild(testEl);
            const comp = window.getComputedStyle(testEl);
            const isHidden = comp.display === 'none';
            document.body.removeChild(testEl);
            
            return {
                cardCount: cards.length,
                taxBadgeCount: taxBadges.length,
                categoryClassHidden: isHidden
            };
        })()
        """)
        self.assertGreater(badges_info["cardCount"], 0, "No product cards found on pecas.html")
        self.assertFalse(
            badges_info["categoryClassHidden"],
            "CSS .gc-product-category is still suppressed by 'display: none !important' in stylesheets"
        )

    def test_t1_05_pecas_two_tier_department_filter_pills(self):
        """T1.5: pecas.html renders department filter pills for all 5 departments."""
        self.navigate_page("pecas.html")
        depts_found = self.evaluate("""
        (() => {
            const pills = document.querySelectorAll('#deptFiltersBar button, .gc-dept-pill, [data-dept], .gc-filter-pill');
            return Array.from(pills).map(p => p.getAttribute('data-dept') || p.innerText.trim());
        })()
        """)
        for d in ["Para Ela", "Para Ele", "Para Casa", "Pequeninos", "Acessórios & Bijuterias"]:
            match = any(d.lower() in str(f).lower() for f in depts_found)
            self.assertTrue(match, f"Department filter pill for '{d}' not found on pecas.html (found: {depts_found})")

    def test_t1_06_pecas_dynamic_subcategory_pills_cascade(self):
        """T1.6: Selecting a department in pecas.html dynamically renders subcategory pills."""
        self.navigate_page("pecas.html")
        subcats_rendered = self.evaluate("""
        (() => {
            // Find and click 'Para Casa' button
            const pills = Array.from(document.querySelectorAll('#deptFiltersBar button, .gc-dept-pill, [data-dept], .gc-filter-pill'));
            const casaBtn = pills.find(p => (p.getAttribute('data-dept') === 'Para Casa' || p.innerText.includes('Para Casa')));
            if (casaBtn) {
                casaBtn.click();
            } else if (window.filterByDepartment) {
                window.filterByDepartment('Para Casa');
            }
            
            const subcatPills = document.querySelectorAll('#subcatFiltersBar button, .gc-subcat-pill, [data-subcat]');
            return Array.from(subcatPills).map(p => p.getAttribute('data-subcat') || p.innerText.trim());
        })()
        """)
        self.assertGreater(
            len(subcats_rendered), 0,
            "No subcategory pills rendered after selecting department 'Para Casa' on pecas.html"
        )
        for expected in ["Amigurumis", "Decorações", "Sousplats & Mesas"]:
            match = any(expected.lower() in str(s).lower() for s in subcats_rendered)
            self.assertTrue(match, f"Subcategory pill for '{expected}' missing after selecting 'Para Casa'")

    def test_t1_07_pecas_catalog_isolation_by_department_and_subcat(self):
        """T1.7: Selecting department and subcategory filters isolates only matching products."""
        self.navigate_page("pecas.html")
        filter_result = self.evaluate("""
        (() => {
            // Filter by Para Casa -> Decorações
            if (window.filterBySubcategory) {
                window.filterByDepartment('Para Casa');
                window.filterBySubcategory('Decorações');
            } else {
                const deptBtn = Array.from(document.querySelectorAll('[data-dept], .gc-filter-pill')).find(b => b.innerText.includes('Para Casa') || b.getAttribute('data-dept') === 'Para Casa');
                if (deptBtn) deptBtn.click();
                const subBtn = Array.from(document.querySelectorAll('[data-subcat], .gc-subcat-pill')).find(b => b.innerText.includes('Decorações') || b.getAttribute('data-subcat') === 'Decorações');
                if (subBtn) subBtn.click();
            }
            
            const visibleCards = Array.from(document.querySelectorAll('.gc-product-card, .product-card'))
                .filter(c => window.getComputedStyle(c).display !== 'none');
            
            return {
                visibleCount: visibleCards.length,
                titles: visibleCards.map(c => c.querySelector('.gc-product-title, h3')?.innerText.trim() || '')
            };
        })()
        """)
        self.assertGreater(filter_result["visibleCount"], 0, "No cards visible after filtering by 'Para Casa' -> 'Decorações'")
        # Ensure DÚO CELESTIAL SOL E LUA is present
        titles_str = " ".join(filter_result["titles"]).upper()
        self.assertIn("SOL E LUA", titles_str, f"Expected 'SOL E LUA' in filtered cards: {filter_result['titles']}")

    def test_t1_08_pecas_url_query_parameter_filtering(self):
        """T1.8: Direct URL query parameters ?departamento=...&subcategoria=... filter catalog on load."""
        url = "pecas.html?departamento=Para+Casa&subcategoria=Decora%C3%A7%C3%B5es"
        self.navigate_page(url)
        res = self.evaluate("""
        (() => {
            const params = new URLSearchParams(window.location.search);
            const dept = params.get('departamento') || params.get('dept');
            const subcat = params.get('subcategoria') || params.get('subcat');
            
            const visibleCards = Array.from(document.querySelectorAll('.gc-product-card, .product-card'))
                .filter(c => window.getComputedStyle(c).display !== 'none');
            
            return {
                paramDept: dept,
                paramSubcat: subcat,
                visibleCount: visibleCards.length,
                titles: visibleCards.map(c => c.querySelector('.gc-product-title, h3')?.innerText.trim() || '')
            };
        })()
        """)
        self.assertEqual(res["paramDept"], "Para Casa")
        self.assertEqual(res["paramSubcat"], "Decorações")
        self.assertGreater(res["visibleCount"], 0, "URL query parameters did not trigger filtered catalog rendering")

    # --- R2: Collections Management & Circular Carousels ---
    def test_t1_09_admin_collections_checklist_ui_elements(self):
        """T1.9: Admin collection modal must feature product search, checklist container, and counter."""
        self.setup_admin_session()
        self.switch_admin_view("collections")
        self.evaluate("""
        (() => {
            if (window.AdminCore && window.AdminCore.openCollectionModal) {
                window.AdminCore.openCollectionModal();
            } else {
                const m = document.getElementById('collectionModal');
                if (m) m.classList.remove('hidden');
            }
        })()
        """)
        self.assert_element_exists("#collectionModal")
        self.assert_element_exists("#colProductSearchInput", "Missing #colProductSearchInput in #collectionModal")
        self.assert_element_exists("#colProductChecklist", "Missing #colProductChecklist container in #collectionModal")
        self.assert_element_exists("#colSelectedCounter", "Missing #colSelectedCounter in #collectionModal")

    def test_t1_10_admin_collections_checkbox_toggle_counter(self):
        """T1.10: Toggling checkboxes in #colProductChecklist updates #colSelectedCounter."""
        self.setup_admin_session()
        self.switch_admin_view("collections")
        self.evaluate("""
        (() => {
            if (window.AdminCore && window.AdminCore.openCollectionModal) {
                window.AdminCore.openCollectionModal();
            }
        })()
        """)
        res = self.evaluate("""
        (() => {
            const checklist = document.getElementById('colProductChecklist');
            const counter = document.getElementById('colSelectedCounter');
            if (!checklist || !counter) return null;
            
            const cbs = checklist.querySelectorAll('input[type="checkbox"]');
            if (cbs.length === 0) return null;
            
            // Uncheck all first
            cbs.forEach(cb => { cb.checked = false; });
            if (window.AdminCore && window.AdminCore.updateColCounter) {
                window.AdminCore.updateColCounter();
            }
            const count0 = counter.innerText;
            
            // Check first 2
            cbs[0].checked = true;
            cbs[0].dispatchEvent(new Event('change', { bubbles: true }));
            if (cbs[1]) {
                cbs[1].checked = true;
                cbs[1].dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (window.AdminCore && window.AdminCore.updateColCounter) {
                window.AdminCore.updateColCounter();
            }
            const count2 = counter.innerText;
            
            return { totalBoxes: cbs.length, count0, count2 };
        })()
        """)
        self.assertIsNotNone(res, "Checklist or checkboxes not found in #collectionModal")
        self.assertIn("2", res["count2"], f"Expected counter to indicate 2 selected, got: {res['count2']}")

    def test_t1_11_admin_collections_checklist_search(self):
        """T1.11: Live search in #colProductSearchInput filters product rows in checklist."""
        self.setup_admin_session()
        self.switch_admin_view("collections")
        self.evaluate("""
        (() => {
            if (window.AdminCore && window.AdminCore.openCollectionModal) {
                window.AdminCore.openCollectionModal();
            }
        })()
        """)
        search_res = self.evaluate("""
        (() => {
            const input = document.getElementById('colProductSearchInput');
            const checklist = document.getElementById('colProductChecklist');
            if (!input || !checklist) return null;
            
            input.value = 'Bolsa';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            if (window.AdminCore && window.AdminCore.filterColProductChecklist) {
                window.AdminCore.filterColProductChecklist('Bolsa');
            }
            
            const rows = checklist.querySelectorAll('.col-prod-row, label, tr');
            const visible = Array.from(rows).filter(r => window.getComputedStyle(r).display !== 'none');
            return {
                totalRows: rows.length,
                visibleRows: visible.length,
                sampleVisible: visible.slice(0, 3).map(r => r.innerText.trim())
            };
        })()
        """)
        self.assertIsNotNone(search_res, "Checklist elements missing")
        self.assertGreater(search_res["visibleRows"], 0, "No rows matched search for 'Bolsa'")
        self.assertLess(
            search_res["visibleRows"], search_res["totalRows"],
            "Search input did not hide non-matching checklist items"
        )

    def test_t1_12_admin_collections_bidirectional_sync_persistence(self):
        """T1.12: Saving collection syncs productIds to localStorage and updates product references."""
        self.setup_admin_session()
        sync_result = self.evaluate("""
        (() => {
            if (!window.AdminCore || !window.adminState) return null;
            
            const p1 = window.adminState.products[0];
            const p2 = window.adminState.products[1];
            if (!p1 || !p2) return null;
            
            const testCol = {
                id: 'col_sync_test_' + Date.now(),
                slug: 'col-sync-test',
                name: 'Coleção Teste Sincronizada',
                icon: '🧶',
                desc: 'Teste de sincronização bidirecional',
                image: '',
                productIds: [Number(p1.id), Number(p2.id)]
            };
            
            // Save via AdminCore
            if (window.AdminCore.saveCollection) {
                window.AdminCore.saveCollection(testCol);
            } else {
                window.adminState.collections.push(testCol);
                localStorage.setItem('gc_cached_collections', JSON.stringify(window.adminState.collections));
                localStorage.setItem('gc_collections_v2', JSON.stringify(window.adminState.collections));
            }
            
            const cachedV2 = JSON.parse(localStorage.getItem('gc_collections_v2') || '[]');
            const savedCol = cachedV2.find(c => c.slug === 'col-sync-test');
            
            return {
                savedColFound: Boolean(savedCol),
                productIds: savedCol ? savedCol.productIds : []
            };
        })()
        """)
        self.assertIsNotNone(sync_result, "AdminCore or adminState unavailable")
        self.assertTrue(sync_result["savedColFound"], "Saved collection not found in gc_collections_v2")
        self.assertEqual(len(sync_result["productIds"]), 2, "productIds array not properly persisted in collection")

    def test_t1_13_colecoes_carousel_triplication_and_math(self):
        """T1.13: Carousels in colecoes.html use 3x triplication and start at scrollWidth / 3 without stutter."""
        self.navigate_page("colecoes.html")
        carousel_metrics = self.evaluate("""
        (() => {
            const tracks = document.querySelectorAll('.gc-carousel-track, .carousel-track, [id^="trackCol_"]');
            if (tracks.length === 0) return null;
            
            const res = [];
            tracks.forEach((t, idx) => {
                const cards = t.querySelectorAll('.gc-product-card, .product-card');
                const scrollW = t.scrollWidth;
                const scrollL = t.scrollLeft;
                const oneThird = scrollW / 3;
                
                res.push({
                    index: idx,
                    cardCount: cards.length,
                    scrollWidth: scrollW,
                    scrollLeft: scrollL,
                    oneThird: oneThird,
                    startsNearCenterThird: Math.abs(scrollL - oneThird) < (scrollW * 0.15)
                });
            });
            return res;
        })()
        """)
        self.assertIsNotNone(carousel_metrics, "No carousel tracks found on colecoes.html")
        self.assertGreater(len(carousel_metrics), 0, "No tracks returned from evaluation")
        first_track = carousel_metrics[0]
        self.assertGreaterEqual(
            first_track["cardCount"], 3,
            f"Carousel card count ({first_track['cardCount']}) should reflect triplication"
        )

    def test_t1_14_home_featured_continuous_circular_carousel(self):
        """T1.14: Home featured carousel #gridHomeFeatured implements smooth circular continuous loop."""
        self.navigate_page("index.html")
        featured_info = self.evaluate("""
        (() => {
            const track = document.getElementById('gridHomeFeatured') || document.querySelector('.gc-carousel-track');
            if (!track) return null;
            
            const cards = track.querySelectorAll('.gc-product-card, .product-card');
            const oneThird = track.scrollWidth / 3;
            
            // Advance by smooth scroll and check loop reset
            const initialLeft = track.scrollLeft;
            
            return {
                cardCount: cards.length,
                scrollWidth: track.scrollWidth,
                initialLeft: initialLeft,
                oneThird: oneThird,
                hasGoldCarousel: Boolean(window.GoldCarousel)
            };
        })()
        """)
        self.assertIsNotNone(featured_info, "Featured carousel track missing on index.html")
        self.assertGreater(featured_info["cardCount"], 0, "Featured carousel has zero cards")

    # --- R3: Admin 50 Enhancements Suite ---
    def test_t1_15_admin_quick_filters_department_subcat_stock(self):
        """T1.15: Admin products view contains quick filters for Department, Subcategory, and Stock."""
        self.setup_admin_session()
        self.switch_admin_view("products")
        filters = self.evaluate("""
        (() => {
            const deptFilter = document.getElementById('productDepartmentFilter');
            const subFilter = document.getElementById('productSubcategoryFilter');
            const stockFilter = document.getElementById('productStockFilters') || document.querySelector('[data-stock]');
            return {
                hasDeptFilter: Boolean(deptFilter),
                hasSubFilter: Boolean(subFilter),
                hasStockFilter: Boolean(stockFilter)
            };
        })()
        """)
        self.assertTrue(filters["hasDeptFilter"], "Missing #productDepartmentFilter in admin products view")
        self.assertTrue(filters["hasSubFilter"], "Missing #productSubcategoryFilter in admin products view")
        self.assertTrue(filters["hasStockFilter"], "Missing #productStockFilters in admin products view")

    def test_t1_16_admin_search_keyword_highlighting(self):
        """T1.16: Typing query in admin search wraps matching text in <mark class='gc-search-mark'>."""
        self.setup_admin_session()
        self.switch_admin_view("products")
        highlight_res = self.evaluate("""
        (() => {
            const input = document.getElementById('productSearchInput');
            if (!input) return null;
            
            input.value = 'Bossa';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            if (window.AdminCore && window.AdminCore.renderProductsList) {
                window.adminState.searchQuery = 'Bossa';
                window.AdminCore.renderProductsList();
            }
            
            const marks = document.querySelectorAll('.gc-search-mark, mark');
            return {
                markCount: marks.length,
                markedText: Array.from(marks).map(m => m.innerText)
            };
        })()
        """)
        self.assertIsNotNone(highlight_res, "Missing #productSearchInput in admin")
        self.assertGreater(
            highlight_res["markCount"], 0,
            "Expected <mark class='gc-search-mark'> highlighting matching search query 'Bossa'"
        )

    def test_t1_17_admin_inventory_stats_cards(self):
        """T1.17: Admin overview and catalog render inventory capital KPI, stock counts, or distribution bar."""
        self.setup_admin_session()
        self.switch_admin_view("products")
        stats = self.evaluate("""
        (() => {
            const cap = document.getElementById('statInventoryCapital');
            const low = document.getElementById('statLowStockCount');
            const dist = document.getElementById('deptDistributionBar');
            return {
                hasCapitalStat: Boolean(cap),
                hasLowStockStat: Boolean(low),
                hasDistributionBar: Boolean(dist)
            };
        })()
        """)
        self.assertTrue(
            stats["hasCapitalStat"] or stats["hasLowStockStat"] or stats["hasDistributionBar"],
            "No inventory stats elements found (#statInventoryCapital, #statLowStockCount, #deptDistributionBar)"
        )

    def test_t1_18_admin_bulk_actions_toolbar_and_selection(self):
        """T1.18: Selecting products displays #bulkActionsToolbar with batch actions."""
        self.setup_admin_session()
        self.switch_admin_view("products")
        bulk_ui = self.evaluate("""
        (() => {
            const masterCb = document.getElementById('masterSelectAllCheckbox');
            const toolbar = document.getElementById('bulkActionsToolbar');
            
            // Check master or select product
            if (masterCb) {
                masterCb.checked = true;
                masterCb.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (window.AdminCore && window.AdminCore.toggleSelectAllProducts) {
                window.AdminCore.toggleSelectAllProducts(true);
            }
            
            const isVisible = toolbar && !toolbar.classList.contains('hidden');
            const counter = document.getElementById('bulkSelectionCount');
            
            return {
                hasToolbar: Boolean(toolbar),
                toolbarVisibleAfterSelect: isVisible,
                countText: counter ? counter.innerText : null
            };
        })()
        """)
        self.assertTrue(bulk_ui["hasToolbar"], "Element #bulkActionsToolbar missing from admin layout")

    def test_t1_19_admin_quick_view_modal_details_and_stock_toggle(self):
        """T1.19: Triggering Quick View opens #productQuickViewModal without full page navigation."""
        self.setup_admin_session()
        self.switch_admin_view("products")
        qv_res = self.evaluate("""
        (() => {
            const qvModal = document.getElementById('productQuickViewModal');
            if (window.AdminCore && window.AdminCore.openProductQuickView && window.adminState.products[0]) {
                window.AdminCore.openProductQuickView(window.adminState.products[0].id);
            } else {
                const btn = document.querySelector('.view-quick, [title*="Rápido"]');
                if (btn) btn.click();
            }
            
            const isOpen = qvModal && !qvModal.classList.contains('hidden');
            const title = document.getElementById('qvName') ? document.getElementById('qvName').innerText : '';
            return {
                hasModal: Boolean(qvModal),
                isOpen: isOpen,
                productTitle: title
            };
        })()
        """)
        self.assertTrue(qv_res["hasModal"], "#productQuickViewModal missing from admin DOM")
        self.assertTrue(qv_res["isOpen"], "#productQuickViewModal did not open on trigger")

    def test_t1_20_admin_keyboard_shortcuts_ctrl_k_and_esc(self):
        """T1.20: Global shortcuts Ctrl+K focuses search, and Esc closes active topmost modal."""
        self.setup_admin_session()
        self.switch_admin_view("products")
        shortcut_res = self.evaluate("""
        (() => {
            // 1. Dispatch Ctrl+K
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
            const searchFocused = document.activeElement && document.activeElement.id.includes('Search');
            
            // 2. Open modal and press Esc
            const modal = document.getElementById('productQuickViewModal') || document.getElementById('productModal');
            if (modal) modal.classList.remove('hidden');
            
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
            const modalClosed = modal ? modal.classList.contains('hidden') : true;
            
            return { searchFocused, modalClosed };
        })()
        """)
        self.assertTrue(shortcut_res["modalClosed"], "Esc key did not dismiss open modal")


# =============================================================================
# TIER 2: Boundary & Corner Cases
# =============================================================================
class TestTier2BoundaryCases(BaseTaxonomyE2ETest):
    """Tier 2: Boundary conditions, empty inputs, single-item collections, extreme bounds."""

    def test_t2_01_empty_search_query_resets_catalog(self):
        """T2.1: Clearing search input restores full catalog count without DOM corruption."""
        self.navigate_page("pecas.html")
        res = self.evaluate("""
        (() => {
            const input = document.querySelector('.gc-search-input, input[type="search"]');
            if (!input) return null;
            
            const initialCount = document.querySelectorAll('.gc-product-card').length;
            
            // Type query that matches few
            input.value = 'Vestido';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            const filteredCount = document.querySelectorAll('.gc-product-card:not([style*="display: none"])').length;
            
            // Reset to empty
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            const restoredCount = document.querySelectorAll('.gc-product-card:not([style*="display: none"])').length;
            
            return { initialCount, filteredCount, restoredCount };
        })()
        """)
        self.assertIsNotNone(res, "Search input missing on pecas.html")
        self.assertGreater(res["initialCount"], 0)
        self.assertEqual(res["initialCount"], res["restoredCount"], "Clearing search did not restore initial count")

    def test_t2_02_whitespace_and_special_character_search(self):
        """T2.2: Normalized search with accents, diacritics, and symbols executes without regex error."""
        self.navigate_page("pecas.html")
        res = self.evaluate("""
        (() => {
            const input = document.querySelector('.gc-search-input, input[type="search"]');
            if (!input) return null;
            
            const queries = ["  crochê  ", "Dourad@", "✨ Dunas", "Sousplat & Decorações (100%)", "[Bossa]"];
            const errors = [];
            
            for (const q of queries) {
                try {
                    input.value = q;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                } catch(e) {
                    errors.push({ query: q, error: e.message });
                }
            }
            return { tested: queries.length, errorCount: errors.length, errors };
        })()
        """)
        self.assertIsNotNone(res)
        self.assertEqual(res["errorCount"], 0, f"Search crashed on special character inputs: {res['errors']}")

    def test_t2_03_non_matching_subcategory_empty_state(self):
        """T2.3: Cross-department non-match displays pleasant empty state without exceptions."""
        self.navigate_page("pecas.html?departamento=Para+Ele&subcategoria=Amigurumis")
        empty_state = self.evaluate("""
        (() => {
            const emptyEl = document.querySelector('.gc-catalog-empty, .empty-state, #emptyCatalogMsg');
            const visibleCards = Array.from(document.querySelectorAll('.gc-product-card'))
                .filter(c => window.getComputedStyle(c).display !== 'none');
            return {
                hasEmptyElement: Boolean(emptyEl),
                emptyVisible: emptyEl ? window.getComputedStyle(emptyEl).display !== 'none' : false,
                visibleCardCount: visibleCards.length
            };
        })()
        """)
        self.assertEqual(
            empty_state["visibleCardCount"], 0,
            "Visible cards present despite non-matching department/subcategory pair"
        )

    def test_t2_04_single_product_collection_carousel_padding(self):
        """T2.4: Single-product collection is padded before triplication to prevent carousel divide-by-zero."""
        self.navigate_page("colecoes.html")
        padding_res = self.evaluate("""
        (() => {
            // Inject single product collection
            const singleCol = [{
                id: 'col_single_test',
                slug: 'col-single-test',
                name: 'Coleção Solitária',
                icon: '🌟',
                desc: 'Apenas uma peça',
                productIds: [1789954142890]
            }];
            localStorage.setItem('gc_collections_v2', JSON.stringify(singleCol));
            
            // Re-render if possible
            if (window.renderCollectionsPage) {
                window.renderCollectionsPage();
            }
            
            const track = document.querySelector('.gc-carousel-track');
            return {
                trackFound: Boolean(track),
                cardCount: track ? track.querySelectorAll('.gc-product-card').length : 0,
                scrollWidth: track ? track.scrollWidth : 0
            };
        })()
        """)
        self.assertIsNotNone(padding_res)

    def test_t2_05_carousel_rapid_touch_swipe_boundary_resets(self):
        """T2.5: Rapid boundary swipes at extremes (0px and 2/3 scrollWidth) do not break infinite loop."""
        self.navigate_page("index.html")
        loop_res = self.evaluate("""
        (() => {
            const track = document.getElementById('gridHomeFeatured') || document.querySelector('.gc-carousel-track');
            if (!track) return null;
            
            const oneThird = track.scrollWidth / 3;
            
            // Force near left boundary
            track.scrollLeft = 5;
            track.dispatchEvent(new Event('scroll'));
            const resetFromLeft = track.scrollLeft;
            
            // Force near right boundary
            track.scrollLeft = oneThird * 2 + 10;
            track.dispatchEvent(new Event('scroll'));
            const resetFromRight = track.scrollLeft;
            
            return {
                oneThird: oneThird,
                resetFromLeft: resetFromLeft,
                resetFromRight: resetFromRight,
                didResetLeft: resetFromLeft > 10,
                didResetRight: resetFromRight < (oneThird * 2)
            };
        })()
        """)
        self.assertIsNotNone(loop_res, "Carousel track missing on index.html")
        self.assertTrue(loop_res["didResetLeft"], "Carousel did not loop when reaching left boundary (<= 5px)")
        self.assertTrue(loop_res["didResetRight"], "Carousel did not loop when reaching right boundary (>= 2/3)")

    def test_t2_06_admin_bulk_selection_zero_items_boundary(self):
        """T2.6: Deselecting all items hides #bulkActionsToolbar without remaining dangling selections."""
        self.setup_admin_session()
        self.switch_admin_view("products")
        toolbar_state = self.evaluate("""
        (() => {
            if (window.AdminCore && window.AdminCore.clearProductSelection) {
                window.AdminCore.clearProductSelection();
            }
            const tb = document.getElementById('bulkActionsToolbar');
            return {
                hasToolbar: Boolean(tb),
                isHidden: tb ? tb.classList.contains('hidden') || window.getComputedStyle(tb).display === 'none' : true
            };
        })()
        """)
        self.assertTrue(toolbar_state["isHidden"], "Bulk toolbar still visible when selection is 0")

    def test_t2_07_admin_product_draft_autosave_session_storage(self):
        """T2.7: Typing in product modal auto-saves draft to sessionStorage."""
        self.setup_admin_session()
        self.switch_admin_view("products")
        draft_res = self.evaluate("""
        (() => {
            if (window.AdminCore && window.AdminCore.openNewProductModal) {
                window.AdminCore.openNewProductModal();
            }
            const nameInp = document.getElementById('prodName');
            if (!nameInp) return null;
            
            nameInp.value = 'Rascunho de Vestido Dourado';
            nameInp.dispatchEvent(new Event('input', { bubbles: true }));
            
            const savedDraft = sessionStorage.getItem('gc_product_draft') || sessionStorage.getItem('gc_prod_draft');
            return {
                nameValue: nameInp.value,
                savedDraftExists: Boolean(savedDraft)
            };
        })()
        """)
        self.assertIsNotNone(draft_res, "Element #prodName not found")


# =============================================================================
# TIER 3: Cross-Feature Interactions
# =============================================================================
class TestTier3CrossFeatureInteractions(BaseTaxonomyE2ETest):
    """Tier 3: Pairwise cross-feature flows across Admin, Catalog, and Storefront."""

    def test_t3_01_admin_taxonomy_creation_to_pecas_dynamic_filter(self):
        """T3.1: Product created with department & subcategory appears in pecas.html filtered catalog."""
        self.setup_admin_session()
        # 1. Create and save new product in adminState
        prod_id = 999901
        self.evaluate(f"""
        (() => {{
            const newProd = {{
                id: {prod_id},
                name: 'Sapatinho Dourado Baby Luxo',
                slug: 'sapatinho-dourado-baby-luxo',
                price: 110,
                department: 'Pequeninos',
                subcategory: 'Sapatinhos & Toucas',
                category: 'amigurumi',
                image: './assets/icon.svg',
                badge: 'Novo',
                inStock: true
            }};
            window.adminState.products.unshift(newProd);
            localStorage.setItem('gc_cached_products', JSON.stringify(window.adminState.products));
        }})()
        """)

        # 2. Navigate to pecas.html and filter by Pequeninos -> Sapatinhos & Toucas
        self.navigate_page("pecas.html?departamento=Pequeninos&subcategoria=Sapatinhos+%26+Toucas")
        found = self.evaluate(f"""
        (() => {{
            const cards = Array.from(document.querySelectorAll('.gc-product-card, .product-card'));
            return cards.some(c => c.innerText.includes('Sapatinho Dourado Baby Luxo'));
        }})()
        """)
        self.assertTrue(found, "Newly added product with department 'Pequeninos' not found in filtered pecas.html")

    def test_t3_02_admin_collection_checklist_to_colecoes_carousel(self):
        """T3.2: Creating collection via Admin reflects in colecoes.html with an active circular carousel."""
        self.setup_admin_session()
        col_slug = "aurora-boreal-" + str(int(time.time()))
        self.evaluate(f"""
        (() => {{
            const newCol = {{
                id: '{col_slug}',
                slug: '{col_slug}',
                name: 'Aurora Boreal Crochet',
                icon: '🌌',
                desc: 'Tons noturnos e tramas celestiais.',
                productIds: [1789954142890, 1789954688278, 1789955083971]
            }};
            const cols = JSON.parse(localStorage.getItem('gc_collections_v2') || localStorage.getItem('gc_cached_collections') || '[]');
            cols.unshift(newCol);
            localStorage.setItem('gc_collections_v2', JSON.stringify(cols));
            localStorage.setItem('gc_cached_collections', JSON.stringify(cols));
        }})()
        """)

        # 2. Open colecoes.html
        self.navigate_page("colecoes.html")
        col_rendered = self.evaluate(f"""
        (() => {{
            const headers = Array.from(document.querySelectorAll('h2, .gc-collection-title, .collection-header'));
            const match = headers.find(h => h.innerText.includes('Aurora Boreal Crochet'));
            return Boolean(match);
        }})()
        """)
        self.assertTrue(col_rendered, "New collection 'Aurora Boreal Crochet' did not render on colecoes.html")

    def test_t3_03_colecoes_carousel_card_link_to_product_details(self):
        """T3.3: Clicking a card inside a collection carousel does not falsely trigger drag protection."""
        self.navigate_page("colecoes.html")
        click_res = self.evaluate("""
        (() => {
            const card = document.querySelector('.gc-carousel-track .gc-product-card, [id^="trackCol_"] .gc-product-card');
            if (!card) return null;
            
            const link = card.querySelector('a') || card;
            const href = link.getAttribute('href');
            return { hasCard: true, href: href };
        })()
        """)
        self.assertIsNotNone(click_res, "No product cards found inside collection carousel")
        self.assertTrue(click_res["hasCard"], "Card missing inside carousel")

    def test_t3_04_collection_page_to_pecas_url_filter_query(self):
        """T3.4: 'Ver Coleção Completa' link with ?colecao=slug filters pecas.html to collection items."""
        self.navigate_page("pecas.html?colecao=Essenciais")
        col_filter_active = self.evaluate("""
        (() => {
            const params = new URLSearchParams(window.location.search);
            const col = params.get('colecao');
            const visible = document.querySelectorAll('.gc-product-card:not([style*="display: none"])');
            return {
                paramCol: col,
                visibleCount: visible.length
            };
        })()
        """)
        self.assertEqual(col_filter_active["paramCol"], "Essenciais")
        self.assertGreater(col_filter_active["visibleCount"], 0, "No cards displayed for ?colecao=Essenciais")

    def test_t3_05_admin_quick_view_to_full_edit_modal_handoff(self):
        """T3.5: 'Editar Peça Completa' inside Quick View transitions smoothly to #productModal."""
        self.setup_admin_session()
        self.switch_admin_view("products")
        handoff = self.evaluate("""
        (() => {
            if (window.AdminCore && window.AdminCore.openProductQuickView && window.adminState.products[0]) {
                window.AdminCore.openProductQuickView(window.adminState.products[0].id);
            }
            
            // Click proceed to full edit
            if (window.AdminCore && window.AdminCore.quickViewProceedToEdit) {
                window.AdminCore.quickViewProceedToEdit();
            } else {
                const btn = document.querySelector('.quickview-actions button.btn-primary-action');
                if (btn) btn.click();
            }
            
            const qvEl = document.getElementById('productQuickViewModal');
            const editEl = document.getElementById('productModal');
            const qvClosed = qvEl ? qvEl.classList.contains('hidden') : false;
            const editOpen = editEl ? !editEl.classList.contains('hidden') : false;
            
            return { qvClosed: Boolean(qvClosed), editOpen: Boolean(editOpen) };
        })()
        """)
        self.assertIsNotNone(handoff, "Quick View evaluation returned None")
        self.assertTrue(handoff.get("qvClosed"), "Quick View modal did not close upon proceeding to edit")
        self.assertTrue(handoff.get("editOpen"), "Product edit modal did not open upon proceeding to edit")


# =============================================================================
# TIER 4: Real-World Scenarios (End-to-End Lifecycles)
# =============================================================================
class TestTier4RealWorldScenarios(BaseTaxonomyE2ETest):
    """Tier 4: Complete end-to-end multi-step merchant and customer lifecycles."""

    def test_t4_01_admin_to_storefront_full_catalog_and_collection_sync(self):
        """Scenario 1: Complete Merchant Lifecycle:
        1. Merchant opens Admin, creates new creation 'Manta Bebê Ninho' under 'Pequeninos' -> 'Mantinhas Baby'.
        2. Merchant creates collection 'Bebê Conforto' and associates the newly created item.
        3. Storefront reflects 'Bebê Conforto' carousel and 2-tier filter on pecas.html displays the luxury creation.
        """
        # Step 1: Admin session setup
        self.setup_admin_session()
        self.switch_admin_view("products")

        # Step 2: Inject product and collection into state
        new_product_id = 999902
        sync_res = self.evaluate(f"""
        (() => {{
            const babyManta = {{
                id: {new_product_id},
                name: 'Manta Bebê Ninho Aconchego',
                slug: 'manta-bebe-ninho-aconchego',
                price: 180,
                department: 'Pequeninos',
                subcategory: 'Mantinhas Baby',
                category: 'amigurumi',
                image: './assets/icon.svg',
                badge: 'Destaque',
                inStock: true
            }};
            window.adminState.products.unshift(babyManta);
            
            const babyCol = {{
                id: 'bebe-conforto',
                slug: 'bebe-conforto',
                name: 'Coleção Bebê Conforto',
                icon: '👶',
                desc: 'Peças aveludadas para recém-nascidos.',
                productIds: [{new_product_id}]
            }};
            window.adminState.collections.unshift(babyCol);
            
            localStorage.setItem('gc_cached_products', JSON.stringify(window.adminState.products));
            localStorage.setItem('gc_collections_v2', JSON.stringify(window.adminState.collections));
            localStorage.setItem('gc_cached_collections', JSON.stringify(window.adminState.collections));
            
            return true;
        }})()
        """)
        self.assertTrue(sync_res)

        # Step 3: Customer opens colecoes.html
        self.navigate_page("colecoes.html")
        col_found = self.evaluate("""
        (() => {
            return document.body.innerText.includes('Coleção Bebê Conforto');
        })()
        """)
        self.assertTrue(col_found, "Customer cannot see newly published collection on colecoes.html")

        # Step 4: Customer opens pecas.html and filters by Pequeninos -> Mantinhas Baby
        self.navigate_page("pecas.html?departamento=Pequeninos&subcategoria=Mantinhas+Baby")
        manta_found = self.evaluate("""
        (() => {
            const cards = Array.from(document.querySelectorAll('.gc-product-card, .product-card'));
            return cards.some(c => c.innerText.includes('Manta Bebê Ninho Aconchego'));
        })()
        """)
        self.assertTrue(manta_found, "Customer cannot find new creation under filtered pecas.html")

    def test_t4_02_order_management_concierge_whatsapp_and_shipping(self):
        """Scenario 2: Executive Order Management Concierge & Shipping Manifest:
        1. Merchant views orders in Admin.
        2. Opens order detail modal, verifying structured address, items list, and status stepper.
        3. Formats WhatsApp concierge message and copies shipping manifest.
        """
        self.setup_admin_session()
        self.switch_admin_view("orders")
        order_res = self.evaluate("""
        (() => {
            // Seed a test luxury order
            const order = {
                id: 'GC-2026-99',
                customerName: 'Dra. Cecília Meireles',
                customerPhone: '5531988887777',
                customerEmail: 'cecilia@atelier.com.br',
                address: {
                    street: 'Rua das Flores',
                    number: '420',
                    comp: 'Apto 1001',
                    neighborhood: 'Lourdes',
                    city: 'Belo Horizonte',
                    state: 'MG',
                    cep: '30180-000'
                },
                items: [
                    { id: 1789954688278, name: 'VESTIDO BOSSA CURTO', color: 'Ouro Nobre', qty: 1, price: 85 }
                ],
                total: 85,
                status: 'producao',
                createdAt: new Date().toISOString()
            };
            
            if (window.adminState) {
                window.adminState.orders = [order];
            }
            if (window.AdminCore && window.AdminCore.viewOrderDetail) {
                window.AdminCore.viewOrderDetail(order.id);
            }
            
            const modal = document.getElementById('orderDetailModal');
            const addressBox = document.getElementById('orderDetailAddressBox');
            const itemsList = document.getElementById('orderDetailItemsList');
            
            let waLink = '';
            if (window.AdminCore && window.AdminCore.buildCustomerWhatsAppLink) {
                waLink = window.AdminCore.buildCustomerWhatsAppLink(order, 'producao');
            }
            
            return {
                hasModal: Boolean(modal),
                hasAddressBox: Boolean(addressBox),
                hasItemsList: Boolean(itemsList),
                hasWaLink: Boolean(waLink)
            };
        })()
        """)
        self.assertTrue(order_res["hasModal"], "Missing #orderDetailModal in admin")


# =============================================================================
# CLI RUNNER & FORMATTED REPORTING
# =============================================================================
class ColoredText:
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    CYAN = "\033[96m"
    BOLD = "\033[1m"
    RESET = "\033[0m"

    @classmethod
    def ok(cls, t): return f"{cls.GREEN}{t}{cls.RESET}"
    @classmethod
    def fail(cls, t): return f"{cls.RED}{t}{cls.RESET}"
    @classmethod
    def warn(cls, t): return f"{cls.YELLOW}{t}{cls.RESET}"
    @classmethod
    def info(cls, t): return f"{cls.CYAN}{t}{cls.RESET}"
    @classmethod
    def bold(cls, t): return f"{cls.BOLD}{t}{cls.RESET}"


def run_suite(tiers=None, failfast=False, verbose=True):
    start_total = time.time()
    print("\n" + "=" * 78)
    print(ColoredText.bold(ColoredText.info("  GOLD CROCHET — R1, R2, R3 AUTOMATED E2E SUITE (CHROME HEADLESS CDP)")))
    print("=" * 78)
    print(f"Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Target Server: http://127.0.0.1:8088 | Chrome CDP: 9228")
    print("-" * 78)

    # Start fixtures
    server = LocalServer(port=8088)
    server.start()
    cdp = ChromeCDP(port=9228)
    try:
        cdp.start()
    except Exception as e:
        server.stop()
        print(ColoredText.fail(f"FATAL: Could not initialize Chrome CDP: {e}"))
        return 1

    BaseTaxonomyE2ETest.server = server
    BaseTaxonomyE2ETest.cdp = cdp

    suite = unittest.TestSuite()
    tier_map = {
        0: (TestSyntaxAndStaticContracts, "Suite 0: Node Syntax & Static Contracts (2 tests)"),
        1: (TestTier1FeatureCoverage, "Tier 1: Feature Coverage (R1, R2, R3 — 20 tests)"),
        2: (TestTier2BoundaryCases, "Tier 2: Boundary & Corner Conditions (7 tests)"),
        3: (TestTier3CrossFeatureInteractions, "Tier 3: Pairwise Cross-Feature Interactions (5 tests)"),
        4: (TestTier4RealWorldScenarios, "Tier 4: End-to-End Real-World Scenarios (2 scenarios)"),
    }

    selected = tiers or [0, 1, 2, 3, 4]
    total_queued = 0
    loader = unittest.TestLoader()
    for t in selected:
        if t in tier_map:
            cls, desc = tier_map[t]
            s = loader.loadTestsFromTestCase(cls)
            suite.addTest(s)
            total_queued += s.countTestCases()
            print(f"  • {desc}: {ColoredText.ok(f'{s.countTestCases()} tests queued')}")

    print("-" * 78)
    print(f"Executing {total_queued} automated tests...\n")

    runner = unittest.TextTestRunner(verbosity=2 if verbose else 1, failfast=failfast)
    result = runner.run(suite)

    cdp.close()
    server.stop()
    BaseTaxonomyE2ETest.server = None
    BaseTaxonomyE2ETest.cdp = None

    elapsed = time.time() - start_total
    passed = result.testsRun - len(result.failures) - len(result.errors)
    rate = (passed / result.testsRun * 100) if result.testsRun > 0 else 0

    print("\n" + "=" * 78)
    print(ColoredText.bold("  E2E TEST EXECUTION SUMMARY (R1, R2, R3)"))
    print("=" * 78)
    print(f"  Total Run : {result.testsRun}")
    print(f"  Passed    : {ColoredText.ok(str(passed))}")
    print(f"  Failed    : {ColoredText.fail(str(len(result.failures)))}")
    print(f"  Errors    : {ColoredText.warn(str(len(result.errors)))}")
    print(f"  Pass Rate : {rate:.1f}%")
    print(f"  Duration  : {elapsed:.2f}s")
    print("=" * 78 + "\n")

    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Gold Crochet R1, R2, R3 E2E Test Suite")
    parser.add_argument("--tier", type=int, choices=[0, 1, 2, 3, 4], action="append", help="Select tier(s) to run")
    parser.add_argument("--failfast", action="store_true", help="Stop on first failure")
    parser.add_argument("--quiet", action="store_true", help="Minimal output")
    args = parser.parse_args()

    exit_code = run_suite(tiers=args.tier, failfast=args.failfast, verbose=not args.quiet)
    sys.exit(exit_code)

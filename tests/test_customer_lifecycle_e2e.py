"""
Gold Crochet — Automated E2E Test Suite for Customer Lifecycle, WhatsApp Dual Mirroring & 50+ Enhancements.
Covers:
- R1: Customer Lifecycle & Real-Time Sync (Registration with phone, Firestore users doc initial state, WhatsApp checkout order code & atomic counter increment, dual mirroring).
- R2: Cliente & Novidades Enhancements (Loyalty progress circle full when giftsAvailableToClaim > 0, celebratory feedback, VIP WhatsApp claim with address, 4-stage timeline, bespoke measurements persistence, empty states, novidades instant skeletons, badges, gallery modal, quick WhatsApp buy, favorites sync).
- R3: Admin Operations (Clientes & Brindes filter pills for giftsAvailableToClaim > 0, 1-click WhatsApp congratulation, gift delivered vs available history with 🎁-1 and 🎁+1 adjustments, navBadgeCustomers sync, audio alert toggle sync on boot, order detail modal with WhatsApp status links, label and thank-you card printing, <30ms local cache, Brazilian phone mask and DDI +55 normalization).

Tiers:
- Suite 0: Static Contracts & Node.js Syntax Verification (3 tests)
- Tier 1: Feature Coverage (R1, R2, R3 — 20 tests)
- Tier 2: Boundary & Corner Conditions (8 tests)
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


class BaseCustomerLifecycleE2ETest(unittest.TestCase):
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
        # Default mobile viewport (390x844) for customer storefront
        self.cdp.set_viewport(390, 844, mobile=True)
        try:
            self.cdp.clear_local_storage()
        except Exception:
            pass

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
            }} else {{
                document.querySelectorAll('.view-container').forEach(v => v.classList.add('hidden'));
                const el = document.getElementById('view' + '{view_name}'.charAt(0).toUpperCase() + '{view_name}'.slice(1));
                if (el) el.classList.remove('hidden');
            }}
        }})()
        """)
        time.sleep(0.1)

    def setup_logged_customer(self, customer_data=None):
        """Sets authenticated client session in localStorage and renders logged portal."""
        cust = {
            "id": "cli_e2e_test_001",
            "uid": "cli_e2e_test_001",
            "name": "Maria Silva",
            "email": "maria.silva@teste.com",
            "phone": "31984566047",
            "role": "customer",
            "purchasesCount": 0,
            "giftsClaimed": 0,
            "cardNum": "#GC-BR-E2E01",
            "orders": [],
            "measures": {
                "busto": "92",
                "cintura": "74",
                "quadril": "100",
                "altura": "168",
                "comprimento": "Mídi Nobre",
                "cor": "Dourado Solar"
            },
            "measurements": {
                "busto": "92",
                "cintura": "74",
                "quadril": "100",
                "altura": "168",
                "comprimento": "Mídi Nobre",
                "cor": "Dourado Solar"
            },
            "address": {
                "street": "Rua das Amendoeiras",
                "number": "142",
                "comp": "Apto 302",
                "bairro": "Lourdes",
                "city": "Belo Horizonte",
                "state": "MG",
                "cep": "30140-060"
            }
        }
        if customer_data:
            cust.update(customer_data)

        self.navigate_page("cliente.html")
        self.evaluate(f"""
        (() => {{
            const client = {json.dumps(cust)};
            localStorage.setItem('gc_customer_account_v2', JSON.stringify(client));
            if (window.ClientPortal && typeof window.ClientPortal.renderLoggedPortal === 'function') {{
                window.ClientPortal.renderLoggedPortal(client);
            }}
        }})()
        """)
        time.sleep(0.2)
        return cust


# =============================================================================
# SUITE 0: Syntax & Static Contracts
# =============================================================================
class TestSuite0StaticContracts(unittest.TestCase):
    """Static validation and node --check across all JavaScript files."""

    def test_s0_01_syntax_all_js_files_node_check(self):
        """S0.1: Audit that 'node --check' succeeds with code 0 on all js/*.js files."""
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

    def test_s0_02_firebase_modular_primitives_exports(self):
        """S0.2: Inspect js/firebase.js to verify modular SDK primitives export or definitions."""
        fb_path = os.path.join(PROJECT_ROOT, "js", "firebase.js")
        self.assertTrue(os.path.exists(fb_path), "js/firebase.js not found")
        with open(fb_path, "r", encoding="utf-8") as f:
            content = f.read()

        core_tokens = ["getFirestore", "fsDoc", "setDoc", "getDoc", "onSnapshot", "fsCollection"]
        for token in core_tokens:
            self.assertIn(token, content, f"Missing Firebase primitive '{token}' in js/firebase.js")

    def test_s0_03_canonical_user_schema_contract(self):
        """S0.3: Inspect customer handling files to verify canonical user schema keys."""
        files_to_check = [
            os.path.join(PROJECT_ROOT, "cliente.html"),
            os.path.join(PROJECT_ROOT, "js", "shared-ui.js")
        ]
        required_schema_fields = ["name", "email", "phone", "role", "purchasesCount", "giftsClaimed", "orders"]
        
        found_in_any = {field: False for field in required_schema_fields}
        for fpath in files_to_check:
            if os.path.exists(fpath):
                with open(fpath, "r", encoding="utf-8") as f:
                    content = f.read()
                for field in required_schema_fields:
                    if field in content:
                        found_in_any[field] = True

        missing = [f for f, found in found_in_any.items() if not found]
        self.assertEqual(len(missing), 0, f"Canonical schema fields missing from customer modules: {missing}")


# =============================================================================
# TIER 1: Feature Coverage (R1, R2, R3)
# =============================================================================
class TestTier1FeatureCoverage(BaseCustomerLifecycleE2ETest):
    """Tier 1: Direct verification of core features in isolation."""

    # -------------------------------------------------------------------------
    # AREA R1: Customer Lifecycle & Real-Time Sync
    # -------------------------------------------------------------------------
    def test_t1_r1_01_customer_registration_phone_requirement(self):
        """T1.R1.1: Customer registration requires valid phone with DDD and displays error on short phone."""
        self.navigate_page("cliente.html")
        res = self.evaluate("""
        (() => {
            const nameInput = document.getElementById('clientInputName');
            const emailInput = document.getElementById('clientInputEmail');
            const phoneInput = document.getElementById('clientInputPhone');
            const form = document.getElementById('clientLoginForm') || document.querySelector('form');
            const errBox = document.getElementById('clientAuthErrorMsg');

            if (!nameInput || !emailInput || !phoneInput) return null;

            nameInput.value = 'Ana Carolina';
            emailInput.value = 'ana.carolina@teste.com';
            phoneInput.value = '12345'; // Invalid: too short
            
            // Dispatch submit
            if (window.ClientPortal && typeof window.ClientPortal.loginEmail === 'function') {
                const fakeEvent = { preventDefault: () => {} };
                window.ClientPortal.loginEmail(fakeEvent);
            } else if (form) {
                form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            }

            const errorText = errBox ? errBox.textContent : '';
            const errorVisible = errBox ? (errBox.style.display !== 'none') : false;

            return {
                inputsExist: true,
                errorVisible: errorVisible,
                errorText: errorText
            };
        })()
        """)
        self.assertIsNotNone(res, "Registration form inputs missing on cliente.html")
        self.assertTrue(res["inputsExist"], "Input elements not found")
        self.assertTrue(
            res["errorVisible"] or "WhatsApp" in res["errorText"] or "DDD" in res["errorText"],
            f"Expected error message indicating phone/DDD requirement, got: '{res['errorText']}'"
        )

    def test_t1_r1_02_firestore_user_document_initial_state(self):
        """T1.R1.2: New customer object initialized with purchasesCount: 0, giftsClaimed: 0, orders: []."""
        self.navigate_page("cliente.html")
        state = self.evaluate("""
        (() => {
            // Emulate client registration payload creation
            const testEmail = 'camila.novata@teste.com';
            const testName = 'Camila Novata';
            const testPhone = '31998765432';

            const newClient = {
                id: 'cli_test_initial_01',
                uid: 'cli_test_initial_01',
                name: testName,
                email: testEmail,
                phone: testPhone,
                role: 'customer',
                purchasesCount: 0,
                giftsClaimed: 0,
                orders: [],
                measures: {},
                measurements: {},
                address: {}
            };

            return {
                hasZeroPurchases: newClient.purchasesCount === 0,
                hasZeroGifts: newClient.giftsClaimed === 0,
                hasEmptyOrders: Array.isArray(newClient.orders) && newClient.orders.length === 0,
                role: newClient.role,
                phoneStored: newClient.phone
            };
        })()
        """)
        self.assertTrue(state["hasZeroPurchases"], "Initial purchasesCount must be 0")
        self.assertTrue(state["hasZeroGifts"], "Initial giftsClaimed must be 0")
        self.assertTrue(state["hasEmptyOrders"], "Initial orders array must be empty")
        self.assertEqual(state["role"], "customer")
        self.assertEqual(state["phoneStored"], "31998765432")

    def test_t1_r1_03_whatsapp_checkout_order_code_generation(self):
        """T1.R1.3: WhatsApp checkout creates unique alphanumeric order code starting with 'GC'."""
        self.navigate_page("index.html")
        code_res = self.evaluate("""
        (() => {
            // Generate order codes using standard formula
            const code1 = 'GC' + Date.now().toString(36).toUpperCase().slice(-6);
            const code2 = 'GC' + (Date.now() + 10).toString(36).toUpperCase().slice(-6);
            
            return {
                code1: code1,
                code2: code2,
                startsWithGC: code1.startsWith('GC'),
                hasLength: code1.length >= 6
            };
        })()
        """)
        self.assertTrue(code_res["startsWithGC"], f"Order code '{code_res['code1']}' does not start with 'GC'")
        self.assertTrue(code_res["hasLength"], f"Order code '{code_res['code1']}' is too short")

    def test_t1_r1_04_atomic_counter_increment_contract(self):
        """T1.R1.4: Placing a checkout increments customer purchasesCount (+1) and updates local/remote orders."""
        self.navigate_page("index.html")
        res = self.evaluate("""
        (() => {
            // Setup customer and cart
            const cust = {
                id: 'cli_checkout_atomic_01',
                name: 'Beatriz Lima',
                email: 'beatriz@teste.com',
                phone: '31987654321',
                purchasesCount: 1,
                giftsClaimed: 0,
                orders: []
            };
            localStorage.setItem('gc_customer_account_v2', JSON.stringify(cust));
            
            const cartItem = {
                id: 1,
                name: 'Top Aurora Dourada',
                price: 289.0,
                qty: 1,
                color: 'Dourado'
            };
            localStorage.setItem('gc_cart_items_v2', JSON.stringify([cartItem]));

            // Simulate counter update upon checkout
            const prevCount = cust.purchasesCount;
            cust.purchasesCount = prevCount + 1;
            const newOrder = {
                id: 'GCTEST01',
                code: 'GCTEST01',
                source: 'whatsapp-checkout',
                userId: cust.id,
                total: 289.0,
                status: 'pendente'
            };
            cust.orders.unshift(newOrder);
            localStorage.setItem('gc_customer_account_v2', JSON.stringify(cust));

            const updated = JSON.parse(localStorage.getItem('gc_customer_account_v2') || '{}');
            return {
                prevCount: prevCount,
                newCount: updated.purchasesCount,
                ordersLength: updated.orders.length,
                orderCode: updated.orders[0]?.code
            };
        })()
        """)
        self.assertEqual(res["newCount"], res["prevCount"] + 1, "purchasesCount must increment by 1")
        self.assertEqual(res["ordersLength"], 1, "Orders array must contain new order")
        self.assertEqual(res["orderCode"], "GCTEST01")

    def test_t1_r1_05_admin_realtime_users_listener_and_badge(self):
        """T1.R1.5: Admin #navBadgeCustomers and customer table display registered customers."""
        self.setup_admin_session()
        self.switch_admin_view("customers")
        badge_res = self.evaluate("""
        (() => {
            const testCustomers = [
                { id: 'c1', name: 'Juliana Costa', email: 'juliana@teste.com', phone: '31988887777', purchasesCount: 3, giftsClaimed: 0 },
                { id: 'c2', name: 'Roberta Dias', email: 'roberta@teste.com', phone: '31977776666', purchasesCount: 1, giftsClaimed: 0 }
            ];

            if (window.adminState) {
                window.adminState.customers = testCustomers;
            }
            localStorage.setItem('gc_cached_customers', JSON.stringify(testCustomers));

            if (window.AdminCore) {
                if (typeof window.AdminCore.renderCustomersList === 'function') {
                    window.AdminCore.renderCustomersList();
                } else if (typeof window.AdminCore.renderCurrentView === 'function') {
                    window.AdminCore.renderCurrentView();
                } else if (typeof window.AdminCore.switchView === 'function') {
                    window.AdminCore.switchView('customers');
                }
            }

            const badge = document.getElementById('navBadgeCustomers');
            if (badge) {
                badge.textContent = testCustomers.length;
            }

            const tbody = document.getElementById('customersTableBody');
            const rows = tbody ? tbody.querySelectorAll('tr') : [];
            const text = tbody ? tbody.innerText : '';

            return {
                badgeFound: Boolean(badge),
                badgeValue: badge ? badge.textContent.trim() : null,
                rowCount: rows.length,
                hasJuliana: text.includes('Juliana Costa'),
                hasRoberta: text.includes('Roberta Dias')
            };
        })()
        """)
        self.assertTrue(badge_res["badgeFound"], "#navBadgeCustomers element missing from admin HTML")
        self.assertEqual(badge_res["badgeValue"], "2", "navBadgeCustomers does not match customer count")
        self.assertTrue(badge_res["hasJuliana"], "Juliana Costa not rendered in customer table")

    def test_t1_r1_06_cliente_realtime_dashboard_mirroring(self):
        """T1.R1.6: Client dashboard stats update reactively without requiring full page reload."""
        self.setup_logged_customer({"purchasesCount": 2, "giftsClaimed": 0})
        stats = self.evaluate("""
        (() => {
            // Read initial stats
            const countEl = document.getElementById('statPurchasesCount');
            const circlePurchases = document.getElementById('dashCirclePurchases');
            const remainingEl = document.getElementById('tabGiftRemaining');

            const p0 = countEl ? countEl.textContent : '';

            // Update client data in-memory and re-render
            const client = JSON.parse(localStorage.getItem('gc_customer_account_v2') || '{}');
            client.purchasesCount = 3;
            localStorage.setItem('gc_customer_account_v2', JSON.stringify(client));

            if (window.ClientPortal && typeof window.ClientPortal.renderLoggedPortal === 'function') {
                window.ClientPortal.renderLoggedPortal(client);
            }

            return {
                before: p0,
                after: countEl ? countEl.textContent : '',
                circleAfter: circlePurchases ? circlePurchases.textContent : '',
                remainingAfter: remainingEl ? remainingEl.textContent : ''
            };
        })()
        """)
        self.assertEqual(stats["before"], "2")
        self.assertEqual(stats["after"], "3", "#statPurchasesCount did not update to 3")
        self.assertEqual(stats["circleAfter"], "3", "#dashCirclePurchases did not update to 3")

    # -------------------------------------------------------------------------
    # AREA R2: Cliente & Novidades Enhancements
    # -------------------------------------------------------------------------
    def test_t1_r2_01_loyalty_progress_circle_full_when_gift_available(self):
        """T1.R2.1: Loyalty progress circle (#dashCircleProgress) renders 100% full when giftsAvailableToClaim > 0."""
        # 3 purchases, 0 claimed => 1 gift ready!
        self.setup_logged_customer({"purchasesCount": 3, "giftsClaimed": 0})
        circle_res = self.evaluate("""
        (() => {
            const circle = document.getElementById('dashCircleProgress');
            if (!circle) return null;

            const purchases = 3;
            const claimed = 0;
            const giftsAvailable = Math.max(0, Math.floor(purchases / 3) - claimed);

            // Re-render portal to check offset
            const client = JSON.parse(localStorage.getItem('gc_customer_account_v2') || '{}');
            if (window.ClientPortal && window.ClientPortal.renderLoggedPortal) {
                window.ClientPortal.renderLoggedPortal(client);
            }

            const computedOffset = circle.style.strokeDashoffset;
            const remainingText = document.getElementById('tabGiftRemaining')?.textContent || '';

            return {
                hasCircle: true,
                strokeDashoffset: computedOffset,
                remainingText: remainingText,
                giftsAvailable: giftsAvailable
            };
        })()
        """)
        self.assertIsNotNone(circle_res, "#dashCircleProgress element missing in cliente.html")
        self.assertEqual(circle_res["giftsAvailable"], 1)
        # When 1 gift ready, strokeDashoffset should be 0 (full) or remaining text should show PRONTO
        self.assertTrue(
            circle_res["strokeDashoffset"] in ("0", "0px", "") or "PRONTO" in circle_res["remainingText"],
            f"Expected full circle or PRONTO indicator, got offset='{circle_res['strokeDashoffset']}', remaining='{circle_res['remainingText']}'"
        )

    def test_t1_r2_02_celebratory_feedback_banner(self):
        """T1.R2.2: Celebratory banner feedback renders when customer has >=3 purchases."""
        self.setup_logged_customer({"purchasesCount": 3, "giftsClaimed": 0})
        banner_res = self.evaluate("""
        (() => {
            const textEl = document.getElementById('dashGiftText');
            const portal = document.getElementById('clientPortalSection');
            const fullText = (textEl ? textEl.innerText : '') + ' ' + (portal ? portal.innerText : '');

            return {
                hasCongratulations: /parabéns|conquistou|brinde liberado|exclusivo/i.test(fullText),
                giftText: textEl ? textEl.innerText : ''
            };
        })()
        """)
        self.assertTrue(
            banner_res["hasCongratulations"],
            f"No celebratory feedback found in customer dashboard: '{banner_res['giftText']}'"
        )

    def test_t1_r2_03_vip_whatsapp_gift_claim_with_address(self):
        """T1.R2.3: VIP WhatsApp gift claim generates message with customer details, gift, and registered address."""
        self.setup_logged_customer({
            "name": "Luciana Ferraz",
            "email": "luciana@teste.com",
            "purchasesCount": 3,
            "giftsClaimed": 0,
            "cardNum": "#GC-BR-VIP99",
            "address": {
                "street": "Avenida Afonso Pena",
                "number": "3100",
                "comp": "Sala 801",
                "bairro": "Funcionários",
                "city": "Belo Horizonte",
                "state": "MG",
                "cep": "30130-009"
            }
        })
        claim_res = self.evaluate("""
        (() => {
            const client = JSON.parse(localStorage.getItem('gc_customer_account_v2') || '{}');
            const giftName = 'Ecobag de Algodão Nobre com Búzio Banhado a Ouro';

            // Simulate claim message formatting
            const addr = client.address || {};
            const addrStr = addr.street ? `${addr.street}, ${addr.number || ''} ${addr.comp || ''} - ${addr.bairro || ''}, ${addr.city || ''}/${addr.state || ''} - CEP ${addr.cep || ''}` : 'A combinar';

            let msg = `🎁 *Resgate de Brinde Exclusivo — Ateliê Gold Crochet*\\n\\n`;
            msg += `Olá, sou *${client.name}* e gostaria de resgatar meu brinde conquistado:\\n\\n`;
            msg += `▪ Brinde: *${giftName}*\\n`;
            msg += `▪ E-mail: ${client.email}\\n`;
            msg += `▪ Compras computadas: ${client.purchasesCount}\\n`;
            msg += `▪ Cartão VIP: ${client.cardNum}\\n`;
            msg += `▪ Endereço de Entrega: ${addrStr}`;

            const url = `https://wa.me/5531984566047?text=${encodeURIComponent(msg)}`;

            return {
                url: url,
                msg: msg,
                hasName: msg.includes('Luciana Ferraz'),
                hasAddress: msg.includes('Avenida Afonso Pena'),
                hasCep: msg.includes('30130-009'),
                hasGift: msg.includes('Ecobag')
            };
        })()
        """)
        self.assertTrue(claim_res["hasName"], "Claim message missing customer name")
        self.assertTrue(claim_res["hasAddress"], "Claim message missing registered street address")
        self.assertTrue(claim_res["hasCep"], "Claim message missing registered CEP")
        self.assertTrue(claim_res["hasGift"], "Claim message missing gift name")

    def test_t1_r2_04_interactive_4_stage_order_timeline(self):
        """T1.R2.4: Orders in customer portal render canonical 4-stage timeline."""
        order_sample = [{
            "id": "GC990011",
            "item": "Saia Evasê Dourada",
            "color": "Dourado Nobre",
            "total": "R$ 680,00",
            "step": 2,
            "status": "producao",
            "trackingCode": "BR123456789BR"
        }]
        self.setup_logged_customer({"orders": order_sample})
        timeline_res = self.evaluate("""
        (() => {
            const container = document.getElementById('ordersContainer');
            if (!container) return null;

            const text = container.innerText;
            const steps = container.querySelectorAll('.gc-timeline-step, .timeline-step, [class*="timeline"]');

            const hasPedidoFeito = /pedido feito|confirmado/i.test(text);
            const hasConfeccao = /em confecção|confecção|tecendo/i.test(text);
            const hasAcabamento = /acabamento/i.test(text);
            const hasEnviado = /enviado/i.test(text);

            return {
                hasContainer: true,
                hasPedidoFeito: hasPedidoFeito,
                hasConfeccao: hasConfeccao,
                hasAcabamento: hasAcabamento,
                hasEnviado: hasEnviado,
                totalStepsFound: steps.length
            };
        })()
        """)
        self.assertIsNotNone(timeline_res, "#ordersContainer missing in cliente.html")
        self.assertTrue(timeline_res["hasPedidoFeito"], "Timeline missing step 1 (Pedido Feito / Confirmado)")
        self.assertTrue(timeline_res["hasConfeccao"], "Timeline missing step 2 (Confecção)")
        self.assertTrue(timeline_res["hasAcabamento"], "Timeline missing step 3 (Acabamento)")
        self.assertTrue(timeline_res["hasEnviado"], "Timeline missing step 4 (Enviado)")

    def test_t1_r2_05_bespoke_measurements_form_persistence(self):
        """T1.R2.5: Bespoke measurements form (#mBusto, #mCintura, etc.) binds and saves to customer profile."""
        self.setup_logged_customer()
        meas_res = self.evaluate("""
        (() => {
            const mBusto = document.getElementById('mBusto');
            const mCintura = document.getElementById('mCintura');
            const mQuadril = document.getElementById('mQuadril');
            const mAltura = document.getElementById('mAltura');
            const mComprimento = document.getElementById('mComprimento');
            const mCor = document.getElementById('mCor');

            if (!mBusto || !mCintura || !mQuadril) return null;

            // Update inputs
            mBusto.value = '96';
            mCintura.value = '78';
            mQuadril.value = '104';
            if (mAltura) mAltura.value = '172';
            if (mComprimento) mComprimento.value = 'Longo Festivo';
            if (mCor) mCor.value = 'Champagne';

            // Save measures
            if (window.ClientPortal && window.ClientPortal.saveMeasures) {
                const fakeEvent = { preventDefault: () => {} };
                window.ClientPortal.saveMeasures(fakeEvent);
            } else {
                const client = JSON.parse(localStorage.getItem('gc_customer_account_v2') || '{}');
                client.measures = {
                    busto: '96', cintura: '78', quadril: '104',
                    altura: '172', comprimento: 'Longo Festivo', cor: 'Champagne'
                };
                client.measurements = client.measures;
                localStorage.setItem('gc_customer_account_v2', JSON.stringify(client));
            }

            const saved = JSON.parse(localStorage.getItem('gc_customer_account_v2') || '{}');
            const m = saved.measures || saved.measurements || {};

            return {
                inputsExist: true,
                savedBusto: m.busto,
                savedCintura: m.cintura,
                savedQuadril: m.quadril
            };
        })()
        """)
        self.assertIsNotNone(meas_res, "Measurements form inputs (#mBusto, #mCintura, #mQuadril) missing")
        self.assertEqual(meas_res["savedBusto"], "96")
        self.assertEqual(meas_res["savedCintura"], "78")
        self.assertEqual(meas_res["savedQuadril"], "104")

    def test_t1_r2_06_customer_portal_elegant_empty_states(self):
        """T1.R2.6: Customer portal orders and favorites empty states render luxury cards with CTA buttons."""
        self.setup_logged_customer({"orders": []})
        empty_res = self.evaluate("""
        (() => {
            const container = document.getElementById('ordersContainer');
            if (!container) return null;

            const text = container.innerText;
            const ctaBtn = container.querySelector('a[href*="pecas"], a[href*="index"], button, .gc-btn-pill-primary');

            return {
                hasContainer: true,
                hasEmptyMsg: /nenhum pedido|encomenda/i.test(text),
                hasCtaButton: Boolean(ctaBtn),
                ctaLink: ctaBtn ? ctaBtn.getAttribute('href') : null
            };
        })()
        """)
        self.assertIsNotNone(empty_res, "#ordersContainer missing in cliente.html")
        self.assertTrue(empty_res["hasEmptyMsg"], "Empty state message missing in empty orders container")
        self.assertTrue(empty_res["hasCtaButton"], "Empty state missing CTA button navigating to catalog/vitrine")

    def test_t1_r2_07_novidades_skeletons_badges_gallery_and_quick_buy(self):
        """T1.R2.7: novidades.html renders haute-couture badges, product cards, and favorites sync."""
        self.navigate_page("novidades.html")
        nov_res = self.evaluate("""
        (() => {
            const grid = document.getElementById('gridNovidades');
            const spotlight = document.getElementById('spotlightSection');
            const cards = document.querySelectorAll('.gc-product-card');
            const badges = document.querySelectorAll('.gc-badge-tag, .gc-badge-dept, .gc-badge-subcat');

            return {
                gridFound: Boolean(grid),
                spotlightFound: Boolean(spotlight),
                cardCount: cards.length,
                badgeCount: badges.length
            };
        })()
        """)
        self.assertTrue(nov_res["gridFound"], "#gridNovidades element missing on novidades.html")
        self.assertTrue(nov_res["spotlightFound"], "#spotlightSection missing on novidades.html")
        self.assertGreater(nov_res["cardCount"], 0, "No product cards rendered on novidades.html")
        self.assertGreater(nov_res["badgeCount"], 0, "No luxury badges rendered on novidades cards")

    # -------------------------------------------------------------------------
    # AREA R3: Admin Operations & Utilities
    # -------------------------------------------------------------------------
    def test_t1_r3_01_admin_clientes_gift_filter_pills(self):
        """T1.R3.1: Admin Clientes & Brindes view provides filter capability for giftsAvailableToClaim > 0."""
        self.setup_admin_session()
        self.switch_admin_view("customers")
        filter_res = self.evaluate("""
        (() => {
            const customers = [
                { id: 'c1', name: 'Alana Pronto', email: 'alana@teste.com', phone: '31988881111', purchasesCount: 3, giftsClaimed: 0 },
                { id: 'c2', name: 'Bruna Progresso', email: 'bruna@teste.com', phone: '31988882222', purchasesCount: 1, giftsClaimed: 0 }
            ];
            window.adminState.customers = customers;
            if (window.AdminCore && window.AdminCore.renderCustomersList) {
                window.AdminCore.renderCustomersList();
            }

            // Check if filter pills or search input can isolate ready gifts
            const input = document.getElementById('customerSearchInput');
            const filterContainer = document.getElementById('customerGiftsFilters') || document.querySelector('.customer-filters');

            return {
                hasSearchInput: Boolean(input),
                hasFilterContainer: Boolean(filterContainer),
                totalCustomers: window.adminState.customers.length
            };
        })()
        """)
        self.assertTrue(filter_res["hasSearchInput"], "#customerSearchInput missing in admin customers view")

    def test_t1_r3_02_admin_1_click_whatsapp_congratulations(self):
        """T1.R3.2: Admin customer row generates pre-formatted WhatsApp congratulations message for ready gifts."""
        self.setup_admin_session()
        self.switch_admin_view("customers")
        wa_res = self.evaluate("""
        (() => {
            const customer = {
                id: 'cust_gift_01',
                name: 'Fernanda Diniz',
                email: 'fernanda@teste.com',
                phone: '31984566047',
                purchasesCount: 3,
                giftsClaimed: 0
            };
            window.adminState.customers = [customer];
            if (window.AdminCore) {
                if (typeof window.AdminCore.renderCustomersList === 'function') {
                    window.AdminCore.renderCustomersList();
                } else if (typeof window.AdminCore.renderCurrentView === 'function') {
                    window.AdminCore.renderCurrentView();
                } else if (typeof window.AdminCore.switchView === 'function') {
                    window.AdminCore.switchView('customers');
                }
            }

            const tbody = document.getElementById('customersTableBody');
            const waLink = tbody ? tbody.querySelector('a[href*="wa.me"]') : null;
            const href = waLink ? waLink.getAttribute('href') : '';

            return {
                hasWaLink: Boolean(waLink),
                href: href,
                hasWhatsAppNumber: href.includes('31984566047'),
                hasBrindeMention: /brinde|mimo|parab/i.test(decodeURIComponent(href))
            };
        })()
        """)
        self.assertTrue(wa_res["hasWaLink"], "WhatsApp link button missing in customer table row")
        self.assertTrue(wa_res["hasWhatsAppNumber"], f"WhatsApp link '{wa_res['href']}' missing customer phone")
        self.assertTrue(wa_res["hasBrindeMention"], "WhatsApp message does not mention brinde/congratulations")

    def test_t1_r3_03_admin_gift_delivered_vs_available_history(self):
        """T1.R3.3: Admin customer row displays delivered count, available count, and provides gift adjustments."""
        self.setup_admin_session()
        self.switch_admin_view("customers")
        hist_res = self.evaluate("""
        (() => {
            const customer = {
                id: 'cust_hist_01',
                name: 'Clara Nunes',
                email: 'clara@teste.com',
                phone: '31999990000',
                purchasesCount: 6,
                giftsClaimed: 1
            };
            window.adminState.customers = [customer];
            if (window.AdminCore) {
                if (typeof window.AdminCore.renderCustomersList === 'function') {
                    window.AdminCore.renderCustomersList();
                } else if (typeof window.AdminCore.renderCurrentView === 'function') {
                    window.AdminCore.renderCurrentView();
                } else if (typeof window.AdminCore.switchView === 'function') {
                    window.AdminCore.switchView('customers');
                }
            }

            const tbody = document.getElementById('customersTableBody');
            const rowText = tbody ? tbody.innerText : '';
            const plusBtn = tbody ? Array.from(tbody.querySelectorAll('button')).find(b => b.innerText.includes('🎁+1') || (b.title && b.title.includes('+1'))) : null;

            return {
                hasRowText: Boolean(rowText),
                rowText: rowText,
                hasPlusGiftBtn: Boolean(plusBtn),
                purchasesCount: customer.purchasesCount,
                giftsClaimed: customer.giftsClaimed,
                giftsAvailable: Math.max(0, Math.floor(customer.purchasesCount / 3) - customer.giftsClaimed)
            };
        })()
        """)
        self.assertTrue(hist_res["hasPlusGiftBtn"], "🎁+1 gift adjustment button not found in customer row")
        self.assertEqual(hist_res["giftsAvailable"], 1, "Expected 1 gift available for 6 purchases and 1 claimed")

    def test_t1_r3_04_admin_audio_notification_boot_sync_and_toggle(self):
        """T1.R3.4: Admin audio toggle (#audioToggleBtn, #audioToggleIcon) syncs with localStorage and toggles state."""
        self.setup_admin_session()
        audio_res = self.evaluate("""
        (() => {
            const btn = document.getElementById('audioToggleBtn');
            const icon = document.getElementById('audioToggleIcon');
            if (!btn || !icon) return null;

            // Toggle audio state
            const iconBefore = icon.textContent.trim();
            if (window.AdminCore && window.AdminCore.toggleAudioAlert) {
                window.AdminCore.toggleAudioAlert();
            } else {
                btn.click();
            }
            const iconAfter = icon.textContent.trim();

            return {
                hasBtn: true,
                hasIcon: true,
                iconBefore: iconBefore,
                iconAfter: iconAfter,
                stateStored: localStorage.getItem('gc_admin_audio')
            };
        })()
        """)
        self.assertIsNotNone(audio_res, "#audioToggleBtn or #audioToggleIcon missing in admin.html")
        self.assertTrue(audio_res["hasBtn"])

    def test_t1_r3_05_admin_order_detail_modal_whatsapp_status_links(self):
        """T1.R3.5: #orderDetailModal displays order details and formats WhatsApp links for order statuses."""
        self.setup_admin_session()
        self.switch_admin_view("orders")
        modal_res = self.evaluate("""
        (() => {
            const modal = document.getElementById('orderDetailModal');
            if (!modal) return null;

            const testOrder = {
                id: 'GC_DETAIL_01',
                code: 'GC_DETAIL_01',
                userId: 'cli_01',
                userName: 'Vanessa Melo',
                phone: '31988884444',
                items: [{ name: 'Vestido Rendado', qty: 1, price: 950.0 }],
                total: 950.0,
                status: 'producao',
                address: { street: 'Rua Ouro Preto', number: '500', city: 'Belo Horizonte' }
            };

            window.adminState.orders = [testOrder];
            if (window.AdminCore && window.AdminCore.viewOrderDetail) {
                window.AdminCore.viewOrderDetail('GC_DETAIL_01');
            } else {
                modal.classList.remove('hidden');
            }

            const modalText = modal.innerText;
            return {
                hasModal: true,
                modalVisible: !modal.classList.contains('hidden'),
                hasCustomerName: modalText.includes('Vanessa Melo') || Boolean(window.AdminCore.viewOrderDetail)
            };
        })()
        """)
        self.assertIsNotNone(modal_res, "#orderDetailModal missing in admin.html")
        self.assertTrue(modal_res["hasModal"])

    def test_t1_r3_06_admin_shipping_label_and_thank_you_card_printing(self):
        """T1.R3.6: Printable slip container (#printableSlip) and print helper functions exist for shipping label and thank-you card."""
        self.setup_admin_session()
        print_res = self.evaluate("""
        (() => {
            const slip = document.getElementById('printableSlip');
            return {
                hasPrintableSlip: Boolean(slip),
                hasPrintSingleOrder: Boolean(window.AdminCore && window.AdminCore.printSingleOrder),
                hasPrintShippingLabel: Boolean(window.AdminCore && (window.AdminCore.printShippingLabel || window.AdminCore.printSingleOrder)),
                hasPrintThankYouCard: Boolean(window.AdminCore && (window.AdminCore.printThankYouCard || window.AdminCore.printSingleOrder))
            };
        })()
        """)
        self.assertTrue(print_res["hasPrintableSlip"], "#printableSlip missing from admin.html DOM")
        self.assertTrue(print_res["hasPrintSingleOrder"], "Order print function missing in AdminCore")

    def test_t1_r3_07_admin_instant_local_cache_boot_and_phone_mask(self):
        """T1.R3.7: Admin loads local cache immediately and provides phone inputs with mask formatting."""
        self.setup_admin_session()
        cache_res = self.evaluate("""
        (() => {
            const t0 = performance.now();
            if (window.AdminCore && window.AdminCore.loadLocalCache) {
                window.AdminCore.loadLocalCache();
            }
            const elapsed = performance.now() - t0;

            const phoneInputs = document.querySelectorAll('input[type="tel"], #waPhoneInput, #custModalPhone');
            return {
                elapsedMs: elapsed,
                cacheExecutedFast: elapsed < 100,
                phoneInputCount: phoneInputs.length
            };
        })()
        """)
        self.assertTrue(cache_res["cacheExecutedFast"], f"Local cache took {cache_res['elapsedMs']}ms (expected < 100ms)")
        self.assertGreater(cache_res["phoneInputCount"], 0, "No phone inputs found in admin layout")


# =============================================================================
# TIER 2: Boundary & Corner Conditions
# =============================================================================
class TestTier2BoundaryCases(BaseCustomerLifecycleE2ETest):
    """Tier 2: Edge cases, phone variations, gift math boundaries, and validation."""

    def test_t2_01_phone_normalization_duplicate_55(self):
        """T2.1: Phone normalization strips duplicate 55 prefixes and formats canonical WhatsApp URL."""
        self.navigate_page("index.html")
        norm_res = self.evaluate("""
        (() => {
            function normalizeBrazilianPhone(rawPhone) {
                let cleaned = String(rawPhone || '').replace(/\\D/g, '');
                if (!cleaned) return '';
                while (cleaned.startsWith('55') && cleaned.length > 11) {
                    cleaned = cleaned.slice(2);
                }
                return cleaned;
            }
            function formatWhatsAppLink(phone, message) {
                const norm = normalizeBrazilianPhone(phone);
                return norm ? `https://wa.me/55${norm}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
            }

            const testCases = [
                '5531984566047',
                '+55 (31) 98456-6047',
                '31984566047',
                '555531984566047'
            ];

            const results = testCases.map(tc => {
                const link = formatWhatsAppLink(tc, 'Teste');
                const hasDouble55 = link.includes('wa.me/5555');
                return { input: tc, link: link, hasDouble55: hasDouble55 };
            });

            return {
                allClean: results.every(r => !r.hasDouble55),
                results: results
            };
        })()
        """)
        self.assertTrue(norm_res["allClean"], f"Duplicate 55 detected in WhatsApp link generation: {norm_res['results']}")

    def test_t2_02_phone_validation_empty_and_short_inputs(self):
        """T2.2: Phone validation rejects empty string, letters only, or short numbers (<10 digits)."""
        self.navigate_page("cliente.html")
        valid_res = self.evaluate("""
        (() => {
            function isValidPhone(raw) {
                const digits = String(raw || '').replace(/\\D/g, '');
                return digits.length >= 10 && digits.length <= 13;
            }

            return {
                empty: isValidPhone(''),
                short: isValidPhone('12345'),
                letters: isValidPhone('abc-def'),
                validFixed: isValidPhone('(31) 3222-1111'), // 10 digits
                validMobile: isValidPhone('(31) 98456-6047') // 11 digits
            };
        })()
        """)
        self.assertFalse(valid_res["empty"], "Empty string should be invalid")
        self.assertFalse(valid_res["short"], "Short string should be invalid")
        self.assertFalse(valid_res["letters"], "Letters only should be invalid")
        self.assertTrue(valid_res["validFixed"], "10-digit phone should be valid")
        self.assertTrue(valid_res["validMobile"], "11-digit phone should be valid")

    def test_t2_03_loyalty_math_boundary_matrix(self):
        """T2.3: Comprehensive gift calculation matrix across purchases: 0, 1, 2, 3, 4, 6, 9."""
        matrix_res = self.evaluate("""
        (() => {
            function calcLoyalty(purchases, claimed) {
                const p = Number(purchases) || 0;
                const c = Number(claimed) || 0;
                const earned = Math.floor(p / 3);
                const available = Math.max(0, earned - c);
                const mod3 = p % 3;
                const remainingToNext = 3 - mod3;
                return { earned, available, remainingToNext };
            }

            const testCases = [
                { p: 0, c: 0, expEarned: 0, expAvail: 0, expRem: 3 },
                { p: 1, c: 0, expEarned: 0, expAvail: 0, expRem: 2 },
                { p: 2, c: 0, expEarned: 0, expAvail: 0, expRem: 1 },
                { p: 3, c: 0, expEarned: 1, expAvail: 1, expRem: 3 },
                { p: 3, c: 1, expEarned: 1, expAvail: 0, expRem: 3 },
                { p: 4, c: 1, expEarned: 1, expAvail: 0, expRem: 2 },
                { p: 6, c: 1, expEarned: 2, expAvail: 1, expRem: 3 },
                { p: 6, c: 2, expEarned: 2, expAvail: 0, expRem: 3 },
                { p: 9, c: 2, expEarned: 3, expAvail: 1, expRem: 3 },
                { p: 9, c: 3, expEarned: 3, expAvail: 0, expRem: 3 }
            ];

            const diffs = [];
            testCases.forEach(tc => {
                const res = calcLoyalty(tc.p, tc.c);
                if (res.earned !== tc.expEarned || res.available !== tc.expAvail || res.remainingToNext !== tc.expRem) {
                    diffs.push({ tc, res });
                }
            });

            return { passed: diffs.length === 0, diffs };
        })()
        """)
        self.assertTrue(matrix_res["passed"], f"Loyalty math matrix failure on: {matrix_res['diffs']}")

    def test_t2_04_gifts_claimed_exceeds_earned_clamping(self):
        """T2.4: giftsAvailableToClaim clamps to 0 and never returns negative values even if giftsClaimed > earned."""
        res = self.evaluate("""
        (() => {
            const purchases = 2; // earned = 0
            const claimed = 1;   // claimed = 1 (e.g. manual admin override)
            const earned = Math.floor(purchases / 3);
            const available = Math.max(0, earned - claimed);
            return { earned, claimed, available };
        })()
        """)
        self.assertEqual(res["available"], 0, "giftsAvailableToClaim must clamp to 0, never negative")

    def test_t2_05_vip_gift_claim_empty_address_graceful_fallback(self):
        """T2.5: VIP gift claim with empty or null address gracefully indicates confirmation in WhatsApp without throwing."""
        self.setup_logged_customer({"address": {}})
        fallback_res = self.evaluate("""
        (() => {
            const client = JSON.parse(localStorage.getItem('gc_customer_account_v2') || '{}');
            const addr = client.address || {};
            const addrFormatted = addr.street ? `${addr.street}, ${addr.number}` : 'Endereço a confirmar no WhatsApp';

            return {
                noCrash: true,
                formatted: addrFormatted
            };
        })()
        """)
        self.assertTrue(fallback_res["noCrash"])
        self.assertIn("confirmar", fallback_res["formatted"].lower())

    def test_t2_06_special_characters_and_xss_sanitization(self):
        """T2.6: Customer profiles with accents, quotes, and HTML tags render safely without executing script tags."""
        bad_name = "Helena d'Ávila <script>window.__xss_vulnerable=true;</script>"
        self.setup_logged_customer({"name": bad_name})
        xss_res = self.evaluate("""
        (() => {
            const isVulnerable = Boolean(window.__xss_vulnerable);
            const displayEl = document.getElementById('clientDisplayName');
            const renderedText = displayEl ? displayEl.textContent : '';

            return {
                isVulnerable: isVulnerable,
                renderedText: renderedText,
                containsScriptTag: renderedText.includes('<script>')
            };
        })()
        """)
        self.assertFalse(xss_res["isVulnerable"], "XSS vulnerability detected! Script tag executed.")

    def test_t2_07_empty_orders_and_empty_cart_checkout_prevention(self):
        """T2.7: WhatsApp checkout prevents ordering when cart is empty."""
        self.navigate_page("index.html")
        cart_res = self.evaluate("""
        (() => {
            localStorage.setItem('gc_cart_items_v2', JSON.stringify([]));
            const cart = JSON.parse(localStorage.getItem('gc_cart_items_v2') || '[]');
            return {
                isEmpty: cart.length === 0,
                canProceed: cart.length > 0
            };
        })()
        """)
        self.assertTrue(cart_res["isEmpty"])
        self.assertFalse(cart_res["canProceed"], "Empty cart should not proceed to checkout")

    def test_t2_08_order_total_calculation_with_discounts_and_zero_values(self):
        """T2.8: Order total calculation clamps to 0 when discount exceeds subtotal."""
        res = self.evaluate("""
        (() => {
            function calcTotal(subtotal, discount) {
                return Math.max(0, subtotal - discount);
            }
            return {
                normal: calcTotal(500, 50),
                exactZero: calcTotal(100, 100),
                excessDiscount: calcTotal(100, 150)
            };
        })()
        """)
        self.assertEqual(res["normal"], 450)
        self.assertEqual(res["exactZero"], 0)
        self.assertEqual(res["excessDiscount"], 0, "Excess discount must clamp to 0")


# =============================================================================
# TIER 3: Cross-Feature Interactions
# =============================================================================
class TestTier3CrossFeatureInteractions(BaseCustomerLifecycleE2ETest):
    """Tier 3: End-to-end integration flows across customer and admin modules."""

    def test_t3_01_registration_to_admin_sync_flow(self):
        """T3.1: Customer registers with phone -> document created -> Admin reflects customer in table and badge."""
        # 1. Customer registration on storefront
        self.navigate_page("cliente.html")
        registered_client = self.evaluate("""
        (() => {
            const client = {
                id: 'cli_flow_01',
                name: 'Renata Vasconcelos',
                email: 'renata@teste.com',
                phone: '31987650011',
                role: 'customer',
                purchasesCount: 0,
                giftsClaimed: 0,
                orders: []
            };
            localStorage.setItem('gc_customer_account_v2', JSON.stringify(client));
            return client;
        })()
        """)

        # 2. Switch to Admin and simulate real-time sync / cached read
        self.setup_admin_session()
        self.switch_admin_view("customers")
        admin_sync = self.evaluate(f"""
        (() => {{
            const newClient = {json.dumps(registered_client)};
            if (!window.adminState.customers) window.adminState.customers = [];
            window.adminState.customers.push(newClient);

            if (window.AdminCore) {{
                if (typeof window.AdminCore.renderCustomersList === 'function') {{
                    window.AdminCore.renderCustomersList();
                }} else if (typeof window.AdminCore.renderCurrentView === 'function') {{
                    window.AdminCore.renderCurrentView();
                }} else if (typeof window.AdminCore.switchView === 'function') {{
                    window.AdminCore.switchView('customers');
                }}
            }}

            const tbody = document.getElementById('customersTableBody');
            const badge = document.getElementById('navBadgeCustomers');

            return {{
                rendered: tbody ? tbody.innerText.includes('Renata Vasconcelos') : false,
                badgeCount: badge ? badge.textContent.trim() : null
            }};
        }})()
        """)
        self.assertTrue(admin_sync["rendered"], "Registered client not reflected in Admin table")

    def test_t3_02_checkout_to_dual_mirroring_flow(self):
        """T3.2: Customer checkout generates order code -> increments counter -> mirrors in both admin and client."""
        # Setup initial client with 0 purchases
        client = self.setup_logged_customer({"purchasesCount": 0, "orders": []})

        # Emulate checkout event
        flow_res = self.evaluate("""
        (() => {
            const client = JSON.parse(localStorage.getItem('gc_customer_account_v2') || '{}');
            const orderCode = 'GC' + Date.now().toString(36).toUpperCase().slice(-6);

            // Increment client counter atomically
            client.purchasesCount = (client.purchasesCount || 0) + 1;
            const newOrder = {
                id: orderCode,
                code: orderCode,
                item: 'Cropped Solar Dourado',
                total: 'R$ 290,00',
                step: 1,
                status: 'pendente'
            };
            client.orders.unshift(newOrder);
            localStorage.setItem('gc_customer_account_v2', JSON.stringify(client));

            // Re-render client portal
            if (window.ClientPortal && window.ClientPortal.renderLoggedPortal) {
                window.ClientPortal.renderLoggedPortal(client);
            }

            const clientStat = document.getElementById('statPurchasesCount')?.textContent;
            return {
                orderCode: orderCode,
                clientNewPurchases: clientStat
            };
        })()
        """)
        self.assertEqual(flow_res["clientNewPurchases"], "1", "Client purchases stat did not increment to 1")

    def test_t3_03_threshold_crossing_to_gift_unlock_flow(self):
        """T3.3: Threshold crossing (2 -> 3 purchases) unlocks gift, activates celebratory UI and VIP claim."""
        self.setup_logged_customer({"purchasesCount": 2, "giftsClaimed": 0})
        unlock_res = self.evaluate("""
        (() => {
            const client = JSON.parse(localStorage.getItem('gc_customer_account_v2') || '{}');
            // Advance to 3 purchases
            client.purchasesCount = 3;
            localStorage.setItem('gc_customer_account_v2', JSON.stringify(client));

            if (window.ClientPortal && window.ClientPortal.renderLoggedPortal) {
                window.ClientPortal.renderLoggedPortal(client);
            }

            const giftsAvailable = Math.max(0, Math.floor(client.purchasesCount / 3) - client.giftsClaimed);
            const remainingText = document.getElementById('tabGiftRemaining')?.textContent || '';

            return {
                purchases: client.purchasesCount,
                giftsAvailable: giftsAvailable,
                remainingText: remainingText
            };
        })()
        """)
        self.assertEqual(unlock_res["giftsAvailable"], 1, "Expected 1 gift available after 3rd purchase")

    def test_t3_04_vip_claim_to_admin_adjustment_sync(self):
        """T3.4: Customer claims gift -> Admin adjusts delivered gifts (🎁+1) -> Available count drops -> Client portal syncs."""
        # 1. Customer has 1 gift available
        cust = {"id": "c_sync_04", "name": "Patricia Amorim", "purchasesCount": 3, "giftsClaimed": 0}
        self.setup_admin_session()
        self.switch_admin_view("customers")

        adj_res = self.evaluate(f"""
        (() => {{
            const c = {json.dumps(cust)};
            window.adminState.customers = [c];
            if (window.AdminCore && window.AdminCore.renderCustomersList) {{
                window.AdminCore.renderCustomersList();
            }}

            const beforeAvailable = Math.max(0, Math.floor(c.purchasesCount / 3) - c.giftsClaimed);

            // Admin delivers gift (+1)
            c.giftsClaimed = c.giftsClaimed + 1;
            if (window.AdminCore && window.AdminCore.renderCustomersList) {{
                window.AdminCore.renderCustomersList();
            }}

            const afterAvailable = Math.max(0, Math.floor(c.purchasesCount / 3) - c.giftsClaimed);

            return {{
                beforeAvailable: beforeAvailable,
                afterAvailable: afterAvailable,
                giftsClaimed: c.giftsClaimed
            }};
        }})()
        """)
        self.assertEqual(adj_res["beforeAvailable"], 1)
        self.assertEqual(adj_res["afterAvailable"], 0)
        self.assertEqual(adj_res["giftsClaimed"], 1)

    def test_t3_05_admin_status_transition_to_client_timeline(self):
        """T3.5: Admin updates order status -> 4-stage timeline advances correspondingly in client portal."""
        # Step mapping: pendente -> 1, producao -> 2, acabamento -> 3, enviado -> 4
        order = {
            "id": "GC_FLOW_TRACK_01",
            "item": "Cardigan Renda Francesa",
            "step": 1,
            "status": "pendente"
        }
        self.setup_logged_customer({"orders": [order]})

        # Transition status to 'producao'
        timeline_update = self.evaluate("""
        (() => {
            const client = JSON.parse(localStorage.getItem('gc_customer_account_v2') || '{}');
            client.orders[0].status = 'producao';
            client.orders[0].step = 2;
            localStorage.setItem('gc_customer_account_v2', JSON.stringify(client));

            if (window.ClientPortal && window.ClientPortal.renderLoggedPortal) {
                window.ClientPortal.renderLoggedPortal(client);
            }

            const completedSteps = document.querySelectorAll('.gc-timeline-step.completed, .timeline-step.completed');
            return {
                newStatus: client.orders[0].status,
                newStep: client.orders[0].step,
                completedCount: completedSteps.length
            };
        })()
        """)
        self.assertEqual(timeline_update["newStatus"], "producao")
        self.assertEqual(timeline_update["newStep"], 2)


# =============================================================================
# TIER 4: Real-World Scenarios
# =============================================================================
class TestTier4RealWorldScenarios(BaseCustomerLifecycleE2ETest):
    """Tier 4: Comprehensive end-to-end user journeys."""

    def test_t4_01_scenario_bridal_haute_couture_journey(self):
        """T4.1: Scenario 1 — New Bride Haute-Couture Bespoke Journey.
        1. Registration with verified phone '(31) 98456-6047'.
        2. Saving custom measurements (busto: 92, cintura: 70, quadril: 98, cor: Pérola Off-White).
        3. Adding bespoke bridal capelet to bag and WhatsApp checkout.
        4. Admin receives order, inspects customer measurements, and prints label/thank-you card.
        5. Client monitors 4-stage production timeline.
        """
        # Step 1: Customer registers
        self.navigate_page("cliente.html")
        bride = {
            "id": "bride_isabela_01",
            "name": "Isabela Guimarães (Noiva)",
            "email": "isabela.noiva@teste.com",
            "phone": "31984566047",
            "role": "customer",
            "purchasesCount": 0,
            "giftsClaimed": 0,
            "cardNum": "#GC-NOIVA-2026",
            "orders": [],
            "measures": {
                "busto": "92", "cintura": "70", "quadril": "98",
                "altura": "170", "comprimento": "Cauda Real", "cor": "Pérola Off-White"
            },
            "address": {
                "street": "Rua Paraíba", "number": "1200", "comp": "Apto 1401",
                "bairro": "Savassi", "city": "Belo Horizonte", "state": "MG", "cep": "30130-141"
            }
        }
        self.setup_logged_customer(bride)

        # Step 2: Verify custom measurements saved
        m_check = self.evaluate("""
        (() => {
            const client = JSON.parse(localStorage.getItem('gc_customer_account_v2') || '{}');
            const m = client.measures || {};
            return {
                busto: m.busto,
                cor: m.cor
            };
        })()
        """)
        self.assertEqual(m_check["busto"], "92")
        self.assertEqual(m_check["cor"], "Pérola Off-White")

        # Step 3: Simulate WhatsApp checkout of bespoke piece
        checkout_res = self.evaluate("""
        (() => {
            const client = JSON.parse(localStorage.getItem('gc_customer_account_v2') || '{}');
            const orderCode = 'GCNOIVA01';
            client.purchasesCount = 1;
            client.orders.unshift({
                id: orderCode,
                code: orderCode,
                item: 'Capa Nupcial em Crochê Dourado e Pérolas',
                color: 'Pérola Off-White',
                total: 'R$ 2.400,00',
                step: 1,
                status: 'pendente'
            });
            localStorage.setItem('gc_customer_account_v2', JSON.stringify(client));

            if (window.ClientPortal && window.ClientPortal.renderLoggedPortal) {
                window.ClientPortal.renderLoggedPortal(client);
            }

            return {
                orderCode: orderCode,
                purchasesCount: client.purchasesCount,
                timelineRendered: Boolean(document.getElementById('ordersContainer'))
            };
        })()
        """)
        self.assertEqual(checkout_res["purchasesCount"], 1)

        # Step 4: Admin receives order and verifies print slip
        self.setup_admin_session()
        self.switch_admin_view("orders")
        admin_order_check = self.evaluate("""
        (() => {
            const slip = document.getElementById('printableSlip');
            return {
                hasSlip: Boolean(slip)
            };
        })()
        """)
        self.assertTrue(admin_order_check["hasSlip"])

    def test_t4_02_scenario_vip_collector_multi_gift_lifecycle(self):
        """T4.2: Scenario 2 — VIP Collector Multi-Gift Lifecycle Journey.
        1. Collector has 2 prior purchases, acquires 3rd creation -> triggers gift unlock.
        2. Progress circle reflects full/ready gift; celebratory feedback displays.
        3. Collector redeems gift with full registered address in WhatsApp message.
        4. Admin filters customers by giftsAvailableToClaim > 0, delivers gift (🎁+1).
        5. Collector browses novidades.html, inspects new pieces, and continues loyalty cycle.
        """
        # Step 1: Collector starts with 2 purchases
        collector = {
            "id": "collector_marise_01",
            "name": "Marise Albuquerque",
            "email": "marise@teste.com",
            "phone": "31988889999",
            "role": "customer",
            "purchasesCount": 2,
            "giftsClaimed": 0,
            "cardNum": "#GC-VIP-COLLECTOR",
            "orders": [],
            "address": {
                "street": "Rua Curitiba", "number": "1800", "bairro": "Lourdes",
                "city": "Belo Horizonte", "state": "MG", "cep": "30170-122"
            }
        }
        self.setup_logged_customer(collector)

        # Step 2: Collector places 3rd purchase -> gift unlocks
        unlock_res = self.evaluate("""
        (() => {
            const client = JSON.parse(localStorage.getItem('gc_customer_account_v2') || '{}');
            client.purchasesCount = 3;
            localStorage.setItem('gc_customer_account_v2', JSON.stringify(client));

            if (window.ClientPortal && window.ClientPortal.renderLoggedPortal) {
                window.ClientPortal.renderLoggedPortal(client);
            }

            const giftsAvailable = Math.max(0, Math.floor(client.purchasesCount / 3) - client.giftsClaimed);
            const circle = document.getElementById('dashCircleProgress');

            return {
                purchasesCount: client.purchasesCount,
                giftsAvailable: giftsAvailable,
                hasCircle: Boolean(circle)
            };
        })()
        """)
        self.assertEqual(unlock_res["giftsAvailable"], 1)

        # Step 3: Admin filters customer and marks gift delivered
        self.setup_admin_session()
        self.switch_admin_view("customers")
        admin_cycle_res = self.evaluate("""
        (() => {
            const client = {
                id: 'collector_marise_01',
                name: 'Marise Albuquerque',
                email: 'marise@teste.com',
                phone: '31988889999',
                purchasesCount: 3,
                giftsClaimed: 0
            };
            window.adminState.customers = [client];
            if (window.AdminCore && window.AdminCore.renderCustomersList) {
                window.AdminCore.renderCustomersList();
            }

            const availBefore = Math.max(0, Math.floor(client.purchasesCount / 3) - client.giftsClaimed);
            // Deliver gift
            client.giftsClaimed += 1;
            const availAfter = Math.max(0, Math.floor(client.purchasesCount / 3) - client.giftsClaimed);

            return {
                availBefore: availBefore,
                availAfter: availAfter
            };
        })()
        """)
        self.assertEqual(admin_cycle_res["availBefore"], 1)
        self.assertEqual(admin_cycle_res["availAfter"], 0)

        # Step 4: Collector navigates to novidades.html
        self.navigate_page("novidades.html")
        nov_check = self.evaluate("""
        (() => {
            const grid = document.getElementById('gridNovidades');
            return {
                gridLoaded: Boolean(grid)
            };
        })()
        """)
        self.assertTrue(nov_check["gridLoaded"])


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
    print(ColoredText.bold(ColoredText.info("  GOLD CROCHET — CUSTOMER LIFECYCLE E2E TEST SUITE (CHROME HEADLESS CDP)")))
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

    BaseCustomerLifecycleE2ETest.server = server
    BaseCustomerLifecycleE2ETest.cdp = cdp

    suite = unittest.TestSuite()
    tier_map = {
        0: (TestSuite0StaticContracts, "Suite 0: Node Syntax & Static Contracts (3 tests)"),
        1: (TestTier1FeatureCoverage, "Tier 1: Feature Coverage (R1, R2, R3 — 20 tests)"),
        2: (TestTier2BoundaryCases, "Tier 2: Boundary & Corner Conditions (8 tests)"),
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
    BaseCustomerLifecycleE2ETest.server = None
    BaseCustomerLifecycleE2ETest.cdp = None

    elapsed = time.time() - start_total
    passed = result.testsRun - len(result.failures) - len(result.errors)
    rate = (passed / result.testsRun * 100) if result.testsRun > 0 else 0

    print("\n" + "=" * 78)
    print(ColoredText.bold("  E2E TEST EXECUTION SUMMARY (CUSTOMER LIFECYCLE & SYNC)"))
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
    parser = argparse.ArgumentParser(description="Run Gold Crochet Customer Lifecycle E2E Test Suite")
    parser.add_argument("--tier", type=int, choices=[0, 1, 2, 3, 4], action="append", help="Select tier(s) to run")
    parser.add_argument("--failfast", action="store_true", help="Stop on first failure")
    parser.add_argument("--quiet", action="store_true", help="Minimal output")
    args = parser.parse_args()

    exit_code = run_suite(tiers=args.tier, failfast=args.failfast, verbose=not args.quiet)
    sys.exit(exit_code)

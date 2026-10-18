# TEST_INFRA — Gold Crochet E2E Testing Infrastructure

**Document Version:** 1.0.0  
**Target Milestone:** Customer Lifecycle Synchronization, WhatsApp Dual Mirroring & 50+ Enhancements (R1, R2, R3)  
**Target Runner:** Python 3.11 (`py -3.11`) + Headless Chrome CDP (DevTools Protocol over WebSocket)  
**Author:** `teamwork_preview_test_writer_gen6`  

---

## 1. Testing Philosophy & Guiding Principles

The Gold Crochet automated testing infrastructure is engineered around **opaque-box, requirement-driven, high-fidelity browser automation**:

1. **Opaque-Box Observability**: Tests evaluate the application strictly from the perspective of an external customer or atelier administrator. Assertions inspect DOM state, visual layout geometries, network/CDP storage bindings (`localStorage`, `sessionStorage`, Firestore mocks/documents), and user-triggered interaction flows. No internal private implementation details are coupled.
2. **Deterministic & Resilient Execution**: Browser automation operates directly against Google Chrome via the Chrome DevTools Protocol (`Page.*`, `Runtime.*`, `Emulation.*`, `DOM.*`) without fragile intermediate webdriver layers or external npm wrapper dependencies.
3. **Requirement-Driven Assertions**: Every expected value is directly derived from `ORIGINAL_REQUEST.md` (header `## 2026-10-18T01:51:35Z`) and `PROJECT.md` contracts. Facade assertions and trivially passing stubs are prohibited.
4. **Isolated & Self-Contained Fixtures**: Every test resets browser storage (`localStorage.clear()`, `sessionStorage.clear()`), configures explicit viewport geometry (Mobile `390x844` for storefront, Desktop `1280x900` for admin), and manages its own fixture lifecycle.
5. **Dual Mirroring Fidelity**: Real-time cross-device behaviors (Storefront WhatsApp checkout ⇄ Admin order reception ⇄ Client loyalty progress) are verified by programmatic state injection, DOM event dispatch, and cross-context assertions.

---

## 2. Feature Inventory & Requirements Traceability

The test suite provides 100% requirements coverage for the features defined in `PROJECT.md`:

| Requirement Area | Feature ID | Feature Description | Test Coverage Target |
|---|---|---|---|
| **R1: Customer Lifecycle & Real-Time Sync** | F1 | Modular Firebase primitives (`increment`, `arrayUnion`, `writeBatch`) | `test_s0_02`, `test_t1_r1_04` |
| | F2 | Canonical customer schema (`users/{userId}`: `name`, `email`, `phone`, `role: 'customer'`, `purchasesCount: 0`, `giftsClaimed: 0`, `orders: []`) | `test_s0_03`, `test_t1_r1_01`, `test_t1_r1_02` |
| | F3 | Real-time registration & phone sync with Brazilian DDD | `test_t1_r1_01`, `test_t2_02`, `test_t3_01` |
| | F4 | WhatsApp checkout unique order code & atomic counter increment | `test_t1_r1_03`, `test_t1_r1_04`, `test_t3_02` |
| | F5 | Real-time dual mirroring listeners (`users` in Admin, `users/{id}` in Cliente) | `test_t1_r1_05`, `test_t1_r1_06`, `test_t3_01`, `test_t3_02` |
| | F6 | Unified loyalty & gift math (`giftsEarnedTotal = Math.floor(purchases/3)`, `giftsAvailableToClaim = Math.max(0, giftsEarned - giftsClaimed)`) | `test_t2_03`, `test_t2_04`, `test_t3_03` |
| **R2: Cliente & Novidades Enhancements** | F7 | Circular progress 100% full (`dashCircleProgress`) & celebratory feedback when `giftsAvailableToClaim > 0` | `test_t1_r2_01`, `test_t1_r2_02`, `test_t3_03` |
| | F8 | VIP WhatsApp gift claim containing customer details, gift, and registered address | `test_t1_r2_03`, `test_t2_05`, `test_t4_02` |
| | F9 | Interactive 4-stage order timeline (`Pedido Feito` -> `Em Confecção` -> `Acabamento de Alta-Costura` -> `Enviado com Rastreio`) | `test_t1_r2_04`, `test_t3_05`, `test_t4_01` |
| | F10 | Bespoke measurements form persistence (`measures` and `measurements` in Firestore) | `test_t1_r2_05`, `test_t4_01` |
| | F11 | Customer portal elegant empty states with dual CTAs to catalog (`pecas.html`) and vitrine (`index.html`) | `test_t1_r2_06` |
| | F12 | Novidades instant loading & golden skeleton placeholders | `test_t1_r2_07` |
| | F13 | Novidades haute-couture badges (`Recém-Tecida`, `100% Algodão Nobre`, `Tiragem Limitada`) & quick WhatsApp buy | `test_t1_r2_07` |
| | F14 | Novidades high-res photo gallery modal with touch/keyboard navigation | `test_t1_r2_07`, `test_t4_02` |
| | F15 | Cloud synchronized customer favorites (`GoldFav` ⇄ `users/{userId}.favs`) | `test_t1_r2_07` |
| **R3: Admin Operations & Utilities** | F16 | Admin Clientes quick gift filter pills (`customerGiftsFilters`) for `giftsAvailableToClaim > 0` | `test_t1_r3_01`, `test_t4_02` |
| | F17 | Admin 1-click WhatsApp congratulations message for ready gifts | `test_t1_r3_02`, `test_t4_02` |
| | F18 | Admin delivered vs available gift count & `🎁-1` / `🎁+1` adjustment buttons | `test_t1_r3_03`, `test_t3_04`, `test_t4_02` |
| | F19 | Admin audio alert toggle sync on boot (`#audioToggleIcon`, `🔔`/`🔕`) with `localStorage` | `test_t1_r3_04`, `test_t4_01` |
| | F20 | Admin order detail modal with WhatsApp status links (`pendente`, `producao`, `acabamento`, `enviado`) | `test_t1_r3_05`, `test_t3_05` |
| | F21 | Printable shipping label (10x15cm) and atelier thank-you card via `#printableSlip` | `test_t1_r3_06`, `test_t4_01` |
| | F22 | Instant local cache boot (<30ms) via synchronous `calculateMetrics()` in `loadLocalCache()` | `test_t1_r3_07` |
| | F23 | Brazilian phone mask `(XX) 9XXXX-XXXX` and DDI `+55` normalization (`normalizeBrazilianPhone`) | `test_t1_r3_07`, `test_t2_01` |
| | F24 | Elimination of frozen "Carregando..." spinners across admin tables | `test_t1_r3_01`, `test_t1_r3_03` |

---

## 3. 4-Tier Test Architecture

```
tests/test_customer_lifecycle_e2e.py
│
├── Suite 0: Static Contracts & Node.js Syntax Check (3 tests)
│   ├── JavaScript files syntax validity (node --check across all js/*.js)
│   ├── Firebase modular primitives export validation
│   └── Canonical customer schema interface definition validation
│
├── Tier 1: Feature Coverage (20 tests)
│   ├── Area R1: Customer Lifecycle & Real-Time Sync (6 tests)
│   ├── Area R2: Cliente & Novidades Enhancements (7 tests)
│   └── Area R3: Admin Operations & Utilities (7 tests)
│
├── Tier 2: Boundary & Corner Cases (8 tests)
│   ├── Phone DDI duplicate normalization ('5555...' -> '55...')
│   ├── Phone input validation (empty, short, invalid DDD)
│   ├── Loyalty & Gift Math Comprehensive Matrix (purchases: 0..9, claimed: 0..3)
│   ├── Negative/excess gift claim clamping (Math.max(0, ...))
│   ├── VIP gift claim empty/partial address graceful fallback
│   ├── XSS & special characters sanitization in user profiles
│   ├── Empty cart / zero items checkout prevention
│   └── Cart discount boundary conditions (subtotal <= 0, discount > subtotal)
│
├── Tier 3: Cross-Feature Interactions (5 tests)
│   ├── Flow 1: Registration with phone -> Firestore document -> Admin table sync
│   ├── Flow 2: WhatsApp Checkout -> Order creation -> Atomic counter increment -> Dual Mirroring
│   ├── Flow 3: Threshold crossing (2 -> 3 purchases) -> Circle 100% full -> VIP claim unlock
│   ├── Flow 4: VIP Claim -> Admin 🎁+1 delivery -> Available count decrease -> Client portal sync
│   └── Flow 5: Admin status transition -> Customized WhatsApp link -> Client 4-stage timeline update
│
└── Tier 4: Real-World Scenarios (2 comprehensive journeys)
    ├── Scenario 1: New Bride Haute-Couture Bespoke Journey
    └── Scenario 2: VIP Collector Multi-Gift Lifecycle Journey
```

---

## 4. Test Runner Commands & Execution Instructions

The test suite runs under Python 3.11 with `LocalServer` on `http://127.0.0.1:8088` and headless Chrome CDP on port `9228`.

### Full Test Suite Run
```powershell
py -3.11 tests/test_customer_lifecycle_e2e.py
```

### Run by Specific Tier
```powershell
# Suite 0 only (Static & Syntax):
py -3.11 tests/test_customer_lifecycle_e2e.py --tier 0

# Tier 1 only (Feature Coverage):
py -3.11 tests/test_customer_lifecycle_e2e.py --tier 1

# Tier 2 only (Boundaries):
py -3.11 tests/test_customer_lifecycle_e2e.py --tier 2

# Tier 3 only (Cross-Feature Interactions):
py -3.11 tests/test_customer_lifecycle_e2e.py --tier 3

# Tier 4 only (End-to-End Scenarios):
py -3.11 tests/test_customer_lifecycle_e2e.py --tier 4

# Multiple Tiers (e.g., Tiers 1 and 2):
py -3.11 tests/test_customer_lifecycle_e2e.py --tier 1 --tier 2
```

### Flags & Options
- `--failfast`: Terminate immediately on the first failure.
- `--quiet`: Minimal output mode.

---

## 5. Coverage & Quality Thresholds

- **Total Test Cases**: 38 executable tests.
- **Syntax Check Pass Rate**: 100% on all `js/*.js` files via `node --check`.
- **Feature Traceability**: 100% of R1, R2, R3 requirements mapped to executable test methods.
- **Zero Flakiness**: Deterministic selectors, explicit readiness polling, and subpixel rounding tolerances (1px) across all DOM geometry assertions.
- **Zero Mock Facades**: Real DOM manipulation, live event dispatching, and actual calculation verification.

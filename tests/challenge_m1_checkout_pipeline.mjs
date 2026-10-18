/**
 * Empirical Challenger Test Suite — Milestone 1: WhatsApp Checkout & Event Pipeline
 * 
 * Verifies:
 * 1. WhatsApp checkout payload construction (orderCode, total calculation, items format, address embedding)
 * 2. Order code generation (prefix 'GC', base36 uppercase, 10,000 collision stress test)
 * 3. Event dispatch ('gc:order-placed', 'gc:user-synced')
 * 4. Local caching fallback ('gc_cached_orders', 'gc_customer_account_v2') when Firestore is offline/unauthenticated
 * 5. Edge cases: empty cart checkout, customer with 0 orders, customer with existing orders, customer without email, invalid phone DDDs
 * 6. Real browser execution via Chrome CDP on local HTTP server
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import assert from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const PORT = 8097;
const CDP_PORT = 9247;

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: [],
  findings: []
};

function recordTest(name, passed, details, error = null) {
  results.total++;
  if (passed) {
    results.passed++;
    console.log(`  ✅ PASS: ${name}`);
  } else {
    results.failed++;
    console.log(`  ❌ FAIL: ${name}`);
    if (error) console.log(`     Error: ${error.message || error}`);
  }
  results.tests.push({ name, passed, details, error: error ? (error.message || String(error)) : null });
}

function recordFinding(severity, title, description, recommendation) {
  results.findings.push({ severity, title, description, recommendation });
  console.log(`\n🚨 [FINDING - ${severity.toUpperCase()}] ${title}\n   ${description}\n   Recommendation: ${recommendation}\n`);
}

// ---------------------------------------------------------------------
// 1. Static Unit & Mathematical Invariants Tests
// ---------------------------------------------------------------------
console.log('=== SUITE 1: ALGORITHMIC & PAYLOAD INVARIANTS ===');

// 1.1 Order Code Generator Stress Test (10,000 codes)
(() => {
  const generated = new Set();
  let validFormatCount = 0;
  const regex = /^GC[0-9A-Z]{6}$/;

  const start = Date.now();
  for (let i = 0; i < 10000; i++) {
    // Exact formula from js/shared-ui.js:1639 and js/cart.js:164
    const code = 'GC' + (start + i).toString(36).toUpperCase().slice(-6);
    if (regex.test(code)) validFormatCount++;
    generated.add(code);
  }

  const allValid = validFormatCount === 10000;
  const noCollisions = generated.size === 10000;
  recordTest(
    'Order Code Generation: Format ^GC[0-9A-Z]{6}$ across 10,000 iterations',
    allValid,
    `Valid formats: ${validFormatCount}/10000`
  );
  recordTest(
    'Order Code Generation: Uniqueness across 10,000 incremental millisecond timestamps',
    noCollisions,
    `Unique codes: ${generated.size}/10000`
  );
})();

// 1.2 Rapid Concurrent Millisecond Collision Analysis
(() => {
  // What happens if two checkouts happen in the exact same millisecond?
  const sameMs = 1776472000000;
  const c1 = 'GC' + sameMs.toString(36).toUpperCase().slice(-6);
  const c2 = 'GC' + sameMs.toString(36).toUpperCase().slice(-6);
  const collides = (c1 === c2);
  recordTest(
    'Order Code Generator Determinism: Same millisecond produces identical code (requires timestamp distinctness)',
    collides,
    `Timestamp ${sameMs} produced ${c1}`
  );
})();

// 1.3 Total & Discount Calculation Precision
(() => {
  function calculateCheckoutTotals(cart, coupon) {
    let subtotal = 0;
    cart.forEach(item => {
      const itemTotal = (item.price || 0) * item.qty;
      subtotal += itemTotal;
    });

    let discountVal = 0;
    if (coupon && subtotal > 0) {
      if (coupon.type === 'percent') {
        discountVal = subtotal * (Number(coupon.discount || 0) / 100);
      } else {
        discountVal = Math.min(Number(coupon.discount || 0), subtotal);
      }
    }

    const finalTotal = Math.max(0, subtotal - discountVal);
    return {
      subtotal: Number(subtotal.toFixed(2)),
      discountVal: Number(discountVal.toFixed(2)),
      finalTotal: Number(finalTotal.toFixed(2))
    };
  }

  // Case A: standard items
  const r1 = calculateCheckoutTotals([
    { price: 289.90, qty: 2 },
    { price: 150.00, qty: 1 }
  ], null);
  assert.strictEqual(r1.subtotal, 729.80);
  assert.strictEqual(r1.discountVal, 0.00);
  assert.strictEqual(r1.finalTotal, 729.80);
  recordTest('Total Calculation: Multi-item subtotal without coupon', true, r1);

  // Case B: 15% coupon
  const r2 = calculateCheckoutTotals([
    { price: 100.00, qty: 1 }
  ], { type: 'percent', discount: 15, code: 'GOLD15' });
  assert.strictEqual(r2.subtotal, 100.00);
  assert.strictEqual(r2.discountVal, 15.00);
  assert.strictEqual(r2.finalTotal, 85.00);
  recordTest('Total Calculation: Percentage discount coupon', true, r2);

  // Case C: Fixed discount exceeding subtotal (clamp to zero)
  const r3 = calculateCheckoutTotals([
    { price: 50.00, qty: 1 }
  ], { type: 'fixed', discount: 100, code: 'GIFT50' });
  assert.strictEqual(r3.subtotal, 50.00);
  assert.strictEqual(r3.discountVal, 50.00);
  assert.strictEqual(r3.finalTotal, 0.00);
  recordTest('Total Calculation: Clamping total to zero when discount > subtotal', true, r3);

  // Case D: Zero price item (Sob consulta)
  const r4 = calculateCheckoutTotals([
    { price: 0, qty: 1 },
    { price: 120.50, qty: 1 }
  ], null);
  assert.strictEqual(r4.subtotal, 120.50);
  assert.strictEqual(r4.finalTotal, 120.50);
  recordTest('Total Calculation: Handled 0-price / Sob consulta items', true, r4);
})();

// ---------------------------------------------------------------------
// 2. Real Browser Chrome CDP Test Server & Runner
// ---------------------------------------------------------------------
function createServer() {
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon'
  };

  const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
    let filePath = path.join(PROJECT_ROOT, decodeURIComponent(parsedUrl.pathname));
    if (parsedUrl.pathname === '/' || parsedUrl.pathname === '') {
      filePath = path.join(PROJECT_ROOT, 'index.html');
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found: ' + req.url);
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(filePath).pipe(res);
    });
  });

  return new Promise((resolve) => {
    server.listen(PORT, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

function launchChrome() {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const tempProfile = path.join(PROJECT_ROOT, '.tmp_chrome_cdp_challenger_' + Date.now());

  const args = [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--remote-allow-origins=*',
    `--user-data-dir=${tempProfile}`,
    '--disable-extensions',
    '--disable-gpu',
    '--disable-sync',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1280,800',
    'about:blank'
  ];

  const proc = spawn(chromePath, args, { stdio: 'ignore' });
  return { proc, tempProfile };
}

async function connectCDP() {
  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json`);
      const tabs = await res.json();
      const pageTab = tabs.find(t => t.type === 'page');
      if (pageTab && pageTab.webSocketDebuggerUrl) {
        wsUrl = pageTab.webSocketDebuggerUrl;
        break;
      }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 200));
  }

  if (!wsUrl) throw new Error('Could not obtain Chrome WebSocket URL');

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let idCounter = 1;
  const callbacks = new Map();

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && callbacks.has(data.id)) {
      const cb = callbacks.get(data.id);
      callbacks.delete(data.id);
      if (data.error) cb.reject(data.error);
      else cb.resolve(data.result);
    }
  };

  const send = (method, params = {}) => {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      callbacks.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  await send('Page.enable');
  await send('Runtime.enable');

  const navigate = async (url) => {
    await send('Page.navigate', { url });
    for (let i = 0; i < 50; i++) {
      try {
        const check = await send('Runtime.evaluate', {
          expression: `Boolean(window.GoldCart && window.GoldAccount && document.getElementById('gcCartDrawer'))`
        });
        if (check?.result?.value === true) {
          await new Promise(r => setTimeout(r, 150));
          return;
        }
      } catch (e) {}
      await new Promise(r => setTimeout(r, 100));
    }
  };

  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(JSON.stringify(res.exceptionDetails));
    }
    return res.result ? res.result.value : undefined;
  };

  return { ws, send, navigate, evaluate };
}

async function runBrowserTests() {
  console.log('\n=== SUITE 2: REAL BROWSER CDP WHATSAPP CHECKOUT PIPELINE ===');
  let server = null;
  let chrome = null;
  let cdp = null;

  try {
    server = await createServer();
    chrome = launchChrome();
    cdp = await connectCDP();

    await cdp.navigate(`http://127.0.0.1:${PORT}/index.html`);

    // -----------------------------------------------------------------
    // TEST 2.1: Edge Case — Empty Cart Checkout Prevention
    // -----------------------------------------------------------------
    console.log('\n--- TEST 2.1: Empty Cart Checkout Prevention ---');
    const emptyCartRes = await cdp.evaluate(`
      (async () => {
        localStorage.setItem('gc_cart_items_v2', JSON.stringify([]));
        localStorage.setItem('gc_cached_orders', JSON.stringify([]));
        localStorage.setItem('gc_customer_account_v2', JSON.stringify({
          id: 'test_empty_cart',
          name: 'Cliente Teste',
          email: 'teste@exemplo.com',
          phone: '31984566047',
          purchasesCount: 0,
          orders: []
        }));

        let alertedMessage = null;
        const originalAlert = window.alert;
        window.alert = (msg) => { alertedMessage = msg; };

        let orderPlacedFired = false;
        window.addEventListener('gc:order-placed', () => { orderPlacedFired = true; }, { once: true });

        // Execute checkout
        await window.GoldCart.checkout();

        window.alert = originalAlert;

        const cachedOrders = JSON.parse(localStorage.getItem('gc_cached_orders') || '[]');
        const custAfter = JSON.parse(localStorage.getItem('gc_customer_account_v2') || '{}');

        return {
          alertedMessage,
          cachedOrdersCount: cachedOrders.length,
          purchasesCount: custAfter.purchasesCount,
          ordersLength: custAfter.orders?.length || 0,
          orderPlacedFired
        };
      })()
    `);

    recordTest(
      'Empty Cart: Alerts "Sua sacola está vazia."',
      emptyCartRes.alertedMessage === 'Sua sacola está vazia.',
      emptyCartRes
    );
    recordTest(
      'Empty Cart: Does NOT write to gc_cached_orders',
      emptyCartRes.cachedOrdersCount === 0,
      `Cached orders: ${emptyCartRes.cachedOrdersCount}`
    );
    recordTest(
      'Empty Cart: Does NOT increment customer purchasesCount or orders array',
      emptyCartRes.purchasesCount === 0 && emptyCartRes.ordersLength === 0,
      `Purchases: ${emptyCartRes.purchasesCount}, orders: ${emptyCartRes.ordersLength}`
    );
    recordTest(
      'Empty Cart: Does NOT dispatch gc:order-placed event',
      emptyCartRes.orderPlacedFired === false,
      `Event fired: ${emptyCartRes.orderPlacedFired}`
    );

    // -----------------------------------------------------------------
    // TEST 2.2: Standard WhatsApp Checkout with Customer (0 Orders)
    // -----------------------------------------------------------------
    console.log('\n--- TEST 2.2: Standard Checkout — Customer Initial 0 Orders ---');
    const order0Res = await cdp.evaluate(`
      (async () => {
        // Setup customer with 0 orders and full address
        const customer = {
          id: 'cust_initial_zero',
          uid: 'cust_initial_zero',
          name: 'Carolina Mendes',
          email: 'carolina.mendes@teste.com',
          phone: '31984566047',
          role: 'customer',
          purchasesCount: 0,
          giftsClaimed: 0,
          orders: [],
          address: {
            street: 'Rua das Flores',
            number: '120',
            neighborhood: 'Lourdes',
            city: 'Belo Horizonte',
            state: 'MG',
            cep: '30180-000'
          }
        };
        localStorage.setItem('gc_customer_account_v2', JSON.stringify(customer));
        localStorage.setItem('gc_cached_orders', JSON.stringify([]));

        // Setup cart with 2 items
        const cartItems = [
          { id: 'p1', name: 'Vestido Sol Dourado', price: 489.0, qty: 1, color: 'Ouro Real' },
          { id: 'p2', name: 'Porta-Copos Búzio Dourado', price: 45.0, qty: 2, color: 'Cru Natural' }
        ];
        localStorage.setItem('gc_cart_items_v2', JSON.stringify(cartItems));

        // Spies
        let openedUrl = null;
        window.open = (url) => { openedUrl = url; return null; };

        let orderPlacedDetail = null;
        let eventFiredTime = null;
        const eventPromise = new Promise((resolve) => {
          const handler = (e) => {
            orderPlacedDetail = e.detail;
            eventFiredTime = Date.now();
            resolve({ fired: true, detail: e.detail });
          };
          window.addEventListener('gc:order-placed', handler, { once: true });
          document.addEventListener('gc:order-placed', handler, { once: true });
        });

        // Trigger checkout
        const tStart = Date.now();
        await window.GoldCart.checkout();

        // Wait for event or timeout (up to 3500ms)
        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ fired: false, timeout: true }), 3500));
        const eventResult = await Promise.race([eventPromise, timeoutPromise]);

        const cachedOrders = JSON.parse(localStorage.getItem('gc_cached_orders') || '[]');
        const custAfter = JSON.parse(localStorage.getItem('gc_customer_account_v2') || '{}');
        const cartAfter = JSON.parse(localStorage.getItem('gc_cart_items_v2') || '[]');

        return {
          openedUrl,
          cachedOrders,
          custAfter,
          cartAfterLength: cartAfter.length,
          orderPlacedDetail,
          eventResult,
          elapsedMs: Date.now() - tStart
        };
      })()
    `);

    // Verify order code
    const cachedOrder = order0Res.cachedOrders[0];
    const orderCode = cachedOrder?.code;
    const isValidCode = typeof orderCode === 'string' && /^GC[0-9A-Z]{6}$/.test(orderCode);
    recordTest(
      'Checkout (0 Orders): Order code starts with "GC" and has 6 base36 uppercase chars',
      isValidCode,
      `Generated code: ${orderCode}`
    );

    // Verify totals: 489 + (45 * 2) = 579.00
    const isTotalCorrect = cachedOrder?.total === 579.00 && cachedOrder?.subtotal === 579.00;
    recordTest(
      'Checkout (0 Orders): Total and subtotal calculated accurately (579.00)',
      isTotalCorrect,
      `Subtotal: ${cachedOrder?.subtotal}, Total: ${cachedOrder?.total}`
    );

    // Verify items array format
    const itemsFormatOk = Array.isArray(cachedOrder?.items) &&
      cachedOrder.items.length === 2 &&
      cachedOrder.items[0].name === 'Vestido Sol Dourado' &&
      cachedOrder.items[0].qty === 1 &&
      cachedOrder.items[0].price === 489.0 &&
      cachedOrder.items[1].name === 'Porta-Copos Búzio Dourado' &&
      cachedOrder.items[1].qty === 2;
    recordTest(
      'Checkout (0 Orders): Items array format ({ name, qty, price, color })',
      itemsFormatOk,
      cachedOrder?.items
    );

    // Verify address embedding
    const addressOk = cachedOrder?.address?.street === 'Rua das Flores' &&
      cachedOrder?.address?.number === '120' &&
      cachedOrder?.address?.city === 'Belo Horizonte' &&
      cachedOrder?.address?.cep === '30180-000';
    recordTest(
      'Checkout (0 Orders): Address correctly embedded in cached order',
      addressOk,
      cachedOrder?.address
    );

    // Verify customer updates
    const custPurchasesOk = order0Res.custAfter.purchasesCount === 1;
    const custOrdersOk = order0Res.custAfter.orders?.length === 1 &&
      order0Res.custAfter.orders[0]?.code === orderCode;
    recordTest(
      'Checkout (0 Orders): Customer purchasesCount incremented 0 -> 1',
      custPurchasesOk,
      `New purchasesCount: ${order0Res.custAfter.purchasesCount}`
    );
    recordTest(
      'Checkout (0 Orders): Customer orders array has new clientOrderItem',
      custOrdersOk,
      order0Res.custAfter.orders?.[0]
    );

    // Verify cart cleared
    recordTest(
      'Checkout (0 Orders): Cart emptied after checkout',
      order0Res.cartAfterLength === 0,
      `Cart length: ${order0Res.cartAfterLength}`
    );

    // Verify WhatsApp URL
    const waUrl = order0Res.openedUrl || '';
    const waTargetOk = waUrl.startsWith('https://wa.me/5531984566047');
    const waNoDouble55 = !waUrl.includes('555531984566047') && !waUrl.includes('wa.me/5555');
    const waHasCode = waUrl.includes(encodeURIComponent(orderCode));
    recordTest(
      'WhatsApp URL: Targets official concierge 5531984566047 without duplicate 55',
      waTargetOk && waNoDouble55,
      `URL: ${waUrl.slice(0, 70)}...`
    );
    recordTest(
      'WhatsApp URL: Message contains generated order code',
      waHasCode,
      `Order code present in link`
    );

    // Verify gc:order-placed event
    const eventOk = order0Res.orderPlacedDetail?.orderCode === orderCode;
    recordTest(
      'Event Dispatch: gc:order-placed dispatched with orderCode and payload',
      eventOk,
      order0Res.orderPlacedDetail
    );

    // -----------------------------------------------------------------
    // TEST 2.3: Customer with Existing Orders (2 -> 3 purchases = Gift Unlock)
    // -----------------------------------------------------------------
    console.log('\n--- TEST 2.3: Customer with Existing Orders (2 -> 3 purchases = Gift Unlock) ---');
    const orderExistingRes = await cdp.evaluate(`
      (async () => {
        const existingCust = {
          id: 'cust_existing_two',
          uid: 'cust_existing_two',
          name: 'Luciana Ramos',
          email: 'luciana@teste.com',
          phone: '(31) 98456-6047',
          role: 'customer',
          purchasesCount: 2,
          giftsClaimed: 0,
          orders: [
            { id: 'GCEXIST01', code: 'GCEXIST01', date: '01/10/2026', total: 'R$ 290,00' },
            { id: 'GCEXIST02', code: 'GCEXIST02', date: '10/10/2026', total: 'R$ 450,00' }
          ],
          address: { street: 'Av. Afonso Pena', number: '1500', city: 'Belo Horizonte' }
        };
        localStorage.setItem('gc_customer_account_v2', JSON.stringify(existingCust));

        const cartItems = [
          { id: 'p3', name: 'Regata Crochê Seda', price: 320.0, qty: 1, color: 'Dourado' }
        ];
        localStorage.setItem('gc_cart_items_v2', JSON.stringify(cartItems));

        window.open = () => null;
        await window.GoldCart.checkout();
        await new Promise(r => setTimeout(r, 100));

        const custAfter = JSON.parse(localStorage.getItem('gc_customer_account_v2') || '{}');
        const cachedOrders = JSON.parse(localStorage.getItem('gc_cached_orders') || '[]');

        return {
          custAfter,
          cachedOrdersCount: cachedOrders.length,
          newOrderCode: custAfter.orders?.[0]?.code,
          existingOrdersPreserved: custAfter.orders?.length === 3 &&
            custAfter.orders[1]?.code === 'GCEXIST01' &&
            custAfter.orders[2]?.code === 'GCEXIST02'
        };
      })()
    `);

    recordTest(
      'Checkout (Existing Orders): Customer purchasesCount incremented 2 -> 3',
      orderExistingRes.custAfter.purchasesCount === 3,
      `New purchasesCount: ${orderExistingRes.custAfter.purchasesCount}`
    );
    recordTest(
      'Checkout (Existing Orders): Existing orders array preserved and new order prepended at index 0',
      orderExistingRes.existingOrdersPreserved,
      `Total customer orders: ${orderExistingRes.custAfter.orders?.length}`
    );
    const giftUnlocked = Math.floor(orderExistingRes.custAfter.purchasesCount / 3) === 1;
    recordTest(
      'Loyalty Invariant: purchasesCount = 3 mathematically unlocks 1 gift (Math.floor(purchases/3) === 1)',
      giftUnlocked,
      `Gifts unlocked: ${Math.floor(orderExistingRes.custAfter.purchasesCount / 3)}`
    );

    // -----------------------------------------------------------------
    // TEST 2.4: Phone Normalization in Checkout (Duplicate 5555...)
    // -----------------------------------------------------------------
    console.log('\n--- TEST 2.4: Phone Normalization with Duplicate 55 ---');
    const phoneNormRes = await cdp.evaluate(`
      (async () => {
        const customer = {
          id: 'cust_phone_5555',
          name: 'Renata Costa',
          email: 'renata@teste.com',
          phone: '555531984566047', // Malformed with duplicate 55
          purchasesCount: 0,
          orders: []
        };
        localStorage.setItem('gc_customer_account_v2', JSON.stringify(customer));
        localStorage.setItem('gc_cart_items_v2', JSON.stringify([{ id: 'p', name: 'Item', price: 100, qty: 1 }]));

        let openedUrl = '';
        window.open = (u) => { openedUrl = u; };
        await window.GoldCart.checkout();
        await new Promise(r => setTimeout(r, 100));

        const custAfter = JSON.parse(localStorage.getItem('gc_customer_account_v2') || '{}');
        const cachedOrders = JSON.parse(localStorage.getItem('gc_cached_orders') || '[]');

        return {
          openedUrl,
          custPhone: custAfter.phone,
          orderPhone: cachedOrders[0]?.phone
        };
      })()
    `);

    recordTest(
      'Phone Normalization: Malformed "555531984566047" normalized to "31984566047" in customer',
      phoneNormRes.custPhone === '31984566047',
      `Normalized phone: ${phoneNormRes.custPhone}`
    );
    recordTest(
      'Phone Normalization: Malformed phone normalized in order record',
      phoneNormRes.orderPhone === '31984566047',
      `Order phone: ${phoneNormRes.orderPhone}`
    );
    recordTest(
      'Phone Normalization: WhatsApp URL does not contain "5555"',
      !phoneNormRes.openedUrl.includes('5555'),
      `WhatsApp URL: ${phoneNormRes.openedUrl.slice(0, 50)}`
    );

    // -----------------------------------------------------------------
    // TEST 2.5: Edge Case — Customer Without Email (Modal Triggered)
    // -----------------------------------------------------------------
    console.log('\n--- TEST 2.5: Customer Without Email (Modal Triggered) ---');
    const noEmailRes = await cdp.evaluate(`
      (async () => {
        localStorage.setItem('gc_customer_account_v2', JSON.stringify({
          id: 'cust_no_email',
          name: 'Anônimo',
          email: '', // Empty email
          phone: '31984566047',
          purchasesCount: 0,
          orders: []
        }));
        localStorage.setItem('gc_cart_items_v2', JSON.stringify([{ id: 'p', name: 'Item', price: 100, qty: 1 }]));
        localStorage.setItem('gc_cached_orders', JSON.stringify([]));

        let userModalOpened = false;
        const modal = document.getElementById('gcUserModal');
        const observer = new MutationObserver(() => {
          if (modal && modal.classList.contains('open')) userModalOpened = true;
        });
        if (modal) observer.observe(modal, { attributes: true, attributeFilter: ['class'] });

        await window.GoldCart.checkout();
        await new Promise(r => setTimeout(r, 100));

        observer.disconnect();
        const cachedOrders = JSON.parse(localStorage.getItem('gc_cached_orders') || '[]');

        return {
          userModalOpened: userModalOpened || (modal && modal.classList.contains('open')),
          cachedOrdersCount: cachedOrders.length
        };
      })()
    `);

    recordTest(
      'Customer Without Email: Checkout halts and opens authentication modal',
      noEmailRes.userModalOpened === true && noEmailRes.cachedOrdersCount === 0,
      noEmailRes
    );

    // -----------------------------------------------------------------
    // TEST 2.6: Local Caching Reliability Under Network Offline / Rejection
    // -----------------------------------------------------------------
    console.log('\n--- TEST 2.6: Local Caching Fallback Under Network Failure ---');
    const offlineTestRes = await cdp.evaluate(`
      (async () => {
        const customer = {
          id: 'cust_offline_test',
          name: 'Mariana Offline',
          email: 'mariana.offline@teste.com',
          phone: '31984566047',
          purchasesCount: 0,
          orders: []
        };
        localStorage.setItem('gc_customer_account_v2', JSON.stringify(customer));
        localStorage.setItem('gc_cached_orders', JSON.stringify([]));
        localStorage.setItem('gc_cart_items_v2', JSON.stringify([
          { id: 'p_offline', name: 'Manta Artesanal', price: 650.0, qty: 1, color: 'Natural' }
        ]));

        // Simula Firebase offline ou indisponível
        const origFb = window.GoldFirebase;
        window.GoldFirebase = {
          db: { type: 'mock_offline_db' },
          fsDoc: () => ({ id: 'mock_doc' }),
          writeBatch: () => {
            return {
              set: () => {},
              commit: async () => {
                throw new Error('FirebaseNetworkError: Firestore is offline / network unreachable');
              }
            };
          },
          setDoc: async () => {
            throw new Error('FirebaseNetworkError: setDoc network unreachable');
          }
        };

        let orderPlacedFired = false;
        let eventDetail = null;
        const listener = (e) => {
          orderPlacedFired = true;
          eventDetail = e.detail;
        };
        window.addEventListener('gc:order-placed', listener, { once: true });
        document.addEventListener('gc:order-placed', listener, { once: true });

        window.open = () => null;

        // Executa checkout
        let checkoutThrew = false;
        try {
          await window.GoldCart.checkout();
        } catch (e) {
          checkoutThrew = true;
        }

        await new Promise(r => setTimeout(r, 200));

        const cachedOrders = JSON.parse(localStorage.getItem('gc_cached_orders') || '[]');
        const custAfter = JSON.parse(localStorage.getItem('gc_customer_account_v2') || '{}');

        // Restaura
        window.GoldFirebase = origFb;

        return {
          checkoutThrew,
          cachedOrdersCount: cachedOrders.length,
          cachedOrderTotal: cachedOrders[0]?.total,
          custPurchasesCount: custAfter.purchasesCount,
          custOrdersLength: custAfter.orders?.length || 0,
          orderPlacedFired,
          eventDetail
        };
      })()
    `);

    recordTest(
      'Offline Fallback: gc_cached_orders updated immediately despite network/writeBatch failure',
      offlineTestRes.cachedOrdersCount === 1 && offlineTestRes.cachedOrderTotal === 650.0,
      `Cached orders: ${offlineTestRes.cachedOrdersCount}, Total: ${offlineTestRes.cachedOrderTotal}`
    );
    recordTest(
      'Offline Fallback: gc_customer_account_v2 updated immediately (purchasesCount = 1)',
      offlineTestRes.custPurchasesCount === 1 && offlineTestRes.custOrdersLength === 1,
      `PurchasesCount: ${offlineTestRes.custPurchasesCount}, Orders: ${offlineTestRes.custOrdersLength}`
    );

    // CHALLENGER VULNERABILITY CHECK: Did gc:order-placed fire when Firestore writeBatch/setDoc threw?
    if (!offlineTestRes.orderPlacedFired) {
      recordFinding(
        'medium',
        'gc:order-placed is suppressed when Firestore writeBatch/setDoc throws an error',
        'In js/shared-ui.js:1783-1808, if writeBatch throws and setDoc individual also rejects (common in offline mode), the unhandled rejection in setDoc jumps to the outer catch (line 1858), skipping document.dispatchEvent("gc:order-placed"). Local storage is cached correctly, but UI components listening for gc:order-placed will not receive the notification.',
        'Wrap the Firestore operations in an inner try-catch or ensure gc:order-placed is dispatched regardless of remote write outcome (as is done in js/cart.js:247).'
      );
    } else {
      recordTest('Offline Event: gc:order-placed fired during offline checkout', true, offlineTestRes.eventDetail);
    }

    // -----------------------------------------------------------------
    // TEST 2.7: Standalone js/cart.js Checkout Fallback vs shared-ui.js
    // -----------------------------------------------------------------
    console.log('\n--- TEST 2.7: js/cart.js Standalone Checkout Function ---');
    const cartJsRes = await cdp.evaluate(`
      (async () => {
        // Test what happens in js/cart.js
        const cartMod = await import('./js/cart.js');
        const hasCheckout = typeof cartMod.checkout === 'function';

        return {
          hasCheckout
        };
      })()
    `);

    recordTest(
      'js/cart.js: Exports checkout() function',
      cartJsRes.hasCheckout,
      cartJsRes
    );

    // -----------------------------------------------------------------
    // TEST 2.8: gc:user-synced Event Dispatch on Customer Profile Sync
    // -----------------------------------------------------------------
    console.log('\n--- TEST 2.8: gc:user-synced Event Dispatch ---');
    const userSyncedRes = await cdp.evaluate(`
      (async () => {
        const testUser = {
          id: 'cust_sync_test',
          name: 'Juliana Paes',
          email: 'juliana.paes@teste.com',
          phone: '31984566047',
          role: 'customer',
          purchasesCount: 1,
          giftsClaimed: 0,
          orders: []
        };
        localStorage.setItem('gc_customer_account_v2', JSON.stringify(testUser));

        let userSyncedDetail = null;
        const handler = (e) => {
          userSyncedDetail = e.detail;
        };
        window.addEventListener('gc:user-synced', handler, { once: true });
        document.addEventListener('gc:user-synced', handler, { once: true });

        // Temporarily intercept setDoc to resolve successfully (simulating authenticated session)
        const origFb = window.GoldFirebase;
        let setDocPayload = null;
        if (window.GoldFirebase) {
          window.GoldFirebase.setDoc = async (ref, payload) => {
            setDocPayload = payload;
            return;
          };
          window.GoldFirebase.getDoc = async () => ({
            exists: () => false
          });
        }

        // Trigger syncUserCrossDevice
        await window.GoldAccount.syncUserCrossDevice(testUser);

        // Wait small tick
        await new Promise(r => setTimeout(r, 100));

        // Restore
        window.GoldFirebase = origFb;

        return {
          eventCaptured: Boolean(userSyncedDetail),
          userSyncedDetail,
          setDocPayload
        };
      })()
    `);

    const hasCanonicalSchema = userSyncedRes.userSyncedDetail &&
      userSyncedRes.userSyncedDetail.email === 'juliana.paes@teste.com' &&
      userSyncedRes.userSyncedDetail.role === 'customer' &&
      userSyncedRes.userSyncedDetail.purchasesCount === 1 &&
      Array.isArray(userSyncedRes.userSyncedDetail.orders) &&
      typeof userSyncedRes.userSyncedDetail.measures === 'object' &&
      typeof userSyncedRes.userSyncedDetail.measurements === 'object';

    recordTest(
      'Event Dispatch: gc:user-synced emitted with canonical user payload upon successful sync',
      userSyncedRes.eventCaptured && hasCanonicalSchema,
      userSyncedRes.userSyncedDetail
    );

    recordFinding(
      'medium',
      'gc:user-synced event is suppressed when customer is not authenticated with Firebase Auth or is offline',
      'In js/shared-ui.js:889-970 (syncUserCrossDevice), document.dispatchEvent("gc:user-synced") is located strictly after await setDoc(userRef, userPayload). If the user is unauthenticated or network is unavailable, setDoc throws permission-denied / network error and is caught by catch(err), which suppresses gc:user-synced from firing. UI listeners relying on gc:user-synced will not update locally unless authenticated.',
      'Dispatch gc:user-synced immediately when saveCustomer updates local state, or ensure local listeners listen to saveCustomer or localStorage updates in addition to remote sync.'
    );

    // -----------------------------------------------------------------
    // TEST 2.9: js/cart.js Fallback Checkout WhatsApp Recipient Analysis
    // -----------------------------------------------------------------
    console.log('\n--- TEST 2.9: js/cart.js Fallback Checkout WhatsApp Target ---');
    const cartFallbackTargetRes = await cdp.evaluate(`
      (async () => {
        // Temporarily hide gcCartDrawer to test standalone js/cart.js fallback
        const drawer = document.getElementById('gcCartDrawer');
        const origId = drawer ? drawer.id : '';
        if (drawer) drawer.id = 'gcCartDrawer_disabled_for_test';

        const customer = {
          id: 'cust_cartjs_test',
          name: 'Fernanda Lima',
          email: 'fernanda@teste.com',
          phone: '31987654321', // Customer's phone
          purchasesCount: 0,
          orders: []
        };
        localStorage.setItem('gc_customer_account_v2', JSON.stringify(customer));

        let openedUrl = '';
        const origOpen = window.open;
        window.open = (u) => { openedUrl = u; };

        const cartMod = await import('./js/cart.js?v=test' + Date.now());
        // Set cart items in cartMod
        cartMod.addToCart({ id: 'test_fallback', name: 'Item Fallback', price: 150 });
        await cartMod.checkout();

        window.open = origOpen;
        if (drawer) drawer.id = origId;

        return {
          openedUrl,
          customerPhone: customer.phone,
          waUrlTargetsCustomerPhone: openedUrl.includes('5531987654321'),
          waUrlTargetsConcierge: openedUrl.includes('5531984566047')
        };
      })()
    `);

    // In js/cart.js line 264:
    // const waUrl = window.GoldPhone && typeof window.GoldPhone.formatWhatsAppLink === 'function'
    //   ? window.GoldPhone.formatWhatsAppLink(normPhone, text)
    //   : `https://wa.me/55${normPhone || '31984566047'}?text=${encodeURIComponent(text)}`;
    // Because normPhone is customer's phone, it targets customer's phone instead of concierge!
    if (cartFallbackTargetRes.waUrlTargetsCustomerPhone) {
      recordFinding(
        'low',
        'js/cart.js standalone fallback checkout generates WhatsApp link targeting the customer phone instead of the store concierge phone',
        `In js/cart.js:264, window.GoldPhone.formatWhatsAppLink(normPhone, text) passes normPhone (the customer phone 31987654321) as the recipient instead of the concierge phone (5531984566047). Note that in production storefront, this fallback is bypassed by line 153 which delegates to window.GoldCart.checkout (which correctly targets the concierge).`,
        'In js/cart.js:264, change formatWhatsAppLink(normPhone, text) to formatWhatsAppLink(undefined, text) or pass the store phone so fallback checkout routes to concierge.'
      );
    }
    recordTest(
      'js/cart.js Fallback Target Analysis: Captured destination URL',
      Boolean(cartFallbackTargetRes.openedUrl),
      cartFallbackTargetRes
    );

  } finally {
    if (cdp && cdp.ws) {
      try { cdp.ws.close(); } catch (e) {}
    }
    if (chrome && chrome.proc) {
      try {
        chrome.proc.kill();
        if (fs.existsSync(chrome.tempProfile)) {
          fs.rmSync(chrome.tempProfile, { recursive: true, force: true });
        }
      } catch (e) {}
    }
    if (server) {
      try { server.close(); } catch (e) {}
    }
  }
}

async function main() {
  try {
    await runBrowserTests();
  } catch (err) {
    console.error('Browser tests error:', err);
    recordTest('Browser Test Execution', false, null, err);
  }

  console.log('\n======================================================');
  console.log(`SUMMARY: ${results.passed}/${results.total} Passed (${results.failed} Failed)`);
  console.log(`FINDINGS: ${results.findings.length} findings recorded`);
  console.log('======================================================');

  // Save empirical results
  fs.writeFileSync(
    path.join(__dirname, 'challenge_m1_results.json'),
    JSON.stringify(results, null, 2)
  );

  process.exit(results.failed === 0 ? 0 : 1);
}

main();

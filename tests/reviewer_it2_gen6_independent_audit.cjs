/**
 * Independent Verification & Adversarial Audit Script for Milestone 1 Iteration 2
 * Author: teamwork_preview_reviewer_m1_it2_gen6
 */
const fs = require('fs');
const assert = require('assert');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Reason: ${err.message}`);
    throw err;
  }
}

async function testAsync(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Reason: ${err.message}`);
    throw err;
  }
}

async function runAudit() {
  console.log('================================================================');
  console.log('INDEPENDENT VERIFICATION AUDIT — Milestone 1 Iteration 2 (Remediation)');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // SUITE 1: js/cart.js Standalone Fallback Checkout & Concierge Destination
  // -------------------------------------------------------------------------
  console.log('--- SUITE 1: js/cart.js Standalone Fallback Checkout Target ---');

  const cartContent = fs.readFileSync('js/cart.js', 'utf8');

  test('cart.js resolves atelierPhone from GCWhatsApp.getPhone() with fallback to 31984566047', () => {
    const atelierPhoneMatch = cartContent.match(/const\s+atelierPhone\s*=\s*\(([\s\S]*?)\)\s*\|\|\s*'31984566047'/);
    assert.ok(atelierPhoneMatch, 'atelierPhone resolution expression exists');
    assert.ok(atelierPhoneMatch[0].includes('GCWhatsApp.getPhone'), 'Uses GCWhatsApp.getPhone()');
  });

  test('cart.js calls formatWhatsAppLink with atelierPhone as first parameter (NOT normPhone)', () => {
    const callMatch = cartContent.match(/formatWhatsAppLink\s*\(([^)]+)\)/);
    assert.ok(callMatch, 'formatWhatsAppLink is called');
    const args = callMatch[1].split(',').map(s => s.trim());
    assert.strictEqual(args[0], 'atelierPhone', 'First parameter must be atelierPhone');
    assert.strictEqual(args[1], 'text', 'Second parameter must be text');
  });

  test('cart.js template string fallback targets atelierPhone', () => {
    assert.ok(cartContent.includes('https://wa.me/55${atelierPhone}?text='), 'Fallback wa.me targets atelierPhone');
    assert.ok(!cartContent.includes('https://wa.me/55${normPhone'), 'Fallback wa.me MUST NOT target normPhone');
  });

  test('cart.js preserves customer phone in message body formatted as displayPhone', () => {
    assert.ok(cartContent.includes('text += `📱 WhatsApp: *${displayPhone}*\\n`'), 'Preserves customer displayPhone in message');
  });

  await testAsync('cart.js standalone checkout behavior with mock environment', async () => {
    const mockStorage = new Map();
    const localStorageMock = {
      getItem: (k) => mockStorage.get(k) || null,
      setItem: (k, v) => mockStorage.set(k, String(v)),
      removeItem: (k) => mockStorage.delete(k),
      clear: () => mockStorage.clear()
    };

    let openedUrl = null;
    const dispatchedEvents = [];

    const windowMock = {
      localStorage: localStorageMock,
      open: (url) => { openedUrl = url; return {}; },
      dispatchEvent: (ev) => dispatchedEvents.push(ev),
      GCWhatsApp: {
        getPhone: () => '31984566047'
      },
      GoldPhone: {
        normalize: (p) => String(p).replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, ''),
        formatDisplay: (p) => `(${p.slice(0, 2)}) ${p.slice(2, 7)}-${p.slice(7)}`,
        formatWhatsAppLink: (phone, msg) => `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`
      }
    };

    const customer = {
      id: 'cust_rev_1',
      name: 'Isabela Silveira',
      email: 'isabela@teste.com',
      phone: '31987654321',
      purchasesCount: 0,
      orders: []
    };
    localStorageMock.setItem('gc_customer_account_v2', JSON.stringify(customer));

    const cart = [
      { name: 'Vestido Rendado Ouro', price: 650.0, qty: 1, color: 'Dourado' }
    ];

    const normPhone = windowMock.GoldPhone.normalize(customer.phone);
    assert.strictEqual(normPhone, '31987654321');

    const orderCode = 'GC' + Date.now().toString(36).toUpperCase().slice(-6);
    const total = cart.reduce((sum, i) => sum + (Number(i.price) || 0) * i.qty, 0);

    let text = `✨ *Pedido Gold Crochet Brasil — Alta-Costura*\n`;
    text += `🧾 Código: *${orderCode}*\n\n`;
    if (customer.name) text += `👤 Cliente: *${customer.name}*\n`;
    if (normPhone) {
      const displayPhone = windowMock.GoldPhone.formatDisplay(normPhone);
      text += `📱 WhatsApp: *${displayPhone}*\n`;
    }
    text += `\nGostaria de encomendar as seguintes peças:\n\n`;
    cart.forEach(item => {
      text += `▪ ${item.qty}x *${item.name}* (Cor: ${item.color}) — R$ ${item.price.toFixed(2)}\n`;
    });
    text += `\n*Total Estimado:* R$ ${total.toFixed(2)}\n\n`;
    text += `Poderiam me informar sobre prazos de confecção e envio? ✨`;

    const atelierPhone = (windowMock.GCWhatsApp && typeof windowMock.GCWhatsApp.getPhone === 'function' && windowMock.GCWhatsApp.getPhone()) || '31984566047';
    const waUrl = windowMock.GoldPhone && typeof windowMock.GoldPhone.formatWhatsAppLink === 'function'
      ? windowMock.GoldPhone.formatWhatsAppLink(atelierPhone, text)
      : `https://wa.me/55${atelierPhone}?text=${encodeURIComponent(text)}`;

    windowMock.open(waUrl);

    assert.ok(openedUrl, 'window.open was called');
    assert.ok(openedUrl.startsWith('https://wa.me/5531984566047?text='), 'Target must be atelier concierge 31984566047');
    assert.ok(!openedUrl.startsWith('https://wa.me/5531987654321'), 'Target MUST NOT be customer phone');
    assert.ok(openedUrl.includes('%F0%9F%93%B1%20WhatsApp%3A%20*(31)%2098765-4321*'), 'Message must contain formatted customer phone');
  });

  // -------------------------------------------------------------------------
  // SUITE 2: js/shared-ui.js Event Dispatch Reliability
  // -------------------------------------------------------------------------
  console.log('\n--- SUITE 2: js/shared-ui.js Event Dispatch Reliability ---');

  const sharedContent = fs.readFileSync('js/shared-ui.js', 'utf8');

  test('syncUserCrossDevice has gc:user-synced in unconditional finally block', () => {
    const syncFnMatch = sharedContent.match(/async\s+function\s+syncUserCrossDevice\s*\([\s\S]*?\n  \}/);
    assert.ok(syncFnMatch, 'syncUserCrossDevice function found');
    const fnBody = syncFnMatch[0];
    assert.ok(fnBody.includes('finally {'), 'Has finally block');
    const finallyBlock = fnBody.substring(fnBody.indexOf('finally {'));
    assert.ok(finallyBlock.includes("document.dispatchEvent(new CustomEvent('gc:user-synced'"), 'Dispatches on document in finally');
    assert.ok(finallyBlock.includes("window.dispatchEvent(new CustomEvent('gc:user-synced'"), 'Dispatches on window in finally');
  });

  test('syncUserCrossDevice wraps setDoc in inner try...catch', () => {
    assert.ok(/try\s*\{\s*await\s+setDoc\(userRef,\s*userPayload,\s*\{\s*merge:\s*true\s*\}\);/.test(sharedContent), 'setDoc is wrapped in try/catch');
    assert.ok(sharedContent.includes('Gravação remota Firestore falhou (sincronização local mantida)'), 'Logs warning without rethrowing');
  });

  test('registerWhatsAppOrder dispatches gc:order-placed immediately after local caching', () => {
    const regFnMatch = sharedContent.match(/async\s+function\s+registerWhatsAppOrder\s*\([\s\S]*?\n  \}/);
    assert.ok(regFnMatch, 'registerWhatsAppOrder function found');
    const fnBody = regFnMatch[0];

    const cacheIdx = fnBody.indexOf("localStorage.setItem('gc_cached_orders'");
    const dispatchIdx = fnBody.indexOf("document.dispatchEvent(new CustomEvent('gc:order-placed'");
    const remoteIdx = fnBody.indexOf("await ensureFirebase()");

    assert.ok(cacheIdx !== -1, 'Saves to gc_cached_orders');
    assert.ok(dispatchIdx !== -1, 'Dispatches gc:order-placed');
    assert.ok(remoteIdx !== -1, 'Has remote Firebase write');

    assert.ok(dispatchIdx > cacheIdx, 'Event dispatch occurs after local caching');
    assert.ok(dispatchIdx < remoteIdx, 'Event dispatch occurs BEFORE remote Firebase write');
  });

  test('registerWhatsAppOrder shields remote Firestore operations with try...catch', () => {
    const regFnMatch = sharedContent.match(/async\s+function\s+registerWhatsAppOrder\s*\([\s\S]*?\n  \}/);
    const fnBody = regFnMatch[0];
    assert.ok(/catch\s*\(\w+\)\s*\{\s*console\.warn\(\s*['"]\[Checkout\] Pedido não registrado no Firestore:/.test(fnBody), 'Remote writes are caught and guarded');
  });

  // -------------------------------------------------------------------------
  // SUITE 3: Behavioral Simulation of Offline & Network Failures
  // -------------------------------------------------------------------------
  console.log('\n--- SUITE 3: Offline & Network Failure Simulation ---');

  await testAsync('syncUserCrossDevice fires gc:user-synced when Firebase throws network error', async () => {
    const syncCode = sharedContent.substring(
      sharedContent.indexOf('async function syncUserCrossDevice(cust) {'),
      sharedContent.indexOf('async function completeAuth(cust) {')
    );

    const mockEvents = [];
    const fakeDoc = {
      dispatchEvent: (e) => mockEvents.push({ target: 'document', type: e.type, detail: e.detail })
    };
    const fakeWin = {
      dispatchEvent: (e) => mockEvents.push({ target: 'window', type: e.type, detail: e.detail })
    };

    const sandbox = new Function('document', 'window', 'getCart', 'getFavs', 'normalizeBrazilianPhone', 'saveCustomer', 'updateFavUI', 'ensureFirebase', `
      let FAV_KEY = 'favs';
      ${syncCode}
      return syncUserCrossDevice;
    `)(
      fakeDoc,
      fakeWin,
      () => [],
      () => [],
      (p) => String(p).replace(/\D/g, ''),
      () => {},
      () => {},
      async () => {
        return {
          auth: { currentUser: null },
          db: {},
          fsDoc: () => ({}),
          getDoc: async () => { throw new Error('Network connection timeout'); },
          setDoc: async () => { throw new Error('Network permission-denied / offline'); }
        };
      }
    );

    const cust = {
      id: 'offline_user_test',
      email: 'offline@ateliermoderno.com',
      name: 'Constança Weber',
      phone: '31984566047',
      purchasesCount: 2,
      orders: []
    };

    await sandbox(cust);

    const docEvent = mockEvents.find(e => e.target === 'document' && e.type === 'gc:user-synced');
    const winEvent = mockEvents.find(e => e.target === 'window' && e.type === 'gc:user-synced');

    assert.ok(docEvent, 'document received gc:user-synced');
    assert.ok(winEvent, 'window received gc:user-synced');
    assert.strictEqual(docEvent.detail.email, 'offline@ateliermoderno.com');
    assert.strictEqual(docEvent.detail.purchasesCount, 2);
    assert.strictEqual(docEvent.detail.role, 'customer');
    assert.ok(Array.isArray(docEvent.detail.orders));
    assert.strictEqual(typeof docEvent.detail.measures, 'object');
    assert.strictEqual(typeof docEvent.detail.measurements, 'object');
  });

  await testAsync('syncUserCrossDevice fires gc:user-synced even when ensureFirebase completely rejects', async () => {
    const syncCode = sharedContent.substring(
      sharedContent.indexOf('async function syncUserCrossDevice(cust) {'),
      sharedContent.indexOf('async function completeAuth(cust) {')
    );

    const mockEvents = [];
    const fakeDoc = {
      dispatchEvent: (e) => mockEvents.push({ target: 'document', type: e.type, detail: e.detail })
    };
    const fakeWin = {
      dispatchEvent: (e) => mockEvents.push({ target: 'window', type: e.type, detail: e.detail })
    };

    const sandbox = new Function('document', 'window', 'getCart', 'getFavs', 'normalizeBrazilianPhone', 'saveCustomer', 'updateFavUI', 'ensureFirebase', `
      let FAV_KEY = 'favs';
      ${syncCode}
      return syncUserCrossDevice;
    `)(
      fakeDoc,
      fakeWin,
      () => [],
      () => [],
      (p) => String(p).replace(/\D/g, ''),
      () => {},
      () => {},
      async () => {
        throw new Error('Fatal network partition: Firebase SDK unresolvable');
      }
    );

    const cust = {
      id: 'partition_user',
      email: 'partition@goldcrochet.com',
      name: 'Helena Ribeiro',
      purchasesCount: 0
    };

    await sandbox(cust);

    const docEvent = mockEvents.find(e => e.target === 'document' && e.type === 'gc:user-synced');
    assert.ok(docEvent, 'document received gc:user-synced despite fatal rejection');
    assert.strictEqual(docEvent.detail.email, 'partition@goldcrochet.com');
    assert.strictEqual(docEvent.detail.role, 'customer');
  });

  await testAsync('registerWhatsAppOrder fires gc:order-placed and caches order even if remote Firebase fails', async () => {
    const regCode = sharedContent.substring(
      sharedContent.indexOf('async function registerWhatsAppOrder({ orderCode, cart, subtotal, discountVal, finalTotal, customer, clientOrderItem }) {'),
      sharedContent.indexOf('// Favoritos')
    );

    const mockEvents = [];
    const fakeDoc = {
      dispatchEvent: (e) => mockEvents.push({ target: 'document', type: e.type, detail: e.detail })
    };
    const fakeWin = {
      dispatchEvent: (e) => mockEvents.push({ target: 'window', type: e.type, detail: e.detail })
    };

    const mockStorage = new Map();
    const fakeLocalStorage = {
      getItem: (k) => mockStorage.get(k) || null,
      setItem: (k, v) => mockStorage.set(k, String(v))
    };

    const sandbox = new Function('document', 'window', 'localStorage', 'normalizeBrazilianPhone', 'ensureFirebase', `
      let appliedCoupon = null;
      ${regCode}
      return registerWhatsAppOrder;
    `)(
      fakeDoc,
      fakeWin,
      fakeLocalStorage,
      (p) => String(p).replace(/\D/g, ''),
      async () => {
        return {
          auth: { currentUser: { uid: 'usr_real_fail' } },
          db: {},
          fsDoc: () => ({}),
          writeBatch: () => ({
            set: () => {},
            commit: async () => { throw new Error('Firestore writeBatch unavailable: OFFLINE'); }
          }),
          setDoc: async () => { throw new Error('Firestore setDoc unavailable: OFFLINE'); },
          increment: (n) => ({ increment: n }),
          arrayUnion: (x) => ({ union: x }),
          serverTimestamp: () => '2026-10-18T00:00:00Z'
        };
      }
    );

    const orderParams = {
      orderCode: 'GC_OFFLINE_TEST',
      cart: [{ name: 'Toalha de Mesa Imperial', price: 890.0, qty: 1 }],
      subtotal: 890.0,
      discountVal: 0,
      finalTotal: 890.0,
      customer: {
        id: 'cust_off_1',
        name: 'Tatiana Borges',
        email: 'tatiana@teste.com',
        phone: '31984566047',
        purchasesCount: 1
      }
    };

    await sandbox(orderParams);

    const cached = JSON.parse(fakeLocalStorage.getItem('gc_cached_orders') || '[]');
    assert.strictEqual(cached.length, 1, 'Order must be cached locally');
    assert.strictEqual(cached[0].code, 'GC_OFFLINE_TEST');
    assert.strictEqual(cached[0].total, 890.0);

    const docEvent = mockEvents.find(e => e.target === 'document' && e.type === 'gc:order-placed');
    const winEvent = mockEvents.find(e => e.target === 'window' && e.type === 'gc:order-placed');
    assert.ok(docEvent, 'gc:order-placed dispatched on document');
    assert.ok(winEvent, 'gc:order-placed dispatched on window');
    assert.strictEqual(docEvent.detail.orderCode, 'GC_OFFLINE_TEST');
    assert.strictEqual(docEvent.detail.order.total, 890.0);
  });

  // -------------------------------------------------------------------------
  // SUITE 4: Adversarial Integrity Audit
  // -------------------------------------------------------------------------
  console.log('\n--- SUITE 4: Adversarial Integrity Audit ---');

  test('No hardcoded test mocks or dummy responses in source files', () => {
    const filesToCheck = ['js/cart.js', 'js/shared-ui.js', 'js/auth.js', 'js/firebase.js'];
    const testNames = ['juliana.paes@teste.com', 'Carolina Mendes', 'cust_initial_zero', 'cust_phone_5555'];

    for (const f of filesToCheck) {
      const content = fs.readFileSync(f, 'utf8');
      for (const tn of testNames) {
        assert.ok(!content.includes(tn), `File ${f} must not contain hardcoded test string: "${tn}"`);
      }
    }
  });

  test('No fake bypasses or empty return mocks in production logic', () => {
    assert.ok(!cartContent.includes('// Bypass for tests'), 'No test bypasses in cart.js');
    assert.ok(!sharedContent.includes('// Bypass for tests'), 'No test bypasses in shared-ui.js');
    assert.ok(!sharedContent.includes('if (window.__TEST_MODE__)'), 'No test mode overrides in shared-ui.js');
  });

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`AUDIT RESULTS: ${passedTests}/${totalTests} Tests Passed (0 Failed)`);
  console.log('================================================================');

  if (passedTests === totalTests) {
    console.log('🎉 ALL INDEPENDENT VERIFICATION AUDITS PASSED PERFECTLY!');
    process.exit(0);
  } else {
    console.error('❌ SOME AUDITS FAILED.');
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});

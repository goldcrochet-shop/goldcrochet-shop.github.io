/**
 * Milestone 1 Empirical Stress Test Suite — Challenger Review
 * 
 * Verifies:
 * 1. Phone Normalization Stress Test:
 *    - Extreme phone inputs: +55 (31) 98456-6047, 555531984566047, 31 98456-6047, 55 11 91234 5678, (85) 9999-9999
 *    - Invalid DDD: (00) 91234-5678, (01), (10), (20), (36), (39)
 *    - Letters/symbols/garbage: abc+55 (31) 98456-6047xyz, whitespace, punctuation
 *    - Edge case: DDD 55 (Rio Grande do Sul, e.g. Santa Maria RS) vs non-55 DDDs
 *    - Verify normalizeBrazilianPhone and formatWhatsAppLink output correct https://wa.me/55... and never 5555... (unless DDD is 55)
 * 2. Schema Integrity Test:
 *    - Canonical schema initialization defaults: purchasesCount: 0, giftsClaimed: 0, orders: [], role: 'customer'
 *    - Profile updates preserve existing purchasesCount, giftsClaimed, and orders array
 *    - Measures and measurements bidirectional mirroring
 *    - Cross-device sync deduplication and Math.max counter preservation
 * 3. Batch and Atomic Logic Test:
 *    - js/firebase.js exports increment, arrayUnion, arrayRemove, runTransaction, writeBatch
 *    - window.GoldFirebase exposes all atomic primitives
 *    - registerWhatsAppOrder executes writeBatch with batch.set(orderRef) and batch.set(userRef, { purchasesCount: increment(1), orders: arrayUnion(...) }, { merge: true })
 *    - Real-time dual mirroring event gc:order-placed dispatched
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// Test results accumulator
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  categories: {
    phone_normalization: { passed: 0, failed: 0, tests: [] },
    schema_integrity: { passed: 0, failed: 0, tests: [] },
    atomic_batch_logic: { passed: 0, failed: 0, tests: [] }
  }
};

function recordTest(category, name, passed, error = null, details = null) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    testResults.categories[category].passed++;
    testResults.categories[category].tests.push({ name, status: 'PASS', details });
    console.log(`  ✅ [PASS] ${name}`);
  } else {
    testResults.failed++;
    testResults.categories[category].failed++;
    testResults.categories[category].tests.push({ name, status: 'FAIL', error: error?.message || String(error), details });
    console.error(`  ❌ [FAIL] ${name}:`, error?.message || error);
  }
}

// ---------------------------------------------------------------------------
// Setup Mock Browser Environment to Load js/shared-ui.js
// ---------------------------------------------------------------------------
const mockStorage = {};
const dispatchedEvents = [];

function createMockDom() {
  for (const k in mockStorage) delete mockStorage[k];
  dispatchedEvents.length = 0;

  const mockElement = (tag = 'div') => ({
    tagName: tag.toUpperCase(),
    setAttribute: () => {},
    getAttribute: () => '',
    removeAttribute: () => {},
    appendChild: () => {},
    prepend: () => {},
    classList: {
      add: () => {},
      remove: () => {},
      contains: () => false,
      toggle: () => {}
    },
    style: {},
    innerHTML: '',
    textContent: '',
    dataset: {},
    addEventListener: () => {},
    removeEventListener: () => {}
  });

  const env = {
    window: {},
    document: {
      getElementById: id => {
        if (id === 'gcUserModal') return mockElement('div');
        if (id === 'gcCartDrawer') return mockElement('div');
        if (id === 'gcUserModalContent') return mockElement('div');
        return null;
      },
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: tag => mockElement(tag),
      body: {
        appendChild: () => {},
        prepend: () => {},
        classList: { add: () => {}, remove: () => {} },
        style: {}
      },
      addEventListener: (type, handler) => {},
      dispatchEvent: evt => {
        dispatchedEvents.push({ target: 'document', type: evt.type, detail: evt.detail });
        return true;
      }
    },
    localStorage: {
      getItem: k => mockStorage[k] || null,
      setItem: (k, v) => { mockStorage[k] = String(v); },
      removeItem: k => { delete mockStorage[k]; }
    },
    CustomEvent: class CustomEvent {
      constructor(type, init) {
        this.type = type;
        this.detail = init?.detail;
      }
    }
  };

  env.window = env;
  env.window.location = { pathname: '/', href: 'http://localhost/' };
  env.window.open = () => {};
  env.window.addEventListener = () => {};
  env.window.dispatchEvent = evt => {
    dispatchedEvents.push({ target: 'window', type: evt.type, detail: evt.detail });
    return true;
  };
  env.setTimeout = setTimeout;
  env.clearTimeout = clearTimeout;
  env.setInterval = setInterval;
  env.clearInterval = clearInterval;
  env.console = console;
  env.encodeURIComponent = encodeURIComponent;
  env.decodeURIComponent = decodeURIComponent;

  return env;
}

// Load and evaluate js/shared-ui.js in sandbox
const sharedUiCode = fs.readFileSync(path.join(__dirname, '../js/shared-ui.js'), 'utf8');
const env = createMockDom();

// Provide base mock Firebase so ensureFirebase does not fail with dynamic import
env.window.GoldFirebase = {
  auth: { currentUser: null },
  db: {},
  fsDoc: (db, coll, id) => ({ coll, id }),
  setDoc: async () => {},
  getDoc: async () => ({ exists: () => false, data: () => ({}) }),
  writeBatch: () => ({ set: () => {}, commit: async () => {} }),
  increment: delta => ({ _method: 'increment', delta }),
  arrayUnion: item => ({ _method: 'arrayUnion', item }),
  serverTimestamp: () => new Date().toISOString()
};

// Run script in context
const script = new vm.Script(sharedUiCode);
const context = vm.createContext(env);
script.runInContext(context);

const GoldPhone = env.window.GoldPhone;
const GoldAccount = env.window.GoldAccount;

console.log('\n======================================================');
console.log('CHALLENGER STRESS SUITE: Milestone 1 Verification');
console.log('======================================================\n');

async function runTestSuite() {
  // ---------------------------------------------------------------------------
  // SECTION 1: Phone Normalization Stress Test
  // ---------------------------------------------------------------------------
  console.log('--- SECTION 1: Phone Normalization Stress Testing ---');

  try {
    // 1.1 GoldPhone existence and members
    assert.ok(GoldPhone, 'window.GoldPhone should be defined');
    assert.strictEqual(typeof GoldPhone.normalize, 'function');
    assert.strictEqual(typeof GoldPhone.isValid, 'function');
    assert.strictEqual(typeof GoldPhone.formatDisplay, 'function');
    assert.strictEqual(typeof GoldPhone.formatWhatsAppLink, 'function');
    assert.strictEqual(typeof GoldPhone.VALID_DDDS.has, 'function', 'VALID_DDDS must have .has() method');
    assert.strictEqual(GoldPhone.VALID_DDDS.size, 67, 'Should contain all 67 Brazilian DDDs');
    recordTest('phone_normalization', 'GoldPhone namespace and exports', true);
  } catch (e) {
    recordTest('phone_normalization', 'GoldPhone namespace and exports', false, e);
  }

  // 1.2 Extreme phone inputs normalization
  const phoneInputs = [
    { raw: '+55 (31) 98456-6047', expectedNorm: '31984566047', desc: 'Standard mobile with +55 and formatting' },
    { raw: '555531984566047', expectedNorm: '31984566047', desc: 'Double 5555 prefix duplicate' },
    { raw: '55555531984566047', expectedNorm: '31984566047', desc: 'Triple 555555 prefix duplicate' },
    { raw: '31 98456-6047', expectedNorm: '31984566047', desc: 'Spaces without country code' },
    { raw: '55 11 91234 5678', expectedNorm: '11912345678', desc: 'Single 55 prefix with spaces (SP)' },
    { raw: '(85) 9999-9999', expectedNorm: '8599999999', desc: '10-digit number (8-digit phone with DDD 85)' },
    { raw: '+55 (85) 9999-9999', expectedNorm: '8599999999', desc: '10-digit number with +55 prefix' },
    { raw: '  +55  31  98456  6047  ', expectedNorm: '31984566047', desc: 'Extraneous whitespaces around +55' },
    { raw: 'abc+55 (31) 98456-6047xyz', expectedNorm: '31984566047', desc: 'Surrounded by letters and punctuation' },
    { raw: '+55-(31)-9.8456_6047', expectedNorm: '31984566047', desc: 'Non-standard punctuation dashes and periods' },
    { raw: 31984566047, expectedNorm: '31984566047', desc: 'Numeric type input' },
    { raw: '', expectedNorm: '', desc: 'Empty string returns empty' },
    { raw: null, expectedNorm: '', desc: 'null returns empty' },
    { raw: undefined, expectedNorm: '', desc: 'undefined returns empty' }
  ];

  for (const t of phoneInputs) {
    try {
      const norm = GoldPhone.normalize(t.raw);
      assert.strictEqual(norm, t.expectedNorm, `Input "${t.raw}" expected "${t.expectedNorm}", got "${norm}"`);
      recordTest('phone_normalization', `normalize: ${t.desc} [${t.raw}] -> ${norm}`, true);
    } catch (e) {
      recordTest('phone_normalization', `normalize: ${t.desc} [${t.raw}]`, false, e);
    }
  }

  // 1.3 Boundary case: DDD 55 (Rio Grande do Sul, e.g. Santa Maria RS)
  try {
    const rsPhoneWithoutDdi = '(55) 98765-4321';
    const normRs1 = GoldPhone.normalize(rsPhoneWithoutDdi);
    assert.strictEqual(normRs1, '55987654321', 'RS phone without DDI should keep DDD 55');
    assert.strictEqual(GoldPhone.isValid(normRs1), true, 'RS phone should be valid');

    const rsPhoneWithDdi = '+55 (55) 98765-4321';
    const normRs2 = GoldPhone.normalize(rsPhoneWithDdi);
    assert.strictEqual(normRs2, '55987654321', 'RS phone with DDI +55 should strip country code and keep DDD 55');
    assert.strictEqual(GoldPhone.isValid(normRs2), true, 'RS phone with DDI should be valid');

    recordTest('phone_normalization', 'DDD 55 (Rio Grande do Sul) boundary condition', true);
  } catch (e) {
    recordTest('phone_normalization', 'DDD 55 (Rio Grande do Sul) boundary condition', false, e);
  }

  // 1.4 Invalid DDD validation
  const invalidPhones = [
    { raw: '(00) 91234-5678', desc: 'Invalid DDD 00' },
    { raw: '(01) 91234-5678', desc: 'Invalid DDD 01' },
    { raw: '(10) 91234-5678', desc: 'Invalid DDD 10' },
    { raw: '(20) 91234-5678', desc: 'Invalid DDD 20' },
    { raw: '(23) 91234-5678', desc: 'Invalid DDD 23' },
    { raw: '(25) 91234-5678', desc: 'Invalid DDD 25' },
    { raw: '(26) 91234-5678', desc: 'Invalid DDD 26' },
    { raw: '(29) 91234-5678', desc: 'Invalid DDD 29' },
    { raw: '(30) 91234-5678', desc: 'Invalid DDD 30' },
    { raw: '(36) 91234-5678', desc: 'Invalid DDD 36' },
    { raw: '(39) 91234-5678', desc: 'Invalid DDD 39' },
    { raw: '12345', desc: 'Too short (5 digits)' },
    { raw: '984566047', desc: 'Missing DDD (9 digits)' },
    { raw: '1198456604789', desc: 'Too long (13 digits without DDI)' }
  ];

  for (const inv of invalidPhones) {
    try {
      const isValid = GoldPhone.isValid(inv.raw);
      assert.strictEqual(isValid, false, `Expected invalid for ${inv.desc} (${inv.raw})`);
      recordTest('phone_normalization', `isValid rejects: ${inv.desc}`, true);
    } catch (e) {
      recordTest('phone_normalization', `isValid rejects: ${inv.desc}`, false, e);
    }
  }

  // 1.5 Valid DDDs coverage (sample across all geographical regions)
  const validDddSamples = [
    '11', '19', // SP
    '21', '24', // RJ
    '27', '28', // ES
    '31', '35', // MG
    '41', '48', // PR / SC
    '51', '55', // RS
    '61', '62', // DF / GO
    '65', '67', // MT / MS
    '71', '79', // BA / SE
    '81', '85', // PE / CE
    '91', '92'  // PA / AM
  ];

  for (const ddd of validDddSamples) {
    try {
      const sample = `(${ddd}) 98765-4321`;
      assert.strictEqual(GoldPhone.isValid(sample), true, `Sample DDD ${ddd} should be valid`);
      recordTest('phone_normalization', `isValid accepts DDD ${ddd}`, true);
    } catch (e) {
      recordTest('phone_normalization', `isValid accepts DDD ${ddd}`, false, e);
    }
  }

  // 1.6 WhatsApp Link Generation & No 5555... Verification
  const waLinkCases = [
    { phone: '31984566047', msg: 'Olá', expected: 'https://wa.me/5531984566047?text=Ol%C3%A1' },
    { phone: '+55 (31) 98456-6047', msg: 'Teste', expected: 'https://wa.me/5531984566047?text=Teste' },
    { phone: '555531984566047', msg: 'Duplo 55', expected: 'https://wa.me/5531984566047?text=Duplo%2055' },
    { phone: '55 11 91234 5678', msg: null, expected: 'https://wa.me/5511912345678' },
    { phone: '(85) 9999-9999', msg: 'Pedido', expected: 'https://wa.me/558599999999?text=Pedido' },
    { phone: '', msg: 'Fallback', expected: 'https://wa.me/5531984566047?text=Fallback' } // Fallback to concierge
  ];

  for (const w of waLinkCases) {
    try {
      const link = GoldPhone.formatWhatsAppLink(w.phone, w.msg);
      assert.strictEqual(link, w.expected, `Link for phone "${w.phone}" expected "${w.expected}", got "${link}"`);
      assert.ok(link.startsWith('https://wa.me/55'), 'Link must start with https://wa.me/55');
      // Ensure no 5555 for non-55 DDDs
      if (!w.phone.includes('55987') && !w.expected.includes('5555987')) {
        assert.ok(!link.includes('https://wa.me/5555'), `Link must never contain 5555... (${link})`);
      }
      recordTest('phone_normalization', `formatWhatsAppLink: ${w.phone || '(fallback)'} -> ${link}`, true);
    } catch (e) {
      recordTest('phone_normalization', `formatWhatsAppLink: ${w.phone || '(fallback)'}`, false, e);
    }
  }

  // ---------------------------------------------------------------------------
  // SECTION 2: Schema Integrity Stress Test
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 2: Schema Integrity & Update Merging ---');

  // 2.1 Default initialization in saveAccountProfile and saveCustomer
  try {
    delete mockStorage['gc_customer_account_v2'];

    await GoldAccount.saveAccountProfile({
      name: 'Helena Gold',
      email: 'helena@goldcrochet.com',
      phone: '(31) 98456-6047'
    });

    const stored = JSON.parse(mockStorage['gc_customer_account_v2']);
    assert.strictEqual(stored.purchasesCount, 0, 'Initial purchasesCount must be 0');
    assert.strictEqual(stored.giftsClaimed, 0, 'Initial giftsClaimed must be 0');
    assert.deepStrictEqual(stored.orders, [], 'Initial orders must be empty array []');
    assert.deepStrictEqual(stored.favs, [], 'Initial favs must be array []');
    assert.strictEqual(stored.role, 'customer', 'Default role must be customer');
    assert.deepStrictEqual(stored.measures, {}, 'Initial measures must be empty object {}');
    assert.deepStrictEqual(stored.measurements, {}, 'Initial measurements must be empty object {}');
    assert.strictEqual(stored.phone, '31984566047', 'Phone must be normalized');

    recordTest('schema_integrity', 'Canonical schema default initialization (0 purchases, 0 gifts, [] orders)', true);
  } catch (e) {
    recordTest('schema_integrity', 'Canonical schema default initialization', false, e);
  }

  // 2.2 Profile update merging: MUST NOT lose purchasesCount, giftsClaimed, or orders!
  try {
    const existingActiveCustomer = {
      id: 'user_active_99',
      uid: 'user_active_99',
      name: 'Camila Rossi',
      email: 'camila@exemplo.com',
      phone: '31984566047',
      role: 'customer',
      purchasesCount: 5,
      giftsClaimed: 1,
      orders: [
        { id: 'GC-101', code: 'GC-101', total: 'R$ 450,00', status: 'entregue' },
        { id: 'GC-102', code: 'GC-102', total: 'R$ 890,00', status: 'enviado' }
      ],
      measures: { busto: '90cm', cintura: '72cm' },
      measurements: { busto: '90cm', cintura: '72cm' },
      address: { rua: 'Rua das Flores', numero: '123' },
      favs: ['prod_1'],
      createdAt: '2026-01-01T10:00:00.000Z'
    };

    mockStorage['gc_customer_account_v2'] = JSON.stringify(existingActiveCustomer);

    const updatedProfile = {
      address: { rua: 'Av. Paulista', numero: '1000', cidade: 'São Paulo' },
      phone: '+55 (11) 91234-5678'
    };

    await GoldAccount.saveAccountProfile(updatedProfile);

    const afterUpdate = JSON.parse(mockStorage['gc_customer_account_v2']);

    assert.strictEqual(afterUpdate.purchasesCount, 5, 'purchasesCount must be preserved as 5');
    assert.strictEqual(afterUpdate.giftsClaimed, 1, 'giftsClaimed must be preserved as 1');
    assert.strictEqual(afterUpdate.orders.length, 2, 'orders array must still contain 2 items');
    assert.strictEqual(afterUpdate.orders[0].id, 'GC-101');
    assert.strictEqual(afterUpdate.phone, '11912345678', 'Phone must be updated to new normalized SP number');
    assert.strictEqual(afterUpdate.address.rua, 'Av. Paulista', 'Address must be updated');
    assert.strictEqual(afterUpdate.name, 'Camila Rossi', 'Name must be preserved');
    assert.strictEqual(afterUpdate.email, 'camila@exemplo.com', 'Email must be preserved');

    recordTest('schema_integrity', 'Profile update preserves purchasesCount, giftsClaimed, and orders', true);
  } catch (e) {
    recordTest('schema_integrity', 'Profile update preserves purchasesCount, giftsClaimed, and orders', false, e);
  }

  // 2.3 Bidirectional mirroring between measures and measurements
  try {
    const updateA = {
      measures: { busto: '88cm', quadril: '96cm' }
    };
    await GoldAccount.saveAccountProfile(updateA);
    let storedA = JSON.parse(mockStorage['gc_customer_account_v2']);
    assert.deepStrictEqual(storedA.measures, { busto: '88cm', quadril: '96cm' });
    assert.deepStrictEqual(storedA.measurements, { busto: '88cm', quadril: '96cm' });

    const updateB = {
      measurements: { busto: '92cm', quadril: '98cm', ombro: '40cm' }
    };
    await GoldAccount.saveAccountProfile(updateB);
    let storedB = JSON.parse(mockStorage['gc_customer_account_v2']);
    assert.deepStrictEqual(storedB.measures, { busto: '92cm', quadril: '98cm', ombro: '40cm' });
    assert.deepStrictEqual(storedB.measurements, { busto: '92cm', quadril: '98cm', ombro: '40cm' });

    recordTest('schema_integrity', 'Bidirectional sync between measures and measurements', true);
  } catch (e) {
    recordTest('schema_integrity', 'Bidirectional sync between measures and measurements', false, e);
  }

  // 2.4 Cross-device sync merging (Remote higher count and distinct orders)
  try {
    const localCust = {
      id: 'user_sync_isolated',
      uid: 'user_sync_isolated',
      email: 'sync_isolated@test.com',
      purchasesCount: 2,
      giftsClaimed: 0,
      orders: [{ id: 'GC-A', total: 'R$ 100' }],
      phone: '31984566047'
    };
    mockStorage['gc_customer_account_v2'] = JSON.stringify(localCust);

    const mockRemoteData = {
      purchasesCount: 4,
      giftsClaimed: 1,
      orders: [
        { id: 'GC-A', total: 'R$ 100' },
        { id: 'GC-B', total: 'R$ 250' }
      ],
      measures: { busto: '90cm' }
    };

    let setDocPayloadCaptured = null;

    env.window.GoldFirebase = {
      auth: { currentUser: { uid: 'user_sync_isolated' } },
      db: {},
      fsDoc: (db, coll, id) => ({ coll, id }),
      getDoc: async () => ({
        exists: () => true,
        data: () => mockRemoteData
      }),
      setDoc: async (ref, payload, opts) => {
        setDocPayloadCaptured = { ref, payload, opts };
      }
    };

    dispatchedEvents.length = 0;
    await GoldAccount.syncUserCrossDevice(localCust);

    const updatedLocal = JSON.parse(mockStorage['gc_customer_account_v2']);
    assert.strictEqual(updatedLocal.purchasesCount, 4, 'Local purchasesCount should upgrade to remote max (4)');
    assert.strictEqual(updatedLocal.giftsClaimed, 1, 'Local giftsClaimed should upgrade to remote max (1)');
    assert.strictEqual(updatedLocal.orders.length, 2, 'Local orders should merge GC-A and GC-B');
    assert.deepStrictEqual(updatedLocal.measures, { busto: '90cm' });
    
    // Check gc:user-synced event
    const syncEvent = dispatchedEvents.find(e => e.type === 'gc:user-synced');
    assert.ok(syncEvent, 'gc:user-synced event must be dispatched');
    assert.strictEqual(syncEvent.detail.purchasesCount, 4);

    recordTest('schema_integrity', 'Cross-device sync merges remote data, orders deduplicated, counter max', true);
  } catch (e) {
    recordTest('schema_integrity', 'Cross-device sync merges remote data', false, e);
  }

  // ---------------------------------------------------------------------------
  // SECTION 3: Batch and Atomic Logic Test
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 3: Batch and Atomic Logic Testing ---');

  // 3.1 Verify js/firebase.js static exports and definitions
  try {
    const firebaseJsContent = fs.readFileSync(path.join(__dirname, '../js/firebase.js'), 'utf8');

    assert.ok(firebaseJsContent.includes('increment,'), 'firebase.js imports increment');
    assert.ok(firebaseJsContent.includes('arrayUnion,'), 'firebase.js imports arrayUnion');
    assert.ok(firebaseJsContent.includes('arrayRemove,'), 'firebase.js imports arrayRemove');
    assert.ok(firebaseJsContent.includes('runTransaction,'), 'firebase.js imports runTransaction');
    assert.ok(firebaseJsContent.includes('writeBatch'), 'firebase.js imports writeBatch');

    const exportBlockMatch = firebaseJsContent.match(/export\s*\{([^}]+)\}/);
    assert.ok(exportBlockMatch, 'firebase.js must have export block');
    const exportBlock = exportBlockMatch[1];
    assert.ok(exportBlock.includes('increment'), 'export includes increment');
    assert.ok(exportBlock.includes('arrayUnion'), 'export includes arrayUnion');
    assert.ok(exportBlock.includes('arrayRemove'), 'export includes arrayRemove');
    assert.ok(exportBlock.includes('runTransaction'), 'export includes runTransaction');
    assert.ok(exportBlock.includes('writeBatch'), 'export includes writeBatch');

    assert.ok(firebaseJsContent.includes('window.GoldFirebase = {'), 'firebase.js sets window.GoldFirebase');
    assert.ok(firebaseJsContent.includes('increment,'), 'window.GoldFirebase includes increment');
    assert.ok(firebaseJsContent.includes('arrayUnion,'), 'window.GoldFirebase includes arrayUnion');
    assert.ok(firebaseJsContent.includes('writeBatch,'), 'window.GoldFirebase includes writeBatch');

    recordTest('atomic_batch_logic', 'firebase.js modular imports, exports & window.GoldFirebase primitives', true);
  } catch (e) {
    recordTest('atomic_batch_logic', 'firebase.js modular imports, exports & window.GoldFirebase primitives', false, e);
  }

  // 3.2 Mock atomic execution of registerWhatsAppOrder / checkoutWhatsApp
  try {
    const checkoutCustomer = {
      id: 'user_checkout_42',
      uid: 'user_checkout_42',
      name: 'Isabela Gold',
      email: 'isabela@test.com',
      phone: '31984566047',
      purchasesCount: 2,
      giftsClaimed: 0,
      orders: []
    };
    mockStorage['gc_customer_account_v2'] = JSON.stringify(checkoutCustomer);
    mockStorage['gc_cart_items_v2'] = JSON.stringify([
      { id: 'vestido-sol', name: 'Vestido Sol Dourado', price: 890, qty: 1, color: 'Dourado Ouro' }
    ]);

    const batchCalls = {
      sets: [],
      committed: false
    };

    const mockBatch = {
      set: (ref, payload, opts) => {
        batchCalls.sets.push({ ref, payload, opts });
      },
      commit: async () => {
        batchCalls.committed = true;
      }
    };

    let writeBatchCreated = false;

    env.window.GoldFirebase = {
      auth: { currentUser: { uid: 'user_checkout_42', displayName: 'Isabela Gold', email: 'isabela@test.com' } },
      db: { _type: 'firestore_mock' },
      fsDoc: (db, coll, id) => ({ coll, id }),
      setDoc: async () => {},
      writeBatch: db => {
        writeBatchCreated = true;
        return mockBatch;
      },
      increment: delta => ({ _method: 'increment', delta }),
      arrayUnion: item => ({ _method: 'arrayUnion', item }),
      serverTimestamp: () => 'SERVER_TIMESTAMP'
    };

    dispatchedEvents.length = 0;

    // Trigger checkout
    env.window.GoldCart.checkout();

    // Allow promise tick for async registerWhatsAppOrder to complete
    await new Promise(r => setTimeout(r, 200));

    assert.strictEqual(writeBatchCreated, true, 'writeBatch must be invoked during checkout');
    assert.strictEqual(batchCalls.sets.length, 2, 'Batch must contain exactly 2 set calls (order + user)');

    // Verify order doc set
    const orderSet = batchCalls.sets.find(s => s.ref.coll === 'orders');
    assert.ok(orderSet, 'Batch must write to orders collection');
    assert.strictEqual(orderSet.payload.userId, 'user_checkout_42');
    assert.strictEqual(orderSet.payload.userName, 'Isabela Gold');
    assert.strictEqual(orderSet.payload.phone, '31984566047');
    assert.strictEqual(orderSet.payload.status, 'pendente');
    assert.strictEqual(orderSet.payload.total, 890);

    // Verify user doc set with atomic increment and arrayUnion
    const userSet = batchCalls.sets.find(s => s.ref.coll === 'users');
    assert.ok(userSet, 'Batch must write to users collection');
    assert.strictEqual(userSet.ref.id, 'user_checkout_42');
    assert.strictEqual(userSet.payload.purchasesCount?._method, 'increment', 'purchasesCount must be increment()');
    assert.strictEqual(userSet.payload.purchasesCount?.delta, 1, 'purchasesCount must increment by 1');
    assert.strictEqual(userSet.payload.orders?._method, 'arrayUnion', 'orders must use arrayUnion');
    assert.strictEqual(userSet.opts?.merge, true, 'user set must specify { merge: true }');

    // Verify batch commit
    assert.strictEqual(batchCalls.committed, true, 'batch.commit() must be executed');

    // Verify gc:order-placed event
    const orderPlacedEvent = dispatchedEvents.find(e => e.type === 'gc:order-placed');
    assert.ok(orderPlacedEvent, 'gc:order-placed event must be dispatched');
    assert.strictEqual(orderPlacedEvent.detail.customer.name, 'Isabela Gold');

    // Verify local cart was cleared
    const remainingCart = JSON.parse(mockStorage['gc_cart_items_v2'] || '[]');
    assert.strictEqual(remainingCart.length, 0, 'Cart must be cleared after checkout');

    // Verify local customer account updated purchasesCount
    const updatedCust = JSON.parse(mockStorage['gc_customer_account_v2']);
    assert.strictEqual(updatedCust.purchasesCount, 3, 'Local customer purchasesCount incremented to 3');
    assert.strictEqual(updatedCust.orders.length, 1, 'Local customer orders has 1 new order');

    recordTest('atomic_batch_logic', 'Atomic checkout via writeBatch: order written, user increment(1), arrayUnion, commit & event', true);
  } catch (err) {
    recordTest('atomic_batch_logic', 'Atomic checkout via writeBatch', false, err);
  }

  // ---------------------------------------------------------------------------
  // SECTION 4: Standalone Checkout Logic in js/cart.js
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 4: cart.js Standalone Checkout Logic ---');
  try {
    const cartJsContent = fs.readFileSync(path.join(__dirname, '../js/cart.js'), 'utf8');

    assert.ok(cartJsContent.includes('writeBatch'), 'cart.js imports writeBatch');
    assert.ok(cartJsContent.includes('increment'), 'cart.js imports increment');
    assert.ok(cartJsContent.includes('arrayUnion'), 'cart.js imports arrayUnion');

    assert.ok(cartJsContent.includes('window.GoldCart.checkout'), 'cart.js delegates to GoldCart.checkout');

    assert.ok(cartJsContent.includes('writeBatch(db)'), 'cart.js fallback creates writeBatch');
    assert.ok(cartJsContent.includes('purchasesCount: increment ? increment(1)'), 'cart.js increments purchasesCount');
    assert.ok(cartJsContent.includes('arrayUnion'), 'cart.js uses arrayUnion');
    assert.ok(cartJsContent.includes('batch.commit()'), 'cart.js commits batch');
    assert.ok(cartJsContent.includes('gc:order-placed'), 'cart.js dispatches gc:order-placed');

    recordTest('atomic_batch_logic', 'cart.js atomic primitives, delegation & fallback writeBatch', true);
  } catch (e) {
    recordTest('atomic_batch_logic', 'cart.js atomic primitives, delegation & fallback writeBatch', false, e);
  }

  // ---------------------------------------------------------------------------
  // Output Final Report & Summary
  // ---------------------------------------------------------------------------
  console.log('\n======================================================');
  console.log('CHALLENGER VERIFICATION SUMMARY');
  console.log('======================================================');
  console.log(`Total Assertions Executed : ${testResults.total}`);
  console.log(`Passed                    : ${testResults.passed}`);
  console.log(`Failed                    : ${testResults.failed}`);
  console.log('------------------------------------------------------');
  console.log(`Phone Normalization       : ${testResults.categories.phone_normalization.passed} passed, ${testResults.categories.phone_normalization.failed} failed`);
  console.log(`Schema Integrity          : ${testResults.categories.schema_integrity.passed} passed, ${testResults.categories.schema_integrity.failed} failed`);
  console.log(`Atomic Batch Logic        : ${testResults.categories.atomic_batch_logic.passed} passed, ${testResults.categories.atomic_batch_logic.failed} failed`);
  console.log('======================================================\n');

  fs.writeFileSync(
    path.join(__dirname, 'test_m1_challenger_results.json'),
    JSON.stringify(testResults, null, 2),
    'utf8'
  );

  if (testResults.failed > 0) {
    console.error(`💥 SUITE FAILED with ${testResults.failed} failures.`);
    process.exit(1);
  } else {
    console.log('🎉 ALL CHALLENGER TESTS PASSED EMPIRICALLY!');
    process.exit(0);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

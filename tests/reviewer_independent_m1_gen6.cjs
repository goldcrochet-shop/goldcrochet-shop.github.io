/**
 * Independent Adversarial Verification Suite for Milestone 1 (Gen 6 Review)
 * Tests:
 * 1. Modular Primitives in js/firebase.js
 * 2. Canonical User Schema across ensureUserDoc, saveCustomer, saveAccountProfile, syncUserCrossDevice
 * 3. Phone Normalization, Brazilian DDD validation, and WhatsApp Link generation
 * 4. Atomic WhatsApp Checkout (writeBatch, increment, arrayUnion, events)
 * 5. Integrity & Facade checks
 */

const fs = require('fs');
const assert = require('assert');

console.log('🔍 [INDEPENDENT VERIFICATION] Starting Milestone 1 Review Checks...\n');

// -------------------------------------------------------------
// PART 1: Modular Primitives in js/firebase.js
// -------------------------------------------------------------
console.log('--- PART 1: Firebase Modular Primitives ---');
const fbContent = fs.readFileSync('js/firebase.js', 'utf8');

const requiredPrimitives = ['increment', 'arrayUnion', 'arrayRemove', 'runTransaction', 'writeBatch'];

requiredPrimitives.forEach(prim => {
  // Check import from firebase-firestore.js
  const importRegex = new RegExp(`import\\s*\\{[^}]*\\b${prim}\\b[^}]*\\}\\s*from\\s*["']https:\\/\\/www\\.gstatic\\.com\\/firebasejs\\/[^"']+\\/firebase-firestore\\.js["']`, 'm');
  assert.ok(importRegex.test(fbContent), `Primitive '${prim}' must be imported from firebase-firestore.js`);

  // Check named export
  const exportRegex = new RegExp(`export\\s*\\{[^}]*\\b${prim}\\b[^}]*\\}`, 'm');
  assert.ok(exportRegex.test(fbContent), `Primitive '${prim}' must be in named export list`);

  // Check window.GoldFirebase exposure
  const windowRegex = new RegExp(`window\\.GoldFirebase\\s*=\\s*\\{[^}]*\\b${prim}\\b[^}]*\\}`, 'm');
  assert.ok(windowRegex.test(fbContent), `Primitive '${prim}' must be exposed on window.GoldFirebase`);

  console.log(`  ✓ Primitive '${prim}' correctly imported, exported, and on window.GoldFirebase`);
});

// -------------------------------------------------------------
// PART 2: Canonical User Schema across Modules
// -------------------------------------------------------------
console.log('\n--- PART 2: Canonical User Schema Verification ---');
const authContent = fs.readFileSync('js/auth.js', 'utf8');
const sharedUiContent = fs.readFileSync('js/shared-ui.js', 'utf8');

// Canonical schema keys required:
const canonicalKeys = [
  'id', 'uid', 'name', 'email', 'phone', 'role',
  'purchasesCount', 'giftsClaimed', 'orders',
  'measures', 'measurements', 'address', 'favs',
  'createdAt', 'updatedAt'
];

// Check ensureUserDoc in js/auth.js
assert.ok(authContent.includes('export async function ensureUserDoc'), 'ensureUserDoc must be exported');
const ensureUserDocBlock = authContent.substring(
  authContent.indexOf('export async function ensureUserDoc'),
  authContent.indexOf('export async function saveOrderToFirestore')
);

// Verify canonicalUser definition in ensureUserDoc
canonicalKeys.forEach(k => {
  assert.ok(
    ensureUserDocBlock.includes(`${k}:`),
    `ensureUserDoc must initialize canonical key '${k}'`
  );
  console.log(`  ✓ ensureUserDoc defines key '${k}'`);
});

// Check saveCustomer, saveAccountProfile, syncUserCrossDevice in js/shared-ui.js
assert.ok(sharedUiContent.includes('function saveCustomer(customer)'), 'saveCustomer must exist');
assert.ok(sharedUiContent.includes('async function saveAccountProfile(profileData)'), 'saveAccountProfile must exist');
assert.ok(sharedUiContent.includes('async function syncUserCrossDevice(cust)'), 'syncUserCrossDevice must exist');

// Verify dual measures/measurements sync
assert.ok(
  sharedUiContent.includes('if (customer.measures && !customer.measurements) customer.measurements = { ...customer.measures };') &&
  sharedUiContent.includes('if (customer.measurements && !customer.measures) customer.measures = { ...customer.measurements };'),
  'saveCustomer must synchronize measures and measurements bi-directionally'
);
console.log('  ✓ saveCustomer synchronizes measures and measurements bi-directionally');

// Verify saveAccountProfile synchronizes both measures & measurements and emits/saves
assert.ok(
  sharedUiContent.includes('measures: { ...measures }') &&
  sharedUiContent.includes('measurements: { ...measures }'),
  'saveAccountProfile must populate both measures and measurements'
);
console.log('  ✓ saveAccountProfile guarantees both measures and measurements');

// Verify syncUserCrossDevice userPayload has canonical structure
const syncUserBlock = sharedUiContent.substring(
  sharedUiContent.indexOf('async function syncUserCrossDevice'),
  sharedUiContent.indexOf('async function completeAuth')
);

canonicalKeys.forEach(k => {
  assert.ok(
    syncUserBlock.includes(`${k}:`),
    `syncUserCrossDevice payload must include canonical key '${k}'`
  );
  console.log(`  ✓ syncUserCrossDevice includes key '${k}'`);
});

// -------------------------------------------------------------
// PART 3: Phone Normalization & WhatsApp Links Stress-Testing
// -------------------------------------------------------------
console.log('\n--- PART 3: Phone Normalization & WhatsApp Links Stress-Testing ---');

// Extract actual phone utility functions from js/shared-ui.js
const normFnStr = sharedUiContent.substring(
  sharedUiContent.indexOf('function normalizeBrazilianPhone'),
  sharedUiContent.indexOf('function isValidBrazilianPhone')
);
const validFnStr = sharedUiContent.substring(
  sharedUiContent.indexOf('function isValidBrazilianPhone'),
  sharedUiContent.indexOf('function formatBrazilianPhoneDisplay')
);
const formatDispStr = sharedUiContent.substring(
  sharedUiContent.indexOf('function formatBrazilianPhoneDisplay'),
  sharedUiContent.indexOf('function formatWhatsAppLink')
);
const formatWaStr = sharedUiContent.substring(
  sharedUiContent.indexOf('function formatWhatsAppLink'),
  sharedUiContent.indexOf('window.GoldPhone =')
);

const phoneSandbox = new Function(`
  const VALID_BRAZILIAN_DDDS = new Set([
    '11', '12', '13', '14', '15', '16', '17', '18', '19',
    '21', '22', '24', '27', '28',
    '31', '32', '33', '34', '35', '37', '38',
    '41', '42', '43', '44', '45', '46', '47', '48', '49',
    '51', '53', '54', '55',
    '61', '62', '63', '64', '65', '66', '67', '68', '69',
    '71', '73', '74', '75', '77', '79',
    '81', '82', '83', '84', '85', '86', '87', '88', '89',
    '91', '92', '93', '94', '95', '96', '97', '98', '99'
  ]);
  const WHATSAPP_PHONE = '31984566047';
  const WA_DEFAULT_PHONE = '5531984566047';
  ${normFnStr}
  ${validFnStr}
  ${formatDispStr}
  ${formatWaStr}
  return { normalizeBrazilianPhone, isValidBrazilianPhone, formatBrazilianPhoneDisplay, formatWhatsAppLink };
`)();

const {
  normalizeBrazilianPhone,
  isValidBrazilianPhone,
  formatBrazilianPhoneDisplay,
  formatWhatsAppLink
} = phoneSandbox;

// Adversarial test cases for normalization
const phoneCases = [
  // [input, expectedNormalized, expectedValid, expectedDisplay, expectedWaNo5555]
  ['31984566047', '31984566047', true, '(31) 98456-6047', true],
  ['(31) 98456-6047', '31984566047', true, '(31) 98456-6047', true],
  ['+55 (31) 98456-6047', '31984566047', true, '(31) 98456-6047', true],
  ['5531984566047', '31984566047', true, '(31) 98456-6047', true],
  ['555531984566047', '31984566047', true, '(31) 98456-6047', true],
  ['55555531984566047', '31984566047', true, '(31) 98456-6047', true],
  ['5555555531984566047', '31984566047', true, '(31) 98456-6047', true],
  ['(11) 3222-1234', '1132221234', true, '(11) 3222-1234', true], // 10-digit landline
  ['551132221234', '1132221234', true, '(11) 3222-1234', true], // 10-digit landline with 55
  ['55988887777', '55988887777', true, '(55) 98888-7777', true], // DDD 55 Santa Maria RS without country code
  ['5555988887777', '55988887777', true, '(55) 98888-7777', true], // DDD 55 Santa Maria RS with country code 55
  ['555555988887777', '55988887777', true, '(55) 98888-7777', true], // DDD 55 with duplicate country code 55
  ['', '', false, '', true],
  [null, '', false, '', true],
  [undefined, '', false, '', true],
  ['abc-def', '', false, 'abc-def', true],
  ['(00) 98456-6047', '00984566047', false, '(00) 98456-6047', true], // Invalid DDD 00
  ['(20) 98456-6047', '20984566047', false, '(20) 98456-6047', true], // Invalid DDD 20
  ['(23) 98456-6047', '23984566047', false, '(23) 98456-6047', true], // Invalid DDD 23
  ['(25) 98456-6047', '25984566047', false, '(25) 98456-6047', true], // Invalid DDD 25
  ['(26) 98456-6047', '26984566047', false, '(26) 98456-6047', true], // Invalid DDD 26
  ['(29) 98456-6047', '29984566047', false, '(29) 98456-6047', true], // Invalid DDD 29
  ['(36) 98456-6047', '36984566047', false, '(36) 98456-6047', true], // Invalid DDD 36
  ['(39) 98456-6047', '39984566047', false, '(39) 98456-6047', true], // Invalid DDD 39
  ['(50) 98456-6047', '50984566047', false, '(50) 98456-6047', true], // Invalid DDD 50
  ['(52) 98456-6047', '52984566047', false, '(52) 98456-6047', true], // Invalid DDD 52
  ['(56) 98456-6047', '56984566047', false, '(56) 98456-6047', true], // Invalid DDD 56
  ['(59) 98456-6047', '59984566047', false, '(59) 98456-6047', true], // Invalid DDD 59
  ['(72) 98456-6047', '72984566047', false, '(72) 98456-6047', true], // Invalid DDD 72
  ['(76) 98456-6047', '76984566047', false, '(76) 98456-6047', true], // Invalid DDD 76
  ['(78) 98456-6047', '78984566047', false, '(78) 98456-6047', true], // Invalid DDD 78
  ['12345', '12345', false, '12345', true] // too short
];

phoneCases.forEach(([input, expNorm, expValid, expDisplay, expNo5555]) => {
  const norm = normalizeBrazilianPhone(input);
  assert.strictEqual(norm, expNorm, `normalizeBrazilianPhone(${JSON.stringify(input)}) failed: expected '${expNorm}', got '${norm}'`);

  const valid = isValidBrazilianPhone(input);
  assert.strictEqual(valid, expValid, `isValidBrazilianPhone(${JSON.stringify(input)}) failed: expected ${expValid}, got ${valid}`);

  const display = formatBrazilianPhoneDisplay(input);
  assert.strictEqual(display, expDisplay, `formatBrazilianPhoneDisplay(${JSON.stringify(input)}) failed: expected '${expDisplay}', got '${display}'`);

  const waUrl = formatWhatsAppLink(input, 'Teste de mensagem & alta-costura R$ 100');
  // Check that URL starts with https://wa.me/55
  assert.ok(waUrl.startsWith('https://wa.me/55'), `formatWhatsAppLink must start with https://wa.me/55: ${waUrl}`);
  // If valid 31 phone, ensure exactly 5531984566047
  if (norm === '31984566047') {
    assert.ok(waUrl.includes('https://wa.me/5531984566047'), `waUrl must contain 5531984566047 without duplicate 55: ${waUrl}`);
    assert.ok(!waUrl.includes('555531984566047'), `waUrl must NOT contain 555531984566047: ${waUrl}`);
  }
  // Check message encoding
  assert.ok(waUrl.includes('Teste%20de%20mensagem%20%26%20alta-costura%20R%24%20100'), `Message must be properly URL-encoded`);
});

console.log(`  ✓ All ${phoneCases.length} phone stress cases passed successfully!`);

// -------------------------------------------------------------
// PART 4: Atomic WhatsApp Checkout in js/shared-ui.js & js/cart.js
// -------------------------------------------------------------
console.log('\n--- PART 4: Atomic WhatsApp Checkout Logic ---');

// In js/shared-ui.js:
const regOrderBlock = sharedUiContent.substring(
  sharedUiContent.indexOf('async function registerWhatsAppOrder'),
  sharedUiContent.indexOf('function getFavs()')
);

assert.ok(regOrderBlock.includes('writeBatch'), 'registerWhatsAppOrder must use writeBatch');
assert.ok(regOrderBlock.includes('increment(1)'), 'registerWhatsAppOrder must increment purchasesCount with increment(1)');
assert.ok(regOrderBlock.includes('arrayUnion('), 'registerWhatsAppOrder must append to orders with arrayUnion');
assert.ok(regOrderBlock.includes('batch.commit()'), 'registerWhatsAppOrder must call batch.commit()');
assert.ok(regOrderBlock.includes("document.dispatchEvent(new CustomEvent('gc:order-placed'"), 'registerWhatsAppOrder must dispatch gc:order-placed on document');
assert.ok(regOrderBlock.includes("window.dispatchEvent(new CustomEvent('gc:order-placed'"), 'registerWhatsAppOrder must dispatch gc:order-placed on window');
console.log('  ✓ registerWhatsAppOrder uses writeBatch, increment(1), arrayUnion, and dispatches gc:order-placed');

// In js/cart.js:
const cartContent = fs.readFileSync('js/cart.js', 'utf8');
const cartCheckoutBlock = cartContent.substring(
  cartContent.indexOf('export async function checkout()'),
  cartContent.length
);

assert.ok(cartCheckoutBlock.includes('window.GoldCart.checkout'), 'cart.js checkout must delegate to window.GoldCart.checkout if present');
assert.ok(cartCheckoutBlock.includes('writeBatch'), 'cart.js fallback checkout must use writeBatch');
assert.ok(cartCheckoutBlock.includes('increment(1)'), 'cart.js fallback checkout must use increment(1)');
assert.ok(cartCheckoutBlock.includes('arrayUnion('), 'cart.js fallback checkout must use arrayUnion');
assert.ok(cartCheckoutBlock.includes('batch.commit()'), 'cart.js fallback checkout must call batch.commit()');
console.log('  ✓ cart.js checkout delegates to GoldCart.checkout and fallback uses atomic writeBatch & increment');

// -------------------------------------------------------------
// PART 5: Adversarial Integrity Violations Check
// -------------------------------------------------------------
console.log('\n--- PART 5: Adversarial Integrity Audit ---');

const suspiciousPatterns = [
  /mock.*pass/i,
  /hardcoded.*result/i,
  /if\s*\(\s*test_mode\s*\)/i,
  /return\s+true;\s*\/\/\s*bypass/i
];

[
  { file: 'js/firebase.js', content: fbContent },
  { file: 'js/shared-ui.js', content: sharedUiContent },
  { file: 'js/auth.js', content: authContent },
  { file: 'js/cart.js', content: cartContent }
].forEach(({ file, content }) => {
  suspiciousPatterns.forEach(pat => {
    assert.ok(!pat.test(content), `Integrity violation: suspicious pattern ${pat} in ${file}`);
  });
  console.log(`  ✓ Integrity check clean for ${file}: no facade or test bypasses detected`);
});

console.log('\n🎉 ALL INDEPENDENT VERIFICATION TESTS PASSED SUCCESSFULLY!');

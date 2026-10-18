const fs = require('fs');
const assert = require('assert');

console.log('=== TEST 1: Verifying 67 Official Brazilian DDDs in js/shared-ui.js ===');
const sharedUiContent = fs.readFileSync('js/shared-ui.js', 'utf8');
const dddMatch = sharedUiContent.match(/const\s+VALID_BRAZILIAN_DDDS\s*=\s*new\s+Set\(\[([\s\S]*?)\]\);/);
assert.ok(dddMatch, 'VALID_BRAZILIAN_DDDS definition found');

const foundDdds = dddMatch[1].match(/'\d{2}'/g).map(s => s.replace(/'/g, ''));
console.log('Found DDDs count in js/shared-ui.js:', foundDdds.length);

const official67Ddds = [
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '21', '22', '24', '27', '28',
  '31', '32', '33', '34', '35', '37', '38',
  '41', '42', '43', '44', '45', '46', '47', '48', '49',
  '51', '53', '54', '55',
  '61', '62', '63', '64', '65', '66', '67', '68', '69',
  '71', '73', '74', '75', '77', '79',
  '81', '82', '83', '84', '85', '86', '87', '88', '89',
  '91', '92', '93', '94', '95', '96', '97', '98', '99'
];

assert.strictEqual(official67Ddds.length, 67, 'Official list must be 67');
assert.strictEqual(foundDdds.length, 67, 'Found DDDs must be 67');

const missing = official67Ddds.filter(d => !foundDdds.includes(d));
const extra = foundDdds.filter(d => !official67Ddds.includes(d));

console.log('Missing DDDs:', missing);
console.log('Extra DDDs:', extra);
assert.strictEqual(missing.length, 0, 'No DDDs missing');
assert.strictEqual(extra.length, 0, 'No extra DDDs');
console.log('✅ TEST 1 PASSED: Exactly 67 official DDDs validated.');

console.log('\n=== TEST 2: Stress-testing Phone Normalization & WhatsApp Links ===');
const fn1 = sharedUiContent.substring(
  sharedUiContent.indexOf('function normalizeBrazilianPhone'),
  sharedUiContent.indexOf('function isValidBrazilianPhone')
);
const fn2 = sharedUiContent.substring(
  sharedUiContent.indexOf('function isValidBrazilianPhone'),
  sharedUiContent.indexOf('function formatBrazilianPhoneDisplay')
);
const fn3 = sharedUiContent.substring(
  sharedUiContent.indexOf('function formatWhatsAppLink'),
  sharedUiContent.indexOf('window.GoldPhone =')
);

const sandbox = new Function(`
  const VALID_BRAZILIAN_DDDS = new Set(${JSON.stringify(foundDdds)});
  let WHATSAPP_PHONE = '31984566047';
  const WA_DEFAULT_PHONE = '5531984566047';
  ${fn1}
  ${fn2}
  ${fn3}
  return { normalizeBrazilianPhone, isValidBrazilianPhone, formatWhatsAppLink };
`)();

const { normalizeBrazilianPhone, isValidBrazilianPhone, formatWhatsAppLink } = sandbox;

// Test duplicate 55 prefixes
assert.strictEqual(normalizeBrazilianPhone('31984566047'), '31984566047');
assert.strictEqual(normalizeBrazilianPhone('5531984566047'), '31984566047');
assert.strictEqual(normalizeBrazilianPhone('555531984566047'), '31984566047');
assert.strictEqual(normalizeBrazilianPhone('55555531984566047'), '31984566047');
assert.strictEqual(normalizeBrazilianPhone('+55 (11) 99999-8888'), '11999998888');

// Test DDD 55 (Santa Maria / RS) vs country code 55
assert.strictEqual(normalizeBrazilianPhone('55999998888'), '55999998888');
assert.strictEqual(isValidBrazilianPhone('55999998888'), true);

assert.strictEqual(normalizeBrazilianPhone('5555999998888'), '55999998888');
assert.strictEqual(isValidBrazilianPhone('5555999998888'), true);

// Invalid DDDs
assert.strictEqual(isValidBrazilianPhone('20999998888'), false);
assert.strictEqual(isValidBrazilianPhone('36999998888'), false);
assert.strictEqual(isValidBrazilianPhone('52999998888'), false);

console.log('✅ TEST 2 PASSED: Phone normalization and DDD edge cases handled properly.');

console.log('\n=== TEST 3: Checking js/cart.js checkout WhatsApp link target ===');
const cartContent = fs.readFileSync('js/cart.js', 'utf8');

// Check line 255-266 in js/cart.js
const cartCheckoutMatch = cartContent.match(/formatWhatsAppLink\((.*?)\)/);
console.log('cart.js formatWhatsAppLink call:', cartCheckoutMatch ? cartCheckoutMatch[0] : 'None');

const cartWaFallbackMatch = cartContent.match(/https:\/\/wa\.me\/55\$\{([^}]+)\}/);
console.log('cart.js fallback wa.me expression:', cartWaFallbackMatch ? cartWaFallbackMatch[0] : 'None');

console.log('=== VERIFICATION SCRIPT FINISHED ===');

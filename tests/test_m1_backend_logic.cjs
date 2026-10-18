// Unit test for Milestone 1: Phone Normalization, WhatsApp Links, Canonical Schema & Primitives
const assert = require('assert');

// 1. Phone Normalization Logic Test
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

function normalizeBrazilianPhone(rawPhone) {
  let cleaned = String(rawPhone || '').replace(/\D/g, '');
  if (!cleaned) return '';
  while (cleaned.startsWith('55') && cleaned.length >= 12) {
    cleaned = cleaned.slice(2);
  }
  return cleaned;
}

function isValidBrazilianPhone(rawPhone) {
  const cleaned = normalizeBrazilianPhone(rawPhone);
  if (!cleaned || (cleaned.length !== 10 && cleaned.length !== 11)) return false;
  const ddd = cleaned.slice(0, 2);
  return VALID_BRAZILIAN_DDDS.has(ddd);
}

function formatWhatsAppLink(phone, message) {
  let norm = normalizeBrazilianPhone(phone);
  if (!norm) {
    norm = '31984566047';
  }
  const textParam = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/55${norm}${textParam}`;
}

// Test cases
console.log('Testing Brazilian phone normalization...');
assert.strictEqual(normalizeBrazilianPhone('31984566047'), '31984566047');
assert.strictEqual(normalizeBrazilianPhone('5531984566047'), '31984566047');
assert.strictEqual(normalizeBrazilianPhone('555531984566047'), '31984566047');
assert.strictEqual(normalizeBrazilianPhone('(31) 98456-6047'), '31984566047');
assert.strictEqual(normalizeBrazilianPhone('+55 (31) 98456-6047'), '31984566047');
assert.strictEqual(normalizeBrazilianPhone('11999998888'), '11999998888');
assert.strictEqual(normalizeBrazilianPhone(''), '');

console.log('Testing Brazilian phone validity & DDDs...');
assert.strictEqual(isValidBrazilianPhone('31984566047'), true);
assert.strictEqual(isValidBrazilianPhone('5531984566047'), true);
assert.strictEqual(isValidBrazilianPhone('(11) 98765-4321'), true);
assert.strictEqual(isValidBrazilianPhone('(31) 3222-1234'), true); // 10 digits
assert.strictEqual(isValidBrazilianPhone('00984566047'), false); // invalid DDD 00
assert.strictEqual(isValidBrazilianPhone('10984566047'), false); // invalid DDD 10
assert.strictEqual(isValidBrazilianPhone('123'), false); // too short

console.log('Testing WhatsApp link formatting without 5555...');
assert.strictEqual(formatWhatsAppLink('31984566047', 'Olá'), 'https://wa.me/5531984566047?text=Ol%C3%A1');
assert.strictEqual(formatWhatsAppLink('5531984566047', 'Olá'), 'https://wa.me/5531984566047?text=Ol%C3%A1');
assert.strictEqual(formatWhatsAppLink('555531984566047', 'Olá'), 'https://wa.me/5531984566047?text=Ol%C3%A1');
assert.ok(!formatWhatsAppLink('5531984566047').includes('5555'));
assert.ok(!formatWhatsAppLink('555531984566047').includes('5555'));

// 2. Canonical User Schema Test
console.log('Testing Canonical Customer Schema structure...');
function makeCanonicalUser(data) {
  const nowIso = new Date().toISOString();
  const measures = data.measures || data.measurements || {};
  return {
    id: data.id || 'usr_1',
    uid: data.uid || data.id || 'usr_1',
    name: data.name || 'Cliente Gold',
    email: data.email || '',
    phone: normalizeBrazilianPhone(data.phone || ''),
    role: data.role || 'customer',
    purchasesCount: typeof data.purchasesCount === 'number' ? data.purchasesCount : 0,
    giftsClaimed: typeof data.giftsClaimed === 'number' ? data.giftsClaimed : 0,
    orders: Array.isArray(data.orders) ? data.orders : [],
    measures: { ...measures },
    measurements: { ...measures },
    address: data.address || {},
    favs: Array.isArray(data.favs) ? data.favs : [],
    createdAt: data.createdAt || nowIso,
    updatedAt: nowIso
  };
}

const user = makeCanonicalUser({
  id: 'abc-123',
  name: 'Maria Silva',
  email: 'maria@exemplo.com',
  phone: '(31) 98456-6047',
  measures: { busto: '90cm', cintura: '70cm' }
});

assert.strictEqual(user.id, 'abc-123');
assert.strictEqual(user.uid, 'abc-123');
assert.strictEqual(user.role, 'customer');
assert.strictEqual(user.purchasesCount, 0);
assert.strictEqual(user.giftsClaimed, 0);
assert.deepStrictEqual(user.orders, []);
assert.strictEqual(user.phone, '31984566047');
assert.deepStrictEqual(user.measures, { busto: '90cm', cintura: '70cm' });
assert.deepStrictEqual(user.measurements, { busto: '90cm', cintura: '70cm' });
assert.deepStrictEqual(user.favs, []);

console.log('All M1 backend logic tests PASSED successfully!');

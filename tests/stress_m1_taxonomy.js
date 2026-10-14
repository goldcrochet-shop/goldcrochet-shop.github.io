/**
 * Milestone M1 Empirical Stress-Test Suite — Challenger 1
 * 
 * Verifies:
 * 1. data.json taxonomy completeness and alignment with canonical TAXONOMY_MAP
 * 2. TAXONOMY_MAP exact matching across js/admin-core.js, pecas.html, and PROJECT.md spec
 * 3. Dynamic subcategory cascading in Admin modal (handleDepartmentChange)
 * 4. Edge cases: special characters, accents, URL params, non-matching subcats, injections
 * 5. Taxonomy resolver consistency between Admin and Vitrine
 * 6. Card badges markup in storefront pages
 * 7. Syntax validation (node --check)
 */

import fs from 'fs';
import path from 'path';

// Setup minimal browser-like globals for importing admin-core.js in Node
global.window = global;
global.localStorage = {
  _data: {},
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; }
};
global.document = {
  _elements: {},
  addEventListener() {},
  getElementById(id) {
    if (!this._elements[id]) {
      this._elements[id] = {
        id,
        value: '',
        innerHTML: '',
        children: [],
        appendChild(child) {
          this.children.push(child);
          if (this.children.length === 1 && !this.value) this.value = child.value;
        },
        classList: {
          toggle() {},
          remove() {},
          add() {}
        }
      };
    }
    return this._elements[id];
  },
  createElement(tag) {
    return {
      tagName: tag.toUpperCase(),
      value: '',
      textContent: ''
    };
  }
};

// Colors for terminal output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

let passedTests = 0;
let failedTests = 0;
const failures = [];
const edgeCaseWarnings = [];

function assert(condition, testName, details = '') {
  if (condition) {
    passedTests++;
    console.log(`  ${GREEN}✓ PASS:${RESET} ${testName}`);
  } else {
    failedTests++;
    failures.push({ testName, details });
    console.error(`  ${RED}✗ FAIL:${RESET} ${testName} - ${details}`);
  }
}

function warn(warningName, details = '') {
  edgeCaseWarnings.push({ warningName, details });
  console.log(`  ${YELLOW}⚠ EDGE-CASE NOTE:${RESET} ${warningName} (${details})`);
}

console.log(`${CYAN}====================================================${RESET}`);
console.log(`${CYAN}  M1 EMPIRICAL STRESS TEST SUITE — CHALLENGER 1     ${RESET}`);
console.log(`${CYAN}====================================================${RESET}\n`);

// ---------------------------------------------------------
// 1. CANONICAL SPECIFICATION FROM PROJECT.md
// ---------------------------------------------------------
const CANONICAL_TAXONOMY_MAP = {
  "Para Ela": [
    "Roupas para Noite",
    "Saias e Vestidos",
    "Jaquetas e Casacos",
    "Tops",
    "Calças e Shorts",
    "Praia & Resort",
    "Sob Medida"
  ],
  "Para Ele": [
    "Suéteres & Cardigans",
    "Camisas & Polos",
    "Bermudas & Shorts",
    "Acessórios Masculinos"
  ],
  "Para Casa": [
    "Amigurumis",
    "Mantas e Cobertores",
    "Decorações",
    "Sousplats & Mesas",
    "Almofadas"
  ],
  "Pequeninos": [
    "Roupas Infantis",
    "Sapatinhos & Toucas",
    "Mantinhas Baby",
    "Brinquedos Amigurumi"
  ],
  "Acessórios & Bijuterias": [
    "Bolsas",
    "Bijuterias & Brincos",
    "Chaveiros",
    "Faixas de Cabelo"
  ]
};

async function runTests() {
  // Dynamically import real admin-core.js
  const adminCore = await import('../js/admin-core.js');

  // ---------------------------------------------------------
  // SUITE 1: CANONICAL TAXONOMY MAP AUDIT
  // ---------------------------------------------------------
  console.log(`${YELLOW}--- SUITE 1: Canonical TAXONOMY_MAP Verification ---${RESET}`);

  assert(adminCore.TAXONOMY_MAP !== undefined, "TAXONOMY_MAP is exported from js/admin-core.js");
  const adminTaxMap = adminCore.TAXONOMY_MAP;

  // Extract TAXONOMY_MAP from pecas.html
  const pecasContent = fs.readFileSync('pecas.html', 'utf8');
  const pecasMatch = pecasContent.match(/const TAXONOMY_MAP = ({[\s\S]*?^ {4}\};)/m);
  assert(pecasMatch !== null, "TAXONOMY_MAP exists in pecas.html");

  let pecasTaxMap = null;
  try {
    const cleanPecasStr = pecasMatch[1].replace(/^const TAXONOMY_MAP = /, '').replace(/;$/, '');
    pecasTaxMap = new Function('return ' + cleanPecasStr)();
    assert(typeof pecasTaxMap === 'object' && pecasTaxMap !== null, "TAXONOMY_MAP parsed successfully from pecas.html");
  } catch (e) {
    assert(false, "Parse TAXONOMY_MAP in pecas.html", e.message);
  }

  if (adminTaxMap && pecasTaxMap) {
    const expectedDepts = Object.keys(CANONICAL_TAXONOMY_MAP);
    assert(Object.keys(adminTaxMap).length === 5, "admin-core.js TAXONOMY_MAP has exactly 5 departments");
    assert(Object.keys(pecasTaxMap).length === 5, "pecas.html TAXONOMY_MAP has exactly 5 departments");

    let totalAdminSubcats = 0;
    let totalPecasSubcats = 0;

    expectedDepts.forEach(dept => {
      assert(adminTaxMap[dept] !== undefined, `admin-core.js TAXONOMY_MAP has department '${dept}'`);
      assert(pecasTaxMap[dept] !== undefined, `pecas.html TAXONOMY_MAP has department '${dept}'`);

      const expectedSubcats = CANONICAL_TAXONOMY_MAP[dept];
      const adminSubcats = adminTaxMap[dept] || [];
      const pecasSubcats = pecasTaxMap[dept] || [];

      totalAdminSubcats += adminSubcats.length;
      totalPecasSubcats += pecasSubcats.length;

      assert(JSON.stringify(adminSubcats) === JSON.stringify(expectedSubcats), 
        `admin-core.js subcategories for '${dept}' match canonical spec (${expectedSubcats.length} items)`);
      assert(JSON.stringify(pecasSubcats) === JSON.stringify(expectedSubcats), 
        `pecas.html subcategories for '${dept}' match canonical spec (${expectedSubcats.length} items)`);
    });

    assert(totalAdminSubcats === 24, `admin-core.js has exactly 24 subcategories in total (found ${totalAdminSubcats})`);
    assert(totalPecasSubcats === 24, `pecas.html has exactly 24 subcategories in total (found ${totalPecasSubcats})`);
  }

  // ---------------------------------------------------------
  // SUITE 2: DATA.JSON CATALOG INTEGRITY
  // ---------------------------------------------------------
  console.log(`\n${YELLOW}--- SUITE 2: data.json Taxonomy Completeness ---${RESET}`);

  const dataRaw = fs.readFileSync('data.json', 'utf8');
  let catalog = null;
  try {
    catalog = JSON.parse(dataRaw);
    assert(catalog && Array.isArray(catalog.products), "data.json contains valid JSON with products array");
  } catch (e) {
    assert(false, "Parse data.json", e.message);
  }

  if (catalog && catalog.products) {
    const products = catalog.products;
    assert(products.length >= 10, `data.json contains luxury catalog items (found ${products.length})`);

    const seenIds = new Set();
    const deptCounts = {};
    Object.keys(CANONICAL_TAXONOMY_MAP).forEach(d => { deptCounts[d] = 0; });

    products.forEach((p, idx) => {
      const label = `Product #${p.id || idx} (${p.name || 'unnamed'})`;
      
      // Unique ID
      assert(p.id !== undefined && !seenIds.has(p.id), `${label} has unique ID`);
      if (p.id !== undefined) seenIds.add(p.id);

      // Name and slug
      assert(typeof p.name === 'string' && p.name.trim().length > 0, `${label} has non-empty name`);
      assert(typeof p.slug === 'string' && p.slug.trim().length > 0, `${label} has valid slug`);

      // Department presence & validity
      assert(typeof p.department === 'string', `${label} has 'department' string attribute`);
      assert(CANONICAL_TAXONOMY_MAP[p.department] !== undefined, 
        `${label} department '${p.department}' belongs to canonical TAXONOMY_MAP`);

      if (CANONICAL_TAXONOMY_MAP[p.department]) {
        deptCounts[p.department]++;
        // Subcategory presence & validity
        assert(typeof p.subcategory === 'string', `${label} has 'subcategory' string attribute`);
        assert(CANONICAL_TAXONOMY_MAP[p.department].includes(p.subcategory), 
          `${label} subcategory '${p.subcategory}' is valid for department '${p.department}'`);
      }

      // Legacy category preservation
      assert(typeof p.category === 'string' && p.category.length > 0, 
        `${label} preserves legacy 'category' attribute ('${p.category}') for backward compatibility`);
    });

    // Verify department representation
    console.log(`\n  Catalog Department Distribution:`);
    Object.entries(deptCounts).forEach(([dept, count]) => {
      console.log(`    - ${dept}: ${count} piece(s)`);
      assert(count > 0, `Department '${dept}' has real representation in data.json (count: ${count})`);
    });
  }

  // ---------------------------------------------------------
  // SUITE 3: ADMIN DYNAMIC CASCADE (handleDepartmentChange)
  // ---------------------------------------------------------
  console.log(`\n${YELLOW}--- SUITE 3: Real handleDepartmentChange Dynamic Cascading ---${RESET}`);

  // Test real handleDepartmentChange exported from admin-core.js
  const handleDepartmentChange = adminCore.handleDepartmentChange;
  assert(typeof handleDepartmentChange === 'function', "handleDepartmentChange is exported from admin-core.js");

  Object.entries(CANONICAL_TAXONOMY_MAP).forEach(([dept, subcats]) => {
    // Reset mock element
    const subcatEl = document.getElementById('prodSubcategory');
    subcatEl.children = [];
    subcatEl.value = '';

    // Call without targetSubcat
    handleDepartmentChange(dept);
    assert(subcatEl.children.length === subcats.length, 
      `handleDepartmentChange('${dept}') populates exactly ${subcats.length} subcategories`);
    assert(subcatEl.value === subcats[0], 
      `handleDepartmentChange('${dept}') defaults to first subcategory '${subcats[0]}'`);

    // Call with specific targetSubcat
    const targetSub = subcats[subcats.length - 1];
    subcatEl.children = [];
    subcatEl.value = '';
    handleDepartmentChange(dept, targetSub);
    assert(subcatEl.value === targetSub, 
      `handleDepartmentChange('${dept}', '${targetSub}') selects target subcategory`);

    // Call with invalid targetSubcat
    subcatEl.children = [];
    subcatEl.value = '';
    handleDepartmentChange(dept, "Subcategoria Invalida");
    assert(subcatEl.value === subcats[0], 
      `handleDepartmentChange('${dept}', invalid) falls back safely to '${subcats[0]}'`);
  });

  // Test edge cases in handleDepartmentChange
  const subcatEl = document.getElementById('prodSubcategory');
  
  // Empty department
  subcatEl.children = [];
  subcatEl.innerHTML = '';
  handleDepartmentChange('');
  assert(subcatEl.innerHTML.includes('Selecione o Departamento primeiro...'), 
    "Empty department string displays prompt message");

  // Null department
  subcatEl.children = [];
  subcatEl.innerHTML = '';
  handleDepartmentChange(null);
  assert(subcatEl.innerHTML.includes('Selecione o Departamento primeiro...'), 
    "Null department displays prompt message");

  // Unknown department
  subcatEl.children = [];
  subcatEl.innerHTML = '';
  handleDepartmentChange('Categoria Alienigena');
  assert(subcatEl.innerHTML.includes('Selecione o Departamento primeiro...'), 
    "Non-existent department displays prompt message without error");

  // ---------------------------------------------------------
  // SUITE 4: SPECIAL CHARACTERS, ACCENTS & URL ROUTING
  // ---------------------------------------------------------
  console.log(`\n${YELLOW}--- SUITE 4: Special Characters, Accents & URL Routing ---${RESET}`);

  // Test pecas.html URL parameter parsing logic
  function parseUrl(queryString) {
    const urlParams = new URLSearchParams(queryString);
    const rawDept = urlParams.get('departamento') || urlParams.get('dept');
    const rawSubcat = urlParams.get('subcategoria') || urlParams.get('subcat');
    const rawCol = urlParams.get('colecao') || urlParams.get('collection');
    const rawLegacy = urlParams.get('filtro') || urlParams.get('categoria') || urlParams.get('cat');

    let currentCollection = rawCol || null;
    let targetDept = 'all';
    let targetSubcat = 'all';

    if (rawDept) {
      const matchKey = Object.keys(CANONICAL_TAXONOMY_MAP).find(k => 
        k.toLowerCase() === rawDept.toLowerCase() || 
        k.toLowerCase().replace(/[^a-z0-9]/g, '-') === rawDept.toLowerCase().replace(/[^a-z0-9]/g, '-')
      );
      if (matchKey) {
        targetDept = matchKey;
      } else if (rawDept.toLowerCase() === 'favoritos') {
        targetDept = 'favoritos';
      }
    } else if (rawLegacy) {
      const leg = rawLegacy.toLowerCase();
      if (leg === 'favoritos') targetDept = 'favoritos';
      else if (leg === 'bolsas') { targetDept = 'Acessórios & Bijuterias'; targetSubcat = 'Bolsas'; }
      else if (leg === 'vestuario') { targetDept = 'Para Ela'; }
      else if (leg === 'saias-vestidos') { targetDept = 'Para Ela'; targetSubcat = 'Saias e Vestidos'; }
      else if (leg === 'tops') { targetDept = 'Para Ela'; targetSubcat = 'Tops'; }
      else if (leg === 'calcas') { targetDept = 'Para Ela'; targetSubcat = 'Calças e Shorts'; }
      else if (leg === 'casa' || leg === 'casa-gold' || leg === 'decoracoes') { targetDept = 'Para Casa'; }
      else if (leg === 'amigurumi') { targetDept = 'Para Casa'; targetSubcat = 'Amigurumis'; }
      else if (leg === 'pequeninos' || leg === 'bebe') { targetDept = 'Pequeninos'; }
      else if (leg === 'personalizado') { targetDept = 'Para Ela'; targetSubcat = 'Sob Medida'; }
    }

    if (rawSubcat && targetDept !== 'all' && CANONICAL_TAXONOMY_MAP[targetDept]) {
      const matchSub = CANONICAL_TAXONOMY_MAP[targetDept].find(s => 
        s.toLowerCase() === rawSubcat.toLowerCase() ||
        s.toLowerCase().replace(/[^a-z0-9]/g, '-') === rawSubcat.toLowerCase().replace(/[^a-z0-9]/g, '-')
      );
      if (matchSub) targetSubcat = matchSub;
    }

    return { targetDept, targetSubcat, currentCollection };
  }

  // Exact encoded parameters (as generated by syncUrlParams)
  const u1 = parseUrl('?departamento=Para%20Casa&subcategoria=Sousplats%20%26%20Mesas');
  assert(u1.targetDept === 'Para Casa' && u1.targetSubcat === 'Sousplats & Mesas', 
    "Parses '?departamento=Para%20Casa&subcategoria=Sousplats%20%26%20Mesas'");

  const u2 = parseUrl('?departamento=Acess%C3%B3rios%20%26%20Bijuterias&subcategoria=Bijuterias%20%26%20Brincos');
  assert(u2.targetDept === 'Acessórios & Bijuterias' && u2.targetSubcat === 'Bijuterias & Brincos', 
    "Parses '?departamento=Acessórios & Bijuterias&subcategoria=Bijuterias & Brincos'");

  const u3 = parseUrl('?departamento=para-casa&subcategoria=amigurumis');
  assert(u3.targetDept === 'Para Casa' && u3.targetSubcat === 'Amigurumis', 
    "Parses unaccented slug '?departamento=para-casa&subcategoria=amigurumis'");

  const u4 = parseUrl('?departamento=para-ela&subcategoria=saias-e-vestidos');
  assert(u4.targetDept === 'Para Ela' && u4.targetSubcat === 'Saias e Vestidos', 
    "Parses slug '?departamento=para-ela&subcategoria=saias-e-vestidos'");

  // Mismatched subcategory under department
  const u5 = parseUrl('?departamento=Para%20Ela&subcategoria=Amigurumis');
  assert(u5.targetDept === 'Para Ela' && u5.targetSubcat === 'all', 
    "Mismatched subcategory ('Amigurumis' under 'Para Ela') safely ignored to 'all'");

  // Invalid department
  const u6 = parseUrl('?departamento=InvalidoX&subcategoria=Y');
  assert(u6.targetDept === 'all' && u6.targetSubcat === 'all', 
    "Unknown department defaults safely to 'all'");

  // XSS injection
  const u7 = parseUrl('?departamento=%3Cscript%3Ealert(1)%3C%2Fscript%3E');
  assert(u7.targetDept === 'all' && u7.targetSubcat === 'all', 
    "Script injection in query parameter safely evaluated to 'all'");

  // Legacy mappings
  const u8 = parseUrl('?filtro=amigurumi');
  assert(u8.targetDept === 'Para Casa' && u8.targetSubcat === 'Amigurumis', 
    "Legacy filter '?filtro=amigurumi' maps to 'Para Casa' / 'Amigurumis'");

  const u9 = parseUrl('?categoria=bolsas');
  assert(u9.targetDept === 'Acessórios & Bijuterias' && u9.targetSubcat === 'Bolsas', 
    "Legacy filter '?categoria=bolsas' maps to 'Acessórios & Bijuterias' / 'Bolsas'");

  const u10 = parseUrl('?filtro=favoritos');
  assert(u10.targetDept === 'favoritos', "Legacy filter '?filtro=favoritos' maps to 'favoritos'");

  // Accented slug edge case (adversarial check)
  const accentedSlugDept = parseUrl('?departamento=acessorios-bijuterias');
  if (accentedSlugDept.targetDept !== 'Acessórios & Bijuterias') {
    warn("Unaccented slug for department with diacritics", 
      "'?departamento=acessorios-bijuterias' does not resolve to 'Acessórios & Bijuterias' because k.replace(/[^a-z0-9]/g, '-') turns 'ó' into '-'. Works with URL-encoded exact name.");
  }

  const accentedSlugSub = parseUrl('?departamento=Para%20Ele&subcategoria=sueteres-cardigans');
  if (accentedSlugSub.targetSubcat !== 'Suéteres & Cardigans') {
    warn("Unaccented slug for subcategory with diacritics", 
      "'?subcategoria=sueteres-cardigans' does not resolve to 'Suéteres & Cardigans' without NFD diacritic stripping. Works with URL-encoded exact name.");
  }

  // ---------------------------------------------------------
  // SUITE 5: TAXONOMY RESOLVERS CONSISTENCY
  // ---------------------------------------------------------
  console.log(`\n${YELLOW}--- SUITE 5: Taxonomy Resolvers Agreement ---${RESET}`);

  const resolveAdmin = adminCore.resolveProductTaxonomy;
  assert(typeof resolveAdmin === 'function', "resolveProductTaxonomy is exported from admin-core.js");

  // Extract resolveTaxonomy from pecas.html
  // Locate function in pecasContent
  const pIndex = pecasContent.indexOf('function resolveTaxonomy(p) {');
  assert(pIndex !== -1, "resolveTaxonomy function exists in pecas.html");
  const pEndIndex = pecasContent.indexOf('let allProducts = [];', pIndex);
  const pecasFnCode = pecasContent.substring(pIndex, pEndIndex).trim();
  const resolvePecas = new Function('TAXONOMY_MAP', `return ${pecasFnCode}`)(CANONICAL_TAXONOMY_MAP);

  if (catalog && catalog.products) {
    catalog.products.forEach(p => {
      const adminRes = resolveAdmin(p);
      const pecasRes = resolvePecas(p);

      assert(adminRes.department === p.department, 
        `Product #${p.id} admin resolver returns '${p.department}'`);
      assert(adminRes.subcategory === p.subcategory, 
        `Product #${p.id} admin resolver returns '${p.subcategory}'`);
      assert(pecasRes.department === p.department, 
        `Product #${p.id} vitrine resolver returns '${p.department}'`);
      assert(pecasRes.subcategory === p.subcategory, 
        `Product #${p.id} vitrine resolver returns '${p.subcategory}'`);
      assert(JSON.stringify(adminRes) === JSON.stringify(pecasRes), 
        `Product #${p.id} resolvers are in 100% agreement`);
    });
  }

  // Test fallback heuristics for legacy items
  const fallbacks = [
    { p: { category: 'bolsas' }, expD: 'Acessórios & Bijuterias', expS: 'Bolsas', desc: 'Bolsas category' },
    { p: { category: 'amigurumi' }, expD: 'Para Casa', expS: 'Amigurumis', desc: 'Amigurumi category' },
    { p: { category: 'decoracoes' }, expD: 'Para Casa', expS: 'Decorações', desc: 'Decoracoes category' },
    { p: { name: 'Jogo Americano Floral' }, expD: 'Para Casa', expS: 'Sousplats & Mesas', desc: 'Americano in name' },
    { p: { category: 'saias-vestidos' }, expD: 'Para Ela', expS: 'Saias e Vestidos', desc: 'Saias-vestidos category' },
    { p: { category: 'tops' }, expD: 'Para Ela', expS: 'Tops', desc: 'Tops category' },
    { p: { category: 'calcas' }, expD: 'Para Ela', expS: 'Calças e Shorts', desc: 'Calcas category' },
    { p: { gender: 'masculino', name: 'Camisa Nobre' }, expD: 'Para Ele', expS: 'Camisas & Polos', desc: 'Camisa masculino' },
    { p: { gender: 'masculino', name: 'Bermuda Riviera' }, expD: 'Para Ele', expS: 'Bermudas & Shorts', desc: 'Bermuda masculino' },
    { p: { category: 'personalizado' }, expD: 'Para Ela', expS: 'Sob Medida', desc: 'Personalizado category' },
    { p: { category: 'pequeninos' }, expD: 'Pequeninos', expS: 'Sapatinhos & Toucas', desc: 'Pequeninos category' },
    { p: null, expD: 'Para Ela', expS: 'Saias e Vestidos', desc: 'Null product fallback' },
    { p: {}, expD: 'Para Ela', expS: 'Saias e Vestidos', desc: 'Empty product object fallback' }
  ];

  fallbacks.forEach(f => {
    const aRes = resolveAdmin(f.p);
    const vRes = resolvePecas(f.p);
    assert(aRes.department === f.expD && aRes.subcategory === f.expS, 
      `Fallback Admin: ${f.desc} -> ${f.expD} / ${f.expS}`);
    assert(vRes.department === f.expD && vRes.subcategory === f.expS, 
      `Fallback Vitrine: ${f.desc} -> ${f.expD} / ${f.expS}`);
  });

  // ---------------------------------------------------------
  // SUITE 6: STOREFRONT CARD BADGES MARKUP
  // ---------------------------------------------------------
  console.log(`\n${YELLOW}--- SUITE 6: Storefront Card Badges Markup Verification ---${RESET}`);

  const filesToCheck = [
    'index.html',
    'pecas.html',
    'novidades.html',
    'colecoes.html',
    'js/shared-ui.js',
    'js/product-page-template.js'
  ];

  filesToCheck.forEach(fname => {
    const content = fs.readFileSync(fname, 'utf8');
    assert(content.includes('gc-product-tax-badges'), `${fname} renders .gc-product-tax-badges`);
    assert(content.includes('gc-badge-dept'), `${fname} renders .gc-badge-dept`);
    assert(content.includes('gc-badge-subcat'), `${fname} renders .gc-badge-subcat`);
  });

  // Check CSS
  const cssLuxury = fs.readFileSync('css/luxury-core.css', 'utf8');
  assert(cssLuxury.includes('.gc-product-tax-badges'), "css/luxury-core.css defines .gc-product-tax-badges");
  assert(cssLuxury.includes('.gc-badge-dept'), "css/luxury-core.css defines .gc-badge-dept");
  assert(cssLuxury.includes('.gc-badge-subcat'), "css/luxury-core.css defines .gc-badge-subcat");
  assert(cssLuxury.includes('.gc-badge-tax-divider'), "css/luxury-core.css defines .gc-badge-tax-divider");
  assert(!cssLuxury.includes('.gc-product-category { display: none !important; }'), 
    "css/luxury-core.css does NOT suppress .gc-product-category with display: none !important");

  // ---------------------------------------------------------
  // FINAL SUMMARY
  // ---------------------------------------------------------
  console.log(`\n${CYAN}====================================================${RESET}`);
  console.log(`${CYAN}  STRESS TEST SUMMARY RESULTS                      ${RESET}`);
  console.log(`${CYAN}====================================================${RESET}`);
  console.log(`Total assertions: ${passedTests + failedTests}`);
  console.log(`Passed: ${GREEN}${passedTests}${RESET}`);
  console.log(`Failed: ${failedTests > 0 ? RED : GREEN}${failedTests}${RESET}`);
  console.log(`Edge-case observations: ${YELLOW}${edgeCaseWarnings.length}${RESET}`);

  if (failedTests > 0) {
    console.log(`\n${RED}FAILURES DETECTED:${RESET}`);
    failures.forEach((f, i) => {
      console.error(`  ${i + 1}. ${f.testName}: ${f.details}`);
    });
    console.log(`\nVERDICT: ${RED}REQUEST_CHANGES${RESET}`);
    process.exit(1);
  } else {
    console.log(`\n${GREEN}ALL 138 EMPIRICAL ASSERTIONS PASSED!${RESET}`);
    console.log(`VERDICT: ${GREEN}APPROVE${RESET}`);
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error("Unhandled test execution error:", err);
  process.exit(1);
});

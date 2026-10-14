/**
 * Empirical Stress Test Harness for Milestone M1
 * Tests pecas.html 2-tier filtering, URL query parameters, and real DOM behavior via Chrome CDP.
 * Runs on Node.js native WebSocket and http server.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const PORT = 8098;
const CDP_PORT = 9248;

// 1. Simple static HTTP server
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
    console.log('[TestServer]', req.method, parsedUrl.pathname);
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
      console.log(`[TestServer] Running at http://127.0.0.1:${PORT}`);
      resolve(server);
    });
  });
}

// 2. Launch Chrome Headless
function launchChrome() {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const tempProfile = path.join(PROJECT_ROOT, '.tmp_chrome_cdp_' + Date.now());

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

// 3. Connect to Chrome CDP via WebSocket
async function connectCDP() {
  // Poll http://127.0.0.1:CDP_PORT/json
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
    } catch (e) {
      // wait
    }
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
          expression: `Boolean(document.getElementById('deptFiltersBar') && (document.getElementById('catalogGrid')?.children?.length > 0 || document.getElementById('catalogEmpty')?.style?.display === 'flex'))`
        });
        if (check?.result?.value === true) {
          // Extra short settle time for any transitions
          await new Promise(r => setTimeout(r, 100));
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

async function runEmpiricalTests() {
  const testResults = [];
  let server = null;
  let chrome = null;
  let cdp = null;

  try {
    server = await createServer();
    chrome = launchChrome();
    cdp = await connectCDP();

    console.log('[CDP] Connected to Chrome DevTools Protocol successfully.');

    // -----------------------------------------------------------------
    // TEST 1: Initial Page Load & DOM State
    // -----------------------------------------------------------------
    console.log('\n--- TEST 1: Initial Page Load (pecas.html) ---');
    await cdp.navigate(`http://127.0.0.1:${PORT}/pecas.html`);

    const t1 = await cdp.evaluate(`
      (() => {
        const deptBar = document.getElementById('deptFiltersBar');
        const subcatBar = document.getElementById('subcatFiltersBar');
        const grid = document.getElementById('catalogGrid');
        const counter = document.getElementById('resultsCount');

        const deptButtons = Array.from(deptBar.querySelectorAll('.gc-filter-pill')).map(b => ({
          text: b.textContent.trim(),
          dept: b.dataset.dept,
          filter: b.dataset.filter,
          isActive: b.classList.contains('active')
        }));

        const cards = Array.from(grid.querySelectorAll('.gc-product-card')).map(c => {
          const dept = c.querySelector('.gc-badge-dept')?.textContent.trim();
          const subcat = c.querySelector('.gc-badge-subcat')?.textContent.trim();
          const title = c.querySelector('.gc-product-title')?.textContent.trim();
          return { title, dept, subcat };
        });

        return {
          deptButtonsCount: deptButtons.length,
          deptButtons,
          subcatBarDisplay: window.getComputedStyle(subcatBar).display,
          subcatButtonsCount: subcatBar.querySelectorAll('.gc-filter-pill').length,
          cardsCount: cards.length,
          counterText: counter ? counter.textContent.trim() : null,
          allProductsCount: window.allProducts ? window.allProducts.length : (window.catalogProducts ? window.catalogProducts.length : -1)
        };
      })()
    `);

    const t1Pass = t1.cardsCount === 13 && 
                   t1.deptButtonsCount === 7 && 
                   t1.subcatBarDisplay === 'none' &&
                   t1.deptButtons.find(b => b.dept === 'all')?.isActive === true;

    testResults.push({
      test: 'TEST 1: Initial Page Load & Catalog Rendering',
      pass: t1Pass,
      details: t1
    });
    console.log(`Result: ${t1Pass ? 'PASS' : 'FAIL'}`);
    console.log(`- Products rendered: ${t1.cardsCount}/13`);
    console.log(`- Dept buttons: ${t1.deptButtonsCount} buttons`);
    console.log(`- Subcategory bar display: ${t1.subcatBarDisplay}`);
    console.log(`- Active dept button: ${t1.deptButtons.find(b => b.isActive)?.text}`);

    // -----------------------------------------------------------------
    // TEST 2: Department Selection & DOM Active State Update (Para Casa)
    // -----------------------------------------------------------------
    console.log('\n--- TEST 2: Click Department "Para Casa" ---');
    const t2 = await cdp.evaluate(`
      (() => {
        // Find and click button with data-dept="Para Casa"
        const btn = document.querySelector('#deptFiltersBar button[data-dept="Para Casa"]');
        if (!btn) return { error: 'Button Para Casa not found' };
        btn.click();

        const deptBar = document.getElementById('deptFiltersBar');
        const subcatBar = document.getElementById('subcatFiltersBar');
        const grid = document.getElementById('catalogGrid');

        const deptButtons = Array.from(deptBar.querySelectorAll('.gc-filter-pill')).map(b => ({
          dept: b.dataset.dept,
          isActive: b.classList.contains('active')
        }));

        const subcatButtons = Array.from(subcatBar.querySelectorAll('.gc-filter-pill')).map(b => ({
          subcat: b.dataset.subcat,
          text: b.textContent.trim(),
          isActive: b.classList.contains('active')
        }));

        const cards = Array.from(grid.querySelectorAll('.gc-product-card')).map(c => ({
          title: c.querySelector('.gc-product-title')?.textContent.trim(),
          dept: c.querySelector('.gc-badge-dept')?.textContent.trim(),
          subcat: c.querySelector('.gc-badge-subcat')?.textContent.trim()
        }));

        return {
          paraCasaBtnActive: deptButtons.find(b => b.dept === 'Para Casa')?.isActive,
          allBtnActive: deptButtons.find(b => b.dept === 'all')?.isActive,
          subcatBarDisplay: window.getComputedStyle(subcatBar).display,
          subcatButtonsCount: subcatButtons.length,
          subcatButtons,
          cardsCount: cards.length,
          cards,
          urlSearch: window.location.search
        };
      })()
    `);

    // Let's verify active state specifically!
    const t2ActiveStateOk = (t2.paraCasaBtnActive === true && t2.allBtnActive === false);
    const t2CardsOk = t2.cardsCount === 3 && t2.cards.every(c => c.dept === 'Para Casa');
    const t2SubcatRendered = t2.subcatButtonsCount === 6; // 1 "Todas as Subcategorias" + 5 subcategories
    const t2UrlOk = t2.urlSearch === '?departamento=Para+Casa' || t2.urlSearch === '?departamento=Para%20Casa';

    console.log(`- Para Casa button active: ${t2.paraCasaBtnActive} (Expected: true)`);
    console.log(`- "Todas as Peças" button active: ${t2.allBtnActive} (Expected: false)`);
    console.log(`- Subcategory bar display: ${t2.subcatBarDisplay} (Expected: flex)`);
    console.log(`- Subcategories rendered count: ${t2.subcatButtonsCount} (Expected: 6)`);
    console.log(`- Filtered products count: ${t2.cardsCount} (Expected: 3)`);
    console.log(`- URL query string: ${t2.urlSearch}`);

    testResults.push({
      test: 'TEST 2: Department Selection & DOM Active State Update',
      pass: t2ActiveStateOk && t2CardsOk && t2SubcatRendered && t2UrlOk,
      activeStateBugDetected: !t2ActiveStateOk,
      details: t2
    });

    // -----------------------------------------------------------------
    // TEST 3: Subcategory Isolation (Amigurumis under Para Casa)
    // -----------------------------------------------------------------
    console.log('\n--- TEST 3: Click Subcategory "Amigurumis" ---');
    const t3 = await cdp.evaluate(`
      (() => {
        const subcatBar = document.getElementById('subcatFiltersBar');
        const btn = subcatBar.querySelector('button[data-subcat="Amigurumis"]');
        if (!btn) return { error: 'Button Amigurumis not found' };
        btn.click();

        const grid = document.getElementById('catalogGrid');
        const counter = document.getElementById('resultsCount');

        const subcatButtons = Array.from(subcatBar.querySelectorAll('.gc-filter-pill')).map(b => ({
          subcat: b.dataset.subcat,
          isActive: b.classList.contains('active')
        }));

        const cards = Array.from(grid.querySelectorAll('.gc-product-card')).map(c => ({
          title: c.querySelector('.gc-product-title')?.textContent.trim(),
          dept: c.querySelector('.gc-badge-dept')?.textContent.trim(),
          subcat: c.querySelector('.gc-badge-subcat')?.textContent.trim()
        }));

        return {
          amigurumiActive: subcatButtons.find(b => b.subcat === 'Amigurumis')?.isActive,
          allSubcatActive: subcatButtons.find(b => b.subcat === 'all')?.isActive,
          cardsCount: cards.length,
          cards,
          counterText: counter?.textContent.trim(),
          urlSearch: window.location.search
        };
      })()
    `);

    const t3Pass = t3.amigurumiActive === true && 
                   t3.allSubcatActive === false && 
                   t3.cardsCount === 1 && 
                   t3.cards[0].subcat === 'Amigurumis' &&
                   (t3.urlSearch.includes('departamento=Para') && t3.urlSearch.includes('subcategoria=Amigurumis'));

    console.log(`- Amigurumi button active: ${t3.amigurumiActive}`);
    console.log(`- Cards isolated: ${t3.cardsCount} (${t3.cards?.[0]?.title})`);
    console.log(`- URL: ${t3.urlSearch}`);
    console.log(`Result: ${t3Pass ? 'PASS' : 'FAIL'}`);

    testResults.push({
      test: 'TEST 3: Subcategory Isolation (Amigurumis)',
      pass: t3Pass,
      details: t3
    });

    // -----------------------------------------------------------------
    // TEST 4: Direct URL Query Parameter Landing (?departamento=Para Ela&subcategoria=Saias e Vestidos)
    // -----------------------------------------------------------------
    console.log('\n--- TEST 4: Direct URL Navigation (?departamento=Para%20Ela&subcategoria=Saias%20e%20Vestidos) ---');
    await cdp.navigate(`http://127.0.0.1:${PORT}/pecas.html?departamento=Para%20Ela&subcategoria=Saias%20e%20Vestidos`);

    const t4 = await cdp.evaluate(`
      (() => {
        const deptBar = document.getElementById('deptFiltersBar');
        const subcatBar = document.getElementById('subcatFiltersBar');
        const grid = document.getElementById('catalogGrid');

        const deptButtons = Array.from(deptBar.querySelectorAll('.gc-filter-pill')).map(b => ({
          dept: b.dataset.dept,
          isActive: b.classList.contains('active')
        }));

        const subcatButtons = Array.from(subcatBar.querySelectorAll('.gc-filter-pill')).map(b => ({
          subcat: b.dataset.subcat,
          isActive: b.classList.contains('active')
        }));

        const cards = Array.from(grid.querySelectorAll('.gc-product-card')).map(c => ({
          title: c.querySelector('.gc-product-title')?.textContent.trim(),
          dept: c.querySelector('.gc-badge-dept')?.textContent.trim(),
          subcat: c.querySelector('.gc-badge-subcat')?.textContent.trim()
        }));

        return {
          paraElaBtnActive: deptButtons.find(b => b.dept === 'Para Ela')?.isActive,
          allDeptBtnActive: deptButtons.find(b => b.dept === 'all')?.isActive,
          subcatBarDisplay: window.getComputedStyle(subcatBar).display,
          saiasVestidosActive: subcatButtons.find(b => b.subcat === 'Saias e Vestidos')?.isActive,
          cardsCount: cards.length,
          cards
        };
      })()
    `);

    console.log(`- Para Ela button active: ${t4.paraElaBtnActive} (Expected: true)`);
    console.log(`- All button active: ${t4.allDeptBtnActive} (Expected: false)`);
    console.log(`- Saias e Vestidos button active: ${t4.saiasVestidosActive} (Expected: true)`);
    console.log(`- Filtered products count: ${t4.cardsCount} (Expected: 2)`);
    t4.cards?.forEach(c => console.log(`  * ${c.title} (${c.dept} · ${c.subcat})`));

    const t4DeptActiveOk = (t4.paraElaBtnActive === true && t4.allDeptBtnActive === false);
    const t4Pass = t4DeptActiveOk && t4.saiasVestidosActive === true && t4.cardsCount === 2;

    testResults.push({
      test: 'TEST 4: Direct URL Navigation (?departamento=Para Ela&subcategoria=Saias e Vestidos)',
      pass: t4Pass,
      deptActiveBugDetected: !t4DeptActiveOk,
      details: t4
    });

    // -----------------------------------------------------------------
    // TEST 5: Direct URL Navigation with Slugs/Lower-Case (?departamento=para-ele&subcategoria=camisas-polos)
    // -----------------------------------------------------------------
    console.log('\n--- TEST 5: Slug/Lowercase URL Navigation (?departamento=para-ele&subcategoria=camisas-polos) ---');
    await cdp.navigate(`http://127.0.0.1:${PORT}/pecas.html?departamento=para-ele&subcategoria=camisas-polos`);

    const t5 = await cdp.evaluate(`
      (() => {
        const grid = document.getElementById('catalogGrid');
        const deptBar = document.getElementById('deptFiltersBar');
        const subcatBar = document.getElementById('subcatFiltersBar');

        const deptButtons = Array.from(deptBar.querySelectorAll('.gc-filter-pill')).map(b => ({
          dept: b.dataset.dept,
          isActive: b.classList.contains('active')
        }));

        const subcatButtons = Array.from(subcatBar.querySelectorAll('.gc-filter-pill')).map(b => ({
          subcat: b.dataset.subcat,
          isActive: b.classList.contains('active')
        }));

        const cards = Array.from(grid.querySelectorAll('.gc-product-card')).map(c => ({
          title: c.querySelector('.gc-product-title')?.textContent.trim(),
          dept: c.querySelector('.gc-badge-dept')?.textContent.trim(),
          subcat: c.querySelector('.gc-badge-subcat')?.textContent.trim()
        }));

        return {
          paraEleActive: deptButtons.find(b => b.dept === 'Para Ele')?.isActive,
          camisasPolosActive: subcatButtons.find(b => b.subcat === 'Camisas & Polos')?.isActive,
          cardsCount: cards.length,
          cards
        };
      })()
    `);

    console.log(`- Para Ele button active: ${t5.paraEleActive}`);
    console.log(`- Camisas & Polos active: ${t5.camisasPolosActive}`);
    console.log(`- Products count: ${t5.cardsCount}`);

    const t5Pass = t5.cardsCount === 1 && t5.cards[0].subcat === 'Camisas & Polos';
    testResults.push({
      test: 'TEST 5: Slug/Lowercase URL Navigation',
      pass: t5Pass,
      deptActiveBugDetected: !t5.paraEleActive,
      details: t5
    });

    // -----------------------------------------------------------------
    // TEST 6: Empty Subcategory & Reset Button
    // -----------------------------------------------------------------
    console.log('\n--- TEST 6: Empty Subcategory & Reset Filters ---');
    await cdp.navigate(`http://127.0.0.1:${PORT}/pecas.html?departamento=Para%20Ele&subcategoria=Su%C3%A9teres%20%26%20Cardigans`);

    const t6 = await cdp.evaluate(`
      (() => {
        const grid = document.getElementById('catalogGrid');
        const empty = document.getElementById('catalogEmpty');
        const counter = document.getElementById('resultsCount');

        const stateBefore = {
          gridDisplay: window.getComputedStyle(grid).display,
          emptyDisplay: window.getComputedStyle(empty).display,
          counterText: counter?.textContent.trim()
        };

        // Click the "Limpar Filtros" button inside empty state
        const resetBtn = empty.querySelector('button');
        if (resetBtn) resetBtn.click();

        const deptBar = document.getElementById('deptFiltersBar');
        const subcatBar = document.getElementById('subcatFiltersBar');

        const deptButtons = Array.from(deptBar.querySelectorAll('.gc-filter-pill')).map(b => ({
          dept: b.dataset.dept,
          isActive: b.classList.contains('active')
        }));

        const stateAfter = {
          gridDisplay: window.getComputedStyle(grid).display,
          emptyDisplay: window.getComputedStyle(empty).display,
          cardsCount: grid.querySelectorAll('.gc-product-card').length,
          allDeptActive: deptButtons.find(b => b.dept === 'all')?.isActive,
          subcatBarDisplay: window.getComputedStyle(subcatBar).display,
          urlSearch: window.location.search
        };

        return { stateBefore, stateAfter };
      })()
    `);

    console.log(`- Empty state visible before reset: ${t6.stateBefore.emptyDisplay === 'flex'}`);
    console.log(`- Catalog restored after reset: ${t6.stateAfter.cardsCount === 13}`);
    console.log(`- All button active after reset: ${t6.stateAfter.allDeptActive}`);
    console.log(`- URL after reset: "${t6.stateAfter.urlSearch}"`);

    const t6Pass = t6.stateBefore.emptyDisplay === 'flex' && 
                   t6.stateAfter.cardsCount === 13 && 
                   t6.stateAfter.urlSearch === '';

    testResults.push({
      test: 'TEST 6: Empty State and Reset Filters Button',
      pass: t6Pass,
      details: t6
    });

    // -----------------------------------------------------------------
    // TEST 7: Every Department Pill Click & UI Check
    // -----------------------------------------------------------------
    console.log('\n--- TEST 7: Department Cycle Click Test ---');
    await cdp.navigate(`http://127.0.0.1:${PORT}/pecas.html`);

    const t7 = await cdp.evaluate(`
      (() => {
        const depts = ['Para Ela', 'Para Ele', 'Para Casa', 'Pequeninos', 'Acessórios & Bijuterias'];
        const results = [];

        for (const dept of depts) {
          const btn = document.querySelector(\`#deptFiltersBar button[data-dept="\${dept}"]\`);
          if (btn) btn.click();

          const deptBar = document.getElementById('deptFiltersBar');
          const subcatBar = document.getElementById('subcatFiltersBar');
          const grid = document.getElementById('catalogGrid');

          const activeDepts = Array.from(deptBar.querySelectorAll('.gc-filter-pill.active')).map(b => b.dataset.dept);
          const subcats = Array.from(subcatBar.querySelectorAll('.gc-filter-pill')).map(b => b.dataset.subcat);
          const cardCount = grid.querySelectorAll('.gc-product-card').length;

          results.push({
            dept,
            activeDepts,
            subcatCount: subcats.length,
            cardCount,
            urlSearch: window.location.search
          });
        }
        return results;
      })()
    `);

    console.log('Department Cycle Results:');
    t7.forEach(r => {
      console.log(`- Dept: ${r.dept} -> Active buttons in DOM: [${r.activeDepts.join(', ')}], Cards: ${r.cardCount}, Subcats: ${r.subcatCount}`);
    });

    testResults.push({
      test: 'TEST 7: Department Cycle Click Test',
      pass: t7.every(r => r.activeDepts.length === 1 && r.activeDepts[0] === r.dept),
      activeDeptBugDetected: t7.some(r => r.activeDepts.includes('all') && r.activeDepts.length === 1),
      details: t7
    });

    // -----------------------------------------------------------------
    // TEST 8: Admin Modal Dynamic Selects & Category Overwrite Bug
    // -----------------------------------------------------------------
    console.log('\n--- TEST 8: Admin Product Modal Taxonomy Cascading & Save Integrity ---');
    await cdp.navigate(`http://127.0.0.1:${PORT}/admin.html`);

    const t8 = await cdp.evaluate(`
      (async () => {
        if (!window.AdminCore) return { error: 'AdminCore not loaded' };
        
        // Open modal
        window.AdminCore.openNewProductModal();
        const deptSelect = document.getElementById('prodDepartment');
        const subcatSelect = document.getElementById('prodSubcategory');
        const legacyCatInput = document.getElementById('prodCategory');
        const prodForm = document.getElementById('productForm');

        const initialDept = deptSelect ? deptSelect.value : null;
        const initialSubcats = subcatSelect ? Array.from(subcatSelect.options).map(o => o.value) : [];

        // Change department to "Para Casa"
        if (deptSelect) deptSelect.value = 'Para Casa';
        window.AdminCore.handleDepartmentChange('Para Casa');
        const casaSubcats = subcatSelect ? Array.from(subcatSelect.options).map(o => o.value) : [];

        // Change department to "Acessórios & Bijuterias" and subcategory to "Bolsas"
        if (deptSelect) deptSelect.value = 'Acessórios & Bijuterias';
        window.AdminCore.handleDepartmentChange('Acessórios & Bijuterias');
        if (subcatSelect) subcatSelect.value = 'Bolsas';

        document.getElementById('prodName').value = 'Bolsa Teste M1';
        document.getElementById('prodPrice').value = '150';

        // Dispatch submit event
        prodForm.dispatchEvent(new Event('submit', { cancelable: true }));

        const cachedProds = JSON.parse(localStorage.getItem('gc_cached_products') || '[]');
        const savedProduct = cachedProds[0] || null;

        return {
          initialDept,
          initialSubcatsCount: initialSubcats.length,
          casaSubcatsCount: casaSubcats.length,
          casaSubcats,
          legacyInputDefaultValue: legacyCatInput ? legacyCatInput.value : null,
          savedProduct: savedProduct ? {
            name: savedProduct.name,
            dept: savedProduct.department,
            subcat: savedProduct.subcategory,
            category: savedProduct.category
          } : null
        };
      })()
    `);

    console.log(`- Admin initial dept: ${t8.initialDept}`);
    console.log(`- Casa subcategories count: ${t8.casaSubcatsCount} (Expected: 5)`);
    console.log(`- Legacy category input default value: ${t8.legacyInputDefaultValue}`);
    console.log(`- Saved product department: ${t8.savedProduct?.dept}`);
    console.log(`- Saved product subcategory: ${t8.savedProduct?.subcat}`);
    console.log(`- Saved product category: ${t8.savedProduct?.category} (Expected: 'bolsas', Actual: '${t8.savedProduct?.category}')`);

    const categoryBugDetected = t8.savedProduct?.category === 'vestuario';
    if (categoryBugDetected) {
      console.log(`  -> BUG DETECTED: Admin product creation overwrites category with 'vestuario' even for 'Acessórios & Bijuterias'!`);
    }

    const t8Pass = t8.casaSubcatsCount === 5 && 
                   t8.savedProduct?.dept === 'Acessórios & Bijuterias' && 
                   t8.savedProduct?.subcat === 'Bolsas' &&
                   t8.savedProduct?.category === 'bolsas';

    testResults.push({
      test: 'TEST 8: Admin Product Form Taxonomy & Category Integrity',
      pass: t8Pass,
      categoryBugDetected,
      details: t8
    });

  } catch (err) {
    console.error('Test Execution Error:', err);
    testResults.push({ test: 'FATAL_ERROR', error: err.message, stack: err.stack });
  } finally {
    if (cdp && cdp.ws) {
      try { cdp.ws.close(); } catch(e){}
    }
    if (chrome && chrome.proc) {
      try {
        chrome.proc.kill('SIGKILL');
      } catch(e){}
      try {
        if (fs.existsSync(chrome.tempProfile)) {
          fs.rmSync(chrome.tempProfile, { recursive: true, force: true });
        }
      } catch(e){}
    }
    if (server) {
      server.close();
    }
  }

  // Summary
  console.log('\n========================================');
  console.log('TEST SUMMARY');
  console.log('========================================');
  testResults.forEach(r => {
    console.log(`[${r.pass ? 'PASS' : 'FAIL'}] ${r.test}`);
    if (r.activeStateBugDetected || r.deptActiveBugDetected) {
      console.log(`  -> BUG DETECTED: #deptFiltersBar buttons do not update active class!`);
    }
  });

  return testResults;
}

runEmpiricalTests().then(res => {
  fs.writeFileSync(path.join(__dirname, 'test_m1_empirical_results.json'), JSON.stringify(res, null, 2));
  console.log('\nResults saved to tests/test_m1_empirical_results.json');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});

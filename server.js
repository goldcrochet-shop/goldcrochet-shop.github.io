import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

app.use(express.json({ limit: '25mb' }));

// Helper function to create clean slugs
function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') || 'produto-' + Date.now();
}

// Function to split and sync data.json into individual product files
function syncIndividualProductFiles() {
  const dataPath = path.join(__dirname, 'data.json');
  const productsDir = path.join(__dirname, 'products');
  if (!fs.existsSync(productsDir)) fs.mkdirSync(productsDir, { recursive: true });
  if (fs.existsSync(dataPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
      if (Array.isArray(raw.products)) {
        let changed = false;
        raw.products.forEach(p => {
          if (!p.slug) {
            p.slug = slugify(p.name);
            changed = true;
          }
          const filePath = path.join(productsDir, `${p.slug}.json`);
          fs.writeFileSync(filePath, JSON.stringify(p, null, 2), 'utf-8');
        });
        if (changed) {
          fs.writeFileSync(dataPath, JSON.stringify(raw, null, 2), 'utf-8');
        }
      }
    } catch(e) {
      console.warn('Error in syncIndividualProductFiles:', e);
    }
  }
}

// Initial sync on startup
syncIndividualProductFiles();

// Serve static assets with proper caching
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/products', express.static(path.join(__dirname, 'products')));
app.use(express.static(__dirname, { index: false }));

// Data API endpoints
app.get('/api/data', (req, res) => {
  const dataPath = path.join(__dirname, 'data.json');
  try {
    if (fs.existsSync(dataPath)) {
      const data = fs.readFileSync(dataPath, 'utf-8');
      res.setHeader('Content-Type', 'application/json');
      return res.send(data);
    }
    return res.status(404).json({ error: 'data.json not found' });
  } catch (err) {
    console.error('Error reading data.json:', err);
    return res.status(500).json({ error: 'Failed to read data' });
  }
});

app.post('/api/data', (req, res) => {
  const dataPath = path.join(__dirname, 'data.json');
  try {
    const content = JSON.stringify(req.body, null, 2);
    fs.writeFileSync(dataPath, content, 'utf-8');
    // Keep individual product files in sync
    syncIndividualProductFiles();
    return res.json({ success: true });
  } catch (err) {
    console.error('Error saving data.json:', err);
    return res.status(500).json({ error: 'Failed to save data' });
  }
});

// Product Files Management APIs
app.get('/api/products', (req, res) => {
  const productsDir = path.join(__dirname, 'products');
  try {
    if (!fs.existsSync(productsDir)) fs.mkdirSync(productsDir, { recursive: true });
    const files = fs.readdirSync(productsDir).filter(f => f.endsWith('.json'));
    const list = files.map(file => {
      try {
        const filePath = path.join(productsDir, file);
        const p = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          slug: file.replace('.json', ''),
          fileSize: stats.size,
          mtime: stats.mtime,
          directUrl: `/${file.replace('.json', '')}`,
          product: p
        };
      } catch (e) {
        return null;
      }
    }).filter(Boolean);
    return res.json({ success: true, count: list.length, products: list });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao listar arquivos de produtos' });
  }
});

app.get('/api/products/:slug', (req, res) => {
  const { slug } = req.params;
  const productsDir = path.join(__dirname, 'products');
  const cleanSlug = slug.replace('.json', '');
  const filePath = path.join(productsDir, `${cleanSlug}.json`);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  // Try by id
  const files = fs.existsSync(productsDir) ? fs.readdirSync(productsDir).filter(f => f.endsWith('.json')) : [];
  for (const f of files) {
    try {
      const p = JSON.parse(fs.readFileSync(path.join(productsDir, f), 'utf-8'));
      if (String(p.id) === String(cleanSlug) || p.slug === cleanSlug) {
        return res.sendFile(path.join(productsDir, f));
      }
    } catch(e) {}
  }
  return res.status(404).json({ error: 'Produto não encontrado' });
});

app.post('/api/products/:slug', (req, res) => {
  const { slug } = req.params;
  const productData = req.body;
  if (!productData || !productData.name) {
    return res.status(400).json({ error: 'Dados do produto inválidos' });
  }
  const productsDir = path.join(__dirname, 'products');
  if (!fs.existsSync(productsDir)) fs.mkdirSync(productsDir, { recursive: true });

  const finalSlug = slugify(slug || productData.slug || productData.name);
  productData.slug = finalSlug;
  const filePath = path.join(productsDir, `${finalSlug}.json`);
  fs.writeFileSync(filePath, JSON.stringify(productData, null, 2), 'utf-8');

  // Also update data.json
  const dataPath = path.join(__dirname, 'data.json');
  if (fs.existsSync(dataPath)) {
    try {
      const current = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
      if (Array.isArray(current.products)) {
        const idx = current.products.findIndex(p => String(p.id) === String(productData.id) || p.slug === finalSlug);
        if (idx >= 0) {
          current.products[idx] = productData;
        } else {
          current.products.push(productData);
        }
        fs.writeFileSync(dataPath, JSON.stringify(current, null, 2), 'utf-8');
      }
    } catch (e) {
      console.warn('Sync data.json error:', e);
    }
  }

  return res.json({ success: true, slug: finalSlug, url: `/${finalSlug}`, filePath: `products/${finalSlug}.json` });
});

app.delete('/api/products/:slug', (req, res) => {
  const { slug } = req.params;
  const cleanSlug = slug.replace('.json', '');
  const productsDir = path.join(__dirname, 'products');
  const filePath = path.join(productsDir, `${cleanSlug}.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  // Remove from data.json
  const dataPath = path.join(__dirname, 'data.json');
  if (fs.existsSync(dataPath)) {
    try {
      const current = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
      if (Array.isArray(current.products)) {
        current.products = current.products.filter(p => p.slug !== cleanSlug && String(p.id) !== String(cleanSlug));
        fs.writeFileSync(dataPath, JSON.stringify(current, null, 2), 'utf-8');
      }
    } catch (e) {}
  }
  return res.json({ success: true, message: `Produto ${cleanSlug} removido com sucesso` });
});

app.post('/api/sync-product-files', (req, res) => {
  try {
    syncIndividualProductFiles();
    return res.json({ success: true, message: 'Todos os produtos foram divididos e salvos em arquivos individuais!' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao sincronizar arquivos de produtos' });
  }
});

// Newsletter subscription endpoint
app.post('/api/newsletter', (req, res) => {
  const dataPath = path.join(__dirname, 'data.json');
  try {
    const { email, name, source } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'E-mail inválido' });
    }
    const cleanEmail = email.toLowerCase().trim();
    let currentData = { newsletter: [] };
    if (fs.existsSync(dataPath)) {
      currentData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    }
    if (!Array.isArray(currentData.newsletter)) {
      currentData.newsletter = [];
    }

    const exists = currentData.newsletter.some(n => n.email === cleanEmail);
    if (!exists) {
      currentData.newsletter.push({
        id: 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        email: cleanEmail,
        name: name ? String(name).trim() : '',
        source: source || 'footer',
        active: true,
        subscribedAt: new Date().toISOString()
      });
      fs.writeFileSync(dataPath, JSON.stringify(currentData, null, 2), 'utf-8');
    }
    return res.json({ success: true, alreadySubscribed: exists });
  } catch (err) {
    console.error('Error in /api/newsletter:', err);
    return res.status(500).json({ error: 'Falha ao registrar inscrição' });
  }
});

app.get('/api/newsletter', (req, res) => {
  const dataPath = path.join(__dirname, 'data.json');
  try {
    if (fs.existsSync(dataPath)) {
      const currentData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
      return res.json(currentData.newsletter || []);
    }
    return res.json([]);
  } catch (err) {
    return res.status(500).json({ error: 'Falha ao buscar inscritos' });
  }
});

app.delete('/api/newsletter', (req, res) => {
  const dataPath = path.join(__dirname, 'data.json');
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'E-mail obrigatório' });
    if (fs.existsSync(dataPath)) {
      const currentData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
      if (Array.isArray(currentData.newsletter)) {
        currentData.newsletter = currentData.newsletter.filter(n => n.email !== email.toLowerCase().trim());
        fs.writeFileSync(dataPath, JSON.stringify(currentData, null, 2), 'utf-8');
      }
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Falha ao remover inscrito' });
  }
});

// Direct Image Upload API for Admin Panel
app.post('/api/upload-image', (req, res) => {
  try {
    const { fileName, base64Data } = req.body;
    if (!fileName || !base64Data) {
      return res.status(400).json({ error: 'Missing fileName or base64Data' });
    }
    const safeName = path.basename(fileName);
    const imagesDir = path.join(__dirname, 'images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    const targetPath = path.join(imagesDir, safeName);
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(targetPath, buffer);
    return res.json({ success: true, url: `./images/${safeName}` });
  } catch (err) {
    console.error('Error uploading image:', err);
    return res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Admin panel route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Dedicated product route handler
function handleProductRoute(req, res, slug) {
  const productsDir = path.join(__dirname, 'products');
  const cleanSlug = slug.replace('.json', '');
  const filePath = path.join(productsDir, `${cleanSlug}.json`);
  let product = null;
  if (fs.existsSync(filePath)) {
    try { product = JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch(e) {}
  }
  if (!product && fs.existsSync(productsDir)) {
    const files = fs.readdirSync(productsDir).filter(f => f.endsWith('.json'));
    for (const f of files) {
      try {
        const p = JSON.parse(fs.readFileSync(path.join(productsDir, f), 'utf-8'));
        if (p.slug === cleanSlug || String(p.id) === String(cleanSlug)) {
          product = p;
          break;
        }
      } catch(e) {}
    }
  }

  // If client wants JSON:
  if (req.headers.accept && req.headers.accept.includes('application/json') && !req.headers.accept.includes('text/html')) {
    if (product) return res.json(product);
    return res.status(404).json({ error: 'Produto não encontrado' });
  }

  // Otherwise, serve HTML with injected product metadata for social share & instant display
  const indexPath = path.join(__dirname, 'index.html');
  if (!fs.existsSync(indexPath)) return res.status(404).send('Not found');
  let html = fs.readFileSync(indexPath, 'utf-8');
  if (product) {
    const title = `${product.name} | Gold Crochet Alta Moda`;
    const desc = (product.desc || 'Peça artesanal exclusiva em crochê de alta moda brasileira.').replace(/"/g, '&quot;');
    const imgUrl = product.image || './assets/logo.png';
    html = html.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`)
               .replace(/<meta property="og:title" content=".*?"/i, `<meta property="og:title" content="${title}"`)
               .replace(/<meta property="og:description" content=".*?"/i, `<meta property="og:description" content="${desc}"`)
               .replace(/<meta property="og:image" content=".*?"/i, `<meta property="og:image" content="${imgUrl}"`);
    const injectScript = `<script>window.__INITIAL_PRODUCT_SLUG__ = ${JSON.stringify(product.slug || cleanSlug)}; window.__INITIAL_PRODUCT_ID__ = ${JSON.stringify(product.id)};</script></head>`;
    html = html.replace('</head>', injectScript);
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(html);
}

// Dedicated product URLs
app.get('/produto/:slug', (req, res) => handleProductRoute(req, res, req.params.slug));
app.get('/produtos/:slug', (req, res) => handleProductRoute(req, res, req.params.slug));

// Main storefront route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Catch-all middleware for SPA navigation, direct /produtotal routes and unhandled files
app.use((req, res) => {
  const filePath = path.join(__dirname, req.path);
  if (req.method === 'GET' && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return res.sendFile(filePath);
  }

  // Check if req.path matches a direct product slug like /bolsa-dunas
  const possibleSlug = req.path.replace(/^\//, '').replace(/\/$/, '');
  const productsDir = path.join(__dirname, 'products');
  if (possibleSlug && fs.existsSync(path.join(productsDir, `${possibleSlug}.json`))) {
    return handleProductRoute(req, res, possibleSlug);
  }

  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Gold Crochet server running at http://${HOST}:${PORT}`);
});

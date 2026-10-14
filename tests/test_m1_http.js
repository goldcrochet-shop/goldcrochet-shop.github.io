import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 8099;
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(process.cwd(), reqPath.replace(/^\//, ''));

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'text/plain' });
    res.end(fs.readFileSync(filePath));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, async () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  let errors = 0;

  const testUrls = [
    '/',
    '/pecas.html',
    '/admin.html',
    '/colecoes.html',
    '/novidades.html',
    '/data.json',
    '/js/admin-core.js',
    '/js/shared-ui.js',
    '/css/luxury-core.css',
    '/pecas.html?departamento=Para%20Casa&subcategoria=Sousplats%20%26%20Mesas',
    '/pecas.html?departamento=Acess%C3%B3rios%20%26%20Bijuterias'
  ];

  for (const u of testUrls) {
    try {
      const resp = await fetch(`http://localhost:${PORT}${u}`);
      if (resp.status === 200) {
        console.log(`✓ HTTP 200: ${u}`);
      } else {
        console.error(`✗ HTTP ${resp.status}: ${u}`);
        errors++;
      }
    } catch (e) {
      console.error(`✗ HTTP Fetch Error: ${u} - ${e.message}`);
      errors++;
    }
  }

  server.close(() => {
    console.log(`Server closed. Total HTTP errors: ${errors}`);
    process.exit(errors > 0 ? 1 : 0);
  });
});

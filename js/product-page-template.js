/**
 * Gold Crochet — Gerador de Template Estático de Página Individual de Produto (SSG)
 * Gera páginas HTML autônomas, completas e otimizadas para SEO e compartilhamento social.
 */

export function generateProductHtml(product, allProducts = [], config = {}) {
  const p = product;
  const slug = p.slug || 'produto-' + p.id;
  const siteUrl = 'https://goldcrochet-shop.github.io/goldcrochet-shop';
  const pageUrl = `${siteUrl}/produtos/${slug}.html`;
  const whatsappNumber = config.whatsapp || '5521999999999'; // número comercial
  
  const formattedPrice = p.price ? `R$ ${Number(p.price).toFixed(2).replace('.', ',')}` : 'Sob Consulta';
  const parcelPrice = p.price ? `3x de R$ ${(Number(p.price) / 3).toFixed(2).replace('.', ',')} sem juros` : '';
  
  const mainImage = p.image || (p.gallery && p.gallery[0]) || '../assets/logo.png';
  const gallery = [p.image, ...(p.gallery || [])].filter(Boolean);
  const uniqueGallery = [...new Set(gallery)];

  const colors = p.colors || [];
  const colorSections = p.colorSections || [];
  let allColorItems = [...colors];
  colorSections.forEach(cs => {
    if (cs.colors && Array.isArray(cs.colors)) {
      allColorItems.push(...cs.colors);
    }
  });

  const categoryName = p.category ? p.category.toUpperCase() : 'EXCLUSIVO';
  const material = p.material || 'Fio 100% Algodão Premium selecionado à mão';
  const prodTime = p.prod_time ? `${p.prod_time} horas de confecção artesanal` : 'Feito sob demanda artesanalmente';

  // Schema.org JSON-LD para Google Search
  const schemaJson = JSON.stringify({
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": p.name,
    "image": uniqueGallery.map(img => img.startsWith('http') ? img : `${siteUrl}/${img.replace(/^\.\//, '')}`),
    "description": p.desc || `Peça exclusiva em crochê feita à mão pela Gold Crochet.`,
    "sku": `GC-${p.id}`,
    "brand": {
      "@type": "Brand",
      "name": "Gold Crochet"
    },
    "offers": {
      "@type": "Offer",
      "url": pageUrl,
      "priceCurrency": "BRL",
      "price": p.price ? Number(p.price).toFixed(2) : "0.00",
      "availability": "https://schema.org/InStock",
      "itemCondition": "https://schema.org/NewCondition"
    }
  }, null, 2);

  // Produtos relacionados sugeridos (excluindo o atual)
  const related = allProducts
    .filter(item => item.id !== p.id && item.slug)
    .slice(0, 4);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>${p.name} — Gold Crochet</title>
  <meta name="description" content="${p.desc ? p.desc.replace(/"/g, '&quot;') : 'Peça exclusiva em crochê feita à mão com acabamento dourado e fios nobres.'}">
  <link rel="canonical" href="${pageUrl}">
  <meta name="theme-color" content="#d4af37">

  <!-- OpenGraph / WhatsApp / Instagram / Facebook -->
  <meta property="og:type" content="product">
  <meta property="og:title" content="${p.name} — Gold Crochet">
  <meta property="og:description" content="${p.desc ? p.desc.replace(/"/g, '&quot;') : 'Peças artesanais exclusivas em crochê de alto padrão.'}">
  <meta property="og:image" content="${mainImage}">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:site_name" content="Gold Crochet">
  <meta property="product:price:amount" content="${p.price || 0}">
  <meta property="product:price:currency" content="BRL">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${p.name} — Gold Crochet">
  <meta name="twitter:description" content="${p.desc ? p.desc.replace(/"/g, '&quot;') : 'Peças artesanais exclusivas em crochê de alto padrão.'}">
  <meta name="twitter:image" content="${mainImage}">

  <!-- Favicons -->
  <link rel="icon" type="image/png" sizes="32x32" href="../assets/icon.png?v=3">
  <link rel="icon" type="image/svg+xml" href="../assets/icon.svg?v=3">
  <link rel="shortcut icon" href="../assets/icon.ico?v=3">
  <link rel="apple-touch-icon" sizes="180x180" href="../assets/icon.png?v=3">

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet">
  
  <!-- Estilos Globais -->
  <link rel="stylesheet" href="../style.css">

  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">
${schemaJson}
  </script>

  <style>
    .product-standalone {
      max-width: 1200px;
      margin: 100px auto 60px;
      padding: 0 24px;
    }
    .breadcrumbs {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      color: #8b7a5a;
      margin-bottom: 24px;
    }
    .breadcrumbs a {
      color: inherit;
      text-decoration: none;
      transition: color 0.2s;
    }
    .breadcrumbs a:hover {
      color: #cda434;
    }
    .breadcrumbs span {
      color: #c9b686;
    }
    .product-grid-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 48px;
      background: #ffffff;
      border-radius: 24px;
      padding: 36px;
      box-shadow: 0 10px 40px rgba(166,124,0,0.08);
      border: 1px solid rgba(205,164,52,0.15);
    }
    @media (max-width: 868px) {
      .product-grid-layout {
        grid-template-columns: 1fr;
        gap: 32px;
        padding: 20px;
      }
      .product-standalone {
        margin-top: 80px;
        padding: 0 16px;
      }
    }
    .gallery-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .main-image-wrap {
      width: 100%;
      height: 480px;
      border-radius: 20px;
      overflow: hidden;
      background: #fdf9f0;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(205,164,52,0.15);
    }
    .main-image-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.4s ease;
    }
    .main-image-wrap:hover img {
      transform: scale(1.03);
    }
    .gallery-thumbs {
      display: flex;
      gap: 12px;
      overflow-x: auto;
      padding-bottom: 6px;
    }
    .thumb-btn {
      width: 80px;
      height: 80px;
      border-radius: 12px;
      border: 2px solid transparent;
      overflow: hidden;
      cursor: pointer;
      background: #fdf9f0;
      padding: 0;
      flex-shrink: 0;
      transition: all 0.2s;
    }
    .thumb-btn.active {
      border-color: #cda434;
      box-shadow: 0 0 12px rgba(205,164,52,0.3);
    }
    .thumb-btn img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .product-details-col {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .product-badge-tag {
      display: inline-block;
      align-self: flex-start;
      padding: 6px 14px;
      border-radius: 50px;
      background: linear-gradient(135deg, #cda434, #a67c00);
      color: #fff;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .product-title-h1 {
      font-family: 'DM Serif Display', serif;
      font-size: 2.2rem;
      color: #2a2210;
      line-height: 1.2;
    }
    .product-price-box {
      background: #fdf9f0;
      padding: 16px 20px;
      border-radius: 16px;
      border-left: 4px solid #cda434;
    }
    .price-value {
      font-size: 1.8rem;
      font-weight: 800;
      color: #a67c00;
    }
    .price-installments {
      font-size: 0.88rem;
      color: #6b5b3a;
      margin-top: 4px;
    }
    .product-description-text {
      color: #554830;
      font-size: 1rem;
      line-height: 1.7;
    }
    .specs-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      padding: 16px;
      background: #faf6ed;
      border-radius: 14px;
    }
    .spec-item {
      font-size: 0.85rem;
      color: #4a3e20;
    }
    .spec-item strong {
      color: #2a2210;
      display: block;
      margin-bottom: 2px;
    }
    .color-picker-box {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .color-options {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .color-chip {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: 50px;
      border: 1.5px solid #d4c29a;
      background: #fff;
      cursor: pointer;
      font-size: 0.85rem;
      transition: all 0.2s;
    }
    .color-chip.selected {
      border-color: #a67c00;
      background: #fdf6e2;
      font-weight: 600;
    }
    .color-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 1px solid rgba(0,0,0,0.15);
    }
    .action-buttons {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 10px;
    }
    .btn-buy-whatsapp {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: linear-gradient(135deg, #25D366, #128C7E);
      color: #ffffff;
      padding: 16px 24px;
      border-radius: 50px;
      font-size: 1.05rem;
      font-weight: 700;
      text-decoration: none;
      box-shadow: 0 6px 20px rgba(37,211,102,0.3);
      transition: all 0.25s;
    }
    .btn-buy-whatsapp:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 28px rgba(37,211,102,0.45);
    }
    .btn-add-cart {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: linear-gradient(135deg, #cda434, #a67c00);
      color: #ffffff;
      padding: 15px 24px;
      border-radius: 50px;
      font-size: 1rem;
      font-weight: 700;
      border: none;
      cursor: pointer;
      transition: all 0.25s;
      box-shadow: 0 6px 20px rgba(205,164,52,0.25);
    }
    .btn-add-cart:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 28px rgba(205,164,52,0.35);
    }
    .btn-back-home {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: #8b7a5a;
      text-decoration: none;
      font-size: 0.9rem;
      margin-top: 8px;
      transition: color 0.2s;
    }
    .btn-back-home:hover {
      color: #cda434;
    }
    .related-section {
      margin-top: 60px;
    }
    .related-title {
      font-family: 'DM Serif Display', serif;
      font-size: 1.8rem;
      color: #2a2210;
      margin-bottom: 24px;
      text-align: center;
    }
    .related-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 20px;
    }
    .related-card {
      background: #fff;
      border-radius: 18px;
      overflow: hidden;
      border: 1px solid rgba(205,164,52,0.15);
      text-decoration: none;
      color: inherit;
      transition: all 0.25s;
      display: flex;
      flex-direction: column;
    }
    .related-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(166,124,0,0.12);
    }
    .related-img {
      width: 100%;
      height: 180px;
      object-fit: cover;
      background: #fdf9f0;
    }
    .related-info {
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .related-name {
      font-weight: 700;
      font-size: 0.95rem;
      color: #2a2210;
    }
    .related-price {
      color: #a67c00;
      font-weight: 800;
      font-size: 0.9rem;
    }
  </style>
</head>
<body>

  <!-- Top Bar / Aviso -->
  <header class="header" role="banner" style="position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(255,255,255,0.92);backdrop-filter:blur(10px);border-bottom:1px solid rgba(205,164,52,0.15);padding:14px 24px;display:flex;align-items:center;justify-content:space-between;">
    <a href="../index.html" class="logo" style="text-decoration:none;display:flex;align-items:center;gap:10px;">
      <img src="../assets/logo.png" alt="Gold Crochet" style="height:42px;width:auto;">
    </a>
    <div style="display:flex;align-items:center;gap:14px;">
      <a href="../index.html#catalogo" class="nav-link" style="color:#2a2210;text-decoration:none;font-weight:600;font-size:0.9rem;">Coleções</a>
      <a href="../index.html" class="nav-link" style="color:#2a2210;text-decoration:none;font-weight:600;font-size:0.9rem;">Loja Completa</a>
      <a href="../index.html#carrinho" class="nav-link" id="headerCartCount" style="background:#fdf9f0;border:1px solid #cda434;padding:6px 14px;border-radius:50px;color:#a67c00;text-decoration:none;font-weight:700;font-size:0.85rem;">Sacola 🛍️</a>
    </div>
  </header>

  <main class="product-standalone">
    <!-- Breadcrumbs -->
    <nav class="breadcrumbs" aria-label="Navegação">
      <a href="../index.html">Início</a>
      <span>/</span>
      <a href="../index.html#catalogo">${categoryName}</a>
      <span>/</span>
      <span aria-current="page">${p.name}</span>
    </nav>

    <!-- Estrutura Principal do Produto -->
    <div class="product-grid-layout">
      <!-- Coluna da Galeria -->
      <div class="gallery-container">
        <div class="main-image-wrap">
          <img id="mainProductImg" src="${mainImage}" alt="${p.name}">
        </div>
        ${uniqueGallery.length > 1 ? `
        <div class="gallery-thumbs">
          ${uniqueGallery.map((img, idx) => `
            <button class="thumb-btn ${idx === 0 ? 'active' : ''}" onclick="switchImage('${img}', this)" aria-label="Ver foto ${idx + 1}">
              <img src="${img}" alt="${p.name} - Imagem ${idx + 1}">
            </button>
          `).join('')}
        </div>
        ` : ''}
      </div>

      <!-- Coluna de Detalhes -->
      <div class="product-details-col">
        ${p.badge ? `<span class="product-badge-tag">${p.badge}</span>` : ''}
        <h1 class="product-title-h1">${p.name}</h1>
        
        <div class="product-price-box">
          <div class="price-value">${formattedPrice}</div>
          ${parcelPrice ? `<div class="price-installments">ou em até ${parcelPrice}</div>` : ''}
        </div>

        <p class="product-description-text">${p.desc || 'Peça artesanal exclusiva criada à mão com pontos finos de crochê e materiais de alta resistência e suavidade.'}</p>

        <!-- Especificações da Peça -->
        <div class="specs-grid">
          <div class="spec-item">
            <strong>Material:</strong>
            ${material}
          </div>
          <div class="spec-item">
            <strong>Confecção:</strong>
            ${prodTime}
          </div>
          <div class="spec-item">
            <strong>Categoria:</strong>
            ${categoryName}
          </div>
          <div class="spec-item">
            <strong>Acabamento:</strong>
            Exclusivo Gold Crochet
          </div>
        </div>

        <!-- Seletor de Cores -->
        ${allColorItems.length > 0 ? `
        <div class="color-picker-box">
          <label style="font-weight:700;font-size:0.9rem;color:#2a2210;">Escolha a Cor:</label>
          <div class="color-options" id="colorOptions">
            ${allColorItems.map((col, idx) => `
              <div class="color-chip ${idx === 0 ? 'selected' : ''}" onclick="selectColor('${col.name}', this)">
                <span class="color-dot" style="background-color: ${col.hex || '#cda434'};"></span>
                <span>${col.name}</span>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <!-- Botões de Ação -->
        <div class="action-buttons">
          <a id="btnWhatsApp" class="btn-buy-whatsapp" href="#" target="_blank" rel="noopener noreferrer">
            <span>💬 Comprar pelo WhatsApp</span>
          </a>
          <button class="btn-add-cart" onclick="addToCartCurrent()">
            <span>🛍️ Adicionar à Sacola</span>
          </button>
          <a href="../index.html" class="btn-back-home">← Voltar para a Loja Principal</a>
        </div>
      </div>
    </div>

    <!-- Seção de Peças Relacionadas -->
    ${related.length > 0 ? `
    <section class="related-section">
      <h2 class="related-title">Você Também Pode Gostar</h2>
      <div class="related-grid">
        ${related.map(rel => `
          <a class="related-card" href="./${rel.slug}.html">
            <img class="related-img" src="${rel.image || '../assets/logo.png'}" alt="${rel.name}">
            <div class="related-info">
              <span class="related-name">${rel.name}</span>
              <span class="related-price">${rel.price ? `R$ ${Number(rel.price).toFixed(2).replace('.', ',')}` : 'Sob Consulta'}</span>
            </div>
          </a>
        `).join('')}
      </div>
    </section>
    ` : ''}
  </main>

  <footer style="margin-top:80px;background:#15120c;color:#f0e8d8;padding:48px 24px;text-align:center;">
    <p style="font-family:'DM Serif Display',serif;font-size:1.4rem;color:#d4af37;margin-bottom:8px;">Gold Crochet</p>
    <p style="font-size:0.85rem;color:#c9b686;margin-bottom:16px;">Peças em crochê feitas à mão, com acabamento premium.</p>
    <p style="font-size:0.75rem;color:#8b7a5a;">&copy; ${new Date().getFullYear()} Gold Crochet. Todos os direitos reservados.</p>
  </footer>

  <script>
    // Gerenciamento de Cores e Imagem na Página
    let selectedColor = '${allColorItems[0] ? allColorItems[0].name : ''}';
    const productName = "${p.name.replace(/"/g, '\\"')}";
    const productPrice = "${formattedPrice}";
    const pageUrl = window.location.href;
    const whatsappNum = "${whatsappNumber}";

    function switchImage(src, btn) {
      document.getElementById('mainProductImg').src = src;
      document.querySelectorAll('.thumb-btn').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
    }

    function selectColor(name, el) {
      selectedColor = name;
      document.querySelectorAll('.color-chip').forEach(c => c.classList.remove('selected'));
      if (el) el.classList.add('selected');
      updateWhatsAppLink();
    }

    function updateWhatsAppLink() {
      const colorText = selectedColor ? ' na cor ' + selectedColor : '';
      const text = encodeURIComponent('Olá! Gostaria de encomendar a peça *' + productName + '*' + colorText + ' (' + productPrice + ') que vi no site: ' + pageUrl);
      document.getElementById('btnWhatsApp').href = 'https://wa.me/' + whatsappNum + '?text=' + text;
    }

    updateWhatsAppLink();

    // Integração com Carrinho do LocalStorage (Sincronizado com a loja principal)
    function addToCartCurrent() {
      try {
        const cart = JSON.parse(localStorage.getItem('gc_cart') || '[]');
        const existing = cart.find(i => i.id === ${p.id} && i.selectedColor === selectedColor);
        if (existing) {
          existing.qty = (existing.qty || 1) + 1;
        } else {
          cart.push({
            id: ${p.id},
            name: productName,
            price: ${p.price || 0},
            image: "${mainImage}",
            selectedColor: selectedColor,
            qty: 1,
            slug: "${slug}"
          });
        }
        localStorage.setItem('gc_cart', JSON.stringify(cart));
        alert('✨ "' + productName + '" adicionado à sua sacola!');
        updateCartBadge();
      } catch(e) {
        console.error(e);
      }
    }

    function updateCartBadge() {
      try {
        const cart = JSON.parse(localStorage.getItem('gc_cart') || '[]');
        const total = cart.reduce((acc, i) => acc + (i.qty || 1), 0);
        const badge = document.getElementById('headerCartCount');
        if (badge) badge.textContent = 'Sacola (' + total + ') 🛍️';
      } catch(e) {}
    }
    updateCartBadge();
  </script>
</body>
</html>`;
}

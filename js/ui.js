// Gold Crochet - Módulo de Interface do Usuário (UI), Toasts, Efeitos Visuais e Menus

export function showToast(msg, type = '') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = 'toast show ' + (type || '');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

export function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas || typeof THREE === 'undefined') return;

  try {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const particleCount = window.innerWidth < 768 ? 40 : 85;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 12;
      positions[i + 1] = (Math.random() - 0.5) * 12;
      positions[i + 2] = (Math.random() - 0.5) * 8;
      scales[i / 3] = Math.random() * 1.5 + 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Material de partícula dourada brilhante
    const material = new THREE.PointsMaterial({
      color: 0xd4af37,
      size: 0.045,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    camera.position.z = 4;

    let mouseX = 0;
    let mouseY = 0;
    window.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 0.5;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 0.5;
    }, { passive: true });

    function animate() {
      requestAnimationFrame(animate);
      particles.rotation.y += 0.0006;
      particles.rotation.x += 0.0003;
      particles.position.x += (mouseX - particles.position.x) * 0.02;
      particles.position.y += (-mouseY - particles.position.y) * 0.02;
      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  } catch (err) {
    console.warn('Efeito de partículas 3D desativado:', err);
  }
}

export function initMouseFollower() {
  const light = document.getElementById('mouseLight');
  if (!light || window.innerWidth < 768) return;

  let x = -100, y = -100;
  window.addEventListener('mousemove', (e) => {
    x = e.clientX;
    y = e.clientY;
    light.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }, { passive: true });
}

export function initHeaderScroll() {
  const nav = document.getElementById('mainNav');
  if (!nav) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 25) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }, { passive: true });
}

// Menus e Overlays
export function toggleLeftMenu() {
  const menu = document.getElementById('leftMenu');
  const overlay = document.getElementById('menuOverlay');
  const hamburger = document.getElementById('hamburger');
  if (!menu) return;

  const isOpen = menu.classList.toggle('open');
  if (overlay) overlay.classList.toggle('open', isOpen);
  if (hamburger) hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  document.body.style.overflow = isOpen ? 'hidden' : '';
}

export function closeLeftMenu() {
  const menu = document.getElementById('leftMenu');
  const overlay = document.getElementById('menuOverlay');
  const hamburger = document.getElementById('hamburger');
  if (menu) menu.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

export function toggleSearchOverlay() {
  const overlay = document.getElementById('searchOverlay');
  if (overlay && overlay.classList.contains('open')) {
    closeSearchOverlay();
  } else {
    openSearchOverlay();
  }
}

export function openSearchOverlay() {
  const overlay = document.getElementById('searchOverlay');
  const input = document.getElementById('searchOverlayInput');
  if (overlay) overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  if (input) {
    input.focus();
    input.select();
  }
}

export function closeSearchOverlay() {
  const overlay = document.getElementById('searchOverlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

export function initKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Ctrl+K ou Cmd+K para abrir busca
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      toggleSearchOverlay();
      return;
    }

    // Escape fecha todos os overlays
    if (e.key === 'Escape') {
      closeSearchOverlay();
      closeLeftMenu();
      if (window.closeCart) window.closeCart();
      if (window.closeFavorites) window.closeFavorites();
      if (window.closeUserModal) window.closeUserModal();
      if (window.closeModal) window.closeModal();
    }
  });
}

export function acceptCookies() {
  const banner = document.getElementById('cookieBanner');
  if (banner) banner.classList.remove('show');
  localStorage.setItem('goldcrochet_cookies', '1');
}

export function checkCookieConsent() {
  if (!localStorage.getItem('goldcrochet_cookies')) {
    setTimeout(() => {
      const banner = document.getElementById('cookieBanner');
      if (banner) banner.classList.add('show');
    }, 2000);
  }
}

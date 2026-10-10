/**
 * Gold Crochet — Interactive 3D Haute Couture Experience
 * Renderizador 3D em Three.js com interação touch/gestual para mobile e desktop,
 * apresentando a trama e fios nobres em ouro metálico e azul celeste (#bad7e8).
 */

(function () {
  // Carrega Three.js dinamicamente se ainda não estiver presente
  function loadThree(callback) {
    if (typeof THREE !== 'undefined') {
      callback();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.onload = callback;
    document.head.appendChild(script);
  }

  // ════════════════════════════════════════
  // 1. ESCULTURA 3D INTERATIVA DO HERO (BÚZIO & TRAMA DOURADA)
  // ════════════════════════════════════════
  function initHero3D() {
    const container = document.getElementById('hero3DCanvasContainer');
    if (!container) return;

    loadThree(() => {
      const width = container.clientWidth || 320;
      const height = container.clientHeight || 320;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.z = 4.2;

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.innerHTML = '';
      container.appendChild(renderer.domElement);

      // Luzes
      const ambientLight = new THREE.AmbientLight(0xfff6d6, 1.2);
      scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xd4af37, 2.5);
      dirLight.position.set(5, 5, 5);
      scene.add(dirLight);

      const blueRimLight = new THREE.DirectionalLight(0xbad7e8, 1.8);
      blueRimLight.position.set(-5, -3, -2);
      scene.add(blueRimLight);

      // Geometria Orgânica (TorusKnot torcido simulando trama de crochê em fio de ouro)
      const geometry = new THREE.TorusKnotGeometry(1.05, 0.32, 120, 24, 2, 3);
      
      // Material Ouro Metálico PBR
      const goldMaterial = new THREE.MeshStandardMaterial({
        color: 0xcda434,
        metalness: 0.88,
        roughness: 0.22,
        wireframe: false
      });

      const knot = new THREE.Mesh(geometry, goldMaterial);
      scene.add(knot);

      // Partículas em suspensão (ouro e brisa azul celeste)
      const pCount = 50;
      const pGeom = new THREE.BufferGeometry();
      const pPos = new Float32Array(pCount * 3);
      for (let i = 0; i < pCount * 3; i += 3) {
        pPos[i] = (Math.random() - 0.5) * 5;
        pPos[i + 1] = (Math.random() - 0.5) * 5;
        pPos[i + 2] = (Math.random() - 0.5) * 4;
      }
      pGeom.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
      const pMat = new THREE.PointsMaterial({
        color: 0xbad7e8,
        size: 0.04,
        transparent: true,
        opacity: 0.7
      });
      const points = new THREE.Points(pGeom, pMat);
      scene.add(points);

      // Interação Touch e Mouse
      let targetRotX = 0;
      let targetRotY = 0;
      let isDragging = false;
      let previousX = 0;
      let previousY = 0;

      function onPointerMove(x, y) {
        const rect = container.getBoundingClientRect();
        const normX = (x - rect.left) / rect.width - 0.5;
        const normY = (y - rect.top) / rect.height - 0.5;
        targetRotY = normX * 2.5;
        targetRotX = normY * 2.0;
      }

      container.addEventListener('mousemove', (e) => onPointerMove(e.clientX, e.clientY));
      
      // Suporte Mobile Touch
      container.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          isDragging = true;
          previousX = e.touches[0].clientX;
          previousY = e.touches[0].clientY;
        }
      }, { passive: true });

      container.addEventListener('touchmove', (e) => {
        if (isDragging && e.touches.length === 1) {
          const deltaX = e.touches[0].clientX - previousX;
          const deltaY = e.touches[0].clientY - previousY;
          knot.rotation.y += deltaX * 0.01;
          knot.rotation.x += deltaY * 0.01;
          previousX = e.touches[0].clientX;
          previousY = e.touches[0].clientY;
        }
      }, { passive: true });

      container.addEventListener('touchend', () => { isDragging = false; });

      // Animação Contínua
      function animate() {
        requestAnimationFrame(animate);

        if (!isDragging) {
          knot.rotation.y += 0.006;
          knot.rotation.x += (targetRotX - knot.rotation.x) * 0.05;
          knot.rotation.y += (targetRotY - (knot.rotation.y % (Math.PI * 2))) * 0.03;
        }

        points.rotation.y -= 0.002;
        renderer.render(scene, camera);
      }
      animate();

      window.addEventListener('resize', () => {
        const newW = container.clientWidth || 320;
        const newH = container.clientHeight || 320;
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
      });
    });
  }

  // ════════════════════════════════════════
  // 2. VISUALIZADOR 3D DE PRODUTOS INTERATIVO (360° SPIN)
  // ════════════════════════════════════════
  window.initProduct3DViewer = function (canvasId, imgUrl) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    loadThree(() => {
      const width = canvas.clientWidth || 360;
      const height = canvas.clientHeight || 360;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.z = 3.6;

      const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      const ambLight = new THREE.AmbientLight(0xffffff, 1.4);
      scene.add(ambLight);

      const dir = new THREE.DirectionalLight(0xd4af37, 2);
      dir.position.set(3, 4, 3);
      scene.add(dir);

      // Cilindro/Display circular orgânico
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(imgUrl, (texture) => {
        const geom = new THREE.CylinderGeometry(1.1, 1.1, 1.4, 48, 1, true);
        const mat = new THREE.MeshStandardMaterial({
          map: texture,
          side: THREE.DoubleSide,
          roughness: 0.35,
          metalness: 0.2
        });
        const cylinder = new THREE.Mesh(geom, mat);
        scene.add(cylinder);

        let isDown = false;
        let startX = 0;

        canvas.addEventListener('mousedown', (e) => { isDown = true; startX = e.clientX; });
        window.addEventListener('mouseup', () => { isDown = false; });
        canvas.addEventListener('mousemove', (e) => {
          if (isDown) {
            const dx = e.clientX - startX;
            cylinder.rotation.y += dx * 0.01;
            startX = e.clientX;
          }
        });

        canvas.addEventListener('touchstart', (e) => { isDown = true; startX = e.touches[0].clientX; }, { passive: true });
        window.addEventListener('touchend', () => { isDown = false; });
        canvas.addEventListener('touchmove', (e) => {
          if (isDown) {
            const dx = e.touches[0].clientX - startX;
            cylinder.rotation.y += dx * 0.015;
            startX = e.touches[0].clientX;
          }
        }, { passive: true });

        function renderLoop() {
          requestAnimationFrame(renderLoop);
          if (!isDown) cylinder.rotation.y += 0.005;
          renderer.render(scene, camera);
        }
        renderLoop();
      });
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    initHero3D();
  });
})();

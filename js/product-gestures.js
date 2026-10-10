/**
 * Gold Crochet - Gestos e Arraste para Sair do Produto
 * Permite puxar para baixo ou arrastar para o lado para fechar a página do produto com física fluida.
 */

export function setupProductSwipeDismiss() {
  const page = document.getElementById('page-produto');
  const wrap = document.querySelector('.product-page-wrap');
  const dragHandle = document.getElementById('productDragHandle');

  if (!page || !wrap) return;

  let startX = 0;
  let startY = 0;
  let currentY = 0;
  let currentX = 0;
  let isDragging = false;
  let dragDirection = null; // 'down' | 'right' | null
  let startTime = 0;

  function canStartDownDrag() {
    if (!page.classList.contains('active')) return false;
    // Só inicia o gesto de puxar para baixo se a página estiver no topo da rolagem
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    return scrollTop <= 4;
  }

  function onTouchStart(e) {
    if (!page.classList.contains('active')) return;
    if (e.touches.length !== 1) return;

    // Não intercepta se o toque foi em carrossel de miniaturas ou botões
    if (e.target.closest('button, input, select, textarea, .product-thumb, .color-dot')) return;

    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    currentX = startX;
    currentY = startY;
    startTime = Date.now();
    isDragging = false;
    dragDirection = null;
  }

  function onTouchMove(e) {
    if (!page.classList.contains('active')) return;
    if (e.touches.length !== 1) return;

    const t = e.touches[0];
    currentX = t.clientX;
    currentY = t.clientY;
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;

    if (!isDragging) {
      // Determina direção inicial
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (absY > 8 && deltaY > 0 && absY > absX && canStartDownDrag()) {
        isDragging = true;
        dragDirection = 'down';
        wrap.classList.add('is-dragging');
        wrap.style.transition = 'none';
      } else if (absX > 12 && deltaX > 0 && absX > absY * 1.5 && (startX <= 48 || e.target.closest('#productTopBar, #productDragHandle'))) {
        isDragging = true;
        dragDirection = 'right';
        wrap.classList.add('is-dragging');
        wrap.style.transition = 'none';
      }
    }

    if (isDragging) {
      if (e.cancelable) e.preventDefault();

      if (dragDirection === 'down') {
        const pull = Math.max(0, deltaY);
        // Física de resistência suave
        const damp = pull * 0.78;
        const scale = Math.max(0.92, 1 - (pull * 0.0003));
        const opacity = Math.max(0.65, 1 - (pull * 0.0012));
        wrap.style.transform = `translate3d(0, ${damp}px, 0) scale(${scale})`;
        wrap.style.opacity = `${opacity}`;
        
        const pill = document.querySelector('.product-drag-pill');
        if (pill) pill.classList.toggle('active', pull > 60);
      } else if (dragDirection === 'right') {
        const pull = Math.max(0, deltaX);
        const damp = pull * 0.82;
        const opacity = Math.max(0.65, 1 - (pull * 0.0015));
        wrap.style.transform = `translate3d(${damp}px, 0, 0)`;
        wrap.style.opacity = `${opacity}`;
      }
    }
  }

  function onTouchEnd(e) {
    if (!isDragging) return;
    isDragging = false;
    wrap.classList.remove('is-dragging');

    const t = e.changedTouches ? e.changedTouches[0] : e;
    const deltaX = (t.clientX || currentX) - startX;
    const deltaY = (t.clientY || currentY) - startY;
    const elapsed = Date.now() - startTime;
    const velocityY = deltaY / Math.max(1, elapsed);
    const velocityX = deltaX / Math.max(1, elapsed);

    const pill = document.querySelector('.product-drag-pill');
    if (pill) pill.classList.remove('active');

    if (dragDirection === 'down') {
      const shouldDismiss = deltaY > 100 || (deltaY > 40 && velocityY > 0.45);
      if (shouldDismiss) {
        // Animação de saída para baixo
        wrap.style.transition = 'transform 0.26s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.22s ease';
        wrap.style.transform = 'translate3d(0, 100vh, 0) scale(0.9)';
        wrap.style.opacity = '0';

        setTimeout(() => {
          dismissProductPage();
          resetWrapStyles();
        }, 260);
      } else {
        // Retorno com mola suave
        wrap.style.transition = 'transform 0.24s cubic-bezier(0.175, 0.885, 0.32, 1.2), opacity 0.2s ease';
        wrap.style.transform = '';
        wrap.style.opacity = '';
        setTimeout(resetWrapStyles, 250);
      }
    } else if (dragDirection === 'right') {
      const shouldDismiss = deltaX > 85 || (deltaX > 35 && velocityX > 0.45);
      if (shouldDismiss) {
        wrap.style.transition = 'transform 0.24s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.2s ease';
        wrap.style.transform = 'translate3d(100vw, 0, 0)';
        wrap.style.opacity = '0';

        setTimeout(() => {
          dismissProductPage();
          resetWrapStyles();
        }, 240);
      } else {
        wrap.style.transition = 'transform 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.2), opacity 0.2s ease';
        wrap.style.transform = '';
        wrap.style.opacity = '';
        setTimeout(resetWrapStyles, 230);
      }
    }
  }

  function resetWrapStyles() {
    wrap.style.transition = '';
    wrap.style.transform = '';
    wrap.style.opacity = '';
  }

  function dismissProductPage() {
    if (typeof window.goBackPage === 'function' && window.goBackPage()) {
      return;
    }
    if (typeof window.showPage === 'function') {
      window.showPage('produtos');
    }
  }

  // Touch listeners na página do produto
  page.addEventListener('touchstart', onTouchStart, { passive: true });
  page.addEventListener('touchmove', onTouchMove, { passive: false });
  page.addEventListener('touchend', onTouchEnd, { passive: true });
  page.addEventListener('touchcancel', () => {
    if (isDragging) {
      isDragging = false;
      wrap.classList.remove('is-dragging');
      resetWrapStyles();
    }
  }, { passive: true });

  // Mouse drag support no handle para desktop / tablets com mouse
  if (dragHandle) {
    let mouseTracking = false;
    let mStartY = 0;

    dragHandle.addEventListener('mousedown', (e) => {
      mouseTracking = true;
      mStartY = e.clientY;
      wrap.style.transition = 'none';
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!mouseTracking || !page.classList.contains('active')) return;
      const dy = Math.max(0, e.clientY - mStartY);
      wrap.style.transform = `translate3d(0, ${dy * 0.75}px, 0)`;
      wrap.style.opacity = `${Math.max(0.6, 1 - dy * 0.0015)}`;
    });

    window.addEventListener('mouseup', (e) => {
      if (!mouseTracking) return;
      mouseTracking = false;
      const dy = e.clientY - mStartY;
      if (dy > 90) {
        wrap.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.2s ease';
        wrap.style.transform = 'translate3d(0, 100vh, 0)';
        wrap.style.opacity = '0';
        setTimeout(() => {
          dismissProductPage();
          resetWrapStyles();
        }, 250);
      } else {
        wrap.style.transition = 'transform 0.22s ease, opacity 0.2s ease';
        wrap.style.transform = '';
        wrap.style.opacity = '';
        setTimeout(resetWrapStyles, 230);
      }
    });
  }
}

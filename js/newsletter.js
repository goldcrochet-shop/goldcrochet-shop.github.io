// Gold Crochet - Módulo da Newsletter (Clube Gold Crochet)
import { db, fsDoc, setDoc } from "./firebase.js";

export async function handleNewsletterSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  const input = document.getElementById('footerNewsletterEmail');
  const btn = document.getElementById('footerNewsletterBtn');
  const msg = document.getElementById('footerNewsletterMsg');
  if (!input || !btn) return;

  const email = (input.value || '').trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    if (msg) {
      msg.textContent = '⚠️ Por favor, insira um e-mail válido.';
      msg.className = 'footer-newsletter-msg error';
    }
    return;
  }

  btn.disabled = true;
  const originalBtnHtml = btn.innerHTML;
  btn.innerHTML = '<span>Cadastrando...</span>';
  if (msg) {
    msg.textContent = '';
    msg.className = 'footer-newsletter-msg';
  }

  try {
    // 1. Salvar no Firestore (se conectado)
    try {
      if (db) {
        const subId = 'sub_' + Date.now();
        await setDoc(fsDoc(db, 'newsletter', subId), {
          email,
          active: true,
          source: 'footer',
          subscribedAt: new Date().toISOString()
        });
      }
    } catch (fsErr) {
      console.warn('[Firestore] Inscrição salva localmente:', fsErr);
    }

    // 2. Salvar localmente no navegador (Jamstack)
    try {
      const list = JSON.parse(localStorage.getItem('goldcrochet_newsletter') || '[]');
      if (!list.some(item => item.email === email)) {
        list.push({ email, subscribedAt: new Date().toISOString(), source: 'footer' });
        localStorage.setItem('goldcrochet_newsletter', JSON.stringify(list));
      }
    } catch(e) {}

    localStorage.setItem('goldcrochet_newsletter_email', email);
    input.value = '';
    btn.innerHTML = '<span>Inscrito(a)! ✨</span>';
    if (msg) {
      msg.textContent = '✨ Parabéns! Você agora faz parte do Clube Gold Crochet.';
      msg.className = 'footer-newsletter-msg success';
    }
    if (window.showToast) {
      window.showToast('💌 Inscrição confirmada com sucesso!');
    }

    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = originalBtnHtml;
    }, 4000);
  } catch (err) {
    console.error('Erro ao cadastrar newsletter:', err);
    btn.disabled = false;
    btn.innerHTML = originalBtnHtml;
    if (msg) {
      msg.textContent = '❌ Erro ao cadastrar. Tente novamente mais tarde.';
      msg.className = 'footer-newsletter-msg error';
    }
  }
}

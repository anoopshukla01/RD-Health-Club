import { toggleAudio } from './scrolly-lift.js';

export function initNavbar() {
  const navbar = document.querySelector('.navbar');
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const drawer = document.querySelector('.mobile-drawer');
  const audioBtn = document.querySelector('.audio-toggle-btn');
  const audioIcon = document.querySelector('.audio-icon');

  // Scroll blur effect
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }, { passive: true });

  // Mobile menu toggle
  if (menuBtn && drawer) {
    menuBtn.addEventListener('click', () => {
      drawer.classList.toggle('open');
      document.body.style.overflow = drawer.classList.contains('open') ? 'hidden' : '';
    });

    drawer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        drawer.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // Audio mute/unmute
  if (audioBtn) {
    audioBtn.addEventListener('click', () => {
      const isSoundOn = toggleAudio();
      audioBtn.setAttribute('title', isSoundOn ? 'Mute Sound FX' : 'Enable Sound FX');
      audioBtn.style.color = isSoundOn ? 'var(--red-primary)' : 'var(--text-dim)';
    });
  }
}

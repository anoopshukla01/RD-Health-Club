import { initCharacter3D } from './components/character-3d.js';
import { initScrollyLift } from './components/scrolly-lift.js';
import { initNavbar } from './components/navbar.js';
import { initEquipment } from './components/equipment.js';
import { initStatsCounter } from './components/stats.js';
// Reviews are now rendered by initCMSSync() from stored CMS data
import { initSignatureCharacter } from './components/signature-character.js';
import { initMotivation } from './components/motivation.js';
import { initModals } from './components/modal.js';
import { initCMSSync, addInquiry, getCMSData } from './cms-sync.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize CMS synchronization first
  initCMSSync();

  // Initialize all interactive components
  initNavbar();
  initCharacter3D();
  initScrollyLift();
  initEquipment();
  initStatsCounter();
  // renderReviews() is now called inside initCMSSync() using live CMS data
  initSignatureCharacter();
  initMotivation();
  initModals();

  // Contact form submission
  const contactForm = document.getElementById('contact-inquiry-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('inq-name')?.value || '';
      const phone = document.getElementById('inq-phone')?.value || '';
      const interest = document.getElementById('inq-interest')?.value || '';
      const msg = document.getElementById('inq-msg')?.value || '';

      // Log lead to CMS
      addInquiry({ name, phone, plan: interest, message: msg });

      const text = encodeURIComponent(
        `Hello Mr. R.D. Singh,\nI would like to inquire about RD Health Club.\nName: ${name}\nPhone: ${phone}\nInterest: ${interest}\nMessage: ${msg}`
      );

      // Open WhatsApp chat directly using CMS contact phone
      const cms = getCMSData();
      const cleanWa = (cms.contact?.whatsapp || cms.contact?.phone || '919876543210').replace(/[^0-9]/g, '');
      window.open(`https://api.whatsapp.com/send?phone=${cleanWa}&text=${text}`, '_blank');
    });
  }

  // Active section spy for navbar links
  const sections = document.querySelectorAll('section[id], div[id="hero"]');
  const navItems = document.querySelectorAll('.nav-item a');

  window.addEventListener('scroll', () => {
    let current = '';
    const scrollPos = window.scrollY + 120;

    sections.forEach(sec => {
      const top = sec.offsetTop;
      const height = sec.offsetHeight;
      if (scrollPos >= top && scrollPos < top + height) {
        current = sec.getAttribute('id');
      }
    });

    navItems.forEach(a => {
      const href = a.getAttribute('href')?.replace('#', '');
      a.classList.toggle('active', href === current);
    });
  }, { passive: true });
});

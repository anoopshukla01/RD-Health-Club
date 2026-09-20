import confetti from 'canvas-confetti';

export function initModals() {
  const dialog = document.querySelector('dialog.app-modal');
  const closeBtn = document.querySelector('.modal-close-btn');
  const planSelect = document.getElementById('modal-plan-select');
  const joinBtns = document.querySelectorAll('.trigger-join-modal');
  const modalForm = document.getElementById('modal-enroll-form');
  const modalBody = document.querySelector('.modal-form-content');
  const modalSuccess = document.querySelector('.modal-success-content');

  // Open modal with plan pre-selected
  joinBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const plan = btn.getAttribute('data-plan') || '12months';
      if (planSelect) planSelect.value = plan;

      if (modalBody) modalBody.style.display = 'block';
      if (modalSuccess) modalSuccess.style.display = 'none';

      if (dialog) dialog.showModal();
    });
  });

  if (closeBtn && dialog) {
    closeBtn.addEventListener('click', () => dialog.close());
  }

  // Light dismiss on backdrop click
  if (dialog) {
    dialog.addEventListener('click', (e) => {
      const rect = dialog.getBoundingClientRect();
      const inDialog =
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width;
      if (!inDialog) {
        dialog.close();
      }
    });
  }

  // Handle form submission
  if (modalForm) {
    modalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('modal-name')?.value || '';
      const phone = document.getElementById('modal-phone')?.value || '';
      const plan = planSelect?.options[planSelect.selectedIndex]?.text || 'Membership';

      // Trigger celebratory confetti
      confetti({
        particleCount: 75,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ff1f24', '#ffffff', '#ff6b6b']
      });

      // Show success view
      if (modalBody) modalBody.style.display = 'none';
      if (modalSuccess) {
        modalSuccess.style.display = 'block';
        const msg = encodeURIComponent(`Hi Mr. R.D. Singh, I want to enroll in RD Health Club for "${plan}". My Name: ${name}, Phone: ${phone}.`);
        const waLink = modalSuccess.querySelector('.whatsapp-direct-link');
        if (waLink) {
          waLink.href = `https://api.whatsapp.com/send?phone=919876543210&text=${msg}`;
        }
      }
    });
  }

  // Gallery Lightbox
  initGalleryLightbox();
}

function initGalleryLightbox() {
  const lightbox = document.querySelector('.lightbox-modal');
  const lightboxImg = document.querySelector('.lightbox-img');
  const closeBtn = document.querySelector('.lightbox-close');
  const items = document.querySelectorAll('.gallery-item');

  if (!lightbox || !lightboxImg) return;

  items.forEach(item => {
    item.addEventListener('click', () => {
      const src = item.getAttribute('data-full') || item.querySelector('img')?.src;
      if (src) {
        lightboxImg.src = src;
        lightbox.classList.add('open');
        document.body.style.overflow = 'hidden';
      }
    });
  });

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
}

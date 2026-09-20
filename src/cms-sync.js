/**
 * RD HEALTH CLUB — CMS SYNCHRONIZATION ENGINE
 * Synchronizes administrative CMS content with the public website DOM.
 */

import { initialContent } from './data/initial-content.js';

export const CMS_STORAGE_KEY = 'rd_health_club_cms_data_v1';

export function getCMSData() {
  try {
    const raw = localStorage.getItem(CMS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CMS_STORAGE_KEY, JSON.stringify(initialContent));
      return JSON.parse(JSON.stringify(initialContent));
    }
    const parsed = JSON.parse(raw);
    // Deep merge initial content keys to ensure forward compatibility
    return {
      ...initialContent,
      ...parsed,
      brand: { ...initialContent.brand, ...(parsed.brand || {}) },
      hero: { ...initialContent.hero, ...(parsed.hero || {}) },
      about: { ...initialContent.about, ...(parsed.about || {}) },
      membership: {
        ...initialContent.membership,
        ...(parsed.membership || {}),
        plans: (parsed.membership && parsed.membership.plans) ? parsed.membership.plans : initialContent.membership.plans,
        personalTraining: { ...initialContent.membership.personalTraining, ...((parsed.membership && parsed.membership.personalTraining) || {}) }
      },
      trainers: parsed.trainers || initialContent.trainers,
      facilities: parsed.facilities || initialContent.facilities,
      gallery: parsed.gallery || initialContent.gallery,
      reviews: parsed.reviews || initialContent.reviews,
      contact: { ...initialContent.contact, ...(parsed.contact || {}) },
      inquiries: parsed.inquiries || initialContent.inquiries,
      adminSettings: { ...initialContent.adminSettings, ...(parsed.adminSettings || {}) }
    };
  } catch (e) {
    console.warn('[CMS Sync] Failed to parse local CMS data, fallback to default:', e);
    return JSON.parse(JSON.stringify(initialContent));
  }
}

export function saveCMSData(data) {
  try {
    localStorage.setItem(CMS_STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('rd-cms-updated', { detail: data }));
    return true;
  } catch (e) {
    console.error('[CMS Sync] Save error:', e);
    return false;
  }
}

export function resetCMSData() {
  localStorage.setItem(CMS_STORAGE_KEY, JSON.stringify(initialContent));
  window.dispatchEvent(new CustomEvent('rd-cms-updated', { detail: initialContent }));
  return JSON.parse(JSON.stringify(initialContent));
}

export function addInquiry(lead) {
  const data = getCMSData();
  const newLead = {
    id: 'inq-' + Date.now().toString(36),
    date: new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }),
    name: lead.name || 'Anonymous',
    phone: lead.phone || '',
    plan: lead.plan || 'General Membership',
    status: 'New',
    message: lead.message || ''
  };
  data.inquiries = [newLead, ...(data.inquiries || [])];
  saveCMSData(data);
}

/**
 * Hydrates public index.html with live CMS content
 */
export function initCMSSync() {
  const data = getCMSData();
  renderPublicContent(data);

  // Re-render when changes happen in another tab or in admin
  window.addEventListener('storage', (e) => {
    if (e.key === CMS_STORAGE_KEY) {
      const updated = getCMSData();
      renderPublicContent(updated);
    }
  });

  window.addEventListener('rd-cms-updated', (e) => {
    if (e.detail) renderPublicContent(e.detail);
  });
}

function renderPublicContent(data) {
  // 1. Brand Elements
  if (data.brand) {
    document.querySelectorAll('.cms-brand-name').forEach(el => el.textContent = data.brand.name);
    document.querySelectorAll('.cms-brand-motto').forEach(el => el.textContent = data.brand.motto);
    if (data.brand.logo) {
      document.querySelectorAll('.cms-brand-logo').forEach(img => img.src = data.brand.logo);
    }
  }

  // 2. Hero Section
  if (data.hero) {
    const heroTag = document.querySelector('.cms-hero-tag');
    if (heroTag) heroTag.textContent = data.hero.tag;

    const heroTitle = document.querySelector('.cms-hero-title');
    if (heroTitle) {
      heroTitle.innerHTML = `${escapeHTML(data.hero.titleLine1)} <span class="red-text">${escapeHTML(data.hero.titleLine2)}</span>`;
    }

    const heroSub = document.querySelector('.cms-hero-sub');
    if (heroSub) heroSub.textContent = data.hero.subtitle;

    const athleteImg = document.querySelector('.cms-hero-athlete');
    if (athleteImg && data.hero.athleteImage) {
      athleteImg.src = data.hero.athleteImage;
    }

    // Hero Stats
    if (Array.isArray(data.hero.stats) && data.hero.stats.length) {
      const statElements = document.querySelectorAll('.cms-hero-stat-card');
      statElements.forEach((el, index) => {
        const item = data.hero.stats[index];
        if (item) {
          const valEl = el.querySelector('.stat-value');
          const lblEl = el.querySelector('.stat-label');
          if (valEl) valEl.textContent = item.value;
          if (lblEl) lblEl.textContent = item.label;
        }
      });
    }
  }

  // 3. About Section
  if (data.about) {
    const aboutTitle = document.querySelector('.cms-about-title');
    if (aboutTitle) aboutTitle.textContent = data.about.title;

    const aboutQuote = document.querySelector('.cms-about-quote');
    if (aboutQuote) aboutQuote.textContent = data.about.quote;

    const aboutAuthor = document.querySelector('.cms-about-author');
    if (aboutAuthor) aboutAuthor.textContent = data.about.author;

    const aboutDesc1 = document.querySelector('.cms-about-desc1');
    if (aboutDesc1) aboutDesc1.textContent = data.about.description1;

    const aboutDesc2 = document.querySelector('.cms-about-desc2');
    if (aboutDesc2) aboutDesc2.textContent = data.about.description2;
  }

  // 4. Membership Plans
  if (data.membership && Array.isArray(data.membership.plans)) {
    renderMembershipSection(data.membership);
    updatePlanDropdowns(data.membership.plans, data.membership.personalTraining);
  }

  // 5. Trainers & Mentorship Showcase
  if (Array.isArray(data.trainers)) {
    renderTrainersSection(data.trainers);
  }

  // 6. Contact Information
  if (data.contact) {
    const addr = document.querySelectorAll('.cms-contact-address');
    addr.forEach(el => el.textContent = data.contact.address);

    const phoneLinks = document.querySelectorAll('.cms-contact-phone');
    phoneLinks.forEach(el => {
      el.textContent = data.contact.phone;
      if (el.tagName === 'A') el.href = `tel:${data.contact.phone.replace(/\s+/g, '')}`;
    });

    const mTimings = document.querySelector('.cms-timings-morning');
    if (mTimings) mTimings.textContent = data.contact.timingsMorning;

    const eTimings = document.querySelector('.cms-timings-evening');
    if (eTimings) eTimings.textContent = data.contact.timingsEvening;

    const openDays = document.querySelector('.cms-timings-days');
    if (openDays) openDays.textContent = data.contact.openDays;
  }
}

/**
 * Dynamically updates the public Membership pricing grid
 */
function renderMembershipSection(membershipData) {
  const container = document.querySelector('.membership-grid');
  if (!container) return;

  const plans = membershipData.plans || [];
  if (!plans.length) return;

  container.innerHTML = plans.map(plan => {
    const isFeatured = !!plan.featured;
    const badgeHtml = plan.badgeText ? `<div class="best-value-badge">${escapeHTML(plan.badgeText)}</div>` : '';
    const btnClass = isFeatured ? 'btn btn-primary trigger-join-modal' : 'btn btn-outline trigger-join-modal';

    const featuresHtml = (plan.features || []).map(feat => `
      <li class="plan-feature-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        ${escapeHTML(feat)}
      </li>
    `).join('');

    return `
      <div class="membership-card ${isFeatured ? 'featured' : ''}">
        ${badgeHtml}
        <div class="plan-header">
          <h3 class="plan-title">${escapeHTML(plan.title)}</h3>
          <p class="plan-sub">${escapeHTML(plan.subtitle || '')}</p>
        </div>
        <div class="plan-price-wrap">
          <span class="plan-currency">₹</span>
          <span class="plan-amount">${escapeHTML(plan.price)}</span>
        </div>
        <ul class="plan-features-list">
          ${featuresHtml}
        </ul>
        <button class="${btnClass}" data-plan="${escapeHTML(plan.id)}">
          ${escapeHTML(plan.buttonText || `JOIN ${plan.title}`)}
        </button>
      </div>
    `;
  }).join('');

  // Re-bind modal triggers for newly generated buttons
  bindModalTriggers();
}

/**
 * Dynamically updates plan selects in Modal and Contact forms
 */
function updatePlanDropdowns(plans, pt) {
  const modalSelect = document.getElementById('modal-plan-select');
  if (modalSelect) {
    const optionsHtml = plans.map(p => {
      const suffix = p.badgeText ? ` (${p.badgeText})` : '';
      return `<option value="${escapeHTML(p.id)}">${escapeHTML(p.title)} — ₹${escapeHTML(p.price)}${suffix}</option>`;
    });
    if (pt) {
      optionsHtml.push(`<option value="pt">Personal Training with R.D. Singh — ₹${escapeHTML(pt.price)}</option>`);
    }
    modalSelect.innerHTML = optionsHtml.join('');
  }

  const contactSelect = document.getElementById('inq-interest');
  if (contactSelect) {
    const optionsHtml = plans.map(p => {
      const suffix = p.badgeText ? ` - ${p.badgeText}` : '';
      return `<option value="${escapeHTML(p.title)} Plan (₹${escapeHTML(p.price)})">${escapeHTML(p.title)} Membership (₹${escapeHTML(p.price)}${suffix})</option>`;
    });
    if (pt) {
      optionsHtml.push(`<option value="Personal Training (₹${escapeHTML(pt.price)})">Personal Training with R.D. Singh (₹${escapeHTML(pt.price)})</option>`);
    }
    optionsHtml.push(`<option value="General Trial Visit">General Trial Visit</option>`);
    contactSelect.innerHTML = optionsHtml.join('');
  }
}

/**
 * Dynamically renders the Trainers showcase
 */
function renderTrainersSection(trainers) {
  const container = document.getElementById('trainers-grid-container');
  if (!container) return;

  container.innerHTML = trainers.map(trainer => `
    <div class="trainer-card">
      <div class="trainer-card-img-wrap">
        <img src="${escapeHTML(trainer.image || '/assets/trainer_rd_singh.jpg')}" alt="${escapeHTML(trainer.name)}" class="trainer-card-img" />
        <span class="trainer-exp-badge">${escapeHTML(trainer.experience || '')}</span>
      </div>
      <div class="trainer-card-body">
        <span class="trainer-role">${escapeHTML(trainer.role || 'Fitness Coach')}</span>
        <h3 class="trainer-name">${escapeHTML(trainer.name)}</h3>
        <p class="trainer-specialty">${escapeHTML(trainer.specialty || '')}</p>
        <p class="trainer-bio">${escapeHTML(trainer.bio || '')}</p>
        <div class="trainer-cert-tag">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
          ${escapeHTML(trainer.certifications || 'Certified Master Trainer')}
        </div>
      </div>
    </div>
  `).join('');
}

function bindModalTriggers() {
  const dialog = document.querySelector('dialog.app-modal');
  const planSelect = document.getElementById('modal-plan-select');
  const modalBody = document.querySelector('.modal-form-content');
  const modalSuccess = document.querySelector('.modal-success-content');

  document.querySelectorAll('.trigger-join-modal').forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      const plan = btn.getAttribute('data-plan') || '12months';
      if (planSelect) planSelect.value = plan;
      if (modalBody) modalBody.style.display = 'block';
      if (modalSuccess) modalSuccess.style.display = 'none';
      if (dialog) dialog.showModal();
    };
  });
}

function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

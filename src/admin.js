/**
 * RD HEALTH CLUB — ADMINISTRATIVE CMS CONTROLLER
 * Full management logic for texts, media, plans, trainers, reviews & inquiries.
 */

import { getCMSData, saveCMSData, resetCMSData } from './cms-sync.js';

class AdminController {
  constructor() {
    this.data = getCMSData();
    this.session = sessionStorage.getItem('rd_admin_session');

    // DOM Elements
    this.authGate = document.getElementById('auth-gate');
    this.adminDashboard = document.getElementById('admin-dashboard');
    this.loginForm = document.getElementById('login-form');
    this.loginError = document.getElementById('login-error');
    this.btnLogout = document.getElementById('btn-logout');

    this.tabButtons = document.querySelectorAll('.admin-tab-btn');
    this.tabPanes = document.querySelectorAll('.tab-pane');
    this.toast = document.getElementById('admin-toast');

    this.init();
  }

  init() {
    this.bindAuthEvents();

    if (this.session) {
      this.showDashboard();
      this.initTabs();
      this.populateAllForms();
    } else {
      this.showAuthGate();
    }
  }

  // =========================================================================
  // 1. AUTHENTICATION & SESSION MANAGEMENT
  // =========================================================================
  bindAuthEvents() {
    if (this.loginForm) {
      this.loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('login-username').value.trim();
        const pass = document.getElementById('login-password').value.trim();
        const stored = this.data.adminSettings || { username: 'admin', passwordHash: 'rdclub2026' };

        if (user === stored.username && pass === stored.passwordHash) {
          sessionStorage.setItem('rd_admin_session', 'authenticated');
          this.session = 'authenticated';
          this.loginError.style.display = 'none';
          this.showDashboard();
          this.initTabs();
          this.populateAllForms();
          this.showToast('Welcome to RD Health Club CMS!');
        } else {
          this.loginError.textContent = 'Invalid username or password. Please try again.';
          this.loginError.style.display = 'block';
        }
      });
    }

    if (this.btnLogout) {
      this.btnLogout.addEventListener('click', () => {
        sessionStorage.removeItem('rd_admin_session');
        window.location.reload();
      });
    }

    // Change Password Form
    const pwForm = document.getElementById('form-change-password');
    if (pwForm) {
      pwForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const curr = document.getElementById('pw-current').value;
        const newP = document.getElementById('pw-new').value;
        const conf = document.getElementById('pw-confirm').value;
        const stored = this.data.adminSettings || { username: 'admin', passwordHash: 'rdclub2026' };

        if (curr !== stored.passwordHash) {
          alert('Current password does not match.');
          return;
        }
        if (newP.length < 6) {
          alert('New password must be at least 6 characters.');
          return;
        }
        if (newP !== conf) {
          alert('New password confirmation does not match.');
          return;
        }

        this.data.adminSettings.passwordHash = newP;
        saveCMSData(this.data);
        pwForm.reset();
        this.showToast('Admin password updated successfully!');
      });
    }
  }

  showAuthGate() {
    if (this.authGate) this.authGate.style.display = 'flex';
    if (this.adminDashboard) this.adminDashboard.style.display = 'none';
  }

  showDashboard() {
    if (this.authGate) this.authGate.style.display = 'none';
    if (this.adminDashboard) this.adminDashboard.style.display = 'flex';
  }

  // =========================================================================
  // 2. TABS NAVIGATION
  // =========================================================================
  initTabs() {
    this.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        this.tabButtons.forEach(b => b.classList.remove('active'));
        this.tabPanes.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const pane = document.getElementById(targetTab);
        if (pane) pane.classList.add('active');
      });
    });
  }

  // =========================================================================
  // 3. DATA POPULATION & FORM BINDING
  // =========================================================================
  populateAllForms() {
    this.renderInquiriesTable();
    this.populateHeroForm();
    this.populateAboutForm();
    this.renderMembershipPlans();
    this.renderTrainersGrid();
    this.renderEquipmentGrid();
    this.renderGalleryGrid();
    this.renderReviewsList();
    this.populateContactForm();
    this.bindEntityModals();
    this.bindBackupHandlers();
  }

  // =========================================================================
  // 4. INQUIRIES & LEADS MANAGEMENT
  // =========================================================================
  renderInquiriesTable() {
    const tbody = document.getElementById('inquiries-table-body');
    const badge = document.getElementById('inquiries-badge-count');
    const inquiries = this.data.inquiries || [];

    if (badge) badge.textContent = inquiries.length;
    if (!tbody) return;

    if (!inquiries.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--admin-text-dim); padding: 30px;">No membership inquiries recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = inquiries.map(inq => {
      const statusClass = inq.status === 'New' ? 'status-new' : inq.status === 'Contacted' ? 'status-contacted' : 'status-enrolled';
      const cleanPhone = inq.phone ? inq.phone.replace(/[^0-9]/g, '') : '';
      const waLink = cleanPhone ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(`Hello ${inq.name}, Coach R.D. Singh from RD Health Club following up on your ${inq.plan} inquiry.`)}` : '#';

      return `
        <tr>
          <td><span style="font-family: var(--admin-font-mono); font-size: 0.8rem; color: var(--admin-text-muted);">${inq.date || 'Recent'}</span></td>
          <td><strong>${escapeHTML(inq.name)}</strong></td>
          <td><a href="tel:${cleanPhone}" style="color: var(--admin-text-main); text-decoration: none;">${escapeHTML(inq.phone)}</a></td>
          <td><span style="color: #fff; font-weight: 500;">${escapeHTML(inq.plan)}</span></td>
          <td>
            <select class="form-select-admin inq-status-select" data-id="${inq.id}" style="padding: 4px 8px; font-size: 0.78rem; width: auto;">
              <option value="New" ${inq.status === 'New' ? 'selected' : ''}>New</option>
              <option value="Contacted" ${inq.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
              <option value="Enrolled" ${inq.status === 'Enrolled' ? 'selected' : ''}>Enrolled</option>
            </select>
          </td>
          <td>
            <div style="display: flex; gap: 8px;">
              <a href="${waLink}" target="_blank" rel="noopener" class="btn-admin btn-admin-primary btn-admin-sm">
                WhatsApp
              </a>
              <button class="btn-admin btn-admin-danger btn-admin-sm inq-delete-btn" data-id="${inq.id}">
                Delete
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Status change handlers
    tbody.querySelectorAll('.inq-status-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        const newStatus = e.target.value;
        const item = this.data.inquiries.find(i => i.id === id);
        if (item) {
          item.status = newStatus;
          saveCMSData(this.data);
          this.showToast(`Inquiry marked as ${newStatus}`);
        }
      });
    });

    // Delete inquiry
    tbody.querySelectorAll('.inq-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (confirm('Delete this inquiry record?')) {
          this.data.inquiries = this.data.inquiries.filter(i => i.id !== id);
          saveCMSData(this.data);
          this.renderInquiriesTable();
          this.showToast('Inquiry removed.');
        }
      });
    });
  }

  // =========================================================================
  // 5. HERO & BRAND COPY
  // =========================================================================
  populateHeroForm() {
    const hero = this.data.hero || {};
    const brand = this.data.brand || {};

    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };

    setVal('brand-name', brand.name);
    setVal('brand-motto', brand.motto);
    setVal('hero-tag', hero.tag);
    setVal('hero-title-1', hero.titleLine1);
    setVal('hero-title-2', hero.titleLine2);
    setVal('hero-sub', hero.subtitle);

    const logoPreview = document.getElementById('preview-brand-logo');
    if (logoPreview && brand.logo) logoPreview.src = brand.logo;

    const athletePreview = document.getElementById('preview-hero-athlete');
    if (athletePreview && hero.athleteImage) athletePreview.src = hero.athleteImage;

    const heroForm = document.getElementById('form-hero-brand');
    if (heroForm) {
      heroForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.data.brand.name = document.getElementById('brand-name').value;
        this.data.brand.motto = document.getElementById('brand-motto').value;
        this.data.hero.tag = document.getElementById('hero-tag').value;
        this.data.hero.titleLine1 = document.getElementById('hero-title-1').value;
        this.data.hero.titleLine2 = document.getElementById('hero-title-2').value;
        this.data.hero.subtitle = document.getElementById('hero-sub').value;

        saveCMSData(this.data);
        this.showToast('Hero & Brand details updated live!');
      });
    }

    // Logo upload
    this.setupImageUploader('input-brand-logo', (base64) => {
      this.data.brand.logo = base64;
      if (logoPreview) logoPreview.src = base64;
      saveCMSData(this.data);
      this.showToast('Logo updated!');
    });

    // Athlete image upload
    this.setupImageUploader('input-hero-athlete', (base64) => {
      this.data.hero.athleteImage = base64;
      if (athletePreview) athletePreview.src = base64;
      saveCMSData(this.data);
      this.showToast('Hero athlete visual updated!');
    });
  }

  // =========================================================================
  // 6. ABOUT & PHILOSOPHY
  // =========================================================================
  populateAboutForm() {
    const about = this.data.about || {};
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };

    setVal('about-title', about.title);
    setVal('about-quote', about.quote);
    setVal('about-author', about.author);
    setVal('about-desc-1', about.description1);
    setVal('about-desc-2', about.description2);

    const form = document.getElementById('form-about');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.data.about.title = document.getElementById('about-title').value;
        this.data.about.quote = document.getElementById('about-quote').value;
        this.data.about.author = document.getElementById('about-author').value;
        this.data.about.description1 = document.getElementById('about-desc-1').value;
        this.data.about.description2 = document.getElementById('about-desc-2').value;

        saveCMSData(this.data);
        this.showToast('About story & philosophy updated live!');
      });
    }
  }

  // =========================================================================
  // 7. MEMBERSHIP PLANS CRUD
  // =========================================================================
  renderMembershipPlans() {
    const container = document.getElementById('admin-plans-grid');
    if (!container) return;

    const plans = this.data.membership.plans || [];

    container.innerHTML = plans.map(plan => `
      <div class="entity-card">
        <div class="entity-card-body">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h4 class="entity-card-title">${escapeHTML(plan.title)}</h4>
              <p class="entity-card-sub">${escapeHTML(plan.subtitle || '')}</p>
            </div>
            ${plan.badgeText ? `<span class="status-badge status-new">${escapeHTML(plan.badgeText)}</span>` : ''}
          </div>

          <div style="margin: 14px 0; font-size: 2.2rem; font-family: var(--admin-font-heading); color: #fff;">
            ₹${escapeHTML(plan.price)} <span style="font-size: 0.85rem; color: var(--admin-text-muted); font-family: var(--admin-font-sans); font-weight: normal;">/ ${escapeHTML(plan.duration || 'Plan')}</span>
          </div>

          <ul style="list-style: none; display: flex; flex-direction: column; gap: 6px; font-size: 0.84rem; color: var(--admin-text-muted); margin-bottom: 16px;">
            ${(plan.features || []).map(f => `<li>• ${escapeHTML(f)}</li>`).join('')}
          </ul>

          <div class="entity-card-actions">
            <button class="btn-admin btn-admin-secondary btn-admin-sm btn-edit-plan" data-id="${plan.id}" style="flex: 1;">
              Edit Plan
            </button>
            <button class="btn-admin btn-admin-danger btn-admin-sm btn-delete-plan" data-id="${plan.id}">
              Delete
            </button>
          </div>
        </div>
      </div>
    `).join('');

    // Bind Edit & Delete buttons
    container.querySelectorAll('.btn-edit-plan').forEach(btn => {
      btn.addEventListener('click', () => this.openEditPlanModal(btn.dataset.id));
    });

    container.querySelectorAll('.btn-delete-plan').forEach(btn => {
      btn.addEventListener('click', () => this.deletePlan(btn.dataset.id));
    });

    // Also populate PT Form
    const pt = this.data.membership.personalTraining || {};
    const ptTitle = document.getElementById('pt-title');
    const ptPrice = document.getElementById('pt-price');
    const ptDesc = document.getElementById('pt-desc');
    if (ptTitle) ptTitle.value = pt.title || '';
    if (ptPrice) ptPrice.value = pt.price || '';
    if (ptDesc) ptDesc.value = pt.description || '';

    const ptForm = document.getElementById('form-pt-banner');
    if (ptForm) {
      ptForm.onsubmit = (e) => {
        e.preventDefault();
        this.data.membership.personalTraining = {
          ...this.data.membership.personalTraining,
          title: ptTitle.value,
          price: ptPrice.value,
          description: ptDesc.value
        };
        saveCMSData(this.data);
        this.showToast('Personal Training banner updated live!');
      };
    }
  }

  openEditPlanModal(planId) {
    const modal = document.getElementById('modal-plan');
    const plan = this.data.membership.plans.find(p => p.id === planId);
    if (!modal || !plan) return;

    document.getElementById('plan-modal-title').textContent = 'Edit Membership Plan';
    document.getElementById('plan-id').value = plan.id;
    document.getElementById('plan-title').value = plan.title;
    document.getElementById('plan-subtitle').value = plan.subtitle || '';
    document.getElementById('plan-price').value = plan.price;
    document.getElementById('plan-duration').value = plan.duration || '';
    document.getElementById('plan-badge').value = plan.badgeText || '';
    document.getElementById('plan-featured').checked = !!plan.featured;
    document.getElementById('plan-features').value = (plan.features || []).join('\n');

    modal.showModal();
  }

  openAddPlanModal() {
    const modal = document.getElementById('modal-plan');
    if (!modal) return;

    document.getElementById('plan-modal-title').textContent = 'Add New Membership Plan';
    document.getElementById('plan-id').value = 'plan-' + Date.now();
    document.getElementById('plan-title').value = '';
    document.getElementById('plan-subtitle').value = '';
    document.getElementById('plan-price').value = '';
    document.getElementById('plan-duration').value = 'Months';
    document.getElementById('plan-badge').value = '';
    document.getElementById('plan-featured').checked = false;
    document.getElementById('plan-features').value = "Full Gym Equipment Access\nMorning & Evening Slot Flexibility\nTrainer Supervision";

    modal.showModal();
  }

  savePlanFromModal(e) {
    e.preventDefault();
    const id = document.getElementById('plan-id').value;
    const title = document.getElementById('plan-title').value.trim();
    const subtitle = document.getElementById('plan-subtitle').value.trim();
    const price = document.getElementById('plan-price').value.trim();
    const duration = document.getElementById('plan-duration').value.trim();
    const badgeText = document.getElementById('plan-badge').value.trim();
    const featured = document.getElementById('plan-featured').checked;
    const featuresRaw = document.getElementById('plan-features').value;
    const features = featuresRaw.split('\n').map(f => f.trim()).filter(Boolean);

    const existingIndex = this.data.membership.plans.findIndex(p => p.id === id);
    const planPayload = {
      id,
      title,
      subtitle,
      price,
      duration,
      badgeText,
      featured,
      features,
      buttonText: `JOIN ${title}`
    };

    if (existingIndex >= 0) {
      this.data.membership.plans[existingIndex] = planPayload;
    } else {
      this.data.membership.plans.push(planPayload);
    }

    saveCMSData(this.data);
    document.getElementById('modal-plan')?.close();
    this.renderMembershipPlans();
    this.showToast(`Plan "${title}" saved successfully!`);
  }

  deletePlan(planId) {
    if (!confirm('Are you sure you want to delete this membership plan?')) return;
    this.data.membership.plans = this.data.membership.plans.filter(p => p.id !== planId);
    saveCMSData(this.data);
    this.renderMembershipPlans();
    this.showToast('Membership plan removed.');
  }

  // =========================================================================
  // 8. TRAINERS & COACHES CRUD
  // =========================================================================
  renderTrainersGrid() {
    const container = document.getElementById('admin-trainers-grid');
    if (!container) return;

    const trainers = this.data.trainers || [];

    container.innerHTML = trainers.map(t => `
      <div class="entity-card">
        <div class="entity-card-media">
          <img src="${escapeHTML(t.image || '/assets/trainer_rd_singh.jpg')}" alt="${escapeHTML(t.name)}" />
          <span class="status-badge status-enrolled" style="position: absolute; top: 12px; right: 12px;">
            ${escapeHTML(t.experience || 'Coach')}
          </span>
        </div>
        <div class="entity-card-body">
          <h4 class="entity-card-title">${escapeHTML(t.name)}</h4>
          <p class="entity-card-sub">${escapeHTML(t.role || 'Trainer')} • ${escapeHTML(t.specialty || '')}</p>
          <p style="font-size: 0.84rem; color: var(--admin-text-muted); margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${escapeHTML(t.bio || '')}
          </p>
          <div class="entity-card-actions">
            <button class="btn-admin btn-admin-secondary btn-admin-sm btn-edit-trainer" data-id="${t.id}" style="flex: 1;">
              Edit Details
            </button>
            <button class="btn-admin btn-admin-danger btn-admin-sm btn-delete-trainer" data-id="${t.id}">
              Delete
            </button>
          </div>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.btn-edit-trainer').forEach(btn => {
      btn.addEventListener('click', () => this.openEditTrainerModal(btn.dataset.id));
    });

    container.querySelectorAll('.btn-delete-trainer').forEach(btn => {
      btn.addEventListener('click', () => this.deleteTrainer(btn.dataset.id));
    });
  }

  openEditTrainerModal(id) {
    const modal = document.getElementById('modal-trainer');
    const trainer = this.data.trainers.find(t => t.id === id);
    if (!modal || !trainer) return;

    document.getElementById('trainer-modal-title').textContent = 'Edit Trainer Details';
    document.getElementById('trainer-id').value = trainer.id;
    document.getElementById('trainer-name').value = trainer.name;
    document.getElementById('trainer-role').value = trainer.role || '';
    document.getElementById('trainer-specialty').value = trainer.specialty || '';
    document.getElementById('trainer-exp').value = trainer.experience || '';
    document.getElementById('trainer-certs').value = trainer.certifications || '';
    document.getElementById('trainer-bio').value = trainer.bio || '';
    document.getElementById('trainer-image-val').value = trainer.image || '';

    const preview = document.getElementById('trainer-img-preview');
    if (preview) preview.src = trainer.image || '/assets/trainer_rd_singh.jpg';

    modal.showModal();
  }

  openAddTrainerModal() {
    const modal = document.getElementById('modal-trainer');
    if (!modal) return;

    document.getElementById('trainer-modal-title').textContent = 'Add New Trainer / Mentor';
    document.getElementById('trainer-id').value = 'tr-' + Date.now();
    document.getElementById('trainer-name').value = '';
    document.getElementById('trainer-role').value = 'Fitness Coach';
    document.getElementById('trainer-specialty').value = 'Hypertrophy & Strength';
    document.getElementById('trainer-exp').value = '3+ Years';
    document.getElementById('trainer-certs').value = 'Certified Personal Trainer';
    document.getElementById('trainer-bio').value = '';
    document.getElementById('trainer-image-val').value = '/assets/gym_coaching.jpg';

    const preview = document.getElementById('trainer-img-preview');
    if (preview) preview.src = '/assets/gym_coaching.jpg';

    modal.showModal();
  }

  saveTrainerFromModal(e) {
    e.preventDefault();
    const id = document.getElementById('trainer-id').value;
    const name = document.getElementById('trainer-name').value.trim();
    const role = document.getElementById('trainer-role').value.trim();
    const specialty = document.getElementById('trainer-specialty').value.trim();
    const experience = document.getElementById('trainer-exp').value.trim();
    const certifications = document.getElementById('trainer-certs').value.trim();
    const bio = document.getElementById('trainer-bio').value.trim();
    const image = document.getElementById('trainer-image-val').value;

    const payload = { id, name, role, specialty, experience, certifications, bio, image };
    const existingIndex = this.data.trainers.findIndex(t => t.id === id);

    if (existingIndex >= 0) {
      this.data.trainers[existingIndex] = payload;
    } else {
      this.data.trainers.push(payload);
    }

    saveCMSData(this.data);
    document.getElementById('modal-trainer')?.close();
    this.renderTrainersGrid();
    this.showToast(`Trainer "${name}" profile saved live!`);
  }

  deleteTrainer(id) {
    if (!confirm('Remove this trainer profile from the website?')) return;
    this.data.trainers = this.data.trainers.filter(t => t.id !== id);
    saveCMSData(this.data);
    this.renderTrainersGrid();
    this.showToast('Trainer profile removed.');
  }

  // =========================================================================
  // 9. FACILITIES & EQUIPMENT CRUD
  // =========================================================================
  renderEquipmentGrid() {
    const container = document.getElementById('admin-equipment-grid');
    if (!container) return;

    const list = this.data.facilities || [];
    container.innerHTML = list.map(item => `
      <div class="entity-card">
        <div class="entity-card-media">
          <img src="${escapeHTML(item.image || '/assets/equipment_weights.jpg')}" alt="${escapeHTML(item.name)}" />
        </div>
        <div class="entity-card-body">
          <h4 class="entity-card-title">${escapeHTML(item.name)}</h4>
          <p style="font-size: 0.84rem; color: var(--admin-text-muted); margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${escapeHTML(item.desc || '')}
          </p>
          <div class="entity-card-actions">
            <button class="btn-admin btn-admin-secondary btn-admin-sm btn-edit-equip" data-id="${item.id}" style="flex: 1;">Edit</button>
            <button class="btn-admin btn-admin-danger btn-admin-sm btn-delete-equip" data-id="${item.id}">Delete</button>
          </div>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.btn-edit-equip').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = list.find(i => i.id === btn.dataset.id);
        if (!item) return;
        document.getElementById('equip-id').value = item.id;
        document.getElementById('equip-name').value = item.name;
        document.getElementById('equip-desc').value = item.desc || '';
        document.getElementById('equip-image-val').value = item.image || '';
        const preview = document.getElementById('equip-img-preview');
        if (preview) preview.src = item.image || '/assets/equipment_weights.jpg';
        document.getElementById('modal-equipment')?.showModal();
      });
    });

    container.querySelectorAll('.btn-delete-equip').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Delete this equipment entry?')) {
          this.data.facilities = this.data.facilities.filter(i => i.id !== btn.dataset.id);
          saveCMSData(this.data);
          this.renderEquipmentGrid();
          this.showToast('Equipment entry deleted.');
        }
      });
    });
  }

  // =========================================================================
  // 10. GALLERY & MEDIA CRUD
  // =========================================================================
  renderGalleryGrid() {
    const container = document.getElementById('admin-gallery-grid');
    if (!container) return;

    const list = this.data.gallery || [];
    container.innerHTML = list.map(item => `
      <div class="entity-card">
        <div class="entity-card-media" style="height: 140px;">
          <img src="${escapeHTML(item.url)}" alt="${escapeHTML(item.title)}" />
        </div>
        <div class="entity-card-body" style="padding: 12px;">
          <h4 style="font-size: 0.92rem; color: #fff; margin-bottom: 8px;">${escapeHTML(item.title)}</h4>
          <button class="btn-admin btn-admin-danger btn-admin-sm btn-delete-gallery" data-id="${item.id}" style="width: 100%;">
            Remove Photo
          </button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.btn-delete-gallery').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Remove this photo from the gym gallery?')) {
          this.data.gallery = this.data.gallery.filter(i => i.id !== btn.dataset.id);
          saveCMSData(this.data);
          this.renderGalleryGrid();
          this.showToast('Gallery photo removed.');
        }
      });
    });
  }

  // =========================================================================
  // 11. REVIEWS & TESTIMONIALS CRUD
  // =========================================================================
  renderReviewsList() {
    const container = document.getElementById('admin-reviews-grid');
    if (!container) return;

    const reviews = this.data.reviews || [];
    container.innerHTML = reviews.map(r => `
      <div class="admin-card" style="margin-bottom: 14px; padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <div>
            <h4 style="font-size: 1.05rem; color: #fff;">${escapeHTML(r.name)}</h4>
            <span style="font-size: 0.8rem; color: var(--admin-red); font-family: var(--admin-font-mono);">${escapeHTML(r.role || 'Member')}</span>
          </div>
          <span style="color: #f59e0b; font-size: 1.1rem;">${'★'.repeat(r.rating || 5)}</span>
        </div>
        <p style="font-size: 0.88rem; color: var(--admin-text-muted); margin-bottom: 14px; font-style: italic;">
          "${escapeHTML(r.comment)}"
        </p>
        <button class="btn-admin btn-admin-danger btn-admin-sm btn-delete-review" data-id="${r.id}">
          Delete Review
        </button>
      </div>
    `).join('');

    container.querySelectorAll('.btn-delete-review').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Delete this member review?')) {
          this.data.reviews = this.data.reviews.filter(r => r.id !== btn.dataset.id);
          saveCMSData(this.data);
          this.renderReviewsList();
          this.showToast('Review deleted.');
        }
      });
    });
  }

  // =========================================================================
  // 12. CONTACT INFORMATION
  // =========================================================================
  populateContactForm() {
    const c = this.data.contact || {};
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };

    setVal('contact-address', c.address);
    setVal('contact-phone', c.phone);
    setVal('contact-whatsapp', c.whatsapp);
    setVal('contact-email', c.email);
    setVal('contact-timings-morning', c.timingsMorning);
    setVal('contact-timings-evening', c.timingsEvening);
    setVal('contact-open-days', c.openDays);

    const form = document.getElementById('form-contact');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.data.contact.address = document.getElementById('contact-address').value;
        this.data.contact.phone = document.getElementById('contact-phone').value;
        this.data.contact.whatsapp = document.getElementById('contact-whatsapp').value;
        this.data.contact.email = document.getElementById('contact-email').value;
        this.data.contact.timingsMorning = document.getElementById('contact-timings-morning').value;
        this.data.contact.timingsEvening = document.getElementById('contact-timings-evening').value;
        this.data.contact.openDays = document.getElementById('contact-open-days').value;

        saveCMSData(this.data);
        this.showToast('Contact and operating hours updated live!');
      });
    }
  }

  // =========================================================================
  // 13. MODALS AND BACKUP SYSTEM
  // =========================================================================
  bindEntityModals() {
    // Plan Modal
    document.getElementById('btn-add-new-plan')?.addEventListener('click', () => this.openAddPlanModal());
    document.getElementById('form-plan-modal')?.addEventListener('submit', (e) => this.savePlanFromModal(e));

    // Trainer Modal
    document.getElementById('btn-add-new-trainer')?.addEventListener('click', () => this.openAddTrainerModal());
    document.getElementById('form-trainer-modal')?.addEventListener('submit', (e) => this.saveTrainerFromModal(e));
    this.setupImageUploader('input-trainer-file', (base64) => {
      document.getElementById('trainer-image-val').value = base64;
      document.getElementById('trainer-img-preview').src = base64;
    });

    // Equipment Modal
    document.getElementById('btn-add-new-equipment')?.addEventListener('click', () => {
      document.getElementById('equip-id').value = 'equip-' + Date.now();
      document.getElementById('equip-name').value = '';
      document.getElementById('equip-desc').value = '';
      document.getElementById('equip-image-val').value = '/assets/equipment_weights.jpg';
      document.getElementById('equip-img-preview').src = '/assets/equipment_weights.jpg';
      document.getElementById('modal-equipment')?.showModal();
    });
    document.getElementById('form-equipment-modal')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('equip-id').value;
      const name = document.getElementById('equip-name').value.trim();
      const desc = document.getElementById('equip-desc').value.trim();
      const image = document.getElementById('equip-image-val').value;
      const idx = this.data.facilities.findIndex(f => f.id === id);
      if (idx >= 0) this.data.facilities[idx] = { id, name, desc, image };
      else this.data.facilities.push({ id, name, desc, image });
      saveCMSData(this.data);
      document.getElementById('modal-equipment')?.close();
      this.renderEquipmentGrid();
      this.showToast(`Equipment "${name}" saved!`);
    });
    this.setupImageUploader('input-equip-file', (base64) => {
      document.getElementById('equip-image-val').value = base64;
      document.getElementById('equip-img-preview').src = base64;
    });

    // Gallery Modal
    document.getElementById('btn-add-new-gallery')?.addEventListener('click', () => {
      document.getElementById('gallery-modal-title').value = '';
      document.getElementById('gallery-image-val').value = '';
      document.getElementById('gallery-img-preview').src = '';
      document.getElementById('modal-gallery')?.showModal();
    });
    document.getElementById('form-gallery-modal')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('gallery-modal-title').value.trim();
      const url = document.getElementById('gallery-image-val').value;
      if (!url) {
        alert('Please select or upload a photo.');
        return;
      }
      this.data.gallery.push({ id: 'g-' + Date.now(), title, url });
      saveCMSData(this.data);
      document.getElementById('modal-gallery')?.close();
      this.renderGalleryGrid();
      this.showToast('Gallery photo added successfully!');
    });
    this.setupImageUploader('input-gallery-file', (base64) => {
      document.getElementById('gallery-image-val').value = base64;
      document.getElementById('gallery-img-preview').src = base64;
    });

    // Review Modal
    document.getElementById('btn-add-new-review')?.addEventListener('click', () => {
      document.getElementById('rev-name').value = '';
      document.getElementById('rev-role').value = 'Member';
      document.getElementById('rev-rating').value = '5';
      document.getElementById('rev-comment').value = '';
      document.getElementById('modal-review')?.showModal();
    });
    document.getElementById('form-review-modal')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('rev-name').value.trim();
      const role = document.getElementById('rev-role').value.trim();
      const rating = parseInt(document.getElementById('rev-rating').value) || 5;
      const comment = document.getElementById('rev-comment').value.trim();
      this.data.reviews.push({ id: 'r-' + Date.now(), name, role, rating, comment });
      saveCMSData(this.data);
      document.getElementById('modal-review')?.close();
      this.renderReviewsList();
      this.showToast('Member review added live!');
    });

    // Modal close buttons
    document.querySelectorAll('.modal-close-btn-admin, .btn-close-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('dialog')?.close();
      });
    });
  }

  bindBackupHandlers() {
    // Download Backup
    const btnDownload = document.getElementById('btn-download-backup');
    if (btnDownload) {
      btnDownload.addEventListener('click', () => {
        const jsonStr = JSON.stringify(this.data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rd-health-club-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('Backup JSON downloaded successfully!');
      });
    }

    // Restore Backup
    const fileInput = document.getElementById('backup-file-input');
    const btnRestore = document.getElementById('btn-restore-backup');
    if (btnRestore && fileInput) {
      btnRestore.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const parsed = JSON.parse(evt.target.result);
            if (!parsed.brand || !parsed.membership) {
              alert('Invalid RD Health Club backup file format.');
              return;
            }
            this.data = parsed;
            saveCMSData(this.data);
            this.populateAllForms();
            this.showToast('Backup data restored and synced successfully!');
          } catch (err) {
            alert('Failed to parse backup JSON file: ' + err.message);
          }
        };
        reader.readAsText(file);
      });
    }

    // Factory Reset
    const btnReset = document.getElementById('btn-reset-factory');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        if (confirm('CAUTION: Reset entire website content back to factory default? Any custom edits will be cleared.')) {
          this.data = resetCMSData();
          this.populateAllForms();
          this.showToast('Content reset to factory defaults.');
        }
      });
    }
  }

  // =========================================================================
  // HELPER: File to Base64 Uploader
  // =========================================================================
  setupImageUploader(inputId, onComplete) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Ensure reasonable size (under 8MB)
      if (file.size > 8 * 1024 * 1024) {
        alert('Image size exceeds 8MB. Please select a smaller photo.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (evt) => {
        onComplete(evt.target.result);
      };
      reader.readAsDataURL(file);
    });
  }

  // =========================================================================
  // TOAST NOTIFICATIONS
  // =========================================================================
  showToast(message) {
    if (!this.toast) return;
    this.toast.textContent = message;
    this.toast.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this.toast.classList.remove('show');
    }, 3200);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new AdminController();
});

function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

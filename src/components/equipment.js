export const defaultEquipmentData = [
  {
    id: 'strength',
    name: 'STRENGTH — POWER RACK',
    tag: 'Heavy Compound Platform',
    title: 'Titan Commercial Power Racks & Olympic Bumper Stations',
    description: 'Engineered for maximal load capacity. Heavy gauge structural steel power cages fitted with precision J-cups, safety spotter arms, multi-grip pull-up bars, and competition calibrated Olympic bumper plates.',
    specs: [
      'Industrial 3x3" 11-Gauge Structural Steel Frames',
      'Calibrated Eleiko & Rogue Olympic Bumper Plates',
      'Laser-Etched Pin Positions & Safety Strap Sub-Systems',
      'Integrated Landmine Attachments & Dip Stations'
    ],
    image: '/assets/equipment_rack.jpg'
  },
  {
    id: 'conditioning',
    name: 'CONDITIONING — CARDIO ZONE',
    tag: 'Aerobic & Fat Burn Hub',
    title: 'High-Performance Treadmills & Stationary Fleet',
    description: 'Fully air-conditioned cardio deck featuring advanced shock-absorption treadmills, magnetic resistance spin bikes, and elliptical trainers with real-time biometric tracking to maximize cardiovascular health and fat loss.',
    specs: [
      'Advanced Cushioning Decks to Protect Knees & Joints',
      'High-Speed Incline Treadmills with Precision Telemetry',
      'Magnetic Flywheel Spin Bikes for High Intensity Intervals',
      'Climate Controlled Air Circulation & Heart Rate Sync'
    ],
    image: '/assets/equipment_cardio.jpg'
  },
  {
    id: 'performance',
    name: 'PERFORMANCE — FREE WEIGHTS',
    tag: 'Pure Hypertrophy Arena',
    title: 'Precision Urethane Dumbbells & Ergonomic Benches',
    description: 'A comprehensive free-weight arsenal spanning 2.5 kg to 50+ kg pairs. Chromed knurled handles, heavy-duty adjustable benches, and EZ-curl bars designed for targeted muscular isolation and pure bodybuilding.',
    specs: [
      'Complete Dumbbell Runs Ranging from 2.5 kg to 50+ kg',
      'Heavy-Duty Multi-Angle Incline/Decline Adjustable Benches',
      'Specialized EZ Curl, Tricep & Trap Hex Barbells',
      'High-Density Impact Absorbing Anti-Slip Flooring'
    ],
    image: '/assets/equipment_weights.jpg'
  }
];

let activeEquipmentList = [...defaultEquipmentData];

export function renderEquipmentFromCMS(facilities) {
  if (Array.isArray(facilities) && facilities.length > 0) {
    activeEquipmentList = facilities.map((f, i) => ({
      id: f.id || `equip-${i}`,
      name: (f.name || 'EQUIPMENT').toUpperCase(),
      tag: 'World-Class Hardware',
      title: f.name || 'Equipment Station',
      description: f.desc || 'Engineered for maximal performance and ergonomic safety.',
      specs: [
        'Commercial Grade High-Tensile Steel',
        'Precision Biomechanical Alignment',
        'Climate Controlled Lifting Environment',
        'Direct Guidance by Coach R.D. Singh'
      ],
      image: f.image || '/assets/equipment_weights.jpg'
    }));
  }
  initEquipment();
}

export function initEquipment() {
  const container = document.querySelector('#facilities');
  if (!container) return;

  const tabsNav = container.querySelector('.equipment-tabs-nav');
  const titleEl = container.querySelector('.equipment-title');
  const tagEl = container.querySelector('.equipment-tag');
  const descEl = container.querySelector('.equipment-desc');
  const specsList = container.querySelector('.equipment-specs-list');
  const imgEl = container.querySelector('.equipment-img');
  const progressBar = container.querySelector('.equipment-progress-bar');

  // Re-build tabs nav dynamically
  if (tabsNav) {
    tabsNav.innerHTML = activeEquipmentList.map((item, idx) => `
      <button class="equipment-tab-btn ${idx === 0 ? 'active' : ''}" data-idx="${idx}">${escapeHTML(item.name)}</button>
    `).join('');
  }

  let currentCategoryIdx = 0;

  function selectCategory(index) {
    if (index < 0 || index >= activeEquipmentList.length) return;
    currentCategoryIdx = index;
    const item = activeEquipmentList[index];
    if (!item) return;

    const allTabs = container.querySelectorAll('.equipment-tab-btn');
    allTabs.forEach((b, i) => b.classList.toggle('active', i === index));

    if (progressBar) {
      progressBar.style.left = `${(index / activeEquipmentList.length) * 100}%`;
    }

    if (titleEl) titleEl.textContent = item.title;
    if (tagEl) tagEl.textContent = item.tag;
    if (descEl) descEl.textContent = item.description;
    if (imgEl) {
      imgEl.style.opacity = '0';
      setTimeout(() => {
        imgEl.src = item.image;
        imgEl.alt = item.title;
        imgEl.style.opacity = '1';
      }, 150);
    }

    if (specsList && item.specs) {
      specsList.innerHTML = item.specs.map(spec => `
        <li class="equipment-spec-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>${escapeHTML(spec)}</span>
        </li>
      `).join('');
    }
  }

  container.querySelectorAll('.equipment-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-idx')) || 0;
      selectCategory(idx);
    });
  });

  // Touch swipe support for mobile sideways swiping
  const panel = container.querySelector('.equipment-showcase-panel');
  if (panel && !panel._hasTouchListener) {
    panel._hasTouchListener = true;
    let touchStartX = 0;
    let touchStartY = 0;

    panel.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    panel.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].screenX;
      const touchEndY = e.changedTouches[0].screenY;
      const diffX = touchEndX - touchStartX;
      const diffY = touchEndY - touchStartY;

      // Only trigger on intentional horizontal swipes (> 40px)
      if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX < 0) {
          // Swipe left -> Next category
          const nextIdx = (currentCategoryIdx + 1) % activeEquipmentList.length;
          selectCategory(nextIdx);
        } else {
          // Swipe right -> Prev category
          const prevIdx = (currentCategoryIdx - 1 + activeEquipmentList.length) % activeEquipmentList.length;
          selectCategory(prevIdx);
        }
      }
    }, { passive: true });
  }

  selectCategory(0);
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

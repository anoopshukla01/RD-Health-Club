export function initStatsCounter() {
  const statsSection = document.querySelector('.potential-stats-grid');
  if (!statsSection) return;

  let animated = false;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !animated) {
        animated = true;
        animateNumber('stat-members', 0, 500, 1800, '+');
        animateDecimal('stat-rating', 0, 4.6, 1500, '★');
        animateNumber('stat-trainer', 0, 1, 1000, '');
      }
    });
  }, { threshold: 0.25 });

  observer.observe(statsSection);
}

function animateNumber(id, start, end, duration, suffix = '') {
  const el = document.getElementById(id);
  if (!el) return;

  const startTime = performance.now();

  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);
    const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = Math.floor(start + (end - start) * ease);

    el.innerHTML = `${current}<span class="red-accent">${suffix}</span>`;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

function animateDecimal(id, start, end, duration, suffix = '') {
  const el = document.getElementById(id);
  if (!el) return;

  const startTime = performance.now();

  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = (start + (end - start) * ease).toFixed(1);

    el.innerHTML = `${current}<span class="red-accent">${suffix}</span>`;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

export function initMotivation() {
  const section = document.querySelector('.motivational-section');
  if (!section) return;

  const line = section.querySelector('.animated-drawing-line');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && line) {
        line.classList.add('draw');
      }
    });
  }, { threshold: 0.4 });

  observer.observe(section);
}

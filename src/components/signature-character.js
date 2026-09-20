export function initSignatureCharacter() {
  const section = document.querySelector('.signature-character-section');
  if (!section) return;

  const lines = section.querySelectorAll('.kinetic-line');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        lines.forEach((line, index) => {
          setTimeout(() => {
            line.classList.add(index === 2 ? 'red-active' : 'active');
          }, index * 400 + 200);
        });
      }
    });
  }, { threshold: 0.35 });

  observer.observe(section);
}

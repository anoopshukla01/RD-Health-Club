/**
 * ScrollyLift Engine
 * Coordinates scroll-driven barbell lifting, particle dust canvas,
 * and Web Audio Olympic weight plate clinking.
 */

import { getCharacter3DInstance } from './character-3d.js';

let audioCtx = null;
let soundEnabled = true;
let hasPlayedClink = false;

// Synthesize an authentic barbell plate metallic impact with Web Audio API
export function playPlateClink() {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // High metallic ping
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1420, now);
    osc1.frequency.exponentialRampToValueAtTime(320, now + 0.35);

    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Deep iron plate clank
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(340, now);
    osc2.frequency.exponentialRampToValueAtTime(110, now + 0.5);

    gain2.gain.setValueAtTime(0.4, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now);
    osc2.stop(now + 0.5);
  } catch (err) {
    console.warn('Audio playback not permitted yet:', err);
  }
}

export function toggleAudio() {
  soundEnabled = !soundEnabled;
  return soundEnabled;
}

export function initScrollyLift() {
  const wrapper = document.querySelector('.hero-scroll-wrapper');
  const stage = document.querySelector('.hero-sticky-stage');
  const modelWrap = document.querySelector('.hero-lifter-model-wrap');
  const poseDown = document.querySelector('.lifter-pose-down');
  const poseUp = document.querySelector('.lifter-pose-up');
  const haloRing = document.querySelector('.hero-halo-ring');
  const copyInitial = document.querySelector('.hero-copy-initial');
  const copyLifted = document.querySelector('.hero-copy-lifted');
  const pillarsInitial = document.querySelector('.hero-pillars-initial');
  const pillarsLifted = document.querySelector('.hero-pillars-lifted');
  const scrollPrompt = document.querySelector('.hero-scroll-prompt');
  const statsBar = document.querySelector('.hero-cinema-stats-bar');
  const hudFill = document.querySelector('.lift-hud-bar-fill');
  const hudPercent = document.querySelector('.lift-hud-percent');
  const hudStatus = document.querySelector('.lift-hud-status');

  if (!wrapper) return;

  let currentScrollProgress = 0;
  let mouseTiltX = 0;
  let mouseTiltY = 0;
  let currentTiltX = 0;
  let currentTiltY = 0;

  // Track mouse movement for interactive 3D perspective tilt
  if (stage) {
    stage.addEventListener('mousemove', (e) => {
      const rect = stage.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      mouseTiltX = x * 14;
      mouseTiltY = -y * 14;
    });

    stage.addEventListener('mouseleave', () => {
      mouseTiltX = 0;
      mouseTiltY = 0;
    });
  }

  function updateLift() {
    const rect = wrapper.getBoundingClientRect();
    const scrollDist = -rect.top;
    const totalScroll = rect.height - window.innerHeight;

    currentScrollProgress = Math.max(0, Math.min(1, scrollDist / (totalScroll || 1)));

    // 1. Scrub 3D character bicep curl
    const p = currentScrollProgress;
    const character3D = getCharacter3DInstance();
    if (character3D) {
      character3D.setScrollProgress(p);
    }
    
    if (poseDown && poseUp) {
      // Down pose moves subtly and fades out smoothly as bar ascends
      const downOpacity = Math.max(0, 1 - p * 1.8);
      const downTranslateY = p * -25;
      poseDown.style.opacity = downOpacity.toFixed(3);
      poseDown.style.transform = `translate3d(0, ${downTranslateY.toFixed(1)}px, 0) scale(${(1 + p * 0.03).toFixed(3)})`;

      // Up pose locks out and fades in
      const upOpacity = Math.min(1, Math.max(0, (p - 0.2) / 0.6));
      const upTranslateY = (1 - p) * 20;
      poseUp.style.opacity = upOpacity.toFixed(3);
      poseUp.style.transform = `translate3d(0, ${upTranslateY.toFixed(1)}px, 0) scale(${(1.02 - (1 - p) * 0.02).toFixed(3)})`;
    }

    // 2. Neon Red Halo Ring ignition
    if (haloRing) {
      const haloOpacity = Math.min(1, Math.max(0, (p - 0.3) / 0.55));
      const haloScale = 0.7 + haloOpacity * 0.35;
      haloRing.style.opacity = haloOpacity.toFixed(3);
      haloRing.style.transform = `translate(-50%, -50%) scale(${haloScale.toFixed(3)})`;
    }

    // 3. Left copy transition: 'TRAIN HARDER' -> 'STRENGTH BUILDS FREEDOM'
    if (copyInitial && copyLifted) {
      const initOp = Math.max(0, 1 - p * 2.2);
      const liftOp = Math.min(1, Math.max(0, (p - 0.4) * 2.0));
      copyInitial.style.opacity = initOp.toFixed(3);
      copyInitial.style.transform = `translateY(calc(-50% - ${(p * 25).toFixed(1)}px))`;
      copyInitial.style.pointerEvents = p < 0.4 ? 'auto' : 'none';

      copyLifted.style.opacity = liftOp.toFixed(3);
      copyLifted.style.transform = `translateY(calc(-50% + ${((1 - p) * 25).toFixed(1)}px))`;
      copyLifted.style.pointerEvents = p >= 0.4 ? 'auto' : 'none';
    }

    // 4. Right copy transition: 3 Pillars -> Lifestyle Quote
    if (pillarsInitial && pillarsLifted) {
      const initOp = Math.max(0, 1 - p * 2.2);
      const liftOp = Math.min(1, Math.max(0, (p - 0.4) * 2.0));
      pillarsInitial.style.opacity = initOp.toFixed(3);
      pillarsLifted.style.opacity = liftOp.toFixed(3);
      pillarsLifted.style.transform = `translateY(calc(-50% + ${((1 - p) * 20).toFixed(1)}px))`;
    }

    // 5. Scroll prompt hint
    if (scrollPrompt) {
      const promptOp = Math.max(0, 1 - p * 3.5);
      scrollPrompt.style.opacity = promptOp.toFixed(3);
      scrollPrompt.style.transform = `translateX(-50%) translateY(${(p * 20).toFixed(1)}px)`;
    }

    // 6. Bottom Cinema Stats Bar reveal
    if (statsBar) {
      const statsP = Math.min(1, Math.max(0, (p - 0.55) / 0.35));
      statsBar.style.opacity = statsP.toFixed(3);
      statsBar.style.transform = `translate(-50%, ${((1 - statsP) * 25).toFixed(1)}px)`;
      statsBar.style.pointerEvents = statsP > 0.5 ? 'auto' : 'none';
    }

    // 7. Update HUD
    const pct = Math.round(p * 100);
    if (hudFill) hudFill.style.width = `${pct}%`;
    if (hudPercent) hudPercent.textContent = `${pct}%`;

    if (hudStatus) {
      if (pct >= 85) {
        hudStatus.textContent = 'REP LOCKED! MAXIMUM EFFORT';
        hudStatus.style.color = '#ff1f24';
        if (!hasPlayedClink) {
          playPlateClink();
          hasPlayedClink = true;
        }
      } else if (pct >= 45) {
        hudStatus.textContent = 'EXPLODING THROUGH POWER PEAK';
        hudStatus.style.color = '#ff6b6b';
        hasPlayedClink = false;
      } else if (pct > 5) {
        hudStatus.textContent = 'ENGAGING CORE & VASCULAR DRIVE';
        hudStatus.style.color = '#ffffff';
        hasPlayedClink = false;
      } else {
        hudStatus.textContent = 'READY TO LIFT — SCROLL DOWN';
        hudStatus.style.color = 'var(--red-primary)';
        hasPlayedClink = false;
      }
    }
  }

  // Animation frame loop for silky 3D perspective mouse tilt
  function animLoop() {
    currentTiltX += (mouseTiltX - currentTiltX) * 0.08;
    currentTiltY += (mouseTiltY - currentTiltY) * 0.08;

    if (modelWrap) {
      modelWrap.style.transform = `perspective(1200px) rotateY(${currentTiltX.toFixed(2)}deg) rotateX(${currentTiltY.toFixed(2)}deg)`;
    }

    requestAnimationFrame(animLoop);
  }

  window.addEventListener('scroll', updateLift, { passive: true });
  updateLift();
  animLoop();

  // Mobile: touch drag on hero section scrubs the barbell animation
  // (finger drag up = scroll down = lift progress increases)
  let heroTouchStartY = 0;
  let heroTouchBaseProgress = 0;
  const heroWrap = document.querySelector('.hero-scroll-wrapper');
  if (heroWrap) {
    heroWrap.addEventListener('touchstart', (e) => {
      heroTouchStartY = e.touches[0].clientY;
      heroTouchBaseProgress = currentScrollProgress;
    }, { passive: true });

    heroWrap.addEventListener('touchmove', (e) => {
      const dy = heroTouchStartY - e.touches[0].clientY; // positive = drag up
      const sensitivity = 0.0015; // smooth mobile drag scrubbing
      const newProgress = Math.max(0, Math.min(1, heroTouchBaseProgress + dy * sensitivity));
      currentScrollProgress = newProgress;

      const character3D = getCharacter3DInstance();
      if (character3D) character3D.setScrollProgress(newProgress);

      // Drive all visual states from touch synchronously
      const p = newProgress;
      if (poseDown && poseUp) {
        poseDown.style.opacity = Math.max(0, 1 - p * 1.8).toFixed(3);
        poseDown.style.transform = `translate3d(0, ${(p * -25).toFixed(1)}px, 0) scale(${(1 + p * 0.03).toFixed(3)})`;
        poseUp.style.opacity = Math.min(1, Math.max(0, (p - 0.2) / 0.6)).toFixed(3);
        poseUp.style.transform = `translate3d(0, ${((1 - p) * 20).toFixed(1)}px, 0) scale(${(1.02 - (1 - p) * 0.02).toFixed(3)})`;
      }
      if (haloRing) {
        const haloOpacity = Math.min(1, Math.max(0, (p - 0.3) / 0.55));
        haloRing.style.opacity = haloOpacity.toFixed(3);
        haloRing.style.transform = `translate(-50%, -50%) scale(${(0.7 + haloOpacity * 0.35).toFixed(3)})`;
      }
      if (copyInitial && copyLifted) {
        const initOp = Math.max(0, 1 - p * 2.2);
        const liftOp = Math.min(1, Math.max(0, (p - 0.4) * 2.0));
        copyInitial.style.opacity = initOp.toFixed(3);
        copyInitial.style.pointerEvents = p < 0.4 ? 'auto' : 'none';
        copyLifted.style.opacity = liftOp.toFixed(3);
        copyLifted.style.pointerEvents = p >= 0.4 ? 'auto' : 'none';
      }
      if (scrollPrompt) {
        const promptOp = Math.max(0, 1 - p * 3.5);
        scrollPrompt.style.opacity = promptOp.toFixed(3);
      }
      if (statsBar) {
        const statsP = Math.min(1, Math.max(0, (p - 0.55) / 0.35));
        statsBar.style.opacity = statsP.toFixed(3);
        statsBar.style.transform = `translate(-50%, ${((1 - statsP) * 25).toFixed(1)}px)`;
        statsBar.style.pointerEvents = statsP > 0.5 ? 'auto' : 'none';
      }
      const pct = Math.round(p * 100);
      if (hudFill) hudFill.style.width = `${pct}%`;
      if (hudPercent) hudPercent.textContent = `${pct}%`;
      if (hudStatus) {
        if (pct >= 85) {
          hudStatus.textContent = 'REP LOCKED! MAXIMUM EFFORT';
          hudStatus.style.color = '#ff1f24';
          if (!hasPlayedClink) {
            playPlateClink();
            hasPlayedClink = true;
          }
        } else if (pct >= 45) {
          hudStatus.textContent = 'EXPLODING THROUGH POWER PEAK';
          hudStatus.style.color = '#ff6b6b';
          hasPlayedClink = false;
        } else if (pct > 5) {
          hudStatus.textContent = 'ENGAGING CORE & VASCULAR DRIVE';
          hudStatus.style.color = '#ffffff';
          hasPlayedClink = false;
        } else {
          hudStatus.textContent = 'READY TO LIFT — SCROLL DOWN';
          hudStatus.style.color = 'var(--red-primary)';
          hasPlayedClink = false;
        }
      }
    }, { passive: true });
  }

  // Floating chalk dust & ember sparks canvas
  initDustCanvas();
}

function initDustCanvas() {
  const canvas = document.querySelector('.hero-particles-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const isMobile = window.innerWidth <= 768;
  const count = isMobile ? 22 : 45;
  const particles = [];

  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2.2 + 0.6,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -Math.random() * 0.5 - 0.2,
      opacity: Math.random() * 0.6 + 0.2,
      isRed: Math.random() > 0.8
    });
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    for (let p of particles) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.y < 0) {
        p.y = height;
        p.x = Math.random() * width;
      }
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.isRed
        ? `rgba(255, 31, 36, ${p.opacity * 0.7})`
        : `rgba(240, 240, 245, ${p.opacity * 0.5})`;
      ctx.fill();
    }

    requestAnimationFrame(render);
  }

  render();
}

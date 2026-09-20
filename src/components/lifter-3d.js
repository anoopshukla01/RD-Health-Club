import * as THREE from 'three';
import { playPlateClink } from './scrolly-lift.js';

let scene, camera, renderer;
let lifterGroup, torsoGroup, leftShoulderPivot, rightShoulderPivot;
let leftElbowPivot, rightElbowPivot, leftForearm, rightForearm;
let barbellGroup, groundShadowMesh;
let leftRimLight, rightRimLight, keyLight;
let animFrameId = null;
let isVisible = true;
let currentProgress = 0;
let targetProgress = 0;
let mouseX = 0;
let mouseY = 0;
let hasLockedOut = false;

// Check WebGL availability
function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

export function initLifter3D() {
  const container = document.getElementById('lifter-3d-stage');
  const canvas = document.getElementById('lifter-3d-canvas');
  const fallback = document.getElementById('lifter-fallback');

  if (!container || !canvas) return;

  if (!isWebGLAvailable()) {
    console.warn('WebGL unavailable, falling back to static character.');
    if (fallback) fallback.style.display = 'block';
    if (canvas) canvas.style.display = 'none';
    return;
  }

  try {
    setupScene(canvas, container);
    buildCharacter();
    setupLighting();
    setupScrollAndMouse(container);
    setupResize(container);

    // Initial render & loop
    animate();
  } catch (err) {
    console.error('Failed to initialize 3D Lifter:', err);
    if (fallback) fallback.style.display = 'block';
    if (canvas) canvas.style.display = 'none';
  }
}

function setupScene(canvas, container) {
  const width = container.clientWidth || 800;
  const height = container.clientHeight || 500;

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x080809, 0.035);

  // Camera: tuned for tight, space-filling framing
  const aspect = width / height;
  const fov = width < 768 ? 44 : 36;
  camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 50);
  camera.position.set(0, 0.85, 3.8);

  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });

  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Track visibility with IntersectionObserver to pause rendering when offscreen
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      isVisible = entry.isIntersecting;
    });
  }, { threshold: 0.05 });
  observer.observe(container);
}

function setupLighting() {
  // Ambient fill
  const ambient = new THREE.AmbientLight(0x14141c, 1.4);
  scene.add(ambient);

  // White key light from top-front
  keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
  keyLight.position.set(1.5, 4.0, 3.5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  keyLight.shadow.bias = -0.001;
  scene.add(keyLight);

  // Intense Crimson Red Rim Light 1 (Left Behind)
  leftRimLight = new THREE.PointLight(0xff1f24, 7.5, 16);
  leftRimLight.position.set(-3.2, 1.8, -2.2);
  scene.add(leftRimLight);

  // Intense Crimson Red Rim Light 2 (Right Behind)
  rightRimLight = new THREE.PointLight(0xff1f24, 7.5, 16);
  rightRimLight.position.set(3.2, 1.8, -2.2);
  scene.add(rightRimLight);

  // Front soft red under-glow
  const underGlow = new THREE.PointLight(0xff1f24, 3.0, 10);
  underGlow.position.set(0, -1.2, 1.5);
  scene.add(underGlow);
}

function buildCharacter() {
  lifterGroup = new THREE.Group();
  lifterGroup.position.set(0, -0.45, 0);
  scene.add(lifterGroup);

  // PBR Brand Materials: 70% dark carbon/chrome, 20% white/steel, 10% crimson red
  const skinMaterial = new THREE.MeshStandardMaterial({
    color: 0x16161c,
    roughness: 0.32,
    metalness: 0.65,
    emissive: 0x1b0405
  });

  const muscleHighlightMat = new THREE.MeshStandardMaterial({
    color: 0x22222a,
    roughness: 0.26,
    metalness: 0.72,
    emissive: 0x330507
  });

  const chromeBarbellMat = new THREE.MeshStandardMaterial({
    color: 0xf5f5fa,
    roughness: 0.12,
    metalness: 0.98
  });

  const knurlMat = new THREE.MeshStandardMaterial({
    color: 0xd0d0d8,
    roughness: 0.38,
    metalness: 0.88
  });

  const plateBlackMat = new THREE.MeshStandardMaterial({
    color: 0x111114,
    roughness: 0.55,
    metalness: 0.28
  });

  const plateRedRingMat = new THREE.MeshStandardMaterial({
    color: 0xff1f24,
    roughness: 0.25,
    metalness: 0.5,
    emissive: 0x880e12
  });

  const collarClampMat = new THREE.MeshStandardMaterial({
    color: 0xe01217,
    roughness: 0.2,
    metalness: 0.85
  });

  const shortsMaterial = new THREE.MeshStandardMaterial({
    color: 0x09090b,
    roughness: 0.85,
    metalness: 0.15
  });

  // =========================================
  // TORSO & CORE (Broad athletic V-Taper)
  // =========================================
  torsoGroup = new THREE.Group();
  lifterGroup.add(torsoGroup);

  // Main Ribcage & Thorax
  const thoraxGeo = new THREE.CylinderGeometry(0.88, 0.64, 1.15, 16);
  const thorax = new THREE.Mesh(thoraxGeo, skinMaterial);
  thorax.position.set(0, 0.78, 0);
  thorax.scale.set(1.22, 1.0, 0.75);
  thorax.castShadow = true;
  torsoGroup.add(thorax);

  // Sculpted Pectorals (Left & Right)
  const pecGeo = new THREE.BoxGeometry(0.56, 0.44, 0.34);
  pecGeo.translate(0, 0, 0.12);

  const leftPec = new THREE.Mesh(pecGeo, muscleHighlightMat);
  leftPec.position.set(-0.35, 1.02, 0.28);
  leftPec.rotation.set(-0.12, 0.18, 0.08);
  leftPec.castShadow = true;
  torsoGroup.add(leftPec);

  const rightPec = new THREE.Mesh(pecGeo, muscleHighlightMat);
  rightPec.position.set(0.35, 1.02, 0.28);
  rightPec.rotation.set(-0.12, -0.18, -0.08);
  rightPec.castShadow = true;
  torsoGroup.add(rightPec);

  // 6-Pack Abdominals
  const absGroup = new THREE.Group();
  absGroup.position.set(0, 0.48, 0.3);
  torsoGroup.add(absGroup);

  const abRowHeights = [0.24, 0.06, -0.12];
  abRowHeights.forEach((yPos, idx) => {
    const scaleFactor = 1.0 - idx * 0.08;
    const leftAb = new THREE.Mesh(
      new THREE.BoxGeometry(0.24 * scaleFactor, 0.14, 0.14),
      muscleHighlightMat
    );
    leftAb.position.set(-0.16 * scaleFactor, yPos, 0);
    leftAb.rotation.y = 0.1;
    absGroup.add(leftAb);

    const rightAb = new THREE.Mesh(
      new THREE.BoxGeometry(0.24 * scaleFactor, 0.14, 0.14),
      muscleHighlightMat
    );
    rightAb.position.set(0.16 * scaleFactor, yPos, 0);
    rightAb.rotation.y = -0.1;
    absGroup.add(rightAb);
  });

  // Latissimus Dorsi (V-Taper wings)
  const latsGeo = new THREE.ConeGeometry(0.68, 1.1, 8);
  const leftLat = new THREE.Mesh(latsGeo, skinMaterial);
  leftLat.position.set(-0.72, 0.72, -0.05);
  leftLat.rotation.set(0, 0, -0.38);
  torsoGroup.add(leftLat);

  const rightLat = new THREE.Mesh(latsGeo, skinMaterial);
  rightLat.position.set(0.72, 0.72, -0.05);
  rightLat.rotation.set(0, 0, 0.38);
  torsoGroup.add(rightLat);

  // Trapezius & Muscular Neck
  const neckGeo = new THREE.CylinderGeometry(0.26, 0.32, 0.42, 12);
  const neck = new THREE.Mesh(neckGeo, skinMaterial);
  neck.position.set(0, 1.42, 0.04);
  torsoGroup.add(neck);

  const trapGeo = new THREE.BoxGeometry(0.9, 0.28, 0.42);
  const traps = new THREE.Mesh(trapGeo, skinMaterial);
  traps.position.set(0, 1.34, -0.06);
  traps.rotation.x = -0.1;
  torsoGroup.add(traps);

  // Athletic Head & Jawline
  const headGeo = new THREE.BoxGeometry(0.38, 0.46, 0.42);
  const head = new THREE.Mesh(headGeo, skinMaterial);
  head.position.set(0, 1.76, 0.08);
  head.castShadow = true;
  torsoGroup.add(head);

  // Stylized Hair
  const hairGeo = new THREE.BoxGeometry(0.42, 0.22, 0.46);
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: 0.9 });
  const hair = new THREE.Mesh(hairGeo, hairMat);
  hair.position.set(0, 1.96, 0.06);
  torsoGroup.add(hair);

  // Athletic Gym Shorts & Pelvis
  const pelvisGeo = new THREE.CylinderGeometry(0.62, 0.58, 0.52, 16);
  const pelvis = new THREE.Mesh(pelvisGeo, shortsMaterial);
  pelvis.position.set(0, 0.05, 0);
  pelvis.scale.set(1.15, 1.0, 0.72);
  lifterGroup.add(pelvis);

  // Upper Thighs in stance
  const legGeo = new THREE.CylinderGeometry(0.28, 0.22, 0.7, 12);
  const leftLeg = new THREE.Mesh(legGeo, shortsMaterial);
  leftLeg.position.set(-0.35, -0.4, 0);
  leftLeg.rotation.z = 0.08;
  lifterGroup.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, shortsMaterial);
  rightLeg.position.set(0.35, -0.4, 0);
  rightLeg.rotation.z = -0.08;
  lifterGroup.add(rightLeg);

  // =========================================
  // ARTICULATED ARMS (Shoulder -> Bicep -> Elbow -> Forearm -> Hands)
  // =========================================
  const shoulderX = 1.06;
  const shoulderY = 1.32;

  // Left Arm Chain
  leftShoulderPivot = new THREE.Group();
  leftShoulderPivot.position.set(-shoulderX, shoulderY, 0);
  lifterGroup.add(leftShoulderPivot);

  const deltGeo = new THREE.SphereGeometry(0.36, 16, 16);
  deltGeo.scale(1.1, 1.25, 1.0);
  const leftDelt = new THREE.Mesh(deltGeo, muscleHighlightMat);
  leftDelt.castShadow = true;
  leftShoulderPivot.add(leftDelt);

  const bicepGeo = new THREE.CylinderGeometry(0.22, 0.19, 0.65, 14);
  bicepGeo.translate(0, -0.32, 0);
  const leftUpperArm = new THREE.Mesh(bicepGeo, skinMaterial);
  leftUpperArm.castShadow = true;
  leftShoulderPivot.add(leftUpperArm);

  leftElbowPivot = new THREE.Group();
  leftElbowPivot.position.set(0, -0.65, 0);
  leftShoulderPivot.add(leftElbowPivot);

  const forearmGeo = new THREE.CylinderGeometry(0.18, 0.15, 0.62, 12);
  forearmGeo.translate(0, -0.31, 0);
  leftForearm = new THREE.Mesh(forearmGeo, muscleHighlightMat);
  leftForearm.castShadow = true;
  leftElbowPivot.add(leftForearm);

  const handGeo = new THREE.BoxGeometry(0.16, 0.18, 0.2);
  handGeo.translate(0, -0.66, 0);
  const leftHand = new THREE.Mesh(handGeo, skinMaterial);
  leftElbowPivot.add(leftHand);

  // Right Arm Chain
  rightShoulderPivot = new THREE.Group();
  rightShoulderPivot.position.set(shoulderX, shoulderY, 0);
  lifterGroup.add(rightShoulderPivot);

  const rightDelt = new THREE.Mesh(deltGeo, muscleHighlightMat);
  rightDelt.castShadow = true;
  rightShoulderPivot.add(rightDelt);

  const rightUpperArm = new THREE.Mesh(bicepGeo, skinMaterial);
  rightUpperArm.castShadow = true;
  rightShoulderPivot.add(rightUpperArm);

  rightElbowPivot = new THREE.Group();
  rightElbowPivot.position.set(0, -0.65, 0);
  rightShoulderPivot.add(rightElbowPivot);

  rightForearm = new THREE.Mesh(forearmGeo, muscleHighlightMat);
  rightForearm.castShadow = true;
  rightElbowPivot.add(rightForearm);

  const rightHand = new THREE.Mesh(handGeo, skinMaterial);
  rightElbowPivot.add(rightHand);

  // =========================================
  // OLYMPIC BARBELL & BUMPER PLATES
  // (Fills horizontal space with Olympic scale)
  // =========================================
  barbellGroup = new THREE.Group();
  lifterGroup.add(barbellGroup);

  // Central Knurled Olympic Bar (Length: 4.4 units, thick competition steel)
  const barGeo = new THREE.CylinderGeometry(0.046, 0.046, 4.4, 24);
  barGeo.rotateZ(Math.PI / 2);
  const barbellBar = new THREE.Mesh(barGeo, knurlMat);
  barbellBar.castShadow = true;
  barbellGroup.add(barbellBar);

  // Rotating Chrome Sleeves on Left & Right ends
  const sleeveGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.9, 20);
  sleeveGeo.rotateZ(Math.PI / 2);

  const leftSleeve = new THREE.Mesh(sleeveGeo, chromeBarbellMat);
  leftSleeve.position.x = -1.65;
  barbellGroup.add(leftSleeve);

  const rightSleeve = new THREE.Mesh(sleeveGeo, chromeBarbellMat);
  rightSleeve.position.x = 1.65;
  barbellGroup.add(rightSleeve);

  // Bumper Plates Builder
  function createPlateStack(xOffset, isLeft) {
    const stack = new THREE.Group();
    stack.position.x = xOffset;

    // 25kg Heavy Competition Plate (Large, black with red outer rim)
    const p1Geo = new THREE.CylinderGeometry(0.68, 0.68, 0.09, 32);
    p1Geo.rotateZ(Math.PI / 2);
    const p1 = new THREE.Mesh(p1Geo, plateBlackMat);
    p1.castShadow = true;
    stack.add(p1);

    // Red Rim Accent Ring
    const ringGeo = new THREE.TorusGeometry(0.67, 0.024, 12, 32);
    ringGeo.rotateY(Math.PI / 2);
    const redRing = new THREE.Mesh(ringGeo, plateRedRingMat);
    stack.add(redRing);

    // 20kg Plate (Slightly narrower)
    const p2Geo = new THREE.CylinderGeometry(0.64, 0.64, 0.08, 32);
    p2Geo.rotateZ(Math.PI / 2);
    const p2 = new THREE.Mesh(p2Geo, plateBlackMat);
    p2.position.x = isLeft ? -0.11 : 0.11;
    p2.castShadow = true;
    stack.add(p2);

    const redRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.63, 0.02, 12, 32), plateRedRingMat);
    redRing2.rotateY(Math.PI / 2);
    redRing2.position.x = isLeft ? -0.11 : 0.11;
    stack.add(redRing2);

    // 15kg Plate
    const p3Geo = new THREE.CylinderGeometry(0.56, 0.56, 0.07, 32);
    p3Geo.rotateZ(Math.PI / 2);
    const p3 = new THREE.Mesh(p3Geo, plateBlackMat);
    p3.position.x = isLeft ? -0.21 : 0.21;
    p3.castShadow = true;
    stack.add(p3);

    // Chrome Quick-Release Olympic Collar
    const collarGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.05, 16);
    collarGeo.rotateZ(Math.PI / 2);
    const collar = new THREE.Mesh(collarGeo, collarClampMat);
    collar.position.x = isLeft ? -0.28 : 0.28;
    stack.add(collar);

    return stack;
  }

  barbellGroup.add(createPlateStack(-1.52, true));
  barbellGroup.add(createPlateStack(1.52, false));

  // Ground dynamic reflection shadow disc
  const shadowGeo = new THREE.PlaneGeometry(3.6, 2.2);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.65
  });
  groundShadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  groundShadowMesh.rotation.x = -Math.PI / 2;
  groundShadowMesh.position.set(0, -0.76, 0.2);
  scene.add(groundShadowMesh);
}

// =========================================
// SCROLL SCRUBBING KINEMATICS ENGINE
// 1:1 Bidirectional sync:
// 0.0: Barbell at waist level (starting curl/ready)
// 0.5: Barbell at chest/clavicle level (peak bicep curl & front rack)
// 1.0: Full skyward overhead extension lockout!
// =========================================
function updateLiftPose(t) {
  if (!barbellGroup || !leftShoulderPivot || !rightShoulderPivot) return;

  // Clamped progress
  const progress = Math.max(0, Math.min(1, t));

  // 1. Barbell Y & Z trajectories
  // At t=0: y = 0.05 (waist), z = 0.58
  // At t=0.45: y = 1.18 (upper chest/clavicle), z = 0.44
  // At t=1.0: y = 2.48 (overhead lockout), z = 0.02
  let barY, barZ;
  if (progress <= 0.45) {
    const subT = progress / 0.45;
    // Ease-in curl to chest
    barY = THREE.MathUtils.lerp(0.05, 1.18, subT);
    barZ = THREE.MathUtils.lerp(0.58, 0.44, subT);
  } else {
    const subT = (progress - 0.45) / 0.55;
    // Overhead press trajectory
    barY = THREE.MathUtils.lerp(1.18, 2.48, subT);
    barZ = THREE.MathUtils.lerp(0.44, 0.02, subT);
  }

  barbellGroup.position.set(0, barY, barZ);

  // 2. Arms Kinematics
  // Shoulder rotation forward/upward
  let shoulderRotX, elbowRotX;
  if (progress <= 0.45) {
    const subT = progress / 0.45;
    shoulderRotX = THREE.MathUtils.lerp(0.22, -0.72, subT);
    elbowRotX = THREE.MathUtils.lerp(-0.45, -2.25, subT); // Bicep curls up tightly
  } else {
    const subT = (progress - 0.45) / 0.55;
    shoulderRotX = THREE.MathUtils.lerp(-0.72, -2.85, subT); // Presses overhead
    elbowRotX = THREE.MathUtils.lerp(-2.25, -0.12, subT);    // Elbows lock out overhead
  }

  leftShoulderPivot.rotation.set(shoulderRotX, 0.12, -0.15);
  rightShoulderPivot.rotation.set(shoulderRotX, -0.12, 0.15);

  leftElbowPivot.rotation.set(elbowRotX, 0, 0);
  rightElbowPivot.rotation.set(elbowRotX, 0, 0);

  // Torso subtle arching under heavy overhead press load
  const torsoArch = Math.sin(progress * Math.PI) * 0.08;
  torsoGroup.rotation.x = -torsoArch;

  // 3. Camera elevation compensation (keeps overhead barbell framed with zero clipping!)
  const targetCamY = THREE.MathUtils.lerp(0.85, 1.35, progress);
  const targetCamZ = THREE.MathUtils.lerp(3.8, 3.95, progress);
  camera.position.y = targetCamY;
  camera.position.z = targetCamZ;
  camera.lookAt(0, THREE.MathUtils.lerp(0.75, 1.25, progress), 0);

  // 4. Rim light pulse & shadow intensity
  if (leftRimLight && rightRimLight) {
    const rimIntensity = 6.5 + progress * 5.0;
    leftRimLight.intensity = rimIntensity;
    rightRimLight.intensity = rimIntensity;
  }

  if (groundShadowMesh) {
    groundShadowMesh.material.opacity = THREE.MathUtils.lerp(0.65, 0.25, progress);
    const shadowScale = THREE.MathUtils.lerp(1.0, 1.35, progress);
    groundShadowMesh.scale.set(shadowScale, shadowScale, 1);
  }

  // 5. Trigger Olympic metallic plate clink on full overhead extension lockout
  if (progress >= 0.95 && !hasLockedOut) {
    playPlateClink();
    hasLockedOut = true;
  } else if (progress < 0.85) {
    hasLockedOut = false;
  }

  // 6. Update HUD indicators
  updateHUD(progress);
}

function updateHUD(progress) {
  const hudFill = document.querySelector('.lift-hud-bar-fill');
  const hudPercent = document.querySelector('.lift-hud-percent');
  const hudStatus = document.querySelector('.lift-hud-status');

  const pct = Math.round(progress * 100);
  if (hudFill) hudFill.style.width = `${pct}%`;
  if (hudPercent) hudPercent.textContent = `${pct}%`;

  if (hudStatus) {
    if (pct >= 95) {
      hudStatus.textContent = 'REP LOCKED! OVERHEAD EXTENSION';
      hudStatus.style.color = '#ff1f24';
    } else if (pct >= 45) {
      hudStatus.textContent = 'EXPLODING THROUGH CHEST DRIVE';
      hudStatus.style.color = '#ff6b6b';
    } else if (pct > 5) {
      hudStatus.textContent = 'ENGAGING BICEPS & CORE';
      hudStatus.style.color = '#ffffff';
    } else {
      hudStatus.textContent = 'READY TO LIFT — SCROLL DOWN';
      hudStatus.style.color = 'var(--red-primary)';
    }
  }
}

function setupScrollAndMouse(container) {
  const wrapper = document.querySelector('.hero-scroll-wrapper');
  if (!wrapper) return;

  function onScroll() {
    const rect = wrapper.getBoundingClientRect();
    const scrollDist = -rect.top;
    const totalScroll = rect.height - window.innerHeight;

    if (totalScroll > 0) {
      targetProgress = Math.max(0, Math.min(1, scrollDist / totalScroll));
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Subtle interactive 3D parallax on mouse movement
  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });
}

function setupResize(container) {
  window.addEventListener('resize', () => {
    if (!renderer || !camera || !container) return;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    camera.aspect = width / height;
    camera.fov = width < 768 ? 44 : 36;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  });
}

function animate() {
  animFrameId = requestAnimationFrame(animate);

  if (!isVisible) return;

  // Smooth lerp to scroll target for zero-jitter, fluid scrubbing
  currentProgress = THREE.MathUtils.lerp(currentProgress, targetProgress, 0.12);
  updateLiftPose(currentProgress);

  // Subtle natural 3D breathing & mouse parallax
  if (lifterGroup) {
    const targetRotY = mouseX * 0.14;
    const targetRotX = mouseY * 0.06;
    lifterGroup.rotation.y = THREE.MathUtils.lerp(lifterGroup.rotation.y, targetRotY, 0.08);
    lifterGroup.rotation.x = THREE.MathUtils.lerp(lifterGroup.rotation.x, targetRotX, 0.08);
  }

  renderer.render(scene, camera);
}

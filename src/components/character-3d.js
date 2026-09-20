/**
 * RD HEALTH CLUB - 3D Photorealistic Lifter Engine
 * Interactive Three.js 3D depth-mapped character based on the user's reference lifter.
 * Performs a realistic barbell bicep curl synchronized with scroll progress.
 * Real 3D depth displacement, dynamic red rim lighting, mouse + touch parallax.
 *
 * FIXED:
 * - Mobile touch parallax (touchmove → tilt effect)
 * - Lower geometry resolution on mobile for GPU performance
 * - Pixel ratio cap at 1.5 on mobile (vs 2 on desktop)
 * - Proper canvas sizing using getBoundingClientRect()
 * - Idle breathing animation when no scroll/touch activity
 * - IntersectionObserver threshold raised so animation doesn't cut out early
 * - Touch-driven scroll progress on mobile (finger drag = scrub animation)
 */

import * as THREE from 'three';

const IS_MOBILE = () => window.innerWidth <= 768;

export class Character3DViewer {
  constructor(canvasId = 'hero-character-3d-canvas') {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.mesh = null;
    this.material = null;
    this.textures = {};

    this.scrollProgress = 0;
    this.targetScrollProgress = 0;
    this.mouse = { x: 0, y: 0 };
    this.targetMouse = { x: 0, y: 0 };
    this.isRendering = true;
    this.clock = new THREE.Clock();

    // Idle breathing animation state
    this._idleTime = 0;
    this._idleActive = true;

    // Touch state for mobile parallax
    this._touchStartX = 0;
    this._touchStartY = 0;
    this._lastTouchX = 0;
    this._lastTouchY = 0;

    this.init();
  }

  init() {
    this.setupScene();
    this.loadTextures();
    this.setupEvents();
    this.onResize();
    this.animate();
  }

  setupScene() {
    this.scene = new THREE.Scene();

    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width || this.canvas.offsetWidth || window.innerWidth;
    const height = rect.height || this.canvas.offsetHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    this.camera.position.set(0, 0, 4.8);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: !IS_MOBILE(), // disable AA on mobile for perf
      powerPreference: IS_MOBILE() ? 'default' : 'high-performance'
    });

    this.renderer.setSize(width, height, false);
    // Cap pixel ratio: 1.5 on mobile, 2.0 on desktop
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, IS_MOBILE() ? 1.5 : 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  loadTextures() {
    const loader = new THREE.TextureLoader();
    const assetList = [
      { key: 'p1', url: '/assets/lifter_3d_p1.png' },
      { key: 'p2', url: '/assets/lifter_3d_p2.png' },
      { key: 'p3', url: '/assets/lifter_3d_p3.png' },
      { key: 'd1', url: '/assets/lifter_3d_p1_depth.png' },
      { key: 'd2', url: '/assets/lifter_3d_p2_depth.png' },
      { key: 'd3', url: '/assets/lifter_3d_p3_depth.png' }
    ];

    let loadedCount = 0;
    assetList.forEach(item => {
      loader.load(
        item.url,
        (tex) => {
          tex.generateMipmaps = true;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.colorSpace = item.key.startsWith('p') ? THREE.SRGBColorSpace : THREE.NoColorSpace;
          this.textures[item.key] = tex;
          loadedCount++;
          if (loadedCount === assetList.length) {
            this.build3DMesh();
          }
        },
        undefined,
        (err) => {
          console.error(`Failed loading texture ${item.url}:`, err);
        }
      );
    });
  }

  build3DMesh() {
    // Reduce geometry complexity on mobile for GPU performance
    const segments = IS_MOBILE() ? 48 : 96;
    const geometry = new THREE.PlaneGeometry(3.6, 3.6, segments, segments);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTex1:    { value: this.textures.p1 },
        uTex2:    { value: this.textures.p2 },
        uTex3:    { value: this.textures.p3 },
        uDepth1:  { value: this.textures.d1 },
        uDepth2:  { value: this.textures.d2 },
        uDepth3:  { value: this.textures.d3 },
        uProgress:{ value: 0.0 },
        uMouse:   { value: new THREE.Vector2(0, 0) },
        uTime:    { value: 0.0 },
        uBreath:  { value: 0.0 }   // idle breathing oscillation
      },
      vertexShader: `
        uniform sampler2D uDepth1;
        uniform sampler2D uDepth2;
        uniform sampler2D uDepth3;
        uniform float uProgress;
        uniform vec2 uMouse;
        uniform float uBreath;

        varying vec2 vUv;
        varying float vDepth;

        void main() {
          vUv = uv;

          // Multi-stage depth blending: Pose 1 -> Pose 2 -> Pose 3
          float d1 = texture2D(uDepth1, uv).r;
          float d2 = texture2D(uDepth2, uv).r;
          float d3 = texture2D(uDepth3, uv).r;

          float depth = 0.0;
          if (uProgress < 0.5) {
            float t = uProgress * 2.0;
            depth = mix(d1, d2, smoothstep(0.0, 1.0, t));
          } else {
            float t = (uProgress - 0.5) * 2.0;
            depth = mix(d2, d3, smoothstep(0.0, 1.0, t));
          }
          vDepth = depth;

          vec3 displacedPos = position;

          // True 3D Z-displacement
          float zOffset = depth * 0.42;

          // Subtle torso curvature
          float curve = cos((uv.x - 0.5) * 3.14159) * 0.12 * depth;
          displacedPos.z += zOffset + curve;

          // Idle breathing — gentle chest expansion
          displacedPos.z += uBreath * depth * 0.06;
          displacedPos.y += uBreath * (1.0 - uv.y) * 0.012;

          // Mouse / touch parallax
          displacedPos.x += uMouse.x * (depth * 0.18);
          displacedPos.y += uMouse.y * (depth * 0.14);

          gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPos, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTex1;
        uniform sampler2D uTex2;
        uniform sampler2D uTex3;
        uniform float uProgress;
        uniform vec2 uMouse;
        uniform float uTime;
        uniform float uBreath;

        varying vec2 vUv;
        varying float vDepth;

        void main() {
          // Dynamic parallax UV shift
          vec2 parallaxUv = vUv + uMouse * (vDepth * 0.025);

          vec4 col1 = texture2D(uTex1, parallaxUv);
          vec4 col2 = texture2D(uTex2, parallaxUv);
          vec4 col3 = texture2D(uTex3, parallaxUv);

          vec4 finalColor;
          if (uProgress < 0.5) {
            float t = smoothstep(0.0, 1.0, uProgress * 2.0);
            finalColor = mix(col1, col2, t);
          } else {
            float t = smoothstep(0.0, 1.0, (uProgress - 0.5) * 2.0);
            finalColor = mix(col2, col3, t);
          }

          if (finalColor.a < 0.03) discard;

          // Dynamic red rim from edges
          float edgeFactor = clamp(1.0 - vDepth, 0.0, 1.0);
          vec3 redRim = vec3(1.0, 0.12, 0.15) * pow(edgeFactor, 2.2) * 0.35;

          // Breathing pulse — subtle warm glow on chest
          float breathGlow = uBreath * vDepth * 0.08;
          vec3 breathColor = vec3(1.0, 0.35, 0.2) * breathGlow;

          // Specular glint
          float spec = pow(max(0.0, dot(normalize(vec3(uMouse.x, uMouse.y, 1.0)), vec3(0.0, 0.0, 1.0))), 8.0);
          vec3 specularGleam = vec3(1.0, 0.85, 0.8) * spec * vDepth * 0.18;

          vec3 rgb = finalColor.rgb + redRim + specularGleam + breathColor;
          gl_FragColor = vec4(rgb, finalColor.a);
        }
      `,
      transparent: true,
      depthWrite: true,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.set(0, -0.05, 0);
    this.scene.add(this.mesh);
  }

  setupEvents() {
    window.addEventListener('resize', () => this.onResize(), { passive: true });

    const stage = document.querySelector('.hero-sticky-stage') || document.body;

    // ── Desktop: Mouse parallax ──────────────────────────────────────────────
    stage.addEventListener('mousemove', (e) => {
      const rect = stage.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      this.targetMouse.x = nx;
      this.targetMouse.y = -ny;
      this._idleActive = false;
    }, { passive: true });

    stage.addEventListener('mouseleave', () => {
      this.targetMouse.x = 0;
      this.targetMouse.y = 0;
      this._idleActive = true;
    });

    // ── Mobile: Touch parallax tilt ──────────────────────────────────────────
    stage.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      this._touchStartX = t.clientX;
      this._touchStartY = t.clientY;
      this._lastTouchX = t.clientX;
      this._lastTouchY = t.clientY;
      this._idleActive = false;
    }, { passive: true });

    stage.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      const rect = stage.getBoundingClientRect();

      // Normalize touch position to [-1, 1] for parallax
      const nx = ((t.clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((t.clientY - rect.top) / rect.height - 0.5) * 2;

      // Soften parallax strength on mobile (feels better)
      this.targetMouse.x = nx * 0.55;
      this.targetMouse.y = -ny * 0.55;

      this._lastTouchX = t.clientX;
      this._lastTouchY = t.clientY;
    }, { passive: true });

    stage.addEventListener('touchend', () => {
      // Return to centre slowly
      this.targetMouse.x = 0;
      this.targetMouse.y = 0;
      this._idleActive = true;
    }, { passive: true });

    // ── IntersectionObserver: pause render when hero is off screen ───────────
    const heroWrapper = document.querySelector('.hero-scroll-wrapper');
    if (heroWrapper && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          this.isRendering = entry.isIntersecting;
          if (entry.isIntersecting) this._idleActive = true;
        });
      }, { threshold: 0.01 }); // very low threshold — only pause when fully gone
      observer.observe(heroWrapper);
    }
  }

  setScrollProgress(progress) {
    this.targetScrollProgress = Math.max(0, Math.min(1, progress));
    // When user is scrolling, idle breathing takes back seat
    this._idleActive = this.targetScrollProgress < 0.02;
  }

  onResize() {
    if (!this.canvas || !this.renderer || !this.camera) return;

    // Use getBoundingClientRect for accurate size after layout
    const rect = this.canvas.getBoundingClientRect();
    const width  = rect.width  || this.canvas.offsetWidth  || window.innerWidth;
    const height = rect.height || this.canvas.offsetHeight || window.innerHeight;

    this.camera.aspect = width / height;

    if (width < 480) {
      // Small phones — pull camera back more, center vertically
      this.camera.fov = 44;
      this.camera.position.z = 6.2;
      this.camera.position.y = 0.1;
    } else if (width < 768) {
      // Larger phones
      this.camera.fov = 42;
      this.camera.position.z = 5.8;
      this.camera.position.y = 0.05;
    } else if (width < 1024) {
      // Tablets
      this.camera.fov = 40;
      this.camera.position.z = 5.2;
      this.camera.position.y = 0.0;
    } else {
      // Desktop
      this.camera.fov = 38;
      this.camera.position.z = 4.7;
      this.camera.position.y = -0.05;
    }

    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, width < 768 ? 1.5 : 2));
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    if (!this.isRendering) return;

    const elapsed = this.clock.getElapsedTime();

    // Smooth scroll progress lerp
    const scrollLerp = IS_MOBILE() ? 0.1 : 0.15;
    this.scrollProgress += (this.targetScrollProgress - this.scrollProgress) * scrollLerp;

    // Smooth mouse/touch parallax lerp
    const mouseLerp = IS_MOBILE() ? 0.06 : 0.08;
    this.mouse.x += (this.targetMouse.x - this.mouse.x) * mouseLerp;
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * mouseLerp;

    // Idle breathing: slow sin wave when no interaction
    this._idleTime += this._idleActive ? 0.016 : 0.0;
    const breath = this._idleActive
      ? Math.sin(this._idleTime * 1.2) * 0.5 + 0.5  // 0 → 1 oscillation
      : Math.max(0, this.material?.uniforms?.uBreath?.value - 0.04); // fade out

    if (this.material && this.material.uniforms) {
      this.material.uniforms.uProgress.value = this.scrollProgress;
      this.material.uniforms.uMouse.value.set(this.mouse.x, this.mouse.y);
      this.material.uniforms.uTime.value = elapsed;
      this.material.uniforms.uBreath.value = breath;
    }

    // 3D Mesh perspective tilt
    if (this.mesh) {
      // Smooth rotation following mouse/touch
      const targetRotY = this.mouse.x * 0.14;
      const targetRotX = -this.mouse.y * 0.09;
      this.mesh.rotation.y += (targetRotY - this.mesh.rotation.y) * 0.12;
      this.mesh.rotation.x += (targetRotX - this.mesh.rotation.x) * 0.12;

      // Idle subtle sway when no interaction
      if (this._idleActive) {
        this.mesh.rotation.y += Math.sin(elapsed * 0.4) * 0.002;
      }

      this.mesh.position.x = this.mouse.x * 0.08;
      this.mesh.position.y = -0.05 - this.mouse.y * 0.05;
    }

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    this.isRendering = false;
    window.removeEventListener('resize', this.onResize);
    if (this.renderer) this.renderer.dispose();
  }
}

let characterViewerInstance = null;

export function initCharacter3D(canvasId = 'hero-character-3d-canvas') {
  if (!characterViewerInstance) {
    characterViewerInstance = new Character3DViewer(canvasId);
  }
  return characterViewerInstance;
}

export function getCharacter3DInstance() {
  return characterViewerInstance;
}

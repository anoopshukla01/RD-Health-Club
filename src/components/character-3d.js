/**
 * RD HEALTH CLUB - 3D Photorealistic Lifter Engine
 * Interactive Three.js 3D depth-mapped character based on the user's reference lifter.
 * Performs a realistic barbell bicep curl synchronized with scroll progress.
 * Real 3D depth displacement, dynamic red rim lighting, and mouse parallax.
 */

import * as THREE from 'three';

export class Character3DViewer {
  constructor(canvasId = 'hero-character-3d-canvas') {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      return;
    }

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

    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    this.camera.position.set(0, 0, 4.8);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });

    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
    // High-resolution subdivided 3D grid for volumetric surface displacement
    const geometry = new THREE.PlaneGeometry(3.6, 3.6, 96, 96);

    // Custom 3D displacement and cross-fade shader
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTex1: { value: this.textures.p1 },
        uTex2: { value: this.textures.p2 },
        uTex3: { value: this.textures.p3 },
        uDepth1: { value: this.textures.d1 },
        uDepth2: { value: this.textures.d2 },
        uDepth3: { value: this.textures.d3 },
        uProgress: { value: 0.0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uTime: { value: 0.0 }
      },
      vertexShader: `
        uniform sampler2D uDepth1;
        uniform sampler2D uDepth2;
        uniform sampler2D uDepth3;
        uniform float uProgress;
        uniform vec2 uMouse;
        
        varying vec2 vUv;
        varying float vDepth;
        varying vec3 vNormalVec;

        void main() {
          vUv = uv;

          // Multi-stage depth blending: Pose 1 (down) -> Pose 2 (mid) -> Pose 3 (peak)
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

          // Parallax UV offset tracking mouse
          vec3 displacedPos = position;

          // True 3D Z-displacement: chest, abs, biceps and barbell project forward toward camera
          float zOffset = depth * 0.42;

          // Subtle natural torso curvature
          float curve = cos((uv.x - 0.5) * 3.14159) * 0.12 * depth;
          displacedPos.z += zOffset + curve;

          // Micro 3D perspective shift on vertices
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

        varying vec2 vUv;
        varying float vDepth;

        void main() {
          // Dynamic Parallax UV shift
          vec2 parallaxUv = vUv + uMouse * (vDepth * 0.025);

          // Sample three poses
          vec4 col1 = texture2D(uTex1, parallaxUv);
          vec4 col2 = texture2D(uTex2, parallaxUv);
          vec4 col3 = texture2D(uTex3, parallaxUv);

          // Smooth interpolation between poses based on scroll progress
          vec4 finalColor;
          if (uProgress < 0.5) {
            float t = smoothstep(0.0, 1.0, uProgress * 2.0);
            finalColor = mix(col1, col2, t);
          } else {
            float t = smoothstep(0.0, 1.0, (uProgress - 0.5) * 2.0);
            finalColor = mix(col2, col3, t);
          }

          // Discard fully transparent pixels
          if (finalColor.a < 0.03) {
            discard;
          }

          // Dynamic Red Rim Lighting boost from edges
          float edgeFactor = clamp(1.0 - vDepth, 0.0, 1.0);
          vec3 redRim = vec3(1.0, 0.12, 0.15) * pow(edgeFactor, 2.2) * 0.35;

          // Interactive specular glint over muscle highlights and barbell steel
          float spec = pow(max(0.0, dot(normalize(vec3(uMouse.x, uMouse.y, 1.0)), vec3(0.0, 0.0, 1.0))), 8.0);
          vec3 specularGleam = vec3(1.0, 0.85, 0.8) * spec * vDepth * 0.18;

          // Final shaded composition
          vec3 rgb = finalColor.rgb + redRim + specularGleam;

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

    // Track mouse coordinates for 3D parallax tilt & specular glints
    const stage = document.querySelector('.hero-sticky-stage') || document.body;
    stage.addEventListener('mousemove', (e) => {
      const rect = stage.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;

      this.targetMouse.x = nx;
      this.targetMouse.y = -ny;
    });

    stage.addEventListener('mouseleave', () => {
      this.targetMouse.x = 0;
      this.targetMouse.y = 0;
    });

    // Pause WebGL rendering loop when hero section is out of viewport
    const heroWrapper = document.querySelector('.hero-scroll-wrapper');
    if (heroWrapper && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          this.isRendering = entry.isIntersecting;
        });
      }, { threshold: 0.05 });
      observer.observe(heroWrapper);
    }
  }

  /**
   * Sets the curl scrub progress [0.0 to 1.0]
   * 0.0: Starting stance, barbell down at waist
   * 0.5: Mid curl, barbell at chest (user's exact reference photo!)
   * 1.0: Peak lockout curl, barbell at collarbone with maximum bicep flex
   */
  setScrollProgress(progress) {
    this.targetScrollProgress = Math.max(0, Math.min(1, progress));
  }

  onResize() {
    if (!this.canvas || !this.renderer || !this.camera) return;

    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;

    this.camera.aspect = width / height;

    // Responsive framing for mobile vs desktop
    if (width < 768) {
      this.camera.position.z = 5.8;
      this.camera.position.y = 0.05;
    } else if (width < 1024) {
      this.camera.position.z = 5.2;
      this.camera.position.y = 0.0;
    } else {
      this.camera.position.z = 4.7;
      this.camera.position.y = -0.05;
    }

    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    if (!this.isRendering) return;

    const elapsed = this.clock.getElapsedTime();

    // Smooth scroll progress lerp
    this.scrollProgress += (this.targetScrollProgress - this.scrollProgress) * 0.15;

    // Smooth mouse parallax lerp
    this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.08;
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.08;

    if (this.material && this.material.uniforms) {
      this.material.uniforms.uProgress.value = this.scrollProgress;
      this.material.uniforms.uMouse.value.set(this.mouse.x, this.mouse.y);
      this.material.uniforms.uTime.value = elapsed;
    }

    // 3D Perspective Rotation of the Mesh
    if (this.mesh) {
      this.mesh.rotation.y = this.mouse.x * 0.14;
      this.mesh.rotation.x = -this.mouse.y * 0.09;
      this.mesh.position.x = this.mouse.x * 0.08;
      this.mesh.position.y = -0.05 - this.mouse.y * 0.05;
    }

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    this.isRendering = false;
    window.removeEventListener('resize', this.onResize);
    if (this.renderer) {
      this.renderer.dispose();
    }
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

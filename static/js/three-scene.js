/**
 * CYBERVAULT 3D - Three.js Spatial Engine
 * Renders interactive 3D Holographic Vault, dynamic category pillars, particle nebula, and raycasting.
 */

class Cyber3DScene {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hoveredObject = null;

    // Visual Objects
    this.coreGroup = new THREE.Group();
    this.innerCrystal = null;
    this.outerCage = null;
    this.orbitalRing1 = null;
    this.orbitalRing2 = null;
    this.particleSystem = null;
    this.gridPlane = null;

    this.pillarGroup = new THREE.Group();
    this.pillars = [];

    // State
    this.autoRotate = true;
    this.currentViewMode = 'holo-vault';
    this.healthScore = 80;

    // Category Color Dictionary
    this.categoryColors = {
      'Food & Dining': 0xff9900,
      'Shopping & Tech': 0xd946ef,
      'Housing & Bills': 0x00f0ff,
      'Transport & Travel': 0x3b82f6,
      'Entertainment': 0xec4899,
      'Healthcare': 0x10b981,
      'Investment': 0x8b5cf6,
      'Salary & Wages': 0x22c55e,
      'Freelance & Side': 0x06b6d4,
      'Other': 0x94a3b8
    };

    this.init();
  }

  init() {
    if (!this.container) return;

    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 600;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x030712, 0.025);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 1000);
    this.camera.position.set(0, 8, 16);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    // 4. Orbit Controls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.05; // Don't go below horizon
    this.controls.minDistance = 6;
    this.controls.maxDistance = 35;
    this.controls.autoRotate = this.autoRotate;
    this.controls.autoRotateSpeed = 0.8;

    // 5. Lighting
    this.setupLighting();

    // 6. Build 3D Entities
    this.buildCyberGrid();
    this.buildCentralVaultCore();
    this.buildNebulaParticles();
    this.scene.add(this.pillarGroup);

    // 7. Event Listeners
    window.addEventListener('resize', () => this.onResize());
    this.container.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.container.addEventListener('click', (e) => this.onClick(e));

    // 8. Animation Loop
    this.clock = new THREE.Clock();
    this.animate();
  }

  setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);

    // Primary Neon Cyan Key Light
    const cyanLight = new THREE.PointLight(0x00f0ff, 2.5, 40);
    cyanLight.position.set(12, 14, 10);
    this.scene.add(cyanLight);

    // Secondary Neon Purple Rim Light
    const purpleLight = new THREE.PointLight(0x9d4edd, 2.5, 40);
    purpleLight.position.set(-12, -8, -10);
    this.scene.add(purpleLight);

    // Dynamic Core Glow Light
    this.corePointLight = new THREE.PointLight(0x00f0ff, 3, 15);
    this.corePointLight.position.set(0, 2, 0);
    this.scene.add(this.corePointLight);
  }

  buildCyberGrid() {
    // Sci-fi Radar Grid
    const size = 30;
    const divisions = 30;
    const grid = new THREE.GridHelper(size, divisions, 0x00f0ff, 0x1e293b);
    grid.position.y = -0.05;
    grid.material.opacity = 0.35;
    grid.material.transparent = true;
    this.gridPlane = grid;
    this.scene.add(grid);

    // Concentric Cyber Radar Rings
    for (let r of [3, 6, 9, 12]) {
      const ringGeo = new THREE.RingGeometry(r - 0.03, r, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.18
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = 0.01;
      this.scene.add(ringMesh);
    }
  }

  buildCentralVaultCore() {
    // 1. Inner Faceted Crystal
    const crystalGeo = new THREE.OctahedronGeometry(1.6, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x05162a,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.45,
      flatShading: true
    });
    this.innerCrystal = new THREE.Mesh(crystalGeo, crystalMat);
    this.innerCrystal.position.y = 2.2;
    this.coreGroup.add(this.innerCrystal);

    // 2. Outer Wireframe Cyber Cage
    const cageGeo = new THREE.IcosahedronGeometry(2.4, 1);
    const cageMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.45
    });
    this.outerCage = new THREE.Mesh(cageGeo, cageMat);
    this.outerCage.position.y = 2.2;
    this.coreGroup.add(this.outerCage);

    // 3. Orbital Data Rings
    const ringGeo1 = new THREE.TorusGeometry(3.2, 0.04, 16, 100);
    const ringMat1 = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.7 });
    this.orbitalRing1 = new THREE.Mesh(ringGeo1, ringMat1);
    this.orbitalRing1.position.y = 2.2;
    this.orbitalRing1.rotation.x = Math.PI / 3;
    this.coreGroup.add(this.orbitalRing1);

    const ringGeo2 = new THREE.TorusGeometry(3.6, 0.03, 16, 100);
    const ringMat2 = new THREE.MeshBasicMaterial({ color: 0x9d4edd, transparent: true, opacity: 0.6 });
    this.orbitalRing2 = new THREE.Mesh(ringGeo2, ringMat2);
    this.orbitalRing2.position.y = 2.2;
    this.orbitalRing2.rotation.x = -Math.PI / 4;
    this.coreGroup.add(this.orbitalRing2);

    this.scene.add(this.coreGroup);
  }

  buildNebulaParticles() {
    const particleCount = 1000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const color1 = new THREE.Color(0x00f0ff);
    const color2 = new THREE.Color(0x9d4edd);

    for (let i = 0; i < particleCount; i++) {
      // Distribute in a cylinder/sphere around space
      const radius = 6 + Math.random() * 22;
      const theta = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.2) * 16;

      positions[i * 3] = radius * Math.cos(theta);
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = radius * Math.sin(theta);

      // Interpolate colors between cyan and purple
      const mixedColor = color1.clone().lerp(color2, Math.random());
      colors[i * 3] = mixedColor.r;
      colors[i * 3 + 1] = mixedColor.g;
      colors[i * 3 + 2] = mixedColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.scene.add(this.particleSystem);
  }

  /**
   * Updates 3D Category Pillars around the central core based on expense data
   */
  updateCategoryPillars(categoriesData, totalExpense) {
    // Clear old pillars
    while (this.pillarGroup.children.length > 0) {
      const obj = this.pillarGroup.children[0];
      if (obj.geometry) obj.geometry.dispose();
      this.pillarGroup.remove(obj);
    }
    this.pillars = [];

    const catKeys = Object.keys(categoriesData);
    if (catKeys.length === 0) return;

    const count = catKeys.length;
    const orbitRadius = 6.8;

    catKeys.forEach((category, i) => {
      const data = categoriesData[category];
      const amount = data.total;
      const percent = totalExpense > 0 ? (amount / totalExpense) : 0;
      
      // Calculate height (between 0.6 and 6.5 units)
      const targetHeight = Math.max(0.6, percent * 10);
      const angle = (i / count) * Math.PI * 2;
      const x = orbitRadius * Math.cos(angle);
      const z = orbitRadius * Math.sin(angle);

      // Cylinder / Hexagonal Pillar
      const hexGeo = new THREE.CylinderGeometry(0.55, 0.65, 1, 6);
      hexGeo.translate(0, 0.5, 0); // Origin at base

      const catColorHex = this.categoryColors[category] || 0x00f0ff;
      const pillarMat = new THREE.MeshStandardMaterial({
        color: catColorHex,
        roughness: 0.2,
        metalness: 0.8,
        emissive: catColorHex,
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0.9
      });

      const pillarMesh = new THREE.Mesh(hexGeo, pillarMat);
      pillarMesh.position.set(x, 0, z);
      pillarMesh.scale.set(1, 0.05, 1); // Start small for GSAP animation

      // Glowing Halo Ring at the top of each pillar
      const haloGeo = new THREE.RingGeometry(0.55, 0.72, 16);
      const haloMat = new THREE.MeshBasicMaterial({
        color: catColorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.rotation.x = Math.PI / 2;
      haloMesh.position.y = 1.02;
      pillarMesh.add(haloMesh);

      // Meta attributes for Raycasting & Tooltips
      pillarMesh.userData = {
        category: category,
        amount: amount,
        percent: Math.round(percent * 100),
        count: data.count,
        colorHex: catColorHex,
        targetHeight: targetHeight
      };

      this.pillarGroup.add(pillarMesh);
      this.pillars.push(pillarMesh);

      // Smooth rise animation with GSAP
      if (window.gsap) {
        gsap.to(pillarMesh.scale, {
          y: targetHeight,
          duration: 1.2,
          delay: i * 0.08,
          ease: 'power3.out'
        });
      } else {
        pillarMesh.scale.y = targetHeight;
      }
    });
  }

  /**
   * Health Score adjusts Core color, energy pulse and particle speed
   */
  updateHealthVisuals(score) {
    this.healthScore = score;
    let targetColor = 0x10b981; // Green
    let pulseSpeed = 1;

    if (score < 45) {
      targetColor = 0xff3366; // Red danger
      pulseSpeed = 2.4;
    } else if (score < 70) {
      targetColor = 0xf59e0b; // Amber warning
      pulseSpeed = 1.6;
    }

    if (this.innerCrystal) {
      this.innerCrystal.material.emissive.setHex(targetColor);
    }
    if (this.outerCage) {
      this.outerCage.material.color.setHex(targetColor);
    }
    if (this.corePointLight) {
      this.corePointLight.color.setHex(targetColor);
    }
  }

  /**
   * Sets camera angles based on user HUD selection
   */
  setCameraPreset(mode) {
    this.currentViewMode = mode;
    if (!window.gsap) return;

    if (mode === 'holo-vault') {
      gsap.to(this.camera.position, { x: 0, y: 7, z: 15, duration: 1.2, ease: 'power2.inOut' });
      gsap.to(this.controls.target, { x: 0, y: 2.2, z: 0, duration: 1.2, ease: 'power2.inOut' });
    } else if (mode === 'category-towers') {
      gsap.to(this.camera.position, { x: 10, y: 12, z: 12, duration: 1.2, ease: 'power2.inOut' });
      gsap.to(this.controls.target, { x: 0, y: 1.5, z: 0, duration: 1.2, ease: 'power2.inOut' });
    } else if (mode === 'galaxy-ring') {
      gsap.to(this.camera.position, { x: 0, y: 22, z: 1.5, duration: 1.2, ease: 'power2.inOut' });
      gsap.to(this.controls.target, { x: 0, y: 0, z: 0, duration: 1.2, ease: 'power2.inOut' });
    }
  }

  resetCamera() {
    this.setCameraPreset(this.currentViewMode);
  }

  toggleAutoRotate() {
    this.autoRotate = !this.autoRotate;
    this.controls.autoRotate = this.autoRotate;
    return this.autoRotate;
  }

  onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  onMouseMove(event) {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Raycast hover detection on 3D pillars
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.pillars);

    const tooltip = document.getElementById('threeTooltip');

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      if (this.hoveredObject !== hit) {
        if (this.hoveredObject) this.unhighlightObject(this.hoveredObject);
        this.hoveredObject = hit;
        this.highlightObject(hit);
        if (window.soundFx) window.soundFx.playHover();
      }

      // Show and position tooltip
      if (tooltip && hit.userData) {
        const d = hit.userData;
        document.getElementById('ttBadge').innerText = d.category;
        document.getElementById('ttPercent').innerText = `${d.percent}%`;
        
        const sym = window.app ? window.app.getCurrencySymbol() : '₹';
        document.getElementById('ttAmount').innerText = `${sym}${d.amount.toLocaleString()}`;
        document.getElementById('ttCount').innerText = `${d.count} transactions recorded`;

        const screenX = event.clientX - rect.left + 15;
        const screenY = event.clientY - rect.top - 20;

        tooltip.style.left = `${Math.min(screenX, rect.width - 200)}px`;
        tooltip.style.top = `${Math.max(10, screenY)}px`;
        tooltip.classList.remove('hidden');
      }
    } else {
      if (this.hoveredObject) {
        this.unhighlightObject(this.hoveredObject);
        this.hoveredObject = null;
      }
      if (tooltip) tooltip.classList.add('hidden');
    }
  }

  highlightObject(mesh) {
    mesh.material.emissiveIntensity = 0.85;
    gsap.to(mesh.scale, { x: 1.15, z: 1.15, duration: 0.25 });
  }

  unhighlightObject(mesh) {
    mesh.material.emissiveIntensity = 0.35;
    gsap.to(mesh.scale, { x: 1.0, z: 1.0, duration: 0.25 });
  }

  onClick(event) {
    if (!this.hoveredObject || !this.hoveredObject.userData) return;
    const cat = this.hoveredObject.userData.category;
    if (window.app) {
      window.app.filterByCategory(cat);
      if (window.soundFx) window.soundFx.playClick();
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // 1. Core Kinetic Rotations
    if (this.innerCrystal) {
      this.innerCrystal.rotation.y += delta * 0.6;
      this.innerCrystal.rotation.x = Math.sin(elapsedTime * 0.8) * 0.15;
    }
    if (this.outerCage) {
      this.outerCage.rotation.y -= delta * 0.35;
      this.outerCage.rotation.z = Math.cos(elapsedTime * 0.5) * 0.12;
    }
    if (this.orbitalRing1) {
      this.orbitalRing1.rotation.z += delta * 0.9;
    }
    if (this.orbitalRing2) {
      this.orbitalRing2.rotation.z -= delta * 0.7;
    }

    // 2. Core Floating Levitation
    if (this.coreGroup) {
      this.coreGroup.position.y = Math.sin(elapsedTime * 1.5) * 0.18;
    }

    // 3. Ambient Particle Drift
    if (this.particleSystem) {
      this.particleSystem.rotation.y = elapsedTime * 0.03;
    }

    // 4. Update Controls
    if (this.controls) {
      this.controls.update();
    }

    // 5. Render
    this.renderer.render(this.scene, this.camera);
  }
}

// Global hook
window.Cyber3DScene = Cyber3DScene;

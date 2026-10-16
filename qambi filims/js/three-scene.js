// =========================================================
// QAMBI FILIMS - 3D BLUE PARTICLES GALAXY SCENE (THREE.JS)
// =========================================================

class BlueParticlesHero {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.particleSystem = null;
    this.particleCount = 4000;
    this.particleData = [];

    // Interactive states
    this.mouseX = 0;
    this.mouseY = 0;
    this.targetMouseX = 0;
    this.targetMouseY = 0;

    this.init();
  }

  init() {
    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x040814, 0.04);

    // 2. Camera
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.camera.position.z = 25;

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0x0a2540, 1.5);
    this.scene.add(ambientLight);

    const blueLight1 = new THREE.PointLight(0x00a8ff, 3, 50);
    blueLight1.position.set(0, 0, 5);
    this.scene.add(blueLight1);

    const blueLight2 = new THREE.PointLight(0x0055ff, 2, 50);
    blueLight2.position.set(-15, 10, -5);
    this.scene.add(blueLight2);

    const cyanLight = new THREE.PointLight(0x00f0ff, 2.5, 40);
    cyanLight.position.set(15, -10, -5);
    this.scene.add(cyanLight);

    // 5. Create Glowing Blue Dot Texture
    const particleTexture = this.createGlowingDotTexture();

    // 6. Geometry & Particle Streams (Dhibco buluug ah oo kasoo baxaya xarunta)
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);

    const colorPalette = [
      new THREE.Color('#00f0ff'), // Electric Cyan
      new THREE.Color('#0088ff'), // Deep Sky Blue
      new THREE.Color('#38bdf8'), // Neon Blue
      new THREE.Color('#1d4ed8'), // Royal Blue
      new THREE.Color('#60a5fa'), // Soft Blue
      new THREE.Color('#e0f2fe')  // Blue White Spark
    ];

    for (let i = 0; i < this.particleCount; i++) {
      // Spawn around center with radial explosion outwards
      const radius = Math.random() * 25 + 0.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = (Math.random() - 0.5) * 50;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Color from blue palette
      const col = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      // Random sizes
      sizes[i] = Math.random() * 0.45 + 0.15;

      // Velocity data: streaming outwards and rotating
      this.particleData.push({
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.04 + (x / (radius + 0.1)) * 0.05,
          (Math.random() - 0.5) * 0.04 + (y / (radius + 0.1)) * 0.05,
          Math.random() * 0.08 + 0.02 // Flowing towards camera
        ),
        originRadius: radius,
        speed: Math.random() * 0.02 + 0.01,
        angle: theta
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Material
    const material = new THREE.PointsMaterial({
      size: 0.35,
      map: particleTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.scene.add(this.particleSystem);

    // 7. Event Listeners
    this.setupEvents();

    // 8. Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  createGlowingDotTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(0, 240, 255, 0.9)');
    gradient.addColorStop(0.5, 'rgba(0, 120, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 30, 100, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    return new THREE.CanvasTexture(canvas);
  }

  setupEvents() {
    // Window resize
    window.addEventListener('resize', () => {
      if (!this.container) return;
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    });

    // Mouse movement
    window.addEventListener('mousemove', (e) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.targetMouseX = x * 3;
      this.targetMouseY = y * 2;
    });

    // Touch
    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
        const y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
        this.targetMouseX = x * 3;
        this.targetMouseY = y * 2;
      }
    }, { passive: true });
  }

  // Compatibility hook
  loadFeaturedMovies() {
    // No-op for particle galaxy
  }

  next() {
    this.targetMouseX += 2;
  }

  prev() {
    this.targetMouseX -= 2;
  }

  animate() {
    requestAnimationFrame(this.animate);

    // Mouse follow smoothing
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;

    this.camera.position.x = this.mouseX;
    this.camera.position.y = this.mouseY;
    this.camera.lookAt(0, 0, 0);

    // Particle animation: Dhibco kasoo baxaya xarunta oo u socda hore
    if (this.particleSystem) {
      const positions = this.particleSystem.geometry.attributes.position.array;

      for (let i = 0; i < this.particleCount; i++) {
        const pData = this.particleData[i];
        
        // Move outwards in Z towards camera
        positions[i * 3 + 2] += pData.velocity.z;
        // Expand outwards in X and Y
        positions[i * 3] += pData.velocity.x * 0.5;
        positions[i * 3 + 1] += pData.velocity.y * 0.5;

        // Reset if particle goes past camera or too far
        if (positions[i * 3 + 2] > 26) {
          positions[i * 3 + 2] = -25;
          // Respawn near center
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * 4 + 0.2;
          positions[i * 3] = Math.cos(angle) * dist;
          positions[i * 3 + 1] = Math.sin(angle) * dist;
        }
      }

      this.particleSystem.geometry.attributes.position.needsUpdate = true;
      // Gentle rotation of the whole galaxy
      this.particleSystem.rotation.z += 0.0015;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Global initialization hook
window.initCinema3DHero = function(containerId) {
  window.cinema3D = new BlueParticlesHero(containerId);
  return window.cinema3D;
};

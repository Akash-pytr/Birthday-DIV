/**
 * CakeScene — Main Three.js Scene Manager
 * Sets up the 3D scene with camera, lights, and renderer.
 */
import * as THREE from 'three';

export class CakeScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.animationCallbacks = [];
    this.isRotating = true;
    this.targetRotation = 0;
    this.autoRotateSpeed = 0.002;
    this.targetCakeX = 0;

    this._setupRenderer();
    this._setupCamera();
    this._setupLights();
    this._setupBackground();
    this._setupControls();

    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);
    this._onResize();
  }

  /** Offset cake position when sidebar is open */
  setSidebarOffset(hasSidebar) {
    const isDesktop = window.innerWidth > 768;
    this.targetCakeX = (hasSidebar && isDesktop) ? 0.75 : 0;
  }

  _setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.localClippingEnabled = true;
  }

  _setupCamera() {
    this.camera = new THREE.PerspectiveCamera(
      40,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 4.5, 10);
    this.camera.lookAt(0, 1.8, 0);
  }

  _setupLights() {
    // Ambient light
    const ambient = new THREE.AmbientLight(0xfff0f5, 0.6);
    this.scene.add(ambient);

    // Main directional light (sun)
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 8, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 20;
    dirLight.shadow.camera.left = -5;
    dirLight.shadow.camera.right = 5;
    dirLight.shadow.camera.top = 5;
    dirLight.shadow.camera.bottom = -5;
    dirLight.shadow.bias = -0.002;
    this.scene.add(dirLight);

    // Fill light from left (pinkish)
    const fillLight = new THREE.DirectionalLight(0xffb5c5, 0.4);
    fillLight.position.set(-4, 3, 2);
    this.scene.add(fillLight);

    // Rim light from behind (purple)
    const rimLight = new THREE.DirectionalLight(0xc4a8d8, 0.3);
    rimLight.position.set(0, 2, -5);
    this.scene.add(rimLight);

    // Hemisphere light for ambient color
    const hemiLight = new THREE.HemisphereLight(0xfff0f5, 0xe8dff5, 0.3);
    this.scene.add(hemiLight);
  }

  _setupBackground() {
    // Transparent background - CSS gradient shows through
    this.renderer.setClearColor(0x000000, 0);
  }

  _setupControls() {
    // Mouse drag rotation (horizontal + vertical)
    this.isDragging = false;
    this.previousMouseX = 0;
    this.previousMouseY = 0;
    this.cakeGroup = new THREE.Group();
    this.scene.add(this.cakeGroup);

    // Clamp limits for vertical rotation (prevent flipping)
    this.minPitch = THREE.MathUtils.degToRad(-60);
    this.maxPitch = THREE.MathUtils.degToRad(60);

    this.canvas.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      this.previousMouseX = e.clientX;
      this.previousMouseY = e.clientY;
      this.isRotating = false;
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (this.isDragging) {
        const deltaX = e.clientX - this.previousMouseX;
        const deltaY = e.clientY - this.previousMouseY;

        // Horizontal rotation (left-right)
        this.cakeGroup.rotation.y += deltaX * 0.008;

        // Vertical rotation (up-down) with clamping
        this.cakeGroup.rotation.x += deltaY * 0.008;
        this.cakeGroup.rotation.x = THREE.MathUtils.clamp(
          this.cakeGroup.rotation.x,
          this.minPitch,
          this.maxPitch
        );

        this.previousMouseX = e.clientX;
        this.previousMouseY = e.clientY;
      }
    });

    this.canvas.addEventListener('pointerup', () => {
      this.isDragging = false;
      // Resume auto-rotation after 3 seconds
      setTimeout(() => {
        if (!this.isDragging) this.isRotating = true;
      }, 3000);
    });

    this.canvas.addEventListener('pointerleave', () => {
      this.isDragging = false;
    });
  }


  // ---- Camera Animation System ----

  /**
   * Smoothly animate camera to a target position and lookAt point.
   * @param {THREE.Vector3} targetPos - Target camera position
   * @param {THREE.Vector3} targetLookAt - Target lookAt point
   * @param {number} duration - Duration in ms
   * @returns {Promise} Resolves when animation completes
   */
  animateCameraTo(targetPos, targetLookAt, duration = 1500) {
    return new Promise((resolve) => {
      const startPos = this.camera.position.clone();
      // Derive current lookAt from camera direction
      const dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);
      const startLookAt = startPos.clone().add(dir.multiplyScalar(10));

      const startTime = Date.now();
      this._cameraAnimating = true;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        // Smooth ease-in-out
        const ease = t < 0.5
          ? 4 * t * t * t
          : 1 - Math.pow(-2 * t + 2, 3) / 2;

        this.camera.position.lerpVectors(startPos, targetPos, ease);

        const currentLookAt = new THREE.Vector3().lerpVectors(startLookAt, targetLookAt, ease);
        this.camera.lookAt(currentLookAt);

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          this._cameraAnimating = false;
          resolve();
        }
      };
      animate();
    });
  }

  /** Move camera to top-down overhead view */
  setTopView() {
    this.isRotating = false;
    // Reset cake rotation so top view is clean and clipping planes align
    this.cakeGroup.rotation.x = 0;
    this.cakeGroup.rotation.y = 0;
    return this.animateCameraTo(
      new THREE.Vector3(0, 12, 0.01), // Slightly offset Z to avoid gimbal lock
      new THREE.Vector3(0, 0, 0),
      1800
    );
  }

  /** Reset camera to default side view */
  resetCamera() {
    return this.animateCameraTo(
      new THREE.Vector3(0, 4.5, 10),
      new THREE.Vector3(0, 1.8, 0),
      1500
    ).then(() => {
      // Resume auto-rotation after return
      setTimeout(() => { this.isRotating = true; }, 500);
    });
  }

  /** Rotate cake by degrees */
  rotateBy(degrees) {
    this.cakeGroup.rotation.y += THREE.MathUtils.degToRad(degrees);
  }

  /** Add object to cake group */
  addToCake(object) {
    this.cakeGroup.add(object);
  }

  /** Add animation callback */
  onAnimate(callback) {
    this.animationCallbacks.push(callback);
  }

  /** Raycast against cake surface */
  raycast(mouseX, mouseY, targetMeshes) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(
      (mouseX / window.innerWidth) * 2 - 1,
      -(mouseY / window.innerHeight) * 2 + 1
    );
    raycaster.setFromCamera(mouse, this.camera);
    return raycaster.intersectObjects(targetMeshes, true);
  }

  /** Start render loop */
  start() {
    const animate = () => {
      this._animationFrame = requestAnimationFrame(animate);
      const delta = this.clock.getDelta();
      const elapsed = this.clock.getElapsedTime();

      // Auto-rotate
      if (this.isRotating) {
        this.cakeGroup.rotation.y += this.autoRotateSpeed;
      }

      // Smoothly transition cake position for sidebar
      this.cakeGroup.position.x += (this.targetCakeX - this.cakeGroup.position.x) * 0.08;

      // Run callbacks
      this.animationCallbacks.forEach(cb => cb(delta, elapsed));

      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  /** Stop render loop */
  stop() {
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
    }
  }

  _onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /** Get the cake group for external access */
  getCakeGroup() {
    return this.cakeGroup;
  }

  /** Dispose everything */
  dispose() {
    window.removeEventListener('resize', this._onResize);
    this.stop();
    this.renderer.dispose();
  }
}

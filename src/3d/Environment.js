/**
 * Environment — Ground plane and floating particles
 */
import * as THREE from 'three';

export class Environment {
  constructor(scene) {
    this.scene = scene;
    this.particles = null;

    this._createGround();
    this._createFloatingParticles();
  }

  _createGround() {
    // Shadow-catching ground plane
    const groundGeo = new THREE.PlaneGeometry(20, 20);
    const groundMat = new THREE.ShadowMaterial({
      opacity: 0.08,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  _createFloatingParticles() {
    const count = 50;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 1] = Math.random() * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 15;
      sizes[i] = Math.random() * 3 + 1;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 0.03,
      transparent: true,
      opacity: 0.4,
      sizeAttenuation: true,
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  /** Animate particles (call each frame) */
  animate(elapsed) {
    if (this.particles) {
      const positions = this.particles.geometry.attributes.position.array;
      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3 + 1] += Math.sin(elapsed + i) * 0.001;
        // Wrap around
        if (positions[i * 3 + 1] > 8) positions[i * 3 + 1] = 0;
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
      this.particles.rotation.y = elapsed * 0.02;
    }
  }
}

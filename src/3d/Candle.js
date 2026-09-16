/**
 * Candle — 3D Candle Objects
 * Creates different candle styles with animated flames.
 */
import * as THREE from 'three';

// Candle style definitions
export const CANDLE_STYLES = [
  { name: 'Classic Red', bodyColor: 0xCC3333, stripeColor: 0xFFFFFF, emoji: '🕯️' },
  { name: 'Purple Spiral', bodyColor: 0x7C3AED, stripeColor: 0xE8DAFF, emoji: '🎂' },
  { name: 'Gold Sparkler', bodyColor: 0xF59E0B, stripeColor: 0xFFF7CD, emoji: '✨' },
  { name: 'Pink Party', bodyColor: 0xEC4899, stripeColor: 0xFFE4F0, emoji: '🎀' },
  { name: 'Blue Dream', bodyColor: 0x3B82F6, stripeColor: 0xDBEAFE, emoji: '💙' },
  { name: 'Green Fresh', bodyColor: 0x10B981, stripeColor: 0xD1FAE5, emoji: '🌿' },
];

export class Candle {
  constructor(styleIndex = 0) {
    this.group = new THREE.Group();
    this.group.userData.isCandle = true;
    this.style = CANDLE_STYLES[styleIndex % CANDLE_STYLES.length];
    this.flame = null;
    this.flameLight = null;
    this.isLit = true;

    this._createBody();
    this._createFlame();

    return this;
  }

  _createBody() {
    // Main candle body
    const bodyGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.6, 16);

    // Create stripe texture
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const stripeWidth = 32;
    const bodyHex = '#' + this.style.bodyColor.toString(16).padStart(6, '0');
    const stripeHex = '#' + this.style.stripeColor.toString(16).padStart(6, '0');

    for (let y = 0; y < canvas.height; y += stripeWidth * 2) {
      ctx.fillStyle = bodyHex;
      ctx.fillRect(0, y, canvas.width, stripeWidth);
      ctx.fillStyle = stripeHex;
      ctx.fillRect(0, y + stripeWidth, canvas.width, stripeWidth);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 2);

    const bodyMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.6,
      metalness: 0.0,
    });

    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.3;
    body.castShadow = true;
    this.group.add(body);

    // Wick
    const wickGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.1, 8);
    const wickMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.9,
    });
    const wick = new THREE.Mesh(wickGeo, wickMat);
    wick.position.y = 0.65;
    this.group.add(wick);

    // Base holder (small disc)
    const baseGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.04, 16);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0xDDDDDD,
      roughness: 0.3,
      metalness: 0.3,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.02;
    this.group.add(base);
  }

  _createFlame() {
    // Flame using a cone + emissive material
    const flameGeo = new THREE.ConeGeometry(0.04, 0.12, 8);
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xFF6600,
      transparent: true,
      opacity: 0.9,
    });
    this.flame = new THREE.Mesh(flameGeo, flameMat);
    this.flame.position.y = 0.74;
    this.group.add(this.flame);

    // Inner glow
    const innerGeo = new THREE.ConeGeometry(0.025, 0.08, 8);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xFFFF00,
      transparent: true,
      opacity: 0.8,
    });
    this.flameInner = new THREE.Mesh(innerGeo, innerMat);
    this.flameInner.position.y = 0.72;
    this.group.add(this.flameInner);

    // Point light for glow
    this.flameLight = new THREE.PointLight(0xFF8800, 0.3, 2);
    this.flameLight.position.y = 0.75;
    this.group.add(this.flameLight);
  }

  /** Animate flame (call each frame) */
  animate(elapsed) {
    if (!this.isLit || !this.flame) return;

    // Flicker effect
    const flicker = Math.sin(elapsed * 12) * 0.02 + Math.sin(elapsed * 18) * 0.01;
    const flickerX = Math.sin(elapsed * 8 + 0.5) * 0.005;

    this.flame.scale.y = 1 + flicker;
    this.flame.scale.x = 1 - flicker * 0.5;
    this.flame.position.x = flickerX;

    this.flameInner.scale.y = 1 + flicker * 0.8;
    this.flameInner.position.x = flickerX * 0.5;

    // Light intensity flicker
    this.flameLight.intensity = 0.3 + flicker * 2;
  }

  /** Blow out the candle */
  blowOut() {
    this.isLit = false;
    if (this.flame) {
      // Animate blow out
      const startScale = { y: this.flame.scale.y };
      const duration = 500;
      const startTime = Date.now();

      const animateBlowOut = () => {
        const progress = Math.min((Date.now() - startTime) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);

        this.flame.scale.y = startScale.y * (1 - ease);
        this.flame.scale.x = 1 + ease * 0.5;
        this.flame.material.opacity = 0.9 * (1 - ease);

        this.flameInner.scale.y = startScale.y * (1 - ease);
        this.flameInner.material.opacity = 0.8 * (1 - ease);

        this.flameLight.intensity = 0.3 * (1 - ease);

        if (progress < 1) {
          requestAnimationFrame(animateBlowOut);
        } else {
          // Create smoke puff
          this._createSmoke();
        }
      };
      animateBlowOut();
    }
  }

  _createSmoke() {
    // Simple smoke using small transparent spheres
    for (let i = 0; i < 5; i++) {
      const smokeGeo = new THREE.SphereGeometry(0.02, 8, 8);
      const smokeMat = new THREE.MeshBasicMaterial({
        color: 0xCCCCCC,
        transparent: true,
        opacity: 0.4,
      });
      const smoke = new THREE.Mesh(smokeGeo, smokeMat);
      smoke.position.y = 0.75;
      this.group.add(smoke);

      // Animate smoke upward
      const startY = smoke.position.y;
      const startTime = Date.now();
      const delay = i * 100;
      const spreadX = (Math.random() - 0.5) * 0.1;
      const spreadZ = (Math.random() - 0.5) * 0.1;

      const animateSmoke = () => {
        const elapsed = Date.now() - startTime - delay;
        if (elapsed < 0) {
          requestAnimationFrame(animateSmoke);
          return;
        }
        const progress = Math.min(elapsed / 1000, 1);
        smoke.position.y = startY + progress * 0.5;
        smoke.position.x = spreadX * progress;
        smoke.position.z = spreadZ * progress;
        smoke.material.opacity = 0.4 * (1 - progress);
        smoke.scale.setScalar(1 + progress * 2);

        if (progress < 1) {
          requestAnimationFrame(animateSmoke);
        } else {
          this.group.remove(smoke);
          smokeGeo.dispose();
          smokeMat.dispose();
        }
      };
      requestAnimationFrame(animateSmoke);
    }
  }

  /** Relight the candle */
  relight() {
    this.isLit = true;
    if (this.flame) {
      this.flame.scale.set(1, 1, 1);
      this.flame.material.opacity = 0.9;
      this.flameInner.scale.set(1, 1, 1);
      this.flameInner.material.opacity = 0.8;
      this.flameLight.intensity = 0.3;
    }
  }

  /** Get the Three.js group */
  getGroup() {
    return this.group;
  }
}

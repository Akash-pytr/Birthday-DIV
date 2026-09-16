/**
 * Confetti — Canvas-based confetti particle system
 */

export class Confetti {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.isRunning = false;
    this._animFrame = null;

    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);
    this._onResize();
  }

  _onResize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  /** Launch confetti burst */
  burst(count = 150) {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96E6A1',
      '#DDA0DD', '#FFD93D', '#FF8C42', '#A78BFA',
      '#F472B6', '#34D399', '#60A5FA', '#FBBF24',
    ];

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
        y: window.innerHeight / 2,
        vx: (Math.random() - 0.5) * 15,
        vy: -Math.random() * 18 - 5,
        width: Math.random() * 10 + 5,
        height: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 15,
        gravity: 0.15 + Math.random() * 0.1,
        opacity: 1,
        decay: 0.003 + Math.random() * 0.003,
        wobble: Math.random() * 10,
        wobbleSpeed: 0.05 + Math.random() * 0.05,
      });
    }

    if (!this.isRunning) {
      this.isRunning = true;
      this._animate();
    }
  }

  /** Continuous confetti shower from top */
  shower(duration = 5000) {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96E6A1',
      '#DDA0DD', '#FFD93D', '#FF8C42', '#A78BFA',
      '#F472B6', '#34D399', '#60A5FA', '#FBBF24',
    ];

    const startTime = Date.now();
    const interval = setInterval(() => {
      if (Date.now() - startTime > duration) {
        clearInterval(interval);
        return;
      }

      for (let i = 0; i < 5; i++) {
        this.particles.push({
          x: Math.random() * window.innerWidth,
          y: -20,
          vx: (Math.random() - 0.5) * 3,
          vy: Math.random() * 2 + 1,
          width: Math.random() * 10 + 5,
          height: Math.random() * 6 + 3,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 8,
          gravity: 0.05 + Math.random() * 0.05,
          opacity: 1,
          decay: 0.001,
          wobble: Math.random() * 10,
          wobbleSpeed: 0.03 + Math.random() * 0.03,
        });
      }
    }, 50);

    if (!this.isRunning) {
      this.isRunning = true;
      this._animate();
    }
  }

  _animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.particles = this.particles.filter(p => {
      // Update physics
      p.vy += p.gravity;
      p.x += p.vx + Math.sin(p.wobble) * 0.5;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      p.opacity -= p.decay;
      p.wobble += p.wobbleSpeed;

      // Add air resistance
      p.vx *= 0.99;

      if (p.opacity <= 0 || p.y > this.canvas.height + 50) return false;

      // Draw
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.globalAlpha = p.opacity;
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
      this.ctx.restore();

      return true;
    });

    if (this.particles.length > 0) {
      this._animFrame = requestAnimationFrame(() => this._animate());
    } else {
      this.isRunning = false;
    }
  }

  /** Clear all particles */
  clear() {
    this.particles = [];
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.isRunning = false;
    if (this._animFrame) cancelAnimationFrame(this._animFrame);
  }

  dispose() {
    window.removeEventListener('resize', this._onResize);
    this.clear();
  }
}

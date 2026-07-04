// Lightweight Canvas-2D particle engine for spell VFX. Kept imperative and
// outside React so effects can be fired from game events without re-renders.
// The rendering layer is intentionally isolated: swapping this file for a
// PixiJS implementation later touches nothing else.

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
  glow: boolean;
}

interface Projectile {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  lift: number; // arc height
  t: number;
  duration: number; // seconds
  color: string;
  size: number;
  onArrive?: () => void;
}

class VfxEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private particles: Particle[] = [];
  private projectiles: Projectile[] = [];
  private raf = 0;
  private lastTime = 0;

  attach(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.lastTime = performance.now();
    cancelAnimationFrame(this.raf);
    const loop = (now: number) => {
      this.step(Math.min((now - this.lastTime) / 1000, 0.05));
      this.lastTime = now;
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  detach() {
    cancelAnimationFrame(this.raf);
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.projectiles = [];
  }

  /** Convert a DOM element's center to canvas-local coordinates. */
  anchorOf(el: Element): { x: number; y: number } {
    if (!this.canvas) return { x: 0, y: 0 };
    const c = this.canvas.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2 - c.left, y: r.top + r.height / 2 - c.top };
  }

  projectile(
    from: { x: number; y: number },
    to: { x: number; y: number },
    color: string,
    opts: { size?: number; duration?: number; onArrive?: () => void } = {},
  ) {
    this.projectiles.push({
      fromX: from.x,
      fromY: from.y,
      toX: to.x,
      toY: to.y,
      lift: 60 + Math.random() * 40,
      t: 0,
      duration: opts.duration ?? 0.35,
      color,
      size: opts.size ?? 9,
      onArrive: opts.onArrive,
    });
  }

  burst(x: number, y: number, color: string, count = 26, speed = 260) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.7);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.5,
        size: 2 + Math.random() * 4,
        color,
        gravity: 240,
        glow: true,
      });
    }
  }

  /** Backfire explosion: fiery core + dark smoke. */
  explosion(x: number, y: number) {
    this.burst(x, y, '#ff5a3c', 34, 320);
    this.burst(x, y, '#ffd94a', 16, 200);
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * 60,
        vy: Math.sin(a) * 60 - 40,
        life: 0,
        maxLife: 0.8 + Math.random() * 0.6,
        size: 8 + Math.random() * 10,
        color: 'rgba(40,30,50,0.55)',
        gravity: -60,
        glow: false,
      });
    }
  }

  /** Critical hit: golden starburst ring. */
  crit(x: number, y: number, color: string) {
    this.burst(x, y, color, 40, 380);
    this.burst(x, y, '#ffe9a8', 30, 300);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * 420,
        vy: Math.sin(a) * 420,
        life: 0,
        maxLife: 0.35,
        size: 3,
        color: '#ffd94a',
        gravity: 0,
        glow: true,
      });
    }
  }

  private step(dt: number) {
    const ctx = this.ctx;
    const canvas = this.canvas;
    if (!ctx || !canvas) return;

    // Keep the backing store matched to CSS size.
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.t += dt / p.duration;
      const t = Math.min(p.t, 1);
      const x = p.fromX + (p.toX - p.fromX) * t;
      const y = p.fromY + (p.toY - p.fromY) * t - Math.sin(t * Math.PI) * p.lift;

      // trail
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 40,
        vy: (Math.random() - 0.5) * 40,
        life: 0,
        maxLife: 0.25,
        size: 2 + Math.random() * 2,
        color: p.color,
        gravity: 0,
        glow: true,
      });

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowBlur = 18;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(x, y, p.size * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (p.t >= 1) {
        this.projectiles.splice(i, 1);
        this.burst(p.toX, p.toY, p.color);
        p.onArrive?.();
      }
    }

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life += dt;
      if (pt.life >= pt.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      pt.vy += pt.gravity * dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      const alpha = 1 - pt.life / pt.maxLife;
      ctx.save();
      if (pt.glow) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowBlur = 10;
        ctx.shadowColor = pt.color;
      }
      ctx.globalAlpha = alpha;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size * alpha + 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

export const vfx = new VfxEngine();

// particles.ts  depth parallax, soft shadows, and cursor repulsion

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  shape: number; // 0=circle, 1=square, 2=triangle
  depth: number; // 0.5–1.5, affects size/speed/shadow for parallax
  opacity: number;
}

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let particles: Particle[] = [];
let animId: number | null = null;
let mouseX = -1000;
let mouseY = -1000;
let width = 0;
let height = 0;
let dpr = 1;

// Config
const PARTICLE_COUNT = 45;
const GRAVITY = -0.04; // negative = float upward
const SPEED_FACTOR = 0.6;
const FRICTION = 0.98;
const INTERACTION_RADIUS = 150;
const INTERACTION_FORCE = 3.5;

// Site-themed palette — muted, elegant tones
const COLORS_LIGHT = [
  '#4a7c9d', // primary blue
  '#5b9ab8', // lighter blue
  '#d4a574', // warm amber
  '#8fb8a0', // sage green
  '#c4917a', // terracotta
  '#b8ccd8', // pale blue
];

const COLORS_DARK = [
  '#5b9ab8', // blue
  '#7ab5cc', // lighter blue
  '#d4a574', // warm amber
  '#a0c9b2', // sage green
  '#d9a48f', // soft terracotta
  '#8aa8b8', // steel blue
];

function createParticle(randomY = true): Particle {
  const isDark = document.documentElement.classList.contains('dark');
  const colors = isDark ? COLORS_DARK : COLORS_LIGHT;

  return {
    x: Math.random() * width,
    y: randomY ? Math.random() * height : height + 60,
    vx: (Math.random() - 0.5) * 2 * SPEED_FACTOR,
    vy: (Math.random() - 0.5) * 2 * SPEED_FACTOR - Math.random() * Math.abs(GRAVITY) * 20,
    size: Math.random() * 14 + 5,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.03,
    shape: Math.floor(Math.random() * 3),
    depth: Math.random() * 1 + 0.5,
    opacity: randomY ? 0.35 + Math.random() * 0.35 : 0.4,
  };
}

function resizeCanvas(): void {
  if (!canvas) return;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function animate(): void {
  if (!ctx || !canvas) return;

  ctx.clearRect(0, 0, width, height);

  for (const p of particles) {
    // Antigravity — float upward
    p.vy += GRAVITY * 0.05 * p.depth;

    // Cursor repulsion
    const dx = p.x - mouseX;
    const dy = p.y - mouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < INTERACTION_RADIUS && dist > 0) {
      const force = (INTERACTION_RADIUS - dist) / INTERACTION_RADIUS;
      const angle = Math.atan2(dy, dx);
      p.vx += Math.cos(angle) * force * INTERACTION_FORCE;
      p.vy += Math.sin(angle) * force * INTERACTION_FORCE;
    }

    // Friction
    p.vx *= FRICTION;
    p.vy *= FRICTION;

    // Move
    p.x += p.vx * p.depth;
    p.y += p.vy * p.depth;
    p.rotation += p.rotationSpeed;

    // Horizontal wrap
    if (p.x < -60) p.x = width + 60;
    if (p.x > width + 60) p.x = -60;

    // Reset when floated off top (antigravity)
    if (p.y < -80) {
      Object.assign(p, createParticle(false));
      p.y = height + 60;
    }
    // Safety: if somehow below screen
    if (p.y > height + 80) {
      Object.assign(p, createParticle(false));
      p.y = -60;
    }

    // Draw
    const s = p.size * p.depth;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.opacity * p.depth;

    // Soft shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
    ctx.shadowBlur = 8 * p.depth;
    ctx.shadowOffsetX = 3 * p.depth;
    ctx.shadowOffsetY = 3 * p.depth;

    ctx.fillStyle = p.color;
    ctx.beginPath();

    if (p.shape === 0) {
      // Circle
      ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
    } else if (p.shape === 1) {
      // Rounded square
      const half = s / 2;
      const r = s * 0.15; // corner radius
      ctx.moveTo(-half + r, -half);
      ctx.lineTo(half - r, -half);
      ctx.quadraticCurveTo(half, -half, half, -half + r);
      ctx.lineTo(half, half - r);
      ctx.quadraticCurveTo(half, half, half - r, half);
      ctx.lineTo(-half + r, half);
      ctx.quadraticCurveTo(-half, half, -half, half - r);
      ctx.lineTo(-half, -half + r);
      ctx.quadraticCurveTo(-half, -half, -half + r, -half);
    } else {
      // Triangle
      ctx.moveTo(0, -s / 2);
      ctx.lineTo(s / 2, s / 2);
      ctx.lineTo(-s / 2, s / 2);
      ctx.closePath();
    }

    ctx.fill();
    ctx.restore();
  }

  animId = requestAnimationFrame(animate);
}

function handleMouseMove(e: MouseEvent): void {
  mouseX = e.clientX;
  mouseY = e.clientY;
}

function handleTouchMove(e: TouchEvent): void {
  mouseX = e.touches[0].clientX;
  mouseY = e.touches[0].clientY;
}

function handleMouseLeave(): void {
  mouseX = -1000;
  mouseY = -1000;
}

export function initParticles(): void {
  // Skip on mobile
  if (window.innerWidth < 768) return;

  // Respect reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  canvas = document.createElement('canvas');
  canvas.id = 'particle-canvas';
  canvas.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:1;';

  // Insert inside desktop, before windows-container
  const desktop = document.getElementById('desktop');
  const windowsContainer = document.getElementById('windows-container');
  if (desktop && windowsContainer) {
    desktop.insertBefore(canvas, windowsContainer);
  } else if (desktop) {
    desktop.appendChild(canvas);
  } else {
    return;
  }

  ctx = canvas.getContext('2d');
  if (!ctx) return;

  resizeCanvas();

  // Create particles
  particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(createParticle(true));
  }

  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('touchmove', handleTouchMove, { passive: true });
  document.addEventListener('mouseleave', handleMouseLeave);
  window.addEventListener('resize', resizeCanvas);

  animId = requestAnimationFrame(animate);
}

export function destroyParticles(): void {
  if (animId) cancelAnimationFrame(animId);
  canvas?.remove();
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('touchmove', handleTouchMove);
  document.removeEventListener('mouseleave', handleMouseLeave);
  window.removeEventListener('resize', resizeCanvas);
  canvas = null;
  ctx = null;
  particles = [];
}

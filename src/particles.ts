// particles.ts - ambient floating particles on the desktop background

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  baseOpacity: number;
  phase: number; // for gentle pulse
}

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let particles: Particle[] = [];
let animId: number | null = null;
let mouseX = -1000;
let mouseY = -1000;
let width = 0;
let height = 0;

const PARTICLE_COUNT = 35;
const MAX_RADIUS = 2.5;
const MIN_RADIUS = 0.8;
const MAX_SPEED = 0.3;
const MOUSE_REPEL_RANGE = 120;
const MOUSE_REPEL_STRENGTH = 0.8;

function createParticle(): Particle {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * MAX_SPEED,
    vy: (Math.random() - 0.5) * MAX_SPEED,
    radius: MIN_RADIUS + Math.random() * (MAX_RADIUS - MIN_RADIUS),
    opacity: 0,
    baseOpacity: 0.15 + Math.random() * 0.25,
    phase: Math.random() * Math.PI * 2,
  };
}

function resizeCanvas(): void {
  if (!canvas) return;
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
}

function animate(): void {
  if (!ctx || !canvas) return;

  ctx.clearRect(0, 0, width, height);

  const isDark = document.documentElement.classList.contains('dark');
  const time = performance.now() * 0.001;

  for (const p of particles) {
    // Gentle pulse
    const pulse = Math.sin(time * 0.5 + p.phase) * 0.1;
    p.opacity += (p.baseOpacity + pulse - p.opacity) * 0.02;

    // Mouse repulsion
    const dx = p.x - mouseX;
    const dy = p.y - mouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < MOUSE_REPEL_RANGE && dist > 0) {
      const force = (1 - dist / MOUSE_REPEL_RANGE) * MOUSE_REPEL_STRENGTH;
      p.vx += (dx / dist) * force;
      p.vy += (dy / dist) * force;
    }

    // Friction
    p.vx *= 0.99;
    p.vy *= 0.99;

    // Clamp speed
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (speed > MAX_SPEED * 3) {
      p.vx = (p.vx / speed) * MAX_SPEED * 3;
      p.vy = (p.vy / speed) * MAX_SPEED * 3;
    }

    // Move
    p.x += p.vx;
    p.y += p.vy;

    // Wrap around edges
    if (p.x < -10) p.x = width + 10;
    if (p.x > width + 10) p.x = -10;
    if (p.y < -10) p.y = height + 10;
    if (p.y > height + 10) p.y = -10;

    // Draw
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = isDark
      ? `rgba(239, 235, 233, ${p.opacity})`  // warm white for dark mode
      : `rgba(78, 52, 46, ${p.opacity * 0.6})`; // dark brown for light mode
    ctx.fill();
  }

  animId = requestAnimationFrame(animate);
}

function handleMouseMove(e: MouseEvent): void {
  mouseX = e.clientX;
  mouseY = e.clientY;
}

export function initParticles(): void {
  // Skip on mobile
  if (window.innerWidth < 768) return;

  // Respect reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  canvas = document.createElement('canvas');
  canvas.id = 'particle-canvas';
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;';

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
    particles.push(createParticle());
  }

  // Fade in particles gradually
  particles.forEach((p, i) => {
    p.opacity = 0;
    setTimeout(() => {
      p.baseOpacity = 0.15 + Math.random() * 0.25;
    }, i * 80);
  });

  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('resize', resizeCanvas);

  animId = requestAnimationFrame(animate);
}

export function destroyParticles(): void {
  if (animId) cancelAnimationFrame(animId);
  canvas?.remove();
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('resize', resizeCanvas);
  canvas = null;
  ctx = null;
  particles = [];
}

// boot.ts - cinematic OS boot sequence

const BOOT_LINES = [
  { text: '[kernel] loading pietrOS kernel...', delay: 0 },
  { text: '[kernel] initializing memory management', delay: 200 },
  { text: '[  <span class="boot-ok">OK</span>  ] mounted /home/guest', delay: 400 },
  { text: '[  <span class="boot-ok">OK</span>  ] started window compositor', delay: 600 },
  { text: '[  <span class="boot-ok">OK</span>  ] loaded font subsystem', delay: 850 },
  { text: '[<span class="boot-info">INFO</span>] detecting display...', delay: 1050 },
  { text: '[  <span class="boot-ok">OK</span>  ] display ready — resolution ' + window.innerWidth + 'x' + window.innerHeight, delay: 1300 },
  { text: '[  <span class="boot-ok">OK</span>  ] network interfaces configured', delay: 1550 },
  { text: '[  <span class="boot-ok">OK</span>  ] started dock service', delay: 1800 },
  { text: '[<span class="boot-info">INFO</span>] starting desktop environment...', delay: 2100 },
];

const PROGRESS_STEPS = [
  { percent: 10, delay: 100 },
  { percent: 25, delay: 300 },
  { percent: 40, delay: 600 },
  { percent: 55, delay: 1000 },
  { percent: 70, delay: 1400 },
  { percent: 85, delay: 1800 },
  { percent: 95, delay: 2200 },
  { percent: 100, delay: 2500 },
];

const BOOT_DURATION = 3000; // total boot time before desktop reveal

let bootSkipped = false;
let bootTimeouts: number[] = [];

function skipBoot(): void {
  if (bootSkipped) return;
  bootSkipped = true;

  // Clear all pending timeouts
  bootTimeouts.forEach(id => clearTimeout(id));
  bootTimeouts = [];

  finishBoot();
}

function finishBoot(): void {
  const bootScreen = document.getElementById('boot-screen');
  const desktop = document.getElementById('desktop');
  if (!bootScreen || !desktop) return;

  // Exit boot screen
  bootScreen.classList.add('boot-exit');

  // Reveal desktop
  desktop.classList.remove('desktop-hidden');
  desktop.classList.add('desktop-reveal');

  // Remove boot screen from DOM after transition
  setTimeout(() => {
    bootScreen.remove();
    desktop.classList.remove('desktop-reveal');
  }, 800);
}

export function initBoot(onComplete: () => void): void {
  const bootScreen = document.getElementById('boot-screen');
  if (!bootScreen) {
    onComplete();
    return;
  }

  // Skip boot for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Check if user has visited before (skip boot for returning visitors)
  const hasVisited = sessionStorage.getItem('pietros-booted');
  if (hasVisited || prefersReducedMotion) {
    bootScreen.remove();
    const desktop = document.getElementById('desktop');
    if (desktop) {
      desktop.classList.remove('desktop-hidden');
    }
    onComplete();
    return;
  }

  const logEl = document.getElementById('boot-log');
  const progressEl = document.getElementById('boot-progress');

  // Add boot log lines
  BOOT_LINES.forEach(line => {
    const tid = window.setTimeout(() => {
      if (bootSkipped) return;
      const div = document.createElement('div');
      div.className = 'boot-line';
      div.innerHTML = line.text;
      logEl?.appendChild(div);

      // Auto-scroll
      if (logEl) logEl.scrollTop = logEl.scrollHeight;
    }, line.delay);
    bootTimeouts.push(tid);
  });

  // Animate progress bar
  PROGRESS_STEPS.forEach(step => {
    const tid = window.setTimeout(() => {
      if (bootSkipped) return;
      if (progressEl) progressEl.style.width = `${step.percent}%`;
    }, step.delay);
    bootTimeouts.push(tid);
  });

  // Finish boot after duration
  const finishId = window.setTimeout(() => {
    if (bootSkipped) return;
    bootSkipped = true;
    finishBoot();
    sessionStorage.setItem('pietros-booted', '1');
    // Small delay before initializing desktop features
    setTimeout(onComplete, 400);
  }, BOOT_DURATION);
  bootTimeouts.push(finishId);

  // Skip on key press or click
  const skipHandler = () => {
    skipBoot();
    sessionStorage.setItem('pietros-booted', '1');
    setTimeout(onComplete, 400);
    document.removeEventListener('keydown', skipHandler);
    document.removeEventListener('click', skipHandler);
  };

  document.addEventListener('keydown', skipHandler);
  document.addEventListener('click', skipHandler);
}

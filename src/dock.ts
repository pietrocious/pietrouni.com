// dock.ts - macOS-style fish-eye magnification for the dock
// Icons magnify based on proximity to cursor using Gaussian falloff

const DOCK_CONFIG = {
  maxScale: 1.6,        // maximum scale for hovered icon
  baseScale: 1.0,       // default scale
  neighborRange: 120,    // px range for neighbor magnification
  animationSpeed: 0.15,  // lerp speed (0-1, lower = smoother)
  bounceStiffness: 0.4,  // spring stiffness for bounce
  bounceDamping: 0.65,   // spring damping for bounce
};

interface DockItemState {
  element: HTMLElement;
  currentScale: number;
  targetScale: number;
  currentY: number;
  targetY: number;
  centerX: number;
}

let dockItems: DockItemState[] = [];
let isHoveringDock = false;
let animationId: number | null = null;
let dockContainer: HTMLElement | null = null;

// Gaussian function for smooth falloff
function gaussian(x: number, sigma: number): number {
  return Math.exp(-(x * x) / (2 * sigma * sigma));
}

// Linear interpolation
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Update item center positions (call on resize/layout change)
function updateItemPositions(): void {
  dockItems.forEach(item => {
    const rect = item.element.getBoundingClientRect();
    item.centerX = rect.left + rect.width / 2;
  });
}

// Calculate scale for each item based on cursor distance
function calculateScales(mouseX: number): void {
  dockItems.forEach(item => {
    const distance = Math.abs(mouseX - item.centerX);

    if (distance < DOCK_CONFIG.neighborRange) {
      const normalizedDist = distance / DOCK_CONFIG.neighborRange;
      const scaleFactor = gaussian(normalizedDist, 0.4);
      item.targetScale = DOCK_CONFIG.baseScale + (DOCK_CONFIG.maxScale - DOCK_CONFIG.baseScale) * scaleFactor;
      item.targetY = -(item.targetScale - DOCK_CONFIG.baseScale) * 20;
    } else {
      item.targetScale = DOCK_CONFIG.baseScale;
      item.targetY = 0;
    }
  });
}

// Animation loop - smooth interpolation
function animate(): void {
  let needsUpdate = false;

  dockItems.forEach(item => {
    const prevScale = item.currentScale;
    const prevY = item.currentY;

    item.currentScale = lerp(item.currentScale, item.targetScale, DOCK_CONFIG.animationSpeed);
    item.currentY = lerp(item.currentY, item.targetY, DOCK_CONFIG.animationSpeed);

    // Snap to target if close enough
    if (Math.abs(item.currentScale - item.targetScale) < 0.001) {
      item.currentScale = item.targetScale;
    }
    if (Math.abs(item.currentY - item.targetY) < 0.01) {
      item.currentY = item.targetY;
    }

    // Apply transform
    item.element.style.transform = `scale(${item.currentScale}) translateY(${item.currentY}px)`;

    // Check if we still need to animate
    if (Math.abs(item.currentScale - item.targetScale) > 0.001 ||
        Math.abs(item.currentY - item.targetY) > 0.01) {
      needsUpdate = true;
    }
  });

  // Update center positions as scales change (layout shifts)
  updateItemPositions();

  if (needsUpdate || isHoveringDock) {
    animationId = requestAnimationFrame(animate);
  } else {
    animationId = null;
  }
}

// Start animation loop if not running
function startAnimation(): void {
  if (!animationId) {
    animationId = requestAnimationFrame(animate);
  }
}

// Reset all items to base scale
function resetScales(): void {
  dockItems.forEach(item => {
    item.targetScale = DOCK_CONFIG.baseScale;
    item.targetY = 0;
  });
  startAnimation();
}

// Handle mouse move over dock area
function handleDockMouseMove(e: MouseEvent): void {
  if (!isHoveringDock) return;
  calculateScales(e.clientX);
}

// Enhanced bounce animation with squash and stretch
export function dockBounce(itemId: string): void {
  const dockItem = document.getElementById(`dock-${itemId}`);
  if (!dockItem) return;

  const icon = dockItem.querySelector('.dock-icon') as HTMLElement;
  if (!icon) return;

  // Remove any existing bounce class
  icon.classList.remove('dock-bounce-enhanced');

  // Force reflow
  void icon.offsetHeight;

  // Add enhanced bounce
  icon.classList.add('dock-bounce-enhanced');
  icon.addEventListener('animationend', () => {
    icon.classList.remove('dock-bounce-enhanced');
  }, { once: true });
}

// Pulse animation for active indicator
function startActivePulse(): void {
  // CSS handles this via the .dock-active-pulse class
}

// Initialize dock magnification system
export function initDock(): void {
  dockContainer = document.querySelector('.dock-container');
  if (!dockContainer) return;

  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  // Check if mobile (no hover support)
  const isMobile = window.innerWidth < 768;
  if (isMobile) return;

  // Gather all dock items
  const items = dockContainer.querySelectorAll('.dock-item');
  dockItems = Array.from(items).map(el => ({
    element: el as HTMLElement,
    currentScale: DOCK_CONFIG.baseScale,
    targetScale: DOCK_CONFIG.baseScale,
    currentY: 0,
    targetY: 0,
    centerX: 0,
  }));

  // Disable CSS hover transforms (we handle them now)
  dockItems.forEach(item => {
    item.element.style.transition = 'none';
  });

  // Mark dock as using fish-eye (disables CSS hover transforms)
  dockContainer.classList.add('dock-fisheye-active');

  // Initial position calculation
  updateItemPositions();

  // Mouse enter dock area
  dockContainer.addEventListener('mouseenter', () => {
    isHoveringDock = true;
    startAnimation();
  });

  // Mouse leave dock area
  dockContainer.addEventListener('mouseleave', () => {
    isHoveringDock = false;
    resetScales();
  });

  // Mouse move within dock area
  dockContainer.addEventListener('mousemove', handleDockMouseMove);

  // Update positions on window resize
  window.addEventListener('resize', () => {
    updateItemPositions();
    // Re-check mobile
    const nowMobile = window.innerWidth < 768;
    if (nowMobile) {
      destroyDock();
    }
  });
}

// Cleanup
export function destroyDock(): void {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  // Remove fish-eye class and reset transforms
  if (dockContainer) {
    dockContainer.classList.remove('dock-fisheye-active');
  }
  dockItems.forEach(item => {
    item.element.style.transform = '';
    item.element.style.transition = '';
  });

  dockItems = [];
  isHoveringDock = false;
}

// Refresh dock items list (call after dynamic add/remove)
export function refreshDockItems(): void {
  if (!dockContainer) {
    dockContainer = document.querySelector('.dock-container');
  }
  if (!dockContainer) return;

  const isMobile = window.innerWidth < 768;
  if (isMobile) return;

  const items = dockContainer.querySelectorAll('.dock-item');
  dockItems = Array.from(items).map(el => ({
    element: el as HTMLElement,
    currentScale: DOCK_CONFIG.baseScale,
    targetScale: DOCK_CONFIG.baseScale,
    currentY: 0,
    targetY: 0,
    centerX: 0,
  }));

  // Disable CSS hover transforms on new items
  dockItems.forEach(item => {
    item.element.style.transition = 'none';
  });

  updateItemPositions();
}

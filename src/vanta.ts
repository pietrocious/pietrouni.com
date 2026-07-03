
// vanta.ts — manages Vanta.js animated wallpaper effects
// Effects: Birds (0), Halo (1), Waves (2)
// three.js + the vanta effect modules are ~700KB combined, so they're loaded on demand
// (via dynamic import) rather than bundled into the main chunk for visitors who never pick one.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VantaEffect = { destroy: () => void; setOptions: (opts: Record<string, unknown>) => void };
let activeEffect: VantaEffect | null = null;
let activeEffectName: string | null = null;

// Bumped on every initVanta/destroyVanta call so a slow-loading effect can detect
// it's been superseded (e.g. rapid wallpaper cycling) and discard itself instead of leaking.
let requestId = 0;

const EFFECT_LOADERS: Record<string, () => Promise<(opts: Record<string, unknown>) => VantaEffect>> = {
  BIRDS: () => import('vanta/dist/vanta.birds.min').then((m) => m.default),
  HALO: () => import('vanta/dist/vanta.halo.min').then((m) => m.default),
  WAVES: () => import('vanta/dist/vanta.waves.min').then((m) => m.default),
};

// Per-effect configs — correct option names from vanta source, tuned for each theme
const CONFIGS: Record<string, { light: Record<string, unknown>; dark: Record<string, unknown> }> = {
  BIRDS: {
    light: {
      backgroundColor: 0xe8f0fe,   // soft sky blue canvas
      color1: 0x4a90d9,            // primary bird color — medium blue
      color2: 0x9b72cf,            // secondary — soft purple
      colorMode: 'varianceGradient',
      quantity: 4,
      birdSize: 1.5,
      wingSpan: 30,
      speedLimit: 4,
      separation: 50,
      alignment: 50,
      cohesion: 50,
    },
    dark: {
      backgroundColor: 0x07192f,   // deep navy — matches vanta default feel
      color1: 0xff6b6b,            // warm coral-red for contrast
      color2: 0x00d1ff,            // cyan — classic vanta contrast pair
      colorMode: 'varianceGradient',
      quantity: 4,
      birdSize: 1.5,
      wingSpan: 30,
      speedLimit: 4,
      separation: 50,
      alignment: 50,
      cohesion: 50,
    },
  },
  HALO: {
    light: {
      backgroundColor: 0x1a0533,   // deep purple-black like the demo
      baseColor: 0x3d00b5,         // rich electric blue-violet base
      color2: 0xffcc00,            // bright yellow — same contrast as vantajs.com demo
      amplitudeFactor: 1.5,
      ringFactor: 1.0,
      rotationFactor: 1.0,
      xOffset: 0,
      yOffset: 0,
      size: 1.5,
      speed: 1.0,
    },
    dark: {
      backgroundColor: 0x0d0020,   // near-black deep purple
      baseColor: 0x001a59,         // same as vanta default — deep cobalt
      color2: 0xf2e735,            // vivid yellow — exact vanta default contrast pair
      amplitudeFactor: 1.5,
      ringFactor: 1.0,
      rotationFactor: 1.0,
      xOffset: 0,
      yOffset: 0,
      size: 1.5,
      speed: 1.0,
    },
  },
  WAVES: {
    light: {
      color: 0x0099cc,             // clear ocean blue
      shininess: 50,
      waveHeight: 20,
      waveSpeed: 0.75,
      zoom: 0.85,
    },
    dark: {
      color: 0x003366,             // deep ocean midnight blue
      shininess: 60,
      waveHeight: 20,
      waveSpeed: 0.75,
      zoom: 0.85,
    },
  },
};

export async function initVanta(effectName: string, isDark: boolean, desktop: HTMLElement): Promise<void> {
  destroyVanta();

  const key = effectName.toUpperCase();
  const loadEffect = EFFECT_LOADERS[key];
  if (!loadEffect) return;

  const thisRequest = ++requestId;
  const [THREE, fn] = await Promise.all([import('three'), loadEffect()]);

  // Superseded by a newer wallpaper switch (or destroyed) while modules were loading — bail out.
  if (thisRequest !== requestId) return;

  // Dedicated wrapper: explicit px dimensions so Vanta reads correct offsetWidth/Height at init.
  // Using inset:0 alone can yield 0 at read time before layout is committed.
  let wrapper = document.getElementById('vanta-bg') as HTMLDivElement | null;
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.id = 'vanta-bg';
    desktop.insertBefore(wrapper, desktop.firstChild);
  }
  // Always set explicit dimensions to the current viewport
  const w = window.innerWidth;
  const h = window.innerHeight;
  wrapper.style.cssText = `position:absolute;top:0;left:0;width:${w}px;height:${h}px;z-index:0;overflow:hidden;`;

  const themeConfig = CONFIGS[key]?.[isDark ? 'dark' : 'light'] ?? {};

  activeEffect = fn({
    el: wrapper,
    THREE,
    ...themeConfig,
  });
  activeEffectName = key;

  // Keep wrapper filling the viewport on resize, then let Vanta's own resize handle the canvas
  window.addEventListener('resize', resizeVantaBg);

  // Force Vanta to resize its canvas to full dimensions on next frame
  requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
}

export function updateVantaTheme(isDark: boolean): void {
  if (!activeEffect || !activeEffectName) return;
  const themeConfig = CONFIGS[activeEffectName]?.[isDark ? 'dark' : 'light'];
  if (themeConfig) {
    try {
      activeEffect.setOptions(themeConfig);
    } catch {
      // setOptions not always reliable; applyWallpaper will reinit if needed
    }
  }
}

export function destroyVanta(): void {
  requestId++;
  if (activeEffect) {
    activeEffect.destroy();
    activeEffect = null;
    activeEffectName = null;
    window.removeEventListener('resize', resizeVantaBg);
    document.getElementById('vanta-bg')?.remove();
  }
}

function resizeVantaBg(): void {
  const wrapper = document.getElementById('vanta-bg');
  if (!wrapper) return;
  wrapper.style.width = window.innerWidth + 'px';
  wrapper.style.height = window.innerHeight + 'px';
}

export function isVantaActive(): boolean {
  return activeEffect !== null;
}

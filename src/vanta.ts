
// vanta.ts — manages animated wallpaper effects
// Effects: Halo, Birds, Waves, Clouds, Rings and Dots from Vanta.js;
// Fable and Nebula are custom shaders.
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
  CLOUDS: () => import('vanta/dist/vanta.clouds.min').then((m) => m.default),
  RINGS: () => import('vanta/dist/vanta.rings.min').then((m) => m.default),
  DOTS: () => import('vanta/dist/vanta.dots.min').then((m) => m.default),
  // Custom raw-WebGL effects — no three.js needed.
  FABLE: () => import('./fable').then((m) => m.default),
  NEBULA: () => import('./nebula').then((m) => m.default),
};

const SELF_CONTAINED_EFFECTS = new Set(['FABLE', 'NEBULA']);

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
  FABLE: {
    light: {
      backgroundColor: 0x241040,   // deep plum canvas (dark base like HALO's light config)
      baseColor: 0x7956b8,         // violet enchanted fog
      color2: 0xffcf70,            // warm spell motes
      color3: 0x67b8ad,            // moonlit teal mist
    },
    dark: {
      backgroundColor: 0x040011,   // near-black indigo
      baseColor: 0x39236f,         // deep violet fog
      color2: 0xf2c963,            // ember-gold motes
      color3: 0x246d70,            // cool forest mist
    },
  },
  NEBULA: {
    light: {
      backgroundColor: 0x100927,   // aubergine night sky
      baseColor: 0x6846b8,         // violet molecular cloud
      color2: 0xffd08a,            // warm young-star glow
      color3: 0x187486,            // teal gas veil
    },
    dark: {
      backgroundColor: 0x02030d,   // blue-black deep space
      baseColor: 0x25135f,         // subdued indigo cloud
      color2: 0xf4c979,            // soft gold stellar core
      color3: 0x075263,            // cool cyan dust
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
  CLOUDS: {
    light: {
      backgroundColor: 0xdce8f0,
      skyColor: 0x7fb9d1,
      cloudColor: 0xe8edf2,
      cloudShadowColor: 0x506a80,
      sunColor: 0xffc36b,
      sunGlareColor: 0xff9a66,
      sunlightColor: 0xffddb2,
      scale: 3,
      scaleMobile: 5,
      speed: 0.6,
      mouseEase: true,
    },
    dark: {
      backgroundColor: 0x07111f,
      skyColor: 0x172a46,
      cloudColor: 0x3d5068,
      cloudShadowColor: 0x050b14,
      sunColor: 0xd8a75e,
      sunGlareColor: 0x9d563d,
      sunlightColor: 0x8a6a53,
      scale: 3,
      scaleMobile: 5,
      speed: 0.55,
      mouseEase: true,
    },
  },
  RINGS: {
    light: {
      backgroundColor: 0xe8e0d8,
      color: 0x88ff00,
    },
    dark: {
      backgroundColor: 0x10131a,
      color: 0x88ff00,
    },
  },
  DOTS: {
    light: {
      backgroundColor: 0xe9e4dc,
      color: 0x4a7c9d,
      color2: 0xa48362,
      size: 3.5,
      spacing: 40,
      showLines: true,
    },
    dark: {
      backgroundColor: 0x080c14,
      color: 0x67c5c8,
      color2: 0x7c5db0,
      size: 3.5,
      spacing: 40,
      showLines: true,
    },
  },
};

export async function initVanta(effectName: string, isDark: boolean, desktop: HTMLElement): Promise<void> {
  destroyVanta();

  const key = effectName.toUpperCase();
  const loadEffect = EFFECT_LOADERS[key];
  if (!loadEffect) return;

  const thisRequest = ++requestId;
  // Our shaders are self-contained WebGL — skip the ~600KB three.js import for them.
  // Several Vanta bundles capture window.THREE as soon as their module is evaluated.
  // Load and expose Three first; importing both in parallel creates a browser-dependent
  // race that can leave Rings or Dots stuck on the static fallback.
  let THREE: typeof import('three') | null;
  let fn: (opts: Record<string, unknown>) => VantaEffect;
  if (SELF_CONTAINED_EFFECTS.has(key)) {
    THREE = null;
    fn = await loadEffect();
  } else {
    THREE = await import('three');
    (window as Window & { THREE?: typeof import('three') }).THREE = THREE;
    fn = await loadEffect();
  }

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

  // Register before constructing Vanta so its own resize listener measures the
  // wrapper after we have updated the explicit pixel dimensions.
  window.addEventListener('resize', resizeVantaBg);

  try {
    activeEffect = fn({
      el: wrapper,
      ...(THREE ? { THREE } : {}),
      ...themeConfig,
    });
  } catch (error) {
    console.error(`Unable to start ${key} wallpaper.`, error);
    window.removeEventListener('resize', resizeVantaBg);
    wrapper.remove();
    activeEffect = null;
    activeEffectName = null;
    return;
  }
  activeEffectName = key;

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

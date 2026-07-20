// nebula.ts — a custom deep-space shader wallpaper, written from scratch like fable.ts.
// Domain-warped interstellar gas in two hues, a bright young star with diffraction
// spikes (a nod to Halo's glow), and two parallax starfield layers with twinkle.
// Raw WebGL on a fullscreen triangle — no three.js, so it stays ~10KB.
// Exposes the same { destroy, setOptions } shape vanta.ts manages, so it plugs
// into the wallpaper pipeline as just another effect.

type EffectHandle = {
  destroy: () => void;
  setOptions: (o: Record<string, unknown>) => void;
};

type Palette = {
  background: [number, number, number];
  base: [number, number, number];
  accent: [number, number, number];
  cloud: [number, number, number];
};

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform vec3 uBg;
uniform vec3 uBase;
uniform vec3 uAccent;
uniform vec3 uCloud;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1, 0)), f.x),
    mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = r * p * 2.03; a *= 0.55; }
  return v;
}

// one layer of procedurally placed stars; scale = cells per uv unit,
// radius/thresh in cell units, nearer layers pass a stronger mouse parallax
vec3 starLayer(vec2 uv, float scale, float radius, float thresh, float t) {
  vec2 p = uv * scale;
  vec2 id = floor(p);
  vec2 f = fract(p);
  float h = hash(id);
  if (h < thresh) return vec3(0.0);
  vec2 pos = 0.15 + 0.7 * vec2(hash(id + 13.7), hash(id + 27.3));
  float d = length(f - pos);
  float bright = (h - thresh) / (1.0 - thresh);
  float tw = 0.6 + 0.4 * sin(t * (0.5 + bright * 2.0) + h * 39.0);
  vec3 tint = mix(vec3(0.72, 0.84, 1.0), vec3(1.0, 0.9, 0.72), hash(id + 3.1));
  float s = smoothstep(radius, 0.0, d);
  return s * s * bright * tw * tint;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
  float t = uTime;

  // slow drift through the gas field, gentle mouse parallax
  vec2 p = uv * 1.8 - uMouse * 0.06 + vec2(t * 0.012, t * -0.007);

  // two-level domain warp so the clouds read as gaseous, not smoky
  vec2 q = vec2(fbm(p + vec2(0.0, t * 0.03)), fbm(p + vec2(5.2, 1.3) - t * 0.02));
  vec2 w = vec2(fbm(p + 2.2 * q + vec2(1.7, 9.2)), fbm(p + 2.2 * q + vec2(8.3, 2.8)));
  float gas = fbm(p + 2.4 * w);
  float wisps = fbm(p * 1.6 - 1.8 * w + 3.7);

  vec3 col = uBg;
  float dense = smoothstep(0.38, 0.95, gas);
  float veil = smoothstep(0.45, 1.0, wisps);
  col += uBase * dense * 0.9;
  col += uCloud * veil * 0.65;
  // lit ridges where the two gas fields overlap — light catching the dust
  col += uAccent * dense * veil * 0.7;

  // bright young star off-center, echoing Halo's core glow
  vec2 core = uv - vec2(0.18, 0.10) - uMouse * 0.03;
  float d = length(core);
  col += uAccent * 0.30 * exp(-d * 8.0);
  col += vec3(1.0, 0.98, 0.92) * 0.55 * exp(-d * 28.0);
  // faint diffraction spikes
  float spike = exp(-abs(core.x) * 120.0) + exp(-abs(core.y) * 120.0);
  col += uAccent * spike * exp(-d * 6.0) * 0.4;

  // distant stars barely parallax, near stars follow the mouse — fakes depth
  col += starLayer(uv - uMouse * 0.015, 42.0, 0.05, 0.78, t) * 0.5;
  col += starLayer(uv - uMouse * 0.04, 18.0, 0.06, 0.88, t) * 0.9;

  // vignette
  col *= 1.0 - 0.55 * smoothstep(0.5, 1.25, length(uv));

  gl_FragColor = vec4(col, 1.0);
}`;

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

function hexToRgb(hex: number): [number, number, number] {
  return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
}

function paletteFrom(o: Record<string, unknown>): Palette {
  return {
    background: hexToRgb((o.backgroundColor as number) ?? 0x030014),
    base: hexToRgb((o.baseColor as number) ?? 0x2a1a66),
    accent: hexToRgb((o.color2 as number) ?? 0xf2d38a),
    cloud: hexToRgb((o.color3 as number) ?? 0x0e4a5e),
  };
}

function rgb(color: [number, number, number], alpha = 1): string {
  const [r, g, b] = color.map((channel) => Math.round(channel * 255));
  return `rgba(${r},${g},${b},${alpha})`;
}

// A real animated fallback, used if WebGL is unavailable, compilation fails, or
// the GPU drops the context. It deliberately mirrors the shader composition so
// the wallpaper never collapses to a flat gradient and a blurred dot.
function createCanvasFallback(el: HTMLElement, opts: Record<string, unknown>): EffectHandle {
  const canvas = document.createElement('canvas');
  canvas.dataset.nebulaRenderer = 'canvas2d';
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  el.appendChild(canvas);
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    canvas.remove();
    return { destroy() {}, setOptions() {} };
  }

  let palette = paletteFrom(opts);
  let width = 1;
  let height = 1;
  let raf = 0;
  let lastFrame = 0;
  let pointerX = 0;
  let pointerY = 0;

  const stars = Array.from({ length: 150 }, (_, index) => ({
    x: ((index * 0.61803398875) + Math.sin(index * 91.7) * 0.13 + 1) % 1,
    y: ((index * 0.41421356237) + Math.sin(index * 37.1) * 0.17 + 1) % 1,
    radius: 0.35 + ((index * 47) % 13) / 11,
    phase: index * 1.79,
    depth: 0.25 + ((index * 29) % 70) / 100,
  }));
  const clouds = Array.from({ length: 8 }, (_, index) => ({
    phase: index * 0.87,
    speed: 0.035 + (index % 3) * 0.012,
    radius: 0.28 + (index % 4) * 0.07,
    color: index % 3,
  }));

  const resize = (): void => {
    width = Math.max(1, window.innerWidth || el.offsetWidth);
    height = Math.max(1, window.innerHeight || el.offsetHeight);
    const scale = Math.min(1, Math.sqrt(1_000_000 / (width * height)));
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
  };
  const onPointer = (event: PointerEvent): void => {
    pointerX = event.clientX / Math.max(1, window.innerWidth) - 0.5;
    pointerY = event.clientY / Math.max(1, window.innerHeight) - 0.5;
  };

  const frame = (now: number): void => {
    raf = requestAnimationFrame(frame);
    if (now - lastFrame < 33) return;
    lastFrame = now;
    const w = canvas.width;
    const h = canvas.height;
    const t = now / 1000;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = rgb(palette.background);
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < clouds.length; i++) {
      const cloud = clouds[i];
      const x = w * (0.5 + Math.sin(t * cloud.speed + cloud.phase) * 0.34 + pointerX * (0.02 + i * 0.002));
      const y = h * (0.5 + Math.cos(t * cloud.speed * 0.83 + cloud.phase * 1.7) * 0.31 + pointerY * 0.025);
      const radius = Math.max(w, h) * cloud.radius;
      const color = cloud.color === 0 ? palette.base : cloud.color === 1 ? palette.cloud : palette.accent;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, rgb(color, cloud.color === 2 ? 0.12 : 0.2));
      gradient.addColorStop(0.46, rgb(color, cloud.color === 2 ? 0.045 : 0.09));
      gradient.addColorStop(1, rgb(color, 0));
      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    for (const star of stars) {
      const twinkle = 0.35 + 0.65 * Math.pow(Math.sin(t * (0.4 + star.depth) + star.phase) * 0.5 + 0.5, 3);
      const x = (star.x + pointerX * star.depth * 0.018) * w;
      const y = (star.y + pointerY * star.depth * 0.018) * h;
      ctx.beginPath();
      ctx.fillStyle = `rgba(226,239,255,${twinkle * (0.25 + star.depth * 0.55)})`;
      ctx.arc(x, y, star.radius * (0.45 + star.depth), 0, Math.PI * 2);
      ctx.fill();
    }

    const coreX = w * (0.59 + pointerX * 0.018);
    const coreY = h * (0.43 + pointerY * 0.018);
    const coreRadius = Math.min(w, h) * 0.12;
    const glow = ctx.createRadialGradient(coreX, coreY, 0, coreX, coreY, coreRadius);
    glow.addColorStop(0, 'rgba(255,255,248,1)');
    glow.addColorStop(0.055, rgb(palette.accent, 0.95));
    glow.addColorStop(0.24, rgb(palette.accent, 0.3));
    glow.addColorStop(1, rgb(palette.accent, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(coreX - coreRadius, coreY - coreRadius, coreRadius * 2, coreRadius * 2);

    const horizontal = ctx.createLinearGradient(coreX - coreRadius * 1.8, 0, coreX + coreRadius * 1.8, 0);
    horizontal.addColorStop(0, rgb(palette.accent, 0));
    horizontal.addColorStop(0.5, rgb(palette.accent, 0.55));
    horizontal.addColorStop(1, rgb(palette.accent, 0));
    ctx.fillStyle = horizontal;
    ctx.fillRect(coreX - coreRadius * 1.8, coreY - 0.7, coreRadius * 3.6, 1.4);

    const vertical = ctx.createLinearGradient(0, coreY - coreRadius * 1.5, 0, coreY + coreRadius * 1.5);
    vertical.addColorStop(0, rgb(palette.accent, 0));
    vertical.addColorStop(0.5, rgb(palette.accent, 0.45));
    vertical.addColorStop(1, rgb(palette.accent, 0));
    ctx.fillStyle = vertical;
    ctx.fillRect(coreX - 0.7, coreY - coreRadius * 1.5, 1.4, coreRadius * 3);
  };

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onPointer);
  raf = requestAnimationFrame(frame);

  return {
    destroy(): void {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointer);
      canvas.remove();
    },
    setOptions(next: Record<string, unknown>): void {
      palette = paletteFrom(next);
    },
  };
}

export default function NEBULA(opts: Record<string, unknown>): EffectHandle {
  const el = opts.el as HTMLElement;
  let currentOptions = { ...opts };
  let fallback: EffectHandle | null = null;
  const canvas = document.createElement('canvas');
  canvas.dataset.nebulaRenderer = 'webgl';
  canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:block;';
  el.appendChild(canvas);

  const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) {
    canvas.remove();
    return createCanvasFallback(el, opts);
  }

  const compile = (type: number, src: string): WebGLShader => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const reason = gl.getShaderInfoLog(s) || 'unknown shader compilation error';
      gl.deleteShader(s);
      throw new Error(reason);
    }
    return s;
  };
  let vertexShader: WebGLShader;
  let fragmentShader: WebGLShader;
  let prog: WebGLProgram;
  try {
    vertexShader = compile(gl.VERTEX_SHADER, VERT);
    fragmentShader = compile(gl.FRAGMENT_SHADER, FRAG);
    prog = gl.createProgram()!;
    gl.attachShader(prog, vertexShader);
    gl.attachShader(prog, fragmentShader);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(prog) || 'unknown shader link error');
    }
  } catch (error) {
    console.warn('Nebula WebGL renderer unavailable; using Canvas 2D fallback.', error);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    canvas.remove();
    return createCanvasFallback(el, opts);
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'uRes');
  const uTime = gl.getUniformLocation(prog, 'uTime');
  const uMouse = gl.getUniformLocation(prog, 'uMouse');
  const uBg = gl.getUniformLocation(prog, 'uBg');
  const uBase = gl.getUniformLocation(prog, 'uBase');
  const uAccent = gl.getUniformLocation(prog, 'uAccent');
  const uCloud = gl.getUniformLocation(prog, 'uCloud');

  const applyColors = (o: Record<string, unknown>): void => {
    gl.uniform3fv(uBg, hexToRgb((o.backgroundColor as number) ?? 0x030014));
    gl.uniform3fv(uBase, hexToRgb((o.baseColor as number) ?? 0x2a1a66));
    gl.uniform3fv(uAccent, hexToRgb((o.color2 as number) ?? 0xf2d38a));
    gl.uniform3fv(uCloud, hexToRgb((o.color3 as number) ?? 0x0e4a5e));
  };
  applyColors(opts);

  // Cap the fragment workload on ultrawide/high-resolution displays. The canvas
  // is CSS-scaled and the shader is intentionally soft, so this remains crisp.
  const resize = (): void => {
    const width = window.innerWidth || el.offsetWidth;
    const height = window.innerHeight || el.offsetHeight;
    const scale = Math.min(1, Math.sqrt(950_000 / (width * height)));
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  resize();
  window.addEventListener('resize', resize);

  // pointer parallax, smoothed each frame toward the target
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (e: PointerEvent): void => {
    mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.ty = 1 - (e.clientY / window.innerHeight) * 2;
  };
  window.addEventListener('pointermove', onPointer);

  let raf = 0;
  const start = performance.now();
  let lastFrame = 0;
  const frame = (now: number): void => {
    raf = requestAnimationFrame(frame); // rAF self-pauses in hidden tabs
    if (now - lastFrame < 33) return;
    lastFrame = now;
    mouse.x += (mouse.tx - mouse.x) * 0.04;
    mouse.y += (mouse.ty - mouse.y) * 0.04;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, (now - start) / 1000);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  raf = requestAnimationFrame(frame);

  const removeWebglListeners = (): void => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', onPointer);
    canvas.removeEventListener('webglcontextlost', onContextLost);
  };
  const onContextLost = (event: Event): void => {
    event.preventDefault();
    removeWebglListeners();
    canvas.remove();
    fallback = createCanvasFallback(el, currentOptions);
  };
  canvas.addEventListener('webglcontextlost', onContextLost);

  return {
    destroy(): void {
      if (fallback) {
        fallback.destroy();
        fallback = null;
        return;
      }
      removeWebglListeners();
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.remove();
    },
    setOptions(o: Record<string, unknown>): void {
      currentOptions = { ...currentOptions, ...o };
      if (fallback) fallback.setOptions(currentOptions);
      else applyColors(currentOptions);
    },
  };
}

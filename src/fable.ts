// fable.ts — an enchanted-mist shader wallpaper written from scratch.
// Layered moonlit fog, drifting spell motes, and wandering will-o'-wisps react
// gently to the pointer without competing with the desktop UI.
// Raw WebGL on a fullscreen triangle — no three.js dependency.
// Exposes the same { destroy, setOptions } shape vanta.ts manages, so it plugs
// into the wallpaper pipeline as just another effect.

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform vec3 uBg;
uniform vec3 uBase;
uniform vec3 uAccent;
uniform vec3 uMist;

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
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = r * p * 2.03; a *= 0.54; }
  return v;
}

float mistLayer(vec2 uv, float scale, float drift, float seed) {
  vec2 p = uv * vec2(scale, scale * 1.55);
  p += vec2(uTime * drift, sin(uTime * drift * 0.7 + seed) * 0.14);
  vec2 warp = vec2(
    fbm(p + vec2(seed, uTime * 0.018)),
    fbm(p + vec2(seed + 5.7, -uTime * 0.015))
  );
  float fog = fbm(p + (warp - 0.5) * 2.4);
  return smoothstep(0.36, 0.82, fog);
}

float moteLayer(vec2 uv, float scale, float seed) {
  vec2 p = uv * scale;
  vec2 id = floor(p);
  vec2 cell = fract(p);
  float h = hash(id + seed);
  vec2 pos = vec2(hash(id + seed + 11.3), hash(id + seed + 29.7));
  pos.y = fract(pos.y + uTime * (0.018 + h * 0.025));
  float d = length(cell - pos);
  float alive = smoothstep(0.95, 0.995, h);
  float pulse = 0.38 + 0.62 * (0.5 + 0.5 * sin(uTime * (0.8 + h * 1.7) + h * 31.0));
  return smoothstep(0.038, 0.0, d) * alive * pulse;
}

float wisp(vec2 uv, vec2 center, float size) {
  vec2 d = uv - center;
  d.x *= 0.72;
  return exp(-dot(d, d) * size);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
  vec2 scene = uv - uMouse * 0.035;

  vec3 col = uBg;

  // A dim clearing behind the fog gives the scene depth without a hard focal ring.
  vec2 clearingCenter = vec2(0.16, 0.04) + uMouse * 0.018;
  float clearing = exp(-length(scene - clearingCenter) * 1.7);
  col += uBase * clearing * 0.11;

  // Three veils move at different rates and heights. The masks keep the densest
  // mist low in the frame while allowing thin tendrils to climb upward.
  float back = mistLayer(scene + vec2(0.0, 0.12), 1.15, 0.018, 1.2);
  float middle = mistLayer(scene + vec2(0.0, -0.04), 1.75, -0.024, 5.4);
  float front = mistLayer(scene + vec2(0.0, -0.20), 2.45, 0.032, 9.1);
  float lowMask = smoothstep(0.62, -0.48, scene.y);
  float midMask = smoothstep(0.72, -0.18, scene.y);
  back *= 0.35 + lowMask * 0.65;
  middle *= 0.2 + midMask * 0.8;
  front *= lowMask;

  col += uBase * back * 0.38;
  col += uMist * middle * 0.48;
  col += mix(uBase, uMist, 0.68) * front * 0.34;

  // Silver edges where two mist sheets overlap make the fog feel illuminated.
  float silver = smoothstep(0.42, 0.82, middle) * smoothstep(0.34, 0.72, front);
  col += mix(uMist, vec3(0.78, 0.9, 1.0), 0.45) * silver * 0.24;

  // Slow wandering lights: suggestive of magic, but too soft to read as stars.
  vec2 orbA = vec2(-0.38 + sin(uTime * 0.17) * 0.16, 0.02 + cos(uTime * 0.13) * 0.12);
  vec2 orbB = vec2(0.34 + cos(uTime * 0.11) * 0.20, -0.13 + sin(uTime * 0.15) * 0.10);
  vec2 orbC = vec2(0.02 + sin(uTime * 0.09 + 2.0) * 0.24, 0.25 + cos(uTime * 0.12) * 0.08);
  float wisps = wisp(scene, orbA, 145.0) + wisp(scene, orbB, 175.0) + wisp(scene, orbC, 210.0);
  float wispCores = wisp(scene, orbA, 1300.0) + wisp(scene, orbB, 1550.0) + wisp(scene, orbC, 1800.0);
  col += uAccent * wisps * 0.42;
  col += mix(uAccent, vec3(1.0, 0.98, 0.86), 0.45) * wispCores * 0.42;

  // Sparse rising spell motes with two depths of pointer parallax.
  float motes = moteLayer(uv - uMouse * 0.012, 20.0, 3.4);
  motes += moteLayer(uv - uMouse * 0.026, 12.0, 17.8) * 0.65;
  col += uAccent * motes * 0.68;

  // Keep the outer edges quiet so icons and windows remain readable.
  col *= 1.0 - 0.48 * smoothstep(0.55, 1.35, length(uv));
  col = pow(max(col, 0.0), vec3(0.94));

  gl_FragColor = vec4(col, 1.0);
}`;

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

function hexToRgb(hex: number): [number, number, number] {
  return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
}

export default function FABLE(opts: Record<string, unknown>): {
  destroy: () => void;
  setOptions: (o: Record<string, unknown>) => void;
} {
  const el = opts.el as HTMLElement;
  const canvas = document.createElement('canvas');
  canvas.dataset.fableRenderer = 'webgl';
  canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:block;';
  el.appendChild(canvas);

  const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) {
    // No WebGL — the static CSS fallback stays visible, nothing else to do
    canvas.remove();
    return { destroy() {}, setOptions() {} };
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
  const vertexShader = compile(gl.VERTEX_SHADER, VERT);
  const fragmentShader = compile(gl.FRAGMENT_SHADER, FRAG);
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vertexShader);
  gl.attachShader(prog, fragmentShader);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(prog) || 'unknown shader link error');
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
  const uMist = gl.getUniformLocation(prog, 'uMist');

  const applyColors = (o: Record<string, unknown>): void => {
    gl.uniform3fv(uBg, hexToRgb((o.backgroundColor as number) ?? 0x040011));
    gl.uniform3fv(uBase, hexToRgb((o.baseColor as number) ?? 0x3520a0));
    gl.uniform3fv(uAccent, hexToRgb((o.color2 as number) ?? 0xf2c14e));
    gl.uniform3fv(uMist, hexToRgb((o.color3 as number) ?? 0x4aa7a2));
  };
  applyColors(opts);

  // Cap the fragment workload on ultrawide displays. The fog is intentionally
  // soft, so CSS scaling is visually lossless while keeping animation smooth.
  const resize = (): void => {
    const width = window.innerWidth || el.offsetWidth;
    const height = window.innerHeight || el.offsetHeight;
    const scale = Math.min(1, Math.sqrt(900_000 / (width * height)));
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

  return {
    destroy(): void {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointer);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.remove();
    },
    setOptions(o: Record<string, unknown>): void {
      applyColors(o);
    },
  };
}

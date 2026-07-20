// fable.ts — a custom shader wallpaper in the spirit of Vanta Halo, written from scratch.
// Slowly swirling, domain-warped nebula smoke with subtle mouse parallax.
// Raw WebGL on a fullscreen triangle — no three.js, so it weighs ~10KB where
// the vanta effects pull in ~700KB of three.
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
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = r * p * 2.03; a *= 0.55; }
  return v;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
  vec2 c = uv - uMouse * 0.08;
  float r = length(c);
  float ang = atan(c.y, c.x);

  // vortex: rotate harder near the center, drift slowly with time
  float swirl = 1.4 / (r + 0.35) + uTime * 0.05;
  vec2 sp = vec2(cos(ang + swirl), sin(ang + swirl)) * r;

  // domain-warped nebula smoke
  vec2 q = vec2(fbm(sp * 2.2 + uTime * 0.06), fbm(sp * 2.2 - uTime * 0.05 + 4.7));
  float neb = smoothstep(0.35, 1.05, fbm(sp * 2.6 + q * 1.6));

  vec3 col = uBg;
  col += uBase * neb * 0.9;
  // accent glints where the domain warp folds brightest, like light catching smoke
  col += uAccent * neb * smoothstep(0.55, 1.0, q.x) * 0.6;
  // vignette
  col *= 1.0 - 0.6 * smoothstep(0.45, 1.2, length(uv));

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
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
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

  const applyColors = (o: Record<string, unknown>): void => {
    gl.uniform3fv(uBg, hexToRgb((o.backgroundColor as number) ?? 0x040011));
    gl.uniform3fv(uBase, hexToRgb((o.baseColor as number) ?? 0x3520a0));
    gl.uniform3fv(uAccent, hexToRgb((o.color2 as number) ?? 0xf2c14e));
  };
  applyColors(opts);

  // ponytail: render at CSS resolution (DPR capped at 1) — the effect is all soft
  // gradients so extra pixels are invisible; raise the cap if it ever looks blurry
  const resize = (): void => {
    canvas.width = el.offsetWidth || window.innerWidth;
    canvas.height = el.offsetHeight || window.innerHeight;
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
  const frame = (): void => {
    mouse.x += (mouse.tx - mouse.x) * 0.04;
    mouse.y += (mouse.ty - mouse.y) * 0.04;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, (performance.now() - start) / 1000);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(frame); // rAF self-pauses in hidden tabs
  };
  raf = requestAnimationFrame(frame);

  return {
    destroy(): void {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointer);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.remove();
    },
    setOptions(o: Record<string, unknown>): void {
      applyColors(o);
    },
  };
}

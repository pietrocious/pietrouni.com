// cosmos.ts — Custom Three.js fullscreen cosmic nebula shader wallpaper
// Replaces Vanta HALO with a flowing space-type effect that fills the entire viewport

import * as THREE from 'three';

// ─── GLSL Noise ────────────────────────────────────────────────
// Simplex 3D noise by Ashima Arts (MIT license)
const NOISE_GLSL = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

// ─── Fragment Shader ───────────────────────────────────────────
const FRAG = /* glsl */ `
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform vec3 u_bgColor;

${NOISE_GLSL}

// Fractional Brownian Motion — 5 octaves
float fbm(vec3 p) {
  float val = 0.0;
  float amp = 0.5;
  float freq = 1.0;
  for (int i = 0; i < 5; i++) {
    val += amp * snoise(p * freq);
    freq *= 2.0;
    amp *= 0.5;
  }
  return val;
}

// Domain-warped FBM for more organic shapes
float warpedFbm(vec3 p) {
  vec3 q = vec3(
    fbm(p + vec3(0.0, 0.0, 0.0)),
    fbm(p + vec3(5.2, 1.3, 2.8)),
    0.0
  );
  vec3 r = vec3(
    fbm(p + 4.0 * q + vec3(1.7, 9.2, 0.0)),
    fbm(p + 4.0 * q + vec3(8.3, 2.8, 0.0)),
    0.0
  );
  return fbm(p + 4.0 * r);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  // Aspect-corrected coordinates centered at origin
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

  float t = u_time * 0.08;

  // Layer 1: Large-scale flowing nebula (domain-warped)
  float n1 = warpedFbm(vec3(p * 1.2, t * 0.7));

  // Layer 2: Mid-scale turbulence
  float n2 = fbm(vec3(p * 2.5 + vec2(t * 0.3, -t * 0.2), t * 0.5));

  // Layer 3: Fine detail / star dust
  float n3 = fbm(vec3(p * 5.0 + vec2(-t * 0.4, t * 0.15), t * 0.3));

  // Remap noise from [-1,1] to [0,1] range
  n1 = n1 * 0.5 + 0.5;
  n2 = n2 * 0.5 + 0.5;
  n3 = n3 * 0.5 + 0.5;

  // Build color from layered noise
  vec3 col = u_bgColor;

  // Main nebula body — broad flowing shapes
  col = mix(col, u_color1, smoothstep(0.3, 0.7, n1) * 0.7);

  // Secondary color — turbulent swirls
  col = mix(col, u_color2, smoothstep(0.45, 0.75, n2) * 0.5);

  // Accent highlights — fine bright streaks
  col = mix(col, u_color3, smoothstep(0.6, 0.85, n3) * 0.4);

  // Bright core glow where noise layers converge
  float core = smoothstep(0.55, 0.9, n1 * 0.5 + n2 * 0.3 + n3 * 0.2);
  col += u_color3 * core * 0.3;

  // Subtle vignette — darker edges for depth
  float vig = 1.0 - dot(uv - 0.5, uv - 0.5) * 1.2;
  col *= smoothstep(0.0, 0.7, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

// ─── Vertex Shader ─────────────────────────────────────────────
const VERT = /* glsl */ `
void main() {
  gl_Position = vec4(position, 1.0);
}
`;

// ─── Types ─────────────────────────────────────────────────────
interface CosmosOptions {
  el: HTMLElement;
  backgroundColor?: number;
  color1?: number;
  color2?: number;
  color3?: number;
  speed?: number;
}

interface CosmosEffect {
  destroy: () => void;
  setOptions: (opts: Record<string, unknown>) => void;
}

// ─── Helpers ───────────────────────────────────────────────────
function hexToVec3(hex: number): THREE.Vector3 {
  return new THREE.Vector3(
    ((hex >> 16) & 0xff) / 255,
    ((hex >> 8) & 0xff) / 255,
    (hex & 0xff) / 255,
  );
}

// ─── Factory ───────────────────────────────────────────────────
export function createCosmos(opts: CosmosOptions & Record<string, unknown>): CosmosEffect {
  const el = opts.el;
  const w = el.offsetWidth || window.innerWidth;
  const h = el.offsetHeight || window.innerHeight;

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  el.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';

  // Fullscreen quad
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const scene = new THREE.Scene();
  const geometry = new THREE.PlaneGeometry(2, 2);

  const uniforms = {
    u_time: { value: 0.0 },
    u_resolution: { value: new THREE.Vector2(w, h) },
    u_bgColor: { value: hexToVec3(opts.backgroundColor ?? 0x050012) },
    u_color1: { value: hexToVec3(opts.color1 ?? 0x2a0066) },
    u_color2: { value: hexToVec3(opts.color2 ?? 0x0055aa) },
    u_color3: { value: hexToVec3(opts.color3 ?? 0xffcc00) },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms,
  });

  scene.add(new THREE.Mesh(geometry, material));

  // Animation
  const speed = (opts.speed as number) ?? 1.0;
  let animId = 0;
  let startTime = performance.now();

  function animate() {
    animId = requestAnimationFrame(animate);
    uniforms.u_time.value = ((performance.now() - startTime) / 1000) * speed;
    renderer.render(scene, camera);
  }
  animate();

  // Resize
  function onResize() {
    const nw = el.offsetWidth || window.innerWidth;
    const nh = el.offsetHeight || window.innerHeight;
    renderer.setSize(nw, nh);
    uniforms.u_resolution.value.set(nw, nh);
  }
  window.addEventListener('resize', onResize);

  // Public interface (matches VantaEffect)
  return {
    destroy() {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      material.dispose();
      geometry.dispose();
      renderer.domElement.remove();
    },
    setOptions(newOpts: Record<string, unknown>) {
      if (newOpts.backgroundColor != null) uniforms.u_bgColor.value = hexToVec3(newOpts.backgroundColor as number);
      if (newOpts.color1 != null) uniforms.u_color1.value = hexToVec3(newOpts.color1 as number);
      if (newOpts.color2 != null) uniforms.u_color2.value = hexToVec3(newOpts.color2 as number);
      if (newOpts.color3 != null) uniforms.u_color3.value = hexToVec3(newOpts.color3 as number);
      if (newOpts.speed != null) {
        // Reset time base so speed change doesn't cause a jump
        startTime = performance.now() - (uniforms.u_time.value / (newOpts.speed as number)) * 1000;
      }
    },
  };
}

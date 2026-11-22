import * as THREE from "three";

/**
 * Surface maps baked on the GPU at load time (no downloads). Every map tiles over UV 0..1 = one 8 cm tile
 * (geometry uses box-projected UVs in metres / TILE, so texel density is identical on every part).
 */
export const TILE = 0.08;

const VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform int uMode;          // 0 leather normal · 1 leather roughness · 2 brushed normal · 3 metal roughness · 4 radial roughness
                            // 5 suede normal · 6 contact shadow · 7 anodized roughness · 8 floor roughness · 9 floor falloff
uniform float uSeed, uBase, uAmp, uScratch, uSmudge, uStrength, uTexel;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21) + uSeed * 0.1031); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec2 hash2(vec2 p){ float n = hash(p); return vec2(n, hash(p + n + 17.17)); }
float tnoise(vec2 p, vec2 P){
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  float a = hash(mod(i, P)), b = hash(mod(i + vec2(1, 0), P)), c = hash(mod(i + vec2(0, 1), P)), d = hash(mod(i + vec2(1, 1), P));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p, vec2 P){ float s = 0., a = .5; for (int i = 0; i < 5; i++){ s += a * tnoise(p, P); p *= 2.; P *= 2.; a *= .5; } return s; }
vec2 voronoi(vec2 p, vec2 P){
  vec2 i = floor(p), f = fract(p); float f1 = 8., f2 = 8.;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){
    vec2 g = vec2(x, y); vec2 o = 0.15 + 0.7 * hash2(mod(i + g, P)); vec2 r = g + o - f; float d = dot(r, r);
    if (d < f1){ f2 = f1; f1 = d; } else if (d < f2) f2 = d;
  }
  return vec2(sqrt(f1), sqrt(f2));
}
// pebbled full-grain leather: rounded cells separated by fine creases, plus pores
float leatherH(vec2 uv){
  vec2 v = voronoi(uv * 100., vec2(100.));
  float cell = smoothstep(0.0, 0.28, v.y - v.x);
  float dome = cell * (1. - 0.35 * v.x);
  vec2 v2 = voronoi(uv * 37. + 3.7, vec2(37.));
  float large = smoothstep(0.0, 0.5, v2.y - v2.x);
  float pores = smoothstep(0.82, 1.0, tnoise(uv * 420., vec2(420.)));
  return dome * 0.8 + large * 0.12 + fbm(uv * 160., vec2(160.)) * 0.08 - pores * 0.06;
}
// brushed metal: long fine streaks along u
float brushedH(vec2 uv){
  float s = 0.; float a = .5; vec2 f = vec2(3., 700.);
  for (int i = 0; i < 4; i++){ s += a * tnoise(uv * f, f); f *= vec2(2., 1.7); f = floor(f); a *= .5; }
  return s;
}
float suedeH(vec2 uv){ return fbm(uv * 300., vec2(300.)) * 0.7 + tnoise(uv * 900., vec2(900.)) * 0.3; }

float segDist(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h); }
// micro-scratches (tile-wrapped) and fingerprints, returned as roughness offsets
float scratches(vec2 uv){
  float m = 0.;
  for (int k = 0; k < 36; k++){
    vec2 c = hash2(vec2(float(k), 7.3)); float ang = hash(vec2(float(k), 1.9)) * 6.2832; float len = 0.04 + 0.22 * hash(vec2(float(k), 4.4));
    vec2 d = vec2(cos(ang), sin(ang)) * len * 0.5;
    vec2 p = fract(uv - c + 0.5) - 0.5;
    float w = 0.0007 + 0.0012 * hash(vec2(float(k), 9.1));
    m = max(m, (1. - smoothstep(0., w, segDist(p, -d, d))) * (0.4 + 0.6 * hash(vec2(float(k), 3.3))));
  }
  return m;
}
float fingerprints(vec2 uv){
  float m = 0.;
  for (int k = 0; k < 3; k++){
    vec2 c = hash2(vec2(float(k), 21.7)); vec2 p = fract(uv - c + 0.5) - 0.5; p.x *= 1.25;
    float r = length(p); float mask = 1. - smoothstep(0.03, 0.085, r);
    float ridges = 0.5 + 0.5 * sin(r * 950. + tnoise(uv * 40., vec2(40.)) * 7.);
    m = max(m, mask * (0.35 + 0.65 * ridges));
  }
  return m;
}
float heightAt(vec2 uv){
  if (uMode == 0) return leatherH(uv);
  if (uMode == 2) return brushedH(uv);
  return suedeH(uv);
}
vec3 normalFrom(vec2 uv){
  float e = uTexel;
  float h = heightAt(uv), hx = heightAt(uv + vec2(e, 0.)), hy = heightAt(uv + vec2(0., e));
  vec3 n = normalize(vec3((h - hx) * uStrength, (h - hy) * uStrength, 1.));
  return n * 0.5 + 0.5;
}
// rounded-rectangle signed distance (contact shadow)
float sdRound(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }

void main(){
  vec2 uv = vUv; vec3 c;
  if (uMode == 0 || uMode == 2 || uMode == 5){ c = normalFrom(uv); }
  else if (uMode == 1){
    float h = leatherH(uv);
    float r = uBase + (1. - h) * uAmp + (fbm(uv * 24., vec2(24.)) - .5) * 0.025 + fingerprints(uv) * uSmudge;
    c = vec3(clamp(r, 0.04, 1.));
  } else if (uMode == 3){
    float r = uBase + (brushedH(uv) - .5) * uAmp + scratches(uv) * uScratch + fingerprints(uv) * uSmudge + (fbm(uv * 6., vec2(6.)) - .5) * 0.05;
    c = vec3(clamp(r, 0.03, 1.));
  } else if (uMode == 4){
    vec2 p = uv - 0.5; float rr = length(p) * 2.;
    float rings = 0.5 + 0.5 * sin(rr * 6.2832 * 140. + tnoise(vec2(rr * 40., 0.), vec2(40.)) * 2.);
    float r = uBase + (rings - .5) * uAmp + scratches(uv) * uScratch * 0.6;
    c = vec3(clamp(r, 0.03, 1.));
  } else if (uMode == 6){
    vec2 p = uv - 0.5; float d = sdRound(p, vec2(0.36, 0.33), 0.08);
    float a = 1. - smoothstep(-0.06, 0.12, d); a = pow(a, 1.6);
    float core = 1. - smoothstep(-0.12, 0.0, d);
    c = vec3(clamp(a * 0.75 + core * 0.25, 0., 1.));
  } else if (uMode == 7){
    float r = uBase + (fbm(uv * 90., vec2(90.)) - .5) * uAmp + scratches(uv) * uScratch;
    c = vec3(clamp(r, 0.05, 1.));
  } else if (uMode == 9){
    // studio floor falloff: the light pool fades to black, so the sweep has no visible horizon
    float d = length(uv - 0.5) * 2.;
    float f = 1. - smoothstep(0.0, 1.0, d); f = f * f * (3. - 2. * f);
    c = vec3(f * (0.96 + 0.04 * tnoise(uv * 64., vec2(64.))));
  } else {
    float r = uBase + (fbm(uv * 8., vec2(8.)) - .5) * uAmp + (tnoise(uv * 300., vec2(300.)) - .5) * 0.04;
    c = vec3(clamp(r, 0.05, 1.));
  }
  gl_FragColor = vec4(c, 1.);
}`;

export interface MapSpec { mode: number; base?: number; amp?: number; scratch?: number; smudge?: number; strength?: number; seed?: number }

export function createBaker(renderer: THREE.WebGLRenderer, size: number) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false,
    uniforms: { uMode: { value: 0 }, uSeed: { value: 1 }, uBase: { value: 0.5 }, uAmp: { value: 0.2 }, uScratch: { value: 0 }, uSmudge: { value: 0 }, uStrength: { value: 2 }, uTexel: { value: 1 / size } },
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  const scene = new THREE.Scene(); scene.add(quad);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const targets: THREE.WebGLRenderTarget[] = [];
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const bake = (s: MapSpec, wrap = true): THREE.Texture => {
    const rt = new THREE.WebGLRenderTarget(size, size, {
      generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter,
      wrapS: wrap ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping, wrapT: wrap ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping,
      anisotropy: maxAniso, depthBuffer: false,
    });
    const u = mat.uniforms;
    u.uMode.value = s.mode; u.uSeed.value = s.seed ?? 1; u.uBase.value = s.base ?? 0.5; u.uAmp.value = s.amp ?? 0.2;
    u.uScratch.value = s.scratch ?? 0; u.uSmudge.value = s.smudge ?? 0; u.uStrength.value = s.strength ?? 2;
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(rt); renderer.render(scene, cam); renderer.setRenderTarget(prev);
    targets.push(rt);
    return rt.texture;
  };
  return {
    bake,
    disposeBaker() { mat.dispose(); quad.geometry.dispose(); },
    disposeAll() { targets.forEach((t) => t.dispose()); },
  };
}

/**
 * The journey's renderer: one full-screen canvas that draws two photographic layers (A behind, B in front).
 *
 * WebGL2 path (default) — a single fragment shader does all of it:
 *   cover-fit per layer (portrait screens crop around the image's focusX)
 *   per-layer zoom about an origin in image space (the forward push, and the slow dwell)
 *   B composited inside a soft-edged circular aperture centred on a screen point (the arrival)
 *   zoom (radial) blur around a screen point, only while moving
 *   shared grade, vignette and animated film grain, so walk frames and rooms read as one camera
 * Canvas2D fallback (no WebGL2) — same pushes and cross-fades, no blur, aperture or grain.
 * The caller decides when to draw; nothing renders unless something changed.
 * Quality (1 … 0.55) is set by the caller from measured frame times: it lowers the render resolution and, below 0.8,
 * halves the blur taps, so a weak GPU keeps a steady frame rate instead of dropping frames.
 */
export interface Layer {
  src: TexImageSource & { width: number; height: number };
  key: string;            // identity of the pixels, so textures are only re-uploaded when the source changes
  focusX: number;         // 0–1: horizontal subject position, used when a portrait screen crops a landscape image
  zoom: number;           // ≥ 1
  origin: [number, number]; // zoom origin in image uv (0–1, from the top-left)
}
export interface StageFrame {
  a: Layer | null;
  b: Layer | null;
  mix: number;            // opacity of B
  aperture: number;       // 0 closed … 1 full screen (≥ 1: no mask)
  apCenter: [number, number]; // screen uv
  blur: number;           // 0 … 1
  blurCenter: [number, number];
  dim: number;            // 0 … 1 darkening
  parallax: [number, number]; // css px
  grade: number;          // 0 … 1 strength of the shared grade (the walk frames are already graded offline)
}
export interface Stage {
  readonly kind: "webgl2" | "2d";
  draw(f: StageFrame, time: number): void;
  resize(): void;
  /** 1 = full; lower = fewer pixels and blur taps (see above) */
  setQuality(q: number): void;
  dispose(): void;
}

/** cover-fit mapping: image uv = screen uv × scale + offset */
export function cover(cw: number, ch: number, iw: number, ih: number, focusX: number) {
  const ca = cw / ch, ia = iw / ih;
  if (ca > ia) { const sy = ia / ca; return { sx: 1, sy, ox: 0, oy: (1 - sy) / 2 }; }
  const sx = ca / ia, fx = Math.min(1 - sx / 2, Math.max(sx / 2, focusX));
  return { sx, sy: 1, ox: fx - sx / 2, oy: 0 };
}
/** where an image-space point (after zoom) lands on screen, in screen uv */
export function toScreen(cw: number, ch: number, l: Layer, p: [number, number]): [number, number] {
  const c = cover(cw, ch, l.src.width, l.src.height, l.focusX);
  const u = [l.origin[0] + (p[0] - l.origin[0]) * l.zoom, l.origin[1] + (p[1] - l.origin[1]) * l.zoom];
  return [(u[0] - c.ox) / c.sx, (u[1] - c.oy) / c.sy];
}

const VS = `#version 300 es
in vec2 p; out vec2 vUv;
void main(){ vUv = vec2(p.x * .5 + .5, .5 - p.y * .5); gl_Position = vec4(p, 0., 1.); }`;

const FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D tA, tB;
uniform vec4 uCovA, uCovB;   // scale.xy, offset.xy
uniform vec3 uZA, uZB;       // zoom, origin.xy
uniform vec2 uRes, uApC, uBlC, uPar;
uniform float uHasA, uHasB, uMix, uAp, uBlur, uDim, uTime, uGrade;
uniform int uTaps;

vec2 mapA(vec2 s){ vec2 u = s * uCovA.xy + uCovA.zw; return uZA.yz + (u - uZA.yz) / uZA.x; }
vec2 mapB(vec2 s){ vec2 u = s * uCovB.xy + uCovB.zw; return uZB.yz + (u - uZB.yz) / uZB.x; }
vec3 texA(vec2 s){ return texture(tA, clamp(mapA(s), vec2(.0005), vec2(.9995))).rgb; }
vec3 texB(vec2 s){ return texture(tB, clamp(mapB(s), vec2(.0005), vec2(.9995))).rgb; }
// at rest: four taps a third of a source texel apart — when a 720p/1080p source is upscaled this smooths WebP block
// edges without the halos a sharpen would add (and costs four lookups, not a pass)
vec3 softA(vec2 s){ vec2 u = clamp(mapA(s), vec2(.0005), vec2(.9995)); vec2 t = .34 / vec2(textureSize(tA, 0));
  return .25 * (texture(tA, u + t).rgb + texture(tA, u - t).rgb + texture(tA, u + vec2(t.x, -t.y)).rgb + texture(tA, u + vec2(-t.x, t.y)).rgb); }
vec3 softB(vec2 s){ vec2 u = clamp(mapB(s), vec2(.0005), vec2(.9995)); vec2 t = .34 / vec2(textureSize(tB, 0));
  return .25 * (texture(tB, u + t).rgb + texture(tB, u - t).rgb + texture(tB, u + vec2(t.x, -t.y)).rgb + texture(tB, u + vec2(-t.x, t.y)).rgb); }
float hash(vec2 p){ p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }

void main(){
  vec2 s = vUv + uPar / uRes;
  float asp = uRes.x / uRes.y;
  // aperture: B is seen through a soft circle that grows from apCenter
  float maxR = length(vec2(max(uApC.x, 1. - uApC.x) * asp, max(uApC.y, 1. - uApC.y)));
  float d = length((s - uApC) * vec2(asp, 1.));
  float r = uAp * (maxR + .2);
  float mask = uAp >= 1. ? 1. : 1. - smoothstep(r - .18 * max(r, .2), r, d);
  float wB = uHasB * uMix * mask;
  vec3 a = vec3(0.), b = vec3(0.);
  if (uBlur > .002) {
    // zoom blur: average samples pulled toward the blur centre
    for (int i = 0; i < 14; i++) {
      if (i >= uTaps) break;
      float k = 1. - uBlur * .16 * float(i) / float(uTaps - 1);
      vec2 q = uBlC + (s - uBlC) * k;
      if (uHasA > .5) a += texA(q);
      if (wB > .001) b += texB(q);
    }
    a /= float(uTaps); b /= float(uTaps);
  } else {
    if (uHasA > .5) a = softA(s);
    if (wB > .001) b = softB(s);
  }
  vec3 c = mix(a * uHasA, b, wB);
  // shared grade: blacks sit on the page colour, highlights lean warm, a touch less saturation
  vec3 g = mix(vec3(.031, .035, .039), vec3(1.), c);
  float l = dot(g, vec3(.2126, .7152, .0722));
  g = mix(vec3(l), g, .93);
  g *= mix(vec3(.985, 1., 1.02), vec3(1.03, 1., .95), smoothstep(.45, 1., l));
  c = mix(c, g, uGrade);
  // vignette
  vec2 v = (vUv - .5) * vec2(asp * .82, 1.);
  c *= 1. - .42 * smoothstep(.32, 1.05, length(v));
  c *= 1. - uDim;
  // film grain, strongest in the mid-tones, re-seeded every tick
  float n = hash(gl_FragCoord.xy + floor(uTime * 12.) * 17.13) - .5;
  float lum = dot(c, vec3(.2126, .7152, .0722));
  c += n * .055 * (.35 + 1.3 * lum * (1. - lum));
  o = vec4(c, 1.);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src); gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? "shader");
  return sh;
}

export function createStage(canvas: HTMLCanvasElement, opts: { webgl: boolean; preserve?: boolean }): Stage {
  // preserve: only for automated screenshots (?qa), which can capture between redraws
  const gl = opts.webgl ? canvas.getContext("webgl2", { alpha: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: !!opts.preserve, powerPreference: "high-performance" }) : null;
  if (gl?.isContextLost()) throw new Error("WebGL2 context lost");
  // device resolution up to 2×, but never more than ~2.4 MP (a little over 1920×1080): the walk frames are 1280 px
  // and the rooms 1920 px wide, so pixels beyond that only cost fill rate, not detail. Quality scales it down further.
  let quality = 1;
  const size = () => {
    const area = Math.max(1, canvas.clientWidth * canvas.clientHeight);
    const dpr = Math.max(0.5, Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(2.4e6 / area)) * quality);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  };
  size();

  if (!gl) {
    // ---------- Canvas2D fallback: same pushes and cross-fades, no blur / aperture / grain
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("no 2D context (the canvas already holds a WebGL context)");
    const paint = (l: Layer, alpha: number, par: [number, number]) => {
      const cw = canvas.width, ch = canvas.height, c = cover(cw, ch, l.src.width, l.src.height, l.focusX);
      // screen rect of the full image before zoom, then scale about the origin's screen point
      const w = cw / c.sx, h = ch / c.sy, x = -c.ox * w, y = -c.oy * h;
      const ox = x + l.origin[0] * w, oy = y + l.origin[1] * h;
      ctx.globalAlpha = alpha;
      ctx.setTransform(l.zoom, 0, 0, l.zoom, ox * (1 - l.zoom) + par[0], oy * (1 - l.zoom) + par[1]);
      ctx.drawImage(l.src as CanvasImageSource, x, y, w, h);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    };
    return {
      kind: "2d",
      draw(f) {
        ctx.globalAlpha = 1; ctx.fillStyle = "#08090a"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        const dpr = canvas.width / Math.max(1, canvas.clientWidth), par: [number, number] = [f.parallax[0] * dpr, f.parallax[1] * dpr];
        if (f.a) paint(f.a, 1, par);
        if (f.b && f.mix > 0.002) paint(f.b, Math.min(1, f.mix * Math.min(1, f.aperture * 1.6)), par);
        if (f.dim > 0) { ctx.globalAlpha = f.dim; ctx.fillStyle = "#08090a"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
        ctx.globalAlpha = 1;
      },
      resize: size,
      setQuality(q) { quality = q; size(); },
      dispose() { /* nothing to release */ },
    };
  }

  // ---------- WebGL2
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? "link");
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n: string) => gl.getUniformLocation(prog, n);
  const u = {
    tA: U("tA"), tB: U("tB"), covA: U("uCovA"), covB: U("uCovB"), zA: U("uZA"), zB: U("uZB"), res: U("uRes"), apC: U("uApC"), blC: U("uBlC"), par: U("uPar"),
    hasA: U("uHasA"), hasB: U("uHasB"), mix: U("uMix"), ap: U("uAp"), blur: U("uBlur"), dim: U("uDim"), time: U("uTime"), grade: U("uGrade"), taps: U("uTaps"),
  };
  gl.uniform1i(u.tA, 0); gl.uniform1i(u.tB, 1);
  const mkTex = () => {
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  // two texture slots keyed by the pixels they hold: when B becomes A (a transition completes) nothing is re-uploaded
  const slots = [{ tex: mkTex(), key: "" }, { tex: mkTex(), key: "" }];
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  const place = (layers: (Layer | null)[]) => {
    const need = layers.filter((l): l is Layer => !!l).map((l) => l.key);
    for (const l of layers) {
      if (!l || slots.some((s) => s.key === l.key)) continue;
      const slot = slots.find((s) => !need.includes(s.key))!;
      gl.bindTexture(gl.TEXTURE_2D, slot.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, l.src);
      slot.key = l.key;
    }
    layers.forEach((l, unit) => {
      if (!l) return;
      gl.activeTexture(unit === 0 ? gl.TEXTURE0 : gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, slots.find((s) => s.key === l.key)!.tex);
    });
  };
  const setLayer = (l: Layer | null, cov: WebGLUniformLocation | null, z: WebGLUniformLocation | null) => {
    if (!l) return;
    const c = cover(canvas.width, canvas.height, l.src.width, l.src.height, l.focusX);
    gl.uniform4f(cov, c.sx, c.sy, c.ox, c.oy);
    gl.uniform3f(z, l.zoom, l.origin[0], l.origin[1]);
  };

  return {
    kind: "webgl2",
    draw(f, time) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      place([f.a, f.b]);
      setLayer(f.a, u.covA, u.zA); setLayer(f.b, u.covB, u.zB);
      const dpr = canvas.width / Math.max(1, canvas.clientWidth);
      gl.uniform2f(u.res, canvas.width, canvas.height);
      gl.uniform2f(u.apC, f.apCenter[0], f.apCenter[1]);
      gl.uniform2f(u.blC, f.blurCenter[0], f.blurCenter[1]);
      gl.uniform2f(u.par, f.parallax[0] * dpr, f.parallax[1] * dpr);
      gl.uniform1f(u.hasA, f.a ? 1 : 0); gl.uniform1f(u.hasB, f.b ? 1 : 0);
      gl.uniform1f(u.mix, f.mix); gl.uniform1f(u.ap, f.aperture); gl.uniform1f(u.blur, f.blur);
      gl.uniform1f(u.dim, f.dim); gl.uniform1f(u.time, time); gl.uniform1f(u.grade, f.grade);
      gl.uniform1i(u.taps, quality < 0.8 ? 7 : 14);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    resize: size,
    setQuality(q) { quality = q; size(); },
    dispose() {
      slots.forEach((s) => gl.deleteTexture(s.tex));
      gl.deleteBuffer(buf); gl.deleteProgram(prog);
      // no loseContext(): a remount (React StrictMode, fast refresh) gets this same context back from the canvas
    },
  };
}

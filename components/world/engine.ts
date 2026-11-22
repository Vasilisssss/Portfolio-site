import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { createGovernor, dprFor } from "./quality";


/**
 * THE CAPITAL UNIVERSE — one continuous WebGL world, five environments along a camera path.
 *   I   The Portal                 z ≈ 0
 *   II  The Capital Engine         z ≈ -80
 *   III The Investment District    z ≈ -160
 *   IV  The Observatory            z ≈ -235
 *   V   The Future                 z ≈ -320
 * Everything is procedural (no model/texture downloads). Data-driven pieces use percentages only.
 */

export interface WorldHolding { id: string; label: string; name: string; weight: number; returnPct: number | null; assetClass: string }
export interface WorldData { holdings: WorldHolding[]; history: { date: string; index: number }[] }
export interface LabelOut { id: string; x: number; y: number; opacity: number }
export interface WorldCallbacks {
  onLabels: (labels: LabelOut[]) => void;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

const BG = 0x08090a;
const LIME = new THREE.Color("#d7ff3f");
const WHITE = new THREE.Color("#f3f2ed");
const CORAL = new THREE.Color("#ff7a66");

function rng(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function canvasTexture(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d")!, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Dark studio for reflections: RoomEnvironment dimmed, plus a lime and two white light strips → controlled highlights on chrome. */
function studio(renderer: THREE.WebGLRenderer) {
  const room = new RoomEnvironment();
  room.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && m.material) { const mat = m.material as THREE.MeshStandardMaterial; if (mat.color) mat.color.multiplyScalar(0.18); } });
  const strip = (col: THREE.Color, k: number, p: [number, number, number], ry: number, w: number, h: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...p); m.rotation.y = ry; room.add(m);
  };
  strip(WHITE, 6, [-6.8, 3, 0], Math.PI / 2, 0.6, 7);
  strip(WHITE, 4, [0, 9.5, -2], 0, 8, 0.5);
  strip(LIME, 5, [6.8, 2, -3], -Math.PI / 2, 0.35, 6);
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(room, 0.03).texture;
  room.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); (m.material as THREE.Material | undefined)?.dispose?.(); });
  pm.dispose();
  return env;
}

/** Sampled path for particles: fast lookup instead of arc-length queries each frame. */
function lut(curve: THREE.Curve<THREE.Vector3>, n = 160) {
  const pts = curve.getSpacedPoints(n);
  return (t: number, out: THREE.Vector3) => {
    const f = Math.min(0.99999, Math.max(0, t)) * n;
    const i = Math.floor(f), k = f - i;
    return out.copy(pts[i]).lerp(pts[i + 1], k);
  };
}

interface Flow { at: (t: number, o: THREE.Vector3) => THREE.Vector3; start: number; count: number; speed: number }

export function createWorld(host: HTMLElement, data: WorldData, opts: { low: boolean; reduce: boolean }, cb: WorldCallbacks) {
  const { low, reduce } = opts;
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: low ? "low-power" : "high-performance" });
  // every device renders at its own native resolution: 1× standard screens, 2× Retina / 4K / 5K, up to 3× phones
  const nativeDpr = () => Math.min(window.devicePixelRatio || 1, 3);
  let native = nativeDpr();
  renderer.setPixelRatio(native);
  renderer.setClearColor(BG, 1);
  renderer.toneMapping = THREE.NeutralToneMapping; // keeps the acid lime pure while compressing chrome highlights
  renderer.toneMappingExposure = 1.12;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.FogExp2(BG, low ? 0.02 : 0.016);
  const env = studio(renderer);
  scene.environment = env;
  scene.environmentIntensity = 0.9;

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 600);

  // ---------- post-processing: MSAA HDR target → bloom on light sources → tone map (no lens or grain filters: edges stay crisp in motion)
  const MSAA = low ? 2 : 4;
  let level = 0; // see ./quality.ts — effects make way before resolution does
  const composerTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: MSAA });
  const composer = new EffectComposer(renderer, composerTarget);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), low ? 0.45 : 0.55, 0.42, 0.86);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  scene.add(new THREE.HemisphereLight(0x9aa09c, 0x050505, 0.35));
  const key = new THREE.DirectionalLight(0xf3f2ed, 1.2);
  key.position.set(20, 40, 30);
  scene.add(key);

  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(x: T) => { disposables.push(x); return x; };

  // ---------- shared materials
  const blackChrome = track(new THREE.MeshPhysicalMaterial({ color: 0x0b0c0e, metalness: 1, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08 }));
  const brushed = track(new THREE.MeshPhysicalMaterial({ color: 0x41454b, metalness: 1, roughness: 0.34, anisotropy: low ? 0 : 0.85, anisotropyRotation: Math.PI / 2 }));
  const graphite = track(new THREE.MeshPhysicalMaterial({ color: 0x111316, metalness: 0.65, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.1 }));
  const optical = track(new THREE.MeshPhysicalMaterial(
    low
      ? { color: 0x15181b, metalness: 0.4, roughness: 0.05, clearcoat: 1, iridescence: 0.4 }
      : { color: 0xffffff, metalness: 0, roughness: 0.03, transmission: 1, thickness: 2.4, ior: 1.52, dispersion: 4, attenuationColor: new THREE.Color("#3b4d14"), attenuationDistance: 7, clearcoat: 1, specularIntensity: 1 },
  ));
  const limeLight = track(new THREE.MeshBasicMaterial({ color: LIME, toneMapped: false, fog: false })); // light sources read through the haze
  const whiteLine = track(new THREE.LineBasicMaterial({ color: WHITE, transparent: true, opacity: 0.16, depthWrite: false }));
  const glowTex = track(canvasTexture(256, (g, s) => {
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.25, "rgba(255,255,255,0.35)"); r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, s, s);
  }));
  const glow = (color: THREE.Color, size: number, opacity = 0.6) => {
    const m = track(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: opacity * 0.35, depthWrite: false, blending: THREE.AdditiveBlending, fog: true }));
    const s = new THREE.Sprite(m); s.scale.setScalar(size); return s;
  };

  // ---------- ground: mirror floor (desktop) under a glossy smoked layer
  let reflector: Reflector | null = null;
  if (!low) {
    reflector = new Reflector(new THREE.PlaneGeometry(1400, 1400), { clipBias: 0.003, textureWidth: 512, textureHeight: 512, color: 0x50545a });
    reflector.rotation.x = -Math.PI / 2;
    reflector.position.set(0, -0.02, -200);
    scene.add(reflector);
  }
  const floor = new THREE.Mesh(
    track(new THREE.PlaneGeometry(1400, 1400)),
    track(new THREE.MeshStandardMaterial({ color: 0x08090a, metalness: low ? 0.85 : 0.2, roughness: low ? 0.3 : 0.55, transparent: !low, opacity: low ? 1 : 0.82 })),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -200);
  scene.add(floor);

  // one group per environment: only the current and the travelling-to environments are drawn
  const groups = [0, 1, 2, 3, 4].map(() => { const g = new THREE.Group(); scene.add(g); return g; });
  const labels: { id: string; pos: THREE.Vector3; scene: number }[] = [];
  const animated: ((t: number, u: number) => void)[] = [];
  const pickables: THREE.Object3D[] = [];

  // =====================================================================
  // I — THE PORTAL: a monumental iris of black-chrome fins around a lime aperture
  // =====================================================================
  {
    const g = new THREE.Group();
    g.position.set(0, 10, 0);
    groups[0].add(g);
    const FINS = low ? 44 : 84, R = 8.4;
    const fin = track(new RoundedBoxGeometry(0.3, 3.6, 2.1, low ? 2 : 4, 0.07));
    const fins = new THREE.InstancedMesh(fin, blackChrome, FINS);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
    const ring = new THREE.Group();
    g.add(ring);
    const placeFins = (open: number) => {
      for (let i = 0; i < FINS; i++) {
        const a = (i / FINS) * Math.PI * 2;
        p.set(Math.cos(a) * (R + open), Math.sin(a) * (R + open), 0);
        e.set(0, 0.42 + open * 0.05, a - Math.PI / 2, "ZYX");
        q.setFromEuler(e);
        m4.compose(p, q, sc);
        fins.setMatrixAt(i, m4);
      }
      fins.instanceMatrix.needsUpdate = true;
    };
    placeFins(0);
    ring.add(fins);
    const outer = new THREE.Mesh(track(new THREE.TorusGeometry(10.9, 0.42, low ? 32 : 64, low ? 240 : 480)), brushed);
    g.add(outer);
    const outer2 = new THREE.Mesh(track(new THREE.TorusGeometry(11.7, 0.06, 12, 240)), blackChrome);
    g.add(outer2);
    const aperture = new THREE.Mesh(track(new THREE.TorusGeometry(6.35, 0.03, 12, 640)), limeLight);
    g.add(aperture);
    const halo = glow(LIME, 22, 0.22);
    halo.position.z = -1.5;
    g.add(halo);
    // flanking monoliths with a lime seam
    for (const s of [-1, 1]) {
      const mono = new THREE.Mesh(track(new RoundedBoxGeometry(1.6, 26, 4.6, 2, 0.08)), blackChrome);
      mono.position.set(s * 19, 13, 3);
      groups[0].add(mono);
      const seam = new THREE.Mesh(track(new THREE.BoxGeometry(0.05, 22, 0.05)), limeLight);
      seam.position.set(s * 19 - s * 0.82, 13, 3);
      groups[0].add(seam);
    }
    // light shafts behind the portal
    const shaftTex = track(canvasTexture(128, (c, s) => { const lg = c.createLinearGradient(0, s, 0, 0); lg.addColorStop(0, "rgba(255,255,255,0.5)"); lg.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = lg; c.fillRect(0, 0, s, s); }));
    const shaftMat = track(new THREE.MeshBasicMaterial({ map: shaftTex, color: WHITE, transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    for (let i = 0; i < 7; i++) {
      const shaft = new THREE.Mesh(track(new THREE.PlaneGeometry(1.2 + (i % 3), 60)), shaftMat);
      shaft.position.set(-15 + i * 5, 30, -14 - (i % 2) * 6);
      shaft.rotation.z = (i - 3) * 0.05;
      groups[0].add(shaft);
    }
    animated.push((t, u) => {
      ring.rotation.z = reduce ? 0 : t * 0.03;
      const open = Math.min(1, Math.max(0, u * 2.2)) * 1.6; // the iris opens as you approach
      placeFins(open);
      aperture.scale.setScalar(1 + open * 0.06);
    });
  }

  // =====================================================================
  // II — THE CAPITAL ENGINE: deposits stream into an optical core, then out to each holding (∝ allocation)
  // =====================================================================
  const C2 = new THREE.Vector3(0, 9, -80);
  const flows: Flow[] = [];
  const nodeMeshes: THREE.Mesh[] = [];
  {
    const core = new THREE.Mesh(track(new THREE.IcosahedronGeometry(2.8, 0)), optical);
    core.position.copy(C2);
    groups[1].add(core);
    const facets = new THREE.LineSegments(track(new THREE.EdgesGeometry(track(new THREE.IcosahedronGeometry(2.82, 0)))), track(new THREE.LineBasicMaterial({ color: LIME, transparent: true, opacity: 0.85, fog: false, toneMapped: false })));
    facets.position.copy(C2);
    groups[1].add(facets);
    const heart = new THREE.Mesh(track(new THREE.OctahedronGeometry(1.05, 0)), limeLight);
    heart.position.copy(C2);
    groups[1].add(heart);
    const heartGlow = glow(LIME, 16, 0.5);
    heartGlow.position.copy(C2);
    groups[1].add(heartGlow);
    const light = new THREE.PointLight(LIME, 60, 40, 2);
    light.position.copy(C2);
    groups[1].add(light);
    const gyro = [4.4, 5.2].map((r, i) => {
      const m = new THREE.Mesh(track(new THREE.TorusGeometry(r, i ? 0.05 : 0.09, 16, 220)), brushed);
      m.position.copy(C2);
      m.rotation.set(1.1 + i * 0.6, i * 0.7, 0);
      groups[1].add(m);
      return m;
    });
    // inflow: what I deposit (from the portal side)
    const inflow = new THREE.CatmullRomCurve3([new THREE.Vector3(-3, 2, -30), new THREE.Vector3(-6, 6, -50), new THREE.Vector3(-3, 10, -66), C2.clone()]);
    flows.push({ at: lut(inflow), start: 0, count: low ? 220 : 560, speed: 0.12 });
    groups[1].add(new THREE.Mesh(track(new THREE.TubeGeometry(inflow, 120, 0.02, 6)), track(new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.3, toneMapped: false, fog: false }))));
    // outflows to holdings
    const n = Math.max(1, data.holdings.length);
    data.holdings.forEach((h, i) => {
      const a = -Math.PI * 0.85 + (Math.PI * 0.7 * (i + 0.5)) / n; // fan towards the district
      const end = new THREE.Vector3(Math.cos(a) * 15, 4 + (i % 2) * 5, -80 + Math.sin(a) * -14 - 6);
      const mid = C2.clone().lerp(end, 0.5).add(new THREE.Vector3(0, 5, 0));
      const curve = new THREE.CatmullRomCurve3([C2.clone(), mid, end]);
      const count = Math.round((low ? 50 : 110) + (low ? 500 : 1500) * h.weight);
      flows.push({ at: lut(curve), start: 0, count, speed: 0.08 + 0.05 * (i % 3) });
      groups[1].add(new THREE.Mesh(track(new THREE.TubeGeometry(curve, 100, 0.018 + 0.05 * Math.sqrt(h.weight), 6)), track(new THREE.MeshBasicMaterial({ color: LIME, transparent: true, opacity: 0.35 + 0.5 * h.weight, toneMapped: false, fog: false }))));
      const node = new THREE.Mesh(track(new THREE.OctahedronGeometry(0.45 + 1.1 * Math.sqrt(h.weight), 0)), graphite);
      node.position.copy(end);
      node.userData.id = h.id;
      groups[1].add(node);
      nodeMeshes.push(node);
      pickables.push(node);
      const nodeRing = new THREE.Mesh(track(new THREE.TorusGeometry(1 + 1.2 * Math.sqrt(h.weight), 0.02, 6, 120)), limeLight);
      nodeRing.position.copy(end);
      nodeRing.rotation.x = Math.PI / 2;
      groups[1].add(nodeRing);
      labels.push({ id: `engine:${h.id}`, pos: end.clone().add(new THREE.Vector3(0, 2.2 + 1.2 * Math.sqrt(h.weight), 0)), scene: 1 });
    });
    animated.push((t) => {
      if (reduce) return;
      core.rotation.set(t * 0.12, t * 0.18, 0);
      facets.rotation.copy(core.rotation);
      heart.rotation.set(-t * 0.4, t * 0.6, 0);
      gyro[0].rotation.z = t * 0.25;
      gyro[1].rotation.z = -t * 0.18;
      nodeMeshes.forEach((m, i) => { m.rotation.y = t * (0.3 + i * 0.05); });
    });
  }
  // particles for all flows
  const totalParticles = flows.reduce((s, f) => { f.start = s; return s + f.count; }, 0);
  const pPos = new Float32Array(totalParticles * 3);
  const pCol = new Float32Array(totalParticles * 3);
  const pSeed = new Float32Array(totalParticles);
  {
    const r = rng(42);
    flows.forEach((f, fi) => {
      for (let k = 0; k < f.count; k++) {
        const idx = f.start + k;
        pSeed[idx] = r();
        (fi === 0 ? WHITE : r() < 0.15 ? WHITE : LIME).toArray(pCol, idx * 3);
      }
    });
  }
  const pGeo = track(new THREE.BufferGeometry());
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
  const particles = new THREE.Points(pGeo, track(new THREE.PointsMaterial({ fog: false, size: low ? 0.2 : 0.13, map: glowTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })));
  particles.frustumCulled = false;
  groups[1].add(particles);
  const tmp = new THREE.Vector3();
  const jitter = new THREE.Vector3();
  const updateParticles = (t: number) => {
    flows.forEach((f) => {
      for (let k = 0; k < f.count; k++) {
        const idx = f.start + k;
        const s = pSeed[idx];
        const pos = f.at((s + t * f.speed * (0.7 + s * 0.6)) % 1, tmp);
        jitter.set(Math.sin(idx * 12.9 + t) * 0.18, Math.cos(idx * 7.1 + t * 1.3) * 0.18, Math.sin(idx * 3.7) * 0.18);
        pPos[idx * 3] = pos.x + jitter.x; pPos[idx * 3 + 1] = pos.y + jitter.y; pPos[idx * 3 + 2] = pos.z + jitter.z;
      }
    });
    pGeo.attributes.position.needsUpdate = true;
  };
  updateParticles(0);

  // =====================================================================
  // III — THE INVESTMENT DISTRICT: one tower per holding (height from its value), in a quiet city
  // =====================================================================
  const towers: { mesh: THREE.Mesh; cap: THREE.Mesh; id: string }[] = [];
  {
    const n = Math.max(1, data.holdings.length);
    data.holdings.forEach((h, i) => {
      // largest at the centre, then alternating outwards
      const off = i === 0 ? 0 : (i % 2 ? -1 : 1) * Math.ceil(i / 2);
      const x = off * 8.5, z = -160 - Math.abs(off) * 3;
      const height = 2.5 + 16 * Math.sqrt(h.weight);
      const tower = new THREE.Mesh(track(new RoundedBoxGeometry(4.6, height, 4.6, low ? 3 : 6, 0.18)), graphite);
      tower.position.set(x, height / 2, z);
      tower.userData.id = h.id;
      groups[2].add(tower);
      pickables.push(tower);
      const edges = new THREE.LineSegments(track(new THREE.EdgesGeometry(track(new THREE.BoxGeometry(4.62, height, 4.62)))), whiteLine);
      edges.position.copy(tower.position);
      groups[2].add(edges);
      const cap = new THREE.Mesh(track(new THREE.BoxGeometry(4.0, 0.08, 4.0)), track(new THREE.MeshBasicMaterial({ color: LIME, toneMapped: false, fog: false })));
      cap.position.set(x, height + 0.05, z);
      groups[2].add(cap);
      const capGlow = glow(LIME, 7, 0.28);
      capGlow.position.set(x, height + 0.6, z);
      groups[2].add(capGlow);
      // return ring at the foot: lime when up, coral when down
      const tone = h.returnPct == null ? WHITE : h.returnPct >= 0 ? LIME : CORAL;
      const foot = new THREE.Mesh(track(new THREE.TorusGeometry(4.2, 0.06, 8, 160)), track(new THREE.MeshBasicMaterial({ color: tone, toneMapped: false, fog: false })));
      foot.rotation.x = Math.PI / 2;
      foot.position.set(x, 0.12, z); // clear of the plaza grid (no z-fighting)
      groups[2].add(foot);
      // architectural mullions on every face + a light pool where the tower meets the plaza
      if (!low) {
        const per = 7, ms = new THREE.InstancedMesh(track(new THREE.BoxGeometry(0.05, height - 0.6, 0.14)), brushed, per * 4);
        const mm = new THREE.Matrix4(), mq = new THREE.Quaternion();
        let k = 0;
        for (let f = 0; f < 4; f++) {
          const ang = (f * Math.PI) / 2;
          mq.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ang);
          for (let j = 0; j < per; j++) {
            const lx = -1.8 + (3.6 * j) / (per - 1);
            const v = new THREE.Vector3(lx, 0, 2.34).applyQuaternion(mq);
            mm.compose(new THREE.Vector3(x + v.x, height / 2, z + v.z), mq, new THREE.Vector3(1, 1, 1));
            ms.setMatrixAt(k++, mm);
          }
        }
        groups[2].add(ms);
      }
      const pool = new THREE.Mesh(track(new THREE.PlaneGeometry(12, 12)), track(new THREE.MeshBasicMaterial({ map: glowTex, color: LIME, transparent: true, opacity: 0.08, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })));
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(x, 0.08, z);
      groups[2].add(pool);
      towers.push({ mesh: tower, cap, id: h.id });
      labels.push({ id: `district:${h.id}`, pos: new THREE.Vector3(x, height + 2.6, z), scene: 2 });
    });
    // the surrounding city (decorative architecture, not data)
    const r = rng(7);
    const COUNT = low ? 90 : 240;
    const box = track(new THREE.BoxGeometry(1, 1, 1));
    const city = new THREE.InstancedMesh(box, track(new THREE.MeshStandardMaterial({ color: 0x0c0d0f, metalness: 0.75, roughness: 0.32 })), COUNT);
    const m4 = new THREE.Matrix4();
    const lights: number[] = [];
    let placed = 0;
    while (placed < COUNT) {
      const x = (r() - 0.5) * 180, z = -112 - r() * 92;
      if (Math.abs(x) < 26 && z < -132 && z > -186) continue; // keep the data plaza clear
      if (Math.abs(x) < 9) continue; // keep the camera avenue clear
      if (Math.abs(x) < 16 && z > -150) continue; // and the flight path in from the engine
      if (Math.abs(x) < 34 && z < -196) continue; // keep the observatory view clear
      const w = 3 + r() * 5, d = 3 + r() * 5, h = 4 + Math.pow(r(), 1.6) * 40;
      m4.compose(new THREE.Vector3(x, h / 2, z), new THREE.Quaternion(), new THREE.Vector3(w, h, d));
      city.setMatrixAt(placed++, m4);
      const lit = Math.floor(r() * 6);
      for (let k = 0; k < lit; k++) lights.push(x + (r() - 0.5) * w, r() * h, z + d / 2 + 0.05);
    }
    groups[2].add(city);
    const lg = track(new THREE.BufferGeometry());
    lg.setAttribute("position", new THREE.Float32BufferAttribute(lights, 3));
    groups[2].add(new THREE.Points(lg, track(new THREE.PointsMaterial({ color: WHITE, size: 0.22, map: glowTex, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }))));
    // plaza grid
    const grid = new THREE.GridHelper(60, 30, LIME, LIME);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.07;
    grid.position.set(0, 0.03, -162);
    groups[2].add(grid);
    track(grid.geometry); track(grid.material as THREE.Material);
  }

  // =====================================================================
  // IV — THE OBSERVATORY: a terrace under a lattice dome, facing a ribbon of real month-end performance
  // =====================================================================
  {
    const C = new THREE.Vector3(0, 0, -235);
    const terrace = new THREE.Mesh(track(new THREE.CylinderGeometry(13, 13.4, 0.7, 128)), blackChrome);
    terrace.position.set(C.x, 0.35, C.z + 8);
    groups[3].add(terrace);
    const rail = new THREE.Mesh(track(new THREE.TorusGeometry(13, 0.05, 8, 200)), limeLight);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(C.x, 1.6, C.z + 8);
    groups[3].add(rail);
    // lattice dome
    const dome: number[] = [];
    const DR = 26;
    for (let m = 0; m < 16; m++) {
      const a = (m / 16) * Math.PI * 2;
      for (let k = 0; k < 24; k++) {
        const p0 = (k / 24) * (Math.PI / 2), p1 = ((k + 1) / 24) * (Math.PI / 2);
        dome.push(Math.cos(a) * Math.cos(p0) * DR, Math.sin(p0) * DR, Math.sin(a) * Math.cos(p0) * DR);
        dome.push(Math.cos(a) * Math.cos(p1) * DR, Math.sin(p1) * DR, Math.sin(a) * Math.cos(p1) * DR);
      }
    }
    for (const lat of [0.25, 0.5, 0.75]) {
      const y = Math.sin(lat * (Math.PI / 2)) * DR, rr = Math.cos(lat * (Math.PI / 2)) * DR;
      for (let k = 0; k < 96; k++) {
        const a0 = (k / 96) * Math.PI * 2, a1 = ((k + 1) / 96) * Math.PI * 2;
        dome.push(Math.cos(a0) * rr, y, Math.sin(a0) * rr, Math.cos(a1) * rr, y, Math.sin(a1) * rr);
      }
    }
    const dg = track(new THREE.BufferGeometry());
    dg.setAttribute("position", new THREE.Float32BufferAttribute(dome, 3));
    const domeLines = new THREE.LineSegments(dg, whiteLine);
    domeLines.position.set(C.x, 0, C.z + 8);
    groups[3].add(domeLines);
    // performance ribbon (time-weighted index, rebased to 100)
    const hist = data.history;
    if (hist.length >= 2) {
      const vals = hist.map((p) => p.index);
      const mn = Math.min(...vals), mx = Math.max(...vals);
      const pts = hist.map((p, i) => new THREE.Vector3(-24 + (40 * i) / (hist.length - 1), 7 + ((p.index - mn) / (mx - mn || 1)) * 13, C.z - 34 + Math.sin(i * 0.7) * 1.5));
      const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
      groups[3].add(new THREE.Mesh(track(new THREE.TubeGeometry(curve, 300, 0.11, 10)), limeLight));
      const ribbonGlow: THREE.Sprite[] = [];
      const drops: number[] = [];
      pts.forEach((p, i) => {
        const d = new THREE.Mesh(track(new THREE.OctahedronGeometry(0.32, 0)), track(new THREE.MeshBasicMaterial({ color: WHITE, toneMapped: false, fog: false })));
        d.position.copy(p);
        groups[3].add(d);
        drops.push(p.x, p.y, p.z, p.x, 0, p.z);
        if (i === 0 || i === pts.length - 1) {
          const s = glow(LIME, 5, 0.4); s.position.copy(p); groups[3].add(s); ribbonGlow.push(s);
        }
      });
      const dropGeo = track(new THREE.BufferGeometry());
      dropGeo.setAttribute("position", new THREE.Float32BufferAttribute(drops, 3));
      groups[3].add(new THREE.LineSegments(dropGeo, whiteLine));
      // baseline at 100 (where the index started)
      const y100 = 7 + ((100 - mn) / (mx - mn || 1)) * 13;
      const base = new THREE.Mesh(track(new THREE.BoxGeometry(44, 0.02, 0.02)), track(new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.45, toneMapped: false, fog: false })));
      base.position.set(-4, y100, C.z - 34);
      groups[3].add(base);
      labels.push({ id: "obs:start", pos: pts[0].clone().add(new THREE.Vector3(0, 2.2, 0)), scene: 3 });
      labels.push({ id: "obs:end", pos: pts[pts.length - 1].clone().add(new THREE.Vector3(0, 2.2, 0)), scene: 3 });
    }
    // distant horizon lights
    const r = rng(99);
    const far: number[] = [];
    for (let i = 0; i < (low ? 300 : 900); i++) far.push((r() - 0.5) * 400, r() * 3, -290 - r() * 140);
    const fg = track(new THREE.BufferGeometry());
    fg.setAttribute("position", new THREE.Float32BufferAttribute(far, 3));
    groups[3].add(new THREE.Points(fg, track(new THREE.PointsMaterial({ color: WHITE, size: 0.35, map: glowTex, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }))));
  }

  // =====================================================================
  // V — THE FUTURE: a horizon ring rising out of the mirror floor, and a monolith
  // =====================================================================
  let monolith: THREE.Mesh;
  {
    const ring = new THREE.Mesh(track(new THREE.TorusGeometry(42, 0.16, 16, 480)), limeLight);
    ring.position.set(0, 0, -390);
    groups[4].add(ring);
    const ringGlow = glow(LIME, 150, 0.16);
    (ringGlow.material as THREE.SpriteMaterial).fog = false;
    ringGlow.position.set(0, 10, -395);
    groups[4].add(ringGlow);
    monolith = new THREE.Mesh(track(new RoundedBoxGeometry(3.4, 16, 0.9, 3, 0.1)), blackChrome);
    monolith.position.set(0, 9, -322);
    groups[4].add(monolith);
    // seams on both faces, parented to the monolith so they turn with it
    for (const side of [1, -1]) {
      const seam = new THREE.Mesh(track(new THREE.BoxGeometry(0.04, 15, 0.04)), limeLight);
      seam.position.set(0, 0, side * 0.47);
      monolith.add(seam);
    }
    animated.push((t) => { if (!reduce) monolith.rotation.y = Math.sin(t * 0.2) * 0.6; });
  }

  // =====================================================================
  // camera choreography: keyframes at u = 0, 0.5, 1 … 4 (scene i "home" at u = i)
  // =====================================================================
  const P = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const posCurve = new THREE.CatmullRomCurve3([
    P(0, 8, 46), P(0, 10, 4),          // approach and pass through the portal
    P(14, 13, -55), P(-10, 16, -110),  // the engine, then rise towards the district
    P(0, 23, -105), P(17, 11, -176),   // aerial over the district, then down the avenue
    P(0, 7, -219), P(0, 9, -262),      // onto the observatory terrace, then out over the horizon
    P(0, 6, -284),
  ], false, "centripetal");
  const lookCurve = new THREE.CatmullRomCurve3([
    P(0, 10, 0), P(0, 10, -40),
    P(-6, 6, -82), P(0, 10, -150),
    P(0, 8.5, -162), P(0, 10, -200),
    P(0, 12, -269), P(0, 10, -330),
    P(0, 12, -390),
  ], false, "centripetal");

  let uTarget = 0, uNow = 0, drift = 0;
  const pointer = { x: 0, y: 0, cx: 0, cy: 0 };
  const look = new THREE.Vector3(), base = new THREE.Vector3(), side = new THREE.Vector3(), upV = new THREE.Vector3(0, 1, 0);

  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    camera.aspect = w / Math.max(1, h);
    camera.fov = camera.aspect < 0.8 ? 52 : 38; // phones: wider lens so the architecture still reads
    camera.updateProjectionMatrix();
    const pr = renderer.getPixelRatio();
    composer.setPixelRatio(pr);
    composer.setSize(w, h);
    if (level >= 2) bloom.setSize(Math.round((w * pr) / 2), Math.round((h * pr) / 2));
    const rs = Math.min(1, 2048 / Math.max(1, w * pr * 0.75));
    reflector?.getRenderTarget().setSize(Math.round(w * pr * 0.75 * rs), Math.round(h * pr * 0.75 * rs));
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  // picking
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2(9, 9);
  let hovered: string | null = null;
  const onMove = (e: PointerEvent) => {
    pointer.x = e.clientX / window.innerWidth - 0.5; pointer.y = e.clientY / window.innerHeight - 0.5;
    ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  };
  window.addEventListener("pointermove", onMove, { passive: true });

  const t0 = performance.now();
  let raf = 0, stopped = false, lastFrame = performance.now();
  const v = new THREE.Vector3();
  // ---------- adaptive quality: keep native resolution; when a device can't hold ~42 fps, effects make way first,
  // and they come back once it runs smoothly again (median frame time, so load hitches and scroll stalls don't count)
  const floorMat = floor.material as THREE.MeshStandardMaterial;
  const applyQuality = (l: number) => {
    level = l;
    if (reflector) { reflector.visible = level < 1; floorMat.opacity = level < 1 ? 0.82 : 1; }
    bloom.enabled = level < 4;
    const samples = level >= 3 ? (native >= 2 ? 0 : 2) : MSAA; // at 2×+ the pixels are small enough to need little MSAA
    for (const rt of [composer.renderTarget1, composer.renderTarget2]) if (rt.samples !== samples) { rt.samples = samples; rt.dispose(); }
    renderer.setPixelRatio(dprFor(native, level));
    resize();
  };
  const gov = createGovernor({ native, onChange: applyQuality });
  let frames = 0;
  // moving the window to another screen (e.g. laptop → 4K monitor): adopt that screen's native resolution
  let dprQuery: MediaQueryList | null = null;
  const watchDpr = () => {
    dprQuery?.removeEventListener("change", onDpr);
    dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    dprQuery.addEventListener("change", onDpr);
  };
  const onDpr = () => { native = nativeDpr(); gov.setNative(native); watchDpr(); };
  watchDpr();
  // ?quality in the address shows what this device actually renders
  const LEVELS = ["full quality", "mirror floor off", "glow half-res", "lighter anti-aliasing", "glow off"];
  let readout: HTMLDivElement | null = null;
  if (new URLSearchParams(window.location.search).has("quality")) {
    readout = document.createElement("div");
    readout.setAttribute("aria-hidden", "true");
    readout.style.cssText = "position:fixed;left:12px;bottom:12px;z-index:200;padding:8px 12px;border-radius:10px;background:rgba(8,9,10,.85);border:1px solid rgba(243,242,237,.12);color:#d7ff3f;font:11px/1.5 ui-monospace,monospace;pointer-events:none;white-space:pre";
    document.body.appendChild(readout);
  }
  const report = setInterval(() => {
    const c = renderer.domElement, pr = renderer.getPixelRatio();
    const lv = level <= 4 ? LEVELS[level] : `${LEVELS[4]}, resolution ${pr.toFixed(2)}×`;
    host.dataset.render = `${c.width}x${c.height}@${pr.toFixed(2)}/${native} L${level}`;
    if (readout) readout.textContent = `3D render ${c.width} × ${c.height} px\n${pr.toFixed(2)}× (native ${native}×) · ${frames * 2} fps\n${lv}`;
    frames = 0;
  }, 500);

  const frame = () => {
    raf = requestAnimationFrame(frame);
    if (document.hidden) { gov.pause(performance.now()); return; }
    gov.sample(performance.now());
    const now = performance.now();
    const t = (now - t0) / 1000;
    const dt = Math.min(0.25, (now - lastFrame) / 1000);
    lastFrame = now;
    const ease = 1 - Math.exp(-dt * 4.2); // ~same feel at 60 fps, but time-based
    uNow += (uTarget - uNow) * (reduce ? 1 : ease);
    pointer.cx += (pointer.x - pointer.cx) * (1 - Math.exp(-dt * 3));
    pointer.cy += (pointer.y - pointer.cy) * (1 - Math.exp(-dt * 3));
    const k = Math.min(1, Math.max(0, uNow / 4));
    posCurve.getPoint(k, base);
    lookCurve.getPoint(k, look);
    // gentle orbit while reading a scene, plus pointer parallax and breathing
    side.subVectors(look, base).cross(upV).normalize();
    const breathe = reduce ? 0 : Math.sin(t * 0.35) * 0.25;
    camera.position.copy(base).addScaledVector(side, drift * 5 + pointer.cx * 1.6).add(v.set(0, breathe - pointer.cy * 0.9, 0));
    camera.lookAt(look);

    groups.forEach((g, i) => { g.visible = Math.abs(uNow - i) < 0.98; });
    animated.forEach((fn) => fn(t, uNow));
    if (!reduce) updateParticles(t);

    // hover (desktop pointer only)
    if (!low) {
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(pickables, false)[0];
      const id = hit && hit.distance < 70 ? (hit.object.userData.id as string) : null;
      if (id !== hovered) {
        hovered = id;
        cb.onHover(id);
        towers.forEach((tw) => tw.cap.scale.setScalar(tw.id === id ? 1.25 : 1));
        document.body.style.cursor = id ? "pointer" : "";
      }
    }

    // project labels
    const w = host.clientWidth, h = host.clientHeight;
    cb.onLabels(labels.map((l) => {
      v.copy(l.pos).project(camera);
      const near = Math.max(0, 1 - Math.abs(uNow - l.scene) * 1.6);
      const inFront = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      return { id: l.id, x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h, opacity: inFront ? near : 0 };
    }));

    composer.render();
    frames++;
  };
  // compile every shader in the background first (KHR_parallel_shader_compile), then start drawing
  renderer.compileAsync(scene, camera).catch(() => undefined).finally(() => { if (!stopped) { gov.start(performance.now()); frame(); } });

  const onClick = () => { if (hovered) cb.onSelect(hovered); };
  window.addEventListener("click", onClick);

  return {
    setProgress(u: number, d: number) { uTarget = reduce ? Math.round(u) : u; drift = reduce ? 0 : d; },
    dispose() {
      stopped = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      clearInterval(report);
      dprQuery?.removeEventListener("change", onDpr);
      readout?.remove();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("click", onClick);
      document.body.style.cursor = "";
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
      });
      disposables.forEach((d) => d.dispose());
      reflector?.dispose();
      env.dispose();
      composer.dispose();
      composerTarget.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

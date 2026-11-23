import * as THREE from "three";
import { annularSector, part, slab } from "../briefcase/geometry";
import type { ScreenData } from "./screens";
import { plaque } from "./screens";

/**
 * Data-driven installations inside the exchange, at full architectural scale (metres). They are lit by the same
 * room's reflection panorama, so they sit in the baked light of the building.
 *   Capital ring (hall)        each holding's arc is exactly its weight; steel spheres roll out along its rail channel
 *   Holdings exhibits (west)   one plinth per holding: monolith height ∝ √weight, performance band, data plaque
 *   Performance line (east)    the real month-end index as a steel bar on standoffs along the stone wall
 */
export interface Anchor { id: string; obj: THREE.Object3D; scene: number }
const EPS = 0.0005;
const monthNo = (iso: string) => { const [y, m] = iso.slice(0, 7).split("-").map(Number); return y * 12 + (m - 1); };

export function createInstallMaterials(env: THREE.Texture | null) {
  const P = (o: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial({ envMap: env, ...o });
  return {
    steel: P({ color: 0xc9ccd0, metalness: 1, roughness: 0.16 }),
    satin: P({ color: 0x8e9196, metalness: 1, roughness: 0.34 }),
    black: P({ color: 0x18191c, metalness: 0.9, roughness: 0.36 }),
    stone: P({ color: 0x1b1c1f, metalness: 0, roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
    lime: P({ color: 0xd7ff3f, metalness: 0.4, roughness: 0.38 }),
    coral: P({ color: 0xff7a66, metalness: 0.4, roughness: 0.4 }),
    neutral: P({ color: 0x8d9095, metalness: 1, roughness: 0.3 }),
    glass: P({ color: 0x9aa4ab, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.35, clearcoat: 1 }),
  };
}
export type InstallMaterials = ReturnType<typeof createInstallMaterials>;

export function buildInstallations(d: ScreenData, M: InstallMaterials, anchors: Record<string, [number, number, number]>, low: boolean) {
  const root = new THREE.Group(); root.name = "installations";
  const geos: THREE.BufferGeometry[] = []; const disposables: { dispose: () => void }[] = [];
  const G = <T extends THREE.BufferGeometry>(g: T) => { geos.push(g); return g; };
  const out: Anchor[] = []; const pickables: THREE.Object3D[] = [];
  const holdings = [...d.holdings].filter((h) => h.weight > 0).sort((a, b) => b.weight - a.weight);
  const tone = (r: number | null) => (r == null || Math.abs(r) < EPS ? M.neutral : r > 0 ? M.lime : M.coral);

  // ---------------- CAPITAL RING ----------------
  const cap = new THREE.Group(); cap.position.set(...(anchors.capital ?? [0, 0.47, 2])); root.add(cap);
  const R0 = 3.9, R1 = 5.4, RH = 0.85;
  cap.add(part(G(new THREE.CylinderGeometry(1.0, 1.05, 0.25, 96)), M.satin));
  const col = part(G(new THREE.CylinderGeometry(0.72, 0.72, 2.3, 96)), M.glass); col.position.y = 1.4; cap.add(col);
  for (const y of [0.25, 2.55]) { const r = part(G(new THREE.TorusGeometry(0.74, 0.04, 16, 96)), M.steel); r.rotation.x = Math.PI / 2; r.position.y = y; cap.add(r); }
  const BALL = 0.2;
  const ballG = G(new THREE.SphereGeometry(BALL, low ? 20 : 40, low ? 14 : 28));
  // reservoir of spheres inside the glass column
  const pile: THREE.Vector3[] = [];
  for (let l = 0; l < 4; l++) for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
    const x = (i + (l % 2) * 0.5) * BALL * 2.05, z = (j + (l % 2) * 0.5) * BALL * 2.05;
    if (Math.hypot(x, z) < 0.72 - BALL * 1.05) pile.push(new THREE.Vector3(x, 0.25 + BALL + l * BALL * 1.7, z));
  }
  const pileMesh = new THREE.InstancedMesh(ballG, M.steel, pile.length); pile.forEach((p, i) => pileMesh.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z))); cap.add(pileMesh);
  const n = Math.max(1, holdings.length), gap = n > 1 ? THREE.MathUtils.degToRad(n > 12 ? 1.2 : 2.2) : 0;
  const avail = Math.PI * 2 - gap * n, minA = THREE.MathUtils.degToRad(1.2);
  const raw = holdings.map((h) => Math.max(minA, h.weight * avail)); const k = avail / raw.reduce((s, a) => s + a, 0);
  let a = -Math.PI / 2 - (raw[0] * k) / 2; // largest arc faces the visitor (towards the entrance, +z)
  const railG = G(new THREE.CylinderGeometry(0.05, 0.05, 1, 16)); railG.rotateZ(Math.PI / 2); railG.translate(0.5, 0, 0);
  const RA = 0.8, RB = R0 + 0.05, RAIL_OFF = 0.17, RAIL_Y = 0.12;
  const channels: { dir: THREE.Vector3; axis: THREE.Vector3; count: number; phase: number; mesh: THREE.InstancedMesh }[] = [];
  holdings.forEach((h, i) => {
    const span = raw[i] * k, a0 = a, a1 = a + span; a = a1 + gap;
    const seg = part(G(annularSector(R0, R1, a0, a1, RH, 0.04, low ? 2 : 3)), M.black); seg.userData.id = h.id; cap.add(seg); pickables.push(seg);
    const inset = Math.min(span * 0.2, THREE.MathUtils.degToRad(0.5));
    const inlay = part(G(annularSector(R1 - 0.22, R1 - 0.1, a0 + inset, a1 - inset, 0.03, 0)), tone(h.returnPct)); inlay.position.y = RH - 0.005; inlay.userData.id = h.id; cap.add(inlay);
    const am = (a0 + a1) / 2, dir = new THREE.Vector3(Math.cos(am), 0, -Math.sin(am)), side = new THREE.Vector3(dir.z, 0, -dir.x);
    for (const s of [-1, 1]) {
      const rail = part(railG, M.steel); rail.position.copy(dir.clone().multiplyScalar(RA)).addScaledVector(side, s * RAIL_OFF); rail.position.y = RAIL_Y + 0.25;
      rail.scale.set(RB - RA, 1, 1); rail.rotation.y = Math.atan2(-dir.z, dir.x); cap.add(rail);
    }
    const count = Math.max(1, Math.round(1 + 7 * h.weight));
    const bm = new THREE.InstancedMesh(ballG, M.steel, count); bm.castShadow = true; cap.add(bm);
    channels.push({ dir, axis: new THREE.Vector3(dir.z, 0, -dir.x), count, phase: (i * 0.37) % 1, mesh: bm });
    const lab = new THREE.Object3D(); lab.position.copy(dir.clone().multiplyScalar(R1 + 0.4)); lab.position.y = RH + 1.6; cap.add(lab);
    out.push({ id: `engine:${h.id}`, obj: lab, scene: 1 });
  });
  const ballY = 0.25 + RAIL_Y + Math.sqrt((BALL + 0.05) ** 2 - RAIL_OFF ** 2);
  const q = new THREE.Quaternion(), mtx = new THREE.Matrix4(), pos = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), zero = new THREE.Vector3(1e-4, 1e-4, 1e-4);
  let travel = 0;
  const updateBalls = (dt: number) => {
    travel += dt * 0.35;
    const L = RB - 0.7;
    channels.forEach((c) => {
      for (let j = 0; j < c.count; j++) {
        const s = ((travel / L + c.phase + j / c.count) % 1 + 1) % 1, r = 0.7 + s * L;
        pos.copy(c.dir).multiplyScalar(r); pos.y = ballY;
        q.setFromAxisAngle(c.axis, -(travel + (j / c.count) * L) / BALL);
        mtx.compose(pos, q, r > 0.74 + BALL && r < R0 - BALL * 0.4 ? one : zero); c.mesh.setMatrixAt(j, mtx);
      }
      c.mesh.instanceMatrix.needsUpdate = true;
    });
  };
  updateBalls(0);

  // ---------------- HOLDINGS EXHIBITS (Investment Gallery) ----------------
  const ex = new THREE.Group(); ex.position.set(...(anchors.holdings ?? [-32, 0, 4])); root.add(ex);
  // two rows along the gallery's length (local z), largest first, centred on the anchor
  const per = Math.ceil(holdings.length / 2), pitch = Math.min(4.2, 26 / Math.max(1, per));
  holdings.forEach((h, i) => {
    const row = i % 2, k2 = Math.floor(i / 2);
    const g = new THREE.Group(); g.position.set(row ? 2.6 : -2.6, 0, (k2 - (per - 1) / 2) * pitch); ex.add(g);
    g.rotation.y = row ? -Math.PI / 2 : Math.PI / 2;
    const base = part(G(slab(1.1, 1.1, 0.9, 0.04, 0.012, 2, 6)), M.stone); g.add(base);
    const band = part(G(slab(1.12, 1.12, 0.035, 0.04, 0, 1, 6)), tone(h.returnPct)); band.position.y = 0.9; g.add(band);
    const H = 0.35 + 2.0 * Math.sqrt(h.weight);
    const mono = part(G(slab(0.42, 0.42, H, 0.01, 0.006, 2, 4)), M.steel); mono.position.y = 0.935; g.add(mono);
    const pl = plaque(h); disposables.push(pl.texture);
    const pm = new THREE.Mesh(G(new THREE.PlaneGeometry(0.64, 0.36)), new THREE.MeshBasicMaterial({ map: pl.texture, toneMapped: false })); disposables.push(pm.material as THREE.Material);
    pm.position.set(0, 0.62, 0.556); pm.rotation.x = -0.18; g.add(pm);
    g.traverse((o) => { o.userData.id = h.id; }); pickables.push(g);
    const lab = new THREE.Object3D(); lab.position.y = 0.935 + H + 0.55; g.add(lab);
    out.push({ id: `district:${h.id}`, obj: lab, scene: 2 });
  });

  // ---------------- PERFORMANCE LINE (east gallery wall, facing −x) ----------------
  const perf = new THREE.Group(); perf.position.set(...(anchors.performance ?? [39.7, 9.2, 4])); root.add(perf);
  perf.rotation.y = -Math.PI / 2; // local +x = along the wall (time), local +y up, local +z = out of the wall
  const hist = d.history;
  if (hist.length >= 2) {
    const m0 = monthNo(hist[0].date), mL = monthNo(hist[hist.length - 1].date);
    const idx = hist.map((p) => p.index); let lo = Math.min(100, ...idx), hi = Math.max(100, ...idx); const pad = (hi - lo) * 0.1 || 5; lo -= pad; hi += pad;
    const W2 = 22, H2 = 2.6;
    const X = (iso: string) => -W2 / 2 + W2 * ((monthNo(iso) - m0) / Math.max(1, mL - m0));
    const Y = (v: number) => -H2 / 2 + H2 * ((v - lo) / (hi - lo));
    const OUT = 0.22;
    const pts = hist.map((p) => new THREE.Vector3(X(p.date), Y(p.index), OUT));
    const barG = G(new THREE.BoxGeometry(1, 0.12, 0.08)), jointG = G(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 32)); jointG.rotateX(Math.PI / 2);
    const pinG = G(new THREE.CylinderGeometry(0.02, 0.02, OUT, 12)); pinG.rotateX(Math.PI / 2); pinG.translate(0, 0, OUT / 2);
    const capG = G(new THREE.CylinderGeometry(0.095, 0.095, 0.026, 40)); capG.rotateX(Math.PI / 2);
    // soft contact shadow on the stone behind the bar (a gallery piece reads because it sits in its own shadow)
    const sc = document.createElement("canvas"); sc.width = 8; sc.height = 64;
    const sg = sc.getContext("2d")!; const gr = sg.createLinearGradient(0, 0, 0, 64);
    gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.45, "rgba(0,0,0,0.55)"); gr.addColorStop(1, "rgba(0,0,0,0)"); sg.fillStyle = gr; sg.fillRect(0, 0, 8, 64);
    const shadowTex = new THREE.CanvasTexture(sc); disposables.push(shadowTex);
    const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.8 }); disposables.push(shadowMat);
    const shadowG = G(new THREE.PlaneGeometry(1, 0.42));
    pts.forEach((p, i) => {
      const j = part(jointG, M.steel); j.position.copy(p); perf.add(j);
      const pin = part(pinG, M.steel); pin.position.set(p.x, p.y, 0); perf.add(pin);
      const consecutive = i > 0 && monthNo(hist[i].date) - monthNo(hist[i - 1].date) === 1;
      const r = consecutive ? hist[i].index / hist[i - 1].index - 1 : null;
      const c = part(capG, i === 0 ? M.neutral : tone(r)); c.position.set(p.x, p.y, OUT + 0.052); perf.add(c);
      if (consecutive) {
        const q0 = pts[i - 1], dd = new THREE.Vector3().subVectors(p, q0);
        const bar = part(barG, M.steel); bar.position.copy(q0).addScaledVector(dd, 0.5); bar.scale.x = dd.length(); bar.rotation.z = Math.atan2(dd.y, dd.x); perf.add(bar);
        const sh = new THREE.Mesh(shadowG, shadowMat); sh.position.set(bar.position.x + 0.05, bar.position.y - 0.1, 0.004); sh.scale.x = dd.length() + 0.1; sh.rotation.z = bar.rotation.z; sh.renderOrder = 1; perf.add(sh);
      }
    });
    const baseG = G(new THREE.CylinderGeometry(0.008, 0.008, W2 + 0.6, 12)); baseG.rotateZ(Math.PI / 2);
    const b100 = part(baseG, M.satin); b100.position.set(0, Y(100), 0.06); perf.add(b100);
    const a0 = new THREE.Object3D(); a0.position.copy(pts[0]).add(new THREE.Vector3(0, 0.55, 0.2)); perf.add(a0);
    const a1 = new THREE.Object3D(); a1.position.copy(pts[pts.length - 1]).add(new THREE.Vector3(0, 0.55, 0.2)); perf.add(a1);
    out.push({ id: "obs:start", obj: a0, scene: 3 }, { id: "obs:end", obj: a1, scene: 3 });
  }

  return {
    root, anchors: out, pickables,
    update(dt: number) { updateBalls(dt); },
    dispose() { geos.forEach((g) => g.dispose()); disposables.forEach((x) => x.dispose()); },
  };
}

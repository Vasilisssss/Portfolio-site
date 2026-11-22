import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { WorldData } from "../engine";
import type { Materials } from "./materials";
import { annularSector, boxUV, part, ring, slab } from "./geometry";
import { squarify } from "../treemap";
import { CITY, ENGINE_C, LID_CEIL, PLATE_H, TOWER_MAX } from "./dims";

export interface Anchor { id: string; obj: THREE.Object3D; scene: number }
const EPS = 0.0005; // |return| below 0.05% reads as 0.0% and is shown neutral

/** monthly index since the first point (gaps are kept, never filled) */
const monthNo = (iso: string) => { const [y, m] = iso.slice(0, 7).split("-").map(Number); return y * 12 + (m - 1); };

export function buildWorld(data: WorldData, m: Materials, low: boolean, platform: THREE.Group, lidBody: THREE.Group) {
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const G = <T extends THREE.BufferGeometry>(g: T) => { geos.push(g); return g; };
  const anchors: Anchor[] = [];
  const pickables: THREE.Object3D[] = [];
  const tone = (r: number | null) => (r == null || Math.abs(r) < EPS ? m.neutral : r > 0 ? m.lime : m.coral);
  const holdings = data.holdings.filter((h) => h.weight > 0);
  const top = PLATE_H; // platform-local plate surface

  // =====================================================================
  // II — THE CAPITAL ENGINE: a turned reservoir of steel bearings feeding a distribution ring.
  //      Each holding owns an arc of the ring exactly ∝ its weight, fed by its own rail channel.
  // =====================================================================
  const engine = new THREE.Group(); engine.position.set(ENGINE_C.x, top, ENGINE_C.z); platform.add(engine);
  const discG = G(new THREE.CylinderGeometry(0.027, 0.0275, 0.004, 96)); discG.translate(0, 0.002, 0);
  engine.add(part(discG, m.turned));
  const vesselG = G(new THREE.CylinderGeometry(0.0185, 0.0185, 0.024, 96, 1)); vesselG.translate(0, 0.004 + 0.012, 0);
  const vessel = new THREE.Mesh(vesselG, m.vessel); vessel.castShadow = false; vessel.receiveShadow = false; engine.add(vessel);
  const lipG = G(new THREE.TorusGeometry(0.0187, 0.0011, 16, 96)); lipG.rotateX(Math.PI / 2);
  for (const y of [0.0045, 0.028]) { const lip = part(lipG, m.steel); lip.position.y = y; engine.add(lip); }
  const capG = G(new THREE.CylinderGeometry(0.0125, 0.0135, 0.003, 64)); const cap = part(capG, m.turned); cap.position.y = 0.0295; engine.add(cap);
  // bearings resting in the reservoir (hex-packed layers)
  const BALL = 0.0021;
  const ballG = G(new THREE.SphereGeometry(BALL, low ? 14 : 24, low ? 10 : 16));
  const pile: THREE.Vector3[] = [];
  for (let layer = 0; layer < 3; layer++) {
    const y = 0.004 + BALL + layer * BALL * 1.63, off = layer % 2 ? BALL : 0;
    for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
      const x = (i + (j % 2 ? 0.5 : 0)) * BALL * 2.02 + off * 0.5, z = j * BALL * 1.75 + off * 0.3;
      if (Math.hypot(x, z) < 0.0185 - BALL * 1.1) pile.push(new THREE.Vector3(x, y, z));
    }
  }
  const pileMesh = new THREE.InstancedMesh(ballG, m.chrome, pile.length);
  pile.forEach((p, i) => pileMesh.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z)));
  pileMesh.castShadow = true; engine.add(pileMesh);

  // distribution ring: arcs ∝ weight (a 1.2° minimum keeps tiny positions visible; gaps are machined slots)
  const R0 = 0.04, R1 = 0.056, RING_H = 0.009;
  const n = Math.max(1, holdings.length), gap = n > 1 ? THREE.MathUtils.degToRad(n > 12 ? 1.2 : 2.4) : 0;
  const avail = Math.PI * 2 - gap * n, minA = THREE.MathUtils.degToRad(1.2);
  const raw = holdings.map((h) => Math.max(minA, h.weight * avail));
  const k = avail / raw.reduce((s, a) => s + a, 0);
  let a = -raw[0] * k / 2; // largest arc faces the city (+x)
  const channels: { dir: THREE.Vector3; axis: THREE.Vector3; count: number; phase: number; mesh: THREE.InstancedMesh }[] = [];
  const railG = G(new THREE.CylinderGeometry(0.0007, 0.0007, 1, 12)); railG.rotateZ(Math.PI / 2); railG.translate(0.5, 0, 0);
  const stayG = G(new THREE.CylinderGeometry(0.0009, 0.0011, 0.0016, 12)); stayG.translate(0, 0.0008, 0);
  const RAIL_Y = 0.0014, RAIL_OFF = 0.0018, RA = 0.0205, RB = R0 + 0.001;
  holdings.forEach((h, i) => {
    const span = raw[i] * k, a0 = a, a1 = a + span; a = a1 + gap;
    const seg = part(G(annularSector(R0, R1, a0, a1, RING_H, 0.0008, low ? 2 : 3)), m.titanium);
    seg.userData.id = h.id; pickables.push(seg); engine.add(seg);
    const inlayInset = Math.min(span * 0.2, THREE.MathUtils.degToRad(0.6));
    const inlay = part(G(annularSector(R1 - 0.0042, R1 - 0.0018, a0 + inlayInset, a1 - inlayInset, 0.0007, 0)), tone(h.returnPct));
    inlay.position.y = RING_H - 0.0001; inlay.userData.id = h.id; engine.add(inlay);
    // the channel: two polished rails on stays, from the reservoir port to the holding's arc
    const am = (a0 + a1) / 2;
    const dir = new THREE.Vector3(Math.cos(am), 0, -Math.sin(am));
    const side = new THREE.Vector3(dir.z, 0, -dir.x);
    const ch = new THREE.Group(); engine.add(ch);
    for (const s of [-1, 1]) {
      const rail = part(railG, m.steel);
      rail.position.copy(dir.clone().multiplyScalar(RA)).addScaledVector(side, s * RAIL_OFF); rail.position.y = RAIL_Y;
      rail.scale.set(RB - RA, 1, 1); rail.rotation.y = Math.atan2(-dir.z, dir.x); ch.add(rail);
      for (const r of [RA + 0.002, (RA + RB) / 2, RB - 0.002]) { const st = part(stayG, m.titanium); st.position.copy(dir.clone().multiplyScalar(r)).addScaledVector(side, s * RAIL_OFF); st.scale.y = (RAIL_Y) / 0.0016; ch.add(st); }
    }
    // bearings in flight: count ∝ weight
    const count = Math.max(1, Math.round(1 + 9 * h.weight));
    const bm = new THREE.InstancedMesh(ballG, m.chrome, count); bm.castShadow = true; engine.add(bm);
    channels.push({ dir, axis: new THREE.Vector3(dir.z, 0, -dir.x), count, phase: (i * 0.37) % 1, mesh: bm });
    const lab = new THREE.Object3D(); lab.position.copy(dir.clone().multiplyScalar(R1 + 0.006)); lab.position.y = RING_H + 0.012; engine.add(lab);
    anchors.push({ id: `engine:${h.id}`, obj: lab, scene: 1 });
  });
  const ballY = RAIL_Y + Math.sqrt((BALL + 0.0007) ** 2 - RAIL_OFF ** 2);
  const q = new THREE.Quaternion(), mtx = new THREE.Matrix4(), pos = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  let travel = 0;
  const updateBalls = (dt: number, flow: number) => {
    travel += dt * 0.011 * flow; // metres rolled
    const L = RB + 0.002 - (0.0185 - BALL);
    channels.forEach((c) => {
      for (let j = 0; j < c.count; j++) {
        const s = ((travel / L + c.phase + j / c.count) % 1 + 1) % 1;
        const r = 0.0185 - BALL + s * L;
        pos.copy(c.dir).multiplyScalar(r); pos.y = ballY;
        // rolling without slipping: angle = distance / radius
        q.setFromAxisAngle(c.axis, -(travel + (j / c.count) * L) / BALL);
        // hidden inside the reservoir wall and the ring (ports), never floating
        const vis = r > 0.0185 + BALL * 0.2 && r < R0 + BALL * 0.6 ? 1 : 0;
        mtx.compose(pos, q, vis ? one : new THREE.Vector3(0.0001, 0.0001, 0.0001));
        c.mesh.setMatrixAt(j, mtx);
      }
      c.mesh.instanceMatrix.needsUpdate = true;
    });
  };
  updateBalls(0, 0);

  // =====================================================================
  // III — THE INVESTMENT CITY: a model on a treemap of plots. Plot area ∝ weight; building height ∝ √weight.
  //       The anodised band around each plot: lime above cost, coral below, steel when unknown or flat.
  // =====================================================================
  const lots = squarify(holdings.map((h) => h.weight), { x: CITY.x0, y: CITY.z0, w: CITY.x1 - CITY.x0, h: CITY.z1 - CITY.z0 });
  const towers: { tiers: THREE.Group[]; tierH: number }[] = [];
  const bands: { id: string; mat: THREE.MeshPhysicalMaterial }[] = [];
  const STREET = 0.0036, PLINTH = 0.0022;
  const finG = G(new THREE.BoxGeometry(0.0006, 1, 0.0014)); finG.translate(0, 0.5, 0);
  const floorG = G(new THREE.BoxGeometry(1, 0.0005, 1));
  const colG = G(new THREE.CylinderGeometry(0.0007, 0.0007, 1, 12)); colG.translate(0, 0.5, 0);
  holdings.forEach((h, i) => {
    const L = lots[i]; if (!L.w || !L.h) return;
    const lw = L.w - STREET, ld = L.h - STREET;
    const cx = L.x + L.w / 2, cz = L.y + L.h / 2;
    const lot = new THREE.Group(); lot.position.set(cx, top, cz); platform.add(lot);
    lot.add(part(G(slab(lw, ld, PLINTH, 0.0016, 0.0004, 2, 6)), m.anodized));
    const bandMat = (tone(h.returnPct) as THREE.MeshPhysicalMaterial).clone(); mats.push(bandMat); bands.push({ id: h.id, mat: bandMat });
    lot.add(part(G(ring(lw + 0.0014, ld + 0.0014, 0.0022, 0.0012, 0.0013, 0, 1, 6)), bandMat));
    const b = new THREE.Group(); b.position.y = PLINTH; lot.add(b);
    const cls = h.assetClass;
    const minSide = Math.min(lw, ld);
    let topAnchor: THREE.Object3D = b, topY = 0.01;
    if (cls === "Cash") {
      // the reserve: a stack of polished plates
      const fw = Math.min(lw * 0.7, minSide * 1.4), fd = Math.min(ld * 0.7, minSide * 1.4);
      const H = 0.006 + 0.028 * Math.sqrt(h.weight), plates = 5, ph = H / plates;
      for (let p = 0; p < plates; p++) { const pl = part(G(slab(fw, fd, ph - 0.0004, 0.0012, 0.0003, 2, 6)), m.steel); pl.position.y = p * ph; b.add(pl); }
      topY = H;
    } else if (cls === "ETFs" || cls === "Bonds") {
      // diversified basket: a pavilion of slender columns under one roof (bonds: a colonnade around a solid core)
      const fw = lw * 0.8, fd = ld * 0.8, H = 0.01 + 0.03 * Math.sqrt(h.weight);
      const roof = part(G(slab(fw, fd, 0.0016, 0.001, 0.0003, 2, 6)), m.anodized); roof.position.y = H - 0.0016; b.add(roof);
      const nx = Math.max(2, Math.round(fw / 0.006)), nz = Math.max(2, Math.round(fd / 0.006));
      const cols: THREE.Vector3[] = [];
      for (let ix = 0; ix < nx; ix++) for (let iz = 0; iz < nz; iz++) {
        const edge = ix === 0 || iz === 0 || ix === nx - 1 || iz === nz - 1;
        if (cls === "Bonds" && !edge) continue;
        cols.push(new THREE.Vector3(-fw / 2 + 0.0015 + (ix / (nx - 1)) * (fw - 0.003), 0, -fd / 2 + 0.0015 + (iz / (nz - 1)) * (fd - 0.003)));
      }
      const cm = new THREE.InstancedMesh(colG, m.aluminium, cols.length); cm.castShadow = true; cm.receiveShadow = true;
      cols.forEach((c, j) => cm.setMatrixAt(j, new THREE.Matrix4().compose(c, new THREE.Quaternion(), new THREE.Vector3(1, H - 0.0016, 1)))); b.add(cm);
      const coreW = cls === "Bonds" ? fw * 0.62 : fw * 0.5, coreD = cls === "Bonds" ? fd * 0.62 : fd * 0.5;
      const core = new THREE.Mesh(G(boxUV(new THREE.BoxGeometry(coreW, H - 0.0016, coreD))), cls === "Bonds" ? m.anodized : m.glass);
      core.position.y = (H - 0.0016) / 2; core.castShadow = cls === "Bonds"; b.add(core);
      topY = H;
    } else {
      // a telescoping tower: three set-back tiers of smoked glass, aluminium fins and anodised floor plates
      const side = Math.min(minSide * 0.52, 0.062);
      const H = Math.min(TOWER_MAX, 0.024 + 0.126 * Math.sqrt(h.weight)), tierH = H / 3;
      const tiers: THREE.Group[] = [];
      let parent: THREE.Object3D = b;
      for (let t = 0; t < 3; t++) {
        const s = side * (1 - 0.14 * t);
        const tier = new THREE.Group(); parent.add(tier); tiers.push(tier);
        const core = part(G(boxUV(new THREE.BoxGeometry(s * 0.46, tierH, s * 0.46))), m.composite); core.position.y = tierH / 2; tier.add(core);
        const glass = new THREE.Mesh(G(new RoundedBoxGeometry(s, tierH, s, 2, 0.0004)), m.glass); glass.position.y = tierH / 2; tier.add(glass);
        const floors = Math.max(1, Math.floor(tierH / 0.0042));
        const fm = new THREE.InstancedMesh(floorG, m.anodized, floors); fm.receiveShadow = true;
        for (let f = 0; f < floors; f++) fm.setMatrixAt(f, new THREE.Matrix4().compose(new THREE.Vector3(0, (f + 0.5) * (tierH / floors), 0), new THREE.Quaternion(), new THREE.Vector3(s * 0.97, 1, s * 0.97)));
        tier.add(fm);
        const perFace = Math.max(3, Math.round(s / 0.0062));
        const fins = new THREE.InstancedMesh(finG, m.aluminium, perFace * 4); fins.castShadow = true; fins.receiveShadow = true;
        let fi = 0; const fq = new THREE.Quaternion();
        for (let f = 0; f < 4; f++) {
          fq.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (f * Math.PI) / 2);
          for (let j = 0; j < perFace; j++) {
            const lx = -s / 2 + 0.0008 + (j / (perFace - 1)) * (s - 0.0016);
            const v = new THREE.Vector3(lx, 0, s / 2 + 0.0007).applyQuaternion(fq);
            fins.setMatrixAt(fi++, new THREE.Matrix4().compose(v, fq, new THREE.Vector3(1, tierH, 1)));
          }
        }
        tier.add(fins);
        const cornice = part(G(slab(s + 0.0024, s + 0.0024, 0.0012, 0.0006, 0.0002, 1, 4)), m.anodized); cornice.position.y = tierH - 0.0006; tier.add(cornice);
        parent = tier;
      }
      const s2 = side * 0.72;
      const crown = part(G(slab(s2 * 0.7, s2 * 0.7, 0.0022, 0.0008, 0.0003, 2, 4)), m.anodized); crown.position.y = tierH + 0.0006; tiers[2].add(crown);
      towers.push({ tiers, tierH });
      topAnchor = tiers[2]; topY = tierH + 0.004;
    }
    b.traverse((o) => { o.userData.id = h.id; }); pickables.push(b);
    const lab = new THREE.Object3D(); lab.position.y = topY + 0.012; topAnchor.add(lab);
    anchors.push({ id: `district:${h.id}`, obj: lab, scene: 2 });
  });
  const setTowers = (e: number) => {
    towers.forEach((tw) => {
      const e1 = Math.min(1, Math.max(0, e * 2)), e2 = Math.min(1, Math.max(0, e * 2 - 1));
      tw.tiers[1].position.y = tw.tierH * e1;
      tw.tiers[2].position.y = tw.tierH * e2;
    });
  };
  setTowers(0);

  // =====================================================================
  // IV — THE PERFORMANCE GALLERY: inside the lid, a polished steel bar traces the real month-end index
  //      (rebased to 100) on standoff pins over a black anodised plate. Each month's cap: lime gain, coral loss.
  //      Missing months break the bar — nothing is interpolated or invented.
  // =====================================================================
  const gallery = new THREE.Group(); lidBody.add(gallery);
  const plateBottom = LID_CEIL - 0.0015 - 0.003;
  const gplate = part(G(slab(0.4, 0.28, 0.003, 0.01, 0.0006, 2, 8)), m.titanium); gplate.position.y = plateBottom; gallery.add(gplate);
  const hist = data.history;
  if (hist.length >= 2) {
    const m0 = monthNo(hist[0].date), mLast = monthNo(hist[hist.length - 1].date);
    const idx = hist.map((p) => p.index);
    let lo = Math.min(100, ...idx), hi = Math.max(100, ...idx); const pad = (hi - lo) * 0.1 || 5; lo -= pad; hi += pad;
    const X = (iso: string) => -0.17 + 0.34 * ((monthNo(iso) - m0) / Math.max(1, mLast - m0));
    const Z = (v: number) => -0.095 + 0.19 * ((v - lo) / (hi - lo));
    const BAR_Y = plateBottom - 0.0075;
    const pts = hist.map((p) => new THREE.Vector3(X(p.date), BAR_Y, Z(p.index)));
    const barG = G(new THREE.BoxGeometry(1, 0.0022, 0.0032));
    const jointG = G(new THREE.CylinderGeometry(0.0016, 0.0016, 0.0022, 24));
    const pinG = G(new THREE.CylinderGeometry(0.00055, 0.00055, 1, 12)); pinG.translate(0, 0.5, 0);
    const capG2 = G(new THREE.CylinderGeometry(0.0027, 0.0027, 0.0006, 32));
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const joint = part(jointG, m.steel); joint.position.copy(p); gallery.add(joint);
      const pin = part(pinG, m.steel); pin.position.set(p.x, BAR_Y + 0.0011, p.z); pin.scale.y = plateBottom - (BAR_Y + 0.0011); gallery.add(pin);
      const consecutive = i > 0 && monthNo(hist[i].date) - monthNo(hist[i - 1].date) === 1;
      const r = consecutive ? hist[i].index / hist[i - 1].index - 1 : null;
      const capM = part(capG2, i === 0 ? m.neutral : tone(r)); capM.position.set(p.x, BAR_Y - 0.0011 - 0.0003, p.z); gallery.add(capM);
      if (consecutive) {
        const q0 = pts[i - 1], d = new THREE.Vector3().subVectors(p, q0);
        const bar = part(barG, m.steel); bar.position.copy(q0).addScaledVector(d, 0.5);
        bar.scale.x = d.length(); bar.rotation.y = -Math.atan2(d.z, d.x); gallery.add(bar);
      }
    }
    // the 100 line (where the index started) and one engraved tick per month
    const baseG = G(new THREE.CylinderGeometry(0.0004, 0.0004, 0.35, 12)); baseG.rotateZ(Math.PI / 2);
    const base = part(baseG, m.aluminium); base.position.set(0, plateBottom - 0.0025, Z(100)); gallery.add(base);
    const tickG = G(new THREE.BoxGeometry(0.0004, 0.0002, 0.004));
    for (let mm = 0; mm <= mLast - m0; mm++) { const t = new THREE.Mesh(tickG, m.composite); t.position.set(-0.17 + 0.34 * (mm / Math.max(1, mLast - m0)), plateBottom - 0.0001, -0.112); gallery.add(t); }
    const a0 = new THREE.Object3D(); a0.position.copy(pts[0]).add(new THREE.Vector3(0, -0.012, 0.012)); gallery.add(a0);
    const a1 = new THREE.Object3D(); a1.position.copy(pts[pts.length - 1]).add(new THREE.Vector3(0, -0.012, 0.012)); gallery.add(a1);
    anchors.push({ id: "obs:start", obj: a0, scene: 3 }, { id: "obs:end", obj: a1, scene: 3 });
  }

  return {
    anchors, pickables,
    update(dt: number, s: { towers: number; flow: number }) { setTowers(s.towers); updateBalls(dt, s.flow); },
    highlight(id: string | null) { bands.forEach((b) => { b.mat.emissiveIntensity = b.id === id ? 0.45 : 0; }); },
    dispose() { geos.forEach((g) => g.dispose()); mats.forEach((x) => x.dispose()); },
  };
}

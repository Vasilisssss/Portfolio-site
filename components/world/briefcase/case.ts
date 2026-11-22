import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Materials } from "./materials";
import { boxUV, part, ring, slab } from "./geometry";
import { D, FLOOR_Y, FOOT, GASKET, PIVOT_Y, PIVOT_Z, PLATE_D, PLATE_H, PLATE_W, PLATE_Y0, PROUD, R, SEAM, TOP, W, WALL } from "./dims";

/** Points + unit tangents along a rounded-rectangle outline (x/z plane), evenly spaced. */
function perimeter(w: number, d: number, r: number, spacing: number) {
  const segs: { a: THREE.Vector2; b: THREE.Vector2 }[] = [];
  const pts: THREE.Vector2[] = [];
  const x = w / 2 - r, z = d / 2 - r;
  const arc = (cx: number, cz: number, a0: number) => { for (let i = 0; i <= 12; i++) { const a = a0 + (i / 12) * (Math.PI / 2); pts.push(new THREE.Vector2(cx + Math.cos(a) * r, cz + Math.sin(a) * r)); } };
  arc(x, z, 0); arc(-x, z, Math.PI / 2); arc(-x, -z, Math.PI); arc(x, -z, Math.PI * 1.5);
  pts.push(pts[0].clone());
  for (let i = 0; i < pts.length - 1; i++) segs.push({ a: pts[i], b: pts[i + 1] });
  const total = segs.reduce((s, g) => s + g.a.distanceTo(g.b), 0);
  const n = Math.floor(total / spacing);
  const out: { p: THREE.Vector2; t: THREE.Vector2 }[] = [];
  let si = 0, acc = 0;
  for (let k = 0; k < n; k++) {
    const target = k * (total / n);
    while (si < segs.length - 1 && acc + segs[si].a.distanceTo(segs[si].b) < target) { acc += segs[si].a.distanceTo(segs[si].b); si++; }
    const g = segs[si], L = g.a.distanceTo(g.b), f = (target - acc) / L;
    out.push({ p: g.a.clone().lerp(g.b, f), t: g.b.clone().sub(g.a).normalize() });
  }
  return out;
}

/** Saddle stitching: short waxed-thread capsules, slightly angled, half sunk into the leather. */
function stitches(m: Materials, w: number, d: number, r: number, spacing: number, place: (p: THREE.Vector2, t: THREE.Vector2, o: THREE.Object3D) => void) {
  const g = new THREE.CapsuleGeometry(0.00042, 0.0019, 2, 6);
  g.rotateZ(Math.PI / 2);
  const pts = perimeter(w, d, r, spacing);
  const mesh = new THREE.InstancedMesh(g, m.thread, pts.length);
  const o = new THREE.Object3D();
  pts.forEach((s, i) => { o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.quaternion.identity(); place(s.p, s.t, o); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix); });
  mesh.castShadow = false; mesh.receiveShadow = true;
  return mesh;
}

export interface CaseParts {
  root: THREE.Group;
  lidPivot: THREE.Group;          // rotates about the hinge axis
  lidBody: THREE.Group;           // lid parts in closed case coordinates (gallery mounts here)
  flaps: THREE.Group[];           // latch flaps (rotate about their own pivots)
  sliders: { mesh: THREE.Object3D; x0: number; dir: number }[];
  lamps: THREE.MeshBasicMaterial;
  platform: THREE.Group;          // the model base plate (rises)
  posts: THREE.Mesh[];            // lift posts under the plate
  dispose: () => void;
}

/**
 * THE BRIEFCASE. Black satin-titanium frame, full-grain leather shell, lime silicone seal,
 * two mechanical locks (slider → spring flap), barrel hinges, folding leather handle, polished feet.
 */
export function buildCase(m: Materials, low: boolean): CaseParts {
  const geos: THREE.BufferGeometry[] = [];
  const G = <T extends THREE.BufferGeometry>(g: T) => { geos.push(g); return g; };
  const seg = low ? 2 : 4, cs = low ? 8 : 16;
  const root = new THREE.Group(); root.name = "briefcase";

  // ---------------- BASE ----------------
  const base = new THREE.Group(); root.add(base);
  const bottom = part(G(slab(W, D, 0.008, R, 0.003, seg, cs)), m.leather); bottom.position.y = FOOT; base.add(bottom);
  const walls = part(G(ring(W, D, R, WALL, SEAM - 0.012 - FOOT - 0.002, 0.0015, seg, cs)), m.leather); walls.position.y = FOOT + 0.002; base.add(walls);
  const frameB = part(G(ring(W + 2 * PROUD, D + 2 * PROUD, R + PROUD, WALL + PROUD + 0.0005, 0.014, 0.0012, seg, cs)), m.titanium); frameB.position.y = SEAM - 0.014; base.add(frameB);
  const gasket = part(G(ring(W + 0.0012, D + 0.0012, R + 0.0006, 0.0028, GASKET, 0.0003, 1, cs)), m.gasket); gasket.position.y = SEAM; base.add(gasket);
  // stitched seam just under the frame
  base.add(stitches(m, W + 0.0003, D + 0.0003, R + 0.00015, 0.0044, (p, t, o) => {
    o.position.set(p.x, SEAM - 0.0185, p.y);
    o.rotation.set(0, -Math.atan2(t.y, t.x), 0.18);
  }));
  // interior lining
  const lineW = W - 2 * WALL, lineD = D - 2 * WALL;
  const liningFloor = part(G(slab(lineW, lineD, 0.003, R - WALL, 0, 1, cs)), m.suede); liningFloor.position.y = FLOOR_Y - 0.003; base.add(liningFloor);
  const liningWall = part(G(ring(lineW, lineD, R - WALL, 0.0015, SEAM - 0.001 - FLOOR_Y, 0.0004, 1, cs)), m.suede); liningWall.position.y = FLOOR_Y; base.add(liningWall);
  // feet
  const footG = G(new THREE.SphereGeometry(0.0072, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)); footG.rotateX(Math.PI); footG.scale(1, 0.56, 1);
  for (const [fx, fz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { const f = part(footG, m.steel); f.position.set(fx * (W / 2 - 0.035), FOOT, fz * (D / 2 - 0.035)); base.add(f); }
  // contact shadow
  const cg = G(new THREE.PlaneGeometry(W * 1.32, D * 1.42)); cg.rotateX(-Math.PI / 2);
  const contact = new THREE.Mesh(cg, m.contact); contact.position.y = 0.0004; contact.renderOrder = -1; root.add(contact);

  // ---------------- LOCKS (on the base) + FLAPS (on the lid) ----------------
  const lockBody = G(new RoundedBoxGeometry(0.04, 0.0335, 0.009, low ? 2 : 4, 0.0022)); boxUV(lockBody);
  const sliderG = G(new RoundedBoxGeometry(0.013, 0.0052, 0.0042, 2, 0.0012)); boxUV(sliderG);
  const grooveG = G(new THREE.BoxGeometry(0.0004, 0.0036, 0.0006));
  const lampG = G(new THREE.CylinderGeometry(0.0011, 0.0011, 0.0008, 20)); lampG.rotateX(Math.PI / 2);
  const bezelG = G(new THREE.TorusGeometry(0.0016, 0.0004, 8, 24));
  const flapG = G(new RoundedBoxGeometry(0.034, 0.033, 0.0032, low ? 2 : 4, 0.0012)); boxUV(flapG);
  const hookG = G(new THREE.BoxGeometry(0.018, 0.0026, 0.0036));
  const flapPinG = G(new THREE.CylinderGeometry(0.0016, 0.0016, 0.038, 20)); flapPinG.rotateZ(Math.PI / 2);
  const lamps = new THREE.MeshBasicMaterial({ color: 0x1a1d12, toneMapped: false });
  const sliders: CaseParts["sliders"] = [];
  const lockY0 = 0.044, front = D / 2;
  for (const sx of [-1, 1]) {
    const x = sx * 0.135;
    const body = part(lockBody, m.titanium); body.position.set(x, lockY0 + 0.0335 / 2, front + 0.0045); base.add(body);
    // slider (moves outward to release)
    const sl = new THREE.Group(); sl.position.set(x + sx * -0.004, lockY0 + 0.0052, front + 0.0098); base.add(sl);
    sl.add(part(sliderG, m.titanium));
    for (let k = -1; k <= 1; k++) { const gr = new THREE.Mesh(grooveG, m.composite); gr.position.set(k * 0.0022, 0, 0.0021); sl.add(gr); }
    sliders.push({ mesh: sl, x0: sl.position.x, dir: sx });
    // indicator lamp with a polished bezel
    const lamp = new THREE.Mesh(lampG, lamps); lamp.position.set(x - sx * 0.0135, lockY0 + 0.0052, front + 0.0092); base.add(lamp);
    const bz = new THREE.Mesh(bezelG, m.steel); bz.position.copy(lamp.position); bz.position.z += 0.0002; base.add(bz);
  }

  // ---------------- HINGES (base half) ----------------
  const knuckleG = G(new THREE.CylinderGeometry(0.0042, 0.0042, 0.0108, 32)); knuckleG.rotateZ(Math.PI / 2); boxUV(knuckleG);
  const capG = G(new THREE.SphereGeometry(0.0042, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)); capG.rotateZ(-Math.PI / 2); capG.scale(0.35, 1, 1);
  const leafG = G(new RoundedBoxGeometry(0.034, 0.016, 0.0016, 2, 0.0006)); boxUV(leafG);
  const screwG = G(new THREE.CylinderGeometry(0.0013, 0.0013, 0.0007, 20)); screwG.rotateX(Math.PI / 2);
  const slotG = G(new THREE.BoxGeometry(0.0019, 0.00035, 0.0003));
  const screws = (leaf: THREE.Object3D, back: number) => {
    for (const k of [-1, 1]) {
      const s = new THREE.Mesh(screwG, m.steel); s.position.set(k * 0.011, 0, back * 0.0011); leaf.add(s);
      const sl = new THREE.Mesh(slotG, m.composite); sl.position.set(k * 0.011, 0, back * 0.0015); sl.rotation.z = 0.6 * k; leaf.add(sl);
    }
  };
  const hingeX = [-0.15, 0.15];
  for (const hx of hingeX) {
    const leaf = part(leafG, m.titanium); leaf.position.set(hx, SEAM - 0.009, -D / 2 - PROUD - 0.0009); base.add(leaf); screws(leaf, -1);
    for (const k of [-1, 1]) {
      const kn = part(knuckleG, m.steel); kn.position.set(hx + k * 0.0113, PIVOT_Y, PIVOT_Z); base.add(kn);
      const cap = part(capG, m.steel); cap.position.set(hx + k * 0.0167, PIVOT_Y, PIVOT_Z); cap.scale.x = k; base.add(cap);
    }
  }

  // ---------------- HANDLE (folded down against the front) ----------------
  const bracketG = G(new RoundedBoxGeometry(0.012, 0.016, 0.012, 2, 0.0025)); boxUV(bracketG);
  const pivotY = 0.064, pivotZ = front + 0.0105;
  for (const sx of [-1, 1]) { const br = part(bracketG, m.titanium); br.position.set(sx * 0.064, pivotY, front + 0.0065); base.add(br); }
  const handle = new THREE.Group(); handle.position.set(0, pivotY, pivotZ); handle.rotation.x = 0.08; base.add(handle);
  const hp = [[-0.0575, 0], [-0.056, -0.016], [-0.047, -0.031], [-0.026, -0.0395], [0, -0.041], [0.026, -0.0395], [0.047, -0.031], [0.056, -0.016], [0.0575, 0]].map(([x, y]) => new THREE.Vector3(x, y, 0));
  const grip = part(G(boxUV(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hp, false, "centripetal"), low ? 48 : 128, 0.0064, low ? 12 : 24, false))), m.leather);
  handle.add(grip);
  const pinG = G(new THREE.CylinderGeometry(0.0022, 0.0022, 0.016, 24)); pinG.rotateZ(Math.PI / 2);
  for (const sx of [-1, 1]) { const pin = part(pinG, m.titanium); pin.position.set(sx * 0.061, 0, 0); handle.add(pin); }

  // ---------------- MODEL PLATFORM (inside the base) ----------------
  const platform = new THREE.Group(); platform.position.y = PLATE_Y0; base.add(platform);
  const plate = part(G(slab(PLATE_W, PLATE_D, PLATE_H, 0.012, 0.0008, 2, cs)), m.titanium); platform.add(plate);
  const postG = G(new THREE.CylinderGeometry(0.0024, 0.0024, 1, 24)); postG.translate(0, -0.5, 0);
  const sleeveG = G(new THREE.CylinderGeometry(0.0042, 0.0046, 0.006, 24));
  const posts: THREE.Mesh[] = [];
  for (const [px, pz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const post = part(postG, m.steel); post.position.set(px * (PLATE_W / 2 - 0.016), PLATE_Y0, pz * (PLATE_D / 2 - 0.016)); post.scale.y = PLATE_Y0 - FLOOR_Y; base.add(post); posts.push(post);
    const sleeve = part(sleeveG, m.titanium); sleeve.position.set(post.position.x, FLOOR_Y + 0.003, post.position.z); base.add(sleeve);
  }

  // ---------------- LID ----------------
  const lidPivot = new THREE.Group(); lidPivot.position.set(0, PIVOT_Y, PIVOT_Z); root.add(lidPivot);
  const lidBody = new THREE.Group(); lidBody.position.set(0, -PIVOT_Y, -PIVOT_Z); lidPivot.add(lidBody);
  const frameL = part(G(ring(W + 2 * PROUD, D + 2 * PROUD, R + PROUD, WALL + PROUD + 0.0005, 0.013, 0.0012, seg, cs)), m.titanium); frameL.position.y = SEAM + GASKET; lidBody.add(frameL);
  const lidWalls = part(G(ring(W, D, R, WALL, TOP - 0.006 - (SEAM + GASKET + 0.011), 0.0015, seg, cs)), m.leather); lidWalls.position.y = SEAM + GASKET + 0.011; lidBody.add(lidWalls);
  const lidTop = part(G(slab(W, D, 0.009, R, 0.0034, seg, cs)), m.leather); lidTop.position.y = TOP - 0.009; lidBody.add(lidTop);
  // titanium bezel inlaid around the top panel, with saddle stitching inside it
  const bezel = part(G(ring(W - 0.012, D - 0.012, R - 0.006, 0.0042, 0.0016, 0.0005, 2, cs)), m.titanium); bezel.position.y = TOP - 0.0005; lidBody.add(bezel);
  lidBody.add(stitches(m, W - 0.0285, D - 0.0285, R - 0.014, 0.0044, (p, t, o) => {
    o.position.set(p.x, TOP + 0.0001, p.y);
    o.rotation.set(0, -Math.atan2(t.y, t.x), 0);
  }));
  // lid lining
  const lidLiningWall = part(G(ring(lineW, lineD, R - WALL, 0.0015, TOP - 0.009 - (SEAM + 0.002), 0.0004, 1, cs)), m.suede); lidLiningWall.position.y = SEAM + 0.002; lidBody.add(lidLiningWall);
  const lidCeil = part(G(slab(lineW, lineD, 0.0015, R - WALL, 0, 1, cs)), m.suede); lidCeil.position.y = TOP - 0.0095; lidBody.add(lidCeil);
  // hinge halves on the lid
  for (const hx of hingeX) {
    const leaf = part(leafG, m.titanium); leaf.position.set(hx, SEAM + GASKET + 0.0085, -D / 2 - PROUD - 0.0009); lidBody.add(leaf); screws(leaf, -1);
    const kn = part(knuckleG, m.steel); kn.position.set(hx, PIVOT_Y, PIVOT_Z); lidBody.add(kn);
  }
  // latch flaps hang from the lid over each lock
  const flaps: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const fp = new THREE.Group(); fp.position.set(sx * 0.135, SEAM + GASKET + 0.0095, front + 0.0112); lidBody.add(fp);
    const pin = part(flapPinG, m.titanium); fp.add(pin);
    const flap = part(flapG, m.titanium); flap.position.set(0, -0.0165, 0.0004); fp.add(flap);
    const hook = part(hookG, m.titanium); hook.position.set(0, -0.0315, -0.0026); fp.add(hook);
    const mount = part(G(new RoundedBoxGeometry(0.04, 0.007, 0.004, 2, 0.0012)), m.titanium); mount.position.set(sx * 0.135, SEAM + GASKET + 0.0095, front + 0.0082); lidBody.add(mount);
    flaps.push(fp);
  }

  return {
    root, lidPivot, lidBody, flaps, sliders, lamps, platform, posts,
    dispose() { geos.forEach((g) => g.dispose()); lamps.dispose(); },
  };
}

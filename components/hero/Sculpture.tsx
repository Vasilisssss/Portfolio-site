"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { pct } from "@/lib/format";
import { classColor } from "@/lib/palette";

export interface Orb { key: string; weight: number }
type HoverState = { i: number; x: number; y: number } | null;

/**
 * Studio lighting for reflections: three.js' RoomEnvironment (realistic softboxes) plus pastel
 * blue / lavender / pink / mint light strips, so chrome and glass pick up subtle colourful reflections.
 * Generated on the GPU at start-up — no HDR download.
 */
function studioEnvironment(renderer: THREE.WebGLRenderer) {
  const room = new RoomEnvironment();
  const strip = (color: string, intensity: number, pos: [number, number, number], rotY: number, w = 1.2, h = 6) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.set(...pos);
    m.rotation.y = rotY;
    room.add(m);
  };
  strip("#9fd0ff", 9, [-6.5, 4, 2], Math.PI / 2);
  strip("#c9b8ff", 9, [6.5, 4, -2], -Math.PI / 2);
  strip("#ffc4e4", 7, [2, 4, -9.5], 0, 3, 2);
  strip("#b6f2df", 7, [-3, 1.5, 9.5], 0, 3, 1.4);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(room, 0.035).texture;
  room.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose?.();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
  });
  pmrem.dispose();
  return env;
}

/** Bevelled coin (lathe profile, y-up) with a raised rim, recessed field and, on the high tier, a reeded edge. */
function coinGeometry(r: number, h: number, segs: number, rimRelief: number, reeds = 0) {
  const b = Math.min(h * 0.28, r * 0.08);
  const half = h / 2;
  const prof = [
    [0, -half + rimRelief], [r * 0.8, -half + rimRelief], [r * 0.82, -half], [r - b, -half], [r, -half + b],
    [r, -half + b * 1.4], [r, half - b * 1.4],
    [r, half - b], [r - b, half], [r * 0.82, half], [r * 0.8, half - rimRelief], [0, half - rimRelief],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const geo = new THREE.LatheGeometry(prof, segs);
  if (reeds > 0) {
    const p = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const rad = Math.hypot(x, z);
      if (rad > r - 1e-4 && Math.abs(y) < half - b * 0.9) {
        const k = 1 - 0.012 * Math.abs(Math.sin(Math.atan2(x, z) * reeds));
        p.setXYZ(i, x * k, y, z * k);
      }
    }
  }
  geo.computeVertexNormals();
  return geo;
}

/** Soft round sprite for sparkles. */
function dotTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.6)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/**
 * Investment centrepiece: a pearl dais holding one stack of iridescent chrome coins per asset class — stack height
 * is the real allocation — beneath a floating crystal coin with a rising-bars emblem. Hover a stack for its share,
 * click to filter the investments. Lazy-starts when visible; lighter tier on phones; static under reduced motion.
 */
export default function Sculpture({ orbs, className }: { orbs: Orb[]; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<HoverState>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let cleanup: (() => void) | null = null;
    let started = false;
    const start = () => { if (!started) { started = true; cleanup = mount(el, orbs, setHover); } };
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
      if (ric) ric(start, { timeout: 900 }); else setTimeout(start, 120);
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => { io.disconnect(); cleanup?.(); };
  }, [orbs]);

  const h = hover ? orbs[hover.i] : null;
  return (
    <div ref={host} className={`relative ${className ?? ""}`}>
      {h && hover && (
        <div className="glass pointer-events-none absolute z-10 flex -translate-x-1/2 -translate-y-[calc(100%+18px)] flex-col gap-1 rounded-2xl px-4 py-3" style={{ left: hover.x, top: hover.y }}>
          <span className="label">{h.key}</span>
          <span className="tnum font-serif text-[26px] leading-none">{pct(h.weight)}</span>
          <span className="text-[10px] tracking-[0.18em] text-mute">CLICK TO VIEW</span>
        </div>
      )}
    </div>
  );
}

function mount(el: HTMLDivElement, orbs: Orb[], setHover: (h: HoverState | ((p: HoverState) => HoverState)) => void) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const low = window.matchMedia("(max-width: 768px), (pointer: coarse)").matches || (navigator.hardwareConcurrency ?? 8) <= 4;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: low ? "low-power" : "high-performance" });
  } catch {
    return () => {};
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, low ? 1.25 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping; // keeps whites white and pastels pastel
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = !low;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.style.opacity = "0";
  renderer.domElement.style.transition = "opacity 1.4s ease";
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const env = studioEnvironment(renderer);
  scene.environment = env;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const lookAt = new THREE.Vector3(0, -0.55, 0);
  scene.add(new THREE.HemisphereLight(0xf4f9ff, 0xeae4ff, 0.55));
  const key = new THREE.DirectionalLight(0xfffaf2, 2.2);
  key.position.set(2.5, 6, 3.5);
  key.castShadow = !low;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -3; key.shadow.camera.right = 3; key.shadow.camera.top = 3; key.shadow.camera.bottom = -3;
  key.shadow.camera.near = 1; key.shadow.camera.far = 14;
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xd6e8ff, 0.7); fill.position.set(-4, 2, 4); scene.add(fill);
  const rimL = new THREE.DirectionalLight(0xd9ccff, 1.0); rimL.position.set(-3, 2, -4); scene.add(rimL);

  const world = new THREE.Group();
  scene.add(world);
  const SEG = low ? 48 : 96;

  // --- pearl dais with an iridescent chrome lip and engraved rings
  const pearl = new THREE.MeshPhysicalMaterial({ color: 0xfbfcff, roughness: 0.35, metalness: 0.02, sheen: 1, sheenColor: new THREE.Color("#d6e6ff"), sheenRoughness: 0.45, iridescence: 0.5, iridescenceIOR: 1.3, clearcoat: 1, clearcoatRoughness: 0.12 });
  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.08, iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessRange: [250, 900], clearcoat: 1 });
  const DAIS_Y = -1.35;
  const dais = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.12, 0.16, SEG * 2, 1), pearl);
  dais.position.y = DAIS_Y - 0.08;
  dais.receiveShadow = true;
  world.add(dais);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.022, 16, SEG * 2), chrome);
  lip.rotation.x = Math.PI / 2; lip.position.y = DAIS_Y;
  world.add(lip);
  const groove = new THREE.MeshPhysicalMaterial({ color: new THREE.Color("#dfe8f6"), metalness: 0.9, roughness: 0.2, iridescence: 0.8, iridescenceIOR: 1.4 });
  for (const r of [1.7, 0.75]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.006, 8, SEG * 2), groove);
    ring.rotation.x = Math.PI / 2; ring.position.y = DAIS_Y + 0.002;
    world.add(ring);
  }

  // --- coin stacks: one per asset class, coins ∝ allocation (min 1)
  const COIN_R = 0.34, COIN_H = 0.07, GAP = 0.006, MAX_COINS = 20;
  const coinGeo = coinGeometry(COIN_R, COIN_H, low ? 48 : 240, 0.008, low ? 0 : 120);
  const n = Math.max(1, orbs.length);
  const arc = Math.min(Math.PI * 1.1, 0.7 * n);
  const tmpColor = new THREE.Color();
  const stacks = orbs.map((o, i) => {
    const count = Math.max(1, Math.round(o.weight * MAX_COINS));
    const a = Math.PI / 2 + (n === 1 ? 0 : -arc / 2 + (arc * i) / (n - 1));
    const radius = n === 1 ? 0 : 1.2;
    const x = Math.cos(a) * radius, z = Math.sin(a) * radius * 0.85;
    const tint = new THREE.Color(classColor(o.key));
    const mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: low ? 0.65 : 0.9, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.05, iridescence: 0.75, iridescenceIOR: 1.35, iridescenceThicknessRange: [200, 800] });
    const mesh = new THREE.InstancedMesh(coinGeo, mat, count);
    mesh.userData.stack = i;
    mesh.frustumCulled = false; // instances move during the drop-in
    mesh.castShadow = !low;
    mesh.receiveShadow = !low;
    for (let k = 0; k < count; k++) {
      // subtle per-coin shimmer so the stack reads as individual coins
      tmpColor.copy(tint).offsetHSL(0, 0, (k % 2 ? 0.035 : -0.02) + Math.sin(k * 2.3 + i) * 0.015);
      mesh.setColorAt(k, tmpColor);
    }
    world.add(mesh);
    const height = count * (COIN_H + GAP);
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(COIN_R * 1.15, COIN_R * 1.15, height + 0.1, 12), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(x, DAIS_Y + height / 2, z);
    hit.userData.stack = i;
    world.add(hit);
    const twist = Array.from({ length: count }, (_, k) => ({ dx: Math.sin(k * 12.9 + i) * 0.012, dz: Math.cos(k * 7.3 + i) * 0.012, r: k * 0.6 }));
    return { mesh, hit, x, z, count, twist, top: DAIS_Y + height };
  });

  // --- floating crystal coin with a rising-bars emblem
  const hero = new THREE.Group();
  hero.position.set(0, 0.95, 0);
  world.add(hero);
  const crystal = new THREE.MeshPhysicalMaterial(
    low
      ? { color: 0xf7f9ff, metalness: 0.1, roughness: 0.12, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.4, iridescenceThicknessRange: [200, 700], sheen: 1, sheenColor: new THREE.Color("#d8ceff") }
      : { color: 0xffffff, roughness: 0, transmission: 1, thickness: 1.1, ior: 1.6, dispersion: 5, clearcoat: 1, clearcoatRoughness: 0,
          iridescence: 0.55, iridescenceIOR: 1.3, iridescenceThicknessRange: [150, 600], attenuationColor: new THREE.Color("#d9e9fb"), attenuationDistance: 2.6, specularIntensity: 1 },
  );
  const HERO_R = 0.92, HERO_H = 0.16;
  const heroCoin = new THREE.Mesh(coinGeometry(HERO_R, HERO_H, low ? 96 : 360, 0.03, low ? 0 : 180), crystal);
  heroCoin.rotation.x = Math.PI / 2;
  hero.add(heroCoin);
  const heroRim = new THREE.Mesh(
    new THREE.TorusGeometry(HERO_R - 0.005, 0.034, 24, SEG * 2),
    new THREE.MeshPhysicalMaterial({ color: new THREE.Color("#d3e4f7"), metalness: 1, roughness: 0.06, iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessRange: [250, 900], clearcoat: 1 }),
  );
  hero.add(heroRim);
  const barMats = ["#8fc0ea", "#a99ee8", "#6a5fc0"].map((c) => new THREE.MeshPhysicalMaterial({ color: new THREE.Color(c), metalness: 0.55, roughness: 0.12, iridescence: 0.8, iridescenceIOR: 1.4, clearcoat: 1, clearcoatRoughness: 0.04 }));
  const baseMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color("#34486a"), metalness: 0.6, roughness: 0.18, clearcoat: 1 });
  for (const side of [1, -1]) {
    const face = new THREE.Group();
    face.position.z = side * (HERO_H / 2 - 0.02);
    if (side < 0) face.rotation.y = Math.PI;
    [0.22, 0.36, 0.52].forEach((h, k) => {
      const bar = new THREE.Mesh(new RoundedBoxGeometry(0.13, h, 0.05, 3, 0.018), barMats[k]);
      bar.position.set(-0.2 + k * 0.2, -0.3 + h / 2, 0.02);
      face.add(bar);
    });
    const base = new THREE.Mesh(new RoundedBoxGeometry(0.68, 0.03, 0.05, 2, 0.012), baseMat);
    base.position.set(0, -0.32, 0.02);
    face.add(base);
    hero.add(face);
  }

  // --- pearlescent sparkles drifting upward
  const SPARKS = low ? 28 : 80;
  const sparkPos = new Float32Array(SPARKS * 3), sparkCol = new Float32Array(SPARKS * 3), sparkSeed = new Float32Array(SPARKS);
  const pastel = ["#8fc0ea", "#a99ee8", "#e7b8d4", "#9fd6c8", "#c9d9f0"].map((c) => new THREE.Color(c));
  for (let i = 0; i < SPARKS; i++) {
    const a = (i * 2.399) % (Math.PI * 2), r = 0.6 + ((i * 0.618) % 1) * 2.6;
    sparkPos.set([Math.cos(a) * r, -1.2 + ((i * 0.37) % 1) * 3.8, Math.sin(a) * r], i * 3);
    pastel[i % pastel.length].toArray(sparkCol, i * 3);
    sparkSeed[i] = (i * 0.731) % 1;
  }
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
  sparkGeo.setAttribute("color", new THREE.BufferAttribute(sparkCol, 3));
  const dotTex = dotTexture();
  const sparkMat = new THREE.PointsMaterial({ size: 0.075, map: dotTex, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, sizeAttenuation: true });
  world.add(new THREE.Points(sparkGeo, sparkMat));

  // --- soft ambient contact shadow under the dais (also the only shadow on the low tier)
  const sc = document.createElement("canvas");
  sc.width = sc.height = 128;
  const g = sc.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(46,90,150,0.22)"); grad.addColorStop(1, "rgba(46,90,150,0)");
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const shadowTex = new THREE.CanvasTexture(sc);
  const floorShadow = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 6.2), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  floorShadow.rotation.x = -Math.PI / 2; floorShadow.position.y = DAIS_Y - 0.17;
  scene.add(floorShadow);

  let dirty = true;
  const resize = () => {
    const w = el.clientWidth, h = el.clientHeight;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = "100%"; renderer.domElement.style.height = "100%";
    camera.aspect = w / Math.max(1, h);
    const dist = camera.aspect < 0.9 ? 12.5 : 10.6;
    camera.position.set(0, dist * 0.26, dist);
    camera.lookAt(lookAt);
    camera.updateProjectionMatrix();
    dirty = true;
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(el);

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2(9, 9);
  const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  let hovered = -1;
  const onWinMove = (e: PointerEvent) => { target.x = e.clientX / window.innerWidth - 0.5; target.y = e.clientY / window.innerHeight - 0.5; dirty = true; };
  const onMove = (e: PointerEvent) => { const r = el.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); dirty = true; };
  const onLeave = () => { ndc.set(9, 9); dirty = true; };
  const onClick = () => {
    if (hovered < 0) return;
    window.dispatchEvent(new CustomEvent("filter:class", { detail: orbs[hovered].key }));
    document.getElementById("investments")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  };
  window.addEventListener("pointermove", onWinMove, { passive: true });
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerleave", onLeave);
  el.addEventListener("click", onClick);

  let visible = true;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; dirty = true; });
  io.observe(el);
  const onVis = () => { dirty = true; };
  document.addEventListener("visibilitychange", onVis);

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3();
  const easeOut = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
  let stacksSettled = false;
  const placeCoins = (t: number) => {
    let settled = true;
    stacks.forEach((s, si) => {
      const lift = si === hovered ? 0.06 : 0;
      for (let k = 0; k < s.count; k++) {
        const delay = si * 0.18 + k * 0.045;
        const p = reduce ? 1 : easeOut((t - 0.3 - delay) / 0.6);
        if (p < 1) settled = false;
        const y = DAIS_Y + COIN_H / 2 + k * (COIN_H + GAP) + (1 - p) * 2.4 + lift * (k / s.count);
        pos.set(s.x + s.twist[k].dx, y, s.z + s.twist[k].dz);
        q.setFromAxisAngle(up, s.twist[k].r);
        scl.setScalar(p > 0 ? 1 : 0.0001);
        m4.compose(pos, q, scl);
        s.mesh.setMatrixAt(k, m4);
      }
      s.mesh.instanceMatrix.needsUpdate = true;
    });
    return settled;
  };

  const t0 = performance.now();
  let raf = 0, first = true, lastHovered = -2;
  const sp = sparkGeo.attributes.position as THREE.BufferAttribute;
  const frame = () => {
    raf = requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    if (reduce && !dirty) return;
    dirty = false;
    const t = reduce ? 8 : (performance.now() - t0) / 1000;
    const scrollP = Math.min(1, window.scrollY / window.innerHeight);
    cur.x += (target.x - cur.x) * (reduce ? 1 : 0.05);
    cur.y += (target.y - cur.y) * (reduce ? 1 : 0.05);

    world.rotation.y = -0.35 + cur.x * 0.35 + scrollP * 0.6 + (reduce ? 0 : Math.sin(t * 0.15) * 0.08);
    world.rotation.x = cur.y * 0.08;
    world.position.y = scrollP * 0.5;

    hero.rotation.y = reduce ? 0.35 : 0.35 + Math.sin(t * 0.45) * 0.55 + cur.x * 0.5;
    hero.rotation.z = Math.sin(t * 0.6) * 0.05;
    hero.position.y = 0.95 + (reduce ? 0 : Math.sin(t * 1.1) * 0.06);
    hero.scale.setScalar(0.6 + (reduce ? 1 : easeOut((t - 0.1) / 1.1)) * 0.4);

    if (!reduce) {
      for (let i = 0; i < SPARKS; i++) {
        let y = sp.getY(i) + 0.0025 * (0.5 + sparkSeed[i]);
        if (y > 2.6) y = -1.2;
        sp.setY(i, y);
      }
      sp.needsUpdate = true;
      sparkMat.opacity = 0.7 + Math.sin(t * 1.3) * 0.15;
    }

    if (!stacksSettled || hovered !== lastHovered) { stacksSettled = placeCoins(t); lastHovered = hovered; }

    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(stacks.map((s) => s.hit), false)[0];
    const hi = hit ? (hit.object.userData.stack as number) : -1;
    if (hi !== hovered) { hovered = hi; el.style.cursor = hi >= 0 ? "pointer" : ""; dirty = true; }
    if (hi >= 0) {
      const s = stacks[hi];
      const p = v.set(s.x, s.top + 0.1, s.z).applyMatrix4(world.matrixWorld).project(camera);
      setHover({ i: hi, x: ((p.x + 1) / 2) * el.clientWidth, y: ((1 - p.y) / 2) * el.clientHeight });
    } else setHover((h) => (h ? null : h));

    renderer.render(scene, camera);
    if (first) { first = false; renderer.domElement.style.opacity = "1"; }
  };
  frame();

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect(); io.disconnect();
    document.removeEventListener("visibilitychange", onVis);
    window.removeEventListener("pointermove", onWinMove);
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerleave", onLeave);
    el.removeEventListener("click", onClick);
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
    });
    shadowTex.dispose(); dotTex.dispose(); env.dispose(); renderer.dispose(); renderer.domElement.remove();
  };
}

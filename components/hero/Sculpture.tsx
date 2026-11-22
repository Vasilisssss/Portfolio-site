"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { pct } from "@/lib/format";
import { classColor } from "@/lib/palette";

export interface Orb { key: string; weight: number }
type HoverState = { i: number; x: number; y: number } | null;

/** A soft pastel studio drawn on a canvas — gives glass and chrome subtle colourful reflections. No downloads. */
function iridescentEnvironment(renderer: THREE.WebGLRenderer) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const g = c.getContext("2d")!;
  const sky = g.createLinearGradient(0, 0, 0, 256);
  sky.addColorStop(0, "#ffffff"); sky.addColorStop(0.45, "#eef5fe"); sky.addColorStop(0.55, "#e9e4fb"); sky.addColorStop(1, "#f7fbff");
  g.fillStyle = sky; g.fillRect(0, 0, 512, 256);
  const band = g.createLinearGradient(0, 0, 512, 0);
  ["#bfe0ff", "#dcd3ff", "#ffd6ec", "#cff5e8", "#bfe0ff", "#dcd3ff", "#ffd6ec"].forEach((col, i, a) => band.addColorStop(i / (a.length - 1), col));
  g.globalAlpha = 0.85; g.fillStyle = band; g.fillRect(0, 112, 512, 44); g.globalAlpha = 1;
  for (const [x, y, w, h] of [[60, 40, 120, 34], [330, 30, 140, 30], [220, 190, 90, 24]]) {
    const sb = g.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, w / 1.4);
    sb.addColorStop(0, "rgba(255,255,255,1)"); sb.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = sb; g.fillRect(x - w, y - h * 2, w * 3, h * 5);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex).texture;
  tex.dispose(); pmrem.dispose();
  return env;
}

/** Bevelled coin with a raised rim and recessed field, as a lathe profile (y-up, centred). */
function coinGeometry(r: number, h: number, segs: number, rimRelief = 0.012) {
  const b = Math.min(h * 0.28, r * 0.08);
  const half = h / 2;
  const p = [
    [0, -half + rimRelief], [r * 0.8, -half + rimRelief], [r * 0.82, -half], [r - b, -half], [r, -half + b],
    [r, half - b], [r - b, half], [r * 0.82, half], [r * 0.8, half - rimRelief], [0, half - rimRelief],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const geo = new THREE.LatheGeometry(p, segs);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Investment centrepiece: a pearl dais holding one stack of chrome coins per asset class — stack height is the
 * real allocation — beneath a floating glass coin with a rising-bars emblem. Hover a stack for its share,
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
    renderer = new THREE.WebGLRenderer({ antialias: !low, alpha: true, powerPreference: low ? "low-power" : "high-performance" });
  } catch {
    return () => {};
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, low ? 1.25 : 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.style.opacity = "0";
  renderer.domElement.style.transition = "opacity 1.4s ease";
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const env = iridescentEnvironment(renderer);
  scene.environment = env;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const lookAt = new THREE.Vector3(0, -0.55, 0);
  scene.add(new THREE.HemisphereLight(0xf2f8ff, 0xece6ff, 0.85));
  const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(3, 5, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xd9ccff, 1.1); rim.position.set(-4, 1, -3); scene.add(rim);

  const world = new THREE.Group();
  scene.add(world);
  const SEG = low ? 48 : 96;

  // --- pearl dais with an iridescent chrome rim
  const pearl = new THREE.MeshPhysicalMaterial({ color: 0xfcfdff, roughness: 0.3, metalness: 0.05, sheen: 1, sheenColor: new THREE.Color("#d2e4ff"), sheenRoughness: 0.4, iridescence: 0.6, iridescenceIOR: 1.3, clearcoat: 0.8 });
  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.1, iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessRange: [250, 900], clearcoat: 1 });
  const DAIS_Y = -1.35;
  const dais = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.15, 0.16, SEG * 2, 1), pearl);
  dais.position.y = DAIS_Y - 0.08;
  world.add(dais);
  const daisRim = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.02, 12, SEG * 2), chrome);
  daisRim.rotation.x = Math.PI / 2; daisRim.position.y = DAIS_Y;
  world.add(daisRim);

  // --- coin stacks: one per asset class, coins ∝ allocation (min 1)
  const COIN_R = 0.34, COIN_H = 0.07, GAP = 0.006, MAX_COINS = 20;
  const coinGeo = coinGeometry(COIN_R, COIN_H, SEG, 0.008);
  const n = Math.max(1, orbs.length);
  const arc = Math.min(Math.PI * 1.1, 0.7 * n);
  const stacks = orbs.map((o, i) => {
    const count = Math.max(1, Math.round(o.weight * MAX_COINS));
    const a = Math.PI / 2 + (n === 1 ? 0 : -arc / 2 + (arc * i) / (n - 1)); // fan across the front of the dais
    const radius = n === 1 ? 0 : 1.2;
    const x = Math.cos(a) * radius, z = Math.sin(a) * radius * 0.85;
    const tint = new THREE.Color(classColor(o.key));
    const mat = new THREE.MeshPhysicalMaterial({ color: tint, metalness: low ? 0.6 : 0.85, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.06, iridescence: 0.7, iridescenceIOR: 1.35, iridescenceThicknessRange: [200, 750] });
    const mesh = new THREE.InstancedMesh(coinGeo, mat, count);
    mesh.userData.stack = i;
    mesh.frustumCulled = false; // instances move during the drop-in
    world.add(mesh);
    // invisible hit-cylinder for easy hovering
    const height = count * (COIN_H + GAP);
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(COIN_R * 1.15, COIN_R * 1.15, height + 0.1, 12), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(x, DAIS_Y + height / 2, z);
    hit.userData.stack = i;
    world.add(hit);
    // small random twist per coin for a hand-stacked look (deterministic)
    const twist = Array.from({ length: count }, (_, k) => ({ dx: Math.sin(k * 12.9 + i) * 0.012, dz: Math.cos(k * 7.3 + i) * 0.012, r: k * 0.6 }));
    return { mesh, hit, x, z, count, twist, top: DAIS_Y + height };
  });

  // --- floating glass coin with a rising-bars emblem
  const hero = new THREE.Group();
  hero.position.set(0, 0.95, 0);
  world.add(hero);
  const glass = new THREE.MeshPhysicalMaterial(
    low
      ? { color: 0xf7f9ff, metalness: 0.1, roughness: 0.15, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.4, iridescenceThicknessRange: [200, 700], sheen: 1, sheenColor: new THREE.Color("#d8ceff") }
      : { color: 0xffffff, roughness: 0.04, transmission: 1, thickness: 0.6, ior: 1.5, clearcoat: 1, iridescence: 0.9, iridescenceIOR: 1.35, iridescenceThicknessRange: [150, 650], attenuationColor: new THREE.Color("#cfe4fb"), attenuationDistance: 1.6 },
  );
  const HERO_R = 0.92, HERO_H = 0.16;
  const heroCoin = new THREE.Mesh(coinGeometry(HERO_R, HERO_H, SEG * 1.5, 0.03), glass);
  heroCoin.rotation.x = Math.PI / 2; // face the camera
  hero.add(heroCoin);
  const heroRim = new THREE.Mesh(new THREE.TorusGeometry(HERO_R - 0.005, 0.034, 16, SEG * 2), new THREE.MeshPhysicalMaterial({ color: new THREE.Color("#cfe2f6"), metalness: 1, roughness: 0.1, iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessRange: [250, 900], clearcoat: 1 }));
  hero.add(heroRim);
  // emblem: three rising bars + baseline on both faces (pearl relief)
  // emblem colours run pastel blue → lavender → deep violet, like a rising chart
  const barMats = ["#8fc0ea", "#a99ee8", "#6a5fc0"].map((c) => new THREE.MeshPhysicalMaterial({ color: new THREE.Color(c), metalness: 0.7, roughness: 0.14, iridescence: 0.8, iridescenceIOR: 1.4, clearcoat: 1 }));
  const baseMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color("#3a4d6e"), metalness: 0.6, roughness: 0.2, clearcoat: 1 });
  for (const side of [1, -1]) {
    const face = new THREE.Group();
    face.position.z = side * (HERO_H / 2 - 0.02);
    if (side < 0) face.rotation.y = Math.PI;
    [0.22, 0.36, 0.52].forEach((h, k) => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.13, h, 0.05), barMats[k]);
      bar.position.set(-0.2 + k * 0.2, -0.3 + h / 2, 0.02);
      face.add(bar);
    });
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.028, 0.05), baseMat);
    base.position.set(0, -0.32, 0.02);
    face.add(base);
    hero.add(face);
  }

  // --- soft contact shadow
  const sc = document.createElement("canvas");
  sc.width = sc.height = 128;
  const g = sc.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(46,90,150,0.24)"); grad.addColorStop(1, "rgba(46,90,150,0)");
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const shadowTex = new THREE.CanvasTexture(sc);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 6.4), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = DAIS_Y - 0.17;
  scene.add(shadow);

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

  // interaction
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
  const frame = () => {
    raf = requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    if (reduce && !dirty) return;
    dirty = false;
    const t = reduce ? 8 : (performance.now() - t0) / 1000;
    const sp = Math.min(1, window.scrollY / window.innerHeight);
    cur.x += (target.x - cur.x) * (reduce ? 1 : 0.05);
    cur.y += (target.y - cur.y) * (reduce ? 1 : 0.05);

    world.rotation.y = -0.35 + cur.x * 0.35 + sp * 0.6 + (reduce ? 0 : Math.sin(t * 0.15) * 0.08);
    world.rotation.x = cur.y * 0.08;
    world.position.y = sp * 0.5;

    hero.rotation.y = reduce ? 0.35 : 0.35 + Math.sin(t * 0.45) * 0.55 + cur.x * 0.5; // sway, keep the face visible
    hero.rotation.z = Math.sin(t * 0.6) * 0.05;
    hero.position.y = 0.95 + (reduce ? 0 : Math.sin(t * 1.1) * 0.06);
    const heroIn = reduce ? 1 : easeOut((t - 0.1) / 1.1);
    hero.scale.setScalar(0.6 + heroIn * 0.4);

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
    shadowTex.dispose(); env.dispose(); renderer.dispose(); renderer.domElement.remove();
  };
}

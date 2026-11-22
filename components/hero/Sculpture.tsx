"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { pct } from "@/lib/format";
import { classColor } from "@/lib/palette";

export interface Orb { key: string; weight: number }

/** A soft pastel studio, generated on a canvas: gives glass and chrome subtle colourful reflections. No image download. */
function iridescentEnvironment(renderer: THREE.WebGLRenderer) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const g = c.getContext("2d")!;
  const sky = g.createLinearGradient(0, 0, 0, 256);
  sky.addColorStop(0, "#ffffff");
  sky.addColorStop(0.45, "#eef5fe");
  sky.addColorStop(0.55, "#e9e4fb");
  sky.addColorStop(1, "#f7fbff");
  g.fillStyle = sky;
  g.fillRect(0, 0, 512, 256);
  // pastel bands around the horizon → iridescent streaks in reflections
  const band = g.createLinearGradient(0, 0, 512, 0);
  ["#bfe0ff", "#dcd3ff", "#ffd6ec", "#cff5e8", "#bfe0ff", "#dcd3ff", "#ffd6ec"].forEach((col, i, a) => band.addColorStop(i / (a.length - 1), col));
  g.globalAlpha = 0.85;
  g.fillStyle = band;
  g.fillRect(0, 112, 512, 44);
  // soft boxes
  g.globalAlpha = 1;
  for (const [x, y, w, h] of [[60, 40, 120, 34], [330, 30, 140, 30], [220, 190, 90, 24]]) {
    const sb = g.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, w / 1.4);
    sb.addColorStop(0, "rgba(255,255,255,1)");
    sb.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = sb;
    g.fillRect(x - w, y - h * 2, w * 3, h * 5);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex).texture;
  tex.dispose();
  pmrem.dispose();
  return env;
}

/**
 * Signature centrepiece: a translucent glass knot holding a pearl core, two iridescent chrome rings,
 * and one glass orb per asset class (sized by allocation — percentages only).
 * Hover shows the share, click filters the investments. Lazy-starts when visible; lighter tier on phones.
 */
export default function Sculpture({ orbs, className }: { orbs: Orb[]; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let cleanup: (() => void) | null = null;
    let started = false;

    const start = () => {
      if (started) return;
      started = true;
      cleanup = mount(el, orbs, setHover);
    };
    // lazy: wait until the hero is visible and the browser is idle (or the intro has finished)
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
        <div className="glass pointer-events-none absolute z-10 flex -translate-x-1/2 -translate-y-[calc(100%+22px)] flex-col gap-1 rounded-2xl px-4 py-3" style={{ left: hover.x, top: hover.y }}>
          <span className="label">{h.key}</span>
          <span className="tnum font-serif text-[26px] leading-none">{pct(h.weight)}</span>
          <span className="text-[10px] tracking-[0.18em] text-mute">CLICK TO VIEW</span>
        </div>
      )}
    </div>
  );
}

function mount(el: HTMLDivElement, orbs: Orb[], setHover: (h: { i: number; x: number; y: number } | null | ((p: { i: number; x: number; y: number } | null) => { i: number; x: number; y: number } | null)) => void) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const low = window.matchMedia("(max-width: 768px), (pointer: coarse)").matches || (navigator.hardwareConcurrency ?? 8) <= 4;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: !low, alpha: true, powerPreference: low ? "low-power" : "high-performance" });
  } catch {
    return () => {}; // no WebGL: the CSS auras still give a soft light composition
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
  camera.position.set(0, 0.2, 9);
  scene.add(new THREE.HemisphereLight(0xf2f8ff, 0xece6ff, 0.8));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xd9ccff, 1.1);
  rim.position.set(-4, -1, -3);
  scene.add(rim);

  const world = new THREE.Group();
  scene.add(world);

  // translucent glass knot (pearl on the low tier — transmission is the expensive part)
  const glass = new THREE.MeshPhysicalMaterial(
    low
      ? { color: 0xf7f9ff, metalness: 0.1, roughness: 0.18, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.4, iridescenceThicknessRange: [200, 700], sheen: 1, sheenColor: new THREE.Color("#d8ceff") }
      : { color: 0xffffff, metalness: 0, roughness: 0.05, transmission: 1, thickness: 0.9, ior: 1.5, clearcoat: 1, clearcoatRoughness: 0.05,
          iridescence: 0.9, iridescenceIOR: 1.35, iridescenceThicknessRange: [150, 650], attenuationColor: new THREE.Color("#cfe4fb"), attenuationDistance: 2.2, specularIntensity: 1 },
  );
  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.95, 0.3, low ? 160 : 300, low ? 28 : 56, 2, 3), glass);
  world.add(knot);

  // pearl core, seen through the glass
  const pearl = new THREE.MeshPhysicalMaterial({ color: 0xfdfcff, roughness: 0.28, metalness: 0.05, sheen: 1, sheenColor: new THREE.Color("#cfe0ff"), sheenRoughness: 0.35, iridescence: 0.7, iridescenceIOR: 1.3, clearcoat: 0.6 });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.5, low ? 32 : 64, low ? 32 : 64), pearl);
  world.add(core);

  // iridescent chrome rings
  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.12, iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessRange: [250, 900], clearcoat: 1 });
  const rings = [1.85, 2.05].map((r, i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, i ? 0.012 : 0.02, 12, low ? 120 : 220), chrome);
    m.rotation.set(1.2 + i * 0.35, i * 0.4, 0.3 - i * 0.5);
    world.add(m);
    return m;
  });

  // soft contact shadow
  const sc = document.createElement("canvas");
  sc.width = sc.height = 128;
  const g = sc.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(46,90,150,0.22)");
  grad.addColorStop(1, "rgba(46,90,150,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const shadowTex = new THREE.CanvasTexture(sc);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.4), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -2.2;
  scene.add(shadow);

  // asset-class orbs on tilted orbits
  const orbits = orbs.map((o, i) => {
    const radius = 2.25 + (i % 3) * 0.3;
    const tilt = new THREE.Group();
    tilt.rotation.set(1.25 + (i % 2 ? 0.18 : -0.12), 0, ((i * 0.42) % 1.2) - 0.6);
    world.add(tilt);
    const pts = Array.from({ length: 161 }, (_, k) => { const a = (k / 160) * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0); });
    tilt.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x2e6a99, transparent: true, opacity: 0.12 })));
    const size = 0.1 + Math.sqrt(o.weight) * 0.48;
    const tint = new THREE.Color(classColor(o.key));
    const mat = new THREE.MeshPhysicalMaterial(
      low
        ? { color: tint, roughness: 0.15, clearcoat: 1, iridescence: 0.8, iridescenceIOR: 1.3 }
        : { color: tint, roughness: 0.08, transmission: 0.55, thickness: 0.6, ior: 1.45, clearcoat: 1, iridescence: 0.8, iridescenceIOR: 1.3, attenuationColor: tint, attenuationDistance: 1.2 },
    );
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, low ? 24 : 48, low ? 24 : 48), mat);
    mesh.userData.index = i;
    tilt.add(mesh);
    return { mesh, radius, phase: (i / Math.max(1, orbs.length)) * Math.PI * 2, speed: 0.09 + (i % 4) * 0.025 };
  });

  let dirty = true;
  const resize = () => {
    const w = el.clientWidth, h = el.clientHeight;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    camera.aspect = w / Math.max(1, h);
    camera.position.z = camera.aspect < 0.9 ? 11.5 : 9.4;
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

  const t0 = performance.now();
  let raf = 0, intro = reduce ? 1 : 0, first = true;
  const v = new THREE.Vector3();
  const frame = () => {
    raf = requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    if (reduce && !dirty) return; // reduced motion: render only on input/resize
    dirty = false;
    const t = reduce ? 6 : (performance.now() - t0) / 1000;
    const sp = Math.min(1, window.scrollY / window.innerHeight);
    intro += (1 - intro) * 0.025;
    cur.x += (target.x - cur.x) * (reduce ? 1 : 0.05);
    cur.y += (target.y - cur.y) * (reduce ? 1 : 0.05);

    knot.rotation.set(t * 0.12 + cur.y * 0.4, t * 0.18 + cur.x * 0.6, 0);
    knot.scale.setScalar((0.86 + intro * 0.14) * (1 + Math.sin(t * 0.8) * 0.012));
    core.rotation.y = -t * 0.3;
    rings[0].rotation.z = t * 0.22;
    rings[1].rotation.z = -t * 0.16;
    world.rotation.y = cur.x * 0.25 + sp * 0.8;
    world.rotation.x = cur.y * 0.12 + sp * 0.25;
    world.position.y = sp * 0.6;

    orbits.forEach((o, i) => {
      const a = o.phase + t * o.speed;
      o.mesh.position.set(Math.cos(a) * o.radius * intro, Math.sin(a) * o.radius * intro, 0);
      const s = i === hovered ? 1.35 : 1;
      o.mesh.scale.lerp(v.set(s, s, s), reduce ? 1 : 0.15);
    });

    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(orbits.map((o) => o.mesh), false)[0];
    const hi = hit ? (hit.object.userData.index as number) : -1;
    if (hi !== hovered) { hovered = hi; el.style.cursor = hi >= 0 ? "pointer" : ""; dirty = true; }
    if (hi >= 0) {
      const p = orbits[hi].mesh.getWorldPosition(v.set(0, 0, 0)).project(camera);
      setHover({ i: hi, x: ((p.x + 1) / 2) * el.clientWidth, y: ((1 - p.y) / 2) * el.clientHeight });
    } else setHover((h) => (h ? null : h));

    renderer.render(scene, camera);
    if (first) { first = false; renderer.domElement.style.opacity = "1"; }
  };
  frame();

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    io.disconnect();
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
    shadowTex.dispose();
    env.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}

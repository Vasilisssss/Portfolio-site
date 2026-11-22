"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { pct } from "@/lib/format";
import { classColor } from "@/lib/palette";

export interface Orb { key: string; weight: number }

/**
 * Signature sculpture: an iridescent pearl knot, orbited by one glass sphere per asset class
 * (sized by allocation — percentages only, never amounts). Hover reveals the share; click filters investments.
 */
export default function Sculpture({ orbs, className }: { orbs: Orb[]; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      return; // no WebGL: the CSS aura behind still reads as a soft light sculpture
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-hidden", "true");
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 0.2, 9);

    scene.add(new THREE.HemisphereLight(0xeaf3fa, 0xe9e2f5, 0.9));
    const key = new THREE.DirectionalLight(0xfff6e6, 1.4);
    key.position.set(3, 4, 5);
    scene.add(key);

    const world = new THREE.Group();
    scene.add(world);

    // the sculpture
    const knotMat = new THREE.MeshPhysicalMaterial({
      color: 0xf6f3fb, metalness: 0.15, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.08,
      iridescence: 1, iridescenceIOR: 1.45, iridescenceThicknessRange: [180, 720],
      sheen: 1, sheenColor: new THREE.Color("#cfc5f0"), sheenRoughness: 0.4,
    });
    const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.95, 0.3, 360, 64, 2, 3), knotMat);
    world.add(knot);

    // soft contact shadow
    const sc = document.createElement("canvas");
    sc.width = sc.height = 128;
    const g = sc.getContext("2d")!;
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(60,58,80,0.28)");
    grad.addColorStop(1, "rgba(60,58,80,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -2.15;
    scene.add(shadow);

    // asset-class orbs on tilted orbits
    const orbGroup = new THREE.Group();
    world.add(orbGroup);
    const orbits = orbs.map((o, i) => {
      const radius = 2.05 + (i % 3) * 0.28;
      const tilt = new THREE.Group();
      tilt.rotation.set(1.25 + (i % 2 ? 0.18 : -0.12), 0, (i * 0.42) % 1.2 - 0.6);
      orbGroup.add(tilt);
      const ringPts = Array.from({ length: 161 }, (_, k) => { const a = (k / 160) * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0); });
      tilt.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPts), new THREE.LineBasicMaterial({ color: 0x24262b, transparent: true, opacity: 0.09 })));
      const size = 0.1 + Math.sqrt(o.weight) * 0.5;
      const mat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(classColor(o.key)), metalness: 0.05, roughness: 0.12, clearcoat: 1, iridescence: 0.6, iridescenceIOR: 1.3,
      });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 48, 48), mat);
      mesh.userData.index = i;
      tilt.add(mesh);
      return { mesh, radius, phase: (i / Math.max(1, orbs.length)) * Math.PI * 2, speed: 0.09 + (i % 4) * 0.025, size };
    });

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = w / Math.max(1, h);
      camera.position.z = camera.aspect < 0.9 ? 11 : 9;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    // interaction
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2(9, 9);
    const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
    let hovered = -1;
    const onWinMove = (e: PointerEvent) => { target.x = e.clientX / window.innerWidth - 0.5; target.y = e.clientY / window.innerHeight - 0.5; };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };
    const onLeave = () => ndc.set(9, 9);
    const onClick = () => {
      if (hovered < 0) return;
      window.dispatchEvent(new CustomEvent("filter:class", { detail: orbs[hovered].key }));
      document.getElementById("investments")?.scrollIntoView({ behavior: "smooth" });
    };
    window.addEventListener("pointermove", onWinMove, { passive: true });
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("click", onClick);

    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(el);

    const t0 = performance.now();
    let raf = 0, intro = reduce ? 1 : 0;
    const v = new THREE.Vector3();
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      const t = reduce ? 4 : (performance.now() - t0) / 1000;
      const sp = Math.min(1, window.scrollY / window.innerHeight);
      intro += (1 - intro) * 0.025;
      cur.x += (target.x - cur.x) * 0.05;
      cur.y += (target.y - cur.y) * 0.05;

      knot.rotation.set(t * 0.12 + cur.y * 0.4, t * 0.18 + cur.x * 0.6, 0);
      knot.scale.setScalar((0.86 + intro * 0.14) * (1 + Math.sin(t * 0.8) * 0.012));
      world.rotation.y = cur.x * 0.25 + sp * 0.8;
      world.rotation.x = cur.y * 0.12 + sp * 0.25;
      world.position.y = sp * 0.6;

      orbits.forEach((o, i) => {
        const a = o.phase + t * o.speed;
        o.mesh.position.set(Math.cos(a) * o.radius * intro, Math.sin(a) * o.radius * intro, 0);
        const s = i === hovered ? 1.35 : 1;
        o.mesh.scale.lerp(v.set(s, s, s), 0.15);
      });

      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(orbits.map((o) => o.mesh), false)[0];
      const hi = hit ? (hit.object.userData.index as number) : -1;
      if (hi !== hovered) { hovered = hi; el.style.cursor = hi >= 0 ? "pointer" : ""; }
      if (hi >= 0) {
        const p = orbits[hi].mesh.getWorldPosition(v.set(0, 0, 0)).project(camera);
        setHover({ i: hi, x: ((p.x + 1) / 2) * el.clientWidth, y: ((1 - p.y) / 2) * el.clientHeight });
      } else setHover((h) => (h ? null : h));

      renderer.render(scene, camera);
    };
    frame();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
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
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
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

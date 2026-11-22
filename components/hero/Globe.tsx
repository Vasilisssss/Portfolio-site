"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { portfolio } from "@/content/portfolio";

const GOLD = new THREE.Color("#B9A477");
const IVORY = new THREE.Color("#F2F0E9");

function toXYZ(lat: number, lon: number, r: number) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

const ARCS: [string, string][] = [
  ["New York", "London"], ["London", "Zurich"], ["Zurich", "Dubai"], ["Dubai", "Singapore"],
  ["Singapore", "Tokyo"], ["Singapore", "Sydney"], ["New York", "São Paulo"], ["London", "New York"],
];

/** WebGL point-cloud globe with exposure nodes and capital-flow arcs. Pauses off-screen; static under reduced motion. */
export default function Globe({ className }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      el.dataset.fallback = "1";
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-hidden", "true");

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0, 6.4);

    const world = new THREE.Group();
    world.rotation.z = -0.24;
    scene.add(world);
    const R = 1.6;

    // point sphere (fibonacci)
    const N = 4200;
    const pos = new Float32Array(N * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const rr = Math.sqrt(1 - y * y);
      const th = golden * i;
      pos.set([Math.cos(th) * rr * R, y * R, Math.sin(th) * rr * R], i * 3);
    }
    const dotsGeo = new THREE.BufferGeometry();
    dotsGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const dotsMat = new THREE.PointsMaterial({ color: IVORY, size: 0.011, transparent: true, opacity: 0.42, depthWrite: false });
    world.add(new THREE.Points(dotsGeo, dotsMat));

    // equator + meridian hairlines
    const ringMat = new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.35 });
    const ringPts = Array.from({ length: 129 }, (_, i) => { const a = (i / 128) * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * R * 1.001, 0, Math.sin(a) * R * 1.001); });
    world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPts), ringMat));

    // atmosphere (fresnel rim)
    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.04, 64, 64),
      new THREE.ShaderMaterial({
        transparent: true, side: THREE.FrontSide, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uColor: { value: GOLD } },
        vertexShader: "varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }",
        fragmentShader: "uniform vec3 uColor; varying vec3 vN; varying vec3 vV; void main(){ float rim = 1.0 - clamp(dot(vN, vV), 0.0, 1.0); float i = pow(rim, 3.5) * 0.55; gl_FragColor = vec4(uColor * i, i); }",
      }),
    );
    scene.add(atmo);

    // nodes
    const nodeByName = new Map<string, THREE.Vector3>();
    const nodeMat = new THREE.MeshBasicMaterial({ color: GOLD });
    const haloMat = new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
    const halos: THREE.Mesh[] = [];
    for (const n of portfolio.nodes) {
      const p = toXYZ(n.lat, n.lon, R);
      nodeByName.set(n.name, p);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 12), nodeMat);
      dot.position.copy(p);
      world.add(dot);
      const halo = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.036, 40), haloMat.clone());
      halo.position.copy(p.clone().multiplyScalar(1.002));
      halo.lookAt(p.clone().multiplyScalar(2));
      world.add(halo);
      halos.push(halo);
    }

    // arcs
    const arcs: { line: THREE.Line; count: number; offset: number }[] = [];
    ARCS.forEach(([a, b], i) => {
      const pa = nodeByName.get(a), pb = nodeByName.get(b);
      if (!pa || !pb) return;
      const mid = pa.clone().add(pb).multiplyScalar(0.5);
      const lift = 1 + pa.distanceTo(pb) * 0.22;
      mid.normalize().multiplyScalar(R * lift);
      const curve = new THREE.QuadraticBezierCurve3(pa, mid, pb);
      const pts = curve.getPoints(90);
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.85 }));
      world.add(line);
      arcs.push({ line, count: pts.length, offset: i * 0.37 });
    });

    // sizing
    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    // input
    const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => { target.x = e.clientX / window.innerWidth - 0.5; target.y = e.clientY / window.innerHeight - 0.5; };
    window.addEventListener("pointermove", onMove, { passive: true });

    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 });
    io.observe(el);

    let raf = 0;
    const t0 = performance.now();
    const intro = { s: reduce ? 1 : 0.82 };
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      const t = (performance.now() - t0) / 1000;
      const scrollP = Math.min(1, window.scrollY / window.innerHeight);
      cur.x += (target.x - cur.x) * 0.04;
      cur.y += (target.y - cur.y) * 0.04;
      intro.s += (1 - intro.s) * 0.02;
      if (!reduce) world.rotation.y = t * 0.06 + cur.x * 0.5;
      world.rotation.x = 0.28 + cur.y * 0.25 + scrollP * 0.35;
      const s = intro.s * (1 + scrollP * 0.18);
      world.scale.setScalar(s);
      atmo.scale.setScalar(s);
      arcs.forEach((a) => {
        const phase = reduce ? 1 : ((t * 0.18 + a.offset) % 1.6) / 1.2;
        const n = Math.max(2, Math.floor(Math.min(1, phase) * a.count));
        a.line.geometry.setDrawRange(0, n);
        (a.line.material as THREE.LineBasicMaterial).opacity = phase > 1.2 ? Math.max(0, 1 - (phase - 1.2) * 2.5) : 0.85;
      });
      halos.forEach((h, i) => {
        const k = reduce ? 0 : (t * 0.6 + i * 0.4) % 1;
        h.scale.setScalar(1 + k * 2.2);
        (h.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - k);
      });
      renderer.render(scene, camera);
    };
    frame();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={host} className={className} />;
}

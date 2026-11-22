import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { createGovernor, dprFor } from "./quality";
import { createMaterials, LIME } from "./briefcase/materials";
import { buildCase } from "./briefcase/case";
import { buildWorld } from "./briefcase/world";
import { createMechanics } from "./briefcase/mechanics";
import { sampleRig } from "./briefcase/camera";
import { FLOOR_Y, PLATE_Y0, RISE } from "./briefcase/dims";

/**
 * THE WORLD INSIDE A BRIEFCASE — a real-scale (46 × 34 cm) luxury attaché in a dark photographic studio.
 * Scroll opens it and travels through the miniature model inside:
 *   I   The Reveal              u 0 → 1   approach, locks release, lid lifts, the model rises
 *   II  The Capital Engine      u = 1     reservoir + distribution ring (arc ∝ weight), bearings rolling on rails
 *   III The Investment City     u = 2     treemap plots (area ∝ weight), buildings by asset class, performance bands
 *   IV  The Performance Gallery u = 3     inside the lid: the real month-end index as a steel line on pins
 *   V   The Final Reveal        u = 4     pull back to the whole open case in the studio
 * Everything is procedural and built at load (no downloads). The 3D receives percentages only.
 */

export interface WorldHolding { id: string; label: string; name: string; weight: number; returnPct: number | null; assetClass: string }
export interface WorldData { holdings: WorldHolding[]; history: { date: string; index: number }[] }
export interface LabelOut { id: string; x: number; y: number; opacity: number }
export interface WorldCallbacks {
  onLabels: (labels: LabelOut[]) => void;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** A dark product studio for reflections: large softbox overhead, strip lights, a rim strip and one small lime card. */
function studioEnvironment(renderer: THREE.WebGLRenderer) {
  const room = new THREE.Scene();
  const geos: THREE.BufferGeometry[] = [], mats: THREE.Material[] = [];
  const box = new THREE.Mesh(new THREE.BoxGeometry(14, 9, 14), new THREE.MeshBasicMaterial({ color: 0x030304, side: THREE.BackSide }));
  geos.push(box.geometry); mats.push(box.material as THREE.Material); room.add(box);
  const panel = (w: number, h: number, color: THREE.ColorRepresentation, k: number, p: [number, number, number]) => {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); mesh.position.set(...p); mesh.lookAt(0, 0.05, 0);
    geos.push(mesh.geometry); mats.push(mat); room.add(mesh);
  };
  panel(3.8, 2.4, 0xffffff, 2.4, [-1.5, 3.2, 1.9]);   // key softbox, overhead front-left
  panel(0.45, 3.4, 0xffffff, 3.2, [3.5, 1.3, 0.6]);   // right strip
  panel(0.35, 3.0, 0xf4f2ec, 1.8, [-3.7, 1.0, -0.6]); // left strip, slightly warm
  panel(3.8, 0.28, 0xffffff, 2.6, [0.3, 1.5, -3.8]);  // rim strip behind
  panel(1.1, 0.16, LIME, 1.5, [-2.8, 0.4, 2.3]);      // a single lime card: thin lime glints on polished edges
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshBasicMaterial({ color: 0x0a0a0b }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.4; geos.push(floor.geometry); mats.push(floor.material as THREE.Material); room.add(floor);
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(room, 0.012, 0.1, 30).texture;
  pm.dispose(); geos.forEach((g) => g.dispose()); mats.forEach((m) => m.dispose());
  return env;
}

export function createWorld(host: HTMLElement, data: WorldData, opts: { low: boolean; reduce: boolean }, cb: WorldCallbacks) {
  const { low, reduce } = opts;
  const qs = new URLSearchParams(window.location.search);
  const QA = qs.has("qa");
  const t0 = performance.now();
  const mark = (what: string) => { if (QA) console.log(`[world] ${what} ${(performance.now() - t0).toFixed(0)}ms`); };

  // ---------- renderer: native resolution on every device
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: low ? "low-power" : "high-performance", preserveDrawingBuffer: QA });
  const nativeDpr = () => Math.min(window.devicePixelRatio || 1, 3);
  let native = nativeDpr();
  renderer.setPixelRatio(native);
  renderer.setClearColor(0x050506, 1);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.appendChild(renderer.domElement);
  RectAreaLightUniformsLib.init();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050506);
  const env = studioEnvironment(renderer);
  mark("studio environment");
  scene.environment = env;
  scene.environmentIntensity = 1.0;
  const camera = new THREE.PerspectiveCamera(27, 1, 0.004, 40);

  // ---------- materials, the case and the model inside it
  const mats = createMaterials(renderer, low);
  const m = mats.m;
  mark("materials baked");
  const kase = buildCase(m, low);
  scene.add(kase.root);
  const sorted: WorldData = { holdings: [...data.holdings].sort((a, b) => b.weight - a.weight), history: data.history };
  const world = buildWorld(sorted, m, low, kase.platform, kase.lidBody);
  const mech = createMechanics();
  mark("case + world built");

  // ---------- studio: floor pool, softbox key with soft shadows, overhead area light, rim strip
  const floorG = new THREE.PlaneGeometry(7, 7); floorG.rotateX(-Math.PI / 2);
  const floor = new THREE.Mesh(floorG, m.floor); floor.receiveShadow = true; scene.add(floor);
  const key = new THREE.SpotLight(0xfffaf2, 26, 0, 0.3, 0.92, 2);
  key.position.set(-1.0, 1.7, 1.15); key.target.position.set(0, 0.04, 0);
  key.castShadow = true;
  const shadowSize = low ? 2048 : 4096;
  key.shadow.mapSize.set(shadowSize, shadowSize);
  key.shadow.camera.near = 1.2; key.shadow.camera.far = 3.6;
  key.shadow.bias = -0.00004; key.shadow.normalBias = 0.0006;
  scene.add(key, key.target);
  const top = new THREE.RectAreaLight(0xffffff, 3.2, 1.4, 0.9); top.position.set(0.1, 1.3, 0.55); top.lookAt(0, 0.05, 0); scene.add(top);
  const rim = new THREE.RectAreaLight(0xffffff, 12, 1.6, 0.22); rim.position.set(0.25, 0.5, -1.15); rim.lookAt(0, 0.09, 0); scene.add(rim);
  const fill = new THREE.HemisphereLight(0xb9bcc2, 0x050505, 0.08); scene.add(fill);
  // picture light for the gallery inside the lid: comes up as the lid opens
  const gal = new THREE.RectAreaLight(0xfffaf4, 0, 0.7, 0.14); gal.position.set(0, 0.62, 0.42); gal.lookAt(0, 0.23, -0.22); scene.add(gal);

  // ---------- post: MSAA HDR → ambient occlusion → depth of field → faint bloom (lock lamps only) → tone map
  const MSAA = low ? 2 : 4;
  let level = 0;
  const composerTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: MSAA });
  const composer = new EffectComposer(renderer, composerTarget);
  composer.addPass(new RenderPass(scene, camera));
  const gtao = low ? null : new GTAOPass(scene, camera, 1, 1);
  if (gtao) {
    gtao.updateGtaoMaterial({ radius: 0.018, distanceExponent: 1.4, thickness: 0.006, scale: 1.1, samples: 16, distanceFallOff: 1 });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, rings: 2, samples: 16 });
    gtao.blendIntensity = 0.9;
    composer.addPass(gtao);
  }
  const bokeh = low ? null : new BokehPass(scene, camera, { focus: 1, aperture: 0.01, maxblur: 0.0045 });
  if (bokeh) composer.addPass(bokeh);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.3, 0.25, 3.2); // HDR threshold: only the lock lamps bloom
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ---------- picking and labels
  const anchors = world.anchors;
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2(9, 9);
  const pointer = { x: 0, y: 0, cx: 0, cy: 0 };
  let hovered: string | null = null;
  const onMove = (e: PointerEvent) => {
    pointer.x = e.clientX / window.innerWidth - 0.5; pointer.y = e.clientY / window.innerHeight - 0.5;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };
  window.addEventListener("pointermove", onMove, { passive: true });
  const onClick = () => { if (hovered) cb.onSelect(hovered); };
  window.addEventListener("click", onClick);

  // ---------- sizing
  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    camera.aspect = w / Math.max(1, h);
    const pr = renderer.getPixelRatio();
    composer.setPixelRatio(pr);
    composer.setSize(w, h);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  // ---------- adaptive quality: effects make way before resolution (see ./quality.ts)
  const LEVELS = ["full quality", "ambient occlusion off", "depth of field off", "lighter anti-aliasing, bloom off", "softer shadow map"];
  const applyQuality = (l: number) => {
    level = l;
    if (gtao) gtao.enabled = level < 1;
    if (bokeh) bokeh.enabled = level < 2;
    bloom.enabled = level < 3;
    const samples = level >= 3 ? (native >= 2 ? 0 : 2) : MSAA;
    for (const rt of [composer.renderTarget1, composer.renderTarget2]) if (rt.samples !== samples) { rt.samples = samples; rt.dispose(); }
    const sm = level >= 4 ? shadowSize / 2 : shadowSize;
    if (key.shadow.mapSize.x !== sm) { key.shadow.mapSize.set(sm, sm); key.shadow.map?.dispose(); key.shadow.map = null; }
    renderer.setPixelRatio(dprFor(native, level));
    resize();
  };
  const gov = createGovernor({ native, onChange: applyQuality });
  let dprQuery: MediaQueryList | null = null;
  const onDpr = () => { native = nativeDpr(); gov.setNative(native); watchDpr(); };
  const watchDpr = () => {
    dprQuery?.removeEventListener("change", onDpr);
    dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    dprQuery.addEventListener("change", onDpr);
  };
  watchDpr();
  let readout: HTMLDivElement | null = null;
  if (qs.has("quality")) {
    readout = document.createElement("div");
    readout.setAttribute("aria-hidden", "true");
    readout.style.cssText = "position:fixed;left:12px;bottom:12px;z-index:200;padding:8px 12px;border-radius:10px;background:rgba(8,9,10,.85);border:1px solid rgba(243,242,237,.12);color:#d7ff3f;font:11px/1.5 ui-monospace,monospace;pointer-events:none;white-space:pre";
    document.body.appendChild(readout);
  }
  let frames = 0;
  const report = setInterval(() => {
    const c = renderer.domElement, pr = renderer.getPixelRatio();
    const lv = level <= 4 ? LEVELS[level] : `${LEVELS[4]}, resolution ${pr.toFixed(2)}×`;
    host.dataset.render = `${c.width}x${c.height}@${pr.toFixed(2)}/${native} L${level}`;
    if (readout) readout.textContent = `3D render ${c.width} × ${c.height} px\n${pr.toFixed(2)}× (native ${native}×) · ${frames * 2} fps\n${lv}`;
    frames = 0;
  }, 500);

  // ---------- simulation state
  let uTarget = 0, uNow = 0, drift = 0, simTime = 0, introT = reduce || QA ? 99 : 0;
  const v3 = new THREE.Vector3(), tgt = new THREE.Vector3();
  const lampOff = new THREE.Color(0x1a1d12), lampOn = LIME.clone().multiplyScalar(5);

  const step = (dt: number) => {
    simTime += dt; introT += dt;
    uNow += (uTarget - uNow) * (reduce ? 1 : 1 - Math.exp(-dt * 3.6));
    pointer.cx += (pointer.x - pointer.cx) * (1 - Math.exp(-dt * 2.5));
    pointer.cy += (pointer.y - pointer.cy) * (1 - Math.exp(-dt * 2.5));
    mech.update(Math.min(1, uNow), dt, reduce);
    const st = mech.state;
    kase.lidPivot.rotation.x = -st.lid;
    kase.flaps.forEach((f) => { f.rotation.x = -st.flap * 0.72; });
    kase.sliders.forEach((s) => { s.mesh.position.x = s.x0 + s.dir * 0.0055 * st.slider; });
    kase.lamps.color.copy(lampOff).lerp(lampOn, clamp01((st.slider - 0.85) / 0.15));
    kase.platform.position.y = PLATE_Y0 + RISE * st.platform;
    kase.posts.forEach((p) => { p.scale.y = kase.platform.position.y - FLOOR_Y; p.position.y = kase.platform.position.y; });
    world.update(reduce ? 0 : dt, st);
    // intro: the key light comes up and the camera settles in over the first seconds
    const lightIn = easeOut(clamp01(introT / 2.6));
    key.intensity = 26 * lightIn; top.intensity = 3.2 * lightIn;
    gal.intensity = 3.6 * clamp01((st.lid - 1.2) / 0.5) * lightIn;
    rim.position.x = THREE.MathUtils.lerp(-1.6, 0.25, easeOut(clamp01(introT / 4.2)));
    rim.lookAt(0, 0.09, 0);
  };

  let lookOverride: { t: [number, number, number]; dist: number; az: number; el: number; fov: number } | null = null;
  const place = () => {
    const w = host.clientWidth, h = host.clientHeight, aspect = w / Math.max(1, h);
    const dolly = 1 + 0.5 * (1 - easeOut(clamp01(introT / 4.8))) * (1 - clamp01(uNow * 5));
    const breathe = reduce ? 0 : Math.sin(simTime * 0.3) * 0.6;
    const rig = sampleRig(uNow, aspect, drift * 14 + pointer.cx * 3 + breathe, dolly, -pointer.cy * 2);
    if (lookOverride) { // QA close-ups
      const o = lookOverride, az = (o.az * Math.PI) / 180, el = (o.el * Math.PI) / 180;
      rig.target = o.t; rig.dist = o.dist; rig.fov = o.fov; rig.sx = 0; rig.sy = 0;
      rig.pos = [o.t[0] + Math.sin(az) * Math.cos(el) * o.dist, o.t[1] + Math.sin(el) * o.dist, o.t[2] + Math.cos(az) * Math.cos(el) * o.dist];
    }
    camera.position.set(...rig.pos);
    tgt.set(...rig.target);
    camera.lookAt(tgt);
    camera.fov = rig.fov;
    camera.updateProjectionMatrix();
    // lens shift (composition without changing perspective)
    camera.projectionMatrix.elements[8] = rig.sx;
    camera.projectionMatrix.elements[9] = rig.sy;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    camera.updateMatrixWorld();
    if (bokeh) {
      const u = bokeh.uniforms as unknown as Record<string, { value: number }>;
      u.focus.value = camera.position.distanceTo(tgt);
      u.aperture.value = Math.min(0.06, 0.0105 / Math.max(0.15, rig.dist));
    }
  };

  const draw = () => {
    // hover (desktop pointer only)
    if (!low && !QA) {
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(world.pickables, true)[0];
      const id = hit ? (hit.object.userData.id as string | undefined) ?? null : null;
      if (id !== hovered) {
        hovered = id; cb.onHover(id); world.highlight(id);
        document.body.style.cursor = id ? "pointer" : "";
      }
    }
    const w = host.clientWidth, h = host.clientHeight;
    cb.onLabels(anchors.map((a) => {
      a.obj.getWorldPosition(v3); v3.project(camera);
      const near = Math.max(0, 1 - Math.abs(uNow - a.scene) * 2.6);
      const inFront = v3.z < 1 && Math.abs(v3.x) < 1.05 && Math.abs(v3.y) < 1.05;
      return { id: a.id, x: ((v3.x + 1) / 2) * w, y: ((1 - v3.y) / 2) * h, opacity: inFront ? near : 0 };
    }));
    composer.render();
    frames++;
  };

  // ---------- loop
  let raf = 0, stopped = false, last = performance.now(), manual = false;
  const frame = () => {
    raf = requestAnimationFrame(frame);
    if (document.hidden) { gov.pause(performance.now()); last = performance.now(); return; }
    const now = performance.now();
    if (!QA) gov.sample(now);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (manual) return;
    step(dt); place(); draw();
  };
  step(0); place();
  mark("ready to compile");
  renderer.compileAsync(scene, camera).catch(() => undefined).finally(() => { mark("shaders compiled"); if (!stopped) { gov.start(performance.now()); last = performance.now(); frame(); } });

  // ---------- QA hooks (?qa): deterministic stepping for frame-by-frame review and geometry clearance checks
  if (QA) {
    const solids = () => {
      const out: { name: string; box: THREE.Box3 }[] = [];
      kase.root.updateMatrixWorld(true);
      kase.root.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh || mesh.material === m.contact) return;
        out.push({ name: mesh.name || mesh.parent?.name || mesh.type, box: new THREE.Box3().setFromObject(mesh) });
      });
      return out;
    };
    (window as unknown as { __qa: unknown }).__qa = {
      setU(u: number) { uTarget = u; },
      manual(on: boolean) { manual = on; },
      /** advance the simulation by `sec` seconds at `fps`, then render one frame */
      advance(sec: number, fps = 60) { const n = Math.max(1, Math.round(sec * fps)); for (let i = 0; i < n; i++) step(1 / fps); place(); draw(); return mech.state; },
      /** jump straight to a settled state at u */
      settle(u: number) { uTarget = u; for (let i = 0; i < 1200; i++) step(1 / 60); place(); draw(); return { state: mech.state, settled: mech.settled, u: uNow }; },
      state: () => ({ u: uNow, ...mech.state, cam: camera.position.toArray(), fov: camera.fov }),
      /** smallest distance from the camera to any part of the case or model (negative = inside) */
      clearance() {
        const p = camera.position; let best = { d: Infinity, name: "" };
        for (const s of solids()) { const d = s.box.containsPoint(p) ? -s.box.distanceToPoint(p) - 1e-6 : s.box.distanceToPoint(p); if (d < best.d) best = { d, name: s.name }; }
        return best;
      },
      draws: () => renderer.info.render.calls,
      /** camera clearance at u without rendering (physics settled first) */
      probe(u: number) { uTarget = u; for (let i = 0; i < 600; i++) step(1 / 60); place(); return (window as unknown as { __qa: { clearance: () => { d: number; name: string } } }).__qa.clearance(); },
      look(o: typeof lookOverride) { lookOverride = o; place(); draw(); },
      info: () => ({ geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, programs: renderer.info.programs?.length ?? 0, triangles: renderer.info.render.triangles }),
      teardown: () => { api.dispose(); return disposeReport; },
    };
  }

  let disposeReport: { geometries: number; textures: number } | null = null;
  const api = {
    setProgress(u: number, d: number) { uTarget = reduce ? Math.round(u * 4) / 4 : u; drift = reduce ? 0 : d; },
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
      world.dispose();
      kase.dispose();
      scene.traverse((o) => { const mm = o as THREE.Mesh; if (mm.isMesh && mm.geometry) mm.geometry.dispose(); });
      mats.dispose();
      env.dispose();
      key.shadow.map?.dispose();
      composer.dispose();
      composerTarget.dispose();
      gtao?.dispose();
      bokeh?.dispose();
      bloom.dispose();
      disposeReport = { geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures };
      renderer.dispose();
      renderer.forceContextLoss(); // release the GL context now rather than at garbage collection
      renderer.domElement.remove();
    },
  };
  return api;
}

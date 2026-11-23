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
import { createMechanics } from "./briefcase/mechanics";
import { sampleRig } from "./briefcase/camera";
import { FLOOR_Y, PLATE_H, PLATE_Y0, RISE } from "./briefcase/dims";
import { loadExchange, MINI_SCALE, type Exchange } from "./exchange/index";
import { DESCENT, EXIT, LANTERN_GLASS_H, sampleWalk, STOPS } from "./exchange/walk";
import type { ScreenData } from "./exchange/screens";

/**
 * THE WORLD INSIDE A BRIEFCASE.
 *   Scene A  a real-scale (46 × 34 cm) attaché in a dark photographic studio; inside it, the exchange at 1 : 320
 *   Scene B  the same exchange at full scale: architecture with path-traced (baked) light, live data installations
 * Journey (u):
 *   0 → 0.8    the reveal: locks, lid, the model rises                                          (A)
 *   0.8 → 1    the descent: towards the model's skylight, through the glass, down to eye level  (A → B at the glass)
 *   1 → 3.55   on foot: Capital installation (1) · Investment Gallery (2) · Performance Gallery (3) · overlook (B)
 *   3.55 → 3.66 out over the balustrade and through the façade glass                             (B → A at the glass)
 *   3.66 → 4   the pull-back: the building shrinks back into the briefcase                       (A)
 * The miniature and the full-scale building share geometry and baked light, so the scale change is seamless.
 */

export interface WorldHolding { id: string; label: string; name: string; weight: number; returnPct: number | null; assetClass: string; value?: string }
export interface WorldData { holdings: WorldHolding[]; history: { date: string; index: number }[]; summary?: ScreenData["summary"] }
export interface LabelOut { id: string; x: number; y: number; opacity: number }
export interface WorldCallbacks {
  onLabels: (labels: LabelOut[]) => void;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const smoother = (t: number) => { t = clamp01(t); return t * t * t * (t * (t * 6 - 15) + 10); };
const smooth = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const U_DIVE = 0.8;
const WALK_HFOV = 70;

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
  panel(3.8, 2.4, 0xffffff, 2.4, [-1.5, 3.2, 1.9]);
  panel(0.45, 3.4, 0xffffff, 3.2, [3.5, 1.3, 0.6]);
  panel(0.35, 3.0, 0xf4f2ec, 1.8, [-3.7, 1.0, -0.6]);
  panel(3.8, 0.28, 0xffffff, 2.6, [0.3, 1.5, -3.8]);
  panel(1.1, 0.16, LIME, 1.5, [-2.8, 0.4, 2.3]);
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

  // =====================================================================  SCENE A: studio + briefcase
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050506);
  const env = studioEnvironment(renderer);
  scene.environment = env;
  const camera = new THREE.PerspectiveCamera(27, 1, 0.004, 40);
  const mats = createMaterials(renderer, low);
  const m = mats.m;
  const kase = buildCase(m, low);
  scene.add(kase.root);
  const mech = createMechanics();
  mark("case built");

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
  scene.add(new THREE.HemisphereLight(0xb9bcc2, 0x050505, 0.08));

  // =====================================================================  SCENE B: the exchange (loaded)
  const camB = new THREE.PerspectiveCamera(48, 1, 0.05, 3000);
  let ex: Exchange | null = null, exProgress = 0, exFailed = false;
  const BASE = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/exchange`;
  const startLoading = () => {
    loadExchange(renderer, BASE, data, { low, studioEnv: env, onProgress: (f) => { exProgress = f; } })
      .then((e) => {
        if (stopped) { e.dispose(); return; }
        e.miniature.position.y = PLATE_H; kase.platform.add(e.miniature);
        ex = e; mark("exchange loaded");
        renderer.compileAsync(e.scene, camB).catch(() => undefined);
      })
      .catch((err) => { exFailed = true; console.error("The exchange could not be loaded; the journey stays with the briefcase.", err); });
  };

  // ---------- post: MSAA HDR → ambient occlusion → depth of field → bloom (lamps only) → tone map
  const MSAA = low ? 2 : 4;
  let level = 0;
  const composerTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: MSAA });
  const composer = new EffectComposer(renderer, composerTarget);
  const renderPass = new RenderPass(scene, camera); composer.addPass(renderPass);
  const gtao = low ? null : new GTAOPass(scene, camera, 1, 1);
  const AO = { A: { radius: 0.018, thickness: 0.006, blend: 0.9 }, B: { radius: 0.45, thickness: 0.15, blend: 0.55 } };
  if (gtao) {
    gtao.updateGtaoMaterial({ radius: AO.A.radius, distanceExponent: 1.4, thickness: AO.A.thickness, scale: 1.1, samples: 16, distanceFallOff: 1 });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, rings: 2, samples: 16 });
    gtao.blendIntensity = AO.A.blend;
    composer.addPass(gtao);
  }
  const bokeh = low ? null : new BokehPass(scene, camera, { focus: 1, aperture: 0.01, maxblur: 0.0045 });
  if (bokeh) composer.addPass(bokeh);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.3, 0.25, 5);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  let mode: "A" | "B" = "A";
  const setMode = (mm: "A" | "B") => {
    const sc = mm === "A" ? scene : ex!.scene, cam = mm === "A" ? camera : camB;
    renderPass.scene = sc; renderPass.camera = cam;
    if (gtao) { gtao.scene = sc; gtao.camera = cam; }
    if (bokeh) { bokeh.scene = sc; bokeh.camera = cam; }
    if (mm !== mode) {
      mode = mm;
      if (gtao) { const a = AO[mm]; gtao.updateGtaoMaterial({ radius: a.radius, thickness: a.thickness }); gtao.blendIntensity = a.blend; }
      renderer.toneMappingExposure = mm === "A" ? 1.06 : 1.0;
    }
  };

  // ---------- picking, labels, looking around
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2(9, 9);
  const pointer = { x: 0, y: 0, cx: 0, cy: 0 };
  const look = { yaw: 0, pitch: 0, drag: false, lx: 0, ly: 0, moved: 0 };
  let hovered: string | null = null;
  const onMove = (e: PointerEvent) => {
    pointer.x = e.clientX / window.innerWidth - 0.5; pointer.y = e.clientY / window.innerHeight - 0.5;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    if (look.drag) {
      const dx = e.clientX - look.lx, dy = e.clientY - look.ly; look.lx = e.clientX; look.ly = e.clientY; look.moved += Math.abs(dx) + Math.abs(dy);
      look.yaw = THREE.MathUtils.clamp(look.yaw - dx * 0.0032, -1.9, 1.9); look.pitch = THREE.MathUtils.clamp(look.pitch - dy * 0.0026, -0.55, 0.65);
    }
  };
  // drag to look around (inside the building, on empty parts of the page; never on text or controls)
  const onDown = (e: PointerEvent) => {
    if (mode !== "B" || e.pointerType !== "mouse" || e.button !== 0) return;
    const t = e.target as HTMLElement;
    if (!(t === document.body || t === document.documentElement || t.hasAttribute("data-chapter") || t.hasAttribute("data-scene") || t.tagName === "MAIN")) return;
    look.drag = true; look.lx = e.clientX; look.ly = e.clientY; look.moved = 0; document.body.style.cursor = "grabbing"; e.preventDefault();
  };
  const onUp = () => { if (look.drag) { look.drag = false; document.body.style.cursor = ""; } };
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onDown);
  window.addEventListener("pointerup", onUp);
  const onClick = () => { if (hovered && look.moved < 6) cb.onSelect(hovered); };
  window.addEventListener("click", onClick);

  // loading pill: only if the visitor reaches the descent before the exchange has arrived
  const pill = document.createElement("div");
  pill.setAttribute("role", "status");
  pill.style.cssText = "position:fixed;left:50%;bottom:76px;transform:translateX(-50%);z-index:45;padding:8px 14px;border-radius:999px;background:rgba(8,9,10,.78);border:1px solid rgba(243,242,237,.14);color:#c8c9c3;font:10px/1.4 ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase;pointer-events:none;opacity:0;transition:opacity .4s";
  document.body.appendChild(pill);

  // ---------- sizing
  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    camera.aspect = camB.aspect = w / Math.max(1, h);
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

  // ---------- simulation
  let uTarget = 0, uNow = 0, drift = 0, simTime = 0, introT = reduce || QA ? 99 : 0, hintT = QA ? 99 : 0;
  const v3 = new THREE.Vector3(), tgt = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const lampOff = new THREE.Color(0x1a1d12), lampOn = LIME.clone().multiplyScalar(7);
  const walk = { pos: new THREE.Vector3(), look: new THREE.Vector3(), speed: 0, walking: false };

  const step = (dt: number) => {
    simTime += dt; introT += dt;
    const uMax = ex ? 4 : U_DIVE; // until the exchange has arrived, the journey waits above the model
    const goal = Math.min(uTarget, uMax);
    const moving = Math.abs(goal - uNow) > 0.002;
    uNow += (goal - uNow) * (reduce ? 1 : 1 - Math.exp(-dt * 3.2));
    pointer.cx += (pointer.x - pointer.cx) * (1 - Math.exp(-dt * 2.5));
    pointer.cy += (pointer.y - pointer.cy) * (1 - Math.exp(-dt * 2.5));
    if (!look.drag && (moving || mode === "A")) { const k = 1 - Math.exp(-dt * 1.6); look.yaw -= look.yaw * k; look.pitch -= look.pitch * k; }
    mech.update(Math.min(1, uNow), dt, reduce);
    const st = mech.state;
    kase.lidPivot.rotation.x = -st.lid;
    kase.flaps.forEach((f) => { f.rotation.x = -st.flap * 0.72; });
    kase.sliders.forEach((s) => { s.mesh.position.x = s.x0 + s.dir * 0.0055 * st.slider; });
    kase.lamps.color.copy(lampOff).lerp(lampOn, clamp01((st.slider - 0.85) / 0.15));
    kase.platform.position.y = PLATE_Y0 + RISE * st.platform;
    kase.posts.forEach((p) => { p.scale.y = kase.platform.position.y - FLOOR_Y; p.position.y = kase.platform.position.y; });
    ex?.update(reduce ? 0 : dt);
    const lightIn = easeOut(clamp01(introT / 2.6));
    const fin = clamp01((uNow - 3.7) / 0.3);
    key.intensity = 26 * lightIn * (1 - 0.32 * fin); top.intensity = 3.2 * lightIn * (1 - 0.45 * fin);
    rim.intensity = 12 * (1 + 0.9 * fin);
    rim.position.x = THREE.MathUtils.lerp(-1.6, 0.25, easeOut(clamp01(introT / 4.2)));
    rim.lookAt(0, 0.09, 0);
    // status pill: loading (if the visitor arrives before the exchange), then a one-time hint inside the building
    if (!ex && uTarget > 0.62) { pill.textContent = exFailed ? "The exchange could not be loaded" : `Preparing the exchange · ${Math.round(exProgress * 100)}%`; pill.style.opacity = "1"; }
    else if (mode === "B" && hintT < 5 && !low && !reduce) { hintT += dt; pill.textContent = "Drag to look around"; pill.style.opacity = hintT > 0.6 && hintT < 4.4 ? "1" : "0"; }
    else pill.style.opacity = "0";
  };

  // building ↔ case transforms (the miniature's world matrix; the platform may still be moving)
  const M = new THREE.Matrix4(), Minv = new THREE.Matrix4();
  const updateM = () => { const mb = ex!.miniature.children[0]; ex!.miniature.updateWorldMatrix(true, true); M.copy(mb.matrixWorld); Minv.copy(M).invert(); };
  const walkFov = (aspect: number) => Math.min(76, (2 * Math.atan(Math.tan((WALK_HFOV * Math.PI) / 360) / aspect) * 180) / Math.PI);
  const posB = new THREE.Vector3(), lookB = new THREE.Vector3();
  let descent: ReturnType<typeof DESCENT> | null = null; const descentKey = new THREE.Matrix4();
  let lookOverride: { t: [number, number, number]; dist: number; az: number; el: number; fov: number } | null = null;

  /** place camera A from a building-space eye (scaled into the case); returns nothing */
  const placeAFromB = (p: THREE.Vector3, l: THREE.Vector3, fov: number) => {
    camera.position.copy(p).applyMatrix4(M); tgt.copy(l).applyMatrix4(M);
    camera.near = 0.05 * MINI_SCALE; camera.far = 3000 * MINI_SCALE; camera.fov = fov;
    camera.lookAt(tgt); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  };
  const placeB = (p: THREE.Vector3, l: THREE.Vector3, fov: number, headTurn: boolean) => {
    camB.position.copy(p);
    const dir = v3.subVectors(l, p).normalize();
    if (headTurn) {
      // look around: drag offsets plus a small head turn towards the pointer
      const yaw = look.yaw - pointer.cx * 0.06, pitch = look.pitch - pointer.cy * 0.04;
      dir.applyAxisAngle(up, yaw);
      const side = new THREE.Vector3().crossVectors(dir, up).normalize();
      dir.applyAxisAngle(side, pitch);
    }
    tgt.copy(p).add(dir);
    camB.fov = fov; camB.lookAt(tgt); camB.updateProjectionMatrix(); camB.updateMatrixWorld();
    if (ex) {
      const x = p.x, planY = -p.z;
      ex.setZone(x < -24 ? "investment" : x > 24 && p.y > 6.5 ? "performance" : "hall");
      void planY;
    }
  };

  const place = () => {
    const w = host.clientWidth, h = host.clientHeight, aspect = w / Math.max(1, h);
    if (lookOverride || !ex || uNow <= U_DIVE) {
      // ---- A: the briefcase
      const dolly = 1 + 0.5 * (1 - easeOut(clamp01(introT / 4.8))) * (1 - clamp01(uNow * 5));
      const breathe = reduce ? 0 : Math.sin(simTime * 0.3) * 0.6;
      const rig = sampleRig(Math.min(uNow, U_DIVE), aspect, drift * 14 + pointer.cx * 3 + breathe, dolly, -pointer.cy * 2);
      if (lookOverride) {
        const o = lookOverride, az = (o.az * Math.PI) / 180, el = (o.el * Math.PI) / 180;
        rig.target = o.t; rig.dist = o.dist; rig.fov = o.fov; rig.sx = 0; rig.sy = 0;
        rig.pos = [o.t[0] + Math.sin(az) * Math.cos(el) * o.dist, o.t[1] + Math.sin(el) * o.dist, o.t[2] + Math.cos(az) * Math.cos(el) * o.dist];
      }
      camera.near = 0.004; camera.far = 40;
      camera.position.set(...rig.pos); tgt.set(...rig.target); camera.lookAt(tgt);
      camera.fov = rig.fov; camera.updateProjectionMatrix();
      camera.projectionMatrix.elements[8] = rig.sx; camera.projectionMatrix.elements[9] = rig.sy;
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert(); camera.updateMatrixWorld();
      if (bokeh) { const u = bokeh.uniforms as unknown as Record<string, { value: number }>; u.focus.value = camera.position.distanceTo(tgt); u.aperture.value = Math.min(0.06, 0.0105 / Math.max(0.15, rig.dist)); u.nearClip.value = camera.near; u.farClip.value = camera.far; }
      setMode("A");
      return;
    }
    updateM();
    if (uNow < 1) {
      // ---- the descent: one continuous camera in building space, rendered in A until it passes the lantern glass
      const rig = sampleRig(U_DIVE, aspect);
      if (!descent || !descentKey.equals(M)) {
        const s0 = new THREE.Vector3(...rig.pos).applyMatrix4(Minv), l0 = new THREE.Vector3(...rig.target).applyMatrix4(Minv);
        descent = DESCENT(s0, l0); descentKey.copy(M);
      }
      const t = smoother((uNow - U_DIVE) / (1 - U_DIVE));
      descent.curve.getPointAt(t, posB);
      const sculpture = new THREE.Vector3(0, 1.2, 2);
      lookB.copy(descent.look0).lerp(sculpture, smooth(0.15, 0.5, t)).lerp(STOPS.capital.look, smooth(0.62, 1, t));
      const fov = THREE.MathUtils.lerp(rig.fov, walkFov(aspect), smooth(0.3, 0.85, t));
      if (posB.y > LANTERN_GLASS_H) { placeAFromB(posB, lookB, fov); setMode("A"); }
      else { placeB(posB, lookB, fov, false); setMode("B"); }
    } else if (uNow <= EXIT.u1) {
      // ---- on foot
      sampleWalk(uNow, reduce ? 0 : 1, walk);
      const outside = walk.pos.z > 28.15; // through the façade glass
      if (outside) { placeAFromB(walk.pos, walk.look, walkFov(aspect)); setMode("A"); }
      else { placeB(walk.pos, walk.look, walkFov(aspect), true); setMode("B"); }
    } else {
      // ---- the pull-back: from just outside the façade, back out to the whole briefcase
      const t = smoother((uNow - EXIT.u1) / (4 - EXIT.u1));
      const end = sampleRig(4, aspect, drift * 14 + pointer.cx * 3, 1, -pointer.cy * 2);
      sampleWalk(EXIT.u1, 0, walk);
      const p0 = walk.pos.clone().applyMatrix4(M), l0 = walk.look.clone().applyMatrix4(M);
      const p1 = new THREE.Vector3(...end.pos), l1 = new THREE.Vector3(...end.target);
      // rise and retreat on an arc rather than a straight dolly
      const p = p0.clone().lerp(p1, t); p.y += Math.sin(t * Math.PI) * 0.12;
      camera.position.copy(p); tgt.copy(l0).lerp(l1, smooth(0, 0.7, t)); camera.lookAt(tgt);
      camera.near = THREE.MathUtils.lerp(0.05 * MINI_SCALE, 0.004, smooth(0, 0.4, t)); camera.far = THREE.MathUtils.lerp(3000 * MINI_SCALE, 40, smooth(0, 0.4, t));
      camera.fov = THREE.MathUtils.lerp(walkFov(aspect), end.fov, smooth(0, 0.6, t)); camera.updateProjectionMatrix();
      const k = smooth(0.4, 1, t);
      camera.projectionMatrix.elements[8] = end.sx * k; camera.projectionMatrix.elements[9] = end.sy * k;
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert(); camera.updateMatrixWorld();
      setMode("A");
    }
    // depth of field: B is at human scale, very shallow blur only; A in the descent/pull-back behaves like a macro lens
    if (bokeh) {
      const u = bokeh.uniforms as unknown as Record<string, { value: number }>;
      const cam = mode === "A" ? camera : camB;
      u.nearClip.value = cam.near; u.farClip.value = cam.far;
      u.focus.value = cam.position.distanceTo(tgt) * (mode === "B" ? 8 : 1);
      u.aperture.value = mode === "B" ? 0.00012 : 0.002;
    }
  };

  const draw = () => {
    const cam = mode === "A" ? camera : camB;
    const anchors = ex?.anchors ?? [];
    if (!low && !QA && mode === "B" && ex) {
      ray.setFromCamera(ndc, camB);
      const hit = ray.intersectObjects(ex.pickables, true)[0];
      const id = hit && hit.distance < 30 ? (hit.object.userData.id as string | undefined) ?? null : null;
      if (id !== hovered) { hovered = id; cb.onHover(id); if (!look.drag) document.body.style.cursor = id ? "pointer" : ""; }
    } else if (hovered) { hovered = null; cb.onHover(null); document.body.style.cursor = ""; }
    const w = host.clientWidth, h = host.clientHeight;
    cb.onLabels(anchors.map((a) => {
      a.obj.getWorldPosition(v3); v3.project(cam);
      const near = mode === "B" ? Math.max(0, 1 - Math.abs(uNow - a.scene) * 3.2) : 0;
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
  renderer.compileAsync(scene, camera).catch(() => undefined).finally(() => {
    mark("shaders compiled");
    if (!stopped) { gov.start(performance.now()); last = performance.now(); frame(); startLoading(); }
  });

  // ---------- QA hooks (?qa): deterministic stepping and geometry clearance checks
  if (QA) {
    const solidsA = () => {
      const out: { name: string; box: THREE.Box3 }[] = [];
      kase.root.updateMatrixWorld(true);
      kase.root.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh || mesh.material === m.contact || mesh.parent?.parent?.name === "miniature") return;
        out.push({ name: mesh.name || mesh.parent?.name || mesh.type, box: new THREE.Box3().setFromObject(mesh) });
      });
      return out;
    };
    const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [1, 1, 1], [-1, 1, 1], [1, -1, 1], [-1, -1, 1], [1, 1, -1], [-1, 1, -1], [1, -1, -1], [-1, -1, -1]].map((d) => new THREE.Vector3(...d).normalize());
    const qa = {
      setU(u: number) { uTarget = u; },
      manual(on: boolean) { manual = on; },
      ready: () => !!ex,
      advance(sec: number, fps = 60) { const n = Math.max(1, Math.round(sec * fps)); for (let i = 0; i < n; i++) step(1 / fps); place(); draw(); return mech.state; },
      settle(u: number) { uTarget = u; for (let i = 0; i < 1200; i++) step(1 / 60); place(); draw(); return { state: mech.state, settled: mech.settled, u: uNow, mode }; },
      state: () => ({ u: uNow, mode, ...mech.state, cam: (mode === "A" ? camera : camB).position.toArray(), fov: (mode === "A" ? camera : camB).fov }),
      /** A: distance to the case's parts; B: distance to the nearest building surface (14 ray directions) */
      clearance() {
        if (mode === "B" && ex) {
          let best = { d: Infinity, name: "" }; const rc = new THREE.Raycaster(); rc.far = 6;
          for (const d of DIRS) { rc.set(camB.position, d); const hit = rc.intersectObject(ex.scene, true).find((x) => !(x.object.name || "").startsWith("glass")); if (hit && hit.distance < best.d) best = { d: hit.distance, name: hit.object.name }; }
          return best;
        }
        const p = camera.position; let best = { d: Infinity, name: "" };
        for (const s of solidsA()) { const d = s.box.containsPoint(p) ? -s.box.distanceToPoint(p) - 1e-6 : s.box.distanceToPoint(p); if (d < best.d) best = { d, name: s.name }; }
        return best;
      },
      draws: () => renderer.info.render.calls,
      probe(u: number) { uTarget = u; for (let i = 0; i < 600; i++) step(1 / 60); place(); return qa.clearance(); },
      look(o: typeof lookOverride) { lookOverride = o; place(); draw(); },
      lookAround(yaw: number, pitch: number) { look.yaw = yaw; look.pitch = pitch; place(); draw(); },
      info: () => ({ geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, programs: renderer.info.programs?.length ?? 0, triangles: renderer.info.render.triangles, calls: renderer.info.render.calls }),
      teardown: () => { api.dispose(); return disposeReport; },
    };
    (window as unknown as { __qa: unknown }).__qa = qa;
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
      readout?.remove(); pill.remove();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("click", onClick);
      document.body.style.cursor = "";
      ex?.dispose();
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
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
  return api;
}

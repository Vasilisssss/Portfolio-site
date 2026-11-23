import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { createExchangeMaterials, fixtureMaterial, glassMaterial, prepareGeometry, SURFACES } from "./materials";
import { createInstallMaterials, buildInstallations, type Anchor } from "./installations";
import { deskScreen, mainBoard, tickerBand, type ScreenData } from "./screens";

/**
 * Loads the baked exchange (geometry, lightmap, scanned materials, reflection panoramas, city backdrop) and builds:
 *   scene      the full-scale building, for walking through
 *   miniature  the very same building and baked light at 1 : 320, for the model inside the briefcase
 */
export const MINI_SCALE = 1 / 320;
export type Zone = "hall" | "investment" | "performance";

export interface Exchange {
  scene: THREE.Scene;
  miniature: THREE.Group;
  anchors: Anchor[];
  pickables: THREE.Object3D[];
  setZone(z: Zone): void;
  update(dt: number): void;
  dispose(): void;
}

export async function loadExchange(renderer: THREE.WebGLRenderer, base: string, data: ScreenData, opts: { low: boolean; studioEnv: THREE.Texture | null; onProgress?: (f: number) => void }): Promise<Exchange> {
  const { low } = opts;
  const meta = await (await fetch(`${base}/exchange.json`)).json() as { lightmapScale: number; panoramas: string[]; anchors: Record<string, [number, number, number]>; lightmapIntensity?: number };
  let done = 0; const total = 4 + Object.values(SURFACES).filter((s) => s.slug).length * 3 + meta.panoramas.length;
  const tick = <T,>(p: Promise<T>) => p.then((v) => { done++; opts.onProgress?.(done / total); return v; });
  const tl = new THREE.TextureLoader();
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const tex = (url: string, srgb: boolean) => tick(tl.loadAsync(url)).then((t) => {
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = maxAniso; return t;
  });
  const gltfLoader = new GLTFLoader(); gltfLoader.setMeshoptDecoder(MeshoptDecoder);
  const hdr = new HDRLoader();
  const sfx = low ? "_lo" : "";

  const [gltf, lightmap, backdrop, panos, maps] = await Promise.all([
    tick(gltfLoader.loadAsync(`${base}/exchange.glb`)),
    tex(`${base}/lightmap${sfx}.webp`, true).then((t) => { t.flipY = false; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.channel = 1; return t; }),
    tex(`${base}/backdrop${sfx}.jpg`, true).then((t) => { t.mapping = THREE.EquirectangularReflectionMapping; return t; }),
    Promise.all(meta.panoramas.map((p) => tick(hdr.loadAsync(`${base}/pano_${p}.hdr`)).then((t) => [p, t] as const))),
    Promise.all(Object.values(SURFACES).filter((s) => s.slug).map(async (s) => {
      const [map, normal, rough] = await Promise.all([
        tex(`${base}/tex/${s.slug}_diffuse${sfx}.webp`, true), tex(`${base}/tex/${s.slug}_nor_gl${sfx}.webp`, false), tex(`${base}/tex/${s.slug}_rough${sfx}.webp`, false),
      ]);
      return [s.slug!, { map, normal, rough }] as const;
    })),
  ]);

  // reflection panoramas → prefiltered environment maps
  const pm = new THREE.PMREMGenerator(renderer);
  const envs: Partial<Record<Zone, THREE.Texture>> = {};
  for (const [name, t] of panos) { t.mapping = THREE.EquirectangularReflectionMapping; envs[name as Zone] = pm.fromEquirectangular(t).texture; t.dispose(); }
  pm.dispose();
  const hallEnv = envs.hall ?? null;
  const lmIntensity = (meta.lightmapIntensity ?? Math.PI) * meta.lightmapScale;
  const mats = createExchangeMaterials({ lightmap, lightmapScale: meta.lightmapScale, maps: Object.fromEntries(maps) }, hallEnv, lmIntensity);
  const glass = glassMaterial(hallEnv), fixture = fixtureMaterial();
  // the miniature: same lightmapped surfaces (so its interior shows the same daylight), studio reflections outside
  const miniMats = createExchangeMaterials({ lightmap, lightmapScale: meta.lightmapScale, maps: Object.fromEntries(maps) }, opts.studioEnv, lmIntensity);
  Object.values(miniMats).forEach((m) => { m.envMapIntensity = 0.35; });
  const miniGlass = glassMaterial(opts.studioEnv); miniGlass.opacity = 0.18;
  const ext = {
    marble: new THREE.MeshStandardMaterial({ map: maps.find(([k]) => k === "marble_01")?.[1].map ?? null, normalMap: maps.find(([k]) => k === "marble_01")?.[1].normal ?? null, roughness: 0.7, envMap: opts.studioEnv }),
    concrete: new THREE.MeshStandardMaterial({ map: maps.find(([k]) => k === "brushed_concrete")?.[1].map ?? null, roughness: 0.92, envMap: opts.studioEnv }),
    blacksteel: new THREE.MeshStandardMaterial({ color: 0x1c1d20, metalness: 1, roughness: 0.42, envMap: opts.studioEnv }),
  };

  // live screens (real portfolio data)
  const disposables: { dispose: () => void }[] = [];
  const board = mainBoard(data), ticker = tickerBand(data);
  disposables.push(board.texture, ticker.texture);
  // screens in the glTF use glTF texture coordinates (origin top-left): no vertical flip
  board.texture.flipY = false; ticker.texture.flipY = false;
  const boardMat = new THREE.MeshBasicMaterial({ map: board.texture, toneMapped: false, color: new THREE.Color(1.05, 1.05, 1.05) });
  const tickerMat = new THREE.MeshBasicMaterial({ map: ticker.texture, toneMapped: false });
  const deskMats: THREE.MeshBasicMaterial[] = [];
  const deskMat = (i: number) => {
    const k = i % 8;
    if (!deskMats[k]) { const d = deskScreen(data, k); d.texture.flipY = false; disposables.push(d.texture); deskMats[k] = new THREE.MeshBasicMaterial({ map: d.texture, toneMapped: false }); }
    return deskMats[k];
  };
  disposables.push(boardMat, tickerMat, glass, fixture, miniGlass, ...Object.values(mats), ...Object.values(miniMats), ...Object.values(ext));

  // ---------- assemble
  const scene = new THREE.Scene();
  scene.background = backdrop; scene.backgroundIntensity = 1.0;
  scene.environment = hallEnv;
  const building = gltf.scene; building.name = "exchange";
  const miniature = new THREE.Group(); miniature.name = "miniature";
  const miniBuilding = new THREE.Group(); miniature.add(miniBuilding); miniBuilding.scale.setScalar(MINI_SCALE);
  const toMini: THREE.Mesh[] = [];
  building.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const name = (mesh.parent && mesh.parent.type !== "Scene" && !mesh.name.includes("_") ? mesh.parent.name : mesh.name).replace(/\.\d+$/, "");
    const kind = name.split("_")[0], key = name.slice(kind.length + 1);
    if (kind === "arch") { const s = SURFACES[key] ?? SURFACES.plaster; prepareGeometry(mesh.geometry, s.tile); mesh.material = mats[key] ?? mats.plaster; }
    else if (kind === "ext") { prepareGeometry(mesh.geometry, key === "marble" ? 3 : 2); mesh.material = ext[key as keyof typeof ext] ?? ext.concrete; mesh.visible = true; }
    else if (kind === "glass") mesh.material = glass;
    else if (kind === "light") mesh.material = fixture;
    else if (kind === "screen") {
      mesh.material = key === "main" ? boardMat : key.startsWith("ticker") ? tickerMat : deskMat(parseInt(key.replace("desk", ""), 10) || 0);
    }
    mesh.matrixAutoUpdate = false; mesh.updateMatrix();
    toMini.push(mesh);
  });
  scene.add(building);
  // miniature: shared geometry, studio-facing materials for the exterior and glass
  building.updateMatrixWorld(true);
  for (const src of toMini) {
    const kind = src.name.split("_")[0];
    const mat = kind === "arch" ? miniMats[src.name.slice(5).replace(/\.\d+$/, "")] ?? miniMats.plaster : kind === "glass" ? miniGlass : (src.material as THREE.Material);
    const m = new THREE.Mesh(src.geometry, mat);
    m.matrixAutoUpdate = false; m.matrix.copy(src.matrixWorld); m.castShadow = kind === "ext" || kind === "arch"; m.receiveShadow = true;
    miniBuilding.add(m);
  }

  // ---------- live installations
  const zoneMats = { hall: createInstallMaterials(envs.hall ?? null), investment: createInstallMaterials(envs.investment ?? null), performance: createInstallMaterials(envs.performance ?? null) };
  const inst = buildInstallations(data, zoneMats.hall, meta.anchors, low);
  // the gallery pieces reflect their own rooms
  inst.root.children[1]?.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && m.material instanceof THREE.MeshPhysicalMaterial) m.material = Object.values(zoneMats.investment).find((x) => x.color.equals((m.material as THREE.MeshPhysicalMaterial).color)) ?? m.material; });
  inst.root.children[2]?.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && m.material instanceof THREE.MeshPhysicalMaterial) m.material = Object.values(zoneMats.performance).find((x) => x.color.equals((m.material as THREE.MeshPhysicalMaterial).color)) ?? m.material; });
  scene.add(inst.root);
  const miniInst = inst.root.clone(true); miniBuilding.add(miniInst);

  let zone: Zone = "hall";
  return {
    scene, miniature, anchors: inst.anchors, pickables: inst.pickables,
    setZone(z) {
      if (z === zone || !envs[z]) return; zone = z;
      Object.values(mats).forEach((m) => { m.envMap = envs[z]!; }); glass.envMap = envs[z]!; scene.environment = envs[z]!;
    },
    update(dt) { inst.update(dt); ticker.texture.offset.x = (ticker.texture.offset.x + dt * 0.012) % 1; },
    dispose() {
      inst.dispose(); disposables.forEach((d) => d.dispose());
      Object.values(zoneMats).forEach((z) => Object.values(z).forEach((m) => m.dispose()));
      Object.values(envs).forEach((e) => e?.dispose()); lightmap.dispose(); backdrop.dispose();
      maps.forEach(([, t]) => { t.map.dispose(); t.normal.dispose(); t.rough.dispose(); });
      building.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.geometry.dispose(); });
    },
  };
}

import * as THREE from "three";
import { createBaker } from "./textures";

export const LIME = new THREE.Color("#d7ff3f");
export const CORAL = new THREE.Color("#ff7a66");
export const IVORY = new THREE.Color("#f3f2ed");

/**
 * The physical material library. Every surface has its own baked micro-structure:
 * leather grain, brushing direction, machining rings, micro-scratches and faint fingerprints.
 */
export function createMaterials(renderer: THREE.WebGLRenderer, low: boolean) {
  const baker = createBaker(renderer, low ? 512 : 1024);
  const b = baker.bake;
  const leatherN = b({ mode: 0, strength: 3.2, seed: 3 });
  const leatherR = b({ mode: 1, base: 0.44, amp: 0.22, smudge: 0.025, seed: 3 });
  const brushedN = b({ mode: 2, strength: 0.9, seed: 5 });
  const titaniumR = b({ mode: 3, base: 0.36, amp: 0.12, scratch: 0.07, smudge: 0.06, seed: 7 });
  const steelR = b({ mode: 3, base: 0.2, amp: 0.06, scratch: 0.12, smudge: 0.08, seed: 11 });
  const aluR = b({ mode: 3, base: 0.3, amp: 0.18, scratch: 0.08, smudge: 0.03, seed: 13 });
  const radialR = b({ mode: 4, base: 0.32, amp: 0.16, scratch: 0.1, seed: 17 }, false);
  const anodR = b({ mode: 7, base: 0.4, amp: 0.1, scratch: 0.06, seed: 19 });
  const suedeN = b({ mode: 5, strength: 1.4, seed: 23 });
  const floorR = b({ mode: 8, base: 0.78, amp: 0.12, seed: 29 });
  const shadowT = b({ mode: 6 }, false);
  const falloff = b({ mode: 9 }, false);
  falloff.colorSpace = THREE.SRGBColorSpace;
  baker.disposeBaker();

  const P = (o: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(o);
  const m = {
    /** full-grain black leather: pebble grain, soft sheen, very light protective coat */
    leather: P({ color: 0x0c0c0d, roughness: 1, roughnessMap: leatherR, normalMap: leatherN, normalScale: new THREE.Vector2(0.45, 0.45),
      sheen: 0.35, sheenRoughness: 0.55, sheenColor: new THREE.Color(0x2c2c2e), clearcoat: 0.12, clearcoatRoughness: 0.55 }),
    /** satin black titanium: brushed, micro-scratched, faint fingerprints */
    titanium: P({ color: 0x45474d, metalness: 1, roughness: 1, roughnessMap: titaniumR, normalMap: brushedN, normalScale: new THREE.Vector2(0.25, 0.25),
      anisotropy: low ? 0 : 0.55 }),
    /** polished stainless: pins, slider, bearings */
    steel: P({ color: 0xbfc3c8, metalness: 1, roughness: 1, roughnessMap: steelR }),
    /** mirror-polished chrome bearings */
    chrome: P({ color: 0xc6c9cd, metalness: 1, roughness: 0.1 }),
    /** brushed aluminium (model base plate, columns) */
    aluminium: P({ color: 0xa9adb3, metalness: 1, roughness: 1, roughnessMap: aluR, normalMap: brushedN, normalScale: new THREE.Vector2(0.35, 0.35), anisotropy: low ? 0 : 0.8 }),
    /** concentric machining for the engine's turned parts */
    turned: P({ color: 0x8e9297, metalness: 1, roughness: 1, roughnessMap: radialR }),
    /** black anodised aluminium (architecture, plinths, the gallery plate) */
    anodized: P({ color: 0x141518, metalness: 0.85, roughness: 1, roughnessMap: anodR }),
    /** matte black composite (cores, lining trims) */
    composite: P({ color: 0x0e0f11, metalness: 0.1, roughness: 0.62 }),
    /** smoked architectural glass */
    glass: P({ color: 0x1b2127, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.42, clearcoat: 1, clearcoatRoughness: 0.03,
      specularIntensity: 1, envMapIntensity: 1.4, depthWrite: false }),
    /** the reservoir: real refraction on capable devices */
    vessel: low
      ? P({ color: 0x15181b, metalness: 0, roughness: 0.03, transparent: true, opacity: 0.5, clearcoat: 1, depthWrite: false })
      : P({ color: 0xffffff, metalness: 0, roughness: 0.02, transmission: 1, thickness: 0.004, ior: 1.5, attenuationColor: new THREE.Color(0x3a3f44), attenuationDistance: 0.02, clearcoat: 1 }),
    /** dark alcantara-like lining */
    suede: P({ color: 0x111214, roughness: 0.95, normalMap: suedeN, normalScale: new THREE.Vector2(0.4, 0.4), sheen: 1, sheenRoughness: 0.75, sheenColor: new THREE.Color(0x3a3c40) }),
    /** acid-lime anodising: restrained, reflective, not glowing */
    lime: P({ color: LIME, metalness: 0.5, roughness: 0.36, emissive: LIME, emissiveIntensity: 0 }),
    coral: P({ color: CORAL, metalness: 0.5, roughness: 0.38, emissive: CORAL, emissiveIntensity: 0 }),
    neutral: P({ color: 0x8d9095, metalness: 1, roughness: 0.3, emissive: 0x8d9095, emissiveIntensity: 0 }),
    /** lime silicone seal between shell and lid */
    gasket: P({ color: new THREE.Color(0x93b12a), metalness: 0, roughness: 0.82 }),
    /** indicator lamp in the lock window (only lit element on the case) */
    lamp: new THREE.MeshBasicMaterial({ color: LIME.clone().multiplyScalar(3), toneMapped: false }),
    /** waxed thread for the stitching */
    thread: P({ color: 0x1d1e20, roughness: 0.7, sheen: 0.5, sheenColor: new THREE.Color(0x333436) }),
    /** studio sweep */
    floor: P({ color: 0x1a1b1e, map: falloff, roughness: 1, roughnessMap: floorR, metalness: 0, envMapIntensity: 0.35 }),
    /** soft contact shadow under the case */
    contact: new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: shadowT, transparent: true, opacity: 0.9, depthWrite: false }),
  };
  for (const t of [leatherN, brushedN, suedeN]) t.colorSpace = THREE.NoColorSpace;
  return {
    m,
    dispose() { Object.values(m).forEach((x) => x.dispose()); baker.disposeAll(); },
  };
}
export type Materials = ReturnType<typeof createMaterials>["m"];

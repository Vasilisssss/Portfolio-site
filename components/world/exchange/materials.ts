import * as THREE from "three";
import { boxUV } from "../briefcase/geometry";

/**
 * Materials for the baked exchange. Architecture uses scanned PBR maps (Poly Haven, CC0) for colour, normal and
 * roughness, and a path-traced lightmap (Cycles) for all diffuse light: direct, bounced and ambient occlusion.
 * Specular comes from a reflection panorama rendered inside the same room, dimmed where the baked light is dim
 * (specular occlusion), so reflections behave like they do in a real interior.
 */
export interface ExchangeTextures { lightmap: THREE.Texture; lightmapScale: number; maps: Record<string, { map?: THREE.Texture; normal?: THREE.Texture; rough?: THREE.Texture }> }

/** surface definitions: scanned set, physical size of one texture tile (m), finish */
export const SURFACES: Record<string, { slug?: string; tile: number; color?: number; rough: number; metal?: number; normal?: number }> = {
  granite: { slug: "granite_tile", tile: 2.4, rough: 0.42, normal: 0.6 },          // polished dark granite floor
  marble: { slug: "marble_01", tile: 3.0, rough: 0.62, normal: 0.7 },              // honed stone cladding
  concrete: { slug: "brushed_concrete", tile: 2.0, rough: 0.95, normal: 0.8 },     // architectural concrete
  veneer: { slug: "flamed_black_veneer", tile: 1.2, rough: 0.55, normal: 0.5 },    // trading desks
  walnut: { slug: "smoked_walnut_veneer", tile: 1.6, rough: 0.6, normal: 0.5 },    // gallery panelling
  plaster: { tile: 1, color: 0x9e9a93, rough: 0.92 },
  steel: { tile: 1, color: 0x8f9195, rough: 0.32, metal: 1 },
  blacksteel: { tile: 1, color: 0x1c1d20, rough: 0.42, metal: 1 },
};

/** shader patch: lightmap owns diffuse; reflections follow the baked light */
function patchLightmapped(m: THREE.MeshStandardMaterial, specOcc = 2.2) {
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uSpecOcc = { value: specOcc };
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <lights_fragment_maps>", THREE.ShaderChunk.lights_fragment_maps
        .replace("iblIrradiance += getIBLIrradiance( geometryNormal );", "/* diffuse light is baked */")
        .replace("radiance += iblRadiance;", "radiance += iblRadiance * mix( 0.12, 1.0, saturate( dot( lightMapIrradiance, vec3( 0.3333 ) ) * uSpecOcc ) );"))
      .replace("void main() {", "uniform float uSpecOcc;\nvoid main() {");
  };
  m.customProgramCacheKey = () => `lm-${specOcc}`;
}

export function createExchangeMaterials(tex: ExchangeTextures, env: THREE.Texture | null, lmIntensity: number) {
  const mats: Record<string, THREE.MeshStandardMaterial> = {};
  for (const [k, s] of Object.entries(SURFACES)) {
    const t = s.slug ? tex.maps[s.slug] : undefined;
    const m = new THREE.MeshStandardMaterial({
      color: s.color ?? 0xffffff, roughness: s.rough, metalness: s.metal ?? 0,
      map: t?.map ?? null, normalMap: t?.normal ?? null, roughnessMap: t?.rough ?? null,
      lightMap: tex.lightmap, lightMapIntensity: lmIntensity, envMap: env, envMapIntensity: 1,
    });
    if (m.normalMap) m.normalScale.setScalar(s.normal ?? 0.6);
    patchLightmapped(m);
    mats[k] = m;
  }
  return mats;
}

/**
 * Prepare a glTF architecture mesh: its TEXCOORD_0 is the lightmap atlas → move to uv1; compute world-scale
 * box-projected uv for the scanned maps (one tile = SURFACES[k].tile metres).
 */
export function prepareGeometry(g: THREE.BufferGeometry, tile: number) {
  if (g.attributes.uv && !g.attributes.uv1) g.setAttribute("uv1", g.attributes.uv);
  boxUV(g, tile);
  return g;
}

export function glassMaterial(env: THREE.Texture | null) {
  return new THREE.MeshPhysicalMaterial({
    color: 0xdfe6ea, metalness: 0, roughness: 0.03, transparent: true, opacity: 0.12, envMap: env, envMapIntensity: 1.2,
    specularIntensity: 1, depthWrite: false, side: THREE.DoubleSide,
  });
}

export function fixtureMaterial() {
  // linear LED diffusers: bright, slightly warm (3500 K), never tone-mapped into grey
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.93, 0.84).multiplyScalar(3.2), toneMapped: true });
}

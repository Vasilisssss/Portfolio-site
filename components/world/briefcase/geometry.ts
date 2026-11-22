import * as THREE from "three";
import { TILE } from "./textures";

/** Rounded rectangle centred on the origin (x = width, y = depth before extrusion). */
export function roundedRect(w: number, d: number, r: number, path: THREE.Shape | THREE.Path = new THREE.Shape()) {
  const x = -w / 2, y = -d / 2; r = Math.min(r, w / 2, d / 2);
  path.moveTo(x + r, y);
  path.lineTo(x + w - r, y); path.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  path.lineTo(x + w, y + d - r); path.absarc(x + w - r, y + d - r, r, 0, Math.PI / 2, false);
  path.lineTo(x + r, y + d); path.absarc(x + r, y + d - r, r, Math.PI / 2, Math.PI, false);
  path.lineTo(x, y + r); path.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return path;
}

/** Same outline wound the other way: used as a hole. */
function roundedRectHole(w: number, d: number, r: number) {
  const p = new THREE.Path(); const x = -w / 2, y = -d / 2; r = Math.min(r, w / 2, d / 2);
  p.moveTo(x + r, y);
  p.absarc(x + r, y + r, r, -Math.PI / 2, -Math.PI, true); p.lineTo(x, y + d - r);
  p.absarc(x + r, y + d - r, r, Math.PI, Math.PI / 2, true); p.lineTo(x + w - r, y + d);
  p.absarc(x + w - r, y + d - r, r, Math.PI / 2, 0, true); p.lineTo(x + w, y + r);
  p.absarc(x + w - r, y + r, r, 0, -Math.PI / 2, true); p.lineTo(x + r, y);
  return p;
}

export interface Bevel { size: number; thickness: number; segments: number }

/**
 * Extrude a shape upwards (+y) from y = 0 to y = height, with a real bevel on both ends.
 * Shape x → world x, shape y → world −z.
 */
export function extrudeUp(shape: THREE.Shape, height: number, bevel: Bevel | null, curveSegments = 12) {
  const bt = bevel ? Math.min(bevel.thickness, height / 2 - 1e-5) : 0;
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(1e-5, height - 2 * bt), curveSegments,
    bevelEnabled: !!bevel, bevelSize: bevel?.size ?? 0, bevelThickness: bt, bevelSegments: bevel?.segments ?? 0, bevelOffset: bevel ? -bevel.size : 0,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, bt, 0);
  g.computeVertexNormals();
  return g;
}

/** Solid rounded slab: w × d footprint, height h, all edges bevelled. */
export function slab(w: number, d: number, h: number, r: number, bevel: number, segs = 4, curveSegments = 12) {
  return boxUV(extrudeUp(roundedRect(w, d, r) as THREE.Shape, h, bevel > 0 ? { size: bevel, thickness: bevel, segments: segs } : null, curveSegments));
}

/** Rounded rectangular ring (walls, frames, bezels). */
export function ring(w: number, d: number, r: number, wall: number, h: number, bevel: number, segs = 4, curveSegments = 12) {
  const s = roundedRect(w, d, r) as THREE.Shape;
  s.holes.push(roundedRectHole(w - 2 * wall, d - 2 * wall, Math.max(0.0005, r - wall)));
  return boxUV(extrudeUp(s, h, bevel > 0 ? { size: bevel, thickness: bevel, segments: segs } : null, curveSegments));
}

/** Annular sector in the x/−z plane, centred on the origin (angles measured from +x towards −z). */
export function annularSector(r0: number, r1: number, a0: number, a1: number, h: number, bevel: number, segs = 3) {
  const s = new THREE.Shape();
  s.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0);
  s.absarc(0, 0, r1, a0, a1, false);
  s.lineTo(Math.cos(a1) * r0, Math.sin(a1) * r0);
  s.absarc(0, 0, r0, a1, a0, true);
  return boxUV(extrudeUp(s, h, bevel > 0 ? { size: bevel, thickness: bevel, segments: segs } : null, Math.max(8, Math.ceil(((a1 - a0) / Math.PI) * 48))));
}

/**
 * Box-projected UVs in metres / TILE: every surface gets the same texel density, so leather grain and brushing
 * have one physical scale across the whole object.
 */
export function boxUV<T extends THREE.BufferGeometry>(g: T, tile = TILE): T {
  if (!g.attributes.normal) g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u: number, v: number;
    if (ay >= ax && ay >= az) { u = p.getX(i); v = p.getZ(i); }
    else if (ax >= az) { u = p.getZ(i); v = p.getY(i); }
    else { u = p.getX(i); v = p.getY(i); }
    uv[i * 2] = u / tile; uv[i * 2 + 1] = v / tile;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

/** A mesh that casts and receives shadows. */
export function part(g: THREE.BufferGeometry, m: THREE.Material, name?: string) {
  const mesh = new THREE.Mesh(g, m);
  mesh.castShadow = true; mesh.receiveShadow = true;
  if (name) mesh.name = name;
  return mesh;
}

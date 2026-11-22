/**
 * Real-world dimensions in metres. The case is a 46 × 34 × 11.4 cm attaché; everything else is built to fit it,
 * so nothing intersects when it is closed and the mechanics stay physically plausible.
 */
export const W = 0.46;          // width (x)
export const D = 0.34;          // depth front–back (z, front = +z)
export const R = 0.026;         // plan-view corner radius
export const FOOT = 0.004;      // feet lift the shell off the floor
export const SEAM = 0.078;      // where base and lid meet
export const GASKET = 0.0012;   // lime seal thickness
export const TOP = 0.114;       // closed height
export const WALL = 0.007;      // shell wall thickness
export const PROUD = 0.0015;    // the titanium frame stands proud of the leather

// hinge axis: just behind the back face, at the seam
export const PIVOT_Y = SEAM + 0.0006;
export const PIVOT_Z = -D / 2 - 0.0045;
export const LID_MAX = (100 * Math.PI) / 180; // hinge stop

// interior
export const FLOOR_Y = 0.011;           // top of the base lining
export const PLATE_W = 0.41, PLATE_D = 0.29, PLATE_H = 0.005;
export const PLATE_Y0 = 0.012;          // plate underside when stowed
export const RISE = 0.032;              // the model platform lifts this far once the lid is open
export const PLATE_TOP_RAISED = PLATE_Y0 + PLATE_H + RISE;
export const LID_CEIL = TOP - 0.008;    // underside of the lid's top panel (closed, case coords)

// regions on the platform (platform-local x/z)
export const ENGINE_C = { x: -0.137, z: 0 };
export const CITY = { x0: -0.062, x1: 0.192, z0: -0.128, z1: 0.128 };
export const TOWER_MAX = 0.15;          // tallest possible tower (weight = 100%), fully extended

/** Rotate a point given in closed case coordinates by the lid's opening angle (around the hinge axis). */
export function lidToWorld(y: number, z: number, angle: number): [number, number] {
  const yr = y - PIVOT_Y, zr = z - PIVOT_Z;
  const a = -angle, c = Math.cos(a), s = Math.sin(a);
  return [PIVOT_Y + yr * c - zr * s, PIVOT_Z + yr * s + zr * c];
}

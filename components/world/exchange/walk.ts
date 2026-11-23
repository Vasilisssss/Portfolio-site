import * as THREE from "three";

/**
 * A person walking through the exchange. Positions are in building metres (three.js space: x, height, z = −plan y).
 * Each leg is a smooth path between two stops; scroll maps to walked distance with ease-in / ease-out at the stops,
 * so the visitor accelerates, walks at a steady pace and slows to a halt. A gait bob and sway follow the distance
 * walked (0.78 m stride; 0.275 m treads on the stair), and the gaze looks ahead along the route, turning towards
 * the next destination as it approaches.
 */
export const EYE = 1.65;
const P = (x: number, planY: number, h: number) => new THREE.Vector3(x, h, -planY);
const stairEye = (planY: number) => EYE + THREE.MathUtils.clamp((planY - 5) / 11, 0, 1) * 7;

export interface Stop { u: number; pos: THREE.Vector3; look: THREE.Vector3 }
interface Leg { u0: number; u1: number; curve: THREE.CatmullRomCurve3; look0: THREE.Vector3; look1: THREE.Vector3; length: number; stride: number }

export const STOPS = {
  capital: { pos: P(0, -10.6, EYE), look: P(0, -1.2, 0.6) },
  holdings: { pos: P(-27.2, -10.5, EYE), look: P(-33, -1, 1.3) },
  performance: { pos: P(27.8, 7.5, 7 + EYE), look: P(39.6, -6, 9.3) },
  overlook: { pos: P(21.2, -22.4, 7 + EYE), look: P(6, -40, 6) },
};

function leg(u0: number, u1: number, pts: THREE.Vector3[], look0: THREE.Vector3, look1: THREE.Vector3, stride = 0.78): Leg {
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.5);
  return { u0, u1, curve, look0, look1, length: curve.getLength(), stride };
}

/** route between the stops (u = 1 capital, 2 holdings, 3 performance, then towards the façade) */
export const LEGS: Leg[] = [
  leg(1, 2, [STOPS.capital.pos, P(-3.5, -10.4, EYE), P(-8.5, -8.8, EYE), P(-14, -8.2, EYE), P(-20.5, -5.2, EYE), P(-24, -4, EYE), P(-26.4, -6.4, EYE), STOPS.holdings.pos],
    STOPS.capital.look, STOPS.holdings.look),
  leg(2, 3, [
    STOPS.holdings.pos, P(-26.2, -5.2, EYE), P(-23, -4, EYE), P(-14.5, -0.8, EYE), P(-7.4, 3.2, EYE), P(-2, 4.3, EYE), P(0, 5, EYE),
    ...[6.5, 9, 11.5, 14, 16].map((y) => P(0, y, stairEye(y))), P(0, 17.6, 7 + EYE), P(4.5, 18, 7 + EYE), P(16, 18, 7 + EYE), P(21.5, 15, 7 + EYE),
    P(22, 4, 7 + EYE), P(22.2, -2.6, 7 + EYE), P(25, -4, 7 + EYE), P(27.4, -1.5, 7 + EYE), STOPS.performance.pos,
  ], STOPS.holdings.look, STOPS.performance.look),
  leg(3, 3.55, [STOPS.performance.pos, P(26.2, 0, 7 + EYE), P(23.4, -4, 7 + EYE), P(22, -10, 7 + EYE), P(21.6, -18, 7 + EYE), STOPS.overlook.pos],
    STOPS.performance.look, STOPS.overlook.look),
];
/**
 * After the overlook the visitor leaves the building: a glide over the balustrade, out through the façade glass,
 * then the camera keeps retreating while it turns to face the exchange from outside (the pull-back continues in the case).
 */
export const EXIT = { u0: 3.55, u1: 3.7, curve: new THREE.CatmullRomCurve3([STOPS.overlook.pos, P(18, -25.5, 9.2), P(15, -28.6, 9.8), P(12, -40, 13), P(8, -62, 18)], false, "centripetal") };
export const BUILDING_CENTRE = P(0, -4, 9);
export const FACADE_PLAN_Y = -28; // crossing this plane (three z > 28) = outside

const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const smooth = (a: number, b: number, x: number) => { const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export interface WalkSample { pos: THREE.Vector3; look: THREE.Vector3; speed: number; walking: boolean }

/** position, gaze and gait at journey position u (1 ≤ u ≤ EXIT.u1); `bob` scales the gait (0 for reduced motion) */
export function sampleWalk(u: number, bob = 1, out: WalkSample = { pos: new THREE.Vector3(), look: new THREE.Vector3(), speed: 0, walking: false }): WalkSample {
  if (u >= EXIT.u0) {
    const t = smoother(THREE.MathUtils.clamp((u - EXIT.u0) / (EXIT.u1 - EXIT.u0), 0, 1));
    EXIT.curve.getPointAt(t, out.pos);
    const ahead = EXIT.curve.getPointAt(Math.min(1, t + 0.12));
    // look ahead through the glass, then turn round to face the façade from outside
    out.look.copy(STOPS.overlook.look).lerp(ahead.add(new THREE.Vector3(0, -0.4, 0)), smooth(0.05, 0.3, t)).lerp(BUILDING_CENTRE, smooth(0.38, 0.85, t));
    out.speed = 0; out.walking = false; return out;
  }
  const L = LEGS.find((l) => u >= l.u0 && u <= l.u1) ?? LEGS[0];
  const t = THREE.MathUtils.clamp((u - L.u0) / (L.u1 - L.u0), 0, 1);
  const s = smoother(t);
  L.curve.getPointAt(s, out.pos);
  // gaze: from the previous stop's subject, ahead along the route, to the next stop's subject
  const ahead = L.curve.getPointAt(Math.min(1, s + 3.2 / L.length));
  ahead.y = out.pos.y - 0.12 + (ahead.y - out.pos.y);
  const route = ahead.sub(out.pos).normalize().multiplyScalar(6).add(out.pos);
  out.look.copy(L.look0).lerp(route, smooth(0.0, 0.18, s)).lerp(L.look1, smooth(0.72, 1.0, s));
  // gait: speed is the derivative of the eased progress (0 at the stops)
  const v = 30 * t * t * (1 - t) * (1 - t); // d(smoother)/dt, peaks at 1.875
  out.speed = v / 1.875; out.walking = out.speed > 0.02;
  if (bob > 0 && out.walking) {
    const d = s * L.length, phase = (d / 0.78) * Math.PI;
    const a = out.speed * bob;
    out.pos.y += Math.abs(Math.sin(phase)) * 0.022 * a - 0.011 * a;      // two bobs per stride cycle
    const side = new THREE.Vector3().subVectors(out.look, out.pos).cross(new THREE.Vector3(0, 1, 0)).normalize();
    out.pos.addScaledVector(side, Math.sin(phase * 0.5) * 0.012 * a);    // weight shift left/right
  }
  return out;
}

/** start of the descent in building space is provided by the engine (the case camera mapped into the model) */
export const DESCENT = (start: THREE.Vector3, startLook: THREE.Vector3) => ({
  curve: new THREE.CatmullRomCurve3([start, P(0, -2, 46), P(0, -2.5, 30), P(0, -3.5, 18), P(0, -7.5, 8), P(0, -10, 3.2), STOPS.capital.pos], false, "centripetal", 0.5),
  look0: startLook,
});
export const LANTERN_GLASS_H = 26.7; // below this height the camera is inside the building

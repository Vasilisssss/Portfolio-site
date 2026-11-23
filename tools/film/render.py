"""
Render the film: one continuous camera move over the page's scroll progress u ∈ [0, 4]
(0 the closed case · 1 the trading floor · 2 the gallery · 3 the performance wall · 4 the open case).

The path is written in hall coordinates. Wherever the camera is higher than Z_CUT above the hall floor it is
"outside the world", so the frame is rendered in the studio instead, through the 1:110 hall inside the case:
the same pose, scaled. That is the scale transition, done with real optics rather than an effect.

Usage: python render.py <world.blend> <outdir> <mode> [args]
  mode keys  <width> <spp>                    render the five holds (u = 0..4)
  mode seq   <width> <spp> <i0> <i1>          render motion frames i0..i1-1 of the sequence
  mode plan                                   write frames.json (u, camera, label anchors per frame) only
"""
import bpy  # noqa: first
import json, math, os, sys
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
BLEND, OUTDIR, MODE = argv[0], argv[1], argv[2]
bpy.ops.wm.open_mainfile(filepath=BLEND)
scene = bpy.context.scene
META = json.load(open(os.path.join(os.path.dirname(BLEND), "world.json")))
S = META["scale"]; MO = Vector(META["mini_origin"]); CT = Vector(META["case_top"]); H = META["H"]
Z_CUT = 38.0

def studio(dx, dy, dz):
    """a point given relative to the case top (metres in the studio) → hall coordinates"""
    return tuple((CT + Vector((dx, dy, dz)) - MO) / S)

# ---------------------------------------------------------------- the path: (u, position, look-at, focal length mm)
KEYS = [
    (0.00, studio(0.04, -1.22, 0.40), studio(-0.06, 0.02, -0.02), 55),
    (0.30, studio(0.06, -0.98, 0.56), studio(-0.02, 0.04, -0.02), 52),
    (0.52, studio(0.02, -0.40, 0.56), studio(0.0, 0.0, -0.04), 42),
    (0.68, studio(0.0, -0.03, 0.37), studio(0.0, 0.0, -0.07), 35),
    (0.76, (23.0, 8.6, 30.0), (23.0, 10.0, 0.0), 32),
    (0.87, (18.5, 1.2, 9.5), (16.2, 10.0, 0.6), 28),
    (1.00, (16.0, 3.4, 1.65), (16.0, 19.0, 2.6), 28),
    (1.30, (21.5, 3.0, 1.65), (30.0, 4.2, 1.7), 28),
    (1.60, (30.6, 3.9, 1.65), (38.0, 12.0, 1.6), 28),
    (1.80, (36.4, 13.6, 1.64), (39.0, 6.0, 1.3), 28),
    (2.00, (39.2, 15.2, 1.62), (39.2, 5.6, 1.35), 28),
    (2.45, (40.6, 12.9, 1.63), (46.0, 9.0, 1.9), 26),
    (3.00, (34.4, 10.3, 1.62), (46.0, 10.0, 2.3), 23),
    (3.25, (33.0, 10.4, 4.4), (40.0, 10.0, 0.2), 24),
    (3.45, (26.5, 10.0, 14.0), (23.5, 10.0, 0.0), 26),
    (3.60, (23.0, 9.4, 30.0), (23.0, 10.0, 0.0), 30),
    (3.72, studio(0.0, -0.06, 0.40), studio(0.0, 0.0, -0.07), 35),
    (3.86, studio(0.12, -0.55, 0.58), studio(0.0, 0.01, -0.03), 42),
    (4.00, studio(0.30, -1.12, 0.52), studio(-0.03, 0.05, 0.0), 50),
]
HOLDS = [0.0, 1.0, 2.0, 3.0, 4.0]
# motion frames per scene transition; denser where the move is fastest (the descent)
SEG_FRAMES = [56, 32, 24, 44]

def sample(u):
    """Hermite spline through the keys: Catmull-Rom tangents (non-uniform), zero tangent at the holds,
    so the camera settles into every scene and passes smoothly through the keys in between"""
    u = min(max(u, KEYS[0][0]), KEYS[-1][0])
    i = len(KEYS) - 2 if u >= KEYS[-1][0] else max(j for j in range(len(KEYS) - 1) if KEYS[j][0] <= u)
    def tangent(k, f):
        if KEYS[k][0] in HOLDS or k == 0 or k == len(KEYS) - 1: return Vector((0, 0, 0))
        return (Vector(KEYS[k + 1][f]) - Vector(KEYS[k - 1][f])) / (KEYS[k + 1][0] - KEYS[k - 1][0])
    u0, u1 = KEYS[i][0], KEYS[i + 1][0]; h = u1 - u0; t = (u - u0) / h
    h00, h10, h01, h11 = 2 * t ** 3 - 3 * t ** 2 + 1, t ** 3 - 2 * t ** 2 + t, -2 * t ** 3 + 3 * t ** 2, t ** 3 - t ** 2
    herm = lambda f: h00 * Vector(KEYS[i][f]) + h10 * h * tangent(i, f) + h01 * Vector(KEYS[i + 1][f]) + h11 * h * tangent(i + 1, f)
    s_ = t * t * (3 - 2 * t)
    return herm(1), herm(2), KEYS[i][3] + (KEYS[i + 1][3] - KEYS[i][3]) * s_

def lid_angle(u):
    """the case opens between u 0.05 and 0.32 and stays open (it is open again at the end)"""
    t = min(1, max(0, (u - 0.05) / 0.27)); t = t * t * (3 - 2 * t)
    return math.radians(102) * t

FRAMES = []
for si, n in enumerate(SEG_FRAMES):
    for k in range(n): FRAMES.append(si + k / n)
FRAMES.append(4.0)

cam = scene.camera
WORLD_BG = scene.world.node_tree.nodes["Background"]; SKY = WORLD_BG.inputs["Strength"].default_value
HALL_LIGHTS = [(o.data, o.data.energy) for o in bpy.data.collections["lights"].objects if o.type == "LIGHT"]
ceiling = bpy.data.collections["ceiling"]
void = [bpy.data.objects["void_ground"], bpy.data.objects["void_skirt"]]
hinge = bpy.data.objects["lid_hinge"]

def setup(u):
    pos, tgt, lens = sample(u)
    hinge.rotation_euler = (-lid_angle(u), 0, 0)
    inside = pos.z <= Z_CUT
    if inside:
        P, T = pos, tgt
        cam.data.dof.use_dof = True; cam.data.dof.aperture_fstop = 8.0
    else:
        P, T = MO + pos * S, MO + tgt * S
        cam.data.dof.use_dof = True; cam.data.dof.aperture_fstop = 5.6
    d = T - P
    cam.location = P
    level = inside and pos.z < 2.2 and abs(d.z) / max(1e-6, d.length) < 0.12
    look = Vector((d.x, d.y, 0)) if level else d  # at eye level the camera is levelled: verticals stay vertical
    cam.rotation_euler = look.to_track_quat("-Z", "Y").to_euler()
    cam.data.shift_y = 0.0
    cam.data.lens = lens; cam.data.sensor_width = 36
    cam.data.dof.focus_distance = max(0.05, d.length)
    ceiling.hide_render = pos.z > H - 0.05
    # without its roof the hall would take the whole sky: the daylight is kept to what the glass admits
    k = min(1.0, max(0.0, (pos.z - (H - 1.0)) / 9.0)); k = k * k * (3 - 2 * k)
    WORLD_BG.inputs["Strength"].default_value = SKY * (1 - 0.6 * k)
    for L, e in HALL_LIGHTS: L.energy = e * (1 - k)
    for o in void: o.hide_render = not (inside and pos.z > H + 0.5)
    return pos, inside

def project(u):
    """screen positions (0..1, origin top-left) of the label anchors for this frame"""
    out = {}
    pos, inside = setup(u)
    bpy.context.view_layer.update()
    for k, a in META["anchors"].items():
        w = Vector(a) if inside else MO + Vector(a) * S
        v = world_to_camera_view(scene, cam, w)
        if v.z > 0 and -0.1 < v.x < 1.1 and -0.1 < v.y < 1.1: out[k] = [round(v.x, 4), round(1 - v.y, 4)]
    return out, pos, inside

def render(u, path, width, spp):
    scene.render.resolution_x = width; scene.render.resolution_y = round(width * 9 / 16); scene.render.resolution_percentage = 100
    scene.cycles.samples = spp; scene.cycles.seed = int(u * 1000) % 9973  # noise decorrelated frame to frame
    setup(u); scene.render.filepath = path
    bpy.ops.render.render(write_still=True)

os.makedirs(OUTDIR, exist_ok=True)
if MODE == "plan":
    plan = []
    for i, u in enumerate(FRAMES):
        labels, pos, inside = project(u)
        plan.append({"i": i, "u": round(u, 5), "space": "hall" if inside else "studio", "cam": [round(c, 3) for c in pos], "labels": labels})
    holds = []
    for u in HOLDS:
        labels, pos, inside = project(u)
        holds.append({"u": u, "labels": labels})
    json.dump({"frames": plan, "holds": holds, "segFrames": SEG_FRAMES}, open(os.path.join(OUTDIR, "frames.json"), "w"))
    print("plan", len(plan), "frames", flush=True)
elif MODE == "keys":
    width, spp = int(argv[3]), int(argv[4])
    only = [float(x) for x in argv[5:]] or HOLDS
    for u in only:
        p = os.path.join(OUTDIR, f"hold_{int(u)}.png")
        if os.path.exists(p) and "--force" not in argv: continue  # resumable
        render(u, p, width, spp); print("rendered hold", u, flush=True)
elif MODE == "seq":
    width, spp, i0, i1 = int(argv[3]), int(argv[4]), int(argv[5]), int(argv[6])
    for i in range(i0, min(i1, len(FRAMES))):
        p = os.path.join(OUTDIR, f"f{i:04d}.png")
        if os.path.exists(p): continue  # resumable
        render(FRAMES[i], p, width, spp); print("rendered frame", i, FRAMES[i], flush=True)
elif MODE == "at":  # arbitrary u values for checking the path
    width, spp = int(argv[3]), int(argv[4])
    for x in argv[5:]:
        render(float(x), os.path.join(OUTDIR, f"u_{x}.png"), width, spp); print("rendered u", x, flush=True)

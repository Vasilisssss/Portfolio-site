"""Path-traced reference views of the exchange (Cycles). Usage: python render.py <file.blend> <outdir> [samples] [width] [views...]"""
import bpy  # noqa: first
import math, os, sys
from mathutils import Vector

blend, out = sys.argv[1], sys.argv[2]
samples = int(sys.argv[3]) if len(sys.argv) > 3 else 64
width = int(sys.argv[4]) if len(sys.argv) > 4 else 960
only = set(sys.argv[5:])
EYE = 1.65
VIEWS = {
    "entrance":   ((0, -25.5, EYE), (0, 10, 5.5), 24),
    "engine":     ((7, -12, EYE), (-1, 6, 6.5), 22),
    "trading":    ((-13, -24.5, EYE), (-2, -13, 1.2), 24),
    "stair":      ((0, 2.5, EYE), (0, 19, 9.5), 22),
    "mezzanine":  ((-22, 12, 7 + EYE), (8, -14, 3.5), 22),
    "investment": ((-26.5, 9, EYE), (-36, -14, 2.6), 24),
    "performance": ((27, 9, 7 + EYE), (39.5, -10, 7 + 2.4), 24),
    "outside":    ((0, -45, 6), (0, 0, 9), 30),
    "aerial":     ((-70, -110, 80), (0, 0, 6), 22),
}

bpy.ops.wm.open_mainfile(filepath=blend)
s = bpy.context.scene
s.render.engine = "CYCLES"; s.cycles.device = "CPU"; s.cycles.samples = samples
s.cycles.use_denoising = True
try: s.cycles.denoiser = "OPENIMAGEDENOISE"
except Exception: pass
s.cycles.max_bounces = 8; s.cycles.diffuse_bounces = 4; s.cycles.glossy_bounces = 3; s.cycles.transmission_bounces = 6
s.cycles.sample_clamp_indirect = 8
s.view_settings.view_transform = "AgX"; s.view_settings.look = "AgX - Medium High Contrast"; s.view_settings.exposure = float(os.environ.get("EXPOSURE", "0.4"))
s.render.resolution_x = width; s.render.resolution_y = round(width * 9 / 16); s.render.film_transparent = False
cam = bpy.data.cameras.new("cam"); co = bpy.data.objects.new("cam", cam); s.collection.objects.link(co); s.camera = co
cam.sensor_width = 36
os.makedirs(out, exist_ok=True)
for name, (pos, tgt, fov) in VIEWS.items():
    if only and name not in only: continue
    co.location = pos
    d = Vector(tgt) - Vector(pos); co.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    cam.angle = math.radians(float(os.environ.get("HFOV", "72")))  # architectural 24 mm-ish horizontal field
    s.render.filepath = os.path.join(out, f"{name}.png")
    bpy.ops.render.render(write_still=True)
    print("rendered", name, flush=True)

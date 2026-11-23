"""
Bake path-traced lighting for the exchange.
Usage: python bake.py <in.blend> <outdir> [--size 2048] [--samples 128]

1. One shared lightmap UV atlas ("LightUV") across every arch_* object (Smart UV Project, multi-object).
2. Cycles DIFFUSE bake (direct + indirect, no albedo) = irradiance: daylight from the HDRI through the skylight and the
   façade (glazing hidden during the bake) plus all emissive fixtures and screens.
3. Saves lightmap.exr (linear, float) and reflection panoramas (equirectangular, HDR) from inside each space,
   used as environment maps for the live installations so they reflect the real building.
"""
import bpy  # noqa: first
import os, sys, time

blend, out = sys.argv[1], sys.argv[2]
arg = lambda k, d: type(d)(sys.argv[sys.argv.index(k) + 1]) if k in sys.argv else d
SIZE, SAMPLES = arg("--size", 2048), arg("--samples", 128)
os.makedirs(out, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=blend)
s = bpy.context.scene
s.render.engine = "CYCLES"; s.cycles.device = "CPU"; s.cycles.samples = SAMPLES
s.cycles.max_bounces = 6; s.cycles.diffuse_bounces = 4; s.cycles.glossy_bounces = 2; s.cycles.transmission_bounces = 4
s.cycles.sample_clamp_indirect = 6
s.cycles.use_denoising = False

arch = [o for o in s.objects if o.type == "MESH" and o.name.startswith("arch_")]
for o in s.objects:
    if o.name.startswith("glass_"): o.hide_render = True  # let daylight in unobstructed

# ---------- 0. cull faces nobody can see (buried inside other geometry, or slab undersides): more texels where it matters
import bmesh
from mathutils.bvhtree import BVHTree
dg = bpy.context.evaluated_depsgraph_get(); t0 = time.time()
solids = [o for o in s.objects if o.type == "MESH" and o.name.startswith(("arch_", "ext_"))]
trees = [BVHTree.FromObject(o, dg) for o in solids]
culled = 0
for o in arch:
    bm = bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table()
    dead = []
    for f in bm.faces:
        c, n = f.calc_center_median(), f.normal
        if n.z < -0.9 and c.z < 0.01: dead.append(f); continue          # undersides of ground slabs
        start = c + n * 0.003
        if any(t.ray_cast(start, n, 0.02)[0] is not None for t in trees): dead.append(f)   # face pressed against / inside other geometry
    bmesh.ops.delete(bm, geom=dead, context="FACES"); culled += len(dead)
    bm.to_mesh(o.data); bm.free()
print(f"culled {culled} hidden faces in {time.time() - t0:.0f}s", flush=True)

# ---------- 1. shared lightmap atlas
bpy.ops.object.select_all(action="DESELECT")
for o in arch:
    o.select_set(True)
    if "LightUV" not in o.data.uv_layers: o.data.uv_layers.new(name="LightUV")
    o.data.uv_layers.active = o.data.uv_layers["LightUV"]
bpy.context.view_layer.objects.active = arch[0]
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
t = time.time()
bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.004, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
bpy.ops.uv.pack_islands(rotate=True, margin=0.002, scale=True)
bpy.ops.object.mode_set(mode="OBJECT")
print(f"atlas unwrapped in {time.time() - t:.1f}s", flush=True)

# ---------- 2. bake irradiance
img = bpy.data.images.new("lightmap", SIZE, SIZE, float_buffer=True, alpha=False)
for o in arch:
    for slot in o.material_slots:
        nt = slot.material.node_tree
        node = nt.nodes.get("LM") or nt.nodes.new("ShaderNodeTexImage"); node.name = "LM"; node.image = img
        nt.nodes.active = node
t = time.time()
bpy.ops.object.bake(type="DIFFUSE", pass_filter={"DIRECT", "INDIRECT"}, use_clear=True, margin=6, margin_type="EXTEND", target="IMAGE_TEXTURES")
print(f"baked {SIZE}² at {SAMPLES} spp in {time.time() - t:.0f}s", flush=True)
img.filepath_raw = os.path.join(out, "lightmap_raw.exr"); img.file_format = "OPEN_EXR"; img.save()
# denoise with Intel Open Image Denoise's dedicated lightmap filter
try:
    import numpy as np, pyoidn
    px = np.ascontiguousarray(np.array(img.pixels[:], dtype=np.float32).reshape(SIZE, SIZE, 4)[:, :, :3])
    den = np.zeros_like(px)
    dev = pyoidn.Device(pyoidn.OIDN_DEVICE_TYPE_CPU); dev.commit()
    flt = pyoidn.Filter(dev, "RTLightmap")
    flt.set_image(pyoidn.OIDN_IMAGE_COLOR, px, pyoidn.OIDN_FORMAT_FLOAT3, SIZE, SIZE)
    flt.set_image(pyoidn.OIDN_IMAGE_OUTPUT, den, pyoidn.OIDN_FORMAT_FLOAT3, SIZE, SIZE)
    flt.commit(); flt.execute()
    rgba = np.concatenate([den, np.ones((SIZE, SIZE, 1), np.float32)], axis=2)
    img.pixels.foreach_set(rgba.ravel()); print("denoised (OIDN RTLightmap)", flush=True)
except Exception as e:
    print("denoise skipped:", e, flush=True)
img.filepath_raw = os.path.join(out, "lightmap.exr"); img.file_format = "OPEN_EXR"; img.save()

if "--no-pano" in sys.argv:
    print("done (no panoramas)", flush=True); sys.exit(0)

# ---------- 3. reflection panoramas (equirectangular)
for o in s.objects:
    if o.name.startswith("glass_"): o.hide_render = False
cam = bpy.data.cameras.new("pano"); cam.type = "PANO"
try: cam.panorama_type = "EQUIRECTANGULAR"
except Exception: cam.cycles.panorama_type = "EQUIRECTANGULAR"
co = bpy.data.objects.new("pano", cam); s.collection.objects.link(co); s.camera = co
co.rotation_euler = (1.5708, 0, -1.5708)  # equirect centre looking +y (forward into the hall)
s.render.resolution_x, s.render.resolution_y = 2048, 1024
s.cycles.samples = int(os.environ.get("PANO_SAMPLES", max(64, SAMPLES // 2))); s.cycles.use_denoising = True
s.render.image_settings.file_format = "HDR"
s.view_settings.view_transform = "Standard"
for name, loc in {"hall": (0, -4, 4.5), "investment": (-32, -4, 2.2), "performance": (32, -4, 9.2)}.items():
    co.location = loc
    s.render.filepath = os.path.join(out, f"pano_{name}.hdr")
    bpy.ops.render.render(write_still=True)
    print("panorama", name, flush=True)

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out, "exchange_baked.blend"))
print("done", flush=True)

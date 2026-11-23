"""
Export the baked exchange for the web.
Usage: python export.py <bakedir> <outdir> <texdir>

  exchange.glb      geometry only (no materials); arch_* carry the lightmap atlas as TEXCOORD_0; screens their display UVs
  lightmap.webp     irradiance encoded as sRGB 8-bit over [0, scale]; scale written to exchange.json
  pano_*.hdr        reflection panoramas, downsized to 1024 × 512 (RGBE)
  tex/*.webp        scanned PBR maps (colour 2K, normal and roughness 1K)
"""
import bpy  # noqa: first
import json, os, sys
import numpy as np

bakedir, outdir, texdir = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(os.path.join(outdir, "tex"), exist_ok=True)
from PIL import Image  # noqa: E402  (installed in Blender's venv)

bpy.ops.wm.open_mainfile(filepath=os.path.join(bakedir, "exchange_baked.blend"))
s = bpy.context.scene

# ---------- lightmap → sRGB WebP over [0, scale]
lm = bpy.data.images.load(os.path.join(bakedir, "lightmap.exr"))
w, h = lm.size
px = np.array(lm.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1, :, :3]
lum = px.mean(axis=2)
scale = float(np.percentile(lum[lum > 1e-5], 99.7) * 1.15)
enc = np.clip(px / scale, 0, 1)
srgb = np.where(enc <= 0.0031308, enc * 12.92, 1.055 * np.power(enc, 1 / 2.4) - 0.055)
lm8 = Image.fromarray((srgb * 255 + 0.5).astype(np.uint8))
lm8.save(os.path.join(outdir, "lightmap.webp"), quality=94, method=6)
lm8.resize((w // 2, h // 2), Image.LANCZOS).save(os.path.join(outdir, "lightmap_lo.webp"), quality=92, method=6)
print(f"lightmap {w}x{h} scale {scale:.4f}", flush=True)

# ---------- panoramas
panos = []
for f in sorted(os.listdir(bakedir)):
    if f.startswith("pano_") and f.endswith(".hdr"):
        im = bpy.data.images.load(os.path.join(bakedir, f)); im.scale(1024, 512)
        im.filepath_raw = os.path.join(outdir, f); im.file_format = "HDR"; im.save(); panos.append(f[5:-4])
print("panoramas", panos, flush=True)

# ---------- textures
for f in sorted(os.listdir(texdir)):
    stem = f.rsplit(".", 1)[0]
    kind = next((k for k in ("diffuse", "nor_gl", "rough") if stem.endswith("_" + k)), None)
    if kind is None: continue
    slug = stem[: -len(kind) - 1]
    size = 2048 if kind == "diffuse" else 1024
    im = Image.open(os.path.join(texdir, f)).convert("RGB").resize((size, size), Image.LANCZOS)
    im.save(os.path.join(outdir, "tex", f"{slug}_{kind}.webp"), quality=82 if kind == "diffuse" else 90, method=6)
    im.resize((size // 2, size // 2), Image.LANCZOS).save(os.path.join(outdir, "tex", f"{slug}_{kind}_lo.webp"), quality=80, method=6)
print("textures written", flush=True)

# ---------- city backdrop seen through the glazing: the same HDRI as the bake, tone-mapped (AgX-like) to 8-bit
hdri = os.environ.get("EXCHANGE_HDRI")
if hdri:
    im = bpy.data.images.load(hdri); bw, bh = im.size
    px = np.array(im.pixels[:], dtype=np.float32).reshape(bh, bw, 4)[::-1, :, :3]
    x = px * float(os.environ.get("BACKDROP_EXPOSURE", "1.0"))
    t = x / (1 + x * 0.55)  # gentle shoulder for the bright sky
    t = np.where(t <= 0.0031308, t * 12.92, 1.055 * np.power(np.clip(t, 0, None), 1 / 2.4) - 0.055)
    b8 = Image.fromarray((np.clip(t, 0, 1) * 255 + 0.5).astype(np.uint8))
    b8.save(os.path.join(outdir, "backdrop.jpg"), quality=86); b8.resize((bw // 2, bh // 2), Image.LANCZOS).save(os.path.join(outdir, "backdrop_lo.jpg"), quality=84)
    print("backdrop", bw, bh, flush=True)

# ---------- geometry
bpy.ops.object.select_all(action="DESELECT")
keep = ("arch_", "ext_", "glass_", "light_", "screen_", "anchor_")
for o in s.objects:
    if o.name.startswith(keep): o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(outdir, "exchange.glb"), export_format="GLB", use_selection=True,
                          export_materials="NONE", export_texcoords=True, export_normals=True, export_yup=True, export_extras=True)
anchors = {o.name[7:]: [round(o.location.x, 3), round(o.location.z, 3), round(-o.location.y, 3)] for o in s.objects if o.name.startswith("anchor_")}
json.dump({"lightmapScale": scale, "panoramas": panos, "anchors": anchors}, open(os.path.join(outdir, "exchange.json"), "w"), indent=1)
print("exported", flush=True)

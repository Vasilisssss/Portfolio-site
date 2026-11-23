"""
Finish and package the rendered film for the site: photographic grade (as approved for the prototype),
WebP at two sizes, and public/film/manifest.json with the label positions per frame.

Usage: python encode.py <render dir with holds/ seq/ frames.json> <film-data.json> <public/film>
"""
import hashlib, json, os, sys
import numpy as np
from PIL import Image, ImageFilter

SRC, DATA, DST = sys.argv[1], sys.argv[2], sys.argv[3]

def grade(src, ev=0.25, seed=3, grain=1.0):
    a = np.asarray(Image.open(src)).astype(np.float32)
    a = a / (65535.0 if a.max() > 255 else 255.0); a = a[..., :3]; h, w, _ = a.shape
    a = np.clip(a ** 2.2 * (2.0 ** ev), 0, None) ** (1 / 2.2)
    a = np.clip((a - 0.012) / (1 - 0.012), 0, None); a = a / (1 + 0.08 * a)
    a = a + 0.06 * np.sin(np.pi * np.clip(a, 0, 1)) * (np.clip(a, 0, 1) - 0.5) * 2
    L = (a * [0.2126, 0.7152, 0.0722]).sum(-1, keepdims=True)
    a = a + (1 - L) ** 2 * np.array([-0.006, 0.0, 0.010]) + L ** 2 * np.array([0.010, 0.004, -0.008])
    hi = np.clip(L - 0.78, 0, None) / 0.22
    glow = Image.fromarray((np.clip(a * hi, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(w / 160))
    a = a + np.asarray(glow).astype(np.float32) / 255 * 0.18
    def scale_channel(ch, s):
        img = Image.fromarray(np.clip(ch, 0, 1).astype(np.float32), mode="F"); nw, nh = round(w * s), round(h * s)
        r = img.resize((nw, nh), Image.BICUBIC); x0, y0 = (nw - w) // 2, (nh - h) // 2
        return np.asarray(r.crop((x0, y0, x0 + w, y0 + h)), dtype=np.float32)
    k = 0.35 * (w / 1920) / (0.5 * np.hypot(w, h))
    a[..., 0] = scale_channel(a[..., 0], 1 + k * 2); a[..., 2] = scale_channel(a[..., 2], 1 - k * 2)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    r2 = ((xx - w / 2) / (w / 2)) ** 2 * 0.62 + ((yy - h / 2) / (h / 2)) ** 2 * 0.38
    a = a * (1 - 0.27 * r2[..., None] ** 1.3)
    if grain > 0:
        g = np.random.default_rng(seed).normal(0, 1, (h, w)).astype(np.float32)
        g = (4 * g + np.roll(g, 1, 0) + np.roll(g, -1, 0) + np.roll(g, 1, 1) + np.roll(g, -1, 1)) / 8 * 1.9
        L = (a * [0.2126, 0.7152, 0.0722]).sum(-1, keepdims=True)
        a = a + g[..., None] * 0.011 * grain * (0.35 + np.sin(np.pi * np.clip(L, 0, 1)))
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))

def fingerprint(d):
    """the figures the film shows; must match tools/film/check.mjs"""
    s = d.get("summary") or {}
    parts = [f"{h['label']}|{h['weight']:.4f}|{'' if h['returnPct'] is None else format(h['returnPct'], '.4f')}|{h.get('value', '')}" for h in d["holdings"]]
    parts += [f"{p['date']}|{p['index']:.3f}" for p in d["history"]]
    parts += [f"{k}={s.get(k, '')}" for k in ("asOf", "currency", "value", "invested", "pnl", "totalReturn", "twr")]
    return hashlib.sha256("\n".join(parts).encode()).hexdigest()[:16]

plan = json.load(open(os.path.join(SRC, "frames.json")))
data = json.load(open(DATA))["data"]
for d in ("holds", "holds-lo", "seq", "seq-lo"): os.makedirs(os.path.join(DST, d), exist_ok=True)
holds = []
for h in plan["holds"]:
    i = int(h["u"]); src = os.path.join(SRC, "holds", f"hold_{i}.png")
    if not os.path.exists(src): print("missing", src); continue
    im = grade(src, seed=100 + i)
    im.save(os.path.join(DST, "holds", f"hold_{i}.webp"), quality=88, method=6)
    im.resize((1280, 720), Image.LANCZOS).save(os.path.join(DST, "holds-lo", f"hold_{i}.webp"), quality=86, method=6)
    holds.append({"u": h["u"], "hi": f"holds/hold_{i}.webp", "lo": f"holds-lo/hold_{i}.webp", "labels": h["labels"]})
frames = []
for f in plan["frames"]:
    i = f["i"]; src = os.path.join(SRC, "seq", f"f{i:04d}.png")
    if not os.path.exists(src): print("missing frame", i); break
    im = grade(src, seed=1000 + i, grain=0.6)
    im.save(os.path.join(DST, "seq", f"f{i:04d}.webp"), quality=80, method=5)
    im.resize((854, 480), Image.LANCZOS).save(os.path.join(DST, "seq-lo", f"f{i:04d}.webp"), quality=78, method=5)
    frames.append({"u": f["u"], "labels": f["labels"]})
manifest = {"w": 1920, "h": 1080, "asOf": (data.get("summary") or {}).get("asOf"), "fingerprint": fingerprint(data), "holds": holds,
            "seq": {"w": 1280, "h": 720, "hi": "seq/f{i}.webp", "lo": "seq-lo/f{i}.webp", "frames": frames}}
json.dump(manifest, open(os.path.join(DST, "manifest.json"), "w"), separators=(",", ":"))
size = sum(os.path.getsize(os.path.join(r, x)) for r, _, fs in os.walk(DST) for x in fs)
print(f"film: {len(holds)} holds, {len(frames)} frames, {size / 1e6:.1f} MB")

"""
Photographic finishing for the Cycles stills: the treatment a photographer's raw developer would apply, nothing more.
Levels and gentle S-curve, restrained split tone, highlight halation, lens vignette, sub-pixel lateral chromatic
aberration and luminance grain. Usage: python grade.py <in.png> <out.jpg> [exposure_stops]
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

src, dst = sys.argv[1], sys.argv[2]
ev = float(sys.argv[3]) if len(sys.argv) > 3 else 0.0
im = Image.open(src)
a = np.asarray(im).astype(np.float32)
a = a / (65535.0 if a.max() > 255 else 255.0)
a = a[..., :3]
h, w, _ = a.shape

# exposure in (approximate) linear light, then back to display
lin = a ** 2.2 * (2.0 ** ev)
a = np.clip(lin, 0, None) ** (1 / 2.2)

# levels: black point 0.012, soft shoulder; S-curve around mid grey
a = np.clip((a - 0.012) / (1 - 0.012), 0, None)
a = a / (1 + 0.08 * a)
a = a + 0.06 * np.sin(np.pi * np.clip(a, 0, 1)) * (np.clip(a, 0, 1) - 0.5) * 2

# split tone: neutral-cool shadows, faintly warm highlights
L = (a * [0.2126, 0.7152, 0.0722]).sum(-1, keepdims=True)
a = a + (1 - L) ** 2 * np.array([-0.006, 0.0, 0.010]) + L ** 2 * np.array([0.010, 0.004, -0.008])

# halation: highlights bleed softly (lens and sensor stack), never a game-style bloom
hi = np.clip(L - 0.78, 0, None) / 0.22
glow = Image.fromarray((np.clip(a * hi, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(w / 160))
a = a + np.asarray(glow).astype(np.float32) / 255 * 0.18

# lateral chromatic aberration: red scaled out, blue in, by 0.35 px at the corners
def scale_channel(ch, s):
    img = Image.fromarray(np.clip(ch, 0, 1).astype(np.float32), mode="F")
    nw, nh = round(w * s), round(h * s)
    r = img.resize((nw, nh), Image.BICUBIC)
    x0, y0 = (nw - w) // 2, (nh - h) // 2
    return np.asarray(r.crop((x0, y0, x0 + w, y0 + h)), dtype=np.float32)
k = 0.35 / (0.5 * np.hypot(w, h))
a[..., 0] = scale_channel(a[..., 0], 1 + k * 2)
a[..., 2] = scale_channel(a[..., 2], 1 - k * 2)

# vignette: natural cos^4-like falloff, about 0.45 stop in the corners
yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
r2 = ((xx - w / 2) / (w / 2)) ** 2 * 0.62 + ((yy - h / 2) / (h / 2)) ** 2 * 0.38
a = a * (1 - 0.27 * r2[..., None] ** 1.3)

# grain: luminance only, finer than a pixel at 1080p, stronger in the mids
rng = np.random.default_rng(3)
g = rng.normal(0, 1, (h, w)).astype(np.float32)
g = (4 * g + np.roll(g, 1, 0) + np.roll(g, -1, 0) + np.roll(g, 1, 1) + np.roll(g, -1, 1)) / 8 * 1.9  # ~0.5 px grain clumps
L = (a * [0.2126, 0.7152, 0.0722]).sum(-1, keepdims=True)
a = a + g[..., None] * 0.011 * (0.35 + np.sin(np.pi * np.clip(L, 0, 1)))

out = Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))
out.save(dst, quality=93, subsampling=0, optimize=True)
print("graded", dst, out.size)

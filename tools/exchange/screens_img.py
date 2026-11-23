"""
Screen content for the photographic renders, drawn from the real portfolio snapshot (22 Nov 2026, Interactive Brokers):
the video wall, the ticker band and several desk-monitor layouts. Nothing simulated: these are the same figures the site shows.
Usage: python screens_img.py <outdir> <fontdir>
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

out, fontdir = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
F = lambda w, s: ImageFont.truetype(os.path.join(fontdir, "geist-sans", f"Geist-{w}.ttf"), s)
M = lambda s: ImageFont.truetype(os.path.join(fontdir, "geist-mono", "GeistMono-Regular.ttf"), s)
BG, INK, MUTE, LIME, CORAL, LINE = (7, 8, 10), (243, 242, 237), (140, 144, 143), (215, 255, 63), (255, 122, 102), (40, 42, 46)

SUMMARY = {"value": "€187.94", "invested": "€206.63", "pnl": "−€18.69", "twr": "−21.2%", "ret": "−9.0%", "asof": "22 NOV 2026"}
HOLD = [("ANT", "Anthropic PBC (Class A)", "Stocks", 0.852, -0.093, "€160.11"), ("GOOG", "Alphabet Inc. (Class C)", "Stocks", 0.108, -0.041, "€20.30"),
        ("VCSHA", "Vanguard EUR Cash ETF", "ETFs", 0.021, -0.236, "€4.01"), ("CASH", "Cash (EUR)", "Cash", 0.019, 0.0, "€3.52")]
INDEX = [("2026-02", 100.0), ("2026-03", 100.0), ("2026-04", 100.0), ("2026-05", 100.0), ("2026-06", 100.0), ("2026-07", 91.23), ("2026-08", 99.9), ("2026-09", 87.41), ("2026-10", 87.5), ("2026-11", 78.77)]
pct = lambda v, s=True: ("+" if s and v > 0 else "−" if v < 0 else "") + f"{abs(v) * 100:.1f}%"
tone = lambda r: MUTE if abs(r) < 0.0005 else LIME if r > 0 else CORAL

def chart(d, x, y, w, h, lw=6, labels=True, fs=24):
    lo, hi = 74, 104
    X = lambda i: x + i / (len(INDEX) - 1) * w; Y = lambda v: y + h - (v - lo) / (hi - lo) * h
    for v in (80, 90, 100):
        d.line([(x, Y(v)), (x + w, Y(v))], fill=LINE, width=2)
        if labels: d.text((x + w + 14, Y(v) - fs * 0.6), f"{v}", font=M(fs), fill=MUTE)
    pts = [(X(i), Y(v)) for i, (_, v) in enumerate(INDEX)]
    d.polygon(pts + [(x + w, y + h), (x, y + h)], fill=(24, 30, 12))
    d.line(pts, fill=LIME, width=lw, joint="curve")
    cx, cy = pts[-1]; r = lw * 1.6; d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=LIME)
    if labels:
        d.text((x, y + h + 14), "FEB 2026", font=M(fs), fill=MUTE); d.text((x + w - fs * 5.2, y + h + 14), "NOV 2026", font=M(fs), fill=MUTE)

# ---------- video wall (9.6 × 3.0 m → 3840 × 1200)
W, H = 3840, 1200
im = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(im)
d.text((120, 110), "PORTFOLIO", font=M(40), fill=LIME); d.text((400, 110), f"AS OF {SUMMARY['asof']}  ·  EUR", font=M(40), fill=MUTE)
d.text((112, 200), SUMMARY["value"], font=F("Regular", 300), fill=INK)
for i, (k, v, c) in enumerate([("INVESTED CAPITAL", SUMMARY["invested"], INK), ("PROFIT / LOSS", SUMMARY["pnl"], CORAL), ("TIME-WEIGHTED RETURN", SUMMARY["twr"], CORAL)]):
    x = 120 + i * 470; d.text((x, 620), k, font=M(30), fill=MUTE); d.text((x, 670), v, font=F("Regular", 110), fill=c)
d.line([(1560, 100), (1560, H - 100)], fill=LINE, width=3)
d.text((1640, 110), "MONTH-END INDEX · REBASED TO 100", font=M(36), fill=MUTE)
chart(d, 1640, 220, 1180, 760, lw=9, fs=32)
d.line([(3010, 100), (3010, H - 100)], fill=LINE, width=3)
d.text((3080, 110), "ALLOCATION", font=M(36), fill=MUTE)
for i, (t, n, c, w, r, v) in enumerate(HOLD):
    y = 230 + i * 210
    d.text((3080, y), t, font=F("Medium", 70), fill=INK); rt = pct(r); d.text((W - 120 - d.textlength(rt, font=M(44)), y + 14), rt, font=M(44), fill=tone(r))
    d.rectangle([3080, y + 100, W - 120, y + 112], fill=(30, 32, 34)); d.rectangle([3080, y + 100, 3080 + (W - 3200) * w, y + 112], fill=INK)
    d.text((3080, y + 130), f"{w * 100:.1f}% of capital  ·  {v}", font=M(32), fill=MUTE)
im.save(os.path.join(out, "wall.png"))

# ---------- ticker band (9.6 × 0.3 m → 3840 × 120)
im = Image.new("RGB", (3840, 120), BG); d = ImageDraw.Draw(im); x = 40
items = [(t, pct(r), tone(r)) for t, _, _, _, r, _ in HOLD] + [("STOCKS", "96.0%", INK), ("ETFS", "2.1%", INK), ("CASH", "1.9%", INK), ("TWR", SUMMARY["twr"], CORAL)]
while x < 3840:
    for t, v, c in items:
        d.text((x, 30), t, font=F("Medium", 54), fill=INK); x += d.textlength(t, font=F("Medium", 54)) + 22
        d.text((x, 36), v, font=M(46), fill=c); x += d.textlength(v, font=M(46)) + 40
        d.rectangle([x, 54, x + 10, 64], fill=LIME); x += 50
im.save(os.path.join(out, "ticker.png"))

# ---------- desk monitors (16:9, 1600 × 900): six layouts
def monitor(i):
    im = Image.new("RGB", (1600, 900), BG); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 1600, 56], fill=(16, 17, 20)); d.text((28, 14), ["PORTFOLIO · OVERVIEW", "HOLDING", "PERFORMANCE", "ALLOCATION", "HOLDING", "POSITIONS"][i % 6], font=M(24), fill=MUTE)
    d.text((1600 - 280, 14), SUMMARY["asof"], font=M(24), fill=MUTE)
    k = i % 6
    if k == 0:
        d.text((60, 110), "TOTAL VALUE", font=M(26), fill=MUTE); d.text((54, 150), SUMMARY["value"], font=F("Regular", 150), fill=INK)
        for j, (a, b, c) in enumerate([("INVESTED", SUMMARY["invested"], INK), ("P/L", SUMMARY["pnl"], CORAL), ("TWR", SUMMARY["twr"], CORAL)]):
            d.text((60 + j * 300, 380), a, font=M(24), fill=MUTE); d.text((60 + j * 300, 415), b, font=F("Regular", 58), fill=c)
        chart(d, 60, 560, 1380, 250, lw=5, labels=False)
    elif k in (1, 4):
        t, n, c, w, r, v = HOLD[0 if k == 1 else 1]
        d.text((60, 110), c.upper(), font=M(26), fill=LIME); d.text((54, 150), t, font=F("Medium", 170), fill=INK); d.text((60, 350), n, font=F("Regular", 44), fill=MUTE)
        for j, (a, b, col) in enumerate([("WEIGHT", f"{w * 100:.1f}%", INK), ("RETURN", pct(r), tone(r)), ("VALUE", v, INK)]):
            d.text((60 + j * 380, 520), a, font=M(26), fill=MUTE); d.text((60 + j * 380, 560), b, font=F("Regular", 90), fill=col)
        d.rectangle([60, 760, 1540, 776], fill=(30, 32, 34)); d.rectangle([60, 760, 60 + 1480 * w, 776], fill=INK)
    elif k == 2:
        d.text((60, 100), "MONTH-END INDEX", font=M(26), fill=MUTE); chart(d, 60, 170, 1320, 560, lw=7, fs=26)
    elif k == 3:
        d.text((60, 100), "ALLOCATION BY HOLDING", font=M(26), fill=MUTE)
        for j, (t, n, c, w, r, v) in enumerate(HOLD):
            y = 180 + j * 165; d.text((60, y), t, font=F("Medium", 64), fill=INK); rt = pct(r); d.text((1540 - d.textlength(rt, font=M(40)), y + 14), rt, font=M(40), fill=tone(r))
            d.rectangle([60, y + 90, 1540, y + 100], fill=(30, 32, 34)); d.rectangle([60, y + 90, 60 + 1480 * w, y + 100], fill=INK)
    else:
        d.text((60, 100), "POSITIONS", font=M(26), fill=MUTE)
        for j, (t, n, c, w, r, v) in enumerate(HOLD):
            y = 180 + j * 150
            d.text((60, y), t, font=F("Medium", 54), fill=INK); d.text((360, y + 12), n[:26], font=F("Regular", 34), fill=MUTE)
            d.text((960, y + 8), f"{w * 100:.1f}%", font=M(40), fill=INK); d.text((1180, y + 8), pct(r), font=M(40), fill=tone(r)); d.text((1400, y + 8), v, font=M(40), fill=INK)
            d.line([(60, y + 100), (1540, y + 100)], fill=LINE, width=2)
    im.save(os.path.join(out, f"monitor{i}.png"))
for i in range(6): monitor(i)
print("screens written to", out)

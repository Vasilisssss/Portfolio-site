"""
THE EXCHANGE — a full-scale (human-proportioned) stock-exchange interior, built procedurally in Blender.
Run with Blender's Python (bpy 5.x):  python tools/exchange/build.py  [--out exchange.blend]

Units: metres, Z up (glTF export converts to Y up). Eye height 1.65 m.
Plan (top view): front glass façade at y = -28, hall 48 × 48 m (x ∈ [-24, 24], y ∈ [-28, 20]), 22 m to the coffers.
  · Mezzanine at +7 m on the left, right and back, glass balustrades.
  · Grand central staircase (floor → back mezzanine), under the main screen wall.
  · Trading floor in the front half; the Capital installation plinth at the centre.
  · West wing (ground): Investment Gallery, through a 6 × 5 m portal.
  · East wing (upper, +7 m): Performance Gallery, through a mezzanine-level portal.
Object naming (read by the web loader):
  arch_<material>   static, lightmapped architecture (joined per material)
  ext_<material>    exterior skin (studio-lit when seen as the miniature)
  glass_*           glazing (not baked)          light_*  emissive fixtures (not baked)
  screen_<id>       planes the web app paints with live portfolio data
  anchor_<id>       empties marking where live installations stand
"""
import bpy  # must come first: it registers bmesh and mathutils
import bmesh, math, os, sys
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.environ.get("EXCHANGE_TEX", os.path.join(HERE, "..", "..", ".cache", "polyhaven", "tex"))

# ------------------------------------------------------------------ helpers
class MB:
    """Accumulates boxes/cylinders into one mesh per material."""
    def __init__(self, name):
        self.name = name; self.bm = bmesh.new()
    def box(self, x0, y0, z0, x1, y1, z1):
        if x1 < x0: x0, x1 = x1, x0
        if y1 < y0: y0, y1 = y1, y0
        if z1 < z0: z0, z1 = z1, z0
        v = [self.bm.verts.new(p) for p in [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]]
        for f in [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]:
            self.bm.faces.new([v[i] for i in f])
    def cbox(self, cx, cy, cz, sx, sy, sz):
        self.box(cx - sx / 2, cy - sy / 2, cz - sz / 2, cx + sx / 2, cy + sy / 2, cz + sz / 2)
    def cyl(self, a, b, r, seg=16):
        a, b = Vector(a), Vector(b); d = (b - a)
        m = bmesh.ops.create_cone(self.bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=d.length)
        q = Vector((0, 0, 1)).rotation_difference(d.normalized())
        bmesh.ops.rotate(self.bm, verts=m["verts"], cent=(0, 0, 0), matrix=q.to_matrix())
        bmesh.ops.translate(self.bm, verts=m["verts"], vec=(a + b) / 2)
    def plane(self, pts):
        """Quad with display UVs (pts in order: bottom-left, bottom-right, top-right, top-left as seen from the front)."""
        v = [self.bm.verts.new(p) for p in pts]; f = self.bm.faces.new(v)
        uv = self.bm.loops.layers.uv.verify()
        for loop, t in zip(f.loops, [(0, 0), (1, 0), (1, 1), (0, 1)]): loop[uv].uv = t
    def finish(self, mat, bevel=0.0, smooth_angle=30):
        me = bpy.data.meshes.new(self.name)
        bmesh.ops.remove_doubles(self.bm, verts=self.bm.verts, dist=1e-5)
        self.bm.to_mesh(me); self.bm.free()
        ob = bpy.data.objects.new(self.name, me); bpy.context.scene.collection.objects.link(ob)
        me.materials.append(mat)
        if bevel > 0:
            m = ob.modifiers.new("bevel", "BEVEL"); m.width = bevel; m.segments = 2; m.limit_method = "ANGLE"; m.harden_normals = False
            bpy.context.view_layer.objects.active = ob; ob.select_set(True)
            bpy.ops.object.modifier_apply(modifier="bevel"); ob.select_set(False)
        for p in me.polygons: p.use_smooth = False
        return ob

def texmat(name, slug, scale=1.0, rough_mul=1.0, tint=None, metallic=0.0):
    """PBR material from a Poly Haven set (colour, OpenGL normal, roughness). World-space box mapping for the preview renders."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; n = nt.nodes; l = nt.links
    bsdf = n["Principled BSDF"]; bsdf.inputs["Metallic"].default_value = metallic
    tc = n.new("ShaderNodeTexCoord"); mp = n.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (1 / scale,) * 3
    l.new(tc.outputs["Object"], mp.inputs["Vector"])
    def img(kind, non_color):
        p = os.path.join(TEX, f"{slug}_{kind}.jpg")
        if not os.path.exists(p): p = p[:-4] + ".png"
        if not os.path.exists(p): return None
        t = n.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(p, check_existing=True); t.projection = "BOX"; t.projection_blend = 0.15
        if non_color: t.image.colorspace_settings.name = "Non-Color"
        l.new(mp.outputs["Vector"], t.inputs["Vector"]); return t
    d = img("diffuse", False)
    if d is not None:
        if tint:
            mix = n.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"; mix.inputs["Factor"].default_value = 1
            l.new(d.outputs["Color"], mix.inputs[6]); mix.inputs[7].default_value = (*tint, 1); l.new(mix.outputs[2], bsdf.inputs["Base Color"])
        else:
            l.new(d.outputs["Color"], bsdf.inputs["Base Color"])
    r = img("rough", True)
    if r is not None:
        mul = n.new("ShaderNodeMath"); mul.operation = "MULTIPLY"; mul.inputs[1].default_value = rough_mul
        l.new(r.outputs["Color"], mul.inputs[0]); l.new(mul.outputs[0], bsdf.inputs["Roughness"])
    nn = img("nor_gl", True)
    if nn is not None:
        nm = n.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = 0.8
        l.new(nn.outputs["Color"], nm.inputs["Color"]); l.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
    m["web"] = slug
    return m

def flat(name, color, rough=0.5, metal=0.0, emit=None, strength=0.0, transmission=0.0, alpha=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = strength
    if transmission:
        b.inputs["Transmission Weight"].default_value = transmission; b.inputs["IOR"].default_value = 1.5
    if alpha < 1:
        b.inputs["Alpha"].default_value = alpha
    return m

def empty(name, loc, rot_z=0.0, size=1.0):
    e = bpy.data.objects.new(name, None); e.location = loc; e.rotation_euler = (0, 0, rot_z); e.empty_display_size = size
    bpy.context.scene.collection.objects.link(e); return e

# ------------------------------------------------------------------ scene
def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    M = {
        "granite": texmat("granite", "granite_tile", scale=2.4, rough_mul=0.45),          # polished dark granite, 1.2 m tiles
        "marble": texmat("marble", "marble_01", scale=3.0, rough_mul=0.6),               # honed warm stone cladding
        "concrete": texmat("concrete", "brushed_concrete", scale=2.0, rough_mul=1.0),    # architectural concrete
        "veneer": texmat("veneer", "flamed_black_veneer", scale=1.2, rough_mul=0.7),     # trading desks
        "walnut": texmat("walnut", "smoked_walnut_veneer", scale=1.6, rough_mul=0.75),   # gallery panelling
        "steel": flat("steel", (0.56, 0.57, 0.58), rough=0.32, metal=1.0),               # brushed stainless
        "blacksteel": flat("blacksteel", (0.035, 0.036, 0.04), rough=0.42, metal=1.0),   # blackened steel mullions, frames
        "plaster": flat("plaster", (0.62, 0.6, 0.57), rough=0.9),                         # soffits, return walls
        "glass": flat("glass", (0.85, 0.88, 0.9), rough=0.02, transmission=1.0),
        "light": flat("light", (1, 1, 1), emit=(1.0, 0.93, 0.84), strength=60.0),         # 3500 K linear LED
        "screen": flat("screen", (0.02, 0.02, 0.025), rough=0.25, emit=(0.55, 0.6, 0.65), strength=6.0),
    }
    for k in ("steel", "blacksteel", "plaster"): M[k]["web"] = k
    B = {k: MB(f"arch_{k}") for k in ("granite", "marble", "concrete", "veneer", "walnut", "steel", "blacksteel", "plaster")}
    E = {k: MB(f"ext_{k}") for k in ("marble", "concrete", "blacksteel")}
    G = MB("glass_main"); L = MB("light_main")
    screens = []

    H = 22.0      # hall coffers
    MZ = 7.0      # mezzanine floor level
    X0, X1, Y0, Y1 = -24.0, 24.0, -28.0, 20.0

    # ---------- floors & slabs
    B["granite"].box(X0, Y0, -0.4, X1, Y1, 0.0)                      # hall floor
    B["granite"].box(-40, -20, -0.4, X0, 12, 0.0)                    # west wing floor
    # mezzanine slabs (granite walking surface on a concrete slab with a stone fascia)
    for (a, b, c, d) in [(X0, -24, -20, 20), (20, -24, X1, 20), (-20, 16, 20, 20)]:
        B["granite"].box(a, b, MZ - 0.05, c, d, MZ)
        B["concrete"].box(a, b, MZ - 0.65, c, d, MZ - 0.05)
    B["granite"].box(24, -20, MZ - 0.05, 40, 12, MZ)                  # east wing upper floor
    B["concrete"].box(24, -20, MZ - 0.65, 40, 12, MZ - 0.05)

    # ---------- hall walls (marble to the mezzanine, concrete above)
    def wall(builder_low, builder_high, x0, y0, x1, y1, z_split, z_top, openings=()):
        """Thick wall with rectangular openings: openings = [(along0, along1, z0, z1)] measured from (x0,y0)."""
        horiz = abs(x1 - x0) > abs(y1 - y0)
        L_ = abs(x1 - x0) if horiz else abs(y1 - y0)
        th = 0.6
        def piece(builder, a0, a1, z0, z1):
            if a1 - a0 < 1e-3 or z1 - z0 < 1e-3: return
            if horiz: builder.box(min(x0, x1) + a0, y0 - th / 2, z0, min(x0, x1) + a1, y0 + th / 2, z1)
            else: builder.box(x0 - th / 2, min(y0, y1) + a0, z0, x0 + th / 2, min(y0, y1) + a1, z1)
        for (zb, zt, bld) in [(0, z_split, builder_low), (z_split, z_top, builder_high)]:
            cuts = sorted([o for o in openings if o[2] < zt and o[3] > zb])
            # split the band vertically around openings
            a = 0.0
            for (o0, o1, oz0, oz1) in cuts:
                piece(bld, a, o0, zb, zt)
                piece(bld, o0, o1, zb, max(zb, oz0))
                piece(bld, o0, o1, min(zt, oz1), zt)
                a = o1
            piece(bld, a, L_, zb, zt)
    wall(B["marble"], B["concrete"], X0, Y0, X0, Y1, MZ, H, openings=[(21, 27, 0, 5.0)])                       # west: gallery portal
    wall(B["marble"], B["concrete"], X1, Y0, X1, Y1, MZ, H, openings=[(21, 27, MZ, MZ + 5)])                   # east: upper portal only
    wall(B["marble"], B["concrete"], X0, Y1, X1, Y1, MZ, H)                                                     # back
    # front: glass curtain wall between stone end piers
    B["marble"].box(X0, Y0 - 0.3, 0, X0 + 3, Y0 + 0.3, H); B["marble"].box(X1 - 3, Y0 - 0.3, 0, X1, Y0 + 0.3, H)
    for i in range(15):  # mullions every 3 m, transoms every 3.5 m
        x = X0 + 3 + i * 3
        B["blacksteel"].box(x - 0.06, Y0 - 0.25, 0, x + 0.06, Y0 + 0.25, H)
    for z in [3.5, 7.0, 10.5, 14.0, 17.5]:
        B["blacksteel"].box(X0 + 3, Y0 - 0.2, z - 0.05, X1 - 3, Y0 + 0.2, z + 0.05)
    G.box(X0 + 3, Y0 - 0.012, 0, X1 - 3, Y0 + 0.012, H)
    B["blacksteel"].box(X0 + 3, Y0 - 0.3, H - 0.6, X1 - 3, Y0 + 0.3, H)   # head

    # ---------- coffered ceiling with skylight lantern
    SK = (-9, -10, 9, 6)   # skylight opening (x0, y0, x1, y1)
    # roof slab in four pieces around the lantern opening
    for (a, b, c, d) in [(X0, Y0, X1, SK[1]), (X0, SK[3], X1, Y1), (X0, SK[1], SK[0], SK[3]), (SK[2], SK[1], X1, SK[3])]:
        B["concrete"].box(a, b, H + 1.8, c, d, H + 2.3)
    # beams every 6 m both ways, 1.2 wide, 1.8 deep (soffit at H)
    for i in range(9):
        x = X0 + i * 6
        B["concrete"].box(x - 0.6, Y0, H, x + 0.6, Y1, H + 1.8)
    for j in range(9):
        y = Y0 + j * 6
        B["concrete"].box(X0, y - 0.6, H, X1, y + 0.6, H + 1.8)
    # linear LED slot in every coffer that is not under the skylight
    for i in range(8):
        for j in range(8):
            cx, cy = X0 + 3 + i * 6, Y0 + 3 + j * 6
            if SK[0] < cx < SK[2] and SK[1] < cy < SK[3]: continue
            L.box(cx - 1.6, cy - 0.06, H + 1.78, cx + 1.6, cy + 0.06, H + 1.8)
    # lantern: steel frame and glass roof 2.4 m above the slab
    lz = H + 2.3
    for x in [SK[0], SK[2]]:
        for y in [SK[1], SK[3]]:
            B["blacksteel"].box(x - 0.15, y - 0.15, lz, x + 0.15, y + 0.15, lz + 2.4)
    for t in range(7):
        x = SK[0] + t * (SK[2] - SK[0]) / 6
        B["blacksteel"].box(x - 0.06, SK[1], lz + 2.3, x + 0.06, SK[3], lz + 2.45)
    B["blacksteel"].box(SK[0], SK[1] - 0.1, lz + 2.3, SK[2], SK[1] + 0.1, lz + 2.45)
    B["blacksteel"].box(SK[0], SK[3] - 0.1, lz + 2.3, SK[2], SK[3] + 0.1, lz + 2.45)
    G.box(SK[0], SK[1], lz + 2.44, SK[2], SK[3], lz + 2.46)
    for (a, b, c, d) in [(SK[0], SK[1], SK[2], SK[1]), (SK[0], SK[3], SK[2], SK[3])]:
        G.box(a, b - 0.01, lz, c, d + 0.01, lz + 2.3)
    for x in [SK[0], SK[2]]:
        G.box(x - 0.01, SK[1], lz, x + 0.01, SK[3], lz + 2.3)

    # ---------- mezzanine: piers, fascia, balustrades
    for y in range(-24, 17, 8):
        for x in [-20, 20]:
            B["marble"].box(x - 0.6, y - 0.6, 0, x + 0.6, y + 0.6, MZ - 0.65)
    for x in range(-12, 13, 8):
        B["marble"].box(x - 0.6, 16 - 0.6, 0, x + 0.6, 16 + 0.6, MZ - 0.65)
    rail_h = 1.1
    def balustrade(a, b):
        a, b = Vector(a), Vector(b); d = (b - a); n = int(d.length / 1.5)
        G.box(min(a.x, b.x) - 0.01, min(a.y, b.y) - 0.01, MZ, max(a.x, b.x) + 0.01, max(a.y, b.y) + 0.01, MZ + rail_h - 0.06)
        B["steel"].cyl((a.x, a.y, MZ + rail_h), (b.x, b.y, MZ + rail_h), 0.03, 12)
        B["steel"].box(min(a.x, b.x) - 0.04, min(a.y, b.y) - 0.04, MZ, max(a.x, b.x) + 0.04, max(a.y, b.y) + 0.04, MZ + 0.08)
        for k in range(n + 1):
            p = a + d * (k / n)
            B["steel"].cyl((p.x, p.y, MZ), (p.x, p.y, MZ + rail_h), 0.018, 8)
    balustrade((-20, -24), (-20, 16)); balustrade((20, -24), (20, 16)); balustrade((-20, 16), (-3.2, 16)); balustrade((3.2, 16), (20, 16))
    # mezzanine ends (front)
    balustrade((X0, -24), (-20, -24)); balustrade((20, -24), (X1, -24))
    # fascia ticker screens (LED band on the mezzanine edges)
    def screen(name, pts):
        sb = MB(f"screen_{name}"); sb.plane(pts); screens.append(sb)
    screen("ticker_w", [(-19.93, -23.8, MZ - 0.6), (-19.93, 15.8, MZ - 0.6), (-19.93, 15.8, MZ - 0.12), (-19.93, -23.8, MZ - 0.12)])
    screen("ticker_e", [(19.93, 15.8, MZ - 0.6), (19.93, -23.8, MZ - 0.6), (19.93, -23.8, MZ - 0.12), (19.93, 15.8, MZ - 0.12)])
    # main screen wall above the back mezzanine (18 × 6.75 m, 16:6)
    screen("main", [(-9, 19.56, 9.2), (9, 19.56, 9.2), (9, 19.56, 15.95), (-9, 19.56, 15.95)])
    B["blacksteel"].box(-9.3, 19.6, 8.9, 9.3, 19.7, 16.25)

    # ---------- grand staircase: floor (y = 5) → back mezzanine (y = 16), 6 m wide
    steps = 40; run = 11.0 / steps; rise = MZ / steps
    for s in range(steps):
        y = 5 + s * run
        B["granite"].box(-3, y, 0, 3, y + run + 0.002, (s + 1) * rise)
    for x in [-3.15, 3.15]:  # stone stringers with steel handrails
        B["marble"].box(x - 0.15, 5, 0, x + 0.15, 16, 0.6)
        for s in range(0, steps, 2):
            y = 5 + s * run
            B["marble"].box(x - 0.15, y, 0, x + 0.15, y + run * 2, (s + 2) * rise + 0.4)
        B["steel"].cyl((x, 5, 1.0), (x, 16, MZ + 1.0), 0.03, 12)
    B["concrete"].box(-3, 5, -0.01, 3, 16, 0.0)

    # ---------- trading floor: 4 rows × 2 clusters of long desks with monitor stations
    k = 0
    for row in range(4):
        y = -22 + row * 3.6
        for side in (-1, 1):
            xa, xb = (side * 4, side * 16)
            x0_, x1_ = min(xa, xb), max(xa, xb)
            B["veneer"].box(x0_, y, 0.72, x1_, y + 1.4, 0.76)          # desk top
            B["veneer"].box(x0_, y + 1.3, 0.0, x1_, y + 1.4, 0.72)     # modesty panel
            for xl in [x0_ + 0.1, (x0_ + x1_) / 2, x1_ - 0.1]:
                B["blacksteel"].box(xl - 0.04, y + 0.1, 0, xl + 0.04, y + 1.3, 0.72)
            for m_ in range(6):  # monitors on arms
                mx = x0_ + 1 + m_ * 2
                B["blacksteel"].box(mx - 0.03, y + 1.05, 0.76, mx + 0.03, y + 1.1, 1.18)
                B["blacksteel"].box(mx - 0.32, y + 1.08, 0.95, mx + 0.32, y + 1.12, 1.33)
                screen(f"desk{k}", [(mx - 0.3, y + 1.077, 0.97), (mx + 0.3, y + 1.077, 0.97), (mx + 0.3, y + 1.077, 1.31), (mx - 0.3, y + 1.077, 1.31)])
                k += 1
            for c in range(5):  # chairs (simple, steel + walnut)
                cx = x0_ + 1.2 + c * 2.4
                B["blacksteel"].cyl((cx, y - 0.45, 0.02), (cx, y - 0.45, 0.45), 0.03, 10)
                B["walnut"].box(cx - 0.25, y - 0.7, 0.45, cx + 0.25, y - 0.2, 0.5)
                B["walnut"].box(cx - 0.25, y - 0.75, 0.5, cx + 0.25, y - 0.7, 1.0)
    # capital installation plinth (centre of the hall); the live sculpture stands on it
    B["marble"].cyl((0, -2, 0), (0, -2, 0.45), 6.2, 96)
    B["steel"].cyl((0, -2, 0.44), (0, -2, 0.47), 6.25, 96)
    empty("anchor_capital", (0, -2, 0.47))

    # ---------- west wing: Investment Gallery (ground, 16 × 32 m, 8 m high, walnut panels, skylight slot)
    WG = (-40, -20, -24, 12)
    for (x0, y0, x1, y1) in [(-40, -20, -40, 12), (-40, -20, -24, -20), (-40, 12, -24, 12)]:
        wall(B["walnut"], B["plaster"], x0, y0, x1, y1, 3.2, 8.0)
    B["concrete"].box(WG[0], WG[1], 8.0, -33, WG[3], 8.6); B["concrete"].box(-31, WG[1], 8.0, WG[2], WG[3], 8.6)   # roof with skylight slot x ∈ [-33, -31]
    G.box(-33, WG[1], 8.59, -31, WG[3], 8.61)
    for y in range(-18, 12, 4):
        L.box(-38.6, y - 1.2, 7.97, -38.4, y + 1.2, 8.0); L.box(-25.6, y - 1.2, 7.97, -25.4, y + 1.2, 8.0)
    empty("anchor_holdings", (-32, -4, 0.0))

    # ---------- east wing upper: Performance Gallery (+7 m, 16 × 32 m, stone long wall at x = 40)
    for (x0, y0, x1, y1) in [(40, -20, 40, 12), (24, -20, 40, -20), (24, 12, 40, 12)]:
        wall(B["marble"], B["plaster"], x0, y0, x1, y1, MZ + 4.0, MZ + 8.0)
    B["concrete"].box(24, -20, MZ + 8.0, 31, 12, MZ + 8.6); B["concrete"].box(33, -20, MZ + 8.0, 40, 12, MZ + 8.6)
    G.box(31, -20, MZ + 8.59, 33, 12, MZ + 8.61)
    for y in range(-18, 12, 4):
        L.box(25.4, y - 1.2, MZ + 7.97, 25.6, y + 1.2, MZ + 8.0)
    B["concrete"].box(24, -20, 0, 40, 12, MZ - 0.65)   # solid podium below the east gallery
    empty("anchor_performance", (39.7, -4, MZ + 2.2))

    # ---------- exterior skin (seen on the miniature): stone side walls, concrete parapets
    E["marble"].box(-40.3, -20.3, -0.4, -40, 12.3, 8.6); E["marble"].box(40, -20.3, -0.4, 40.3, 12.3, MZ + 8.6)
    E["concrete"].box(X0 - 0.3, Y0 - 0.3, H + 2.3, X1 + 0.3, Y0, H + 2.9)
    E["marble"].box(-40.3, -20.3, -0.4, X0, -20, 8.6); E["marble"].box(X1, -20.3, -0.4, 40.3, -20, MZ + 8.6)
    E["marble"].box(-40.3, 12, -0.4, 40.3, 12.3, 8.6); E["marble"].box(X0 - 0.3, Y1, -0.4, X1 + 0.3, Y1 + 0.3, H + 2.9)
    E["blacksteel"].box(X0 - 0.3, Y0 - 0.3, -0.4, X1 + 0.3, Y0 - 0.25, 0.0)

    # ---------- human-scale cues at the entrance: revolving door, door bays, reception counter
    rd = (0.0, Y0 + 0.9)  # drum centre, straddling the façade line
    B["blacksteel"].cyl((rd[0], rd[1], 3.0), (rd[0], rd[1], 3.25), 1.75, 64)          # canopy
    B["blacksteel"].cyl((rd[0], rd[1], -0.02), (rd[0], rd[1], 0.01), 1.75, 64)        # floor ring
    B["steel"].cyl((rd[0], rd[1], 0.0), (rd[0], rd[1], 3.0), 0.06, 16)                # central post
    for k in range(4):                                                                   # four glass wings in steel frames
        a = k * math.pi / 2 + 0.35
        ex_, ey_ = math.cos(a) * 1.6, math.sin(a) * 1.6
        G.plane([(rd[0], rd[1], 0.05), (rd[0] + ex_, rd[1] + ey_, 0.05), (rd[0] + ex_, rd[1] + ey_, 2.9), (rd[0], rd[1], 2.9)])
        B["steel"].cyl((rd[0] + ex_, rd[1] + ey_, 0.05), (rd[0] + ex_, rd[1] + ey_, 2.95), 0.025, 8)
    for s_ in range(48):                                                                 # curved glass drum (segments)
        a0, a1 = s_ / 48 * 2 * math.pi, (s_ + 1) / 48 * 2 * math.pi
        if math.sin((a0 + a1) / 2) < -0.35 or math.sin((a0 + a1) / 2) > 0.35:
            x0_, y0_ = rd[0] + math.cos(a0) * 1.75, rd[1] + math.sin(a0) * 1.75
            x1_, y1_ = rd[0] + math.cos(a1) * 1.75, rd[1] + math.sin(a1) * 1.75
            G.plane([(x0_, y0_, 0.0), (x1_, y1_, 0.0), (x1_, y1_, 3.0), (x0_, y0_, 3.0)])
    for dx in (-7.5, 7.5):                                                               # pairs of swing doors with steel frames
        B["blacksteel"].box(dx - 1.55, Y0 - 0.22, 2.75, dx + 1.55, Y0 + 0.22, 2.9)
        for xx in (dx - 1.55, dx, dx + 1.55):
            B["blacksteel"].box(xx - 0.05, Y0 - 0.22, 0, xx + 0.05, Y0 + 0.22, 2.9)
        for xx in (dx - 0.75, dx + 0.75):
            B["steel"].cyl((xx, Y0 + 0.3, 0.9), (xx, Y0 + 0.3, 1.9), 0.018, 10)
    # reception counter: a monolithic stone desk, walnut top
    B["marble"].box(-14, Y0 + 5.0, 0, -6, Y0 + 6.2, 1.05)
    B["walnut"].box(-14.1, Y0 + 4.9, 1.05, -5.9, Y0 + 6.3, 1.1)
    L.box(-13.9, Y0 + 4.92, 0.05, -6.1, Y0 + 4.95, 0.08)

    # ---------- Investment Gallery: vertical walnut slats on the long walls, stone benches
    for xw, sgn in ((-39.7, 1), (-24.3, -1)):
        for i in range(int(30 / 0.14)):
            y = -18 + i * 0.14
            if xw > -25 and -7.2 < y < -0.8: continue  # keep the portal clear
            B["walnut"].box(xw, y, 0.0, xw + sgn * 0.06, y + 0.07, 3.2)
    for y in (-12.0, 2.0):
        B["marble"].box(-33.4, y - 1.5, 0, -30.6, y + 1.5, 0.45)

    # ---------- architectural lighting layers
    # Performance Gallery: a recessed slot of wall-wash light grazing the long stone wall
    L.box(39.0, -19.6, MZ + 7.97, 39.25, 11.6, MZ + 8.0)
    B["concrete"].box(38.7, -20, MZ + 7.6, 39.0, 12, MZ + 8.0)
    # wall washers: linear grazing uplights in a floor slot along the stone walls
    for (x0, y0, x1, y1) in [(X0 + 0.32, -24, X0 + 0.42, Y1 - 0.4), (X1 - 0.42, -24, X1 - 0.32, Y1 - 0.4), (X0 + 0.4, Y1 - 0.42, X1 - 0.4, Y1 - 0.32)]:
        L.box(x0, y0, 0.0, x1, y1, 0.02)
    for (x0, y0, x1, y1) in [(X0 + 0.32, -24, X0 + 0.42, 16), (X1 - 0.42, -24, X1 - 0.32, 16)]:   # upper washers on the mezzanine
        L.box(x0, y0, MZ, x1, y1, MZ + 0.02)
    # cove under each mezzanine edge
    L.box(-20.05, -23.8, MZ - 0.68, -19.95, 15.8, MZ - 0.66); L.box(19.95, -23.8, MZ - 0.68, 20.05, 15.8, MZ - 0.66)
    L.box(-19.8, 15.95, MZ - 0.68, 19.8, 16.05, MZ - 0.66)
    # linear pendants over each desk run (housing + diffuser), hung on fine cables
    for row in range(4):
        y = -22 + row * 3.6 + 0.7
        for side in (-1, 1):
            xa, xb = sorted((side * 4.5, side * 15.5))
            B["blacksteel"].box(xa, y - 0.08, 3.05, xb, y + 0.08, 3.13)
            L.box(xa + 0.05, y - 0.05, 3.04, xb - 0.05, y + 0.05, 3.05)
            for xc in (xa + 0.5, xb - 0.5):
                B["steel"].cyl((xc, y, 3.13), (xc, y, H), 0.004, 6)
    # pilasters: concrete fins on the upper walls, on the beam grid
    for i in range(1, 8):
        x = X0 + i * 6
        if -9.6 < x < 9.6: continue
        B["concrete"].box(x - 0.35, Y1 - 0.9, MZ, x + 0.35, Y1 - 0.3, H)
    for j in range(1, 8):
        y = Y0 + j * 6
        for x in (X0 + 0.3, X1 - 0.9):
            B["concrete"].box(x, y - 0.35, MZ, x + 0.6, y + 0.35, H)

    objs = []
    for k_, mb in B.items(): objs.append(mb.finish(M[k_], bevel=0.012))
    for k_, mb in E.items(): objs.append(mb.finish(M[k_], bevel=0.012))
    objs.append(G.finish(M["glass"])); objs.append(L.finish(M["light"]))
    for sb in screens: objs.append(sb.finish(M["screen"]))
    return M, objs

def world_hdri(path, strength=1.0, rot=0.0):
    w = bpy.data.worlds.new("world"); bpy.context.scene.world = w; w.use_nodes = True
    n = w.node_tree.nodes; l = w.node_tree.links
    env = n.new("ShaderNodeTexEnvironment"); env.image = bpy.data.images.load(path)
    mp = n.new("ShaderNodeMapping"); mp.inputs["Rotation"].default_value = (0, 0, rot); tc = n.new("ShaderNodeTexCoord")
    l.new(tc.outputs["Generated"], mp.inputs["Vector"]); l.new(mp.outputs["Vector"], env.inputs["Vector"])
    bg = n["Background"]; bg.inputs["Strength"].default_value = strength; l.new(env.outputs["Color"], bg.inputs["Color"])

if __name__ == "__main__":
    out = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else os.path.join(HERE, "exchange.blend")
    build()
    hdri = os.environ.get("EXCHANGE_HDRI")
    if hdri: world_hdri(hdri, 1.0, math.radians(float(os.environ.get("EXCHANGE_HDRI_ROT", "0"))))
    bpy.ops.wm.save_as_mainfile(filepath=out)
    tris = sum(len(o.data.polygons) for o in bpy.data.objects if o.type == "MESH")
    print("saved", out, "objects", len(bpy.data.objects), "faces", tris)

"""
THE FILM WORLD — the approved photoreal exchange, extended into the whole journey, path-traced in Cycles.

Room: 46 × 20 m trading hall, 6.6 m timber ceiling, full-height glass onto Canary Wharf (real panorama).
  x 0–30   trading floor: desks, monitors and the video wall (approved prototype, unchanged)
  x 32–46  gallery wing: one brushed-steel monolith per holding, height ∝ its share of capital,
           and on the east wall a steel line tracing the month-end index, rebased to 100.
Studio: a dark set with a brushed-aluminium briefcase on a black stone pedestal; inside the case lies the same
hall at 1:110 (a collection instance of the room), which is how the camera enters the world and leaves it.
Every figure comes from the site's own privacy-filtered export (out/film-data.json via screens_img.py and DATA).

Usage: python world.py --out scene.blend          (build only; tools/film/render.py renders frames)
Env: PH (Poly Haven cache: tex/, models/), HDRI, SCREENS (screens_img.py output), DATA (film-data.json), FONTDIR
"""
import bpy  # noqa: first
import bmesh, math, os, random, sys
from mathutils import Vector, Matrix, Euler

PH = os.environ["PH"]; HDRI = os.environ["HDRI"]; SCREENS = os.environ["SCREENS"]
TEX = os.path.join(PH, "tex"); MODELS = os.path.join(PH, "models")
rnd = random.Random(7)
argv = sys.argv
OUT = argv[argv.index("--out") + 1]

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
import json
DATA = json.load(open(os.environ["DATA"]))["data"]
def new_col(name):
    c = bpy.data.collections.new(name); scene.collection.children.link(c); return c
ROOM, CEIL, LIGHTS, STUDIO = new_col("room"), new_col("ceiling"), new_col("lights"), new_col("studio")
col = ROOM  # MB.finish / place / instance link into the current `col`

# =============================================================== materials
def node_mat(name):
    m = bpy.data.materials.new(name); m.use_nodes = True
    return m, m.node_tree.nodes, m.node_tree.links, m.node_tree.nodes["Principled BSDF"]

def img_node(n, path, non_color=False, proj="BOX", blend=0.2):
    t = n.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(path, check_existing=True)
    if non_color: t.image.colorspace_settings.name = "Non-Color"
    t.projection = proj; t.projection_blend = blend; return t

def scanned(name, slug, tile, rough_mul=1.0, rough_add=0.0, normal=1.0, tint=None, coords="Object", spec=0.5, clearcoat=0.0, cc_rough=0.05):
    """PBR from a scan: colour, OpenGL normal, roughness, box-projected in metres (one texture = `tile` m)."""
    m, n, l, b = node_mat(name)
    tc = n.new("ShaderNodeTexCoord"); mp = n.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (1 / tile,) * 3
    l.new(tc.outputs[coords], mp.inputs["Vector"])
    def tex(kind, nc):
        for ext in ("jpg", "png"):
            p = os.path.join(TEX, f"{slug}_{kind}.{ext}")
            if os.path.exists(p):
                t = img_node(n, p, nc, "BOX" if coords == "Object" else "FLAT"); l.new(mp.outputs["Vector"], t.inputs["Vector"]); return t
        return None
    d = tex("diffuse", False)
    if d:
        if tint:
            mix = n.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"; mix.inputs["Factor"].default_value = 1
            l.new(d.outputs["Color"], mix.inputs[6]); mix.inputs[7].default_value = (*tint, 1); l.new(mix.outputs[2], b.inputs["Base Color"])
        else: l.new(d.outputs["Color"], b.inputs["Base Color"])
    r = tex("rough", True)
    if r:
        mm = n.new("ShaderNodeMapRange"); mm.inputs["To Min"].default_value = rough_add; mm.inputs["To Max"].default_value = rough_add + rough_mul
        l.new(r.outputs["Color"], mm.inputs["Value"]); l.new(mm.outputs["Result"], b.inputs["Roughness"])
    nm_t = tex("nor_gl", True)
    if nm_t:
        nm = n.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = normal
        l.new(nm_t.outputs["Color"], nm.inputs["Color"]); l.new(nm.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Specular IOR Level"].default_value = spec
    if clearcoat: b.inputs["Coat Weight"].default_value = clearcoat; b.inputs["Coat Roughness"].default_value = cc_rough
    return m

def flat(name, color, rough=0.5, metal=0.0, spec=0.5, coat=0.0):
    m, n, l, b = node_mat(name)
    b.inputs["Base Color"].default_value = (*color, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    b.inputs["Specular IOR Level"].default_value = spec
    if coat: b.inputs["Coat Weight"].default_value = coat
    return m

def emissive(name, color, strength, image=None):
    m = bpy.data.materials.new(name); m.use_nodes = True; n = m.node_tree.nodes; l = m.node_tree.links
    n.remove(n["Principled BSDF"]); out = n["Material Output"]
    em = n.new("ShaderNodeEmission"); em.inputs["Strength"].default_value = strength; em.inputs["Color"].default_value = (*color, 1)
    if image:
        t = n.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(image, check_existing=True); t.interpolation = "Cubic"
        uv = n.new("ShaderNodeTexCoord"); l.new(uv.outputs["UV"], t.inputs["Vector"]); l.new(t.outputs["Color"], em.inputs["Color"])
        # a real panel: emissive image plus a faint glossy cover glass
        gl = n.new("ShaderNodeBsdfGlossy"); gl.inputs["Roughness"].default_value = 0.08; gl.inputs["Color"].default_value = (0.04, 0.04, 0.045, 1)
        add = n.new("ShaderNodeAddShader"); l.new(em.outputs[0], add.inputs[0]); l.new(gl.outputs[0], add.inputs[1]); l.new(add.outputs[0], out.inputs["Surface"])
    else:
        l.new(em.outputs[0], out.inputs["Surface"])
    return m

def glass_mat():
    """Low-iron architectural glass; shadow rays pass (no caustic noise), camera and glossy rays refract/reflect."""
    m = bpy.data.materials.new("glass"); m.use_nodes = True; n = m.node_tree.nodes; l = m.node_tree.links
    n.remove(n["Principled BSDF"]); out = n["Material Output"]
    g = n.new("ShaderNodeBsdfGlass"); g.inputs["Roughness"].default_value = 0.0; g.inputs["IOR"].default_value = 1.52; g.inputs["Color"].default_value = (0.92, 0.96, 0.95, 1)
    tr = n.new("ShaderNodeBsdfTransparent"); tr.inputs["Color"].default_value = (0.86, 0.9, 0.89, 1)
    lp = n.new("ShaderNodeLightPath"); mx = n.new("ShaderNodeMixShader")
    l.new(lp.outputs["Is Shadow Ray"], mx.inputs["Fac"]); l.new(g.outputs[0], mx.inputs[1]); l.new(tr.outputs[0], mx.inputs[2]); l.new(mx.outputs[0], out.inputs["Surface"])
    return m

def keyboard_mat():
    m, n, l, b = node_mat("keyboard")
    tc = n.new("ShaderNodeTexCoord"); br = n.new("ShaderNodeTexBrick"); br.offset = 0.0; br.inputs["Scale"].default_value = 1
    br.inputs["Brick Width"].default_value = 0.0185; br.inputs["Row Height"].default_value = 0.0185; br.inputs["Mortar Size"].default_value = 0.0025
    br.inputs["Color1"].default_value = (0.03, 0.03, 0.033, 1); br.inputs["Color2"].default_value = (0.035, 0.035, 0.038, 1); br.inputs["Mortar"].default_value = (0.012, 0.012, 0.013, 1)
    l.new(tc.outputs["Object"], br.inputs["Vector"]); l.new(br.outputs["Color"], b.inputs["Base Color"])
    bump = n.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.35; l.new(br.outputs["Fac"], bump.inputs["Height"]); l.new(bump.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Roughness"].default_value = 0.45
    return m

M = {
    "floor": scanned("granite floor", "granite_tile_03", 2.4, rough_mul=0.14, rough_add=0.02, normal=0.35, spec=0.6),
    "limestone": scanned("limestone", "marble_01", 2.4, rough_mul=0.55, rough_add=0.25, normal=0.6),
    "walnut": scanned("smoked walnut", "smoked_walnut_veneer", 1.6, rough_mul=0.45, rough_add=0.2, normal=0.5, clearcoat=0.25, cc_rough=0.25),
    "oak": scanned("white oak", "white_oak_veneer", 1.2, rough_mul=0.5, rough_add=0.3, normal=0.4, tint=(1.05, 1.0, 0.94)),
    "desktop": scanned("black oak desk", "black_oak_veneer", 1.2, rough_mul=0.4, rough_add=0.18, normal=0.45, tint=(0.42, 0.4, 0.38), clearcoat=0.35, cc_rough=0.12),
    "fabric": scanned("wool herringbone", "poly_wool_herringbone", 0.25, rough_mul=0.25, rough_add=0.7, normal=1.0, tint=(0.33, 0.33, 0.35)),
    "bronze": flat("dark bronze anodised", (0.055, 0.045, 0.036), rough=0.32, metal=1.0),
    "steel": flat("brushed stainless", (0.62, 0.62, 0.62), rough=0.28, metal=1.0),
    "black_satin": flat("black satin powder coat", (0.018, 0.018, 0.02), rough=0.38),
    "plastic_dark": flat("monitor housing", (0.012, 0.012, 0.013), rough=0.55, spec=0.35),
    "keycap": flat("keycap PBT", (0.022, 0.022, 0.024), rough=0.62, spec=0.4),
    "ceramic": flat("glazed ceramic", (0.8, 0.79, 0.76), rough=0.08, spec=0.5),
    "aluminium": flat("space-grey anodised aluminium", (0.16, 0.16, 0.17), rough=0.36, metal=1.0),
    "acoustic": flat("acoustic ceiling", (0.025, 0.025, 0.027), rough=0.95),
    "plaster": flat("white plaster", (0.72, 0.71, 0.68), rough=0.9),
    "rubber": flat("rubber", (0.015, 0.015, 0.015), rough=0.7),
    "glass": glass_mat(),
    "led": emissive("linear led", (1.0, 0.9, 0.8), 30.0),
    "wall_screen": emissive("video wall", (1, 1, 1), 2.2, os.path.join(SCREENS, "wall.png")),
    "ticker": emissive("ticker", (1, 1, 1), 2.0, os.path.join(SCREENS, "ticker.png")),
}
MON = [emissive(f"monitor{i}", (1, 1, 1), 1.15, os.path.join(SCREENS, f"monitor{i}.png")) for i in range(6)]

# =============================================================== geometry helpers
class MB:
    def __init__(self, name): self.name = name; self.bm = bmesh.new(); self.uv = self.bm.loops.layers.uv.new("UVMap")
    def box(self, x0, y0, z0, x1, y1, z1):
        x0, x1 = sorted((x0, x1)); y0, y1 = sorted((y0, y1)); z0, z1 = sorted((z0, z1))
        v = [self.bm.verts.new(p) for p in [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]]
        for f in [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]: self.bm.faces.new([v[i] for i in f])
    def obox(self, c, size, rot_z=0.0, rot_x=0.0):
        """oriented box: centre, (sx, sy, sz), rotation about z then x"""
        sx, sy, sz = size
        R = Matrix.Rotation(rot_z, 3, "Z") @ Matrix.Rotation(rot_x, 3, "X")
        pts = [Vector(c) + R @ Vector((sx * a / 2, sy * b / 2, sz * d / 2)) for a, b, d in [(-1, -1, -1), (1, -1, -1), (1, 1, -1), (-1, 1, -1), (-1, -1, 1), (1, -1, 1), (1, 1, 1), (-1, 1, 1)]]
        v = [self.bm.verts.new(p) for p in pts]
        for f in [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]: self.bm.faces.new([v[i] for i in f])
    def cyl(self, a, b, r, seg=24):
        a, b = Vector(a), Vector(b); d = b - a
        mm = bmesh.ops.create_cone(self.bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=d.length)
        q = Vector((0, 0, 1)).rotation_difference(d.normalized())
        bmesh.ops.rotate(self.bm, verts=mm["verts"], cent=(0, 0, 0), matrix=q.to_matrix()); bmesh.ops.translate(self.bm, verts=mm["verts"], vec=(a + b) / 2)
    def quad(self, pts):
        v = [self.bm.verts.new(p) for p in pts]; f = self.bm.faces.new(v)
        for loop, t in zip(f.loops, [(0, 0), (1, 0), (1, 1), (0, 1)]): loop[self.uv].uv = t
    def finish(self, mat, bevel=0.0, segs=2, subdiv=0, smooth=False):
        me = bpy.data.meshes.new(self.name); bmesh.ops.remove_doubles(self.bm, verts=self.bm.verts, dist=1e-6); self.bm.to_mesh(me); self.bm.free()
        ob = bpy.data.objects.new(self.name, me); col.objects.link(ob); me.materials.append(mat)
        if bevel > 0:
            m = ob.modifiers.new("bevel", "BEVEL"); m.width = bevel; m.segments = segs; m.limit_method = "ANGLE"; m.angle_limit = math.radians(40)
        if subdiv:
            m = ob.modifiers.new("subd", "SUBSURF"); m.levels = subdiv; m.render_levels = subdiv
        if smooth or subdiv:
            for p in me.polygons: p.use_smooth = True
        if bevel > 0 and not subdiv:
            m2 = ob.modifiers.new("wn", "WEIGHTED_NORMAL"); m2.keep_sharp = True
            for p in me.polygons: p.use_smooth = True
        return ob

# =============================================================== the room
W, D, H = 46.0, 20.0, 6.6
B = {k: MB(k) for k in ["floor", "limestone", "walnut", "bronze", "plaster", "steel", "black_satin", "desktop", "plastic_dark", "rubber", "fabric", "glass"]}
B["floor"].box(-0.4, -0.6, -0.3, W + 0.4, D + 0.4, 0.0)

# back wall (y = D): limestone panels 1.6 × 0.8 m with 6 mm shadow gaps; video wall in the centre
VW = (11.2, 20.8, 2.3, 5.3)  # x0, x1, z0, z1  (9.6 × 3.0 m)
B["plaster"].box(-0.3, D + 0.05, -0.2, W + 0.3, D + 0.35, H + 0.6)
for i in range(int(W / 1.6) + 1):
    for j in range(int(H / 0.8) + 1):
        x0, z0 = i * 1.6 + 0.003, j * 0.8 + 0.003; x1, z1 = min(W - 0.003, x0 + 1.594), min(H + 0.3, z0 + 0.794)
        if x1 <= x0: continue
        if x1 > VW[0] - 0.15 and x0 < VW[1] + 0.15 and z1 > VW[2] - 0.5 and z0 < VW[3] + 0.15: continue
        B["limestone"].box(x0, D - 0.03, z0, x1, D + 0.05, z1)
B["bronze"].box(VW[0] - 0.06, D - 0.08, VW[2] - 0.06, VW[1] + 0.06, D - 0.02, VW[3] + 0.06)          # thin frame
B["bronze"].box(VW[0] - 0.06, D - 0.08, VW[2] - 0.5, VW[1] + 0.06, D - 0.02, VW[2] - 0.1)           # ticker housing
B["limestone"].box(VW[0] - 0.3, D - 0.03, VW[2] - 0.6, VW[1] + 0.3, D + 0.05, VW[2] - 0.5)
B["limestone"].box(VW[0] - 0.3, D - 0.03, VW[3] + 0.06, VW[1] + 0.3, D + 0.05, H + 0.3)
for x0, x1 in [(VW[0] - 0.3, VW[0] - 0.06), (VW[1] + 0.06, VW[1] + 0.3)]: B["limestone"].box(x0, D - 0.03, VW[2] - 0.6, x1, D + 0.05, VW[3] + 0.06)
wall = MB("wall_screen"); wall.quad([(VW[0], D - 0.085, VW[2]), (VW[1], D - 0.085, VW[2]), (VW[1], D - 0.085, VW[3]), (VW[0], D - 0.085, VW[3])]); wall.finish(M["wall_screen"])
tk = MB("ticker"); tk.quad([(VW[0] + 0.02, D - 0.085, VW[2] - 0.45), (VW[1] - 0.02, D - 0.085, VW[2] - 0.45), (VW[1] - 0.02, D - 0.085, VW[2] - 0.15), (VW[0] + 0.02, D - 0.085, VW[2] - 0.15)]); tk.finish(M["ticker"])

# west wall (x = 0): fluted smoked walnut, 60 mm flutes
B["plaster"].box(-0.35, -0.3, -0.2, -0.05, D + 0.3, H + 0.6)
for k in range(int(D / 0.06)):
    y = k * 0.06
    B["walnut"].box(-0.05, y + 0.004, 0.0, 0.0 if k % 2 else 0.018, y + 0.056, H + 0.3)
# east wall (x = W): limestone panels
B["plaster"].box(W + 0.05, -0.3, -0.2, W + 0.35, D + 0.3, H + 0.6)
for i in range(int(D / 1.6) + 1):
    for j in range(int(H / 0.8) + 1):
        y0, z0 = i * 1.6 + 0.003, j * 0.8 + 0.003
        B["limestone"].box(W - 0.05, y0, z0, W + 0.05, min(D - 0.003, y0 + 1.594), min(H + 0.3, z0 + 0.794))

# ceiling: white-oak baffles (40 × 220 mm at 150 mm) running from the façade inwards, linear LEDs in some gaps
CB = {k: MB(f"{k}_ceiling") for k in ["oak", "acoustic", "led", "bronze"]}
CB["acoustic"].box(-0.3, -0.3, H + 0.35, W + 0.3, D + 0.3, H + 0.5)
for k in range(int(W / 0.15)):
    x = 0.12 + k * 0.15
    CB["oak"].box(x - 0.02, 0.25, H, x + 0.02, D - 0.1, H + 0.22)
    if k % 16 == 8: CB["led"].box(x + 0.045, 0.6, H + 0.205, x + 0.105, D - 0.4, H + 0.215)
CB["led"].box(0.5, D - 0.45, H + 0.18, W - 0.5, D - 0.38, H + 0.21)                                 # wall-washer slot over the limestone
CB["led"].box(W - 0.45, 0.5, H + 0.18, W - 0.38, D - 0.5, H + 0.21)                                 # and over the performance wall
CB["bronze"].box(-0.1, 0.0, H, W + 0.1, 0.25, H + 0.5)                                                 # façade head

# façade (y = 0): full-height glazing, dark-bronze mullions at 1.6 m, transom at 3.3 m, stone sill
for k in range(int(W / 1.6) + 1):
    x = min(k * 1.6, W)
    B["bronze"].box(x - 0.025, -0.2, 0.0, x + 0.025, 0.02, H)
for z in (3.3,):
    B["bronze"].box(0, -0.15, z - 0.03, W, 0.01, z + 0.03)
B["limestone"].box(-0.1, -0.25, 0.0, W + 0.1, 0.06, 0.07)
B["glass"].box(0, -0.105, 0.07, W, -0.085, H)

# columns: three round columns in honed limestone with a bronze shadow ring at the base
for x in (8.0, 24.0):
    B["limestone"].cyl((x, 10.25, 0.04), (x, 10.25, H + 0.4), 0.32, 64)
    B["bronze"].cyl((x, 10.25, 0.0), (x, 10.25, 0.045), 0.325, 64)

# =============================================================== trading desks
monitors_by_mat = {i: MB(f"monitor_screens_{i}") for i in range(6)}
desk_lamps, chairs, kb_places, mouse_places, cup_places = [], [], [], [], []
def desk_pair(x0, x1, yc):
    """back-to-back desks: 2 × 0.8 m tops around a 0.12 m spine with monitor arms"""
    top_z = 0.74
    for side in (-1, 1):
        ya, yb = (yc + 0.06, yc + 0.86) if side > 0 else (yc - 0.86, yc - 0.06)
        B["desktop"].box(x0, ya, top_z - 0.032, x1, yb, top_z)
        for xl in (x0 + 0.05, (x0 + x1) / 2, x1 - 0.05):                       # panel legs
            B["black_satin"].box(xl - 0.015, min(ya, yb) + 0.06, 0.0, xl + 0.015, max(ya, yb) - 0.06, top_z - 0.032)
    B["black_satin"].box(x0, yc - 0.06, top_z, x1, yc + 0.06, top_z + 0.09)          # spine with cable trays
    seats = int((x1 - x0) / 1.6)
    for s in range(seats):
        cx = x0 + 0.8 + s * 1.6
        for side in (-1, 1):
            face = side  # monitors face the seat, away from the spine
            # monitor post + two 27" screens on arms
            B["steel"].cyl((cx, yc + side * 0.03, top_z + 0.09), (cx, yc + side * 0.03, 1.2), 0.016, 16)
            for dx in (-0.32, 0.32):
                mx, my, mz = cx + dx, yc + side * 0.17, 1.06
                tilt = math.radians(6) * face
                B["plastic_dark"].obox((mx, my, mz), (0.615, 0.03, 0.365), rot_z=math.radians(dx * 18 * face), rot_x=tilt)   # body + bezel
                B["black_satin"].obox((mx, my - face * 0.03, mz), (0.18, 0.03, 0.14), rot_z=0, rot_x=tilt)                # VESA mount
                # screen surface (slightly inset, facing the seat)
                R = Matrix.Rotation(math.radians(dx * 18 * face), 3, "Z") @ Matrix.Rotation(tilt, 3, "X")
                off = Vector((0, face * 0.0155, 0))
                pts = [Vector((mx, my, mz)) + R @ (Vector((a * 0.299, 0, b * 0.17)) + off) for a, b in [(-1, -1), (1, -1), (1, 1), (-1, 1)]]
                if face > 0: pts = [pts[1], pts[0], pts[3], pts[2]]
                monitors_by_mat[rnd.randrange(6)].quad(pts)
                B["black_satin"].obox((mx - dx * 0.5, my - face * 0.06, mz), (0.33, 0.022, 0.022))
            # keyboard and mouse
            ky = yc + side * 0.52
            kb_places.append(((cx - 0.05 + rnd.uniform(-0.05, 0.05), ky, top_z), (math.pi if side > 0 else 0.0) + rnd.uniform(-0.06, 0.06)))
            mouse_places.append(((cx + 0.3 + rnd.uniform(-0.03, 0.05), ky + rnd.uniform(-0.03, 0.03), top_z), (math.pi if side > 0 else 0.0) + rnd.uniform(-0.3, 0.3)))
            if rnd.random() < 0.3: cup_places.append(((cx + side * 0 - 0.55 + rnd.uniform(-0.1, 0.1), ky + side * 0.12, top_z), rnd.uniform(0, 6.28)))
            chairs.append((cx + rnd.uniform(-0.25, 0.25), yc + side * rnd.uniform(1.25, 1.55), math.pi / 2 * (1 - side) + rnd.uniform(-0.35, 0.35)))
            if rnd.random() < 0.12: desk_lamps.append((cx - 0.62, yc + side * 0.6, rnd.uniform(0, 6.28)))

for yc in (6.6, 13.4):
    desk_pair(2.6, 15.4, yc); desk_pair(16.6, 29.4, yc)

# =============================================================== task chairs (5-star base, gas lift, wool seat, mesh-like back)
def chair(x, y, rot):
    R = Matrix.Rotation(rot, 3, "Z"); C = Vector((x, y, 0))
    P = lambda v: C + R @ Vector(v)
    for k in range(5):  # star base
        a = k * 2 * math.pi / 5
        e = Vector((math.cos(a) * 0.33, math.sin(a) * 0.33, 0.07))
        B["black_satin"].cyl(P((0, 0, 0.1)), P(tuple(e)), 0.022, 10)
        B["rubber"].cyl(P((e.x, e.y, 0.0)), P((e.x, e.y, 0.05)), 0.026, 14)
    B["steel"].cyl(P((0, 0, 0.1)), P((0, 0, 0.42)), 0.025, 16)
    seat = MB("chair_seat"); seat.box(-0.24, -0.22, 0.43, 0.24, 0.24, 0.5)
    back = MB("chair_back"); back.box(-0.22, 0.27, 0.58, 0.22, 0.31, 1.0)
    for mb in (seat, back):
        for v in mb.bm.verts: v.co = P(tuple(v.co))
    s = seat.finish(M["fabric"], subdiv=2); b = back.finish(M["fabric"], subdiv=2)
    for side in (-1, 1):
        B["black_satin"].cyl(P((side * 0.26, 0.05, 0.47)), P((side * 0.26, 0.05, 0.66)), 0.014, 10)
        B["black_satin"].obox(tuple(P((side * 0.26, 0.0, 0.67))), (0.06, 0.24, 0.025), rot_z=rot)
    B["black_satin"].obox(tuple(P((0, 0.25, 0.55))), (0.05, 0.05, 0.16), rot_z=rot)
    return s, b
for (x, y, r) in chairs: chair(x, y, r)

# =============================================================== finish the built geometry
objs = {}
for k, mb in B.items():
    bevel = {"floor": 0, "glass": 0, "led": 0, "fabric": 0.0}.get(k, 0.004)
    if k in ("plastic_dark",): bevel = 0.006
    objs[k] = mb.finish(M[k], bevel=bevel, segs=3 if k in ("plastic_dark", "desktop") else 2)
for i, mb in monitors_by_mat.items(): mb.finish(MON[i])
col = CEIL
ceil_objs = {k: mb.finish(M[k], bevel=0.0 if k == "led" else 0.004) for k, mb in CB.items()}
col = ROOM

# =============================================================== desk objects (one modelled mesh, many linked copies)
def keyboard_mesh():
    """low-profile 105-key board: aluminium tray, PBT caps with real gaps (19.05 mm pitch)"""
    tray = MB("kb_tray"); tray.box(-0.153, -0.054, 0.0, 0.153, 0.054, 0.012); tray_o = tray.finish(M["aluminium"], bevel=0.003, segs=3)
    # legend atlas: 16 × 8 cells, light-grey print on the dark PBT caps
    from PIL import Image as PImage, ImageDraw, ImageFont
    LEG = [["esc", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "delete"],
           ["tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\"],
           ["caps", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "return"],
           ["shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "shift"],
           ["ctrl", "opt", "cmd", "", "cmd", "opt", "fn", "ctrl"]]
    cells = {}; atlas = PImage.new("L", (2048, 1024), 0); dr = ImageDraw.Draw(atlas)
    fnt = lambda sz: ImageFont.truetype(os.path.join(os.environ["FONTDIR"], "geist-sans", "Geist-Medium.ttf"), sz)
    k = 1
    for row in LEG:
        for t in row:
            if t not in cells and t:
                cx_, cy_ = (k % 16) * 128, (k // 16) * 128; cells[t] = (k % 16, k // 16); k += 1
                big = len(t) == 1; dr.text((cx_ + 18, cy_ + (14 if big else 18)), t, font=fnt(46 if big else 22), fill=255)
    lp = os.path.join(os.path.dirname(OUT), "keycap_legends.png"); atlas.save(lp)
    caps = MB("kb_caps"); p = 0.01905; cap = 0.0155
    def cell_uv(t, wfrac):
        if not t: return [(0.0, 0.99)] * 4
        u, v = cells[t]; u0, v1 = u / 16, 1 - v / 8; du = (1 / 16) * min(1.0, 1 / wfrac) if False else 1 / 16
        return [(u0, v1 - 1 / 8), (u0 + du * wfrac, v1 - 1 / 8), (u0 + du * wfrac, v1), (u0, v1)]
    rows = [(15, 1.0), (14, 1.0), (14, 1.0), (13, 1.0), (12, 1.0)]
    for r, (n, _) in enumerate(rows):
        y = 0.038 - r * p; x = -0.1429
        widths = [1.0] * n
        if r == 4: widths = [1.25, 1.25, 1.25, 6.25, 1.25, 1.25, 1.25, 1.25]
        if r == 3: widths = [2.25] + [1.0] * 10 + [2.75]
        if r == 2: widths = [1.75] + [1.0] * 11 + [2.25]
        if r == 1: widths = [1.5] + [1.0] * 12 + [1.5]
        if r == 0: widths = [1.0] * 13 + [2.0]
        for j, wdt in enumerate(widths):
            wm = wdt * p - (p - cap)
            caps.box(x, y - cap / 2, 0.012, x + wm, y + cap / 2, 0.0185); x += wdt * p
            caps.bm.faces.ensure_lookup_table(); faces = caps.bm.faces[-6:]
            t = LEG[r][j] if j < len(LEG[r]) else ""
            for f in faces:
                if f.normal.z > 0.5 or (f is faces[1]):
                    # top face loops are (x0,y0),(x1,y0),(x1,y1),(x0,y1) → legend reads upright from the typist's side
                    for loop, uv in zip(f.loops, cell_uv(t, min(wdt, 2.0))): loop[caps.uv].uv = uv
                else:
                    for loop in f.loops: loop[caps.uv].uv = (0.0, 0.99)
    km, n, l, bsdf = node_mat("keycap PBT")
    tx = n.new("ShaderNodeTexImage"); tx.image = bpy.data.images.load(lp); tx.image.colorspace_settings.name = "Non-Color"; tx.interpolation = "Cubic"
    uvn = n.new("ShaderNodeUVMap"); uvn.uv_map = "UVMap"; l.new(uvn.outputs["UV"], tx.inputs["Vector"])
    mx = n.new("ShaderNodeMix"); mx.data_type = "RGBA"; mx.inputs[6].default_value = (0.022, 0.022, 0.024, 1); mx.inputs[7].default_value = (0.55, 0.55, 0.53, 1)
    l.new(tx.outputs["Color"], mx.inputs["Factor"]); l.new(mx.outputs[2], bsdf.inputs["Base Color"]); bsdf.inputs["Roughness"].default_value = 0.6
    caps_o = caps.finish(km, bevel=0.0018, segs=3)
    caps_o.modifiers["bevel"].harden_normals = False
    return [tray_o, caps_o]
def mouse_mesh():
    m = MB("mouse"); m.box(-0.031, -0.055, 0.0, 0.031, 0.055, 0.028); o = m.finish(M["plastic_dark"], subdiv=3)
    sc = o.modifiers.new("shape", "SIMPLE_DEFORM"); sc.deform_method = "TAPER"; sc.factor = -0.5; sc.deform_axis = "Z"
    return [o]
def cup_mesh():
    """handleless ceramic cup: open lathe shell, slight taper, coffee surface 12 mm below the rim"""
    c = MB("cup"); prof = [(0.0, 0.0), (0.03, 0.0), (0.034, 0.004), (0.036, 0.02), (0.041, 0.09), (0.0412, 0.092), (0.0385, 0.092), (0.0365, 0.02), (0.0, 0.016)]
    bm = c.bm; n = 64; rings = []
    for r, z in prof: rings.append([bm.verts.new((r * math.cos(2 * math.pi * i / n), r * math.sin(2 * math.pi * i / n), z)) for i in range(n)])
    for a_, b_ in zip(rings, rings[1:]):
        for i in range(n): bm.faces.new([a_[i], a_[(i + 1) % n], b_[(i + 1) % n], b_[i]])
    o = c.finish(M["ceramic"], smooth=True)
    k = MB("coffee"); k.cyl((0, 0, 0.074), (0, 0, 0.0745), 0.0395, 48); ko = k.finish(flat("coffee", (0.035, 0.018, 0.008), rough=0.05))
    return [o, ko]
def instance(parts, places, name):
    for i, (loc, rot) in enumerate(places):
        for prt in parts:
            o = bpy.data.objects.new(f"{name}_{i}_{prt.name}", prt.data)
            for m in prt.modifiers:
                n = o.modifiers.new(m.name, m.type)
                for a in ("width", "segments", "limit_method", "angle_limit", "levels", "render_levels", "deform_method", "factor", "deform_axis", "thickness"):
                    if hasattr(m, a): setattr(n, a, getattr(m, a))
            o.location = loc; o.rotation_euler = (0, 0, rot); col.objects.link(o)
    for prt in parts: bpy.data.objects.remove(prt)
cup_places.append(((kb_places[2][0][0] - 0.32, kb_places[2][0][1] + 0.16, 0.74), 2.0))
instance(keyboard_mesh(), kb_places, "kb"); instance(mouse_mesh(), mouse_places, "mouse"); instance(cup_mesh(), cup_places, "cup")
HERO_KB = kb_places[2]  # used by the material close-up framing
print("hero keyboard", HERO_KB, flush=True)

# =============================================================== scanned models (Poly Haven)
def load_model(slug, variant=None):
    """append a scanned model; files with several variants side by side keep one (suffix `variant`), re-centred"""
    path = os.path.join(MODELS, slug, f"{slug}.blend"); before = set(bpy.data.images)
    with bpy.data.libraries.load(path, link=False) as (src, dst): dst.objects = list(src.objects)
    c = bpy.data.collections.new(slug + (f"_{variant}" if variant else ""))
    for o in dst.objects:
        if o is None or o.type not in ("MESH", "EMPTY"): continue
        if variant and not o.name.split(".")[0].endswith(f"_{variant}"): continue
        c.objects.link(o)
        if variant: c.instance_offset = (o.location.x, o.location.y, 0)
    for img in set(bpy.data.images) - before:
        p = img.filepath
        if p.startswith("//"): img.filepath = os.path.join(MODELS, slug, p[2:])
    return c
def place(c, loc, rot=0.0, s=1.0):
    e = bpy.data.objects.new(f"{c.name}_inst", None); e.instance_type = "COLLECTION"; e.instance_collection = c
    e.location = loc; e.rotation_euler = (0, 0, rot); e.scale = (s, s, s); col.objects.link(e); return e
models = {k: load_model(k) for k in ["potted_plant_01", "potted_plant_02", "potted_plant_04", "mid_century_lounge_chair", "modern_coffee_table_01", "side_table_01", "wall_clock"]}
models["pachira_aquatica_01"] = load_model("pachira_aquatica_01", "d"); models["pachira_c"] = load_model("pachira_aquatica_01", "c")
models["calathea_orbifolia_01"] = load_model("calathea_orbifolia_01", "a")
SOIL = flat("bark mulch", (0.03, 0.022, 0.016), rough=0.95)
def planter(x, y, size=0.62, h=0.52, round_=False):
    """honed limestone planter with a bark-mulch top; returns the soil height"""
    pl = MB("planter")
    if round_: pl.cyl((x, y, 0.0), (x, y, h), size / 2, 64)
    else: pl.box(x - size / 2, y - size / 2, 0.0, x + size / 2, y + size / 2, h)
    pl.finish(M["limestone"], bevel=0.008, segs=3)
    so = MB("soil"); so.cyl((x, y, h - 0.04), (x, y, h - 0.02), size / 2 - 0.03, 48) if round_ else so.box(x - size / 2 + 0.03, y - size / 2 + 0.03, h - 0.05, x + size / 2 - 0.03, y + size / 2 - 0.03, h - 0.025)
    so.finish(SOIL); return h - 0.03
# lounge in the south-east corner, by the glass
place(models["mid_century_lounge_chair"], (3.4, 2.2, 0), math.radians(160)); place(models["mid_century_lounge_chair"], (1.4, 3.6, 0), math.radians(232))
place(models["modern_coffee_table_01"], (2.2, 2.4, 0), -0.3); place(models["side_table_01"], (0.8, 1.4, 0), 0)
place(models["potted_plant_02"], (45.2, 1.0, 0), 0.8, 1.0)
# money trees along the glass, plants by the columns
for i, (x, r) in enumerate(((6.4, 0.4), (12.8, 2.1), (19.2, 4.0), (25.6, 5.3))): place(models["pachira_aquatica_01" if i % 2 == 0 else "pachira_c"], (x, 1.0, planter(x, 1.0)), r, 1.0 if i % 2 == 0 else 1.5)
for x in (8.0, 24.0): place(models["calathea_orbifolia_01"], (x + 0.95, 10.25, planter(x + 0.95, 10.25, 0.56, 0.42, True)), rnd.uniform(0, 6), 1.1)
place(models["potted_plant_01"], (1.0, 18.8, 0), 0.0); place(models["potted_plant_04"], (45.1, 18.9, 0), 1.0)
for k, z in enumerate((-1, 0, 1)): place(models["wall_clock"], (0.07, 10.0 + z * 1.4, 4.6), math.pi / 2)  # world clocks on the walnut wall

# =============================================================== light: low sun through the façade + city panorama
w = bpy.data.worlds.new("world"); scene.world = w; w.use_nodes = True
wn, wl = w.node_tree.nodes, w.node_tree.links
env = wn.new("ShaderNodeTexEnvironment"); env.image = bpy.data.images.load(HDRI)
mp = wn.new("ShaderNodeMapping"); mp.inputs["Rotation"].default_value = (0, 0, math.radians(float(os.environ.get("HDRI_ROT", "200")))); tc = wn.new("ShaderNodeTexCoord")
wl.new(tc.outputs["Generated"], mp.inputs["Vector"]); wl.new(mp.outputs["Vector"], env.inputs["Vector"])
bg = wn["Background"]; bg.inputs["Strength"].default_value = float(os.environ.get("SKY", "1.3")); wl.new(env.outputs["Color"], bg.inputs["Color"])
col = LIGHTS
def area(name, loc, size, energy, spread=120, color=(1.0, 0.9, 0.8), rot=(0, 0, 0)):
    L = bpy.data.lights.new(name, "AREA"); L.shape = "RECTANGLE"; L.size, L.size_y = size; L.energy = energy; L.spread = math.radians(spread); L.color = color
    o = bpy.data.objects.new(name, L); o.location = loc; o.rotation_euler = rot; col.objects.link(o); return o
# linear 3000 K fixtures between the baffles (the visible diffusers are emissive meshes; the light itself comes from area lights)
LED_W = float(os.environ.get("LED_W", "22"))  # radiant W per metre
for k in range(int(W / 0.15)):
    if k % 16 == 8:
        x = 0.12 + k * 0.15 + 0.075; area(f"linear_{k}", (x, D / 2, H + 0.2), (0.06, D - 1.0), LED_W * (D - 1.0), 110)
# grazing wall-washer over the limestone wall
WASH = float(os.environ.get("WASH_W", "29"))  # W per metre
area("wallwash", (W / 2, D - 0.42, H + 0.15), (W - 1.0, 0.06), WASH * (W - 1.0), 40, (1.0, 0.88, 0.76), (math.radians(-12), 0, 0))
area("wallwash_east", (W - 0.42, D / 2, H + 0.15), (0.06, D - 1.0), WASH * 1.15 * (D - 1.0), 40, (1.0, 0.88, 0.76), (0, math.radians(12), 0))
ceil_objs["led"].visible_diffuse = False; ceil_objs["led"].visible_shadow = False
# =============================================================== gallery wing: the holdings, in steel
col = ROOM
INK, LIME, CORAL = (0.95, 0.95, 0.93), (0.84, 1.0, 0.25), (1.0, 0.48, 0.40)
def tone(r):
    return (0.55, 0.56, 0.56) if r is None or abs(r) < 0.0005 else LIME if r > 0 else CORAL
M["steel_mono"] = flat("brushed stainless monolith", (0.78, 0.78, 0.79), rough=0.16, metal=1.0)
M["black_stone"] = scanned("polished black granite", "granite_tile", 2.0, rough_mul=0.12, rough_add=0.03, normal=0.25, tint=(0.35, 0.35, 0.36))
def text_plate(name, lines, size_px, w_m, h_m, loc, normal, ink=(0.05, 0.045, 0.04), base=None, metal=0.0, rough=0.35, align="left"):
    """an engraved plate: PIL-drawn text as a mask on a thin box (brass) or a decal flush on stone (base=None)"""
    from PIL import Image as PImage, ImageDraw, ImageFont
    W_px = size_px[0]; H_px = size_px[1]
    im = PImage.new("L", (W_px, H_px), 0); d = ImageDraw.Draw(im)
    y = 0
    for txt, fs, weight in lines:
        f = ImageFont.truetype(os.path.join(os.environ["FONTDIR"], "geist-mono" if weight == "mono" else "geist-sans", "GeistMono-Regular.ttf" if weight == "mono" else f"Geist-{weight}.ttf"), fs)
        tw = d.textlength(txt, font=f)
        d.text(((W_px - tw) / 2 if align == "center" else 0, y), txt, font=f, fill=255); y += int(fs * 1.25)
    path = os.path.join(os.path.dirname(OUT), f"plate_{name}.png"); im.save(path)
    m, n, l, bs = node_mat(f"plate {name}")
    t = n.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(path); t.image.colorspace_settings.name = "Non-Color"; t.interpolation = "Cubic"
    uv = n.new("ShaderNodeTexCoord"); l.new(uv.outputs["UV"], t.inputs["Vector"])
    if base is None:   # decal: only the letters exist
        bs.inputs["Base Color"].default_value = (*ink, 1); bs.inputs["Roughness"].default_value = 0.6; l.new(t.outputs["Color"], bs.inputs["Alpha"])
    else:
        mx = n.new("ShaderNodeMix"); mx.data_type = "RGBA"; mx.inputs[6].default_value = (*base, 1); mx.inputs[7].default_value = (*ink, 1)
        l.new(t.outputs["Color"], mx.inputs["Factor"]); l.new(mx.outputs[2], bs.inputs["Base Color"])
        mr = n.new("ShaderNodeMapRange"); mr.inputs["To Min"].default_value = metal; mr.inputs["To Max"].default_value = 0.0
        l.new(t.outputs["Color"], mr.inputs["Value"]); l.new(mr.outputs["Result"], bs.inputs["Metallic"])
        rr = n.new("ShaderNodeMapRange"); rr.inputs["To Min"].default_value = rough; rr.inputs["To Max"].default_value = 0.7
        l.new(t.outputs["Color"], rr.inputs["Value"]); l.new(rr.outputs["Result"], bs.inputs["Roughness"])
        bump = n.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.4; bump.invert = True
        l.new(t.outputs["Color"], bump.inputs["Height"]); l.new(bump.outputs["Normal"], bs.inputs["Normal"])
    # quad in the plane perpendicular to `normal` (horizontal normal only), text upright
    nx, ny = normal; ux, uy = -ny, nx  # right-hand direction when facing the plate
    c = Vector(loc); u = Vector((ux, uy, 0)) * (w_m / 2); v = Vector((0, 0, h_m / 2)); o = Vector((nx, ny, 0)) * 0.001
    q = MB(f"plate_{name}"); q.quad([c - u - v + o, c + u - v + o, c + u + v + o, c - u + v + o]); return q.finish(m)

HOLD = DATA["holdings"]
GX0, GX1, GY = 33.4, 45.0, 5.6          # monolith row, parallel to the glass (backlit by the city)
MONO = []
if HOLD:
    pitch = (GX1 - GX0) / max(1, len(HOLD))
    pl = MB("gallery_plinth"); pl.box(GX0, GY - 0.85, 0.0, GX1, GY + 0.85, 0.32); pl.finish(M["black_stone"], bevel=0.01, segs=3)
    for i, h in enumerate(HOLD):
        cx = GX0 + pitch * (i + 0.5); hh = max(0.012, 3.8 * h["weight"])  # height ∝ share of capital (3.8 m = 100 %)
        mono = MB(f"monolith_{h['id']}"); mono.box(cx - 0.36, GY - 0.36, 0.32, cx + 0.36, GY + 0.36, 0.32 + hh); mono.finish(M["steel_mono"], bevel=0.004, segs=3)
        bh = min(0.016, hh * 0.3)
        band = MB(f"band_{h['id']}"); band.box(cx - 0.362, GY - 0.362, 0.32 + hh - bh - 0.006, cx + 0.362, GY + 0.362, 0.32 + hh - 0.006); band.finish(emissive(f"band {h['id']}", tone(h["returnPct"]), 6.0))
        lines = [(h["label"], 120, "Medium"), (h["name"], 40, "Regular"), (f"{h['weight'] * 100:.1f}% OF CAPITAL" + (f"   ·   {'+' if (h['returnPct'] or 0) > 0 else '−' if (h['returnPct'] or 0) < 0 else ''}{abs((h['returnPct'] or 0) * 100):.1f}%" if h["returnPct"] is not None else "") + (f"   ·   {h['value']}" if h.get("value") else ""), 36, "mono")]
        text_plate(h["id"], lines, (1200, 300), 0.6, 0.15, (cx, GY + 0.851, 0.17), (0, 1), ink=(0.06, 0.05, 0.035), base=(0.78, 0.6, 0.32), metal=1.0, rough=0.28)
        MONO.append({"id": h["id"], "top": (cx, GY, 0.32 + hh)})
    # museum spots: one per monolith from the ceiling, aimed down at the steel
    col = LIGHTS
    for m_ in MONO:
        x, y, z = m_["top"]
        Ls = bpy.data.lights.new(f"spot_{m_['id']}", "SPOT"); Ls.energy = float(os.environ.get("SPOT_W", "260")); Ls.spot_size = math.radians(24); Ls.spot_blend = 0.6; Ls.shadow_soft_size = 0.05; Ls.color = (1.0, 0.92, 0.84)
        so_ = bpy.data.objects.new(f"spot_{m_['id']}", Ls); so_.location = (x, y + 2.6, H - 0.1); col.objects.link(so_)
        so_.rotation_euler = (Vector((x, y, max(0.6, z * 0.6))) - Vector(so_.location)).to_track_quat("-Z", "Y").to_euler()
    col = ROOM

# =============================================================== performance wall: the month-end index in steel
HIST = DATA["history"]
PERF = {}
if len(HIST) >= 2:
    vals = [p["index"] for p in HIST] + [100.0]; lo, hi = min(vals) - 5, max(vals) + 5
    PY0, PY1, PZ0, PZ1, PX = 16.6, 3.4, 1.15, 3.55, W - 0.22   # reads left→right (north→south) facing east
    # a smoked-walnut feature panel behind the line, proud of the stone, so the steel reads
    pan = MB("perf_panel"); pan.box(W - 0.11, PY1 - 1.1, 0.35, W - 0.05, PY0 + 1.1, 4.75); pan.finish(M["walnut"], bevel=0.004, segs=2)
    LIGHT_INK = (0.78, 0.75, 0.68)
    pts = [Vector((PX, PY0 + (PY1 - PY0) * i / (len(HIST) - 1), PZ0 + (p["index"] - lo) / (hi - lo) * (PZ1 - PZ0))) for i, p in enumerate(HIST)]
    line = MB("index_line")
    for a_, b_ in zip(pts, pts[1:]): line.cyl(a_, b_, 0.02, 24)
    for q_ in pts:
        line.cyl(q_ - Vector((0.0, 0, 0)), q_ + Vector((0.12, 0, 0)), 0.008, 12)            # stand-off pin into the panel
    line.finish(M["steel"], smooth=True)
    nodes = MB("index_nodes")
    for q_ in pts:
        sph = bmesh.ops.create_uvsphere(nodes.bm, u_segments=24, v_segments=12, radius=0.048); bmesh.ops.translate(nodes.bm, verts=sph["verts"], vec=q_)
    nodes.finish(M["steel"], smooth=True)
    z100 = PZ0 + (100 - lo) / (hi - lo) * (PZ1 - PZ0)
    ref = MB("index_100"); ref.cyl((PX + 0.08, PY0 + 0.6, z100), (PX + 0.08, PY1 - 0.6, z100), 0.005, 12); ref.finish(M["steel"], smooth=True)
    for i, (p, q_) in enumerate(zip(HIST, pts)):
        ch = 0.0 if i == 0 else p["index"] - HIST[i - 1]["index"]
        cap = MB(f"cap_{i}"); cap.cyl((PX + 0.035, q_.y, q_.z), (PX + 0.06, q_.y, q_.z), 0.062, 40)   # a lit ring behind each month
        cap.finish(emissive(f"cap {i}", tone(ch / 100 if abs(ch) > 0.005 else 0.0), 8.0))
        mon = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][int(p["date"][5:7]) - 1]
        text_plate(f"m{i}", [(mon, 64, "mono"), (f"{p['index']:.1f}", 52, "mono")] + ([(p["date"][:4], 52, "mono")] if i in (0, len(HIST) - 1) else []),
                   (300, 230), 0.36, 0.276, (W - 0.112, q_.y, PZ0 - 0.5), (-1, 0), ink=LIGHT_INK, align="center")
    text_plate("perf_title", [("MONTH-END INDEX · REBASED TO 100", 60, "mono"), (f"{HIST[0]['date'][:7]} → {HIST[-1]['date'][:7]}  ·  TIME-WEIGHTED RETURN {DATA['summary'].get('twr', '')}", 44, "mono")],
               (2000, 170), 3.2, 0.272, (W - 0.112, PY0 - 1.0, 4.3), (-1, 0), ink=LIGHT_INK)
    text_plate("perf_100", [("100", 44, "mono")], (120, 60), 0.16, 0.08, (W - 0.112, PY0 + 0.85, z100), (-1, 0), ink=LIGHT_INK, align="center")
    PERF = {"start": tuple(pts[0] + Vector((-0.1, 0, 0.12))), "end": tuple(pts[-1] + Vector((-0.1, 0, 0.12)))}

# =============================================================== the studio: a briefcase holding the world
S_SCALE = 1 / 110
SO = Vector((600.0, 0.0, 0.0))            # studio origin, far from the hall's lights
PED_H = 0.92                              # pedestal height
CASE = (0.48, 0.36)                       # outer footprint (x, y)
BASE_H, LID_H = 0.088, 0.036
col = STUDIO
alu, n_, l_, b_ = node_mat("brushed aluminium")
b_.inputs["Base Color"].default_value = (0.8, 0.8, 0.81, 1); b_.inputs["Metallic"].default_value = 1.0; b_.inputs["Roughness"].default_value = 0.2
tc_ = n_.new("ShaderNodeTexCoord"); mp_ = n_.new("ShaderNodeMapping"); mp_.inputs["Scale"].default_value = (3.0, 900.0, 900.0)
nz = n_.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 1.0; nz.inputs["Detail"].default_value = 4.0
bp = n_.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.035
l_.new(tc_.outputs["Object"], mp_.inputs["Vector"]); l_.new(mp_.outputs["Vector"], nz.inputs["Vector"]); l_.new(nz.outputs["Fac"], bp.inputs["Height"]); l_.new(bp.outputs["Normal"], b_.inputs["Normal"])
chrome = flat("polished chrome", (0.9, 0.9, 0.9), rough=0.05, metal=1.0)
foam = flat("black velvet foam", (0.008, 0.008, 0.009), rough=1.0, spec=0.2)
leather = scanned("black leather lining", "fabric_leather_01", 0.35, rough_mul=0.4, rough_add=0.35, normal=0.6, tint=(0.09, 0.085, 0.08))
studio_black = flat("studio black", (0.006, 0.006, 0.006), rough=0.9)
studio_floor = flat("studio floor (black epoxy)", (0.01, 0.01, 0.011), rough=0.22)

enc = MB("studio_enclosure"); enc.box(SO.x - 6, SO.y - 6, -0.01, SO.x + 6, SO.y + 6, 5.0)
enc.bm.normal_update(); bmesh.ops.reverse_faces(enc.bm, faces=enc.bm.faces); enc.finish(studio_black)
fl = MB("studio_floor"); fl.box(SO.x - 5.9, SO.y - 5.9, -0.01, SO.x + 5.9, SO.y + 5.9, 0.0); fl.finish(studio_floor)
basalt, n_, l_, b_ = node_mat("honed black basalt")
b_.inputs["Base Color"].default_value = (0.018, 0.018, 0.019, 1); b_.inputs["Specular IOR Level"].default_value = 0.5
nz_ = n_.new("ShaderNodeTexNoise"); nz_.inputs["Scale"].default_value = 60.0; nz_.inputs["Detail"].default_value = 8.0
rm_ = n_.new("ShaderNodeMapRange"); rm_.inputs["To Min"].default_value = 0.16; rm_.inputs["To Max"].default_value = 0.3
l_.new(nz_.outputs["Fac"], rm_.inputs["Value"]); l_.new(rm_.outputs["Result"], b_.inputs["Roughness"])
ped = MB("pedestal"); ped.box(SO.x - 0.36, SO.y - 0.3, 0.0, SO.x + 0.36, SO.y + 0.3, PED_H); ped.finish(basalt, bevel=0.004, segs=3)

cx, cy, z0 = SO.x, SO.y, PED_H
hx, hy = CASE[0] / 2, CASE[1] / 2
# base shell: outer box, inner cavity lined with foam; two pressed ribs around the outside
base = MB("case_base")
base.box(cx - hx, cy - hy, z0 + 0.004, cx + hx, cy + hy, z0 + BASE_H)
base_o = base.finish(alu, bevel=0.014, segs=5)
cutter = MB("case_cavity"); cutter.box(cx - hx + 0.01, cy - hy + 0.01, z0 + 0.016, cx + hx - 0.01, cy + hy - 0.01, z0 + BASE_H + 0.05)
cut_o = cutter.finish(foam, bevel=0.006, segs=3); cut_o.hide_render = True; cut_o.hide_viewport = True
bo = base_o.modifiers.new("cavity", "BOOLEAN"); bo.operation = "DIFFERENCE"; bo.object = cut_o; bo.solver = "EXACT"
for zr in (z0 + 0.03, z0 + 0.056):   # pressed ribs: rings around the shell, hollow like it
    rib = MB("case_rib"); rib.box(cx - hx - 0.003, cy - hy - 0.003, zr, cx + hx + 0.003, cy + hy + 0.003, zr + 0.006); rib_o = rib.finish(alu, bevel=0.004, segs=3)
    rb = rib_o.modifiers.new("cavity", "BOOLEAN"); rb.operation = "DIFFERENCE"; rb.object = cut_o; rb.solver = "EXACT"
feet = MB("case_feet")
for fx in (-1, 1):
    for fy in (-1, 1): feet.cyl((cx + fx * (hx - 0.04), cy + fy * (hy - 0.04), z0), (cx + fx * (hx - 0.04), cy + fy * (hy - 0.04), z0 + 0.006), 0.009, 24)
feet.finish(M["rubber"], smooth=True)
# latches and handle on the front face (y−)
for lx in (-0.15, 0.15):
    lt = MB("latch"); lt.box(cx + lx - 0.022, cy - hy - 0.012, z0 + BASE_H - 0.03, cx + lx + 0.022, cy - hy + 0.001, z0 + BASE_H + 0.012); lt.finish(chrome, bevel=0.003, segs=3)
hd = MB("handle_posts")
for lx in (-0.065, 0.065): hd.box(cx + lx - 0.008, cy - hy - 0.03, z0 + BASE_H - 0.022, cx + lx + 0.008, cy - hy + 0.001, z0 + BASE_H - 0.006)
hd.finish(chrome, bevel=0.003, segs=3)
grip = MB("handle_grip"); grip.box(cx - 0.075, cy - hy - 0.048, z0 + BASE_H - 0.03, cx + 0.075, cy - hy - 0.024, z0 + BASE_H + 0.0); grip.finish(leather, subdiv=2)
# lid: its own object so it can hinge at the back edge
lid = MB("case_lid"); lid.box(-hx, -2 * hy, 0.0, hx, 0.0, LID_H); lid_o = lid.finish(alu, bevel=0.014, segs=5)
lidl = MB("case_lid_lining"); lidl.box(-hx + 0.012, -2 * hy + 0.012, -0.0005, hx - 0.012, -0.012, 0.004); lidl_o = lidl.finish(leather, bevel=0.003, segs=2)
lidrib = MB("case_lid_rib"); lidrib.box(-hx - 0.003, -2 * hy - 0.003, 0.012, hx + 0.003, 0.003, 0.018); lidrib_o = lidrib.finish(alu, bevel=0.004, segs=3)
hinge = bpy.data.objects.new("lid_hinge", None); hinge.location = (cx, cy + hy, z0 + BASE_H); col.objects.link(hinge)
for o_ in (lid_o, lidl_o, lidrib_o): o_.parent = hinge
# the world inside: the hall at 1:110, minus its ceiling, set into the foam
MINI_FLOOR = Vector((cx, cy, z0 + 0.0165 + 0.3 * S_SCALE))  # hall floor slab rests on the cavity floor
MINI_ORIGIN = MINI_FLOOR - Vector((W / 2, D / 2, 0)) * S_SCALE
mini = bpy.data.objects.new("miniature", None); mini.instance_type = "COLLECTION"; mini.instance_collection = ROOM
mini.location = MINI_ORIGIN; mini.scale = (S_SCALE,) * 3; col.objects.link(mini)
# die-cut foam around the model: a frame filling the cavity up to the rim, open where the hall sits
ix0, ix1, iy0, iy1 = cx - hx + 0.012, cx + hx - 0.012, cy - hy + 0.012, cy + hy - 0.012
mx0, mx1 = MINI_ORIGIN.x - 0.5 * S_SCALE - 0.002, MINI_ORIGIN.x + (W + 0.5) * S_SCALE + 0.002
my0, my1 = MINI_ORIGIN.y - 0.7 * S_SCALE - 0.002, MINI_ORIGIN.y + (D + 0.5) * S_SCALE + 0.002
fr = MB("case_foam"); fz0, fz1 = z0 + BASE_H - 0.075, z0 + BASE_H - 0.004
for bx in [(ix0, iy0, mx0, iy1), (mx1, iy0, ix1, iy1), (mx0, iy0, mx1, my0), (mx0, my1, mx1, iy1)]:
    fr.box(bx[0], bx[1], fz0, bx[2], bx[3], fz1)
fr.finish(foam, bevel=0.002, segs=2)
cut = MB("mini_bed"); cut.box(MINI_FLOOR.x - W / 2 * S_SCALE - 0.004, MINI_FLOOR.y - D / 2 * S_SCALE - 0.006, MINI_FLOOR.z - 0.006, MINI_FLOOR.x + W / 2 * S_SCALE + 0.004, MINI_FLOOR.y + D / 2 * S_SCALE + 0.004, MINI_FLOOR.z - 0.0002); cut.finish(foam)
# studio light: a large overhead softbox, a kicker behind, a low fill; all neutral-warm
def s_area(name, loc, size, energy, target, color=(1.0, 0.97, 0.93), spread=180):
    L = bpy.data.lights.new(name, "AREA"); L.shape = "RECTANGLE"; L.size, L.size_y = size; L.energy = energy; L.color = color; L.spread = math.radians(spread)
    o = bpy.data.objects.new(name, L); o.location = loc; o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler(); col.objects.link(o)
TOP = Vector((cx, cy, z0 + 0.05))
s_area("softbox_key", (cx - 0.5, cy - 0.7, z0 + 1.6), (1.4, 0.9), float(os.environ.get("KEY_W", "220")), TOP)
s_area("softbox_rim", (cx + 0.9, cy + 1.3, z0 + 0.9), (0.6, 1.4), 120, TOP, (0.92, 0.96, 1.0))
s_area("strip_fill", (cx - 1.6, cy - 0.2, z0 + 0.4), (0.25, 1.2), 25, TOP)

# =============================================================== black ground (for the views from above the roofless hall)
col = scene.collection
gnd = MB("void_ground"); gnd.box(-400, -400, -0.4, 400, 400, -0.3); gnd_o = gnd.finish(studio_black)
skirt = MB("void_skirt"); skirt.box(-1.2, -1.4, -0.31, W + 1.2, D + 1.2, -0.02); skirt_o = skirt.finish(foam)
for o_ in (gnd_o, skirt_o): o_.hide_render = True

# =============================================================== anchors for the page's labels (room coordinates)
anchors = {f"district:{m_['id']}": (m_["top"][0], m_["top"][1], m_["top"][2] + 0.12) for m_ in MONO}
if PERF: anchors.update({"obs:start": PERF["start"], "obs:end": PERF["end"]})
meta = {"W": W, "D": D, "H": H, "scale": S_SCALE, "mini_origin": tuple(MINI_ORIGIN), "studio": tuple(SO), "case_top": (cx, cy, z0 + BASE_H),
        "anchors": anchors, "monoliths": MONO, "perf": PERF, "hdri_rot": float(os.environ.get("HDRI_ROT", "200"))}
json.dump(meta, open(os.path.join(os.path.dirname(OUT), "world.json"), "w"), indent=1)

# =============================================================== render defaults (render.py sets camera, resolution and samples)
cam = bpy.data.cameras.new("cam"); cam.sensor_width = 36; co = bpy.data.objects.new("cam", cam); scene.collection.objects.link(co); scene.camera = co
r = scene.render; r.engine = "CYCLES"; c = scene.cycles
c.device = "CPU"; c.use_adaptive_sampling = True; c.adaptive_threshold = 0.015; c.use_denoising = True
try: c.denoiser = "OPENIMAGEDENOISE"
except Exception: pass
c.max_bounces = 12; c.diffuse_bounces = 5; c.glossy_bounces = 6; c.transmission_bounces = 10; c.transparent_max_bounces = 16
c.sample_clamp_indirect = 10; c.caustics_reflective = False; c.caustics_refractive = False; c.blur_glossy = 0.5
c.seed = 7
scene.view_settings.view_transform = "AgX"; scene.view_settings.look = "AgX - Base Contrast"
r.image_settings.file_format = "PNG"; r.image_settings.color_depth = "16"
bpy.ops.wm.save_as_mainfile(filepath=OUT)
print("scene saved", OUT, "objects", len(bpy.data.objects), flush=True)

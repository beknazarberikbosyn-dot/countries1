"""usage: python3 prep_geo.py <countries.geojson from datasets/geo-countries> <output folder>

Project, clip and simplify Natural Earth country shapes for each CIS country.

Output: one JSON per country with normalised coordinates in [-1, 1]
(unit = S km, where S is half the width of the map square).
Borders follow internationally recognised boundaries: Crimea is moved
from Russia to Ukraine (the source data draws it de facto).
"""
import json, math, sys

SRC = sys.argv[1]
OUT = sys.argv[2]
R_EARTH = 6371.0

COUNTRIES = {
    # code: (iso3, centre lon, lat or None, square factor)
    'kz': ('KAZ', 67.0, 48.0, 1.22),
    'kg': ('KGZ', None, None, 1.45),
    'tj': ('TJK', None, None, 1.45),
    'uz': ('UZB', None, None, 1.30),
    'tm': ('TKM', None, None, 1.30),
    'az': ('AZE', None, None, 1.50),
    'am': ('ARM', None, None, 1.70),
    'md': ('MDA', None, None, 1.60),
    'by': ('BLR', None, None, 1.40),
    'ru': ('RUS', 100.0, 64.0, 1.12),
}

CITIES = {
    'kz': [('Astana', 71.449, 51.169, True), ('Almaty', 76.946, 43.238, False), ('Shymkent', 69.590, 42.341, False), ('Aktau', 51.172, 43.651, False)],
    'kg': [('Bishkek', 74.612, 42.875, True), ('Osh', 72.816, 40.513, False), ('Karakol', 78.395, 42.490, False)],
    'tj': [('Dushanbe', 68.774, 38.560, True), ('Khujand', 69.622, 40.283, False), ('Khorog', 71.553, 37.489, False)],
    'uz': [('Tashkent', 69.279, 41.311, True), ('Samarkand', 66.959, 39.654, False), ('Bukhara', 64.423, 39.767, False), ('Khiva', 60.364, 41.378, False)],
    'tm': [('Ashgabat', 58.326, 37.960, True), ('Türkmenabat', 63.578, 39.073, False), ('Mary', 61.830, 37.593, False), ('Türkmenbaşy', 52.955, 40.022, False)],
    'az': [('Baku', 49.867, 40.409, True), ('Ganja', 46.361, 40.682, False), ('Shaki', 47.170, 41.192, False), ('Nakhchivan', 45.412, 39.209, False)],
    'am': [('Yerevan', 44.513, 40.177, True), ('Gyumri', 43.841, 40.785, False), ('Vanadzor', 44.488, 40.813, False), ('Dilijan', 44.863, 40.741, False)],
    'md': [('Chișinău', 28.863, 47.010, True), ('Bălți', 27.929, 47.762, False), ('Cahul', 28.195, 45.904, False)],
    'by': [('Minsk', 27.561, 53.902, True), ('Brest', 23.734, 52.097, False), ('Gomel', 30.987, 52.441, False), ('Vitebsk', 30.202, 55.184, False)],
    'ru': [('Moscow', 37.617, 55.756, True), ('St Petersburg', 30.335, 59.934, False), ('Novosibirsk', 82.935, 55.008, False), ('Yekaterinburg', 60.597, 56.838, False), ('Vladivostok', 131.885, 43.115, False)],
}

SEAS = [
    ('Caspian Sea', 50.6, 41.6), ('Black Sea', 34.0, 43.3), ('Baltic Sea', 19.5, 57.5),
    ('Barents Sea', 40.0, 72.5), ('Kara Sea', 70.0, 75.0), ('Laptev Sea', 125.0, 76.0),
    ('Sea of Okhotsk', 148.0, 55.0), ('Bering Sea', 178.0, 59.0), ('Sea of Japan', 135.0, 40.5),
    ('East Siberian Sea', 160.0, 73.0),
]

d = json.load(open(SRC))
feats = d['features']

def polys_of(f):
    g = f['geometry']
    return g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]

def ring_area_ll(r):
    a = 0
    for i in range(len(r) - 1):
        a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]
    return a / 2

# ---- move Crimea from Russia to Ukraine (internationally recognised borders)
by_name = {f['properties']['name']: f for f in feats}
rus, ukr = by_name['Russia'], by_name['Ukraine']
keep, crimea = [], []
for p in polys_of(rus):
    lons = [c[0] for c in p[0]]; lats = [c[1] for c in p[0]]
    cx, cy = sum(lons) / len(lons), sum(lats) / len(lats)
    if 32.3 < cx < 36.8 and 44.2 < cy < 46.3:
        crimea.append(p)
    else:
        keep.append(p)
print('crimea polygons moved:', len(crimea))
rus['geometry'] = {'type': 'MultiPolygon', 'coordinates': keep}
ukr['geometry'] = {'type': 'MultiPolygon', 'coordinates': polys_of(ukr) + crimea}

# ---- Baikonur is Kazakh territory (leased to Russia): merge it into Kazakhstan for the map
kaz = by_name['Kazakhstan']
bai = by_name.get('Baykonur Cosmodrome')
KAZ_SLAB_POLYS = polys_of(kaz)
if bai:
    kaz['geometry'] = {'type': 'MultiPolygon', 'coordinates': polys_of(kaz) + polys_of(bai)}
    feats.remove(bai)
    print('baikonur merged')
SKIP_LABELS = {'Siachen Glacier', 'Baykonur Cosmodrome', 'Northern Cyprus', 'Cyprus No Mans Area', 'Dhekelia', 'Akrotiri', 'Kosovo'}

# ---- helpers
def laea(lon, lat, lon0, lat0):
    l, p = math.radians(lon), math.radians(lat)
    l0, p0 = math.radians(lon0), math.radians(lat0)
    dl = (l - l0 + math.pi) % (2 * math.pi) - math.pi
    c = 1 + math.sin(p0) * math.sin(p) + math.cos(p0) * math.cos(p) * math.cos(dl)
    if c < 1e-9:
        c = 1e-9
    k = math.sqrt(2 / c)
    return (R_EARTH * k * math.cos(p) * math.sin(dl),
            R_EARTH * k * (math.cos(p0) * math.sin(p) - math.sin(p0) * math.cos(p) * math.cos(dl)))

def ang_dist(lon, lat, lon0, lat0):
    a = math.radians(lat); b = math.radians(lat0)
    dl = math.radians(lon - lon0)
    v = math.sin(a) * math.sin(b) + math.cos(a) * math.cos(b) * math.cos(dl)
    return math.degrees(math.acos(max(-1, min(1, v))))

def area(r):
    a = 0
    n = len(r)
    for i in range(n):
        x1, y1 = r[i]; x2, y2 = r[(i + 1) % n]
        a += x1 * y2 - x2 * y1
    return a / 2

def dp(pts, tol):
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    t2 = tol * tol
    while stack:
        a, b = stack.pop()
        ax, ay = pts[a]; bx, by = pts[b]
        dx, dy = bx - ax, by - ay
        L = dx * dx + dy * dy
        best, bi = -1, -1
        for i in range(a + 1, b):
            px, py = pts[i]
            if L == 0:
                dd = (px - ax) ** 2 + (py - ay) ** 2
            else:
                t = ((px - ax) * dx + (py - ay) * dy) / L
                t = max(0, min(1, t))
                dd = (ax + t * dx - px) ** 2 + (ay + t * dy - py) ** 2
            if dd > best:
                best, bi = dd, i
        if best > t2:
            keep[bi] = True
            stack.append((a, bi)); stack.append((bi, b))
    return [p for p, k in zip(pts, keep) if k]

def simplify_ring(r, tol):
    if r[0] == r[-1]:
        r = r[:-1]
    if len(r) < 4:
        return r
    # split at farthest point to keep closed shape stable
    n = len(r)
    far = max(range(n), key=lambda i: (r[i][0] - r[0][0]) ** 2 + (r[i][1] - r[0][1]) ** 2)
    a = dp(r[:far + 1], tol)
    b = dp(r[far:] + [r[0]], tol)
    out = a[:-1] + b[:-1]
    return out

def clip_poly(ring, lim):
    def clip(pts, inside, inter):
        out = []
        if not pts:
            return out
        prev = pts[-1]
        for cur in pts:
            if inside(cur):
                if not inside(prev):
                    out.append(inter(prev, cur))
                out.append(cur)
            elif inside(prev):
                out.append(inter(prev, cur))
            prev = cur
        return out
    def ix(x0):
        return lambda p, q: (x0, p[1] + (q[1] - p[1]) * (x0 - p[0]) / (q[0] - p[0]))
    def iy(y0):
        return lambda p, q: (p[0] + (q[0] - p[0]) * (y0 - p[1]) / (q[1] - p[1]), y0)
    pts = ring
    pts = clip(pts, lambda p: p[0] >= -lim, ix(-lim))
    pts = clip(pts, lambda p: p[0] <= lim, ix(lim))
    pts = clip(pts, lambda p: p[1] >= -lim, iy(-lim))
    pts = clip(pts, lambda p: p[1] <= lim, iy(lim))
    return pts

def clip_polyline(pts, lim):
    """split a polyline into pieces inside the square (simple: drop outside points)."""
    pieces, cur = [], []
    def ins(p):
        return -lim <= p[0] <= lim and -lim <= p[1] <= lim
    for i, p in enumerate(pts):
        if ins(p):
            if not cur and i > 0:
                cur.append(pts[i - 1])
            cur.append(p)
        else:
            if cur:
                cur.append(p)
                pieces.append(cur)
                cur = []
    if cur:
        pieces.append(cur)
    return [c for c in pieces if len(c) >= 2]

def rnd(p, s, nd=3):
    return [round(p[0] / s, nd), round(p[1] / s, nd)]

def centroid(r):
    a = area(r)
    if abs(a) < 1e-12:
        return (sum(p[0] for p in r) / len(r), sum(p[1] for p in r) / len(r))
    cx = cy = 0
    n = len(r)
    for i in range(n):
        x1, y1 = r[i]; x2, y2 = r[(i + 1) % n]
        f = x1 * y2 - x2 * y1
        cx += (x1 + x2) * f; cy += (y1 + y2) * f
    return (cx / (6 * a), cy / (6 * a))

def point_in(pt, ring):
    x, y = pt; inside = False
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i]; x2, y2 = ring[(i + 1) % n]
        if (y1 > y) != (y2 > y):
            xi = x1 + (y - y1) * (x2 - x1) / (y2 - y1)
            if x < xi:
                inside = not inside
    return inside

iso3_to_feat = {f['properties']['ISO3166-1-Alpha-3']: f for f in feats}

for code, (iso3, clon, clat, sq) in COUNTRIES.items():
    main = iso3_to_feat[iso3]
    mp = polys_of(main)
    if iso3 == 'KAZ':
        # slab: Kazakhstan's own outline with the Baikonur hole filled
        mp = [[p[0]] for p in KAZ_SLAB_POLYS]
    if clon is None:
        lons = [c[0] for p in mp for c in p[0]]; lats = [c[1] for p in mp for c in p[0]]
        clon = (min(lons) + max(lons)) / 2; clat = (min(lats) + max(lats)) / 2
    proj = lambda lon, lat: laea(lon, lat, clon, clat)

    # main country polygons
    mpolys = []
    for p in mp:
        rings = [[proj(*c) for c in r] for r in p]
        mpolys.append(rings)
    allpts = [pt for p in mpolys for pt in p[0]]
    minx = min(p[0] for p in allpts); maxx = max(p[0] for p in allpts)
    miny = min(p[1] for p in allpts); maxy = max(p[1] for p in allpts)
    cx, cy = (minx + maxx) / 2, (miny + maxy) / 2
    # recentre on bbox
    def shift(p):
        return (p[0] - cx, p[1] - cy)
    mpolys = [[[shift(pt) for pt in r] for r in p] for p in mpolys]
    hx, hy = (maxx - minx) / 2, (maxy - miny) / 2
    S = max(hx, hy) * sq
    total = sum(abs(area(p[0])) for p in mpolys)
    tol_main = S / 1400
    slab = []
    for p in mpolys:
        a = abs(area(p[0]))
        if a < total * 4e-5:
            continue
        outer = simplify_ring(p[0], tol_main)
        if len(outer) < 4:
            continue
        holes = []
        for h in p[1:]:
            if abs(area(h)) < total * 4e-5:
                continue
            hs = simplify_ring(h, tol_main)
            if len(hs) >= 4:
                holes.append(hs)
        slab.append([[rnd(q, S, 4) for q in outer]] + [[rnd(q, S, 4) for q in h] for h in holes])

    # neighbours / land within square
    lim = S * 1.02
    land = []
    labels = []
    border_lines, coast_lines = [], []
    edge_owner = {}
    cand = []
    for f in feats:
        nm = f['properties']['name']
        ps = polys_of(f)
        near = False
        for p in ps:
            for c in p[0][::max(1, len(p[0]) // 60)]:
                if ang_dist(c[0], c[1], clon, clat) < 75:
                    near = True; break
            if near:
                break
        if not near:
            continue
        projected = []
        bx0 = by0 = 1e18; bx1 = by1 = -1e18
        for p in ps:
            rings = [[shift(proj(*c)) for c in r] for r in p]
            projected.append((p, rings))
            for q in rings[0]:
                bx0 = min(bx0, q[0]); bx1 = max(bx1, q[0]); by0 = min(by0, q[1]); by1 = max(by1, q[1])
        if bx1 < -lim or bx0 > lim or by1 < -lim or by0 > lim:
            continue
        cand.append((nm, f, projected))

    # edges for border/coast classification (raw lon/lat keys)
    for nm, f, projected in cand:
        for p, rings in projected:
            for r in p:
                for i in range(len(r) - 1):
                    a = (round(r[i][0], 5), round(r[i][1], 5)); b = (round(r[i + 1][0], 5), round(r[i + 1][1], 5))
                    if a == b:
                        continue
                    k = (a, b) if a < b else (b, a)
                    edge_owner.setdefault(k, set()).add(nm)

    tol_land = S / 650
    for nm, f, projected in cand:
        is_main = f is main
        best = None
        fills = []
        for p, rings in projected:
            a0 = abs(area(rings[0]))
            if a0 < (S * S) * 1.2e-5:
                continue
            outer = clip_poly(simplify_ring(rings[0], tol_land), lim)
            if len(outer) < 3:
                continue
            ca = abs(area(outer))
            holes = []
            for h in rings[1:]:
                if abs(area(h)) < (S * S) * 1.2e-5:
                    continue
                hc = clip_poly(simplify_ring(h, tol_land), lim)
                if len(hc) >= 3:
                    holes.append(hc)
            fills.append([[rnd(q, S) for q in outer]] + [[rnd(q, S) for q in h] for h in holes])
            if best is None or ca > best[0]:
                best = (ca, outer)
        if not fills:
            continue
        land.append({'name': nm, 'main': is_main, 'polys': fills})
        if not is_main and best and best[0] > (S * S) * 0.004 and nm not in SKIP_LABELS:
            c = centroid(best[1])
            if not point_in(c, best[1]):
                c = best[1][len(best[1]) // 2]
            # pull labels inside the square
            lx = max(-S * 0.86, min(S * 0.86, c[0])); ly = max(-S * 0.9, min(S * 0.9, c[1]))
            labels.append({'name': nm, 'x': round(lx / S, 4), 'y': round(ly / S, 4), 'size': round(math.sqrt(best[0]) / S, 3)})

        # border / coast runs
        for p, rings in projected:
            if abs(area(rings[0])) < (S * S) * 1.2e-5:
                continue
            for ri, r in enumerate(p):
                pr = rings[ri]
                if abs(area(pr)) < (S * S) * 1.2e-5:
                    continue
                run, run_type = [], None
                def flush():
                    if len(run) >= 2 and run_type in ('b', 'c'):
                        for piece in clip_polyline(run, lim):
                            sp = dp(piece, S / 700)
                            if len(sp) >= 2:
                                (border_lines if run_type == 'b' else coast_lines).append([rnd(q, S) for q in sp])
                for i in range(len(r) - 1):
                    a = (round(r[i][0], 5), round(r[i][1], 5)); b = (round(r[i + 1][0], 5), round(r[i + 1][1], 5))
                    if a == b:
                        continue
                    k = (a, b) if a < b else (b, a)
                    owners = edge_owner.get(k, {nm})
                    if len(owners) >= 2:
                        t = 'b' if min(owners) == nm else 'skip'
                    else:
                        # same-country internal edge (Crimea seam) shows up twice in one owner set
                        t = 'c'
                    if t != run_type:
                        flush()
                        run = [pr[i]]
                        run_type = t
                    run.append(pr[i + 1])
                flush()

    # internal seams: edges listed twice for the same owner -> coast lines duplicated; detect by counting
    # graticule
    grat = []
    step = 10 if S > 1500 else (5 if S > 500 else 2)
    for lon in range(-180, 181, step):
        line = [shift(proj(lon, lat)) for lat in [x * 0.5 for x in range(-170, 171)] if ang_dist(lon, lat, clon, clat) < 80]
        for piece in clip_polyline(line, lim):
            grat.append({'k': 'lon', 'v': lon, 'pts': [rnd(q, S) for q in dp(piece, S / 800)]})
    for lat in range(-80, 81, step):
        line = [shift(proj(lon, lat)) for lon in [x * 0.5 for x in range(-360, 361)] if ang_dist(lon, lat, clon, clat) < 80]
        for piece in clip_polyline(line, lim):
            grat.append({'k': 'lat', 'v': lat, 'pts': [rnd(q, S) for q in dp(piece, S / 800)]})

    seas = []
    for nm, lon, lat in SEAS:
        if ang_dist(lon, lat, clon, clat) > 60:
            continue
        x, y = shift(proj(lon, lat))
        if abs(x) < S * 0.92 and abs(y) < S * 0.92:
            seas.append({'name': nm, 'x': round(x / S, 4), 'y': round(y / S, 4)})

    cities = []
    for nm, lon, lat, cap in CITIES[code]:
        x, y = shift(proj(lon, lat))
        cities.append({'name': nm, 'x': round(x / S, 4), 'y': round(y / S, 4), 'capital': cap})

    out = {
        'code': code, 'center': [round(clon, 3), round(clat, 3)], 'kmPerUnit': round(S, 2),
        'extent': [round(hx / S, 4), round(hy / S, 4)],
        'slab': slab, 'land': land, 'borders': border_lines, 'coasts': coast_lines,
        'labels': labels, 'graticule': grat, 'gratStep': step, 'seas': seas, 'cities': cities,
    }
    s = json.dumps(out, separators=(',', ':'), ensure_ascii=False)
    open(f'{OUT}/{code}.json', 'w').write(s)
    nv = sum(len(r) for p in slab for r in p)
    print(code, f'S={S:.0f}km', 'slab polys', len(slab), 'verts', nv, 'land', len(land), 'borders', len(border_lines), 'coasts', len(coast_lines), f'{len(s)/1024:.0f}KB')

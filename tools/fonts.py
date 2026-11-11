import sys, io
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib import instancer

# usage: python3 fonts.py <path to a google/fonts checkout's ofl folder> <output folder>
SRC = sys.argv[1] if len(sys.argv) > 1 else 'ofl'
OUT = sys.argv[2] if len(sys.argv) > 2 else '../assets/fonts'

latin = list(range(0x20, 0x7F)) + list(range(0xA0, 0x180)) + [0x218, 0x219, 0x21A, 0x21B, 0x259, 0x2BB, 0x2BC, 0x2019, 0x2018, 0x201C, 0x201D, 0x2013, 0x2014, 0x2022, 0x2026, 0x2032, 0x2033, 0x20AC, 0x2116, 0x2212, 0x2009, 0x202F, 0x2192, 0x2190, 0x00B7, 0x2191, 0x2193, 0x2248, 0x00D7]
cyr = list(range(0x400, 0x530))

JOBS = [
    # out name, src, axes pin (None keep), unicodes
    ('geologica', 'geologica/Geologica[CRSV,SHRP,slnt,wght].ttf', {'CRSV': 0, 'SHRP': 0, 'slnt': 0, 'wght': (300, 800)}, latin + cyr),
    ('unbounded', 'unbounded/Unbounded[wght].ttf', {'wght': (500, 900)}, latin),
    ('ruslan', 'ruslandisplay/RuslanDisplay-Regular.ttf', None, latin),
    ('tektur', 'tektur/Tektur[wdth,wght].ttf', {'wdth': (75, 100), 'wght': (400, 900)}, latin),
    ('elmessiri', 'elmessiri/ElMessiri[wght].ttf', {'wght': (400, 700)}, latin),
    ('alfaslab', 'alfaslabone/AlfaSlabOne-Regular.ttf', None, latin),
    ('cormorant', 'cormorantgaramond/CormorantGaramond-Italic[wght].ttf', {'wght': (500, 700)}, latin),
    ('cinzel', 'cinzel/Cinzel[wght].ttf', {'wght': (400, 900)}, latin),
    ('michroma', 'michroma/Michroma-Regular.ttf', None, latin),
    ('fraunces', 'fraunces/Fraunces[SOFT,WONK,opsz,wght].ttf', {'SOFT': 100, 'WONK': 1, 'opsz': 144, 'wght': (600, 900)}, latin),
    ('abril', 'abrilfatface/AbrilFatface-Regular.ttf', None, latin),
    ('noto-armenian', 'notosansarmenian/NotoSansArmenian[wdth,wght].ttf', {'wdth': 100, 'wght': (400, 600)}, list(range(0x531, 0x590)) + [0x20, 0x2D]),
]

for name, src, axes, uni in JOBS:
    f = TTFont(f'{SRC}/{src}', lazy=False)
    if axes and 'fvar' in f:
        present = {a.axisTag: (a.minValue, a.maxValue) for a in f['fvar'].axes}
        lim = {}
        for k, v in axes.items():
            if k not in present:
                continue
            lo, hi = present[k]
            if isinstance(v, tuple):
                lim[k] = (max(lo, v[0]), min(hi, v[1]))
            else:
                lim[k] = max(lo, min(hi, v))
        f = instancer.instantiateVariableFont(f, lim)
        import io
        buf = io.BytesIO(); f.save(buf); buf.seek(0)
        f = TTFont(buf, lazy=False)
    opts = subset.Options()
    opts.flavor = 'woff'
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    opts.hinting = False
    s = subset.Subsetter(opts)
    s.populate(unicodes=uni)
    s.subset(f)
    f.flavor = 'woff'
    out = f'{OUT}/{name}.woff'
    f.save(out)
    import os
    print(name, os.path.getsize(out) // 1024, 'KB', 'fvar' in f and [ (a.axisTag, a.minValue, a.maxValue) for a in f['fvar'].axes])

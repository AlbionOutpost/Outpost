"""Extract the owner's loadout slot marks from the supplied sheet into transparent PNGs.

Usage: python3 scripts/import-slot-marks.py <sheet.png> [bag,figure,cape,potion,mount,food]
The sheet carries six light marks on black (two rows of three, named left to right, top
row first; the default order is bag, figure, cape, potion, mount, food) with speckle; each is isolated as the largest connected shapes, small holes are filled, the
outline is smoothed and the result is saved as a 256px RGBA mark in public/albion/slots.
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

sheet = Path(sys.argv[1])
order = (sys.argv[2] if len(sys.argv) > 2 else "bag,figure,cape,potion,mount,food").split(",")
out = Path("public/albion/slots")
out.mkdir(parents=True, exist_ok=True)
a = np.asarray(Image.open(sheet).convert("RGB")).astype(float)
mask = a.sum(axis=2) / 3 > 110
lab, n = ndimage.label(ndimage.binary_closing(mask, iterations=3))
sizes = ndimage.sum(mask, lab, range(1, n + 1))
keep = np.argsort(sizes)[::-1][:6] + 1
objs = ndimage.find_objects(lab)
mid = a.shape[0] / 2
items = sorted(
    [(k, objs[k - 1]) for k in keep],
    key=lambda kv: ((kv[1][0].start + kv[1][0].stop) / 2 > mid, (kv[1][1].start + kv[1][1].stop) / 2),
)
for (k, sl), name in zip(items, order):
    bright = a.sum(axis=2) / 3
    comp = (lab == k) & (bright > 110) & (bright < 236)
    cl, cn = ndimage.label(comp)
    cs = ndimage.sum(comp, cl, range(1, cn + 1))
    comp = np.isin(cl, [i + 1 for i, s in enumerate(cs) if s > 400])
    filled = ndimage.binary_fill_holes(comp)
    holes = filled & ~comp
    hl, hn = ndimage.label(holes)
    hs = ndimage.sum(holes, hl, range(1, hn + 1))
    comp = comp | np.isin(hl, [i + 1 for i, s in enumerate(hs) if s < 60])
    ys, xs = np.where(comp)
    sl = (slice(ys.min(), ys.max() + 1), slice(xs.min(), xs.max() + 1))
    comp = ndimage.gaussian_filter(comp.astype(float), sigma=1.0)
    sub = comp[sl]
    h, w = sub.shape
    pad = int(max(h, w) * 0.08)
    size = max(h, w) + 2 * pad
    canvas = np.zeros((size, size))
    y0, x0 = (size - h) // 2, (size - w) // 2
    canvas[y0 : y0 + h, x0 : x0 + w] = sub
    alpha = Image.fromarray((np.clip(canvas, 0, 1) * 255).astype(np.uint8)).resize((256, 256), Image.LANCZOS)
    rgba = Image.new("RGBA", (256, 256), (184, 184, 186, 0))
    rgba.putalpha(alpha)
    rgba.save(out / f"{name}.png", optimize=True)
    print(name, sub.shape)

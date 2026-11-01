#!/usr/bin/env python3
"""Trim unused Inter weight extremes; retain every glyph and the variable 400–800 range.
Requires fonttools[woff]. Source and output remain under the existing SIL OFL notice.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

root = Path(__file__).resolve().parent.parent
source = root / 'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'
target = root / 'public/fonts/inter-latin-400-800.woff2'
font = TTFont(source)
original_glyphs = font.getBestCmap()
font = instantiateVariableFont(font, {'wght': (400, 800)}, inplace=True)
assert font.getBestCmap() == original_glyphs
font.flavor = 'woff2'
target.parent.mkdir(parents=True, exist_ok=True)
font.save(target)
print(f'{source.stat().st_size} → {target.stat().st_size} bytes; {len(original_glyphs)} mapped characters retained')

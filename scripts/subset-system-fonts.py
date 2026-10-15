"""Build OFL M PLUS 1p system subsets: script.py regular.ttf medium.ttf bold.ttf."""
from pathlib import Path
from fontTools import subset
from fontTools.pens.boundsPen import BoundsPen
import sys

output = Path(__file__).resolve().parent.parent / "public/fonts/system"
output.mkdir(parents=True, exist_ok=True)
for source, weight in zip(sys.argv[1:], [400, 500, 700]):
    options = subset.Options()
    options.flavor = "woff"
    options.recalc_timestamp = False
    font = subset.load_font(source, options)
    sub = subset.Subsetter(options=options)
    sub.populate(unicodes=[*range(32, 0x250), *range(0x2000, 0x2070), *range(0x2190, 0x2200), *range(0x25a0, 0x2600)])
    sub.subset(font)
    for record in font['name'].names:
        if record.nameID in [1, 4, 6]:
            name = f'WiiSystem-{weight}' if record.nameID == 6 else f'Wii System {weight}'
            record.string = name.encode(record.getEncoding())
    glyphs = font.getGlyphSet()
    bounds = []
    for glyph in glyphs.values():
        pen = BoundsPen(glyphs)
        glyph.draw(pen)
        if pen.bounds: bounds.append(pen.bounds)
    ascent = max(950, int(max(b[3] for b in bounds)) + 10)
    descent = max(250, -int(min(b[1] for b in bounds)) + 10)
    font['hhea'].ascent, font['hhea'].descent, font['hhea'].lineGap = ascent, -descent, 0
    os = font['OS/2']
    os.sTypoAscender, os.sTypoDescender, os.sTypoLineGap = ascent, -descent, 0
    os.usWinAscent, os.usWinDescent = ascent, descent
    subset.save_font(font, str(output / f'mplus-1p-{weight}-latin.woff'), options)

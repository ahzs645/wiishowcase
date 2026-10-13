"""Build the licensed Latin menu font: python script.py /path/to/MPLUS1p-Bold.ttf."""
from pathlib import Path
from fontTools import subset
import argparse

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('source', type=Path)
args = parser.parse_args()
output = Path(__file__).resolve().parent.parent/'public/fonts/menu/mplus-1p-bold-latin.woff'
options = subset.Options()
options.flavor = 'woff'
options.recalc_timestamp = False
font = subset.load_font(str(args.source), options)
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=range(32, 127))
subsetter.subset(font)
for record in font['name'].names:
    if record.nameID in [1, 4, 6]:
        name = 'WiiMenuDate-Bold' if record.nameID == 6 else 'Wii Menu Date Bold'
        record.string = name.encode(record.getEncoding())
# The original CJK font has much taller line metrics than these Latin glyphs.
# Every retained glyph fits inside y=-230..815; these metrics include all of them
# and keep the browser's text range inside the menu's date line.
font['hhea'].ascent = 850
font['hhea'].descent = -250
font['hhea'].lineGap = 0
os = font['OS/2']
os.sTypoAscender = 850
os.sTypoDescender = -250
os.sTypoLineGap = 0
os.usWinAscent = 850
os.usWinDescent = 250
output.parent.mkdir(parents=True, exist_ok=True)
subset.save_font(font, str(output), options)
print(f'{output.name}: {output.stat().st_size} bytes')

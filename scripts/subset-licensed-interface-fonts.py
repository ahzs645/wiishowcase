"""Site-specific web subsets; the user confirmed embedding rights on 2026-10-15.
Fonts remain separate from the Wii.css distribution. Pass the uploaded fonts folder.
"""
import hashlib
import json
import sys
from pathlib import Path
from fontTools import subset

source=Path(sys.argv[1])
root=Path(__file__).resolve().parent.parent
output=root/'public/fonts/licensed'
output.mkdir(parents=True,exist_ok=True)
fonts=[]
for filename,slug in [
    ('FOT-NewRodin Pro DB.otf','newrodin-db'),('fot-new-rodin-pro-eb.otf','newrodin-eb'),
    ('FOT-Rodin Pro L.otf','rodin-l'),('FOT-Rodin Pro M.otf','rodin-m'),('FOT-Rodin Pro DB.otf','rodin-db'),
    ('FOT-Rodin Pro B.otf','rodin-b'),('FOT-Rodin Pro EB.otf','rodin-eb'),('FOT-Rodin Pro UB.otf','rodin-ub'),
]:
    path=source/filename
    options=subset.Options();options.flavor='woff2';options.recalc_timestamp=False
    font=subset.load_font(str(path),options)
    s=subset.Subsetter(options=options)
    s.populate(unicodes=[*range(32,0x250),*range(0x1e00,0x1f00),*range(0x2000,0x2070),*range(0x2190,0x2200),*range(0x25a0,0x2600),0xff0b])
    s.subset(font)
    # Preserve glyph shapes, advances, family names and embedding metadata.
    # Latin line metrics avoid the unused CJK line gap inflating HTML text boxes.
    font['hhea'].ascent=950;font['hhea'].descent=-250;font['hhea'].lineGap=0
    os=font['OS/2'];os.sTypoAscender=950;os.sTypoDescender=-250;os.sTypoLineGap=0;os.usWinAscent=950;os.usWinDescent=250
    target=output/(slug+'-latin.woff2')
    subset.save_font(font,str(target),options)
    fonts.append({'source':filename,'sourceSHA256':hashlib.sha256(path.read_bytes()).hexdigest(),'asset':str(target.relative_to(root)),'bytes':target.stat().st_size,'family':font['name'].getDebugName(1),'nominalWeight':os.usWeightClass})
    print(target.name,target.stat().st_size)
(output/'manifest.json').write_text(json.dumps({'authorization':'User confirmed licensed public-site web embedding on 2026-10-15. These proprietary files are not MIT assets or generic Wii.css distribution assets.','scope':'Latin, extended Latin, punctuation and UI symbols; other scripts use browser fallback.','fonts':fonts},indent=2)+'\n')

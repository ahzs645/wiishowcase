"""Render four-size inspection sheets without stretching source references.

For the preserved initial inspection:
  python scripts/render-interface-review-sheets.py --revision 4a5fa10 --output docs/interface-assets/review
For a new inspection, omit --revision and use a new output directory. This renders
images only; it cannot perform or attest to a manual review.
"""
from PIL import Image, ImageDraw, ImageFont, ImageOps
from pathlib import Path
from io import BytesIO
import argparse, json, subprocess, posixpath

parser=argparse.ArgumentParser()
parser.add_argument('--revision')
parser.add_argument('--output', required=True)
args=parser.parse_args()
root='docs/interface-assets'
out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
def read(path):
    path=posixpath.normpath(path)
    if path.startswith('../'):raise ValueError(path)
    return subprocess.check_output(['git','show',f'{args.revision}:{path}']) if args.revision else Path(path).read_bytes()
def fit(path,size):
    return ImageOps.pad(Image.open(BytesIO(read(path))).convert('RGB'),size,color=(220,226,231),method=Image.Resampling.LANCZOS)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',18)
bold=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',22)
comparison=json.loads(read(f'{root}/comparison.json'))
for i,s in enumerate(comparison['states']):
    sheet=Image.new('RGB',(1440,1700),'white');draw=ImageDraw.Draw(sheet)
    draw.text((15,10),f'{i+1:02d}. {s["id"]} — {s["title"]}',font=bold,fill='black')
    c=s['captures'][0];r=c.get('reference')
    if r:sheet.paste(fit(f'docs/interface-audit/{r["image"]}',(360,240)),(0,45))
    for y,text in [(55,f'Reference above: {r["id"] if r else "NONE"}'),(85,f'Source cohort: {args.revision or "working tree"}'),(115,'50% source/prior overlays: centered contain, no registration.'),(145,'Each row uses its own reference, including wide SD/settings.'),(175,'720-line images reduced to fit; inspect originals for details.')]:
        draw.text((380,y),text,font=font,fill='black')
    for x,label in [(0,'CURRENT'),(480,'50% REFERENCE OVERLAY'),(960,'50% PREVIOUS OVERLAY')]:draw.text((x+12,305),label,font=bold,fill='black')
    for j,c in enumerate(sorted(s['captures'],key=lambda c:(c['height'],c['width']))):
        y=340+j*340;size=(480,300)
        draw.text((12,y),f'{c["width"]}×{c["height"]} / {c["mode"]}',font=font,fill='black');y+=25
        current=f'{root}/{c["image"]}';base=Image.open(BytesIO(read(current))).convert('RGB')
        sheet.paste(fit(current,size),(0,y))
        ref=f'docs/interface-audit/{c["reference"]["image"]}' if c.get('reference') else None
        before=f'{root}/{c["before"]}' if c.get('before') else None
        for x,p in [(480,ref),(960,before)]:
            if p:
                overlay=Image.blend(base,fit(p,base.size),.5)
                sheet.paste(ImageOps.pad(overlay,size,color=(220,226,231),method=Image.Resampling.LANCZOS),(x,y))
            else:draw.text((x+20,y+60),'No comparison source',font=font,fill='red')
    sheet.save(out/f'{i+1:02d}-{s["id"]}.jpg',quality=82)
print(f'Rendered {len(comparison["states"])} sheets; manual inspection still required.')

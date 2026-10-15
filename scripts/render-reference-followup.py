"""Render aspect-preserving source/current/overlay/prior inspection sheets."""
import json,pathlib
from PIL import Image,ImageOps,ImageDraw
root=pathlib.Path('docs/interface-assets/reference-followup')
data=json.loads((root/'captures.json').read_text())
sources={r['id']:r for r in json.loads(pathlib.Path('docs/interface-assets/references/references.json').read_text())['references']}
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
from PIL import ImageFont
label=ImageFont.truetype(font,16);title=ImageFont.truetype(font,22)
groups={}
for c in data['captures']:groups.setdefault(c['id'],[]).append(c)
def fit(path,size):
 im=Image.open(path).convert('RGB');im=ImageOps.contain(im,size);out=Image.new('RGB',size,'#dce3e8');out.paste(im,((size[0]-im.width)//2,(size[1]-im.height)//2));return out
for id,rows in groups.items():
 sheet=Image.new('RGB',(1440,1320),'#edf2f5');draw=ImageDraw.Draw(sheet);draw.text((16,12),rows[0]['title'],font=title,fill='#183246');draw.text((16,45),'Sources preserved; overlays are uncalibrated. Native aspect / crop is unverified.',font=label,fill='black')
 for i,c in enumerate(sorted(rows,key=lambda c:(c['height'],c['width']))):
  y=80+i*305;ours=fit(root/c['image'],(350,263));ref=sources[c['sourceIds'][0]] if c['sourceIds'] else None
  before=fit(root/c['before']['image'],(350,263)) if c.get('before') else None
  source=fit(pathlib.Path('docs/interface-assets/references')/ref['image'],(350,263)) if ref else None
  panels=[source,ours,Image.blend(ours,source,.5) if source else None,before]
  names=[ref['id']+' (structure only)' if ref else 'No matching native source',f"Current {c['width']}×{c['height']}",'50% source overlay' if ref else 'No source overlay','Before this pass' if before else 'Newly captured step']
  for j,(im,name) in enumerate(zip(panels,names)):
   x=10+j*360
   if im:sheet.paste(im,(x,y))
   draw.text((x,y+266),name,font=label,fill='black')
 sheet.save(root/(id+'.jpg'),quality=91)
print('Rendered',len(groups),'four-size inspection sheets')

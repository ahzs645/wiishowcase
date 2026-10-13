from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import json

root = Path(__file__).resolve().parent.parent
out = root / 'docs/menu-fidelity'
entries = json.loads((out/'comparison.json').read_text())['entries']
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',19)
small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',14)

def fit(file,w,h):
    im=Image.open(file).convert('RGB');scale=min(w/im.width,h/im.height)
    im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
    frame=Image.new('RGB',(w,h),'#d9e2e7');frame.paste(im,((w-im.width)//2,(h-im.height)//2))
    return frame

def curve_y(im):
    a=np.asarray(im).astype(int);scale=im.height/480
    top=round(340*scale);bottom=round(412*scale)
    ys=[]
    for x in range(im.width):
        col=a[top:bottom,x]
        mask=(col[:,1]-col[:,0]>15)&(col[:,2]-col[:,1]>10)
        matches=np.flatnonzero(mask)
        ys.append(float(matches[0]+top) if len(matches) else float('nan'))
    return np.asarray(ys)

measures=[]
for entry in entries:
    if entry['mode']!='4:3': continue
    w,h=entry['width'],entry['height']
    reference=fit(root/'docs/interface-audit'/entry['reference']['image'],w,h)
    before=fit(out/entry['before'],w,h);after=fit(out/entry['image'],w,h)
    r,b,a=curve_y(reference),curve_y(before),curve_y(after)
    valid=np.isfinite(r)&np.isfinite(b)&np.isfinite(a)
    # Exclude the edges, where capture cropping and filter falloff dominate.
    valid[:round(10*w/640)]=False;valid[-round(10*w/640):]=False
    scale=h/480
    measures.append({'size':f'{w}×{h}','columnsCompared':int(valid.sum()),'beforeMeanVerticalErrorNativePixels':round(float(np.abs(b[valid]-r[valid]).mean()/scale),3),'afterMeanVerticalErrorNativePixels':round(float(np.abs(a[valid]-r[valid]).mean()/scale),3),'scope':'Cyan curve trace only, with aspect-preserving centred reference. Not overall image fidelity.'})
(out/'curve-alignment.json').write_text(json.dumps(measures,indent=2)+'\n')

for filename,mode in [('menu-43-comparison','4:3'),('menu-wide-comparison','16:9')]:
    entry=next(e for e in entries if e['mode']==mode and e['height']==480)
    cw,ch=350,263
    canvas=Image.new('RGB',(1450,380),'#eaf1f6');draw=ImageDraw.Draw(canvas)
    draw.text((15,12),'Wii Menu · Reference / Previous pass / Corrected / 50% overlay',font=font,fill='#263e4c')
    paths=[root/'docs/interface-audit'/entry['reference']['image'],out/entry['before'],out/entry['image']]
    frames=[fit(p,cw,ch) for p in paths]
    frames.append(Image.blend(frames[0],frames[2],.5))
    for i,(title,im) in enumerate(zip(['Wii reference','Before · 3e96806','Corrected geometry','Reference overlay'],frames)):
        x=15+i*355;draw.text((x,46),title,font=small,fill='#385466');canvas.paste(im,(x,72))
    note='4:3: time/date and icon phases aligned. Installed channels differ.' if mode=='4:3' else 'Wide: 2560×1440 archived capture. Time/date and channels differ; capture settings undocumented.'
    draw.text((15,346),note,font=small,fill='#385466')
    canvas.save(out/(filename+'.png'),optimize=True)
print(json.dumps(measures))

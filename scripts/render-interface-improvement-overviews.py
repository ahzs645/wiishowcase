from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import json
root=Path(__file__).resolve().parent.parent
out=root/'docs/interface-improvements'
entries=json.loads((out/'comparison.json').read_text())['entries']
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',19)
small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',14)
def fit(path,w,h):
    im=Image.open(path).convert('RGB');scale=min(w/im.width,h/im.height);im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS);frame=Image.new('RGB',(w,h),'#dfe8ed');frame.paste(im,((w-im.width)//2,(h-im.height)//2));return frame
for filename,ids in [('menu-comparison',['menu-settled']),('system-comparisons',['options','settings-one','remote-settings','memo-composer','address-book','system-keyboard'])]:
    rows=[e for ident in ids for e in entries if e['id']==ident]
    cw=350;fh=263;rowh=345
    canvas=Image.new('RGB',(4*cw+50,rowh*len(rows)+65),'#eaf1f6');draw=ImageDraw.Draw(canvas)
    draw.text((15,15),'Wii interface · Reference / Before / After / After overlay',font=font,fill='#263e4c')
    for row,e in enumerate(rows):
        y=65+row*rowh
        draw.text((15,y),e['title']+' · '+e['mode'],font=font,fill='#263e4c')
        ratio=e['width']/e['height'];h=263;w=350
        ref=fit(root/'docs/interface-audit'/e['reference']['image'],w,h)
        before=fit(root/'docs/interface-audit'/e['baseline']['image'],w,h)
        after=fit(out/e['image'],w,h)
        for col,(title,im) in enumerate([('Reference',ref),('Before',before),('After',after),('50% whole-frame overlay',Image.blend(ref,after,.5))]):
            x=15+col*(cw+5);draw.text((x,y+28),title,font=small,fill='#385466');canvas.paste(im,(x,y+52))
        note='Preserved aspect; source content, dates, crop and animation phase may differ.'
        if e['before']!=e['id']:note='Before: destination was unwired; earlier '+e['before'].replace('-',' ')+' screen shown. Preserve source aspect.'
        draw.text((15,y+321),note,font=small,fill='#385466')
    canvas.save(out/(filename+'.png'),optimize=True)
print('Rendered comparison overviews.')

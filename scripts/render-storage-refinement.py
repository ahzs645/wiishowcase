import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent.parent
out = root / 'docs/storage-menu-refinement'
report = json.loads((out / 'comparison.json').read_text())
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 18)
for mode, width, suffix in [('4:3',640,'43'),('16:9',854,'169')]:
    cell_w, cell_h = 420, round(420*480/width)
    rows = ['options','save-chooser','save-grid']
    canvas = Image.new('RGB',(3*cell_w, 45+len(rows)*(cell_h+40)), '#eaf0f3')
    draw = ImageDraw.Draw(canvas)
    for col, text in enumerate(['Original Wii (4:3 manual)','Before — 75c61ab','After — current application']):
        draw.text((col*cell_w+10,12),text,font=font,fill='#243b49')
    for row, id in enumerate(rows):
        state = next(s for s in report['states'] if s['id']==id)
        c = next(c for c in state['captures'] if c['width']==width and c['height']==480)
        draw.text((10,45+row*(cell_h+40)),state['title'],font=font,fill='#243b49')
        for col, p in enumerate([root/'docs/interface-audit'/c['reference']['image'],out/c['before'],out/c['image']]):
            im = Image.open(p).convert('RGB')
            im.thumbnail((cell_w,cell_h),Image.Resampling.LANCZOS) if im.width>=cell_w else None
            # Enlarge the small manual image while preserving its own aspect.
            scale = min(cell_w/im.width,cell_h/im.height)
            im = im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
            x=col*cell_w+(cell_w-im.width)//2
            y=75+row*(cell_h+40)+(cell_h-im.height)//2
            canvas.paste(im,(x,y))
    canvas.save(out/f'overview-{suffix}.jpg',quality=90)

# Explicit whole-frame 50% native overlays for the two standard aspect ratios.
for width,suffix in [(640,'43'),(854,'169')]:
    c=next(c for c in report['states'][0]['captures'] if c['width']==width and c['height']==480)
    current=Image.open(out/c['image']).convert('RGB')
    source=Image.open(root/'docs/interface-audit'/c['reference']['image']).convert('RGB')
    scale=min(width/source.width,480/source.height)
    source=source.resize((round(source.width*scale),round(source.height*scale)),Image.Resampling.LANCZOS)
    native=Image.new('RGB',(width,480),'#d8e1e8')
    native.paste(source,((width-source.width)//2,(480-source.height)//2))
    Image.blend(current,native,0.5).save(out/f'options-native-overlay-{suffix}.png')
print('Rendered storage overviews and native overlays at both aspects')

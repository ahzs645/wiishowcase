from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json

root = Path(__file__).resolve().parent.parent
out = root / 'docs/menu-typography'
samples = json.loads((out/'results.json').read_text())['specimens']
title_font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 22)
label_font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 16)

def fit(path, width, height):
    image = Image.open(path).convert('RGB')
    scale = min(width/image.width, height/image.height)
    image = image.resize((round(image.width*scale), round(image.height*scale)), Image.Resampling.LANCZOS)
    frame = Image.new('RGB', (width, height), '#d9e2e7')
    frame.paste(image, ((width-image.width)//2, (height-image.height)//2))
    return frame

for height, filename in [(480, 'typography-comparison.png'), (720, 'typography-comparison-720.png')]:
    sheet = Image.new('RGB', (1630, 570), '#eaf1f6')
    draw = ImageDraw.Draw(sheet)
    draw.text((15, 12), 'Wii date and clock · source-matched glyph specimens', font=title_font, fill='#263e4c')
    for row, mode in enumerate(['4:3', '16:9']):
        sample = next(s for s in samples if s['mode'] == mode and s['height'] == height)
        width = sample['width']
        source = 'copetti-home.png' if mode == '4:3' else 'mariowiki-menu-wide.png'
        paths = [root/'docs/interface-audit/references'/source, out/'before'/f'menu-{width}x{height}.png', out/sample['image']]
        scale = height/480
        crop = (round(width/2-130*scale), round(340*scale), round(width/2+130*scale), round(450*scale))
        frames = [fit(p, width, height).crop(crop).resize((390, 165), Image.Resampling.LANCZOS) for p in paths]
        frames.append(Image.blend(frames[0], frames[2], .5))
        top = 55+row*240
        draw.text((15, top), f'{mode} · {width}×{height} · {sample["time"]} {sample["period"]} / {sample["date"]}', font=label_font, fill='#385466')
        for col, (label, image) in enumerate(zip(['Wii reference', 'Before · actual 6552e57', 'Current · matching text', '50% reference overlay'], frames)):
            left = 15+col*402
            draw.text((left, top+27), label, font=label_font, fill='#385466')
            sheet.paste(image, (left, top+52))
    draw.text((15, 539), 'Current specimens use the real Clock components. Old wide capture has another time/date. Rodin shapes still differ.', font=label_font, fill='#385466')
    sheet.save(out/filename, optimize=True)
print('Rendered enlarged typography comparisons at 480 and 720 lines.')

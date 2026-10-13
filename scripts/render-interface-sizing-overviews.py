from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import json

root = Path(__file__).resolve().parent.parent
output = root / 'docs/interface-sizing'
entries = json.loads((output / 'comparison.json').read_text())['entries']
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 19)
small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 14)

def fit(path, width, height):
    image = Image.open(path).convert('RGB')
    scale = min(width / image.width, height / image.height)
    image = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
    frame = Image.new('RGB', (width, height), '#dfe8ed')
    frame.paste(image, ((width-image.width)//2, (height-image.height)//2))
    return frame

for filename, ids in [
    ('save-data-comparison', ['save-grid']),
    ('settings-comparison', ['settings-one']),
    ('menu-comparison', ['menu-settled']),
    ('message-comparisons', ['create-message', 'memo-composer', 'address-book']),
    ('remote-keyboard-comparisons', ['remote-settings', 'system-keyboard']),
]:
    rows = [e for ident in ids for e in entries if e['id'] == ident and e['height'] == 720]
    canvas = Image.new('RGB', (1450, 345 * len(rows) + 65), '#eaf1f6')
    draw = ImageDraw.Draw(canvas)
    draw.text((15, 15), 'Wii sizing · Reference / Previous pass / Refined / Refined overlay', font=font, fill='#263e4c')
    for row, entry in enumerate(rows):
        y = 65 + row * 345
        draw.text((15, y), entry['title'] + ' · ' + entry['mode'], font=font, fill='#263e4c')
        reference = fit(root / 'docs/interface-audit' / entry['reference']['image'], 350, 263)
        previous = fit(root / 'docs/interface-improvements' / entry['baseline']['image'], 350, 263)
        refined = fit(output / entry['image'], 350, 263)
        columns = [('Wii reference', reference), ('Previous · c8c9da9', previous), ('Refined sizing', refined), ('50% reference overlay', Image.blend(reference, refined, .5))]
        for column, (title, image) in enumerate(columns):
            x = 15 + column * 355
            draw.text((x, y+28), title, font=small, fill='#385466')
            canvas.paste(image, (x, y+52))
        draw.text((15, y+321), 'Preserved aspect; small/cropped manual references establish structure. Content and font metrics may differ.', font=small, fill='#385466')
    canvas.save(output / (filename + '.png'), optimize=True)
print('Rendered five sizing comparison sheets.')

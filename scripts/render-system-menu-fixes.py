from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import os
root=Path(__file__).resolve().parent.parent/'docs'
output=os.environ.get('SYSTEM_COMPARISON_OUTPUT','docs/system-menu-fixes').removeprefix('docs/')
baseline=os.environ.get('SYSTEM_COMPARISON_BASELINE','other-menus')
items=[('settings-one','Settings'),('date','Date'),('sound','Sound'),('sd-menu','SD Menu'),('memo-composer','Memo'),('address-book','Address Book'),('home-menu','HOME'),('system-phone','Phone keyboard')]
canvas=Image.new('RGB',(1280,8*278+66),'#edf2f7');d=ImageDraw.Draw(canvas)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',18)
d.text((18,15),('Before — cb8b37b' if baseline=='system-menu-fixes' else 'Before — original audit'),font=font,fill='#213545');d.text((658,15),'After — system menu fixes',font=font,fill='#213545')
for i,(id,title)in enumerate(items):
 y=55+i*278;d.text((18,y),title,font=font,fill='#213545')
 for col,folder in enumerate([baseline,output]):
  im=Image.open(root/folder/'current'/f'{id}-640x480.png').convert('RGB');im.thumbnail((624,240));canvas.paste(im,(col*640+8+(624-im.width)//2,y+28))
canvas.save(root/output/'overview.jpg',quality=90)

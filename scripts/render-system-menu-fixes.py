from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import os
root=Path(__file__).resolve().parent.parent/'docs'
output=os.environ.get('SYSTEM_COMPARISON_OUTPUT','docs/system-menu-fixes').removeprefix('docs/')
baseline=os.environ.get('SYSTEM_COMPARISON_BASELINE','other-menus')
items=[('settings-one','Settings'),('date','Date'),('sound','Sound'),('sd-menu','SD Menu'),('memo-composer','Memo'),('address-book','Address Book'),('home-menu','HOME'),('system-phone','Phone keyboard')]
if output=='interface-assets':items=[('options','Options / supplied tile art'),('date','Date / supplied Rodin numerals'),('create-message','Supplied message choices'),('memo-composer','Supplied Memo paper'),('calendar','Shared interactive calendar'),('home-menu','HOME / supplied remote'),('system-phone','System keyboard / authentic type'),('sd-menu','SD Menu / supplied return icon')]
canvas=Image.new('RGB',(1280,8*278+66),'#edf2f7');d=ImageDraw.Draw(canvas)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',18)
d.text((18,15),('Before — 8aacaa4 / prior matching capture' if output=='interface-assets' else 'Before — cb8b37b' if baseline=='system-menu-fixes' else 'Before — original audit'),font=font,fill='#213545');d.text((658,15),'After — shared Wii.css assets' if output=='interface-assets' else 'After — system menu fixes',font=font,fill='#213545')
for i,(id,title)in enumerate(items):
 y=55+i*278;d.text((18,y),title,font=font,fill='#213545')
 for col,folder in enumerate([baseline,output]):
  if output=='interface-assets' and col==0 and id=='options':folder='storage-menu-refinement'
  im=Image.open(root/folder/'current'/f'{id}-640x480.png').convert('RGB');im.thumbnail((624,240));canvas.paste(im,(col*640+8+(624-im.width)//2,y+28))
canvas.save(root/output/'overview.jpg',quality=90)

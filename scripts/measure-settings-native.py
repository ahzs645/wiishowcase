"""Independent source-pixel connected components; no runtime CSS values read."""
import json
from collections import deque
from pathlib import Path
from PIL import Image
import numpy as np
root=Path(__file__).resolve().parent.parent
rows=[]
for name in ['copetti-settings','settings-wii-guide']:
 im=np.array(Image.open(root/'docs/interface-audit/references'/f'{name}.png').convert('RGB'));height,width=im.shape[:2]
 neutral=im.max(2).astype(int)-im.min(2).astype(int)<60
 white=(im.min(2)>160)&neutral
 def components(mask):
  result=[];mask=mask.copy();h,w=mask.shape
  for y,x in zip(*np.nonzero(mask)):
   if not mask[y,x]:continue
   todo=deque([(x,y)]);mask[y,x]=False;xs=[];ys=[]
   while todo:
    xx,yy=todo.popleft();xs.append(xx);ys.append(yy)
    for nx,ny in [(xx-1,yy),(xx+1,yy),(xx,yy-1),(xx,yy+1)]:
     if 0<=nx<w and 0<=ny<h and mask[ny,nx]:mask[ny,nx]=False;todo.append((nx,ny))
   if len(xs)>100:result.append([min(xs),min(ys),max(xs)-min(xs)+1,max(ys)-min(ys)+1,len(xs)])
  return result
 regions={'title':(0,int(height*.045),int(width*.7),int(height*.132)), 'back':(0,int(height*.82),int(width*.5),height)}
 for mode,framewidth in [('4:3',640),('16:9',854)]:
  if (name=='copetti-settings')!=(mode=='4:3'):continue
  factor=min(framewidth/width,480/height);offset=[(framewidth-width*factor)/2,(480-height*factor)/2]
  anchors={}
  for region,(x0,y0,x1,y1) in regions.items():
   cs=components(white[y0:y1,x0:x1]);component=max(cs,key=lambda c:c[4]);x,y,w,h,area=component;x+=x0;y+=y0
   anchors[region]={'sourceXYWH':[x,y,w,h],'containFitXYWH':[x*factor+offset[0],y*factor+offset[1],w*factor,h*factor]}
  rows.append({'source':name,'mode':mode,'originalSize':[width,height],'frame':[framewidth,480],'anchors':anchors})
output={'method':'Neutral bright connected components in predefined original source regions, fitted with preserved aspect. These measure bright pane/fill bounds, not the complete dark border or DOM hit area. Crop, annotation and edge thresholds introduce uncertainty of roughly 2–4 logical pixels. Sources are independent of implementation values.','measurements':rows}
(root/'docs/system-menu-refinement/native-settings-measurements.json').write_text(json.dumps(output,indent=2,default=lambda v:v.item())+'\n')
print(json.dumps(rows,indent=2,default=lambda v:v.item()))

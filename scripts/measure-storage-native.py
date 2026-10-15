"""Independent source-pixel evidence; does not read implementation/CSS tokens."""
import hashlib
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
references = json.loads((root/'docs/interface-audit/references.json').read_text())['references']
report = {
    'method': 'Cyan tile-edge pixels (B-R>18, G-R>10, B>100) within independent source regions; contain fit preserves original aspect. Footer rows use peak average brightness in the lower divider band. Bounds describe filtered source edges, not complete DOM hit boxes.',
    'uncertainty': 'Small manual sources and filtered outlines introduce about 4–8 logical pixels of uncertainty; no native pixel-accuracy score.',
    'measurements': [],
}
for id in ['manual-316','manual-315','manual-312','manual-314']:
    ref = next(r for r in references if r['id']==id)
    path = root/'docs/interface-audit'/ref['image']
    im=Image.open(path).convert('RGB')
    assert list(im.size)==ref['originalSize']
    scale=min(640/im.width,480/im.height)
    inset=((640-im.width*scale)/2,(480-im.height*scale)/2)
    record={'reference':id,'sourceURL':ref['sourceURL'],'originalManifestSHA256':ref['originalSHA256'],'measuredPNGAssetSHA256':hashlib.sha256(path.read_bytes()).hexdigest(),'originalSize':list(im.size),'containScale':scale,'containInset':inset}
    if id!='manual-314':
        tiles=[]
        for left,right in [(0,im.width//2),(im.width//2,im.width)]:
            pixels=[]
            for y in range(int(im.height*.25),int(im.height*.73)):
                for x in range(left,right):
                    r,g,b=im.getpixel((x,y))
                    if b-r>18 and g-r>10 and b>100:pixels.append((x,y))
            x=min(x for x,y in pixels);y=min(y for x,y in pixels)
            w=max(x1 for x1,y1 in pixels)+1-x;h=max(y1 for x1,y1 in pixels)+1-y
            tiles.append({'sourceBounds':[x,y,w,h],'containFit640x480':[inset[0]+x*scale,inset[1]+y*scale,w*scale,h*scale]})
        record['cyanTileEdges']=tiles
    rows=range(int(im.height*.77),int(im.height*.84))
    divider=max(rows,key=lambda y:sum(sum(im.getpixel((x,y)))/3 for x in range(im.width))/im.width)
    record['footerDividerSourceY']=divider
    record['footerDividerContainY']=inset[1]+divider*scale
    report['measurements'].append(record)
out=root/'docs/storage-menu-refinement/native-measurements.json'
out.write_text(json.dumps(report,indent=2)+'\n')
print('Measured four storage sources; dimensions verified and PNG asset hashes recorded')

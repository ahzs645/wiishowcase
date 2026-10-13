"""Measure pixels in source/browser captures and render version-labelled overlays."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json
import numpy as np

root = Path(__file__).resolve().parent.parent
out = root/'docs/menu-versions'
out.mkdir(parents=True, exist_ok=True)
catalog = json.loads((root/'docs/interface-audit/references.json').read_text())['references']
captures = json.loads((root/'docs/menu-fidelity/results.json').read_text())['captures']
matched = json.loads((out/'state-capture-results.json').read_text())['captures']

def fit(path, w, h):
    im = Image.open(path).convert('RGB')
    scale = min(w/im.width, h/im.height)
    im = im.resize((round(im.width*scale), round(im.height*scale)), Image.Resampling.LANCZOS)
    frame = Image.new('RGB', (w, h), '#d9e2e7')
    frame.paste(im, ((w-im.width)//2, (h-im.height)//2))
    return frame

def measure(im):
    a = np.asarray(im).astype(float)
    scale = im.height/480
    def edge(x0, x1):
        x0, x1 = round(x0*scale), round(x1*scale)
        values = a[round(65*scale):round(110*scale), x0:x1]
        gray = (np.ptp(values, axis=2) < 10) & (values[:,:,0] > 150) & (values[:,:,0] < 218)
        score = gray.mean(axis=0)
        bright = values[:,:,0].mean(axis=0)
        best = max(range(x1-x0), key=lambda i: (score[i], -bright[i]))
        return x0+best
    left = edge(50, 90)
    # The Disc channel avoids the artwork changes in other channel interiors.
    columns = a[round(65*scale):round(110*scale), :, 0].mean(axis=0)
    right = min(range(round(220*scale), round(250*scale)), key=lambda x: columns[x])
    rows = a[:, left+round(35*scale):right-round(35*scale), 0].mean(axis=1)
    top = min(range(round(30*scale), round(50*scale)), key=lambda y: rows[y])
    bottom = min(range(round(125*scale), round(136*scale)), key=lambda y: rows[y])
    def cyan_box(box):
        x0,y0,x1,y1 = [round(v*scale) for v in box]
        colors = a[y0:y1,x0:x1]
        mask = (colors[:,:,1]-colors[:,:,0] > 15) & (colors[:,:,2]-colors[:,:,1] > 10)
        y,x = np.where(mask)
        return [int(x.min()+x0),int(y.min()+y0),int(x.max()+x0+1),int(y.max()+y0+1)] if len(x) else None
    curve = []
    for x in range(im.width):
        colors = a[round(340*scale):round(412*scale),x]
        matches = np.flatnonzero((colors[:,1]-colors[:,0] > 15) & (colors[:,2]-colors[:,1] > 10))
        curve.append(float(matches[0]+round(340*scale)) if len(matches) else None)
    # Find each next left border after the prior card's right border. A broad
    # symmetric search can accidentally select that prior right edge instead.
    left_edges = [left]
    for _ in range(3):
        prior_right = left_edges[-1] + (right-left)
        left_edges.append(edge(prior_right/scale+3, prior_right/scale+22))
    return {
        'discBorder': [left,top,right,bottom],
        'columnLeftEdges': left_edges,
        'wiiRing': cyan_box((15,355,135,465)),
        'sdCyan': cyan_box((135,395,205,450)),
        'curve': curve,
    }

measurements = []
traces = []
entries = []
for capture in captures:
    refs = ['mariowiki-menu-wide','wikipedia-menu-wide'] if capture['mode']=='16:9' else ['copetti-home']
    for source_id in refs:
        ref = next(r for r in catalog if r['id']==source_id)
        w,h = capture['width'],capture['height']
        source = fit(root/'docs/interface-audit'/ref['image'],w,h)
        before_path = f'before/menu-{w}x{h}.png'
        before = fit(out/before_path,w,h)
        state = next(s for s in matched if s['id']==source_id and s['width']==w and s['height']==h)
        after = fit(out/state['image'],w,h)
        entry = {'reference':ref,'width':w,'height':h,'mode':capture['mode'],'before':before_path,'after':state['image'],'matchedState':state}
        if capture['mode']=='16:9':
            reference, old, new = [measure(frame) for frame in [source,before,after]]
            scale = h/480
            def deviations(m):
                curve = np.array([np.nan if v is None else v for v in m['curve']])
                rcurve = np.array([np.nan if v is None else v for v in reference['curve']])
                valid = np.isfinite(curve) & np.isfinite(rcurve)
                valid[:round(10*scale)]=False
                valid[-round(10*scale):]=False
                return {
                    'discBorderMeanErrorNativePixels':round(float(np.abs(np.array(m['discBorder'])-np.array(reference['discBorder'])).mean()/scale),3),
                    'columnEdgeMeanErrorNativePixels':round(float(np.abs(np.array(m['columnLeftEdges'])-np.array(reference['columnLeftEdges'])).mean()/scale),3),
                    'curveMeanVerticalErrorNativePixels':round(float(np.abs(curve[valid]-rcurve[valid]).mean()/scale),3),
                    'curveColumnsCompared':int(valid.sum()),
                }
            compact = lambda m: {k:v for k,v in m.items() if k!='curve'}
            row = {'source':source_id,'width':w,'height':h,'reference':compact(reference),'before':compact(old),'after':compact(new),'beforeDeviation':deviations(old),'afterDeviation':deviations(new),'scope':'Neutral Disc-outline centers, neutral side borders and cyan landmarks/curve, sampled independently from image pixels. Not overall fidelity; firmware/capture settings unverified.'}
            measurements.append(row)
            traces.append({'source':source_id,'width':w,'height':h,'reference':reference['curve'],'before':old['curve'],'after':new['curve']})
            entry['measurements']={key:{k:v for k,v in value.items() if k!='curve'} for key,value in [('reference',reference),('before',old),('after',new)]}
        entries.append(entry)

(out/'comparison.json').write_text(json.dumps({'beforeRevision':'e12cb5f0e9280702972a7b2cb2f1dd8556949e8c','entries':entries},ensure_ascii=False,indent=2)+'\n')
(out/'measurements.json').write_text(json.dumps(measurements,ensure_ascii=False,indent=2)+'\n')
(out/'curve-traces.json').write_text(json.dumps(traces,separators=(',',':'))+'\n')

font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',19)
small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',14)
sheet=Image.new('RGB',(1450,605),'#eaf1f6')
draw=ImageDraw.Draw(sheet)
draw.text((15,12),'16:9 menu · independent references / before / current / 50% overlay',font=font,fill='#263e4c')
for row,source_id in enumerate(['mariowiki-menu-wide','wikipedia-menu-wide']):
    entry=next(e for e in entries if e['reference']['id']==source_id and e['height']==480)
    top=50+row*260
    draw.text((15,top),'Archived 2560×1440' if row==0 else 'Independent 420×236',font=small,fill='#385466')
    draw.text((260,top),'Exact firmware unknown · visible features consistent with 4.0+',font=small,fill='#385466')
    paths=[root/'docs/interface-audit'/entry['reference']['image'],out/entry['before'],out/entry['after']]
    frames=[fit(p,350,197) for p in paths]
    frames.append(Image.blend(frames[0],frames[2],.5))
    for col,(label,image) in enumerate(zip(['Wii reference','Before · e12cb5f','Current wide geometry','Reference overlay'],frames)):
        left=15+col*355
        draw.text((left,top+25),label,font=small,fill='#385466')
        sheet.paste(image,(left,top+48))
draw.text((15,578),'Current time/date matched; before differs. Channel artwork, animation phases and SD appearance differ.',font=small,fill='#385466')
sheet.save(out/'wide-reference-comparison.png',optimize=True)
print(json.dumps([{'source':r['source'],'size':f'{r["width"]}×{r["height"]}','before':r['beforeDeviation'],'after':r['afterDeviation']} for r in measurements],ensure_ascii=False))

"""Export supplied Illustrator artboards and SVGs without redrawing their artwork.

Usage: python scripts/import-interface-assets.py /workspace/scratch/user-wii-assets
The input directory contains svg/, illustrator/, fonts/ and optional previews/.
Runtime exports belong to Wii.css; source/reference inventory belongs to showcase.
"""
import base64
import hashlib
import json
import re
import shutil
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import fitz

root = Path(__file__).resolve().parent.parent
source = Path(sys.argv[1])
assets = root/'Wii.css/assets/interface'
docs = root/'docs/interface-assets'
assets.mkdir(parents=True, exist_ok=True)
(docs/'sources').mkdir(parents=True, exist_ok=True)
board = source/'illustrator/Wii Illustrator/Wii Art Board.ai'
document = fitz.open(board)
exports = []
NS = 'http://www.w3.org/2000/svg'

def record(name, original, operation, use):
    exports.append({'asset':name,'source':original,'operation':operation,'use':use,'sha256':hashlib.sha256((assets/name).read_bytes()).hexdigest()})

def copy(original, name, use):
    shutil.copyfile(source/original, assets/name)
    record(name,original,'Original supplied file; unchanged bytes',use)

def embedded(page, name, use):
    p=document[page-1]; image=p.get_images(full=True)[0]
    pix=fitz.Pixmap(document,image[0])
    if pix.colorspace.n!=3:pix=fitz.Pixmap(fitz.csRGB,pix)
    if image[1]:pix=fitz.Pixmap(pix,fitz.Pixmap(document,image[1]))
    pix.save(str(assets/name))
    record(name,f'Wii Art Board.ai page {page}', 'Extract embedded image with its original PDF soft alpha mask; convert source CMYK to sRGB',use)

def svg_view(name, image, box, use):
    # Viewports select the supplied sprite/art area. No pixels are recolored,
    # traced, enlarged, whitened or removed; alpha comes from the source image.
    from PIL import Image
    im=Image.open(assets/image)
    encoded=base64.b64encode((assets/image).read_bytes()).decode()
    (assets/name).write_text(f'<svg xmlns="{NS}" viewBox="{" ".join(map(str,box))}"><image width="{im.width}" height="{im.height}" href="data:image/png;base64,{encoded}"/></svg>\n')
    record(name,image,f'Unmodified image inside SVG viewport {box}',use)

def vector_page(path, page, name, box, use):
    doc=fitz.open(path); svg=ET.fromstring(doc[page-1].get_svg_image(text_as_path=True))
    svg.set('viewBox',' '.join(map(str,box)))
    svg.set('width',str(box[2]));svg.set('height',str(box[3]))
    ET.register_namespace('',NS)
    (assets/name).write_text(ET.tostring(svg,encoding='unicode'))
    record(name,f'{path.name} page {page}',f'PDF-to-SVG with outlined text, viewport {box}',use)

copy('svg/SVG/5.5 pro attempt/wii_open_envelope_remake_final.svg','envelope-open.svg','Create Letter choice')
envelope=ET.parse(assets/'envelope-open.svg')
for element in list(envelope.getroot()):
    if element.tag == f'{{{NS}}}rect' and element.get('width') == '763' and element.get('height') == '773' and element.get('fill') == '#e0e0e0':
        envelope.getroot().remove(element)
ET.register_namespace('',NS)
envelope.write(assets/'envelope-open.svg',encoding='unicode')
exports[-1]['operation']='Supplied SVG paths/filters preserved; remove only its full-canvas grey presentation rectangle for transparent UI integration'
exports[-1]['sha256']=hashlib.sha256((assets/'envelope-open.svg').read_bytes()).hexdigest()
copy('svg/SVG/5.5 pro attempt/wii_envelope_remake_final.svg','envelope-closed.svg','Message Board letter cards')
envelope=ET.parse(assets/'envelope-closed.svg')
for element in list(envelope.getroot()):
    if element.tag == f'{{{NS}}}rect' and element.get('width') == '576' and element.get('height') == '384' and element.get('fill') == '#d6c3b5':
        envelope.getroot().remove(element)
envelope.write(assets/'envelope-closed.svg',encoding='unicode')
exports[-1]['operation']='Supplied SVG paths/filters preserved; remove only its full-canvas tan presentation rectangle for transparent UI integration'
exports[-1]['sha256']=hashlib.sha256((assets/'envelope-closed.svg').read_bytes()).hexdigest()
copy('illustrator/Wii Illustrator/2x/Asset 5@2x.png','address-book.png','Address Book choice')
copy('illustrator/Wii Illustrator/2x/Asset 3@2x.png','memo-paper.png','Memo composer and opened Memo paper')
copy('illustrator/Wii Illustrator/2x/Asset 2@2x.png','settings-tile.png','Settings tile artwork and surface reference')
copy('illustrator/Wii Illustrator/2x/Asset 4@2x.png','console.png','Storage console thumbnail reference; cyan guide line retained in source, unused in runtime')
for page,name,use in [
    (11,'data-tile.png','Data Management and Save Data tile art'),
    (13,'wii-tile.png','Wii save platform tile art'),
    (14,'gamecube-tile.png','GameCube save platform tile art'),
    (17,'controls.png','Remote plus/minus and selector arrows'),
    (18,'glyph-fragments.png','Unassigned raster glyph fragments; no complete matching runtime element established'),
    (19,'disc-and-mail.png','Disc/mail reference variants; native channel renderer and existing vector track icons retained'),
    (20,'footer-controls.png','Wii Menu / Calendar / Create Message icon artwork'),
    (4,'envelope-white.png','White envelope reference variant'),
    (5,'memo-card.png','Message Board Memo card surface'),
    (8,'computer.png','Address registration computer reference'),
    (9,'phone.png','Address registration phone reference'),
]:embedded(page,name,use)

for name,image,box,use in [
    ('data-art.svg','data-tile.png',[39,60,204,75],'Replace custom console/card storage silhouette'),
    ('wii-art.svg','wii-tile.png',[60,29,160,101],'Replace Wii/SD platform silhouette'),
    ('gamecube-art.svg','gamecube-tile.png',[110,56,55,59],'Replace custom GameCube card silhouette'),
    ('settings-art.svg','settings-tile.png',[172,44,220,260],'Settings wrench from supplied high-resolution tile'),
    ('control-plus.svg','controls.png',[29,22,80,81],'Remote volume increase'),
    ('control-minus.svg','controls.png',[157,22,80,81],'Remote volume decrease'),
    ('control-next.svg','controls.png',[119,37,27,48],'Shared selector / page arrow'),
    ('control-previous.svg','controls.png',[291,37,29,48],'Shared previous arrow'),
    ('footer-menu.svg','footer-controls.png',[27,4,76,76],'SD Menu Wii return button'),
    ('footer-calendar.svg','footer-controls.png',[118,4,76,76],'Calendar source / reference'),
    ('footer-create.svg','footer-controls.png',[199,4,76,76],'Create Message source / reference'),
    ('tile-data.svg','data-tile.png',[15,19,250,196],'Complete supplied Data Management tile; live label overlays blank label panel'),
    ('tile-settings.svg','settings-tile.png',[27,34,498,390],'Complete supplied Settings tile; live label overlays blank label panel'),
    ('tile-wii.svg','wii-tile.png',[13,6,249,195],'Complete supplied Wii platform tile'),
    ('tile-gamecube.svg','gamecube-tile.png',[13,5,249,195],'Complete supplied GameCube platform tile'),
    ('memo-paper-surface.svg','memo-paper.png',[12,10,768,555],'Supplied Memo paper with transparent export padding excluded'),
]:svg_view(name,image,box,use)
vector_page(board,20,'memo-choice.svg',[491,110,109,142],'Replace hand-drawn Memo choice with supplied notepad vector')
vector_page(board,1,'letter-paper.svg',[6,26,394,279],'Letter composer / opened letter paper from supplied vector artboard')
vector_page(source/'illustrator/Wii Illustrator/Wii remote.ai',1,'remote.svg',[352,171,99,382],'HOME Remote Settings artwork; exported white remote only')

# The supplied button document is a border outline over a clipped reference.
# Keep it as reference, not a fictitious complete button surface.
input_files=[]
duplicates={hashlib.sha256(p.read_bytes()).hexdigest():str(p.relative_to(root/'Wii.css')) for p in (root/'Wii.css/assets').rglob('*') if p.is_file() and assets not in p.parents}
for p in sorted(source.rglob('*')):
    if not p.is_file() or p.parts[len(source.parts)] not in ['svg','illustrator','fonts','button']:continue
    digest=hashlib.sha256(p.read_bytes()).hexdigest()
    entry={'file':str(p.relative_to(source)),'bytes':p.stat().st_size,'sha256':digest,'existingWiiCSS':duplicates.get(digest)}
    if p.suffix=='.ai':
        doc=fitz.open(p);entry['artboards']=[]
        for i,page in enumerate(doc):
            preview=f'sources/{re.sub("[^a-z0-9]+","-",p.stem.lower())}-page-{i+1}.png'
            scale=min(300/page.rect.width,220/page.rect.height)
            page.get_pixmap(matrix=fitz.Matrix(scale,scale),alpha=False).save(str(docs/preview))
            entry['artboards'].append({'page':i+1,'size':list(page.rect)[2:],'vectorDrawings':len(page.get_drawings()),'embeddedImages':len(page.get_images()),'blank':not(page.get_drawings() or page.get_images() or page.get_text().strip()),'preview':preview})
    if entry['existingWiiCSS']:entry['decision']='Reuse existing Wii.css asset; font variants are licensed for this showcase only'
    elif 'Calendar' in p.parts:
        entry['decision']='Dated calendar reference; keep interactive calendar instead of baking in its dates'
        shutil.copyfile(p,docs/'sources'/p.name)
    elif p.suffix=='.ai':entry['decision']='Reviewed every artboard; export matches above, retain embedded raster/reference distinction'
    elif p.suffix=='.otf':entry['decision']='Licensed site-specific web subset'
    else:entry['decision']='Runtime export or retained alternative; see exports and mapping'
    input_files.append(entry)
inventory={'inputFiles':input_files,'exports':exports,'fontAuthorization':'User confirmed web-embedding rights for the public Wii showcase in this conversation on 2026-10-15. Font subsets are site-specific and excluded from the generic Wii.css package.','limits':['An Illustrator extension does not make its embedded raster images vector artwork.','Calendar screenshot dates are reference content, not an application replacement.','Blank artboards and clipped reference fragments have no runtime replacement.','Sprite viewports and PDF clipping preserve source pixels/paths; source guides are excluded by viewport selection.']}
(docs/'inventory.json').write_text(json.dumps(inventory,indent=2)+'\n')
(assets/'provenance.json').write_text(json.dumps({'exports':exports,'source':'User-supplied Wii artwork, 15 October 2026; fonts are not included in this framework asset folder.','retainedFrameworkSurfaces':[{'asset':'settings-action.svg','source':'Prior source-fitted showcase reconstruction, now shared through Wii.css'},{'asset':'settings-choice.svg','source':'Prior source-fitted showcase reconstruction, now shared through Wii.css'},{'asset':'channels-art.svg','source':'Prior channel-stack reconstruction; no matching supplied channel-stack image'}]},indent=2)+'\n')
print(f'Inventoried {len(input_files)} source files and exported {len(exports)} shared Wii.css assets')

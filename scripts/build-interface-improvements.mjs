import fs from "node:fs/promises";
import path from "node:path";
const root = path.resolve(import.meta.dirname, ".."),
  output = path.join(root, "docs/interface-improvements");
const results = JSON.parse(
  await fs.readFile(path.join(output, "results.json"), "utf8"),
);
const baseline = JSON.parse(
  await fs.readFile(path.join(root, "docs/interface-audit/audit.json"), "utf8"),
);
const sources = JSON.parse(
  await fs.readFile(
    path.join(root, "docs/interface-audit/references.json"),
    "utf8",
  ),
).references;
const entries = results.captures.map((c) => ({
  ...c,
  reference: sources.find((r) => r.id === c.reference),
  baseline:
    baseline.captures.find(
      (b) =>
        b.id === c.before &&
        b.mode === c.mode &&
        b.height === (c.height || 720),
    ) ||
    baseline.captures.find(
      (b) => b.id === c.before && b.mode === c.mode && b.height === 720,
    ),
}));
if (entries.some((c) => !c.reference || !c.baseline))
  throw Error("A comparison is missing its reference or baseline.");
await fs.writeFile(
  path.join(output, "comparison.json"),
  JSON.stringify(
    {
      captureDate: results.captureDate,
      baselineRevision: baseline.revision,
      entries,
    },
    null,
    2,
  ) + "\n",
);
const data = JSON.stringify(entries).replaceAll("<", "\\u003c");
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Wii interface — before, after and source overlays</title><style>
*{box-sizing:border-box}body{margin:0;padding:24px;background:#eaf1f6;color:#243b4a;font:16px system-ui}h1{font-size:26px;margin:0 0 12px}p{line-height:1.5}header,section{max-width:1500px;margin:0 auto 20px;background:#fff;padding:20px;border-radius:12px}.controls{display:flex;flex-wrap:wrap;gap:18px;align-items:center}label{display:flex;gap:8px;align-items:center}select,input{font:inherit}select{max-width:330px;padding:7px;border:1px solid #adc4d2;border-radius:5px}.columns{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}figure{margin:0}figcaption{font-weight:600;padding:8px 0}.frame{position:relative;background:#d9e2e7;aspect-ratio:4/3;overflow:hidden;display:grid;place-items:center}.frame img{display:block;width:100%;height:100%;object-fit:contain}.overlay{max-width:1050px;margin:auto}.overlay .frame img{position:absolute;inset:0}.sourceDetails{font-size:14px;color:#526b79}a{color:#086596}.note{padding:12px;background:#edf6fb;border-left:4px solid #38acd4}#result{font-weight:600}@media(max-width:800px){body{padding:8px}.columns{grid-template-columns:1fr}section,header{padding:14px}}button{padding:6px 12px;font:inherit}
</style></head><body><header><h1>Wii interface comparisons</h1><p><a id="latest-sizing" href="../interface-sizing/">Latest sizing and typography comparisons →</a></p><p>Reference, preserved baseline and working implementation at 4:3 and 16:9. The overlay keeps each source's original aspect ratio. Cropped manual illustrations and opposite-aspect references show structure; they do not establish exact pixel fidelity.</p><div class="controls"><label>Interface <select id="interface"></select></label><label>Display <select id="mode"><option>4:3</option><option>16:9</option></select></label><button id="previous">Previous</button><button id="next">Next</button></div></header><section><h2 id="title"></h2><p id="note" class="note"></p><div class="columns"><figure><figcaption>Online reference</figcaption><div class="frame"><img id="reference" alt="Original Wii interface reference"></div></figure><figure><figcaption id="before-caption">Before</figcaption><div class="frame"><img id="before" alt="Preserved baseline implementation"></div></figure><figure><figcaption id="after-caption">After</figcaption><div class="frame"><img id="after" alt="Implemented interface"></div></figure></div><p id="source" class="sourceDetails"></p></section><section class="overlay"><div class="controls"><label>Overlay <select id="layer"><option value="after">After vs reference</option><option value="before">Before vs reference</option></select></label><label>Opacity <input id="alpha" type="range" min="0" max="100" value="50"><output id="percent">50%</output></label><label><input id="difference" type="checkbox">Difference</label></div><figure><figcaption>Aligned whole-frame overlay · no source stretching</figcaption><div class="frame"><img id="overlay-source" alt="Overlay reference"><img id="overlay-image" alt="Overlay implementation"></div></figure></section><section><p id="result"></p><p>New destinations use the former Options or Message Board screen as their baseline because the old control had no handler. The keyboard baseline is the earlier Shop-profile harness; the Shop profile remains available unchanged. After captures come from the integrated message workflow.</p><p>Hardware storage, battery capacity, TV output, infrared sensing and Nintendo letter delivery are represented by local state or clearly marked unavailable. These captures verify a web implementation.</p><a href="../interface-improvements.md">Implementation and validation report</a> · <a href="../interface-audit/index.html">Original full audit</a></section><script>
const entries=${data},names=[...new Map(entries.map(e=>[e.id,e.title])).entries()],sel=document.querySelector('#interface'),mode=document.querySelector('#mode'),alpha=document.querySelector('#alpha'),difference=document.querySelector('#difference'),layer=document.querySelector('#layer');
for(const [id,title] of names){const option=document.createElement('option');option.value=id;option.textContent=title;sel.append(option)}
const query=new URLSearchParams(location.search);if(names.some(n=>n[0]===query.get('interface')))sel.value=query.get('interface');if(query.get('mode')==='16:9')mode.value='16:9';
function update(){const e=entries.find(e=>e.id===sel.value&&e.mode===mode.value)||entries.find(e=>e.id===sel.value);document.querySelector('#title').textContent=e.title+' · '+e.mode;document.querySelector('#note').textContent=e.note||'Compare proportions, control placement and artwork. Text, channel contents and animation phases may differ.';const ref='../interface-audit/'+e.reference.image,before='../interface-audit/'+e.baseline.image;document.querySelector('#reference').src=ref;document.querySelector('#before').src=before;document.querySelector('#after').src=e.image;document.querySelector('#overlay-source').src=ref;document.querySelector('#overlay-image').src=layer.value==='after'?e.image:before;document.querySelector('#overlay-image').style.opacity=Number(alpha.value)/100;document.querySelector('#overlay-image').style.mixBlendMode=difference.checked?'difference':'normal';document.querySelector('#percent').textContent=alpha.value+'%';document.querySelector('#before-caption').textContent='Before · '+e.baseline.width+'×'+e.baseline.height+(e.before!==e.id?' · earlier '+e.before.replaceAll('-',' ')+' screen':'');document.querySelector('#after-caption').textContent='After · '+e.width+'×'+e.height;document.querySelectorAll('.frame').forEach(f=>f.style.aspectRatio=e.width+'/'+e.height);const source=document.querySelector('#source');source.replaceChildren();const link=document.createElement('a');link.href=e.reference.sourceURL;link.textContent=e.reference.title+' — source';source.append(link,document.createElement('br'),e.reference.originalSize.join('×')+' source pixels. '+e.reference.notes);document.querySelector('#latest-sizing').href='../interface-sizing/?interface='+encodeURIComponent(e.id)+'&mode='+encodeURIComponent(e.mode);history.replaceState(null,'','?interface='+encodeURIComponent(e.id)+'&mode='+encodeURIComponent(e.mode));}
for(const el of [sel,mode,alpha,difference,layer])el.addEventListener('input',update);for(const [id,delta]of [['previous',-1],['next',1]])document.querySelector('#'+id).onclick=()=>{sel.selectedIndex=(sel.selectedIndex+delta+names.length)%names.length;update()};document.querySelector('#result').textContent=entries.length+' captures · '+names.length+' interface states · both display modes';update();
</script></body></html>`;
await fs.writeFile(path.join(output, "index.html"), html);
console.log(`Built ${entries.length} source-linked comparisons.`);

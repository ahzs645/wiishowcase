import fs from "node:fs/promises";
import path from "node:path";
const root = path.resolve(import.meta.dirname, ".."),
  output = path.join(root, "docs/interface-sizing");
const results = JSON.parse(
  await fs.readFile(path.join(output, "results.json"), "utf8"),
);
const previous = JSON.parse(
  await fs.readFile(
    path.join(root, "docs/interface-improvements/results.json"),
    "utf8",
  ),
);
const sources = JSON.parse(
  await fs.readFile(
    path.join(root, "docs/interface-audit/references.json"),
    "utf8",
  ),
).references;
const notes = {
  "save-grid":
    "Square storage previews, larger tabs, a light grid panel and a full-size Back control. Save artwork is a local placeholder; the manual establishes structure.",
  "channels-data":
    "Static channel artwork in square storage cells. Names and block counts remain in the selection dialog; no extra animated renderers are loaded.",
  "settings-one":
    "Larger labels and Back control, taller settings buttons and a wider title tab. The reference has a small capture crop and different firmware identification.",
  "settings-two":
    "The same measured button and label proportions apply to all three settings pages.",
  "settings-three":
    "The same measured button and label proportions apply to all three settings pages.",
  "remote-settings":
    "Full remote beside the controls, larger row labels and rectangular buttons, a rising volume meter and larger footer text. The manual illustration is cropped.",
  "create-message":
    "Paper, envelope and Address Book illustrations replace text glyphs; the chooser fills the board background with a larger Back control.",
  "memo-composer":
    "Paper proportions, larger text and line spacing, and Back/Post placed beneath opposite sides of the paper.",
  "address-book":
    "A book surface with larger friend rows, avatar cells and Back/Register controls below the book.",
  "menu-settled":
    "Larger clock and date lettering on the existing menu shell. Channel contents and animation phases differ.",
  "system-keyboard":
    "System-profile input and key text are larger. The default Shop profile retains its existing artwork, sounds and behavior.",
};
const entries = [];
for (const capture of results.captures) {
  const reference = sources.find((r) => r.id === capture.reference);
  const baseline = previous.captures.find(
    (c) => c.id === capture.id && c.mode === capture.mode,
  );
  if (!reference || !baseline)
    throw Error(`Missing comparison source for ${capture.id}`);
  const common = {
    ...capture,
    reference,
    baseline,
    note:
      notes[capture.id] ||
      "Compare the previous pass with the refined shared typography and controls. Cropped or opposite-aspect references establish structure, not exact pixel fidelity.",
  };
  entries.push(common);
  const width = capture.mode === "4:3" ? 640 : 854;
  const image = `native/${capture.id}-${width}x480.png`;
  await fs.access(path.join(output, image));
  entries.push({ ...common, width, height: 480, image });
}
await fs.writeFile(
  path.join(output, "comparison.json"),
  JSON.stringify(
    { previousRevision: "c8c9da9ca11cc0512abd8919b1e51a89b12ddb91", entries },
    null,
    2,
  ) + "\n",
);
const data = JSON.stringify(entries).replaceAll("<", "\\u003c");
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Wii sizing and typography comparisons</title><style>
*{box-sizing:border-box}body{margin:0;padding:24px;background:#eaf1f6;color:#243b4a;font:16px system-ui}h1{font-size:26px;margin:0 0 12px}p{line-height:1.5}header,section{max-width:1500px;margin:0 auto 20px;background:white;padding:20px;border-radius:12px}.controls{display:flex;flex-wrap:wrap;gap:18px;align-items:center}label{display:flex;gap:8px;align-items:center}select,input,button{font:inherit}select,button{padding:7px;border:1px solid #adc4d2;border-radius:5px}select{max-width:330px}.columns{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}figure{margin:0}figcaption{font-weight:600;padding:8px 0}.frame{position:relative;background:#d9e2e7;aspect-ratio:4/3;overflow:hidden;display:grid;place-items:center}.frame img{display:block;width:100%;height:100%;object-fit:contain}.overlay{max-width:1050px;margin:auto}.overlay .frame img{position:absolute;inset:0}.sourceDetails{font-size:14px;color:#526b79}a{color:#086596}.note{padding:12px;background:#edf6fb;border-left:4px solid #38acd4}#result{font-weight:600}@media(max-width:800px){body{padding:8px}.columns{grid-template-columns:1fr}section,header{padding:14px}}
</style></head><body><header><h1>Wii sizing and typography</h1><p><a id="latest-menu" href="../menu-fidelity/?mode=4%3A3&height=480">New menu correction pass — matched-state overlays →</a></p><p>Online reference, previous implementation and refined sizing. Compare both display modes at native 480-line sizes and 720-line captures. Sources retain their original aspect ratios.</p><div class="controls"><label>Interface <select id="interface"></select></label><label>Display <select id="mode"><option>4:3</option><option>16:9</option></select></label><label>Capture <select id="size"><option value="720">720 lines</option><option value="480">Native 480 lines</option></select></label><button id="previous">Previous</button><button id="next">Next</button></div></header><section><h2 id="title"></h2><p id="note" class="note"></p><div class="columns"><figure><figcaption>Wii reference</figcaption><div class="frame"><img id="reference" alt="Original Wii interface reference"></div></figure><figure><figcaption id="before-caption">Previous pass</figcaption><div class="frame"><img id="before" alt="Preserved previous implementation"></div></figure><figure><figcaption id="after-caption">Refined sizing</figcaption><div class="frame"><img id="after" alt="Refined implementation"></div></figure></div><p id="source" class="sourceDetails"></p></section><section class="overlay"><div class="controls"><label>Overlay <select id="layer"><option value="after">Refined vs Wii reference</option><option value="before">Previous vs Wii reference</option><option value="progress">Refined vs previous</option></select></label><label>Opacity <input id="alpha" type="range" min="0" max="100" value="50"><output id="percent">50%</output></label><label><input id="difference" type="checkbox">Difference</label></div><figure><figcaption>Aligned whole-frame overlay · preserved aspect ratios</figcaption><div class="frame"><img id="overlay-source" alt="Overlay base"><img id="overlay-image" alt="Overlay comparison"></div></figure></section><section><p id="result"></p><p>The previous pass is preserved at revision c8c9da9. Its 720-line screenshots are scaled proportionally when comparing native sizes. Refined 480-line images are separate browser captures, with text bounds and pointer targets checked in each state.</p><p>Manual illustrations are small and sometimes cropped. Font metrics and some artwork still differ; these comparisons do not establish an exact pixel accuracy score.</p><a href="../interface-sizing.md">Sizing and validation report</a> · <a href="../interface-improvements/">Previous implementation pass</a> · <a href="../interface-audit/">Original audit</a></section><script>
const entries=${data},names=[...new Map(entries.map(e=>[e.id,e.title])).entries()],sel=document.querySelector('#interface'),mode=document.querySelector('#mode'),size=document.querySelector('#size'),alpha=document.querySelector('#alpha'),difference=document.querySelector('#difference'),layer=document.querySelector('#layer');
for(const [id,title] of names){const option=document.createElement('option');option.value=id;option.textContent=title;sel.append(option)}
const query=new URLSearchParams(location.search);if(names.some(n=>n[0]===query.get('interface')))sel.value=query.get('interface');if(query.get('mode')==='16:9')mode.value='16:9';if(query.get('height')==='480')size.value='480';
function update(){const e=entries.find(e=>e.id===sel.value&&e.mode===mode.value&&e.height===Number(size.value));document.querySelector('#title').textContent=e.title+' · '+e.mode+' · '+e.width+'×'+e.height;document.querySelector('#note').textContent=e.note;const ref='../interface-audit/'+e.reference.image,before='../interface-improvements/'+e.baseline.image;document.querySelector('#reference').src=ref;document.querySelector('#before').src=before;document.querySelector('#after').src=e.image;document.querySelector('#overlay-source').src=layer.value==='progress'?before:ref;document.querySelector('#overlay-image').src=layer.value==='before'?before:e.image;document.querySelector('#overlay-image').style.opacity=Number(alpha.value)/100;document.querySelector('#overlay-image').style.mixBlendMode=difference.checked?'difference':'normal';document.querySelector('#percent').textContent=alpha.value+'%';document.querySelector('#before-caption').textContent='Previous pass · c8c9da9'+(e.height===480?' · scaled from 720 lines':'');document.querySelector('#after-caption').textContent='Refined · '+e.width+'×'+e.height;document.querySelectorAll('.frame').forEach(f=>f.style.aspectRatio=e.width+'/'+e.height);const source=document.querySelector('#source');source.replaceChildren();const link=document.createElement('a');link.href=e.reference.sourceURL;link.textContent=e.reference.title+' — source';source.append(link,document.createElement('br'),e.reference.originalSize.join('×')+' source pixels. '+e.reference.notes);const latestMenu=document.querySelector('#latest-menu');if(latestMenu)latestMenu.href='../menu-fidelity/?mode='+encodeURIComponent(e.mode)+'&height='+size.value;history.replaceState(null,'','?interface='+encodeURIComponent(e.id)+'&mode='+encodeURIComponent(e.mode)+'&height='+size.value);}
for(const el of [sel,mode,size,alpha,difference,layer])el.addEventListener('input',update);for(const [id,delta]of [['previous',-1],['next',1]])document.querySelector('#'+id).onclick=()=>{sel.selectedIndex=(sel.selectedIndex+delta+names.length)%names.length;update()};document.querySelector('#result').textContent=entries.length+' refined captures · '+names.length+' states · two aspect ratios · two resolutions';update();
</script></body></html>`;
await fs.writeFile(path.join(output, "index.html"), html);
console.log(`Built ${entries.length} sizing comparisons.`);

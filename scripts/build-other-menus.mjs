import fs from "node:fs/promises";
const output = "docs/other-menus";
const read = async (name) => JSON.parse(await fs.readFile(name, "utf8"));
const [core, extra, findings, manifest] = await Promise.all([
  read(`${output}/core-captures.json`),
  read(`${output}/additional-captures.json`),
  read(`${output}/findings.json`),
  read("docs/interface-audit/references.json"),
]);
const captures = [...core.captures, ...extra.captures];
if (captures.length !== 216)
  throw Error(`Expected 216 current captures; found ${captures.length}`);
const sources = manifest.references;
const states = Object.entries(findings.screens).map(([id, finding]) => {
  const entries = captures.filter((c) => c.id === id);
  if (entries.length !== 4) throw Error(`Incomplete capture coverage: ${id}`);
  const sizes = new Set(entries.map((c) => `${c.width}x${c.height}`));
  if (sizes.size !== 4) throw Error(`Duplicate capture sizes: ${id}`);
  return {
    id,
    title: entries[0].title,
    ...finding,
    captures: entries.map((entry) => {
      const referenceId =
        id === "sd-menu" && entry.mode === "16:9"
          ? "nintendo-menu-3"
          : entry.reference;
      const reference =
        sources.find((source) => source.id === referenceId) || null;
      if (referenceId && !reference)
        throw Error(`Unknown reference: ${referenceId}`);
      const referenceRole = finding.referenceRole || entry.referenceRole;
      return {
        id,
        mode: entry.mode,
        width: entry.width,
        height: entry.height,
        image: entry.image,
        reference,
        referenceRole,
        comparison: !reference
          ? "No same-view source collected"
          : referenceRole !== "same-view"
            ? "Related view/state; structural comparison only"
            : reference.mode !== entry.mode
              ? "Illustration/opposite-aspect source; preserved aspect, no native pixel score"
              : "Same-view/aspect source; source state/crop/firmware limitations still apply",
        geometryFailures: entry.geometry.failures,
      };
    }),
  };
});
if (
  states.length !== 54 ||
  states.flatMap((s) => s.captures).length !== captures.length
)
  throw Error("Screen findings do not cover all captures");
for (const capture of captures) await fs.access(`${output}/${capture.image}`);
const rawFindings = captures
  .filter((c) => c.geometry.failures.length)
  .map((c) => ({
    id: c.id,
    width: c.width,
    height: c.height,
    failures: c.geometry.failures,
  }));
const audit = {
  date: "2026-10-14",
  baselineRevision: core.baselineRevision,
  scope:
    "54 other system menu destinations and primary dialog/input states; full channel applications and the already-audited Wii Menu grid are outside this pass. Not every error/localization/animation permutation is implemented or captured.",
  summary: {
    states: states.length,
    captures: captures.length,
    referenceCount: new Set(
      states.flatMap((s) =>
        s.captures.map((c) => c.reference?.id).filter(Boolean),
      ),
    ).size,
    nativeViewsWithoutAdapter: findings.unimplementedNativeViews.length,
    functionalRegressionChecks: core.checks.length,
    coreGeometryFailures: core.captures.reduce(
      (n, c) => n + c.geometry.failures.length,
      0,
    ),
    pageErrors: [...core.errors, ...extra.errors],
    coreMissingAssets: core.missing,
    extraHTTPFailures: extra.missing,
    rawGeometryFindings: rawFindings.reduce((n, c) => n + c.failures.length, 0),
    boundsFailureCases: rawFindings
      .filter((c) => c.failures.some((f) => f.type === "bounds"))
      .map(({ id, width, height }) => ({ id, width, height })),
  },
  method:
    "Actual application captures at 640×480, 854×480, 960×720 and 1280×720. References keep their supplied aspect with contain fitting. Manual images are low-resolution/cropped structural evidence, not recovered original pane/font metrics. Different selected values, content, dates and avatars are not counted as layout defects. Related views/states are explicitly labeled. Raw pointer checks include occluded background controls when a custom overlay fails to isolate the background; these are not all separate visible-control bugs. Focus leakage was reproduced separately. No overall pixel-accuracy percentage is assigned.",
  globalFindings: findings.globalFindings,
  states,
  unimplementedNativeViews: findings.unimplementedNativeViews,
};
await fs.writeFile(
  `${output}/audit.json`,
  JSON.stringify(audit, null, 2) + "\n",
);
const embedded = JSON.stringify(audit).replaceAll("<", "\\u003c");
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Other Wii menus — audit and overlays</title><style>
*{box-sizing:border-box}body{margin:0;background:#edf2f7;color:#213545;font:16px/1.5 system-ui,sans-serif}main{max-width:1500px;margin:auto;padding:24px}h1{font-size:29px}h2{font-size:23px}h3{font-size:18px}section,header{background:white;padding:20px;margin-bottom:20px;border-radius:10px}a{color:#075f9e}.controls{display:flex;gap:16px;align-items:center;flex-wrap:wrap}label{display:flex;gap:8px;align-items:center;max-width:100%;flex-wrap:wrap}select,input,button{font:inherit}select,button{padding:7px;max-width:100%}select{max-width:min(400px,calc(100vw - 64px));min-width:0}.note{padding:12px;background:#eaf4fc;border-left:4px solid #3498c4}.warning{background:#fff2d9;border-left-color:#c98416}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}figure{margin:0}figcaption{font-weight:600;margin:8px 0}.frame{position:relative;background:#d8e1e8;display:grid;place-items:center;overflow:hidden}.frame img{display:block;width:100%;height:100%;object-fit:contain}.overlay{max-width:1050px;margin:20px auto 0}.overlay img{position:absolute;inset:0}table{border-collapse:collapse;width:100%}th,td{text-align:left;vertical-align:top;padding:10px;border:1px solid #d2dce5}.scroll{overflow:auto}code{font-size:14px;overflow-wrap:anywhere}.finding{border-top:1px solid #d6e0e9;padding:12px 0}.badge{font-weight:700;color:#8b3500}#overview{width:100%;max-width:1200px}.source{font-size:14px}#screen-search{max-width:100%}@media(max-width:800px){main{padding:8px}section,header{padding:14px}.grid{grid-template-columns:1fr}}
</style></head><body><main><header><h1>Other Wii menus: audit and overlays</h1><p class="note"><a href="../system-menu-fixes/">Open the implemented fixes and before/after overlays</a>. This page preserves the original audit.</p><p id="summary"></p><p>Current app at <code>f198c02</code> · audit 14 October 2026. This pass records what is off; it does not claim that these layouts have been corrected.</p><p><a href="#comparison">Open comparisons</a> · <a href="#inventory">All 54 screens</a> · <a href="#gaps">Missing native destinations</a> · <a href="../layout-reference/">Maintained layout reference</a> · <a href="../other-menus.md">Audit report</a> · <a href="audit.json">Machine-readable findings</a></p><p class="note warning">Original manual illustrations are small and sometimes cropped. Opposite-aspect and related-state sources are labeled; they are not exact native overlays. No overall accuracy score is assigned.</p></header>
<section><h2>Highest-priority findings</h2><div id="findings"></div></section>
<section id="comparison"><div class="controls"><label>Screen <select id="interface"></select></label><label>Display <select id="mode"><option>4:3</option><option>16:9</option></select></label><label>Capture <select id="size"><option value="480">480 lines</option><option value="720">720 lines</option></select></label><button id="previous">Previous</button><button id="next">Next</button></div><h2 id="title"></h2><p id="finding" class="note"></p><p id="next-action"></p><p id="confidence" class="note warning"></p><div class="grid"><figure><figcaption>Original Wii reference</figcaption><div class="frame"><img id="reference" alt="Original Wii reference"><p id="no-source">No same-view reference collected.</p></div></figure><figure><figcaption>Current application</figcaption><div class="frame"><img id="current" alt="Current app capture"></div></figure></div><p id="source" class="source"></p><div class="overlay"><div class="controls"><label>Reference opacity <input id="alpha" type="range" min="0" max="100" value="50"><output id="percent">50%</output></label><label><input id="difference" type="checkbox">Difference</label></div><p>Whole-frame alignment, preserved source aspect. Cropped illustrations and related views show structure; offsets can reflect source framing.</p><div class="frame"><img id="overlay-current" alt="Current capture base"><img id="overlay-reference" alt="Reference overlay"></div></div><p id="geometry"></p></section>
<section><h2>Examples</h2><img id="overview" src="overview/audit-overview.jpg" alt="Selected native comparisons and current clipping defects"></section>
<section id="inventory"><h2>All recorded screens</h2><label>Find a screen <input id="screen-search" type="search" placeholder="Settings, keyboard, letter…"></label><div class="scroll"><table><thead><tr><th>Screen</th><th>Priority</th><th>What is off</th><th>References</th></tr></thead><tbody id="screens"></tbody></table></div></section>
<section id="gaps"><h2>Native views without adapters</h2><div id="missing"></div><p>Full Forecast, News, Shop and other channel applications have separate interfaces and revisions; this audit covers system menus and input surfaces.</p></section>
<section><h2>Verification and limits</h2><p id="verification"></p><p>Automated bounds and pointer checks do not establish native visual fidelity. Background controls reported under custom overlays are grouped with modal isolation findings. Real two-device pairing, physical Wii storage/video/sensor hardware, every firmware, language and animation state were not tested.</p><p><a href="settings-metrics.json">Rendered font/Settings geometry</a> · <a href="update-focus.json">Update focus reproduction</a> · <a href="relay-check.json">Pairing endpoint check</a> · <a href="additional-captures.json">Additional captures and raw checks</a> · <a href="core-captures.json">Core captures and regression checks</a></p></section></main><script>
const audit=${embedded};const $=s=>document.querySelector(s),sel=$('#interface'),mode=$('#mode'),size=$('#size');
function el(tag,text){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node}function a(href,text){const node=el('a',text);node.href=href;return node}
$('#summary').textContent=audit.summary.states+' destinations and primary states · '+audit.summary.captures+' current captures · 4:3 and 16:9 · 480 and 720 lines.';
for(const f of audit.globalFindings){const box=el('div');box.className='finding';box.append(el('h3',f.priority+' · '+f.title),el('p',f.detail),el('p','Next: '+f.next));for(const id of f.screens){const s=audit.states.find(s=>s.id===id);box.append(a('?interface='+encodeURIComponent(id)+'&mode=4%3A3&height=480',s.title),document.createTextNode(' · '))}box.append(a(f.evidence,'Evidence'));$('#findings').append(box)}
for(const s of audit.states){const option=el('option',s.group+' — '+s.title);option.value=s.id;sel.append(option);const tr=el('tr'),td=el('td');td.append(a('?interface='+encodeURIComponent(s.id)+'&mode=4%3A3&height=480',s.title));tr.append(td,el('td',s.priority),el('td',s.detail),el('td',[...new Set(s.captures.map(c=>c.reference?.id).filter(Boolean))].join(', ')||'Not collected'));$('#screens').append(tr)}
for(const s of audit.unimplementedNativeViews){const box=el('div');box.className='finding';box.append(el('h3',s.title),el('p',s.detail),a('../interface-audit/references/'+s.reference+'.png','Official structural reference'));$('#missing').append(box)}
const q=new URLSearchParams(location.search);if(audit.states.some(s=>s.id===q.get('interface')))sel.value=q.get('interface');else sel.value='date';if(q.get('mode')==='16:9')mode.value='16:9';if(q.get('height')==='720')size.value='720';
function update(){const s=audit.states.find(s=>s.id===sel.value),c=s.captures.find(c=>c.mode===mode.value&&c.height===Number(size.value));$('#title').textContent=s.title+' · '+c.width+'×'+c.height;$('#finding').textContent=s.priority+' · '+s.detail;$('#next-action').textContent='Next: '+s.next;$('#confidence').textContent=c.comparison;$('#current').src=$('#overlay-current').src=c.image;for(const frame of document.querySelectorAll('.frame'))frame.style.aspectRatio=c.width+'/'+c.height;const ref=$('#reference'),over=$('#overlay-reference');$('#source').replaceChildren();if(c.reference){ref.style.display=over.style.display='block';$('#no-source').hidden=true;ref.src=over.src='../interface-audit/'+c.reference.image;$('#source').append(a(c.reference.sourceURL,c.reference.title+' — source'),el('br'),document.createTextNode(c.reference.originalSize.join('×')+' original pixels. '+c.reference.notes));if(c.reference.systemMenu)$('#source').append(el('br'),document.createTextNode('Firmware: '+(c.reference.systemMenu.exactVersion||'unknown')+'. '+c.reference.systemMenu.confidence))}else{ref.style.display=over.style.display='none';ref.removeAttribute('src');over.removeAttribute('src');$('#no-source').hidden=false}$('#alpha').disabled=$('#difference').disabled=!c.reference;over.style.opacity=Number($('#alpha').value)/100;over.style.mixBlendMode=$('#difference').checked?'difference':'normal';$('#percent').textContent=$('#alpha').value+'%';$('#geometry').textContent=c.geometryFailures.length?c.geometryFailures.length+' raw geometry findings in this capture. Review the grouped findings: these can include controls behind an overlay.':'Visible text/button bounds and center-hit checks passed in this capture; native visual differences remain.';history.replaceState(null,'','?interface='+encodeURIComponent(s.id)+'&mode='+encodeURIComponent(c.mode)+'&height='+c.height)}
for(const node of [sel,mode,size,$('#alpha'),$('#difference')])node.addEventListener('input',update);for(const [id,delta]of [['previous',-1],['next',1]])$('#'+id).onclick=()=>{sel.selectedIndex=(sel.selectedIndex+delta+audit.states.length)%audit.states.length;update()};$('#screen-search').oninput=e=>{const q=e.target.value.toLowerCase();for(const row of document.querySelectorAll('#screens tr'))row.hidden=!row.textContent.toLowerCase().includes(q)};
$('#verification').textContent=audit.summary.functionalRegressionChecks+' existing interaction checks passed; the original 28 non-menu states passed their 112 bounds/hit checks. The extra 26 destinations exposed four screen/size combinations with out-of-frame controls, plus Update focus leakage and custom-overlay background occlusion. No JavaScript page errors were recorded. Four relay HTTP 404s are recorded separately from static assets.';update();
</script></body></html>`;
await fs.writeFile(`${output}/index.html`, html);
console.log(
  `Built other-menu audit: ${states.length} states, ${captures.length} captures.`,
);

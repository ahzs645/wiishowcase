import fs from "node:fs/promises";
const output = process.env.SYSTEM_COMPARISON_OUTPUT || "docs/system-menu-fixes";
const baselineFolder = process.env.SYSTEM_COMPARISON_BASELINE || "other-menus";
const refinement = baselineFolder === "system-menu-fixes";
const assetPass = output === "docs/interface-assets";
const storageBaseline = assetPass ? JSON.parse(await fs.readFile("docs/storage-menu-refinement/comparison.json", "utf8")) : null;
const assetValidation = assetPass ? JSON.parse(await fs.readFile(`${output}/asset-validation.json`, "utf8")) : null;
const read = async (p) => JSON.parse(await fs.readFile(p, "utf8"));
const [
  baseline,
  core,
  extra,
  manifest,
  interactions,
  pairing,
  home,
  keyboardFocus,
] = await Promise.all([
  read(`docs/${baselineFolder}/${baselineFolder !== "other-menus" ? "comparison" : "audit"}.json`),
  read(`${output}/core-captures.json`),
  read(`${output}/additional-captures.json`),
  read("docs/interface-audit/references.json"),
  read(`${output}/interaction-checks.json`),
  read(`${output}/pairing-and-sd.json`),
  read(`${output}/home-layout-checks.json`),
  read(`${output}/keyboard-focus-checks.json`),
]);
const captures = [...core.captures, ...extra.captures, ...pairing.captures, ...(assetValidation?.captures.filter(c=>["save-sd","gamecube-slot-b"].includes(c.id)) || [])];
const changes = {
  settings:
    "Frame-scaled font, fitted list widths, firmware profile label, side arrows and footer actions.",
  selector:
    "Dedicated selector layout, draft values and Confirm/Back semantics; browser native date/time controls removed.",
  storage:
    "Storage/card silhouettes, selected GameCube Slot A, native channel thumbnails, Disc excluded, unknown console capacity labeled.",
  sd: "Curved footer, page count/navigation, selected-title panel and full-menu management flow.",
  message:
    "Paper/book sizing, outer actions, recipient chooser, styled photo attachment and optional contact Mii.",
  keyboard:
    "Bundled system font, larger phone matrix, case/number rail, scroll/suggestion controls. Shop profile retained.",
  home: "Fitted guide/footer, shared modal focus, native 2+1 action placement and charge-unavailable indicators.",
  reconnect:
    "Fitted, decodable QR/manual exchange layout and explicit relay fallback. Manual SDP exchange tested in isolated browser contexts; data channel unverified.",
  update:
    "Fitted type/button sizes, dialog focus entry/trap/return, background isolation and local Escape.",
};
const category = (id) =>
  id.startsWith("system-") || id.startsWith("keyboard-")
    ? "keyboard"
    : id.startsWith("sd-")
      ? "sd"
      : id === "reconnect"
        ? "reconnect"
        : id === "update-current"
          ? "update"
          : ["home-menu", "remote-settings", "operations-guide"].includes(id)
            ? "home"
            : /save|data|options/.test(id)
              ? "storage"
              : /memo|message|letter|address|friend|calendar$/.test(id)
                ? "message"
                : id.startsWith("settings-")
                  ? "settings"
                  : "selector";
const specificChanges = {
  "calendar-settings":
    "Shared Settings font/shell and navigation to the new Date and Time selectors.",
  "screen-settings":
    "Shared Settings font/shell and navigation to screen-specific controls.",
  "sensor-bar":
    "Shared Settings font/shell with separate position and sensitivity destinations.",
  "parental-controls":
    "PIN setup/gate with Secret Question and Game Rating destinations; online preferences remain protected.",
  "parental-rating":
    "Rating preference selector with Back/Confirm. Age-based channel enforcement awaits rating metadata.",
  internet:
    "Connection Settings, Console Information and User Agreements hierarchy behind the existing PIN gate.",
  "connect24-menu":
    "WiiConnect24, Standby Connection and Slot Illumination destinations.",
  "connection-profiles":
    "Three saved connection preferences plus browser online-data/test controls.",
  "connection-type":
    "Wired/wireless preference selection; the browser continues to use its existing network.",
  "console-information":
    "Grouped local Wii Number and browser connection status.",
  "user-agreements":
    "Reachable browser storage/network explanation. Retired Nintendo service enrollment is unavailable.",
  "format-memory":
    "Larger warning text and separate footer Format action for local browser data.",
  "format-confirm":
    "Shared isolated confirmation dialog; cancellation preserves records and confirmation resets local browser state.",
};
const states = [...new Set(captures.map((c) => c.id))].map((id) => {
  const storageOld = storageBaseline?.states.find(s => s.id === id);
  const previousFolder = storageOld ? "storage-menu-refinement" : baselineFolder;
  const old = storageOld || baseline.states.find((s) => s.id === id),
    entries = captures.filter((c) => c.id === id);
  if (entries.length !== 4) throw Error(`${id}: expected all four sizes`);
  return {
    id,
    title: entries[0].title,
    group: old?.group || "New destinations",
    change:
      assetPass
        ? "Licensed supplied Rodin fonts and shared Wii.css controls. Matching supplied tile, paper, envelope, Memo/Address Book and remote artwork replaces local drawings. Numeric fields use Rodin Medium with complete-value width checks."
        : refinement && (category(id) === "settings" || category(id) === "selector")
        ? "Measured Settings content anchors in both aspects, curved button skins, fitted text and a stable status area. Date/time digits are larger; draft/cancel behavior is preserved."
        : specificChanges[id] || changes[category(id)],
    remaining:
      old?.referenceRole && old.referenceRole !== "same-view"
        ? "Only a related native view/state is available; detailed native geometry remains unverified."
        : assetPass ? "Supplied fonts/artwork are distinguished from retained reconstructions. Layout accuracy, low-resolution raster sources, region/firmware and browser-adapter limits remain independent questions." : "Fonts and reconstructed art remain approximations; original texture and firmware/state differences remain.",
    captures: entries.map((c) => {
      const prev = old?.captures.find(
          (p) => p.width === c.width && p.height === c.height,
        ),
        refID =
          id === "sd-menu" && c.mode === "16:9"
            ? "nintendo-menu-3"
            : c.reference;
      const reference = manifest.references.find((r) => r.id === refID) || null;
      return {
        ...c,
        before: prev ? `../${previousFolder}/${prev.image}` : null,
        reference,
        referenceRole:
          old?.captures.find(
            (p) => p.width === c.width && p.height === c.height,
          )?.referenceRole ||
          c.referenceRole ||
          "same-view",
        geometryFailures: c.geometry.failures,
      };
    }),
  };
});
for (const c of captures) await fs.access(`${output}/${c.image}`);
const failures = captures.flatMap((c) =>
  c.geometry.failures.map((f) => ({
    id: c.id,
    width: c.width,
    height: c.height,
    ...f,
  })),
);
if (failures.length)
  throw Error(`${failures.length} remaining geometry findings`);
const report = {
  date: assetPass ? "2026-10-15" : "2026-10-14",
  baselineRevision: assetPass ? "8aacaa48551935ca67640684df19365c92ce383e" : refinement
    ? "cb8b37bf252a863820128787e9fa4ad1b8463ec8"
    : "b89f23f3fbd1221a7aa4a00b707c7e538b93ac57",
  states,
  summary: {
    states: states.length,
    captures: captures.length,
    coreChecks: core.checks.length,
    interactionChecks: interactions.checks.length,
    pairingChecks: pairing.checks.length,
    homeLayoutChecks: home.checks.length,
    keyboardFocusChecks: keyboardFocus.checks.length,
    geometryFailures: failures.length,
    pageErrors: [
      ...core.errors,
      ...extra.errors,
      ...interactions.errors,
      ...keyboardFocus.errors,
    ],
    missingAssets: core.missing,
    expectedRelayFailures: extra.missing,
  },
  limits: [
    "M PLUS 1p is a permitted approximation, not the original Rodin font.",
    "Manual illustrations retain their source aspect and crop; many are low resolution or related states. No pixel-accuracy score is assigned.",
    "Physical Wii storage capacity, disc-slot illumination, video output, sensor calibration and retired network services use browser adapters.",
    "The production signaling relay is unavailable. QR/manual SDP exchange is accepted between isolated Chromium contexts. This environment supplies no ICE candidates; connected data channel and physical-device pairing remain unverified.",
    "Country options and rating preferences are an adapter subset; full regional firmware, interface translations and age-based channel enforcement need corresponding content metadata.",
  ],
};
if (assetPass) {
  report.inventory = await read(`${output}/inventory.json`);
  report.assetValidation = await read(`${output}/asset-validation.json`);
  report.limits[0] = "The user confirmed licensed public-site embedding of the supplied Rodin/NewRodin fonts. Latin web subsets are site-specific; the generic Wii.css package still excludes fonts.";
  report.limits[3] = "Backend hosting remains deferred. This pass changes static interface assets and reusable controls, not the previously verified pairing transport.";
}
if (refinement) {
  report.relayValidation = await read(`${output}/relay-validation.json`);
  report.automaticPairing = await read(
    `${output}/automatic-pairing-validation.json`,
  );
  if (
    report.automaticPairing.connections?.host !== "connected" ||
    report.automaticPairing.connections?.companion !== "connected" ||
    report.automaticPairing.errors.length
  )
    throw new Error("Automatic pairing validation did not finish cleanly.");
  report.nativeSettingsMeasurements = await read(
    `${output}/native-settings-measurements.json`,
  );
  report.limits[3] =
    "Automatic HTTP signaling and real data-channel input are verified through a local TCP TURN fixture. Production still needs an HTTPS relay host; physical phone motion and Internet/NAT coverage remain unverified.";
  const reconnect = report.states.find((state) => state.id === "reconnect");
  reconnect.remaining = "Production automatic exchange awaits an HTTPS backend host. Physical phone motion and arbitrary Internet/NAT coverage remain unverified.";
  reconnect.change =
    "Standalone signaling service, Vite preview support, secure session IDs, bounded setup and recoverable errors. Automatic HTTP pairing, Player 2 and real HOME input passed through local TURN/TCP.";
}
if (report.summary.pageErrors.length || report.summary.missingAssets.length)
  throw Error("Unexpected runtime errors/assets");
await fs.writeFile(
  `${output}/comparison.json`,
  JSON.stringify(report, null, 2) + "\n",
);
const embedded = JSON.stringify(report).replaceAll("<", "\\u003c");
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Wii system menus — fixes and overlays</title><style>
*{box-sizing:border-box}body{margin:0;background:#edf2f7;color:#203545;font:16px/1.5 system-ui}main{max-width:1500px;margin:auto;padding:24px}section,header{padding:20px;background:white;margin-bottom:20px;border-radius:10px}h1{font-size:28px}h2{font-size:22px}a{color:#075c9b}.controls{display:flex;gap:14px;flex-wrap:wrap;align-items:center}label{display:flex;align-items:center;gap:8px}select,input,button{font:inherit;max-width:100%}select,button{padding:7px}select{max-width:360px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.frame{position:relative;display:grid;place-items:center;background:#d8e1e8;overflow:hidden}.frame img{width:100%;height:100%;object-fit:contain;display:block}figure{margin:0}figcaption{font-weight:600;margin:8px 0}.note{padding:12px;background:#eaf4fc;border-left:4px solid #2f91c1}.limit{background:#fff2dc;border-left-color:#bc831d}.overlay{max-width:1050px;margin:20px auto 0}.overlay img{position:absolute;inset:0}.overview{width:100%;max-width:1200px}table{border-collapse:collapse;width:100%}td,th{padding:10px;border:1px solid #d2dce5;text-align:left;vertical-align:top}@media(max-width:800px){main{padding:8px}.grid{grid-template-columns:1fr}section,header{padding:12px}label{flex-wrap:wrap}}
</style><main><header><h1>Wii system menus: implemented fixes</h1><p id="summary"></p><p>Before captures preserve the 14 October audit. After captures come from the actual application at 640×480, 854×480, 960×720 and 1280×720.</p><p><a href="../layout-reference/">Maintained layout reference</a> · <a href="../system-menu-fixes.md">Implementation and limits</a> · <a href="comparison.json">Capture evidence</a> · <a href="../other-menus/?historical=1">Original audit</a></p><p class="note limit">These are tested browser adapters. Original fonts, artwork and some native screen details remain approximate. Select Original Wii to see source confidence alongside each overlay.</p></header>
<section><div class="controls"><label>Screen <select id="interface"></select></label><label>Display <select id="mode"><option>4:3</option><option>16:9</option></select></label><label>Capture <select id="height"><option value="480">480 lines</option><option value="720">720 lines</option></select></label><button id="previous">Previous</button><button id="next">Next</button></div><h2 id="title"></h2><p class="note" id="change"></p><p id="remaining"></p><div class="grid"><figure><figcaption>Before — original audit</figcaption><div class="frame"><img id="before" alt="Before changes"><p id="no-before">This destination had no adapter in the audit.</p></div></figure><figure><figcaption>After — current application</figcaption><div class="frame"><img id="after" alt="After changes"></div></figure></div>
<div class="overlay"><div class="controls"><label>Overlay <select id="layer"><option value="before">Before / after</option><option value="reference">Original Wii / after</option></select></label><label>Opacity <input id="alpha" type="range" min="0" max="100" value="50"><output id="percent">50%</output></label><label><input type="checkbox" id="difference"> Difference</label></div><p id="confidence" class="note limit"></p><div class="frame"><img id="base" alt="After capture base"><img id="overlay" alt="Comparison overlay"></div><p id="source"></p><p id="geometry"></p></div></section>
<section><h2>Selected before / after comparisons</h2><img class="overview" src="overview.jpg" alt="Before and after Settings, date, sound, SD, messages, HOME and keyboard"></section><section><h2>All implemented destinations</h2><table><thead><tr><th>Screen</th><th>Change</th></tr></thead><tbody id="inventory"></tbody></table></section><section><h2>Verification and remaining limits</h2><p id="verification"></p><ul id="limits"></ul><p><a href="interaction-checks.json">Interaction/geometry checks</a> · <a href="pairing-and-sd.json">Manual SDP exchange and simulated SD full-menu flow</a> · <a href="additional-captures.json">Font and additional-view measurements</a></p></section></main><script>
const report=${embedded},$=s=>document.querySelector(s),sel=$('#interface'),mode=$('#mode'),height=$('#height');
function node(tag,text){const n=document.createElement(tag);if(text)n.textContent=text;return n}function link(url,text){const n=node('a',text);n.href=url;return n}
for(const s of report.states){const o=node('option',s.group+' — '+s.title);o.value=s.id;sel.append(o);const row=node('tr'),cell=node('td');cell.append(link('?interface='+encodeURIComponent(s.id)+'&mode=4%3A3&height=480',s.title));row.append(cell,node('td',s.change));$('#inventory').append(row)}
const q=new URLSearchParams(location.search);sel.value=report.states.some(s=>s.id===q.get('interface'))?q.get('interface'):'date';if(q.get('mode')==='16:9')mode.value='16:9';if(q.get('height')==='720')height.value='720';
function update(){const s=report.states.find(s=>s.id===sel.value),c=s.captures.find(c=>c.mode===mode.value&&c.height===Number(height.value));$('#title').textContent=s.title+' · '+c.width+'×'+c.height;$('#change').textContent=s.change;$('#remaining').textContent=s.remaining;$('#before').hidden=!c.before;$('#before').style.display=c.before?'block':'none';$('#no-before').hidden=!!c.before;if(c.before)$('#before').src=c.before;$('#after').src=$('#base').src=c.image;for(const f of document.querySelectorAll('.frame'))f.style.aspectRatio=c.width+'/'+c.height;
const native=$('#layer').value==='reference',src=native?(c.reference?'../interface-audit/'+c.reference.image:null):c.before;$('#overlay').style.display=src?'block':'none';if(src)$('#overlay').src=src;$('#overlay').style.opacity=Number($('#alpha').value)/100;$('#overlay').style.mixBlendMode=$('#difference').checked?'difference':'normal';$('#percent').textContent=$('#alpha').value+'%';$('#confidence').textContent=native?(c.reference?c.referenceRole+' · '+(c.reference.mode===c.mode?'Same source aspect. ':'Illustration/opposite aspect; contain fit. ')+c.reference.notes:'No same-view native source collected.'):(c.before?'Identical application viewport sizes; whole-frame alignment. Values and content may differ.':'No before adapter. Use Original Wii for structural evidence where available.');$('#source').replaceChildren();if(native&&c.reference)$('#source').append(link(c.reference.sourceURL,c.reference.title+' — source'),node('p',c.reference.originalSize.join('×')+' original pixels; no inferred native accuracy score.'));$('#geometry').textContent='Visible control bounds, text and center-hit checks passed for this capture.';history.replaceState(null,'','?interface='+encodeURIComponent(s.id)+'&mode='+encodeURIComponent(c.mode)+'&height='+c.height)}
for(const e of [sel,mode,height,$('#layer'),$('#alpha'),$('#difference')])e.addEventListener('input',update);for(const [id,d]of [['previous',-1],['next',1]])$('#'+id).onclick=()=>{sel.selectedIndex=(sel.selectedIndex+d+report.states.length)%report.states.length;update()};$('#summary').textContent=report.summary.states+' states · '+report.summary.captures+' captures · both aspect ratios at 480 and 720 lines.';$('#verification').textContent=report.summary.coreChecks+' core interaction checks, '+report.summary.interactionChecks+' added checks, '+report.summary.pairingChecks+' pairing/SD checks, '+report.summary.homeLayoutChecks+' HOME placement checks and '+report.summary.keyboardFocusChecks+' keyboard focus checks; no captured geometry failures, unexpected assets or page errors. Missing automatic relay requests are recorded separately.';for(const limit of report.limits)$('#limits').append(node('li',limit));update();
</script></html>`;
const page = assetPass
  ? html
      .replace("Before — original audit", "Before — 8aacaa4 / prior matching capture")
      .replace("Before captures preserve the 14 October audit.", "Before captures use the latest matching storage capture at 8aacaa4 or the preceding full menu collection. Fonts and surfaces are now shared with Wii.css.")
      .replace("../system-menu-fixes.md", "../interface-assets.md")
      .replace('<a href="comparison.json">Capture evidence</a>', '<a href="comparison.json">Capture evidence</a> · <a href="review/">Complete manual visual review: all 66 screens, findings and corrections</a>')
      .replace("These are tested browser adapters. Original fonts, artwork and some native screen details remain approximate.", "These are tested browser adapters using the user’s licensed Rodin fonts and supplied artwork. Native layout precision, retained reconstructions and raster source resolution remain separately labeled.")
      .replace("<section><h2>Verification and remaining limits</h2>", '<section><h2>Uploaded files and shared components</h2><p><a href="catalog.html">Inspect every source file, every Illustrator artboard, runtime exports and all eight font specimens</a>. Exact Wii.css matches are reused rather than copied into new drawings.</p><p><a href="asset-validation.json">Actual platform-font, complete numeric-field and pressed-state checks</a> · <a href="calendar-comparisons.html">Interactive Calendar compared with the supplied dated references</a></p></section><section><h2>Verification and remaining limits</h2>')
  : refinement
  ? html
      .replaceAll("Before — original audit", "Before — cb8b37b")
      .replace(
        "Before captures preserve the 14 October audit.",
        "Before captures preserve the first fixes at cb8b37b.",
      )
      .replace("../system-menu-fixes.md", "../system-menu-refinement.md")
      .replace("<h1>Wii system menus: implemented fixes</h1>", '<h1>Wii system menus: implemented fixes</h1><p class="note"><a href="../storage-menu-refinement/">Newer Options and Data Management sizing pass</a> — original / before / after, both aspects and 480/720 lines. Storage captures in this earlier full collection are preserved.</p>')
      .replace(
        '<a href="../other-menus/?historical=1">Original audit</a>',
        '<a href="../other-menus/?historical=1">Original audit</a>',
      )
      .replace(
        "<section><h2>Verification and remaining limits</h2>",
        '<section><h2>Automatic controller pairing</h2><p>The actual HTTP relay connected two isolated Chromium contexts through a local TCP TURN server. Player 2, HOME input and Disconnect passed. BroadcastChannel was disabled.</p><p>Production service hosting is pending; this does not establish physical-phone or arbitrary Internet connectivity.</p><div class="grid"><img class="overview" style="max-height:600px;object-fit:contain" src="automatic-pairing-connected.png" alt="Host with a genuinely connected controller"><img class="overview" style="max-height:600px;object-fit:contain" src="automatic-companion-connected.png" alt="Connected Player 2 companion"></div><p><a href="automatic-pairing-validation.json">Real browser transport evidence</a> · <a href="relay-validation.json">HTTP relay validation</a> · <a href="native-settings-measurements.json">Independent original Settings measurements</a></p></section><section><h2>Verification and remaining limits</h2>',
      )
  : html;
await fs.writeFile(`${output}/index.html`, page);
console.log(`Built ${states.length} states / ${captures.length} captures.`);

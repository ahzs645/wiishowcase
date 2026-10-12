import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const output = path.join(root, "docs/interface-audit");
const referenceData = JSON.parse(
  await fs.readFile(path.join(output, "references.json")),
);
const captures = JSON.parse(
  await fs.readFile(path.join(output, "current-results.json")),
);
const nativeChecks = JSON.parse(
  await fs.readFile(path.join(output, "native-size-checks.json")),
);
for (const check of nativeChecks)
  captures.captures.push({
    id: "options-native",
    mode: check.mode,
    width: check.width,
    height: check.height,
    image: check.image,
    note: "480-line Options spot-check; no full interface coverage at this scale is claimed.",
  });
const references = referenceData.references;
const rows = [];
const add = (id, title, status, priority, finding, refs, current = id) =>
  rows.push({ id, title, status, priority, finding, refs, current });
add(
  "options-native",
  "Wii Options at 480 lines",
  "Partial",
  "P1",
  "640×480 and 854×480 display-size spot-checks. All six button centers hit and their bounds fit. The three-tile layout still differs from the original two-tile root.",
  { illustration: "manual-316" },
);
rows[0].captureHeight = 480;
add(
  "menu-settled",
  "Wii Menu",
  "Partial",
  "P1",
  "Grid is too small in 4:3, while the clock/date/footer controls are oversized in both modes. Wii/SD controls and original icon proportions need work. Current pages provide 24 slots; the original menu provides 48. Channel contents, dates and animation phases differ, so this is a shell/layout comparison.",
  { "4:3": "copetti-home", "16:9": "nintendo-menu-2" },
);
add(
  "options",
  "Wii Options",
  "Partial",
  "P1",
  "Original root has two tiles: Data Management and Wii Settings. We show a third Update tile and different icons. Both original submenu buttons currently do nothing. The update flow works as a web-build check.",
  { illustration: "manual-316" },
);
add(
  "message-board",
  "Message board",
  "Partial",
  "P1",
  "Day navigation, sample messages, read pins and Mii rendering work. Footer controls and letter scale differ; messages are sample fixtures. Notepad has no handler. This reference is 4:3; the widescreen pane is a structural comparison, not a validated native widescreen overlay.",
  { "4:3": "copetti-mail", illustration: "manual-233" },
);
add(
  "message-open-memo",
  "Opened memo",
  "Partial",
  "P1",
  "Memo variant captured separately to avoid treating the avatar-card color as a memo defect. Original Back/delete controls are absent. Received letters also need Reply. Click-outside dismissal works. Sample text, avatar and date differ.",
  { "16:9": "nwr-43" },
);
add(
  "calendar",
  "Message-board calendar",
  "Partial",
  "P2",
  "Month navigation, highlighted current day and message markers work. Panel margins, arrow placement, Back button and text scale differ. Manual picture is cropped: use it as a structural reference, not a full-frame pixel target.",
  { illustration: "manual-257" },
);
add(
  "home-menu",
  "HOME Menu",
  "Partial",
  "P1",
  "Menu opens and closes, but bar/button proportions and the remote graphic differ; the remote is partly outside the frame. Remote Settings is plain text with no controls behind it. Batteries represent connected/not-connected, not actual levels. Operations Guide is context-dependent in the original; guide support and context states are missing.",
  { illustration: "manual-461" },
);
add(
  "keyboard",
  "Shared QWERTY keyboard",
  "Partial",
  "P1",
  "Shop-derived art and the basic 53-key input work. The original system keyboard also has language/symbol controls, alternate layout, multiline/return/scroll controls and message-board predictions. These are absent. Nintendo documents symbol shifting; our uppercase Shift intentionally preserves the chosen Shop-website behavior. Add a separate system profile rather than silently changing Shop. This is a standalone component capture; the message composer does not mount it.",
  { illustration: "manual-497" },
);
add(
  "banner-disc",
  "Disc selection shell",
  "Preview",
  "P2",
  "Compare shell and controls only: reference has an inserted game; our captured Disc state differs. Frame masks and WAD loading work. Fine art and animation fidelity require a matching title/state/phase.",
  { "16:9": "nwr-15", illustration: "manual-18" },
);
for (const [id, title] of [
  ["mii", "Mii"],
  ["photo", "Photo"],
  ["shop", "Shop"],
  ["news", "News"],
  ["pokemon-ranch", "Pokémon Ranch"],
  ["forecast", "Forecast"],
])
  add(
    `banner-${id}`,
    `${title} selection shell`,
    "Preview",
    "P2",
    "Outer icon/banner capture only. Reference uses a different game title; compare frame and controls, not artwork pixels. Forecast is enabled by channelPreview=1 and its Start is disabled. Other full applications are separate from native banner rendering.",
    { "16:9": "nwr-15", illustration: "manual-18" },
  );
add(
  "safety",
  "Health and safety",
  "Adapted",
  "P2",
  "Current screen captured in both modes. Text and continue hint are adapted for mouse input. The found online reference image returned 403; no validated reference overlay is claimed.",
  {},
);
add(
  "update-latest",
  "Web update dialog",
  "Adapted",
  "P2",
  "Checking and latest stages work. This checks the web build, with simulated progress if updating; it is not a replica of all console firmware/EULA/error states.",
  {},
);
add(
  "menu-page-two",
  "Second menu page",
  "Partial",
  "P2",
  "Page navigation works. Additional original menu pages, persistent channel layout and A+B rearrangement are missing. No matching blank-page reference was available; inspect shell only.",
  { "4:3": "copetti-home", "16:9": "nintendo-menu-2" },
);
add(
  "message-empty",
  "Empty message day",
  "Present",
  "P2",
  "Captured through actual day-navigation clicks. No state-matched original empty-day reference is included.",
  {},
);
const missing = [
  ["settings-1", "System Settings page 1", "manual-326"],
  ["settings-2", "System Settings page 2", "manual-327"],
  ["settings-3", "System Settings page 3", "manual-328"],
  ["nickname", "Console nickname", "manual-338"],
  ["date-setting", "Date setting", "manual-339"],
  ["time-setting", "Time setting", "manual-340"],
  ["display-setting", "Display/aspect setting", "manual-342"],
  ["sound-setting", "Sound setting", "manual-354"],
  ["data-management", "Data Management", "manual-315"],
  ["save-data", "Save Data chooser", "manual-312"],
  ["save-data-grid", "Save Data grid", "manual-314"],
  ["remote-settings", "Remote Settings controls", "manual-462"],
  ["remote-reconnect", "Remote reconnect", "manual-464"],
  ["sd-menu", "SD Card Menu", "manual-472"],
  ["sd-start", "SD title selection", "manual-474"],
  ["sd-storage", "SD storage warning", "manual-484"],
  ["compose", "Memo composer", "manual-265"],
  ["create-message", "Create Message chooser", "manual-268"],
  ["address-book", "Address book", "manual-278"],
  ["friend-register", "Wii number/friend register", "manual-291"],
  ["phone-keyboard", "Cell phone keyboard", "manual-496"],
  ["shop-app", "Full Shop home", "nwr-38"],
  ["shop-catalog", "Shop catalog", "nwr-40"],
  ["shop-details", "Shop title details", "nwr-41"],
];
for (const [id, title, ref] of missing)
  add(
    id,
    title,
    "Missing",
    "P1",
    "Reference exists; no matching view is wired in the current default Showcase. No current screenshot or fabricated overlay is supplied.",
    { illustration: ref },
    null,
  );
add(
  "forecast-globe",
  "Forecast full application",
  "Future scope",
  "P2",
  "Original globe screenshot collected as a future reference. Menu/banner input adapters do not demonstrate the full 3D globe application. Full-app runtime fidelity was outside this capture pass.",
  { "16:9": "nwr-23" },
  null,
);
add(
  "news-globe",
  "News full application",
  "Future scope",
  "P2",
  "Original globe/slideshow screenshot collected as a future reference. Default News routes to separate content and opt-in native previews exist; neither is claimed equivalent by this menu/system-screen audit.",
  { "16:9": "nwr-29" },
  null,
);
const audit = {
  ...captures,
  references,
  rows,
  rejectedOrUnavailable: referenceData.rejectedOrUnavailable,
  method:
    "960×720 (4:3) and 1280×720 (16:9) are comparison canvases with a common 720px height, not claims about native Wii video resolution. Source images retain aspect and are centered with contain fitting. No 4:3 reference is stretched to 16:9. Cropped, annotated, low-resolution and unmatched-state references are labelled. No global accuracy percentage is calculated.",
};
await fs.writeFile(
  path.join(output, "audit.json"),
  JSON.stringify(audit, null, 2) + "\n",
);
const data = JSON.stringify(audit).replaceAll("<", "\\u003c");
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Wii interface visual audit</title>
<style>*{box-sizing:border-box}body{margin:24px;font:15px system-ui,sans-serif;color:#172e40;background:#edf2f7}h1{margin:0;font-size:28px}p{line-height:1.5;max-width:1180px}.controls{display:flex;align-items:center;gap:18px;flex-wrap:wrap;padding:16px;background:white;border-radius:10px}label{display:flex;gap:8px;align-items:center}select,button{font:inherit;padding:8px}#row{max-width:350px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:16px}.panel{padding:12px;background:white;border-radius:10px;min-width:0}h2{font-size:16px;margin:0 0 8px}.stage{position:relative;aspect-ratio:4/3;background:#dce4eb;overflow:hidden;display:flex;align-items:center;justify-content:center}.stage img{width:100%;height:100%;object-fit:contain;position:absolute;inset:0}.layer{opacity:.5;transform-origin:center}.missing{padding:20px;text-align:center;color:#607283}.badge{display:inline-block;margin-right:8px;padding:5px 9px;border-radius:7px;background:#e4edf5}.missing-badge{background:#ffebbd}.notes{margin:16px 0;padding:16px;background:white;border-radius:10px;line-height:1.5}#source{overflow-wrap:anywhere}a{color:#0669b2}.summary{display:flex;gap:12px;margin:14px 0}.legend{font-size:13px;color:#536779}.status-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.status-list button{text-align:left;background:white;border:1px solid #cbd7e2;border-radius:6px;cursor:pointer;font-size:13px}details{margin-top:20px}#ref-notes{min-height:65px}@media(max-width:950px){.grid,.status-list{grid-template-columns:1fr}}body.overview .controls,body.overview details,body.overview .intro,body.overview .summary{display:none}body.overview .stage{aspect-ratio:4/3}.overview-block{margin-bottom:24px}</style>
<h1>Wii interface visual audit</h1><p class="intro">${references.length} curated online references and ${captures.captures.length} current captures across both display modes. The review covers the menu, system screens and outer channel presentations. Full application screenshots are included as future references.</p>
<div class="summary"><span class="badge">4:3 · 960×720</span><span class="badge">16:9 · 1280×720</span><span class="badge">No stretching or global fidelity score</span></div>
<div class="controls"><label>Interface <select id="row"></select></label><label>Display <select id="mode"><option>4:3</option><option>16:9</option></select></label><label>Reference <select id="reference"><option value="">Suggested reference</option></select></label><label>Reference opacity <input type="range" id="opacity" min="0" max="100" value="50"><output id="percent">50%</output></label><label><input type="checkbox" id="difference">Difference view</label></div>
<div id="content"></div><details open><summary>Coverage and missing views</summary><div id="coverage" class="status-list"></div></details>
<p class="legend">Comparison canvases use a common height, not native Wii video output resolution. References retain their captured aspect; crop and version notes matter. Different channels, dates, fixtures, pointer positions, encodings and animation phases influence overlays. Manual illustrations and opposite-aspect fallbacks are structural references, not proof of native widescreen fidelity. The shared keyboard is captured in an explicit harness because the composer does not mount it.</p>
<script>const audit=${data};const select=document.querySelector('#row'),mode=document.querySelector('#mode'),opacity=document.querySelector('#opacity'),difference=document.querySelector('#difference'),referenceSelect=document.querySelector('#reference');for(const reference of audit.references){const option=document.createElement('option');option.value=reference.id;option.textContent=reference.title;referenceSelect.append(option)}
for(const row of audit.rows){const option=document.createElement('option');option.value=row.id;option.textContent=row.title+' — '+row.status;select.append(option);const button=document.createElement('button');button.textContent=row.priority+' · '+row.title+' · '+row.status;button.onclick=()=>{select.value=row.id;render();window.scrollTo({top:0,behavior:'smooth'})};document.querySelector('#coverage').append(button)}
function imagePanel(title,images,aspect){const panel=document.createElement('div');panel.className='panel';const h=document.createElement('h2');h.textContent=title;panel.append(h);const stage=document.createElement('div');stage.className='stage';stage.style.aspectRatio=aspect;panel.append(stage);if(!images.length){const text=document.createElement('div');text.className='missing';text.textContent='No matching screenshot / implemented view';stage.append(text)}for(const [index,source] of images.entries()){const img=new Image();img.src=source;if(index){img.className='layer';img.style.opacity=opacity.value/100;img.style.mixBlendMode=difference.checked?'difference':'normal'}stage.append(img)}return panel}
function block(row,display){const refId=referenceSelect.value||row.refs[display]||row.refs.illustration||row.refs['4:3']||row.refs['16:9'];const ref=audit.references.find(r=>r.id===refId);const current=audit.captures.find(c=>c.id===row.current&&c.mode===display&&c.height===(row.captureHeight||720));const aspect=display==='4:3'?'4 / 3':'16 / 9';const wrapper=document.createElement('section');wrapper.className='overview-block';const note=document.createElement('div');note.className='notes';const title=document.createElement('strong');title.textContent=row.title+' · '+display+' · '+row.status+' · '+row.priority;note.append(title,document.createElement('br'),document.createTextNode(row.finding));wrapper.append(note);const grid=document.createElement('div');grid.className='grid';const referenceLabel=ref?(ref.mode===display?'Reference · '+ref.kind:'Structural reference · '+ref.mode):'Reference unavailable';grid.append(imagePanel(referenceLabel,ref?[ref.image]:[],aspect),imagePanel('Current · '+(current?current.width+'×'+current.height:display==='4:3'?'960×720':'1280×720'),current?[current.image]:[],aspect),imagePanel(difference.checked?'Illustrative difference':'Aligned frame overlay',ref&&current?[current.image,ref.image]:[],aspect));wrapper.append(grid);const provenance=document.createElement('div');provenance.className='notes';provenance.id='ref-notes';if(ref){const link=document.createElement('a');link.href=ref.sourceURL;link.target='_blank';link.textContent=ref.title+' — source';provenance.append(link,document.createElement('br'),document.createTextNode(ref.originalSize.join('×')+' source pixels. '+ref.notes));if(ref.mode!==display)provenance.append(document.createElement('br'),document.createTextNode('This source is not an independent '+display+' capture. The fit preserves the supplied aspect.'))}else provenance.textContent='No validated, state-matched reference image in this audit.';wrapper.append(provenance);return wrapper}
function render(){document.querySelector('#percent').textContent=opacity.value+'%';document.querySelector('#content').replaceChildren(block(audit.rows.find(r=>r.id===select.value),mode.value))}select.onchange=mode.onchange=opacity.oninput=difference.onchange=referenceSelect.onchange=render;
select.value='menu-settled';const params=new URLSearchParams(location.search);if(params.get('screen'))select.value=params.get('screen');if(params.get('mode'))mode.value=params.get('mode');render();
if(location.hash==='#overview'){document.body.classList.add('overview');document.querySelector('#content').replaceChildren(...['4:3','16:9'].map(display=>block(audit.rows.find(row=>row.id==='menu-settled'),display)))}
</script></html>`;
await fs.writeFile(path.join(output, "index.html"), html);
console.log(
  `Built audit: ${rows.length} interface entries, ${references.length} references, ${captures.captures.length} current captures.`,
);

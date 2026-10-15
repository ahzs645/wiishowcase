import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {chromium} from "playwright";
const out="docs/interface-assets";await fs.mkdir(`${out}/calendar`,{recursive:true});
const sources=[
 {month:1,name:"February",rows:4,file:"Screenshot 2026-02-08 at 12.05.09 PM.png"},
 {month:2,name:"March",rows:5,file:"Screenshot 2026-02-08 at 12.05.16 PM.png"},
 {month:4,name:"May",rows:6,file:"Screenshot 2026-02-09 at 12.41.24 PM.png"},
];
const report={sources,checks:[],captures:[],errors:[]};
const browser=await chromium.launch({executablePath:"/usr/bin/chromium",args:["--no-sandbox"]});
try{
 for(const [width,height] of [[640,480],[854,480],[960,720],[1280,720]]){
  const p=await browser.newPage({viewport:{width,height},timezoneId:"America/Vancouver"});
  p.on("pageerror",e=>report.errors.push(e.message));
  await p.addInitScript(()=>{const D=Date;window.Date=class extends D{constructor(...a){super(...(a.length?a:["2026-02-08T20:00:00Z"]))}static now(){return new D("2026-02-08T20:00:00Z").getTime()}}});
  await p.goto("http://localhost:4955/wiishowcase/?screen=menu&channelPreview=1");
  await p.getByRole("button",{name:"Open Mail",exact:true}).click();await p.waitForTimeout(650);
  await p.getByRole("button",{name:"Calendar",exact:true}).click();await p.waitForTimeout(800);
  for(const source of sources){
   await p.evaluate(month=>document.querySelector('[data-wii-calendar]').__wiiCalendar.setMonth(2026,month),source.month);
   await p.evaluate(()=>document.fonts.ready);await p.mouse.move(width-2,height-2);
   const rows=await p.locator(".wii-calendar-table tbody tr").count();assert.equal(rows,source.rows);report.checks.push(`${width}: ${source.name} has ${rows} dynamic week rows`);
   const back=p.locator(".calendar-native-back"),rect=await back.boundingBox();
   assert.ok(rect.x>0&&rect.y>0&&rect.x+rect.width<=width&&rect.y+rect.height<=height);
   assert.ok(await back.evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}));
   report.checks.push(`${width}: ${source.name} shared Back is inside the footer and receives hits`);
   const image=`calendar/${source.name.toLowerCase()}-${width}x${height}.png`;
   await p.locator(".wii-calendar-container").screenshot({path:`${out}/${image}`});
   const metrics=await p.locator(".wii-calendar-container").evaluate(e=>({rect:e.getBoundingClientRect().toJSON(),font:getComputedStyle(e).fontFamily}));
   report.captures.push({month:source.name,mode:width/height>1.5?"16:9":"4:3",width,height,image,reference:`sources/${source.file}`,metrics});
  }
  await p.locator(".calendar-native-back").click();await p.waitForTimeout(600);
  assert.equal(await p.locator(".wii-menu-calendar-wrapper").getAttribute("aria-hidden"),"true");report.checks.push(`${width}: Back exits the actual calendar`);
  await p.close();
 }
 assert.deepEqual(report.errors,[]);
}finally{await browser.close();await fs.writeFile(`${out}/calendar-validation.json`,JSON.stringify(report,null,2)+"\n")}
const data=JSON.stringify(report).replaceAll('<','\\u003c');
await fs.writeFile(`${out}/calendar-comparisons.html`,`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Supplied calendar comparisons</title><style>*{box-sizing:border-box}body{margin:0;font:16px/1.5 system-ui;background:#edf2f7;color:#203545}main{max-width:1300px;padding:24px;margin:auto}section{background:white;padding:20px;border-radius:10px}.controls{display:flex;flex-wrap:wrap;gap:15px}select,input{font:inherit;max-width:100%}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}img{width:100%;height:100%;object-fit:contain}.frame{background:#d8e1e8;position:relative;overflow:hidden}.overlay{margin:20px auto;max-width:850px}.overlay img{position:absolute;inset:0}figure{margin:0}figcaption{margin:10px 0;font-weight:600}@media(max-width:700px){main{padding:8px}.grid{grid-template-columns:1fr}}</style><main><h1>Interactive calendar and supplied recreated references</h1><p><a href="./">Menu comparisons</a> · <a href="catalog.html">Asset catalog</a> · <a href="calendar-validation.json">Actual month/Back checks</a></p><p>These references are the user's recreated calendar screenshots, not independently identified native Wii captures. Current captures isolate the live Wii.css calendar pane, including its Back control. Images retain their own aspect; surrounding screenshot padding/crop differs.</p><section><div class="controls"><label>Month <select id="month"><option>February</option><option>March</option><option>May</option></select></label><label>Display <select id="mode"><option>4:3</option><option>16:9</option></select></label><label>Height <select id="height"><option>480</option><option>720</option></select></label><label>Opacity <input id="alpha" type="range" min="0" max="100" value="50"></label><label><input type="checkbox" id="difference"> Difference</label></div><div class="grid"><figure><figcaption>Supplied recreated reference</figcaption><div class="frame"><img id="reference" alt="Supplied calendar screenshot"></div></figure><figure><figcaption>Current interactive Wii.css calendar</figcaption><div class="frame"><img id="current" alt="Current calendar pane"></div></figure></div><div class="overlay frame"><img id="base" alt="Current calendar base"><img id="overlay" alt="Supplied reference overlay"></div><p id="details"></p></section></main><script>const report=${data},$=s=>document.querySelector(s);function update(){const c=report.captures.find(c=>c.month===$('#month').value&&c.mode===$('#mode').value&&c.height===Number($('#height').value));$('#reference').src=$('#overlay').src=c.reference;$('#current').src=$('#base').src=c.image;for(const f of document.querySelectorAll('.frame'))f.style.aspectRatio=c.metrics.rect.width+'/'+c.metrics.rect.height;$('#overlay').style.opacity=Number($('#alpha').value)/100;$('#overlay').style.mixBlendMode=$('#difference').checked?'difference':'normal';$('#details').textContent=c.month+' 2026 · '+c.width+'×'+c.height+' application viewport · '+Math.round(c.metrics.rect.width)+'×'+Math.round(c.metrics.rect.height)+' live pane. '+report.checks.length+' month-row and Back checks passed.'}for(const s of ['#month','#mode','#height','#alpha','#difference'])$(s).addEventListener('input',update);update();</script></html>`);
console.log(`PASS ${report.captures.length} calendar pane captures and ${report.checks.length} checks`);

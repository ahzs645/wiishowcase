import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {chromium} from "playwright";
import {interfaceGeometry} from "./lib/interface-geometry.mjs";
const output="docs/interface-assets";
await fs.mkdir(`${output}/details`,{recursive:true});
const report={checks:[],fonts:[],inputs:[],captures:[],errors:[],missing:[]};
const check=(name,ok)=>{assert.ok(ok,name);report.checks.push(name);console.log("PASS",name)};
const browser=await chromium.launch({executablePath:"/usr/bin/chromium",args:["--no-sandbox"]});
try{
 for(const [width,height] of [[640,480],[854,480],[960,720],[1280,720]]){
  const context=await browser.newContext({viewport:{width,height},timezoneId:"America/Vancouver"});
  const p=await context.newPage();
  p.on("pageerror",e=>report.errors.push({width,message:e.message}));
  p.on("response",r=>{if(r.status()>=400&&!r.url().endsWith("favicon.ico"))report.missing.push({width,url:r.url(),status:r.status()})});
  const b=(name,scope=p)=>scope.getByRole("button",{name,exact:true});
  const snap=async id=>{
   await p.mouse.move(width-2,height-2);await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(300);
   const geometry=await p.evaluate(interfaceGeometry);assert.deepEqual(geometry.failures,[],`${id} ${width}`);
   const image=`details/${id}-${width}x${height}.png`;await p.screenshot({path:`${output}/${image}`});report.captures.push({id,width,height,image,mode:width/height>1.5?"16:9":"4:3",title:id==="save-sd"?"SD Card save data":id==="gamecube-slot-b"?"GameCube Slot B":id,reference:"manual-314",referenceRole:"related-state",geometry});
  };
  await p.goto("http://localhost:4955/wiishowcase/?screen=settings&channelPreview=1");
  await p.evaluate(()=>document.fonts.ready);
  check(`${width}: both tiles use the shared supplied surfaces`,await p.locator(".wii-system-tile__surface").evaluateAll(es=>es.length===2&&es.every(e=>e.complete&&e.naturalWidth>0)));
  const cdp=await context.newCDPSession(p);await cdp.send("DOM.enable");await cdp.send("CSS.enable");
  const platform=async(selector,label)=>{
   const {root}=await cdp.send("DOM.getDocument");const {nodeId}=await cdp.send("DOM.querySelector",{nodeId:root.nodeId,selector});
   const data=await cdp.send("CSS.getPlatformFontsForNode",{nodeId});
   check(`${width}: ${label} renders supplied font glyphs`,data.fonts.some(f=>f.isCustomFont&&/Rodin/i.test(f.familyName)));
   report.fonts.push({width,label,...data});
  };
  await platform(".wii-system-tile__label","system labels");
  const tile=b("Data Management"),normal=await tile.boundingBox();await tile.hover();
  await p.screenshot({path:`${output}/details/tile-hover-${width}x${height}.png`});
  await p.mouse.down();await p.waitForTimeout(150);const pressed=await tile.boundingBox();
  check(`${width}: shared tile pressed state preserves its hit area`,pressed.width<normal.width&&pressed.width>normal.width*.95);
  await p.screenshot({path:`${output}/details/tile-pressed-${width}x${height}.png`});await p.mouse.up();
  await b("Save Data").click();await b("Nintendo GameCube").click();await snap("gamecube-font-fit");
  await b("Slot B").click();await snap("gamecube-slot-b");
  check(`${width}: Slot B uses the current shared shell`,await b("Slot B").getAttribute("aria-pressed")==="true");
  await p.locator(".system-settings-shell footer").getByRole("button",{name:"Back",exact:true}).click();
  await b("Wii").click();await b("SD Card").click();await snap("save-sd");
  check(`${width}: SD uses the current shared shell`,await b("SD Card").getAttribute("aria-pressed")==="true");
  await p.locator(".system-settings-shell footer").getByRole("button",{name:"Back",exact:true}).click();
  await p.locator(".system-settings-shell footer").getByRole("button",{name:"Back",exact:true}).click();
  await p.locator(".system-settings-shell footer").getByRole("button",{name:"Back",exact:true}).click();
  await b("Wii Settings").click();await b("Calendar").click();await b("Date").click();
  for(const id of ["date","time"]){
   if(id==="time"){await p.locator(".system-settings-shell footer").getByRole("button",{name:"Back",exact:true}).click();await b("Time").click()}
   await p.evaluate(()=>document.fonts.ready);
   const measurements=await p.locator(".native-number-column input").evaluateAll(es=>es.map(el=>{
    const style=getComputedStyle(el),ctx=document.createElement("canvas").getContext("2d");ctx.font=style.font;
    return {label:el.getAttribute("aria-label"),value:el.value,font:style.font,width:el.clientWidth,scrollWidth:el.scrollWidth,textWidth:ctx.measureText(el.value).width};
   }));
   for(const m of measurements)check(`${width}: complete ${m.label} digits fit the editable input`,m.textWidth<=m.width-1&&m.scrollWidth<=m.width+1);
   report.inputs.push({id,width,height,measurements});
   await platform(".native-number-separator",`${id} numerals`);
   await snap(`${id}-font-fit`);
  }
  await context.close();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);
}finally{await browser.close();await fs.writeFile(`${output}/asset-validation.json`,JSON.stringify(report,null,2)+"\n")}
console.log(`PASS ${report.checks.length} supplied-art/font checks`);

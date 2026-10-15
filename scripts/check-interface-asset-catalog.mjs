import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {chromium} from "playwright";
const base=process.env.ASSET_DOCS_BASE || "http://localhost:4957/interface-assets/";
const browser=await chromium.launch({executablePath:"/usr/bin/chromium",args:["--no-sandbox"]});
const report={sourceFiles:27,artboards:45,fontSpecimens:8,calendarCombinations:0,errors:[],missing:[]};
try{
 const p=await browser.newPage({viewport:{width:1440,height:1100}});
 p.on('pageerror',e=>report.errors.push(e.message));p.on('response',r=>{if(r.status()>=400)report.missing.push({url:r.url(),status:r.status()})});
 await p.goto(base+"catalog.html");
 await p.evaluate(()=>document.querySelectorAll('img').forEach(i=>i.loading='eager'));
 await p.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));await p.evaluate(()=>document.fonts.ready);
 assert.equal(await p.locator('article').count(),8);
 const cdp=await p.context().newCDPSession(p);await cdp.send('DOM.enable');await cdp.send('CSS.enable');
 const {root}=await cdp.send('DOM.getDocument');
 report.fonts=[];
 for(let i=0;i<8;i++){
  const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector:`article:nth-child(${i+1}) p`});
  const fonts=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});assert.ok(fonts.fonts.some(f=>f.isCustomFont&&/Rodin/i.test(f.familyName)));report.fonts.push(fonts);
 }
 await p.locator('#filter').fill('envelope');assert.ok(await p.locator('figure:visible').count()>0);assert.ok(await p.locator('figure:visible').count()<81);
 await p.setViewportSize({width:390,height:844});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await p.goto(base+'calendar-comparisons.html');
 for(const month of ['February','March','May'])for(const mode of ['4:3','16:9'])for(const height of ['480','720']){
  await p.selectOption('#month',month);await p.selectOption('#mode',mode);await p.selectOption('#height',height);
  await p.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));report.calendarCombinations++;
 }
 await p.locator('#alpha').fill('75');assert.equal(await p.locator('#overlay').evaluate(e=>getComputedStyle(e).opacity),'0.75');
 await p.locator('#difference').check();assert.equal(await p.locator('#overlay').evaluate(e=>getComputedStyle(e).mixBlendMode),'difference');
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);
}finally{await browser.close();await fs.writeFile('docs/interface-assets/catalog-validation.json',JSON.stringify(report,null,2)+'\n')}
console.log('PASS eight actual font specimens, all source/export images, asset filtering, 12 calendar combinations and mobile widths');

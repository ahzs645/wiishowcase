import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const dir='docs/interface-assets/review';
const report=JSON.parse(await fs.readFile(`${dir}/review.json`));
assert.equal(report.states.length,66);assert.equal(report.summary.captures,264);
let hashes=0;
for(const s of report.states){
 assert.equal(s.reviewedSizes.length,4);assert.ok(s.findings.length>30);
 for(const c of [s.initialSheet,...s.captures,...s.captures.flatMap(c=>[c.reference,c.before]).filter(Boolean)]){
  assert.equal(crypto.createHash('sha256').update(await fs.readFile(path.resolve(dir,c.image))).digest('hex'),c.sha256,`${s.id} evidence hash`);hashes++;
 }
}
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const validation={hashes,checks:[],errors:[],missing:[]};
try{
 const p=await browser.newPage({viewport:{width:1440,height:1000}});p.on('pageerror',e=>validation.errors.push(e.message));p.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))validation.missing.push(r.url())});
 await p.goto('http://localhost:4957/interface-assets/review/');assert.equal(await p.locator('article').count(),66);
 const images=await p.locator('img').evaluateAll(es=>es.map(e=>e.src));
 const failures=await p.evaluate(async urls=>{const failed=[];for(let i=0;i<urls.length;i+=8){await Promise.all(urls.slice(i,i+8).map(src=>new Promise(resolve=>{const im=new Image();im.onload=()=>{if(!im.naturalWidth)failed.push(src);im.onload=null;im.onerror=null;resolve()};im.onerror=()=>{failed.push(src);resolve()};im.src=src}))) }return failed},images);
 assert.deepEqual(failures,[]);validation.checks.push(`${images.length} review/current images decode`);
 for(const [filter,count] of [['corrected',20],['no-source',8],['all',66]]){await p.locator('#filter').selectOption(filter);assert.equal(await p.locator('article:visible').count(),count);validation.checks.push(`${filter} filter ${count} states`)}
 await p.locator('#search').fill('GameCube Slot B');assert.equal(await p.locator('article:visible').count(),1);await p.locator('#search').fill('');
 for(const width of [375,640,854,1280]){await p.setViewportSize({width,height:900});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));validation.checks.push(`${width}: no horizontal overflow`)}
 await p.locator('#filter').selectOption('corrected');await p.screenshot({path:'/workspace/scratch/full-overlay-review/review-page.png'});
 assert.deepEqual(validation.errors,[]);assert.deepEqual(validation.missing,[]);
}finally{await browser.close();await fs.writeFile(`${dir}/viewer-validation.json`,JSON.stringify(validation,null,2)+'\n')}
console.log(`PASS ${hashes} evidence hashes, ${validation.checks.length} viewer checks`);

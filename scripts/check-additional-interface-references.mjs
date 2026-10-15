import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const dir='docs/interface-assets/references';
const data=JSON.parse(await fs.readFile(`${dir}/comparison.json`));
assert.equal(data.references.length,50);
const hashes=new Set();
for(const r of data.references){
 const hash=crypto.createHash('sha256').update(await fs.readFile(`${dir}/${r.image}`)).digest('hex');
 assert.equal(hash,r.sha256,r.id);assert.ok(!hashes.has(hash),`Duplicate bytes: ${r.id}`);hashes.add(hash);
 assert.equal(r.comparisonUse,'structure-only');assert.equal(r.aspect,'unverified');
 for(const s of r.comparisons)assert.equal(s.captures.length,4);
}
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let captures=0,unmapped=0;const errors=[];
try{
 const p=await browser.newPage({viewport:{width:1440,height:1000}});
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`)});
 await p.goto('http://localhost:4957/interface-assets/references/');
 await p.waitForFunction(()=>document.querySelectorAll('.card').length===50);
 const failures=await p.evaluate(async()=>{const data=await fetch('./comparison.json').then(r=>r.json());const failed=[];await Promise.all(data.references.map(r=>new Promise(resolve=>{const im=new Image();im.onload=()=>{if(im.naturalWidth!==r.originalSize[0]||im.naturalHeight!==r.originalSize[1])failed.push(r.id);resolve()};im.onerror=()=>{failed.push(r.id);resolve()};im.src=r.image})));return failed});assert.deepEqual(failures,[]);
 for(const r of data.references){
  await p.locator(`.card[data-id="${r.id}"]`).evaluate(e=>e.click());
  assert.equal(await p.locator('#title').textContent(),r.title);
  if(!r.comparisons.length){assert.equal(await p.locator('#missing').isVisible(),true);assert.equal(await p.locator('#overlay').isDisabled(),true);unmapped++;continue}
  for(const s of r.comparisons){
   await p.locator('#state').selectOption(s.id);
   for(const c of s.captures){
    await p.locator('#size').selectOption(`${c.width}x${c.height}`);
    await p.waitForFunction(()=>{const i=document.querySelector('#current');return i.complete&&i.naturalWidth>0});
    assert.equal(await p.locator('#current').evaluate(e=>e.naturalWidth),c.width);
    await p.locator('#overlay').check();assert.equal(await p.locator('#layer').isVisible(),true);
    assert.equal(await p.locator('#layer').evaluate(e=>getComputedStyle(e).objectFit),'contain');
    await p.locator('#overlay').uncheck();captures++;
   }
  }
 }
 for(const [family,count] of [['wku',6],['nwr-sd',15],['parental',20],['wiimart',9],['all',50]]){await p.locator('#family').selectOption(family);assert.equal(await p.locator('.card:visible').count(),count)}
 await p.locator('#search').fill('MAC addresses');assert.equal(await p.locator('.card:visible').count(),1);await p.locator('#search').fill('');
 await p.locator('.card[data-id="parental-21"]').evaluate(e=>e.click());
 await p.locator('#size').selectOption('640x480');
 await p.screenshot({path:'/workspace/scratch/reference-expansion/gallery-secret-question.png',fullPage:false});
 for(const width of [375,640,854,1280]){await p.setViewportSize({width,height:900});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Overflow at ${width}`)}
 await p.setViewportSize({width:1440,height:1000});
 await p.locator('.card[data-id="wku-10"]').evaluate(e=>e.click());
 await p.screenshot({path:'/workspace/scratch/reference-expansion/gallery-console-information.png'});
 for(const [id,phase] of [['parental-22','secret-question-answer'],['wiimart-27','user-agreements-notice'],['wiimart-28','user-agreements-document']]){
  await p.locator(`.card[data-id="${id}"]`).evaluate(e=>e.click());assert.ok((await p.locator('#current').getAttribute('src')).includes(phase));assert.ok((await p.locator('#current-caption a').getAttribute('href')).includes('reference-followup/#'+phase));
 }
 const followup=JSON.parse(await fs.readFile('docs/interface-assets/reference-followup/review.json'));
 assert.equal(followup.states.length,8);assert.equal(followup.captures,32);
 for(const state of followup.states){
  assert.equal(state.manuallyInspected,true);assert.equal(state.captures.length,4);
  for(const item of [state.sheet,...state.captures,...state.captures.map(c=>c.before).filter(Boolean)]){
   assert.equal(crypto.createHash('sha256').update(await fs.readFile('docs/interface-assets/reference-followup/'+item.image)).digest('hex'),item.sha256);
  }
 }
 await p.goto('http://localhost:4957/interface-assets/reference-followup/');assert.equal(await p.locator('article').count(),8);
 for(const width of [375,640,854,1280]){await p.setViewportSize({width,height:900});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))}
 assert.deepEqual(errors,[]);
}finally{await browser.close()}
console.log(`PASS: 50 original hashes/images; ${captures} capture/overlay combinations; ${unmapped} additional-flow references; filters and responsive widths.`);

import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const report={checks:[],measurements:[],errors:[],missing:[]};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const check=(label,ok)=>{assert.ok(ok,label);report.checks.push(label)};
const output='docs/interface-assets/review';
await fs.mkdir(output,{recursive:true});
try{
 for(const [width,height] of [[640,480],[854,480],[960,720],[1280,720]]){
  const context=await browser.newContext({viewport:{width,height}}),p=await context.newPage();
  p.on('pageerror',e=>report.errors.push(e.message));p.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))report.missing.push(r.url())});
  await p.addInitScript(()=>localStorage.setItem('wiishowcase.system.v1',JSON.stringify({version:1,friends:[{id:'visual-review',name:'Grandma',address:'1234567890123456'}]})));
  const b=name=>p.getByRole('button',{name,exact:true});
  const goto=async screen=>{await p.goto(`http://localhost:4955/wiishowcase/?screen=${screen}&channelPreview=1`);await p.evaluate(()=>document.fonts.ready)};
  await goto('settings');await b('Wii Settings').click();await b('Next Settings page').click();await b('Next Settings page').click();
  const oneLine=await b('Format Wii System Memory').evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);return [...r.getClientRects()].filter(r=>r.width>0).length===1});
  check(`${width}: Format list label stays on one line`,oneLine);
  await b('Format Wii System Memory').click();
  const warning=await p.locator('.native-format-warning').evaluate(el=>{const r=el.getBoundingClientRect(),area=el.closest('main').getBoundingClientRect();return {top:r.top-area.top,bottom:area.bottom-r.bottom}});
  check(`${width}: Format warning clears heading and footer by at least 12 scaled pixels`,Math.min(warning.top,warning.bottom)>=height/480*12);
  await goto('menu');await p.keyboard.press('Control+h');await b('Wii Remote Settings').click();
  const remote=await p.locator('.remote-setting-row').evaluateAll(es=>es.map(el=>{const r=document.createRange();r.selectNodeContents(el.querySelector(':scope > span'));const label=r.getBoundingClientRect(),control=el.querySelector('button').getBoundingClientRect();return {labelRight:label.right,controlLeft:control.left}}));
  check(`${width}: all remote labels clear the first control`,remote.every(m=>m.controlLeft-m.labelRight>=4));
  await goto('menu');await b('Open Mail').click();await p.waitForTimeout(350);
  const card=await p.locator('.message-board-card').first().evaluate(el=>({width:el.getBoundingClientRect().width,scale:document.querySelector('.wii').getBoundingClientRect().height/480}));
  await b('Notepad').click();await b('Letter').click();await b('Letter recipient').click();await b('Grandma').click();
  await p.evaluate(()=>document.fonts.ready);
  const letter=await p.locator('.wii-message-paper--letter').evaluate(el=>{const h=el.querySelector('h2'),r=h.getBoundingClientRect(),paper=el.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(h);const text=range.getBoundingClientRect();return {headerHeight:r.height,textTop:text.top-paper.top,textBottom:text.bottom-paper.top,scale:document.querySelector('.wii').getBoundingClientRect().height/480,saveHeight:el.querySelector('.system-actions button:last-child').getBoundingClientRect().height}});
  check(`${width}: letter heading reserves the taller blue strip`,letter.textTop>0&&letter.textBottom<letter.headerHeight);
  const actionLines=await b('Save Letter').evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);return [...r.getClientRects()].filter(r=>r.width>0).length});
  check(`${width}: Save Letter stays on one line`,actionLines===1);
  await p.screenshot({path:`${output}/letter-fixed-${width}x${height}.png`});
  report.measurements.push({width,height,warning,remote,card,letter});
  await context.close();
 }
 for(const wide of [false,true]){const pair=report.measurements.filter(m=>(m.width/m.height>1.5)===wide).sort((a,b)=>a.height-b.height);check(`${wide?'16:9':'4:3'}: message card grows proportionally with 480-to-720 frame height`,Math.abs(pair[1].card.width/pair[0].card.width-pair[1].height/pair[0].height)<.01)}
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);
}finally{await browser.close();await fs.writeFile(`${output}/defect-validation.json`,JSON.stringify(report,null,2)+'\n')}
console.log(`PASS ${report.checks.length} targeted visual-defect checks`);

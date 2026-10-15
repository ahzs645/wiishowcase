import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {interfaceGeometry} from './lib/interface-geometry.mjs';
const base='http://localhost:4955/wiishowcase/';
const out='docs/interface-assets/reference-followup';
await fs.mkdir(`${out}/current`,{recursive:true});await fs.mkdir(`${out}/before`,{recursive:true});
const revision=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const hash=raw=>crypto.createHash('sha256').update(raw).digest('hex');
const report={date:'2026-10-15',baselineRevision:revision,includesWorkingTree:true,checks:[],captures:[],errors:[]};
const extra=JSON.parse(await fs.readFile('docs/interface-assets/additional-captures.json'));
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const check=(label,condition)=>{assert.ok(condition,label);report.checks.push(label)};
try{
 for(const [width,height] of [[640,480],[854,480],[960,720],[1280,720]]){
  const context=await browser.newContext({viewport:{width,height},timezoneId:'America/Vancouver'}),p=await context.newPage();
  p.on('pageerror',e=>report.errors.push(e.message));
  const b=(name,scope=p)=>scope.getByRole('button',{name,exact:true});
  const footer=()=>p.locator('.system-settings-shell footer');
  const go=async()=>{await p.goto(`${base}?screen=settings&channelPreview=1`);await p.evaluate(()=>document.fonts.ready)};
  const settings2=async()=>{await go();await b('Wii Settings').click();await b('Settings page 2').click()};
  const back=()=>b('Back',footer()).click();
  const snap=async(id,title,sourceIds)=>{
   await p.mouse.move(width-1,height-1);await p.waitForTimeout(200);await p.evaluate(()=>document.fonts.ready);
   const geometry=await p.evaluate(interfaceGeometry);assert.deepEqual(geometry.failures,[],`${id} ${width} geometry`);
   const name=`${id}-${width}x${height}.png`,image=`current/${name}`;await p.screenshot({path:`${out}/${image}`});
   const c={id,title,width,height,mode:width/height>1.5?'16:9':'4:3',image,sha256:hash(await fs.readFile(`${out}/${image}`)),sourceIds,geometry};
   const old=extra.captures.find(c=>c.id===id&&c.width===width&&c.height===height);
   if(old){
    const oldBytes=execFileSync('git',['show',`${revision}:docs/interface-assets/${old.image}`],{maxBuffer:10*1024*1024});
    await fs.writeFile(`${out}/before/${name}`,oldBytes);c.before={image:`before/${name}`,sha256:hash(oldBytes)};
    await fs.copyFile(`${out}/${image}`,`docs/interface-assets/${old.image}`);Object.assign(old,{capturedDate:report.date,captureSourceBase:revision,captureIncludesWorkingTree:true,geometry,elements:await p.locator('h1,h2,.system-button').evaluateAll(es=>es.filter(e=>e.getClientRects().length).map(e=>({text:e.textContent.trim(),fontSize:getComputedStyle(e).fontSize,rect:e.getBoundingClientRect().toJSON()})))});
   }
   report.captures.push(c);
  };
  const saved=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('wiishowcase.system.v1')));
  await settings2();await b('Parental Controls').click();await b('Secret Question').click();
  await snap('secret-question','Choose a secret question',['parental-21']);
  check(`${width}: question selection has no answer field`,await b('Secret answer').count()===0);
  const q=await p.getByRole('status',{name:'Selected secret question'}).textContent();await b('Next secret question').click();
  check(`${width}: question arrow selects another question`,await p.getByRole('status',{name:'Selected secret question'}).textContent()!==q);
  await b('OK',footer()).click();check(`${width}: blank answer cannot be saved`,await b('OK',footer()).isDisabled());
  await back();check(`${width}: Back from answer returns to question`,await b('Next secret question').isVisible());
  await b('OK',footer()).click();await snap('secret-question-answer','Answer the secret question',['parental-22']);
  await b('Secret answer').click();const kb=p.locator('wii-keyboard .is-open');await kb.locator('.wii-keyboard-input').fill('Pasta');await b('OK',kb).click();await b('OK',footer()).click();
  check(`${width}: question and answer save together`,(await saved()).settings.secretAnswer==='Pasta'&&(await saved()).settings.secretQuestion==="What's your favorite movie?");
  await b('Secret Question').click();await b('Next secret question').click();await back();await b('Secret Question').click();
  check(`${width}: Back discards unsaved question`,(await p.getByRole('status',{name:'Selected secret question'}).textContent())==="What's your favorite movie?");
  await back();await p.getByLabel('New parental PIN',{exact:true}).fill('1234');await b('Enable').click();await back();await b('Parental Controls').click();await p.getByLabel('Parental PIN',{exact:true}).fill('1234');await b('Confirm PIN').click();await b('Secret Question').click();await b('OK',footer()).click();await b('OK',footer()).click();
  check(`${width}: returning from secret-answer editing preserves the authorized parental session`,await p.getByLabel('New parental PIN',{exact:true}).count()===1);await b('Disable').click();
  await settings2();await b('Internet').click();await b('Console Information').click();
  await snap('console-information','Console Information',['wku-10']);
  check(`${width}: Console Information labels hardware without fabricating addresses`,await p.getByText('MAC Address',{exact:true}).count()===1&&await p.getByText('LAN Adapter MAC Address',{exact:true}).count()===1&&await p.getByText('Unavailable in browser',{exact:true}).count()===2&&await p.getByText('Wii Number',{exact:true}).count()===0);
  await back();await b('User Agreements').click();await snap('user-agreements','User Agreements — services prompt',['wiimart-23']);
  await b('Yes',footer()).click();await snap('user-agreements-notice','User Agreements — review notice',['wiimart-27']);await b('Next',footer()).click();await snap('user-agreements-document','User Agreements — recreation document',['wiimart-28']);
  const doc=p.getByRole('region',{name:'Recreation user agreement'});await doc.focus();await p.keyboard.press('End');await p.waitForFunction(()=>document.querySelector('.native-agreement-document').scrollTop>0);
  check(`${width}: agreement document scrolls within its panel`,await doc.evaluate(e=>e.scrollHeight>e.clientHeight&&e.scrollTop>0));
  await b('I ACCEPT',footer()).click();check(`${width}: local acceptance does not enable online data`,(await saved()).settings.userAgreementAccepted===true&&(await saved()).settings.internet===false);
  await b('Yes',footer()).click();await b('Next',footer()).click();await b('I DO NOT ACCEPT',footer()).click();check(`${width}: agreement can be declined`,(await saved()).settings.userAgreementAccepted===false);
  await b('No',footer()).click();check(`${width}: No returns to Internet`,await b('Console Information').isVisible());
  await p.reload();check(`${width}: agreement choice survives reload`,(await saved()).settings.userAgreementAccepted===false);
  await go();await b('Data Management').click();await b('Save Data').click();await b('Wii').click();await b('Wii Sports data').click();await snap('save-selected','Save Data item actions',[]);
  const dialog=p.getByRole('dialog');await b('Copy',dialog).click();await b('No',dialog).click();check(`${width}: cancelled copy leaves one save`,(await saved()).saves.length===1);await b('Back',dialog).click();
  await go();await b('Data Management').click();await b('Channels').click();await b('Mii Channel data').click();await snap('channel-selected','Channel Data item actions',['nwr-sd-13']);
  check(`${width}: channel actions follow native order`,(await p.locator('.native-data-item-actions button').allTextContents()).join(',')==='Move,Copy,Erase');
  for(let i=0;i<6;i++){await p.keyboard.press('Tab');check(`${width}: item modal traps focus ${i}`,await dialog.evaluate(e=>e.contains(document.activeElement)))}
  await p.keyboard.press('Escape');check(`${width}: Escape closes only item dialog and returns focus`,await p.getByRole('dialog').count()===0&&await b('Mii Channel data').evaluate(e=>e===document.activeElement));
  await context.close();
 }
 assert.deepEqual(report.errors,[]);
 await fs.writeFile('docs/interface-assets/additional-captures.json',JSON.stringify(extra,null,2)+'\n');
}finally{await browser.close();await fs.writeFile(`${out}/captures.json`,JSON.stringify(report,null,2)+'\n')}
console.log(`PASS ${report.checks.length} source-flow checks; ${report.captures.length} fresh four-size captures`);

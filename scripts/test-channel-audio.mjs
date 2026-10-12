import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base='http://localhost:4918/wiishowcase/';
const server=spawn(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'--port','4918','--strictPort'],{cwd:root,stdio:['ignore','pipe','pipe']});
server.stderr.on('data',data=>process.stderr.write(data));
let exited=false;
server.on('exit',()=>{exited=true;});
let browser;
try {
  browser=await chromium.launch({executablePath:process.env.SMOKE_CHROMIUM||undefined,args:['--no-sandbox']});
  const deadline=Date.now()+30000;
  while(true) {
    if(exited) throw new Error('Vite exited before the audio test started');
    try {if((await fetch(base)).ok) break;} catch {}
    if(Date.now()>deadline) throw new Error('Vite did not start within 30 seconds');
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  const page=await browser.newPage();
  await page.route('**/audit.html',route=>route.fulfill({body:'<!doctype html><div id="root"></div>',contentType:'text/html'}));
  await page.route(/\/src\/components\/WiiChannelRenderer\.jsx/,route=>route.fulfill({body:`
    window.pendingBundles = new Map();
    export function fetchBundle(url) { return new Promise((resolve,reject)=>window.pendingBundles.set(url,{resolve,reject})); }
    export default function WiiChannelRenderer() { return null; }
  `,contentType:'text/javascript'}));
  await page.goto(`${base}audit.html`);
  await page.evaluate(async()=>{
    const {default:RefreshRuntime}=await import('/wiishowcase/@react-refresh');
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$=()=>{};
    window.$RefreshSig$=()=>type=>type;
    window.__vite_plugin_react_preamble_installed__=true;
    const ReactModule=await import('/wiishowcase/node_modules/.vite/deps/react.js');
    const React=ReactModule.default??ReactModule;
    const DomModule=await import('/wiishowcase/node_modules/.vite/deps/react-dom_client.js');
    const {createRoot}=DomModule.default??DomModule;
    const {default:Selection}=await import('/wiishowcase/src/components/ChannelSelection.jsx');
    const root=createRoot(document.querySelector('#root'));
    window.audioPlays=[];
    HTMLMediaElement.prototype.play=function(){window.audioPlays.push(this.src);return Promise.resolve();};
    window.select=(bundle,visible=true)=>root.render(React.createElement(Selection,{visible,channel:{bundle}}));
    window.select('A.zip');
  });
  await page.waitForFunction(()=>window.pendingBundles.has('/wiishowcase/A.zip'));
  await page.evaluate(()=>window.select('B.zip'));
  await page.waitForFunction(()=>window.pendingBundles.has('/wiishowcase/B.zip'));
  await page.evaluate(()=>window.pendingBundles.get('/wiishowcase/B.zip').resolve({audioWav:new ArrayBuffer(44),manifest:{audio:{}}}));
  await page.waitForFunction(()=>window.audioPlays.length===1);
  const srcB=await page.locator('audio').getAttribute('src');
  await page.evaluate(()=>window.pendingBundles.get('/wiishowcase/A.zip').resolve({audioWav:new ArrayBuffer(44),manifest:{audio:{}}}));
  await page.waitForTimeout(100);
  assert.equal(await page.locator('audio').getAttribute('src'),srcB,'Stale channel replaced current audio');
  assert.equal(await page.evaluate(()=>window.audioPlays.length),1);
  await page.evaluate(()=>window.select('C.zip'));
  await page.waitForFunction(()=>window.pendingBundles.has('/wiishowcase/C.zip'));
  assert.equal(await page.locator('audio').getAttribute('src'),null,'Previous channel kept playing while loading');
  await page.evaluate(()=>window.select('C.zip',false));
  await page.waitForTimeout(50);
  await page.evaluate(()=>window.pendingBundles.get('/wiishowcase/C.zip').resolve({audioWav:new ArrayBuffer(44),manifest:{audio:{}}}));
  await page.waitForTimeout(100);
  assert.equal(await page.locator('audio').getAttribute('src'),null,'Hidden selection started audio');
  assert.equal(await page.evaluate(()=>window.audioPlays.length),1);
  console.log('PASS stale channel audio, immediate stop, and hide-before-load');
} finally {await browser?.close();server.kill();}

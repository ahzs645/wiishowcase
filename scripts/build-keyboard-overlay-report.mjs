import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";

export async function buildOverlayReport(output, report, browser) {
  const mismatches = [];
  for (const id of report.keys) {
    const shop = report.implementations.shop.entries[id];
    const current = report.implementations.current.entries[id];
    if (!shop || !current) continue;
    for (const state of ["idle", "hover", "pressed"]) {
      if (!shop.states[state].image) continue;
      const a = shop.states[state],
        b = current.states[state];
      if (
        Math.abs(a.width - b.width) > 0.12 ||
        Math.abs(a.height - b.height) > 0.12
      )
        mismatches.push({
          id,
          state,
          type: "size",
          shop: [a.width, a.height],
          current: [b.width, b.height],
        });
      if (id !== "ok" && id !== "quit" && a.background !== b.background)
        mismatches.push({
          id,
          state,
          type: "color",
          shop: a.background,
          current: b.background,
        });
    }
  }
  report.comparison = {
    sizeTolerancePx: 0.12,
    sizeAndColorMismatches: mismatches,
    activation: {
      shop: "mousedown",
      vector: "mouseup/click",
      current: "mouseup/click",
    },
    fontDifference:
      "Shop uses Wii NTLG PGothic JPN Regular. Framework uses its system-font stack; captures preserve each actual font. Matching artwork does not imply identical text pixels.",
  };
  await fs.writeFile(
    path.join(output, "results.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  const data = JSON.stringify(report).replaceAll("<", "\\u003c");
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Shop keyboard: key overlays</title>
<style>
*{box-sizing:border-box}body{margin:24px;background:#eef2f6;color:#182b3b;font:15px system-ui,sans-serif}h1{margin:0 0 8px;font-size:27px}p{max-width:1100px;line-height:1.5}.controls{display:flex;gap:20px;align-items:center;flex-wrap:wrap;background:white;border-radius:10px;padding:16px;margin:20px 0}label{display:flex;gap:8px;align-items:center}select,button{font:inherit;padding:8px}input{width:160px}#cards{display:grid;grid-template-columns:repeat(5,minmax(160px,1fr));gap:12px}.card{background:white;border:1px solid #ccd7e0;border-radius:10px;padding:12px;min-width:0}h2{font-size:15px;margin:0 0 8px}.tile{height:126px;position:relative;background:#f5f7fa;overflow:hidden}.tile img{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)}.detail{font-size:12px;color:#465766;line-height:1.4;min-height:35px;margin-top:9px}#behavior{padding:16px;background:white;border-radius:10px;margin-top:16px;white-space:pre-line}#overview{display:none}.overview-row{display:grid;grid-template-columns:150px repeat(5,220px);gap:8px;margin-bottom:8px;align-items:center}.overview-label{font-weight:600}.overview-row .card{padding:5px}.overview-row .tile{height:102px}.overview-head{font-weight:600}body.overview #controls,body.overview #cards,body.overview #behavior,body.overview .intro{display:none}body.overview #overview{display:block}body.overview p{margin:8px 0 18px;font-size:13px}@media(max-width:1000px){#cards{grid-template-columns:repeat(2,minmax(160px,1fr))}}
</style>
<h1>Shop keyboard: individual key overlays</h1>
<p class="intro">Captured from the real Shop website, our previous vector keyboard, and the updated shared keyboard at 608×456, with 2× pixel density. Keys share a neutral background. Centers are aligned without stretching the captured key shapes. Choose a key and state, or adjust the Shop layer opacity to inspect the edges.</p>
<div class="controls" id="controls"><label>Key <select id="key"></select></label><label>State <select id="state"><option>idle</option><option>hover</option><option>pressed</option></select></label><label>Shop opacity <input id="opacity" type="range" min="0" max="100" value="50"><output id="percent">50%</output></label><button id="play">Replay captured press states</button></div>
<div id="cards"></div><div id="behavior"></div><div id="overview"></div>
<p>Shop commits input and closes Quit/OK on mouse-down. Our semantic buttons commit on release/click and support touch and keyboard activation. Shop uses its PGothic font; ours uses the configured system-font stack. The screenshots preserve those differences. A Shop pressed frame for Quit/OK is unavailable because the keyboard closes immediately.</p>
<script>
const report=${data};
const keySelect=document.querySelector('#key'),stateSelect=document.querySelector('#state'),opacity=document.querySelector('#opacity');
for(const key of report.keys){const o=document.createElement('option');o.value=key;o.textContent=key===' '?'Space':key;keySelect.append(o)}keySelect.value='a';
const names=['Shop','Old vector','Shop over old vector','Updated shared key','Shop over updated key'];
function card(id,state,column){
 const card=document.createElement('div');card.className='card';const h=document.createElement('h2');h.textContent=names[column];card.append(h);
 const tile=document.createElement('div');tile.className='tile';card.append(tile);const detail=document.createElement('div');detail.className='detail';card.append(detail);
 const entries=report.implementations;const shop=entries.shop.entries[id]?.states[state],vector=entries.vector.entries[id]?.states[state],current=entries.current.entries[id]?.states[state];
 const layers=column===0?[shop]:column===1?[vector]:column===2?[vector,shop]:column===3?[current]:[current,shop];
 if(layers.some(item=>!item?.image)){tile.textContent='Shop closes on mouse-down';detail.textContent='No held-open pressed frame';return card}
 const zoom=Math.min(2,204/Math.max(...layers.map(item=>item.width+4)));
 layers.forEach((item,index)=>{const img=new Image();img.src=item.image;img.style.width=((item.width+4)*zoom)+'px';img.style.height=((item.height+4)*zoom)+'px';if(index===1){img.className='shop-layer';img.style.opacity=opacity.value/100}tile.append(img)});
 detail.textContent=layers.length===1?layers[0].width.toFixed(2)+' × '+layers[0].height.toFixed(2)+' CSS px': 'Aligned centers · original shapes and fonts';return card;
}
let timer;
function render(){const id=keySelect.value,state=stateSelect.value,cards=document.querySelector('#cards');cards.replaceChildren(...names.map((_,i)=>card(id,state,i)));document.querySelector('#percent').textContent=opacity.value+'%';const s=report.implementations.shop.entries[id].click,c=report.implementations.current.entries[id].click;const format=e=>JSON.stringify(e.value)+(e.open?' (open)':' (closed)');document.querySelector('#behavior').textContent='Recorded click for '+id+'\\nShop: down '+format(s.down)+' → up '+format(s.up)+'\\nUpdated: down '+format(c.down)+' → up '+format(c.up)+'\\nShop sound on down: '+(s.down.audio.join(', ')||'none')+'\\nUpdated sound on up: '+(c.up.audio.join(', ')||'none')}
keySelect.onchange=stateSelect.onchange=()=>{clearTimeout(timer);render()};opacity.oninput=render;
document.querySelector('#play').onclick=()=>{clearTimeout(timer);const states=['idle','hover','pressed','hover','idle'];let index=0;function tick(){stateSelect.value=states[index++];render();if(index<states.length)timer=setTimeout(tick,500)}tick()};render();
if(location.hash==='#overview'){document.body.classList.add('overview');const overview=document.querySelector('#overview');const head=document.createElement('div');head.className='overview-row overview-head';for(const name of ['Key / state',...names]){const el=document.createElement('div');el.textContent=name;head.append(el)}overview.append(head);for(const id of ['a','caps','space','ok'])for(const state of ['idle','hover','pressed']){const row=document.createElement('div');row.className='overview-row';const label=document.createElement('div');label.className='overview-label';label.textContent=id+' / '+state;row.append(label,...names.map((_,i)=>card(id,state,i)));overview.append(row)}}
</script></html>`;
  await fs.writeFile(path.join(output, "index.html"), html);
  const server = http.createServer(async (req, res) => {
    try {
      const file = path.resolve(
        output,
        decodeURIComponent(
          new URL(req.url, "http://localhost").pathname.slice(1),
        ) || "index.html",
      );
      if (!file.startsWith(output + path.sep)) throw new Error("Invalid path");
      const data = await fs.readFile(file);
      res.writeHead(200, {
        "Content-Type":
          path.extname(file) === ".html" ? "text/html" : "image/png",
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(4948, "127.0.0.1", resolve));
  const page = await browser.newPage({
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: 1,
  });
  try {
    await page.goto("http://127.0.0.1:4948/index.html#overview");
    await page.evaluate(async () => {
      await Promise.all([...document.images].map((img) => img.decode()));
    });
    await page.screenshot({
      path: path.join(output, "overview.png"),
      fullPage: true,
    });
    // Check that the standalone comparison switches keys and opacity successfully.
    await page.goto("http://127.0.0.1:4948/index.html");
    await page.locator("#key").selectOption("caps");
    await page.locator("#state").selectOption("pressed");
    await page.locator("#opacity").evaluate((el) => {
      el.value = "25";
      el.dispatchEvent(new Event("input"));
    });
    if (
      (await page
        .locator(".shop-layer")
        .first()
        .evaluate((el) => el.style.opacity)) !== "0.25"
    )
      throw new Error("Overlay slider failed");
    await page.locator("#opacity").evaluate((el) => {
      el.value = "50";
      el.dispatchEvent(new Event("input"));
    });
    await page.setViewportSize({ width: 1400, height: 700 });
    await page.evaluate(async () => {
      await Promise.all([...document.images].map((img) => img.decode()));
    });
    await page.screenshot({ path: path.join(output, "caps-pressed-comparison.png") });
  } finally {
    await page.close();
    await new Promise((resolve) => server.close(resolve));
  }
  console.log(
    `Overlay report: ${output}/index.html; ${mismatches.length} current-vs-Shop size/color mismatches`,
  );
  return mismatches;
}

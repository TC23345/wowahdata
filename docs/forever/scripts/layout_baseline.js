const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const out = {};
  for (const [name, vp] of [['desktop',{width:1440,height:900}],['laptop',{width:1100,height:800}]]) {
    const p = await b.newPage({ viewport: vp });
    await p.addInitScript(() => {
      window.__shifts = [];
      new PerformanceObserver(l => { for (const e of l.getEntries()) window.__shifts.push({v:e.value, input:e.hadRecentInput, t:Math.round(e.startTime)}); }).observe({type:'layout-shift', buffered:true});
    });
    await p.goto((process.env.BASE_URL || 'http://localhost:3000/'), { waitUntil: 'networkidle' });
    const res = { steps: [] };
    const snap = async (label) => {
      await p.waitForTimeout(700);
      const m = await p.evaluate(() => {
        const q = s => document.querySelector(s);
        const y = el => el ? Math.round(el.getBoundingClientRect().top + scrollY) : null;
        const h = el => el ? Math.round(el.getBoundingClientRect().height) : null;
        const tabs = q('[role=tablist].border-b') ;
        const panel = tabs ? tabs.nextElementSibling : null;
        const footer = q('footer');
        const ctrl = q('section');
        const s = window.__shifts; window.__shifts = [];
        return { docH: document.documentElement.scrollHeight, ctrlH: h(ctrl), tabsY: y(tabs), panelH: h(panel), footerY: y(footer),
          shiftAll: +s.reduce((a,e)=>a+e.v,0).toFixed(4), shiftNoInput: +s.filter(e=>!e.input).reduce((a,e)=>a+e.v,0).toFixed(4), n: s.length };
      });
      res.steps.push({ label, ...m });
    };
    await snap('empty/upload');
    await p.getByRole('button', { name: /sample/i }).click();
    await p.waitForSelector('[role=tablist]', { timeout: 30000 });
    await snap('loaded:heatmap');
    // hover a heatmap cell
    await p.locator('[role=gridcell]').nth(30).hover(); await snap('hover heatmap cell');
    await p.mouse.move(5,5); await snap('unhover');
    for (const t of ['Scatter','P&L','Histogram','Cash flow','Sell-through','Heatmap']) {
      await p.getByRole('tab', { name: t, exact: true }).click(); await snap('tab:'+t);
    }
    // switch items via chips
    const chips = p.locator('section button').filter({ hasText: /Planar|Shard|Dust|Netherweave/ });
    const n = await chips.count();
    for (let i=0;i<Math.min(n,4);i++){ const txt=(await chips.nth(i).innerText()).split('\n')[0]; await chips.nth(i).click(); await snap('item:'+txt); }
    // search an uncurated item
    const input = p.locator('input[type=text], input:not([type])').first();
    await input.fill('Thorium Bar'); await p.keyboard.press('Enter'); await snap('item:search Thorium Bar');
    // range presets
    for (const r of ['Last 7d','Last 30d','Custom','All']) { const btn=p.getByRole('button',{name:new RegExp('^'+r,'i')}).first(); if(await btn.count()){ await btn.click(); await snap('range:'+r);} }
    await p.getByRole('tab', { name: 'Scatter', exact: true }).click(); await snap('tab:Scatter(thin item)');
    // reload w/ data in IDB: boot -> ready
    await p.reload({ waitUntil: 'networkidle' }); await snap('reload boot->ready');
    out[name] = res; await p.close();
  }
  await b.close();
  for (const [k,v] of Object.entries(out)) { console.log('== '+k); for (const s of v.steps) console.log(`${s.label.padEnd(30)} docH=${String(s.docH).padStart(5)} ctrlH=${s.ctrlH} tabsY=${s.tabsY} panelH=${s.panelH} footerY=${s.footerY} shifts=${s.n} sum=${s.shiftAll} (noInput ${s.shiftNoInput})`); }
})().catch(e => { console.error(e); process.exit(1); });

import { chromium } from 'playwright-core'
const EDGE='C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const b=await chromium.launch({executablePath:EDGE,headless:true,args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']})
const p=await (await b.newContext({viewport:{width:1600,height:1000}})).newPage()
p.on('pageerror',e=>console.log('[err]',e.message))
await p.goto('http://127.0.0.1:4173/?qa=1',{waitUntil:'networkidle'})
await p.waitForTimeout(5000)
console.log('p=0', JSON.stringify(await p.evaluate(()=>window.__audit())))
await p.locator('input[aria-label="拆解比例"]').fill('100')
await p.waitForTimeout(4000)
console.log('p=1', JSON.stringify(await p.evaluate(()=>window.__audit())))
// 抽查关键零件位移
for (const id of ['drone.propFL','drone.topShell','drone.bottomShell','drone.battery','drone.motorFL','drone.mainBoard','drone.gimbalFrame','drone.screwsTop']) {
  console.log(id, JSON.stringify(await p.evaluate((i)=>window.__partState(i), id)))
}
await b.close()

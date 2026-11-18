import { chromium } from 'playwright-core'
const EDGE='C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const b=await chromium.launch({executablePath:EDGE,headless:true,args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']})
const p=await (await b.newContext({viewport:{width:1280,height:800}})).newPage()
await p.goto('http://127.0.0.1:4173/?qa=1',{waitUntil:'networkidle'})
await p.waitForTimeout(6000)
console.log('drone', JSON.stringify(await p.evaluate(()=>window.__stats?.())))
await p.getByRole('button',{name:/遥控器/}).click()
await p.waitForTimeout(6000)
console.log('controller', JSON.stringify(await p.evaluate(()=>window.__stats?.())))
await b.close()

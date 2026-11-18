import { chromium } from 'playwright-core'
const EDGE='C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const b=await chromium.launch({executablePath:EDGE,headless:true,args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']})
const p=await (await b.newContext({viewport:{width:1400,height:900}})).newPage()
p.on('pageerror',e=>console.log('[err]',e.message))
await p.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'})
await p.waitForTimeout(4000)
console.log('default', await p.evaluate(()=>window.__cam?.()))
await p.locator('input[placeholder="搜索零件 / 编号 / 材质"]').fill('智能电池')
await p.waitForTimeout(600)
await p.locator('[data-part]').first().click()
await p.waitForTimeout(600)
console.log('selected', await p.evaluate(()=>window.__cam?.()))
await p.getByRole('button',{name:/相机聚焦此零件/}).click()
for (let i=0;i<4;i++){ await p.waitForTimeout(700); console.log('focus',i, await p.evaluate(()=>window.__cam?.())) }
await b.close()

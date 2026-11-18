import { chromium } from 'playwright-core'
const EDGE='C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const b=await chromium.launch({executablePath:EDGE,headless:true,args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']})
const p=await (await b.newContext({viewport:{width:1600,height:1000}})).newPage()
p.on('pageerror',e=>console.log('[err]',e.message))
await p.goto('http://127.0.0.1:4173/?qa=1',{waitUntil:'networkidle'})
await p.waitForTimeout(5000)
await p.locator('input[aria-label="拆解比例"]').fill('70')
await p.waitForTimeout(3000)
await p.getByText('主控制板', { exact: true }).click()
await p.waitForTimeout(1500)
await p.screenshot({path:'test-output/panel-motion.png'})
console.log('ok')
await b.close()

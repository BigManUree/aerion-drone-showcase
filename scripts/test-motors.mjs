import { chromium } from 'playwright-core'
const EDGE='C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const b=await chromium.launch({executablePath:EDGE,headless:true,args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']})
const p=await (await b.newContext({viewport:{width:1200,height:760}})).newPage()
p.on('pageerror',e=>console.log('[err]',e.message))
await p.goto('http://127.0.0.1:4173/?qa=1',{waitUntil:'networkidle'})
await p.waitForTimeout(5000)
const a1=await p.evaluate(()=>window.__motorAngles?.())
await p.waitForTimeout(4000)
const a2=await p.evaluate(()=>window.__motorAngles?.())
console.log('t0:', a1?.map(v=>+v.toFixed(2)))
console.log('t1:', a2?.map(v=>+v.toFixed(2)))
const deltas = a1 && a2 ? a1.map((v,i)=>+(a2[i]-v).toFixed(2)) : []
console.log('delta:', deltas)
console.log('all spinning:', deltas.every(d=>Math.abs(d)>0.3))
console.log('opposite pairs:', deltas[0]*deltas[1] < 0 && deltas[2]*deltas[3] < 0)
await b.close()

import { chromium } from 'playwright-core'
const EDGE='C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const b=await chromium.launch({executablePath:EDGE,headless:true,args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']})
const p=await (await b.newContext({viewport:{width:1280,height:800}})).newPage()
await p.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'})
await p.waitForTimeout(5000)
const overflow = await p.evaluate(()=>{
  const f=document.querySelector('footer')
  return { scrollW: f.scrollWidth, clientW: f.clientWidth, docW: document.documentElement.scrollWidth, winW: window.innerWidth }
})
console.log(JSON.stringify(overflow))
await p.screenshot({path:'test-output/small-1280.png'})
await b.close()

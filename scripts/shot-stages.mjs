import { chromium } from 'playwright-core'
import path from 'node:path'
const EDGE='C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const b=await chromium.launch({executablePath:EDGE,headless:true})
const p=await (await b.newContext({viewport:{width:1360,height:1000}})).newPage()
const url='file:///'+path.resolve('test-output/stages/index.html').replace(/\\/g,'/')
await p.goto(url,{waitUntil:'load'})
await p.waitForTimeout(1000)
console.log('broken:', await p.evaluate(()=>[...document.images].filter(i=>!i.complete||i.naturalWidth===0).length))
await p.screenshot({path:'test-output/stages/preview.png', fullPage:true})
await b.close()

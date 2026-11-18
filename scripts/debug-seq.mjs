import { chromium } from 'playwright-core'
const EDGE = 'C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const browser = await chromium.launch({ executablePath: EDGE, headless: true, args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'] })
const page = await (await browser.newContext({ viewport:{width:1680,height:1000} })).newPage()
page.on('console', m => console.log('[console]', m.type(), m.text().slice(0,300)))
page.on('pageerror', e => console.log('[pageerror]', e.message))
await page.goto('http://127.0.0.1:5273/', { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
console.log('before:', await page.evaluate(() => window.__seqState?.()))
await page.getByRole('button', { name: '自动播放' }).click()
for (let i=0;i<5;i++){
  await page.waitForTimeout(800)
  console.log(i, await page.evaluate(() => ({...window.__seqState?.(), exploded: Object.keys(window.__STORE__?.getState?.().exploded ?? {}).length, btn: document.querySelector('footer').innerText.replace(/\n/g,'|').slice(-120)})))
}
await browser.close()

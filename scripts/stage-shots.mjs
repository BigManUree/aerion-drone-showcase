import { chromium } from 'playwright-core'
import path from 'node:path'
import fs from 'node:fs'
const OUT = path.resolve('test-output/stages')
fs.mkdirSync(OUT, { recursive: true })
const EDGE = 'C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const b = await chromium.launch({ executablePath: EDGE, headless: true, args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'] })
const p = await (await b.newContext({ viewport: { width: 1500, height: 940 } })).newPage()
p.on('pageerror', e => console.log('[err]', e.message))
await p.goto('http://127.0.0.1:4173/?qa=1', { waitUntil: 'networkidle' })
await p.waitForTimeout(5000)
for (const v of [0, 25, 50, 75, 100]) {
  await p.locator('input[aria-label="拆解比例"]').fill(String(v))
  await p.waitForTimeout(3200)
  await p.screenshot({ path: path.join(OUT, `p${String(v).padStart(3,'0')}.png`) })
  console.log('shot', v)
}
await b.close()

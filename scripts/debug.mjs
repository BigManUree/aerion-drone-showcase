import { chromium } from 'playwright-core'
import path from 'node:path'
import fs from 'node:fs'

const OUT = path.resolve('test-output')
fs.mkdirSync(OUT, { recursive: true })
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
})
const ctx = await browser.newContext({ viewport: { width: 1680, height: 1000 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()
page.on('pageerror', (e) => console.log('[pageerror]', e.message))
page.on('console', (m) => {
  if (m.type() === 'error') console.log('[error]', m.text())
})
await page.goto('http://127.0.0.1:5273/', { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
await page.getByRole('button', { name: /遥控器/ }).click()
await page.waitForTimeout(2500)

// 屏幕区域特写
await page.screenshot({ path: path.join(OUT, 'debug-screen.png'), clip: { x: 620, y: 250, width: 420, height: 260 } })
console.log('done')
await browser.close()

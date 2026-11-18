// 第四轮：UI 首屏视觉检查（多分辨率截图 + 控制台错误）
import { chromium } from 'playwright-core'
import path from 'node:path'
import fs from 'node:fs'

const URL = 'http://127.0.0.1:4173/?qa=1'
const OUT = path.resolve('test-output')
fs.mkdirSync(OUT, { recursive: true })
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
})

const errors = []
const sizes = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1024x768', width: 1024, height: 768 },
]

for (const s of sizes) {
  const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(`${s.name} pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('404')) errors.push(`${s.name} console: ${m.text()}`)
  })
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForTimeout(6000)
  await page.screenshot({ path: path.join(OUT, `r4-${s.name}.png`) })
  const info = await page.evaluate(() => ({
    scene: window.__sceneState ? window.__sceneState() : null,
    audit: window.__audit ? window.__audit() : null,
    cam: window.__cam ? window.__cam() : null,
  }))
  console.log(s.name, JSON.stringify(info))
  await ctx.close()
}

console.log('ERRORS', JSON.stringify(errors, null, 2))
await browser.close()

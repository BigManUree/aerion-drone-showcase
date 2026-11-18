// 展示截图：装配态 / 100% 拆解 / 遥控器
import { chromium } from 'playwright-core'
import path from 'node:path'
import fs from 'node:fs'

const OUT = path.resolve('test-output/final')
fs.mkdirSync(OUT, { recursive: true })
const EDGE = 'C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
})
const page = await (await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 })).newPage()
page.on('pageerror', (e) => console.log('[pageerror]', e.message))
await page.goto('http://127.0.0.1:4173/?qa=1', { waitUntil: 'networkidle' })
await page.waitForTimeout(6000)

const setProgress = async (v) => {
  await page.locator('input[aria-label="拆解比例"]').fill(String(v))
  await page.waitForTimeout(3500)
}

await page.screenshot({ path: path.join(OUT, '1-drone.png') })

await setProgress(100)
await page.screenshot({ path: path.join(OUT, '2-drone-exploded.png') })

await setProgress(0)
await page.waitForTimeout(1500)
await page.getByRole('button', { name: /遥控器/ }).click()
await page.waitForTimeout(5000)
await page.screenshot({ path: path.join(OUT, '3-controller.png') })

await setProgress(100)
await page.screenshot({ path: path.join(OUT, '4-controller-exploded.png') })

await setProgress(0)
await page.getByRole('button', { name: /无人机/ }).click()
await page.waitForTimeout(4000)
await page.getByText('云台保护罩', { exact: true }).click()
await page.waitForTimeout(2000)
await page.screenshot({ path: path.join(OUT, '5-selected.png') })
console.log('shots done')
await browser.close()

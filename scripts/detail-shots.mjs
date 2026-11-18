// 零件级特写：用 QA 相机钩子定位到零件，避免低帧率下等待过久
import { chromium } from 'playwright-core'
import path from 'node:path'
import fs from 'node:fs'

const OUT = path.resolve('test-output/detail')
fs.mkdirSync(OUT, { recursive: true })
const EDGE = 'C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

// [零件 ID, 文件名, 相机方向, 距离]
const targets = [
  ['drone.topShell', '01-top-shell', [0.45, 0.9, 0.35], 0.46],
  ['drone.armFL', '02-arm', [-0.5, 0.55, -0.66], 0.40],
  ['drone.motorFL', '03-motor', [0.5, 0.62, 0.6], 0.17],
  ['drone.propFL', '04-prop', [0.35, 0.9, 0.35], 0.36],
  ['drone.gimbalFrame', '05-gimbal', [0.45, 0.12, 1], 0.23],
  ['drone.battery', '06-battery', [0.3, 0.85, 0.45], 0.22],
  ['drone.visionFront', '07-vision', [0.22, -0.2, 1], 0.14],
  ['drone.cameraLens', '08-lens', [0.22, 0.05, 1], 0.11],
  ['drone.batteryBay', '09-bay', [0.4, 0.78, 0.5], 0.24],
]

const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
})
const page = await (await browser.newContext({ viewport: { width: 1500, height: 940 }, deviceScaleFactor: 1 })).newPage()
page.on('pageerror', (e) => console.log('[pageerror]', e.message))
await page.goto('http://127.0.0.1:4173/?qa=1', { waitUntil: 'networkidle' })
await page.waitForTimeout(5000)

await page.getByRole('button', { name: '设置' }).click()
await page.waitForTimeout(300)
await page.getByText('自动旋转').click()
await page.waitForTimeout(200)
await page.getByRole('button', { name: '关闭设置' }).click()

for (const [id, file, dir, dist] of targets) {
  const ok = await page.evaluate(
    ([id, dir, dist]) => {
      const p = window.__partPos(id)
      if (!p) return false
      const n = Math.hypot(dir[0], dir[1], dir[2])
      window.__setCam(
        [p[0] + (dir[0] / n) * dist, p[1] + (dir[1] / n) * dist, p[2] + (dir[2] / n) * dist],
        p
      )
      return true
    },
    [id, dir, dist]
  )
  if (!ok) {
    console.log('MISS', id)
    continue
  }
  await page.waitForTimeout(1600)
  await page.screenshot({ path: path.join(OUT, `${file}.png`) })
  console.log('shot', file)
}

await browser.close()

// 自动化验收脚本：截图 + 控制台错误采集 + 交互冒烟测试
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

const URL = process.env.APP_URL || 'http://127.0.0.1:5273/'
const OUT = path.resolve('test-output')
fs.mkdirSync(OUT, { recursive: true })

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
})
const ctx = await browser.newContext({ viewport: { width: 1680, height: 1000 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()

const logs = []
page.on('console', (m) => {
  if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`)
})
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
page.on('requestfailed', (r) => logs.push(`[reqfail] ${r.url()} ${r.failure()?.errorText}`))

await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(3500)

const shot = async (name) => {
  await page.screenshot({ path: path.join(OUT, `${name}.png`) })
  console.log('shot:', name)
}

await shot('01-drone-default')

// 网格/统计信息
const info = await page.evaluate(() => {
  const canvas = document.querySelector('canvas')
  return {
    canvas: canvas ? `${canvas.width}x${canvas.height}` : 'none',
    bodyText: document.body.innerText.slice(0, 400),
  }
})
console.log(JSON.stringify(info, null, 1))

// 整体拆解
await page.getByRole('button', { name: '整体拆解' }).click()
await page.waitForTimeout(2200)
await shot('02-drone-exploded')

// 复原
await page.getByRole('button', { name: '复原', exact: true }).last().click()
await page.waitForTimeout(1800)
await shot('03-drone-restored')

// 切换遥控器
await page.getByRole('button', { name: /遥控器/ }).click()
await page.waitForTimeout(2200)
await shot('04-controller-default')

await page.getByRole('button', { name: '整体拆解' }).click()
await page.waitForTimeout(2200)
await shot('05-controller-exploded')

console.log('--- LOGS ---')
console.log(logs.length ? logs.join('\n') : 'no warnings/errors')

await browser.close()

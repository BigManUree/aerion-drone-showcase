import { chromium } from 'playwright-core'
import path from 'node:path'
const EDGE = 'C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const b = await chromium.launch({ executablePath: EDGE, headless: true, args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] })
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
const p = await ctx.newPage()
await p.goto('http://127.0.0.1:4173/?qa=1', { waitUntil: 'networkidle' })
await p.waitForTimeout(6000)
await p.locator('[data-testid="btn-autorotate"]').click()
await p.waitForTimeout(500)
// 拆解 55% + 选中核心零件
await p.locator('[data-testid="progress-slider"]').fill('55')
await p.waitForTimeout(2500)
await p.locator('[data-testid="part-row-drone.mainBoard"]').scrollIntoViewIfNeeded()
await p.locator('[data-testid="part-row-drone.mainBoard"]').click()
await p.waitForTimeout(2500)
await p.screenshot({ path: path.resolve('test-output/r4-hero-exploded.png') })
await p.setViewportSize({ width: 1366, height: 768 })
await p.waitForTimeout(3000)
await p.screenshot({ path: path.resolve('test-output/r4-hero-1366.png') })
await ctx.close()
await b.close()
console.log('done')

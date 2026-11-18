import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const OUT = path.resolve('test-output/audit')
fs.mkdirSync(OUT, { recursive: true })
const headed = process.argv.includes('--headed')

const args = headed ? [] : ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader']
const b = await chromium.launch({ executablePath: EDGE, headless: !headed, args })
const p = await (await b.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 })).newPage()
p.on('pageerror', (e) => console.log('[err]', e.message))
await p.goto('http://127.0.0.1:5273/?qa=1', { waitUntil: 'networkidle' })
await p.waitForTimeout(4000)

const gl = await p.evaluate(() => {
  const c = document.querySelector('canvas')
  const g = c.getContext('webgl2') || c.getContext('webgl')
  const ext = g.getExtension('WEBGL_debug_renderer_info')
  return { vendor: ext ? g.getParameter(ext.UNMASKED_VENDOR_WEBGL) : '?', renderer: ext ? g.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '?' }
})
console.log('GL:', JSON.stringify(gl))

const setP = async (v) => { await p.locator('[data-testid="progress-slider"]').fill(String(v)); await p.waitForTimeout(1600) }
const fps = (ms) => p.evaluate((m) => new Promise(r => { let f = 0; const t0 = performance.now(); const tick = () => { f++; if (performance.now() - t0 < m) requestAnimationFrame(tick); else r(+(f / ((performance.now() - t0) / 1000)).toFixed(1)) }; requestAnimationFrame(tick) }), ms)

// 关闭自动旋转以获得稳定机位
await p.locator('[data-testid="btn-autorotate"]').click()
await p.waitForTimeout(500)

await setP(0)
await p.screenshot({ path: path.join(OUT, 'p0.png') })
console.log('fps@p0', await fps(2500))
await p.evaluate(() => window.__setCam([0.62, 0.36, 0.86], [0, 0.012, 0]))
await p.waitForTimeout(400)
await p.screenshot({ path: path.join(OUT, 'p0-iso.png') })
await p.evaluate(() => window.__setCam([0, 0.02, 0.85], [0, 0.012, 0]))
await p.waitForTimeout(400)
await p.screenshot({ path: path.join(OUT, 'p0-front.png') })
await p.evaluate(() => window.__setCam([0.85, 0.05, 0], [0, 0.012, 0]))
await p.waitForTimeout(400)
await p.screenshot({ path: path.join(OUT, 'p0-side.png') })

await setP(100)
console.log('fps@p100', await fps(2000))
await p.screenshot({ path: path.join(OUT, 'p100.png') })

// 遥控器
await p.locator('[data-testid="model-tab-controller"]').click()
await p.waitForTimeout(2500)
await p.screenshot({ path: path.join(OUT, 'ctrl-p0.png') })
console.log('fps@ctrl', await fps(2000))
await setP(100)
await p.screenshot({ path: path.join(OUT, 'ctrl-p100.png') })

await b.close()

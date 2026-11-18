// 第三轮：专业爆炸拆解系统验收
import { chromium } from 'playwright-core'
import path from 'node:path'
import fs from 'node:fs'

const URL = 'http://127.0.0.1:4173/?qa=1'
const OUT = path.resolve('test-output')
fs.mkdirSync(OUT, { recursive: true })
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

const results = []
const ok = (name, pass, detail = '') => {
  results.push({ name, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
}

const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
})
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })).newPage()
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('404')) errors.push('console: ' + m.text())
})

await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(5000)

const slider = page.locator('input[aria-label="拆解比例"]')
const getP = async () => Number(await slider.inputValue()) / 100
const setP = async (v) => {
  await slider.fill(String(v))
  await page.waitForTimeout(700)
}
const state = (id) => page.evaluate((i) => window.__partState(i), id)
const audit = () => page.evaluate(() => window.__audit())
const meta = () => page.evaluate(() => window.__explodeMeta())
/** 轮询直到条件成立（软件渲染下 gsap 时间约为实时的 1/30，必须轮询） */
const waitFor = async (fn, timeout = 45000, step = 500) => {
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) {
    if (await fn()) return true
    await page.waitForTimeout(step)
  }
  return false
}

// 1. 初始状态
const ids = await page.evaluate(() => window.__partIds())
ok('无人机 33 个零件全部注册', ids.length === 33, `count=${ids.length}`)
const s0 = await state('drone.propFL')
ok('进度 0 时零件处于原始位置', Math.abs(s0.offset[0]) < 1e-4 && Math.abs(s0.offset[1]) < 1e-4, JSON.stringify(s0.offset))
ok('初始进度为 0%', (await getP()) === 0)

// 2. 滑块 50% → 中间插值
await setP(45)
const p50 = await getP()
await setP(45)
const b50 = await state('drone.motorFL')
await setP(100)
const b100 = await state('drone.motorFL')
const s100 = await state('drone.propFL')
ok('滑块可写 45% 且 UI 同步', Math.abs(p50 - 0.45) < 0.01, `p=${p50}`)
ok(
  '中间值按区段插值（0 < t < 100）',
  Math.abs(b50.offset[0]) > 0.002 && Math.abs(b50.offset[0]) < Math.abs(b100.offset[0]) - 1e-3,
  `motor ${b50.offset[0].toFixed(4)} vs ${b100.offset[0].toFixed(4)}`
)
ok('100% 时螺旋桨完全分离', Math.abs(s100.offset[1] - 0.19 * 0.86) < 0.006, JSON.stringify(s100.offset))

// 3. 全部零件在 100% 时都有位移且在视锥内
const allAt100 = await page.evaluate(() => {
  const ids = window.__partIds()
  const zero = []
  for (const id of ids) {
    const s = window.__partState(id)
    if (Math.hypot(...s.offset) < 0.005) zero.push(id)
  }
  return zero
})
ok('100% 时所有零件均已脱离原位', allAt100.length === 0, allAt100.join(','))
const a100 = await audit()
ok('100% 时全部零件仍在取景内', a100.offscreen.length === 0 && a100.visible === 33, JSON.stringify(a100))

// 4. 反向（连续回退，无跳变）
// 采样主控制板（区段 0.40~0.64，跨越整个回退区间）
const seq = []
for (const v of [62, 56, 52, 48, 44, 40, 34]) {
  await setP(v)
  const s = await state('drone.armFL')
  seq.push(Math.hypot(...s.offset))
}
const monotonic = seq.every((v, i) => i === 0 || v <= seq[i - 1] + 1e-4)
const varied = seq[0] - seq[seq.length - 1] > 0.02
ok('反向拖动位移连续单调递减（无跳变）', monotonic && varied, seq.map((v) => v.toFixed(3)).join(' → '))

// 5. 单级拆解
await setP(0)
const levels = [
  ['一级', 0.36],
  ['二级', 0.62],
  ['三级', 0.82],
  ['四级', 1.0],
]
for (const [label, expect] of levels) {
  await page.getByRole('button', { name: new RegExp('^' + label) }).click()
  await page.waitForTimeout(2600)
  const p = await getP()
  ok(`单级拆解 ${label} → ${expect * 100}%`, Math.abs(p - expect) < 0.02, `p=${p.toFixed(3)}`)
}

// 6. 全部复原 / 全部拆解
await page.getByRole('button', { name: '全部复原' }).click()
await page.waitForTimeout(2600)
ok('全部复原 → 0%', (await getP()) < 0.02, `${(await getP()).toFixed(3)}`)
await page.getByRole('button', { name: '全部拆解' }).click()
const reachedFull = await waitFor(async () => (await getP()) > 0.985, 130000)
ok('全部拆解 → 100%', reachedFull, `${(await getP()).toFixed(3)}`)

// 7. 自动复原 / 自动拆解 / 暂停 / 继续
await page.getByRole('button', { name: '自动复原' }).click()
const restored = await waitFor(async () => (await getP()) < 0.95)
ok('自动复原：进度下降', restored, `p=${(await getP()).toFixed(3)}`)
await page.getByRole('button', { name: '暂停' }).click()
await page.waitForTimeout(300)
const pp1 = await getP()
await page.waitForTimeout(2200)
const pp2 = await getP()
ok('暂停后进度冻结', Math.abs(pp1 - pp2) < 0.005, `${pp1.toFixed(3)} → ${pp2.toFixed(3)}`)
await page.getByRole('button', { name: '继续' }).click()
const resumed = await waitFor(async () => (await getP()) < pp2 - 0.02)
ok('继续后进度恢复推进', resumed, `${pp2.toFixed(3)} → ${(await getP()).toFixed(3)}`)

// 8. 速度控制
await setP(0)
await page.getByRole('button', { name: '2×' }).click()
await page.getByRole('button', { name: '自动拆解' }).click()
await page.waitForTimeout(900)
const m2 = await meta()
await page.getByRole('button', { name: '暂停' }).click()
await page.getByRole('button', { name: '3×' }).click()
await page.waitForTimeout(600)
const m3 = await meta()
ok('速度控制写入补间 timeScale', Math.abs(m2.timeScale - 2) < 0.01 && Math.abs(m3.timeScale - 3) < 0.01, `2×:${m2.timeScale} 3×:${m3.timeScale}`)
ok('暂停标记生效', m3.paused === true, JSON.stringify(m3))
await page.getByRole('button', { name: '1×' }).click()
await page.getByRole('button', { name: '全部复原' }).click()
await page.waitForTimeout(2200)

// 9. 单件拆解（不改变全局进度）
await page.locator('input[placeholder="搜索零件 / 编号 / 材质"]').fill('智能电池')
await page.waitForTimeout(500)
await page.locator('[data-part]').first().click()
await page.waitForTimeout(400)
const pBefore = await getP()
await page.getByRole('button', { name: '拆解', exact: true }).first().click()
const boosted = await waitFor(async () => {
  const s = await state('drone.battery')
  return Math.hypot(...s.offset) > 0.02
}, 40000)
const bat = await state('drone.battery')
ok(
  '单件拆解：零件脱离而全局进度不变',
  boosted && Math.abs((await getP()) - pBefore) < 0.02,
  `${JSON.stringify(bat.offset)} p=${(await getP()).toFixed(3)}`
)

// 10. 点击选择
await page.locator('input[placeholder="搜索零件 / 编号 / 材质"]').fill('')
await page.waitForTimeout(400)
const box = await page.locator('canvas').boundingBox()
let hit = false
for (const [fx, fy] of [
  [0.5, 0.46],
  [0.45, 0.52],
  [0.56, 0.44],
]) {
  await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy)
  await page.waitForTimeout(500)
  const t = await page.locator('aside').last().innerText()
  if (t.includes('EXPLODE VECTOR')) {
    hit = true
    break
  }
}
ok('射线拾取仍然可用', hit)

// 11. 切换模型与复位
await page.getByRole('button', { name: /遥控器/ }).click()
await page.waitForTimeout(2500)
const pCtrl = await getP()
const ctrlIds = await page.evaluate(() => window.__partIds())
ok('切换遥控器：进度复位且 17 零件', pCtrl === 0 && ctrlIds.length === 17, `p=${pCtrl} n=${ctrlIds.length}`)

ok('无控制台报错', errors.length === 0, errors.slice(0, 2).join(' | '))

const pass = results.filter((r) => r.pass).length
console.log(`\n===== ${pass}/${results.length} 通过 =====`)
fs.writeFileSync(path.join(OUT, 'report-explode.json'), JSON.stringify(results, null, 2))
await browser.close()
process.exit(pass === results.length ? 0 : 1)

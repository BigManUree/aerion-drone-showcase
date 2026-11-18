// 交互功能验收：逐项断言并把结果打印成表格
import { chromium } from 'playwright-core'
import path from 'node:path'
import fs from 'node:fs'

const URL = 'http://127.0.0.1:4173/'
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
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('404')) errors.push('console: ' + m.text())
})

await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(3000)

const progressText = async () => {
  const t = await page.locator('footer').innerText()
  const m = t.match(/(\d+)\/(\d+)/)
  return m ? { done: +m[1], total: +m[2] } : { done: -1, total: -1 }
}

// 1. 默认渲染
const p0 = await progressText()
ok('无人机默认加载 & 30 个零件', p0.total === 30 && p0.done === 0, JSON.stringify(p0))

// 2. 零件树选中 + 右侧详情联动
await page.getByText('左前机臂', { exact: true }).click()
await page.waitForTimeout(400)
const detail = await page.locator('aside').last().innerText()
ok('点击零件树 → 右侧显示零件信息', detail.includes('左前机臂') && detail.includes('ARM-FL'))
await page.screenshot({ path: path.join(OUT, '10-part-selected.png') })

// 3. 单个零件拆解（右侧面板按钮）
await page.getByRole('button', { name: '拆解', exact: true }).click()
await page.waitForTimeout(1400)
const p1 = await progressText()
ok('单零件拆解 → 进度 +1', p1.done === 1, JSON.stringify(p1))
await page.screenshot({ path: path.join(OUT, '11-single-explode.png') })

// 4. 单零件复原
await page.getByRole('button', { name: '复原', exact: true }).first().click()
await page.waitForTimeout(1300)
const p2 = await progressText()
ok('单零件复原 → 进度归零', p2.done === 0, JSON.stringify(p2))

// 5. 三级拆解
await page.getByRole('button', { name: '二级', exact: true }).click()
await page.waitForTimeout(1600)
const p3 = await progressText()
ok('多级拆解（二级）', p3.done === 25 && p3.total === 30, JSON.stringify(p3))
await page.screenshot({ path: path.join(OUT, '12-level2.png') })

// 6. 距离滑块
await page.locator('input[aria-label="拆解距离"]').fill('1.6')
await page.waitForTimeout(600)
const sliderVal = await page.locator('input[aria-label="拆解距离"]').inputValue()
ok('拆解距离滑块生效', Math.abs(+sliderVal - 1.6) < 0.01, sliderVal)

// 7. 整体拆解
await page.getByRole('button', { name: '整体拆解' }).click()
await page.waitForTimeout(1800)
const p4 = await progressText()
ok('一键整体拆解 → 30/30', p4.done === 30, JSON.stringify(p4))

// 8. 复原
await page.getByRole('button', { name: '复原', exact: true }).last().click()
await page.waitForTimeout(1500)
const p5 = await progressText()
ok('一键复原 → 0/30', p5.done === 0, JSON.stringify(p5))

// 9. 自动播放（软件渲染下帧率低，使用轮询等待）
await page.getByRole('button', { name: '自动播放' }).click()
let p6 = { done: 0, total: 30 }
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(500)
  p6 = await progressText()
  if (p6.done >= 4) break
}
const playing = await page.getByRole('button', { name: '播放中' }).count()
ok('自动播放按序拆解', p6.done >= 4, JSON.stringify(p6))
ok('自动播放按钮状态切换', playing === 1)

// 10. 暂停 / 继续
await page.getByRole('button', { name: '暂停' }).click()
await page.waitForTimeout(400)
const pausedCount = (await progressText()).done
await page.waitForTimeout(2200)
const pausedCount2 = (await progressText()).done
ok('暂停动画 → 进度冻结', pausedCount === pausedCount2, `${pausedCount} → ${pausedCount2}`)
await page.getByRole('button', { name: '继续', exact: true }).click()
let resumed = pausedCount2
for (let i = 0; i < 20; i++) {
  await page.waitForTimeout(500)
  resumed = (await progressText()).done
  if (resumed > pausedCount2) break
}
ok('继续动画 → 进度恢复推进', resumed > pausedCount2, `${pausedCount2} → ${resumed}`)
await page.getByRole('button', { name: '复原', exact: true }).last().click()
await page.waitForTimeout(1200)

// 11. 点击 3D 模型选中零件（先确保完全复原并等动画收敛）
await page.getByRole('button', { name: '复原', exact: true }).last().click()
await page.waitForTimeout(3500)
const box = await page.locator('canvas').boundingBox()
let hit = false
const probes = [
  [0.5, 0.46],
  [0.44, 0.5],
  [0.56, 0.44],
  [0.5, 0.55],
  [0.4, 0.44],
]
for (const [fx, fy] of probes) {
  await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy)
  await page.waitForTimeout(700)
  const t = await page.locator('aside').last().innerText()
  if (/零件详情/.test(t) && t.includes('EXPLODE VECTOR')) {
    hit = true
    break
  }
}
ok('射线拾取：点击 3D 零件选中', hit)
await page.screenshot({ path: path.join(OUT, '13-raycast-select.png') })

// 12. 搜索
await page.locator('input[placeholder="搜索零件 / 编号 / 材质"]').fill('桨')
await page.waitForTimeout(400)
const treeText = await page.locator('aside').first().innerText()
ok('搜索过滤零件', treeText.includes('螺旋桨') && treeText.includes('4/30'))

// 13. 切换遥控器
await page.getByRole('button', { name: /遥控器/ }).click()
await page.waitForTimeout(2400)
const p7 = await progressText()
ok('切换到遥控器模型 (17 零件)', p7.total === 17 && p7.done === 0, JSON.stringify(p7))
await page.screenshot({ path: path.join(OUT, '14-controller.png') })

// 14. 遥控器整体拆解
await page.getByRole('button', { name: '整体拆解' }).click()
await page.waitForTimeout(2000)
ok('遥控器整体拆解 17/17', (await progressText()).done === 17)
await page.screenshot({ path: path.join(OUT, '15-controller-exploded.png') })

// 15. 设置面板 & 开关
await page.getByRole('button', { name: '设置' }).click()
await page.waitForTimeout(300)
await page.getByText('自动旋转').click()
await page.waitForTimeout(200)
ok('设置面板打开且开关可交互', (await page.locator('text=Render Pipeline').count()) === 1)
await page.screenshot({ path: path.join(OUT, '16-settings.png') })
await page.getByRole('button', { name: '关闭设置' }).click()

// 16. 帮助面板
await page.getByRole('button', { name: '操作说明' }).click()
await page.waitForTimeout(300)
ok('帮助面板打开', (await page.getByText('交互说明').count()) >= 1)
await page.keyboard.press('Escape')
await page.waitForTimeout(200)

// 17. 重置视角按钮存在（FPS 显示）
ok('渲染循环运行 (FPS 面板)', (await page.getByText(/FPS/).count()) >= 1)

// 18. 无控制台错误
ok('无控制台报错', errors.length === 0, errors.slice(0, 3).join(' | '))

const pass = results.filter((r) => r.pass).length
console.log(`\n===== ${pass}/${results.length} 通过 =====`)
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(results, null, 2))
await browser.close()
process.exit(pass === results.length ? 0 : 1)

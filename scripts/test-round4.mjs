// 第四轮：DRONE LAB 工业展示平台 UI 验收（真实浏览器 + 真实交互）
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

const errors = []
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('404')) errors.push('console: ' + m.text())
})

const st = () => page.evaluate(() => window.__sceneState())
const audit = () => page.evaluate(() => window.__audit())
const cam = () => page.evaluate(() => window.__cam())
const meta = () => page.evaluate(() => window.__explodeMeta())
const partState = (id) => page.evaluate((i) => window.__partState(i), id)
const screenPos = (id) => page.evaluate((i) => window.__screenPos(i), id)
const wait = (ms) => page.waitForTimeout(ms)
const waitFor = async (fn, timeout = 30000, step = 300) => {
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) {
    if (await fn()) return true
    await page.waitForTimeout(step)
  }
  return false
}
const slider = () => page.locator('[data-testid="progress-slider"]')
const setProgress = async (v) => {
  await slider().fill(String(v))
  await wait(500)
}

await page.goto(URL, { waitUntil: 'networkidle' })
await wait(6000)

// ─────────── A 初始渲染与主题 ───────────
console.log('\n=== A 初始渲染 ===')
const ids = await page.evaluate(() => window.__partIds())
ok('无人机 33 个零件注册', ids.length === 33, `count=${ids.length}`)

const palette = await page.evaluate(() => {
  const root = getComputedStyle(document.documentElement)
  const header = document.querySelector('header')
  const leftPanel = document.querySelector('[data-testid="left-panel"]')
  return {
    body: getComputedStyle(document.body).backgroundColor,
    header: getComputedStyle(header).backgroundColor,
    panel: leftPanel ? getComputedStyle(leftPanel).backgroundColor : null,
    border: leftPanel ? getComputedStyle(leftPanel).borderRightColor : null,
    vars: {
      bg: root.getPropertyValue('--c-bg').trim(),
      panel: root.getPropertyValue('--c-panel').trim(),
      primary: root.getPropertyValue('--c-primary').trim(),
      text: root.getPropertyValue('--c-text').trim(),
      line: root.getPropertyValue('--c-line').trim(),
    },
  }
})
ok('页面背景 = #101318', palette.body === 'rgb(16, 19, 24)', palette.body)
ok('面板背景 = #191E26', palette.panel === 'rgb(25, 30, 38)', String(palette.panel))
ok('边框 = #303946', palette.border === 'rgb(48, 57, 70)', String(palette.border))
ok(
  '设计令牌齐全',
  palette.vars.bg === '#101318' && palette.vars.primary === '#00c8ff' && palette.vars.line === '#303946',
  JSON.stringify(palette.vars)
)

ok('左右面板默认展开（1600 宽）', (await page.locator('[data-testid="left-panel"]').count()) === 1 && (await page.locator('[data-testid="right-panel"]').count()) === 1)
ok('零件树渲染 33 行', (await page.locator('[data-part]').count()) === 33, String(await page.locator('[data-part]').count()))
const annotCount0 = await page.locator('[data-testid^="annotation-"]').count()
ok('结构标注默认显示 4–6 条', annotCount0 >= 4 && annotCount0 <= 6, String(annotCount0))
ok('底部滑块初始为 0', (await slider().inputValue()) === '0')

// 关闭自动旋转，保证相机断言稳定
await page.locator('[data-testid="btn-autorotate"]').click()
await wait(800)
ok('自动旋转可关闭', (await st()).autoRotate === false)

// ─────────── B 零件树 → 3D ───────────
console.log('\n=== B 零件树 → 3D ===')
const target = 'drone.gimbalFrame'
await page.locator(`[data-testid="part-row-${target}"]`).scrollIntoViewIfNeeded()
await page.locator(`[data-testid="part-row-${target}"]`).click()
await wait(600)
let s = await st()
ok('零件树点击 → 选中同步', s.selectedId === target, String(s.selectedId))
const detailText = await page.locator('[data-testid="right-panel"]').innerText()
ok(
  '右侧详情显示 6 项规格字段',
  ['零件名称', '零件编号', '所属分类', '材质', '外形尺寸', '功能说明', '当前状态'].every((k) => detailText.includes(k)),
  detailText.slice(0, 40).replace(/\n/g, ' ')
)
ok('详情显示零件编号', detailText.includes('GIM-'), detailText.match(/GIM-[A-Z0-9-]+/)?.[0] ?? '')
const selectedRowClass = await page.locator(`[data-testid="part-row-${target}"]`).getAttribute('class')
ok('零件树当前选中态高亮', selectedRowClass.includes('inset_2px_0_0_0'), 'inset 高亮条')
ok('标注包含选中零件', (await page.locator(`[data-testid="annotation-${target}"]`).count()) === 1)
await page.screenshot({ path: path.join(OUT, 'r4-selected.png') })

// ─────────── C 3D → 零件树 ───────────
console.log('\n=== C 3D 点击 → 零件树 ===')
const sp = await screenPos('drone.propFL')
ok('取得 3D 零件屏幕坐标', sp && sp.inFront === true, JSON.stringify(sp))
await page.mouse.click(sp.x, sp.y)
await wait(700)
s = await st()
ok('3D 点击 → 选中同步', s.selectedId !== null, String(s.selectedId))
const synced = s.selectedId
const syncedBox = await page.locator(`[data-part="${synced}"]`).boundingBox()
const treeBox = await page.locator('[data-testid="left-panel"]').boundingBox()
ok(
  '零件树自动滚动到选中行',
  !!syncedBox && !!treeBox && syncedBox.y >= treeBox.y && syncedBox.y + syncedBox.height <= treeBox.y + treeBox.height,
  synced ?? ''
)
ok('右侧详情同步显示该零件', (await page.locator('[data-testid="right-panel"]').innerText()).includes(await page.evaluate((id) => document.querySelector(`[data-part="${id}"]`)?.innerText.split('\n')[0], synced)))

// ─────────── D 可见性 ───────────
console.log('\n=== D 零件可见性 ===')
const hideId = 'drone.propFR'
await page.locator(`[data-testid="part-row-${hideId}"]`).scrollIntoViewIfNeeded()
await page.locator(`[data-testid="vis-${hideId}"]`).click()
await wait(700)
s = await st()
let ps = await partState(hideId)
ok('隐藏后场景中该零件不可见', ps.visible === false, JSON.stringify(ps))
ok('隐藏计数 +1', s.hiddenCount === 1, String(s.hiddenCount))
const hiddenDecoration = await page.evaluate((id) => {
  const row = document.querySelector(`[data-part="${id}"]`)
  const struck = [...row.querySelectorAll('span')].some((el) =>
    getComputedStyle(el).textDecorationLine.includes('line-through')
  )
  return struck ? 'line-through' : 'none'
}, hideId)
ok('隐藏行显示删除线', hiddenDecoration.includes('line-through'), hiddenDecoration)
ok('面板提示已隐藏数量', (await page.locator('[data-testid="left-panel"]').innerText()).includes('已隐藏'))
await page.screenshot({ path: path.join(OUT, 'r4-hidden.png') })

// 恢复 → 选中 → 隐藏，验证选中被清除
await page.locator(`[data-testid="vis-${hideId}"]`).click()
await wait(500)
ok('再次点击恢复显示', (await partState(hideId)).visible === true && (await st()).hiddenCount === 0)
await page.locator(`[data-testid="part-row-${hideId}"]`).click()
await wait(400)
ok('隐藏前已选中该零件', (await st()).selectedId === hideId, String((await st()).selectedId))
await page.locator(`[data-testid="vis-${hideId}"]`).click()
await wait(600)
ok('隐藏当前选中零件时取消选中', (await st()).selectedId === null, String((await st()).selectedId))

await page.locator('[data-testid="show-all-parts"]').click()
await wait(700)
ps = await partState(hideId)
s = await st()
ok('全部显示恢复可见', ps.visible === true && s.hiddenCount === 0, `visible=${ps.visible} hidden=${s.hiddenCount}`)

// 分类级隐藏
const catTotal = await page.evaluate(() => {
  const cat = document.querySelector('[data-testid="cat-0"]')
  return cat ? Number(cat.parentElement.parentElement.querySelectorAll('[data-part]').length) : 0
})
await page.locator('[data-testid="cat-vis-0"]').click()
await wait(600)
s = await st()
const catHidden = await page.evaluate(() => window.__sceneState().hiddenCount)
ok('分类级隐藏生效', catHidden === catTotal && catTotal > 0, `hidden=${catHidden} / cat=${catTotal}`)
await page.locator('[data-testid="cat-vis-0"]').click()
await wait(600)
ok('分类级再次点击恢复', (await st()).hiddenCount === 0)

// ─────────── E 搜索 / 折叠 ───────────
console.log('\n=== E 搜索与折叠 ===')
const rowsBefore = await page.locator('[data-part]').count()
await page.locator('[data-testid="part-search"]').fill('电池')
await wait(400)
const rowsAfter = await page.locator('[data-part]').count()
const resultLine = await page.locator('[data-testid="part-search"]').locator('..').locator('..').innerText()
ok('搜索过滤零件树', rowsAfter > 0 && rowsAfter < rowsBefore, `${rowsBefore} → ${rowsAfter}`)
ok('搜索结果计数显示', /RESULT\s+\d+\s*\/\s*33/.test(resultLine.replace(/\n/g, ' ')), resultLine.split('\n')[1] ?? '')
await page.locator('[data-testid="part-search"]').fill('')
await wait(400)
ok('清空搜索恢复全部', (await page.locator('[data-part]').count()) === rowsBefore)

await page.locator('[data-testid="cat-0"]').click()
await wait(400)
const collapsedRows = await page.locator('[data-part]').count()
ok('分类折叠生效', collapsedRows === rowsBefore - 5, `${rowsBefore} → ${collapsedRows}`)
await page.locator('[data-testid="cat-0"]').click()
await wait(400)
ok('分类展开恢复', (await page.locator('[data-part]').count()) === rowsBefore)

// ─────────── F 拆解控制 ───────────
console.log('\n=== F 拆解控制 ===')
await setProgress(50)
ok('进度滑块 → 50%', Math.abs((await meta()).progress - 0.5) < 0.02, String((await meta()).progress))
ok('百分比读数同步', (await page.locator('[data-testid="progress-value"]').innerText()) === '050')
const movedAt50 = await waitFor(async () => Math.abs((await partState('drone.topShell')).offset[1]) > 0.01, 15000, 300)
ok('50% 时零件已位移', movedAt50, JSON.stringify((await partState('drone.topShell')).offset))

await setProgress(0)
await page.locator('[data-testid="btn-play"]').click()
await wait(900)
let m = await meta()
ok('播放启动自动拆解', m.autoDir === 'explode' && m.tweening === true, JSON.stringify({ dir: m.autoDir, tween: m.tweening }))
const p1 = m.progress
await page.locator('[data-testid="btn-pause"]').click()
await wait(700)
const pausedProgress = (await meta()).progress
await wait(1400)
const stillProgress = (await meta()).progress
ok('暂停冻结进度', Math.abs(pausedProgress - stillProgress) < 0.012, `${pausedProgress.toFixed(3)} → ${stillProgress.toFixed(3)}`)
ok('暂停按钮状态', (await st()).progress !== undefined && (await page.locator('[data-testid="btn-pause"]').getAttribute('aria-pressed')) === 'true')
await page.locator('[data-testid="btn-pause"]').click()
const resumed = await waitFor(async () => (await meta()).progress > stillProgress + 0.01, 20000, 300)
ok('继续后进度前进', resumed, `${stillProgress.toFixed(3)} → ${(await meta()).progress.toFixed(3)}`)

await page.locator('[data-testid="btn-restore"]').click()
const restored = await waitFor(async () => (await meta()).progress < 0.02, 20000)
ok('复原回到装配状态', restored, String((await meta()).progress))

await page.locator('[data-testid="speed-2"]').click()
await wait(300)
ok('速度 2× 生效', (await meta()).speed === 2)

await page.locator('[data-testid="band-3"]').click()
const l3 = await waitFor(async () => Math.abs((await meta()).progress - 0.82) < 0.015, 45000)
ok('分级刻线跳转 L3（82%）', l3, String((await meta()).progress))

await page.locator('[data-testid="btn-restore"]').click()
await waitFor(async () => (await meta()).progress < 0.02, 20000)

// ─────────── G 自动旋转 ───────────
console.log('\n=== G 自动旋转 ===')
// 等拆解补间与推拉镜头完全静止
await waitFor(async () => (await meta()).tweening === false, 30000)
await wait(2000)
const c0 = await cam()
await wait(2200)
const c1 = await cam()
const stillDiff = Math.abs(c1.pos[0] - c0.pos[0]) + Math.abs(c1.pos[2] - c0.pos[2])
await page.locator('[data-testid="btn-autorotate"]').click()
await wait(400)
const c2 = await cam()
const spinning = await waitFor(async () => {
  const c = await cam()
  return Math.abs(c.pos[0] - c2.pos[0]) + Math.abs(c.pos[2] - c2.pos[2]) > 0.01
}, 12000, 400)
ok('自动旋转关闭时相机静止', stillDiff < 0.001, stillDiff.toFixed(5))
ok('自动旋转开启后相机环绕', (await st()).autoRotate === true && spinning, spinning ? 'camera orbiting' : 'no motion')
await page.locator('[data-testid="btn-autorotate"]').click()
await wait(400)

// ─────────── H 视图模式 ───────────
console.log('\n=== H 视图模式 ===')
const setView = async (key) => {
  await page.locator('[data-testid="view-mode-btn"]').click()
  await wait(250)
  await page.locator(`[data-testid="view-${key}"]`).click()
  await wait(2600)
  return cam()
}
const iso = await setView('iso')
const front = await setView('front')
const top = await setView('top')
const side = await setView('side')
ok('正视图 → 相机在 +Z 轴', front.pos[2] > 0.9 && Math.abs(front.pos[0]) < 0.2, JSON.stringify(front.pos))
ok('俯视图 → 相机在高位', top.pos[1] > 1.0 && Math.abs(top.pos[2]) < 0.3, JSON.stringify(top.pos))
ok('侧视图 → 相机在 +X 轴', side.pos[0] > 0.9 && Math.abs(side.pos[2]) < 0.25, JSON.stringify(side.pos))
ok('等轴测 → 三轴均有分量', iso.pos[0] > 0.4 && iso.pos[1] > 0.2 && iso.pos[2] > 0.5, JSON.stringify(iso.pos))
await setView('iso')

// ─────────── I 网格 / 坐标轴 / 标注 / 背景 ───────────
console.log('\n=== I 场景辅助 ===')
await page.locator('[data-testid="tool-grid"]').click()
await wait(500)
s = await st()
ok('网格可关闭', s.grid === false && s.gridVisible === false, JSON.stringify({ grid: s.grid, vis: s.gridVisible }))
await page.locator('[data-testid="tool-grid"]').click()
await wait(500)
s = await st()
ok('网格可开启', s.grid === true && s.gridVisible === true)

await page.locator('[data-testid="tool-axes"]').click()
await wait(500)
s = await st()
ok('坐标辅助线可关闭', s.axes === false && s.axesFound === false)
ok('左下坐标指示同步隐藏', (await page.locator('[data-testid="axis-gizmo"]').count()) === 0)
await page.locator('[data-testid="tool-axes"]').click()
await wait(500)
ok('坐标辅助线恢复', (await st()).axesFound === true && (await page.locator('[data-testid="axis-gizmo"]').count()) === 1)

await page.locator('[data-testid="tool-annotations"]').click()
await wait(500)
ok('结构标注可关闭', (await page.locator('[data-testid^="annotation-"]').count()) === 0)
await page.locator('[data-testid="tool-annotations"]').click()
await wait(600)
ok('结构标注恢复', (await page.locator('[data-testid^="annotation-"]').count()) >= 4)

await page.locator('[data-testid="tool-bg"]').click()
await wait(250)
await page.locator('[data-testid="bg-blueprint"]').click()
await wait(900)
s = await st()
const backdrop = await page.evaluate(() => getComputedStyle(document.querySelector('[data-testid="viewport"]')).backgroundImage)
ok('背景切换为蓝图', s.bg === 'blueprint' && backdrop.includes('rgb(16, 32, 44)'), backdrop.slice(0, 48))
await page.screenshot({ path: path.join(OUT, 'r4-blueprint.png') })
await page.locator('[data-testid="tool-bg"]').click()
await wait(250)
await page.locator('[data-testid="bg-studio"]').click()
await wait(600)

// ─────────── J 模型切换与状态保持 ───────────
console.log('\n=== J 模型切换 ===')
await page.locator(`[data-testid="part-row-drone.battery"]`).scrollIntoViewIfNeeded()
await page.locator('[data-testid="part-row-drone.battery"]').click()
await wait(400)
await page.locator('[data-testid="vis-drone.led"]').click()
await wait(400)
await page.locator('[data-testid="speed-3"]').click()
await wait(200)

await page.locator('[data-testid="model-tab-controller"]').click()
await wait(3000)
s = await st()
const ctrlCount = await page.locator('[data-part]').count()
ok('切换到遥控器模型', s.model === 'controller', s.model)
ok('遥控器零件树 17 行', ctrlCount === 17, String(ctrlCount))
ok('切换后拆解进度归零', Math.abs(s.progress) < 0.001, String(s.progress))
ok('切换后无残留选中', s.selectedId === null, String(s.selectedId))
ok('视角/背景/网格/标注设置保持', s.bg === 'studio' && s.grid === true && s.annotations === true && s.speed === 3, JSON.stringify({ bg: s.bg, grid: s.grid, speed: s.speed }))
ok('无人机隐藏状态不串到遥控器', s.hiddenVisibleInScene === 0, `sceneHidden=${s.hiddenVisibleInScene}`)
await page.screenshot({ path: path.join(OUT, 'r4-controller.png') })

await page.locator('[data-testid="part-row-ctrl.antennaLeft"]').scrollIntoViewIfNeeded()
await page.locator('[data-testid="vis-ctrl.antennaLeft"]').click()
await wait(600)
ok('遥控器零件可隐藏', (await st()).hiddenVisibleInScene === 1, `sceneHidden=${(await st()).hiddenVisibleInScene}`)
ok('遥控器隐藏零件在场景中不可见', (await partState('ctrl.antennaLeft')).visible === false)

await page.locator('[data-testid="model-tab-drone"]').click()
await wait(3000)
s = await st()
ok('切回无人机恢复上次选中', s.selectedId === 'drone.battery', String(s.selectedId))
const backState = await st()
ok('切回无人机隐藏状态保留', backState.hiddenVisibleInScene === 1 && (await page.locator('[data-testid="left-panel"]').innerText()).includes('已隐藏 1'), `sceneHidden=${backState.hiddenVisibleInScene}`)
const ledState = await partState('drone.led')
ok('被隐藏的无人机零件仍不可见', ledState.visible === false)
ok('速度设置跨模型保持', s.speed === 3)
await page.locator('[data-testid="show-all-parts"]').click()
await wait(400)

// ─────────── K 设置面板 ───────────
console.log('\n=== K 设置面板 ===')
await page.locator('[data-testid="settings-btn"]').click()
await wait(500)
ok('设置面板打开', (await page.locator('[data-testid="settings-panel"]').count()) === 1)
await page.screenshot({ path: path.join(OUT, 'r4-settings.png') })
const settingsBox = await page.locator('[data-testid="settings-panel"]').boundingBox()
ok('设置面板在视口内', !!settingsBox && settingsBox.y >= 52 && settingsBox.y + settingsBox.height <= 905, JSON.stringify(settingsBox))
await page.keyboard.press('Escape')
await wait(400)
ok('Esc 关闭设置', (await page.locator('[data-testid="settings-panel"]').count()) === 0)

// ─────────── L 全屏 ───────────
console.log('\n=== L 全屏 ===')
const beforeErr = errors.length
await page.locator('button[aria-label="全屏"]').click()
await wait(1200)
ok('全屏按钮可点击且无异常', errors.length === beforeErr, errors.slice(beforeErr).join(' | '))
if (await page.evaluate(() => Boolean(document.fullscreenElement))) await page.evaluate(() => document.exitFullscreen())

// ─────────── M 键盘快捷键 ───────────
console.log('\n=== M 快捷键 ===')
await setProgress(40)
await page.locator('[data-part="drone.gps"]').scrollIntoViewIfNeeded()
await page.locator('[data-part="drone.gps"]').click()
await wait(300)
await page.keyboard.press('h')
await wait(500)
ok('H 隐藏当前选中零件', (await st()).hiddenCount === 1 && (await st()).selectedId === null, JSON.stringify({ h: (await st()).hiddenCount }))
await page.keyboard.press('Shift+H')
await wait(500)
ok('Shift+H 显示全部', (await st()).hiddenCount === 0)
await page.keyboard.press('g')
await wait(400)
ok('G 切换网格', (await st()).grid === false)
await page.keyboard.press('g')
await wait(300)
await page.keyboard.press('4')
const toL4 = await waitFor(async () => (await meta()).progress > 0.7, 25000)
ok('数字 4 跳转四级拆解', toL4, String((await meta()).progress))
await page.keyboard.press('Escape')
await page.locator('[data-testid="btn-restore"]').click()
await waitFor(async () => (await meta()).progress < 0.02, 20000)

// ─────────── N 响应式 ───────────
console.log('\n=== N 响应式 ===')
const sizes = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1024x768', width: 1024, height: 768 },
]
for (const sz of sizes) {
  await page.setViewportSize({ width: sz.width, height: sz.height })
  const drawerMode = sz.width < 1280
  // 等布局与取景稳定（相机推拉为帧驱动缓动）
  await waitFor(async () => {
    const l = await page.evaluate(() => ({
      left: Boolean(document.querySelector('[data-testid="left-panel"]')),
      right: Boolean(document.querySelector('[data-testid="right-panel"]')),
    }))
    const off = (await audit()).offscreen.length
    return drawerMode ? !l.left && !l.right && off === 0 : l.left && l.right && off === 0
  }, 15000, 400)
  const layout = await page.evaluate(() => {
    const vp = document.querySelector('[data-testid="viewport"]').getBoundingClientRect()
    const header = document.querySelector('header').getBoundingClientRect()
    const footer = document.querySelector('[data-testid="bottom-bar"]').getBoundingClientRect()
    return {
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      vp: { x: +vp.x.toFixed(1), w: +vp.width.toFixed(1), h: +vp.height.toFixed(1) },
      headerH: +header.height.toFixed(1),
      footerH: +footer.height.toFixed(1),
      left: Boolean(document.querySelector('[data-testid="left-panel"]')),
      right: Boolean(document.querySelector('[data-testid="right-panel"]')),
      vw: window.innerWidth,
      vh: window.innerHeight,
    }
  })
  const a = await audit()
  const drawer = sz.width < 1280
  ok(`${sz.name} 无横向溢出`, layout.overflowX <= 0, `overflow=${layout.overflowX}`)
  ok(`${sz.name} 3D 区域占据剩余空间`, layout.vp.w > sz.width * 0.5, `viewport=${layout.vp.w}px`)
  ok(`${sz.name} 全部零件在取景内`, a.offscreen.length === 0, `offscreen=${a.offscreen.length}`)
  ok(
    `${sz.name} 面板策略正确`,
    drawer ? !layout.left && !layout.right : layout.left && layout.right,
    drawer ? '抽屉（默认收起）' : '常驻'
  )
  await page.screenshot({ path: path.join(OUT, `r4-${sz.name}.png`) })
}

// 平板抽屉交互
console.log('\n=== O 平板抽屉 ===')
await page.locator('button[aria-label="显示侧栏面板"]').click()
await wait(700)
ok('平板抽屉打开零件树', (await page.locator('[data-testid="left-panel"]').count()) === 1)
ok('抽屉遮罩出现', (await page.locator('[data-testid="drawer-backdrop"]').count()) === 1)
await page.screenshot({ path: path.join(OUT, 'r4-tablet-drawer.png') })
await page.locator('[data-testid="part-row-drone.battery"]').click()
await wait(900)
ok('选中后切换为详情抽屉', (await page.locator('[data-testid="left-panel"]').count()) === 0 && (await page.locator('[data-testid="right-panel"]').count()) === 1)
await page.locator('[data-testid="drawer-backdrop"]').click({ position: { x: 30, y: 30 } })
await wait(600)
ok('点击遮罩关闭抽屉', (await page.locator('[data-testid="right-panel"]').count()) === 0)
const aTablet = await audit()
ok('关闭抽屉后模型仍完整在框内', aTablet.offscreen.length === 0, `offscreen=${aTablet.offscreen.length}`)

// ─────────── P 控制台错误 ───────────
console.log('\n=== P 运行期错误 ===')
ok('无 JS 运行时错误', errors.length === 0, errors.slice(0, 3).join(' | '))

fs.writeFileSync(
  path.join(OUT, 'report-round4.json'),
  JSON.stringify({ when: new Date().toISOString(), pass: results.filter((r) => r.pass).length, total: results.length, results }, null, 2)
)
console.log(`\n===== ${results.filter((r) => r.pass).length}/${results.length} PASS =====`)
await browser.close()

// 端到端独立审计（真实 GPU）：几何 / 拆解 / 交互 / 性能
// node scripts/e2e-audit.mjs [--url=...]
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

const urlArg = process.argv.find((a) => a.startsWith('--url='))
const URL = urlArg ? urlArg.slice(6) : 'http://127.0.0.1:5273/?qa=1'
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const OUT = path.resolve('test-output/audit')
fs.mkdirSync(OUT, { recursive: true })

const R = { url: URL, at: new Date().toISOString(), checks: [], data: {} }
const ok = (name, pass, detail = '') => {
  R.checks.push({ name, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
}

const browser = await chromium.launch({
  executablePath: EDGE,
  headless: false,
  args: [
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-background-timer-throttling',
    // Windows 下窗口被判定为"被遮挡"会把 rAF 降到 1fps，自动化读数全废
    '--disable-features=CalculateNativeWinOcclusion',
  ],
})
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

await page.goto(URL, { waitUntil: 'networkidle' })
await page.bringToFront()
await page.waitForFunction(() => !!window.__scene && !!window.__partIds, null, { timeout: 30000 })
await page.waitForTimeout(3000)

await page.addScriptTag({
  content: `
window.__qaBox = function(id){
  const scene = window.__scene;
  let g = null; scene.traverse(o => { if(!g && o.name === 'x-'+id) g = o });
  if(!g) return null;
  let minx=1e9,miny=1e9,minz=1e9,maxx=-1e9,maxy=-1e9,maxz=-1e9,n=0;
  g.updateWorldMatrix(true,true);
  g.traverse(o=>{
    if(!o.isMesh) return;
    let vis=true,pp=o; while(pp){ if(pp.visible===false){vis=false;break;} pp=pp.parent; }
    if(!vis) return;
    const pos=o.geometry.attributes.position, e=o.matrixWorld.elements;
    const arr=pos.array, cnt=pos.count, st=pos.itemSize;
    for(let i=0;i<cnt;i++){
      const x=arr[i*st], y=arr[i*st+1], z=arr[i*st+2];
      const wx=e[0]*x+e[4]*y+e[8]*z+e[12], wy=e[1]*x+e[5]*y+e[9]*z+e[13], wz=e[2]*x+e[6]*y+e[10]*z+e[14];
      if(wx<minx)minx=wx; if(wy<miny)miny=wy; if(wz<minz)minz=wz;
      if(wx>maxx)maxx=wx; if(wy>maxy)maxy=wy; if(wz>maxz)maxz=wz;
      n++;
    }
  });
  return n ? {min:[minx,miny,minz],max:[maxx,maxy,maxz]} : null;
};
window.__qaMatStats = function(){
  const byPart = {};
  window.__scene.traverse(o=>{
    if(!o.isMesh) return;
    let pp=o, id=null;
    while(pp){ if(pp.name && pp.name.startsWith('x-')){ id=pp.name.slice(2); break; } pp=pp.parent; }
    if(!id) return;
    const mats = Array.isArray(o.material)? o.material : [o.material];
    byPart[id] = byPart[id] || { meshes:0, mats:new Set(), tris:0 };
    byPart[id].meshes++;
    const g=o.geometry;
    byPart[id].tris += g.index ? g.index.count/3 : g.attributes.position.count/3;
    for(const m of mats) if(m) byPart[id].mats.add(m.uuid);
  });
  const res={};
  for(const k in byPart) res[k]={meshes:byPart[k].meshes, matCount:byPart[k].mats.size, tris:Math.round(byPart[k].tris)};
  return res;
};
window.__pts = function(id, maxN){
  const scene = window.__scene;
  let g=null; scene.traverse(o=>{ if(!g && o.name==='x-'+id) g=o });
  if(!g) return null;
  const pts=[]; g.updateWorldMatrix(true,true);
  const meshes=[]; g.traverse(o=>{ if(o.isMesh) meshes.push(o) });
  let total=0; meshes.forEach(m=>total+=m.geometry.attributes.position.count);
  const stride=Math.max(1, Math.floor(total/Math.max(40,maxN)));
  for(const o of meshes){
    const p=o.geometry.attributes.position, e=o.matrixWorld.elements, arr=p.array, st=p.itemSize;
    for(let i=0;i<p.count;i+=stride){
      const x=arr[i*st],y=arr[i*st+1],z=arr[i*st+2];
      pts.push([e[0]*x+e[4]*y+e[8]*z+e[12], e[1]*x+e[5]*y+e[9]*z+e[13], e[2]*x+e[6]*y+e[10]*z+e[14]]);
    }
  }
  return pts;
};
window.__gapMatrix = function(){
  const ids = window.__partIds(); const P = {}, B = {};
  for (const id of ids) {
    const b = window.__qaBox(id); if (!b) continue;
    B[id] = b;
    const p = window.__pts(id, 900); if (p && p.length) P[id] = p;
  }
  const boxDist = (a, b) => {
    let s = 0;
    for (let i = 0; i < 3; i++) {
      const d = Math.max(a.min[i] - b.max[i], b.min[i] - a.max[i], 0);
      s += d * d;
    }
    return Math.sqrt(s);
  };
  const res = {};
  const k = Object.keys(P);
  for (const a of k) {
    let best = 1e9;
    for (const b of k) {
      if (a === b) continue;
      if (boxDist(B[a], B[b]) > 0.05) continue;   // AABB 已远，跳过精确计算
      for (const pa of P[a]) {
        const pb = P[b];
        for (let i = 0; i < pb.length; i++) {
          const dx = pa[0] - pb[i][0], dy = pa[1] - pb[i][1], dz = pa[2] - pb[i][2];
          const d = dx * dx + dy * dy + dz * dz;
          if (d < best) best = d;
        }
      }
    }
    res[a] = Math.sqrt(best);
  }
  return res;
};
`,
})

const q = (fn, ...a) => page.evaluate(fn, ...a)
const wait = (ms) => page.waitForTimeout(ms)
const stats = () => q(() => window.__stats())
const state = () => q(() => window.__sceneState())
const partState = (id) => q((i) => window.__partState(i), id)
const setP = async (v) => { await page.locator('[data-testid="progress-slider"]').fill(String(v)); await wait(1400) }
const fpsSeries = (ms) => q((m) => new Promise((res) => {
  const t = []; let last = performance.now(); const t0 = last
  const tick = () => {
    const n = performance.now(); t.push(n - last); last = n
    if (n - t0 < m) requestAnimationFrame(tick)
    else { t.shift(); t.sort((a,b)=>a-b); const avg = t.reduce((s,v)=>s+v,0)/t.length
      res({ frames: t.length, avgMs: +avg.toFixed(2), fps: +(1000/avg).toFixed(1), p50: +t[Math.floor(t.length*0.5)].toFixed(2), p95: +t[Math.floor(t.length*0.95)].toFixed(2), max: +t[t.length-1].toFixed(2) }) }
  }
  requestAnimationFrame(tick)
}), ms)

/* ---------------- 1. 基础 ---------------- */
const ids = await q(() => window.__partIds())
R.data.partCount = ids.length
ok('零件注册数量 = 数据定义数量(33)', ids.length === 33, `${ids.length} 个`)
const s0 = await stats()
R.data.stats0 = s0
console.log('stats', JSON.stringify(s0))
ok('单帧 draw call 可测量', s0.drawCalls > 0, `calls=${s0.drawCalls} tris=${s0.triangles}`)

/* 关闭自动旋转，稳定取值 */
await page.locator('[data-testid="btn-autorotate"]').click()
await wait(600)

/* ---------------- 2. 几何 ---------------- */
const gaps = await q(() => window.__gapMatrix())
R.data.gaps = Object.fromEntries(Object.entries(gaps).map(([k, v]) => [k, +(v * 1000).toFixed(2)]))
const floating = Object.entries(gaps).filter(([, v]) => v * 1000 > 2.0).sort((a, b) => b[1] - a[1])
console.log('\n--- 装配态最近邻间隙 > 2mm 的零件（悬空嫌疑） ---')
floating.forEach(([id, v]) => console.log(`  ${id}: ${(v * 1000).toFixed(2)}mm`))
R.data.floating = floating.map(([id, v]) => ({ id, gapMm: +(v * 1000).toFixed(2) }))

const matStats = await q(() => window.__qaMatStats ? window.__qaMatStats() : null)

// AABB 重叠（只关注非包含关系的相邻零件）
const boxes = await q(() => {
  const out = {}
  const ids = window.__partIds()
  for (const id of ids) { const b = window.__qaBox(id); if (b) out[id] = b }
  return out
}).catch(() => null)
R.data.boxes = boxes

/* ---------------- 3. 拆解 ---------------- */
const prog = []
for (const p of [0, 20, 40, 60, 80, 100]) {
  await setP(p)
  const audit = await q(() => window.__audit())
  const st = await state()
  prog.push({ p, progress: +st.progress.toFixed(3), visible: audit.visible, total: audit.total, offscreen: audit.offscreen.length })
}
R.data.progressSweep = prog
console.log('\n进度扫描:', JSON.stringify(prog))

// 复原精度
await setP(0)
let maxOff = 0, maxRot = 0
for (const id of ids) {
  const s = await partState(id)
  maxOff = Math.max(maxOff, Math.hypot(...s.offset))
  maxRot = Math.max(maxRot, Math.abs(s.rot[0]), Math.abs(s.rot[1]), Math.abs(s.rot[2]))
}
ok('拆解后完全复原（位移残差 < 0.05mm）', maxOff * 1000 < 0.05, `残差 ${(maxOff * 1000).toFixed(4)}mm, 旋转 ${maxRot.toFixed(6)}rad`)

// 父子重复位移：follow 零件位移 = 自身 offset*t + 父 offset*tp
await setP(100)
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const dist = 0.86
let dblErr = 0, dblPart = null
for (const id of ids) {
  const s = await partState(id)
  if (!s.follow) continue
  const ps = await partState(s.follow)
  const [a, b] = s.window
  const t = ease(Math.min(1, Math.max(0, (1 - a) / (b - a))))
  const [pa, pb] = ps.window
  const tp = ease(Math.min(1, Math.max(0, (1 - pa) / (pb - pa))))
  const exp = [0, 1, 2].map((i) => (s.explode[i] * t + ps.explode[i] * tp) * dist)
  const err = Math.hypot(exp[0] - s.offset[0], exp[1] - s.offset[1], exp[2] - s.offset[2])
  if (err > dblErr) { dblErr = err; dblPart = id }
}
ok('父子级无重复位移（误差 < 0.2mm）', dblErr * 1000 < 0.2, `最大误差 ${(dblErr * 1000).toFixed(3)}mm @ ${dblPart}`)

// 拆解态零件是否互相重叠（AABB）
const overlapAt = async (label) => {
  const b = await q(() => { const out = {}; for (const id of window.__partIds()) { const x = window.__qaBox(id); if (x) out[id] = x } return out })
  const k = Object.keys(b); const res = []
  for (let i = 0; i < k.length; i++) for (let j = i + 1; j < k.length; j++) {
    const A = b[k[i]], B = b[k[j]]
    const ox = Math.min(A.max[0], B.max[0]) - Math.max(A.min[0], B.min[0])
    const oy = Math.min(A.max[1], B.max[1]) - Math.max(A.min[1], B.min[1])
    const oz = Math.min(A.max[2], B.max[2]) - Math.max(A.min[2], B.min[2])
    if (ox > 0 && oy > 0 && oz > 0) res.push([k[i], k[j], +(Math.min(ox, oy, oz) * 1000).toFixed(1)])
  }
  R.data['overlap_' + label] = res
  return res
}
const ovExp = await overlapAt('exploded')
console.log(`\n拆解态 AABB 重叠对数: ${ovExp.length}`)
ovExp.sort((a, b) => b[2] - a[2]).slice(0, 15).forEach(([a, b, p]) => console.log(`  ${a} × ${b}  ${p}mm`))
ok('拆解态零件互不重叠', ovExp.length === 0, `${ovExp.length} 对重叠`)

/* ---------------- 4. 交互 ---------------- */
console.log('\n=== 交互 ===')
await setP(0)
await wait(500)

// 4.1 零件树点击 → 选中
await page.locator('[data-testid="part-row-drone.topShell"]').click()
await wait(500)
let st = await state()
ok('零件树点击选中零件', st.selectedId === 'drone.topShell', `selectedId=${st.selectedId}`)

// 4.2 高亮
const emis = await q(() => {
  let g = null; window.__scene.traverse(o => { if (!g && o.name === 'drone.topShell') g = o })
  let out = []; g.traverse(o => { if (o.isMesh) { const m = Array.isArray(o.material) ? o.material : [o.material]; m.forEach(x => x && x.emissive && out.push(x.emissive.getHexString())) } })
  return out
})
ok('选中零件产生高亮（emissive=00c8ff）', emis.includes('00c8ff'), emis.slice(0, 4).join(','))

// 4.3 信息面板同步
const panelText = await page.locator('[data-testid="right-panel"]').innerText()
ok('信息面板同步显示所选零件', panelText.includes('主机身上盖') || panelText.includes('TOP-SHELL'), panelText.split('\n').slice(0, 3).join(' | '))

// 4.4 3D 拾取
const sp = await q(() => window.__screenPos('drone.propFL'))
if (sp && sp.inFront) {
  await page.mouse.click(sp.x, sp.y)
  await wait(600)
  st = await state()
  ok('3D 视口拾取零件', st.selectedId === 'drone.propFL', `selectedId=${st.selectedId}`)
} else ok('3D 视口拾取零件', false, '零件不在视口内')

// 4.5 隐藏 / 显示
await page.locator('[data-testid="vis-drone.propFL"]').click()
await wait(500)
const hid = await q(() => { const s = window.__partState('drone.propFL'); return { visible: s.visible, st: window.__sceneState() } })
ok('隐藏零件生效', hid.visible === false, `visible=${hid.visible}, hiddenCount=${hid.st.hiddenCount}`)
await page.locator('[data-testid="show-all-parts"]').click()
await wait(500)
const shown = await q(() => window.__partState('drone.propFL').visible)
ok('全部显示恢复零件', shown === true)

// 4.6 聚焦
await page.locator('[data-testid="focus-drone.mainBoard"]').click()
await wait(1600)
const cam = await q(() => window.__cam())
ok('零件聚焦（相机距离 < 0.5m）', cam.dist < 0.5, `dist=${cam.dist}`)

// 4.6b 滚轮缩放
const before = await q(() => window.__cam())
const box = await page.locator('canvas').boundingBox()
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
for (let i = 0; i < 5; i++) { await page.mouse.wheel(0, -220); await wait(80) }
await wait(1500)
const after = await q(() => window.__cam())
ok('滚轮可缩放且不被自动取景拉回', after.dist < before.dist * 0.85, `${before.dist} → ${after.dist}`)

// 4.7 重置视角
await page.locator('[data-testid="view-mode-btn"]').click()
await wait(300)
await page.locator('[data-testid="view-iso"]').click()
await wait(1800)
const cam2 = await q(() => window.__cam())
ok('视角重置回到取景距离', Math.abs(cam2.dist - cam2.fit) < 0.02, `dist=${cam2.dist} fit=${cam2.fit}`)

// 4.8 自动旋转
const az0 = await q(() => window.__ctrl().az)
await page.locator('[data-testid="btn-autorotate"]').click()
await wait(1500)
const az1 = await q(() => window.__ctrl().az)
ok('自动旋转生效', Math.abs(az1 - az0) > 0.02, `az ${az0} → ${az1}`)
await page.locator('[data-testid="btn-autorotate"]').click()
await wait(1200)
const az2 = await q(() => window.__ctrl().az)
await wait(1200)
const az3 = await q(() => window.__ctrl().az)
ok('关闭自动旋转后停止', Math.abs(az3 - az2) < 0.01, `az ${az2} → ${az3}`)

// 4.9 动画控制
await page.locator('[data-testid="btn-play"]').click()
await wait(1200)
const midP = await q(() => window.__sceneState().progress)
ok('播放拆解动画推进进度', midP > 0.05 && midP < 1, `progress=${midP.toFixed(3)}`)
await page.locator('[data-testid="btn-pause"]').click()
await wait(900)
const p1 = await q(() => window.__sceneState().progress)
await wait(800)
const p2 = await q(() => window.__sceneState().progress)
ok('暂停动画冻结进度', Math.abs(p2 - p1) < 0.002, `${p1.toFixed(3)} → ${p2.toFixed(3)}`)
await page.locator('[data-testid="btn-pause"]').click()
await page.locator('[data-testid="btn-restore"]').click()
await wait(2600)
const pr = await q(() => window.__sceneState().progress)
ok('复原按钮回到 0', pr < 0.001, `progress=${pr}`)

// 4.10 分级跳转
await page.locator('[data-testid="band-2"]').click()
await wait(2400)
const lv = await q(() => window.__sceneState().progress)
ok('分级 L2 跳转到 62%', Math.abs(lv - 0.62) < 0.02, `progress=${lv.toFixed(3)}`)

// 4.11 全屏
await page.locator('button[aria-label="全屏"]').click()
await wait(900)
let fsState = await q(() => !!document.fullscreenElement)
if (!fsState) {
  // 窗口未获得 OS 焦点时浏览器会拒绝 fullscreen 请求（无 user activation），重试一次
  await page.bringToFront()
  await wait(400)
  await page.locator('button[aria-label="全屏"]').click()
  await wait(1000)
  fsState = await q(() => !!document.fullscreenElement)
}
ok('全屏切换', fsState === true, `fullscreenElement=${fsState}`)
if (fsState) {
  // 用应用自身的按钮退出（Escape 由浏览器处理，自动化下时序不稳）
  await page.locator('button[aria-label="全屏"]').click()
  await wait(1200)
  const off = await q(() => !!document.fullscreenElement)
  ok('退出全屏', off === false, `fullscreenElement=${off}`)
}

// 4.12 模型切换
await page.locator('[data-testid="model-tab-controller"]').click()
await wait(2500)
const ctrlIds = await q(() => window.__partIds())
const st2 = await state()
ok('切换到遥控器模型', st2.model === 'controller' && ctrlIds.length > 10, `${ctrlIds.length} 个零件`)
await page.locator('[data-testid="model-tab-drone"]').click()
await wait(2500)
const backIds = await q(() => window.__partIds())
const st3 = await state()
ok('切回无人机模型完整', st3.model === 'drone' && backIds.length === 33, `${backIds.length} 个零件`)

/* ---------------- 5. 性能 ---------------- */
console.log('\n=== 性能 ===')
const fpsIdle = await fpsSeries(2500)
await setP(100)
const fpsExp = await fpsSeries(2500)
await setP(0)
R.data.performance = { fpsIdle, fpsExp, stats: await stats() }
console.log('FPS 装配态:', JSON.stringify(fpsIdle))
console.log('FPS 拆解态:', JSON.stringify(fpsExp))
console.log('stats:', JSON.stringify(R.data.performance.stats))

/* ---------------- 6. 资源泄漏 ---------------- */
/** 等待渲染稳定（后台/遮挡窗口下 rAF 会被节流，读数需要等到真实帧） */
const waitStable = async (timeout = 12000) => {
  const t0 = Date.now()
  let prev = null
  while (Date.now() - t0 < timeout) {
    const s = await stats()
    if (s.drawCalls > 400 && prev && s.drawCalls === prev.drawCalls && s.geometries === prev.geometries) return s
    prev = s
    await wait(400)
  }
  return stats()
}

const trace = []
for (let i = 0; i < 6; i++) {
  await page.locator('[data-testid="model-tab-controller"]').click()
  await wait(1600)
  await page.locator('[data-testid="model-tab-drone"]').click()
  await wait(1000)
  const s = await waitStable()
  trace.push({ i: i + 1, geometries: s.geometries, textures: s.textures, calls: s.drawCalls, tris: s.tris })
}
R.data.leak = trace
console.log('切换 6 次资源:', JSON.stringify(trace))
const g0 = trace[0].geometries, gN = trace[trace.length - 1].geometries
const t0 = trace[0].textures, tN = trace[trace.length - 1].textures
ok('模型切换几何体数量稳定', Math.abs(gN - g0) <= 2, `${g0} → ${gN}`)
ok('模型切换纹理数量稳定', Math.abs(tN - t0) <= 1, `${t0} → ${tN}`)

R.errors = errors
R.finishedAt = new Date().toISOString()
fs.writeFileSync(path.join(OUT, 'e2e-audit.json'), JSON.stringify(R, null, 2))
const failed = R.checks.filter((c) => !c.pass)
console.log(`\n=== ${R.checks.length - failed.length}/${R.checks.length} 通过，错误 ${errors.length} ===`)
errors.slice(0, 8).forEach((e) => console.log('  ' + e))
await browser.close()

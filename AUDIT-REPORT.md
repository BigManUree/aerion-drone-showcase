# AERION X9 PRO · Three.js 无人机展示系统 独立质量审计报告

审计时间：2026-11-18 · 审计方式：源代码静态审查 + 真实浏览器端到端实测（Edge 143 / ANGLE D3D11 / NVIDIA RTX 4060 Laptop）
被测版本：dev `http://127.0.0.1:5273` 与生产构建 `http://127.0.0.1:4173`（两者结果一致）

---

## 1. 功能完成清单

| 模块 | 功能 | 状态 | 证据 |
|---|---|---|---|
| 模型 | 无人机 33 个独立零件 | 完成 | `src/data/droneParts.ts:16-525`，运行时 `__partIds()` = 33 |
| 模型 | 遥控器 17 个独立零件 | 完成 | `src/data/controllerParts.ts:13-239`，运行时 = 17 |
| 模型 | 参数化曲面建模（放样 / 扫掠 / 旋成） | 完成 | `src/three/models/shared/geometry.ts`，见 §2 |
| 拆解 | 0~100% 连续进度、四级分层 | 完成 | 滑块 / 分级按钮 / 播放 / 暂停 / 复原均实测通过 |
| 拆解 | 单零件独立拆解 | 完成 | `useExplodeActions.togglePart`，零件树行内按钮 |
| 拆解 | 父子跟随不重复位移 | 完成 | 实测最大误差 0.000 mm |
| 交互 | 零件选择（3D 拾取 + 零件树） | 完成 | 点击 propFL → selectedId=drone.propFL |
| 交互 | 选中高亮（emissive 0x00C8FF） | 完成 | 材质 emissive 实测为 `00c8ff` |
| 交互 | 零件树 / 信息面板同步 | 完成 | 面板标题随选中切换 |
| 交互 | 模型切换（无人机 ↔ 遥控器） | 完成 | 33 ↔ 17 零件，相机自动重取景 |
| 交互 | 视角重置 / 四向预设视图 | 完成 | dist 回到 fit 值（误差 <0.02） |
| 交互 | 自动旋转 | 完成 | 方位角 0.655→0.790 rad，关闭后静止 |
| 交互 | 隐藏 / 全部显示 | 完成 | visible=false，hiddenCount 同步 |
| 交互 | 全屏 | 完成 | fullscreenElement=true / false |
| 交互 | 动画控制（播放/暂停/复原/速度/分级） | 完成 | 全部断言通过 |
| 交互 | 零件聚焦（双击 / 树内按钮） | 完成 | 相机距 0.34 m |
| 交互 | 滚轮缩放 | 完成（本次修复） | 0.34 → 0.27 m 且不被拉回 |
| 渲染 | 三主题背景 / 网格 / 坐标轴 / 标注 | 完成 | 设置面板逐项实测 |
| 性能 | 资源释放（切换模型 6 次） | 完成（本次修复） | geometries 132 恒定，textures 33 恒定 |

---

## 2. 模型质量问题

### 2.1 独立零件 —— 合格
33 + 17 个零件全部注册进 `partRegistry`，每个零件是独立的 `Part` 容器（外层 group 承载拆解位移，内层 group 承载装配变换，`src/three/models/shared/Part.tsx:104-135`）。零件粒度合理（机臂/电机/桨叶/云台三轴/相机/视觉模组/电池/仓/内部电子件/螺钉组各自独立）。

### 2.2 是否大量简单几何体拼接 —— 合格
模型网格共 270 个，几何体构成为：

| 几何类型 | 数量 | 说明 |
|---|---|---|
| LatheGeometry | 152 | 电机钟形壳、桨毂、镜头组、GPS 罩、螺钉 |
| ExtrudeGeometry | 49 | `chamferBox` 倒角块（带 bevel，非裸 Box） |
| 自定义 BufferGeometry | 61 | 超椭圆放样机身、扫掠机臂、扫掠线束、合并件 |
| PlaneGeometry / CylinderGeometry / CircleGeometry | 8 | 丝印面、配重孔、指示灯 |
| **BoxGeometry** | **0** | 未出现裸立方体拼接 |

### 2.3 模型穿插 —— 发现 2 处，已修复
| 位置 | 问题 | 证据 |
|---|---|---|
| `drone.batteryBay` 密封圈 | lathe 本身以 Y 为轴，代码又加 `rotation=[-90°,0,0]`，直径 82 mm 的密封圈被立起来，竖直穿透整个机身（装配态 Y 跨度 14.7→96.7 mm） | 修复前 AABB：Y 82 mm |
| 电池 / 灯带 / 上盖 | 拆解到 100% 时三者仍在同一空间（最大穿透 24.6 mm） | 修复前 p=1 重叠 3 对 |

### 2.4 零件悬空 —— 未发现明显悬空
用 900 点/件的表面点云做最近邻距离统计（AABB 先行剪枝），装配态最小间隙 > 2 mm 的零件：

| 零件 | 最近表面间隙 |
|---|---|
| drone.heatSink | 13.5 mm |
| drone.visionRear | 10.1 mm |
| drone.gps | 9.5 mm |
| drone.internalBracket | 8.2 mm |

以上为**内部嵌入式零件**（散热模块、后视模组、GPS、内部支架），其表面被外壳包覆，点云最小距离反映的是"与外壳内壁的距离"，不代表视觉悬空。**外部可见件**（机臂、电机、桨、起落架、云台、电池、螺钉）间隙均 < 2.4 mm，贴合正常。该项结论标注为「点云采样 ±2 mm 精度，视觉复核未见悬空」。

### 2.5 机械结构合理性 —— 发现 2 处不合理，已修复
| 位置 | 问题 | 处理 |
|---|---|---|
| 云台保护罩 | 原实现是一根悬空钢丝环（U 形扫掠管，两端无支撑），视觉上像提手，且与"210° 半开放罩壳"的设计说明不符 | 重做为带厚度的 210° 弧面罩壳 + 两条根部连接板（`Gimbal.tsx:209-238`） |
| 起落架脚垫 | 脚垫 `rotateX(90°)` 把圆盘立了起来，视觉上像轮子/端盖，不是接地脚垫 | 改为朝下的平底圆角脚垫，两只脚垫底面统一落在 y=-0.0325 接地面 |

### 2.6 材质重复 —— 存在，未修复（见 §5）
- 材质实例 **270 个**，按 (类型|颜色|金属度|粗糙度|自发光|透明|面朝向) 去重后仅 **82 种**，冗余 3.3 倍。
- 最典型：`MeshStandardMaterial #c9cfd6 / m=1 / r=0.2`（螺钉钢）被实例化 **59 次**。
- 影响：uniform 上传与状态切换变多，且无法按材质合并网格（draw call 优化受阻）。

### 2.7 模型比例 —— 合格
机身 362 mm（含机头收口）、轴距 492 mm、桨径 214 mm、整机高约 90 mm，与消费级航拍机（Mavic 级）比例一致；电机 Ø28 mm、桨毂 Ø26 mm、镜头 Ø31 mm 比例合理。

---

## 3. 已修复问题（逐项，含改动前后）

| # | 问题 | 文件 | 改动前 → 改动后 | 验证 |
|---|---|---|---|---|
| 1 | 滚轮缩放完全失效：`CameraRig` 每帧把相机距离拉回自动取景值 | `src/three/scene/ShowcaseScene.tsx:57,233-254` | 新增 `manualDist` 闸门：滚轮 / 聚焦置位，切视图、切模型、改进度时解锁 | 修复前 wheel×6 → dist 1.307→1.305（无效）；修复后 0.34→0.27 |
| 2 | 零件聚焦被同一逻辑立刻拉回 | 同上 `:196-199` | 聚焦后置 `manualDist=true` | dist=0.34 保持 |
| 3 | 电池仓密封圈竖直穿模 | `src/three/models/drone/Body.tsx:287-293` | 删除多余的 `rotation={[-π/2,0,0]}` | 仓体 Y 跨度 82 mm → 21.4 mm |
| 4 | 电池仓整体高出上盖 6 mm，形成黑色托盘 | `Body.tsx:268` | 仓体 y 0.0345 → 0.0272 | 电池落入凹槽，无外露托盘 |
| 5 | 拆解态电池/灯带/上盖互相穿插 | `src/data/droneParts.ts:60,478` | battery `[0,0.20,0.11]`→`[0,0.37,0.08]`；led `[0,0.25,0]`→`[0,0.30,0]` | p=1 重叠对 3 → 0 |
| 6 | 遥控器拆解态 8 对零件仍相交 | `src/data/controllerParts.ts` | 前后壳 ±0.108→±0.125/0.145（z 0.052→0.118）、屏 0.115→0.168、按键/摇杆底座/电池/骨架重排 | 重叠 8 → 0 |
| 7 | 模型切换几何体持续泄漏（+51/次） | `DroneModel.tsx`、`ControllerModel.tsx` | 挂载时登记几何体，卸载时逐个 dispose（React 卸载时 r3f 已摘除子节点，cleanup 里 traverse 拿不到） | 切换 6 次：179→199 增长 → **132 恒定** |
| 8 | 纹理泄漏（电池丝印 / HUD 画布贴图） | `Body.tsx:44-46`、`controller/Shell.tsx:29-31` | `useEffect(() => () => tex.dispose(), [tex])` | textures 切换 6 次恒定 |
| 9 | 无效后处理通道 SSAO：每帧多渲 455 draw call，输出画面与关闭时**逐像素一致** | `ShowcaseScene.tsx:706-712` | 移除 SSAO 与 `enableNormalPass`，更新设置面板管线文案 | 截图 md5 完全相同；draw call 1203→932 |
| 10 | 微小件投射阴影：螺钉/芯片/灯珠在 2048² 阴影图上不足 1 px | `ShowcaseScene.tsx:552-580` | 按包围球半径 < 6 mm 关闭 castShadow，且只作用于模型本体 | draw call 1205→932 |
| 11 | 模型切换后新网格拿不到阴影标记 | 同上 | `ShadowFlags` 依赖 `model`，并在 `<Models/>` 之后 | — |
| 12 | 云台保护罩造型不合理 | `Gimbal.tsx:209-238` | 钢丝环 → 210° 弧面罩壳 + 连接板 | 见 §2.5 |
| 13 | 起落架脚垫朝向错误 | `Sensors.tsx:150-166,193-197` | 立起的圆盘 → 朝下平底脚垫，统一接地面 | 见 §2.5 |
| 14 | GPS 穹顶近乎全黑，视觉上像上盖开了一个洞 | `Body.tsx:200-202` | 颜色 `#20252b` → `#39414a`，金属度 0.18→0.35 | 见截图 |
| 15 | 侧面散热百叶外凸成锯齿 | `geometries.ts:204` | 下沉 1.6 mm → 3.4 mm | — |
| 16 | 全屏按钮快速连点会被浏览器拒绝 | `TopBar.tsx:41-42,67-79` | 增加 `fsBusy` 闸门 | 连续进出 3 次全部成功 |
| 17 | 首屏单包 1.65 MB | `vite.config.ts:11-31` | manualChunks 拆分 three/react/vendor | 主包 174 KB，three 1.17 MB 可长期缓存 |

**改动明细（原值 → 新值）已包含在上表；全部为源码修改，无二进制改动。回滚方式：`git checkout -- <file>`（仓库未初始化 git 时，可按上表逐项还原数值）。**

---

## 4. 未完成问题 / backlog

| # | 问题 | 影响 | 建议修复 |
|---|---|---|---|
| B1 | 材质实例 270 / 唯一 82，冗余 3.3× | 状态切换多，阻碍按材质合批 | 建 `MATERIAL_CACHE`：以 presets 为 key 复用 `MeshStandardMaterial`，`<mesh material={mat.screwMetal}>` 替换全部 270 处 JSX 材质 |
| B2 | draw call 仍为 932/帧（主渲染 271 + 接触阴影 454 + 阴影图 + 后期 ~23） | 低端集显压力偏大 | 接触阴影按需刷新（闲置帧跳过）；或把 33 个零件按"同材质子网格"合并，可再降 30~40% |
| B3 | 桨叶在掠射角下退化为一条细线（场景内 `Line` 对象仅 AxesHelper，可排除引线残留，属 NACA 翼型几何在 0.75~1.2 mm 实厚下的正常投影），近景观感偏薄 | 近景质感 | 如需更"厚实"，把 `propellerBladeGeometry` 的 `thickness` 0.13 → 0.17（实厚约 1.6 mm），属展示化取舍 |
| B4 | 起落架是"单管雪橇式"，与主流四点折叠腿不同 | 与产品描述（折叠机身）不完全一致 | 如需贴近实机，改为两条独立支腿 + 折叠铰 |
| B5 | 电池与上盖之间无真实开仓结构（贴在上盖凹槽内） | 拆解到电池时上盖无开口，逻辑上"取不出来" | 上盖放样时开电池口，或把电池改为尾部插入式 |
| B6 | 未测低端 GPU / 移动端帧率与触屏双指缩放 | 覆盖度 | 需在集显 / 手机端复测；当前仅验证 RTX 4060 + 桌面滚轮 |
| B7 | `heatSink / gps / visionRear` 与外壳的间隙仅点云估算 | 精度 ±2 mm | 若需精确，用三角形级距离或射线穿透测试 |

---

## 5. 测试结果

### 5.1 端到端自动化（`scripts/e2e-audit.mjs`，25 项 + 1 项退出全屏）
生产构建实测：**26/26 通过，页面错误 0**。关键断言：

```
PASS  零件注册数量 = 数据定义数量(33)
PASS  拆解后完全复原（位移残差 < 0.05mm）— 残差 0.0000mm, 旋转 0.000000rad
PASS  父子级无重复位移（误差 < 0.2mm）— 最大误差 0.000mm
PASS  拆解态零件互不重叠 — 0 对重叠
PASS  选中零件产生高亮（emissive=00c8ff）
PASS  3D 视口拾取零件 — selectedId=drone.propFL
PASS  隐藏零件生效 / 全部显示恢复
PASS  零件聚焦 — dist=0.34
PASS  滚轮可缩放且不被自动取景拉回 — 0.34 → 0.27
PASS  视角重置回到取景距离 — dist=1.344 fit=1.344
PASS  自动旋转生效 / 关闭后停止
PASS  播放 / 暂停 / 复原 / 分级 L2 → 62%
PASS  全屏切换 / 退出全屏
PASS  模型切换 33 ↔ 17 零件
PASS  模型切换几何体数量稳定 — 132 → 132
PASS  模型切换纹理数量稳定 — 33 → 33
```

遥控器拆解专项：p=0 时 30 对 AABB 重叠（外壳包覆属正常嵌套），p=100 时 **0 对**。

### 5.2 性能（1600×900，Edge 143，RTX 4060 Laptop，垂直同步开启）

| 指标 | 修复前 | 修复后 |
|---|---|---|
| 单帧 draw call | 1205 | **932**（-22.7%） |
| 单帧三角形 | 1,314,789 | **1,048,129**（-20.3%） |
| 场景网格 / 模型三角形 | 270 / 266,658 | 270 / 266,658 |
| 几何体（切换 6 次后） | 179 → 199 持续增长 | **132 恒定** |
| 纹理（切换 6 次后） | 37 | **33 恒定** |
| FPS 装配态 | 60 | **60**（p50 16.7 ms，p95 17.2 ms） |
| FPS 拆解态 | 60 | **60**（p50 16.7 ms，p95 17.2 ms） |
| 首屏 JS | 单包 1.65 MB（gzip 498 KB） | 174 KB 主包 + three 1.17 MB + react 234 KB + vendor 70 KB |

GPU 占用：浏览器不暴露硬件计数，以帧时间作代理——p95 17.2 ms 说明帧预算基本被 vsync 封顶，无掉帧；软件渲染（SwiftShader）下为 1.5~2 FPS，仅影响无 GPU 环境。

### 5.3 内存
切换模型 6 次后 `renderer.info.memory` 的 geometries / textures 完全不变；JS 堆在 45~70 MB 区间波动（GC 后回落），无单调增长。

---

## 6. 项目启动命令

```bash
cd C:/Users/administer/WorkBuddy/spaces/2026_11_17_19-45-15

npm install          # 首次
npm run dev          # 开发：http://127.0.0.1:5273/
npm run build        # 生产构建（含 tsc --noEmit 类型检查）
npm run preview      # 预览构建产物：http://127.0.0.1:4173/
```

审计脚本：`node scripts/e2e-audit.mjs --url=http://127.0.0.1:4173/?qa=1`
（`?qa=1` 会注入 `window.__scene/__stats/__partState/__audit` 等调试钩子与逐帧 draw call 探针）

---

## 7. 项目目录结构

```
2026_11_17_19-45-15/
├── index.html
├── package.json / package-lock.json
├── tsconfig.json / vite.config.ts / tailwind.config.js / postcss.config.js
├── README.md
├── AUDIT-REPORT.md                ← 本报告
├── scripts/
│   ├── e2e-audit.mjs              ← 独立审计脚本（几何/拆解/交互/性能）
│   ├── audit-shots.mjs            多状态截图
│   └── (既有调试/截图脚本 17 个)
├── src/
│   ├── main.tsx / App.tsx / index.css
│   ├── types/index.ts
│   ├── data/
│   │   ├── droneParts.ts          33 个无人机零件定义（含拆解位移）
│   │   ├── controllerParts.ts     17 个遥控器零件定义
│   │   ├── index.ts               零件/运动/跟随关系统一装配
│   │   └── motion.ts              四级拆解时间窗与缓动
│   ├── store/useAppStore.ts       全局状态（进度/选中/隐藏/视图）
│   ├── hooks/
│   │   ├── useExplodeActions.ts   拆解动作统一入口
│   │   └── useLayout.ts           响应式布局
│   ├── three/
│   │   ├── scene/
│   │   │   ├── ShowcaseScene.tsx  Canvas / 相机装配 / 后期 / QA 钩子
│   │   │   └── themes.ts          三套背景主题
│   │   ├── models/
│   │   │   ├── shared/
│   │   │   │   ├── geometry.ts    放样/扫掠/旋成/倒角块等参数化几何库
│   │   │   │   └── Part.tsx       零件容器（拆解位移 / 高亮 / 拾取）
│   │   │   ├── drone/
│   │   │   │   ├── DroneModel.tsx 根组 + 几何体释放
│   │   │   │   ├── Body.tsx       上下壳 / 电池 / 电池仓 / 散热 / GPS / 灯
│   │   │   │   ├── Arms.tsx       四条折叠臂 / 电机 / 螺旋桨
│   │   │   │   ├── Gimbal.tsx     三轴云台 / 相机 / 镜头 / 保护罩
│   │   │   │   ├── Sensors.tsx    视觉模组 / 起落架
│   │   │   │   ├── Internals.tsx  主板 / 电源 / 线束 / 内部支架
│   │   │   │   ├── geometries.ts  机身壳体放样与细节几何
│   │   │   │   └── config.ts      机身截面 / 机臂 / 云台基准参数
│   │   │   └── controller/
│   │   │       ├── ControllerModel.tsx / Shell.tsx / Controls.tsx
│   │   │       ├── Internals.tsx / geometries.ts / config.ts
│   │   ├── animations/
│   │   │   ├── ExplodeDriver.tsx  逐帧统一进度驱动（父子位移叠加一次）
│   │   │   └── explode.ts         GSAP 进度补间 / 自动播放 / 暂停
│   │   ├── core/
│   │   │   ├── PartRegistry.ts    零件对象注册表
│   │   │   └── CameraBridge.ts    相机 → DOM 标注层
│   │   └── materials/palette.ts   PBR 材质库 + 程序化贴图
│   ├── components/
│   │   ├── layout/  TopBar / BottomBar / LeftPanel / RightPanel /
│   │   │            SceneToolbar / ViewportOverlay / AnnotationLayer
│   │   ├── panels/  PartTree / PartInfo / SettingsPanel / HelpOverlay
│   │   └── ui/      Button / Toggle / Led
│   └── utils/cn.ts
├── dist/                          构建产物
└── test-output/audit/             审计截图与 JSON 结果
```

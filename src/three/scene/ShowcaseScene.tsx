import { Suspense, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Grid, Lightformer, OrbitControls } from '@react-three/drei'
import { Bloom, EffectComposer, SMAA, Vignette } from '@react-three/postprocessing'
import { useAppStore } from '../../store/useAppStore'
import { DroneModel } from '../models/drone/DroneModel'
import { ControllerModel } from '../models/controller/ControllerModel'
import { partRegistry } from '../core/PartRegistry'
import { cameraBridge } from '../core/CameraBridge'
import { ExplodeDriver } from '../animations/ExplodeDriver'
import { progressMeta } from '../animations/explode'
import { SCENE_THEMES } from './themes'

/** 各模型的取景球心与基准机位（iso 方向的向量长度即基准距离） */
const VIEWS = {
  drone: {
    target: new THREE.Vector3(0, 0.012, 0),
    base: new THREE.Vector3(0.665, 0.362, 0.866),
    fov: 32,
    axesOffset: 0.52,
    axesSize: 0.16,
  },
  controller: {
    target: new THREE.Vector3(0, 0.004, 0),
    base: new THREE.Vector3(0.372, 0.182, 0.53),
    fov: 32,
    axesOffset: 0.3,
    axesSize: 0.1,
  },
}

/** 视图预设方向（以取景球心为原点，单位向量） */
const VIEW_DIRS: Record<string, [number, number, number]> = {
  iso: [0, 0, 0], // 占位：iso 使用模型自身基准方向
  front: [0, 0.1, 1],
  top: [0.0008, 1, 0.12],
  side: [1, 0.14, 0.02],
}

/** 自动旋转角速度（弧度/秒）：约 70 秒一圈 */
const AUTO_ROTATE_SPEED = 0.09
const UP = new THREE.Vector3(0, 1, 0)
/** QA 模式（?qa=1）：注入调试钩子与逐帧性能探针 */
const QA = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('qa')

/** 非等轴视图的额外距离系数（正交方向投影面积更大） */
const VIEW_DIST_K = { iso: 1, front: 1.06, top: 1.18, side: 1.08 }

function CameraRig({ controlsRef }: { controlsRef: React.RefObject<any> }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const gl = useThree((s) => s.gl)
  const size = useThree((s) => s.size)
  const model = useAppStore((s) => s.model)
  const token = useAppStore((s) => s.cameraToken)
  const viewMode = useAppStore((s) => s.viewMode)
  const focus = useAppStore((s) => s.focus)
  const firstRun = useRef(true)
  const viewRuns = useRef(0)
  const lastFrame = useRef(performance.now())
  /**
   * 用户手动调整过相机距离后置位：此后不再每帧把距离拉回"自动取景值"，
   * 否则滚轮缩放 / 零件聚焦会被逐帧覆盖（表现为缩放完全无效）。
   * 切换视图、切换模型、重置视角、改变拆解进度时解除。
   */
  const manualDist = useRef(false)
  const lastProg = useRef(-1)

  /**
   * 相机动画不依赖第三方补间：每帧按真实经过时间插值，
   * 低帧率（软件渲染 / 低端机）下也能在预定时间内到位，不会被进度推拉打断。
   */
  const anim = useRef<{
    fromPos: THREE.Vector3
    toPos: THREE.Vector3
    fromTgt: THREE.Vector3
    toTgt: THREE.Vector3
    start: number
    dur: number
  } | null>(null)

  /**
   * 取景距离：按当前可见零件的真实包围球（水平 / 垂直分开计算）推导，
   * 画布宽高比、面板开合、拆解进度变化都能自动适配，不必调魔法系数。
   */
  /**
   * 取景距离：按当前可见零件的世界包围盒（Box3）逐个投影求解最小相机距离。
   * 结果按帧节流缓存，避免每帧遍历几何；视图 / 尺寸 / 拆解变化时自动失效。
   */
  const frameRef = useRef({ at: 0, key: '', dist: 1.2 })
  const boxTmp = useRef(new THREE.Box3())
  const centerTmp = useRef(new THREE.Vector3())

  /** 当前视图方向（单位向量） */
  const viewDir = () => {
    const view = VIEWS[model]
    const d = VIEW_DIRS[viewMode] ?? VIEW_DIRS.iso
    const isIso = d[0] === 0 && d[1] === 0 && d[2] === 0
    return isIso ? view.base.clone().normalize() : new THREE.Vector3(d[0], d[1], d[2]).normalize()
  }

  /**
   * 精确取景距离：把每个可见零件的包围球按当前视图基向量投影，
   * 解出「球心横向偏移 + 半径」恰好落在安全框内的最小相机距离，
   * 取所有零件的最大值 —— 任何宽高比 / 拆解度都不会切边，也不会过远。
   */
  const fitDistance = (dirK = 1, force = false) => {
    const st = useAppStore.getState()
    const key = `${model}|${viewMode}|${size.width}x${size.height}|${Math.round(st.progress * 60)}|${
      partRegistry.version
    }|${Object.keys(st.hidden).length}`
    const now = performance.now()
    if (!force && key === frameRef.current.key) return frameRef.current.dist * dirK
    if (!force && now - frameRef.current.at < 90) return frameRef.current.dist * dirK

    const view = VIEWS[model]
    const target = view.target
    const aspect = Math.max(0.3, size.width / Math.max(1, size.height))
    const vHalf = THREE.MathUtils.degToRad(camera.fov) / 2
    const tanV = Math.tan(vHalf)
    const tanH = tanV * aspect
    const dir = viewDir()
    const right = new THREE.Vector3().crossVectors(UP, dir).normalize()
    const upv = new THREE.Vector3().crossVectors(dir, right).normalize()
    const SAFE = 0.88
    const box = boxTmp.current
    const c = centerTmp.current
    let need = 0
    let count = 0
    for (const e of partRegistry.entries()) {
      if (!e.outer.visible) continue
      box.setFromObject(e.inner)
      if (box.isEmpty()) continue
      count++
      box.getCenter(c).sub(target)
      const depth = c.dot(dir)
      const ox = Math.abs(c.dot(right)) + (box.max.x - box.min.x) / 2
      const oy = Math.abs(c.dot(upv)) + (box.max.y - box.min.y) / 2
      need = Math.max(need, depth + ox / (SAFE * tanH), depth + oy / (SAFE * tanV))
    }
    const base = view.base.length()
    const dist = count ? THREE.MathUtils.clamp(need * 1.03, base * 0.7, base * 3.6) : base
    frameRef.current = { at: now, key, dist }
    return dist * dirK
  }

  /** 依据当前视图模式计算机位 */
  const viewPose = () => {
    const view = VIEWS[model]
    const dir = viewDir()
    const dist = fitDistance(VIEW_DIST_K[viewMode], true)
    return { target: view.target.clone(), pos: view.target.clone().addScaledVector(dir, dist) }
  }

  const animateTo = (pos: THREE.Vector3, target: THREE.Vector3, dur: number) => {
    const c = controlsRef.current
    if (dur <= 0) {
      camera.position.copy(pos)
      if (c) {
        c.target.copy(target)
        c.update()
      }
      camera.lookAt(target)
      anim.current = null
      return
    }
    anim.current = {
      fromPos: camera.position.clone(),
      toPos: pos.clone(),
      fromTgt: c ? c.target.clone() : target.clone(),
      toTgt: target.clone(),
      start: performance.now(),
      dur,
    }
  }

  // 模型切换 / 视图模式切换 / 画布尺寸变化 / 重置视角
  useEffect(() => {
    if (!controlsRef.current) return
    viewRuns.current++
    manualDist.current = false
    const pose = viewPose()
    const dur = firstRun.current ? 0 : 0.9
    firstRun.current = false
    camera.fov = VIEWS[model].fov
    camera.updateProjectionMatrix()
    animateTo(pose.pos, pose.target, dur)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, model, viewMode, size.width, size.height, camera, controlsRef])

  // 聚焦零件
  useEffect(() => {
    if (!focus) return
    const c = controlsRef.current
    const p = partRegistry.worldPosition(focus.id)
    if (!c || !p) return
    const dir = new THREE.Vector3().subVectors(camera.position, c.target).normalize()
    if (dir.lengthSq() < 0.01) dir.set(0.6, 0.5, 0.7).normalize()
    const dest = p.clone().add(dir.multiplyScalar(0.34))
    animateTo(dest, p, 0.9)
    // 聚焦是用户主动拉近，锁定距离，不要被自动取景立刻拉回
    manualDist.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.token])

  // 逐帧：先执行机位动画，空闲时按拆解进度缓慢推拉保证取景
  useFrame(() => {
    // 自行计时：软件渲染下实际帧率很低，用真实帧间隔驱动，避免动画变慢
    const now = performance.now()
    const delta = Math.min(0.5, Math.max(0, (now - lastFrame.current) / 1000))
    lastFrame.current = now
    const c = controlsRef.current
    const a = anim.current
    if (a) {
      const raw = a.dur > 0 ? (performance.now() - a.start) / (a.dur * 1000) : 1
      const t = Math.min(1, Math.max(0, raw))
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      camera.position.lerpVectors(a.fromPos, a.toPos, e)
      if (c) {
        c.target.lerpVectors(a.fromTgt, a.toTgt, e)
        c.update()
      } else {
        camera.lookAt(a.toTgt)
      }
      if (t >= 1) anim.current = null
      return
    }
    if (!c) return
    // 拆解进度变化（滑块 / 分级 / 自动播放）恢复自动取景，保证展开后不切边
    const pr = useAppStore.getState().progress
    if (pr !== lastProg.current) {
      lastProg.current = pr
      manualDist.current = false
    }
    // 自动旋转：直接绕取景球心绕 Y 轴推进，避免依赖控制器内部的帧时序
    if (useAppStore.getState().autoRotate) {
      const offset = camera.position.clone().sub(c.target)
      offset.applyAxisAngle(UP, AUTO_ROTATE_SPEED * delta)
      camera.position.copy(c.target).add(offset)
    }
    // 自动取景：仅在用户未手动缩放时生效，避免与滚轮 / 聚焦抢写相机距离
    if (!manualDist.current) {
      const desired = fitDistance(VIEW_DIST_K[viewMode])
      const cur = camera.position.distanceTo(c.target)
      if (cur > 1e-5 && Math.abs(desired - cur) >= 0.0025) {
        const k = 1 - Math.exp(-delta * 7)
        const next = cur + (desired - cur) * k
        camera.position.sub(c.target).setLength(next).add(c.target)
      }
    }
    // 每帧推进控制器：自动旋转与阻尼在任何帧率下都生效
    c.update(delta)
  })

  // 滚轮 / 双指缩放属于用户主动改变距离：置位后停止自动拉距
  useEffect(() => {
    const el = gl.domElement
    const onWheel = () => {
      manualDist.current = true
    }
    el.addEventListener('wheel', onWheel, { passive: true })
    return () => el.removeEventListener('wheel', onWheel)
  }, [gl])

  // 相机桥：把相机交给 DOM 标注层
  useEffect(() => {
    cameraBridge.camera = camera
    cameraBridge.canvas = gl.domElement
    return () => {
      if (cameraBridge.camera === camera) cameraBridge.camera = null
    }
  }, [camera, gl])

  // QA 钩子（仅在 ?qa=1 时注入）：用于自动化测试定位相机与读取场景状态
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!new URLSearchParams(window.location.search).has('qa')) return
    const w = window as any
    w.__gl = gl
    w.__ctrl = () => {
      const c = controlsRef.current
      return c
        ? {
            az: +c.getAzimuthalAngle().toFixed(5),
            polar: +c.getPolarAngle().toFixed(5),
            dist: +c.getDistance().toFixed(5),
            target: c.target.toArray().map((v: number) => +v.toFixed(4)),
            autoRotate: Boolean(c.autoRotate),
            damping: Boolean(c.enableDamping),
            frame: gl.info.render.frame,
          }
        : null
    }
    w.__cam = () => ({
      pos: camera.position.toArray().map((v) => +v.toFixed(3)),
      target: controlsRef.current
        ? [controlsRef.current.target.x, controlsRef.current.target.y, controlsRef.current.target.z]
        : null,
      dist: controlsRef.current
        ? +camera.position.distanceTo(controlsRef.current.target).toFixed(3)
        : -1,
      fov: camera.fov,
      fit: +fitDistance().toFixed(3),
      viewRuns: viewRuns.current,
    })
    w.__partPos = (id: string) => {
      const p = partRegistry.worldPosition(id)
      return p ? p.toArray() : null
    }
    /** 零件屏幕坐标（CSS 像素，含画布偏移），供自动化点击 3D 零件 */
    w.__screenPos = (id: string) => {
      const p = partRegistry.worldPosition(id)
      if (!p) return null
      const ndc = p.clone().project(camera)
      const rect = gl.domElement.getBoundingClientRect()
      return {
        x: Math.round(rect.left + (ndc.x * 0.5 + 0.5) * rect.width),
        y: Math.round(rect.top + (-ndc.y * 0.5 + 0.5) * rect.height),
        inFront: ndc.z < 1,
      }
    }
    w.__stats = () => {
      let meshes = 0
      let tris = 0
      const scene = (window as any).__scene
      if (scene) {
        scene.traverse((o: any) => {
          if (o.isMesh) {
            meshes++
            const g = o.geometry
            tris += g.index ? g.index.count / 3 : g.attributes.position.count / 3
          }
        })
      }
      const frame = (window as any).__lastCalls ?? {}
      return {
        meshes,
        tris: Math.round(tris),
        // 单帧真实 draw call（含阴影 / SSAO / 后期各 pass），由 PerfProbe 逐帧采集
        drawCalls: frame.calls ?? -1,
        triangles: frame.tris ?? -1,
        geometries: frame.geometries ?? gl.info.memory.geometries,
        textures: frame.textures ?? gl.info.memory.textures,
        programs: frame.programs ?? -1,
      }
    }
    w.__partIds = () => partRegistry.entries().map((e) => e.id)
    w.__explodeMeta = () => ({
      ...progressMeta(),
      progress: useAppStore.getState().progress,
      paused: useAppStore.getState().paused,
      autoDir: useAppStore.getState().autoDir,
      speed: useAppStore.getState().speed,
    })
    w.__partState = (id: string) => {
      const e = partRegistry.get(id)
      if (!e) return null
      return {
        offset: e.outer.position.toArray().map((v) => +v.toFixed(4)),
        rot: [e.outer.rotation.x, e.outer.rotation.y, e.outer.rotation.z].map((v) => +v.toFixed(4)),
        inner: e.inner.position.toArray().map((v) => +v.toFixed(4)),
        visible: e.outer.visible && e.inner.visible,
        window: e.motion.window,
        level: e.motion.level,
        explode: e.motion.offset,
        explodeRot: e.motion.rot,
        follow: e.motion.follow ?? null,
      }
    }
    /** 场景状态快照：用于验证可见性 / 网格 / 坐标轴 / 背景 / 视图模式 */
    w.__sceneState = () => {
      const st = useAppStore.getState()
      const scene = (window as any).__scene as THREE.Scene | undefined
      let gridVisible = false
      let axesFound = false
      scene?.traverse((o: any) => {
        if (o.type === 'GridHelper' || o.name === 'scene-grid') gridVisible = gridVisible || o.visible
        if (o.type === 'AxesHelper' || o.name === 'scene-axes') axesFound = axesFound || o.visible
      })
      const hiddenList = partRegistry.entries().filter((e) => !e.outer.visible).map((e) => e.id)
      return {
        model: st.model,
        progress: st.progress,
        selectedId: st.selectedId,
        hiddenCount: Object.keys(st.hidden).length,
        hiddenVisibleInScene: hiddenList.length,
        grid: st.grid,
        gridVisible,
        axes: st.axes,
        axesFound,
        annotations: st.annotations,
        bg: st.bg,
        viewMode: st.viewMode,
        autoRotate: st.autoRotate,
        speed: st.speed,
        camera: {
          pos: camera.position.toArray().map((v) => +v.toFixed(3)),
          dist: controlsRef.current ? +camera.position.distanceTo(controlsRef.current.target).toFixed(3) : -1,
        },
      }
    }
    /** 审计：统计每个零件是否仍在视锥内、是否仍可见 */
    w.__audit = () => {
      const off: string[] = []
      let visible = 0
      const box = new THREE.Box3()
      const c = new THREE.Vector3()
      for (const e of partRegistry.entries()) {
        box.setFromObject(e.inner)
        if (box.isEmpty()) continue
        box.getCenter(c)
        const ndc = c.clone().project(camera)
        const inFrame = Math.abs(ndc.x) < 1.02 && Math.abs(ndc.y) < 1.02 && ndc.z < 1
        if (!inFrame) off.push(e.id)
        if (e.outer.visible && e.inner.visible) visible++
      }
      return { total: partRegistry.size, visible, offscreen: off }
    }
    w.__setCam = (pos: number[], target: number[]) => {
      const c = controlsRef.current
      manualDist.current = true
      camera.position.set(pos[0], pos[1], pos[2])
      if (c) {
        c.target.set(target[0], target[1], target[2])
        c.update()
      }
      camera.lookAt(target[0], target[1], target[2])
    }
  }, [camera, controlsRef, gl])

  // 拆解推拉由上面的每帧逻辑统一处理（避免与机位动画抢写相机）

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.06}
      minDistance={0.18}
      maxDistance={4}
      minPolarAngle={0.06}
      maxPolarAngle={Math.PI * 0.88}
      panSpeed={0.85}
      zoomSpeed={0.9}
      target={[0, 0, 0]}
    />
  )
}

function Lights({ ambient }: { ambient: number }) {
  return (
    <>
      <hemisphereLight args={['#c2d6e8', '#161c24', 0.62]} />
      <ambientLight intensity={ambient} />
      <directionalLight
        position={[1.1, 1.7, 0.9]}
        intensity={3.1}
        color="#f2f7ff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.1}
        shadow-camera-far={6}
        shadow-camera-left={-0.85}
        shadow-camera-right={0.85}
        shadow-camera-top={0.85}
        shadow-camera-bottom={-0.85}
        shadow-bias={-0.00035}
        shadow-normalBias={0.0035}
      />
      <directionalLight position={[-1.4, 0.8, -1.1]} intensity={1.15} color="#8fb6d8" />
      <directionalLight position={[0.2, -1.2, 0.6]} intensity={0.4} color="#3c5872" />
      <directionalLight position={[-1.2, 0.75, -1.5]} intensity={0.85} color="#6ea4d8" />
      <spotLight
        position={[-0.9, 1.4, 1.2]}
        angle={0.7}
        penumbra={1}
        intensity={5}
        color="#d8ecff"
        distance={5}
      />
    </>
  )
}

function StudioEnvironment() {
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={['#0b0f14']} />
      <Lightformer
        form="rect"
        intensity={2.6}
        color="#ffffff"
        position={[0.6, 1.6, 2.4]}
        scale={[4.5, 3.2, 1]}
        rotation={[0, 0, 0]}
      />
      <Lightformer
        form="rect"
        intensity={1.5}
        color="#9ec7ff"
        position={[-2.2, 0.8, -1.4]}
        scale={[4, 3, 1]}
        rotation={[0, Math.PI * 0.85, 0]}
      />
      <Lightformer
        form="rect"
        intensity={0.9}
        color="#5f7fa0"
        position={[0, -1.6, 0.4]}
        scale={[5, 5, 1]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
      <Lightformer
        form="circle"
        intensity={1.1}
        color="#bfe9ff"
        position={[0, 3, -0.4]}
        scale={[3, 3, 1]}
        rotation={[Math.PI / 2, 0, 0]}
      />
    </Environment>
  )
}

/** 仅 QA：把 scene 挂到 window 便于统计 */
function SceneHandle() {
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('qa')) {
      ;(window as any).__scene = scene
    }
  }, [scene])
  return null
}

/**
 * 仅 QA：统计单帧真实 draw call / 三角形数。
 * EffectComposer 每帧会多次调用 renderer.render，gl.info 的默认自动重置
 * 只保留最后一次 pass 的数据（读出来恒等于 1），这里改为手动管理计数器。
 */
function PerfProbe() {
  const gl = useThree((s) => s.gl)
  useFrame(() => {
    const info = gl.info
    if (info.autoReset) {
      info.autoReset = false
      info.reset()
      return
    }
    if (info.render.calls > 0) {
      ;(window as any).__lastCalls = {
        calls: info.render.calls,
        tris: info.render.triangles,
        points: info.render.points,
        lines: info.render.lines,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        programs: (gl as any).info.programs?.length ?? -1,
      }
    }
    info.reset()
  })
  return null
}

function ShadowFlags() {
  const scene = useThree((s) => s.scene)
  const model = useAppStore((s) => s.model)
  useEffect(() => {
    scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      // 只处理模型本体，避免影响网格 / 地面 / 接触阴影平面
      let p: THREE.Object3D | null = m
      let inModel = false
      while (p) {
        if (p.name === 'drone-model' || p.name === 'controller-model') {
          inModel = true
          break
        }
        p = p.parent
      }
      if (!inModel) return
      m.receiveShadow = true
      // 微小件（螺钉 / 触点 / 灯珠）在 2048² 阴影图上不足一个像素，
      // 投射阴影只会白增一遍 draw call，直接关掉
      const g = m.geometry
      if (!g.boundingSphere) g.computeBoundingSphere()
      const r = g.boundingSphere?.radius ?? 0
      m.castShadow = r > 0.006
    })
  }, [scene, model])
  return null
}

function Models() {
  const model = useAppStore((s) => s.model)
  return model === 'drone' ? <DroneModel key="drone" /> : <ControllerModel key="controller" />
}

/** 场景辅助：网格与坐标轴 */
function Helpers() {
  const grid = useAppStore((s) => s.grid)
  const axes = useAppStore((s) => s.axes)
  const bg = useAppStore((s) => s.bg)
  const model = useAppStore((s) => s.model)
  const theme = SCENE_THEMES[bg]
  const view = VIEWS[model]
  const o = view.axesOffset

  const axesRef = useRef<THREE.AxesHelper>(null)
  useEffect(() => {
    // 统一线宽观感：把 AxesHelper 线材质设为不随光照变化的高亮色
    const a = axesRef.current
    if (!a) return
    const mat = a.material as THREE.LineBasicMaterial
    mat.transparent = true
    mat.opacity = 0.9
    mat.depthWrite = false
  }, [axes])

  return (
    <>
      {grid && (
        <Grid
          name="scene-grid"
          position={[0, -0.0935, 0]}
          args={[3, 3]}
          cellSize={0.075}
          cellThickness={0.55}
          cellColor={theme.cell}
          sectionSize={0.375}
          sectionThickness={1}
          sectionColor={theme.section}
          fadeDistance={theme.fade}
          fadeStrength={1.6}
          infiniteGrid
          followCamera={false}
        />
      )}
      {axes && (
        <axesHelper
          ref={axesRef}
          name="scene-axes"
          args={[view.axesSize]}
          position={[-o, -0.0915, -o]}
        />
      )}
    </>
  )
}

export function ShowcaseScene() {
  const controlsRef = useRef<any>(null)
  const model = useAppStore((s) => s.model)
  const bg = useAppStore((s) => s.bg)
  const select = useAppStore((s) => s.select)
  const contactShadows = useAppStore((s) => s.contactShadows)
  const theme = SCENE_THEMES[bg]

  return (
    <Canvas
      shadows="soft"
      dpr={[1, 1.8]}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.06,
      }}
      camera={{ position: VIEWS[model].base.toArray(), fov: 32, near: 0.01, far: 40 }}
      onPointerMissed={() => select(null)}
      onCreated={({ gl }) => {
        gl.setClearColor(theme.clear)
      }}
    >
      <color attach="background" args={[theme.clear]} />
      <fog attach="fog" args={theme.fog} />

      <SceneHandle />
      {QA && <PerfProbe />}
      <ExplodeDriver />
      <Suspense fallback={null}>
        <StudioEnvironment />
        <Lights ambient={theme.ambient} />
        <Models />
        <ShadowFlags />
      </Suspense>

      <ContactShadows
        position={[0, -0.092, 0]}
        opacity={0.62}
        scale={2.4}
        blur={2.6}
        far={0.9}
        resolution={1024}
        color="#000000"
        frames={contactShadows ? Infinity : 0}
      />
      <Helpers />

      <CameraRig controlsRef={controlsRef} />

      {/* SSAO 已移除：实测该 pass 每帧多渲染 455 次 draw call，但输出画面与关闭时逐像素一致
          （参数未生效），属于纯开销。接触阴影已提供缝隙暗部，视觉无损失。 */}
      <EffectComposer multisampling={0}>
        <SMAA />
        <Bloom mipmapBlur intensity={0.42} luminanceThreshold={1.05} luminanceSmoothing={0.22} />
        <Vignette offset={0.28} darkness={theme.vignette} eskil={false} />
      </EffectComposer>
    </Canvas>
  )
}

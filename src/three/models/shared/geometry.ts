import * as THREE from 'three'

/* ------------------------------------------------------------------ *
 * 参数化几何工具库
 * 所有曲面均由截面放样 / 扫掠 / 旋成生成，避免堆砌基础 BoxGeometry
 * ------------------------------------------------------------------ */

export type Pt = [number, number]

export interface LoftSection {
  z: number
  /** 截面宽度 */
  w: number
  /** 截面高度（半壳时为上半/下半高度） */
  h: number
  /** 截面纵向偏移 */
  y?: number
  /** 超椭圆指数：2 = 椭圆，4 ≈ 圆角矩形 */
  n?: number
  /** 环向分段 */
  seg?: number
}

/** 完整超椭圆环（逆时针） */
export function superRing(w: number, h: number, n = 4, seg = 32): Pt[] {
  const pts: Pt[] = []
  for (let i = 0; i < seg; i++) {
    const t = (i / seg) * Math.PI * 2
    const c = Math.cos(t)
    const s = Math.sin(t)
    const x = Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * (w / 2)
    const y = Math.sign(s) * Math.pow(Math.abs(s), 2 / n) * (h / 2)
    pts.push([x, y])
  }
  return pts
}

/** 上半超椭圆弧 + 水平闭合边（用于上盖 / 下盖的半壳截面） */
export function halfRing(w: number, h: number, n = 4, seg = 24): Pt[] {
  const pts: Pt[] = []
  for (let i = 0; i <= seg; i++) {
    const t = (i / seg) * Math.PI
    const c = Math.cos(t)
    const s = Math.sin(t)
    const x = Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * (w / 2)
    const y = Math.pow(Math.abs(s), 2 / n) * h
    pts.push([x, y])
  }
  return pts
}

/** 反转三角形绕序使法线朝外（闭合网格） */
export function fixWinding(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const idx = geo.index
  const pos = geo.attributes.position as THREE.BufferAttribute
  if (!idx) {
    geo.computeVertexNormals()
    return geo
  }
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  const ab = new THREE.Vector3()
  const ac = new THREE.Vector3()
  const cr = new THREE.Vector3()
  let vol = 0
  for (let i = 0; i < idx.count; i += 3) {
    a.fromBufferAttribute(pos, idx.getX(i))
    b.fromBufferAttribute(pos, idx.getX(i + 1))
    c.fromBufferAttribute(pos, idx.getX(i + 2))
    ab.copy(b).sub(a)
    ac.copy(c).sub(a)
    cr.copy(ab).cross(ac)
    vol += a.dot(cr) / 6
  }
  if (vol < 0) {
    const arr = idx.array as ArrayLike<number>
    const copy = Array.from(arr)
    for (let i = 0; i < idx.count; i += 3) {
      idx.setX(i, copy[i])
      idx.setX(i + 1, copy[i + 2])
      idx.setX(i + 2, copy[i + 1])
    }
    idx.needsUpdate = true
  }
  geo.computeVertexNormals()
  geo.computeBoundingSphere()
  return geo
}

/** 截面放样：沿 Z 轴排列若干超椭圆截面并封口 */
export function buildLoft(
  sections: LoftSection[],
  opts: { capStart?: boolean; capEnd?: boolean } = {}
): THREE.BufferGeometry {
  const { capStart = true, capEnd = true } = opts
  const rings = sections.map((s) => {
    const seg = s.seg ?? 32
    const n = s.n ?? 4
    // 统一分段数：使用第一个 section 的 seg 作为基准
    return superRing(s.w, s.h, n, seg)
  })
  const ringLen = Math.min(...rings.map((r) => r.length))
  const pos: number[] = []
  rings.forEach((ring, si) => {
    const s = sections[si]
    for (let j = 0; j < ringLen; j++) {
      const k = Math.round((j / ringLen) * ring.length) % ring.length
      pos.push(ring[k][0], ring[k][1] + (s.y ?? 0), s.z)
    }
  })
  const idx: number[] = []
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < ringLen; j++) {
      const jn = (j + 1) % ringLen
      const a = i * ringLen + j
      const b = i * ringLen + jn
      const c = (i + 1) * ringLen + j
      const d = (i + 1) * ringLen + jn
      idx.push(a, b, c, b, d, c)
    }
  }
  if (capStart) {
    for (let j = 1; j < ringLen - 1; j++) idx.push(0, j + 1, j)
  }
  if (capEnd) {
    const base = (rings.length - 1) * ringLen
    for (let j = 1; j < ringLen - 1; j++) idx.push(base, base + j, base + j + 1)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setIndex(idx)
  return fixWinding(geo)
}

/** 半壳放样：上盖 / 下盖（截面为上半超椭圆 + 平底） */
export function buildHalfLoft(
  sections: LoftSection[],
  flip = false
): THREE.BufferGeometry {
  const rings = sections.map((s) => halfRing(s.w, s.h, s.n ?? 4, s.seg ?? 28))
  const ringLen = rings[0].length
  const pos: number[] = []
  rings.forEach((ring, si) => {
    const s = sections[si]
    for (const [x, y] of ring) pos.push(x, (flip ? -y : y) + (s.y ?? 0), s.z)
  })
  const idx: number[] = []
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < ringLen - 1; j++) {
      const a = i * ringLen + j
      const b = i * ringLen + j + 1
      const c = (i + 1) * ringLen + j
      const d = (i + 1) * ringLen + j + 1
      idx.push(a, b, c, b, d, c)
    }
  }
  // 平底面（半壳的剖切面）
  for (let i = 0; i < rings.length - 1; i++) {
    const a = i * ringLen
    const b = i * ringLen + (ringLen - 1)
    const c = (i + 1) * ringLen
    const d = (i + 1) * ringLen + (ringLen - 1)
    idx.push(a, b, c, b, d, c)
  }
  // 首尾封口（扁平三角扇）
  const fan = (base: number, rev: boolean) => {
    const cy = 0
    pos.push(0, cy, sections[base].z)
    const centerIdx = pos.length / 3 - 1
    for (let j = 0; j < ringLen - 1; j++) {
      if (rev) idx.push(centerIdx, base * ringLen + j + 1, base * ringLen + j)
      else idx.push(centerIdx, base * ringLen + j, base * ringLen + j + 1)
    }
  }
  if (flip) {
    fan(0, false)
    fan(rings.length - 1, true)
  } else {
    fan(0, true)
    fan(rings.length - 1, false)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setIndex(idx)
  return fixWinding(geo)
}

/** 圆角矩形轮廓点（闭合） */
export function roundedRectRing(a: number, b: number, r: number, seg = 6): Pt[] {
  const pts: Pt[] = []
  const rr = Math.min(r, a / 2 - 1e-5, b / 2 - 1e-5)
  const corners: [number, number, number][] = [
    [a / 2 - rr, -b / 2 + rr, -Math.PI / 2],
    [a / 2 - rr, b / 2 - rr, 0],
    [-a / 2 + rr, b / 2 - rr, Math.PI / 2],
    [-a / 2 + rr, -b / 2 + rr, Math.PI],
  ]
  for (const [cx, cy, start] of corners) {
    for (let i = 0; i <= seg; i++) {
      const t = start + (i / seg) * (Math.PI / 2)
      pts.push([cx + Math.cos(t) * rr, cy + Math.sin(t) * rr])
    }
  }
  return pts
}

/** 沿曲线扫掠自定义截面（side/up 固定参考系，适合机臂、起落架、手柄） */
export function sweepProfile(
  curve: THREE.Curve<THREE.Vector3>,
  profile: Pt[],
  steps = 56,
  opts: { closeCaps?: boolean; scaleAt?: (t: number) => number } = {}
): THREE.BufferGeometry {
  const { closeCaps = true, scaleAt } = opts
  const n = profile.length
  const pos: number[] = []
  const upRef = new THREE.Vector3(0, 1, 0)
  const tan = new THREE.Vector3()
  const side = new THREE.Vector3()
  const up = new THREE.Vector3()
  const p = new THREE.Vector3()

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    curve.getPointAt(t, p)
    curve.getTangentAt(t, tan)
    if (Math.abs(tan.y) > 0.98) upRef.set(0, 0, 1)
    else upRef.set(0, 1, 0)
    side.crossVectors(tan, upRef).normalize()
    up.crossVectors(side, tan).normalize()
    const k = scaleAt ? scaleAt(t) : 1
    for (const [u, v] of profile) {
      pos.push(
        p.x + side.x * u * k + up.x * v * k,
        p.y + side.y * u * k + up.y * v * k,
        p.z + side.z * u * k + up.z * v * k
      )
    }
  }
  const idx: number[] = []
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < n; j++) {
      const jn = (j + 1) % n
      const a = i * n + j
      const b = i * n + jn
      const c = (i + 1) * n + j
      const d = (i + 1) * n + jn
      idx.push(a, b, c, b, d, c)
    }
  }
  if (closeCaps) {
    for (let j = 1; j < n - 1; j++) idx.push(0, j + 1, j)
    const base = steps * n
    for (let j = 1; j < n - 1; j++) idx.push(base, base + j, base + j + 1)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setIndex(idx)
  return fixWinding(geo)
}

/** 锥形管：沿曲线半径线性变化（起落架 / 线缆 / 天线） */
export function sweptTube(
  curve: THREE.Curve<THREE.Vector3>,
  r0: number,
  r1: number,
  steps = 48,
  radial = 14
): THREE.BufferGeometry {
  const profile = superRing(2, 2, 2, radial)
  return sweepProfile(curve, profile, steps, {
    scaleAt: (t) => THREE.MathUtils.lerp(r0, r1, t),
  })
}

/** 圆角过渡的 Catmull-Rom 曲线 */
export function curveOf(points: [number, number, number][]): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
    false,
    'catmullrom',
    0.35
  )
}

/** 带倒角的圆角板（挤出 + 斜切），用于壳体细节、按键、芯片、屏幕 */
export function chamferBox(
  w: number,
  h: number,
  d: number,
  r = 0.004,
  bevel = 0.0015,
  bevelSegments = 3
): THREE.BufferGeometry {
  const shape = new THREE.Shape()
  const hw = w / 2
  const hh = h / 2
  const rr = Math.max(0.0002, Math.min(r, hw - 0.0001, hh - 0.0001))
  shape.moveTo(-hw + rr, -hh)
  shape.lineTo(hw - rr, -hh)
  shape.quadraticCurveTo(hw, -hh, hw, -hh + rr)
  shape.lineTo(hw, hh - rr)
  shape.quadraticCurveTo(hw, hh, hw - rr, hh)
  shape.lineTo(-hw + rr, hh)
  shape.quadraticCurveTo(-hw, hh, -hw, hh - rr)
  shape.lineTo(-hw, -hh + rr)
  shape.quadraticCurveTo(-hw, -hh, -hw + rr, -hh)
  const depth = Math.max(0.0004, d - bevel * 2)
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments,
    curveSegments: 12,
  })
  geo.translate(0, 0, -depth / 2)
  geo.computeVertexNormals()
  return geo
}

/** 水平放置的圆角板：X = 宽，Y = 厚，Z = 深 */
export function flatPlate(
  w: number,
  t: number,
  d: number,
  r = 0.004,
  bevel = 0.0015
): THREE.BufferGeometry {
  const geo = chamferBox(w, d, t, r, bevel)
  geo.rotateX(-Math.PI / 2)
  return geo
}

/** 中空框（电池仓边框 / 屏幕边框 / 密封圈） */
export function frameBox(
  w: number,
  h: number,
  wall: number,
  d: number,
  bevel = 0.001
): THREE.BufferGeometry {
  const shape = new THREE.Shape()
  const hw = w / 2
  const hh = h / 2
  shape.moveTo(-hw, -hh)
  shape.lineTo(hw, -hh)
  shape.lineTo(hw, hh)
  shape.lineTo(-hw, hh)
  shape.lineTo(-hw, -hh)
  const hole = new THREE.Path()
  const iw = hw - wall
  const ih = hh - wall
  hole.moveTo(-iw, -ih)
  hole.lineTo(-iw, ih)
  hole.lineTo(iw, ih)
  hole.lineTo(iw, -ih)
  hole.lineTo(-iw, -ih)
  shape.holes.push(hole)
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: d,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 4,
  })
  geo.translate(0, 0, -d / 2)
  geo.computeVertexNormals()
  return geo
}

/** 变截面扫掠：截面随参数 t 变化（流线型机臂 / 渐变壳体） */
export function sweepProfileFn(
  curve: THREE.Curve<THREE.Vector3>,
  profileAt: (t: number) => Pt[],
  steps = 64,
  opts: { closeCaps?: boolean; upRefY?: number } = {}
): THREE.BufferGeometry {
  const { closeCaps = true } = opts
  const first = profileAt(0)
  const n = first.length
  const pos: number[] = []
  const upRef = new THREE.Vector3(0, 1, 0)
  const tan = new THREE.Vector3()
  const side = new THREE.Vector3()
  const up = new THREE.Vector3()
  const p = new THREE.Vector3()

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    curve.getPointAt(t, p)
    curve.getTangentAt(t, tan)
    if (Math.abs(tan.y) > 0.98) upRef.set(0, 0, 1)
    else upRef.set(0, 1, 0)
    side.crossVectors(tan, upRef).normalize()
    up.crossVectors(side, tan).normalize()
    const ring = profileAt(t)
    for (let j = 0; j < n; j++) {
      const [u, v] = ring[j % ring.length]
      pos.push(
        p.x + side.x * u + up.x * v,
        p.y + side.y * u + up.y * v,
        p.z + side.z * u + up.z * v
      )
    }
  }
  const idx: number[] = []
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < n; j++) {
      const jn = (j + 1) % n
      const a = i * n + j
      const b = i * n + jn
      const c = (i + 1) * n + j
      const d = (i + 1) * n + jn
      idx.push(a, b, c, b, d, c)
    }
  }
  if (closeCaps) {
    for (let j = 1; j < n - 1; j++) idx.push(0, j + 1, j)
    const base = steps * n
    for (let j = 1; j < n - 1; j++) idx.push(base, base + j, base + j + 1)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setIndex(idx)
  return fixWinding(geo)
}

/**
 * 真实桨叶：NACA 四位翼型截面 + 展向变弦长 + 桨距扭转 + 中弧线弯度 + 圆滑桨尖
 * x 沿展向，弦长方向在 Z，厚度方向在 Y，绕 X 轴施加桨距角
 */
export function propellerBladeGeometry(opts: {
  length: number
  rootChord: number
  tipChord: number
  thickness: number
  rootPitch: number
  tipPitch: number
  sweep?: number
  rise?: number
  camber?: number
  segments?: number
  radial?: number
}): THREE.BufferGeometry {
  const {
    length,
    rootChord,
    tipChord,
    thickness,
    rootPitch,
    tipPitch,
    sweep = 0,
    rise = 0,
    camber = 0.06,
    segments = 30,
    radial = 14,
  } = opts

  // 翼型上下表面各 radial 点，前缘→后缘，回程再走后缘→前缘
  const surf: [number, number][] = []
  for (let i = 0; i <= radial; i++) {
    const x = i / radial
    const yt =
      5 *
      thickness *
      (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1015 * x ** 4)
    const yc = 4 * camber * x * (1 - x)
    surf.push([x, yc + yt])
  }
  for (let i = radial - 1; i > 0; i--) {
    const x = i / radial
    const yt =
      5 *
      thickness *
      (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1015 * x ** 4)
    const yc = 4 * camber * x * (1 - x)
    surf.push([x, yc - yt])
  }
  const ringLen = surf.length
  const pos: number[] = []

  for (let i = 0; i <= segments; i++) {
    const s = i / segments
    // 弦长：中段略鼓，桨尖收窄
    const bulge = 1 + 0.16 * Math.sin(Math.PI * Math.pow(s, 0.9))
    const chord = (rootChord * (1 - s) + tipChord * s) * bulge
    const pitch = THREE.MathUtils.degToRad(
      THREE.MathUtils.lerp(rootPitch, tipPitch, Math.pow(s, 0.8))
    )
    // 桨尖 8% 展向收圆
    const tipRound = s > 0.92 ? Math.sqrt(Math.max(0, 1 - ((s - 0.92) / 0.08) ** 2)) : 1
    const thickScale = Math.max(0.12, tipRound)
    const zOff = Math.sin(s * Math.PI * 0.5) * sweep
    const yOff = Math.sin(s * Math.PI * 0.5) * rise
    for (const [xs, ys] of surf) {
      const c = (0.5 - xs) * chord // 前缘在 +Z 侧
      const t = ys * chord * thickScale
      const yy = t * Math.cos(pitch) - c * Math.sin(pitch)
      const zz = t * Math.sin(pitch) + c * Math.cos(pitch)
      pos.push(s * length, yy + yOff, zz + zOff)
    }
  }
  const idx: number[] = []
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < ringLen; j++) {
      const jn = (j + 1) % ringLen
      const a = i * ringLen + j
      const b = i * ringLen + jn
      const c = (i + 1) * ringLen + j
      const d = (i + 1) * ringLen + jn
      idx.push(a, b, c, b, d, c)
    }
  }
  for (let j = 1; j < ringLen - 1; j++) idx.push(0, j + 1, j)
  const base = segments * ringLen
  for (let j = 1; j < ringLen - 1; j++) idx.push(base, base + j, base + j + 1)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setIndex(idx)
  return fixWinding(geo)
}

/** 旋成体（电机钟形壳 / 镜头筒 / 摇杆帽 / 天线罩） */
export function lathe(
  profile: Pt[],
  seg = 48,
  phiStart = 0,
  phiLength = Math.PI * 2
): THREE.BufferGeometry {
  const pts = profile.map(([x, y]) => new THREE.Vector2(Math.max(0, x), y))
  const geo = new THREE.LatheGeometry(pts, seg, phiStart, phiLength)
  geo.computeVertexNormals()
  return geo
}

/** 弧形筋条（散热片 / 加强筋 / 装饰条） */
export function finStrip(
  w: number,
  h: number,
  d: number,
  r = 0.0008
): THREE.BufferGeometry {
  return chamferBox(w, h, d, r, r * 0.8, 2)
}

/** 沿圆周分布的散热鳍片几何（合并为单个 BufferGeometry） */
export function radialFins(
  count: number,
  radius: number,
  finW: number,
  finH: number,
  finD: number
): THREE.BufferGeometry {
  const geos: THREE.BufferGeometry[] = []
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2
    const g = chamferBox(finW, finH, finD, finW * 0.3, finW * 0.12, 2)
    g.translate(radius, 0, 0)
    g.rotateY(a)
    geos.push(g)
  }
  return mergeGeometries(geos)
}

/** 轻量几何合并（不引入 addons，避免额外依赖） */
export function mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let vertexCount = 0
  let indexCount = 0
  for (const g of geos) {
    vertexCount += g.attributes.position.count
    indexCount += g.index ? g.index.count : g.attributes.position.count
  }
  const positions = new Float32Array(vertexCount * 3)
  const normals = new Float32Array(vertexCount * 3)
  const indices: number[] = []
  let vo = 0
  for (const g of geos) {
    const p = g.attributes.position as THREE.BufferAttribute
    const n = g.attributes.normal as THREE.BufferAttribute | undefined
    positions.set(p.array as Float32Array, vo * 3)
    if (n) normals.set(n.array as Float32Array, vo * 3)
    if (g.index) {
      for (let i = 0; i < g.index.count; i++) indices.push(g.index.getX(i) + vo)
    } else {
      for (let i = 0; i < p.count; i++) indices.push(i + vo)
    }
    vo += p.count
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

export function deg(d: number): number {
  return (d * Math.PI) / 180
}

/**
 * 带壁厚的开放壳体（注塑件内腔）
 * 外壳面 + 内腔面 + 开口处翻边，用于需要展示内腔的拆解视图。
 * 材质请使用 DoubleSide，避免绕序导致的背面剔除问题。
 */
export function buildShell(
  sections: LoftSection[],
  wall = 0.88,
  openAt: 'zmin' | 'zmax' = 'zmin',
  seg = 44
): THREE.BufferGeometry {
  const rings = sections.map((s) => {
    const outer = superRing(s.w, s.h, s.n ?? 4, seg)
    const inner = superRing(s.w * wall, s.h * wall, s.n ?? 4, seg)
    return { outer, inner, z: s.z, y: s.y ?? 0 }
  })
  const n = seg
  const pos: number[] = []
  rings.forEach((r) => {
    for (const [x, y] of r.outer) pos.push(x, y + r.y, r.z)
    for (const [x, y] of r.inner) pos.push(x, y + r.y, r.z)
  })
  const stride = n * 2
  const idx: number[] = []
  const push = (...v: number[]) => idx.push(...v)

  for (let i = 0; i < rings.length - 1; i++) {
    const o0 = i * stride
    const o1 = (i + 1) * stride
    for (let j = 0; j < n; j++) {
      const jn = (j + 1) % n
      // 外表面
      push(o0 + j, o0 + jn, o1 + j, o0 + jn, o1 + jn, o1 + j)
      // 内表面（法线朝内）
      push(o0 + n + j, o1 + n + j, o0 + n + jn, o0 + n + jn, o1 + n + j, o1 + n + jn)
    }
  }
  // 开口翻边
  const rim = openAt === 'zmin' ? 0 : rings.length - 1
  const base = rim * stride
  for (let j = 0; j < n; j++) {
    const jn = (j + 1) % n
    push(base + j, base + n + j, base + jn, base + jn, base + n + j, base + n + jn)
  }
  // 封闭端封盖（内侧）
  const capRing = openAt === 'zmin' ? rings.length - 1 : 0
  const cb = capRing * stride
  for (let j = 0; j < n; j++) {
    const jn = (j + 1) % n
    push(cb + j, cb + jn, cb + n + j, cb + jn, cb + n + jn, cb + n + j)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

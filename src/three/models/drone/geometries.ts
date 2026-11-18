import * as THREE from 'three'
import {
  buildHalfLoft,
  chamferBox,
  curveOf,
  flatPlate,
  frameBox,
  lathe,
  mergeGeometries,
  sweptTube,
  type LoftSection,
} from '../shared/geometry'
import { BODY_SECTIONS, SEAM_SPLIT } from './config'

/* ---------------- 机身壳体 ---------------- */

const topSections: LoftSection[] = BODY_SECTIONS.map((s) => ({ ...s, y: 0, h: s.h * SEAM_SPLIT }))
const botSections: LoftSection[] = BODY_SECTIONS.map((s) => ({ ...s, y: 0, h: s.h * (1 - SEAM_SPLIT) }))

export const topShellGeo = buildHalfLoft(topSections)
export const bottomShellGeo = buildHalfLoft(botSections, true)

/** 机身截面插值：返回该 z 处的宽度 / 半高 / 指数 */
function sectionAt(z: number) {
  const list = BODY_SECTIONS
  if (z <= list[0].z) return list[0]
  if (z >= list[list.length - 1].z) return list[list.length - 1]
  for (let i = 0; i < list.length - 1; i++) {
    const a = list[i]
    const b = list[i + 1]
    if (z >= a.z && z <= b.z) {
      const t = (z - a.z) / (b.z - a.z)
      return {
        w: a.w + (b.w - a.w) * t,
        h: a.h + (b.h - a.h) * t,
        n: (a.n ?? 4) + ((b.n ?? 4) - (a.n ?? 4)) * t,
      }
    }
  }
  return list[list.length - 1]
}

/** 上盖表面高度：超椭圆 x^n + (y/h)^n = 1 */
export function bodyTopY(z: number, x: number): number {
  const s = sectionAt(z)
  const n = s.n ?? 4
  const t = Math.min(0.999, Math.abs(x) / (s.w / 2))
  return s.h * SEAM_SPLIT * Math.pow(1 - Math.pow(t, n), 1 / n)
}

/** 底壳表面高度（负值） */
export function bodyBottomY(z: number, x: number): number {
  const s = sectionAt(z)
  const n = s.n ?? 4
  const t = Math.min(0.999, Math.abs(x) / (s.w / 2))
  return -s.h * (1 - SEAM_SPLIT) * Math.pow(1 - Math.pow(t, n), 1 / n)
}

/* ---------------- 机身接缝 ---------------- */

/** 沿曲面的长接缝（上盖侧沿） */
function seamAlong(zFrom: number, zTo: number, xRatio: number, seg = 40) {
  const pts: [number, number, number][] = []
  for (let i = 0; i <= seg; i++) {
    const z = zFrom + ((zTo - zFrom) * i) / seg
    const s = sectionAt(z)
    const x = (s.w / 2) * xRatio
    pts.push([x, bodyTopY(z, x) - 0.0004, z])
  }
  return sweptTube(curveOf(pts), 0.00115, 0.0009, seg * 2, 8)
}

export const seamGrooveGeo = mergeGeometries([
  seamAlong(-0.150, 0.148, 0.80),
  seamAlong(-0.150, 0.148, -0.80),
  // 电池仓前缘横缝
  sweptTube(
    curveOf(
      Array.from({ length: 21 }, (_, i) => {
        const x = -0.038 + (0.076 * i) / 20
        return [x, bodyTopY(0.062, x) - 0.0003, 0.062] as [number, number, number]
      })
    ),
    0.0011,
    0.0011,
    40,
    8
  ),
])

/** 底壳纵向接缝 */
export const bottomSeamGeo = mergeGeometries([
  sweptTube(
    curveOf(
      Array.from({ length: 25 }, (_, i) => {
        const z = -0.05 + (0.17 * i) / 24
        return [0.024, bodyBottomY(z, 0.024) + 0.0003, z] as [number, number, number]
      })
    ),
    0.001,
    0.001,
    40,
    8
  ),
  sweptTube(
    curveOf(
      Array.from({ length: 25 }, (_, i) => {
        const z = -0.05 + (0.17 * i) / 24
        return [-0.024, bodyBottomY(z, 0.024) + 0.0003, z] as [number, number, number]
      })
    ),
    0.001,
    0.001,
    40,
    8
  ),
])

/* ---------------- 螺钉 ---------------- */

/** 沉头内六角螺钉：返回螺钉头 + 六角槽两段几何 */
export function screwSet(
  points: [number, number, number][],
  flip = false
): {
  head: THREE.BufferGeometry
  recess: THREE.BufferGeometry
} {
  const heads: THREE.BufferGeometry[] = []
  const recesses: THREE.BufferGeometry[] = []
  for (const [x, y, z] of points) {
    const head = lathe(
      [
        [0, -0.0006],
        [0.0034, -0.0006],
        [0.0035, 0.0002],
        [0.0031, 0.0011],
        [0.0021, 0.0015],
        [0, 0.0015],
      ],
      20
    )
    const hex = lathe(
      [
        [0, 0],
        [0.0017, 0],
        [0.0017, 0.0005],
        [0, 0.0005],
      ],
      6
    )
    hex.translate(0, 0.00102, 0)
    if (flip) {
      head.rotateX(Math.PI)
      hex.rotateX(Math.PI)
    }
    head.translate(x, y, z)
    hex.translate(x, y, z)
    heads.push(head)
    recesses.push(hex)
  }
  return { head: mergeGeometries(heads), recess: mergeGeometries(recesses) }
}

const topScrewPts: [number, number, number][] = [
  [-0.030, bodyTopY(-0.118, 0.030) + 0.0004, -0.118],
  [0.030, bodyTopY(-0.118, 0.030) + 0.0004, -0.118],
  [-0.040, bodyTopY(0.010, 0.040) + 0.0004, 0.010],
  [0.040, bodyTopY(0.010, 0.040) + 0.0004, 0.010],
  [-0.033, bodyTopY(0.140, 0.033) + 0.0004, 0.140],
  [0.033, bodyTopY(0.140, 0.033) + 0.0004, 0.140],
]
export const topScrews = screwSet(topScrewPts)

const bottomScrewPts: [number, number, number][] = [
  [-0.034, bodyBottomY(-0.06, 0.034) - 0.0004, -0.06],
  [0.034, bodyBottomY(-0.06, 0.034) - 0.0004, -0.06],
  [-0.030, bodyBottomY(0.10, 0.030) - 0.0004, 0.10],
  [0.030, bodyBottomY(0.10, 0.030) - 0.0004, 0.10],
]
export const bottomScrews = screwSet(bottomScrewPts, true)

/* ---------------- 通风 / 散热格栅 ---------------- */

/** 上盖前部进气格栅（4 片导流百叶） */
export const intakeGrilleGeo = mergeGeometries(
  Array.from({ length: 4 }, (_, i) => {
    const z = -0.116 + i * 0.0088
    const g = chamferBox(0.030, 0.0018, 0.0034, 0.0009, 0.0004, 2)
    g.rotateX(0.20)
    g.translate(0, bodyTopY(z, 0) + 0.0004, z)
    return g
  })
)

/** 上盖两侧散热百叶 */
export const sideLouversGeo = mergeGeometries(
  [-1, 1].flatMap((sx) =>
    Array.from({ length: 5 }, (_, i) => {
      const z = 0.086 + i * 0.0086
      const x = sx * 0.043
      const g = chamferBox(0.0016, 0.006, 0.0036, 0.0007, 0.0003, 2)
      g.rotateZ(sx * 0.16)
      g.translate(x, bodyTopY(z, x) - 0.0034, z)
      return g
    })
  )
)

/** 底壳排热槽（6 条） */
export const bottomVentGeo = mergeGeometries(
  Array.from({ length: 6 }, (_, i) => {
    const z = 0.030 + i * 0.0105
    const g = flatPlate(0.026, 0.0026, 0.0042, 0.0012, 0.0005)
    g.translate(0, bodyBottomY(z, 0) + 0.0008, z)
    return g
  })
)

/* ---------------- 机头 / 尾部收口 ---------------- */

/** 机头装饰唇边：沿机身截面收口的深色镶边 */
export const noseBumperGeo = (() => {
  const zs = [-0.1785, -0.1745, -0.1705]
  const rings = zs.map((z, i) => {
    const s = sectionAt(z)
    const k = 1 + 0.045 - i * 0.012
    return { z, w: s.w * k, h: s.h * k, n: s.n ?? 3, seg: 48 }
  })
  return buildHalfLoft(
    rings.map((r) => ({ ...r, h: r.h * SEAM_SPLIT })),
    false
  )
})()

/** 尾部接口面板（USB-C / microSD / 状态键） */
export const tailPanelGeo = (() => {
  const z = 0.1645
  const plate = chamferBox(0.040, 0.014, 0.004, 0.003, 0.0008)
  plate.translate(0, -0.003, z)
  const usbc = chamferBox(0.011, 0.0038, 0.0025, 0.0016, 0.0004)
  usbc.translate(-0.008, -0.003, z + 0.0024)
  const sd = chamferBox(0.008, 0.0022, 0.0022, 0.001, 0.0003)
  sd.translate(0.008, -0.003, z + 0.0024)
  const led = lathe([[0, 0], [0.0016, 0], [0.0016, 0.0012], [0, 0.0012]], 12)
  led.rotateX(Math.PI / 2)
  led.translate(0.016, 0.002, z + 0.0022)
  return { panel: mergeGeometries([plate]), slots: mergeGeometries([usbc, sd]), led }
})()

/** 底壳龙骨加强板 */
export const keelGeo = (() => {
  const base = flatPlate(0.046, 0.0024, 0.130, 0.012, 0.0008)
  base.translate(0, bodyBottomY(0.02, 0) + 0.0012, 0.02)
  const ribs = mergeGeometries(
    Array.from({ length: 5 }, (_, i) => {
      const z = -0.035 + i * 0.027
      const g = chamferBox(0.048, 0.0042, 0.0016, 0.0007, 0.0003, 2)
      g.translate(0, bodyBottomY(z, 0) - 0.001, z)
      return g
    })
  )
  return mergeGeometries([base, ribs])
})()

/* ---------------- 电池 ---------------- */

/** 电池外壳：带收边与卡扣槽的圆角块 */
export const batteryShellGeo = (() => {
  const g = chamferBox(0.072, 0.056, 0.026, 0.0085, 0.0028, 4)
  g.rotateX(-Math.PI / 2)
  return g
})()
export const batteryTopPlateGeo = flatPlate(0.064, 0.0018, 0.030, 0.005, 0.0006)
export const batteryGripGeo = mergeGeometries(
  [-1, 1].map((sx) => {
    const g = chamferBox(0.0022, 0.012, 0.040, 0.0009, 0.0003, 2)
    g.translate(sx * 0.0355, 0.0, 0)
    return g
  })
)
/** 侧面释放卡扣 */
export const batteryLatchGeo = mergeGeometries(
  [-1, 1].map((sx) => {
    const g = chamferBox(0.0035, 0.010, 0.016, 0.0016, 0.0005)
    g.translate(sx * 0.0355, 0.002, -0.004)
    return g
  })
)
/** 电源接口：插座外框 + 6 针 */
export const batterySocketGeo = (() => {
  const frame = chamferBox(0.020, 0.009, 0.005, 0.002, 0.0006)
  frame.translate(0, -0.006, -0.028)
  return frame
})()
export const batteryPinsGeo = mergeGeometries(
  Array.from({ length: 6 }, (_, i) => {
    const g = chamferBox(0.0018, 0.0018, 0.003, 0.0005, 0.0002)
    g.translate(-0.0075 + i * 0.003, -0.006, -0.0305)
    return g
  })
)
/** 电量指示窗（内凹深色槽） */
export const batteryLedWindowGeo = flatPlate(0.038, 0.0018, 0.011, 0.0022, 0.0005)
/** 4 段电量灯 */
export const batteryLedSegGeo = mergeGeometries(
  Array.from({ length: 4 }, (_, i) => {
    const g = flatPlate(0.0064, 0.0014, 0.0062, 0.0013, 0.0004)
    g.translate(-0.0122 + i * 0.0081, 0, 0)
    return g
  })
)
/** 电池拉带 */
export const batteryPullGeo = (() => {
  const g = chamferBox(0.020, 0.0022, 0.014, 0.002, 0.0006)
  g.translate(0, 0.006, 0.026)
  const loop = sweptTube(
    curveOf([
      [-0.009, 0.006, 0.030],
      [0, 0.008, 0.041],
      [0.009, 0.006, 0.030],
    ]),
    0.0018,
    0.0018,
    24,
    8
  )
  return mergeGeometries([g, loop])
})()

/* ---------------- 电池仓 ---------------- */

export const bayFrameGeo = frameBox(0.082, 0.064, 0.0044, 0.014, 0.0012)
export const bayFloorGeo = flatPlate(0.074, 0.002, 0.054, 0.004, 0.0006)
export const bayRailsGeo = mergeGeometries(
  [-1, 1].map((sx) => {
    const g = chamferBox(0.004, 0.006, 0.048, 0.0016, 0.0005)
    g.translate(sx * 0.0375, -0.002, 0)
    return g
  })
)
/** 仓内触点座 */
export const bayContactGeo = (() => {
  const block = chamferBox(0.024, 0.010, 0.008, 0.002, 0.0006)
  block.translate(0, -0.007, -0.026)
  const pins = mergeGeometries(
    Array.from({ length: 6 }, (_, i) => {
      const g = chamferBox(0.0016, 0.0016, 0.0022, 0.0004, 0.0002)
      g.translate(-0.0075 + i * 0.003, -0.007, -0.0305)
      return g
    })
  )
  return { block, pins }
})()

/* ---------------- 散热模块 ---------------- */

export const heatBaseGeo = flatPlate(0.046, 0.0042, 0.030, 0.004, 0.001)
export const heatFinsGeo = mergeGeometries(
  Array.from({ length: 9 }, (_, i) => {
    const g = chamferBox(0.0011, 0.011, 0.028, 0.0004, 0.0002, 1)
    g.translate(-0.018 + i * 0.0045, 0.0055, 0)
    return g
  })
)
export const heatScrews = screwSet([
  [-0.019, 0.0026, -0.012],
  [0.019, 0.0026, -0.012],
  [-0.019, 0.0026, 0.012],
  [0.019, 0.0026, 0.012],
])

/* ---------------- GPS ---------------- */

export const gpsDomeGeo = lathe(
  [
    [0.0172, 0],
    [0.0186, 0.0018],
    [0.0186, 0.0042],
    [0.017, 0.0066],
    [0.0138, 0.0082],
    [0.0088, 0.0092],
    [0.0, 0.0095],
  ],
  52
)
export const gpsRingGeo = lathe(
  [
    [0.0174, -0.0014],
    [0.0191, -0.0004],
    [0.0191, 0.0008],
    [0.0174, 0.0014],
    [0.0174, -0.0014],
  ],
  52
)

/* ---------------- 指示灯 ---------------- */

/** 侧面灯带（含灯罩凹槽与扩散条） */
export const ledChannelGeo = mergeGeometries(
  [-1, 1].map((sx) => {
    const pts: [number, number, number][] = []
    for (let i = 0; i <= 14; i++) {
      const z = -0.024 + (0.062 * i) / 14
      const x = sx * 0.0495
      pts.push([x, bodyTopY(z, x) - 0.0022, z])
    }
    return sweptTube(curveOf(pts), 0.0026, 0.0022, 26, 10)
  })
)
export const ledStripGeo = mergeGeometries(
  [-1, 1].map((sx) => {
    const pts: [number, number, number][] = []
    for (let i = 0; i <= 14; i++) {
      const z = -0.024 + (0.062 * i) / 14
      const x = sx * 0.0495
      pts.push([x, bodyTopY(z, x) - 0.0019, z])
    }
    return sweptTube(curveOf(pts), 0.0016, 0.0013, 26, 8)
  })
)
/** 机头双前灯（灯座 + 扩散片） */
export const ledEyeHousingGeo = mergeGeometries(
  [-1, 1].map((sx) => {
    const g = lathe(
      [
        [0.0042, 0],
        [0.0072, 0],
        [0.0076, 0.0014],
        [0.0068, 0.003],
        [0.0042, 0.0034],
        [0.0042, 0],
      ],
      24
    )
    g.rotateX(-Math.PI / 2)
    g.translate(sx * 0.0142, 0.0241, -0.1515)
    return g
  })
)
export const ledEyeLensGeo = mergeGeometries(
  [-1, 1].map((sx) => {
    const g = lathe(
      [
        [0, 0],
        [0.0044, 0],
        [0.0044, 0.0014],
        [0.0032, 0.0022],
        [0, 0.0024],
      ],
      24
    )
    g.rotateX(-Math.PI / 2)
    g.translate(sx * 0.0142, 0.0262, -0.1515)
    return g
  })
)
/** 尾部三色导航灯 */
export const ledTailGeo = mergeGeometries(
  [-1, 0, 1].map((i) => {
    const g = chamferBox(0.0072, 0.0044, 0.0024, 0.0018, 0.0005, 2)
    g.translate(i * 0.0125, -0.0035, 0.1745)
    return g
  })
)

/** 通用螺钉柱 */
export function boltGeo(r = 0.0016, h = 0.0018): THREE.BufferGeometry {
  return lathe(
    [
      [0, 0],
      [r, 0],
      [r, h * 0.6],
      [r * 0.7, h],
      [0, h],
    ],
    12
  )
}

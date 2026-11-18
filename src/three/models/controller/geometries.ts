import * as THREE from 'three'
import {
  buildLoft,
  buildShell,
  chamferBox,
  curveOf,
  flatPlate,
  frameBox,
  lathe,
  mergeGeometries,
  superRing,
  sweepProfile,
  sweptTube,
} from '../shared/geometry'
import { CTRL, SPLIT_Z, SHELL_SECTIONS, gripCurve } from './config'

const frontSections = SHELL_SECTIONS.filter((s) => s.z >= SPLIT_Z - 1e-6)
const rearSections = SHELL_SECTIONS.filter((s) => s.z <= SPLIT_Z + 1e-6)

// 前后壳为带壁厚的开放壳体，拆解后可见内腔与加强筋
export const frontShellGeo = buildShell(frontSections, 0.9, 'zmin')
export const rearShellGeo = buildShell(rearSections, 0.9, 'zmax')

/** 左右手柄（属于前壳总成）：根部圆角过渡、末端收口 */
export const gripGeo = mergeGeometries(
  [-1, 1].map((side) => {
    const c = curveOf(gripCurve(side))
    return sweepProfile(c, superRing(2, 2, 2, 26), 56, {
      scaleAt: (t) => {
        const base = 0.0282 - 0.0072 * Math.pow(t, 0.85)
        const taper = t > 0.84 ? 1 - 0.34 * Math.pow((t - 0.84) / 0.16, 1.5) : 1
        return base * taper
      },
    })
  })
)

/** 手柄防滑贴片（下半段橡胶套） */
export const gripPadGeo = mergeGeometries(
  [-1, 1].map((side) => {
    const pts = gripCurve(side).slice(2)
    const c = curveOf(
      pts.map(([x, y, z]) => [x + side * 0.0035, y - 0.004, z + 0.002] as [number, number, number])
    )
    return sweepProfile(c, superRing(2, 2, 2, 24), 30, {
      scaleAt: (t) => 0.0238 - 0.0032 * t,
    })
  })
)

/** 屏幕边框 */
export const screenBezelGeo = frameBox(
  CTRL.screenSize[0] + 0.012,
  CTRL.screenSize[1] + 0.012,
  0.0042,
  0.0055,
  0.0012
)

/** 屏幕玻璃（略高于边框） */
export const screenGlassGeo = chamferBox(
  CTRL.screenSize[0] + 0.0035,
  CTRL.screenSize[1] + 0.0035,
  0.0018,
  0.0025,
  0.0006
)

/* ---------------- 摇杆 ---------------- */

export const stickShaftGeo = (() => {
  const g = lathe(
    [
      [0, 0],
      [0.0046, 0],
      [0.0042, 0.004],
      [0.0038, 0.020],
      [0.0042, 0.022],
      [0.0042, 0.024],
      [0, 0.024],
    ],
    20
  )
  g.rotateX(Math.PI / 2)
  return g
})()

export const stickCapGeo = (() => {
  const g = lathe(
    [
      [0.0, 0.000],
      [0.0096, 0.000],
      [0.0122, 0.0018],
      [0.0128, 0.005],
      [0.0118, 0.0084],
      [0.0092, 0.0104],
      [0.0054, 0.0114],
      [0.0, 0.0116],
    ],
    40
  )
  g.rotateX(-Math.PI / 2)
  return g
})()

/** 摇杆帽滚花（一圈细齿） */
export const stickKnurlGeo = (() => {
  const geos: THREE.BufferGeometry[] = []
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2
    const g = chamferBox(0.0011, 0.0011, 0.0058, 0.0004, 0.0002, 1)
    g.translate(Math.cos(a) * 0.0124, Math.sin(a) * 0.0124, 0)
    g.rotateZ(a)
    geos.push(g)
  }
  return mergeGeometries(geos)
})()

export const stickBaseGeo = (() => {
  const g = lathe(
    [
      [0.0072, -0.002],
      [0.0166, -0.002],
      [0.0172, 0.0],
      [0.0172, 0.0055],
      [0.0158, 0.0072],
      [0.0082, 0.0078],
      [0.0072, 0.0078],
      [0.0072, -0.002],
    ],
    40
  )
  g.rotateX(Math.PI / 2)
  return g
})()

export const stickBaseRingGeo = new THREE.TorusGeometry(0.0178, 0.0011, 10, 44)

/* ---------------- 按键 ---------------- */

export const powerBtnGeo = (() => {
  const g = lathe(
    [
      [0, 0],
      [0.0078, 0],
      [0.0082, 0.0012],
      [0.0082, 0.0032],
      [0.0074, 0.0044],
      [0, 0.0046],
    ],
    30
  )
  g.rotateX(-Math.PI / 2)
  return g
})()

export const powerRingGeo = new THREE.TorusGeometry(0.0094, 0.0009, 8, 32)
export const roundBtnGeo = (r: number, h: number) => {
  const g = lathe(
    [
      [0, 0],
      [r * 0.92, 0],
      [r, h * 0.35],
      [r * 0.94, h * 0.8],
      [r * 0.8, h],
      [0, h * 1.04],
    ],
    28
  )
  g.rotateX(-Math.PI / 2)
  return g
}

export const backBtnGeo = roundBtnGeo(0.0078, 0.0042)
export const shutterBtnGeo = roundBtnGeo(0.0098, 0.0058)

/** 三档拨杆 */
export const modeSwitchGeo = (() => {
  const body = chamferBox(0.017, 0.011, 0.006, 0.0025, 0.0008)
  body.translate(0, 0, -0.001)
  const lever = chamferBox(0.006, 0.012, 0.010, 0.002, 0.0008)
  lever.translate(0, 0.004, 0.006)
  return mergeGeometries([body, lever])
})()

/* ---------------- 天线 ---------------- */

export const antennaRodGeo = (() => {
  const g = lathe(
    [
      [0.0, 0],
      [0.0072, 0],
      [0.0076, 0.004],
      [0.0062, 0.012],
      [0.0050, 0.030],
      [0.0044, 0.070],
      [0.0036, 0.092],
      [0.0018, 0.098],
      [0.0, 0.099],
    ],
    30
  )
  return g
})()

export const antennaHingeGeo = (() => {
  const g = lathe(
    [
      [0, -0.0055],
      [0.0078, -0.0055],
      [0.0082, -0.004],
      [0.0082, 0.004],
      [0.0078, 0.0055],
      [0, 0.0055],
    ],
    24
  )
  g.rotateZ(Math.PI / 2)
  return g
})()

/* ---------------- 后壳细节 ---------------- */

export const rearVentGeo = mergeGeometries(
  Array.from({ length: 7 }, (_, i) => {
    const g = chamferBox(0.0018, 0.042, 0.0055, 0.0006, 0.0002, 1)
    g.translate(-0.030 + i * 0.010, 0.040, -0.0315)
    return g
  })
)

export const rearPadGeo = mergeGeometries(
  [-1, 1].map((side) => {
    const pts = gripCurve(side)
    const c = curveOf(pts.map(([x, y, z]) => [x + side * 0.020, y - 0.010, z - 0.012] as [number, number, number]))
    return sweptTube(c, 0.0125, 0.009, 30, 12)
  })
)

export const portPlateGeo = (() => {
  const plate = chamferBox(0.030, 0.012, 0.0035, 0.002, 0.0006)
  plate.translate(0, -0.030, -0.0325)
  const slot = chamferBox(0.012, 0.0045, 0.002, 0.0018, 0.0004)
  slot.translate(0, -0.030, -0.0342)
  return mergeGeometries([plate, slot])
})()

export const tripodGeo = (() => {
  const g = lathe(
    [
      [0.0035, 0],
      [0.0075, 0],
      [0.0075, 0.0028],
      [0.0035, 0.0028],
      [0.0035, 0],
    ],
    26
  )
  g.rotateX(Math.PI / 2)
  g.translate(0, -0.006, -0.033)
  return g
})()

/* ---------------- 内部结构 ---------------- */

export const rcBoardGeo = chamferBox(0.168, 0.078, 0.0024, 0.004, 0.0006)
export const rcBoardChipsGeo = mergeGeometries(
  [
    { w: 0.022, h: 0.022, x: -0.048, y: 0.012 },
    { w: 0.014, h: 0.016, x: 0.004, y: 0.018 },
    { w: 0.026, h: 0.010, x: 0.048, y: -0.014 },
    { w: 0.010, h: 0.020, x: -0.010, y: -0.022 },
    { w: 0.016, h: 0.008, x: 0.032, y: 0.026 },
  ].map((c) => {
    const g = chamferBox(c.w, c.h, 0.004, 0.001, 0.0004, 2)
    g.translate(c.x, c.y, 0.0022)
    return g
  })
)
export const rcShieldGeo = (() => {
  const g = chamferBox(0.034, 0.026, 0.0055, 0.002, 0.0006)
  g.translate(-0.048, 0.012, 0.0056)
  return g
})()

export const rcBatteryGeo = chamferBox(0.086, 0.056, 0.0092, 0.004, 0.0012)
export const rcBatteryTabGeo = chamferBox(0.020, 0.012, 0.003, 0.0015, 0.0005)

export const rcCoolingGeo = (() => {
  const base = flatPlate(0.062, 0.0035, 0.042, 0.004, 0.001)
  const fins = mergeGeometries(
    Array.from({ length: 8 }, (_, i) => {
      const g = chamferBox(0.0012, 0.008, 0.038, 0.0004, 0.0002, 1)
      g.translate(-0.024 + i * 0.0068, 0.0055, 0)
      return g
    })
  )
  return mergeGeometries([base, fins])
})()

export const rcFrameGeo = mergeGeometries([
  (() => {
    const g = chamferBox(0.176, 0.009, 0.010, 0.003, 0.0008)
    g.translate(0, 0.046, 0)
    return g
  })(),
  (() => {
    const g = chamferBox(0.176, 0.009, 0.010, 0.003, 0.0008)
    g.translate(0, 0.012, 0)
    return g
  })(),
  ...[-1, 1].map((sx) => {
    const g = chamferBox(0.010, 0.044, 0.010, 0.003, 0.0008)
    g.translate(sx * 0.076, 0.029, 0)
    return g
  }),
  ...[-1, 1].map((sx) => {
    const g = chamferBox(0.012, 0.016, 0.012, 0.003, 0.0008)
    g.translate(sx * 0.050, 0.064, -0.004)
    return g
  }),
])

/** 前壳内腔加强筋与螺钉柱（拆解后可见） */
export const frontRibsGeo = mergeGeometries([
  ...[0.030, 0.062, 0.090].map((y) => {
    const g = chamferBox(0.178, 0.007, 0.014, 0.003, 0.0008)
    g.translate(0, y, 0.012)
    return g
  }),
  ...[-0.062, 0.062].map((x) => {
    const g = chamferBox(0.007, 0.080, 0.012, 0.003, 0.0008)
    g.translate(x, 0.015, 0.012)
    return g
  }),
  ...[[-0.086, 0.020], [0.086, 0.020], [-0.086, 0.096], [0.086, 0.096], [0, 0.104]].map(([x, y]) => {
    const g = lathe([[0, 0], [0.0048, 0], [0.0048, 0.013], [0.0034, 0.013], [0.0034, 0.002], [0, 0.002]], 14)
    g.rotateX(Math.PI / 2)
    g.translate(x, y, 0.004)
    return g
  }),
])

/** 后壳内腔筋位 */
export const rearRibsGeo = mergeGeometries([
  ...[0.026, 0.086].map((y) => {
    const g = chamferBox(0.170, 0.006, 0.010, 0.0025, 0.0006)
    g.translate(0, y, -0.018)
    return g
  }),
  ...[-0.070, 0.070].map((x) => {
    const g = chamferBox(0.006, 0.070, 0.010, 0.0025, 0.0006)
    g.translate(x, 0.056, -0.018)
    return g
  }),
])

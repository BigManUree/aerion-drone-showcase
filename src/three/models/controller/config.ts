import * as THREE from 'three'
import type { LoftSection } from '../shared/geometry'

/** 遥控器主体截面：Z 方向为前后（+Z 为正面），XY 为正面轮廓 */
export const SHELL_SECTIONS: LoftSection[] = [
  { z: -0.033, w: 0.172, h: 0.088, y: 0.048, n: 4.6, seg: 44 },
  { z: -0.026, w: 0.192, h: 0.102, y: 0.054, n: 4.9, seg: 44 },
  { z: -0.014, w: 0.206, h: 0.111, y: 0.057, n: 5.2, seg: 44 },
  { z: 0.000, w: 0.212, h: 0.114, y: 0.057, n: 5.4, seg: 44 },
  { z: 0.016, w: 0.209, h: 0.112, y: 0.057, n: 5.3, seg: 44 },
  { z: 0.028, w: 0.199, h: 0.105, y: 0.056, n: 5.0, seg: 44 },
  { z: 0.034, w: 0.186, h: 0.098, y: 0.055, n: 4.7, seg: 44 },
]

export const SPLIT_Z = 0.002

/** 关键元件位置 */
export const CTRL = {
  screen: [0, 0.072, 0.0345] as [number, number, number],
  screenSize: [0.100, 0.058] as [number, number],
  stickL: [-0.078, 0.024, 0.030] as [number, number, number],
  stickR: [0.078, 0.024, 0.030] as [number, number, number],
  baseL: [-0.078, 0.024, 0.0285] as [number, number, number],
  baseR: [0.078, 0.024, 0.0285] as [number, number, number],
  btnPower: [0.072, 0.097, 0.0295] as [number, number, number],
  btnBack: [-0.072, 0.097, 0.0295] as [number, number, number],
  btnMode: [0.072, 0.062, 0.0305] as [number, number, number],
  btnShutter: [-0.072, 0.062, 0.0305] as [number, number, number],
  antennaL: [-0.070, 0.110, -0.010] as [number, number, number],
  antennaR: [0.070, 0.110, -0.010] as [number, number, number],
}

/** 天线展开姿态 */
export const ANTENNA_ROT = {
  L: [-0.38, 0.15, 0.22] as [number, number, number],
  R: [-0.38, -0.15, -0.22] as [number, number, number],
}

export const gripCurve = (side: number): [number, number, number][] => [
  [side * 0.082, 0.014, 0.004],
  [side * 0.092, -0.006, 0.006],
  [side * 0.091, -0.034, 0.008],
  [side * 0.080, -0.060, 0.010],
  [side * 0.068, -0.074, 0.012],
]

export function lerp3(a: [number, number, number], b: [number, number, number], t: number) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t] as [
    number,
    number,
    number,
  ]
}

export const THREE_UP = new THREE.Vector3(0, 1, 0)

import type { LoftSection } from '../shared/geometry'

/**
 * 主机身超椭圆截面（放样基准，Z 为前后轴，-Z 为机头）
 * 19 个站位保证机头圆润过渡与上盖连续曲面
 */
export const BODY_SECTIONS: LoftSection[] = [
  { z: -0.1815, w: 0.011, h: 0.010, y: 0.0, n: 2.1, seg: 56 },
  { z: -0.1795, w: 0.023, h: 0.018, y: 0.0, n: 2.2, seg: 56 },
  { z: -0.1750, w: 0.038, h: 0.028, y: 0.0, n: 2.5, seg: 56 },
  { z: -0.1680, w: 0.053, h: 0.038, y: 0.0, n: 2.8, seg: 56 },
  { z: -0.1570, w: 0.067, h: 0.046, y: 0.0, n: 3.1, seg: 56 },
  { z: -0.1420, w: 0.079, h: 0.054, y: 0.0, n: 3.35, seg: 56 },
  { z: -0.1220, w: 0.090, h: 0.060, y: 0.0, n: 3.6, seg: 56 },
  { z: -0.0980, w: 0.098, h: 0.067, y: 0.0, n: 3.8, seg: 56 },
  { z: -0.0680, w: 0.104, h: 0.072, y: 0.0, n: 3.95, seg: 56 },
  { z: -0.0340, w: 0.108, h: 0.076, y: 0.0, n: 4.1, seg: 56 },
  { z: 0.0020, w: 0.110, h: 0.078, y: 0.0, n: 4.2, seg: 56 },
  { z: 0.0380, w: 0.109, h: 0.077, y: 0.0, n: 4.2, seg: 56 },
  { z: 0.0720, w: 0.106, h: 0.075, y: 0.0, n: 4.1, seg: 56 },
  { z: 0.1020, w: 0.100, h: 0.070, y: 0.0, n: 3.95, seg: 56 },
  { z: 0.1280, w: 0.090, h: 0.063, y: 0.0, n: 3.75, seg: 56 },
  { z: 0.1500, w: 0.075, h: 0.053, y: 0.0, n: 3.45, seg: 56 },
  { z: 0.1670, w: 0.053, h: 0.038, y: 0.0, n: 3.05, seg: 56 },
  { z: 0.1760, w: 0.030, h: 0.022, y: 0.0, n: 2.6, seg: 56 },
  { z: 0.1800, w: 0.014, h: 0.011, y: 0.0, n: 2.3, seg: 56 },
]

export const SEAM_SPLIT = 0.505

export type ArmKey = 'FL' | 'FR' | 'RL' | 'RR'

export interface ArmConfig {
  key: ArmKey
  armId: string
  motorId: string
  propId: string
  hinge: [number, number, number]
  tip: [number, number, number]
  /** 桨叶旋转方向 */
  spin: 1 | -1
  propAngle: number
}

export const ARM_CONFIGS: ArmConfig[] = [
  {
    key: 'FL',
    armId: 'drone.armFL',
    motorId: 'drone.motorFL',
    propId: 'drone.propFL',
    hinge: [-0.0495, -0.003, -0.062],
    tip: [-0.246, 0.004, -0.196],
    spin: 1,
    propAngle: 12,
  },
  {
    key: 'FR',
    armId: 'drone.armFR',
    motorId: 'drone.motorFR',
    propId: 'drone.propFR',
    hinge: [0.0495, -0.003, -0.062],
    tip: [0.246, 0.004, -0.196],
    spin: -1,
    propAngle: 64,
  },
  {
    key: 'RL',
    armId: 'drone.armRL',
    motorId: 'drone.motorRL',
    propId: 'drone.propRL',
    hinge: [-0.048, -0.003, 0.070],
    tip: [-0.238, 0.004, 0.204],
    spin: -1,
    propAngle: 38,
  },
  {
    key: 'RR',
    armId: 'drone.armRR',
    motorId: 'drone.motorRR',
    propId: 'drone.propRR',
    hinge: [0.048, -0.003, 0.070],
    tip: [0.238, 0.004, 0.204],
    spin: 1,
    propAngle: 84,
  },
]

/** 云台相机基准位置（pitch 轴中心） */
export const GIMBAL = {
  mount: [0, -0.024, -0.118] as [number, number, number],
  yaw: [0, -0.048, -0.122] as [number, number, number],
  camera: [0, -0.072, -0.134] as [number, number, number],
}

/**
 * 三轴云台静止姿态（yaw → roll → pitch 逐级复合）
 * Frame 与 Camera 系列零件共用该姿态，保证层级一致
 */
export const GIMBAL_POSE = {
  yaw: -0.075,
  roll: 0.035,
  pitch: -0.115,
}

/** 桨毂顶面高度（相对电机座） */
export const PROP_Y = 0.0505

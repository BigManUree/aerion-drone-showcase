import type { PartLevel } from '../types'

/**
 * 四级拆解在全局进度（0~1）上的分布区间
 * 相邻层级有重叠，保证整体动画连续、无跳变
 */
export const LEVEL_BANDS: Record<PartLevel, [number, number]> = {
  1: [0.0, 0.36],
  2: [0.1, 0.62],
  3: [0.4, 0.82],
  4: [0.62, 1.0],
}

export const LEVEL_META = [
  {
    level: 1 as PartLevel,
    name: '外部附件',
    code: 'EXTERNAL ACCESSORIES',
    items: ['四组螺旋桨', '云台保护罩', '智能电池', '左右起落架'],
  },
  {
    level: 2 as PartLevel,
    name: '外部机身',
    code: 'AIRFRAME',
    items: ['上机身外壳', '下机身外壳', '四条机臂', '四个电机', '固定螺钉'],
  },
  {
    level: 3 as PartLevel,
    name: '内部组件',
    code: 'INTERNAL MODULES',
    items: ['主控制板', 'GPS 模块', '电源模块', '散热模块', '内部线缆'],
  },
  {
    level: 4 as PartLevel,
    name: '精密组件',
    code: 'PRECISION ASSEMBLY',
    items: ['云台三轴结构', '摄像头模组', '视觉传感器', '内部固定支架', '电池仓'],
  },
]

/**
 * 计算零件在全局进度上的运动区段
 * start = 层级起点 + order ×（层级跨度 − 区段长度）
 */
export function motionWindow(
  level: PartLevel,
  order: number,
  duration: number
): [number, number] {
  const [a, b] = LEVEL_BANDS[level]
  const span = b - a
  const dur = Math.min(Math.max(duration, 0.08), span)
  const o = Math.min(Math.max(order, 0), 1)
  const start = a + o * (span - dur)
  return [Number(start.toFixed(4)), Number((start + dur).toFixed(4))]
}

/** 层级在某一进度下的完成度（用于 UI 高亮） */
export function levelProgress(level: PartLevel, p: number): number {
  const [a, b] = LEVEL_BANDS[level]
  return Math.min(1, Math.max(0, (p - a) / (b - a)))
}

export const EASE = {
  /** 平滑起步/收尾，用于每个零件的局部进度 */
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
}

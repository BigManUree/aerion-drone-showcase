import type { ModelKind, PartDef, PartMotion } from '../types'
import { motionWindow } from './motion'
import { droneMeta, droneParts } from './droneParts'
import { controllerMeta, controllerParts } from './controllerParts'

/** 补齐 order / duration 默认值（控制器沿用旧数据时按层级内序号错峰） */
function normalize(list: PartDef[], model: ModelKind): PartDef[] {
  const counters: Record<number, number> = {}
  const totals: Record<number, number> = {}
  for (const p of list) totals[p.level] = (totals[p.level] ?? 0) + 1
  return list.map((p) => {
    const idx = counters[p.level] ?? 0
    counters[p.level] = idx + 1
    return {
      ...p,
      model,
      order: p.order ?? (totals[p.level] > 1 ? idx / (totals[p.level] - 1) : 0),
      duration: p.duration ?? 0.24,
    }
  })
}

export const partsByModel: Record<ModelKind, PartDef[]> = {
  drone: normalize(droneParts, 'drone'),
  controller: normalize(controllerParts, 'controller'),
}

/**
 * 父子跟随关系：安装在外壳上的零件随外壳一起位移，
 * 自身 explode 值只表示相对外壳的增量，因此不存在父子重复位移
 */
export const FOLLOW_MAP: Record<string, string> = {
  'drone.gimbalFrame': 'drone.bottomShell',
  'drone.cameraShell': 'drone.bottomShell',
  'drone.cameraLens': 'drone.bottomShell',
  'drone.visionFront': 'drone.bottomShell',
  'drone.visionRear': 'drone.bottomShell',
  'drone.internalBracket': 'drone.bottomShell',
  'drone.mainBoard': 'drone.bottomShell',
  'drone.gps': 'drone.bottomShell',
  'drone.powerModule': 'drone.bottomShell',
  'drone.cables': 'drone.bottomShell',
  'drone.batteryBay': 'drone.topShell',
  'drone.heatSink': 'drone.topShell',
}

/** 预计算每个零件的运动定义（含全局进度区段） */
export const motionByModel: Record<ModelKind, Record<string, PartMotion>> = {
  drone: {},
  controller: {},
}
for (const kind of ['drone', 'controller'] as ModelKind[]) {
  for (const p of partsByModel[kind]) {
    motionByModel[kind][p.id] = {
      id: p.id,
      level: p.level,
      follow: FOLLOW_MAP[p.id],
      window: motionWindow(p.level, p.order ?? 0.5, p.duration ?? 0.24),
      offset: p.explode,
      rot: [
        ((p.explodeRot?.[0] ?? 0) * Math.PI) / 180,
        ((p.explodeRot?.[1] ?? 0) * Math.PI) / 180,
        ((p.explodeRot?.[2] ?? 0) * Math.PI) / 180,
      ],
    }
  }
}

export const motionById: Record<string, PartMotion> = {
  ...motionByModel.drone,
  ...motionByModel.controller,
}

export const metaByModel = {
  drone: droneMeta,
  controller: controllerMeta,
}

export const allParts: PartDef[] = [...droneParts, ...controllerParts]

export const partMap: Record<string, PartDef> = allParts.reduce(
  (acc, p) => {
    acc[p.id] = p
    return acc
  },
  {} as Record<string, PartDef>
)

export function getPart(id: string | null): PartDef | null {
  if (!id) return null
  return partMap[id] ?? null
}

export function categoriesOf(model: ModelKind): string[] {
  const seen: string[] = []
  for (const p of partsByModel[model]) {
    if (!seen.includes(p.category)) seen.push(p.category)
  }
  return seen
}

export function partsOfCategory(model: ModelKind, category: string): PartDef[] {
  return partsByModel[model].filter((p) => p.category === category)
}

export function partsOfLevel(model: ModelKind, level: number): PartDef[] {
  return partsByModel[model].filter((p) => p.level === level)
}

/** 全局进度下某零件的局部进度（0~1，未缓动） */
export function partT(model: ModelKind, id: string, progress: number): number {
  const m = motionByModel[model][id]
  if (!m) return 0
  const [a, b] = m.window
  if (b <= a) return progress >= a ? 1 : 0
  return Math.min(1, Math.max(0, (progress - a) / (b - a)))
}

export { droneParts, controllerParts, droneMeta, controllerMeta }

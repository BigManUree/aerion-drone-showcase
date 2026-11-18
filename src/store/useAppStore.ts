import { create } from 'zustand'
import type { ModelKind } from '../types'
import { partsByModel, motionByModel } from '../data'

export interface FocusRequest {
  id: string
  token: number
}

/** 自动播放方向 */
export type AutoDir = 'explode' | 'restore' | null

/** 相机视图预设 */
export type ViewMode = 'iso' | 'front' | 'top' | 'side'

/** 场景背景主题 */
export type BgTheme = 'studio' | 'blueprint' | 'graphite'

interface AppState {
  model: ModelKind
  selectedId: string | null
  hoveredId: string | null
  /** 分模型记忆选中零件，切换模型再切回时恢复 */
  selectedByModel: Record<ModelKind, string | null>

  /** 隐藏零件（按全局零件 id，跨模型天然隔离） */
  hidden: Record<string, boolean>

  /** 全局拆解进度 0~1（唯一真值，滑块 / 动画 / 分级都写它） */
  progress: number
  /** 拆解距离系数 */
  distance: number
  /** 播放速度倍率 */
  speed: number
  /** 动画暂停 */
  paused: boolean
  /** 自动播放方向 */
  autoDir: AutoDir
  /** 单零件强制拆解（0~1），用于“单独拆解此零件” */
  boost: Record<string, number>

  autoRotate: boolean
  spinProps: boolean
  contactShadows: boolean
  /** 场景网格 */
  grid: boolean
  /** 坐标辅助线 */
  axes: boolean
  /** 结构标注 */
  annotations: boolean
  bg: BgTheme
  viewMode: ViewMode

  settingsOpen: boolean
  helpOpen: boolean
  panelsOpen: boolean
  cameraToken: number
  focus: FocusRequest | null

  setModel: (m: ModelKind) => void
  select: (id: string | null) => void
  hover: (id: string | null) => void

  toggleHidden: (id: string) => void
  setHidden: (id: string, v: boolean) => void
  setManyHidden: (ids: string[], v: boolean) => void
  showAll: () => void

  setProgress: (p: number) => void
  setDistance: (d: number) => void
  setSpeed: (s: number) => void
  setPaused: (p: boolean) => void
  setAutoDir: (d: AutoDir) => void
  setBoost: (id: string, v: number) => void
  clearBoost: () => void

  setAutoRotate: (v: boolean) => void
  setSpinProps: (v: boolean) => void
  setContactShadows: (v: boolean) => void
  setGrid: (v: boolean) => void
  setAxes: (v: boolean) => void
  setAnnotations: (v: boolean) => void
  setBg: (v: BgTheme) => void
  setViewMode: (v: ViewMode) => void

  setSettingsOpen: (v: boolean) => void
  setHelpOpen: (v: boolean) => void
  setPanelsOpen: (v: boolean) => void
  resetCamera: () => void
  focusPart: (id: string) => void
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export const useAppStore = create<AppState>((set, get) => ({
  model: 'drone',
  selectedId: null,
  hoveredId: null,
  selectedByModel: { drone: null, controller: null },
  hidden: {},

  progress: 0,
  distance: 0.86,
  speed: 1,
  paused: false,
  autoDir: null,
  boost: {},

  autoRotate: true,
  spinProps: true,
  contactShadows: true,
  grid: true,
  axes: true,
  annotations: true,
  bg: 'studio',
  viewMode: 'iso',

  settingsOpen: false,
  helpOpen: false,
  panelsOpen: typeof window === 'undefined' ? true : window.innerWidth >= 1280,
  cameraToken: 0,
  focus: null,

  setModel: (m) => {
    const st = get()
    if (st.model === m) return
    set({
      model: m,
      // 切到目标模型时恢复该模型上次选中的零件（隐藏的零件除外）
      selectedId: st.selectedByModel[m] && !st.hidden[st.selectedByModel[m]!] ? st.selectedByModel[m] : null,
      hoveredId: null,
      progress: 0,
      autoDir: null,
      paused: false,
      boost: {},
      cameraToken: st.cameraToken + 1,
      focus: null,
    })
  },

  select: (id) => {
    const st = get()
    set({
      selectedId: id,
      selectedByModel: { ...st.selectedByModel, [st.model]: id },
    })
  },
  hover: (id) => set({ hoveredId: id }),

  toggleHidden: (id) => {
    const st = get()
    const next = !st.hidden[id]
    const map = { ...st.hidden }
    if (next) map[id] = true
    else delete map[id]
    set({
      hidden: map,
      // 隐藏当前选中零件时同步取消选中，避免信息面板与场景不一致
      selectedId: next && st.selectedId === id ? null : st.selectedId,
      hoveredId: next && st.hoveredId === id ? null : st.hoveredId,
    })
  },

  setHidden: (id, v) => {
    const st = get()
    const map = { ...st.hidden }
    if (v) map[id] = true
    else delete map[id]
    set({
      hidden: map,
      selectedId: v && st.selectedId === id ? null : st.selectedId,
      hoveredId: v && st.hoveredId === id ? null : st.hoveredId,
    })
  },

  setManyHidden: (ids, v) => {
    const st = get()
    const map = { ...st.hidden }
    for (const id of ids) {
      if (v) map[id] = true
      else delete map[id]
    }
    set({
      hidden: map,
      selectedId: v && st.selectedId && ids.includes(st.selectedId) ? null : st.selectedId,
    })
  },

  showAll: () => set({ hidden: {} }),

  setProgress: (p) => set({ progress: clamp01(p) }),
  setDistance: (d) => set({ distance: d }),
  setSpeed: (s) => set({ speed: s }),
  setPaused: (p) => set({ paused: p }),
  setAutoDir: (d) => set({ autoDir: d }),
  setBoost: (id, v) => set({ boost: { ...get().boost, [id]: clamp01(v) } }),
  clearBoost: () => set({ boost: {} }),

  setAutoRotate: (v) => set({ autoRotate: v }),
  setSpinProps: (v) => set({ spinProps: v }),
  setContactShadows: (v) => set({ contactShadows: v }),
  setGrid: (v) => set({ grid: v }),
  setAxes: (v) => set({ axes: v }),
  setAnnotations: (v) => set({ annotations: v }),
  setBg: (v) => set({ bg: v }),
  setViewMode: (v) => set({ viewMode: v, cameraToken: get().cameraToken + 1, focus: null }),

  setSettingsOpen: (v) => set({ settingsOpen: v }),
  setHelpOpen: (v) => set({ helpOpen: v }),
  setPanelsOpen: (v) => set({ panelsOpen: v }),
  resetCamera: () => set({ cameraToken: get().cameraToken + 1, focus: null }),
  focusPart: (id) =>
    set({
      selectedId: id,
      selectedByModel: { ...get().selectedByModel, [get().model]: id },
      focus: { id, token: (get().focus?.token ?? 0) + 1 },
    }),
}))

/** 当前模型某零件的局部进度（未缓动） */
export function partProgress(model: ModelKind, id: string, progress: number): number {
  const m = motionByModel[model][id]
  if (!m) return 0
  const [a, b] = m.window
  if (b <= a) return progress >= a ? 1 : 0
  return Math.min(1, Math.max(0, (progress - a) / (b - a)))
}

/** 拆解概览：进度、已展开零件数、总数、隐藏数 */
export function useExplodeProgress(): {
  progress: number
  percent: number
  done: number
  total: number
  hiddenCount: number
  visibleCount: number
} {
  const model = useAppStore((s) => s.model)
  const progress = useAppStore((s) => s.progress)
  const boost = useAppStore((s) => s.boost)
  const hidden = useAppStore((s) => s.hidden)
  const list = partsByModel[model]
  let done = 0
  let hiddenCount = 0
  for (const p of list) {
    if (hidden[p.id]) {
      hiddenCount++
      continue
    }
    const t = Math.max(partProgress(model, p.id, progress), boost[p.id] ?? 0)
    if (t > 0.5) done++
  }
  return {
    progress,
    percent: Math.round(progress * 100),
    done,
    total: list.length,
    hiddenCount,
    visibleCount: list.length - hiddenCount,
  }
}

/** 单个零件的实时进度（0~1，含单件加成） */
export function usePartT(id: string): number {
  const model = useAppStore((s) => s.model)
  const progress = useAppStore((s) => s.progress)
  const boost = useAppStore((s) => s.boost[id] ?? 0)
  return Math.max(partProgress(model, id, progress), boost)
}

/** 当前生效的层级（进度落在哪一段） */
export function currentLevel(progress: number): 1 | 2 | 3 | 4 {
  if (progress >= 0.62) return 4
  if (progress >= 0.4) return 3
  if (progress >= 0.1) return 2
  return 1
}

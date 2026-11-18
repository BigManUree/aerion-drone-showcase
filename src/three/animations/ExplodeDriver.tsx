import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import gsap from 'gsap'
import { partRegistry } from '../core/PartRegistry'
import { useAppStore } from '../../store/useAppStore'
import { EASE } from '../../data/motion'

/**
 * 单零件强制拆解动画值（0~1），与全局进度取最大值
 * 注意：以 {v} 包装而不是直接用 'drone.xxx' 作 key，
 * 否则 GSAP 会把带点的 key 当成嵌套路径解析，动画不会生效。
 */
export const boostAnim: Record<string, { v: number }> = {}

function holder(id: string) {
  if (!boostAnim[id]) boostAnim[id] = { v: 0 }
  return boostAnim[id]
}

export function boostOf(id: string) {
  return boostAnim[id]?.v ?? 0
}

export function animateBoost(id: string, on: boolean, dur = 0.7) {
  const h = holder(id)
  gsap.killTweensOf(h)
  gsap.to(h, {
    v: on ? 1 : 0,
    duration: dur,
    ease: 'power2.inOut',
    onComplete: () => useAppStore.getState().setBoost(id, on ? 1 : 0),
  })
}

export function resetBoostAnim() {
  for (const k of Object.keys(boostAnim)) delete boostAnim[k]
}

/**
 * 统一拆解驱动
 * 每帧读取全局拆解进度，对每个零件按 [start,end] 区段求局部进度并插值，
 * 位移只作用在外层 group 上（内层保留装配变换），因此父子零件不会重复位移。
 */
export function ExplodeDriver() {
  const last = useRef({ p: -1, d: -1, v: -1, boost: -1 })

  useFrame(() => {
    const st = useAppStore.getState()
    const p = st.progress
    const dist = st.distance
    const v = partRegistry.version

    let boostSum = 0
    for (const k in boostAnim) boostSum += boostAnim[k].v
    const boostKey = Math.round(boostSum * 1000)

    if (p === last.current.p && dist === last.current.d && v === last.current.v && boostKey === last.current.boost) {
      return
    }
    last.current = { p, d: dist, v, boost: boostKey }

    const entries = partRegistry.entries()

    // 第一遍：算出每个零件自身的局部进度与位移
    const tMap = new Map<string, { t: number; x: number; y: number; z: number }>()
    for (const entry of entries) {
      const { window, offset } = entry.motion
      const [a, b] = window
      let t = b > a ? (p - a) / (b - a) : p >= a ? 1 : 0
      t = t < 0 ? 0 : t > 1 ? 1 : t
      t = EASE.inOutCubic(t)

      const boost = boostAnim[entry.id]?.v ?? 0
      if (boost > t) t = boost

      const k = t * dist
      tMap.set(entry.id, { t, x: offset[0] * k, y: offset[1] * k, z: offset[2] * k })
    }

    // 第二遍：叠加父级位移（只叠加一层，父级自身的 follow 不再递归）
    for (const entry of entries) {
      const self = tMap.get(entry.id)!
      const parentId = entry.motion.follow
      const parent = parentId ? tMap.get(parentId) : undefined
      const dx = parent ? parent.x : 0
      const dy = parent ? parent.y : 0
      const dz = parent ? parent.z : 0

      entry.outer.position.set(self.x + dx, self.y + dy, self.z + dz)
      entry.outer.rotation.set(
        entry.motion.rot[0] * self.t,
        entry.motion.rot[1] * self.t,
        entry.motion.rot[2] * self.t
      )
    }
  })

  return null
}

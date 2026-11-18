import { useEffect, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { useCursor } from '@react-three/drei'
import { partMap, motionById } from '../../../data'
import { useAppStore } from '../../../store/useAppStore'
import { partRegistry } from '../../core/PartRegistry'
import { HIGHLIGHT, hoverIntensity, selectIntensity } from '../../materials/palette'

interface PartProps {
  id: string
  children: ReactNode
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number | [number, number, number]
}

/**
 * 零件容器
 * 外层 group 只承载拆解位移 / 旋转（由统一进度驱动写入），
 * 内层 group 保持原始装配变换，两者分离保证复原后与初始姿态完全一致。
 * 可见性由零件树控制，隐藏时整体 visible=false，并从交互中摘除。
 */
export function Part({
  id,
  children,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: PartProps) {
  const meta = partMap[id]
  const motion = motionById[id]
  const outer = useRef<THREE.Group>(null)
  const inner = useRef<THREE.Group>(null)

  const selected = useAppStore((s) => s.selectedId === id)
  const hovered = useAppStore((s) => s.hoveredId === id)
  const hidden = useAppStore((s) => !!s.hidden[id])
  const select = useAppStore((s) => s.select)
  const hover = useAppStore((s) => s.hover)
  const focusPart = useAppStore((s) => s.focusPart)

  useCursor(hovered && !hidden)

  // 注册到统一驱动
  useEffect(() => {
    if (!outer.current || !inner.current || !motion) return
    partRegistry.register({
      id,
      outer: outer.current,
      inner: inner.current,
      motion,
    })
    // 注册后立即按当前进度摆位，避免切换模型时闪现原位
    const st = useAppStore.getState()
    const [a, b] = motion.window
    let t = b > a ? (st.progress - a) / (b - a) : st.progress >= a ? 1 : 0
    t = Math.min(1, Math.max(0, t))
    const k = t * st.distance
    outer.current.position.set(motion.offset[0] * k, motion.offset[1] * k, motion.offset[2] * k)
    outer.current.rotation.set(motion.rot[0] * t, motion.rot[1] * t, motion.rot[2] * t)
    outer.current.visible = !st.hidden[id]
    return () => partRegistry.unregister(id)
  }, [id, motion])

  // 可见性：零件树开关直接作用于外层 group（含所有子对象与阴影）
  useEffect(() => {
    if (outer.current) outer.current.visible = !hidden
    if (hidden && useAppStore.getState().hoveredId === id) useAppStore.getState().hover(null)
  }, [hidden, id])

  // 高亮：改材质自发光，配合 Bloom 呈现发光轮廓
  useEffect(() => {
    const g = inner.current
    if (!g) return
    g.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const raw = mesh.material as THREE.Material | THREE.Material[] | undefined
      if (!raw) return
      const mats = Array.isArray(raw) ? raw : [raw]
      for (const mat of mats) {
        const m = mat as THREE.MeshStandardMaterial
        if (!m || !m.emissive) continue
        if (m.userData.baseEmissive === undefined) {
          m.userData.baseEmissive = m.emissive.getHex()
          m.userData.baseEI = m.emissiveIntensity ?? 1
        }
        if (selected) {
          m.emissive.setHex(HIGHLIGHT.select.getHex())
          m.emissiveIntensity = selectIntensity
        } else if (hovered) {
          m.emissive.setHex(HIGHLIGHT.hover.getHex())
          m.emissiveIntensity = hoverIntensity
        } else {
          m.emissive.setHex(m.userData.baseEmissive as number)
          m.emissiveIntensity = m.userData.baseEI as number
        }
      }
    })
  }, [selected, hovered])

  if (!meta || !motion) return null

  return (
    <group ref={outer} name={`x-${id}`} visible={!hidden}>
      <group
        ref={inner}
        name={id}
        position={position}
        rotation={rotation}
        scale={scale}
        onPointerOver={(e) => {
          if (hidden) return
          e.stopPropagation()
          hover(id)
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          if (useAppStore.getState().hoveredId === id) hover(null)
        }}
        onClick={(e) => {
          if (hidden) return
          e.stopPropagation()
          select(id)
        }}
        onDoubleClick={(e) => {
          if (hidden) return
          e.stopPropagation()
          focusPart(id)
        }}
      >
        {children}
      </group>
    </group>
  )
}

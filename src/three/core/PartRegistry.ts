import * as THREE from 'three'
import type { PartMotion } from '../../types'

export interface PartEntry {
  id: string
  /** 承载拆解位移/旋转的外层 group */
  outer: THREE.Group
  /** 保持原始装配变换的内层 group */
  inner: THREE.Group
  motion: PartMotion
}

/**
 * 零件对象注册表
 * 统一进度驱动（ExplodeDriver）通过它逐零件施加位移，避免每个零件各自订阅状态
 */
class PartRegistry {
  private map = new Map<string, PartEntry>()
  /** 注册表版本号：新增/移除零件时自增，驱动据此重算 */
  version = 0

  register(entry: PartEntry) {
    this.map.set(entry.id, entry)
    this.version++
  }

  unregister(id: string) {
    this.map.delete(id)
    this.version++
  }

  get(id: string) {
    return this.map.get(id)
  }

  entries(): PartEntry[] {
    return Array.from(this.map.values())
  }

  get size() {
    return this.map.size
  }

  /** 零件包围盒中心（用于相机聚焦，避免锚点在原点导致偏移） */
  worldPosition(id: string, target = new THREE.Vector3()): THREE.Vector3 | null {
    const obj = this.get(id)?.inner
    if (!obj) return null
    const box = new THREE.Box3().setFromObject(obj)
    if (box.isEmpty()) return obj.getWorldPosition(target)
    return box.getCenter(target)
  }

  /** 零件在当前模型坐标系下的原始装配位置 */
  originalPosition(id: string): [number, number, number] | null {
    const g = this.get(id)?.inner
    if (!g) return null
    return [g.position.x, g.position.y, g.position.z]
  }

  clear() {
    this.map.clear()
    this.version++
  }
}

export const partRegistry = new PartRegistry()

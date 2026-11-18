import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { DroneBody } from './Body'
import { DroneArms } from './Arms'
import { DroneGimbal } from './Gimbal'
import { DroneInternals } from './Internals'
import { DroneGear, DroneSensors } from './Sensors'

/**
 * 模型卸载时释放几何体。
 * 共享几何体（geometries.ts 的模块级常量）本身不会被销毁，
 * 只是释放在 GPU 上占用的 buffer，重新挂载时会按 CPU 数据重新上传，
 * 因此不会出现"切回模型丢面"的问题。
 */
function useDisposeGeometries(ref: React.RefObject<THREE.Group | null>) {
  // 卸载时 React 与 r3f 已先行把子对象从 group 上摘除，cleanup 里再 traverse 会拿不到任何东西；
  // 因此在挂载完成时先把几何体登记下来，卸载时按记录逐个 dispose。
  useEffect(() => {
    const list: THREE.BufferGeometry[] = []
    ref.current?.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh && m.geometry) list.push(m.geometry)
    })
    return () => list.forEach((g) => g.dispose())
  }, [ref])
}

export function DroneModel() {
  const ref = useRef<THREE.Group>(null)
  useDisposeGeometries(ref)
  return (
    <group ref={ref} name="drone-model" position={[0, 0.014, 0]} rotation={[0, Math.PI, 0]}>
      <DroneBody />
      <DroneArms />
      <DroneGimbal />
      <DroneInternals />
      <DroneSensors />
      <DroneGear />
    </group>
  )
}

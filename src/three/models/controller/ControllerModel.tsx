import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { ControllerShell } from './Shell'
import { ControllerControls } from './Controls'
import { ControllerInternals } from './Internals'

/** 卸载时释放几何体（共享几何体只清 GPU buffer，重新挂载会重新上传） */
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

export function ControllerModel() {
  const ref = useRef<THREE.Group>(null)
  useDisposeGeometries(ref)
  return (
    <group ref={ref} name="controller-model" position={[0, -0.024, 0]}>
      <ControllerShell />
      <ControllerControls />
      <ControllerInternals />
    </group>
  )
}

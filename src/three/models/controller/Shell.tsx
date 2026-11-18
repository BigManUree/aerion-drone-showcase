import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { Part } from '../shared/Part'
import { MAT, createHudTexture } from '../../materials/palette'
import { chamferBox } from '../shared/geometry'
import {
  frontRibsGeo,
  frontShellGeo,
  gripGeo,
  gripPadGeo,
  portPlateGeo,
  rearRibsGeo,
  rearShellGeo,
  rearVentGeo,
  screenBezelGeo,
  tripodGeo,
} from './geometries'
import { CTRL } from './config'

const ventSlotGeo = chamferBox(0.018, 0.0016, 0.003, 0.0006, 0.0002, 2)
const screenBackGeo = chamferBox(
  CTRL.screenSize[0] + 0.002,
  CTRL.screenSize[1] + 0.002,
  0.0022,
  0.001,
  0.0004
)

function Display() {
  const tex = useMemo(() => createHudTexture(), [])
  // 显式释放贴图，避免模型切换时纹理内存持续增长
  useEffect(() => () => tex.dispose(), [tex])
  return (
    <Part id="ctrl.display" position={CTRL.screen}>
      {/* 显示面板（贴合玻璃前表面，避免高光洗白 HUD） */}
      <mesh position={[0, 0, 0.0006]}>
        <planeGeometry args={CTRL.screenSize} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {/* 液晶背板 */}
      <mesh geometry={screenBackGeo} position={[0, 0, -0.0036]}>
        <meshStandardMaterial color="#05080b" metalness={0.2} roughness={0.5} />
      </mesh>
      {/* 排线 */}
      <mesh position={[0, -CTRL.screenSize[1] / 2 - 0.004, -0.004]} rotation={[0, 0, 0]}>
        <planeGeometry args={[0.030, 0.012]} />
        <meshStandardMaterial color="#b2741f" metalness={0.3} roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
    </Part>
  )
}

export function ControllerShell() {
  return (
    <>
      {/* 前壳 */}
      <Part id="ctrl.frontShell">
        <mesh geometry={frontShellGeo} castShadow receiveShadow>
          <meshStandardMaterial
            {...MAT.graphite}
            roughness={0.52}
            envMapIntensity={1.0}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* 内腔加强筋 */}
        <mesh geometry={frontRibsGeo} castShadow receiveShadow>
          <meshStandardMaterial color="#2b313a" metalness={0.35} roughness={0.55} />
        </mesh>
        <mesh geometry={gripGeo} castShadow receiveShadow>
          <meshStandardMaterial {...MAT.graphite} roughness={0.56} />
        </mesh>
        <mesh geometry={gripPadGeo} castShadow>
          <meshStandardMaterial {...MAT.rubber} roughness={0.92} />
        </mesh>
        {/* 屏幕边框 */}
        <mesh
          geometry={screenBezelGeo}
          position={[CTRL.screen[0], CTRL.screen[1], CTRL.screen[2] - 0.001]}
          castShadow
        >
          <meshStandardMaterial {...MAT.aluBlack} roughness={0.4} metalness={0.7} />
        </mesh>
        {/* 摇杆装饰环 */}
        {[-1, 1].map((sx) => (
          <mesh key={sx} position={[sx * 0.078, 0.024, 0.0312]} rotation={[0, 0, 0]}>
            <torusGeometry args={[0.0182, 0.0012, 10, 44]} />
            <meshStandardMaterial {...MAT.silverDark} roughness={0.3} />
          </mesh>
        ))}
        {/* 顶部扬声器格栅 */}
        {[0, 1, 2].map((i) => (
          <mesh
            key={i}
            geometry={chamferBox(0.018, 0.0016, 0.003, 0.0006, 0.0002, 2)}
            position={[0, 0.108, 0.024]}
          >
            <meshStandardMaterial {...MAT.plasticDark} />
          </mesh>
        ))}
      </Part>

      {/* 后壳 */}
      <Part id="ctrl.rearShell">
        <mesh geometry={rearShellGeo} castShadow receiveShadow>
          <meshStandardMaterial
            {...MAT.graphite}
            roughness={0.5}
            envMapIntensity={1.0}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh geometry={rearRibsGeo} castShadow receiveShadow>
          <meshStandardMaterial color="#2b313a" metalness={0.35} roughness={0.55} />
        </mesh>
        <mesh geometry={rearVentGeo} castShadow>
          <meshStandardMaterial {...MAT.aluBlack} />
        </mesh>
        <mesh geometry={portPlateGeo} castShadow>
          <meshStandardMaterial {...MAT.aluBlack} metalness={0.8} roughness={0.4} />
        </mesh>
        <mesh geometry={tripodGeo} castShadow>
          <meshStandardMaterial {...MAT.silverDark} />
        </mesh>
        {/* 顶部天线座横梁 */}
        <mesh
          geometry={new THREE.CapsuleGeometry(0.006, 0.120, 6, 16)}
          position={[0, 0.110, -0.012]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <meshStandardMaterial {...MAT.aluBlack} roughness={0.44} />
        </mesh>
      </Part>

      <Display />
    </>
  )
}

import { Part } from '../shared/Part'
import { MAT, EMISSIVE } from '../../materials/palette'
import { chamferBox, flatPlate, lathe } from '../shared/geometry'
import {
  rcBatteryGeo,
  rcBatteryTabGeo,
  rcBoardChipsGeo,
  rcBoardGeo,
  rcCoolingGeo,
  rcFrameGeo,
  rcShieldGeo,
} from './geometries'

const ribbonGeo = flatPlate(0.040, 0.0012, 0.010, 0.002, 0.0004)

/** 模块级共享几何体（内联创建会随挂载泄漏） */
const sideKeyGeo = chamferBox(0.012, 0.008, 0.004, 0.0015, 0.0005)
const screenRibbonGeo = chamferBox(0.050, 0.012, 0.003, 0.0015, 0.0005)
const keyBackPlateGeo = flatPlate(0.056, 0.0012, 0.038, 0.003, 0.0004)
const mountPostGeo = lathe([[0, 0], [0.0032, 0], [0.0032, 0.006], [0, 0.006]], 16)

export function ControllerInternals() {
  return (
    <>
      {/* 主控制板 */}
      <Part id="ctrl.mainBoard" position={[0, 0.057, 0.002]}>
        <mesh geometry={rcBoardGeo} castShadow receiveShadow>
          <meshStandardMaterial {...MAT.pcb} roughness={0.6} metalness={0.24} />
        </mesh>
        <mesh geometry={rcBoardChipsGeo} castShadow>
          <meshStandardMaterial {...MAT.chip} roughness={0.44} />
        </mesh>
        <mesh geometry={rcShieldGeo} castShadow>
          <meshStandardMaterial {...MAT.silver} metalness={1} roughness={0.34} />
        </mesh>
        {/* 摇杆霍尔接口 */}
        {[-1, 1].map((sx) => (
          <mesh key={sx} geometry={sideKeyGeo} position={[sx * 0.080, -0.030, 0.003]} castShadow>
            <meshStandardMaterial color="#e8e4d8" roughness={0.6} metalness={0.1} />
          </mesh>
        ))}
        {/* 状态指示灯 */}
        {[0, 1].map((i) => (
          <mesh key={i} position={[0.062 + i * 0.008, 0.034, 0.0015]}>
            <sphereGeometry args={[0.0018, 10, 8]} />
            <meshStandardMaterial
              color="#0b1a1c"
              emissive={i === 0 ? EMISSIVE.green : EMISSIVE.cyan}
              emissiveIntensity={1.8}
            />
          </mesh>
        ))}
        {/* 排线 */}
        <mesh geometry={ribbonGeo} position={[0, -0.040, -0.002]} castShadow>
          <meshStandardMaterial color="#b2741f" metalness={0.3} roughness={0.6} />
        </mesh>
      </Part>

      {/* 电池 */}
      <Part id="ctrl.battery" position={[0, 0.050, -0.016]}>
        <mesh geometry={rcBatteryGeo} castShadow receiveShadow>
          <meshStandardMaterial color="#1d2229" metalness={0.25} roughness={0.6} />
        </mesh>
        <mesh geometry={rcBatteryTabGeo} position={[0, 0.030, 0.002]} castShadow>
          <meshStandardMaterial {...MAT.plasticDark} />
        </mesh>
        {/* 电量指示 */}
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[-0.018 + i * 0.012, -0.020, 0.005]}>
            <sphereGeometry args={[0.0022, 10, 8]} />
            <meshStandardMaterial
              color="#0d1418"
              emissive={EMISSIVE.green}
              emissiveIntensity={i < 3 ? 1.6 : 0.12}
            />
          </mesh>
        ))}
        {/* 保护板 */}
        <mesh geometry={screenRibbonGeo} position={[0, 0.018, 0.0055]}>
          <meshStandardMaterial {...MAT.plasticGrey} />
        </mesh>
      </Part>

      {/* 散热模块 */}
      <Part id="ctrl.cooling" position={[0, 0.074, 0.012]}>
        <mesh geometry={rcCoolingGeo} castShadow receiveShadow>
          <meshStandardMaterial {...MAT.heatsink} roughness={0.32} />
        </mesh>
        <mesh geometry={keyBackPlateGeo} position={[0, -0.0022, 0]}>
          <meshStandardMaterial color="#15181c" metalness={0.3} roughness={0.75} />
        </mesh>
      </Part>

      {/* 内部连接结构 */}
      <Part id="ctrl.internalFrame">
        <mesh geometry={rcFrameGeo} castShadow receiveShadow>
          <meshStandardMaterial color="#5d646d" metalness={0.9} roughness={0.48} />
        </mesh>
        {/* 主板固定柱 */}
        {[
          [-0.070, 0.030],
          [0.070, 0.030],
          [-0.070, 0.086],
          [0.070, 0.086],
        ].map(([x, y], i) => (
          <mesh key={i} geometry={mountPostGeo} position={[x, y, -0.004]} castShadow>
            <meshStandardMaterial {...MAT.silverDark} />
          </mesh>
        ))}
      </Part>
    </>
  )
}

import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Part } from '../shared/Part'
import { MAT } from '../../materials/palette'
import {
  chamferBox,
  curveOf,
  lathe,
  propellerBladeGeometry,
  radialFins,
  superRing,
  sweepProfileFn,
  sweptTube,
  type Pt,
} from '../shared/geometry'
import { ARM_CONFIGS, PROP_Y, type ArmConfig } from './config'
import { partProgress, useAppStore } from '../../../store/useAppStore'

/* ---------------- 机臂：变截面流线型外壳 ---------------- */

/** 截面沿展向收窄；根部带整流包边（flare） */
function armSection(t: number): Pt[] {
  const w = 0.0375 - 0.0125 * Math.pow(t, 0.62)
  const h = 0.0295 - 0.0095 * Math.pow(t, 0.72)
  const flare = 1 + 0.28 * Math.exp(-t * 18)
  const n = 3.5 - 0.8 * t
  return superRing(w * flare, h * flare, n, 30)
}

function armCurve(c: ArmConfig) {
  const [hx, hy, hz] = c.hinge
  const [tx, ty, tz] = c.tip
  return curveOf([
    [hx, hy, hz],
    [hx + (tx - hx) * 0.42, hy + (ty - hy) * 0.55 + 0.0016, hz + (tz - hz) * 0.42],
    [hx + (tx - hx) * 0.78, hy + (ty - hy) * 0.86 + 0.0012, hz + (tz - hz) * 0.78],
    [tx, ty, tz],
  ])
}

const armGeos: Record<string, THREE.BufferGeometry> = Object.fromEntries(
  ARM_CONFIGS.map((c) => [c.key, sweepProfileFn(armCurve(c), armSection, 72)])
)

/** 臂下走线：线束 + 卡箍 */
function armCableGeo(c: ArmConfig) {
  const [hx, hy, hz] = c.hinge
  const [tx, ty, tz] = c.tip
  const pts: [number, number, number][] = []
  for (let i = 0; i <= 4; i++) {
    const t = 0.04 + (0.9 * i) / 4
    const x = hx + (tx - hx) * t
    const z = hz + (tz - hz) * t
    const y = hy + (ty - hy) * t - (0.0175 - 0.0072 * t)
    pts.push([x, y, z])
  }
  return sweptTube(curveOf(pts), 0.0036, 0.003, 48, 10)
}

const cableGeos: Record<string, THREE.BufferGeometry> = Object.fromEntries(
  ARM_CONFIGS.map((c) => [c.key, armCableGeo(c)])
)

/** 折叠铰接轴 */
const hingeBossGeo = lathe(
  [
    [0, -0.0155],
    [0.0126, -0.0155],
    [0.0136, -0.0125],
    [0.0136, 0.0125],
    [0.0126, 0.0155],
    [0, 0.0155],
  ],
  32
)
const hingePinGeo = lathe(
  [
    [0, -0.0175],
    [0.0048, -0.0175],
    [0.0048, 0.0155],
    [0.0056, 0.0165],
    [0.0056, 0.0185],
    [0, 0.0185],
  ],
  18
)
const hingeCapGeo = lathe(
  [
    [0, 0],
    [0.0098, 0],
    [0.0098, 0.0024],
    [0.0076, 0.0032],
    [0, 0.0032],
  ],
  24
)
/** 铰接定位销钉 */
const detentGeo = lathe(
  [
    [0, 0],
    [0.0022, 0],
    [0.0022, 0.0016],
    [0.0012, 0.0022],
    [0, 0.0022],
  ],
  14
)

/** 端部电机安装座（模块级共享，避免每次挂载新建几何体造成显存泄漏） */
const motorSeatGeo = chamferBox(0.042, 0.0095, 0.042, 0.012, 0.0022)
/** 走线卡箍 */
const cableClampGeo = chamferBox(0.0135, 0.0115, 0.006, 0.0035, 0.001)
/** 三相线出口 */
const phaseOutletGeo = chamferBox(0.010, 0.0045, 0.013, 0.0022, 0.0007)

function Arm({ c }: { c: ArmConfig }) {
  const angle = Math.atan2(c.tip[0] - c.hinge[0], c.tip[2] - c.hinge[2])
  const clampT = [0.34, 0.66]
  return (
    <Part id={c.armId}>
      {/* 流线型臂壳 */}
      <mesh geometry={armGeos[c.key]} castShadow receiveShadow>
        <meshStandardMaterial {...MAT.mattePlastic} roughness={0.6} envMapIntensity={1.0} />
      </mesh>
      {/* 折叠关节 */}
      <group position={c.hinge}>
        <mesh geometry={hingeBossGeo} castShadow receiveShadow>
          <meshStandardMaterial {...MAT.anodized} roughness={0.34} metalness={1} />
        </mesh>
        <mesh geometry={hingePinGeo} castShadow>
          <meshStandardMaterial {...MAT.screwMetal} />
        </mesh>
        <mesh geometry={hingeCapGeo} position={[0, 0.0185, 0]} castShadow>
          <meshStandardMaterial {...MAT.screwMetal} roughness={0.24} />
        </mesh>
        <mesh geometry={detentGeo} position={[0.011, 0.0125, 0]} castShadow>
          <meshStandardMaterial color="#1a1e23" metalness={0.8} roughness={0.4} />
        </mesh>
      </group>
      {/* 端部电机安装座 */}
      <group position={[c.tip[0], c.tip[1] - 0.0035, c.tip[2]]} rotation={[0, angle, 0]}>
        <mesh geometry={motorSeatGeo} castShadow receiveShadow>
          <meshStandardMaterial {...MAT.anodizedDark} roughness={0.4} metalness={1} />
        </mesh>
        {/* 4 颗安装螺钉 */}
        {[
          [-0.0145, -0.0145],
          [0.0145, -0.0145],
          [-0.0145, 0.0145],
          [0.0145, 0.0145],
        ].map(([dx, dz], i) => (
          <mesh key={i} geometry={motorScrewGeo} position={[dx, 0.0052, dz]} castShadow>
            <meshStandardMaterial {...MAT.screwMetal} />
          </mesh>
        ))}
      </group>
      {/* 臂下走线 */}
      <mesh geometry={cableGeos[c.key]} castShadow>
        <meshStandardMaterial color="#15181c" metalness={0.05} roughness={0.88} />
      </mesh>
      {clampT.map((t, i) => {
        const x = c.hinge[0] + (c.tip[0] - c.hinge[0]) * t
        const z = c.hinge[2] + (c.tip[2] - c.hinge[2]) * t
        const y = c.hinge[1] + (c.tip[1] - c.hinge[1]) * t - (0.0175 - 0.0072 * t)
        return (
          <mesh
            key={i}
            geometry={cableClampGeo}
            position={[x, y, z]}
            rotation={[0, angle, 0]}
            castShadow
          >
            <meshStandardMaterial {...MAT.mattePlasticDark} roughness={0.7} />
          </mesh>
        )
      })}
    </Part>
  )
}

/* ---------------- 电机 ---------------- */

const motorBaseGeo = lathe(
  [
    [0, 0],
    [0.0206, 0],
    [0.0212, 0.0018],
    [0.0212, 0.0048],
    [0.019, 0.0058],
    [0, 0.0058],
  ],
  48
)
const statorGeo = lathe(
  [
    [0, 0],
    [0.0156, 0],
    [0.0156, 0.0106],
    [0.0142, 0.011],
    [0, 0.011],
  ],
  40
)
const bellGeo = lathe(
  [
    [0, 0],
    [0.0224, 0],
    [0.0228, 0.0028],
    [0.0228, 0.0168],
    [0.022, 0.021],
    [0.0188, 0.023],
    [0.0124, 0.024],
    [0, 0.0242],
  ],
  56
)
const bellFinsGeo = radialFins(24, 0.0232, 0.0022, 0.016, 0.004)
const bellCapGeo = lathe(
  [
    [0, 0],
    [0.0128, 0],
    [0.0128, 0.002],
    [0.01, 0.0028],
    [0.0062, 0.0032],
    [0, 0.0034],
  ],
  40
)
const shaftGeo = lathe(
  [
    [0, 0],
    [0.0034, 0],
    [0.0034, 0.0092],
    [0.0024, 0.0098],
    [0, 0.0098],
  ],
  20
)
/** 桨座（螺纹轴套） */
const propMountGeo = lathe(
  [
    [0, 0],
    [0.0072, 0],
    [0.0072, 0.0026],
    [0.0064, 0.0034],
    [0.0052, 0.0038],
    [0, 0.0038],
  ],
  22
)
const motorScrewGeo = lathe(
  [
    [0, 0],
    [0.0019, 0],
    [0.0019, 0.0012],
    [0.0013, 0.0019],
    [0, 0.0019],
  ],
  14
)
const motorTopScrewGeo = lathe(
  [
    [0, 0],
    [0.0014, 0],
    [0.0014, 0.001],
    [0.0009, 0.0015],
    [0, 0.0015],
  ],
  12
)

/** 四个电机转子实时角度（供 QA 验证独立旋转） */
const motorAngles = [0, 0, 0, 0]
const motorIndex: Record<string, number> = { FL: 0, FR: 1, RL: 2, RR: 3 }

function Motor({ c }: { c: ArmConfig }) {
  const [x, y, z] = c.tip
  const spinProps = useAppStore((s) => s.spinProps)
  const progress = useAppStore((s) => s.progress)
  const exploded = partProgress('drone', c.motorId, progress) > 0.35
  const rotor = useRef<THREE.Group>(null)
  const enabled = spinProps && !exploded

  // 每个电机独立旋转（含相位差）
  useFrame((state, dt) => {
    if (!rotor.current) return
    if (!enabled) return
    rotor.current.rotation.y += c.spin * dt * 5.2
    motorAngles[motorIndex[c.key]] = rotor.current.rotation.y
  })

  return (
    <Part id={c.motorId} position={[x, y, z]}>
      {/* 安装底座（定子侧） */}
      <mesh geometry={motorBaseGeo} castShadow receiveShadow>
        <meshStandardMaterial {...MAT.anodizedDark} roughness={0.42} metalness={1} />
      </mesh>
      {/* 基础螺钉 */}
      {[0, 120, 240].map((deg) => (
        <mesh
          key={deg}
          geometry={motorTopScrewGeo}
          position={[
            Math.cos((deg * Math.PI) / 180) * 0.0162,
            0.0058,
            Math.sin((deg * Math.PI) / 180) * 0.0162,
          ]}
          castShadow
        >
          <meshStandardMaterial {...MAT.screwMetal} />
        </mesh>
      ))}
      {/* 定子绕组 */}
      <mesh geometry={statorGeo} position={[0, 0.0054, 0]} castShadow>
        <meshStandardMaterial {...MAT.copper} roughness={0.44} metalness={0.9} />
      </mesh>
      {/* 三相线出口 */}
      <mesh geometry={phaseOutletGeo} position={[0, 0.0024, 0.015]} castShadow>
        <meshStandardMaterial {...MAT.rubberSoft} />
      </mesh>

      {/* 转子总成（可独立旋转） */}
      <group ref={rotor}>
        <mesh geometry={bellGeo} position={[0, 0.0138, 0]} castShadow receiveShadow>
          <meshStandardMaterial {...MAT.anodized} roughness={0.28} metalness={1} />
        </mesh>
        <mesh geometry={bellFinsGeo} position={[0, 0.0266, 0]} castShadow>
          <meshStandardMaterial {...MAT.anodized} roughness={0.32} metalness={1} />
        </mesh>
        {/* 顶部固定盖 */}
        <mesh geometry={bellCapGeo} position={[0, 0.038, 0]} castShadow>
          <meshStandardMaterial {...MAT.anodizedDark} roughness={0.3} metalness={1} />
        </mesh>
        {/* 顶部盖 3 颗螺钉 */}
        {[30, 150, 270].map((deg) => (
          <mesh
            key={`t${deg}`}
            geometry={motorTopScrewGeo}
            position={[
              Math.cos((deg * Math.PI) / 180) * 0.0092,
              0.0412,
              Math.sin((deg * Math.PI) / 180) * 0.0092,
            ]}
            castShadow
          >
            <meshStandardMaterial {...MAT.screwMetal} />
          </mesh>
        ))}
        {/* 转轴 */}
        <mesh geometry={shaftGeo} position={[0, 0.0414, 0]} castShadow>
          <meshStandardMaterial {...MAT.chrome} />
        </mesh>
        {/* 桨座 */}
        <mesh geometry={propMountGeo} position={[0, 0.0472, 0]} castShadow>
          <meshStandardMaterial {...MAT.screwMetal} roughness={0.26} />
        </mesh>
        {/* 动平衡配重孔标记 */}
        <mesh position={[0.0165, 0.0302, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.0016, 0.0016, 0.0022, 10]} />
          <meshStandardMaterial color="#0d1014" metalness={0.4} roughness={0.6} />
        </mesh>
      </group>
    </Part>
  )
}

/* ---------------- 螺旋桨 ---------------- */

const bladeGeo = propellerBladeGeometry({
  length: 0.107,
  rootChord: 0.019,
  tipChord: 0.0115,
  thickness: 0.13,
  rootPitch: 37,
  tipPitch: 11,
  sweep: 0.0125,
  rise: 0.0032,
  camber: 0.055,
  segments: 34,
  radial: 16,
})
const hubLowerGeo = lathe(
  [
    [0, 0],
    [0.0128, 0],
    [0.0134, 0.0022],
    [0.013, 0.0048],
    [0.0104, 0.0058],
    [0, 0.0058],
  ],
  40
)
const hubUpperGeo = lathe(
  [
    [0, 0.0058],
    [0.0104, 0.0058],
    [0.013, 0.0068],
    [0.0132, 0.0092],
    [0.0118, 0.0112],
    [0.0072, 0.0122],
    [0, 0.0124],
  ],
  40
)
const hubBoltGeo = lathe(
  [
    [0, 0],
    [0.0016, 0],
    [0.0016, 0.001],
    [0.0011, 0.0016],
    [0, 0.0016],
  ],
  12
)
const washerGeo = lathe(
  [
    [0.0036, 0],
    [0.0088, 0],
    [0.0088, 0.0012],
    [0.0036, 0.0012],
    [0.0036, 0],
  ],
  24
)
const nutGeo = lathe(
  [
    [0, 0],
    [0.0062, 0],
    [0.0062, 0.0036],
    [0.0052, 0.0048],
    [0, 0.005],
  ],
  6
)

function SpinningProp({ spin, enabled }: { spin: number; enabled: boolean }) {
  const g = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (!enabled || !g.current) return
    g.current.rotation.y += spin * dt * 5.2
  })
  return (
    <group ref={g}>
      {[0, Math.PI].map((rot) => (
        <group key={rot} rotation={[0, rot, 0]}>
          <mesh geometry={bladeGeo} castShadow receiveShadow>
            <meshStandardMaterial {...MAT.mattePlasticDark} roughness={0.52} metalness={0.06} />
          </mesh>
        </group>
      ))}
      {/* 桨夹上盖 */}
      <mesh geometry={hubUpperGeo} castShadow receiveShadow>
        <meshStandardMaterial {...MAT.mattePlasticDark} roughness={0.5} />
      </mesh>
      {[
        [0.0072, 0],
        [-0.0072, 0],
      ].map(([dx, dz], i) => (
        <mesh key={i} geometry={hubBoltGeo} position={[dx, 0.0124, dz]} castShadow>
          <meshStandardMaterial {...MAT.screwMetal} />
        </mesh>
      ))}
    </group>
  )
}

function Propeller({ c }: { c: ArmConfig }) {
  const spinProps = useAppStore((s) => s.spinProps)
  const progress = useAppStore((s) => s.progress)
  const exploded = partProgress('drone', c.propId, progress) > 0.35
  const [x, y, z] = c.tip
  const enabled = spinProps && !exploded
  return (
    <Part
      id={c.propId}
      position={[x, y + PROP_Y, z]}
      rotation={[0, (c.propAngle * Math.PI) / 180, 0]}
    >
      {/* 桨毂下夹片 */}
      <mesh geometry={hubLowerGeo} castShadow receiveShadow>
        <meshStandardMaterial {...MAT.mattePlasticDark} roughness={0.52} />
      </mesh>
      {/* 叶片总成 */}
      <group position={[0, 0.0058, 0]}>
        <SpinningProp spin={c.spin} enabled={enabled} />
      </group>
      {/* 垫圈 + 锁紧螺母 */}
      <mesh geometry={washerGeo} position={[0, 0.0184, 0]} castShadow>
        <meshStandardMaterial {...MAT.screwMetal} roughness={0.24} />
      </mesh>
      <mesh geometry={nutGeo} position={[0, 0.0194, 0]} castShadow>
        <meshStandardMaterial {...MAT.anodizedDark} roughness={0.34} metalness={1} />
      </mesh>
    </Part>
  )
}

if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('qa')) {
  ;(window as any).__motorAngles = () => motorAngles.slice()
}

export function DroneArms() {
  const list = useMemo(() => ARM_CONFIGS, [])
  return (
    <>
      {list.map((c) => (
        <Arm key={c.armId} c={c} />
      ))}
      {list.map((c) => (
        <Motor key={c.motorId} c={c} />
      ))}
      {list.map((c) => (
        <Propeller key={c.propId} c={c} />
      ))}
    </>
  )
}

import * as THREE from 'three'
import { Part } from '../shared/Part'
import { MAT, EMISSIVE } from '../../materials/palette'
import {
  chamferBox,
  curveOf,
  lathe,
  mergeGeometries,
  superRing,
  sweepProfileFn,
  sweptTube,
} from '../shared/geometry'

/* ---------------- 视觉传感模组 ---------------- */

const housingGeo = chamferBox(0.040, 0.0135, 0.017, 0.005, 0.0016)
const lensRingGeo = lathe(
  [
    [0.0044, 0],
    [0.0064, 0],
    [0.0066, 0.0016],
    [0.0058, 0.0028],
    [0.0044, 0.0032],
    [0.0044, 0],
  ],
  30
)
const lensGlassGeo = lathe(
  [
    [0.0044, 0],
    [0.0052, 0],
    [0.0052, 0.0008],
    [0.0044, 0.0008],
  ],
  28
)
const irDotGeo = lathe(
  [
    [0, 0],
    [0.0015, 0],
    [0.0015, 0.0007],
    [0, 0.0007],
  ],
  12
)
const bracketGeo = chamferBox(0.026, 0.012, 0.012, 0.003, 0.0009)

/** 模块级共享几何体（内联创建会随挂载泄漏） */
const visionShieldGeo = chamferBox(0.032, 0.0024, 0.010, 0.0012, 0.0005)

function VisionModule({
  id,
  position,
  rotation,
}: {
  id: string
  position: [number, number, number]
  rotation: [number, number, number]
}) {
  return (
    <Part id={id} position={position} rotation={rotation}>
      {/* 安装支架（连到机身腹部） */}
      <mesh geometry={bracketGeo} position={[0, 0.0105, 0.004]} castShadow>
        <meshStandardMaterial {...MAT.anodizedDark} roughness={0.42} metalness={1} />
      </mesh>
      <mesh geometry={housingGeo} castShadow receiveShadow>
        <meshStandardMaterial color="#181b20" metalness={0.55} roughness={0.4} />
      </mesh>
      {/* 双目镜组 */}
      {[-1, 1].map((sx) => (
        <group key={sx} position={[sx * 0.0112, -0.0005, -0.0088]}>
          <mesh geometry={lensRingGeo} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <meshStandardMaterial {...MAT.anodized} roughness={0.26} metalness={1} />
          </mesh>
          <mesh geometry={lensGlassGeo} position={[0, 0, -0.0034]} rotation={[Math.PI / 2, 0, 0]}>
            <meshStandardMaterial color="#0d0a12" metalness={0.5} roughness={0.06} />
          </mesh>
        </group>
      ))}
      {/* 红外补光 */}
      {[-1, 1].map((sx) => (
        <mesh
          key={`ir${sx}`}
          geometry={irDotGeo}
          position={[sx * 0.0036, 0.0044, -0.0092]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <meshStandardMaterial
            color="#241014"
            emissive="#ff2a4a"
            emissiveIntensity={0.8}
            roughness={0.3}
          />
        </mesh>
      ))}
      {/* 屏蔽罩 */}
      <mesh geometry={visionShieldGeo} position={[0, 0.0058, 0.002]} castShadow>
        <meshStandardMaterial {...MAT.silverDark} roughness={0.36} />
      </mesh>
    </Part>
  )
}

/* ---------------- 起落架 ---------------- */

const LEG_CENTER: Record<'L' | 'R', [number, number, number]> = {
  L: [-0.074, -0.058, 0.004],
  R: [0.074, -0.058, 0.004],
}

/** 起落架管体：椭圆截面扫掠，收口更自然 */
function buildLegGeometry(side: number) {
  const railCurve = curveOf([
    [0, -0.020, -0.086],
    [side * 0.002, -0.0245, -0.040],
    [side * 0.004, -0.0255, 0.010],
    [side * 0.002, -0.0225, 0.056],
    [0, -0.0145, 0.084],
  ])
  const rail = sweepProfileFn(railCurve, (t) => {
    const taper = 1 - 0.18 * Math.abs(t - 0.5) * 2
    return superRing(0.0112 * taper, 0.0092 * taper, 2.4, 16)
  }, 64)

  const strutFront = sweptTube(
    curveOf([
      [side * -0.024, 0.032, -0.046],
      [side * -0.013, 0.010, -0.054],
      [0, -0.018, -0.068],
    ]),
    0.0046,
    0.0042,
    34,
    12
  )
  const strutRear = sweptTube(
    curveOf([
      [side * -0.024, 0.032, 0.048],
      [side * -0.013, 0.008, 0.056],
      [0, -0.018, 0.068],
    ]),
    0.0046,
    0.0042,
    34,
    12
  )
  return mergeGeometries([rail, strutFront, strutRear])
}

const legGeoL = buildLegGeometry(-1)
const legGeoR = buildLegGeometry(1)

/** 脚垫（橡胶）：底面在 y=0 贴地，向上圆角收边后插进起落架管端 */
const footGeo = (() => {
  const g = lathe(
    [
      [0, 0],
      [0.0092, 0],
      [0.0099, 0.0018],
      [0.0093, 0.0044],
      [0.0062, 0.0066],
      [0.0058, 0.0126],
      [0, 0.013],
    ],
    28
  )
  return g
})()

/** 起落架根部整流罩 */
const legFairingGeo = chamferBox(0.013, 0.010, 0.022, 0.004, 0.001)

export function DroneSensors() {
  return (
    <>
      <VisionModule
        id="drone.visionFront"
        position={[0, -0.0285, -0.1465]}
        rotation={[0.34, 0, 0]}
      />
      <VisionModule
        id="drone.visionRear"
        position={[0, -0.0255, 0.1385]}
        rotation={[0.34, Math.PI, 0]}
      />
    </>
  )
}

export function DroneGear() {
  return (
    <>
      <Part id="drone.gearLeft" position={LEG_CENTER.L}>
        <mesh geometry={legGeoL} castShadow receiveShadow>
          <meshStandardMaterial {...MAT.mattePlasticDark} roughness={0.58} metalness={0.08} />
        </mesh>
        {/* 前后两只脚垫：底面统一落在 y=-0.0325 的接地面 */}
        {[-0.086, 0.084].map((z, i) => (
          <mesh key={i} geometry={footGeo} position={[0, -0.0325, z]} castShadow receiveShadow>
            <meshStandardMaterial {...MAT.rubberSoft} roughness={0.95} />
          </mesh>
        ))}
        {/* 与机身连接的整流罩 */}
        <mesh geometry={legFairingGeo} position={[-0.020, 0.030, -0.046]} castShadow>
          <meshStandardMaterial {...MAT.anodizedDark} roughness={0.4} metalness={1} />
        </mesh>
        <mesh geometry={legFairingGeo} position={[-0.020, 0.030, 0.048]} castShadow>
          <meshStandardMaterial {...MAT.anodizedDark} roughness={0.4} metalness={1} />
        </mesh>
      </Part>

      <Part id="drone.gearRight" position={LEG_CENTER.R}>
        <mesh geometry={legGeoR} castShadow receiveShadow>
          <meshStandardMaterial {...MAT.mattePlasticDark} roughness={0.58} metalness={0.08} />
        </mesh>
        {/* 前后两只脚垫：底面统一落在 y=-0.0325 的接地面 */}
        {[-0.086, 0.084].map((z, i) => (
          <mesh key={i} geometry={footGeo} position={[0, -0.0325, z]} castShadow receiveShadow>
            <meshStandardMaterial {...MAT.rubberSoft} roughness={0.95} />
          </mesh>
        ))}
        <mesh geometry={legFairingGeo} position={[0.020, 0.030, -0.046]} castShadow>
          <meshStandardMaterial {...MAT.anodizedDark} roughness={0.4} metalness={1} />
        </mesh>
        <mesh geometry={legFairingGeo} position={[0.020, 0.030, 0.048]} castShadow>
          <meshStandardMaterial {...MAT.anodizedDark} roughness={0.4} metalness={1} />
        </mesh>
      </Part>
    </>
  )
}

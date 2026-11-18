import * as THREE from 'three'
import { Part } from '../shared/Part'
import { MAT, EMISSIVE } from '../../materials/palette'
import {
  chamferBox,
  curveOf,
  lathe,
  mergeGeometries,
  sweptTube,
} from '../shared/geometry'
import { GIMBAL, GIMBAL_POSE } from './config'

const CAM = GIMBAL.camera
const { yaw: YAW, roll: ROLL, pitch: PITCH } = GIMBAL_POSE

/* ================================================================
 * 三轴云台：Yaw（绕 Y）→ Roll（绕 Z）→ Pitch（绕 X）→ 相机
 * 三个旋转轴以嵌套 group 实现真实父子层级
 * ================================================================ */

/* ---- 固定部分（与机身相连） ---- */
const bracketGeo = (() => {
  const plate = chamferBox(0.026, 0.040, 0.016, 0.006, 0.0018)
  plate.translate(0, 0.062, 0.014)
  const pad = chamferBox(0.038, 0.006, 0.026, 0.008, 0.0016)
  pad.translate(0, 0.043, 0.014)
  return mergeGeometries([plate, pad])
})()
const yawStatorGeo = lathe(
  [
    [0, -0.0075],
    [0.0122, -0.0075],
    [0.0128, -0.0052],
    [0.0128, 0.0052],
    [0.0122, 0.0075],
    [0, 0.0075],
  ],
  40
)
const yawStatorRingGeo = lathe(
  [
    [0.0126, -0.0018],
    [0.0138, -0.001],
    [0.0138, 0.001],
    [0.0126, 0.0018],
    [0.0126, -0.0018],
  ],
  40
)

/* ---- Yaw 转子 ---- */
const yawRotorGeo = lathe(
  [
    [0, 0],
    [0.0146, 0],
    [0.0146, 0.0024],
    [0.0122, 0.0034],
    [0, 0.0034],
  ],
  40
)
/** 连接 Roll 电机的摇臂 */
const yokeGeo = (() => {
  const arm = chamferBox(0.011, 0.020, 0.030, 0.004, 0.0012)
  arm.translate(0, 0.019, -0.006)
  const foot = chamferBox(0.013, 0.009, 0.012, 0.0035, 0.001)
  foot.translate(0, 0.010, -0.020)
  return mergeGeometries([arm, foot])
})()
const rollStatorGeo = lathe(
  [
    [0, -0.0072],
    [0.0098, -0.0072],
    [0.0104, -0.005],
    [0.0104, 0.005],
    [0.0098, 0.0072],
    [0, 0.0072],
  ],
  34
)

/* ---- Roll 转子 ---- */
const rollRotorGeo = lathe(
  [
    [0, 0],
    [0.0116, 0],
    [0.0116, 0.0022],
    [0.0094, 0.003],
    [0, 0.003],
  ],
  34
)
/** Pitch 电机 U 形支架 */
const pitchBracketGeo = (() => {
  const bar = chamferBox(0.070, 0.008, 0.014, 0.0035, 0.001)
  bar.translate(0, 0.006, -0.004)
  const arms = [-1, 1].map((sx) => {
    const g = chamferBox(0.008, 0.030, 0.016, 0.003, 0.001)
    g.translate(sx * 0.029, -0.008, -0.004)
    return g
  })
  return mergeGeometries([bar, ...arms])
})()
const pitchHousingGeo = lathe(
  [
    [0, -0.006],
    [0.0086, -0.006],
    [0.0092, -0.0042],
    [0.0092, 0.0042],
    [0.0086, 0.006],
    [0, 0.006],
  ],
  30
)

/* ---- Pitch 转子 ---- */
const pitchRotorGeo = lathe(
  [
    [0, 0],
    [0.0088, 0],
    [0.0088, 0.0018],
    [0.0068, 0.0026],
    [0, 0.0026],
  ],
  30
)

/* ---- 柔性排线 ---- */
const ribbonGeo = sweptTube(
  curveOf([
    [0.006, 0.030, 0.010],
    [0.010, 0.020, -0.002],
    [0.012, 0.012, -0.014],
    [0.014, 0.010, -0.026],
  ]),
  0.0024,
  0.0018,
  30,
  8
)

/* ---- 相机 ---- */

const cameraShellGeo = chamferBox(0.048, 0.044, 0.038, 0.012, 0.004, 5)
/** 镜头前框（金属环座） */
const cameraFrontGeo = lathe(
  [
    [0.0132, 0],
    [0.0178, 0],
    [0.0182, 0.0022],
    [0.0174, 0.0044],
    [0.0136, 0.0054],
    [0.0132, 0.0054],
    [0.0132, 0],
  ],
  56
)
/** 镜头金属环 */
const lensMetalRingGeo = lathe(
  [
    [0.0128, 0],
    [0.0152, 0],
    [0.0154, 0.0014],
    [0.0148, 0.0028],
    [0.0128, 0.0038],
    [0.0128, 0],
  ],
  56
)
/** 镜筒 */
const lensBarrelGeo = lathe(
  [
    [0.0118, 0],
    [0.0142, 0],
    [0.0142, 0.0016],
    [0.0132, 0.0024],
    [0.0132, 0.0052],
    [0.0138, 0.006],
    [0.0138, 0.0082],
    [0.0126, 0.0098],
    [0.0118, 0.0104],
  ],
  64
)
/** 镜片（凸面 + 边缘台阶，避免球冠透明叠加） */
const lensGlassGeo = lathe(
  [
    [0.0112, 0],
    [0.0112, 0.0007],
    [0.0099, 0.0019],
    [0.0075, 0.003],
    [0.004, 0.0037],
    [0, 0.0039],
  ],
  56
)
/** 镀膜环（镜头边缘的蓝色反光环） */
const lensCoatingGeo = lathe(
  [
    [0.0106, 0],
    [0.0112, 0],
    [0.0112, 0.0005],
    [0.0098, 0.0005],
    [0.0106, 0],
  ],
  56
)

/* ---- 云台保护罩 ---- */
/**
 * 210° 半开放罩壳：以镜头光轴为轴，包覆前下方 210°，上方留 150° 开口。
 * 原先是一根悬空钢丝环（两端无支撑、视觉上像提手），改为带厚度的罩壳 +
 * 两条根部连接板，既有实体感又能看出与机身的连接关系。
 */
const protectorGeo = (() => {
  const R = 0.0418
  const t = 0.0024
  const half = 0.0252
  const shell = lathe(
    [
      [R - t, -half],
      [R, -half + 0.0032],
      [R, half - 0.0032],
      [R - t, half],
      [R - t, -half],
    ],
    56,
    THREE.MathUtils.degToRad(255),
    THREE.MathUtils.degToRad(210)
  )
  // 旋转到以 Z（光轴）为回转轴
  shell.rotateX(Math.PI / 2)

  // 两条根部连接板（罩壳两端 → 相机壳体）
  const tabs = [-1, 1].map((sx) => {
    const g = chamferBox(0.010, 0.0032, 0.030, 0.0012, 0.0005)
    g.translate(sx * 0.0345, 0.0205, 0.004)
    g.rotateZ(sx * 0.12)
    return g
  })
  return mergeGeometries([shell, ...tabs])
})()

/** 模块级共享几何体（内联创建会随挂载泄漏） */
const camHeatPadGeo = chamferBox(0.030, 0.0022, 0.024, 0.003, 0.0006)
const camSideGripGeo = chamferBox(0.0014, 0.020, 0.026, 0.0006, 0.0002)

export function DroneGimbal() {
  return (
    <>
      {/* ============ 三轴云台结构 ============ */}
      <Part id="drone.gimbalFrame" position={CAM}>
        {/* 固定支架 + Yaw 定子 */}
        <mesh geometry={bracketGeo} castShadow receiveShadow>
          <meshStandardMaterial {...MAT.anodizedDark} roughness={0.4} metalness={1} />
        </mesh>
        <mesh geometry={yawStatorGeo} position={[0, 0.036, 0.014]} castShadow receiveShadow>
          <meshStandardMaterial {...MAT.anodized} roughness={0.34} metalness={1} />
        </mesh>
        <mesh geometry={yawStatorRingGeo} position={[0, 0.036, 0.014]}>
          <meshStandardMaterial {...MAT.screwMetal} roughness={0.24} />
        </mesh>

        {/* —— Yaw 轴（绕 Y 旋转） —— */}
        <group name="gimbal-yaw-axis" rotation={[0, YAW, 0]}>
          <mesh geometry={yawRotorGeo} position={[0, 0.0278, 0.014]} castShadow>
            <meshStandardMaterial {...MAT.anodizedDark} roughness={0.36} metalness={1} />
          </mesh>
          <mesh geometry={yokeGeo} castShadow receiveShadow>
            <meshStandardMaterial {...MAT.anodizedDark} roughness={0.4} metalness={1} />
          </mesh>
          {/* Roll 定子 */}
          <mesh geometry={rollStatorGeo} position={[0, 0.010, -0.022]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <meshStandardMaterial {...MAT.anodized} roughness={0.32} metalness={1} />
          </mesh>

          {/* —— Roll 轴（绕 Z 旋转） —— */}
          <group name="gimbal-roll-axis" rotation={[0, 0, ROLL]}>
            <mesh geometry={rollRotorGeo} position={[0, 0.010, -0.0292]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <meshStandardMaterial {...MAT.anodizedDark} roughness={0.34} metalness={1} />
            </mesh>
            <mesh geometry={pitchBracketGeo} castShadow receiveShadow>
              <meshStandardMaterial {...MAT.anodizedDark} roughness={0.38} metalness={1} />
            </mesh>
            {/* Pitch 定子（左右各一） */}
            {[-1, 1].map((sx) => (
              <mesh
                key={sx}
                geometry={pitchHousingGeo}
                position={[sx * 0.029, -0.004, -0.004]}
                rotation={[0, 0, Math.PI / 2]}
                castShadow
              >
                <meshStandardMaterial {...MAT.anodized} roughness={0.3} metalness={1} />
              </mesh>
            ))}

            {/* —— Pitch 轴（绕 X 旋转） —— */}
            <group name="gimbal-pitch-axis" rotation={[PITCH, 0, 0]}>
              {[-1, 1].map((sx) => (
                <mesh
                  key={sx}
                  geometry={pitchRotorGeo}
                  position={[sx * 0.0262, -0.004, -0.004]}
                  rotation={[0, 0, sx * (Math.PI / 2)]}
                  castShadow
                >
                  <meshStandardMaterial {...MAT.screwMetal} roughness={0.28} />
                </mesh>
              ))}
            </group>
          </group>
        </group>

        {/* 柔性排线（Yaw 壳体 → 相机） */}
        <mesh geometry={ribbonGeo} castShadow>
          <meshStandardMaterial color="#8a5a20" metalness={0.35} roughness={0.55} />
        </mesh>
      </Part>

      {/* ============ 摄像头外壳（Pitch 轴从动件） ============ */}
      <Part id="drone.cameraShell" position={CAM} rotation={[0, YAW, 0]}>
        <group rotation={[0, 0, ROLL]}>
          <group rotation={[PITCH, 0, 0]}>
            <mesh geometry={cameraShellGeo} castShadow receiveShadow>
              <meshStandardMaterial {...MAT.anodizedDark} roughness={0.34} metalness={1} />
            </mesh>
            {/* 前框 */}
            <mesh geometry={cameraFrontGeo} position={[0, -0.001, -0.0192]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <meshStandardMaterial {...MAT.anodized} roughness={0.26} metalness={1} />
            </mesh>
            {/* 顶部导热片 */}
            <mesh geometry={camHeatPadGeo} position={[0, 0.0226, 0.002]} castShadow>
              <meshStandardMaterial {...MAT.heatsink} />
            </mesh>
            {/* 侧面防滑纹 */}
            {[-1, 1].map((sx) => (
              <mesh
                key={sx}
                geometry={camSideGripGeo}
                position={[sx * 0.0242, 0, 0.002]}
              >
                <meshStandardMaterial {...MAT.rubberSoft} />
              </mesh>
            ))}
            {/* 状态指示灯 */}
            <mesh position={[0.014, 0.012, -0.019]} rotation={[Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.0016, 12]} />
              <meshStandardMaterial
                color="#0c1418"
                emissive={EMISSIVE.amber}
                emissiveIntensity={1.8}
              />
            </mesh>
            {/* 前框螺钉 */}
            {[
              [-0.017, 0.017],
              [0.017, 0.017],
              [-0.017, -0.019],
              [0.017, -0.019],
            ].map(([dx, dy], i) => (
              <mesh key={i} geometry={frameScrewGeo} position={[dx, dy, -0.0208]} rotation={[Math.PI / 2, 0, 0]}>
                <meshStandardMaterial {...MAT.screwMetal} />
              </mesh>
            ))}
          </group>
        </group>
      </Part>

      {/* ============ 摄像头镜头 ============ */}
      <Part id="drone.cameraLens" position={CAM} rotation={[0, YAW, 0]}>
        <group rotation={[0, 0, ROLL]}>
          <group rotation={[PITCH, 0, 0]}>
            <mesh geometry={lensMetalRingGeo} position={[0, -0.001, -0.0248]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <meshStandardMaterial {...MAT.chrome} roughness={0.14} metalness={1} />
            </mesh>
            <mesh geometry={lensBarrelGeo} position={[0, -0.001, -0.0248]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <meshStandardMaterial {...MAT.anodized} roughness={0.26} metalness={1} />
            </mesh>
            <mesh
              geometry={lensGlassGeo}
              position={[0, -0.001, -0.0338]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <meshPhysicalMaterial
                color="#05080c"
                metalness={0.35}
                roughness={0.03}
                clearcoat={1}
                clearcoatRoughness={0.02}
                envMapIntensity={1.6}
              />
            </mesh>
            <mesh geometry={lensCoatingGeo} position={[0, -0.001, -0.0344]} rotation={[-Math.PI / 2, 0, 0]}>
              <meshPhysicalMaterial
                color="#20488f"
                metalness={1}
                roughness={0.07}
                envMapIntensity={1.4}
              />
            </mesh>
          </group>
        </group>
      </Part>

      {/* ============ 云台保护罩 ============ */}
      <Part id="drone.gimbalProtector" position={CAM} rotation={[0, YAW, 0]}>
        <group rotation={[0, 0, ROLL]}>
          <group rotation={[PITCH, 0, 0]}>
            <mesh geometry={protectorGeo} castShadow receiveShadow>
              <meshStandardMaterial
                color="#39404a"
                metalness={0.28}
                roughness={0.42}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        </group>
      </Part>
    </>
  )
}

const frameScrewGeo = lathe(
  [
    [0, 0],
    [0.0016, 0],
    [0.0016, 0.0009],
    [0.0011, 0.0014],
    [0, 0.0014],
  ],
  14
)

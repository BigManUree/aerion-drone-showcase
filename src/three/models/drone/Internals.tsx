import * as THREE from 'three'
import { Part } from '../shared/Part'
import { MAT } from '../../materials/palette'
import {
  chamferBox,
  curveOf,
  flatPlate,
  lathe,
  mergeGeometries,
  sweptTube,
} from '../shared/geometry'

/* ---------------- 主控制板 ---------------- */

const boardGeo = flatPlate(0.078, 0.0024, 0.132, 0.007, 0.0006)

function chipGeo(w: number, h: number, d: number) {
  const g = chamferBox(w, h, d, 0.0008, 0.0003, 2)
  return g
}

const mainChipsGeo = mergeGeometries([
  (() => {
    const g = chipGeo(0.017, 0.0022, 0.018)
    g.translate(-0.019, 0.0024, -0.038)
    return g
  })(),
  (() => {
    const g = chipGeo(0.014, 0.0018, 0.013)
    g.translate(0.018, 0.0022, -0.032)
    return g
  })(),
  (() => {
    const g = chipGeo(0.009, 0.0012, 0.024)
    g.translate(0.024, 0.0018, 0.014)
    return g
  })(),
  (() => {
    const g = chipGeo(0.022, 0.0014, 0.008)
    g.translate(-0.014, 0.0019, 0.040)
    return g
  })(),
])

const flyCtrlShieldGeo = chamferBox(0.026, 0.0055, 0.026, 0.002, 0.0006)
const imuGeo = chamferBox(0.012, 0.004, 0.012, 0.0015, 0.0005)
const capGeo = lathe(
  [
    [0, 0],
    [0.0032, 0],
    [0.0034, 0.001],
    [0.0034, 0.0084],
    [0.0024, 0.0092],
    [0, 0.0092],
  ],
  22
)
const boardPadGeo = mergeGeometries(
  Array.from({ length: 8 }, (_, i) => {
    const g = flatPlate(0.005, 0.0006, 0.0040, 0.001, 0.0002)
    g.translate(-0.027 + (i % 2) * 0.054, 0.0016, -0.052 + Math.floor(i / 2) * 0.030)
    return g
  })
)

/* ---------------- 电源模块 ---------------- */

const pmuShellGeo = chamferBox(0.028, 0.014, 0.026, 0.003, 0.001)
const pmuTopGeo = flatPlate(0.023, 0.002, 0.020, 0.002, 0.0006)

/* ---------------- 内部固定支架 ---------------- */

const bracketGeo = (() => {
  const rails = [-1, 1].map((sx) => {
    const g = chamferBox(0.007, 0.0045, 0.104, 0.0018, 0.0006)
    g.translate(sx * 0.031, -0.019, 0.004)
    return g
  })
  const bars = [-1, 1].map((sz) => {
    const g = chamferBox(0.068, 0.0045, 0.007, 0.0018, 0.0006)
    g.translate(0, -0.019, 0.004 + sz * 0.044)
    return g
  })
  const posts = [
    [-0.031, -0.038],
    [0.031, -0.038],
    [-0.031, 0.046],
    [0.031, 0.046],
  ].map(([x, z]) => {
    const g = lathe(
      [
        [0, 0],
        [0.0042, 0],
        [0.0042, 0.0062],
        [0.0028, 0.0062],
        [0.0028, 0.0016],
        [0, 0.0016],
      ],
      16
    )
    g.translate(x, -0.025, z)
    return g
  })
  const spine = chamferBox(0.012, 0.0035, 0.070, 0.0016, 0.0005)
  spine.translate(0, -0.0205, 0.004)
  return mergeGeometries([...rails, ...bars, ...posts, spine])
})()

/* ---------------- 线缆 ---------------- */

const cableGeos = mergeGeometries([
  sweptTube(
    curveOf([
      [-0.016, 0.004, -0.020],
      [-0.013, -0.006, -0.050],
      [-0.008, -0.014, -0.082],
      [-0.004, -0.016, -0.110],
    ]),
    0.0018,
    0.0016,
    40,
    9
  ),
  sweptTube(
    curveOf([
      [0.016, 0.004, -0.018],
      [0.019, -0.004, -0.048],
      [0.012, -0.013, -0.080],
      [0.006, -0.015, -0.108],
    ]),
    0.0016,
    0.0014,
    40,
    9
  ),
  sweptTube(
    curveOf([
      [0.021, 0.002, 0.020],
      [0.028, 0.000, 0.044],
      [0.030, 0.004, 0.066],
    ]),
    0.0015,
    0.0013,
    30,
    8
  ),
  sweptTube(
    curveOf([
      [-0.020, 0.002, 0.026],
      [-0.030, -0.002, 0.054],
      [-0.036, -0.004, 0.088],
      [-0.030, -0.006, 0.114],
    ]),
    0.0014,
    0.0012,
    36,
    8
  ),
])

/** 模块级共享几何体（内联创建会随挂载泄漏） */
const boardConnGeo = chamferBox(0.014, 0.004, 0.006, 0.0012, 0.0004)
const bracketScrewGeo = lathe([[0, 0], [0.0032, 0], [0.0032, 0.0022], [0, 0.0022]], 14)

export function DroneInternals() {
  return (
    <>
      {/* 主控制板 */}
      <Part id="drone.mainBoard" position={[0, -0.006, -0.004]}>
        <mesh geometry={boardGeo} receiveShadow castShadow>
          <meshStandardMaterial {...MAT.pcb} roughness={0.62} metalness={0.24} />
        </mesh>
        <mesh geometry={mainChipsGeo} castShadow>
          <meshStandardMaterial {...MAT.chip} roughness={0.44} />
        </mesh>
        <mesh geometry={flyCtrlShieldGeo} position={[-0.019, 0.0064, -0.038]} castShadow>
          <meshStandardMaterial {...MAT.silver} roughness={0.32} />
        </mesh>
        <mesh geometry={imuGeo} position={[0.018, 0.0054, 0.000]} castShadow>
          <meshStandardMaterial color="#2b3138" metalness={0.7} roughness={0.4} />
        </mesh>
        <mesh geometry={boardPadGeo}>
          <meshStandardMaterial {...MAT.gold} />
        </mesh>
        {[
          [-0.031, 0, -0.058],
          [0.031, 0, -0.058],
          [-0.031, 0, 0.056],
          [0.031, 0, 0.056],
        ].map(([x, , z], i) => (
          <mesh key={i} geometry={capGeo} position={[x, 0.0014, z]} castShadow>
            <meshStandardMaterial color="#8f959d" metalness={1} roughness={0.35} />
          </mesh>
        ))}
        {/* 板对板连接器 */}
        <mesh geometry={boardConnGeo} position={[0.004, 0.0034, -0.004]} castShadow>
          <meshStandardMaterial color="#242a30" metalness={0.3} roughness={0.5} />
        </mesh>
      </Part>

      {/* 电源模块 */}
      <Part id="drone.powerModule" position={[0.026, 0.008, 0.060]}>
        <mesh geometry={pmuShellGeo} castShadow receiveShadow>
          <meshStandardMaterial color="#9aa2aa" metalness={0.92} roughness={0.4} />
        </mesh>
        <mesh geometry={pmuTopGeo} position={[0, 0.0085, 0]} castShadow>
          <meshStandardMaterial color="#e2e6ea" metalness={0.3} roughness={0.6} />
        </mesh>
        <mesh geometry={capGeo} position={[0.010, 0.0085, -0.006]} castShadow>
          <meshStandardMaterial color="#1c2026" metalness={0.4} roughness={0.6} />
        </mesh>
        <mesh geometry={capGeo} position={[0.010, 0.0085, 0.006]} castShadow>
          <meshStandardMaterial color="#1c2026" metalness={0.4} roughness={0.6} />
        </mesh>
      </Part>

      {/* 内部线缆 */}
      <Part id="drone.cables" position={[0, 0, 0]}>
        <mesh geometry={cableGeos} castShadow>
          <meshStandardMaterial color="#20242a" metalness={0.05} roughness={0.8} />
        </mesh>
      </Part>

      {/* 内部固定支架 */}
      <Part id="drone.internalBracket" position={[0, 0, 0]}>
        <mesh geometry={bracketGeo} castShadow receiveShadow>
          <meshStandardMaterial color="#7f868f" metalness={0.92} roughness={0.46} />
        </mesh>
        {[
          [-0.031, -0.038],
          [0.031, -0.038],
          [-0.031, 0.046],
          [0.031, 0.046],
        ].map(([x, z], i) => (
          <mesh
            key={i}
            geometry={bracketScrewGeo}
            position={[x, -0.0255, z]}
          >
            <meshStandardMaterial color="#c9cfd6" metalness={1} roughness={0.25} />
          </mesh>
        ))}
      </Part>
    </>
  )
}

import * as THREE from 'three'
import { Part } from '../shared/Part'
import { MAT, EMISSIVE } from '../../materials/palette'
import { chamferBox } from '../shared/geometry'
import {
  antennaHingeGeo,
  antennaRodGeo,
  backBtnGeo,
  modeSwitchGeo,
  powerBtnGeo,
  powerRingGeo,
  shutterBtnGeo,
  stickBaseGeo,
  stickBaseRingGeo,
  stickCapGeo,
  stickKnurlGeo,
  stickShaftGeo,
} from './geometries'
import { ANTENNA_ROT, CTRL } from './config'

/** 模块级共享几何体（内联创建会随挂载泄漏） */
const gimbalCrossXGeo = chamferBox(0.026, 0.004, 0.004, 0.0016, 0.0005)
const gimbalCrossZGeo = chamferBox(0.004, 0.026, 0.004, 0.0016, 0.0005)
const hallSensorGeo = chamferBox(0.009, 0.006, 0.003, 0.0012, 0.0004)
const modeLedGeo = chamferBox(0.004, 0.0016, 0.003, 0.0006, 0.0002)

/* ---------------- 摇杆 ---------------- */

function Stick({ id, position }: { id: string; position: [number, number, number] }) {
  return (
    <Part id={id} position={position}>
      <mesh geometry={stickShaftGeo} castShadow>
        <meshStandardMaterial {...MAT.aluBlack} roughness={0.34} />
      </mesh>
      {/* 摇杆帽 */}
      <mesh geometry={stickCapGeo} position={[0, 0, 0.0242]} castShadow receiveShadow>
        <meshStandardMaterial {...MAT.silverDark} roughness={0.36} metalness={1} />
      </mesh>
      <mesh geometry={stickKnurlGeo} position={[0, 0, 0.0288]} rotation={[0, 0, 0]} castShadow>
        <meshStandardMaterial {...MAT.aluBlack} roughness={0.42} />
      </mesh>
      <mesh position={[0, 0, 0.0351]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.0062, 26]} />
        <meshStandardMaterial color="#2a3038" metalness={0.6} roughness={0.4} />
      </mesh>
    </Part>
  )
}

function StickBase({ id, position }: { id: string; position: [number, number, number] }) {
  return (
    <Part id={id} position={position}>
      <mesh geometry={stickBaseGeo} castShadow receiveShadow>
        <meshStandardMaterial {...MAT.plasticDark} roughness={0.55} />
      </mesh>
      <mesh geometry={stickBaseRingGeo} position={[0, 0, 0.0062]}>
        <meshStandardMaterial {...MAT.silver} roughness={0.28} />
      </mesh>
      {/* 万向节十字 */}
      <mesh geometry={gimbalCrossXGeo} position={[0, 0, 0.004]}>
        <meshStandardMaterial {...MAT.plasticGrey} />
      </mesh>
      <mesh geometry={gimbalCrossZGeo} position={[0, 0, 0.004]}>
        <meshStandardMaterial {...MAT.plasticGrey} />
      </mesh>
      {/* 霍尔传感器 */}
      <mesh geometry={hallSensorGeo} position={[0.011, 0.011, 0.002]}>
        <meshStandardMaterial {...MAT.chip} />
      </mesh>
    </Part>
  )
}

/* ---------------- 按键 ---------------- */

function PowerButton() {
  return (
    <Part id="ctrl.btnPower" position={CTRL.btnPower}>
      <mesh geometry={powerBtnGeo} castShadow>
        <meshStandardMaterial {...MAT.silverDark} roughness={0.3} metalness={1} />
      </mesh>
      <mesh geometry={powerRingGeo} position={[0, 0, 0.0008]}>
        <meshStandardMaterial
          color="#0c1a1c"
          emissive={EMISSIVE.green}
          emissiveIntensity={1.4}
          roughness={0.4}
        />
      </mesh>
      {/* 电源图标：断口圆环 + 竖条 */}
      <mesh position={[0, 0, 0.0049]}>
        <ringGeometry args={[0.0034, 0.0044, 28, 1, -Math.PI * 0.32, Math.PI * 1.64]} />
        <meshStandardMaterial color="#e6f3f7" emissive={EMISSIVE.white} emissiveIntensity={0.7} />
      </mesh>
      <mesh position={[0, 0.0012, 0.0049]}>
        <planeGeometry args={[0.0011, 0.0046]} />
        <meshStandardMaterial color="#e6f3f7" emissive={EMISSIVE.white} emissiveIntensity={0.7} />
      </mesh>
    </Part>
  )
}

function BackButton() {
  return (
    <Part id="ctrl.btnBack" position={CTRL.btnBack}>
      <mesh geometry={backBtnGeo} castShadow>
        <meshStandardMaterial color="#2f353d" metalness={0.4} roughness={0.45} />
      </mesh>
      {/* 返回箭头：弧形 + 箭头 */}
      <mesh position={[0, 0, 0.0047]}>
        <ringGeometry args={[0.0028, 0.0042, 26, 1, Math.PI * 0.62, Math.PI * 1.1]} />
        <meshStandardMaterial color="#cfe6f2" emissive={EMISSIVE.white} emissiveIntensity={0.55} />
      </mesh>
      <mesh position={[-0.0032, 0.0016, 0.0047]} rotation={[0, 0, Math.PI * 0.25]}>
        <circleGeometry args={[0.0028, 3]} />
        <meshStandardMaterial color="#cfe6f2" emissive={EMISSIVE.white} emissiveIntensity={0.55} />
      </mesh>
    </Part>
  )
}

function ModeSwitch() {
  return (
    <Part id="ctrl.btnMode" position={CTRL.btnMode}>
      <mesh geometry={modeSwitchGeo} castShadow>
        <meshStandardMaterial {...MAT.aluBlack} metalness={0.8} roughness={0.36} />
      </mesh>
      <mesh geometry={modeLedGeo} position={[0, 0.004, 0.0112]}>
        <meshStandardMaterial color="#0d1216" emissive={EMISSIVE.amber} emissiveIntensity={1.2} />
      </mesh>
    </Part>
  )
}

function ShutterButton() {
  return (
    <Part id="ctrl.btnShutter" position={CTRL.btnShutter}>
      <mesh geometry={shutterBtnGeo} castShadow>
        <meshStandardMaterial color="#b4342f" metalness={0.85} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.0056]}>
        <torusGeometry args={[0.0074, 0.0009, 8, 30]} />
        <meshStandardMaterial color="#7a1f1c" metalness={0.9} roughness={0.35} />
      </mesh>
    </Part>
  )
}

/* ---------------- 天线 ---------------- */

function Antenna({ id, position, rotation }: { id: string; position: [number, number, number]; rotation: [number, number, number] }) {
  return (
    <Part id={id} position={position} rotation={rotation}>
      <mesh geometry={antennaHingeGeo} castShadow receiveShadow>
        <meshStandardMaterial {...MAT.aluBlack} roughness={0.38} />
      </mesh>
      <mesh geometry={antennaRodGeo} castShadow receiveShadow>
        <meshStandardMaterial {...MAT.graphiteLight} roughness={0.46} />
      </mesh>
      {/* 天线内芯（拆解后可见） */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.0022, 0.0022, 0.075, 12]} />
        <meshStandardMaterial {...MAT.copper} metalness={1} roughness={0.4} />
      </mesh>
      {/* 尾部阻尼旋钮 */}
      <mesh position={[0, 0.006, 0]}>
        <torusGeometry args={[0.0072, 0.0014, 8, 24]} />
        <meshStandardMaterial {...MAT.silverDark} />
      </mesh>
    </Part>
  )
}

export function ControllerControls() {
  return (
    <>
      <Stick id="ctrl.stickLeft" position={CTRL.stickL} />
      <Stick id="ctrl.stickRight" position={CTRL.stickR} />
      <StickBase id="ctrl.stickBaseLeft" position={CTRL.baseL} />
      <StickBase id="ctrl.stickBaseRight" position={CTRL.baseR} />
      <PowerButton />
      <BackButton />
      <ModeSwitch />
      <ShutterButton />
      <Antenna id="ctrl.antennaLeft" position={CTRL.antennaL} rotation={ANTENNA_ROT.L} />
      <Antenna id="ctrl.antennaRight" position={CTRL.antennaR} rotation={ANTENNA_ROT.R} />
    </>
  )
}

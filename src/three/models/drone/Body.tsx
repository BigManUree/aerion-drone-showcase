import { useEffect, useMemo } from 'react'
import { Part } from '../shared/Part'
import { MAT, EMISSIVE, createBatteryLabel } from '../../materials/palette'
import { chamferBox, flatPlate, lathe } from '../shared/geometry'
import {
  batteryGripGeo,
  batteryLatchGeo,
  batteryLedSegGeo,
  batteryLedWindowGeo,
  batteryPinsGeo,
  batteryPullGeo,
  batteryShellGeo,
  batterySocketGeo,
  batteryTopPlateGeo,
  bayContactGeo,
  bayFloorGeo,
  bayFrameGeo,
  bayRailsGeo,
  bottomSeamGeo,
  bottomShellGeo,
  bottomScrews,
  bottomVentGeo,
  gpsDomeGeo,
  gpsRingGeo,
  heatBaseGeo,
  heatFinsGeo,
  heatScrews,
  intakeGrilleGeo,
  keelGeo,
  ledChannelGeo,
  ledEyeHousingGeo,
  ledEyeLensGeo,
  ledStripGeo,
  ledTailGeo,
  noseBumperGeo,
  seamGrooveGeo,
  sideLouversGeo,
  tailPanelGeo,
  topScrews,
  topShellGeo,
} from './geometries'

/** 模块级共享几何体：内联创建会在每次挂载产生新实例，卸载时不回收，导致显存泄漏 */
const gearMountGeo = chamferBox(0.014, 0.005, 0.020, 0.003, 0.0008)
const heatPadGeo = chamferBox(0.026, 0.0016, 0.022, 0.003, 0.0005)
const baySealGeo = lathe([[0, 0], [0.041, 0], [0.041, 0.0016], [0, 0.0016]], 40)

export function DroneBody() {
  const label = useMemo(() => createBatteryLabel(), [])
  // r3f 卸载时只释放材质与几何，纹理需要显式 dispose，否则每次模型切换都会泄漏一张贴图
  useEffect(() => () => label.dispose(), [label])

  return (
    <>
      {/* 主机身上盖 */}
      <Part id="drone.topShell">
        <mesh geometry={topShellGeo} castShadow receiveShadow>
          <meshStandardMaterial {...MAT.mattePlastic} envMapIntensity={1.05} />
        </mesh>
        {/* 表面接缝 */}
        <mesh geometry={seamGrooveGeo} castShadow>
          <meshStandardMaterial {...MAT.mattePlasticDark} roughness={0.85} />
        </mesh>
        {/* 前部进气百叶 */}
        <mesh geometry={intakeGrilleGeo} castShadow>
          <meshStandardMaterial {...MAT.anodizedDark} />
        </mesh>
        {/* 两侧散热百叶 */}
        <mesh geometry={sideLouversGeo} castShadow>
          <meshStandardMaterial {...MAT.anodizedDark} />
        </mesh>
        {/* 机头软胶防撞条 */}
        <mesh geometry={noseBumperGeo} castShadow>
          <meshStandardMaterial {...MAT.rubberSoft} />
        </mesh>
      </Part>

      {/* 主机身底壳 */}
      <Part id="drone.bottomShell">
        <mesh geometry={bottomShellGeo} castShadow receiveShadow>
          <meshStandardMaterial {...MAT.mattePlastic} roughness={0.72} envMapIntensity={0.95} />
        </mesh>
        <mesh geometry={bottomSeamGeo}>
          <meshStandardMaterial {...MAT.mattePlasticDark} roughness={0.85} />
        </mesh>
        {/* 龙骨加强板 */}
        <mesh geometry={keelGeo} castShadow receiveShadow>
          <meshStandardMaterial {...MAT.anodizedDark} roughness={0.44} />
        </mesh>
        {/* 排热槽 */}
        <mesh geometry={bottomVentGeo} castShadow>
          <meshStandardMaterial color="#0c0f12" metalness={0.9} roughness={0.5} />
        </mesh>
        {/* 尾部接口面板 */}
        <mesh geometry={tailPanelGeo.panel} castShadow>
          <meshStandardMaterial {...MAT.anodizedDark} roughness={0.4} />
        </mesh>
        <mesh geometry={tailPanelGeo.slots}>
          <meshStandardMaterial color="#08090b" metalness={0.5} roughness={0.45} />
        </mesh>
        <mesh geometry={tailPanelGeo.led}>
          <meshStandardMaterial
            color="#0b1418"
            emissive={EMISSIVE.green}
            emissiveIntensity={1.6}
            roughness={0.3}
          />
        </mesh>
        {/* 起落架安装座 */}
        {[-1, 1].map((sx) =>
          [-1, 1].map((sz) => (
            <mesh
              key={`${sx}${sz}`}
              geometry={gearMountGeo}
              position={[sx * 0.050, -0.025, sz * 0.055]}
              castShadow
            >
              <meshStandardMaterial {...MAT.anodized} roughness={0.38} />
            </mesh>
          ))
        )}
      </Part>

      {/* 上盖固定螺钉（沿 +Y 安装轴线） */}
      <Part id="drone.screwsTop">
        <mesh geometry={topScrews.head} castShadow>
          <meshStandardMaterial {...MAT.screwMetal} />
        </mesh>
        <mesh geometry={topScrews.recess}>
          <meshStandardMaterial color="#15181c" metalness={0.6} roughness={0.6} />
        </mesh>
      </Part>

      {/* 底壳固定螺钉（沿 −Y 安装轴线） */}
      <Part id="drone.screwsBottom">
        <mesh geometry={bottomScrews.head} castShadow>
          <meshStandardMaterial {...MAT.screwMetal} />
        </mesh>
        <mesh geometry={bottomScrews.recess}>
          <meshStandardMaterial color="#15181c" metalness={0.6} roughness={0.6} />
        </mesh>
      </Part>

      {/* 指示灯与灯带 */}
      <Part id="drone.led">
        {/* 灯罩凹槽 */}
        <mesh geometry={ledChannelGeo} castShadow>
          <meshStandardMaterial color="#0a0d10" metalness={0.2} roughness={0.7} />
        </mesh>
        {/* 发光灯带 */}
        <mesh geometry={ledStripGeo}>
          <meshStandardMaterial
            color="#0b1a1e"
            emissive={EMISSIVE.cyan}
            emissiveIntensity={1.9}
            roughness={0.3}
            metalness={0.05}
            transparent
            opacity={0.96}
          />
        </mesh>
        {/* 前灯灯座 + 扩散片 */}
        <mesh geometry={ledEyeHousingGeo} castShadow>
          <meshStandardMaterial {...MAT.anodizedDark} roughness={0.4} />
        </mesh>
        <mesh geometry={ledEyeLensGeo}>
          <meshStandardMaterial
            color="#101820"
            emissive={EMISSIVE.white}
            emissiveIntensity={2.2}
            roughness={0.18}
            metalness={0.1}
          />
        </mesh>
        {/* 尾部导航灯 */}
        <mesh geometry={ledTailGeo}>
          <meshStandardMaterial
            color="#101820"
            emissive={EMISSIVE.red}
            emissiveIntensity={2.0}
            roughness={0.22}
          />
        </mesh>
      </Part>

      {/* 散热模块 */}
      <Part id="drone.heatSink" position={[0, 0.0322, 0.026]}>
        <mesh geometry={heatBaseGeo} castShadow receiveShadow>
          <meshStandardMaterial {...MAT.heatsink} />
        </mesh>
        <mesh geometry={heatFinsGeo} castShadow>
          <meshStandardMaterial {...MAT.heatsink} roughness={0.32} />
        </mesh>
        <mesh geometry={heatPadGeo} position={[0, -0.0032, 0]}>
          <meshStandardMaterial color="#14171b" metalness={0.3} roughness={0.8} />
        </mesh>
        <mesh geometry={heatScrews.head} castShadow>
          <meshStandardMaterial {...MAT.screwMetal} />
        </mesh>
        <mesh geometry={heatScrews.recess}>
          <meshStandardMaterial color="#15181c" metalness={0.6} roughness={0.6} />
        </mesh>
      </Part>

      {/* GPS 模块 */}
      <Part id="drone.gps" position={[0, 0.0312, -0.050]}>
        <mesh geometry={gpsDomeGeo} castShadow receiveShadow>
          <meshStandardMaterial color="#39414a" metalness={0.35} roughness={0.55} />
        </mesh>
        <mesh geometry={gpsRingGeo}>
          <meshStandardMaterial {...MAT.anodized} roughness={0.3} />
        </mesh>
      </Part>

      {/* 智能电池 */}
      <Part id="drone.battery" position={[0, 0.0448, 0.100]}>
        <mesh geometry={batteryShellGeo} castShadow receiveShadow>
          <meshStandardMaterial {...MAT.mattePlasticDark} roughness={0.66} />
        </mesh>
        <mesh geometry={batteryTopPlateGeo} position={[0, 0.0131, -0.012]} castShadow>
          <meshStandardMaterial {...MAT.anodized} roughness={0.34} metalness={1} />
        </mesh>
        {/* 丝印标签 */}
        <mesh position={[0, 0.01415, 0.0145]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.056, 0.0215]} />
          <meshStandardMaterial
            map={label}
            transparent
            roughness={0.5}
            metalness={0.05}
            polygonOffset
            polygonOffsetFactor={-2}
            depthWrite={false}
          />
        </mesh>
        {/* 电量指示 */}
        <mesh geometry={batteryLedWindowGeo} position={[0, 0.0140, -0.012]}>
          <meshStandardMaterial color="#05070a" metalness={0.4} roughness={0.45} />
        </mesh>
        <mesh geometry={batteryLedSegGeo} position={[0, 0.0151, -0.012]}>
          <meshStandardMaterial
            color="#0d1418"
            emissive={EMISSIVE.green}
            emissiveIntensity={1.7}
            roughness={0.28}
          />
        </mesh>
        {/* 侧面释放卡扣 */}
        <mesh geometry={batteryLatchGeo} castShadow>
          <meshStandardMaterial color="#c0c6cd" metalness={0.95} roughness={0.3} />
        </mesh>
        {/* 防滑握纹 */}
        <mesh geometry={batteryGripGeo} castShadow>
          <meshStandardMaterial {...MAT.rubberSoft} roughness={0.9} />
        </mesh>
        {/* 电源接口 */}
        <mesh geometry={batterySocketGeo}>
          <meshStandardMaterial color="#0d1014" metalness={0.3} roughness={0.7} />
        </mesh>
        <mesh geometry={batteryPinsGeo}>
          <meshStandardMaterial {...MAT.gold} />
        </mesh>
        {/* 拉带 */}
        <mesh geometry={batteryPullGeo} castShadow>
          <meshStandardMaterial color="#31363c" metalness={0.05} roughness={0.85} />
        </mesh>
      </Part>

      {/* 电池仓 */}
      <Part id="drone.batteryBay" position={[0, 0.0272, 0.100]}>
        <mesh geometry={bayFrameGeo} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <meshStandardMaterial {...MAT.anodizedDark} roughness={0.42} />
        </mesh>
        <mesh geometry={bayFloorGeo} position={[0, -0.0105, 0]} receiveShadow>
          <meshStandardMaterial {...MAT.mattePlasticDark} />
        </mesh>
        <mesh geometry={bayRailsGeo} castShadow>
          <meshStandardMaterial color="#15191d" metalness={0.4} roughness={0.6} />
        </mesh>
        {/* 仓内触点与密封条 */}
        <mesh geometry={bayContactGeo.block} castShadow>
          <meshStandardMaterial color="#1c2126" metalness={0.5} roughness={0.5} />
        </mesh>
        <mesh geometry={bayContactGeo.pins}>
          <meshStandardMaterial {...MAT.gold} />
        </mesh>
        {/* 仓口密封胶条：lathe 生成时即以 Y 为轴，无需再翻转，
            之前多转 90° 会把直径 82mm 的密封圈竖立起来穿透机身 */}
        <mesh geometry={baySealGeo} position={[0, 0.0072, 0]}>
          <meshStandardMaterial {...MAT.rubberSoft} transparent opacity={0.9} />
        </mesh>
      </Part>
    </>
  )
}

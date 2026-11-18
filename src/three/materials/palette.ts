import * as THREE from 'three'

/**
 * PBR 材质库
 * 深灰 / 银灰配色体系，金属度与粗糙度按工业涂装分级
 */
export const MAT = {
  /** 上盖 / 主体深灰涂装 */
  graphite: { color: '#30353c', metalness: 0.42, roughness: 0.44 },
  /** 略亮的石墨灰，用于分层结构 */
  graphiteLight: { color: '#3d444c', metalness: 0.48, roughness: 0.38 },
  /** 银灰阳极氧化 */
  silver: { color: '#c6cbd1', metalness: 1.0, roughness: 0.24 },
  /** 深银灰 */
  silverDark: { color: '#8d949c', metalness: 1.0, roughness: 0.32 },
  /** 黑色金属（铰接、螺钉） */
  aluBlack: { color: '#1b1e22', metalness: 0.92, roughness: 0.36 },
  /** 镜面抛光金属（镜头环） */
  chrome: { color: '#dfe4ea', metalness: 1.0, roughness: 0.09 },
  /** 磨砂橡胶 / 握把 */
  rubber: { color: '#15171a', metalness: 0.04, roughness: 0.86 },
  /** 碳纤维件 */
  carbon: { color: '#20242a', metalness: 0.6, roughness: 0.3 },
  /** 内部黑色工程塑料 */
  plasticDark: { color: '#101317', metalness: 0.12, roughness: 0.6 },
  /** 灰色工程塑料（内部支架） */
  plasticGrey: { color: '#2a2f36', metalness: 0.1, roughness: 0.64 },
  /** PCB 阻焊绿 */
  pcb: { color: '#123d31', metalness: 0.28, roughness: 0.55 },
  /** 芯片封装 */
  chip: { color: '#15181c', metalness: 0.22, roughness: 0.42 },
  /** 铜绕组 */
  copper: { color: '#a9693c', metalness: 1.0, roughness: 0.34 },
  /** 镀金触点 */
  gold: { color: '#d8ad57', metalness: 1.0, roughness: 0.26 },
  /** 铝合金散热鳍片 */
  heatsink: { color: '#a7aeb6', metalness: 0.95, roughness: 0.28 },
  /** 电池外壳 */
  battery: { color: '#242a31', metalness: 0.35, roughness: 0.5 },
  /** 玻璃（镜头 / 屏幕盖板） */
  glass: {
    color: '#dfeaf2',
    metalness: 0.0,
    roughness: 0.05,
    transmission: 0.94,
    thickness: 0.006,
    ior: 1.52,
    transparent: true,
    opacity: 1,
  },
  /** 深色光学玻璃（视觉传感器） */
  irGlass: { color: '#1d0a12', metalness: 0.3, roughness: 0.08 },
  /** 哑光工程塑料（机身外壳） */
  mattePlastic: { color: '#31363d', metalness: 0.02, roughness: 0.78 },
  /** 深色哑光工程塑料（结构件 / 内衬） */
  mattePlasticDark: { color: '#191d22', metalness: 0.02, roughness: 0.74 },
  /** 阳极氧化铝（机臂铰接 / 装饰） */
  anodized: { color: '#5a626b', metalness: 1.0, roughness: 0.3 },
  anodizedDark: { color: '#2b3036', metalness: 1.0, roughness: 0.36 },
  /** 金属螺钉 */
  screwMetal: { color: '#c9cfd6', metalness: 1.0, roughness: 0.2 },
  /** 黑色软胶（脚垫 / 密封） */
  rubberSoft: { color: '#0e1013', metalness: 0.0, roughness: 0.94 },
  /** 半透明灯罩 */
  diffuserGlass: {
    color: '#e2f7ff',
    metalness: 0.0,
    roughness: 0.2,
    transparent: true,
    opacity: 0.55,
  },
  /** 光学级镜头玻璃 */
  lensGlass: {
    color: '#eaf6ff',
    metalness: 0.0,
    roughness: 0.03,
    transmission: 0.95,
    thickness: 0.004,
    ior: 1.52,
    transparent: true,
  },
  /** 半透明白色扩散罩（灯带） */
  diffuser: { color: '#e8f4ff', metalness: 0.0, roughness: 0.3, transparent: true, opacity: 0.55 },
} satisfies Record<string, Record<string, unknown>>

export const EMISSIVE = {
  cyan: '#59f2ff',
  white: '#e9f6ff',
  red: '#ff3b3b',
  green: '#3bff9a',
  amber: '#ffb03b',
}

/** 选中 / 悬停时的高亮色 */
export const HIGHLIGHT = {
  select: new THREE.Color('#00C8FF'),
  hover: new THREE.Color('#5FE0FF'),
}

export const selectIntensity = 0.5
export const hoverIntensity = 0.16

/** 屏幕 HUD 贴图：程序化绘制遥测界面 */
export function createHudTexture(): THREE.CanvasTexture {
  const w = 1024
  const h = 600
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!
  const bg = g.createLinearGradient(0, 0, w, h)
  bg.addColorStop(0, '#061019')
  bg.addColorStop(0.5, '#07161f')
  bg.addColorStop(1, '#040b12')
  g.fillStyle = bg
  g.fillRect(0, 0, w, h)

  // 网格
  g.strokeStyle = 'rgba(0,200,255,0.10)'
  g.lineWidth = 1
  for (let x = 0; x < w; x += 48) {
    g.beginPath()
    g.moveTo(x, 0)
    g.lineTo(x, h)
    g.stroke()
  }
  for (let y = 0; y < h; y += 48) {
    g.beginPath()
    g.moveTo(0, y)
    g.lineTo(w, y)
    g.stroke()
  }

  // 顶部状态栏
  g.fillStyle = 'rgba(0,200,255,0.9)'
  g.font = '600 26px "Inter", monospace'
  g.fillText('AERION  X9 PRO', 40, 52)
  g.font = '500 22px monospace'
  g.fillStyle = 'rgba(160,185,200,0.85)'
  g.fillText('RC PRO  ·  LINK 20KM', 40, 88)

  // 右侧信号 / 电量
  for (let i = 0; i < 4; i++) {
    g.fillStyle = i < 3 ? 'rgba(0,200,255,0.9)' : 'rgba(120,140,155,0.35)'
    g.fillRect(w - 60 - i * 18, 40 + i * 4, 10, 26 - i * 4)
  }
  g.strokeStyle = 'rgba(0,200,255,0.9)'
  g.lineWidth = 2
  g.strokeRect(760, 44, 74, 30)
  g.fillStyle = 'rgba(0,200,255,0.9)'
  g.fillRect(766, 50, 42, 18)

  // 中心准星
  g.strokeStyle = 'rgba(230,245,255,0.5)'
  g.lineWidth = 2
  g.beginPath()
  g.arc(w / 2, h / 2 + 30, 74, 0, Math.PI * 2)
  g.stroke()
  g.beginPath()
  g.moveTo(w / 2 - 110, h / 2 + 30)
  g.lineTo(w / 2 - 60, h / 2 + 30)
  g.moveTo(w / 2 + 60, h / 2 + 30)
  g.lineTo(w / 2 + 110, h / 2 + 30)
  g.moveTo(w / 2, h / 2 - 50)
  g.lineTo(w / 2, h / 2 - 10)
  g.stroke()

  // 左侧姿态仪
  g.save()
  g.translate(150, h / 2 + 40)
  g.strokeStyle = 'rgba(0,200,255,0.75)'
  g.lineWidth = 3
  g.beginPath()
  g.arc(0, 0, 62, 0, Math.PI * 2)
  g.stroke()
  g.beginPath()
  g.moveTo(-46, 0)
  g.lineTo(-16, 0)
  g.moveTo(16, 0)
  g.lineTo(46, 0)
  g.stroke()
  g.strokeStyle = 'rgba(255,170,80,0.9)'
  g.beginPath()
  g.moveTo(-30, 8)
  g.lineTo(30, 8)
  g.stroke()
  g.restore()

  // 左侧数据
  g.font = '600 20px monospace'
  g.fillStyle = 'rgba(120,220,215,0.75)'
  g.fillText('ALT', 60, h - 190)
  g.fillText('SPD', 60, h - 140)
  g.fillText('DIST', 60, h - 90)
  g.font = '600 34px monospace'
  g.fillStyle = '#e9f9ff'
  g.fillText('128.4', 140, h - 188)
  g.fillText('12.6', 140, h - 138)
  g.fillText('842', 140, h - 88)
  g.font = '500 20px monospace'
  g.fillStyle = 'rgba(120,220,215,0.75)'
  g.fillText('m', 268, h - 188)
  g.fillText('m/s', 268, h - 138)
  g.fillText('m', 230, h - 88)

  // 底部时间轴
  g.fillStyle = 'rgba(0,200,255,0.8)'
  g.fillRect(40, h - 44, 380, 3)
  g.fillStyle = 'rgba(230,245,255,0.55)'
  g.font = '500 18px monospace'
  g.fillText('00:14:32', 440, h - 34)

  // 右侧录制指示
  g.fillStyle = 'rgba(255,70,70,0.95)'
  g.beginPath()
  g.arc(w - 150, h - 120, 9, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = 'rgba(255,255,255,0.85)'
  g.font = '600 20px monospace'
  g.fillText('REC 5.4K', w - 128, h - 112)
  g.fillStyle = 'rgba(255,255,255,0.5)'
  g.font = '500 18px monospace'
  g.fillText('1/500   f2.8   ISO 100', w - 380, h - 60)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}


/** 电池表面丝印贴图（透明底，仅文字与标记） */
export function createBatteryLabel(): THREE.CanvasTexture {
  const w = 640
  const h = 320
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!
  g.clearRect(0, 0, w, h)

  g.fillStyle = 'rgba(232,240,246,0.92)'
  g.font = '600 40px "Inter", "Microsoft YaHei", sans-serif'
  g.fillText('AERION  INTELLIGENT BATTERY', 28, 74)

  g.fillStyle = 'rgba(0,200,255,0.9)'
  g.fillRect(28, 92, 300, 3)

  g.fillStyle = 'rgba(198,210,220,0.72)'
  g.font = '500 26px "JetBrains Mono", monospace'
  g.fillText('5870 mAh   15.4 V   90.4 Wh', 28, 146)
  g.fillText('4S  Li-Po   -10 ~ 45 °C', 28, 188)
  g.font = '500 22px "JetBrains Mono", monospace'
  g.fillStyle = 'rgba(160,176,190,0.55)'
  g.fillText('SN  X9P-24A0071', 28, 232)
  g.fillText('MODEL  BAT-5870', 28, 266)

  // 信息矩阵块
  g.fillStyle = 'rgba(220,232,242,0.75)'
  for (let i = 0; i < 12; i++) {
    for (let j = 0; j < 12; j++) {
      if ((i * 7 + j * 3 + ((i * j) % 5)) % 3 !== 0) {
        g.fillRect(w - 190 + j * 9, 60 + i * 9, 7, 7)
      }
    }
  }
  g.strokeStyle = 'rgba(0,200,255,0.55)'
  g.lineWidth = 2
  g.strokeRect(w - 196, 54, 116, 116)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

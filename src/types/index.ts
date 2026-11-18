export type ModelKind = 'drone' | 'controller'

/** 拆解层级：1 外部附件 / 2 外部机身 / 3 内部组件 / 4 精密组件 */
export type PartLevel = 1 | 2 | 3 | 4

export type Vec3 = [number, number, number]

export interface PartDef {
  /** 全局唯一零件 ID */
  id: string
  /** 中文名称 */
  name: string
  /** 英文名称（工业标注用） */
  code: string
  /** 分类 */
  category: string
  /** 所属模型 */
  model: ModelKind
  /** 拆解层级 */
  level: PartLevel
  /** 层级内顺序 0~1，用于同级错峰（缺省按层级内序号自动分配） */
  order?: number
  /** 该零件运动区段占全局进度的比例（0.15~0.30） */
  duration?: number
  /** 零件介绍 */
  description: string
  /** 材质说明 */
  materials: string[]
  /** 尺寸标注 */
  dimensions: string
  /** 拆解位移（基准单位，米）—— explodedPosition − originalPosition */
  explode: Vec3
  /** 拆解附加旋转（角度） */
  explodeRot?: Vec3
}

/** 运行时运动定义（由 PartDef 计算得到） */
export interface PartMotion {
  id: string
  level: PartLevel
  /** 父级零件 ID：自身位移为相对增量，父级位移不重复计入 */
  follow?: string
  /** 全局进度上的运动区段 [start, end] */
  window: [number, number]
  /** 拆解位移 */
  offset: Vec3
  /** 拆解旋转（弧度） */
  rot: Vec3
}

export interface ModelMeta {
  kind: ModelKind
  name: string
  code: string
  tagline: string
  description: string
  specs: { label: string; value: string }[]
}

export interface ExplodeLevelMeta {
  level: PartLevel
  name: string
  code: string
  items: string[]
}

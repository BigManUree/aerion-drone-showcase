import type { BgTheme } from '../../store/useAppStore'

export interface SceneTheme {
  /** 画布底色 */
  clear: string
  /** 雾效 [颜色, 近, 远] */
  fog: [string, number, number]
  /** 网格线 */
  cell: string
  section: string
  /** 网格淡出距离 */
  fade: number
  /** 环境光补偿 */
  ambient: number
  /** 暗角强度 */
  vignette: number
  /** 取景衬底（CSS 渐变） */
  backdrop: string
}

export const SCENE_THEMES: Record<BgTheme, SceneTheme> = {
  studio: {
    clear: '#101318',
    fog: ['#101318', 3.4, 8.2],
    cell: '#1b232d',
    section: '#2b3a48',
    fade: 2.6,
    ambient: 0.2,
    vignette: 0.58,
    backdrop:
      'radial-gradient(ellipse at 50% 38%, #171c23 0%, #12161c 46%, #101318 100%)',
  },
  blueprint: {
    clear: '#0b1620',
    fog: ['#0b1620', 3.0, 7.4],
    cell: '#153343',
    section: '#1f5f7a',
    fade: 2.2,
    ambient: 0.28,
    vignette: 0.52,
    backdrop:
      'radial-gradient(ellipse at 50% 40%, #10202c 0%, #0c1822 52%, #0a141c 100%)',
  },
  graphite: {
    clear: '#1a1f27',
    fog: ['#1a1f27', 3.6, 8.6],
    cell: '#2a323d',
    section: '#3d4a5a',
    fade: 2.9,
    ambient: 0.24,
    vignette: 0.5,
    backdrop:
      'radial-gradient(ellipse at 50% 36%, #232a34 0%, #1c222a 50%, #171c23 100%)',
  },
}

export const BG_OPTIONS: { key: BgTheme; label: string; en: string; swatch: string }[] = [
  { key: 'studio', label: '深空', en: 'STUDIO', swatch: '#101318' },
  { key: 'blueprint', label: '蓝图', en: 'BLUEPRINT', swatch: '#0b1620' },
  { key: 'graphite', label: '石墨', en: 'GRAPHITE', swatch: '#1a1f27' },
]

export const VIEW_OPTIONS = [
  { key: 'iso' as const, label: '等轴测', en: 'ISO' },
  { key: 'front' as const, label: '正视图', en: 'FRONT' },
  { key: 'top' as const, label: '俯视图', en: 'TOP' },
  { key: 'side' as const, label: '侧视图', en: 'SIDE' },
]

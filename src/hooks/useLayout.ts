import { useEffect, useState } from 'react'

/**
 * 布局档位
 * - wide   : ≥1680（1920×1080）
 * - lg     : ≥1440（1440×900）
 * - md     : ≥1280（1366×768 常见档）
 * - sm     : ≥1024（小笔记本 / 横屏平板）
 * - xs     : <1024（竖屏平板，面板改为抽屉）
 */
export type Tier = 'wide' | 'lg' | 'md' | 'sm' | 'xs'

export interface LayoutInfo {
  width: number
  height: number
  tier: Tier
  /** 面板是否以抽屉形式覆盖在场景上 */
  drawer: boolean
  /** 侧栏宽度 */
  leftW: number
  rightW: number
  /** 顶栏 / 底栏高度 */
  topH: number
  bottomH: number
  /** 是否为矮屏（1366×768 等），用于压缩纵向留白 */
  short: boolean
}

function measure(): LayoutInfo {
  const width = typeof window === 'undefined' ? 1440 : window.innerWidth
  const height = typeof window === 'undefined' ? 900 : window.innerHeight
  const tier: Tier =
    width >= 1680 ? 'wide' : width >= 1440 ? 'lg' : width >= 1280 ? 'md' : width >= 1024 ? 'sm' : 'xs'
  return {
    width,
    height,
    tier,
    drawer: width < 1280,
    leftW: tier === 'wide' ? 288 : tier === 'lg' ? 268 : 244,
    rightW: tier === 'wide' ? 332 : tier === 'lg' ? 312 : 288,
    topH: height < 800 ? 52 : 58,
    bottomH: height < 800 ? 58 : 64,
    short: height < 820,
  }
}

export function useLayout(): LayoutInfo {
  const [info, setInfo] = useState<LayoutInfo>(measure)

  useEffect(() => {
    let raf = 0
    const onResize = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setInfo(measure()))
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])

  return info
}

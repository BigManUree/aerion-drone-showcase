import { useCallback, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { LEVEL_BANDS } from '../data/motion'
import {
  applySpeed,
  autoPlay,
  killProgressTween,
  pauseProgressTween,
  setProgressDirect,
  tweenTo,
} from '../three/animations/explode'
import { animateBoost, boostOf, resetBoostAnim } from '../three/animations/ExplodeDriver'

/**
 * 拆解动作统一入口
 * 所有控制最终都写到同一个 progress，滑块 / 分级 / 自动播放天然同步
 */
export function useExplodeActions() {
  const paused = useAppStore((s) => s.paused)
  const autoDir = useAppStore((s) => s.autoDir)
  const model = useAppStore((s) => s.model)

  // 切换模型时清空补间与单件加成
  useEffect(() => {
    killProgressTween()
    resetBoostAnim()
    useAppStore.getState().clearBoost()
  }, [model])

  const setProgress = useCallback((p: number) => setProgressDirect(p), [])

  const explodeAll = useCallback(() => tweenTo(1, 1.6, 'explode'), [])
  const restoreAll = useCallback(() => tweenTo(0, 1.6, 'restore'), [])

  const play = useCallback((dir: 'explode' | 'restore') => {
    const st = useAppStore.getState()
    // 已在播放同一方向时再次点击 = 停止
    if (st.autoDir === dir) {
      killProgressTween()
      return
    }
    autoPlay(dir)
  }, [])

  const togglePause = useCallback(() => {
    pauseProgressTween(!useAppStore.getState().paused)
  }, [])

  const setLevel = useCallback((level: 1 | 2 | 3 | 4) => {
    tweenTo(LEVEL_BANDS[level][1], 1.8, 'explode')
  }, [])

  const setSpeed = useCallback((s: number) => applySpeed(s), [])

  const setPartExploded = useCallback((id: string, on: boolean) => {
    animateBoost(id, on)
    useAppStore.getState().setBoost(id, on ? 1 : 0)
  }, [])

  const togglePart = useCallback((id: string) => {
    const cur = boostOf(id) || (useAppStore.getState().boost[id] ?? 0)
    setPartExploded(id, cur < 0.5)
  }, [setPartExploded])

  return {
    setProgress,
    explodeAll,
    restoreAll,
    play,
    togglePause,
    setLevel,
    setSpeed,
    setPartExploded,
    togglePart,
    paused,
    autoDir,
  }
}

import gsap from 'gsap'
import { useAppStore } from '../../store/useAppStore'

/**
 * 低帧率设备上禁用 GSAP 卡顿平滑：
 * 默认 lagSmoothing 会把超过 500ms 的帧间隔压到 33ms，
 * 软件渲染 / 低端机（1~10 FPS）下动画会拖成数十秒，这里改为按真实时间推进。
 */
gsap.ticker.lagSmoothing(0)

/**
 * 统一进度动画
 * 全局只有一个 0~1 的进度补间，所有零件按各自区段插值，
 * 因此反向播放天然成立（进度回退 = 动画倒放），不会产生跳变。
 */
let tween: gsap.core.Tween | null = null
const proxy = { p: 0 }

export function progressMeta() {
  return {
    tweening: tween !== null,
    timeScale: tween ? tween.timeScale() : 0,
    time: tween ? +tween.time().toFixed(3) : 0,
    duration: tween ? +tween.duration().toFixed(3) : 0,
  }
}

export function isTweening() {
  return tween !== null
}

export function killProgressTween() {
  if (tween) {
    tween.kill()
    tween = null
  }
  if (useAppStore.getState().autoDir !== null) useAppStore.getState().setAutoDir(null)
}

/**
 * 补间到目标进度
 * @param target 目标进度 0~1
 * @param baseDuration 走完整 0~1 所需的基准秒数（按实际跨度缩放）
 * @param dir 播放方向标记（用于 UI）
 */
export function tweenTo(target: number, baseDuration: number, dir: 'explode' | 'restore') {
  const st = useAppStore.getState()
  killProgressTween()
  const span = Math.abs(target - st.progress)
  if (span < 0.002) {
    st.setProgress(target)
    return
  }
  proxy.p = st.progress
  st.setAutoDir(dir)
  if (st.paused) st.setPaused(false)
  tween = gsap.to(proxy, {
    p: target,
    duration: Math.max(0.12, baseDuration * span),
    ease: 'none',
    onUpdate: () => useAppStore.getState().setProgress(proxy.p),
    onComplete: () => {
      tween = null
      useAppStore.getState().setAutoDir(null)
      useAppStore.getState().setProgress(target)
    },
  })
  tween.timeScale(st.speed)
}

/** 拖动滑块：立即生效并中断补间 */
export function setProgressDirect(p: number) {
  killProgressTween()
  useAppStore.getState().setProgress(p)
}

export function applySpeed(speed: number) {
  useAppStore.getState().setSpeed(speed)
  if (tween) tween.timeScale(speed)
}

export function pauseProgressTween(paused: boolean) {
  useAppStore.getState().setPaused(paused)
  if (!tween) return
  if (paused) tween.pause()
  else tween.resume()
}

/** 自动播放：0→1 或 1→0 的完整拆解演示 */
export function autoPlay(dir: 'explode' | 'restore') {
  tweenTo(dir === 'explode' ? 1 : 0, 6.2, dir)
}

import { Boxes, Pause, Play, RotateCcw, RotateCw, Timer } from 'lucide-react'
import { useAppStore, useExplodeProgress } from '../../store/useAppStore'
import { LEVEL_BANDS } from '../../data/motion'
import { cn } from '../../utils/cn'
import { useExplodeActions } from '../../hooks/useExplodeActions'
import { Led } from '../ui/Button'

const LEVELS = [
  { level: 1 as const, label: 'L1', name: '外部附件', at: LEVEL_BANDS[1][1] },
  { level: 2 as const, label: 'L2', name: '外部机身', at: LEVEL_BANDS[2][1] },
  { level: 3 as const, label: 'L3', name: '内部组件', at: LEVEL_BANDS[3][1] },
  { level: 4 as const, label: 'L4', name: '精密组件', at: LEVEL_BANDS[4][1] },
]

const SPEEDS = [0.5, 1, 2, 3]

export function BottomBar({
  layout,
}: {
  layout: { width: number; bottomH: number; short: boolean }
}) {
  const paused = useAppStore((s) => s.paused)
  const autoDir = useAppStore((s) => s.autoDir)
  const speed = useAppStore((s) => s.speed)
  const autoRotate = useAppStore((s) => s.autoRotate)
  const setAutoRotate = useAppStore((s) => s.setAutoRotate)
  const { progress, percent, done, total, hiddenCount } = useExplodeProgress()
  const { setProgress, play, togglePause, restoreAll, setLevel, setSpeed } = useExplodeActions()

  const compact = layout.width < 1280
  const narrow = layout.width < 1440
  const activeLevel = progress >= LEVEL_BANDS[4][1] ? 4 : progress >= LEVEL_BANDS[3][1] ? 3 : progress >= LEVEL_BANDS[2][1] ? 2 : 1

  return (
    <footer
      data-testid="bottom-bar"
      className="relative z-20 flex shrink-0 items-center gap-3 border-t border-line bg-ink-900 px-3.5"
      style={{ height: layout.bottomH }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-accent/15 via-accent/35 to-transparent" />

      {/* ── 拆解进度滑块 ── */}
      <div className="flex min-w-[200px] flex-1 items-center gap-2.5">
        <span className="hidden shrink-0 text-[10px] tracking-[0.14em] text-steel-400/85 lg:block">
          拆解进度
        </span>

        <div className="relative flex h-[30px] min-w-0 flex-1 flex-col justify-center">
          {/* 轨道 */}
          <div className="pointer-events-none relative h-[6px] w-full bg-[#3A4553] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div
              className="h-full bg-gradient-to-r from-accent-dim via-accent to-accent-soft shadow-[0_0_12px_rgba(0,200,255,0.5)] transition-[width] duration-75"
              style={{ width: `${percent}%` }}
            />
            {/* 分级刻线（可点击跳转） */}
            {LEVELS.map((l) => (
              <button
                key={l.level}
                type="button"
                tabIndex={-1}
                onClick={() => setLevel(l.level)}
                title={`跳转到 ${l.label} ${l.name}（${Math.round(l.at * 100)}%）`}
                aria-label={`跳转到 ${l.label} ${l.name}`}
                data-testid={`band-${l.level}`}
                className="pointer-events-auto absolute top-[-3px] h-[12px] w-[11px] -translate-x-1/2 cursor-pointer"
                style={{ left: `${l.at * 100}%` }}
              >
                <span
                  className={cn(
                    'absolute left-1/2 top-0 h-[12px] w-px -translate-x-1/2 transition-colors',
                    progress >= l.at - 0.004
                      ? 'bg-accent/70'
                      : 'bg-steel-400/40 hover:bg-accent'
                  )}
                />
              </button>
            ))}
          </div>

          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(progress * 100)}
            onChange={(e) => setProgress(Number(e.target.value) / 100)}
            aria-label="拆解进度"
            data-testid="progress-slider"
            className="range-progress absolute inset-x-0 top-1/2 -translate-y-1/2"
          />

          {/* 刻度标签 */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between font-mono text-[7.5px] tracking-[0.1em] text-steel-400/35">
            <span>0</span>
            {!narrow && <span>25</span>}
            <span>50</span>
            {!narrow && <span>75</span>}
            <span>100 %</span>
          </div>
        </div>

        <div className="flex w-[50px] shrink-0 items-baseline justify-end gap-0.5">
          <span
            className={cn(
              'font-mono text-[16px] leading-none tabular-nums transition-colors',
              percent > 0 ? 'text-accent' : 'text-steel-300'
            )}
            data-testid="progress-value"
          >
            {String(percent).padStart(3, '0')}
          </span>
          <span className="text-[9px] text-steel-400/60">%</span>
        </div>

        <span
          className="hidden shrink-0 rounded-[2px] border border-accent/30 bg-accent/[0.07] px-1.5 py-[2px] font-mono text-[8.5px] tracking-[0.1em] text-accent/85 xl:block"
          title={`当前拆解层级 L${activeLevel}`}
        >
          L{activeLevel}
        </span>
      </div>

      <div className="h-7 w-px shrink-0 bg-line" />

      {/* ── 播放 / 暂停 / 复原 ── */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          data-testid="btn-play"
          onClick={() => play('explode')}
          title="播放拆解动画到 100%"
          aria-pressed={autoDir === 'explode'}
          className={cn(
            'flex h-[30px] items-center gap-1.5 rounded-[2px] border px-2.5 text-[11.5px] font-medium transition-colors',
            autoDir === 'explode'
              ? 'border-accent/60 bg-accent/[0.14] text-accent'
              : 'border-line/80 bg-ink-850/70 text-steel-300 hover:border-accent/45 hover:text-accent-soft'
          )}
        >
          <Play size={11} fill={autoDir === 'explode' ? 'currentColor' : 'none'} />
          <span className={compact ? 'hidden' : ''}>播放</span>
        </button>

        <button
          type="button"
          data-testid="btn-pause"
          onClick={togglePause}
          title="暂停 / 继续拆解动画（空格）"
          aria-pressed={paused}
          className={cn(
            'flex h-[30px] items-center gap-1.5 rounded-[2px] border px-2.5 text-[11.5px] font-medium transition-colors',
            paused
              ? 'border-warn/55 bg-warn/[0.1] text-warn'
              : 'border-line/80 bg-ink-850/70 text-steel-300 hover:border-warn/45 hover:text-warn'
          )}
        >
          {paused ? <Play size={11} /> : <Pause size={11} />}
          <span className={compact ? 'hidden' : ''}>{paused ? '继续' : '暂停'}</span>
        </button>

        <button
          type="button"
          data-testid="btn-restore"
          onClick={restoreAll}
          title="复原到装配状态"
          className="flex h-[30px] items-center gap-1.5 rounded-[2px] border border-line/80 bg-ink-850/70 px-2.5 text-[11.5px] font-medium text-steel-300 transition-colors hover:border-accent/45 hover:text-accent-soft"
        >
          <RotateCcw size={11} />
          <span className={compact ? 'hidden' : ''}>复原</span>
        </button>
      </div>

      <div className="hidden h-7 w-px shrink-0 bg-line md:block" />

      {/* ── 拆解速度 ── */}
      <div className="hidden shrink-0 items-center gap-1 md:flex">
        <span className="mr-0.5 hidden items-center gap-1 text-[10px] tracking-[0.12em] text-steel-400/80 xl:flex">
          <Timer size={10} /> 速度
        </span>
        <div className="flex items-center border border-line/80 bg-ink-850/60 p-[2px]">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              data-testid={`speed-${s}`}
              onClick={() => setSpeed(s)}
              aria-pressed={Math.abs(speed - s) < 0.01}
              className={cn(
                'px-1.5 py-[3px] font-mono text-[9.5px] leading-none transition-colors',
                Math.abs(speed - s) < 0.01
                  ? 'bg-accent/[0.16] text-accent'
                  : 'text-steel-400/75 hover:bg-white/[0.05] hover:text-steel-200'
              )}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      <div className="hidden h-7 w-px shrink-0 bg-line md:block" />

      {/* ── 自动旋转 ── */}
      <button
        type="button"
        data-testid="btn-autorotate"
        onClick={() => setAutoRotate(!autoRotate)}
        aria-pressed={autoRotate}
        title="自动旋转模型"
        className={cn(
          'flex h-[30px] shrink-0 items-center gap-1.5 rounded-[2px] border px-2.5 text-[11.5px] font-medium transition-colors',
          autoRotate
            ? 'border-accent/55 bg-accent/[0.1] text-accent'
            : 'border-line/80 bg-ink-850/70 text-steel-300 hover:border-accent/45 hover:text-accent-soft'
        )}
      >
        <RotateCw size={11} className={autoRotate ? 'animate-[spin_6s_linear_infinite]' : ''} />
        <span className={compact ? 'hidden' : ''}>自动旋转</span>
        <Led tone={autoRotate ? 'accent' : 'off'} pulse={autoRotate} />
      </button>

      {/* ── 统计 ── */}
      <div className="ml-0.5 hidden shrink-0 items-center gap-2.5 border-l border-line pl-2.5 font-mono text-[8.5px] tracking-[0.08em] text-steel-400/60 lg:flex">
        <span className="flex items-center gap-1">
          <Boxes size={9} className="text-accent/60" />
          已展开 <span className="text-accent/90">{done}</span>/{total}
        </span>
        {hiddenCount > 0 && <span className="text-warn/85">隐藏 {hiddenCount}</span>}
      </div>
    </footer>
  )
}

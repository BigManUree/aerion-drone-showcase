import { Eye, Pause, Play, RotateCcw, Settings2, Wind, X } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { Toggle } from '../ui/Button'
import { BG_OPTIONS } from '../../three/scene/themes'
import { cn } from '../../utils/cn'

export function SettingsPanel({ top }: { top: number }) {
  const open = useAppStore((s) => s.settingsOpen)
  const setOpen = useAppStore((s) => s.setSettingsOpen)
  const autoRotate = useAppStore((s) => s.autoRotate)
  const setAutoRotate = useAppStore((s) => s.setAutoRotate)
  const spinProps = useAppStore((s) => s.spinProps)
  const setSpinProps = useAppStore((s) => s.setSpinProps)
  const contactShadows = useAppStore((s) => s.contactShadows)
  const setContactShadows = useAppStore((s) => s.setContactShadows)
  const grid = useAppStore((s) => s.grid)
  const setGrid = useAppStore((s) => s.setGrid)
  const axes = useAppStore((s) => s.axes)
  const setAxes = useAppStore((s) => s.setAxes)
  const annotations = useAppStore((s) => s.annotations)
  const setAnnotations = useAppStore((s) => s.setAnnotations)
  const bg = useAppStore((s) => s.bg)
  const setBg = useAppStore((s) => s.setBg)
  const distance = useAppStore((s) => s.distance)
  const setDistance = useAppStore((s) => s.setDistance)
  const progress = useAppStore((s) => s.progress)
  const speed = useAppStore((s) => s.speed)
  const paused = useAppStore((s) => s.paused)
  const setPaused = useAppStore((s) => s.setPaused)
  const resetCamera = useAppStore((s) => s.resetCamera)
  const showAll = useAppStore((s) => s.showAll)

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
      <aside
        data-testid="settings-panel"
        className="fixed right-2.5 z-40 w-[276px] animate-fade-in overflow-hidden rounded-[3px] border border-line bg-ink-900/95 shadow-panel backdrop-blur-2xl"
        style={{ top: top + 4 }}
      >
        <div className="flex items-center justify-between border-b border-line px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Settings2 size={12} className="text-accent/80" />
            <span className="text-[11px] font-medium tracking-[0.08em] text-steel-200">渲染设置</span>
            <span className="font-mono text-[8px] tracking-[0.16em] text-steel-400/45">SETTINGS</span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded p-[3px] text-steel-400/70 hover:bg-white/5 hover:text-steel-200"
            aria-label="关闭设置"
          >
            <X size={12} />
          </button>
        </div>

        <div className="thin-scroll max-h-[min(560px,calc(100vh-140px))] overflow-y-auto p-2.5">
          <div className="mb-1.5 font-mono text-[8px] uppercase tracking-[0.18em] text-steel-400/50">
            场景
          </div>
          <div className="space-y-1.5">
            <Toggle compact checked={grid} onChange={setGrid} label="结构网格" desc="地面参考网格" />
            <Toggle compact checked={axes} onChange={setAxes} label="坐标辅助线" desc="世界坐标轴 XYZ" />
            <Toggle
              compact
              checked={annotations}
              onChange={setAnnotations}
              label="结构标注"
              desc="分类代表零件引出线"
            />
            <Toggle
              compact
              checked={autoRotate}
              onChange={setAutoRotate}
              label="自动旋转"
              desc="相机缓慢环绕模型"
            />
          </div>

          <div className="mb-1.5 mt-3 font-mono text-[8px] uppercase tracking-[0.18em] text-steel-400/50">
            背景
          </div>
          <div className="grid grid-cols-3 gap-1">
            {BG_OPTIONS.map((b) => (
              <button
                key={b.key}
                type="button"
                onClick={() => setBg(b.key)}
                aria-pressed={bg === b.key}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-[2px] border px-1 py-1.5 transition-colors',
                  bg === b.key
                    ? 'border-accent/55 bg-accent/[0.08] text-accent'
                    : 'border-line/70 text-steel-400 hover:border-line-strong'
                )}
              >
                <span
                  className="h-4 w-full rounded-[1px] border border-line-strong"
                  style={{ background: b.swatch }}
                />
                <span className="text-[9.5px]">{b.label}</span>
              </button>
            ))}
          </div>

          <div className="mb-1.5 mt-3 font-mono text-[8px] uppercase tracking-[0.18em] text-steel-400/50">
            渲染
          </div>
          <div className="space-y-1.5">
            <Toggle compact checked={spinProps} onChange={setSpinProps} label="螺旋桨旋转" desc="仅无人机模型" />
            <Toggle
              compact
              checked={contactShadows}
              onChange={setContactShadows}
              label="实时接触阴影"
              desc="关闭可提升低端设备帧率"
            />
          </div>

          <div className="mb-1.5 mt-3 font-mono text-[8px] uppercase tracking-[0.18em] text-steel-400/50">
            姿态
          </div>
          <div className="rounded-[2px] border border-line/70 bg-ink-850/40 px-2.5 py-2">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] text-steel-300">拆解距离系数</span>
              <span className="font-mono text-[10px] text-accent/85">×{distance.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.35}
              max={2}
              step={0.01}
              value={distance}
              onChange={(e) => setDistance(Number(e.target.value))}
              aria-label="拆解距离"
              className="range-tech mt-1 w-full"
            />
          </div>

          <div className="mt-2.5 rounded-[2px] border border-line/70 bg-ink-850/50 px-2.5 py-2">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] text-steel-300">拆解状态</span>
              <span className="font-mono text-[10px] text-accent/85">
                {Math.round(progress * 100)}% · {speed}×
              </span>
            </div>
            <div className="mt-1.5 h-[2px] overflow-hidden rounded-full bg-ink-700">
              <div
                className="h-full bg-gradient-to-r from-accent-dim to-accent"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>

          <div className="mt-1.5 flex gap-1.5">
            <button
              type="button"
              onClick={() => setPaused(!paused)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-[2px] border border-line/80 py-1.5 text-[10.5px] text-steel-300 transition-colors hover:border-accent/45 hover:text-accent"
            >
              {paused ? <Play size={10} /> : <Pause size={10} />}
              {paused ? '继续' : '暂停'}
            </button>
            <button
              type="button"
              onClick={showAll}
              title="显示全部隐藏零件"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-[2px] border border-line/80 py-1.5 text-[10.5px] text-steel-300 transition-colors hover:border-accent/45 hover:text-accent"
            >
              <Eye size={10} /> 全部显示
            </button>
            <button
              type="button"
              onClick={resetCamera}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-[2px] border border-line/80 py-1.5 text-[10.5px] text-steel-300 transition-colors hover:border-accent/45 hover:text-accent"
            >
              <RotateCcw size={10} /> 视角
            </button>
          </div>
        </div>

        <div className="border-t border-line px-3 py-2">
          <div className="mb-1 flex items-center gap-1 font-mono text-[8px] uppercase tracking-[0.18em] text-steel-400/45">
            <Wind size={8} /> Render Pipeline
          </div>
          <div className="space-y-[3px] font-mono text-[8.5px] leading-relaxed text-steel-400/55">
            <div className="flex justify-between">
              <span>Tone Mapping</span>
              <span className="text-accent/60">ACES Filmic</span>
            </div>
            <div className="flex justify-between">
              <span>Post FX</span>
              <span className="text-accent/60">Bloom · SMAA · Vignette</span>
            </div>
            <div className="flex justify-between">
              <span>Shadows</span>
              <span className="text-accent/60">PCF Soft 2048²</span>
            </div>
            <div className="flex justify-between">
              <span>Environment</span>
              <span className="text-accent/60">Studio IBL 256²</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

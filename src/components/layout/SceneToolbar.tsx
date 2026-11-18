import { useEffect, useRef, useState } from 'react'
import { Check, Grid3x3, Move3d, Palette, RotateCcw, Tags } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { BG_OPTIONS } from '../../three/scene/themes'
import { cn } from '../../utils/cn'

/** 视口内浮动工具条：网格 / 坐标轴 / 结构标注 / 背景 / 视角重置 */
function ToolBtn({
  active,
  onClick,
  title,
  children,
  testId,
}: {
  active?: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
  testId: string
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={cn(
        'flex h-[26px] items-center gap-1 rounded-[2px] px-1.5 text-[10px] transition-colors',
        active
          ? 'bg-accent/[0.13] text-accent shadow-[inset_0_0_0_1px_rgba(0,200,255,0.35)]'
          : 'text-steel-400 hover:bg-white/[0.05] hover:text-steel-200'
      )}
    >
      {children}
    </button>
  )
}

export function SceneToolbar({ compact }: { compact?: boolean }) {
  const grid = useAppStore((s) => s.grid)
  const setGrid = useAppStore((s) => s.setGrid)
  const axes = useAppStore((s) => s.axes)
  const setAxes = useAppStore((s) => s.setAxes)
  const annotations = useAppStore((s) => s.annotations)
  const setAnnotations = useAppStore((s) => s.setAnnotations)
  const bg = useAppStore((s) => s.bg)
  const setBg = useAppStore((s) => s.setBg)
  const resetCamera = useAppStore((s) => s.resetCamera)

  const [bgOpen, setBgOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!bgOpen) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setBgOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [bgOpen])

  const Btn = ToolBtn

  return (
    <div
      ref={ref}
      className="pointer-events-auto flex items-center gap-[3px] rounded-[3px] border border-line/90 bg-ink-900/85 p-[3px] backdrop-blur-md"
      data-testid="scene-toolbar"
    >
      <Btn active={grid} onClick={() => setGrid(!grid)} title="网格显示" testId="tool-grid">
        <Grid3x3 size={12} strokeWidth={1.9} />
        {!compact && <span className="hidden lg:block">网格</span>}
      </Btn>
      <Btn active={axes} onClick={() => setAxes(!axes)} title="坐标辅助线" testId="tool-axes">
        <Move3d size={12} strokeWidth={1.9} />
        {!compact && <span className="hidden lg:block">坐标轴</span>}
      </Btn>
      <Btn active={annotations} onClick={() => setAnnotations(!annotations)} title="结构标注" testId="tool-annotations">
        <Tags size={12} strokeWidth={1.9} />
        {!compact && <span className="hidden lg:block">标注</span>}
      </Btn>

      <span className="mx-[2px] h-4 w-px bg-line" />

      <div className="relative">
        <Btn active={bgOpen} onClick={() => setBgOpen((v) => !v)} title="背景切换" testId="tool-bg">
          <Palette size={12} strokeWidth={1.9} />
          <span
            className="h-[9px] w-[9px] rounded-[1px] border border-white/25"
            style={{ background: BG_OPTIONS.find((b) => b.key === bg)?.swatch }}
          />
          {!compact && <span className="hidden lg:block">背景</span>}
        </Btn>

        {bgOpen && (
          <div className="absolute right-0 top-[32px] w-[152px] animate-fade-in overflow-hidden rounded-[3px] border border-line bg-ink-900 shadow-panel">
            <div className="border-b border-line/70 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.18em] text-steel-400/60">
              Background
            </div>
            {BG_OPTIONS.map((b) => (
              <button
                key={b.key}
                type="button"
                data-testid={`bg-${b.key}`}
                onClick={() => {
                  setBg(b.key)
                  setBgOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-2 py-[6px] text-left text-[10.5px] transition-colors',
                  bg === b.key ? 'bg-accent/[0.09] text-accent' : 'text-steel-300 hover:bg-white/[0.04]'
                )}
              >
                <span
                  className="h-[12px] w-[12px] rounded-[1px] border border-line-strong"
                  style={{ background: b.swatch }}
                />
                <span className="flex-1">{b.label}</span>
                <span className="font-mono text-[7.5px] tracking-[0.1em] text-steel-400/50">{b.en}</span>
                {bg === b.key && <Check size={10} />}
              </button>
            ))}
          </div>
        )}
      </div>

      <span className="mx-[2px] h-4 w-px bg-line" />

      <Btn onClick={resetCamera} title="重置视角" testId="tool-reset">
        <RotateCcw size={12} strokeWidth={1.9} />
      </Btn>
    </div>
  )
}

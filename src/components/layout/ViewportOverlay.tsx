import { useEffect, useRef, useState } from 'react'
import { getPart, metaByModel, partsByModel } from '../../data'
import { useExplodeProgress } from '../../store/useAppStore'
import { useAppStore } from '../../store/useAppStore'
import { SceneToolbar } from './SceneToolbar'
import { BG_OPTIONS, VIEW_OPTIONS } from '../../three/scene/themes'

function FpsMeter() {
  const [fps, setFps] = useState(60)
  const frames = useRef(0)
  const last = useRef(performance.now())

  useEffect(() => {
    let raf = 0
    const tick = () => {
      frames.current++
      const now = performance.now()
      if (now - last.current >= 500) {
        setFps(Math.round((frames.current * 1000) / (now - last.current)))
        frames.current = 0
        last.current = now
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <span className="font-mono text-[9px] tabular-nums text-steel-400/60" data-testid="fps">
      {fps} FPS
    </span>
  )
}

export function ViewportOverlay({ compact }: { compact?: boolean }) {
  const model = useAppStore((s) => s.model)
  const meta = metaByModel[model]
  const hoveredId = useAppStore((s) => s.hoveredId)
  const selectedId = useAppStore((s) => s.selectedId)
  const viewMode = useAppStore((s) => s.viewMode)
  const bg = useAppStore((s) => s.bg)
  const axes = useAppStore((s) => s.axes)
  const grid = useAppStore((s) => s.grid)
  const { percent, total, hiddenCount } = useExplodeProgress()
  const part = getPart(hoveredId)
  const totalAll = partsByModel[model].length
  const [pos, setPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const onMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const viewLabel = VIEW_OPTIONS.find((v) => v.key === viewMode)
  const bgLabel = BG_OPTIONS.find((b) => b.key === bg)

  return (
    <div className="pointer-events-none absolute inset-0 z-10 select-none">
      {/* ── 左上：模型标识 ── */}
      <div className="absolute left-3.5 top-3">
        <div className="flex items-center gap-1.5">
          <span className="rounded-[2px] border border-accent/35 bg-accent/[0.08] px-1 py-[1px] font-mono text-[8px] tracking-[0.16em] text-accent/90">
            {model === 'drone' ? 'UAV' : 'RC'}
          </span>
          <span className="font-mono text-[8px] tracking-[0.18em] text-steel-400/55">
            {compact ? 'VIEW' : 'ASSEMBLY VIEWPORT'}
          </span>
        </div>
        <div className="mt-1 text-[12.5px] font-medium tracking-[0.04em] text-steel-200/95 text-shadow-soft">
          {meta.name}
        </div>
        <div className="mt-1 flex items-center gap-2 font-mono text-[8.5px] tracking-[0.1em] text-steel-400/55">
          <span>{totalAll} PARTS</span>
          <span className="h-2 w-px bg-line" />
          <span className={percent > 0 ? 'text-accent/85' : ''}>{percent}% EXPLODED</span>
          {hiddenCount > 0 && (
            <>
              <span className="h-2 w-px bg-line" />
              <span className="text-warn/85">{hiddenCount} HIDDEN</span>
            </>
          )}
        </div>
      </div>

      {/* ── 右上：场景工具条 ── */}
      <div className="pointer-events-auto absolute right-3.5 top-3">
        <SceneToolbar compact={compact} />
      </div>

      {/* ── 左下：坐标指示 ── */}
      {axes && (
        <div className="absolute bottom-3 left-3.5 flex items-end gap-2" data-testid="axis-gizmo">
          <div className="relative h-12 w-12">
            <svg viewBox="0 0 48 48" className="h-full w-full">
              <line x1="24" y1="34" x2="42" y2="41" stroke="#FF6B7A" strokeWidth="1.2" />
              <line x1="24" y1="34" x2="24" y2="12" stroke="#33D69F" strokeWidth="1.2" />
              <line x1="24" y1="34" x2="7" y2="42" stroke="#4FA8FF" strokeWidth="1.2" />
              <circle cx="24" cy="34" r="1.6" fill="#E8EDF4" />
              <text x="43" y="45" fontSize="7" fill="#FF6B7A" fontFamily="monospace">X</text>
              <text x="21" y="9" fontSize="7" fill="#33D69F" fontFamily="monospace">Y</text>
              <text x="1" y="46" fontSize="7" fill="#4FA8FF" fontFamily="monospace">Z</text>
            </svg>
          </div>
          <div className="mb-1 space-y-[2px] font-mono text-[7.5px] leading-none tracking-[0.1em] text-steel-400/40">
            <div>WORLD</div>
            <div className="text-accent/50">ORIGIN 0,0,0</div>
          </div>
        </div>
      )}

      {/* ── 底部提示 ── */}
      {!compact && (
        <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-2.5 rounded-[2px] border border-line/70 bg-ink-950/70 px-3 py-1 backdrop-blur-sm">
            <span className="text-[9.5px] tracking-wide text-steel-400/70">拖拽旋转</span>
            <span className="h-2.5 w-px bg-line" />
            <span className="text-[9.5px] tracking-wide text-steel-400/70">滚轮缩放</span>
            <span className="h-2.5 w-px bg-line" />
            <span className="text-[9.5px] tracking-wide text-steel-400/70">右键平移</span>
            <span className="h-2.5 w-px bg-line" />
            <span className="text-[9.5px] tracking-wide text-accent/75">单击零件选中</span>
          </div>
        </div>
      )}

      {/* ── 右下：渲染状态 ── */}
      <div className="absolute bottom-3.5 right-3.5 flex items-center gap-2 rounded-[2px] border border-line/60 bg-ink-950/60 px-2 py-1 backdrop-blur-sm">
        <span className="font-mono text-[8px] tracking-[0.12em] text-steel-400/50">{viewLabel?.en}</span>
        <span className="h-2 w-px bg-line" />
        <span className="font-mono text-[8px] tracking-[0.12em] text-steel-400/50">
          {bgLabel?.en}
          {grid ? ' · GRID' : ''}
        </span>
        <span className="h-2 w-px bg-line" />
        <span className="h-[5px] w-[5px] animate-pulse-soft rounded-full bg-accent/80" />
        <FpsMeter />
      </div>

      {/* ── 悬停标签 ── */}
      {part && hoveredId !== selectedId && (
        <div className="fixed z-20 -translate-y-1/2 translate-x-4" style={{ left: pos.x, top: pos.y }}>
          <div className="whitespace-nowrap rounded-[2px] border border-accent/40 bg-ink-950/95 px-2 py-1 shadow-panel backdrop-blur">
            <div className="text-[11px] font-medium text-accent-soft">{part.name}</div>
            <div className="mt-[2px] flex items-center gap-1.5 font-mono text-[8px] tracking-[0.12em] text-steel-400/60">
              <span className="text-accent/60">{part.code}</span>
              <span className="h-2 w-px bg-line" />
              <span>{part.category}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

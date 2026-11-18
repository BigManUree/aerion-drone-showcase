import { Boxes, EyeOff, X } from 'lucide-react'
import { PartTree } from '../panels/PartTree'
import { useAppStore, useExplodeProgress } from '../../store/useAppStore'

export function LeftPanel({
  width,
  drawer,
  onClose,
}: {
  width: number
  drawer?: boolean
  onClose?: () => void
}) {
  const { done, total, hiddenCount } = useExplodeProgress()
  const model = useAppStore((s) => s.model)

  return (
    <aside
      data-testid="left-panel"
      className={
        drawer
          ? 'panel-surface absolute left-0 top-0 z-40 flex h-full flex-col border-r border-line shadow-panel animate-slide-left'
          : 'panel-surface relative z-20 flex shrink-0 flex-col border-r border-line'
      }
      style={{ width }}
    >
      <div className="flex h-[36px] shrink-0 items-center justify-between border-b border-line/80 px-2.5">
        <div className="flex items-center gap-1.5">
          <Boxes size={12} className="text-accent/80" />
          <span className="text-[11px] font-medium tracking-[0.1em] text-steel-200">零件树</span>
          <span className="font-mono text-[8px] tracking-[0.16em] text-steel-400/50">PARTS</span>
        </div>
        <div className="flex items-center gap-1.5">
          {hiddenCount > 0 && (
            <span className="flex items-center gap-1 font-mono text-[8.5px] text-warn/85">
              <EyeOff size={9} />
              {hiddenCount}
            </span>
          )}
          <span className="font-mono text-[9px] tabular-nums text-steel-400/70">
            <span className={done > 0 ? 'text-accent' : ''}>{String(done).padStart(2, '0')}</span>
            <span className="text-steel-400/40"> / {total}</span>
          </span>
          {drawer && (
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭零件树"
              className="ml-0.5 rounded p-[2px] text-steel-400/70 hover:bg-white/5 hover:text-steel-200"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="h-[2px] shrink-0 bg-ink-850">
        <div
          className="h-full bg-accent/80 shadow-[0_0_8px_rgba(0,200,255,0.6)] transition-[width] duration-300"
          style={{ width: `${total ? (done / total) * 100 : 0}%` }}
        />
      </div>

      <div className="min-h-0 flex-1">
        <PartTree />
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-line/70 px-2.5 py-[5px] font-mono text-[8px] tracking-[0.14em] text-steel-400/40">
        <span>{model === 'drone' ? 'AIRFRAME / 8 CAT' : 'RC UNIT / 5 CAT'}</span>
        <span className="text-accent/45">CLICK ↦ SELECT</span>
      </div>
    </aside>
  )
}

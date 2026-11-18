import { ChevronRight, X } from 'lucide-react'
import { PartInfo } from '../panels/PartInfo'
import { useAppStore } from '../../store/useAppStore'
import { getPart } from '../../data'

export function RightPanel({
  width,
  drawer,
  onClose,
}: {
  width: number
  drawer?: boolean
  onClose?: () => void
}) {
  const selectedId = useAppStore((s) => s.selectedId)
  const part = getPart(selectedId)

  return (
    <aside
      data-testid="right-panel"
      className={
        drawer
          ? 'panel-surface absolute right-0 top-0 z-40 flex h-full flex-col border-l border-line shadow-panel animate-slide-right'
          : 'panel-surface relative z-20 flex shrink-0 flex-col border-l border-line'
      }
      style={{ width }}
    >
      <div className="flex h-[36px] shrink-0 items-center justify-between border-b border-line/80 px-2.5">
        <div className="flex min-w-0 items-center gap-1 text-[11px] font-medium tracking-[0.08em]">
          {part ? (
            <>
              <span className="shrink-0 text-steel-400/70">零件详情</span>
              <ChevronRight size={10} className="shrink-0 text-steel-400/40" />
              <span className="truncate text-accent">{part.name}</span>
            </>
          ) : (
            <span className="text-steel-200">产品信息</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="font-mono text-[8px] tracking-[0.16em] text-steel-400/45">INSPECTOR</span>
          {drawer && (
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭信息面板"
              className="ml-0.5 rounded p-[2px] text-steel-400/70 hover:bg-white/5 hover:text-steel-200"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <PartInfo />
      </div>
    </aside>
  )
}

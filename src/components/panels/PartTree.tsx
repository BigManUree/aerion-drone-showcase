import { useEffect, useMemo, useRef, useState } from 'react'
import { Boxes, Crosshair, ChevronDown, ChevronRight, Eye, EyeOff, Search, X } from 'lucide-react'
import { partProgress, useAppStore } from '../../store/useAppStore'
import { categoriesOf, partsOfCategory } from '../../data'
import { cn } from '../../utils/cn'
import { LevelBadge } from '../ui/Button'
import { useExplodeActions } from '../../hooks/useExplodeActions'

export function PartTree() {
  const model = useAppStore((s) => s.model)
  const selectedId = useAppStore((s) => s.selectedId)
  const progress = useAppStore((s) => s.progress)
  const boost = useAppStore((s) => s.boost)
  const hidden = useAppStore((s) => s.hidden)
  const select = useAppStore((s) => s.select)
  const hover = useAppStore((s) => s.hover)
  const hoveredId = useAppStore((s) => s.hoveredId)
  const toggleHidden = useAppStore((s) => s.toggleHidden)
  const setManyHidden = useAppStore((s) => s.setManyHidden)
  const showAll = useAppStore((s) => s.showAll)
  const focusPart = useAppStore((s) => s.focusPart)
  const { togglePart } = useExplodeActions()

  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const scrollRef = useRef<HTMLDivElement>(null)

  // 选中变化（含 3D 点击）时把对应行滚动到可视区域
  useEffect(() => {
    if (!selectedId) return
    const el = scrollRef.current?.querySelector<HTMLElement>(`[data-part="${selectedId}"]`)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedId])

  const cats = categoriesOf(model)
  const q = query.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (!q) return null
    const map = new Map<string, ReturnType<typeof partsOfCategory>>()
    for (const c of cats) {
      const list = partsOfCategory(model, c).filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.materials.join(' ').toLowerCase().includes(q)
      )
      if (list.length) map.set(c, list)
    }
    return map
  }, [q, model, cats])

  const total = cats.reduce((n, c) => n + partsOfCategory(model, c).length, 0)
  const shown = filtered ? [...filtered.values()].reduce((n, l) => n + l.length, 0) : total
  const hiddenCount = Object.keys(hidden).filter((id) => id.startsWith(model === 'drone' ? 'drone.' : 'ctrl.')).length
  const allCollapsed = cats.every((c) => collapsed[c])

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* 搜索 */}
      <div className="border-b border-line/70 px-2.5 py-2">
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-steel-400/70" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-testid="part-search"
            placeholder="搜索零件 / 编号 / 材质"
            aria-label="搜索零件"
            className="h-[30px] w-full rounded-[3px] border border-line/80 bg-ink-950/70 pl-7 pr-6 text-[11.5px] text-steel-200 placeholder:text-steel-400/45 focus:border-accent/50 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-[2px] text-steel-400/70 hover:text-steel-200"
              aria-label="清空搜索"
            >
              <X size={11} />
            </button>
          )}
        </div>
        <div className="mt-1.5 flex items-center justify-between font-mono text-[8.5px] tracking-[0.14em] text-steel-400/55">
          <span>
            RESULT <span className="text-accent/85">{String(shown).padStart(2, '0')}</span> / {total}
          </span>
          <button
            type="button"
            onClick={() => setCollapsed(allCollapsed ? {} : Object.fromEntries(cats.map((c) => [c, true])))}
            className="tracking-[0.14em] text-steel-400/60 transition-colors hover:text-accent"
            data-testid="collapse-all"
          >
            {allCollapsed ? '全部展开' : '全部折叠'}
          </button>
        </div>
      </div>

      {/* 可见性汇总 */}
      {hiddenCount > 0 && (
        <div className="flex items-center justify-between border-b border-line/70 bg-warn/[0.06] px-2.5 py-1.5">
          <span className="flex items-center gap-1.5 font-mono text-[9px] tracking-wider text-warn/90">
            <EyeOff size={10} /> 已隐藏 {hiddenCount} 个零件
          </span>
          <button
            type="button"
            onClick={showAll}
            data-testid="show-all-parts"
            className="font-mono text-[9px] tracking-wider text-accent/85 hover:text-accent"
          >
            全部显示
          </button>
        </div>
      )}

      {/* 树 */}
      <div ref={scrollRef} className="thin-scroll min-h-0 flex-1 overflow-y-auto px-1.5 py-1.5">
        {filtered && filtered.size === 0 && (
          <div className="px-3 py-10 text-center">
            <div className="font-mono text-[10px] tracking-widest text-steel-400/45">NO MATCH</div>
            <div className="mt-1.5 text-[11px] text-steel-400/60">未找到匹配零件</div>
          </div>
        )}

        {cats.map((cat, ci) => {
          const list = filtered ? filtered.get(cat) ?? [] : partsOfCategory(model, cat)
          if (!list.length) return null
          const isOpen = filtered ? true : !collapsed[cat]
          const visList = list.filter((p) => !hidden[p.id])
          const catAllHidden = visList.length === 0
          const doneCount = list.filter(
            (p) => !hidden[p.id] && Math.max(partProgress(model, p.id, progress), boost[p.id] ?? 0) > 0.5
          ).length

          return (
            <div key={cat} className="mb-0.5">
              {/* 分类行 */}
              <div className="group/cat flex items-center gap-1 rounded-[2px] px-1.5 py-[5px] transition-colors hover:bg-white/[0.03]">
                <button
                  type="button"
                  data-testid={`cat-${ci}`}
                  onClick={() => setCollapsed((s) => ({ ...s, [cat]: !s[cat] }))}
                  aria-expanded={isOpen}
                  className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                >
                  {isOpen ? (
                    <ChevronDown size={11} className="shrink-0 text-steel-400/70" />
                  ) : (
                    <ChevronRight size={11} className="shrink-0 text-steel-400/70" />
                  )}
                  <span
                    className={cn(
                      'truncate text-[11.5px] font-medium tracking-[0.02em]',
                      catAllHidden ? 'text-steel-400/50' : 'text-steel-300 group-hover/cat:text-steel-200'
                    )}
                  >
                    {cat}
                  </span>
                </button>

                <span
                  className={cn(
                    'shrink-0 font-mono text-[8.5px] tabular-nums tracking-wider',
                    doneCount > 0 ? 'text-accent/85' : 'text-steel-400/45'
                  )}
                  title="已展开 / 该分类零件数"
                >
                  {doneCount}/{list.length}
                </span>

                <button
                  type="button"
                  data-testid={`cat-vis-${ci}`}
                  onClick={() => setManyHidden(list.map((p) => p.id), !catAllHidden)}
                  title={catAllHidden ? '显示该分类全部零件' : '隐藏该分类全部零件'}
                  aria-label={catAllHidden ? '显示该分类' : '隐藏该分类'}
                  className={cn(
                    'grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[2px] border transition-colors',
                    catAllHidden
                      ? 'border-warn/40 bg-warn/10 text-warn/90'
                      : 'border-transparent text-steel-400/45 hover:border-line hover:bg-white/[0.04] hover:text-steel-200'
                  )}
                >
                  {catAllHidden ? <EyeOff size={10} /> : <Eye size={10} />}
                </button>
              </div>

              {/* 零件行 */}
              {isOpen && (
                <div className="ml-[9px] border-l border-line/60 pl-1">
                  {list.map((p) => {
                    const isSel = selectedId === p.id
                    const isHov = hoveredId === p.id
                    const isHid = !!hidden[p.id]
                    const isOut =
                      !isHid && Math.max(partProgress(model, p.id, progress), boost[p.id] ?? 0) > 0.5

                    return (
                      <div
                        key={p.id}
                        data-part={p.id}
                        data-testid={`part-row-${p.id}`}
                        onMouseEnter={() => !isHid && hover(p.id)}
                        onMouseLeave={() => hover(null)}
                        onClick={() => !isHid && select(p.id)}
                        className={cn(
                          'group/row relative flex cursor-pointer items-center gap-1 rounded-[2px] py-[4px] pl-1.5 pr-1 transition-colors',
                          isHid && 'cursor-default opacity-55',
                          isSel
                            ? 'bg-accent/[0.1] shadow-[inset_2px_0_0_0_#00C8FF]'
                            : isHov
                              ? 'bg-white/[0.045]'
                              : 'hover:bg-white/[0.028]'
                        )}
                      >
                        <span
                          className={cn(
                            'h-[4px] w-[4px] shrink-0 rounded-full transition-colors',
                            isHid
                              ? 'bg-steel-400/25'
                              : isOut
                                ? 'bg-accent shadow-[0_0_5px_rgba(0,200,255,0.9)]'
                                : 'bg-steel-400/35'
                          )}
                        />

                        <span className="min-w-0 flex-1 leading-none">
                          <span
                            className={cn(
                              'block truncate text-[11.5px] leading-[14px]',
                              isSel ? 'text-accent-soft' : isHid ? 'text-steel-400/70 line-through' : 'text-steel-300/90'
                            )}
                          >
                            {p.name}
                          </span>
                          <span className="mt-[3px] block truncate font-mono text-[8px] leading-[10px] tracking-[0.08em] text-steel-400/45">
                            {p.code}
                          </span>
                        </span>

                        {/* 层级徽标 ↔ 悬浮时替换为单件拆解 */}
                        <span className="relative grid h-[16px] w-[20px] shrink-0 place-items-center">
                          <LevelBadge level={p.level} className="transition-opacity group-hover/row:opacity-0" />
                          <button
                            type="button"
                            title={isOut ? '复原此零件' : '拆解此零件'}
                            aria-label={isOut ? '复原此零件' : '拆解此零件'}
                            onClick={(e) => {
                              e.stopPropagation()
                              togglePart(p.id)
                            }}
                            className={cn(
                              'absolute inset-0 grid place-items-center rounded-[2px] border opacity-0 transition-opacity group-hover/row:opacity-100',
                              isOut
                                ? 'border-accent/50 bg-accent/15 text-accent'
                                : 'border-line text-steel-400 hover:border-accent/45 hover:text-accent'
                            )}
                          >
                            <Boxes size={10} strokeWidth={1.9} />
                          </button>
                        </span>

                        {/* 可见性 */}
                        <button
                          type="button"
                          data-testid={`vis-${p.id}`}
                          aria-pressed={!isHid}
                          aria-label={isHid ? `显示 ${p.name}` : `隐藏 ${p.name}`}
                          title={isHid ? '显示零件' : '隐藏零件'}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleHidden(p.id)
                          }}
                          className={cn(
                            'grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[2px] border transition-colors',
                            isHid
                              ? 'border-warn/45 bg-warn/10 text-warn/90'
                              : 'border-transparent text-steel-400/60 hover:border-line hover:bg-white/[0.04] hover:text-accent'
                          )}
                        >
                          {isHid ? <EyeOff size={10.5} /> : <Eye size={10.5} />}
                        </button>

                        {/* 定位 */}
                        <button
                          type="button"
                          data-testid={`focus-${p.id}`}
                          title="相机定位到该零件"
                          aria-label="相机定位到该零件"
                          onClick={(e) => {
                            e.stopPropagation()
                            focusPart(p.id)
                          }}
                          className="grid h-[18px] w-[16px] shrink-0 place-items-center rounded-[2px] text-steel-400/0 transition-colors hover:text-accent group-hover/row:text-steel-400/55"
                        >
                          <Crosshair size={10.5} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 图例 */}
      <div className="flex items-center justify-between border-t border-line/70 px-2.5 py-1.5 font-mono text-[8px] tracking-[0.12em] text-steel-400/45">
        <span className="flex items-center gap-1">
          <Eye size={9} /> 可见性
        </span>
        <span className="flex items-center gap-1">
          <Boxes size={9} /> 单件拆解
        </span>
        <span className="flex items-center gap-1">
          <Crosshair size={9} /> 定位
        </span>
      </div>
    </div>
  )
}

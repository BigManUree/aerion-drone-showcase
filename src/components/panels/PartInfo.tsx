import { ArrowUpRight, Boxes, Crosshair, Eye, EyeOff, Ruler, Undo2 } from 'lucide-react'
import { getPart, metaByModel, partsByModel, motionById, categoriesOf } from '../../data'
import { partProgress, useAppStore } from '../../store/useAppStore'
import { LEVEL_META } from '../../data/motion'
import { cn } from '../../utils/cn'
import { LevelBadge, SectionLabel, TextButton } from '../ui/Button'
import { useExplodeActions } from '../../hooks/useExplodeActions'
import { partRegistry } from '../../three/core/PartRegistry'

/** 规格行：标签 + 值，工业台账式 */
function Field({ label, en, children }: { label: string; en?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line/45 py-[7px] last:border-b-0">
      <span className="shrink-0 pt-[1px] text-[10.5px] leading-[15px] text-steel-400/80">
        {label}
        {en && <span className="ml-1 font-mono text-[8px] tracking-[0.1em] text-steel-400/40">{en}</span>}
      </span>
      <span className="min-w-0 text-right text-[11.5px] leading-[15px] text-steel-200/95">{children}</span>
    </div>
  )
}

function Overview() {
  const model = useAppStore((s) => s.model)
  const meta = metaByModel[model]
  const progress = useAppStore((s) => s.progress)
  const hidden = useAppStore((s) => s.hidden)
  const total = partsByModel[model].length
  const cats = categoriesOf(model)
  const hiddenCount = partsByModel[model].filter((p) => hidden[p.id]).length
  let done = 0
  for (const p of partsByModel[model]) if (!hidden[p.id] && partProgress(model, p.id, progress) > 0.5) done++

  return (
    <div className="thin-scroll h-full overflow-y-auto">
      <div className="border-b border-line/60 px-3.5 pb-3.5 pt-3.5">
        <div className="font-mono text-[8.5px] tracking-[0.2em] text-accent/70">PRODUCT OVERVIEW</div>
        <h2 className="mt-1.5 text-[16px] font-semibold tracking-[0.02em] text-steel-200">{meta.name}</h2>
        <div className="mt-1 font-mono text-[9px] tracking-[0.12em] text-steel-400/60">{meta.code}</div>
        <p className="mt-2 text-[11px] leading-relaxed text-accent/75">{meta.tagline}</p>
        <p className="mt-2 text-[11px] leading-[1.7] text-steel-400/85">{meta.description}</p>
      </div>

      <SectionLabel right={<span className="font-mono text-[8.5px] text-steel-400/45">SPEC</span>}>
        技术规格
      </SectionLabel>
      <div className="grid grid-cols-2 gap-1 px-3">
        {meta.specs.map((s) => (
          <div key={s.label} className="rounded-[2px] border border-line/70 bg-ink-850/50 px-2 py-1.5">
            <div className="text-[9.5px] tracking-wide text-steel-400/70">{s.label}</div>
            <div className="mt-0.5 font-mono text-[11.5px] text-steel-200">{s.value}</div>
          </div>
        ))}
      </div>

      <SectionLabel>拆解状态</SectionLabel>
      <div className="px-3">
        <div className="rounded-[2px] border border-line/70 bg-ink-850/50 p-2.5">
          <div className="flex items-end justify-between">
            <span className="text-[10.5px] text-steel-400/80">已拆解 / 可见零件</span>
            <span className="font-mono text-[14px] leading-none text-accent tnum">
              {String(done).padStart(2, '0')}
              <span className="text-[10px] text-steel-400/50"> / {total - hiddenCount}</span>
            </span>
          </div>
          <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-ink-700">
            <div
              className="h-full bg-gradient-to-r from-accent-dim to-accent transition-[width] duration-500"
              style={{ width: `${total ? (done / total) * 100 : 0}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between font-mono text-[8.5px] tracking-wider text-steel-400/50">
            <span>{cats.length} CATEGORIES</span>
            <span className={hiddenCount ? 'text-warn/80' : ''}>{hiddenCount} HIDDEN</span>
          </div>
        </div>
      </div>

      <SectionLabel>操作提示</SectionLabel>
      <div className="space-y-1 px-3 pb-5">
        {[
          ['左键拖拽', '旋转视角'],
          ['滚轮', '缩放推拉'],
          ['右键拖拽', '平移视图'],
          ['单击零件', '选中并同步零件树'],
          ['双击零件', '相机聚焦'],
          ['H / A / G', '隐藏 · 标注 · 网格'],
        ].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between rounded-[2px] bg-ink-850/40 px-2 py-1">
            <span className="font-mono text-[9px] tracking-wider text-steel-400/70">{k}</span>
            <span className="text-[10.5px] text-steel-300/85">{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Detail({ id }: { id: string }) {
  const part = getPart(id)!
  const model = useAppStore((s) => s.model)
  const progress = useAppStore((s) => s.progress)
  const boost = useAppStore((s) => s.boost[id] ?? 0)
  const isHidden = useAppStore((s) => !!s.hidden[id])
  const distance = useAppStore((s) => s.distance)
  const toggleHidden = useAppStore((s) => s.toggleHidden)
  const focusPart = useAppStore((s) => s.focusPart)
  const select = useAppStore((s) => s.select)
  const t = Math.max(partProgress(model, id, progress), boost)
  const exploded = t > 0.5
  const motion = motionById[id]
  const levelMeta = LEVEL_META.find((l) => l.level === part.level)
  const originalPos = partRegistry.originalPosition(part.id)
  const { setPartExploded } = useExplodeActions()

  const state = isHidden ? 'hidden' : exploded ? 'exploded' : 'assembled'
  const stateMeta =
    state === 'hidden'
      ? { label: '已隐藏', en: 'HIDDEN', cls: 'border-warn/45 bg-warn/[0.08]', dot: 'bg-warn', text: 'text-warn' }
      : state === 'exploded'
        ? { label: '已拆解', en: 'DETACHED', cls: 'border-accent/45 bg-accent/[0.07]', dot: 'bg-accent', text: 'text-accent' }
        : { label: '已装配', en: 'ASSEMBLED', cls: 'border-ok/40 bg-ok/[0.06]', dot: 'bg-ok', text: 'text-ok' }

  return (
    <div className="thin-scroll flex h-full flex-col overflow-y-auto">
      {/* 标题区 */}
      <div className="border-b border-line/60 px-3.5 pb-3 pt-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-[2px] border border-accent/30 bg-accent/[0.07] px-1.5 py-[1px] text-[9px] tracking-wider text-accent/90">
              {part.category}
            </span>
            <LevelBadge level={part.level} />
          </div>
          <button
            type="button"
            onClick={() => select(null)}
            className="shrink-0 rounded p-1 text-steel-400/60 transition-colors hover:bg-white/5 hover:text-steel-200"
            title="关闭详情"
            aria-label="关闭详情"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 2l8 8M10 2l-8 8" />
            </svg>
          </button>
        </div>

        <h2 className="mt-2 text-[16px] font-semibold leading-tight tracking-[0.02em] text-steel-200">
          {part.name}
        </h2>
        <div className="mt-1 flex items-center gap-1.5 font-mono text-[9px] tracking-[0.12em] text-steel-400/60">
          <span className="text-accent/70">P/N</span>
          {part.code}
        </div>
      </div>

      {/* 当前状态 */}
      <div className="border-b border-line/60 px-3.5 py-2.5">
        <div className={cn('flex items-center justify-between rounded-[2px] border px-2.5 py-2', stateMeta.cls)}>
          <div className="flex items-center gap-2">
            <span className={cn('h-[6px] w-[6px] rounded-full', stateMeta.dot, state !== 'hidden' && 'animate-pulse-soft')} />
            <div className="leading-none">
              <div className={cn('text-[11.5px] font-medium', stateMeta.text)}>{stateMeta.label}</div>
              <div className="mt-1 font-mono text-[8px] tracking-[0.16em] text-steel-400/55">
                {stateMeta.en}
                {state === 'exploded' && ` · ${Math.round(t * 100)}%`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              data-testid="toggle-part-explode"
              onClick={() => setPartExploded(part.id, !exploded)}
              disabled={isHidden}
              className={cn(
                'flex items-center gap-1 rounded-[2px] px-2 py-[4px] text-[10.5px] font-medium transition-colors',
                isHidden
                  ? 'cursor-not-allowed bg-ink-700/60 text-steel-400/40'
                  : exploded
                    ? 'bg-white/[0.07] text-steel-200 hover:bg-white/10'
                    : 'bg-accent/[0.16] text-accent-soft hover:bg-accent/25'
              )}
            >
              {exploded ? <Undo2 size={10} /> : <Boxes size={10} />}
              {exploded ? '复原' : '拆解'}
            </button>
            <button
              type="button"
              data-testid="toggle-part-visibility"
              onClick={() => toggleHidden(part.id)}
              title={isHidden ? '显示零件' : '隐藏零件'}
              aria-label={isHidden ? '显示零件' : '隐藏零件'}
              className={cn(
                'grid h-[24px] w-[24px] place-items-center rounded-[2px] border transition-colors',
                isHidden
                  ? 'border-warn/45 bg-warn/10 text-warn'
                  : 'border-line text-steel-400 hover:border-accent/45 hover:text-accent'
              )}
            >
              {isHidden ? <EyeOff size={11} /> : <Eye size={11} />}
            </button>
          </div>
        </div>
      </div>

      {/* 基本属性 */}
      <SectionLabel right={<span className="font-mono text-[8.5px] text-steel-400/45">IDENTITY</span>}>
        零件属性
      </SectionLabel>
      <div className="px-3.5">
        <Field label="零件名称" en="NAME">
          {part.name}
        </Field>
        <Field label="零件编号" en="P/N">
          <span className="font-mono text-[11px] tracking-[0.06em]">{part.code}</span>
        </Field>
        <Field label="所属分类" en="CATEGORY">
          {part.category}
        </Field>
        <Field label="材质" en="MATERIAL">
          <span className="inline-flex flex-wrap justify-end gap-1">
            {part.materials.map((m) => (
              <span
                key={m}
                className="rounded-[2px] border border-line/80 bg-ink-850/60 px-1.5 py-[1px] text-[10px] text-steel-300/90"
              >
                {m}
              </span>
            ))}
          </span>
        </Field>
        <Field label="外形尺寸" en="DIMENSION">
          <span className="inline-flex items-center gap-1 font-mono text-[11px]">
            <Ruler size={10} className="text-accent/60" />
            {part.dimensions}
          </span>
        </Field>
        <Field label="拆解层级" en="LEVEL">
          <span className="font-mono text-[11px]">
            L{part.level}
            <span className="ml-1 text-steel-400/60">{levelMeta?.name}</span>
          </span>
        </Field>
        <Field label="当前状态" en="STATUS">
          <span className={cn('font-medium', stateMeta.text)}>
            {stateMeta.label}
            <span className="ml-1 font-mono text-[9px] text-steel-400/50">{stateMeta.en}</span>
          </span>
        </Field>
      </div>

      {/* 功能说明 */}
      <SectionLabel>功能说明</SectionLabel>
      <div className="px-3.5">
        <p className="border-l border-accent/25 pl-2.5 text-[11px] leading-[1.75] text-steel-400/90">
          {part.description}
        </p>
      </div>

      {/* 工程数据 */}
      <SectionLabel right={<span className="font-mono text-[8.5px] text-steel-400/45">ENG. DATA</span>}>
        拆解参数
      </SectionLabel>
      <div className="space-y-1.5 px-3 pb-3">
        <div className="rounded-[2px] border border-line/70 bg-ink-850/50 px-2 py-1.5">
          <div className="mb-1 flex items-center gap-1.5">
            <ArrowUpRight size={10} className="text-accent/60" />
            <span className="font-mono text-[8.5px] tracking-[0.14em] text-steel-400/60">EXPLODE Δ (m)</span>
          </div>
          <div className="grid grid-cols-3 gap-1 font-mono text-[10px]">
            {(['X', 'Y', 'Z'] as const).map((axis, i) => (
              <div key={axis} className="flex items-center justify-between rounded-[2px] bg-ink-950/60 px-1.5 py-[3px]">
                <span className="text-steel-400/50">{axis}</span>
                <span className={cn(part.explode[i] >= 0 ? 'text-accent/85' : 'text-warn/90')}>
                  {part.explode[i].toFixed(3)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {motion && (
          <div className="rounded-[2px] border border-line/70 bg-ink-850/50 px-2 py-1.5">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-[8.5px] tracking-[0.14em] text-steel-400/60">MOTION WINDOW</span>
              <span className="font-mono text-[8.5px] text-accent/70">
                {(motion.window[0] * 100).toFixed(0)}% → {(motion.window[1] * 100).toFixed(0)}%
              </span>
            </div>
            <div className="space-y-[3px] font-mono text-[9.5px]">
              <div className="flex justify-between">
                <span className="text-steel-400/50">装配位置</span>
                <span className="text-steel-300/90">
                  {(originalPos ?? [0, 0, 0]).map((v) => v.toFixed(3)).join(' / ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-steel-400/50">爆炸位置</span>
                <span className="text-accent/85">
                  {(originalPos ?? [0, 0, 0]).map((v, i) => (v + part.explode[i] * distance).toFixed(3)).join(' / ')}
                </span>
              </div>
            </div>
          </div>
        )}

        <TextButton
          className="w-full"
          onClick={() => focusPart(part.id)}
          data-testid="focus-part"
          title="相机聚焦此零件"
        >
          <Crosshair size={11} /> 相机聚焦
        </TextButton>
      </div>
    </div>
  )
}

export function PartInfo() {
  const selectedId = useAppStore((s) => s.selectedId)
  return selectedId ? <Detail id={selectedId} /> : <Overview />
}

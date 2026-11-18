import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

/** 顶栏图标按钮：克制的工业方角，激活时主色描边 */
export function IconButton({
  children,
  onClick,
  title,
  active,
  disabled,
  className,
  badge,
  'data-testid': testId,
}: {
  children: ReactNode
  onClick?: () => void
  title: string
  active?: boolean
  disabled?: boolean
  className?: string
  badge?: ReactNode
  'data-testid'?: string
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      data-testid={testId}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group relative grid h-8 w-8 shrink-0 place-items-center rounded-[3px] border transition-colors duration-150',
        'border-line/80 bg-ink-850/70 text-steel-400 hover:border-accent/45 hover:bg-accent/[0.08] hover:text-accent-soft',
        active && 'border-accent/55 bg-accent/[0.1] text-accent',
        disabled &&
          'cursor-not-allowed opacity-35 hover:border-line/80 hover:bg-ink-850/70 hover:text-steel-400',
        className
      )}
    >
      {children}
      {badge}
    </button>
  )
}

export function TextButton({
  children,
  onClick,
  active,
  disabled,
  className,
  title,
  'data-testid': testId,
}: {
  children: ReactNode
  onClick?: () => void
  active?: boolean
  disabled?: boolean
  className?: string
  title?: string
  'data-testid'?: string
}) {
  return (
    <button
      type="button"
      title={title}
      data-testid={testId}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-[3px] border px-2.5 py-[6px] text-[11.5px] font-medium tracking-wide transition-colors duration-150',
        'border-line/80 bg-ink-850/60 text-steel-300 hover:border-accent/45 hover:bg-accent/[0.07] hover:text-accent-soft',
        active && 'border-accent/55 bg-accent/[0.1] text-accent',
        disabled && 'cursor-not-allowed opacity-35',
        className
      )}
    >
      {children}
    </button>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  desc,
  compact,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  desc?: string
  compact?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'flex w-full items-center justify-between gap-3 rounded-[3px] border border-line/70 bg-ink-850/40 text-left transition-colors hover:border-line-strong',
        compact ? 'px-2.5 py-2' : 'px-2.5 py-2.5'
      )}
    >
      <span className="min-w-0">
        <span className="block text-[11.5px] font-medium text-steel-200">{label}</span>
        {desc && <span className="mt-0.5 block text-[10px] leading-tight text-steel-400/70">{desc}</span>}
      </span>
      <span
        className={cn(
          'relative h-[16px] w-[28px] shrink-0 rounded-full border transition-colors duration-200',
          checked ? 'border-accent/70 bg-accent/30' : 'border-line bg-ink-700'
        )}
      >
        <span
          className={cn(
            'absolute top-[2px] h-[10px] w-[10px] rounded-full transition-transform duration-200',
            checked ? 'translate-x-[15px] bg-accent shadow-[0_0_8px_rgba(0,200,255,0.8)]' : 'translate-x-[2px] bg-steel-400'
          )}
        />
      </span>
    </button>
  )
}

export function SectionLabel({
  children,
  right,
  className,
}: {
  children: ReactNode
  right?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-between px-3 pb-1.5 pt-3', className)}>
      <span className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.18em] text-steel-400/85">
        <span className="h-[7px] w-[2px] bg-accent/70" />
        {children}
      </span>
      {right}
    </div>
  )
}

export function LevelBadge({ level, className }: { level: number; className?: string }) {
  const map = ['', 'L1', 'L2', 'L3', 'L4']
  const color = [
    '',
    'text-accent/90 border-accent/35 bg-accent/[0.07]',
    'text-sky-300/90 border-sky-400/30 bg-sky-400/[0.06]',
    'text-violet-300/90 border-violet-400/30 bg-violet-400/[0.06]',
    'text-amber-300/90 border-amber-400/30 bg-amber-400/[0.06]',
  ]
  return (
    <span
      className={cn(
        'shrink-0 rounded-[2px] border px-[3px] py-[1px] font-mono text-[8.5px] leading-[10px] tracking-wide',
        color[level] ?? 'text-steel-400 border-line',
        className
      )}
    >
      {map[level] ?? 'L?'}
    </span>
  )
}

/** 键帽提示 */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-[2px] border border-line bg-ink-850 px-1 py-[1px] font-mono text-[8.5px] text-steel-400">
      {children}
    </span>
  )
}

/** 状态灯 */
export function Led({ tone = 'accent', pulse }: { tone?: 'accent' | 'ok' | 'off' | 'warn'; pulse?: boolean }) {
  const color =
    tone === 'ok'
      ? 'bg-ok shadow-[0_0_6px_rgba(51,214,159,0.9)]'
      : tone === 'warn'
        ? 'bg-warn shadow-[0_0_6px_rgba(255,176,59,0.9)]'
        : tone === 'off'
          ? 'bg-ink-500'
          : 'bg-accent shadow-[0_0_6px_rgba(0,200,255,0.9)]'
  return <span className={cn('h-[5px] w-[5px] shrink-0 rounded-full', color, pulse && 'animate-pulse-soft')} />
}

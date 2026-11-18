import { useEffect, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  Gamepad2,
  Maximize2,
  Minimize2,
  Move3d,
  PanelLeft,
  PanelRight,
  Settings2,
} from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { metaByModel } from '../../data'
import { IconButton, Led } from '../ui/Button'
import { cn } from '../../utils/cn'
import { VIEW_OPTIONS } from '../../three/scene/themes'

function BrandMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 40 40" fill="none" aria-hidden className="shrink-0">
      <path d="M20 3.5 35 11.6v16.8L20 36.5 5 28.4V11.6L20 3.5Z" stroke="#00C8FF" strokeWidth="1" opacity="0.4" />
      <path d="M20 9.6 29.6 15v10.4L20 30.8 10.4 25.4V15L20 9.6Z" stroke="#00C8FF" strokeWidth="1.1" opacity="0.85" />
      <path d="M20 15.2v9.4M15.3 17.6l9.4 4.6M24.7 17.6l-9.4 4.6" stroke="#7FE3FF" strokeWidth="0.9" opacity="0.7" />
      <circle cx="20" cy="20" r="2.2" fill="#00C8FF" />
    </svg>
  )
}

export function TopBar({ layout }: { layout: { width: number; height: number; topH: number; drawer: boolean } }) {
  const model = useAppStore((s) => s.model)
  const setModel = useAppStore((s) => s.setModel)
  const viewMode = useAppStore((s) => s.viewMode)
  const setViewMode = useAppStore((s) => s.setViewMode)
  const panelsOpen = useAppStore((s) => s.panelsOpen)
  const setPanelsOpen = useAppStore((s) => s.setPanelsOpen)
  const settingsOpen = useAppStore((s) => s.settingsOpen)
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen)
  const [fullscreen, setFullscreen] = useState(false)
  const [viewMenu, setViewMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  /** 进出全屏是异步的，切换过程中的重复点击会被浏览器拒绝，这里加一道闸 */
  const fsBusy = useRef(false)
  const meta = metaByModel[model]

  const compact = layout.width < 1440
  const currentView = VIEW_OPTIONS.find((v) => v.key === viewMode) ?? VIEW_OPTIONS[0]

  useEffect(() => {
    const onFs = () => {
      setFullscreen(Boolean(document.fullscreenElement))
      fsBusy.current = false
    }
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  useEffect(() => {
    if (!viewMenu) return
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setViewMenu(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setViewMenu(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [viewMenu])

  const toggleFullscreen = () => {
    if (fsBusy.current) return
    fsBusy.current = true
    const done = () => {
      fsBusy.current = false
    }
    if (document.fullscreenElement) void document.exitFullscreen().catch(done)
    else void document.documentElement.requestFullscreen().catch(done)
  }

  return (
    <header
      className="relative z-30 flex shrink-0 items-stretch border-b border-line bg-ink-900"
      style={{ height: layout.topH }}
    >
      {/* 顶部主色细线 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

      {/* ── 左：品牌 + 产品型号 ── */}
      <div className="flex min-w-0 items-center gap-3 pl-3.5 pr-2">
        <BrandMark />
        <div className="min-w-0 leading-none">
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-[13px] font-semibold tracking-[0.22em] text-steel-200">
              DRONE LAB
            </span>
            <span className="hidden rounded-[2px] border border-accent/30 bg-accent/[0.07] px-1 py-[1px] font-mono text-[8px] tracking-[0.16em] text-accent/85 sm:block">
              v4.0
            </span>
          </div>
          <div className="mt-[5px] hidden font-mono text-[8.5px] tracking-[0.2em] text-steel-400/60 md:block">
            INDUSTRIAL 3D SHOWCASE
          </div>
        </div>

        <div className="mx-1 hidden h-7 w-px bg-line md:block" />

        {/* 产品型号 */}
        <div className="hidden min-w-0 leading-none md:block" data-testid="product-model">
          <div className="flex items-baseline gap-1.5">
            <span className="truncate text-[12px] font-medium tracking-[0.06em] text-steel-200">
              {meta.name}
            </span>
            <span className="font-mono text-[8.5px] text-accent/70">PRO</span>
          </div>
          <div className="mt-[5px] truncate font-mono text-[8.5px] tracking-[0.14em] text-steel-400/55">
            {meta.code}
          </div>
        </div>
      </div>

      {/* ── 中：Drone / Controller 切换 ── */}
      <div className="flex flex-1 items-center justify-center px-2">
        <div
          className="flex items-center gap-[3px] rounded-[3px] border border-line bg-ink-950/60 p-[3px]"
          role="tablist"
          aria-label="模型切换"
        >
          {(
            [
              { key: 'drone' as const, label: 'Drone', sub: 'X9 PRO', Icon: Move3d },
              { key: 'controller' as const, label: 'Controller', sub: 'RC PRO', Icon: Gamepad2 },
            ]
          ).map(({ key, label, sub, Icon }) => {
            const active = model === key
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                data-testid={`model-tab-${key}`}
                onClick={() => setModel(key)}
                className={cn(
                  'relative flex items-center gap-1.5 rounded-[2px] px-2.5 py-[5px] transition-colors duration-150',
                  active
                    ? 'bg-accent/[0.12] text-accent shadow-[inset_0_0_0_1px_rgba(0,200,255,0.4)]'
                    : 'text-steel-400 hover:bg-white/[0.03] hover:text-steel-200'
                )}
              >
                <Icon size={13} strokeWidth={1.9} />
                <span className="text-[11.5px] font-medium tracking-[0.04em]">{label}</span>
                {!compact && (
                  <span
                    className={cn(
                      'font-mono text-[8px] tracking-[0.12em]',
                      active ? 'text-accent/80' : 'text-steel-400/45'
                    )}
                  >
                    {sub}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 右：视图模式 / 全屏 / 设置 ── */}
      <div className="flex items-center gap-1.5 pr-3">
        <div className="mr-1 hidden items-center gap-1.5 rounded-[3px] border border-line/70 bg-ink-850/60 px-2 py-[5px] xl:flex">
          <Led tone="ok" pulse />
          <span className="font-mono text-[8.5px] tracking-[0.16em] text-steel-400/70">ENGINE READY</span>
        </div>

        {/* 视图模式 */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            data-testid="view-mode-btn"
            onClick={() => setViewMenu((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={viewMenu}
            title="视图模式"
            className={cn(
              'flex h-8 items-center gap-1.5 rounded-[3px] border px-2 transition-colors',
              viewMenu
                ? 'border-accent/55 bg-accent/[0.1] text-accent'
                : 'border-line/80 bg-ink-850/70 text-steel-300 hover:border-accent/45 hover:text-accent-soft'
            )}
          >
            <Move3d size={13} strokeWidth={1.9} className="text-accent/80" />
            <span className="hidden text-[11px] tracking-wide lg:block">视图</span>
            <span className="font-mono text-[9.5px] tracking-[0.1em] text-steel-200/90">
              {currentView.en}
            </span>
            <ChevronDown size={11} className={cn('transition-transform', viewMenu && 'rotate-180')} />
          </button>

          {viewMenu && (
            <div
              role="menu"
              className="absolute right-0 top-[38px] w-[186px] animate-fade-in overflow-hidden rounded-[3px] border border-line bg-ink-900 shadow-panel"
            >
              <div className="border-b border-line/70 px-2.5 py-1.5 font-mono text-[8.5px] uppercase tracking-[0.18em] text-steel-400/60">
                Camera Preset
              </div>
              {VIEW_OPTIONS.map((v) => {
                const active = viewMode === v.key
                return (
                  <button
                    key={v.key}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    data-testid={`view-${v.key}`}
                    onClick={() => {
                      setViewMode(v.key)
                      setViewMenu(false)
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 px-2.5 py-[7px] text-left text-[11.5px] transition-colors',
                      active ? 'bg-accent/[0.09] text-accent' : 'text-steel-300 hover:bg-white/[0.04]'
                    )}
                  >
                    <span className="w-3">
                      {active && <Check size={11} strokeWidth={2.4} />}
                    </span>
                    <span className="flex-1">{v.label}</span>
                    <span className="font-mono text-[8.5px] tracking-[0.14em] text-steel-400/60">{v.en}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="mx-0.5 h-6 w-px bg-line" />

        <IconButton
          title={panelsOpen ? '隐藏侧栏面板' : '显示侧栏面板'}
          active={panelsOpen}
          onClick={() => setPanelsOpen(!panelsOpen)}
          className="hidden sm:grid"
        >
          <PanelLeft size={14} strokeWidth={1.9} />
        </IconButton>
        <IconButton
          title="全屏"
          active={fullscreen}
          onClick={toggleFullscreen}
          className="hidden sm:grid"
        >
          {fullscreen ? <Minimize2 size={14} strokeWidth={1.9} /> : <Maximize2 size={14} strokeWidth={1.9} />}
        </IconButton>
        <IconButton
          title="设置"
          active={settingsOpen}
          data-testid="settings-btn"
          onClick={() => setSettingsOpen(!settingsOpen)}
        >
          <Settings2 size={14} strokeWidth={1.9} />
        </IconButton>
        <IconButton
          title="零件信息面板"
          onClick={() => setPanelsOpen(true)}
          className="grid sm:hidden"
        >
          <PanelRight size={14} strokeWidth={1.9} />
        </IconButton>
      </div>
    </header>
  )
}

import { useEffect, useRef, useState } from 'react'
import { TopBar } from './components/layout/TopBar'
import { LeftPanel } from './components/layout/LeftPanel'
import { RightPanel } from './components/layout/RightPanel'
import { BottomBar } from './components/layout/BottomBar'
import { ViewportOverlay } from './components/layout/ViewportOverlay'
import { AnnotationLayer } from './components/layout/AnnotationLayer'
import { SettingsPanel } from './components/panels/SettingsPanel'
import { HelpOverlay } from './components/panels/HelpOverlay'
import { ShowcaseScene } from './three/scene/ShowcaseScene'
import { SCENE_THEMES } from './three/scene/themes'
import { useExplodeActions } from './hooks/useExplodeActions'
import { useLayout } from './hooks/useLayout'
import { useAppStore } from './store/useAppStore'

export default function App() {
  const layout = useLayout()
  const { explodeAll, togglePause, setLevel } = useExplodeActions()
  const resetCamera = useAppStore((s) => s.resetCamera)
  const select = useAppStore((s) => s.select)
  const selectedId = useAppStore((s) => s.selectedId)
  const setHelpOpen = useAppStore((s) => s.setHelpOpen)
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen)
  const panelsOpen = useAppStore((s) => s.panelsOpen)
  const setPanelsOpen = useAppStore((s) => s.setPanelsOpen)
  const bg = useAppStore((s) => s.bg)
  const theme = SCENE_THEMES[bg]

  /** 抽屉模式下，右侧详情面板随选中零件自动展开 */
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const prevDrawer = useRef(layout.drawer)

  useEffect(() => {
    if (!layout.drawer) {
      setInspectorOpen(false)
      return
    }
    if (selectedId) {
      setInspectorOpen(true)
      // 抽屉模式同一时刻只保留一个面板：选中零件时收起零件树
      setPanelsOpen(false)
    }
  }, [selectedId, layout.drawer, setPanelsOpen])

  // 从宽屏切到平板档位时收起侧栏，避免侧栏压住 3D 主体
  useEffect(() => {
    if (layout.drawer && !prevDrawer.current) setPanelsOpen(false)
    prevDrawer.current = layout.drawer
  }, [layout.drawer, setPanelsOpen])

  // 键盘快捷键
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      const st = useAppStore.getState()
      const k = e.key.toLowerCase()
      if (e.key === 'Escape') {
        select(null)
        setHelpOpen(false)
        setSettingsOpen(false)
        setInspectorOpen(false)
      } else if (k === 'r') {
        resetCamera()
      } else if (k === 'e') {
        explodeAll()
      } else if (e.code === 'Space') {
        e.preventDefault()
        togglePause()
      } else if (k === 'h') {
        if (e.shiftKey) st.showAll()
        else if (st.selectedId) st.toggleHidden(st.selectedId)
      } else if (k === 'a') {
        st.setAnnotations(!st.annotations)
      } else if (k === 'g') {
        st.setGrid(!st.grid)
      } else if (k === 'x') {
        st.setAxes(!st.axes)
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        setLevel(Number(e.key) as 1 | 2 | 3 | 4)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [explodeAll, resetCamera, select, setHelpOpen, setSettingsOpen, togglePause, setLevel])

  const leftDrawer = layout.drawer && panelsOpen
  const rightDrawer = layout.drawer && inspectorOpen && !panelsOpen
  const drawerOpen = leftDrawer || rightDrawer
  const drawerWidth = Math.min(layout.leftW + 40, Math.round(layout.width * 0.8))

  return (
    <div
      data-testid="app-root"
      className="relative flex h-full w-full flex-col overflow-hidden bg-ink-950 text-steel-200"
    >
      <TopBar layout={layout} />

      <div className="relative z-10 flex min-h-0 flex-1">
        {/* 左侧零件树：宽屏常驻，平板为抽屉 */}
        {!layout.drawer && panelsOpen && <LeftPanel width={layout.leftW} />}

        <main
          className="relative min-w-0 flex-1 overflow-hidden"
          style={{ background: theme.backdrop }}
          data-testid="viewport"
        >
          <ShowcaseScene />
          <AnnotationLayer />
          <ViewportOverlay compact={layout.width < 1280} />

          {/* 视口四角刻线 */}
          <div className="pointer-events-none absolute inset-2.5 z-[11]">
            {[
              'left-0 top-0 border-l border-t',
              'right-0 top-0 border-r border-t',
              'left-0 bottom-0 border-l border-b',
              'right-0 bottom-0 border-r border-b',
            ].map((cls) => (
              <span key={cls} className={`absolute h-3 w-3 border-line-strong/70 ${cls}`} />
            ))}
          </div>

          {/* 平板抽屉遮罩 */}
          {drawerOpen && (
            <div
              className="absolute inset-0 z-30 bg-black/45 backdrop-blur-[1px]"
              onClick={() => {
                setPanelsOpen(false)
                setInspectorOpen(false)
              }}
              data-testid="drawer-backdrop"
            />
          )}

          {/* 平板抽屉面板 */}
          {layout.drawer && leftDrawer && (
            <LeftPanel width={drawerWidth} drawer onClose={() => setPanelsOpen(false)} />
          )}
          {layout.drawer && rightDrawer && (
            <RightPanel width={drawerWidth} drawer onClose={() => setInspectorOpen(false)} />
          )}
        </main>

        {!layout.drawer && panelsOpen && <RightPanel width={layout.rightW} />}
      </div>

      <BottomBar layout={layout} />

      <SettingsPanel top={layout.topH} />
      <HelpOverlay />
    </div>
  )
}

import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useAppStore } from '../../store/useAppStore'
import { categoriesOf, partsOfCategory, getPart } from '../../data'
import { partRegistry } from '../../three/core/PartRegistry'
import { cameraBridge } from '../../three/core/CameraBridge'
import { cn } from '../../utils/cn'

/**
 * 结构标注层
 * 3D 场景内的零件世界坐标 → 屏幕坐标投影，由 rAF 直接写 DOM 样式，
 * 不触发 React 重渲染；标注目标 = 各分类代表零件（最多 8 个）+ 当前选中零件。
 */
export function AnnotationLayer() {
  const annotations = useAppStore((s) => s.annotations)
  const selectedId = useAppStore((s) => s.selectedId)
  const model = useAppStore((s) => s.model)
  const hidden = useAppStore((s) => s.hidden)

  const targets = useMemo(() => {
    const list: { id: string; name: string; code: string; category: string; selected: boolean }[] = []
    if (annotations) {
      // 分类跨度抽样，控制在 5 条以内，避免引线过密
      const cats = categoriesOf(model)
      const step = Math.max(1, Math.ceil(cats.length / 5))
      for (let i = 0; i < cats.length; i += step) {
        const p = partsOfCategory(model, cats[i])[0]
        if (!p) continue
        list.push({ id: p.id, name: p.name, code: p.code, category: cats[i], selected: p.id === selectedId })
      }
    }
    if (selectedId) {
      const part = getPart(selectedId)
      if (part) {
        const idx = list.findIndex((t) => t.id === part.id)
        if (idx >= 0) list[idx] = { ...list[idx], selected: true }
        else
          list.push({
            id: part.id,
            name: part.name,
            code: part.code,
            category: part.category,
            selected: true,
          })
      }
    }
    return list.filter((t) => !hidden[t.id])
  }, [annotations, model, selectedId, hidden])

  const wrapRef = useRef<HTMLDivElement>(null)
  const labelRefs = useRef<(HTMLDivElement | null)[]>([])
  const gRefs = useRef<(SVGGElement | null)[]>([])
  const cache = useRef(new Map<string, THREE.Vector3>())
  const cacheModel = useRef<string>('')
  const cacheVersion = useRef(-1)

  // 零件集合或几何变化时清空锚点缓存（在 rAF 内检测，避免高频订阅）
  useEffect(() => {
    cache.current.clear()
    cacheModel.current = model
  }, [model, targets.length])

  useEffect(() => {
    let raf = 0
    const tmp = new THREE.Vector3()

    const anchorOf = (id: string): THREE.Vector3 | null => {
      const entry = partRegistry.get(id)
      if (!entry) return null
      let local = cache.current.get(id)
      if (!local) {
        const box = new THREE.Box3().setFromObject(entry.inner)
        if (box.isEmpty()) return null
        const c = box.getCenter(new THREE.Vector3())
        local = entry.inner.worldToLocal(c.clone())
        cache.current.set(id, local)
      }
      tmp.copy(local)
      return entry.inner.localToWorld(tmp).clone()
    }

    const tick = () => {
      raf = requestAnimationFrame(tick)
      const cam = cameraBridge.camera
      const wrap = wrapRef.current
      if (!cam || !wrap || targets.length === 0) return
      // 注册表变化（切换模型 / 重新挂载）时重新计算局部锚点
      if (cacheVersion.current !== partRegistry.version) {
        cache.current.clear()
        cacheVersion.current = partRegistry.version
      }
      const w = wrap.clientWidth
      const h = wrap.clientHeight
      if (!w || !h) return

      /**
       * 两栏引出：锚点投影后在左右安全区各排一列标签，
       * 先算出所有锚点，再按列纵向排布，保证不压住中间的模型主体。
       */
      const items: { i: number; ax: number; ay: number; side: -1 | 1 }[] = []
      for (let i = 0; i < targets.length; i++) {
        const el = labelRefs.current[i]
        const g = gRefs.current[i]
        if (!el || !g) continue
        const p = anchorOf(targets[i].id)
        if (!p) {
          el.style.opacity = '0'
          g.style.opacity = '0'
          continue
        }
        const ndc = p.clone().project(cam)
        const ax = (ndc.x * 0.5 + 0.5) * w
        const ay = (-ndc.y * 0.5 + 0.5) * h
        if (ndc.z > 1 || ax < -80 || ax > w + 80 || ay < -80 || ay > h + 80) {
          el.style.opacity = '0'
          g.style.opacity = '0'
          continue
        }
        items.push({ i, ax, ay, side: ax < w / 2 ? -1 : 1 })
      }

      const marginX = w < 900 ? 92 : 116
      const gap = 27
      for (const side of [-1, 1] as const) {
        const col = items.filter((it) => it.side === side).sort((a, b) => a.ay - b.ay)
        const lx = side < 0 ? marginX : w - marginX
        let lastY = -Infinity
        for (const it of col) {
          const el = labelRefs.current[it.i]!
          const g = gRefs.current[it.i]!
          let ly = Math.max(it.ay, lastY + gap)
          ly = Math.min(Math.max(ly, 30), h - 22)
          lastY = ly

          el.style.transform = `translate(${lx.toFixed(1)}px, ${ly.toFixed(1)}px) translate(${side < 0 ? '-100%' : '0'}, -50%)`
          el.style.opacity = '1'

          // 工业引出线：锚点 → 水平折点 → 垂直段 → 标签边缘
          const poly = g.querySelector('polyline') as SVGPolylineElement | null
          const dot = g.querySelector('circle') as SVGCircleElement | null
          const elbowX = lx + side * 9
          if (poly) {
            poly.setAttribute(
              'points',
              `${it.ax.toFixed(1)},${it.ay.toFixed(1)} ${elbowX.toFixed(1)},${it.ay.toFixed(1)} ${elbowX.toFixed(1)},${ly.toFixed(1)} ${lx.toFixed(1)},${ly.toFixed(1)}`
            )
          }
          if (dot) {
            dot.setAttribute('cx', it.ax.toFixed(1))
            dot.setAttribute('cy', it.ay.toFixed(1))
            dot.setAttribute('r', targets[it.i].selected ? '3' : '2.2')
          }
          g.style.opacity = '1'
        }
      }
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [targets])

  if (targets.length === 0) return null

  return (
    <div ref={wrapRef} className="pointer-events-none absolute inset-0 z-[12] select-none">
      <svg className="absolute inset-0 h-full w-full overflow-visible">
        {targets.map((t, i) => (
          <g
            key={t.id}
            ref={(el) => {
              gRefs.current[i] = el
            }}
            style={{ opacity: 0, transition: 'opacity 160ms linear' }}
          >
            <polyline
              points="0,0"
              fill="none"
              stroke={t.selected ? 'rgba(0,200,255,0.85)' : 'rgba(0,200,255,0.3)'}
              strokeWidth={1}
              strokeLinejoin="round"
            />
            <circle cx={0} cy={0} r={t.selected ? 3 : 2.2} fill="rgba(0,200,255,0.95)" />
            <circle cx={0} cy={0} r={t.selected ? 7 : 5} fill="none" stroke="rgba(0,200,255,0.28)" strokeWidth={0.8} />
          </g>
        ))}
      </svg>

      {targets.map((t, i) => (
        <div
          key={t.id}
          ref={(el) => {
            labelRefs.current[i] = el
          }}
          data-testid={`annotation-${t.id}`}
          className={cn(
            'absolute left-0 top-0 flex items-center gap-1.5 whitespace-nowrap rounded-[2px] border px-1.5 py-[2px] backdrop-blur-sm',
            t.selected
              ? 'border-accent/70 bg-ink-950/90 shadow-[0_0_14px_-4px_rgba(0,200,255,0.7)]'
              : 'border-line/90 bg-ink-950/80'
          )}
          style={{ opacity: 0, transition: 'opacity 160ms linear' }}
        >
          <span
            className={cn('h-[3px] w-[3px] shrink-0', t.selected ? 'bg-accent' : 'bg-accent/60')}
          />
          <span className="leading-none">
            <span
              className={cn(
                'block text-[9.5px] leading-[11px] tracking-[0.02em]',
                t.selected ? 'text-steel-200' : 'text-steel-300/90'
              )}
            >
              {t.name}
            </span>
            <span className="mt-[2px] block font-mono text-[7px] leading-[8px] tracking-[0.12em] text-accent/60">
              {t.code}
            </span>
          </span>
        </div>
      ))}
    </div>
  )
}

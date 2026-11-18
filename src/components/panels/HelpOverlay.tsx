import { X } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

const rows: [string, string][] = [
  ['左键拖拽 / 滚轮 / 右键', '旋转 · 缩放 · 平移'],
  ['单击 3D 零件', '选中并同步左侧零件树'],
  ['双击 3D 零件', '相机聚焦该零件'],
  ['点击零件树行', '选中并高亮对应 3D 零件'],
  ['零件树 眼睛图标', '显示 / 隐藏该零件（实时更新场景）'],
  ['零件树 方块图标', '单独拆解 / 复原该零件'],
  ['H / Shift+H', '隐藏当前选中 / 显示全部零件'],
  ['A / G / X', '结构标注 · 网格 · 坐标轴'],
  ['空格 / E / R', '暂停动画 · 播放拆解 · 重置视角'],
  ['数字 1–4', '跳转到第 1–4 级拆解'],
]

export function HelpOverlay() {
  const open = useAppStore((s) => s.helpOpen)
  const setOpen = useAppStore((s) => s.setHelpOpen)
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-[440px] max-w-[92vw] animate-fade-in overflow-hidden rounded-[3px] border border-line bg-ink-900 shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <div className="text-[12.5px] font-semibold tracking-[0.06em] text-steel-200">交互说明</div>
            <div className="mt-1 font-mono text-[8px] tracking-[0.18em] text-steel-400/50">
              INTERACTION GUIDE
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded p-1 text-steel-400/70 transition-colors hover:bg-white/5 hover:text-steel-200"
            aria-label="关闭"
          >
            <X size={14} />
          </button>
        </div>
        <div className="space-y-[3px] p-3">
          {rows.map(([k, v]) => (
            <div
              key={k}
              className="flex items-center justify-between gap-3 rounded-[2px] bg-ink-850/50 px-2.5 py-[6px]"
            >
              <span className="font-mono text-[10px] tracking-wide text-accent/80">{k}</span>
              <span className="text-right text-[10.5px] text-steel-300/90">{v}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-line px-4 py-2.5 text-[10px] leading-relaxed text-steel-400/60">
          模型由 Three.js 参数化几何实时生成：机身为超椭圆截面放样，机臂 / 起落架沿曲线扫掠，桨叶为变桨距翼型，
          电机与镜头为旋成体。全部 50 个零件均为独立 Mesh，可单独选中、隐藏与拆解。
        </div>
      </div>
    </div>
  )
}

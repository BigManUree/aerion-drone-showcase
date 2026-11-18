import type * as THREE from 'three'

/**
 * 相机桥
 * 3D 场景内的相机实例暴露给 DOM 覆盖层（结构标注需要做世界坐标 → 屏幕坐标投影）。
 * 仅保存引用，不做任何渲染逻辑，避免 DOM 层与 R3F 的 React 上下文耦合。
 */
export const cameraBridge: {
  camera: THREE.PerspectiveCamera | null
  canvas: HTMLCanvasElement | null
} = {
  camera: null,
  canvas: null,
}

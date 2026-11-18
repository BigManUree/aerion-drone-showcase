import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5273,
    strictPort: true,
    host: '127.0.0.1',
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // 首屏把 three 内核与 react 运行时拆成独立 chunk：
        // 主包体积从 1.65MB 降到 ~200KB，three 可长期缓存
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('three') || id.includes('postprocessing') || id.includes('@react-three')) {
            return 'three'
          }
          if (id.includes('react') || id.includes('scheduler')) return 'react'
          if (id.includes('gsap') || id.includes('zustand') || id.includes('lucide')) return 'vendor'
        },
      },
    },
  },
})

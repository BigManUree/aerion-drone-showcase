/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* 页面 / 面板层级（深色工业） */
        ink: {
          950: '#101318', // 页面背景
          900: '#191E26', // 面板背景
          850: '#1D232C',
          800: '#222934',
          700: '#28303C',
          600: '#303946', // 边框
          500: '#3B4655',
        },
        /* 文本层级 */
        steel: {
          400: '#8593A5', // 辅助色
          300: '#AEB9C7',
          200: '#E8EDF4', // 主文字
        },
        /* 主色 */
        accent: {
          DEFAULT: '#00C8FF',
          soft: '#7FE3FF',
          dim: '#0A7FA6',
        },
        line: {
          DEFAULT: '#303946',
          soft: 'rgba(48,57,70,0.65)',
          strong: '#3D4859',
        },
        ok: '#33D69F',
        warn: '#FFB03B',
        danger: '#FF5C6C',
      },
      fontFamily: {
        sans: [
          '"Inter"',
          '"HarmonyOS Sans SC"',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          'system-ui',
          'sans-serif',
        ],
        mono: ['"JetBrains Mono"', '"SFMono-Regular"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        panel: '0 18px 48px -24px rgba(0,0,0,0.85)',
        glow: '0 0 0 1px rgba(0,200,255,0.35), 0 0 24px -4px rgba(0,200,255,0.35)',
        inset: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0.55', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-left': {
          from: { opacity: '0.55', transform: 'translateX(-14px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-right': {
          from: { opacity: '0.55', transform: 'translateX(14px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        pulseSoft: {
          '0%,100%': { opacity: '0.35' },
          '50%': { opacity: '0.9' },
        },
        sweep: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(220%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 220ms ease-out',
        'slide-left': 'slide-left 220ms ease-out',
        'slide-right': 'slide-right 220ms ease-out',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
        sweep: 'sweep 3.2s linear infinite',
      },
    },
  },
  plugins: [],
}

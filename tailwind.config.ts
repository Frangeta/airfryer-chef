import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#F6F3EC',
        paper: '#FFFFFF',
        charcoal: '#2A2420',
        ink: '#3A322C',
        paprika: { 50: '#FBEDE7', 200: '#F0B79C', 400: '#D97A4D', 500: '#C1502E', 600: '#A23F22', 700: '#7E301A' },
        gold: { 100: '#FBF1DC', 300: '#EFC978', 500: '#DDA23A', 600: '#B9812A' },
        basket1: { light: '#FBF1DC', DEFAULT: '#DDA23A', dark: '#8A5F1E' },
        basket2: { light: '#E4EEE9', DEFAULT: '#3E7C63', dark: '#25493A' },
        warn: '#B3401F'
      },
      fontFamily: {
        sans: ['Geist', 'ui-sans-serif', 'system-ui'],
        mono: ['Geist Mono', 'ui-monospace', 'SFMono-Regular']
      },
      borderRadius: { xl: '1.1rem', '2xl': '1.5rem' },
      boxShadow: {
        card: '0 1px 2px rgba(42,36,32,0.04), 0 6px 20px -8px rgba(42,36,32,0.12)',
        pop: '0 2px 6px rgba(42,36,32,0.08), 0 12px 32px -12px rgba(42,36,32,0.22)'
      }
    }
  },
  plugins: []
};
export default config;

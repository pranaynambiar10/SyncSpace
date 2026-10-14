import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        surface: {
          base:    '#040a1a',
          card:    '#080f26',
          elevated:'#0d1733',
          hover:   '#111d3e',
          border:  '#1c2d52',
          border2: '#253659',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-brand':   'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        'gradient-brand-r': 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
        'gradient-dark':    'linear-gradient(160deg, #040a1a 0%, #080f26 50%, #0d1733 100%)',
        'glow-brand':       'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.18) 0%, transparent 60%)',
        'auth-left':        'linear-gradient(145deg, #080f26 0%, #0d1733 40%, #12204a 100%)',
        'shimmer-gradient': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
      },
      boxShadow: {
        'glass':   '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        'brand':   '0 0 40px rgba(99,102,241,0.35)',
        'brand-sm':'0 0 20px rgba(99,102,241,0.25)',
        'card':    '0 8px 32px rgba(0,0,0,0.6)',
        'glow':    '0 0 80px rgba(99,102,241,0.18)',
        'inner-brand':'inset 0 0 40px rgba(99,102,241,0.08)',
      },
      animation: {
        'fade-in':     'fadeIn 0.4s ease-out',
        'slide-up':    'slideUp 0.45s ease-out',
        'slide-down':  'slideDown 0.3s ease-out',
        'scale-in':    'scaleIn 0.3s ease-out',
        'pulse-brand': 'pulseBrand 3s ease-in-out infinite',
        'shimmer':     'shimmer 2.4s linear infinite',
        'float':       'float 6s ease-in-out infinite',
        'draw-check':  'drawCheck 0.6s ease-out forwards',
      },
      keyframes: {
        fadeIn:     { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:    { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideDown:  { from: { opacity: '0', transform: 'translateY(-12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn:    { from: { opacity: '0', transform: 'scale(0.94)' }, to: { opacity: '1', transform: 'scale(1)' } },
        pulseBrand: { '0%,100%': { opacity: '0.6' }, '50%': { opacity: '1' } },
        shimmer:    { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
        float:      { '0%,100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-12px)' } },
        drawCheck:  { from: { strokeDashoffset: '50' }, to: { strokeDashoffset: '0' } },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}

export default config

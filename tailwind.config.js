/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0A0A0A',
        card: '#121212',
        'card-border': '#222222',
        'card-hover': '#161616',
        primary: {
          DEFAULT: '#FFD60A',
          hover: '#FFE033',
          glow: 'rgba(255, 214, 10, 0.28)',
          subtle: 'rgba(255, 214, 10, 0.08)',
        },
        foreground: '#E8E8E8',
        muted: '#8A8A8A',
        border: '#1F1F1F',
      },
      borderRadius: {
        'card': '14px',
        'DEFAULT': '14px',
      },
      fontFamily: {
        sans: ['Inter', 'Cairo', 'system-ui', 'sans-serif'],
        arabic: ['Cairo', 'Inter', 'system-ui', 'sans-serif'],
        english: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-sm': '0 0 15px rgba(255, 214, 10, 0.20)',
        'glow': '0 0 25px rgba(255, 214, 10, 0.30)',
        'glow-lg': '0 0 40px rgba(255, 214, 10, 0.40)',
        'card': '0 8px 30px -4px rgba(0, 0, 0, 0.7)',
        'card-hover': '0 12px 35px -2px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 214, 10, 0.15)',
      },
      keyframes: {
        'fade-slide-up': {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'pulse-glow': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1', filter: 'drop-shadow(0 0 8px rgba(255,214,10,0.8))' },
          '50%': { transform: 'scale(1.15)', opacity: '0.85', filter: 'drop-shadow(0 0 16px rgba(255,214,10,1))' },
        },
        'shimmer': {
          '0%': { transform: 'translateX(-150%)' },
          '100%': { transform: 'translateX(150%)' },
        },
        'ambient': {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.1)' },
        },
      },
      animation: {
        'fade-slide-up': 'fade-slide-up 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fade-in 0.35s ease-out forwards',
        'scale-in': 'scale-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'float': 'float 3.5s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2.5s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s infinite',
        'ambient': 'ambient 8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

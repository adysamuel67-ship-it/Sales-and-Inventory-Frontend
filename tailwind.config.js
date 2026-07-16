/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          dark: '#1D4ED8',
          light: '#EFF4FF',
        },
        navy: {
          DEFAULT: '#14213D',
          light: '#1E293B',
        },
        success: {
          DEFAULT: '#16A34A',
          light: '#DCFCE7',
        },
        warning: {
          DEFAULT: '#D97706',
          light: '#FEF3C7',
        },
        danger: {
          DEFAULT: '#DC2626',
          light: '#FEE2E2',
        },
        neutral: {
          DEFAULT: '#475569',
          light: '#94A3B8',
        },
        background: '#F9FAFB',
        surface: '#FFFFFF',
        border: '#CBD5E1',
        surfaceAlt: '#F1F5F9',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'system-ui',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      minHeight: {
        'touch': '44px',
      },
    },
  },
  plugins: [],
}

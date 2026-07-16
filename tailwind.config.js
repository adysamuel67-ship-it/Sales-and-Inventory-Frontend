/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1A56DB',
          dark: '#1344B0',
          light: '#E8F0FE',
        },
        success: {
          DEFAULT: '#057A55',
          light: '#E6F7EC',
        },
        warning: {
          DEFAULT: '#C27803',
          light: '#FFF3D6',
        },
        danger: {
          DEFAULT: '#C81E1E',
          light: '#FDE8E8',
        },
        neutral: {
          DEFAULT: '#374151',
          light: '#6B7280',
        },
        background: '#F9FAFB',
        surface: '#FFFFFF',
        accent: {
          DEFAULT: '#D4782B',
          light: '#FEF3E7',
        },
        'african-gold': '#D4A017',
        'african-terracotta': '#C75B39',
        'african-green': '#2D6A4F',
      },
    },
  },
  plugins: [],
}

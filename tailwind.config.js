/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Single, intentional accent. Deep indigo reads as "trustworthy finance"
        // rather than the generic bright blue of a default component library.
        primary: {
          DEFAULT: '#4F46E5', // indigo-600
          dark: '#4338CA', // indigo-700
          light: '#EEF2FF', // indigo-50
          muted: '#C7D2FE', // indigo-200
          foreground: '#FFFFFF',
        },
        // Deep slate shell for sidebar / high-trust chrome.
        navy: {
          DEFAULT: '#0F172A', // slate-900
          light: '#1E293B', // slate-800
        },
        // Status palette: emerald = healthy, amber = attention, rose = critical.
        success: {
          DEFAULT: '#059669', // emerald-600
          light: '#ECFDF5', // emerald-50
        },
        warning: {
          DEFAULT: '#B45309', // amber-700
          light: '#FFFBEB', // amber-50
        },
        danger: {
          DEFAULT: '#E11D48', // rose-600
          light: '#FFF1F2', // rose-50
        },
        neutral: {
          DEFAULT: '#475569', // slate-600
          light: '#94A3B8', // slate-400
        },
        // Semantic surfaces - everything else derives from slate.
        background: '#F8FAFC', // slate-50   (app canvas)
        surface: '#FFFFFF',
        surfaceAlt: '#F8FAFC', // slate-50   (subtle inset panels)
        surfaceMuted: '#F1F5F9', // slate-100 (table heads, muted rows)
        border: '#E2E8F0', // slate-200 (hairlines)
        borderStrong: '#CBD5E1', // slate-300 (inputs, interactive borders)
      },
      fontFamily: {
        // Loaded via next/font (see src/app/layout.tsx) - self-hosted, no
        // layout shift, and real Inter / Plus Jakarta Sans instead of a
        // silent fallback to the OS system stack.
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        // Explicit type scale so hierarchy is a decision, not an accident.
        'display-lg': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.03em', fontWeight: '700' }],
        'page-title': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.025em', fontWeight: '700' }],
        'section-title': ['1.125rem', { lineHeight: '1.625rem', letterSpacing: '-0.015em', fontWeight: '600' }],
        kpi: ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.03em', fontWeight: '700' }],
        label: ['0.8125rem', { lineHeight: '1.125rem', fontWeight: '500' }],
        micro: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.06em', fontWeight: '600' }],
      },
      // Soft, layered shadows - ambient light instead of a heavy default drop.
      boxShadow: {
        xs: '0 1px 2px 0 rgb(15 23 42 / 0.04)',
        sm: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        DEFAULT: '0 1px 3px 0 rgb(15 23 42 / 0.07), 0 1px 2px -1px rgb(15 23 42 / 0.05)',
        md: '0 4px 8px -2px rgb(15 23 42 / 0.08), 0 2px 4px -2px rgb(15 23 42 / 0.05)',
        lg: '0 12px 24px -6px rgb(15 23 42 / 0.10), 0 4px 8px -4px rgb(15 23 42 / 0.05)',
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.05)',
        'card-hover': '0 8px 24px -6px rgb(15 23 42 / 0.10), 0 2px 6px -2px rgb(15 23 42 / 0.05)',
        popover: '0 16px 40px -12px rgb(15 23 42 / 0.20), 0 0 0 1px rgb(15 23 42 / 0.04)',
        focus: '0 0 0 3px rgb(79 70 229 / 0.18)',
      },
      borderRadius: {
        '4xl': '2rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out both',
        'fade-up': 'fadeUp 280ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scaleIn 180ms cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer: 'shimmer 1.6s linear infinite',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      minHeight: {
        'touch': '44px',
      },
    },
  },
  plugins: [],
}

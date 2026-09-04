export const Colors = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#EFF4FF',
  success: '#16A34A',
  successLight: '#DCFCE7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  background: '#F9FAFB',
  text: '#111827',
  textLight: '#94A3B8',
  border: '#E2E8F0',
  neutral: '#475569',
  neutralLight: '#94A3B8',
  navy: '#14213D',
  navyLight: '#1E293B',
  purple: '#7C3AED',
  purpleLight: '#F5F3FF',
  amber: '#F59E0B',
  amberLight: '#FEF3C7',
  emerald: '#059669',
  emeraldLight: '#ECFDF5',
}

export const API_BASE_URL = 'https://smart-sales-inventory.onrender.com'

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  '3xl': 32,
  '4xl': 40,
}

export const BORDER_RADIUS = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  xxxl: 28,
  full: 9999,
}

export const FONT_SIZE = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  title: 28,
  hero: 34,
}

// Unified elevation/soft-shadow presets for a modern, light, floating UI.
// `rest` is for Android (elevation), `ios` stack is for iOS shadow props.
export const SHADOW = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
}

// Brand gradient stops used across the app (hero banners, primary surfaces).
export const GRADIENTS = {
  primary: ['#4F8DF9', '#2563EB', '#1D4ED8'] as const,
  primarySoft: ['#EFF4FF', '#E0EAFF'] as const,
  navy: ['#1E293B', '#14213D'] as const,
  card: ['#FFFFFF', '#F8FAFC'] as const,
}

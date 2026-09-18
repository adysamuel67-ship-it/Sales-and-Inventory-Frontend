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
  border: '#E5E7EB',
  borderStrong: '#D1D5DB',
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
  gray: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray900: '#111827',
}

// Icon/status chip pairs mirroring the web app (bg/text/ring tints).
export const CHIP_COLORS: Record<string, { bg: string; text: string }> = {
  primary: { bg: '#EFF6FF', text: '#2563EB' },
  success: { bg: '#ECFDF5', text: '#059669' },
  warning: { bg: '#FFFBEB', text: '#D97706' },
  danger: { bg: '#FFF1F2', text: '#E11D48' },
  purple: { bg: '#F5F3FF', text: '#7C3AED' },
  emerald: { bg: '#ECFDF5', text: '#059669' },
  gray: { bg: '#F9FAFB', text: '#6B7280' },
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
  xs: 12,
  sm: 14,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  title: 28,
  hero: 34,
}

// Inter font families loaded via @expo-google-fonts/inter (see app/_layout.tsx).
export const FONTS = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
}

// Elevation/soft-shadow presets. `rest` is for Android (elevation), `ios` for iOS shadow props.
export const SHADOW = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 5,
  },
  primary: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
}

// Brand gradient stops used across the app (hero banners, primary surfaces).
export const GRADIENTS = {
  primary: ['#4F8DF9', '#2563EB', '#1D4ED8'] as const,
  primarySoft: ['#EFF4FF', '#E0EAFF'] as const,
  navy: ['#1E293B', '#14213D'] as const,
  card: ['#FFFFFF', '#F8FAFC'] as const,
}
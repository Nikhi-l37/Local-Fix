// Centralized Design System for LocalFix
export const colors = {
  // Primary Colors
  primary: '#1e40af',        // Deep blue - main CTAs and headers
  primaryDark: '#1e3a8a',    // Darker shade for pressed states
  primaryLight: '#3b82f6',   // Lighter shade for hover states

  // Accent & Secondary
  accent: '#0891b2',         // Cyan - highlights and accents
  accentLight: '#06b6d4',    // Light cyan

  // Status Colors
  success: '#059669',        // Emerald - positive actions
  successLight: '#10b981',   // Light emerald
  warning: '#d97706',        // Amber - secondary actions
  warningLight: '#f59e0b',   // Light amber
  error: '#dc2626',          // Red - errors
  errorLight: '#ef4444',     // Light red

  // Neutral Colors
  background: '#f8fafc',     // Light background
  surface: '#ffffff',        // Card/surface background
  surfaceHover: '#f1f5f9',   // Hover state for surfaces

  // Text Colors
  textPrimary: '#0f172a',    // Dark text
  textSecondary: '#64748b',  // Secondary text
  textTertiary: '#94a3b8',   // Tertiary text
  textInverse: '#ffffff',    // Text on dark backgrounds

  // Border & Divider
  border: '#e2e8f0',         // Light border
  borderDark: '#cbd5e1',     // Darker border
  divider: '#f1f5f9',        // Divider color

  // Special
  green: '#10b981',
  greenBg: '#d1fae5',
  red: '#ef4444',
  redBg: '#fee2e2',
  yellow: '#fbbf24',
  yellowBg: '#fef3c7',
  blue: '#3b82f6',
  blueBg: '#dbeafe',
};

export const shadows = {
  xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
  elevation: '0 20px 35px rgba(0, 0, 0, 0.15)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  none: 0,
  sm: 6,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const typography = {
  // Heading sizes
  h1: { fontSize: 32, fontWeight: 'bold', lineHeight: 1.2 },
  h2: { fontSize: 28, fontWeight: 'bold', lineHeight: 1.2 },
  h3: { fontSize: 24, fontWeight: 'bold', lineHeight: 1.3 },
  h4: { fontSize: 20, fontWeight: 'bold', lineHeight: 1.3 },
  h5: { fontSize: 18, fontWeight: '600', lineHeight: 1.4 },
  h6: { fontSize: 16, fontWeight: '600', lineHeight: 1.4 },

  // Body text
  body: { fontSize: 15, fontWeight: '400', lineHeight: 1.5 },
  bodyMedium: { fontSize: 14, fontWeight: '500', lineHeight: 1.5 },
  bodySemibold: { fontSize: 15, fontWeight: '600', lineHeight: 1.5 },

  // Small text
  small: { fontSize: 13, fontWeight: '400', lineHeight: 1.4 },
  smallMedium: { fontSize: 13, fontWeight: '500', lineHeight: 1.4 },

  // Extra small
  xs: { fontSize: 11, fontWeight: '500', lineHeight: 1.3, textTransform: 'uppercase' },
  xsMedium: { fontSize: 12, fontWeight: '500', lineHeight: 1.4 },

  // Button text
  button: { fontSize: 16, fontWeight: '600', lineHeight: 1.4 },
};

export const gradients = {
  // Background gradients
  primaryGradient: {
    colors: ['#1e40af', '#1e3a8a'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  accentGradient: {
    colors: ['#0891b2', '#0369a1'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  successGradient: {
    colors: ['#059669', '#047857'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
};

export const theme = {
  colors,
  shadows,
  spacing,
  borderRadius,
  typography,
  gradients,
};

export default theme;

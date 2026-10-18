// RUNMUSIC DARK GLASS & DYNAMIC GLOW - Design System Tokens

export const COLORS = {
  // Base & AMOLED Surface
  background: '#09090b',
  surface: '#18181b', // Zinc-900
  surfaceElevated: '#27272a', // Zinc-800
  surfaceHighlight: 'rgba(255, 255, 255, 0.08)',
  surfaceSubtle: 'rgba(255, 255, 255, 0.04)',

  // Hairline Borders
  border: 'rgba(255, 255, 255, 0.08)',
  borderSolid: '#27272a',
  borderActive: 'rgba(255, 255, 255, 0.16)',

  // Typography
  textPrimary: '#ffffff',
  textSecondary: '#a1a1aa', // Zinc-400
  textTertiary: '#71717a', // Zinc-500
  textMuted: '#52525b', // Zinc-600

  // Status & Utility
  destructive: '#ef4444',
  destructiveSurface: 'rgba(239, 68, 68, 0.12)',
  success: '#10b981',
  successSurface: 'rgba(16, 185, 129, 0.12)',
  warning: '#f59e0b',

  // Glass & Modal Overlays
  glassBackground: 'rgba(24, 24, 27, 0.78)',
  glassBarBackground: 'rgba(18, 18, 20, 0.82)',
  backdrop: 'rgba(0, 0, 0, 0.72)',
  handle: 'rgba(255, 255, 255, 0.20)',

  // Default Accent Palette
  defaultAccent: '#3b82f6', // Ocean Blue
  accents: {
    blue: '#3b82f6',
    purple: '#8b5cf6',
    emerald: '#10b981',
    rose: '#ec4899',
    amber: '#f59e0b',
    cyan: '#06b6d4',
    indigo: '#6366f1',
  },
};

export const RADIUS = {
  badge: 8,
  sm: 10,
  input: 14,
  button: 14,
  card: 22,
  modal: 28,
  pill: 999,
};

export const SHADOWS = {
  glass: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  glow: (accentColor: string) => ({
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  }),
};

export const TYPOGRAPHY = {
  screenTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
    color: COLORS.textPrimary,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
    color: COLORS.textPrimary,
  },
  listItemTitle: {
    fontSize: 14.5,
    fontWeight: '600' as const,
    color: COLORS.textPrimary,
  },
  metadata: {
    fontSize: 12.5,
    fontWeight: '500' as const,
    color: COLORS.textTertiary,
  },
  badge: {
    fontSize: 10.5,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
};

export const TOUCH = {
  activeOpacity: 0.7,
  hitSlop: { top: 12, bottom: 12, left: 12, right: 12 },
};

export function getAccentGlow(accent: string = COLORS.defaultAccent) {
  return {
    accent,
    glow: `${accent}4D`, // ~30% alpha
    surface: `${accent}1F`, // ~12% alpha
  };
}

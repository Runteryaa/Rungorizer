import type { ColorSchemeName } from 'react-native';

export const Colors = {
  light: {
    bg: '#F5F5F7',
    card: '#FFFFFF',
    text: '#1C1C1E',
    textSecondary: '#6C6C70',
    textTertiary: '#AEAEB2',
    border: '#E5E5EA',
    accent: '#007AFF',
    inputBg: '#F2F2F7',
    destructive: '#FF3B30',
    success: '#34C759',
    tabBar: '#FFFFFF',
    header: '#F5F5F7',
  },
  dark: {
    bg: '#000000',
    card: '#1C1C1E',
    text: '#FFFFFF',
    textSecondary: '#AEAEB2',
    textTertiary: '#6C6C70',
    border: '#38383A',
    accent: '#0A84FF',
    inputBg: '#2C2C2E',
    destructive: '#FF453A',
    success: '#30D158',
    tabBar: '#1C1C1E',
    header: '#000000',
  },
} as const;

export type ColorScheme = keyof typeof Colors;

export function getColors(scheme: ColorSchemeName) {
  return Colors[scheme === 'dark' ? 'dark' : 'light'];
}

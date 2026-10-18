import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { COLORS, RADIUS, SHADOWS, TOUCH } from '../constants/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  onLongPress?: () => void;
  accentColor?: string;
  isElevated?: boolean;
  isActive?: boolean;
}

export function GlassCard({
  children,
  style,
  onPress,
  onLongPress,
  accentColor,
  isElevated = false,
  isActive = false,
}: GlassCardProps) {
  const cardStyles = [
    styles.card,
    isElevated && styles.elevated,
    isActive && styles.active,
    accentColor ? { borderColor: `${accentColor}40` } : null,
    style,
  ];

  if (onPress || onLongPress) {
    return (
      <TouchableOpacity
        activeOpacity={TOUCH.activeOpacity}
        onPress={onPress}
        onLongPress={onLongPress}
        style={cardStyles}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyles}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface, // Zinc-900 (#18181b)
    borderRadius: RADIUS.card, // 22px squircle
    borderWidth: 1,
    borderColor: COLORS.border, // Hairline rgba(255, 255, 255, 0.08)
    padding: 16,
    ...SHADOWS.glass,
  },
  elevated: {
    backgroundColor: COLORS.surfaceElevated, // Zinc-800 (#27272a)
  },
  active: {
    backgroundColor: COLORS.surfaceHighlight,
    borderColor: COLORS.borderActive,
  },
});

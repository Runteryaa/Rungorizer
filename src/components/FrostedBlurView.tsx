import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS } from '../constants/theme';

interface FrostedBlurViewProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: 'dark' | 'light' | 'default';
  hasBorder?: boolean;
}

export function FrostedBlurView({
  children,
  style,
  intensity = 70,
  tint = 'dark',
  hasBorder = true,
}: FrostedBlurViewProps) {
  // On platforms supporting BlurView
  return (
    <View style={[styles.container, hasBorder && styles.hairlineBorder, style]}>
      {Platform.OS !== 'web' ? (
        <BlurView
          intensity={intensity}
          tint={tint}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={styles.glassTintOverlay} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: COLORS.glassBackground,
  },
  glassTintOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(9, 9, 11, 0.45)', // AMOLED subtle dark tint
  },
  hairlineBorder: {
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});

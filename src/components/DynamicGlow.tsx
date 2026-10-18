import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface DynamicGlowProps {
  color: string;
  intensity?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function DynamicGlow({ color, intensity = 0.25, style, children }: DynamicGlowProps) {
  // Format color with hex or rgba
  const glowStart = `${color}${Math.round(intensity * 255).toString(16).padStart(2, '0')}`;
  const glowEnd = 'transparent';

  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={[glowStart, glowEnd]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
});

import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Folder, Layers, Star, Settings } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { COLORS } from '../../constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.defaultAccent,
        tabBarInactiveTintColor: COLORS.textTertiary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarBackground: () => (
          <View style={styles.blurContainer}>
            {Platform.OS !== 'web' ? (
              <BlurView
                intensity={80}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
            ) : null}
            <View style={styles.tabGlassOverlay} />
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Klasörler',
          tabBarIcon: ({ color, size }) => <Folder size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="all-links"
        options={{
          title: 'Tüm Linkler',
          tabBarIcon: ({ color, size }) => <Layers size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favoriler',
          tabBarIcon: ({ color, size }) => <Star size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ayarlar',
          tabBarIcon: ({ color, size }) => <Settings size={size - 2} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    paddingTop: 8,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    elevation: 0,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  blurContainer: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    backgroundColor: 'rgba(9, 9, 11, 0.75)', // AMOLED dark glass
  },
  tabGlassOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(24, 24, 27, 0.45)',
  },
});

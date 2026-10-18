import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { NotificationToast } from '../components/NotificationToast';
import { useLinksStore } from '../stores/useLinksStore';
import { setupIntentListener } from '../services/intentHandler';
import { COLORS } from '../constants/theme';

export default function RootLayout() {
  const initialize = useLinksStore((state) => state.initialize);
  const addLink = useLinksStore((state) => state.addLink);

  useEffect(() => {
    // 1. Initialize SQLite database & load records
    initialize();

    // 2. Set up Android Share Intent & deep link listener
    const removeListener = setupIntentListener((url) => {
      addLink(url);
    });

    return () => {
      removeListener();
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
          animation: 'fade_from_bottom',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="folder/[id]"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="modal/add-link"
          options={{
            presentation: 'modal',
            headerShown: false,
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="modal/edit-folder"
          options={{
            presentation: 'modal',
            headerShown: false,
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
      <NotificationToast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background, // Deep AMOLED #09090b
  },
});

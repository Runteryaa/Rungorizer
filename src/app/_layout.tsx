import React, { useEffect } from 'react';
import { View, StyleSheet, BackHandler, AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { NotificationToast } from '../components/NotificationToast';
import { useLinksStore } from '../stores/useLinksStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { setupIntentListener } from '../services/intentHandler';
import { COLORS } from '../constants/theme';

export default function RootLayout() {
  const initialize = useLinksStore((state) => state.initialize);
  const refresh = useLinksStore((state) => state.refresh);
  const addLink = useLinksStore((state) => state.addLink);

  useEffect(() => {
    // 1. Initialize SQLite database & load records
    initialize().then(() => {
      useSettingsStore.getState().loadSettings();
    });

    // 2. Refresh store automatically whenever app returns to foreground
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        refresh();
        useSettingsStore.getState().loadSettings();
      }
    });

    // 3. Set up Android Share Intent & deep link listener
    const removeListener = setupIntentListener(async (url) => {
      const shareMode = useSettingsStore.getState().shareMode;
      if (shareMode === 'silent') {
        // Mode 1: Completely invisible silent save and exit
        await addLink(url);
        setTimeout(() => {
          BackHandler.exitApp();
        }, 120);
      } else {
        // Mode 2: Interactive save - open modal prefilled with url
        router.push({
          pathname: '/modal/add-link',
          params: { prefilledUrl: url },
        });
      }
    });

    return () => {
      removeListener();
      appStateSub.remove();
    };
  }, []);

  return (
    <SafeAreaProvider style={styles.provider}>
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
            name="share"
            options={{
              headerShown: false,
              animation: 'none',
            }}
          />
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
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  provider: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background, // Deep AMOLED #09090b
  },
});

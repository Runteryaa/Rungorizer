import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, BackHandler } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Check } from 'lucide-react-native';
import { extractUrlFromText } from '../services/urlCleaner';
import { useLinksStore } from '../stores/useLinksStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { COLORS, TYPOGRAPHY, RADIUS } from '../constants/theme';

export default function ShareScreen() {
  const params = useLocalSearchParams<{ text?: string; url?: string }>();
  const addLink = useLinksStore((state) => state.addLink);
  const initialize = useLinksStore((state) => state.initialize);
  const [statusText, setStatusText] = useState('Bağlantı işleniyor...');
  const [isSuccess, setIsSuccess] = useState(false);
  const isProcessedRef = useRef(false);

  useEffect(() => {
    if (isProcessedRef.current) return;
    isProcessedRef.current = true;

    const processSharedContent = async () => {
      try {
        await initialize();

        const raw = params.text || params.url || '';
        let targetUrl = extractUrlFromText(raw);

        if (!targetUrl && raw) {
          try {
            const decoded = decodeURIComponent(raw);
            targetUrl = extractUrlFromText(decoded);
          } catch {
            // keep as is
          }
        }

        if (!targetUrl) {
          router.replace('/(tabs)');
          return;
        }

        const shareMode = useSettingsStore.getState().shareMode;

        if (shareMode === 'silent') {
          setStatusText('Kaydediliyor...');
          const result = await addLink(targetUrl);
          if (result.success) {
            setIsSuccess(true);
            setStatusText(result.isExisting ? 'Bağlantı güncellendi' : 'Bağlantı kaydedildi');
          }
          // Swiftly close the app after saving
          setTimeout(() => {
            BackHandler.exitApp();
          }, 400);
        } else {
          // Interactive mode: Open add-link modal prefilled
          router.replace({
            pathname: '/modal/add-link',
            params: { prefilledUrl: targetUrl },
          });
        }
      } catch (err) {
        console.error('Share processing error:', err);
        router.replace('/(tabs)');
      }
    };

    processSharedContent();
  }, [params.text, params.url]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={[styles.iconWrapper, isSuccess && styles.iconWrapperSuccess]}>
          {isSuccess ? (
            <Check size={26} color={COLORS.success} strokeWidth={2.5} />
          ) : (
            <ActivityIndicator size="small" color={COLORS.defaultAccent} />
          )}
        </View>
        <Text style={styles.statusText}>{statusText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background, // AMOLED #09090b
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.card,
    paddingVertical: 28,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  iconWrapper: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconWrapperSuccess: {
    backgroundColor: COLORS.successSurface,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusText: {
    ...TYPOGRAPHY.listItemTitle,
    textAlign: 'center',
  },
});

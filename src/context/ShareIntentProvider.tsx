import React, { useEffect, useState, useRef } from 'react';
import {
  ToastAndroid,
  Platform,
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import {
  ShareIntentProvider as ExpoShareIntentProvider,
  useShareIntentContext,
} from 'expo-share-intent';
import { useRouter } from 'expo-router';
import { useDb } from './DbContext';
import { insertLink, updateLinkMetadata } from '../db/database';
import { fetchLinkMetadata, getDomain } from '../services/metadata';

function ShareIntentHandler() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const { db, refresh, silentSave } = useDb();
  const router = useRouter();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const showInAppToast = (msg: string) => {
    setToastMessage(msg);
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.delay(2200),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastMessage(null);
    });
  };

  useEffect(() => {
    if (!hasShareIntent || !db) return;

    const url = shareIntent?.webUrl ?? shareIntent?.text;
    if (!url || !url.startsWith('http')) return;

    (async () => {
      try {
        const domain = getDomain(url);
        const id = await insertLink(db, { url, domain });

        // UI'ı hemen güncelle
        refresh();

        // Metadata'yı arka planda çek, bitince tekrar güncelle
        fetchLinkMetadata(url).then(async (meta) => {
          await updateLinkMetadata(db, id, meta);
          refresh();
        });

        resetShareIntent();

        if (silentSave) {
          if (Platform.OS === 'android') {
            ToastAndroid.show(`🔗 Link kaydedildi: ${domain}`, ToastAndroid.SHORT);
          }
          showInAppToast(`🔗 Link kaydedildi: ${domain}`);
        } else {
          router.push(`/link/${id}`);
        }
      } catch (e) {
        console.warn('Share intent handling error:', e);
        resetShareIntent();
      }
    })();
  }, [hasShareIntent, silentSave, db]);

  if (!toastMessage) return null;

  return (
    <Animated.View style={[styles.toastContainer, { opacity: fadeAnim }]}>
      <View style={styles.toastCard}>
        <Text style={styles.toastText}>{toastMessage}</Text>
      </View>
    </Animated.View>
  );
}

interface ShareIntentProviderProps {
  children: React.ReactNode;
}

export function ShareIntentProvider({ children }: ShareIntentProviderProps) {
  return (
    <ExpoShareIntentProvider>
      {children}
      <ShareIntentHandler />
    </ExpoShareIntentProvider>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    zIndex: 99999,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  toastCard: {
    backgroundColor: 'rgba(28, 28, 30, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  toastText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

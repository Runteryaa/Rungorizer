import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  AppState,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Plus, ClipboardCopy } from 'lucide-react-native';
import { FrostedBlurView } from './FrostedBlurView';
import { COLORS, RADIUS, SHADOWS, TOUCH } from '../constants/theme';
import { extractUrlFromText } from '../services/urlCleaner';
import { useLinksStore } from '../stores/useLinksStore';
import { useSettingsStore } from '../stores/useSettingsStore';

interface FABProps {
  onPress: () => void;
}

export function FloatingActionButton({ onPress }: FABProps) {
  const [clipboardUrl, setClipboardUrl] = useState<string | null>(null);
  const addLink = useLinksStore((state) => state.addLink);
  const isSaving = useLinksStore((state) => state.isSaving);
  const autoDetect = useSettingsStore((state) => state.autoDetectClipboard);

  const checkClipboard = async () => {
    if (!autoDetect) {
      setClipboardUrl(null);
      return;
    }
    try {
      const hasString = await Clipboard.hasStringAsync();
      if (hasString) {
        const text = await Clipboard.getStringAsync();
        const extracted = extractUrlFromText(text);
        setClipboardUrl(extracted);
      } else {
        setClipboardUrl(null);
      }
    } catch {
      setClipboardUrl(null);
    }
  };

  useEffect(() => {
    checkClipboard();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkClipboard();
      }
    });
    return () => subscription.remove();
  }, [autoDetect]);

  const handleQuickAddClipboard = async () => {
    if (!clipboardUrl) return;
    const urlToAdd = clipboardUrl;
    setClipboardUrl(null);
    await addLink(urlToAdd);
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Quick Clipboard Pill Badge if link detected */}
      {clipboardUrl ? (
        <TouchableOpacity
          activeOpacity={TOUCH.activeOpacity}
          onPress={handleQuickAddClipboard}
          disabled={isSaving}
          style={styles.pillWrap}
        >
          <FrostedBlurView intensity={70} style={styles.clipboardPill}>
            <ClipboardCopy size={14} color={COLORS.defaultAccent} />
            <Text numberOfLines={1} style={styles.clipboardPillText}>
              Panodan Ekle
            </Text>
          </FrostedBlurView>
        </TouchableOpacity>
      ) : null}

      {/* Main Glass FAB (+) Button */}
      <TouchableOpacity
        activeOpacity={TOUCH.activeOpacity}
        onPress={onPress}
        disabled={isSaving}
        style={styles.fabWrap}
      >
        <FrostedBlurView intensity={80} style={styles.fabInner}>
          <Plus size={24} color="#ffffff" strokeWidth={2.5} />
        </FrostedBlurView>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    bottom: 84, // Sits comfortably above the frosted tab bar
    alignItems: 'flex-end',
    zIndex: 999,
  },
  pillWrap: {
    marginBottom: 10,
    ...SHADOWS.glass,
  },
  clipboardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: `${COLORS.defaultAccent}50`,
    backgroundColor: 'rgba(24, 24, 27, 0.90)',
  },
  clipboardPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  fabWrap: {
    borderRadius: RADIUS.pill,
    ...SHADOWS.glass,
  },
  fabInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(59, 130, 246, 0.85)', // Ocean blue glass
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

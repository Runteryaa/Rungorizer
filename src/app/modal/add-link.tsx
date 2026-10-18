import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { X, ClipboardPaste, Link2, Sparkles, Tag, FileText } from 'lucide-react-native';
import { COLORS, RADIUS, SHADOWS, TOUCH, TYPOGRAPHY } from '../../constants/theme';
import { extractUrlFromText } from '../../services/urlCleaner';
import { useLinksStore } from '../../stores/useLinksStore';

export default function AddLinkModal() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ prefilledUrl?: string }>();
  const [url, setUrl] = useState(params.prefilledUrl || '');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [hasClipboardText, setHasClipboardText] = useState(false);

  const addLink = useLinksStore((state) => state.addLink);
  const isSaving = useLinksStore((state) => state.isSaving);
  const links = useLinksStore((state) => state.links);

  const existingTags = React.useMemo(() => {
    const counts: Record<string, number> = {};
    links.forEach((l) => {
      try {
        const list = JSON.parse(l.tags || '[]');
        if (Array.isArray(list)) {
          list.forEach((t) => {
            if (t && typeof t === 'string') {
              const clean = t.trim().toLowerCase();
              if (clean) counts[clean] = (counts[clean] || 0) + 1;
            }
          });
        }
      } catch {}
    });
    return Object.keys(counts).slice(0, 5);
  }, [links]);

  const currentTagsList = useMemo(() => {
    return tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }, [tags]);

  const handleAddTagSuggestion = (tag: string) => {
    if (currentTagsList.length >= 5) return;
    if (!currentTagsList.includes(tag)) {
      setTags([...currentTagsList, tag].join(', '));
    }
  };

  useEffect(() => {
    Clipboard.hasStringAsync().then((has) => {
      setHasClipboardText(has);
    });
  }, []);

  const handlePasteClipboard = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      const extracted = extractUrlFromText(text);
      if (extracted) {
        setUrl(extracted);
      } else if (text) {
        setUrl(text.trim());
      }
    } catch {
      // ignore
    }
  };

  const handleSave = async () => {
    if (!url.trim()) return;

    const tagsArray = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 5);

    const res = await addLink(url, notes.trim() || undefined, tagsArray);
    if (res.success) {
      router.back();
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalWrapper}
        >
          <View style={[styles.sheetContainer, { paddingBottom: Math.max(24, insets.bottom + 14) }]}>
            {/* Top Pull Handle (as per design.md) */}
            <View style={styles.handleContainer}>
              <View style={styles.pullHandle} />
            </View>

            {/* Header (as per design.md) */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <Link2 size={18} color={COLORS.defaultAccent} style={{ marginRight: 8 }} />
                <Text style={styles.headerTitle}>Yeni Bağlantı Ekle</Text>
              </View>
              <TouchableOpacity
                hitSlop={TOUCH.hitSlop}
                onPress={() => router.back()}
                style={styles.closeBtn}
              >
                <X size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* URL Input */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>WEB BAĞLANTISI (URL)</Text>
                {hasClipboardText ? (
                  <TouchableOpacity
                    hitSlop={TOUCH.hitSlop}
                    onPress={handlePasteClipboard}
                    style={styles.pasteBtn}
                  >
                    <ClipboardPaste size={12} color={COLORS.defaultAccent} />
                    <Text style={styles.pasteText}>Panodan Yapıştır</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  value={url}
                  onChangeText={setUrl}
                  placeholder="https://example.com/makale"
                  placeholderTextColor={COLORS.textTertiary}
                  style={styles.input}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
              </View>
            </View>

            {/* Optional Notes Input */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>NOTLAR (OPSİYONEL)</Text>
              </View>
              <View style={[styles.inputContainer, styles.textAreaContainer]}>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Bu link hakkında kısa bir not..."
                  placeholderTextColor={COLORS.textTertiary}
                  style={[styles.input, styles.textAreaInput]}
                  multiline
                  numberOfLines={2}
                />
              </View>
            </View>

            {/* Optional Tags Input */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>ETİKETLER (MAKS. 5 ADET, VİRGÜLLE AYIRIN)</Text>
              </View>
              <View style={styles.inputContainer}>
                <TextInput
                  value={tags}
                  onChangeText={setTags}
                  placeholder="react, tasarım, haber"
                  placeholderTextColor={COLORS.textTertiary}
                  style={styles.input}
                  autoCapitalize="none"
                />
              </View>
              {existingTags.length > 0 ? (
                <View style={styles.suggestionRow}>
                  {existingTags.map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => handleAddTagSuggestion(t)}
                      style={styles.suggestionChip}
                    >
                      <Text style={styles.suggestionText}>+{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>

            {/* Info notice about auto-domain */}
            <View style={styles.infoBanner}>
              <Sparkles size={14} color={COLORS.defaultAccent} />
              <Text style={styles.infoBannerText}>
                Domain klasörü ve sayfa başlığı/özeti otomatik olarak taranıp kaydedilir.
              </Text>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              activeOpacity={TOUCH.activeOpacity}
              onPress={handleSave}
              disabled={isSaving || !url.trim()}
              style={[
                styles.saveButton,
                (!url.trim() || isSaving) && styles.saveButtonDisabled,
              ]}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>Bağlantıyı Kaydet</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.backdrop, // rgba(0, 0, 0, 0.72)
    justifyContent: 'flex-end',
  },
  modalWrapper: {
    width: '100%',
  },
  sheetContainer: {
    backgroundColor: '#18181b', // Elevated surface Zinc-900
    borderTopLeftRadius: RADIUS.modal, // 28px
    borderTopRightRadius: RADIUS.modal, // 28px
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: COLORS.border,
    paddingHorizontal: 20,
    paddingBottom: 24,
    ...SHADOWS.glass,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  pullHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // as per design.md
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 4,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff', // as per design.md
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.08)', // as per design.md
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fieldLabel: {
    ...TYPOGRAPHY.badge,
    color: COLORS.textTertiary,
  },
  pasteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderRadius: 6,
  },
  pasteText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.defaultAccent,
  },
  inputContainer: {
    backgroundColor: COLORS.surfaceElevated, // Zinc-800
    borderRadius: RADIUS.input, // 14px
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 48,
    justifyContent: 'center',
  },
  textAreaContainer: {
    height: 70,
    paddingVertical: 8,
  },
  input: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '500',
  },
  textAreaInput: {
    height: '100%',
    textAlignVertical: 'top',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 20,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  saveButton: {
    backgroundColor: COLORS.defaultAccent,
    borderRadius: RADIUS.button,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.glow(COLORS.defaultAccent),
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  suggestionChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  suggestionText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});

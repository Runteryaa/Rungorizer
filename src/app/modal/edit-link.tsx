import React, { useState, useMemo } from 'react';
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
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Edit3,
  RefreshCw,
  Folder as FolderIcon,
  Check,
} from 'lucide-react-native';
import { COLORS, RADIUS, SHADOWS, TOUCH, TYPOGRAPHY } from '../../constants/theme';
import { useLinksStore } from '../../stores/useLinksStore';
import { scrapeMetadata } from '../../services/metadataScraper';

export default function EditLinkModal() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const links = useLinksStore((state) => state.links);
  const folders = useLinksStore((state) => state.folders);
  const updateLink = useLinksStore((state) => state.updateLink);
  const showNotification = useLinksStore((state) => state.showNotification);

  const link = links.find((l) => l.id === id);

  const [title, setTitle] = useState(link?.title || '');
  const [description, setDescription] = useState(link?.description || '');
  const [notes, setNotes] = useState(link?.notes || '');
  const [folderId, setFolderId] = useState(link?.folder_id || '');
  const [imageUrl, setImageUrl] = useState(link?.image_url || '');

  // Parse initial tags
  const initialTagsStr = useMemo(() => {
    if (!link?.tags) return '';
    try {
      const parsed = JSON.parse(link.tags);
      return Array.isArray(parsed) ? parsed.join(', ') : '';
    } catch {
      return '';
    }
  }, [link?.tags]);

  const [tags, setTags] = useState(initialTagsStr);
  const [isSaving, setIsSaving] = useState(false);
  const [isScraping, setIsScraping] = useState(false);

  // Compute tag suggestions from existing links
  const existingTags = useMemo(() => {
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
    return Object.keys(counts).slice(0, 8);
  }, [links]);

  if (!link) {
    return (
      <View style={styles.backdrop}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Bağlantı bulunamadı</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <X size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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

  const handleRefreshMetadata = async () => {
    setIsScraping(true);
    try {
      const targetUrl = link.clean_url || link.original_url;
      const meta = await scrapeMetadata(targetUrl);
      if (meta.title) setTitle(meta.title);
      if (meta.description) setDescription(meta.description);
      if (meta.imageUrl) setImageUrl(meta.imageUrl);
      if (meta.extractedTags && meta.extractedTags.length > 0) {
        const merged = Array.from(new Set([...currentTagsList, ...meta.extractedTags])).slice(0, 5);
        setTags(merged.join(', '));
      }
      showNotification('Meta verileri web sayfasından yenilendi', undefined, 'success');
    } catch {
      showNotification('Meta verileri çekilirken hata oluştu', undefined, 'error');
    } finally {
      setIsScraping(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim() && !link.clean_url) return;
    setIsSaving(true);

    const tagsArray = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 5);

    await updateLink(link.id, {
      title: title.trim() || undefined,
      description: description.trim() || undefined,
      notes: notes.trim() || undefined,
      tags: tagsArray,
      folder_id: folderId || undefined,
      image_url: imageUrl || undefined,
    });

    setIsSaving(false);
    router.back();
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalWrapper}
        >
          <View style={[styles.sheetContainer, { paddingBottom: Math.max(24, insets.bottom + 14) }]}>
            {/* Top Pull Handle */}
            <View style={styles.handleContainer}>
              <View style={styles.pullHandle} />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <Edit3 size={18} color={COLORS.defaultAccent} style={{ marginRight: 8 }} />
                <Text style={styles.headerTitle}>Bağlantıyı Düzenle</Text>
              </View>
              <TouchableOpacity
                hitSlop={TOUCH.hitSlop}
                onPress={() => router.back()}
                style={styles.closeBtn}
              >
                <X size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.scrollArea}
              keyboardShouldPersistTaps="handled"
            >
              {/* Refetch metadata banner button */}
              <TouchableOpacity
                activeOpacity={TOUCH.activeOpacity}
                onPress={handleRefreshMetadata}
                disabled={isScraping}
                style={styles.refetchButton}
              >
                {isScraping ? (
                  <ActivityIndicator size="small" color={COLORS.defaultAccent} />
                ) : (
                  <RefreshCw size={14} color={COLORS.defaultAccent} />
                )}
                <Text style={styles.refetchText}>
                  {isScraping ? 'Web Sitesinden Taranıyor...' : 'Meta Verileri Yeniden Tara'}
                </Text>
              </TouchableOpacity>

              {/* Title Input */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>BAŞLIK</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Bağlantı Başlığı"
                    placeholderTextColor={COLORS.textTertiary}
                    style={styles.input}
                  />
                </View>
              </View>

              {/* Description Input */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>AÇIKLAMA</Text>
                <View style={[styles.inputContainer, styles.textAreaContainer]}>
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Bağlantı özeti veya açıklaması..."
                    placeholderTextColor={COLORS.textTertiary}
                    style={[styles.input, styles.textAreaInput]}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>

              {/* Personal Notes Input */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>KİŞİSEL NOTLAR (OPSİYONEL)</Text>
                <View style={[styles.inputContainer, styles.textAreaContainer]}>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Örn: 2. maddedeki kaynakları incele..."
                    placeholderTextColor={COLORS.textTertiary}
                    style={[styles.input, styles.textAreaInput]}
                    multiline
                    numberOfLines={2}
                  />
                </View>
              </View>

              {/* Tags Input */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>ETİKETLER (MAKS. 5 ADET, VİRGÜLLE AYIRIN)</Text>
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

              {/* Folder Selector */}
              {folders.length > 0 ? (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>KLASÖR</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.foldersScroll}
                  >
                    {folders.map((f) => {
                      const isSelected = folderId === f.id;
                      return (
                        <TouchableOpacity
                          key={f.id}
                          activeOpacity={TOUCH.activeOpacity}
                          onPress={() => setFolderId(f.id)}
                          style={[
                            styles.folderChip,
                            isSelected && {
                              borderColor: f.color,
                              backgroundColor: `${f.color}20`,
                            },
                          ]}
                        >
                          <FolderIcon
                            size={13}
                            color={isSelected ? f.color : COLORS.textTertiary}
                          />
                          <Text
                            style={[
                              styles.folderChipText,
                              isSelected && { color: '#ffffff', fontWeight: '700' },
                            ]}
                          >
                            {f.display_name}
                          </Text>
                          {isSelected ? (
                            <Check size={12} color={f.color} strokeWidth={3} />
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}
            </ScrollView>

            {/* Save Button */}
            <TouchableOpacity
              activeOpacity={TOUCH.activeOpacity}
              onPress={handleSave}
              disabled={isSaving}
              style={[
                styles.saveButton,
                isSaving && styles.saveButtonDisabled,
              ]}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>Değişiklikleri Kaydet</Text>
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
    backgroundColor: COLORS.backdrop,
    justifyContent: 'flex-end',
  },
  modalWrapper: {
    width: '100%',
    maxHeight: '92%',
  },
  sheetContainer: {
    backgroundColor: '#18181b', // Zinc-900
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    marginTop: 2,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    maxHeight: 460,
  },
  refetchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.28)',
    borderRadius: RADIUS.input,
    paddingVertical: 10,
    marginBottom: 16,
  },
  refetchText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.defaultAccent,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    ...TYPOGRAPHY.badge,
    color: COLORS.textTertiary,
    marginBottom: 8,
  },
  inputContainer: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.input,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 48,
    justifyContent: 'center',
  },
  textAreaContainer: {
    height: 72,
    paddingVertical: 8,
  },
  input: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  textAreaInput: {
    height: '100%',
    textAlignVertical: 'top',
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
  foldersScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  folderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  folderChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  saveButton: {
    backgroundColor: COLORS.defaultAccent,
    borderRadius: RADIUS.button,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
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
  errorContainer: {
    backgroundColor: COLORS.surface,
    padding: 24,
    borderRadius: RADIUS.modal,
    alignItems: 'center',
  },
  errorText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
});

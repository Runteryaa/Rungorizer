import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Switch,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { X, FolderEdit, Check } from 'lucide-react-native';
import { COLORS, RADIUS, SHADOWS, TOUCH, TYPOGRAPHY } from '../../constants/theme';
import { useLinksStore } from '../../stores/useLinksStore';

const COLOR_PRESETS = [
  '#3b82f6', // Ocean Blue
  '#8b5cf6', // Violet
  '#10b981', // Emerald
  '#ec4899', // Rose Pink
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#6366f1', // Indigo
  '#f97316', // Orange
];

export default function EditFolderModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const folders = useLinksStore((state) => state.folders);
  const updateFolder = useLinksStore((state) => state.updateFolder);

  const folder = folders.find((f) => f.id === id);

  const [displayName, setDisplayName] = useState(folder?.display_name || '');
  const [selectedColor, setSelectedColor] = useState(folder?.color || COLORS.defaultAccent);
  const [isPinned, setIsPinned] = useState(folder?.is_pinned === 1);

  if (!folder) {
    return null;
  }

  const handleSave = async () => {
    if (!displayName.trim()) return;

    await updateFolder(folder.id, {
      display_name: displayName.trim(),
      color: selectedColor,
      is_pinned: isPinned ? 1 : 0,
    });
    router.back();
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalWrapper}
        >
          <View style={styles.sheetContainer}>
            {/* Top Pull Handle (as per design.md) */}
            <View style={styles.handleContainer}>
              <View style={styles.pullHandle} />
            </View>

            {/* Header (as per design.md) */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <FolderEdit size={18} color={selectedColor} style={{ marginRight: 8 }} />
                <Text style={styles.headerTitle}>Klasörü Düzenle</Text>
              </View>
              <TouchableOpacity
                hitSlop={TOUCH.hitSlop}
                onPress={() => router.back()}
                style={styles.closeBtn}
              >
                <X size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Folder Name Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>GÖRÜNEN AD</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Klasör Adı"
                  placeholderTextColor={COLORS.textTertiary}
                  style={styles.input}
                />
              </View>
            </View>

            {/* Pin Toggle */}
            <View style={styles.settingRow}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Başa Sabitle</Text>
                <Text style={styles.settingDesc}>Bu domain klasörünü listenin en üstünde gösterir</Text>
              </View>
              <Switch
                value={isPinned}
                onValueChange={setIsPinned}
                trackColor={{ false: COLORS.surfaceElevated, true: '#f59e0b' }}
                thumbColor="#ffffff"
              />
            </View>

            {/* Accent Color Presets */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>TEMA VE IŞIMA RENGİ</Text>
              <View style={styles.colorsGrid}>
                {COLOR_PRESETS.map((color) => {
                  const isSelected = selectedColor.toLowerCase() === color.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={color}
                      activeOpacity={TOUCH.activeOpacity}
                      onPress={() => setSelectedColor(color)}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: color },
                        isSelected && styles.colorCircleSelected,
                      ]}
                    >
                      {isSelected ? <Check size={14} color="#ffffff" strokeWidth={3} /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              activeOpacity={TOUCH.activeOpacity}
              onPress={handleSave}
              disabled={!displayName.trim()}
              style={[
                styles.saveButton,
                { backgroundColor: selectedColor },
                !displayName.trim() && styles.saveButtonDisabled,
              ]}
            >
              <Text style={styles.saveButtonText}>Değişiklikleri Kaydet</Text>
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
  fieldGroup: {
    marginBottom: 18,
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
  input: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '500',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.input,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
  },
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorCircleSelected: {
    borderColor: '#ffffff',
  },
  saveButton: {
    borderRadius: RADIUS.button,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
});

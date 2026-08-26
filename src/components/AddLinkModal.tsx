import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { getColors } from '../constants/colors';
import { fetchLinkMetadata, getDomain } from '../services/metadata';
import { useDb } from '../context/DbContext';
import { insertLink } from '../db/database';

interface AddLinkModalProps {
  visible: boolean;
  initialUrl?: string;
  onClose: () => void;
  onAdded: () => void;
}

export function AddLinkModal({ visible, initialUrl = '', onClose, onAdded }: AddLinkModalProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { db } = useDb();

  const [url, setUrl] = useState(initialUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setUrl(initialUrl);
      setError(null);
    }
  }, [visible, initialUrl]);

  async function handleAdd() {
    if (!url.trim()) {
      setError('Lütfen bir URL girin.');
      return;
    }

    let finalUrl = url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    try {
      new URL(finalUrl);
    } catch {
      setError('Geçersiz URL formatı.');
      return;
    }

    if (!db) return;
    setLoading(true);
    setError(null);

    try {
      const domain = getDomain(finalUrl);
      // First insert with URL only
      const id = await insertLink(db, { url: finalUrl, domain });

      // Then fetch metadata in background
      fetchLinkMetadata(finalUrl).then(async (meta) => {
        const { updateLinkMetadata } = await import('../db/database');
        await updateLinkMetadata(db, id, meta);
        onAdded();
      });

      onAdded();
      onClose();
    } catch (e: any) {
      if (e?.message?.includes('UNIQUE')) {
        setError('Bu link zaten kaydedilmiş.');
      } else {
        setError('Link eklenirken hata oluştu.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kvContainer}
        >
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.card }]}
            onPress={() => {}}
          >
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            <Text style={[styles.title, { color: colors.text }]}>Yeni Link Ekle</Text>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  borderColor: error ? '#ef4444' : colors.border,
                },
              ]}
              value={url}
              onChangeText={(t) => { setUrl(t); setError(null); }}
              placeholder="https://örnek.com"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              onSubmitEditing={handleAdd}
              editable={!loading}
            />

            {error && <Text style={styles.errorText}>{error}</Text>}

            <View style={styles.buttons}>
              <TouchableOpacity
                style={[styles.btn, styles.cancelBtn, { borderColor: colors.border }]}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={[styles.btnText, { color: colors.textSecondary }]}>İptal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, styles.addBtn, { backgroundColor: colors.accent }]}
                onPress={handleAdd}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.btnText, { color: '#fff' }]}>Ekle</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  kvContainer: {
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginBottom: 12,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  btn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
  },
  addBtn: {},
  btnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

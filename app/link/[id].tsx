import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  Alert,
  useColorScheme,
  SafeAreaView,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getColors } from '../../src/constants/colors';
import { useDb } from '../../src/context/DbContext';
import {
  getLinkById,
  toggleFavorite,
  markAsRead,
  deleteLink,
} from '../../src/db/database';
import { Link } from '../../src/types';
import { fetchLinkMetadata } from '../../src/services/metadata';
import { updateLinkMetadata } from '../../src/db/database';

export default function LinkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const router = useRouter();
  const { db } = useDb();

  const [link, setLink] = useState<Link | null>(null);
  const [refreshingMeta, setRefreshingMeta] = useState(false);

  const loadLink = useCallback(async () => {
    if (!db || !id) return;
    const data = await getLinkById(db, Number(id));
    setLink(data);
  }, [db, id]);

  useEffect(() => {
    loadLink();
  }, [loadLink]);

  async function handleOpen() {
    if (!link) return;
    try {
      await Linking.openURL(link.url);
      if (!db) return;
      await markAsRead(db, link.id);
      setLink((l) => l ? { ...l, is_read: 1 } : l);
    } catch {
      Alert.alert('Hata', 'Link açılamadı.');
    }
  }

  async function handleToggleFavorite() {
    if (!link || !db) return;
    await toggleFavorite(db, link.id, link.is_favorite);
    setLink((l) => l ? { ...l, is_favorite: l.is_favorite === 1 ? 0 : 1 } : l);
  }

  async function handleDelete() {
    Alert.alert('Linki Sil', 'Bu linki silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          if (!db || !link) return;
          await deleteLink(db, link.id);
          router.back();
        },
      },
    ]);
  }

  async function handleShare() {
    if (!link) return;
    await Share.share({ url: link.url, message: link.url });
  }

  async function handleRefreshMeta() {
    if (!link || !db) return;
    setRefreshingMeta(true);
    try {
      const meta = await fetchLinkMetadata(link.url);
      await updateLinkMetadata(db, link.id, meta);
      await loadLink();
    } finally {
      setRefreshingMeta(false);
    }
  }

  if (!link) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.loading}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* OG Image */}
        {link.og_image ? (
          <Image source={{ uri: link.og_image }} style={styles.ogImage} />
        ) : null}

        {/* Meta section */}
        <View style={styles.content}>
          {/* Domain row */}
          <View style={styles.domainRow}>
            {link.favicon ? (
              <Image source={{ uri: link.favicon }} style={styles.favicon} />
            ) : null}
            <Text style={[styles.domain, { color: colors.accent }]}>{link.domain}</Text>
            {link.is_read === 0 && (
              <View style={[styles.unreadPill, { backgroundColor: colors.accent }]}>
                <Text style={styles.unreadText}>Yeni</Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>
            {link.title ?? 'Başlık yok'}
          </Text>

          {/* Description */}
          {link.description ? (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {link.description}
            </Text>
          ) : null}

          {/* URL */}
          <View style={[styles.urlBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Text style={[styles.urlText, { color: colors.textSecondary }]} numberOfLines={3} selectable>
              {link.url}
            </Text>
          </View>

          {/* Date */}
          <Text style={[styles.date, { color: colors.textTertiary }]}>
            {new Date(link.created_at).toLocaleString('tr-TR')}
          </Text>

          {/* Actions */}
          <TouchableOpacity
            style={[styles.openBtn, { backgroundColor: colors.accent }]}
            onPress={handleOpen}
          >
            <Text style={styles.openBtnText}>🌐  Tarayıcıda Aç</Text>
          </TouchableOpacity>

          <View style={styles.secondaryActions}>
            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={handleToggleFavorite}
            >
              <Text style={styles.secondaryBtnIcon}>{link.is_favorite === 1 ? '⭐' : '☆'}</Text>
              <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
                {link.is_favorite === 1 ? 'Favoride' : 'Favori'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={handleShare}
            >
              <Text style={styles.secondaryBtnIcon}>↗️</Text>
              <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Paylaş</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={handleRefreshMeta}
              disabled={refreshingMeta}
            >
              <Text style={styles.secondaryBtnIcon}>{refreshingMeta ? '⏳' : '🔄'}</Text>
              <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Yenile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={handleDelete}
            >
              <Text style={styles.secondaryBtnIcon}>🗑️</Text>
              <Text style={[styles.secondaryBtnText, { color: colors.destructive }]}>Sil</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 48 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 16 },
  ogImage: { width: '100%', height: 220, backgroundColor: '#eee' },
  content: { padding: 20 },
  domainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  favicon: { width: 20, height: 20, borderRadius: 4 },
  domain: { fontSize: 14, fontWeight: '600' },
  unreadPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '800', lineHeight: 28, marginBottom: 10 },
  description: { fontSize: 15, lineHeight: 22, marginBottom: 16 },
  urlBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  urlText: { fontSize: 12, lineHeight: 17 },
  date: { fontSize: 12, marginBottom: 24 },
  openBtn: {
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  openBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryBtnIcon: { fontSize: 16 },
  secondaryBtnText: { fontSize: 13, fontWeight: '600' },
});

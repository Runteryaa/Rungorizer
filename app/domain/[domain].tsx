import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  useColorScheme,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { getColors } from '../../src/constants/colors';
import { LinkCard } from '../../src/components/LinkCard';
import { AddLinkModal } from '../../src/components/AddLinkModal';
import { useDb } from '../../src/context/DbContext';
import {
  getLinksByDomain,
  deleteLink,
  toggleFavorite,
  deleteAllByDomain,
} from '../../src/db/database';
import { Link } from '../../src/types';

export default function DomainScreen() {
  const { domain: encodedDomain } = useLocalSearchParams<{ domain: string }>();
  const domain = decodeURIComponent(encodedDomain ?? '');
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const router = useRouter();
  const navigation = useNavigation();
  const { db } = useDb();

  const [links, setLinks] = useState<Link[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const loadLinks = useCallback(async () => {
    if (!db) return;
    const data = await getLinksByDomain(db, domain);
    setLinks(data);
  }, [db, domain]);

  useEffect(() => {
    navigation.setOptions({ title: domain });
    loadLinks();
  }, [domain, loadLinks, navigation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLinks();
    setRefreshing(false);
  }, [loadLinks]);

  function handleLongPress(link: Link) {
    Alert.alert(link.title ?? link.url, undefined, [
      {
        text: link.is_favorite === 1 ? 'Favoriden Çıkar' : 'Favoriye Ekle',
        onPress: async () => {
          if (!db) return;
          await toggleFavorite(db, link.id, link.is_favorite);
          loadLinks();
        },
      },
      {
        text: 'Linki Sil',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Linki Sil', 'Bu linki silmek istediğinize emin misiniz?', [
            { text: 'İptal', style: 'cancel' },
            {
              text: 'Sil',
              style: 'destructive',
              onPress: async () => {
                if (!db) return;
                await deleteLink(db, link.id);
                loadLinks();
              },
            },
          ]),
      },
      { text: 'İptal', style: 'cancel' },
    ]);
  }

  function handleDeleteAll() {
    Alert.alert(
      `${domain} Linklerini Sil`,
      `Bu domain'e ait ${links.length} linkin tamamı silinecek.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Hepsini Sil',
          style: 'destructive',
          onPress: async () => {
            if (!db) return;
            await deleteAllByDomain(db, domain);
            router.back();
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <FlatList
        data={links}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <LinkCard
            link={item}
            onPress={() => router.push(`/link/${item.id}`)}
            onLongPress={() => handleLongPress(item)}
          />
        )}
        ListHeaderComponent={
          <View style={styles.statsBar}>
            <Text style={[styles.statsText, { color: colors.textSecondary }]}>
              {links.length} link
            </Text>
            <TouchableOpacity onPress={handleDeleteAll}>
              <Text style={[styles.deleteAll, { color: colors.destructive }]}>
                Hepsini Sil
              </Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔗</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Link yok</Text>
          </View>
        }
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <AddLinkModal
        visible={modalVisible}
        initialUrl={`https://${domain}/`}
        onClose={() => setModalVisible(false)}
        onAdded={loadLinks}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingVertical: 8, paddingBottom: 100 },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  statsText: { fontSize: 13 },
  deleteAll: { fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '300',
    lineHeight: 32,
  },
});

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  useColorScheme,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getColors } from '../src/constants/colors';
import { LinkCard } from '../src/components/LinkCard';
import { useDb } from '../src/context/DbContext';
import { getFavoriteLinks } from '../src/db/database';
import { Link } from '../src/types';

export default function FavoritesScreen() {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const router = useRouter();
  const { db } = useDb();

  const [links, setLinks] = useState<Link[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!db) return;
    const data = await getFavoriteLinks(db);
    setLinks(data);
  }, [db]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <FlatList
        data={links}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <LinkCard link={item} onPress={() => router.push(`/link/${item.id}`)} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>⭐</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Favori yok</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Link detayından favorilere ekleyebilirsiniz
            </Text>
          </View>
        }
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingVertical: 8, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center' },
});

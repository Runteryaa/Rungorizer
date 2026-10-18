import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Star } from 'lucide-react-native';
import { LinkCard } from '../../components/LinkCard';
import { SearchBar } from '../../components/SearchBar';
import { EmptyState } from '../../components/EmptyState';
import { FloatingActionButton } from '../../components/FloatingActionButton';
import { COLORS, TYPOGRAPHY } from '../../constants/theme';
import { useLinksStore } from '../../stores/useLinksStore';

export default function FavoritesScreen() {
  const links = useLinksStore((state) => state.links);
  const isLoading = useLinksStore((state) => state.isLoading);
  const refresh = useLinksStore((state) => state.refresh);

  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const favoriteLinks = links.filter((l) => l.is_favorite === 1);

  const filtered = favoriteLinks.filter((link) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (link.title && link.title.toLowerCase().includes(q)) ||
      (link.description && link.description.toLowerCase().includes(q)) ||
      (link.clean_url && link.clean_url.toLowerCase().includes(q)) ||
      (link.folder_display_name && link.folder_display_name.toLowerCase().includes(q))
    );
  });

  const onRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* Screen Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>Favoriler</Text>
          <View style={styles.badge}>
            <Star size={12} color="#f59e0b" fill="#f59e0b" />
            <Text style={styles.badgeText}>{favoriteLinks.length}</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>
          Yıldızladığınız ve elinizin altında olmasını istediğiniz bağlantılar
        </Text>

        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Favorilerde ara..."
          style={styles.searchBar}
        />
      </View>

      {/* Favorites List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <LinkCard link={item} showDomainBadge={true} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#f59e0b"
            colors={['#f59e0b']}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon={Star}
              accentColor="#f59e0b"
              title={search ? 'Sonuç Bulunamadı' : 'Henüz Favori Yok'}
              description={
                search
                  ? `"${search}" ile eşleşen bir favori bağlantı bulunamadı.`
                  : 'Beğendiğiniz veya sık başvurduğunuz linklerdeki yıldız ikonuna dokunarak favorilerinize ekleyebilirsiniz.'
              }
            />
          ) : undefined
        }
      />

      <FloatingActionButton onPress={() => router.push('/modal/add-link')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background, // AMOLED #09090b
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  screenTitle: {
    ...TYPOGRAPHY.screenTitle,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f59e0b',
  },
  subtitle: {
    ...TYPOGRAPHY.metadata,
    marginBottom: 14,
  },
  searchBar: {
    marginBottom: 6,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 110,
  },
});

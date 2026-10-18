import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Layers, BookmarkX } from 'lucide-react-native';
import { LinkCard } from '../../components/LinkCard';
import { SearchBar } from '../../components/SearchBar';
import { EmptyState } from '../../components/EmptyState';
import { FloatingActionButton } from '../../components/FloatingActionButton';
import { COLORS, RADIUS, TOUCH, TYPOGRAPHY } from '../../constants/theme';
import { useLinksStore } from '../../stores/useLinksStore';

export default function AllLinksScreen() {
  const links = useLinksStore((state) => state.links);
  const isLoading = useLinksStore((state) => state.isLoading);
  const refresh = useLinksStore((state) => state.refresh);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'favorites'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const filteredLinks = links.filter((link) => {
    // 1. Filter chips
    if (filter === 'unread' && link.is_read === 1) return false;
    if (filter === 'favorites' && link.is_favorite !== 1) return false;

    // 2. Search query
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (link.title && link.title.toLowerCase().includes(q)) ||
      (link.description && link.description.toLowerCase().includes(q)) ||
      (link.clean_url && link.clean_url.toLowerCase().includes(q)) ||
      (link.folder_display_name && link.folder_display_name.toLowerCase().includes(q))
    );
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* Screen Header */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Tüm Bağlantılar</Text>
        <Text style={styles.subtitle}>
          Kronolojik sıra ile kaydedilen tüm web bağlantıları
        </Text>

        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Başlık, içerik veya web adresi ara..."
          style={styles.searchBar}
        />

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            activeOpacity={TOUCH.activeOpacity}
            onPress={() => setFilter('all')}
            style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
          >
            <Text
              style={[
                styles.filterChipText,
                filter === 'all' && styles.filterChipTextActive,
              ]}
            >
              Tümü ({links.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={TOUCH.activeOpacity}
            onPress={() => setFilter('unread')}
            style={[styles.filterChip, filter === 'unread' && styles.filterChipActive]}
          >
            <Text
              style={[
                styles.filterChipText,
                filter === 'unread' && styles.filterChipTextActive,
              ]}
            >
              Okunmamış ({links.filter((l) => l.is_read === 0).length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={TOUCH.activeOpacity}
            onPress={() => setFilter('favorites')}
            style={[styles.filterChip, filter === 'favorites' && styles.filterChipActive]}
          >
            <Text
              style={[
                styles.filterChipText,
                filter === 'favorites' && styles.filterChipTextActive,
              ]}
            >
              Favoriler ({links.filter((l) => l.is_favorite === 1).length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Links List */}
      <FlatList
        data={filteredLinks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <LinkCard link={item} showDomainBadge={true} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.defaultAccent}
            colors={[COLORS.defaultAccent]}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon={filter === 'favorites' ? BookmarkX : Layers}
              title={
                search
                  ? 'Arama Sonucu Bulunamadı'
                  : filter === 'unread'
                  ? 'Tüm Linkler Okundu!'
                  : filter === 'favorites'
                  ? 'Henüz Favori Linkiniz Yok'
                  : 'Henüz Link Eklenmedi'
              }
              description={
                search
                  ? `"${search}" ile eşleşen bir kayıt bulunamadı.`
                  : filter === 'unread'
                  ? 'Tebrikler, tüm bağlantıları okudunuz.'
                  : filter === 'favorites'
                  ? 'Önemli linkleri yıldızlayarak buraya ekleyebilirsiniz.'
                  : 'Web tarayıcınızdan veya diğer uygulamalardan link paylaşarak hemen başlayın.'
              }
              actionLabel={search || filter !== 'all' ? undefined : 'Link Ekle'}
              onAction={search || filter !== 'all' ? undefined : () => router.push('/modal/add-link')}
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
  screenTitle: {
    ...TYPOGRAPHY.screenTitle,
    marginBottom: 4,
  },
  subtitle: {
    ...TYPOGRAPHY.metadata,
    marginBottom: 14,
  },
  searchBar: {
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: COLORS.defaultAccent,
  },
  filterChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: COLORS.defaultAccent,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 110,
  },
});

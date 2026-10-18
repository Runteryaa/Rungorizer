import React, { useState, useMemo } from 'react';
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
import { Layers, BookmarkX, CheckSquare } from 'lucide-react-native';
import { LinkCard } from '../../components/LinkCard';
import { SearchBar } from '../../components/SearchBar';
import { EmptyState } from '../../components/EmptyState';
import { FloatingActionButton } from '../../components/FloatingActionButton';
import { TagFilterBar } from '../../components/TagFilterBar';
import { BulkActionBar } from '../../components/BulkActionBar';
import { COLORS, RADIUS, TOUCH, TYPOGRAPHY } from '../../constants/theme';
import { useLinksStore } from '../../stores/useLinksStore';

export default function AllLinksScreen() {
  const links = useLinksStore((state) => state.links);
  const isLoading = useLinksStore((state) => state.isLoading);
  const refresh = useLinksStore((state) => state.refresh);
  const bulkDelete = useLinksStore((state) => state.bulkDelete);
  const bulkSetRead = useLinksStore((state) => state.bulkSetRead);
  const bulkSetFavorite = useLinksStore((state) => state.bulkSetFavorite);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'favorites'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Multi-selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  // Derive unique tags from links with counts
  const allTags = useMemo(() => {
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
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [links]);

  const filteredLinks = useMemo(() => {
    return links.filter((link) => {
      // 1. Filter chips (all / unread / favorites)
      if (filter === 'unread' && link.is_read === 1) return false;
      if (filter === 'favorites' && link.is_favorite !== 1) return false;

      // 2. Tag filter
      if (selectedTag) {
        try {
          const list = JSON.parse(link.tags || '[]');
          if (!Array.isArray(list) || !list.some((t) => t.trim().toLowerCase() === selectedTag.toLowerCase())) {
            return false;
          }
        } catch {
          return false;
        }
      }

      // 3. Search query
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (link.title && link.title.toLowerCase().includes(q)) ||
        (link.description && link.description.toLowerCase().includes(q)) ||
        (link.clean_url && link.clean_url.toLowerCase().includes(q)) ||
        (link.folder_display_name && link.folder_display_name.toLowerCase().includes(q))
      );
    });
  }, [links, filter, selectedTag, search]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleStartSelection = (initialId?: string) => {
    setIsSelectionMode(true);
    if (initialId) {
      setSelectedIds([initialId]);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredLinks.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLinks.map((l) => l.id));
    }
  };

  const handleBulkSetRead = async (isRead: boolean) => {
    await bulkSetRead(selectedIds, isRead);
    setIsSelectionMode(false);
    setSelectedIds([]);
  };

  const handleBulkSetFavorite = async (isFavorite: boolean) => {
    await bulkSetFavorite(selectedIds, isFavorite);
    setIsSelectionMode(false);
    setSelectedIds([]);
  };

  const handleBulkDelete = async () => {
    await bulkDelete(selectedIds);
    setIsSelectionMode(false);
    setSelectedIds([]);
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedIds([]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* Screen Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.screenTitle}>Tüm Bağlantılar</Text>
            <Text style={styles.subtitle}>
              Kronolojik sıra ile kaydedilen tüm web bağlantıları
            </Text>
          </View>

          {filteredLinks.length > 0 ? (
            <TouchableOpacity
              activeOpacity={TOUCH.activeOpacity}
              onPress={() => {
                if (isSelectionMode) {
                  handleCancelSelection();
                } else {
                  handleStartSelection();
                }
              }}
              style={[
                styles.selectHeaderBtn,
                isSelectionMode && styles.selectHeaderBtnActive,
              ]}
            >
              <CheckSquare
                size={16}
                color={isSelectionMode ? COLORS.defaultAccent : COLORS.textSecondary}
              />
              <Text
                style={[
                  styles.selectHeaderText,
                  isSelectionMode && styles.selectHeaderTextActive,
                ]}
              >
                {isSelectionMode ? 'Vazgeç' : 'Seç'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Başlık, içerik veya web adresi ara..."
          style={styles.searchBar}
        />

        {/* Filter Chips: Tümü / Okunmamış / Favoriler */}
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

        {/* Dynamic Tag Chips */}
        <TagFilterBar
          tags={allTags}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
        />
      </View>

      {/* Links List */}
      <FlatList
        data={filteredLinks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <LinkCard
            link={item}
            showDomainBadge={true}
            isSelectionMode={isSelectionMode}
            isSelected={selectedIds.includes(item.id)}
            onToggleSelect={handleToggleSelect}
            onLongPress={() => handleStartSelection(item.id)}
            onTagPress={(tag) => setSelectedTag(tag)}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          isSelectionMode && { paddingBottom: 150 },
        ]}
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
                search || selectedTag
                  ? 'Arama / Etiket Sonucu Bulunamadı'
                  : filter === 'unread'
                  ? 'Tüm Linkler Okundu!'
                  : filter === 'favorites'
                  ? 'Henüz Favori Linkiniz Yok'
                  : 'Henüz Link Eklenmedi'
              }
              description={
                search || selectedTag
                  ? 'Seçtiğiniz kriterlerle eşleşen bir kayıt bulunamadı.'
                  : filter === 'unread'
                  ? 'Tebrikler, tüm bağlantıları okudunuz.'
                  : filter === 'favorites'
                  ? 'Önemli linkleri yıldızlayarak buraya ekleyebilirsiniz.'
                  : 'Web tarayıcınızdan veya diğer uygulamalardan link paylaşarak hemen başlayın.'
              }
              actionLabel={search || selectedTag || filter !== 'all' ? undefined : 'Link Ekle'}
              onAction={search || selectedTag || filter !== 'all' ? undefined : () => router.push('/modal/add-link')}
            />
          ) : undefined
        }
      />

      {/* Bulk Action Bar during selection */}
      {isSelectionMode ? (
        <BulkActionBar
          selectedIds={selectedIds}
          totalCount={filteredLinks.length}
          onToggleSelectAll={handleToggleSelectAll}
          onBulkSetRead={handleBulkSetRead}
          onBulkSetFavorite={handleBulkSetFavorite}
          onBulkDelete={handleBulkDelete}
          onCancel={handleCancelSelection}
        />
      ) : (
        <FloatingActionButton onPress={() => router.push('/modal/add-link')} />
      )}
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
    paddingBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  screenTitle: {
    ...TYPOGRAPHY.screenTitle,
    marginBottom: 4,
  },
  subtitle: {
    ...TYPOGRAPHY.metadata,
    marginBottom: 12,
  },
  selectHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectHeaderBtnActive: {
    borderColor: COLORS.defaultAccent,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  selectHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  selectHeaderTextActive: {
    color: COLORS.defaultAccent,
  },
  searchBar: {
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 6,
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
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: COLORS.defaultAccent,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 110,
  },
});

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
import { Star, CheckSquare } from 'lucide-react-native';
import { LinkCard } from '../../components/LinkCard';
import { SearchBar } from '../../components/SearchBar';
import { EmptyState } from '../../components/EmptyState';
import { FloatingActionButton } from '../../components/FloatingActionButton';
import { TagFilterBar } from '../../components/TagFilterBar';
import { BulkActionBar } from '../../components/BulkActionBar';
import { COLORS, RADIUS, TOUCH, TYPOGRAPHY } from '../../constants/theme';
import { useLinksStore } from '../../stores/useLinksStore';

export default function FavoritesScreen() {
  const links = useLinksStore((state) => state.links);
  const isLoading = useLinksStore((state) => state.isLoading);
  const refresh = useLinksStore((state) => state.refresh);
  const bulkDelete = useLinksStore((state) => state.bulkDelete);
  const bulkSetRead = useLinksStore((state) => state.bulkSetRead);
  const bulkSetFavorite = useLinksStore((state) => state.bulkSetFavorite);

  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Multi-selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const favoriteLinks = useMemo(() => {
    return links.filter((l) => l.is_favorite === 1);
  }, [links]);

  // Derive unique tags from favorites
  const favoriteTags = useMemo(() => {
    const counts: Record<string, number> = {};
    favoriteLinks.forEach((l) => {
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
  }, [favoriteLinks]);

  const filtered = useMemo(() => {
    return favoriteLinks.filter((link) => {
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

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (link.title && link.title.toLowerCase().includes(q)) ||
        (link.description && link.description.toLowerCase().includes(q)) ||
        (link.clean_url && link.clean_url.toLowerCase().includes(q)) ||
        (link.folder_display_name && link.folder_display_name.toLowerCase().includes(q))
      );
    });
  }, [favoriteLinks, selectedTag, search]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

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
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((l) => l.id));
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
          <View style={styles.titleLeft}>
            <Text style={styles.screenTitle}>Favoriler</Text>
            <View style={styles.badge}>
              <Star size={12} color="#f59e0b" fill="#f59e0b" />
              <Text style={styles.badgeText}>{favoriteLinks.length}</Text>
            </View>
          </View>

          {filtered.length > 0 ? (
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

        <Text style={styles.subtitle}>
          Yıldızladığınız ve elinizin altında olmasını istediğiniz bağlantılar
        </Text>

        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Favorilerde ara..."
          style={styles.searchBar}
        />

        {/* Dynamic Tag Chips */}
        <TagFilterBar
          tags={favoriteTags}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
        />
      </View>

      {/* Favorites List */}
      <FlatList
        data={filtered}
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
            tintColor="#f59e0b"
            colors={['#f59e0b']}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon={Star}
              accentColor="#f59e0b"
              title={search || selectedTag ? 'Sonuç Bulunamadı' : 'Henüz Favori Yok'}
              description={
                search || selectedTag
                  ? 'Seçilen kriterlerle eşleşen bir favori bağlantı bulunamadı.'
                  : 'Beğendiğiniz veya sık başvurduğunuz linklerdeki yıldız ikonuna dokunarak favorilerinize ekleyebilirsiniz.'
              }
            />
          ) : undefined
        }
      />

      {/* Bulk Action Bar during selection */}
      {isSelectionMode ? (
        <BulkActionBar
          selectedIds={selectedIds}
          totalCount={filtered.length}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    marginBottom: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 110,
  },
});

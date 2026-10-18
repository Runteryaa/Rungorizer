import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ArrowLeft,
  Pin,
  Edit3,
  Trash2,
  Globe,
  Layers,
  CheckSquare,
  Folder,
  FolderOpen,
  FolderTree,
  X,
} from 'lucide-react-native';
import { LinkCard } from '../../components/LinkCard';
import { SearchBar } from '../../components/SearchBar';
import { EmptyState } from '../../components/EmptyState';
import { DynamicGlow } from '../../components/DynamicGlow';
import { FloatingActionButton } from '../../components/FloatingActionButton';
import { TagFilterBar } from '../../components/TagFilterBar';
import { BulkActionBar } from '../../components/BulkActionBar';
import { COLORS, RADIUS, SHADOWS, TOUCH, TYPOGRAPHY } from '../../constants/theme';
import { useLinksStore } from '../../stores/useLinksStore';
import { extractSubdomain, getSubdomainFolders } from '../../services/subdomainHelper';

export default function FolderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const folders = useLinksStore((state) => state.folders);
  const links = useLinksStore((state) => state.links);
  const updateFolder = useLinksStore((state) => state.updateFolder);
  const deleteFolder = useLinksStore((state) => state.deleteFolder);
  const bulkDelete = useLinksStore((state) => state.bulkDelete);
  const bulkSetRead = useLinksStore((state) => state.bulkSetRead);
  const bulkSetFavorite = useLinksStore((state) => state.bulkSetFavorite);

  const folder = folders.find((f) => f.id === id);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'favorites'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedSubdomain, setSelectedSubdomain] = useState<string | null>(null);

  // Multi-selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  if (!folder) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Klasör bulunamadı</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const accent = folder.color || COLORS.defaultAccent;
  const isPinned = folder.is_pinned === 1;

  const folderLinks = useMemo(() => {
    return links.filter((l) => l.folder_id === folder.id);
  }, [links, folder.id]);

  // Derive unique tags from folder's links
  const folderTags = useMemo(() => {
    const counts: Record<string, number> = {};
    folderLinks.forEach((l) => {
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
  }, [folderLinks]);

  // Derive subdomain folders inside this root folder
  const subdomainFolders = useMemo(() => {
    return getSubdomainFolders(folderLinks);
  }, [folderLinks]);

  const filteredLinks = useMemo(() => {
    return folderLinks.filter((link) => {
      // 1. Subdomain folder filter
      if (selectedSubdomain) {
        const sub = extractSubdomain(link.clean_url || link.original_url);
        if (sub !== selectedSubdomain) return false;
      }

      // 2. Read / favorite filter
      if (filter === 'unread' && link.is_read === 1) return false;
      if (filter === 'favorites' && link.is_favorite !== 1) return false;

      // 3. Tag filter
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

      // 4. Search query
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (link.title && link.title.toLowerCase().includes(q)) ||
        (link.description && link.description.toLowerCase().includes(q)) ||
        (link.clean_url && link.clean_url.toLowerCase().includes(q))
      );
    });
  }, [folderLinks, selectedSubdomain, filter, selectedTag, search]);

  const handleTogglePin = async () => {
    await updateFolder(folder.id, { is_pinned: isPinned ? 0 : 1 });
  };

  const handleDeleteFolder = () => {
    Alert.alert(
      'Klasörü Sil',
      `"${folder.display_name}" klasörünü ve içerisindeki ${folderLinks.length} bağlantıyı silmek istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            await deleteFolder(folder.id);
            router.back();
          },
        },
      ]
    );
  };

  const handleToggleSelect = (linkId: string) => {
    setSelectedIds((prev) =>
      prev.includes(linkId) ? prev.filter((i) => i !== linkId) : [...prev, linkId]
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

      {/* Dynamic Ambient Glow at top matching folder color */}
      <DynamicGlow color={accent} intensity={0.25} style={styles.glowWrap}>
        {/* Navigation Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            hitSlop={TOUCH.hitSlop}
            onPress={() => router.back()}
            style={styles.circleBtn}
          >
            <ArrowLeft size={18} color="#ffffff" />
          </TouchableOpacity>

          <View style={styles.topRightActions}>
            {filteredLinks.length > 0 ? (
              <TouchableOpacity
                hitSlop={TOUCH.hitSlop}
                onPress={() => {
                  if (isSelectionMode) {
                    handleCancelSelection();
                  } else {
                    handleStartSelection();
                  }
                }}
                style={[styles.circleBtn, isSelectionMode && styles.selectActiveBtn]}
              >
                <CheckSquare
                  size={16}
                  color={isSelectionMode ? COLORS.defaultAccent : COLORS.textTertiary}
                />
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              hitSlop={TOUCH.hitSlop}
              onPress={handleTogglePin}
              style={[styles.circleBtn, isPinned && styles.pinActiveBtn]}
            >
              <Pin
                size={16}
                color={isPinned ? '#f59e0b' : COLORS.textTertiary}
                fill={isPinned ? '#f59e0b' : 'transparent'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              hitSlop={TOUCH.hitSlop}
              onPress={() =>
                router.push({
                  pathname: '/modal/edit-folder',
                  params: { id: folder.id },
                })
              }
              style={styles.circleBtn}
            >
              <Edit3 size={16} color={COLORS.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              hitSlop={TOUCH.hitSlop}
              onPress={handleDeleteFolder}
              style={[styles.circleBtn, styles.deleteCircleBtn]}
            >
              <Trash2 size={16} color={COLORS.destructive} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Folder Header Content */}
        <View style={styles.folderHero}>
          <View style={styles.heroRow}>
            <View style={styles.iconContainer}>
              {folder.icon_url ? (
                <Image
                  source={{ uri: folder.icon_url }}
                  style={styles.iconImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={[styles.fallbackIcon, { backgroundColor: `${accent}25` }]}>
                  <Globe size={24} color={accent} />
                </View>
              )}
            </View>

            <View style={styles.heroTextContainer}>
              <Text numberOfLines={1} style={styles.heroTitle}>
                {folder.display_name}
              </Text>
              <Text numberOfLines={1} style={styles.heroDomain}>
                {folder.domain} • {folderLinks.length} bağlantı
              </Text>
            </View>
          </View>
        </View>
      </DynamicGlow>

      {/* Subdomain Alt Klasörler Bölümü */}
      {subdomainFolders.length > 0 ? (
        <View style={styles.subdomainSection}>
          <View style={styles.subdomainHeaderRow}>
            <View style={styles.subdomainTitleRow}>
              <FolderTree size={14} color={accent} />
              <Text style={styles.subdomainSectionTitle}>ALT KLASÖRLER (SUBDOMAINS)</Text>
            </View>
            {selectedSubdomain ? (
              <TouchableOpacity
                hitSlop={TOUCH.hitSlop}
                onPress={() => setSelectedSubdomain(null)}
                style={styles.clearSubdomainBtn}
              >
                <Text style={styles.clearSubdomainText}>Tümünü Göster</Text>
                <X size={12} color={COLORS.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subdomainScroll}
          >
            {/* Tümü (Klasörün tamamı) */}
            <TouchableOpacity
              activeOpacity={TOUCH.activeOpacity}
              onPress={() => setSelectedSubdomain(null)}
              style={[
                styles.subdomainCard,
                selectedSubdomain === null && [
                  styles.subdomainCardActive,
                  { borderColor: accent },
                ],
              ]}
            >
              <View style={styles.subdomainCardTop}>
                <View style={[styles.subdomainIconBox, { backgroundColor: `${accent}22` }]}>
                  <FolderOpen size={16} color={accent} />
                </View>
                <View
                  style={[
                    styles.subdomainCountBadge,
                    selectedSubdomain === null
                      ? { backgroundColor: accent }
                      : { backgroundColor: COLORS.surfaceElevated },
                  ]}
                >
                  <Text
                    style={[
                      styles.subdomainCountText,
                      selectedSubdomain === null && { color: '#ffffff' },
                    ]}
                  >
                    {folderLinks.length}
                  </Text>
                </View>
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.subdomainCardName,
                  selectedSubdomain === null && styles.subdomainCardNameActive,
                ]}
              >
                Tümü
              </Text>
              <Text style={styles.subdomainCardDesc}>Tüm alt klasörler</Text>
            </TouchableOpacity>

            {/* Her Subdomain İçin Ayrı Klasör Kartı (youtube.com, m.youtube.com, music.youtube.com vb.) */}
            {subdomainFolders.map((sub) => {
              const isSelected = selectedSubdomain === sub.domain;
              return (
                <TouchableOpacity
                  key={sub.domain}
                  activeOpacity={TOUCH.activeOpacity}
                  onPress={() => setSelectedSubdomain(isSelected ? null : sub.domain)}
                  style={[
                    styles.subdomainCard,
                    isSelected && [
                      styles.subdomainCardActive,
                      { borderColor: accent },
                    ],
                  ]}
                >
                  <View style={styles.subdomainCardTop}>
                    <View style={[styles.subdomainIconBox, { backgroundColor: `${accent}22` }]}>
                      <Folder size={16} color={accent} />
                    </View>
                    <View
                      style={[
                        styles.subdomainCountBadge,
                        isSelected
                          ? { backgroundColor: accent }
                          : { backgroundColor: COLORS.surfaceElevated },
                      ]}
                    >
                      <Text
                        style={[
                          styles.subdomainCountText,
                          isSelected && { color: '#ffffff' },
                        ]}
                      >
                        {sub.count}
                      </Text>
                    </View>
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.subdomainCardName,
                      isSelected && styles.subdomainCardNameActive,
                    ]}
                  >
                    {sub.domain}
                  </Text>
                  <Text style={styles.subdomainCardDesc}>{sub.count} bağlantı</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Active subdomain breadcrumb badge */}
          {selectedSubdomain ? (
            <View style={styles.activeSubdomainBar}>
              <Text style={styles.activeSubdomainText}>
                Filtrelenen Alt Klasör:{' '}
                <Text style={{ color: accent, fontWeight: '700' }}>{selectedSubdomain}</Text>
              </Text>
              <TouchableOpacity
                hitSlop={TOUCH.hitSlop}
                onPress={() => setSelectedSubdomain(null)}
                style={styles.activeSubdomainClose}
              >
                <X size={12} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Search & Filter Bar */}
      <View style={styles.filterSection}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Bu klasör içinde ara..."
          style={styles.searchBar}
        />

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
              Tümü ({folderLinks.length})
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
              Okunmamış ({folderLinks.filter((l) => l.is_read === 0).length})
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
              Favoriler ({folderLinks.filter((l) => l.is_favorite === 1).length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Tag Chips within folder */}
        <TagFilterBar
          tags={folderTags}
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
            showDomainBadge={false}
            subdomainText={extractSubdomain(item.clean_url || item.original_url)}
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
        ListEmptyComponent={
          <EmptyState
            icon={Layers}
            title={search || selectedTag ? 'Sonuç Bulunamadı' : 'Klasör Boş'}
            description={
              search || selectedTag
                ? `Seçilen kriterlerle eşleşen bir kayıt bulunamadı.`
                : `Bu domaine (${folder.domain}) ait henüz kaydedilmiş bir link yok.`
            }
            actionLabel="Link Ekle"
            onAction={() => router.push('/modal/add-link')}
          />
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
  glowWrap: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    marginBottom: 12,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectActiveBtn: {
    borderColor: COLORS.defaultAccent,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  pinActiveBtn: {
    borderColor: 'rgba(245, 158, 11, 0.3)',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  deleteCircleBtn: {
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  folderHero: {
    paddingHorizontal: 16,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.card,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconImage: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  fallbackIcon: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextContainer: {
    flex: 1,
  },
  heroTitle: {
    ...TYPOGRAPHY.screenTitle,
    fontSize: 22,
    marginBottom: 3,
  },
  heroDomain: {
    ...TYPOGRAPHY.metadata,
  },
  subdomainSection: {
    paddingTop: 14,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  subdomainHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  subdomainTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subdomainSectionTitle: {
    ...TYPOGRAPHY.badge,
    color: COLORS.textTertiary,
  },
  clearSubdomainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 6,
  },
  clearSubdomainText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  subdomainScroll: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 8,
  },
  subdomainCard: {
    width: 140,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    ...SHADOWS.glass,
  },
  subdomainCardActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  subdomainCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  subdomainIconBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subdomainCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceElevated,
  },
  subdomainCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textTertiary,
  },
  subdomainCardName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  subdomainCardNameActive: {
    fontWeight: '800',
  },
  subdomainCardDesc: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
  activeSubdomainBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  activeSubdomainText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  activeSubdomainClose: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    ...TYPOGRAPHY.cardTitle,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADIUS.button,
  },
  backBtnText: {
    color: COLORS.defaultAccent,
    fontWeight: '600',
  },
});

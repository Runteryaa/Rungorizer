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
  ChevronDown,
  ChevronUp,
  Check,
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
  const [isSubdomainExpanded, setIsSubdomainExpanded] = useState(true);

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
      {subdomainFolders.length >= 2 ? (
        <View style={styles.subdomainSection}>
          <View style={styles.subdomainHeaderRow}>
            <TouchableOpacity
              activeOpacity={TOUCH.activeOpacity}
              onPress={() => setIsSubdomainExpanded((prev) => !prev)}
              style={styles.subdomainTitleRow}
            >
              <FolderTree size={15} color={accent} />
              <Text style={styles.subdomainSectionTitle}>
                Alt Klasörler ({subdomainFolders.length})
              </Text>
              {isSubdomainExpanded ? (
                <ChevronUp size={15} color={COLORS.textTertiary} />
              ) : (
                <ChevronDown size={15} color={COLORS.textTertiary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={TOUCH.activeOpacity}
              onPress={() => setIsSubdomainExpanded((prev) => !prev)}
              style={styles.collapseToggleBtn}
            >
              <Text style={styles.collapseToggleText}>
                {isSubdomainExpanded ? 'Gizle' : 'Göster'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Active subdomain breadcrumb badge */}
          {selectedSubdomain ? (
            <View style={styles.activeSubdomainBar}>
              <View style={styles.activeSubdomainLeft}>
                <Text style={styles.activeSubdomainLabel}>Filtrelenen:</Text>
                <Text numberOfLines={1} style={[styles.activeSubdomainValue, { color: accent }]}>
                  {selectedSubdomain}
                </Text>
              </View>
              <TouchableOpacity
                hitSlop={TOUCH.hitSlop}
                onPress={() => setSelectedSubdomain(null)}
                style={styles.activeSubdomainClose}
              >
                <X size={12} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Vertical list of subdomains when expanded */}
          {isSubdomainExpanded ? (
            <View style={styles.subdomainVerticalList}>
              {/* Tümü (Klasörün tamamı) */}
              <TouchableOpacity
                activeOpacity={TOUCH.activeOpacity}
                onPress={() => {
                  setSelectedSubdomain(null);
                  setIsSubdomainExpanded(false);
                }}
                style={[
                  styles.subdomainRow,
                  selectedSubdomain === null && [
                    styles.subdomainRowActive,
                    { borderColor: accent },
                  ],
                ]}
              >
                <View style={[styles.subdomainRowIconBox, { backgroundColor: `${accent}18` }]}>
                  <FolderOpen size={16} color={accent} />
                </View>
                <View style={styles.subdomainRowInfo}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.subdomainRowName,
                      selectedSubdomain === null && { color: accent, fontWeight: '700' },
                    ]}
                  >
                    Tümünü Göster
                  </Text>
                  <Text style={styles.subdomainRowDesc}>Tüm alt klasörlerdeki bağlantılar</Text>
                </View>
                <View
                  style={[
                    styles.subdomainRowCountBadge,
                    selectedSubdomain === null
                      ? { backgroundColor: accent }
                      : { backgroundColor: COLORS.surfaceElevated },
                  ]}
                >
                  <Text
                    style={[
                      styles.subdomainRowCountText,
                      selectedSubdomain === null && { color: '#ffffff' },
                    ]}
                  >
                    {folderLinks.length}
                  </Text>
                </View>
                {selectedSubdomain === null ? (
                  <View style={styles.subdomainRowCheck}>
                    <Check size={16} color={accent} />
                  </View>
                ) : null}
              </TouchableOpacity>

              {/* Her Subdomain İçin Ayrı Klasör Satırı (youtube.com, m.youtube.com vb.) */}
              {subdomainFolders.map((sub) => {
                const isSelected = selectedSubdomain === sub.domain;
                return (
                  <TouchableOpacity
                    key={sub.domain}
                    activeOpacity={TOUCH.activeOpacity}
                    onPress={() => {
                      setSelectedSubdomain(isSelected ? null : sub.domain);
                      setIsSubdomainExpanded(false);
                    }}
                    style={[
                      styles.subdomainRow,
                      isSelected && [
                        styles.subdomainRowActive,
                        { borderColor: accent },
                      ],
                    ]}
                  >
                    <View style={[styles.subdomainRowIconBox, { backgroundColor: `${accent}18` }]}>
                      <Folder size={16} color={accent} />
                    </View>
                    <View style={styles.subdomainRowInfo}>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.subdomainRowName,
                          isSelected && { color: accent, fontWeight: '700' },
                        ]}
                      >
                        {sub.domain}
                      </Text>
                      <Text style={styles.subdomainRowDesc}>{sub.count} bağlantı</Text>
                    </View>
                    <View
                      style={[
                        styles.subdomainRowCountBadge,
                        isSelected
                          ? { backgroundColor: accent }
                          : { backgroundColor: COLORS.surfaceElevated },
                      ]}
                    >
                      <Text
                        style={[
                          styles.subdomainRowCountText,
                          isSelected && { color: '#ffffff' },
                        ]}
                      >
                        {sub.count}
                      </Text>
                    </View>
                    {isSelected ? (
                      <View style={styles.subdomainRowCheck}>
                        <Check size={16} color={accent} />
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
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
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  subdomainHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  subdomainTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  subdomainSectionTitle: {
    ...TYPOGRAPHY.badge,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  collapseToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  collapseToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  subdomainVerticalList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  subdomainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.input,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
    ...SHADOWS.glass,
  },
  subdomainRowActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.10)',
  },
  subdomainRowIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subdomainRowInfo: {
    flex: 1,
  },
  subdomainRowName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  subdomainRowDesc: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
  subdomainRowCountBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceElevated,
  },
  subdomainRowCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textTertiary,
  },
  subdomainRowCheck: {
    marginLeft: 2,
  },
  activeSubdomainBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.input,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  activeSubdomainLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  activeSubdomainLabel: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  activeSubdomainValue: {
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
  },
  activeSubdomainClose: {
    width: 20,
    height: 20,
    borderRadius: 10,
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

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ArrowLeft,
  Pin,
  Edit3,
  Trash2,
  Globe,
  Layers,
} from 'lucide-react-native';
import { LinkCard } from '../../components/LinkCard';
import { SearchBar } from '../../components/SearchBar';
import { EmptyState } from '../../components/EmptyState';
import { DynamicGlow } from '../../components/DynamicGlow';
import { FloatingActionButton } from '../../components/FloatingActionButton';
import { COLORS, RADIUS, TOUCH, TYPOGRAPHY } from '../../constants/theme';
import { useLinksStore } from '../../stores/useLinksStore';

export default function FolderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const folders = useLinksStore((state) => state.folders);
  const links = useLinksStore((state) => state.links);
  const updateFolder = useLinksStore((state) => state.updateFolder);
  const deleteFolder = useLinksStore((state) => state.deleteFolder);

  const folder = folders.find((f) => f.id === id);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'favorites'>('all');

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

  const folderLinks = links.filter((l) => l.folder_id === folder.id);

  const filteredLinks = folderLinks.filter((link) => {
    if (filter === 'unread' && link.is_read === 1) return false;
    if (filter === 'favorites' && link.is_favorite !== 1) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (link.title && link.title.toLowerCase().includes(q)) ||
      (link.description && link.description.toLowerCase().includes(q)) ||
      (link.clean_url && link.clean_url.toLowerCase().includes(q))
    );
  });

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
      </View>

      {/* Links List */}
      <FlatList
        data={filteredLinks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <LinkCard link={item} showDomainBadge={false} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon={Layers}
            title={search ? 'Sonuç Bulunamadı' : 'Klasör Boş'}
            description={
              search
                ? `"${search}" ile eşleşen bir kayıt bulunamadı.`
                : `Bu domaine (${folder.domain}) ait henüz kaydedilmiş bir link yok.`
            }
            actionLabel="Link Ekle"
            onAction={() => router.push('/modal/add-link')}
          />
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
  glowWrap: {
    paddingBottom: 8,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  pinActiveBtn: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  deleteCircleBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  folderHero: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  iconImage: {
    width: 30,
    height: 30,
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
    marginBottom: 2,
  },
  heroDomain: {
    ...TYPOGRAPHY.metadata,
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 4,
  },
  searchBar: {
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
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
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 14,
  },
  backBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.button,
  },
  backBtnText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});

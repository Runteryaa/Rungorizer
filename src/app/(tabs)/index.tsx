import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { FolderPlus, Sparkles } from 'lucide-react-native';
import { FolderCard } from '../../components/FolderCard';
import { SearchBar } from '../../components/SearchBar';
import { EmptyState } from '../../components/EmptyState';
import { FloatingActionButton } from '../../components/FloatingActionButton';
import { COLORS, TYPOGRAPHY } from '../../constants/theme';
import { useLinksStore } from '../../stores/useLinksStore';
import { FolderRecord } from '../../db/schema';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 32 - 12) / 2;

export default function FoldersScreen() {
  const folders = useLinksStore((state) => state.folders);
  const links = useLinksStore((state) => state.links);
  const isLoading = useLinksStore((state) => state.isLoading);
  const refresh = useLinksStore((state) => state.refresh);

  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const filteredFolders = folders.filter((f) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      f.display_name.toLowerCase().includes(q) ||
      f.domain.toLowerCase().includes(q)
    );
  });

  const renderFolderItem = ({ item }: { item: FolderRecord }) => (
    <View style={styles.gridItem}>
      <FolderCard
        folder={item}
        onPress={() => router.push(`/folder/${item.id}`)}
        onLongPress={() => router.push({ pathname: '/modal/edit-folder', params: { id: item.id } })}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* Screen Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.brandTitle}>Rungorize</Text>
          <View style={styles.sparkleBadge}>
            <Sparkles size={12} color={COLORS.defaultAccent} />
            <Text style={styles.sparkleText}>Oto-Domain</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>
          {folders.length} domain klasörü • {links.length} kayıtlı bağlantı
        </Text>

        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Klasör veya domain ara..."
          style={styles.searchBar}
        />
      </View>

      {/* Folder Grid */}
      <FlatList
        data={filteredFolders}
        keyExtractor={(item) => item.id}
        renderItem={renderFolderItem}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={filteredFolders.length > 0 ? styles.columnWrapper : undefined}
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
              icon={FolderPlus}
              title={search ? 'Sonuç Bulunamadı' : 'Henüz Link Eklenmedi'}
              description={
                search
                  ? `"${search}" ile eşleşen bir domain klasörü bulunamadı.`
                  : 'Chrome, Twitter, YouTube gibi uygulamalardan "Paylaş" diyerek Rungorize\'ı seçin veya aşağıdaki (+) butonuna dokunun.'
              }
              actionLabel={search ? undefined : 'İlk Linki Ekle'}
              onAction={search ? undefined : () => router.push('/modal/add-link')}
            />
          ) : undefined
        }
      />

      {/* Floating Action Button */}
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
    paddingBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  brandTitle: {
    ...TYPOGRAPHY.screenTitle,
  },
  sparkleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  sparkleText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: COLORS.defaultAccent,
    textTransform: 'uppercase',
  },
  subtitle: {
    ...TYPOGRAPHY.metadata,
    marginBottom: 14,
  },
  searchBar: {
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 110, // Space for bottom tab bar and FAB
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  gridItem: {
    width: COLUMN_WIDTH,
  },
});

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  useColorScheme,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  AppState,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getColors } from '../src/constants/colors';
import { DomainCard } from '../src/components/DomainCard';
import { AddLinkModal } from '../src/components/AddLinkModal';
import { useDb } from '../src/context/DbContext';
import { getDomains } from '../src/db/database';
import { Domain } from '../src/types';

export default function HomeScreen() {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const router = useRouter();
  const { db, isReady, refreshKey } = useDb();

  const [domains, setDomains] = useState<Domain[]>([]);
  const [filtered, setFiltered] = useState<Domain[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const searchRef = useRef(search);
  searchRef.current = search;

  const loadDomains = useCallback(async () => {
    if (!db) return;
    try {
      const data = await getDomains(db);
      setDomains(data);
      const currentSearch = searchRef.current.trim().toLowerCase();
      if (currentSearch === '') {
        setFiltered(data);
      } else {
        setFiltered(data.filter((d) => d.domain.toLowerCase().includes(currentSearch)));
      }
    } catch (e) {
      console.warn('loadDomains error:', e);
    }
  }, [db]);

  // refreshKey değişince yükle
  useEffect(() => {
    if (isReady) loadDomains();
  }, [isReady, loadDomains, refreshKey]);

  // Ekrana odaklanıldığında hemen yükle ve odaklıyken 2 saniyede bir otomatik senkronize et
  useFocusEffect(
    useCallback(() => {
      if (isReady) loadDomains();
      const interval = setInterval(() => {
        if (isReady) loadDomains();
      }, 2000);
      return () => clearInterval(interval);
    }, [isReady, loadDomains])
  );

  // Uygulama arkaplandan öne geldiğinde listeyi yenile
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isReady) {
        loadDomains();
      }
    });
    return () => sub.remove();
  }, [isReady, loadDomains]);

  // Arama metni değiştikçe anlık filtrele
  const handleSearchChange = (text: string) => {
    setSearch(text);
    const q = text.trim().toLowerCase();
    if (q === '') {
      setFiltered(domains);
    } else {
      setFiltered(domains.filter((d) => d.domain.toLowerCase().includes(q)));
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDomains();
    setRefreshing(false);
  }, [loadDomains]);

  const totalLinks = domains.reduce((sum, d) => sum + d.count, 0);
  const totalUnread = domains.reduce((sum, d) => sum + d.unread_count, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.appName, { color: colors.text }]}>Rungorizer</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {totalLinks} link • {totalUnread} okunmamış
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/search')}
          >
            <Text style={styles.iconBtnText}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/favorites')}
          >
            <Text style={styles.iconBtnText}>⭐</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/settings')}
          >
            <Text style={styles.iconBtnText}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.inputBg }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          value={search}
          onChangeText={handleSearchChange}
          placeholder="Domain ara..."
          placeholderTextColor={colors.textTertiary}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Domains List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.domain}
        renderItem={({ item }) => (
          <DomainCard
            domain={item}
            onPress={() => router.push(`/domain/${encodeURIComponent(item.domain)}`)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔗</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Henüz link yok</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Tarayıcıdan bir link paylaşın ya da aşağıdaki + butonuna basın
            </Text>
          </View>
        }
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <AddLinkModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdded={() => {
          loadDomains();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: {
    fontSize: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  list: {
    paddingVertical: 8,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
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

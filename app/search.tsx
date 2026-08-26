import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  useColorScheme,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getColors } from '../src/constants/colors';
import { LinkCard } from '../src/components/LinkCard';
import { useDb } from '../src/context/DbContext';
import { searchLinks } from '../src/db/database';
import { Link } from '../src/types';

export default function SearchScreen() {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const router = useRouter();
  const { db } = useDb();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Link[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(
    async (text: string) => {
      setQuery(text);
      if (text.trim().length < 2) {
        setResults([]);
        setSearched(false);
        return;
      }
      setLoading(true);
      try {
        if (!db) return;
        const data = await searchLinks(db, text.trim());
        setResults(data);
        setSearched(true);
      } finally {
        setLoading(false);
      }
    },
    [db]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.searchBar, { backgroundColor: colors.inputBg }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          value={query}
          onChangeText={handleSearch}
          placeholder="Başlık, URL veya domain ara..."
          placeholderTextColor={colors.textTertiary}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {loading && <ActivityIndicator size="small" color={colors.accent} />}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <LinkCard
            link={item}
            onPress={() => router.push(`/link/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          searched && !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Sonuç bulunamadı</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                "{query}" için eşleşen link yok
              </Text>
            </View>
          ) : !searched ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>💡</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Aramak için en az 2 karakter girin
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
  },
  searchIcon: { fontSize: 16, marginRight: 10 },
  input: { flex: 1, fontSize: 16 },
  list: { paddingVertical: 4, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center' },
});

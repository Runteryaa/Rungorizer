import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
  useColorScheme,
  SafeAreaView,
  ToastAndroid,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getColors } from '../src/constants/colors';
import { useDb } from '../src/context/DbContext';
import { clearAllData } from '../src/db/database';

export default function SettingsScreen() {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const router = useRouter();
  const { db, silentSave, setSilentSave, refresh } = useDb();
  const [clearing, setClearing] = useState(false);

  const handleClearAll = () => {
    Alert.alert(
      'Tüm Linkleri Sil',
      'Kaydedilen tüm linkler kalıcı olarak silinecektir. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Tümünü Sil',
          style: 'destructive',
          onPress: async () => {
            if (!db) return;
            setClearing(true);
            try {
              await clearAllData(db);
              refresh();
              if (Platform.OS === 'android') {
                ToastAndroid.show('Tüm linkler temizlendi.', ToastAndroid.SHORT);
              } else {
                Alert.alert('Başarılı', 'Tüm linkler silindi.');
              }
            } catch (err) {
              Alert.alert('Hata', 'Veriler silinirken bir sorun oluştu.');
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Paylaşım ve Kayıt Ayarları */}
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
          PAYLAŞIM & DAVRANIŞ
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.row}>
            <View style={styles.rowTextContainer}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>
                Sessiz Kaydetme (Arka Planda)
              </Text>
              <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>
                Açıkken, başka bir uygulamadan link paylaşıldığında Rungorizer açılmaz. Link sessizce arka planda kaydedilir ve altta küçük bir bildirim gösterilir.
              </Text>
            </View>
            <Switch
              value={silentSave}
              onValueChange={(val) => {
                setSilentSave(val);
                if (val && Platform.OS === 'android') {
                  ToastAndroid.show('Sessiz kaydetme aktif ⚡', ToastAndroid.SHORT);
                }
              }}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Veri Yönetimi */}
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
          VERİ YÖNETİMİ
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.dangerRow}
            onPress={handleClearAll}
            disabled={clearing}
          >
            <Text style={[styles.dangerText, { color: colors.destructive }]}>
              🗑️  Tüm Link Verilerini Temizle
            </Text>
          </TouchableOpacity>
        </View>

        {/* Uygulama Bilgisi */}
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
          HAKKINDA
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.infoRow, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Uygulama</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>Rungorizer</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Versiyon</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Paket Adı</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>com.runterya.rungorizer</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  rowTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  rowDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  dangerRow: {
    padding: 16,
    alignItems: 'center',
  },
  dangerText: {
    fontSize: 15,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});

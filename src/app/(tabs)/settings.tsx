import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Switch,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Sharing from 'expo-sharing';
import * as Updates from 'expo-updates';
import * as Clipboard from 'expo-clipboard';
import {
  Globe,
  ClipboardCheck,
  Download,
  Upload,
  RefreshCw,
  Info,
  ShieldCheck,
  Zap,
  Edit3,
} from 'lucide-react-native';
import { GlassCard } from '../../components/GlassCard';
import { COLORS, RADIUS, TOUCH, TYPOGRAPHY } from '../../constants/theme';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useLinksStore } from '../../stores/useLinksStore';

export default function SettingsScreen() {
  const openInAppBrowser = useSettingsStore((state) => state.openInAppBrowser);
  const setOpenInAppBrowser = useSettingsStore((state) => state.setOpenInAppBrowser);
  const autoDetect = useSettingsStore((state) => state.autoDetectClipboard);
  const setAutoDetect = useSettingsStore((state) => state.setAutoDetectClipboard);
  const shareMode = useSettingsStore((state) => state.shareMode);
  const setShareMode = useSettingsStore((state) => state.setShareMode);

  const exportBackup = useLinksStore((state) => state.exportBackup);
  const importBackup = useLinksStore((state) => state.importBackup);
  const showNotification = useLinksStore((state) => state.showNotification);
  const folders = useLinksStore((state) => state.folders);
  const links = useLinksStore((state) => state.links);

  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  // Backup Export
  const handleExport = async () => {
    try {
      const data = await exportBackup();
      const jsonString = JSON.stringify(data, null, 2);
      await Clipboard.setStringAsync(jsonString);
      showNotification('Yedek verisi panoya kopyalandı (JSON)', `${data.links.length} link, ${data.folders.length} klasör`, 'success');
    } catch (err) {
      console.error('Yedekleme hatası:', err);
      showNotification('Yedekleme alınırken hata oluştu', undefined, 'error');
    }
  };

  // Backup Import
  const handleImport = async () => {
    try {
      const clipboardText = await Clipboard.getStringAsync();
      if (!clipboardText || !clipboardText.trim().startsWith('{')) {
        Alert.alert(
          'Geçersiz Veri',
          'Panoda geçerli bir JSON yedek verisi bulunamadı. Lütfen önce JSON yedeğini panoya kopyalayın.'
        );
        return;
      }
      const parsed = JSON.parse(clipboardText);
      const res = await importBackup(parsed);
      Alert.alert('Başarılı', `${res.foldersCount} klasör ve ${res.linksCount} bağlantı içe aktarıldı.`);
    } catch {
      Alert.alert('Hata', 'Yedek dosyası ayrıştırılamadı. Lütfen geçerli bir JSON yedeği olduğundan emin olun.');
    }
  };

  // OTA Update Check with expo-updates
  const handleCheckUpdates = async () => {
    setIsCheckingUpdate(true);
    try {
      if (!Updates.isEnabled || __DEV__) {
        Alert.alert(
          'OTA Güncelleme Bilgisi',
          `Uygulama geliştirme / Expo modunda çalışmaktadır. OTA güncellemeleri yalnızca yayınlanan APK derlemelerinde etkindir.\n\n• Bağlı Kanal: ${Updates.channel || 'production'}\n• Runtime Sürümü: ${Updates.runtimeVersion || '1.0.0'}`
        );
        setIsCheckingUpdate(false);
        return;
      }

      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        Alert.alert(
          'Güncelleme Hazır',
          'Yeni bir güncelleme indirildi. Uygulamayı yeniden başlatmak ister misiniz?',
          [
            { text: 'Daha Sonra', style: 'cancel' },
            { text: 'Yeniden Başlat', onPress: () => Updates.reloadAsync() },
          ]
        );
      } else {
        showNotification('Uygulamanız güncel', 'En son sürümü kullanıyorsunuz', 'info');
      }
    } catch (err: any) {
      console.warn('OTA error:', err);
      Alert.alert(
        'Güncelleme Kontrolü',
        `EAS Update kontrol sonucu: ${err?.message || 'Güncelleme sunucusuna erişilemedi.'}\n\nKanal: ${Updates.channel || 'production'}`
      );
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Ayarlar</Text>
        <Text style={styles.subtitle}>Uygulama tercihleri, paylaşım modu ve yedekleme</Text>

        {/* 1. Android Paylaşım Davranışı */}
        <Text style={styles.sectionHeader}>ANDROİD PAYLAŞIM DAVRANIŞI</Text>
        <GlassCard style={styles.cardSection}>
          <View style={styles.settingRow}>
            <View
              style={[
                styles.settingIconBox,
                {
                  backgroundColor:
                    shareMode === 'silent'
                      ? 'rgba(59, 130, 246, 0.15)'
                      : 'rgba(236, 72, 153, 0.15)',
                },
              ]}
            >
              {shareMode === 'silent' ? (
                <Zap size={18} color={COLORS.defaultAccent} />
              ) : (
                <Edit3 size={18} color="#ec4899" />
              )}
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>
                {shareMode === 'silent' ? 'Sessiz Doğrudan Kayıt' : 'Özelleştirilebilir Kayıt'}
              </Text>
              <Text style={styles.settingDesc}>
                {shareMode === 'silent'
                  ? 'Paylaş menüsünden seçilince uygulama açılmadan arka planda sessizce kaydeder'
                  : 'Paylaş menüsünden seçilince uygulama açılarak not ve etiket ekleme penceresi sunar'}
              </Text>
            </View>
            <Switch
              value={shareMode === 'interactive'}
              onValueChange={(val) => setShareMode(val ? 'interactive' : 'silent')}
              trackColor={{ false: COLORS.defaultAccent, true: '#ec4899' }}
              thumbColor="#ffffff"
            />
          </View>
        </GlassCard>

        {/* 2. Tarayıcı ve Bağlantı Tercihleri */}
        <Text style={styles.sectionHeader}>BAĞLANTI VE TARAYICI</Text>
        <GlassCard style={styles.cardSection}>
          <View style={styles.settingRow}>
            <View style={styles.settingIconBox}>
              <Globe size={18} color={COLORS.defaultAccent} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Uygulama İçi Özel Sekme</Text>
              <Text style={styles.settingDesc}>
                Linkleri Chrome Custom Tabs ile uygulama içinde hızlıca açar
              </Text>
            </View>
            <Switch
              value={openInAppBrowser}
              onValueChange={setOpenInAppBrowser}
              trackColor={{ false: COLORS.surfaceElevated, true: COLORS.defaultAccent }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingIconBox}>
              <ClipboardCheck size={18} color="#10b981" />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Pano Otomatik Algılama</Text>
              <Text style={styles.settingDesc}>
                Uygulama açıldığında panodaki web adreslerini otomatik önerir
              </Text>
            </View>
            <Switch
              value={autoDetect}
              onValueChange={setAutoDetect}
              trackColor={{ false: COLORS.surfaceElevated, true: '#10b981' }}
              thumbColor="#ffffff"
            />
          </View>
        </GlassCard>

        {/* 3. Yedekleme ve Depolama (JSON) */}
        <Text style={styles.sectionHeader}>YEREL VERİ VE YEDEKLEME</Text>
        <GlassCard style={styles.cardSection}>
          <View style={styles.statsSummary}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{folders.length}</Text>
              <Text style={styles.statLabel}>Domain Klasörü</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{links.length}</Text>
              <Text style={styles.statLabel}>Toplam Link</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            activeOpacity={TOUCH.activeOpacity}
            onPress={handleExport}
            style={styles.actionRow}
          >
            <View style={[styles.settingIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <Download size={18} color={COLORS.defaultAccent} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={styles.actionTitle}>JSON Olarak Yedekle (Panoya Kopyala)</Text>
              <Text style={styles.settingDesc}>Tüm klasör ve bağlantı verilerini JSON formatında alır</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            activeOpacity={TOUCH.activeOpacity}
            onPress={handleImport}
            style={styles.actionRow}
          >
            <View style={[styles.settingIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Upload size={18} color="#10b981" />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={styles.actionTitle}>Panodan Yedeği İçe Aktar</Text>
              <Text style={styles.settingDesc}>Daha önce alınan JSON yedeğini veritabanına geri yükler</Text>
            </View>
          </TouchableOpacity>
        </GlassCard>

        {/* 4. Canlı Güncellemeler (expo-updates) */}
        <Text style={styles.sectionHeader}>GÜNCELLEMELER (EXPO-UPDATES)</Text>
        <GlassCard style={styles.cardSection}>
          <TouchableOpacity
            activeOpacity={TOUCH.activeOpacity}
            onPress={handleCheckUpdates}
            disabled={isCheckingUpdate}
            style={styles.actionRow}
          >
            <View style={[styles.settingIconBox, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
              <RefreshCw size={18} color="#8b5cf6" />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={styles.actionTitle}>
                {isCheckingUpdate ? 'Kontrol Ediliyor...' : 'Güncellemeleri Denetle'}
              </Text>
              <Text style={styles.settingDesc}>
                Kanal: {Updates.channel || 'production'} • Sürüm: {Updates.runtimeVersion || '1.0.0'}
              </Text>
            </View>
          </TouchableOpacity>
        </GlassCard>

        {/* 5. Gizlilik ve Mimari */}
        <Text style={styles.sectionHeader}>MİMARİ VE GİZLİLİK</Text>
        <GlassCard style={styles.cardSection}>
          <View style={styles.infoRow}>
            <ShieldCheck size={20} color="#10b981" style={{ marginRight: 12 }} />
            <Text style={styles.infoText}>
              Rungorize %100 <Text style={{ fontWeight: '700', color: '#ffffff' }}>Local-First</Text> mimariye sahiptir.
              Linkleriniz, başlıklarınız ve notlarınız hiçbir üçüncü taraf sunucuya gönderilmez; tamamen cihazınızdaki yerel SQLite veritabanında saklanır.
            </Text>
          </View>
        </GlassCard>

        <View style={styles.appFooter}>
          <Text style={styles.footerBrand}>Rungorize</Text>
          <Text style={styles.footerVersion}>Sürüm 1.0.0 (Android Native / Expo 58)</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background, // AMOLED #09090b
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110,
  },
  screenTitle: {
    ...TYPOGRAPHY.screenTitle,
    marginBottom: 4,
  },
  subtitle: {
    ...TYPOGRAPHY.metadata,
    marginBottom: 20,
  },
  sectionHeader: {
    ...TYPOGRAPHY.badge,
    color: COLORS.textTertiary,
    marginBottom: 8,
    marginLeft: 4,
  },
  cardSection: {
    padding: 14,
    marginBottom: 22,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  settingTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  actionTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 12.5,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  appFooter: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  footerBrand: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textTertiary,
  },
  footerVersion: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});

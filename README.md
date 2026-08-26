# Rungorizer 🔗

Link kategorileme ve yönetim uygulaması. Linkleri domain bazlı klasör sisteminde sakla, metadata'larını otomatik çek.

## Özellikler

- 📂 **Domain Klasörleri** – Linkler otomatik olarak domain'e göre gruplandırılır
- 🔗 **Share Extension** – Herhangi bir tarayıcıdan "Paylaş" butonu ile direkt ekle
- 🕷️ **Metadata Fetch** – Title, description, favicon ve og:image otomatik çekilir
- 💾 **SQLite** – Tüm veriler yerel olarak saklanır (expo-sqlite)
- ⭐ **Favoriler** – Linkleri favorilere ekle
- ✅ **Okundu Takibi** – Hangi linkleri açtığını takip et
- 🔍 **Arama** – Title, URL ve description içinde arama
- 🌙 **Dark Mode** – Sistem temasını otomatik takip eder

## Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Expo Go ile çalıştır (share intent desteği sınırlı)
npx expo start

# Android development build (share intent için)
npx expo run:android

# iOS development build
npx expo run:ios
```

## Share Extension Notu

Share extension özelliği **development build** gerektirir. Expo Go'da manuel link ekleme (+ butonu) çalışır ancak tarayıcıdan paylaşım için native build gereklidir.

```bash
# Development build oluştur
npx expo install --fix
npx eas build --profile development --platform android
```

## Proje Yapısı

```
linkgorize/
├── app/                    # expo-router ekranları
│   ├── _layout.tsx         # Root layout
│   ├── index.tsx           # Ana ekran (domain klasörleri)
│   ├── search.tsx          # Arama ekranı
│   ├── favorites.tsx       # Favoriler
│   ├── domain/[domain].tsx # Domain detay ekranı
│   └── link/[id].tsx       # Link detay ekranı
└── src/
    ├── components/         # UI bileşenleri
    ├── constants/          # Renkler, sabitler
    ├── context/            # React context (DB, ShareIntent)
    ├── db/                 # SQLite işlemleri
    ├── services/           # Metadata fetch servisi
    └── types/              # TypeScript tipleri
```

## Teknolojiler

| Paket | Kullanım |
|---|---|
| Expo SDK 54 | Temel framework |
| expo-router v4 | Navigasyon |
| expo-sqlite | Yerel veritabanı |
| expo-share-intent | URL paylaşımı alma |
| react-native-reanimated | Animasyonlar |
| TypeScript | Tip güvenliği |

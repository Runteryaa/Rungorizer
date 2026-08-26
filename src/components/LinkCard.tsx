import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  useColorScheme,
} from 'react-native';
import { Link } from '../types';
import { getColors } from '../constants/colors';

interface LinkCardProps {
  link: Link;
  onPress: () => void;
  onLongPress?: () => void;
}

export function LinkCard({ link, onPress, onLongPress }: LinkCardProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);

  const timeAgo = formatTimeAgo(link.created_at);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: link.is_read ? 0.7 : 1,
        },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      {link.og_image ? (
        <Image source={{ uri: link.og_image }} style={styles.ogImage} />
      ) : null}

      <View style={styles.body}>
        <View style={styles.header}>
          {link.favicon ? (
            <Image source={{ uri: link.favicon }} style={styles.favicon} />
          ) : (
            <View style={[styles.faviconPlaceholder, { backgroundColor: colors.accent + '22' }]}>
              <Text style={{ color: colors.accent, fontSize: 10, fontWeight: '700' }}>
                {link.domain.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={[styles.domain, { color: colors.textSecondary }]} numberOfLines={1}>
            {link.domain}
          </Text>
          {link.is_favorite === 1 && (
            <Text style={styles.star}>⭐</Text>
          )}
          {link.is_read === 0 && (
            <View style={[styles.unreadDot, { backgroundColor: colors.accent }]} />
          )}
        </View>

        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {link.title ?? link.url}
        </Text>

        {link.description ? (
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
            {link.description}
          </Text>
        ) : null}

        <Text style={[styles.time, { color: colors.textTertiary }]}>{timeAgo}</Text>
      </View>
    </TouchableOpacity>
  );
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Az önce';
  if (minutes < 60) return `${minutes} dakika önce`;
  if (hours < 24) return `${hours} saat önce`;
  if (days < 7) return `${days} gün önce`;
  return new Date(timestamp).toLocaleDateString('tr-TR');
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 5,
    overflow: 'hidden',
  },
  ogImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#eee',
  },
  body: {
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  favicon: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 6,
  },
  faviconPlaceholder: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  domain: {
    fontSize: 12,
    flex: 1,
  },
  star: {
    fontSize: 12,
    marginLeft: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  time: {
    fontSize: 11,
  },
});

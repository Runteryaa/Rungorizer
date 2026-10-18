import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Pin, ChevronRight, Globe } from 'lucide-react-native';
import { FolderRecord } from '../db/schema';
import { COLORS, RADIUS, SHADOWS, TOUCH, TYPOGRAPHY } from '../constants/theme';

interface FolderCardProps {
  folder: FolderRecord;
  onPress: () => void;
  onLongPress?: () => void;
}

export function FolderCard({ folder, onPress, onLongPress }: FolderCardProps) {
  const accent = folder.color || COLORS.defaultAccent;
  const isPinned = folder.is_pinned === 1;

  return (
    <TouchableOpacity
      activeOpacity={TOUCH.activeOpacity}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.card, { borderColor: `${accent}35` }]}
    >
      {/* Top subtle glow strip */}
      <View style={[styles.glowStrip, { backgroundColor: accent }]} />

      <View style={styles.headerRow}>
        <View style={styles.iconContainer}>
          {folder.icon_url ? (
            <Image
              source={{ uri: folder.icon_url }}
              style={styles.iconImage}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.fallbackIcon, { backgroundColor: `${accent}25` }]}>
              <Globe size={18} color={accent} />
            </View>
          )}
        </View>

        <View style={styles.badgeRow}>
          {isPinned ? (
            <View style={styles.pinBadge}>
              <Pin size={11} color="#f59e0b" fill="#f59e0b" />
            </View>
          ) : null}
          <View style={[styles.countBadge, { backgroundColor: `${accent}20` }]}>
            <Text style={[styles.countText, { color: accent }]}>
              {folder.link_count || 0}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.infoArea}>
        <Text numberOfLines={1} style={styles.displayName}>
          {folder.display_name}
        </Text>
        <Text numberOfLines={1} style={styles.domainName}>
          {folder.domain}
        </Text>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.viewText}>Klasörü Gör</Text>
        <ChevronRight size={14} color={COLORS.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface, // Zinc-900 (#18181b)
    borderRadius: RADIUS.card, // 22px squircle
    borderWidth: 1,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
    ...SHADOWS.glass,
  },
  glowStrip: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 2.5,
    borderRadius: 2,
    opacity: 0.8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconImage: {
    width: 24,
    height: 24,
  },
  fallbackIcon: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pinBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: RADIUS.badge,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
  },
  infoArea: {
    marginBottom: 12,
  },
  displayName: {
    ...TYPOGRAPHY.cardTitle,
    marginBottom: 3,
  },
  domainName: {
    ...TYPOGRAPHY.metadata,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 10,
    marginTop: 4,
  },
  viewText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textTertiary,
  },
});

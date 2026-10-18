import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Share,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import {
  Star,
  CheckCircle,
  Share2,
  Trash2,
  Copy,
  CheckSquare,
  Square,
  Tag,
} from 'lucide-react-native';
import { LinkRecord } from '../db/schema';
import { COLORS, RADIUS, SHADOWS, TOUCH, TYPOGRAPHY } from '../constants/theme';
import { useLinksStore } from '../stores/useLinksStore';
import { useSettingsStore } from '../stores/useSettingsStore';

interface LinkCardProps {
  link: LinkRecord;
  showDomainBadge?: boolean;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  onLongPress?: () => void;
  onTagPress?: (tag: string) => void;
}

export function LinkCard({
  link,
  showDomainBadge = false,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
  onLongPress,
  onTagPress,
}: LinkCardProps) {
  const toggleFavorite = useLinksStore((state) => state.toggleFavorite);
  const toggleRead = useLinksStore((state) => state.toggleRead);
  const markAsRead = useLinksStore((state) => state.markAsRead);
  const deleteLink = useLinksStore((state) => state.deleteLink);
  const showNotification = useLinksStore((state) => state.showNotification);
  const openInAppBrowser = useSettingsStore((state) => state.openInAppBrowser);

  const isFav = link.is_favorite === 1;
  const isRead = link.is_read === 1;
  const accent = link.folder_color || COLORS.defaultAccent;

  const tagsList = useMemo(() => {
    try {
      const parsed = JSON.parse(link.tags || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [link.tags]);

  const handlePress = async () => {
    if (isSelectionMode) {
      onToggleSelect?.(link.id);
      return;
    }

    try {
      const targetUrl = link.clean_url || link.original_url;

      // Automatically mark as read when link is opened
      if (!isRead) {
        markAsRead(link.id);
      }

      if (openInAppBrowser) {
        await WebBrowser.openBrowserAsync(targetUrl, {
          toolbarColor: '#09090b',
          controlsColor: '#ffffff',
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
          enableBarCollapsing: true,
        });
      } else {
        await Linking.openURL(targetUrl);
      }
    } catch (err) {
      console.error('Link açma hatası:', err);
    }
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(link.clean_url || link.original_url);
    showNotification('Bağlantı panoya kopyalandı', undefined, 'info');
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: link.title || 'Paylaşılan Link',
        message: link.clean_url || link.original_url,
      });
    } catch {
      // ignore
    }
  };

  const formattedDate = new Date(link.created_at).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <TouchableOpacity
      activeOpacity={TOUCH.activeOpacity}
      onPress={handlePress}
      onLongPress={onLongPress}
      style={[
        styles.card,
        isRead && styles.cardRead,
        isSelected && styles.cardSelected,
      ]}
    >
      <View style={styles.mainRow}>
        {/* Selection Checkbox on Left */}
        {isSelectionMode ? (
          <TouchableOpacity
            hitSlop={TOUCH.hitSlop}
            onPress={() => onToggleSelect?.(link.id)}
            style={styles.checkboxContainer}
          >
            {isSelected ? (
              <CheckSquare size={20} color={COLORS.defaultAccent} />
            ) : (
              <Square size={20} color={COLORS.textTertiary} />
            )}
          </TouchableOpacity>
        ) : null}

        {/* Left/Main Content */}
        <View style={styles.textContainer}>
          <View style={styles.topMetaRow}>
            {showDomainBadge && link.folder_display_name ? (
              <View style={styles.domainBadgeRow}>
                {link.favicon_url ? (
                  <Image
                    source={{ uri: link.favicon_url }}
                    style={styles.badgeFavicon}
                    resizeMode="contain"
                  />
                ) : null}
                <Text style={[styles.domainBadgeText, { color: accent }]}>
                  {link.folder_display_name}
                </Text>
              </View>
            ) : null}

            {/* Unread indicator dot */}
            {!isRead ? (
              <View style={styles.unreadDot} />
            ) : null}
          </View>

          <Text
            numberOfLines={2}
            style={[styles.title, isRead && styles.titleRead]}
          >
            {link.title || link.clean_url}
          </Text>

          {link.description ? (
            <Text numberOfLines={2} style={styles.description}>
              {link.description}
            </Text>
          ) : null}

          {/* Tags list row */}
          {tagsList.length > 0 ? (
            <View style={styles.tagsRow}>
              {tagsList.map((tag: string) => (
                <TouchableOpacity
                  key={tag}
                  activeOpacity={0.7}
                  onPress={() => onTagPress?.(tag)}
                  style={styles.tagPill}
                >
                  <Tag size={10} color={COLORS.textTertiary} />
                  <Text style={styles.tagPillText}>#{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>

        {/* Right Thumbnail Image if available */}
        {link.image_url ? (
          <View style={styles.thumbContainer}>
            <Image
              source={{ uri: link.image_url }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          </View>
        ) : null}
      </View>

      {/* Footer bar with metadata & actions */}
      <View style={styles.footerRow}>
        <View style={styles.metaLeft}>
          <Text style={styles.dateText}>{formattedDate}</Text>
          {isRead ? (
            <View style={styles.readBadge}>
              <Text style={styles.readBadgeText}>Okundu</Text>
            </View>
          ) : (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>Okunmadı</Text>
            </View>
          )}
        </View>

        {!isSelectionMode ? (
          <View style={styles.actionsRight}>
            <TouchableOpacity
              hitSlop={TOUCH.hitSlop}
              onPress={handleCopy}
              style={styles.actionBtn}
            >
              <Copy size={16} color={COLORS.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              hitSlop={TOUCH.hitSlop}
              onPress={handleShare}
              style={styles.actionBtn}
            >
              <Share2 size={16} color={COLORS.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              hitSlop={TOUCH.hitSlop}
              onPress={() => toggleRead(link.id)}
              style={styles.actionBtn}
            >
              <CheckCircle
                size={17}
                color={isRead ? COLORS.success : COLORS.textTertiary}
                fill={isRead ? `${COLORS.success}25` : 'transparent'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              hitSlop={TOUCH.hitSlop}
              onPress={() => toggleFavorite(link.id)}
              style={styles.actionBtn}
            >
              <Star
                size={17}
                color={isFav ? '#f59e0b' : COLORS.textTertiary}
                fill={isFav ? '#f59e0b' : 'transparent'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              hitSlop={TOUCH.hitSlop}
              onPress={() => deleteLink(link.id)}
              style={[styles.actionBtn, styles.deleteBtn]}
            >
              <Trash2 size={16} color={COLORS.destructive} />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface, // Zinc-900 (#18181b)
    borderRadius: RADIUS.card, // 22px squircle
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 12,
    ...SHADOWS.glass,
  },
  cardRead: {
    opacity: 0.82,
  },
  cardSelected: {
    borderColor: COLORS.defaultAccent,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  checkboxContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 4,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textContainer: {
    flex: 1,
  },
  topMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  domainBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeFavicon: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  domainBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.defaultAccent,
    shadowColor: COLORS.defaultAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    ...TYPOGRAPHY.listItemTitle,
    lineHeight: 20,
    marginBottom: 4,
  },
  titleRead: {
    color: '#d4d4d8',
  },
  description: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  tagPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  thumbContainer: {
    width: 82,
    height: 82,
    borderRadius: RADIUS.input,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: COLORS.textTertiary,
  },
  readBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.badge,
  },
  readBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.success,
  },
  unreadBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.badge,
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.defaultAccent,
  },
  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionBtn: {
    padding: 3,
  },
  deleteBtn: {
    marginLeft: 2,
  },
});

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Domain } from '../types';
import { useColorScheme } from 'react-native';
import { getColors } from '../constants/colors';

interface DomainCardProps {
  domain: Domain;
  onPress: () => void;
}

export function DomainCard({ domain, onPress }: DomainCardProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        {domain.favicon ? (
          <Image
            source={{ uri: domain.favicon }}
            style={styles.favicon}
          />
        ) : (
          <View style={[styles.faviconPlaceholder, { backgroundColor: colors.accent + '22' }]}>
            <Text style={[styles.faviconLetter, { color: colors.accent }]}>
              {domain.domain.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={[styles.domainName, { color: colors.text }]} numberOfLines={1}>
          {domain.domain}
        </Text>
        <Text style={[styles.count, { color: colors.textSecondary }]}>
          {domain.count} link
        </Text>
      </View>

      {domain.unread_count > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.accent }]}>
          <Text style={styles.badgeText}>{domain.unread_count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 5,
  },
  iconContainer: {
    marginRight: 12,
  },
  favicon: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  faviconPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faviconLetter: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  domainName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  count: {
    fontSize: 12,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});

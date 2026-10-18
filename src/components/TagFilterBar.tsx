import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Tag } from 'lucide-react-native';
import { COLORS, RADIUS, TOUCH } from '../constants/theme';

interface TagFilterBarProps {
  tags: { name: string; count: number }[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
}

export function TagFilterBar({
  tags,
  selectedTag,
  onSelectTag,
}: TagFilterBarProps) {
  if (tags.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* All / Tümü Chip */}
        <TouchableOpacity
          activeOpacity={TOUCH.activeOpacity}
          onPress={() => onSelectTag(null)}
          style={[
            styles.chip,
            selectedTag === null && styles.chipActive,
          ]}
        >
          <Text
            style={[
              styles.chipText,
              selectedTag === null && styles.chipTextActive,
            ]}
          >
            Tümü
          </Text>
        </TouchableOpacity>

        {/* Custom Tag Chips */}
        {tags.map((t) => {
          const isSelected = selectedTag === t.name;
          return (
            <TouchableOpacity
              key={t.name}
              activeOpacity={TOUCH.activeOpacity}
              onPress={() => onSelectTag(isSelected ? null : t.name)}
              style={[
                styles.chip,
                isSelected && styles.chipActive,
              ]}
            >
              <Tag
                size={12}
                color={isSelected ? '#ffffff' : COLORS.textTertiary}
                style={{ marginRight: 5 }}
              />
              <Text
                style={[
                  styles.chipText,
                  isSelected && styles.chipTextActive,
                ]}
              >
                #{t.name}
              </Text>
              <View
                style={[
                  styles.countBadge,
                  isSelected && styles.countBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    isSelected && styles.countTextActive,
                  ]}
                >
                  {t.count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.20)',
    borderColor: COLORS.defaultAccent,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  countBadge: {
    marginLeft: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceElevated,
  },
  countBadgeActive: {
    backgroundColor: COLORS.defaultAccent,
  },
  countText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textTertiary,
  },
  countTextActive: {
    color: '#ffffff',
  },
});

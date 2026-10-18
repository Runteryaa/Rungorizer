import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  CheckCircle,
  Circle,
  Star,
  Trash2,
  CheckSquare,
  Square,
  X,
} from 'lucide-react-native';
import { COLORS, RADIUS, SHADOWS, TOUCH, TYPOGRAPHY } from '../constants/theme';

interface BulkActionBarProps {
  selectedIds: string[];
  totalCount: number;
  onToggleSelectAll: () => void;
  onBulkSetRead: (isRead: boolean) => void;
  onBulkSetFavorite: (isFavorite: boolean) => void;
  onBulkDelete: () => void;
  onCancel: () => void;
}

export function BulkActionBar({
  selectedIds,
  totalCount,
  onToggleSelectAll,
  onBulkSetRead,
  onBulkSetFavorite,
  onBulkDelete,
  onCancel,
}: BulkActionBarProps) {
  const isAllSelected = totalCount > 0 && selectedIds.length === totalCount;
  const count = selectedIds.length;

  const confirmDelete = () => {
    if (count === 0) return;
    Alert.alert(
      'Bağlantıları Sil',
      `Seçilen ${count} bağlantıyı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: onBulkDelete },
      ]
    );
  };

  return (
    <View style={styles.floatingContainer}>
      <View style={styles.glassBar}>
        {/* Top summary row */}
        <View style={styles.topRow}>
          <TouchableOpacity
            activeOpacity={TOUCH.activeOpacity}
            onPress={onToggleSelectAll}
            style={styles.selectAllBtn}
          >
            {isAllSelected ? (
              <CheckSquare size={16} color={COLORS.defaultAccent} />
            ) : (
              <Square size={16} color={COLORS.textTertiary} />
            )}
            <Text style={styles.selectAllText}>
              {isAllSelected ? 'Seçimi Bırak' : 'Tümünü Seç'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.countText}>{count} seçildi</Text>

          <TouchableOpacity
            hitSlop={TOUCH.hitSlop}
            onPress={onCancel}
            style={styles.closeBtn}
          >
            <X size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Action icons row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            activeOpacity={TOUCH.activeOpacity}
            disabled={count === 0}
            onPress={() => onBulkSetRead(true)}
            style={[styles.actionBtn, count === 0 && styles.disabledBtn]}
          >
            <CheckCircle size={18} color={COLORS.success} />
            <Text style={styles.actionLabel}>Okundu</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={TOUCH.activeOpacity}
            disabled={count === 0}
            onPress={() => onBulkSetRead(false)}
            style={[styles.actionBtn, count === 0 && styles.disabledBtn]}
          >
            <Circle size={18} color={COLORS.textSecondary} />
            <Text style={styles.actionLabel}>Okunmadı</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={TOUCH.activeOpacity}
            disabled={count === 0}
            onPress={() => onBulkSetFavorite(true)}
            style={[styles.actionBtn, count === 0 && styles.disabledBtn]}
          >
            <Star size={18} color="#f59e0b" fill="#f59e0b" />
            <Text style={styles.actionLabel}>Favorile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={TOUCH.activeOpacity}
            disabled={count === 0}
            onPress={confirmDelete}
            style={[styles.actionBtn, styles.deleteBtn, count === 0 && styles.disabledBtn]}
          >
            <Trash2 size={18} color={COLORS.destructive} />
            <Text style={[styles.actionLabel, { color: COLORS.destructive }]}>Sil</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  glassBar: {
    backgroundColor: 'rgba(24, 24, 27, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: RADIUS.card,
    paddingVertical: 12,
    paddingHorizontal: 16,
    ...SHADOWS.glass,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectAllText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 10,
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  disabledBtn: {
    opacity: 0.35,
  },
  deleteBtn: {},
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});

import React from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import { COLORS, RADIUS, TOUCH } from '../constants/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Link, başlık veya domain ara...',
  style,
}: SearchBarProps) {
  return (
    <View style={[styles.container, style]}>
      <Search size={18} color={COLORS.textTertiary} style={styles.searchIcon} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textTertiary}
        style={styles.input}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 ? (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          hitSlop={TOUCH.hitSlop}
          style={styles.clearBtn}
        >
          <X size={16} color={COLORS.textTertiary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface, // Zinc-900 (#18181b)
    borderRadius: RADIUS.input, // 14px squircle
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 48,
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14.5,
    fontWeight: '500',
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
    backgroundColor: COLORS.surfaceHighlight,
    borderRadius: RADIUS.pill,
  },
});

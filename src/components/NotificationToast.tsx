import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Animated,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react-native';
import { FrostedBlurView } from './FrostedBlurView';
import { COLORS, RADIUS, SHADOWS, TOUCH } from '../constants/theme';
import { useLinksStore } from '../stores/useLinksStore';

export function NotificationToast() {
  const notification = useLinksStore((state) => state.notification);
  const dismissNotification = useLinksStore((state) => state.dismissNotification);

  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (notification) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 70,
          friction: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        handleDismiss();
      }, 3500);

      return () => clearTimeout(timer);
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -100,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [notification]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      dismissNotification();
    });
  };

  if (!notification) return null;

  const isSuccess = notification.type === 'success';
  const isError = notification.type === 'error';
  const accentColor = isSuccess ? COLORS.success : isError ? COLORS.destructive : COLORS.defaultAccent;

  return (
    <SafeAreaView pointerEvents="box-none" style={styles.safeContainer}>
      <Animated.View
        style={[
          styles.animatedWrap,
          {
            transform: [{ translateY }],
            opacity,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleDismiss}
          style={styles.touchable}
        >
          <FrostedBlurView
            intensity={80}
            style={[styles.toastCard, { borderColor: `${accentColor}55` }]}
          >
            <View style={styles.contentRow}>
              <View style={[styles.iconBox, { backgroundColor: `${accentColor}20` }]}>
                {isSuccess && <CheckCircle2 size={18} color={accentColor} />}
                {isError && <AlertCircle size={18} color={accentColor} />}
                {!isSuccess && !isError && <Info size={18} color={accentColor} />}
              </View>

              <View style={styles.textColumn}>
                <Text numberOfLines={1} style={styles.titleText}>
                  {notification.message}
                </Text>
                {notification.subMessage ? (
                  <Text numberOfLines={1} style={styles.subText}>
                    {notification.subMessage}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={handleDismiss}
                hitSlop={TOUCH.hitSlop}
                style={styles.closeBtn}
              >
                <X size={16} color={COLORS.textTertiary} />
              </TouchableOpacity>
            </View>
          </FrostedBlurView>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  animatedWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  touchable: {
    ...SHADOWS.glass,
  },
  toastCard: {
    borderRadius: RADIUS.button,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textColumn: {
    flex: 1,
    marginRight: 8,
  },
  titleText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
});

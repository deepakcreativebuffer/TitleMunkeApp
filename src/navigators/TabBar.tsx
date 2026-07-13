import React from 'react';
import {View, Text, Image, TouchableOpacity, StyleSheet} from 'react-native';
import {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {appColors, typography, scaleWidth} from '../global';
import {useAppSelector} from '../store';
import {totalUnreadSelector} from '../slices';

const ICONS: Record<string, number> = {
  Home: require('../assets/images/ic-home.png'),
  SearchHistory: require('../assets/images/ic-clock.png'),
  NearbySearch: require('../assets/images/ic-pin.png'),
};

// Outline chat bubble drawn in code — matches the stroke style of the other
// tab icons (the old ic-message.png was a heavy solid bubble that stood out).
const ChatIcon = ({color, size}: {color: string; size: number}) => {
  const stroke = Math.max(1.6, size * 0.092);
  const dot = size * 0.11;
  return (
    <View style={{width: size, height: size}}>
      <View
        style={{
          width: size,
          height: size * 0.72,
          borderWidth: stroke,
          borderColor: color,
          borderRadius: size * 0.3,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {[0, 1, 2].map(i => (
          <View
            key={i}
            style={{
              width: dot,
              height: dot,
              borderRadius: dot / 2,
              backgroundColor: color,
              marginHorizontal: size * 0.055,
            }}
          />
        ))}
      </View>
      {/* Tail */}
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.03,
          left: size * 0.2,
          width: 0,
          height: 0,
          borderTopWidth: size * 0.26,
          borderRightWidth: size * 0.2,
          borderTopColor: color,
          borderRightColor: 'transparent',
        }}
      />
    </View>
  );
};

// Friendly labels (route names can't carry a space).
const LABELS: Record<string, string> = {
  Home: 'Home',
  SearchHistory: 'Search History',
  Messages: 'Messages',
  NearbySearch: 'Nearby',
};

export const TabBar = ({state, navigation}: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();
  const totalUnread = useAppSelector(totalUnreadSelector);

  return (
    <View
      style={[
        styles.wrap,
        {bottom: Math.max(insets.bottom, scaleWidth(12))},
      ]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            activeOpacity={0.8}
            onPress={onPress}
            style={[styles.tab, focused && styles.tabActive]}>
            {route.name === 'Messages' ? (
              <View>
                <ChatIcon
                  color={focused ? appColors.maroon : appColors.coffeeLight}
                  size={scaleWidth(22)}
                />
                {totalUnread > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <Image
                source={ICONS[route.name]}
                style={[
                  styles.icon,
                  {
                    tintColor: focused
                      ? appColors.maroon
                      : appColors.coffeeLight,
                  },
                ]}
              />
            )}
            {focused ? (
              <Text style={styles.label}>{LABELS[route.name] ?? route.name}</Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: scaleWidth(20),
    right: scaleWidth(20),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(22),
    paddingVertical: scaleWidth(10),
    paddingHorizontal: scaleWidth(10),
    shadowColor: '#3d2014',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleWidth(10),
    paddingHorizontal: scaleWidth(14),
    borderRadius: scaleWidth(16),
  },
  tabActive: {
    backgroundColor: 'rgba(94,23,23,0.08)',
  },
  icon: {
    width: scaleWidth(22),
    height: scaleWidth(22),
  },
  badge: {
    position: 'absolute',
    top: -scaleWidth(6),
    right: -scaleWidth(10),
    minWidth: scaleWidth(16),
    height: scaleWidth(16),
    borderRadius: scaleWidth(8),
    backgroundColor: appColors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleWidth(4),
    borderWidth: scaleWidth(1.5),
    borderColor: appColors.white,
  },
  badgeText: {
    ...typography(700, 9.5, 'white'),
    fontWeight: '700',
  },
  label: {
    ...typography(600, 14, 'maroon'),
    fontWeight: '600',
    marginLeft: scaleWidth(8),
  },
});

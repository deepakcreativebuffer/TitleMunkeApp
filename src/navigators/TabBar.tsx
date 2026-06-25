import React from 'react';
import {View, Text, Image, TouchableOpacity, StyleSheet} from 'react-native';
import {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {appColors, typography, scaleWidth} from '../global';

const ICONS: Record<string, number> = {
  Home: require('../assets/images/ic-home.png'),
  SearchHistory: require('../assets/images/ic-clock.png'),
  Requests: require('../assets/images/ic-file.png'),
  Settings: require('../assets/images/ic-settings.png'),
};

// Friendly labels (route names can't carry a space).
const LABELS: Record<string, string> = {
  Home: 'Home',
  SearchHistory: 'Search History',
  Requests: 'Requests',
  Settings: 'Settings',
};

export const TabBar = ({state, navigation}: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();

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
            <Image
              source={ICONS[route.name]}
              style={[
                styles.icon,
                {tintColor: focused ? appColors.maroon : appColors.coffeeLight},
              ]}
            />
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
  label: {
    ...typography(600, 14, 'maroon'),
    fontWeight: '600',
    marginLeft: scaleWidth(8),
  },
});

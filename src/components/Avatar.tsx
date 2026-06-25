import React from 'react';
import {View, Text, StyleSheet, ViewStyle} from 'react-native';
import {appColors, scaleWidth} from '../global';

// Deterministic colored initials avatar — no image assets needed.
const PALETTE = [
  '#5E1717',
  '#8E2323',
  '#1E874B',
  '#A9821C',
  '#3D2014',
  '#2E5E88',
  '#7A3E9D',
  '#0F766E',
];

const getInitials = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');

const colorFor = (key: string): string => {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0;
  }
  return PALETTE[h % PALETTE.length];
};

interface Props {
  name: string;
  id?: string;
  size?: number;
  online?: boolean;
  style?: ViewStyle;
}

export const Avatar = ({name, id, size, online, style}: Props) => {
  const s = size ?? scaleWidth(48);
  const bg = colorFor(id ?? name);
  return (
    <View style={[{width: s, height: s}, style]}>
      <View
        style={[
          styles.circle,
          {width: s, height: s, borderRadius: s / 2, backgroundColor: bg},
        ]}>
        <Text style={[styles.initials, {fontSize: s * 0.38}]}>
          {getInitials(name)}
        </Text>
      </View>
      {online ? (
        <View
          style={[
            styles.dot,
            {
              width: s * 0.28,
              height: s * 0.28,
              borderRadius: s * 0.14,
              borderWidth: Math.max(1.5, s * 0.04),
            },
          ]}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  circle: {alignItems: 'center', justifyContent: 'center'},
  initials: {color: appColors.white, fontWeight: '700'},
  dot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: appColors.success,
    borderColor: appColors.white,
  },
});

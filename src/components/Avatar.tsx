import React, {useEffect, useState} from 'react';
import {View, Text, Image, StyleSheet, ViewStyle} from 'react-native';
import {appColors, scaleWidth} from '../global';
import {getCachedImageUri, peekCachedImageUri} from '../utils/imageCache';

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
  // If provided, shows the image instead of the colored initials.
  imageUrl?: string | null;
  // Stable cache key (S3 key). When set, the image is downloaded once to disk
  // and reused instantly on later renders — the signed `imageUrl` rotates, so
  // caching by URL would always miss. Falls back to `imageUrl` if absent.
  cacheKey?: string | null;
  style?: ViewStyle;
}

export const Avatar = ({
  name,
  id,
  size,
  online,
  imageUrl,
  cacheKey,
  style,
}: Props) => {
  const s = size ?? scaleWidth(48);
  const bg = colorFor(id ?? name);
  // Show initials first; fade the real image in once it finishes loading.
  const [loaded, setLoaded] = useState(false);
  // The URI actually rendered — a cached file:// path once resolved, else the
  // remote URL. Seeded synchronously from the in-memory cache to avoid a flash.
  const [uri, setUri] = useState<string | undefined>(() =>
    cacheKey ? peekCachedImageUri(cacheKey) ?? undefined : imageUrl ?? undefined,
  );

  useEffect(() => {
    setLoaded(false);
    if (!imageUrl) {
      setUri(undefined);
      return;
    }
    if (!cacheKey) {
      setUri(imageUrl);
      return;
    }
    const cached = peekCachedImageUri(cacheKey);
    if (cached) {
      setUri(cached);
      return;
    }
    let alive = true;
    getCachedImageUri(cacheKey, imageUrl).then(u => {
      if (alive) {
        setUri(u);
      }
    });
    return () => {
      alive = false;
    };
  }, [imageUrl, cacheKey]);

  return (
    <View style={[{width: s, height: s}, style]}>
      {/* Initials placeholder — always the base layer. */}
      <View
        style={[
          styles.circle,
          {width: s, height: s, borderRadius: s / 2, backgroundColor: bg},
        ]}>
        <Text style={[styles.initials, {fontSize: s * 0.38}]}>
          {getInitials(name)}
        </Text>
      </View>
      {uri ? (
        <Image
          source={{uri}}
          onLoad={() => setLoaded(true)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: s,
            height: s,
            borderRadius: s / 2,
            opacity: loaded ? 1 : 0,
          }}
        />
      ) : null}
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

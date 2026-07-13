import React, {useEffect, useRef, useState} from 'react';
import {Animated, Image, StyleSheet, ImageStyle, StyleProp} from 'react-native';
import {getCachedImageUri, peekCachedImageUri} from '../utils/imageCache';

interface Props {
  // Stable cache key (S3 file_key). If absent, the url is used directly.
  fileKey?: string | null;
  url: string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'center' | 'stretch';
}

// Image that caches to disk by fileKey so an already-fetched image loads
// instantly on re-open (no re-download despite the signed URL changing).
export const CachedImage = ({
  fileKey,
  url,
  style,
  resizeMode = 'cover',
}: Props) => {
  const [uri, setUri] = useState<string | undefined>(() =>
    peekCachedImageUri(fileKey ?? undefined),
  );

  useEffect(() => {
    let alive = true;
    if (!fileKey) {
      setUri(url);
      return;
    }
    const cached = peekCachedImageUri(fileKey);
    if (cached) {
      setUri(cached);
      return;
    }
    getCachedImageUri(fileKey, url).then(u => {
      if (alive) {
        setUri(u);
      }
    });
    return () => {
      alive = false;
    };
    // Re-resolve only when the attachment identity changes (not on URL re-sign).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileKey]);

  // Pulsing skeleton while the image loads/downloads.
  const pulse = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    if (uri) {
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [uri, pulse]);

  if (!uri) {
    return (
      <Animated.View
        style={[
          style as StyleProp<ImageStyle>,
          styles.placeholder,
          {opacity: pulse},
        ]}
      />
    );
  }
  return <Image source={{uri}} style={style} resizeMode={resizeMode} />;
};

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: 'rgba(94,23,23,0.12)',
  },
});

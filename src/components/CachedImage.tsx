import React, {useEffect, useState} from 'react';
import {
  View,
  Image,
  ActivityIndicator,
  StyleSheet,
  ImageStyle,
  StyleProp,
} from 'react-native';
import {appColors} from '../global';
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

  if (!uri) {
    return (
      <View style={[style as StyleProp<ImageStyle>, styles.placeholder]}>
        <ActivityIndicator size="small" color={appColors.maroon} />
      </View>
    );
  }
  return <Image source={{uri}} style={style} resizeMode={resizeMode} />;
};

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
});

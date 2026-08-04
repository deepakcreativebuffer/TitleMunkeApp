import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {appColors, typography, scaleWidth} from '../../global';
import {AppScreenProps} from '../../types';
import {downloadToCache, previewLocalFile} from '../../utils/documents';
import {CachedImage} from '../../components/CachedImage';
import {getCachedFileUri, peekCachedFileUri} from '../../utils/imageCache';

const icChevron = require('../../assets/images/ic-chevron.png');

// react-native-webview is a native module — lazy-require so this screen never
// crashes at import if the binary wasn't rebuilt yet.
let WebViewComp: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  WebViewComp = require('react-native-webview').WebView;
} catch {
  WebViewComp = null;
}

// Catches the native render error if RNCWebView isn't in the binary, so we can
// fall back to the system in-app viewer (QuickLook) instead of red-screening.
class WebViewBoundary extends React.Component<
  {fallback: React.ReactNode; children: React.ReactNode},
  {failed: boolean}
> {
  state = {failed: false};
  static getDerivedStateFromError() {
    return {failed: true};
  }
  componentDidCatch() {
    /* swallow */
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export const DocumentViewerScreen = ({
  navigation,
  route,
}: AppScreenProps<'DocumentViewer'>) => {
  const insets = useSafeAreaInsets();
  const {url, name, type, fileKey, isImage} = route.params;
  const [loading, setLoading] = React.useState(true);

  const isPdf =
    (type ?? '').includes('pdf') ||
    (name ?? '').toLowerCase().endsWith('.pdf');

  // Cache the document by its stable key. On iOS the WKWebView loads the cached
  // local file:// (instant on re-open, no re-download). Seed synchronously from
  // cache to avoid a mid-view source swap; download in the background otherwise.
  const [docUri] = React.useState<string>(
    () => (fileKey && !isImage ? peekCachedFileUri(fileKey) ?? url : url),
  );
  React.useEffect(() => {
    if (fileKey && !isImage && !peekCachedFileUri(fileKey)) {
      void getCachedFileUri(fileKey, url);
    }
  }, [fileKey, url, isImage]);

  // iOS WKWebView renders PDF/images/text inline (from the cached local file).
  // Android WebView can't render PDF/Office → Google's viewer needs a public
  // URL, so it always uses the remote signed URL.
  const docSource =
    Platform.OS === 'ios'
      ? {uri: docUri}
      : {
          uri: `https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(
            url,
          )}`,
        };

  const openInSystemViewer = async () => {
    try {
      const file = await downloadToCache(url, name);
      setTimeout(() => previewLocalFile(file), 200);
    } catch {
      /* ignore */
    }
  };

  const fallback = (
    <View style={styles.fallback}>
      <Text style={styles.fallbackText}>
        In-app preview needs an app rebuild.
      </Text>
      <TouchableOpacity style={styles.fallbackBtn} onPress={openInSystemViewer}>
        <Text style={styles.fallbackBtnText}>Open document</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={[styles.header, {paddingTop: insets.top + scaleWidth(8)}]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
          <Image source={icChevron} style={styles.back} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {name ?? (isImage ? 'Photo' : 'Document')}
        </Text>
        <View style={{width: scaleWidth(20)}} />
      </View>

      {isImage ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.imageWrap}
          maximumZoomScale={4}
          minimumZoomScale={1}
          centerContent
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}>
          <CachedImage
            fileKey={fileKey}
            url={url}
            style={styles.image}
            resizeMode="contain"
          />
        </ScrollView>
      ) : WebViewComp ? (
        <WebViewBoundary fallback={fallback}>
          <View style={styles.flex}>
            <WebViewComp
              source={docSource}
              style={styles.flex}
              originWhitelist={['*']}
              startInLoadingState
              onLoadEnd={() => setLoading(false)}
            />
            {loading ? (
              <ActivityIndicator style={styles.loader} color={appColors.white} />
            ) : null}
          </View>
        </WebViewBoundary>
      ) : (
        fallback
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  bg: {flex: 1, backgroundColor: '#111'},
  flex: {flex: 1, backgroundColor: '#111'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scaleWidth(16),
    paddingBottom: scaleWidth(10),
    backgroundColor: '#000',
  },
  back: {
    width: scaleWidth(20),
    height: scaleWidth(20),
    tintColor: appColors.white,
    transform: [{scaleX: -1}],
  },
  title: {
    flex: 1,
    ...typography(600, 15, 'white'),
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: scaleWidth(10),
  },
  imageWrap: {flexGrow: 1, alignItems: 'center', justifyContent: 'center'},
  image: {width: '100%', height: '100%'},
  loader: {position: 'absolute', top: '48%', alignSelf: 'center'},
  fallback: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: scaleWidth(24)},
  fallbackText: {
    ...typography('regular', 14, 'white'),
    textAlign: 'center',
    marginBottom: scaleWidth(16),
  },
  fallbackBtn: {
    height: scaleWidth(48),
    paddingHorizontal: scaleWidth(28),
    borderRadius: scaleWidth(12),
    backgroundColor: appColors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackBtnText: {...typography(600, 15, 'white'), fontWeight: '600'},
});

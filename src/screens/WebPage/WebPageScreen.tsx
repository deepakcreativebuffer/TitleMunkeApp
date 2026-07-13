import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Linking,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {appColors, typography, scaleWidth} from '../../global';
import {AppScreenProps} from '../../types';

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
// fall back to opening the page in the browser instead of red-screening.
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

export const WebPageScreen = ({
  navigation,
  route,
}: AppScreenProps<'WebPage'>) => {
  const insets = useSafeAreaInsets();
  const {url, title} = route.params;
  const [loading, setLoading] = React.useState(true);

  const fallback = (
    <View style={styles.fallback}>
      <Text style={styles.fallbackText}>
        In-app view needs an app rebuild.
      </Text>
      <TouchableOpacity
        style={styles.fallbackBtn}
        onPress={() => Linking.openURL(url)}>
        <Text style={styles.fallbackBtnText}>Open in browser</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.bg}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={appColors.white}
        translucent={false}
      />
      <View style={[styles.header, {paddingTop: insets.top + scaleWidth(8)}]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
          <Image source={icChevron} style={styles.back} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={{width: scaleWidth(20)}} />
      </View>

      {WebViewComp ? (
        <WebViewBoundary fallback={fallback}>
          <View style={styles.flex}>
            <WebViewComp
              source={{uri: url}}
              style={styles.flex}
              originWhitelist={['*']}
              startInLoadingState
              onLoadEnd={() => setLoading(false)}
            />
            {loading ? (
              <ActivityIndicator style={styles.loader} color={appColors.maroon} />
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
  bg: {flex: 1, backgroundColor: appColors.white},
  flex: {flex: 1, backgroundColor: appColors.white},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scaleWidth(16),
    paddingBottom: scaleWidth(10),
    backgroundColor: appColors.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(61,32,20,0.08)',
  },
  back: {
    width: scaleWidth(20),
    height: scaleWidth(20),
    tintColor: appColors.coffeeDark,
    transform: [{scaleX: -1}],
  },
  title: {
    flex: 1,
    ...typography(700, 16, 'coffeeDark'),
    fontWeight: '700',
    textAlign: 'center',
    marginHorizontal: scaleWidth(10),
  },
  loader: {position: 'absolute', top: '48%', alignSelf: 'center'},
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: scaleWidth(24),
  },
  fallbackText: {
    ...typography('regular', 14, 'coffeeDark'),
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

import {ActivityIndicator, Text, TouchableOpacity, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {appColors, typography} from '../global';
import {scaleWidth} from '../global/dimensions';
import {useAppSelector} from '../store';
import {currentSearchSelector} from '../slices';
import {navigationRef} from '../navigators/navigationRef';

// Pre-auth / onboarding / full-screen routes where the bar must never appear.
const HIDDEN_ROUTES = [
  'SplashScreen',
  'OnboardingScreen',
  'LoginScreen',
  'ForgotPassword',
  'SearchMap',
  'NearbyMap',
  'PropertyReport',
  'Messages',
  'Chat',
  'NewChat',
  'NewGroup',
  'GroupInfo',
  'ContactInfo',
  'DocumentViewer',
];

// Active top-level route ('TabNavigator' when the floating tab bar is on screen).
const getTopRoute = (): string | undefined => {
  if (!navigationRef.isReady()) {
    return undefined;
  }
  const state = navigationRef.getRootState();
  return state?.routes?.[state.index]?.name;
};

const TabLevelSearchIndicator = () => {
  const insets = useSafeAreaInsets();
  const {address, percent, status, searchId} = useAppSelector(
    currentSearchSelector,
  );

  const [topRoute, setTopRoute] = useState<string | undefined>(getTopRoute);
  useEffect(() => {
    const update = () => setTopRoute(getTopRoute());
    update();
    const unsub = navigationRef.addListener('state', update);
    return unsub;
  }, []);

  // Only show while a search is actively running.
  if (
    !searchId ||
    status !== 'IN_PROGRESS' ||
    (topRoute && HIDDEN_ROUTES.includes(topRoute))
  ) {
    return null;
  }

  // Sit above the floating tab bar on tab screens; otherwise drop to the bottom.
  // Use the SAME base the tab bar uses (max(insets, 12)) so the gap to the
  // chatbot is identical on every device (Pro vs non-Pro safe areas).
  const hasTabBar = topRoute === 'TabNavigator';
  const tabBase = Math.max(insets.bottom, scaleWidth(12));
  const barBottom = hasTabBar
    ? tabBase + scaleWidth(74)
    : insets.bottom + scaleWidth(14);

  return (
    <View
      pointerEvents="box-none"
      style={{paddingHorizontal: scaleWidth(20), alignItems: 'center'}}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() =>
          navigationRef.navigate('PropertyReport', {
            address: address ?? '',
            when: '',
            searchId,
          })
        }
        style={{
          position: 'absolute',
          bottom: barBottom,
          backgroundColor: appColors.maroon,
          borderRadius: scaleWidth(10),
          paddingHorizontal: scaleWidth(20),
          paddingVertical: scaleWidth(10),
          flexDirection: 'row',
          justifyContent: 'space-between',
          width: '100%',
        }}>
        <View>
          <Text style={[typography(600, 12, 'white'), {marginBottom: 5}]}>
            Search In Progress:
          </Text>
          <Text style={typography(700, 14, 'white')}>{address}</Text>
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
          <Text style={typography(700, 16, 'white')}>{percent}%</Text>
          <ActivityIndicator />
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default TabLevelSearchIndicator;

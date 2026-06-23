import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageBackground,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {appColors, typography, scaleWidth} from '../../global';
import {useAppSelector, useAppDispatch} from '../../store';
import {userProfileSelector, currentSearchSelector} from '../../slices';
import {startSearch} from '../../thunks';
import {AppStackParamList, HomeStackParamList} from '../../types';
import {useDrawer} from '../../context/DrawerContext';

const gridBg = require('../../assets/images/grid-bg.png');
const icMenu = require('../../assets/images/ic-menu.png');
const icProfile = require('../../assets/images/ic-profile.png');
const icPin = require('../../assets/images/ic-pin.png');
const icSearch = require('../../assets/images/ic-search.png');
const icList = require('../../assets/images/ic-list.png');

type Recent = {id: string; address: string; when: string; status: string};

const RECENT: Recent[] = [
  {id: '1', address: '3578 Stone Gate Dr', when: 'Jun 19 · 10:54 AM', status: 'SUCCESS'},
  {id: '2', address: '2302 W Chew St', when: 'Jun 19 · 10:19 AM', status: 'SUCCESS'},
  {id: '3', address: '7788 Lonesome Dr', when: 'May 28 · 04:31 PM', status: 'SUCCESS'},
];

export const HomeScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const rootNav =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const {openDrawer} = useDrawer();
  const dispatch = useAppDispatch();
  const profile = useAppSelector(userProfileSelector);
  const search = useAppSelector(currentSearchSelector);
  const firstName =
    profile?.name || profile?.email?.split('@')[0] || 'agent';
  const [address, setAddress] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searching = search.status === 'IN_PROGRESS';

  const onSearch = useCallback(async () => {
    if (searching) {
      return;
    }
    if (!address.trim()) {
      setError('Please enter an address.');
      return;
    }
    if (!confirmed) {
      setError('Please confirm the address is correct.');
      return;
    }
    setError(null);
    try {
      const res = await dispatch(
        startSearch({address: address.trim()}),
      ).unwrap();
      if (res?.searchId) {
        rootNav.navigate('PropertyReport', {
          address: address.trim(),
          when: '',
          searchId: res.searchId,
        });
      }
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Search failed to start.');
    }
  }, [address, confirmed, searching, dispatch, rootNav]);

  return (
    <ImageBackground source={gridBg} resizeMode="cover" style={styles.bg}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={appColors.background}
        translucent={false}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          {paddingTop: insets.top + scaleWidth(10)},
          {paddingBottom: insets.bottom + scaleWidth(110)},
        ]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.iconBtnSquare}
            activeOpacity={0.8}
            onPress={openDrawer}>
            <Image source={icMenu} style={styles.headerIcon} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <TouchableOpacity style={styles.iconBtnCircle} activeOpacity={0.8}>
            <Image source={icProfile} style={styles.headerIcon} />
          </TouchableOpacity>
        </View>

        {/* Greeting */}
        <Text style={styles.greeting}>Hi, {firstName} 👋</Text>
        <Text style={styles.greetingSub}>Run a new title search</Text>

        {/* Search card */}
        <View style={styles.searchCard}>
          <View style={styles.addressInput}>
            <Image source={icPin} style={styles.pinIcon} />
            <TextInput
              style={styles.addressText}
              value={address}
              onChangeText={setAddress}
              placeholder="Enter address here..."
              placeholderTextColor="rgba(142, 35, 35, 0.55)"
            />
          </View>
          <Text style={styles.formatHint}>Format: 123 Hill St</Text>

          <TouchableOpacity
            style={styles.confirmRow}
            activeOpacity={0.8}
            onPress={() => setConfirmed(c => !c)}>
            <View
              style={[styles.checkbox, confirmed && styles.checkboxOn]}>
              {confirmed ? <Text style={styles.checkboxMark}>✓</Text> : null}
            </View>
            <Text style={styles.confirmText}>
              I confirm the address is correct
            </Text>
          </TouchableOpacity>

          {error ? <Text style={styles.searchError}>{error}</Text> : null}

          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.searchBtn, searching && styles.searchBtnDisabled]}
            disabled={searching}
            onPress={onSearch}>
            {searching ? (
              <ActivityIndicator color={appColors.white} />
            ) : (
              <>
                <Text style={styles.searchBtnText}>Search</Text>
                <Image source={icSearch} style={styles.searchBtnIcon} />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* In-progress search banner (runs server-side in the background) */}
        {searching && search.searchId ? (
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.progressBanner}
            onPress={() =>
              rootNav.navigate('PropertyReport', {
                address: search.address ?? '',
                when: '',
                searchId: search.searchId as string,
              })
            }>
            <ActivityIndicator color={appColors.maroon} />
            <Text style={styles.progressText}>
              Searching {search.address}… {search.percent ? `${search.percent}%` : ''}
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Stat cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardDark]}>
            <View style={styles.statTop}>
              <Text style={styles.statLabelLight}>Total Searches</Text>
              <View style={styles.statBadgeLight}>
                <Image source={icSearch} style={styles.statBadgeIconLight} />
              </View>
            </View>
            <Text style={styles.statNumLight}>5</Text>
          </View>

          <View style={[styles.statCard, styles.statCardLight]}>
            <View style={styles.statTop}>
              <Text style={styles.statLabelDark}>Audit Logs</Text>
              <View style={styles.statBadgeDark}>
                <Image source={icList} style={styles.statBadgeIconDark} />
              </View>
            </View>
            <Text style={styles.statNumDark}>15</Text>
          </View>
        </View>

        {/* Recent searches */}
        <View style={styles.recentHead}>
          <Text style={styles.recentTitle}>Recent Searches</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SearchHistory')}>
            <Text style={styles.viewAll}>View all</Text>
          </TouchableOpacity>
        </View>

        {RECENT.map(item => (
          <View key={item.id} style={styles.recentCard}>
            <View style={styles.recentPinWrap}>
              <Image source={icPin} style={styles.recentPin} />
            </View>
            <View style={styles.recentBody}>
              <Text style={styles.recentAddr}>{item.address}</Text>
              <Text style={styles.recentWhen}>{item.when}</Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </ImageBackground>
  );
};

const shadow = {
  shadowColor: '#3d2014',
  shadowOffset: {width: 0, height: 8},
  shadowOpacity: 0.08,
  shadowRadius: 16,
  elevation: 3,
};

const styles = StyleSheet.create({
  bg: {flex: 1, backgroundColor: appColors.background},
  scroll: {paddingHorizontal: scaleWidth(20)},

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleWidth(18),
  },
  iconBtnSquare: {
    width: scaleWidth(44),
    height: scaleWidth(44),
    borderRadius: scaleWidth(12),
    backgroundColor: appColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  iconBtnCircle: {
    width: scaleWidth(44),
    height: scaleWidth(44),
    borderRadius: scaleWidth(44),
    backgroundColor: appColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  headerIcon: {
    width: scaleWidth(22),
    height: scaleWidth(22),
    tintColor: appColors.maroon,
  },
  headerTitle: {
    ...typography(700, 18, 'coffeeDark'),
    fontWeight: '700',
  },

  // Greeting
  greeting: {
    ...typography(700, 22, 'coffeeDark'),
    fontWeight: '700',
  },
  greetingSub: {
    ...typography('regular', 14, 'gray'),
    marginTop: scaleWidth(3),
    marginBottom: scaleWidth(16),
  },

  // Search card
  searchCard: {
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(20),
    padding: scaleWidth(18),
    ...shadow,
  },
  addressInput: {
    flexDirection: 'row',
    alignItems: 'center',
    height: scaleWidth(52),
    borderWidth: 1.4,
    borderColor: appColors.inputBorder,
    borderRadius: scaleWidth(12),
    paddingHorizontal: scaleWidth(14),
  },
  pinIcon: {
    width: scaleWidth(18),
    height: scaleWidth(18),
    tintColor: appColors.maroonLink,
    marginRight: scaleWidth(10),
  },
  addressText: {
    flex: 1,
    ...typography('regular', 15, 'coffeeDark'),
    padding: 0,
  },
  formatHint: {
    ...typography('regular', 12, 'gray'),
    marginTop: scaleWidth(12),
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scaleWidth(14),
    marginBottom: scaleWidth(16),
  },
  checkbox: {
    width: scaleWidth(22),
    height: scaleWidth(22),
    borderRadius: scaleWidth(6),
    borderWidth: 1.8,
    borderColor: appColors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(10),
  },
  checkboxOn: {
    backgroundColor: appColors.maroon,
  },
  checkboxMark: {
    color: appColors.white,
    fontSize: scaleWidth(13),
    fontWeight: '700',
    lineHeight: scaleWidth(16),
  },
  confirmText: {
    ...typography('regular', 13, 'coffeeDark'),
  },
  searchError: {
    ...typography('regular', 12, 'error'),
    marginBottom: scaleWidth(10),
  },
  searchBtn: {
    height: scaleWidth(52),
    borderRadius: scaleWidth(12),
    backgroundColor: appColors.maroon,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnDisabled: {
    opacity: 0.75,
  },
  progressBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(94,23,23,0.07)',
    borderRadius: scaleWidth(14),
    padding: scaleWidth(14),
    marginTop: scaleWidth(14),
  },
  progressText: {
    ...typography(600, 13, 'maroon'),
    fontWeight: '600',
    marginLeft: scaleWidth(10),
    flex: 1,
  },
  searchBtnText: {
    ...typography(600, 16, 'white'),
    fontWeight: '600',
  },
  searchBtnIcon: {
    width: scaleWidth(17),
    height: scaleWidth(17),
    tintColor: appColors.white,
    marginLeft: scaleWidth(8),
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    marginTop: scaleWidth(16),
  },
  statCard: {
    flex: 1,
    borderRadius: scaleWidth(18),
    padding: scaleWidth(16),
    height: scaleWidth(108),
    justifyContent: 'space-between',
    ...shadow,
  },
  statCardDark: {
    backgroundColor: appColors.maroon,
    marginRight: scaleWidth(7),
  },
  statCardLight: {
    backgroundColor: appColors.white,
    marginLeft: scaleWidth(7),
  },
  statTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statLabelLight: {
    ...typography(500, 13, 'white'),
    fontWeight: '500',
  },
  statLabelDark: {
    ...typography(500, 13, 'coffeeDark'),
    fontWeight: '500',
  },
  statBadgeLight: {
    width: scaleWidth(32),
    height: scaleWidth(32),
    borderRadius: scaleWidth(10),
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBadgeDark: {
    width: scaleWidth(32),
    height: scaleWidth(32),
    borderRadius: scaleWidth(10),
    backgroundColor: 'rgba(94,23,23,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBadgeIconLight: {
    width: scaleWidth(16),
    height: scaleWidth(16),
    tintColor: appColors.white,
  },
  statBadgeIconDark: {
    width: scaleWidth(16),
    height: scaleWidth(16),
    tintColor: appColors.maroon,
  },
  statNumLight: {
    ...typography(700, 32, 'white'),
    fontWeight: '700',
  },
  statNumDark: {
    ...typography(700, 32, 'coffeeDark'),
    fontWeight: '700',
  },

  // Recent
  recentHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: scaleWidth(22),
    marginBottom: scaleWidth(12),
  },
  recentTitle: {
    ...typography(700, 16, 'coffeeDark'),
    fontWeight: '700',
  },
  viewAll: {
    ...typography(600, 13, 'maroonLink'),
    fontWeight: '600',
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(16),
    padding: scaleWidth(14),
    marginBottom: scaleWidth(10),
    ...shadow,
  },
  recentPinWrap: {
    width: scaleWidth(40),
    height: scaleWidth(40),
    borderRadius: scaleWidth(12),
    backgroundColor: 'rgba(94,23,23,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(12),
  },
  recentPin: {
    width: scaleWidth(20),
    height: scaleWidth(20),
    tintColor: appColors.maroon,
  },
  recentBody: {
    flex: 1,
  },
  recentAddr: {
    ...typography(600, 14, 'coffeeDark'),
    fontWeight: '600',
  },
  recentWhen: {
    ...typography('regular', 12, 'gray'),
    marginTop: scaleWidth(3),
  },
  statusPill: {
    backgroundColor: 'rgba(30,135,75,0.12)',
    borderRadius: scaleWidth(8),
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleWidth(5),
  },
  statusText: {
    ...typography(600, 11, 'success'),
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

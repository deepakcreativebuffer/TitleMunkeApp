import React, { useState, useMemo, useCallback } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { appColors, typography, scaleWidth } from '../../global';
import { AppStackParamList } from '../../types';
import { useAppSelector } from '../../store';
import {
  userProfileSelector,
  currentSearchSelector,
  userRoleSelector,
} from '../../slices';
import { useFetch } from '../../hooks';
import { searchStatusMeta } from '../../utils';
import { listSearchHistories } from '../../api/userAdmin.api';
import { extractLatLng } from '../../api/geocode';

const gridBg = require('../../assets/images/grid-bg.png');
const icChevron = require('../../assets/images/ic-chevron.png');
const icPin = require('../../assets/images/ic-pin.png');
const icSearch = require('../../assets/images/ic-search.png');
const icClock = require('../../assets/images/ic-clock.png');
const icEye = require('../../assets/images/ic-eye.png');
const icLink = require('../../assets/images/ic-link.png');

type HistoryItem = {
  id: string;
  address: string;
  when: string;
  status: string;
  searchId?: string;
  latitude?: number;
  longitude?: number;
};

const formatWhen = (raw?: string | number): string => {
  if (!raw) {
    return '';
  }
  const d = new Date(raw);
  if (isNaN(d.getTime())) {
    return String(raw);
  }
  return d.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const mapHistory = (res: any): HistoryItem[] => {
  if (__DEV__) {
    console.log('[History] raw response:', JSON.stringify(res)?.slice(0, 600));
  }
  // Backend wraps this AppSync-style: { data: { listSearchHistories: { items } } }
  const items: any[] =
    res?.data?.listSearchHistories?.items ??
    res?.listSearchHistories?.items ??
    res?.items ??
    res?.data?.items ??
    (Array.isArray(res) ? res : []);
  return items.map((it, i) => {
    const coord = extractLatLng(it);
    return {
      id: String(it.id ?? it.search_id ?? i),
      address: it.address ?? it.searchAddress ?? '—',
      when: formatWhen(
        it.created_at ?? it.createdAt ?? it.property_summary?.['Date of Search'],
      ),
      status: String(it.status ?? 'SUCCESS'),
      searchId: it.search_id ?? it.searchId ?? it.id,
      latitude: coord?.latitude,
      longitude: coord?.longitude,
    };
  });
};

// Used both as a Home-stack screen (reached via "View More", has a back button)
// and as a top-level tab (no back target). Uses the navigation hook so it works
// in either navigator.
export const SearchHistoryScreen = () => {
  const insets = useSafeAreaInsets();
  const rootNav = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const navigation = rootNav;
  const profile = useAppSelector(userProfileSelector);
  const liveSearch = useAppSelector(currentSearchSelector);
  const role = useAppSelector(userRoleSelector);
  const isAgent = role === 'agent';
  const brokerId = profile?.sub;
  const [query, setQuery] = useState('');

  const fetcher = useCallback(
    () =>
      listSearchHistories({
        userType: role,
        ...(isAgent ? {} : {brokerId}),
        userId: brokerId,
        limit: 50,
      }),
    [role, isAgent, brokerId],
  );
  // Re-fetch when an in-flight search changes state (e.g. → SUCCESS).
  const { data, loading } = useFetch(fetcher, [brokerId, liveSearch.status]);
  const items = useMemo(() => {
    const mapped = data ? mapHistory(data) : [];
    if (!query.trim()) {
      return mapped;
    }
    const q = query.trim().toLowerCase();
    return mapped.filter(it => it.address.toLowerCase().includes(q));
  }, [data, query]);

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
          { paddingTop: insets.top + scaleWidth(10) },
          { paddingBottom: insets.bottom + scaleWidth(110) },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          {navigation.canGoBack() ? (
            <TouchableOpacity
              style={styles.backBtn}
              activeOpacity={0.8}
              onPress={() => navigation.goBack()}
            >
              <Image source={icChevron} style={styles.backIcon} />
            </TouchableOpacity>
          ) : (
            // Root tab: no back target — keep a spacer so the title stays centered.
            <View style={styles.backSpacer} />
          )}
          <Text style={styles.headerTitle}>Search History</Text>
          <TouchableOpacity
            style={styles.filterBtn}
            activeOpacity={0.8}
            disabled={items.length === 0}
            onPress={() => rootNav.navigate('SearchMap', {items})}>
            <Image source={icPin} style={styles.filterIcon} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Image source={icSearch} style={styles.searchIcon} />
          <TextInput
            style={styles.searchText}
            value={query}
            onChangeText={setQuery}
            placeholder="Search address..."
            placeholderTextColor={appColors.gray}
          />
        </View>

        {/* History cards */}
        {loading ? (
          <ActivityIndicator
            color={appColors.maroon}
            style={{ marginTop: scaleWidth(40) }}
          />
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No search history yet.</Text>
          </View>
        ) : (
          items.map(item => {
            const liveOverride =
              item.searchId && item.searchId === liveSearch.searchId
                ? liveSearch.status
                : item.status;
            const meta = searchStatusMeta(liveOverride);
            return (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.address}>{item.address}</Text>
                <View style={[styles.statusPill, {backgroundColor: meta.bg}]}>
                  <Text style={[styles.statusText, {color: meta.color}]}>
                    {meta.label}
                  </Text>
                </View>
              </View>

              <View style={styles.dateRow}>
                <Image source={icClock} style={styles.clockIcon} />
                <Text style={styles.dateText}>{item.when}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.actions}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.actionBtn, styles.actionPrimary]}
                  onPress={() =>
                    rootNav.navigate('PropertyReport', {
                      address: item.address,
                      when: item.when,
                      searchId: item.searchId,
                    })
                  }
                >
                  <Image source={icEye} style={styles.actionIconPrimary} />
                  <Text style={styles.actionTextPrimary}>View report</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.actionBtn, styles.actionSecondary]}
                >
                  <Image source={icLink} style={styles.actionIconSecondary} />
                  <Text style={styles.actionTextSecondary}>Copy link</Text>
                </TouchableOpacity>
              </View>
            </View>
            );
          })
        )}
      </ScrollView>
    </ImageBackground>
  );
};

const shadow = {
  shadowColor: '#3d2014',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.08,
  shadowRadius: 16,
  elevation: 3,
};

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: appColors.background },
  scroll: { paddingHorizontal: scaleWidth(20) },
  empty: { alignItems: 'center', marginTop: scaleWidth(50) },
  emptyText: { ...typography(500, 14, 'gray'), fontWeight: '500' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleWidth(16),
  },
  backBtn: {
    width: scaleWidth(44),
    height: scaleWidth(44),
    borderRadius: scaleWidth(12),
    backgroundColor: appColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  backSpacer: {width: scaleWidth(44), height: scaleWidth(44)},
  backIcon: {
    width: scaleWidth(18),
    height: scaleWidth(18),
    tintColor: appColors.coffeeDark,
    transform: [{ scaleX: -1 }],
  },
  headerTitle: {
    ...typography(700, 18, 'coffeeDark'),
    fontWeight: '700',
  },
  filterBtn: {
    width: scaleWidth(44),
    height: scaleWidth(44),
    borderRadius: scaleWidth(12),
    backgroundColor: appColors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  filterIcon: {
    width: scaleWidth(20),
    height: scaleWidth(20),
    tintColor: appColors.white,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: scaleWidth(50),
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(12),
    paddingHorizontal: scaleWidth(14),
    marginBottom: scaleWidth(16),
    ...shadow,
    shadowOpacity: 0.05,
  },
  searchIcon: {
    width: scaleWidth(18),
    height: scaleWidth(18),
    tintColor: appColors.gray,
    marginRight: scaleWidth(10),
  },
  searchText: {
    flex: 1,
    ...typography('regular', 15, 'coffeeDark'),
    padding: 0,
  },

  card: {
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(16),
    padding: scaleWidth(16),
    marginBottom: scaleWidth(14),
    ...shadow,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  address: {
    flex: 1,
    ...typography(700, 15, 'coffeeDark'),
    fontWeight: '700',
  },
  statusPill: {
    backgroundColor: 'rgba(30,135,75,0.12)',
    borderRadius: scaleWidth(8),
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleWidth(5),
    marginLeft: scaleWidth(10),
  },
  statusText: {
    ...typography(700, 11, 'success'),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scaleWidth(10),
  },
  clockIcon: {
    width: scaleWidth(14),
    height: scaleWidth(14),
    tintColor: appColors.gray,
    marginRight: scaleWidth(6),
  },
  dateText: {
    ...typography('regular', 12, 'gray'),
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(61,32,20,0.07)',
    marginVertical: scaleWidth(14),
  },
  actions: {
    flexDirection: 'row',
  },
  actionBtn: {
    flex: 1,
    height: scaleWidth(42),
    borderRadius: scaleWidth(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPrimary: {
    backgroundColor: 'rgba(94,23,23,0.07)',
    marginRight: scaleWidth(6),
  },
  actionSecondary: {
    backgroundColor: 'rgba(61,32,20,0.05)',
    marginLeft: scaleWidth(6),
  },
  actionIconPrimary: {
    width: scaleWidth(16),
    height: scaleWidth(16),
    tintColor: appColors.maroon,
    marginRight: scaleWidth(7),
  },
  actionTextPrimary: {
    ...typography(600, 13, 'maroon'),
    fontWeight: '600',
  },
  actionIconSecondary: {
    width: scaleWidth(16),
    height: scaleWidth(16),
    tintColor: appColors.coffeeLight,
    marginRight: scaleWidth(7),
  },
  actionTextSecondary: {
    ...typography(600, 13, 'coffeeLight'),
    fontWeight: '600',
  },
});

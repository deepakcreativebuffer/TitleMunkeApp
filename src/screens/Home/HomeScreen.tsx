import React, {useState, useCallback, useMemo, useRef, useEffect} from 'react';
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
import {
  userProfileSelector,
  currentSearchSelector,
  userRoleSelector,
} from '../../slices';
import {startSearch} from '../../thunks';
import {AppStackParamList, HomeStackParamList} from '../../types';
import {useDrawer} from '../../context/DrawerContext';
import {useFetch} from '../../hooks';
import {searchStatusMeta, isOrgRole, isAdminRole} from '../../utils';
import {OrgDashboard} from './OrgDashboard';
import {AdminDashboard} from './AdminDashboard';
import {
  listSearchHistories,
  getBrokerAgentDetails,
  listTotalSearchesByUserId,
  listTotalAuditLogsByUserId,
} from '../../api/userAdmin.api';
import {
  searchAddresses,
  hitAddress,
  algoliaEnabled,
  AddressHit,
} from '../../api/algolia';
import { LiveActivity } from '../../native/LiveActivity';

const gridBg = require('../../assets/images/grid-bg.png');
const icMenu = require('../../assets/images/ic-menu.png');
const icProfile = require('../../assets/images/ic-profile.png');
const icPin = require('../../assets/images/ic-pin.png');
const icSearch = require('../../assets/images/ic-search.png');
const icUserCheck = require('../../assets/images/ic-user-check.png');
const icUserX = require('../../assets/images/ic-user-x.png');
const icList = require('../../assets/images/ic-list.png');

type Recent = {
  id: string;
  address: string;
  when: string;
  status: string;
  searchId?: string;
};

const fmtWhen = (raw?: string | number): string => {
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
    hour: '2-digit',
    minute: '2-digit',
  });
};

const mapRecent = (res: any): Recent[] => {
  const items: any[] =
    res?.data?.listSearchHistories?.items ??
    res?.listSearchHistories?.items ??
    res?.items ??
    (Array.isArray(res) ? res : []);
  return items.slice(0, 5).map((it, i) => ({
    id: String(it.id ?? it.search_id ?? i),
    address: it.address ?? '—',
    when: fmtWhen(it.created_at ?? it.createdAt ?? it.property_summary?.['Date of Search']),
    status: String(it.status ?? 'SUCCESS'),
    searchId: it.search_id ?? it.searchId ?? it.id,
  }));
};

// Dashboard tab routes to the org overview for organisations, otherwise the
// broker/agent search dashboard.
export const HomeScreen = () => {
  const role = useAppSelector(userRoleSelector);

  // async function testWidget(){

  //   LiveActivity.start({
  //     address:'Nagaland',
  //     etaMinutes: 20,
  //     message:"Search Loading",
  //     percent: 20,
  //     searchId:'39u302u2',
  //     stageLabel:'Helo',
  //     status:'In Progress'
  //   })
  // }

  // useEffect(() => {
  // testWidget()
  // },[])

  if (isAdminRole(role)) {
    return <AdminDashboard />;
  }
  return isOrgRole(role) ? <OrgDashboard /> : <BrokerDashboard />;
};

const BrokerDashboard = () => {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const rootNav =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const {openDrawer} = useDrawer();
  const dispatch = useAppDispatch();
  const profile = useAppSelector(userProfileSelector);
  const search = useAppSelector(currentSearchSelector);
  const role = useAppSelector(userRoleSelector);
  const isAgent = role === 'agent';
  const firstName =
    profile?.name || profile?.email?.split('@')[0] || 'agent';
  const userId = profile?.sub;
  const brokerId = userId;

  const recentFetcher = useCallback(
    () =>
      listSearchHistories({
        userType: role,
        ...(isAgent ? {} : {brokerId}),
        userId,
        limit: 5,
      }),
    [role, isAgent, brokerId, userId],
  );
  const {data: recentData, loading: recentLoading} = useFetch(recentFetcher, [
    brokerId,
    // re-fetch when a search completes
    search.status,
  ]);
  const recents = useMemo(() => {
    const list = recentData ? mapRecent(recentData) : [];
    // Surface the live search immediately (before the backend list includes
    // it): show it on top as In Progress, then its status updates live. Skip if
    // the fetched list already has it (deduped by searchId).
    if (
      search.searchId &&
      search.status !== 'idle' &&
      !list.some(r => r.searchId === search.searchId)
    ) {
      list.unshift({
        id: `live-${search.searchId}`,
        address: search.address ?? '—',
        when: fmtWhen(search.startedAt ?? Date.now()),
        status: search.status,
        searchId: search.searchId,
      });
    }
    return list.slice(0, 5);
  }, [
    recentData,
    search.searchId,
    search.status,
    search.address,
    search.startedAt,
  ]);

  // Broker KPIs — derived from the agents list (same as the web dashboard).
  const agentsFetcher = useCallback(
    () =>
      isAgent || !brokerId
        ? Promise.resolve(null)
        : getBrokerAgentDetails(brokerId, true),
    [brokerId, isAgent],
  );
  const {data: agentsData} = useFetch(agentsFetcher, [brokerId, isAgent]);
  const brokerKpis = useMemo(() => {
    const res: any = agentsData;
    const list: any[] = Array.isArray(res)
      ? res
      : res?.items ?? res?.agents ?? res?.data?.items ?? res?.data ?? [];
    const upper = (s: unknown) => String(s ?? '').toUpperCase();
    return {
      total: list.length,
      active: list.filter(a => upper(a.status) === 'ACTIVE').length,
      inactive: list.filter(a => upper(a.status) === 'UNCONFIRMED').length,
    };
  }, [agentsData]);

  // Agent KPIs — total searches + total audit logs by this user.
  const agentKpiFetcher = useCallback(
    () =>
      isAgent && userId
        ? Promise.all([
            listTotalSearchesByUserId(userId),
            listTotalAuditLogsByUserId(userId),
          ])
        : Promise.resolve(null),
    [isAgent, userId],
  );
  const {data: agentKpiData} = useFetch(agentKpiFetcher, [isAgent, userId]);
  const agentKpis = useMemo(() => {
    const num = (v: any) => {
      const d = (v as any)?.data ?? v;
      return d?.totalSearches ?? d?.totalAuditLogs ?? d?.total ?? d?.count ?? 0;
    };
    const [s, l] = (agentKpiData as any[]) ?? [];
    return {totalSearches: num(s), auditLogs: num(l)};
  }, [agentKpiData]);

  // Cards shown on the dashboard depend on the role.
  const statCards = isAgent
    ? [
        {label: 'Total Searches', value: agentKpis.totalSearches, icon: icSearch},
        {label: 'Audit Logs', value: agentKpis.auditLogs, icon: icList},
      ]
    : [
        {label: 'Total Agents', value: brokerKpis.total, icon: icProfile},
        {label: 'Active Agents', value: brokerKpis.active, icon: icUserCheck},
        {label: 'Inactive Agents', value: brokerKpis.inactive, icon: icUserX},
      ];

  // Restore the in-flight address + confirmation from the persisted search so
  // they survive minimize / reopen / cold relaunch until the search completes.
  const [address, setAddress] = useState(() =>
    search.status === 'IN_PROGRESS' ? search.address ?? '' : '',
  );
  const [confirmed, setConfirmed] = useState(
    () => search.status === 'IN_PROGRESS',
  );
  const [error, setError] = useState<string | null>(null);
  const searching = search.status === 'IN_PROGRESS';

  // ---- Algolia address autocomplete ----
  const [suggestions, setSuggestions] = useState<AddressHit[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onChangeAddress = useCallback((t: string) => {
    setAddress(t);
    setShowSuggestions(true);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (!algoliaEnabled || !t.trim()) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const hits = await searchAddresses(t);
      setSuggestions(hits);
    }, 300);
  }, []);

  const onSelectSuggestion = useCallback((h: AddressHit) => {
    setAddress(hitAddress(h));
    setSuggestions([]);
    setShowSuggestions(false);
  }, []);

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
      // Start the search and stay on this screen. The in-progress indicator
      // shows the live status; we no longer jump to the property detail page.
      await dispatch(startSearch({address: address.trim()})).unwrap();
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Search failed to start.');
    }
  }, [address, confirmed, searching, dispatch]);

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
          <View style={styles.addressWrap}>
            <View
              style={[styles.addressInput, searching && styles.disabledBox]}>
              <Image source={icPin} style={styles.pinIcon} />
              <TextInput
                style={styles.addressText}
                value={address}
                onChangeText={onChangeAddress}
                onFocus={() => setShowSuggestions(true)}
                autoCorrect={false}
                editable={!searching}
                placeholder="Enter address here..."
                placeholderTextColor="rgba(142, 35, 35, 0.55)"
              />
            </View>
            {showSuggestions && suggestions.length > 0 ? (
              <View style={styles.suggestBox}>
                {suggestions.map((h, i) => (
                  <TouchableOpacity
                    key={(h.objectID as string) ?? i}
                    activeOpacity={0.7}
                    style={[
                      styles.suggestRow,
                      i > 0 && styles.suggestDivider,
                    ]}
                    onPress={() => onSelectSuggestion(h)}>
                    <Image source={icPin} style={styles.suggestPin} />
                    <Text style={styles.suggestText} numberOfLines={1}>
                      {hitAddress(h)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>
          <Text style={styles.formatHint}>Format: 123 Hill St</Text>

          <TouchableOpacity
            style={[styles.confirmRow, searching && styles.disabledDim]}
            activeOpacity={0.8}
            disabled={searching}
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
            <Text style={styles.searchBtnText}>Search</Text>
            <Image source={icSearch} style={styles.searchBtnIcon} />
          </TouchableOpacity>

          {/* In-progress (search runs server-side / in background) */}
          {searching ? (
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.progressBlock}
              disabled={!search.searchId}
              onPress={() =>
                search.searchId &&
                rootNav.navigate('PropertyReport', {
                  address: search.address ?? '',
                  when: '',
                  searchId: search.searchId,
                })
              }>
              <Text style={styles.progressPercent}>
                Search in progress {search.percent ?? 0}%
              </Text>
              <Text style={styles.progressMessage}>
                {search.message || 'Initializing title search...'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Role-based KPIs (same stat-card UI) */}
        <View style={styles.statsRow}>
          {statCards.map((k, i) => {
            const dark = !isAgent && i === 0;
            return (
              <View
                key={k.label}
                style={[
                  styles.statCard,
                  dark ? styles.statCardDark : styles.statCardLight,
                ]}>
                <View style={styles.statTop}>
                  <Text
                    style={dark ? styles.statLabelLight : styles.statLabelDark}
                    numberOfLines={2}>
                    {k.label}
                  </Text>
                  <View
                    style={dark ? styles.statBadgeLight : styles.statBadgeDark}>
                    <Image
                      source={k.icon}
                      style={
                        dark
                          ? styles.statBadgeIconLight
                          : styles.statBadgeIconDark
                      }
                    />
                  </View>
                </View>
                <Text style={dark ? styles.statNumLight : styles.statNumDark}>
                  {k.value}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Recent searches */}
        <View style={styles.recentHead}>
          <Text style={styles.recentTitle}>Recent Searches</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SearchHistory')}>
            <Text style={styles.viewAll}>View all</Text>
          </TouchableOpacity>
        </View>

        {recentLoading && recents.length === 0 ? (
          <ActivityIndicator
            color={appColors.maroon}
            style={{marginTop: scaleWidth(20)}}
          />
        ) : recents.length === 0 ? (
          <View style={styles.recentEmpty}>
            <Text style={styles.recentEmptyText}>No recent searches yet.</Text>
          </View>
        ) : (
          recents.map(item => {
            // Live status override for the search currently running.
            const liveOverride =
              item.searchId && item.searchId === search.searchId
                ? search.status
                : item.status;
            const meta = searchStatusMeta(liveOverride);
            return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.85}
              style={styles.recentCard}
              onPress={() =>
                rootNav.navigate('PropertyReport', {
                  address: item.address,
                  when: item.when,
                  searchId: item.searchId,
                })
              }>
              <View style={styles.recentPinWrap}>
                <Image source={icPin} style={styles.recentPin} />
              </View>
              <View style={styles.recentBody}>
                <Text style={styles.recentAddr} numberOfLines={1}>
                  {item.address}
                </Text>
                <Text style={styles.recentWhen}>{item.when}</Text>
              </View>
              <View style={[styles.statusPill, {backgroundColor: meta.bg}]}>
                <Text style={[styles.statusText, {color: meta.color}]}>
                  {meta.label}
                </Text>
              </View>
            </TouchableOpacity>
            );
          })
        )}
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
    // Sit above the stat cards below so the address-suggestion dropdown
    // (which overflows the card) isn't hidden behind them.
    zIndex: 50,
  },
  addressWrap: {
    position: 'relative',
    zIndex: 20,
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
  suggestBox: {
    position: 'absolute',
    top: scaleWidth(56),
    left: 0,
    right: 0,
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(12),
    borderWidth: 1,
    borderColor: appColors.inputBorder,
    paddingVertical: scaleWidth(4),
    zIndex: 30,
    elevation: 8,
    shadowColor: '#3d2014',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleWidth(11),
    paddingHorizontal: scaleWidth(14),
  },
  suggestDivider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(61,32,20,0.06)',
  },
  suggestPin: {
    width: scaleWidth(15),
    height: scaleWidth(15),
    tintColor: appColors.maroonLink,
    marginRight: scaleWidth(10),
  },
  suggestText: {
    flex: 1,
    ...typography('regular', 14, 'coffeeDark'),
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
  disabledBox: {
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  disabledDim: {
    opacity: 0.5,
  },
  progressBlock: {
    alignItems: 'center',
    marginTop: scaleWidth(18),
  },
  progressPercent: {
    ...typography(600, 15, 'coffeeDark'),
    fontWeight: '600',
  },
  progressMessage: {
    ...typography('regular', 13, 'gray'),
    marginTop: scaleWidth(8),
    textAlign: 'center',
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
    borderRadius: scaleWidth(16),
    padding: scaleWidth(11),
    height: scaleWidth(90),
    justifyContent: 'space-between',
    marginHorizontal: scaleWidth(4),
    ...shadow,
  },
  statCardDark: {
    backgroundColor: appColors.maroon,
  },
  statCardLight: {
    backgroundColor: appColors.white,
  },
  statTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  statLabelLight: {
    flex: 1,
    ...typography(500, 12, 'white'),
    fontWeight: '500',
    marginRight: scaleWidth(6),
  },
  statLabelDark: {
    flex: 1,
    ...typography(500, 12, 'coffeeDark'),
    fontWeight: '500',
    marginRight: scaleWidth(6),
  },
  statBadgeLight: {
    width: scaleWidth(30),
    height: scaleWidth(30),
    borderRadius: scaleWidth(10),
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBadgeDark: {
    width: scaleWidth(30),
    height: scaleWidth(30),
    borderRadius: scaleWidth(10),
    backgroundColor: 'rgba(94,23,23,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBadgeIconLight: {
    width: scaleWidth(15),
    height: scaleWidth(15),
    tintColor: appColors.white,
  },
  statBadgeIconDark: {
    width: scaleWidth(15),
    height: scaleWidth(15),
    tintColor: appColors.maroon,
  },
  statNumLight: {
    ...typography(700, 23, 'white'),
    fontWeight: '700',
  },
  statNumDark: {
    ...typography(700, 23, 'coffeeDark'),
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
  recentEmpty: {
    alignItems: 'center',
    paddingVertical: scaleWidth(24),
  },
  recentEmptyText: {
    ...typography(500, 13, 'gray'),
    fontWeight: '500',
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

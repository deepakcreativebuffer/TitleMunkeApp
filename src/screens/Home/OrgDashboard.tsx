import React, {useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {appColors, typography, scaleWidth} from '../../global';
import {AppStackParamList} from '../../types';
import {useDrawer} from '../../context/DrawerContext';
import {useAppSelector} from '../../store';
import {userProfileSelector} from '../../slices';
import {useFetch, usePaginatedFetch} from '../../hooks';
import {CurrentUserAvatar} from '../../components/CurrentUserAvatar';
import {
  getOrganisationMetrics,
  getOrgBrokersList,
  getOrgAgentsList,
} from '../../api/userAdmin.api';

const gridBg = require('../../assets/images/grid-bg.png');
const icMenu = require('../../assets/images/ic-menu.png');
const icProfile = require('../../assets/images/ic-profile.png');
const icPeople = require('../../assets/images/ic-people.png');
const icClock = require('../../assets/images/ic-clock.png');
const icCheck = require('../../assets/images/ic-user-check.png');

const fmtDate = (raw?: string | number): string => {
  if (!raw) {
    return 'N/A';
  }
  const d = new Date(raw);
  if (isNaN(d.getTime())) {
    return String(raw);
  }
  return d.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Pull the row list + pagination cursor out of a brokers/agents-for-org
// response ({ items, nextToken }), tolerating a few nesting shapes.
const extractOrgPage = (res: any): {items: any[]; nextToken: string | null} => {
  const items = Array.isArray(res)
    ? res
    : res?.items ?? res?.data?.items ?? res?.data ?? [];
  const nextToken = res?.nextToken ?? res?.data?.nextToken ?? null;
  return {items, nextToken};
};

// Load more when the scroll position gets within this many px of the bottom.
const LOAD_MORE_THRESHOLD = 320;

export const OrgDashboard = () => {
  const insets = useSafeAreaInsets();
  const {openDrawer} = useDrawer();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const profile = useAppSelector(userProfileSelector);
  const firstName =
    profile?.name || profile?.email?.split('@')[0] || 'organization';
  const [tab, setTab] = useState<'broker' | 'agent'>('broker');

  // KPIs
  const {data: rawMetrics} = useFetch(getOrganisationMetrics, []);
  const kpis = useMemo(() => {
    const m = (rawMetrics as any)?.data ?? rawMetrics ?? {};
    return {
      brokers: m.totalBrokerCount ?? 0,
      agents: m.totalAgentCount ?? 0,
      pending: m.pendingRequests ?? 0,
      approved: m.acceptedRequests ?? 0,
    };
  }, [rawMetrics]);

  // Brokers list — paginated (loads more as the user scrolls).
  const {
    items: brokers,
    loading: brokersLoading,
    loadingMore: brokersLoadingMore,
    loadMore: loadMoreBrokers,
  } = usePaginatedFetch(
    token => getOrgBrokersList(token ? {nextToken: token} : {}),
    extractOrgPage,
    [],
  );

  // Agents list — paginated.
  const {
    items: agents,
    loading: agentsLoading,
    loadingMore: agentsLoadingMore,
    loadMore: loadMoreAgents,
  } = usePaginatedFetch(
    token => getOrgAgentsList(token ? {nextToken: token} : {}),
    extractOrgPage,
    [],
  );

  const KPIS = [
    {label: 'Total Brokers', value: kpis.brokers, icon: icPeople},
    {label: 'Total Agents', value: kpis.agents, icon: icProfile},
    {label: 'Pending Request', value: kpis.pending, icon: icClock},
    {label: 'Approved Requests', value: kpis.approved, icon: icCheck},
  ];

  const listLoading = tab === 'broker' ? brokersLoading : agentsLoading;
  const listLoadingMore =
    tab === 'broker' ? brokersLoadingMore : agentsLoadingMore;
  const loadMoreRows = tab === 'broker' ? loadMoreBrokers : loadMoreAgents;
  const rows = tab === 'broker' ? brokers : agents;

  return (
    <ImageBackground source={gridBg} resizeMode="cover" style={styles.bg}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={appColors.background}
        translucent={false}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={e => {
          const {layoutMeasurement, contentOffset, contentSize} =
            e.nativeEvent;
          const distanceToBottom =
            contentSize.height - contentOffset.y - layoutMeasurement.height;
          if (distanceToBottom < LOAD_MORE_THRESHOLD) {
            loadMoreRows();
          }
        }}
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
          <TouchableOpacity
            style={styles.iconBtnCircle}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('EditProfile')}>
            <CurrentUserAvatar
              size={scaleWidth(44)}
              fallbackIconStyle={styles.headerIcon}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.greeting}>Hi, {firstName} 👋</Text>
        <Text style={styles.greetingSub}>Here's your organisation overview</Text>

        {/* KPI cards (2x2) */}
        <View style={styles.kpiGrid}>
          {KPIS.map(k => (
            <View key={k.label} style={styles.kpiCard}>
              <View style={styles.kpiTop}>
                <Text style={styles.kpiLabel} numberOfLines={2}>
                  {k.label}
                </Text>
                <View style={styles.kpiBadge}>
                  <Image source={k.icon} style={styles.kpiIcon} />
                </View>
              </View>
              <Text style={styles.kpiValue}>{k.value}</Text>
            </View>
          ))}
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['broker', 'agent'] as const).map(t => {
            const active = tab === t;
            return (
              <TouchableOpacity
                key={t}
                activeOpacity={0.85}
                onPress={() => setTab(t)}
                style={[styles.tabChip, active && styles.tabChipActive]}>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {t === 'broker' ? 'Brokers' : 'Agents'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* List */}
        {listLoading && rows.length === 0 ? (
          <ActivityIndicator
            color={appColors.maroon}
            style={{marginTop: scaleWidth(30)}}
          />
        ) : rows.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              No {tab === 'broker' ? 'brokers' : 'agents'} found.
            </Text>
          </View>
        ) : (
          <View style={styles.card}>
            {rows.map((item: any, i: number) => (
              <View key={item.id ?? i}>
                {i > 0 ? <View style={styles.divider} /> : null}
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.row}
                  onPress={() => {
                    const id = item.id ?? item.userId;
                    if (!id) {
                      return;
                    }
                    if (tab === 'broker') {
                      navigation.navigate('BrokerDetails', {
                        brokerId: id,
                        name: item.name,
                      });
                    } else {
                      navigation.navigate('AgentDetails', {
                        agentId: id,
                        name: item.name,
                      });
                    }
                  }}>
                  <View style={styles.rowAvatar}>
                    <Text style={styles.rowAvatarText}>
                      {String(item.name ?? '?')
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {item.name ?? '—'}
                    </Text>
                    {tab === 'broker' ? (
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {item.agentCount ?? 0} agents ·{' '}
                        {item.totalSearches ?? 0} searches
                      </Text>
                    ) : (
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {item.totalSearches ?? 0} property searches
                      </Text>
                    )}
                  </View>
                  {tab === 'broker' ? (
                    <Text style={styles.rowDate}>
                      {fmtDate(item.lastLogin)}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        {listLoadingMore ? (
          <ActivityIndicator
            color={appColors.maroon}
            style={{marginTop: scaleWidth(16)}}
          />
        ) : null}
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleWidth(14),
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
    width: scaleWidth(20),
    height: scaleWidth(20),
    tintColor: appColors.coffeeDark,
  },
  headerTitle: {...typography(700, 18, 'coffeeDark'), fontWeight: '700'},
  greeting: {...typography(700, 22, 'coffeeDark'), fontWeight: '700'},
  greetingSub: {
    ...typography('regular', 14, 'gray'),
    marginTop: scaleWidth(2),
    marginBottom: scaleWidth(18),
  },

  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  kpiCard: {
    width: '48.5%',
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(14),
    padding: scaleWidth(13),
    marginBottom: scaleWidth(10),
    ...shadow,
  },
  kpiTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiLabel: {
    flex: 1,
    ...typography('regular', 12, 'gray'),
    marginRight: scaleWidth(6),
  },
  kpiBadge: {
    width: scaleWidth(28),
    height: scaleWidth(28),
    borderRadius: scaleWidth(28),
    backgroundColor: appColors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiIcon: {
    width: scaleWidth(14),
    height: scaleWidth(14),
    tintColor: appColors.maroon,
  },
  kpiValue: {
    ...typography(700, 22, 'maroon'),
    fontWeight: '700',
    marginTop: scaleWidth(8),
  },

  tabs: {
    flexDirection: 'row',
    marginTop: scaleWidth(8),
    marginBottom: scaleWidth(14),
  },
  tabChip: {
    paddingHorizontal: scaleWidth(22),
    paddingVertical: scaleWidth(10),
    borderRadius: scaleWidth(12),
    marginRight: scaleWidth(10),
    backgroundColor: appColors.white,
    ...shadow,
  },
  tabChipActive: {backgroundColor: appColors.maroon},
  tabText: {...typography(600, 14, 'coffeeDark'), fontWeight: '600'},
  tabTextActive: {color: appColors.white},

  card: {
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(18),
    paddingHorizontal: scaleWidth(16),
    ...shadow,
  },
  divider: {height: 1, backgroundColor: '#F1EDEA'},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleWidth(14),
  },
  rowAvatar: {
    width: scaleWidth(40),
    height: scaleWidth(40),
    borderRadius: scaleWidth(40),
    backgroundColor: appColors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(12),
  },
  rowAvatarText: {...typography(700, 16, 'white'), fontWeight: '700'},
  rowBody: {flex: 1, paddingRight: scaleWidth(8)},
  rowName: {...typography(600, 15, 'coffeeDark'), fontWeight: '600'},
  rowMeta: {...typography('regular', 12, 'gray'), marginTop: scaleWidth(3)},
  rowDate: {...typography('regular', 11, 'gray'), maxWidth: scaleWidth(80), textAlign: 'right'},

  empty: {alignItems: 'center', paddingVertical: scaleWidth(36)},
  emptyText: {...typography('regular', 14, 'gray')},
});

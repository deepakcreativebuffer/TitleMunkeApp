import React, {useCallback, useMemo, useState} from 'react';
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
  Alert,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {appColors, typography, scaleWidth} from '../../global';
import {AppStackParamList} from '../../types';
import {useDrawer} from '../../context/DrawerContext';
import {useAppSelector} from '../../store';
import {userProfileSelector} from '../../slices';
import {useFetch} from '../../hooks';
import {shareCsvInApp} from '../../utils/documents';
import {
  getAdminMetrics,
  listOrganisations,
  listBrokersForAdmin,
  listAgentsForAdmin,
} from '../../api/userAdmin.api';

const gridBg = require('../../assets/images/grid-bg.png');
const icMenu = require('../../assets/images/ic-menu.png');
const icProfile = require('../../assets/images/ic-profile.png');
const icPeople = require('../../assets/images/ic-people.png');
const icList = require('../../assets/images/ic-list.png');
const icClock = require('../../assets/images/ic-clock.png');
const icDownload = require('../../assets/images/ic-download.png');

type TabKey = 'organisation' | 'broker' | 'agent';

const TIME_FILTERS = [
  {key: 'all_time', label: 'All Time'},
  {key: 'this_month', label: 'This Month'},
  {key: 'this_week', label: 'This Week'},
];

const fmtDate = (raw?: string | number): string => {
  if (!raw) {
    return 'N/A';
  }
  const d = new Date(raw);
  if (isNaN(d.getTime())) {
    return String(raw);
  }
  return d.toLocaleString(undefined, {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const listFrom = (res: any): any[] =>
  res?.updatedOrganisations ??
  res?.items ??
  res?.data?.items ??
  res?.data ??
  (Array.isArray(res) ? res : []);

const statusMeta = (status?: string): {bg: string; color: string} => {
  const s = String(status ?? '').toUpperCase();
  if (s === 'ACTIVE') {
    return {bg: 'rgba(30,135,75,0.12)', color: appColors.success};
  }
  if (s === 'DELETED') {
    return {bg: 'rgba(193,52,52,0.12)', color: appColors.error};
  }
  return {bg: 'rgba(169,130,28,0.15)', color: appColors.warning};
};

export const AdminDashboard = () => {
  const insets = useSafeAreaInsets();
  const {openDrawer} = useDrawer();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const profile = useAppSelector(userProfileSelector);
  const firstName = profile?.name || profile?.email?.split('@')[0] || 'admin';

  const [filter, setFilter] = useState('all_time');
  const [tab, setTab] = useState<TabKey>('organisation');

  // KPIs
  const metricsFetcher = useCallback(() => getAdminMetrics(filter), [filter]);
  const {data: rawMetrics} = useFetch(metricsFetcher, [filter]);
  const m = useMemo(
    () => (rawMetrics as any)?.data ?? rawMetrics ?? {},
    [rawMetrics],
  );
  const kpis = [
    {label: 'Total Organization', value: m.ORGANISATION ?? 0, icon: icPeople},
    {label: 'Total Brokers', value: m.BROKER ?? 0, icon: icPeople},
    {label: 'Total Agents', value: m.AGENT ?? 0, icon: icProfile},
    {label: 'Total Counties', value: m.totalCounties ?? 0, icon: icList},
    {label: 'Demo Requests', value: m.demoRequestCount ?? 0, icon: icClock},
  ];

  // Business list per tab
  const listFetcher = useCallback(() => {
    const params = {admin_dashboard_global_filter: filter};
    if (tab === 'organisation') {
      return listOrganisations(params);
    }
    if (tab === 'broker') {
      return listBrokersForAdmin(params);
    }
    return listAgentsForAdmin(params);
  }, [tab, filter]);
  const {data: rawRows, loading} = useFetch(listFetcher, [tab, filter]);
  const rows = useMemo(() => listFrom(rawRows), [rawRows]);

  const totalBusiness =
    tab === 'organisation'
      ? m.organisationRevenueResults
      : tab === 'broker'
        ? m.brokerRevenueResults
        : m.agentRevenueResults;

  const onExport = useCallback(() => {
    const headers = ['Sr. No.', 'Name', 'Status', 'Property Search', 'Business'];
    const data = rows.map((r: any, i: number) => [
      i + 1,
      r.name ?? '',
      r.status ?? '',
      r.totalSearches ?? 0,
      `$${r.revenue ?? 0}`,
    ]);
    shareCsvInApp(`admin-${tab}-${filter}.csv`, headers, data).catch(() =>
      Alert.alert('Export failed', 'Could not generate the CSV.'),
    );
  }, [rows, tab, filter]);

  const openDetail = (item: any) => {
    const id = item.id ?? item.userId;
    if (!id) {
      return;
    }
    if (tab === 'broker') {
      navigation.navigate('AdminBrokerDetails', {brokerId: id, name: item.name});
    } else if (tab === 'agent') {
      navigation.navigate('AgentDetails', {agentId: id, name: item.name});
    } else {
      navigation.navigate('OrgDetails', {orgId: id, name: item.name});
    }
  };

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

        <Text style={styles.greeting}>Hi, {firstName} 👋</Text>

        {/* Time filter */}
        <View style={styles.timeRow}>
          {TIME_FILTERS.map(f => {
            const on = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                activeOpacity={0.85}
                onPress={() => setFilter(f.key)}
                style={[styles.timeChip, on && styles.timeChipOn]}>
                <Text style={[styles.timeText, on && styles.timeTextOn]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* KPI cards */}
        <View style={styles.kpiGrid}>
          {kpis.map(k => (
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
          {(['organisation', 'broker', 'agent'] as TabKey[]).map(t => {
            const active = tab === t;
            return (
              <TouchableOpacity
                key={t}
                activeOpacity={0.85}
                onPress={() => setTab(t)}
                style={[styles.tabChip, active && styles.tabChipActive]}>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {t === 'organisation'
                    ? 'Organization'
                    : t === 'broker'
                      ? 'Brokers'
                      : 'Agents'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Total business + export */}
        <View style={styles.businessRow}>
          <View style={styles.businessLeft}>
            <Text style={styles.businessLabel}>Total Business</Text>
            <Text style={styles.businessValue}>${totalBusiness ?? 0}</Text>
          </View>
          <TouchableOpacity
            style={styles.exportBtn}
            activeOpacity={0.85}
            onPress={onExport}>
            <Image source={icDownload} style={styles.exportIcon} />
            <Text style={styles.exportText}>CSV</Text>
          </TouchableOpacity>
        </View>

        {/* List */}
        {loading && rows.length === 0 ? (
          <ActivityIndicator
            color={appColors.maroon}
            style={{marginTop: scaleWidth(30)}}
          />
        ) : rows.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No records found.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {rows.map((item: any, i: number) => {
              const sMeta = statusMeta(item.status);
              const sub =
                tab === 'organisation'
                  ? `${item.totalActiveCount ?? 0} members · ${item.totalSearches ?? 0} searches`
                  : tab === 'broker'
                    ? `${item.agentCount ?? 0} agents · ${item.totalSearches ?? 0} searches`
                    : `${item.totalSearches ?? 0} property searches`;
              return (
                <View key={item.id ?? i}>
                  {i > 0 ? <View style={styles.divider} /> : null}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.row}
                    onPress={() => openDetail(item)}>
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
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {sub}
                      </Text>
                    </View>
                    <View style={styles.rowRight}>
                      <View style={[styles.pill, {backgroundColor: sMeta.bg}]}>
                        <Text style={[styles.pillText, {color: sMeta.color}]}>
                          {String(item.status ?? '').toUpperCase() || '—'}
                        </Text>
                      </View>
                      <Text style={styles.rowBiz}>${item.revenue ?? 0}</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
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
  greeting: {
    ...typography(700, 22, 'coffeeDark'),
    fontWeight: '700',
    marginBottom: scaleWidth(14),
  },

  timeRow: {flexDirection: 'row', marginBottom: scaleWidth(16)},
  timeChip: {
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleWidth(9),
    borderRadius: scaleWidth(10),
    marginRight: scaleWidth(8),
    backgroundColor: appColors.white,
    borderWidth: 1.4,
    borderColor: appColors.inputBorder,
  },
  timeChipOn: {backgroundColor: appColors.maroon, borderColor: appColors.maroon},
  timeText: {...typography(500, 13, 'coffeeDark'), fontWeight: '500'},
  timeTextOn: {color: appColors.white},

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

  tabs: {flexDirection: 'row', marginTop: scaleWidth(4), marginBottom: scaleWidth(14)},
  tabChip: {
    paddingHorizontal: scaleWidth(18),
    paddingVertical: scaleWidth(10),
    borderRadius: scaleWidth(12),
    marginRight: scaleWidth(8),
    backgroundColor: appColors.white,
    ...shadow,
  },
  tabChipActive: {backgroundColor: appColors.maroon},
  tabText: {...typography(600, 13, 'coffeeDark'), fontWeight: '600'},
  tabTextActive: {color: appColors.white},

  businessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleWidth(12),
  },
  businessLeft: {flexDirection: 'row', alignItems: 'baseline'},
  businessLabel: {
    ...typography(700, 16, 'coffeeDark'),
    fontWeight: '700',
    marginRight: scaleWidth(10),
  },
  businessValue: {...typography(700, 18, 'maroon'), fontWeight: '700'},
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.white,
    borderWidth: 1.4,
    borderColor: appColors.inputBorder,
    borderRadius: scaleWidth(10),
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleWidth(8),
  },
  exportIcon: {
    width: scaleWidth(14),
    height: scaleWidth(14),
    tintColor: appColors.coffeeDark,
    marginRight: scaleWidth(6),
  },
  exportText: {...typography(600, 12, 'coffeeDark'), fontWeight: '600'},

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
  rowRight: {alignItems: 'flex-end'},
  pill: {
    borderRadius: scaleWidth(8),
    paddingHorizontal: scaleWidth(8),
    paddingVertical: scaleWidth(3),
  },
  pillText: {...typography(700, 10, 'success'), fontWeight: '700', letterSpacing: 0.3},
  rowBiz: {...typography(600, 13, 'coffeeDark'), fontWeight: '600', marginTop: scaleWidth(5)},

  empty: {alignItems: 'center', paddingVertical: scaleWidth(36)},
  emptyText: {...typography('regular', 14, 'gray')},
});

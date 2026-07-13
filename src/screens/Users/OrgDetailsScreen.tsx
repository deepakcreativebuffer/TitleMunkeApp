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
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {appColors, typography, scaleWidth} from '../../global';
import {AppScreenProps} from '../../types';
import {useFetch} from '../../hooks';
import {
  getOrganisationDetails,
  getOrganisationBrokerDetails,
  getOrganisationAgentDetails,
} from '../../api/userAdmin.api';
import {RangeFilter, DateRange} from '../../components/RangeFilter';

const gridBg = require('../../assets/images/grid-bg.png');
const icChevron = require('../../assets/images/ic-chevron.png');

const unwrap = (raw: any) => raw?.data ?? raw;

const listFrom = (res: any): any[] =>
  Array.isArray(res) ? res : res?.items ?? res?.data?.items ?? res?.data ?? [];

const fmtDate = (raw?: string | number, withTime = false): string => {
  if (!raw) {
    return '--';
  }
  const d = new Date(raw);
  if (isNaN(d.getTime())) {
    return String(raw);
  }
  return d.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    ...(withTime ? {hour: '2-digit', minute: '2-digit'} : {}),
  });
};

const statusMeta = (status?: string): {bg: string; color: string} => {
  const s = String(status ?? '').toUpperCase();
  if (s === 'ACTIVE') {
    return {bg: 'rgba(30,130,33,0.13)', color: appColors.success};
  }
  if (s === 'DELETED') {
    return {bg: 'rgba(193,52,52,0.13)', color: appColors.error};
  }
  return {bg: 'rgba(162,120,30,0.15)', color: appColors.warning};
};

export const OrgDetailsScreen = ({
  navigation,
  route,
}: AppScreenProps<'OrgDetails'>) => {
  const insets = useSafeAreaInsets();
  const orgId = route.params?.orgId;
  const [tab, setTab] = useState<'broker' | 'agent'>('broker');
  const [range, setRange] = useState<DateRange>({});

  const detailsFetcher = useCallback(
    () => (orgId ? getOrganisationDetails(orgId) : Promise.resolve(null)),
    [orgId],
  );
  const {data: rawDetails, loading: detailsLoading} = useFetch(detailsFetcher, [
    orgId,
  ]);

  const listFetcher = useCallback(
    () =>
      orgId
        ? tab === 'broker'
          ? getOrganisationBrokerDetails(orgId, range.fromDatetime, range.toDatetime)
          : getOrganisationAgentDetails(orgId, range.fromDatetime, range.toDatetime)
        : Promise.resolve(null),
    [orgId, tab, range],
  );
  const {data: rawList, loading: listLoading} = useFetch(listFetcher, [
    orgId,
    tab,
    range,
  ]);

  const org = useMemo(() => {
    const d = unwrap(rawDetails) ?? {};
    return {
      name: d.name ?? route.params?.name ?? 'Organization',
      email: d.email ?? '',
      status: String(d.status ?? '').toUpperCase(),
      avatar: d.signedUrl as string | undefined,
      createdAt: fmtDate(d.createdAt),
      lastActivity: fmtDate(d.lastLogin),
      searchCount: d.totalSearches ?? d.searchCount ?? 0,
    };
  }, [rawDetails, route.params]);

  const rows = useMemo(
    () =>
      listFrom(rawList).map((u, i) => ({
        id: String(u.id ?? u.userId ?? i),
        name: u.name ?? '—',
        lastActivity: fmtDate(u.lastLogin ?? u.last_login),
        searches: u.totalSearches ?? 0,
      })),
    [rawList],
  );

  const initial = (org.name || 'O').charAt(0).toUpperCase();
  const st = statusMeta(org.status);

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
          {paddingBottom: insets.bottom + scaleWidth(24)},
        ]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}>
            <Image source={icChevron} style={styles.backIcon} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Organization Details</Text>
          <View style={styles.backBtnPlaceholder} />
        </View>

        {/* Profile / metrics card */}
        <View style={styles.card}>
          {detailsLoading && !rawDetails ? (
            <ActivityIndicator color={appColors.maroon} />
          ) : (
            <>
              <View style={styles.profileRow}>
                {org.avatar ? (
                  <Image source={{uri: org.avatar}} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initial}</Text>
                  </View>
                )}
                <View style={styles.profileInfo}>
                  <Text style={styles.name} numberOfLines={1}>
                    {org.name}
                  </Text>
                  <Text style={styles.email} numberOfLines={1}>
                    {org.email}
                  </Text>
                  {org.status ? (
                    <View style={[styles.statusPill, {backgroundColor: st.bg}]}>
                      <View style={[styles.statusDot, {backgroundColor: st.color}]} />
                      <Text style={[styles.statusText, {color: st.color}]}>
                        {org.status}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.metaGrid}>
                <View style={styles.metaCellWide}>
                  <Text style={styles.metaLabel}>Account Created</Text>
                  <Text style={styles.metaValue}>{org.createdAt}</Text>
                </View>
                <View style={styles.metaCellWide}>
                  <Text style={styles.metaLabel}>Last Activity</Text>
                  <Text style={styles.metaValue}>{org.lastActivity}</Text>
                </View>
                <View style={styles.metaCellWide}>
                  <Text style={styles.metaLabel}>Search Count</Text>
                  <Text style={styles.metaValue}>{org.searchCount}</Text>
                </View>
              </View>
            </>
          )}
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
                  {t === 'broker' ? 'Broker' : 'Agent'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>
          {tab === 'broker' ? 'All Brokers' : 'All Agents'}
        </Text>
        <View style={styles.filterRow}>
          <RangeFilter onChange={setRange} />
        </View>

        {/* List */}
        <View style={styles.card}>
          {listLoading && rows.length === 0 ? (
            <ActivityIndicator
              color={appColors.maroon}
              style={{marginVertical: scaleWidth(20)}}
            />
          ) : rows.length === 0 ? (
            <Text style={styles.empty}>No Records found.</Text>
          ) : (
            rows.map((r, i) => (
              <View key={r.id}>
                {i > 0 ? <View style={styles.rowDivider} /> : null}
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.row}
                  onPress={() =>
                    tab === 'broker'
                      ? navigation.navigate('AdminBrokerDetails', {
                          brokerId: r.id,
                          name: r.name,
                        })
                      : navigation.navigate('AgentDetails', {
                          agentId: r.id,
                          name: r.name,
                        })
                  }>
                  <Text style={styles.srNo}>{i + 1}</Text>
                  <View style={styles.rowAvatar}>
                    <Text style={styles.rowAvatarText}>
                      {r.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {r.name}
                    </Text>
                    <Text style={styles.rowMeta}>
                      {r.searches} searches · {r.lastActivity}
                    </Text>
                  </View>
                  <Image source={icChevron} style={styles.rowChevron} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
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
    marginBottom: scaleWidth(18),
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
  backBtnPlaceholder: {width: scaleWidth(44), height: scaleWidth(44)},
  backIcon: {
    width: scaleWidth(17),
    height: scaleWidth(17),
    tintColor: appColors.coffeeDark,
    transform: [{scaleX: -1}],
  },
  headerTitle: {...typography(700, 17, 'coffeeDark'), fontWeight: '700'},
  card: {
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(18),
    padding: scaleWidth(18),
    marginBottom: scaleWidth(16),
    ...shadow,
  },
  profileRow: {flexDirection: 'row', alignItems: 'center'},
  avatar: {
    width: scaleWidth(60),
    height: scaleWidth(60),
    borderRadius: scaleWidth(60),
    backgroundColor: appColors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: scaleWidth(60),
    height: scaleWidth(60),
    borderRadius: scaleWidth(60),
  },
  avatarText: {...typography(700, 24, 'white'), fontWeight: '700'},
  profileInfo: {flex: 1, marginLeft: scaleWidth(14)},
  name: {...typography(700, 18, 'coffeeDark'), fontWeight: '700'},
  email: {...typography('regular', 13, 'maroon'), marginTop: scaleWidth(2)},
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: scaleWidth(20),
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleWidth(4),
    marginTop: scaleWidth(8),
  },
  statusDot: {
    width: scaleWidth(7),
    height: scaleWidth(7),
    borderRadius: scaleWidth(7),
    marginRight: scaleWidth(6),
  },
  statusText: {...typography(600, 11, 'coffeeDark'), fontWeight: '600'},
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: scaleWidth(18),
    borderTopWidth: 1,
    borderTopColor: '#F1EDEA',
    paddingTop: scaleWidth(16),
  },
  metaCellWide: {width: '50%', marginBottom: scaleWidth(14)},
  metaLabel: {...typography('regular', 12, 'gray')},
  metaValue: {
    ...typography(600, 15, 'coffeeDark'),
    fontWeight: '600',
    marginTop: scaleWidth(4),
  },
  tabs: {flexDirection: 'row', marginBottom: scaleWidth(14)},
  tabChip: {
    paddingHorizontal: scaleWidth(24),
    paddingVertical: scaleWidth(10),
    borderRadius: scaleWidth(12),
    marginRight: scaleWidth(10),
    backgroundColor: appColors.white,
    ...shadow,
  },
  tabChipActive: {backgroundColor: appColors.maroon},
  tabText: {...typography(600, 14, 'coffeeDark'), fontWeight: '600'},
  tabTextActive: {color: appColors.white},
  sectionTitle: {
    ...typography(700, 16, 'coffeeDark'),
    fontWeight: '700',
    marginBottom: scaleWidth(10),
  },
  filterRow: {marginBottom: scaleWidth(12)},
  empty: {
    ...typography('regular', 14, 'gray'),
    textAlign: 'center',
    paddingVertical: scaleWidth(24),
  },
  rowDivider: {height: 1, backgroundColor: '#F1EDEA'},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleWidth(13),
  },
  srNo: {
    ...typography(600, 13, 'gray'),
    fontWeight: '600',
    width: scaleWidth(22),
  },
  rowAvatar: {
    width: scaleWidth(38),
    height: scaleWidth(38),
    borderRadius: scaleWidth(38),
    backgroundColor: appColors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(12),
  },
  rowAvatarText: {...typography(700, 15, 'white'), fontWeight: '700'},
  rowBody: {flex: 1, paddingRight: scaleWidth(8)},
  rowName: {...typography(600, 15, 'coffeeDark'), fontWeight: '600'},
  rowMeta: {...typography('regular', 12, 'gray'), marginTop: scaleWidth(3)},
  rowChevron: {
    width: scaleWidth(13),
    height: scaleWidth(13),
    tintColor: appColors.gray,
  },
});

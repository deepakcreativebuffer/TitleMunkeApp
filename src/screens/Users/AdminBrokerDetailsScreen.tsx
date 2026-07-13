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
import {getBrokerDetails, getBrokerAgentDetails} from '../../api/userAdmin.api';
import {RangeFilter, DateRange} from '../../components/RangeFilter';

const gridBg = require('../../assets/images/grid-bg.png');
const icChevron = require('../../assets/images/ic-chevron.png');

const unwrap = (raw: any) => raw?.data ?? raw;

const listFrom = (res: any): any[] =>
  Array.isArray(res)
    ? res
    : res?.items ?? res?.agents ?? res?.data?.items ?? res?.data ?? [];

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

export const AdminBrokerDetailsScreen = ({
  navigation,
  route,
}: AppScreenProps<'AdminBrokerDetails'>) => {
  const insets = useSafeAreaInsets();
  const brokerId = route.params?.brokerId;
  const [range, setRange] = useState<DateRange>({});

  const detailsFetcher = useCallback(
    () => (brokerId ? getBrokerDetails(brokerId) : Promise.resolve(null)),
    [brokerId],
  );
  const {data: rawDetails, loading: detailsLoading} = useFetch(detailsFetcher, [
    brokerId,
  ]);

  const agentsFetcher = useCallback(
    () =>
      brokerId
        ? getBrokerAgentDetails(brokerId, true, range.fromDatetime, range.toDatetime)
        : Promise.resolve(null),
    [brokerId, range],
  );
  const {data: rawAgents, loading: agentsLoading} = useFetch(agentsFetcher, [
    brokerId,
    range,
  ]);

  const broker = useMemo(() => {
    const d = unwrap(rawDetails) ?? {};
    return {
      name: d.name ?? route.params?.name ?? 'Broker',
      email: d.email ?? '',
      status: String(d.status ?? '').toUpperCase(),
      avatar: d.signedUrl as string | undefined,
      organisation:
        d.relationship?.organisationFirstName ??
        d.underOrganisationInfo?.name ??
        '-',
      createdAt: fmtDate(d.createdAt),
      lastActivity: fmtDate(d.lastLogin),
      searchCount: d.totalSearches ?? d.searchCount ?? 0,
    };
  }, [rawDetails, route.params]);

  const agents = useMemo(
    () =>
      listFrom(rawAgents).map((a, i) => ({
        id: String(a.agentId ?? a.id ?? a.userId ?? i),
        name: a.name ?? a.agentName ?? '—',
        lastActivity: fmtDate(a.lastLogin ?? a.last_login),
        searches: a.totalSearches ?? 0,
      })),
    [rawAgents],
  );

  const initial = (broker.name || 'B').charAt(0).toUpperCase();
  const st = statusMeta(broker.status);

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
          <Text style={styles.headerTitle}>Broker Details</Text>
          <View style={styles.backBtnPlaceholder} />
        </View>

        {/* Profile / metrics card */}
        <View style={styles.card}>
          {detailsLoading && !rawDetails ? (
            <ActivityIndicator color={appColors.maroon} />
          ) : (
            <>
              <View style={styles.profileRow}>
                {broker.avatar ? (
                  <Image source={{uri: broker.avatar}} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initial}</Text>
                  </View>
                )}
                <View style={styles.profileInfo}>
                  <Text style={styles.name} numberOfLines={1}>
                    {broker.name}
                  </Text>
                  <Text style={styles.email} numberOfLines={1}>
                    {broker.email}
                  </Text>
                  {broker.status ? (
                    <View style={[styles.statusPill, {backgroundColor: st.bg}]}>
                      <View style={[styles.statusDot, {backgroundColor: st.color}]} />
                      <Text style={[styles.statusText, {color: st.color}]}>
                        {broker.status}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.metaGrid}>
                <View style={styles.metaCell}>
                  <Text style={styles.metaLabel}>Associated Organization</Text>
                  <Text style={styles.metaValue}>{broker.organisation}</Text>
                </View>
                <View style={styles.metaCell}>
                  <Text style={styles.metaLabel}>Search Count</Text>
                  <Text style={styles.metaValue}>{broker.searchCount}</Text>
                </View>
                <View style={styles.metaCell}>
                  <Text style={styles.metaLabel}>Account Created</Text>
                  <Text style={styles.metaValue}>{broker.createdAt}</Text>
                </View>
                <View style={styles.metaCell}>
                  <Text style={styles.metaLabel}>Last Activity</Text>
                  <Text style={styles.metaValue}>{broker.lastActivity}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Agents list */}
        <Text style={styles.sectionTitle}>All Agents</Text>
        <View style={styles.filterRow}>
          <RangeFilter onChange={setRange} />
        </View>
        <View style={styles.card}>
          {agentsLoading && agents.length === 0 ? (
            <ActivityIndicator
              color={appColors.maroon}
              style={{marginVertical: scaleWidth(20)}}
            />
          ) : agents.length === 0 ? (
            <Text style={styles.empty}>No Records found.</Text>
          ) : (
            agents.map((a, i) => (
              <View key={a.id}>
                {i > 0 ? <View style={styles.rowDivider} /> : null}
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.row}
                  onPress={() =>
                    navigation.navigate('AgentDetails', {
                      agentId: a.id,
                      name: a.name,
                    })
                  }>
                  <Text style={styles.srNo}>{i + 1}</Text>
                  <View style={styles.rowAvatar}>
                    <Text style={styles.rowAvatarText}>
                      {a.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {a.name}
                    </Text>
                    <Text style={styles.rowMeta}>
                      {a.searches} searches · {a.lastActivity}
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
  headerTitle: {...typography(700, 18, 'coffeeDark'), fontWeight: '700'},
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
  metaCell: {width: '50%', marginBottom: scaleWidth(16)},
  metaLabel: {...typography('regular', 12, 'gray')},
  metaValue: {
    ...typography(600, 15, 'coffeeDark'),
    fontWeight: '600',
    marginTop: scaleWidth(4),
  },
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

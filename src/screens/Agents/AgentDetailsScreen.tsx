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
import {getAgentDetails, getAgentSearches} from '../../api/userAdmin.api';
import {RangeFilter, DateRange} from '../../components/RangeFilter';

const gridBg = require('../../assets/images/grid-bg.png');
const icChevron = require('../../assets/images/ic-chevron.png');

const unwrap = (raw: any) => raw?.data ?? raw;

const fmtDate = (raw?: string | number, withTime = false): string => {
  if (!raw) {
    return '--';
  }
  const d = new Date(raw);
  if (isNaN(d.getTime())) {
    return String(raw);
  }
  return d.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    ...(withTime ? {hour: '2-digit', minute: '2-digit', second: '2-digit'} : {}),
  });
};

// Colour for the agent's account status / a search status.
const statusMeta = (status?: string): {bg: string; color: string} => {
  const s = String(status ?? '').toUpperCase();
  if (s === 'ACTIVE' || s === 'SUCCESS') {
    return {bg: 'rgba(30,130,33,0.13)', color: appColors.success};
  }
  if (s === 'DELETED' || s === 'FAILED' || s === 'UNSUCCESSFUL') {
    return {bg: 'rgba(193,52,52,0.13)', color: appColors.error};
  }
  return {bg: 'rgba(162,120,30,0.15)', color: appColors.warning};
};

export const AgentDetailsScreen = ({
  navigation,
  route,
}: AppScreenProps<'AgentDetails'>) => {
  const insets = useSafeAreaInsets();
  const agentId = route.params?.agentId;
  const [range, setRange] = useState<DateRange>({});

  const detailsFetcher = useCallback(
    () => (agentId ? getAgentDetails(agentId) : Promise.resolve(null)),
    [agentId],
  );
  const {data: rawDetails, loading: detailsLoading} = useFetch(detailsFetcher, [
    agentId,
  ]);

  const searchesFetcher = useCallback(
    () =>
      agentId
        ? getAgentSearches(agentId, range.fromDatetime, range.toDatetime)
        : Promise.resolve(null),
    [agentId, range],
  );
  const {data: rawSearches, loading: searchesLoading} = useFetch(
    searchesFetcher,
    [agentId, range],
  );

  const agent = useMemo(() => {
    const d = unwrap(rawDetails) ?? {};
    return {
      name: d.name ?? route.params?.name ?? 'Agent',
      email: d.email ?? '',
      status: String(d.status ?? '').toUpperCase(),
      avatar: d.signedUrl as string | undefined,
      broker: d.relationship?.brokerFirstName ?? '-',
      createdAt: fmtDate(d.createdAt),
      lastActivity: fmtDate(d.lastLogin),
      searchCount: d.totalSearches ?? d.searchCount ?? 0,
    };
  }, [rawDetails, route.params]);

  const searches = useMemo(() => {
    const raw = rawSearches as any;
    const list: any[] = Array.isArray(raw)
      ? raw
      : raw?.data ?? raw?.items ?? [];
    return list.map((it, i) => ({
      id: String(it.id ?? i),
      address: it.address ?? '—',
      when: fmtDate(it.createdAt ?? it.updatedAt, true),
      status: String(it.status ?? '').toUpperCase(),
      searchId: it.searchId ?? it.search_id,
    }));
  }, [rawSearches]);

  const initial = (agent.name || 'A').charAt(0).toUpperCase();
  const st = statusMeta(agent.status);

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
          <Text style={styles.headerTitle}>Agent Details</Text>
          <View style={styles.backBtnPlaceholder} />
        </View>

        {/* Profile / metrics card */}
        <View style={styles.card}>
          {detailsLoading && !rawDetails ? (
            <ActivityIndicator color={appColors.maroon} />
          ) : (
            <>
              <View style={styles.profileRow}>
                {agent.avatar ? (
                  <Image source={{uri: agent.avatar}} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initial}</Text>
                  </View>
                )}
                <View style={styles.profileInfo}>
                  <Text style={styles.name} numberOfLines={1}>
                    {agent.name}
                  </Text>
                  <Text style={styles.email} numberOfLines={1}>
                    {agent.email}
                  </Text>
                  {agent.status ? (
                    <View style={[styles.statusPill, {backgroundColor: st.bg}]}>
                      <View
                        style={[styles.statusDot, {backgroundColor: st.color}]}
                      />
                      <Text style={[styles.statusText, {color: st.color}]}>
                        {agent.status}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.metaGrid}>
                <View style={styles.metaCell}>
                  <Text style={styles.metaLabel}>Associated Broker</Text>
                  <Text style={styles.metaValue}>{agent.broker}</Text>
                </View>
                <View style={styles.metaCell}>
                  <Text style={styles.metaLabel}>Search Count</Text>
                  <Text style={styles.metaValue}>{agent.searchCount}</Text>
                </View>
                <View style={styles.metaCell}>
                  <Text style={styles.metaLabel}>Account Created</Text>
                  <Text style={styles.metaValue}>{agent.createdAt}</Text>
                </View>
                <View style={styles.metaCell}>
                  <Text style={styles.metaLabel}>Last Activity</Text>
                  <Text style={styles.metaValue}>{agent.lastActivity}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Properties searches */}
        <Text style={styles.sectionTitle}>Properties Searches</Text>
        <View style={styles.filterRow}>
          <RangeFilter onChange={setRange} />
        </View>
        <View style={styles.card}>
          {searchesLoading && searches.length === 0 ? (
            <ActivityIndicator
              color={appColors.maroon}
              style={{marginVertical: scaleWidth(20)}}
            />
          ) : searches.length === 0 ? (
            <Text style={styles.empty}>No records found.</Text>
          ) : (
            searches.map((s, i) => {
              const ss = statusMeta(s.status);
              const row = (
                <View style={styles.searchRow}>
                  <Text style={styles.srNo}>{i + 1}</Text>
                  <View style={styles.searchBody}>
                    <Text style={styles.searchAddr} numberOfLines={1}>
                      {s.address}
                    </Text>
                    <Text style={styles.searchWhen}>{s.when}</Text>
                  </View>
                  <View style={[styles.searchPill, {backgroundColor: ss.bg}]}>
                    <Text style={[styles.searchPillText, {color: ss.color}]}>
                      {s.status}
                    </Text>
                  </View>
                </View>
              );
              return (
                <View key={s.id}>
                  {i > 0 ? <View style={styles.rowDivider} /> : null}
                  {s.searchId ? (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() =>
                        navigation.navigate('PropertyReport', {
                          address: s.address,
                          when: s.when,
                          searchId: s.searchId,
                        })
                      }>
                      {row}
                    </TouchableOpacity>
                  ) : (
                    row
                  )}
                </View>
              );
            })
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleWidth(12),
  },
  srNo: {
    ...typography(600, 14, 'coffeeDark'),
    fontWeight: '600',
    width: scaleWidth(24),
  },
  searchBody: {flex: 1, paddingRight: scaleWidth(10)},
  searchAddr: {...typography(600, 14, 'coffeeDark'), fontWeight: '600'},
  searchWhen: {...typography('regular', 12, 'gray'), marginTop: scaleWidth(3)},
  searchPill: {
    borderRadius: scaleWidth(20),
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleWidth(5),
  },
  searchPillText: {...typography(600, 11, 'coffeeDark'), fontWeight: '600'},
  rowDivider: {height: 1, backgroundColor: '#F1EDEA'},
});

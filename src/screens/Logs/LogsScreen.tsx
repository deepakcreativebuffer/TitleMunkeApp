import React, {useState, useCallback, useMemo} from 'react';
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
import {CurrentUserAvatar} from '../../components/CurrentUserAvatar';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {appColors, typography, scaleWidth} from '../../global';
import {useDrawer} from '../../context/DrawerContext';
import {useAppSelector} from '../../store';
import {userProfileSelector, userRoleSelector} from '../../slices';
import {useFetch} from '../../hooks';
import {valueFromStringifyObject, isOrgRole, isAdminRole} from '../../utils';
import {
  getAuditLogsForBroker,
  listAuditLogsByUserId,
  listAuditLogsOrg,
  listAuditLogsAdmin,
} from '../../api/userAdmin.api';

const gridBg = require('../../assets/images/grid-bg.png');
const icMenu = require('../../assets/images/ic-menu.png');
const icLogin = require('../../assets/images/ic-login.png');
const icLogout = require('../../assets/images/ic-logout.png');
const icSearch = require('../../assets/images/ic-search.png');

const TABS = [
  {key: 'brokers', label: 'Brokers', isAgent: false},
  {key: 'agents', label: 'Agents', isAgent: true},
] as const;

// Organisation audit-log tabs map to the `logType` query param.
const ORG_TABS = [
  {key: 'organisation', label: 'Organization'},
  {key: 'broker', label: 'Brokers'},
  {key: 'agent', label: 'Agents'},
] as const;

type LogType = 'login' | 'logout' | 'search';
type LogRow = {id: string; type: LogType; detail: string; when: string};

const fmt = (raw?: string | number): string => {
  if (!raw) {
    return '';
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

const inferType = (detail: string): LogType => {
  const d = detail.toLowerCase();
  if (d.includes('logged in') || d.includes('log in') || d.includes('login')) {
    return 'login';
  }
  if (d.includes('logged out') || d.includes('logout')) {
    return 'logout';
  }
  return 'search';
};

const mapLogs = (res: any): LogRow[] => {
  const items: any[] =
    res?.items ?? res?.data?.items ?? res?.data ?? (Array.isArray(res) ? res : []);
  return items.map((it, i) => {
    const detail = valueFromStringifyObject(it.detail ?? it.message ?? '');
    return {
      id: String(it.id ?? i),
      type: inferType(detail),
      detail,
      when: fmt(it.createdAt ?? it.updatedAt),
    };
  });
};

const TYPE_STYLE: Record<LogType, {icon: number; tint: string; bg: string}> = {
  login: {icon: icLogin, tint: appColors.success, bg: 'rgba(30,135,75,0.12)'},
  logout: {icon: icLogout, tint: appColors.error, bg: 'rgba(193,52,52,0.12)'},
  search: {icon: icSearch, tint: appColors.coffeeLight, bg: 'rgba(152,117,85,0.13)'},
};

export const LogsScreen = () => {
  const insets = useSafeAreaInsets();
  const {openDrawer} = useDrawer();
  const profile = useAppSelector(userProfileSelector);
  const role = useAppSelector(userRoleSelector);
  const isAgentRole = role === 'agent';
  const isOrg = isOrgRole(role);
  const isAdmin = isAdminRole(role);
  const orgStyleTabs = isOrg || isAdmin;
  const brokerId = profile?.sub;
  const [tab, setTab] = useState<string>(
    orgStyleTabs ? 'organisation' : 'brokers',
  );

  // Agents only see their own audit logs (no broker/agent tabs).
  const agentsTab = tab === 'agents';
  const fetcher = useCallback(
    () =>
      isAdmin
        ? listAuditLogsAdmin(tab)
        : isOrg
          ? listAuditLogsOrg(tab)
          : isAgentRole
            ? listAuditLogsByUserId(brokerId as string)
            : getAuditLogsForBroker(brokerId as string, agentsTab),
    [brokerId, agentsTab, isAgentRole, isOrg, isAdmin, tab],
  );
  const {data, loading} = useFetch(fetcher, [
    brokerId,
    agentsTab,
    isAgentRole,
    isOrg,
    isAdmin,
    tab,
  ]);

  const visibleTabs = orgStyleTabs ? ORG_TABS : TABS;
  const rows = useMemo(() => (data ? mapLogs(data) : []), [data]);

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
          <Text style={styles.headerTitle}>Audit Logs</Text>
          <TouchableOpacity style={styles.iconBtnCircle} activeOpacity={0.8}>
            <CurrentUserAvatar
              size={scaleWidth(44)}
              fallbackIconStyle={styles.headerIcon}
            />
          </TouchableOpacity>
        </View>

        {/* Tabs (agents see just their own logs, so no tabs) */}
        {isAgentRole ? null : (
          <View style={styles.tabs}>
            {visibleTabs.map(t => {
              const active = tab === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  activeOpacity={0.85}
                  onPress={() => setTab(t.key)}
                  style={[styles.tabChip, active && styles.tabChipActive]}>
                  <Text
                    style={[styles.tabText, active && styles.tabTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Logs */}
        {loading ? (
          <ActivityIndicator
            color={appColors.maroon}
            style={{marginTop: scaleWidth(40)}}
          />
        ) : rows.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No Records found.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {rows.map((item, i) => {
              const st = TYPE_STYLE[item.type];
              return (
                <View key={item.id}>
                  {i > 0 ? <View style={styles.divider} /> : null}
                  <View style={styles.row}>
                    <View style={[styles.iconWrap, {backgroundColor: st.bg}]}>
                      <Image
                        source={st.icon}
                        style={[styles.rowIcon, {tintColor: st.tint}]}
                      />
                    </View>
                    <View style={styles.rowBody}>
                      <Text style={styles.rowTitle} numberOfLines={2}>
                        {item.detail}
                      </Text>
                    </View>
                    <Text style={styles.rowTime}>{item.when}</Text>
                  </View>
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
    marginBottom: scaleWidth(16),
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

  tabs: {
    flexDirection: 'row',
    marginBottom: scaleWidth(16),
  },
  tabChip: {
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleWidth(9),
    borderRadius: scaleWidth(10),
    backgroundColor: appColors.white,
    borderWidth: 1.2,
    borderColor: appColors.inputBorder,
    marginRight: scaleWidth(10),
  },
  tabChipActive: {
    backgroundColor: appColors.maroon,
    borderColor: appColors.maroon,
  },
  tabText: {
    ...typography(600, 13, 'coffeeDark'),
    fontWeight: '600',
  },
  tabTextActive: {
    color: appColors.white,
  },

  empty: {alignItems: 'center', marginTop: scaleWidth(50)},
  emptyText: {...typography(500, 14, 'gray'), fontWeight: '500'},

  card: {
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(16),
    paddingHorizontal: scaleWidth(14),
    ...shadow,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleWidth(12),
  },
  iconWrap: {
    width: scaleWidth(38),
    height: scaleWidth(38),
    borderRadius: scaleWidth(11),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(12),
  },
  rowIcon: {
    width: scaleWidth(19),
    height: scaleWidth(19),
  },
  rowBody: {
    flex: 1,
    marginRight: scaleWidth(8),
  },
  rowTitle: {
    ...typography(600, 14, 'coffeeDark'),
    fontWeight: '600',
  },
  rowTime: {
    ...typography('regular', 12, 'gray'),
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(61,32,20,0.07)',
    marginLeft: scaleWidth(50),
  },
});

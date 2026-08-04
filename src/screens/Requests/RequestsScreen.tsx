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
import {userRoleSelector} from '../../slices';
import {isOrgRole, isAdminRole} from '../../utils';
import {DemoRequestsScreen} from './DemoRequestsScreen';
import {useFetch} from '../../hooks';
import {ConfirmModal} from '../../components/ConfirmModal';
import {
  listRequestsByUserId,
  processJoinRequest,
  processLeaveRequest,
  withdrawRequest,
} from '../../api/userAdmin.api';

const gridBg = require('../../assets/images/grid-bg.png');
const icMenu = require('../../assets/images/ic-menu.png');
const icFile = require('../../assets/images/ic-file.png');
const icCheck = require('../../assets/images/ic-check-plain.png');
const icCircleX = require('../../assets/images/ic-circle-x.png');

// Tabs map to the API `requestType` param (same as the web).
const ALL_TABS = [
  {key: 'pending', label: 'Pending'},
  {key: 'approved', label: 'Approved'},
  {key: 'rejected', label: 'Rejected'},
  {key: 'myRequest', label: 'My Requests'},
] as const;

type RequestRow = {
  id: string;
  name: string;
  email: string;
  date: string;
  status: string;
  message: string;
  requestType: string;
};

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

const statusMeta = (status?: string): {label: string; bg: string; color: string} => {
  const s = (status ?? '').toUpperCase();
  if (['ACCEPTED', 'APPROVED', 'SUCCESS', 'COMPLETED'].includes(s)) {
    return {label: s === 'ACCEPTED' ? 'Approved' : status ?? '', bg: 'rgba(30,135,75,0.13)', color: appColors.success};
  }
  if (s === 'REJECTED') {
    return {label: 'Rejected', bg: 'rgba(193,52,52,0.13)', color: appColors.error};
  }
  return {label: status ? status : 'Pending', bg: 'rgba(169,130,28,0.15)', color: appColors.warning};
};

const mapRequests = (res: any, tab: string): RequestRow[] => {
  const items: any[] =
    res?.data ?? res?.items ?? res?.data?.items ?? (Array.isArray(res) ? res : []);
  return items.map((it, i) => {
    const name =
      tab === 'myRequest'
        ? it.requestType === 'JOIN'
          ? it.toJoinName
          : it.requestType === 'LEAVE'
          ? it.toLeaveName
          : it.name
        : it.name;
    return {
      id: String(it.id ?? i),
      name: name ?? '—',
      email: it.email ?? it.phone ?? '',
      date: fmt(it.updatedAt ?? it.createdAt),
      status: it.status ?? 'PENDING',
      message: it.requestMessage ?? '',
      requestType: it.requestType ?? '',
    };
  });
};

// Admins see Demo Requests here instead of join/leave requests.
export const RequestsScreen = () => {
  const role = useAppSelector(userRoleSelector);
  return isAdminRole(role) ? <DemoRequestsScreen /> : <JoinRequests />;
};

const JoinRequests = () => {
  const insets = useSafeAreaInsets();
  const {openDrawer} = useDrawer();
  const role = useAppSelector(userRoleSelector);
  const isAgent = role === 'agent';
  const isOrg = isOrgRole(role);
  // Agents see only their own requests; orgs have no "My Requests" tab.
  const TABS = isAgent
    ? ALL_TABS.filter(t => t.key === 'myRequest')
    : isOrg
      ? ALL_TABS.filter(t => t.key !== 'myRequest')
      : ALL_TABS;
  const [tab, setTab] = useState<string>(isAgent ? 'myRequest' : 'pending');

  const fetcher = useCallback(() => listRequestsByUserId(tab), [tab]);
  const {data, loading, reload} = useFetch(fetcher, [tab]);
  const rows = useMemo(() => (data ? mapRequests(data, tab) : []), [data, tab]);

  // Approve / Reject / Cancel(withdraw) with a confirmation modal.
  const [pending, setPending] = useState<
    {row: RequestRow; kind: 'approve' | 'reject' | 'cancel'} | null
  >(null);
  const [acting, setActing] = useState(false);

  const runAction = useCallback(async () => {
    if (!pending) {
      return;
    }
    const {row, kind} = pending;
    setActing(true);
    try {
      if (kind === 'cancel') {
        await withdrawRequest(row.id);
      } else {
        const action = kind === 'approve' ? 'accept' : 'reject';
        if (row.requestType === 'LEAVE') {
          await processLeaveRequest(row.id, action);
        } else {
          await processJoinRequest(row.id, action);
        }
      }
      setPending(null);
      reload();
    } catch {
      // keep modal open on failure
    } finally {
      setActing(false);
    }
  }, [pending, reload]);

  const modalCopy = {
    approve: {title: 'Approve request?', msg: 'This will accept the request.', label: 'Approve', danger: false},
    reject: {title: 'Reject request?', msg: 'This will reject the request.', label: 'Reject', danger: true},
    cancel: {title: 'Cancel request?', msg: 'This will withdraw your request.', label: 'Withdraw', danger: true},
  } as const;
  const copy = pending ? modalCopy[pending.kind] : null;

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
          <Text style={styles.headerTitle}>Requests</Text>
          <TouchableOpacity style={styles.iconBtnCircle} activeOpacity={0.8}>
            <CurrentUserAvatar
              size={scaleWidth(44)}
              fallbackIconStyle={styles.headerIcon}
            />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}>
          {TABS.map(t => {
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
        </ScrollView>

        {/* Request cards */}
        {loading ? (
          <ActivityIndicator
            color={appColors.maroon}
            style={{marginTop: scaleWidth(40)}}
          />
        ) : rows.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No {tab === 'myRequest' ? '' : tab} requests found.</Text>
          </View>
        ) : (
          rows.map(item => {
            const st = statusMeta(item.status);
            const showApproveReject = tab === 'pending';
            const showCancel =
              tab === 'myRequest' && item.status.toUpperCase() === 'PENDING';
            const hasActions = showApproveReject || showCancel;
            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.fileWrap}>
                    <Image source={icFile} style={styles.fileIcon} />
                  </View>
                  <View style={styles.brokerCol}>
                    <Text style={styles.fieldLabel}>
                      {item.requestType ? item.requestType : 'NAME'}
                    </Text>
                    <Text style={styles.brokerName} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                  <View style={[styles.pill, {backgroundColor: st.bg}]}>
                    <Text style={[styles.pillText, {color: st.color}]}>
                      {st.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardBottom}>
                  <View style={styles.col}>
                    <Text style={styles.fieldLabel}>EMAIL / PHONE</Text>
                    <Text style={styles.fieldValue} numberOfLines={1}>
                      {item.email || '—'}
                    </Text>
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.fieldLabel}>DATE</Text>
                    <Text style={styles.fieldValue}>{item.date || '—'}</Text>
                  </View>
                </View>

                {hasActions || item.message ? (
                  <View
                    style={hasActions ? styles.descActionRow : styles.msgWrap}>
                    {item.message ? (
                      <View style={styles.descCol}>
                        <Text style={styles.fieldLabel}>DESCRIPTION</Text>
                        <Text
                          style={styles.msgText}
                          numberOfLines={hasActions ? 2 : undefined}>
                          {item.message}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.descCol} />
                    )}

                    {showApproveReject ? (
                      <View style={styles.actionIcons}>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          style={[styles.iconBtn, styles.iconBtnApprove]}
                          onPress={() =>
                            setPending({row: item, kind: 'approve'})
                          }>
                          <Image source={icCheck} style={styles.iconApprove} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          style={[styles.iconBtn, styles.iconBtnReject]}
                          onPress={() =>
                            setPending({row: item, kind: 'reject'})
                          }>
                          <Image source={icCircleX} style={styles.iconReject} />
                        </TouchableOpacity>
                      </View>
                    ) : showCancel ? (
                      <View style={styles.actionIcons}>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          style={[styles.iconBtn, styles.iconBtnReject]}
                          onPress={() =>
                            setPending({row: item, kind: 'cancel'})
                          }>
                          <Image source={icCircleX} style={styles.iconReject} />
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      <ConfirmModal
        visible={!!pending}
        title={copy?.title ?? ''}
        message={copy?.msg}
        confirmLabel={copy?.label}
        danger={copy?.danger}
        loading={acting}
        onConfirm={runAction}
        onCancel={() => (acting ? null : setPending(null))}
      />
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
    paddingVertical: scaleWidth(2),
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
    padding: scaleWidth(16),
    marginBottom: scaleWidth(14),
    ...shadow,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileWrap: {
    width: scaleWidth(40),
    height: scaleWidth(40),
    borderRadius: scaleWidth(12),
    backgroundColor: 'rgba(94,23,23,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(12),
  },
  fileIcon: {
    width: scaleWidth(20),
    height: scaleWidth(20),
    tintColor: appColors.maroon,
  },
  brokerCol: {
    flex: 1,
    marginRight: scaleWidth(8),
  },
  brokerName: {
    ...typography(700, 16, 'coffeeDark'),
    fontWeight: '700',
    marginTop: scaleWidth(2),
  },
  pill: {
    borderRadius: scaleWidth(8),
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleWidth(5),
  },
  pillText: {
    ...typography(700, 11, 'success'),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardBottom: {
    flexDirection: 'row',
    marginTop: scaleWidth(16),
  },
  col: {
    flex: 1,
  },
  fieldLabel: {
    ...typography(500, 10, 'gray'),
    fontWeight: '500',
    letterSpacing: 0.8,
  },
  fieldValue: {
    ...typography(600, 14, 'coffeeDark'),
    fontWeight: '600',
    marginTop: scaleWidth(4),
  },
  msgWrap: {
    marginTop: scaleWidth(14),
    paddingTop: scaleWidth(12),
    borderTopWidth: 1,
    borderTopColor: 'rgba(61,32,20,0.07)',
  },
  msgText: {
    ...typography('regular', 13, 'coffeeDark'),
    marginTop: scaleWidth(4),
    lineHeight: scaleWidth(19),
  },
  descActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scaleWidth(14),
    paddingTop: scaleWidth(14),
    borderTopWidth: 1,
    borderTopColor: 'rgba(61,32,20,0.07)',
  },
  descCol: {
    flex: 1,
    marginRight: scaleWidth(12),
  },
  actionIcons: {
    flexDirection: 'row',
  },
  iconBtn: {
    width: scaleWidth(42),
    height: scaleWidth(42),
    borderRadius: scaleWidth(11),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: scaleWidth(10),
  },
  iconBtnApprove: {
    backgroundColor: 'rgba(94,23,23,0.08)',
  },
  iconBtnReject: {
    backgroundColor: 'rgba(193,52,52,0.10)',
  },
  iconApprove: {
    width: scaleWidth(19),
    height: scaleWidth(19),
    tintColor: appColors.maroon,
  },
  iconReject: {
    width: scaleWidth(20),
    height: scaleWidth(20),
    tintColor: appColors.error,
  },
});

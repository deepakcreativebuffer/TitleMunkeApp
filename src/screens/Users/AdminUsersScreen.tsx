import React, {useCallback, useMemo, useState, useEffect, useRef} from 'react';
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
import {CurrentUserAvatar} from '../../components/CurrentUserAvatar';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {appColors, typography, scaleWidth} from '../../global';
import {AppStackParamList} from '../../types';
import {useDrawer} from '../../context/DrawerContext';
import {useFetch} from '../../hooks';
import {shareCsvInApp} from '../../utils/documents';
import {ConfirmModal} from '../../components/ConfirmModal';
import {
  listAdmins,
  listOrganisations,
  getBrokersWithSearchCount,
  getAgentListings,
  userBulkDelete,
} from '../../api/userAdmin.api';

const gridBg = require('../../assets/images/grid-bg.png');
const icMenu = require('../../assets/images/ic-menu.png');
const icChevron = require('../../assets/images/ic-chevron.png');
const icCheckPlain = require('../../assets/images/ic-check-plain.png');
const icDownload = require('../../assets/images/ic-download.png');
const icTrash = require('../../assets/images/ic-trash.png');
const icEdit = require('../../assets/images/ic-edit.png');

type TabKey = 'admin' | 'organisation' | 'broker' | 'agent';
const TABS: {key: TabKey; label: string}[] = [
  {key: 'admin', label: 'Admin'},
  {key: 'organisation', label: 'Organization'},
  {key: 'broker', label: 'Broker'},
  {key: 'agent', label: 'Agent'},
];

const STATUS_OPTIONS = [
  {label: 'All Status', value: 'ALL'},
  {label: 'Active', value: 'ACTIVE'},
  {label: 'Unconfirmed', value: 'UNCONFIRMED'},
  {label: 'Deleted', value: 'DELETED'},
];

const statusMeta = (status: string): {label: string; bg: string; color: string} => {
  const s = String(status ?? '').toUpperCase();
  if (s === 'ACTIVE') {
    return {label: 'Active', bg: 'rgba(30,135,75,0.12)', color: appColors.success};
  }
  if (s === 'DELETED') {
    return {label: 'Deleted', bg: 'rgba(193,52,52,0.12)', color: appColors.error};
  }
  if (s === 'UNCONFIRMED') {
    return {label: 'Unconfirmed', bg: 'rgba(169,130,28,0.15)', color: appColors.warning};
  }
  return {label: s || '—', bg: 'rgba(120,120,120,0.14)', color: appColors.gray};
};

const listFrom = (res: any): any[] =>
  res?.updatedOrganisations ??
  res?.updatedBrokers ??
  res?.items ??
  res?.data?.items ??
  res?.data ??
  (Array.isArray(res) ? res : []);

const mapUsers = (res: any) =>
  listFrom(res).map((u, i) => ({
    id: String(u.id ?? u.userId ?? i),
    name: u.name ?? u.agentName ?? '—',
    email: u.email ?? '—',
    status: String(u.status ?? '').toUpperCase(),
    teamStrength: u.teamStrength ?? 0,
    searchLimit: u.searchLimit ? String(u.searchLimit) : '',
  }));

export const AdminUsersScreen = () => {
  const insets = useSafeAreaInsets();
  const {openDrawer} = useDrawer();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [tab, setTab] = useState<TabKey>('admin');

  const fetcher = useCallback(() => {
    switch (tab) {
      case 'admin':
        return listAdmins();
      case 'organisation':
        return listOrganisations();
      case 'broker':
        return getBrokersWithSearchCount();
      default:
        return getAgentListings();
    }
  }, [tab]);
  const {data, loading, reload} = useFetch(fetcher, [tab]);
  const allRows = useMemo(() => (data ? mapUsers(data) : []), [data]);

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [statusOpen, setStatusOpen] = useState(false);
  const rows = useMemo(
    () =>
      statusFilter === 'ALL'
        ? allRows
        : allRows.filter(r => r.status === statusFilter),
    [allRows, statusFilter],
  );
  const statusLabel =
    STATUS_OPTIONS.find(o => o.value === statusFilter)?.label ?? 'All Status';

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => setSelected(new Set()), [tab]);

  const firstFocus = useRef(true);
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      reload();
    });
    return unsub;
  }, [navigation, reload]);

  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete?.length) {
      return;
    }
    setDeleting(true);
    try {
      await userBulkDelete(
        pendingDelete.map(id => ({userType: tab, userId: id})),
      );
      setPendingDelete(null);
      setSelected(new Set());
      reload();
    } catch {
      // keep modal open
    } finally {
      setDeleting(false);
    }
  }, [pendingDelete, tab, reload]);

  const isBroker = tab === 'broker';
  // All tabs are editable.
  const canEdit = true;

  const onExport = useCallback(() => {
    const headers = isBroker
      ? ['Sr. No.', 'Name', 'Email', 'Team Strength', 'Status']
      : ['Sr. No.', 'Name', 'Email', 'Status'];
    const data2 = rows.map((r, i) =>
      isBroker
        ? [i + 1, r.name, r.email, r.teamStrength, r.status]
        : [i + 1, r.name, r.email, r.status],
    );
    shareCsvInApp(`admin-users-${tab}.csv`, headers, data2).catch(() =>
      Alert.alert('Export failed', 'Could not generate the CSV.'),
    );
  }, [rows, isBroker, tab]);

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
            style={styles.iconBtnSquare}
            activeOpacity={0.8}
            onPress={openDrawer}>
            <Image source={icMenu} style={styles.headerIcon} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Users</Text>
          <TouchableOpacity style={styles.iconBtnCircle} activeOpacity={0.8}>
            <CurrentUserAvatar
              size={scaleWidth(44)}
              fallbackIconStyle={styles.headerIcon}
            />
          </TouchableOpacity>
        </View>

        {/* Tabs (horizontal scroll — 4 tabs) */}
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
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Title + status filter */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>
            All {TABS.find(t => t.key === tab)?.label}s
          </Text>
          <View style={styles.statusWrap}>
            <TouchableOpacity
              style={styles.statusChip}
              activeOpacity={0.8}
              onPress={() => setStatusOpen(o => !o)}>
              <Text style={styles.statusChipText}>{statusLabel}</Text>
              <Image
                source={icChevron}
                style={[
                  styles.chipChevron,
                  statusOpen && {transform: [{rotate: '-90deg'}]},
                ]}
              />
            </TouchableOpacity>
            {statusOpen ? (
              <View style={styles.statusDropdown}>
                {STATUS_OPTIONS.map(opt => {
                  const active = statusFilter === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      activeOpacity={0.7}
                      style={styles.statusOption}
                      onPress={() => {
                        setStatusFilter(opt.value);
                        setStatusOpen(false);
                      }}>
                      <Text
                        style={[
                          styles.statusOptionText,
                          active && styles.statusOptionTextActive,
                        ]}>
                        {opt.label}
                      </Text>
                      {active ? (
                        <Image source={icCheckPlain} style={styles.statusCheck} />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
          </View>
        </View>

        {/* Export */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.toolbar}>
          <TouchableOpacity
            style={styles.toolChip}
            activeOpacity={0.8}
            onPress={onExport}>
            <Image source={icDownload} style={styles.toolIcon} />
            <Text style={styles.toolText}>Export CSV</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Selection bar */}
        {selected.size > 0 ? (
          <View style={styles.selectionBar}>
            <Text style={styles.selectionText}>{selected.size} selected</Text>
            <View style={styles.selectionActions}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.clearBtn}
                onPress={() => setSelected(new Set())}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.bulkDeleteBtn}
                onPress={() => setPendingDelete(Array.from(selected))}>
                <Image source={icTrash} style={styles.bulkDeleteIcon} />
                <Text style={styles.bulkDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* List */}
        {loading && rows.length === 0 ? (
          <ActivityIndicator
            color={appColors.maroon}
            style={{marginTop: scaleWidth(40)}}
          />
        ) : rows.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No Records found.</Text>
          </View>
        ) : (
          rows.map((u, i) => {
            const isSel = selected.has(u.id);
            const sMeta = statusMeta(u.status);
            return (
              <View key={u.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => toggle(u.id)}
                    style={[styles.checkbox, isSel && styles.checkboxOn]}>
                    {isSel ? <Text style={styles.checkMark}>✓</Text> : null}
                  </TouchableOpacity>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {u.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.nameWrap}>
                    <Text style={styles.srNo}>#{i + 1}</Text>
                    <Text style={styles.userName} numberOfLines={1}>
                      {u.name}
                    </Text>
                    <Text style={styles.userEmail} numberOfLines={1}>
                      {u.email}
                    </Text>
                  </View>
                  <View style={[styles.statusPill, {backgroundColor: sMeta.bg}]}>
                    <Text style={[styles.statusText, {color: sMeta.color}]}>
                      {sMeta.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  <View style={styles.metaCol}>
                    {isBroker ? (
                      <>
                        <Text style={styles.metaLabel}>TEAM STRENGTH</Text>
                        <Text style={styles.metaValue}>{u.teamStrength}</Text>
                      </>
                    ) : (
                      <Text style={styles.metaLabel}>{tab.toUpperCase()}</Text>
                    )}
                  </View>
                  <View style={styles.actionIcons}>
                    {canEdit ? (
                      <TouchableOpacity
                        style={styles.actionIconBtn}
                        onPress={() =>
                          navigation.navigate('AddOrgUser', {
                            kind: tab as
                              | 'broker'
                              | 'agent'
                              | 'organisation'
                              | 'admin',
                            user: {
                              id: u.id,
                              name: u.name,
                              email: u.email,
                              teamStrength: u.teamStrength,
                              searchLimit: u.searchLimit,
                            },
                          })
                        }>
                        <Image source={icEdit} style={styles.actionEdit} />
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      style={styles.actionIconBtn}
                      onPress={() => setPendingDelete([u.id])}>
                      <Image source={icTrash} style={styles.actionDelete} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <ConfirmModal
        visible={!!pendingDelete}
        title={`Delete ${pendingDelete?.length === 1 ? 'user' : `${pendingDelete?.length} users`}?`}
        message="This action cannot be undone."
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => (deleting ? null : setPendingDelete(null))}
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
    width: scaleWidth(20),
    height: scaleWidth(20),
    tintColor: appColors.maroon,
  },
  headerTitle: {...typography(700, 18, 'coffeeDark'), fontWeight: '700'},

  tabs: {paddingVertical: scaleWidth(2), marginBottom: scaleWidth(16)},
  tabChip: {
    paddingHorizontal: scaleWidth(20),
    paddingVertical: scaleWidth(10),
    borderRadius: scaleWidth(12),
    marginRight: scaleWidth(10),
    backgroundColor: appColors.white,
    ...shadow,
  },
  tabChipActive: {backgroundColor: appColors.maroon},
  tabText: {...typography(600, 14, 'coffeeDark'), fontWeight: '600'},
  tabTextActive: {color: appColors.white},

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleWidth(14),
    zIndex: 50,
  },
  title: {...typography(700, 19, 'coffeeDark'), fontWeight: '700'},
  statusWrap: {position: 'relative', zIndex: 50},
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.white,
    borderWidth: 1.4,
    borderColor: appColors.inputBorder,
    borderRadius: scaleWidth(10),
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleWidth(8),
  },
  statusChipText: {
    ...typography(500, 13, 'coffeeDark'),
    fontWeight: '500',
    marginRight: scaleWidth(8),
  },
  chipChevron: {
    width: scaleWidth(12),
    height: scaleWidth(12),
    tintColor: appColors.gray,
    transform: [{rotate: '90deg'}],
  },
  statusDropdown: {
    position: 'absolute',
    top: scaleWidth(44),
    right: 0,
    minWidth: scaleWidth(180),
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(12),
    borderWidth: 1,
    borderColor: appColors.inputBorder,
    paddingVertical: scaleWidth(4),
    zIndex: 60,
    elevation: 10,
    shadowColor: '#3d2014',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.14,
    shadowRadius: 18,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleWidth(12),
  },
  statusOptionText: {...typography(500, 14, 'coffeeDark'), fontWeight: '500'},
  statusOptionTextActive: {...typography(600, 14, 'maroon'), fontWeight: '600'},
  statusCheck: {
    width: scaleWidth(16),
    height: scaleWidth(16),
    tintColor: appColors.maroon,
  },

  toolbar: {paddingVertical: scaleWidth(2), marginBottom: scaleWidth(18)},
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.white,
    borderWidth: 1.4,
    borderColor: appColors.inputBorder,
    borderRadius: scaleWidth(10),
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleWidth(10),
    marginRight: scaleWidth(10),
  },
  toolIcon: {
    width: scaleWidth(16),
    height: scaleWidth(16),
    tintColor: appColors.coffeeDark,
    marginRight: scaleWidth(8),
  },
  toolText: {...typography(500, 13, 'coffeeDark'), fontWeight: '500'},

  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(94,23,23,0.07)',
    borderRadius: scaleWidth(12),
    paddingVertical: scaleWidth(10),
    paddingHorizontal: scaleWidth(14),
    marginBottom: scaleWidth(14),
  },
  selectionText: {...typography(600, 14, 'maroon'), fontWeight: '600'},
  selectionActions: {flexDirection: 'row', alignItems: 'center'},
  clearBtn: {
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleWidth(8),
    marginRight: scaleWidth(8),
  },
  clearText: {...typography(600, 13, 'coffeeLight'), fontWeight: '600'},
  bulkDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.error,
    borderRadius: scaleWidth(10),
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleWidth(9),
  },
  bulkDeleteIcon: {
    width: scaleWidth(15),
    height: scaleWidth(15),
    tintColor: appColors.white,
    marginRight: scaleWidth(7),
  },
  bulkDeleteText: {...typography(600, 13, 'white'), fontWeight: '600'},

  emptyCard: {
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(16),
    paddingVertical: scaleWidth(54),
    alignItems: 'center',
    ...shadow,
  },
  emptyText: {...typography(500, 14, 'gray'), fontWeight: '500'},

  card: {
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(16),
    padding: scaleWidth(16),
    marginBottom: scaleWidth(12),
    ...shadow,
  },
  cardTop: {flexDirection: 'row', alignItems: 'center'},
  checkbox: {
    width: scaleWidth(20),
    height: scaleWidth(20),
    borderRadius: scaleWidth(5),
    borderWidth: 1.8,
    borderColor: appColors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(12),
  },
  checkboxOn: {backgroundColor: appColors.maroon},
  checkMark: {
    color: appColors.white,
    fontSize: scaleWidth(12),
    fontWeight: '700',
    lineHeight: scaleWidth(15),
  },
  avatar: {
    width: scaleWidth(38),
    height: scaleWidth(38),
    borderRadius: scaleWidth(38),
    backgroundColor: appColors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(12),
  },
  avatarText: {...typography(700, 16, 'white'), fontWeight: '700'},
  nameWrap: {flex: 1, paddingRight: scaleWidth(8)},
  srNo: {...typography(500, 10, 'gray'), fontWeight: '500'},
  userName: {
    ...typography(700, 15, 'coffeeDark'),
    fontWeight: '700',
    marginTop: scaleWidth(1),
  },
  userEmail: {...typography('regular', 12, 'maroon'), marginTop: scaleWidth(2)},
  statusPill: {
    borderRadius: scaleWidth(8),
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleWidth(5),
  },
  statusText: {...typography(700, 11, 'success'), fontWeight: '700', letterSpacing: 0.4},

  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: scaleWidth(14),
    paddingTop: scaleWidth(14),
    borderTopWidth: 1,
    borderTopColor: 'rgba(61,32,20,0.07)',
  },
  metaCol: {flex: 1},
  metaLabel: {...typography(600, 9, 'gray'), fontWeight: '600', letterSpacing: 0.6},
  metaValue: {
    ...typography(700, 14, 'coffeeDark'),
    fontWeight: '700',
    marginTop: scaleWidth(3),
  },
  actionIcons: {flexDirection: 'row'},
  actionIconBtn: {
    width: scaleWidth(38),
    height: scaleWidth(38),
    borderRadius: scaleWidth(10),
    backgroundColor: 'rgba(61,32,20,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: scaleWidth(8),
  },
  actionEdit: {
    width: scaleWidth(17),
    height: scaleWidth(17),
    tintColor: appColors.coffeeDark,
  },
  actionDelete: {
    width: scaleWidth(17),
    height: scaleWidth(17),
    tintColor: appColors.error,
  },
});

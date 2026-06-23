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
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {appColors, typography, scaleWidth} from '../../global';
import {useDrawer} from '../../context/DrawerContext';
import {useAppSelector} from '../../store';
import {userProfileSelector} from '../../slices';
import {useFetch} from '../../hooks';
import {getBrokerAgentDetails} from '../../api/userAdmin.api';

const gridBg = require('../../assets/images/grid-bg.png');
const icMenu = require('../../assets/images/ic-menu.png');
const icProfile = require('../../assets/images/ic-profile.png');
const icChevron = require('../../assets/images/ic-chevron.png');
const icDownload = require('../../assets/images/ic-download.png');
const icUpload = require('../../assets/images/ic-upload.png');
const icTrash = require('../../assets/images/ic-trash.png');
const icEdit = require('../../assets/images/ic-edit.png');
const icMail = require('../../assets/images/ic-mail.png');

type Agent = {
  id: string;
  name: string;
  searches: number;
  lastLogin: string;
  status: 'Active' | 'Inactive';
};

const mapAgents = (res: any): Agent[] => {
  const list: any[] =
    res?.items ?? res?.agents ?? res?.data?.items ?? res?.data ??
    (Array.isArray(res) ? res : []);
  return list.map((a, i) => ({
    id: String(a.agentId ?? a.id ?? a.userId ?? i),
    name: a.name ?? a.agentName ?? a.fullName ?? '—',
    searches: Number(a.totalSearches ?? a.searchCount ?? a.searchesThisMonth ?? 0),
    lastLogin: a.lastLogin
      ? new Date(a.lastLogin).toLocaleString(undefined, {
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—',
    status:
      String(a.status ?? '').toUpperCase() === 'ACTIVE' ? 'Active' : 'Inactive',
  }));
};

const SECONDARY = [
  {key: 'download', label: 'Download Template', icon: icDownload},
  {key: 'upload', label: 'Upload Template', icon: icUpload},
  {key: 'export', label: 'Export CSV', icon: icDownload},
];

export const AgentsScreen = () => {
  const insets = useSafeAreaInsets();
  const {openDrawer} = useDrawer();
  const profile = useAppSelector(userProfileSelector);
  const brokerId = profile?.sub;
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetcher = useCallback(
    () => getBrokerAgentDetails(brokerId as string, true),
    [brokerId],
  );
  const {data, loading} = useFetch(fetcher, [brokerId]);
  const agents = useMemo(() => (data ? mapAgents(data) : []), [data]);

  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

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
          <Text style={styles.headerTitle}>Agents</Text>
          <TouchableOpacity style={styles.iconBtnCircle} activeOpacity={0.8}>
            <Image source={icProfile} style={styles.headerIcon} />
          </TouchableOpacity>
        </View>

        {/* Title + filter */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>All Agents</Text>
          <TouchableOpacity style={styles.statusChip} activeOpacity={0.8}>
            <Text style={styles.statusChipText}>All Status</Text>
            <Image source={icChevron} style={styles.chipChevron} />
          </TouchableOpacity>
        </View>

        {/* Add agent */}
        <TouchableOpacity activeOpacity={0.9} style={styles.addBtn}>
          <Text style={styles.addPlus}>+</Text>
          <Text style={styles.addText}>Add Agent</Text>
        </TouchableOpacity>

        {/* Secondary actions */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.toolbar}>
          {SECONDARY.map(a => (
            <TouchableOpacity key={a.key} style={styles.toolChip} activeOpacity={0.8}>
              <Image source={a.icon} style={styles.toolIcon} />
              <Text style={styles.toolText}>{a.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.toolChip, styles.toolChipDanger]}
            activeOpacity={0.8}>
            <Image source={icTrash} style={styles.toolIconDanger} />
            <Text style={styles.toolTextDanger}>Bulk Delete</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* List */}
        {loading ? (
          <ActivityIndicator
            color={appColors.maroon}
            style={{marginTop: scaleWidth(40)}}
          />
        ) : agents.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No Records found.</Text>
          </View>
        ) : (
          agents.map((a, i) => {
            const isSel = selected.has(a.id);
            const active = a.status === 'Active';
            return (
              <View key={a.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => toggle(a.id)}
                    style={[styles.checkbox, isSel && styles.checkboxOn]}>
                    {isSel ? <Text style={styles.checkMark}>✓</Text> : null}
                  </TouchableOpacity>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {a.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.nameWrap}>
                    <Text style={styles.srNo}>#{i + 1}</Text>
                    <Text style={styles.agentName}>{a.name}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: active
                          ? 'rgba(30,135,75,0.12)'
                          : 'rgba(120,120,120,0.14)',
                      },
                    ]}>
                    <Text
                      style={[
                        styles.statusText,
                        {color: active ? appColors.success : appColors.gray},
                      ]}>
                      {a.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>SEARCHES THIS MONTH</Text>
                    <Text style={styles.metaValue}>{a.searches}</Text>
                  </View>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>LAST LOGIN</Text>
                    <Text style={styles.metaValue}>{a.lastLogin}</Text>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.reinviteBtn} activeOpacity={0.8}>
                    <Image source={icMail} style={styles.reinviteIcon} />
                    <Text style={styles.reinviteText}>Reinvite</Text>
                  </TouchableOpacity>
                  <View style={styles.actionIcons}>
                    <TouchableOpacity style={styles.actionIconBtn}>
                      <Image source={icEdit} style={styles.actionEdit} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionIconBtn}>
                      <Image source={icTrash} style={styles.actionDelete} />
                    </TouchableOpacity>
                  </View>
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

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleWidth(14),
  },
  title: {
    ...typography(700, 19, 'coffeeDark'),
    fontWeight: '700',
  },
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

  addBtn: {
    height: scaleWidth(52),
    borderRadius: scaleWidth(14),
    backgroundColor: appColors.maroon,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleWidth(14),
    ...shadow,
    shadowOpacity: 0.18,
  },
  addPlus: {
    color: appColors.white,
    fontSize: scaleWidth(20),
    fontWeight: '500',
    marginRight: scaleWidth(8),
    marginTop: scaleWidth(-2),
  },
  addText: {
    ...typography(600, 16, 'white'),
    fontWeight: '600',
  },

  toolbar: {
    paddingVertical: scaleWidth(2),
    marginBottom: scaleWidth(18),
  },
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
  toolChipDanger: {
    borderColor: 'rgba(193,52,52,0.4)',
    backgroundColor: 'rgba(193,52,52,0.06)',
  },
  toolIcon: {
    width: scaleWidth(16),
    height: scaleWidth(16),
    tintColor: appColors.coffeeDark,
    marginRight: scaleWidth(8),
  },
  toolText: {
    ...typography(500, 13, 'coffeeDark'),
    fontWeight: '500',
  },
  toolIconDanger: {
    width: scaleWidth(16),
    height: scaleWidth(16),
    tintColor: appColors.error,
    marginRight: scaleWidth(8),
  },
  toolTextDanger: {
    ...typography(600, 13, 'error'),
    fontWeight: '600',
  },

  emptyCard: {
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(16),
    paddingVertical: scaleWidth(54),
    alignItems: 'center',
    ...shadow,
  },
  emptyText: {
    ...typography(500, 14, 'gray'),
    fontWeight: '500',
  },

  card: {
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(16),
    padding: scaleWidth(16),
    marginBottom: scaleWidth(12),
    ...shadow,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
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
  checkboxOn: {
    backgroundColor: appColors.maroon,
  },
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
  avatarText: {
    ...typography(700, 16, 'white'),
    fontWeight: '700',
  },
  nameWrap: {flex: 1},
  srNo: {
    ...typography(500, 10, 'gray'),
    fontWeight: '500',
  },
  agentName: {
    ...typography(700, 15, 'coffeeDark'),
    fontWeight: '700',
    marginTop: scaleWidth(1),
  },
  statusPill: {
    borderRadius: scaleWidth(8),
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleWidth(5),
  },
  statusText: {
    ...typography(700, 11, 'success'),
    fontWeight: '700',
    letterSpacing: 0.4,
  },

  metaRow: {
    flexDirection: 'row',
    marginTop: scaleWidth(14),
  },
  metaCol: {flex: 1},
  metaLabel: {
    ...typography(600, 9, 'gray'),
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  metaValue: {
    ...typography(700, 14, 'coffeeDark'),
    fontWeight: '700',
    marginTop: scaleWidth(3),
  },

  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: scaleWidth(14),
    paddingTop: scaleWidth(14),
    borderTopWidth: 1,
    borderTopColor: 'rgba(61,32,20,0.07)',
  },
  reinviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(94,23,23,0.07)',
    borderRadius: scaleWidth(10),
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleWidth(9),
  },
  reinviteIcon: {
    width: scaleWidth(15),
    height: scaleWidth(15),
    tintColor: appColors.maroon,
    marginRight: scaleWidth(7),
  },
  reinviteText: {
    ...typography(600, 13, 'maroon'),
    fontWeight: '600',
  },
  actionIcons: {
    flexDirection: 'row',
  },
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

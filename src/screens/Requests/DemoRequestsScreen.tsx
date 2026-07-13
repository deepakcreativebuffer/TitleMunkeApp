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
import {appColors, typography, scaleWidth} from '../../global';
import {useDrawer} from '../../context/DrawerContext';
import {useFetch} from '../../hooks';
import {shareCsvInApp} from '../../utils/documents';
import {ConfirmModal} from '../../components/ConfirmModal';
import {getListDemoReq, markDemoRequestContacted} from '../../api/userAdmin.api';

const gridBg = require('../../assets/images/grid-bg.png');
const icMenu = require('../../assets/images/ic-menu.png');
const icProfile = require('../../assets/images/ic-profile.png');
const icDownload = require('../../assets/images/ic-download.png');
const icCheck = require('../../assets/images/ic-check.png');

const listFrom = (res: any): any[] =>
  Array.isArray(res) ? res : res?.items ?? res?.data?.items ?? res?.data ?? [];

const fmtDate = (raw?: string | number): string => {
  if (!raw) {
    return '—';
  }
  const d = new Date(raw);
  if (isNaN(d.getTime())) {
    return String(raw);
  }
  return d.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
};

const mapReq = (res: any) =>
  listFrom(res).map((r, i) => ({
    id: String(r.id ?? i),
    name: r.name ?? '—',
    contact: r.email ?? r.phone_number ?? r.phoneNumber ?? '—',
    county: r.country ?? r.county ?? '—',
    state: r.state ?? '—',
    date: fmtDate(r.createdAt),
    description: r.additionalMessage ?? r.description ?? '',
  }));

export const DemoRequestsScreen = () => {
  const insets = useSafeAreaInsets();
  const {openDrawer} = useDrawer();
  const [tab, setTab] = useState<'pending' | 'contacted'>('pending');
  const isPending = tab === 'pending';

  const fetcher = useCallback(
    () => getListDemoReq(isPending ? undefined : 'CONTACTED'),
    [isPending],
  );
  const {data, loading, reload} = useFetch(fetcher, [isPending]);
  const rows = useMemo(() => (data ? mapReq(data) : []), [data]);

  const [pending, setPending] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const confirmContacted = useCallback(async () => {
    if (!pending) {
      return;
    }
    setSaving(true);
    try {
      await markDemoRequestContacted(pending);
      setPending(null);
      reload();
    } catch {
      // keep modal open
    } finally {
      setSaving(false);
    }
  }, [pending, reload]);

  const onExport = useCallback(() => {
    const headers = [
      'Sr. No.',
      'Name',
      'Email / Phone',
      'County',
      'State',
      'Date',
      'Description',
    ];
    const csv = rows.map((r, i) => [
      i + 1,
      r.name,
      r.contact,
      r.county,
      r.state,
      r.date,
      r.description,
    ]);
    shareCsvInApp(`demo-requests-${tab}.csv`, headers, csv).catch(() =>
      Alert.alert('Export failed', 'Could not generate the CSV.'),
    );
  }, [rows, tab]);

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
          <Text style={styles.headerTitle}>Demo Requests</Text>
          <TouchableOpacity style={styles.iconBtnCircle} activeOpacity={0.8}>
            <Image source={icProfile} style={styles.headerIcon} />
          </TouchableOpacity>
        </View>

        {/* Tabs + export */}
        <View style={styles.topRow}>
          <View style={styles.tabs}>
            {(['pending', 'contacted'] as const).map(t => {
              const active = tab === t;
              return (
                <TouchableOpacity
                  key={t}
                  activeOpacity={0.85}
                  onPress={() => setTab(t)}
                  style={[styles.tabChip, active && styles.tabChipActive]}>
                  <Text
                    style={[styles.tabText, active && styles.tabTextActive]}>
                    {t === 'pending' ? 'Pending' : 'Contacted'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={styles.exportBtn}
            activeOpacity={0.85}
            onPress={onExport}>
            <Image source={icDownload} style={styles.exportIcon} />
            <Text style={styles.exportText}>Export</Text>
          </TouchableOpacity>
        </View>

        {/* List */}
        {loading && rows.length === 0 ? (
          <ActivityIndicator
            color={appColors.maroon}
            style={{marginTop: scaleWidth(40)}}
          />
        ) : rows.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No requests found.</Text>
          </View>
        ) : (
          rows.map((r, i) => (
            <View key={r.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.srNo}>#{i + 1}</Text>
                <Text style={styles.name} numberOfLines={1}>
                  {r.name}
                </Text>
                {isPending ? (
                  <TouchableOpacity
                    style={styles.markBtn}
                    activeOpacity={0.85}
                    onPress={() => setPending(r.id)}>
                    <Image source={icCheck} style={styles.markIcon} />
                    <Text style={styles.markText}>Mark Contacted</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.metaGrid}>
                <View style={styles.metaCell}>
                  <Text style={styles.metaLabel}>EMAIL / PHONE</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>
                    {r.contact}
                  </Text>
                </View>
                <View style={styles.metaCell}>
                  <Text style={styles.metaLabel}>DATE</Text>
                  <Text style={styles.metaValue}>{r.date}</Text>
                </View>
                <View style={styles.metaCell}>
                  <Text style={styles.metaLabel}>COUNTY</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>
                    {r.county}
                  </Text>
                </View>
                <View style={styles.metaCell}>
                  <Text style={styles.metaLabel}>STATE</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>
                    {r.state}
                  </Text>
                </View>
              </View>

              {r.description ? (
                <View style={styles.descWrap}>
                  <Text style={styles.metaLabel}>DESCRIPTION</Text>
                  <Text style={styles.descText}>{r.description}</Text>
                </View>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>

      <ConfirmModal
        visible={!!pending}
        title="Mark as contacted?"
        message="This will move the request to the Contacted list."
        confirmLabel="Mark Contacted"
        loading={saving}
        onConfirm={confirmContacted}
        onCancel={() => (saving ? null : setPending(null))}
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
    tintColor: appColors.coffeeDark,
  },
  headerTitle: {...typography(700, 18, 'coffeeDark'), fontWeight: '700'},

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleWidth(16),
  },
  tabs: {flexDirection: 'row'},
  tabChip: {
    paddingHorizontal: scaleWidth(18),
    paddingVertical: scaleWidth(9),
    borderRadius: scaleWidth(10),
    marginRight: scaleWidth(8),
    backgroundColor: appColors.white,
    ...shadow,
  },
  tabChipActive: {backgroundColor: appColors.maroon},
  tabText: {...typography(600, 13, 'coffeeDark'), fontWeight: '600'},
  tabTextActive: {color: appColors.white},
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
  srNo: {
    ...typography(600, 12, 'gray'),
    fontWeight: '600',
    marginRight: scaleWidth(8),
  },
  name: {flex: 1, ...typography(700, 15, 'coffeeDark'), fontWeight: '700'},
  markBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30,135,75,0.1)',
    borderRadius: scaleWidth(10),
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleWidth(7),
  },
  markIcon: {
    width: scaleWidth(13),
    height: scaleWidth(13),
    tintColor: appColors.success,
    marginRight: scaleWidth(6),
  },
  markText: {...typography(600, 12, 'success'), fontWeight: '600'},

  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: scaleWidth(14),
  },
  metaCell: {width: '50%', marginBottom: scaleWidth(12)},
  metaLabel: {...typography(600, 9, 'gray'), fontWeight: '600', letterSpacing: 0.5},
  metaValue: {
    ...typography(600, 14, 'coffeeDark'),
    fontWeight: '600',
    marginTop: scaleWidth(3),
  },
  descWrap: {
    marginTop: scaleWidth(2),
    borderTopWidth: 1,
    borderTopColor: 'rgba(61,32,20,0.07)',
    paddingTop: scaleWidth(12),
  },
  descText: {
    ...typography('regular', 13, 'coffeeDark'),
    marginTop: scaleWidth(4),
    lineHeight: scaleWidth(18),
  },
});

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
  Alert,
  Modal,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {appColors, typography, scaleWidth} from '../../global';
import {AppScreenProps} from '../../types';
import {useAppSelector} from '../../store';
import {currentSearchSelector} from '../../slices';
import {useFetch} from '../../hooks';
import {cleanSearchMessage} from '../../utils';
import {getSearchStatus} from '../../api/userAdmin.api';
import {
  downloadToCache,
  previewLocalFile,
  shareLocalFile,
} from '../../utils/documents';

const repBg = require('../../assets/images/report-bg.png');
const propertyMap = require('../../assets/images/property-map.png');
const icChevron = require('../../assets/images/ic-chevron.png');
const icDownload = require('../../assets/images/ic-download.png');
const icPin = require('../../assets/images/ic-pin.png');
const icProfile = require('../../assets/images/ic-profile.png');
const icDollar = require('../../assets/images/ic-dollar.png');
const icAward = require('../../assets/images/ic-award.png');
const icFile = require('../../assets/images/ic-file.png');
const icEye = require('../../assets/images/ic-eye.png');

type TabKey = 'Overview' | 'Map' | 'Documents';
const TABS: TabKey[] = ['Overview', 'Map', 'Documents'];

const str = (v: unknown): string =>
  v === null || v === undefined || v === '' ? '—' : String(v);

export const PropertyReportScreen = ({
  navigation,
  route,
}: AppScreenProps<'PropertyReport'>) => {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabKey>('Overview');
  const [busy, setBusy] = useState<string | null>(null);

  // Open a document inside the app (native QuickLook / view intent).
  // We download first (with the loader), then dismiss the loader, then present
  // the viewer — iOS can't present QuickLook while an RN Modal is on screen.
  const handleView = useCallback(async (doc: any) => {
    if (!doc?.url) {
      Alert.alert('Unavailable', 'This document has no file to open.');
      return;
    }
    setBusy('Opening document…');
    try {
      const file = await downloadToCache(doc.url, doc.name || doc.title);
      setBusy(null);
      setTimeout(() => previewLocalFile(file), 350);
    } catch (e: any) {
      setBusy(null);
      Alert.alert('Unable to open', e?.message || 'Could not open this document.');
    }
  }, []);

  // Download a file via the in-app share sheet ("Save to Files").
  const handleDownload = useCallback(async (url?: string, name?: string) => {
    if (!url) {
      Alert.alert('Not ready', 'The download is not available yet.');
      return;
    }
    setBusy('Preparing download…');
    try {
      const file = await downloadToCache(url, name, 'zip');
      setBusy(null);
      setTimeout(() => shareLocalFile(file), 350);
    } catch (e: any) {
      setBusy(null);
      Alert.alert('Download failed', e?.message || 'Could not download the file.');
    }
  }, []);
  const search = useAppSelector(currentSearchSelector);
  const searchId = route.params?.searchId;
  const liveStatus =
    searchId && search.searchId === searchId ? search.status : null;

  // Fetch the full property detail from the backend.
  const fetcher = useCallback(
    () => (searchId ? getSearchStatus(searchId) : Promise.resolve(null)),
    [searchId],
  );
  // Re-fetch when the in-flight search status flips (e.g. → SUCCESS).
  const {data: d, loading} = useFetch<any>(fetcher, [searchId, liveStatus]);

  const view = useMemo(() => {
    const ps = d?.propertySummary ?? d?.property_summary ?? {};
    const own = ps?.property_information_and_current_ownership ?? {};
    const city = (own.municipality ?? '').replace(/^city of\s+/i, '').trim();
    const county = (own.county_and_state ?? '').split(',')[0]?.trim();
    return {
      status: (d?.status ?? liveStatus ?? 'SUCCESS') as string,
      percent: d?.percent_completion ?? search.percent ?? 0,
      message: cleanSearchMessage(d?.status_message),
      addressLine: str(d?.address ?? route.params?.address),
      title:
        d?.address && own.county_and_state
          ? `${d.address}, ${own.county_and_state}`
          : str(d?.address ?? route.params?.address),
      searchedOn: str(ps['Date of Search'] ?? route.params?.when),
      searchId: str(d?.searchId ?? searchId),
      location: str(own.property_information ?? d?.address),
      // Map lots only from real API fields (no dummy fallback).
      lots: str(ps.lots ?? ps.Lots ?? ps.LOTS ?? own.lots ?? ps.lot),
      // Area is derived from the real municipality + county; '—' otherwise.
      area: city && county ? `${city}, ${county} County` : '—',
      property: str(d?.address),
      countyState: str(own.county_and_state),
      municipality: str(own.municipality),
      pin: str(ps.PIN ?? ps.pin),
      span: str(d?.span_of_search),
      dateOfSearch: str(ps['Date of Search']),
      currentOwner: str(own.current_owner),
      taxAssessment: str(ps['Tax Assessment']),
      titleDeed: str(own.title_deed),
      streetView: d?.street_view as string | undefined,
      parcelMap: d?.parcel_map as string | undefined,
      downloadLink: (d?.downloadLink ?? d?.download_link ?? d?.zip_url) as
        | string
        | undefined,
      csvLink: (d?.csv_url ?? d?.csvUrl ?? d?.csv) as string | undefined,
      // Show only PDF documents — hide the ocr_results_*.txt files.
      documents: (Array.isArray(d?.documents) ? d.documents : []).filter(
        (doc: any) => {
          const name = String(doc?.name ?? doc?.title ?? '').toLowerCase();
          const type = String(doc?.type ?? '').toLowerCase();
          return type === 'pdf' || name.endsWith('.pdf');
        },
      ),
    };
  }, [d, liveStatus, search.percent, route.params, searchId]);

  const inProgress = view.status === 'IN_PROGRESS';
  const isSuccess = view.status === 'SUCCESS';

  const GRID: {label: string; value: string}[] = [
    {label: 'LOCATION', value: view.location},
    {label: 'LOTS', value: view.lots},
    {label: 'AREA', value: view.area},
    {label: 'PROPERTY', value: view.property},
    {label: 'COUNTY, STATE', value: view.countyState},
    {label: 'MUNICIPALITY', value: view.municipality},
    {label: 'PIN/PARCEL', value: view.pin},
    {label: 'SPAN OF SEARCH', value: view.span},
    {label: 'DATE OF SEARCH', value: view.dateOfSearch},
  ];

  const FINDINGS = [
    {icon: icProfile, label: 'CURRENT OWNER', value: view.currentOwner},
    {icon: icDollar, label: 'TAX ASSESSMENT', value: view.taxAssessment},
    {icon: icAward, label: 'TITLE DEED', value: view.titleDeed},
  ];

  return (
    <ImageBackground source={repBg} resizeMode="cover" style={styles.bg}>
      <StatusBar barStyle="dark-content" translucent={false} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          {paddingTop: insets.top + scaleWidth(10)},
          {
            paddingBottom:
              tab === 'Documents'
                ? insets.bottom + scaleWidth(96)
                : insets.bottom + scaleWidth(24),
          },
        ]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}>
            <Image source={icChevron} style={styles.backIcon} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Property Report</Text>
          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.8}
            onPress={() =>
              handleDownload(view.downloadLink, `${view.addressLine}.zip`)
            }>
            <Image source={icDownload} style={styles.headerDownload} />
          </TouchableOpacity>
        </View>

        {/* Property card */}
        <View style={styles.propCard}>
          <View style={styles.propTop}>
            <Text style={styles.propAddr}>{view.title}</Text>
            <View
              style={[
                styles.statusPill,
                !isSuccess && styles.statusPillPending,
              ]}>
              <Text
                style={[styles.statusText, !isSuccess && styles.statusTextPending]}>
                {inProgress ? 'IN PROGRESS' : view.status}
              </Text>
            </View>
          </View>
          <Text style={styles.searchedOn}>
            Searched on: <Text style={styles.searchedOnB}>{view.searchedOn}</Text>
            {'  ·  '}ID: {view.searchId}
          </Text>
          {inProgress ? (
            <Text style={styles.liveMsg}>
              {view.message || 'Search in progress…'}
              {view.percent ? `  ·  ${view.percent}%` : ''}
            </Text>
          ) : null}
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map(t => {
            const active = tab === t;
            return (
              <TouchableOpacity
                key={t}
                activeOpacity={0.9}
                onPress={() => setTab(t)}
                style={[styles.tab, active && styles.tabActive]}>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {t}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading && !d ? (
          <ActivityIndicator
            color={appColors.maroon}
            style={{marginTop: scaleWidth(40)}}
          />
        ) : tab === 'Map' ? (
          <>
            {/* Street view */}
            <Text style={styles.sectionTitle}>Street View</Text>
            <View style={styles.mapCard}>
              {view.streetView ? (
                <Image
                  source={{uri: view.streetView}}
                  style={styles.mapImg}
                  resizeMode="cover"
                />
              ) : (
                <Image source={propertyMap} style={styles.mapImg} />
              )}
              <View style={styles.mapMarker}>
                <Image source={icPin} style={styles.mapMarkerIcon} />
              </View>
            </View>

            {/* Parcel map */}
            <Text style={styles.sectionTitle}>Parcel Map</Text>
            <View style={styles.mapCard}>
              {view.parcelMap ? (
                <Image
                  source={{uri: view.parcelMap}}
                  style={styles.mapImg}
                  resizeMode="cover"
                />
              ) : (
                <Image source={propertyMap} style={styles.mapImg} />
              )}
            </View>
          </>
        ) : tab === 'Overview' ? (
          <>
            {/* Description grid */}
            <Text style={[styles.sectionTitle, {marginTop: scaleWidth(4)}]}>
              Description
            </Text>
            <View style={styles.grid}>
              {GRID.map(cell => (
                <View key={cell.label} style={styles.gridCell}>
                  <Text style={styles.gridLabel}>{cell.label}</Text>
                  <Text style={styles.gridValue}>{cell.value}</Text>
                </View>
              ))}
            </View>

            {/* Key findings */}
            <Text style={styles.sectionTitle}>Key Findings</Text>
            {FINDINGS.map(f => (
              <View key={f.label} style={styles.findCard}>
                <View style={styles.findIconWrap}>
                  <Image source={f.icon} style={styles.findIcon} />
                </View>
                <View style={styles.findBody}>
                  <Text style={styles.findLabel}>{f.label}</Text>
                  <Text style={styles.findValue}>{f.value}</Text>
                </View>
              </View>
            ))}
          </>
        ) : (
          /* Documents */
          <View style={styles.docsCard}>
            <View style={styles.docsHead}>
              <Text style={styles.docsTitle}>Documents</Text>
              <View style={styles.totalPill}>
                <Text style={styles.totalText}>
                  {view.documents.length} TOTAL
                </Text>
              </View>
            </View>
            {view.documents.length === 0 ? (
              <Text style={styles.docEmpty}>No documents available.</Text>
            ) : (
              view.documents.map((doc: any, i: number) => (
                <View key={`${doc.url}-${i}`}>
                  {i > 0 ? <View style={styles.docDivider} /> : null}
                  <View style={styles.docRow}>
                    <View style={styles.docIconWrap}>
                      <Image source={icFile} style={styles.docIcon} />
                    </View>
                    <View style={styles.docBody}>
                      <Text style={styles.docTitle} numberOfLines={1}>
                        {doc.name ?? `Document ${i + 1}`}
                      </Text>
                      <Text style={styles.docSub} numberOfLines={1}>
                        {(doc.type ?? 'file').toUpperCase()}
                        {doc.date_of_record ? ` · ${doc.date_of_record}` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                      onPress={() => handleView(doc)}>
                      <Image source={icEye} style={styles.docEye} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Documents footer */}
      {tab === 'Documents' ? (
        <View
          style={[styles.footer, {paddingBottom: insets.bottom + scaleWidth(12)}]}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.dlBtn, styles.dlOutline]}
            onPress={() =>
              handleDownload(
                view.csvLink || view.downloadLink,
                `${view.addressLine}.csv`,
              )
            }>
            <Image source={icDownload} style={styles.dlIconDark} />
            <Text style={styles.dlTextDark}>Download CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.dlBtn, styles.dlFilled]}
            onPress={() =>
              handleDownload(view.downloadLink, `${view.addressLine}.zip`)
            }>
            <Image source={icDownload} style={styles.dlIconLight} />
            <Text style={styles.dlTextLight}>Download ZIP</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Busy overlay while downloading / opening a file */}
      <Modal visible={!!busy} transparent animationType="fade">
        <View style={styles.busyOverlay}>
          <View style={styles.busyCard}>
            <ActivityIndicator color={appColors.maroon} size="large" />
            <Text style={styles.busyText}>{busy}</Text>
          </View>
        </View>
      </Modal>
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
  iconBtn: {
    width: scaleWidth(42),
    height: scaleWidth(42),
    borderRadius: scaleWidth(12),
    backgroundColor: appColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  backIcon: {
    width: scaleWidth(17),
    height: scaleWidth(17),
    tintColor: appColors.coffeeDark,
    transform: [{scaleX: -1}],
  },
  headerDownload: {
    width: scaleWidth(19),
    height: scaleWidth(19),
    tintColor: appColors.coffeeDark,
  },
  headerTitle: {
    ...typography(700, 18, 'coffeeDark'),
    fontWeight: '700',
  },

  propCard: {
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(18),
    padding: scaleWidth(16),
    ...shadow,
  },
  propTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  propAddr: {
    flex: 1,
    ...typography(700, 18, 'coffeeDark'),
    fontWeight: '700',
    marginRight: scaleWidth(10),
  },
  statusPill: {
    backgroundColor: 'rgba(30,135,75,0.12)',
    borderRadius: scaleWidth(8),
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleWidth(5),
  },
  statusText: {
    ...typography(700, 11, 'success'),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusPillPending: {backgroundColor: 'rgba(169,130,28,0.15)'},
  statusTextPending: {color: appColors.warning},
  searchedOn: {
    ...typography('regular', 12, 'gray'),
    marginTop: scaleWidth(8),
  },
  searchedOnB: {
    ...typography(600, 12, 'coffeeDark'),
    fontWeight: '600',
  },
  liveMsg: {
    ...typography(500, 12, 'coffeeLight'),
    fontWeight: '500',
    marginTop: scaleWidth(8),
  },

  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(61,32,20,0.06)',
    borderRadius: scaleWidth(14),
    padding: scaleWidth(4),
    marginTop: scaleWidth(16),
    marginBottom: scaleWidth(16),
  },
  tab: {
    flex: 1,
    height: scaleWidth(40),
    borderRadius: scaleWidth(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {backgroundColor: appColors.white, ...shadow, shadowOpacity: 0.1},
  tabText: {...typography(600, 14, 'gray'), fontWeight: '600'},
  tabTextActive: {color: appColors.maroon},

  mapCard: {
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(16),
    overflow: 'hidden',
    ...shadow,
  },
  mapImg: {width: '100%', height: scaleWidth(200)},
  mapMarker: {
    position: 'absolute',
    left: scaleWidth(14),
    bottom: scaleWidth(14),
    width: scaleWidth(34),
    height: scaleWidth(34),
    borderRadius: scaleWidth(10),
    backgroundColor: appColors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  mapMarkerIcon: {
    width: scaleWidth(17),
    height: scaleWidth(17),
    tintColor: appColors.white,
  },

  sectionTitle: {
    ...typography(700, 16, 'coffeeDark'),
    fontWeight: '700',
    marginTop: scaleWidth(20),
    marginBottom: scaleWidth(12),
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(16),
    padding: scaleWidth(16),
    ...shadow,
  },
  gridCell: {
    width: '50%',
    marginBottom: scaleWidth(16),
    paddingRight: scaleWidth(10),
  },
  gridLabel: {
    ...typography(600, 10, 'gray'),
    fontWeight: '600',
    letterSpacing: 0.6,
    marginBottom: scaleWidth(4),
  },
  gridValue: {
    ...typography(600, 13, 'coffeeDark'),
    fontWeight: '600',
  },

  findCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(14),
    padding: scaleWidth(14),
    marginBottom: scaleWidth(10),
    ...shadow,
  },
  findIconWrap: {
    width: scaleWidth(38),
    height: scaleWidth(38),
    borderRadius: scaleWidth(11),
    backgroundColor: 'rgba(94,23,23,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(12),
  },
  findIcon: {width: scaleWidth(18), height: scaleWidth(18), tintColor: appColors.maroon},
  findBody: {flex: 1},
  findLabel: {
    ...typography(600, 10, 'gray'),
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  findValue: {
    ...typography(700, 14, 'coffeeDark'),
    fontWeight: '700',
    marginTop: scaleWidth(3),
  },

  docsCard: {
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(16),
    padding: scaleWidth(16),
    ...shadow,
  },
  docsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleWidth(6),
  },
  docsTitle: {...typography(700, 16, 'coffeeDark'), fontWeight: '700'},
  totalPill: {
    backgroundColor: 'rgba(61,32,20,0.06)',
    borderRadius: scaleWidth(8),
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleWidth(4),
  },
  totalText: {
    ...typography(600, 10, 'gray'),
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  docEmpty: {
    ...typography(500, 13, 'gray'),
    fontWeight: '500',
    textAlign: 'center',
    paddingVertical: scaleWidth(20),
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleWidth(12),
  },
  docIconWrap: {
    width: scaleWidth(38),
    height: scaleWidth(38),
    borderRadius: scaleWidth(11),
    backgroundColor: 'rgba(94,23,23,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(12),
  },
  docIcon: {width: scaleWidth(18), height: scaleWidth(18), tintColor: appColors.maroon},
  docBody: {flex: 1, marginRight: scaleWidth(8)},
  docTitle: {...typography(600, 14, 'coffeeDark'), fontWeight: '600'},
  docSub: {...typography('regular', 12, 'gray'), marginTop: scaleWidth(3)},
  docEye: {width: scaleWidth(19), height: scaleWidth(19), tintColor: appColors.gray},
  docDivider: {
    height: 1,
    backgroundColor: 'rgba(61,32,20,0.07)',
    marginLeft: scaleWidth(50),
  },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleWidth(12),
    backgroundColor: 'rgba(255,253,246,0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(61,32,20,0.06)',
  },
  dlBtn: {
    flex: 1,
    height: scaleWidth(50),
    borderRadius: scaleWidth(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dlOutline: {
    backgroundColor: appColors.white,
    borderWidth: 1.4,
    borderColor: appColors.inputBorder,
    marginRight: scaleWidth(6),
  },
  dlFilled: {backgroundColor: appColors.maroon, marginLeft: scaleWidth(6)},
  dlIconDark: {
    width: scaleWidth(16),
    height: scaleWidth(16),
    tintColor: appColors.coffeeDark,
    marginRight: scaleWidth(8),
  },
  dlIconLight: {
    width: scaleWidth(16),
    height: scaleWidth(16),
    tintColor: appColors.white,
    marginRight: scaleWidth(8),
  },
  dlTextDark: {...typography(600, 14, 'coffeeDark'), fontWeight: '600'},
  dlTextLight: {...typography(600, 14, 'white'), fontWeight: '600'},
  busyOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20,8,4,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  busyCard: {
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(16),
    paddingVertical: scaleWidth(26),
    paddingHorizontal: scaleWidth(34),
    alignItems: 'center',
    minWidth: scaleWidth(180),
  },
  busyText: {
    ...typography(500, 14, 'coffeeDark'),
    fontWeight: '500',
    marginTop: scaleWidth(14),
  },
});

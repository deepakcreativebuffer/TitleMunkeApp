import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {appColors, typography, scaleWidth} from '../../global';
import {AppScreenProps} from '../../types';
import {useAppSelector} from '../../store';
import {currentSearchSelector} from '../../slices';

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

type TabKey = 'Overview' | 'Documents';

const FINDINGS = [
  {icon: icProfile, label: 'CURRENT OWNER', value: 'Ravisher Sidhu & Harmita S. Sidhu'},
  {icon: icDollar, label: 'TAX ASSESSMENT', value: '$371,200'},
  {icon: icAward, label: 'TITLE DEED', value: 'Recorded 12/30/2004 · Doc 7236987'},
];

const DOCS = [
  {id: '1', title: 'Document 1', sub: 'Deed of Conveyance · 12/30/2004'},
  {id: '2', title: 'Document 2', sub: 'Mortgage Record · 12/30/2004'},
  {id: '3', title: 'Document 3', sub: 'Tax Lien Search · 01/15/2005'},
  {id: '4', title: 'Document 4', sub: 'Easement Notice · 03/22/2011'},
  {id: '5', title: 'Final Property Report', sub: 'Compiled summary · 06/19/2026'},
];

export const PropertyReportScreen = ({
  navigation,
  route,
}: AppScreenProps<'PropertyReport'>) => {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabKey>('Overview');
  const search = useAppSelector(currentSearchSelector);
  const routeSearchId = route.params?.searchId;
  // Live status only applies when this report is the one currently searching.
  const live = routeSearchId && search.searchId === routeSearchId;
  const liveStatus = live ? search.status : 'SUCCESS';
  const address = route.params?.address || search.address || '3578 Stone Gate Dr';
  const when = route.params?.when || '06/19/2026 · 10:54 AM';

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
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8}>
            <Image source={icDownload} style={styles.headerDownload} />
          </TouchableOpacity>
        </View>

        {/* Property card */}
        <View style={styles.propCard}>
          <View style={styles.propTop}>
            <Text style={styles.propAddr}>{address}</Text>
            <View
              style={[
                styles.statusPill,
                liveStatus !== 'SUCCESS' && styles.statusPillPending,
              ]}>
              <Text
                style={[
                  styles.statusText,
                  liveStatus !== 'SUCCESS' && styles.statusTextPending,
                ]}>
                {liveStatus === 'IN_PROGRESS' ? 'IN PROGRESS' : liveStatus}
              </Text>
            </View>
          </View>
          {live && liveStatus === 'IN_PROGRESS' ? (
            <Text style={styles.liveMsg}>
              {search.message || 'Search in progress…'}
              {search.percent ? `  ·  ${search.percent}%` : ''}
            </Text>
          ) : null}
          <View style={styles.countyRow}>
            <Image source={icPin} style={styles.countyPin} />
            <Text style={styles.countyText}>Lehigh County, PA</Text>
          </View>
          <View style={styles.propDivider} />
          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>SEARCH ID</Text>
              <Text style={styles.metaValue}>#TM-100482</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>DATE</Text>
              <Text style={styles.metaValue}>{when}</Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['Overview', 'Documents'] as TabKey[]).map(t => {
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

        {tab === 'Overview' ? (
          <>
            {/* Map */}
            <View style={styles.mapCard}>
              <Image source={propertyMap} style={styles.mapImg} />
              <View style={styles.mapMarker}>
                <Image source={icPin} style={styles.mapMarkerIcon} />
              </View>
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
                <Text style={styles.totalText}>17 TOTAL</Text>
              </View>
            </View>
            {DOCS.map((d, i) => (
              <View key={d.id}>
                {i > 0 ? <View style={styles.docDivider} /> : null}
                <View style={styles.docRow}>
                  <View style={styles.docIconWrap}>
                    <Image source={icFile} style={styles.docIcon} />
                  </View>
                  <View style={styles.docBody}>
                    <Text style={styles.docTitle}>{d.title}</Text>
                    <Text style={styles.docSub}>{d.sub}</Text>
                  </View>
                  <TouchableOpacity hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                    <Image source={icEye} style={styles.docEye} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Documents footer */}
      {tab === 'Documents' ? (
        <View
          style={[
            styles.footer,
            {paddingBottom: insets.bottom + scaleWidth(12)},
          ]}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.dlBtn, styles.dlOutline]}>
            <Image source={icDownload} style={styles.dlIconDark} />
            <Text style={styles.dlTextDark}>Download CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.dlBtn, styles.dlFilled]}>
            <Image source={icDownload} style={styles.dlIconLight} />
            <Text style={styles.dlTextLight}>Download ZIP</Text>
          </TouchableOpacity>
        </View>
      ) : null}
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  propAddr: {
    flex: 1,
    ...typography(700, 19, 'coffeeDark'),
    fontWeight: '700',
  },
  statusPill: {
    backgroundColor: 'rgba(30,135,75,0.12)',
    borderRadius: scaleWidth(8),
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleWidth(5),
    marginLeft: scaleWidth(10),
  },
  statusText: {
    ...typography(700, 11, 'success'),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusPillPending: {
    backgroundColor: 'rgba(169,130,28,0.15)',
  },
  statusTextPending: {
    color: appColors.warning,
  },
  liveMsg: {
    ...typography(500, 12, 'coffeeLight'),
    fontWeight: '500',
    marginTop: scaleWidth(8),
  },
  countyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scaleWidth(6),
  },
  countyPin: {
    width: scaleWidth(14),
    height: scaleWidth(14),
    tintColor: appColors.maroon,
    marginRight: scaleWidth(5),
  },
  countyText: {
    ...typography('regular', 13, 'gray'),
  },
  propDivider: {
    height: 1,
    backgroundColor: 'rgba(61,32,20,0.07)',
    marginVertical: scaleWidth(14),
  },
  metaRow: {flexDirection: 'row'},
  metaCol: {flex: 1},
  metaLabel: {
    ...typography(600, 10, 'gray'),
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  metaValue: {
    ...typography(700, 14, 'coffeeDark'),
    fontWeight: '700',
    marginTop: scaleWidth(4),
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
  tabActive: {
    backgroundColor: appColors.white,
    ...shadow,
    shadowOpacity: 0.1,
  },
  tabText: {
    ...typography(600, 14, 'gray'),
    fontWeight: '600',
  },
  tabTextActive: {
    color: appColors.maroon,
  },

  mapCard: {
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(16),
    overflow: 'hidden',
    ...shadow,
  },
  mapImg: {
    width: '100%',
    height: scaleWidth(200),
  },
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
  findIcon: {
    width: scaleWidth(18),
    height: scaleWidth(18),
    tintColor: appColors.maroon,
  },
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
  docsTitle: {
    ...typography(700, 16, 'coffeeDark'),
    fontWeight: '700',
  },
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
  docIcon: {
    width: scaleWidth(18),
    height: scaleWidth(18),
    tintColor: appColors.maroon,
  },
  docBody: {flex: 1},
  docTitle: {
    ...typography(600, 14, 'coffeeDark'),
    fontWeight: '600',
  },
  docSub: {
    ...typography('regular', 12, 'gray'),
    marginTop: scaleWidth(3),
  },
  docEye: {
    width: scaleWidth(19),
    height: scaleWidth(19),
    tintColor: appColors.gray,
  },
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
  dlFilled: {
    backgroundColor: appColors.maroon,
    marginLeft: scaleWidth(6),
  },
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
  dlTextDark: {
    ...typography(600, 14, 'coffeeDark'),
    fontWeight: '600',
  },
  dlTextLight: {
    ...typography(600, 14, 'white'),
    fontWeight: '600',
  },
});

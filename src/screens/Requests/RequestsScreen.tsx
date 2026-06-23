import React from 'react';
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
import {useDrawer} from '../../context/DrawerContext';

const gridBg = require('../../assets/images/grid-bg.png');
const icMenu = require('../../assets/images/ic-menu.png');
const icProfile = require('../../assets/images/ic-profile.png');
const icFile = require('../../assets/images/ic-file.png');

type Status = 'PENDING' | 'APPROVED' | 'REJECTED';

type RequestItem = {
  id: string;
  broker: string;
  type: string;
  datetime: string;
  status: Status;
};

const REQUESTS: RequestItem[] = [
  {
    id: '1',
    broker: 'Keller Williams Realty',
    type: 'Full Title Search',
    datetime: '06/19/2026 · 11:20 AM',
    status: 'PENDING',
  },
  {
    id: '2',
    broker: 'RE/MAX Premier',
    type: 'Lien Search',
    datetime: '06/18/2026 · 03:42 PM',
    status: 'APPROVED',
  },
  {
    id: '3',
    broker: 'Coldwell Banker',
    type: 'Ownership Verification',
    datetime: '05/28/2026 · 09:10 AM',
    status: 'REJECTED',
  },
];

const STATUS_STYLE: Record<Status, {bg: string; color: string}> = {
  PENDING: {bg: 'rgba(169,130,28,0.15)', color: appColors.warning},
  APPROVED: {bg: 'rgba(30,135,75,0.13)', color: appColors.success},
  REJECTED: {bg: 'rgba(193,52,52,0.13)', color: appColors.error},
};

export const RequestsScreen = () => {
  const insets = useSafeAreaInsets();
  const {openDrawer} = useDrawer();

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
            <Image source={icProfile} style={styles.headerIcon} />
          </TouchableOpacity>
        </View>

        {/* Sub header */}
        <View style={styles.subHead}>
          <Text style={styles.subTitle}>My Requests</Text>
          <Text style={styles.subCount}>{REQUESTS.length} total</Text>
        </View>

        {/* New request */}
        <TouchableOpacity activeOpacity={0.9} style={styles.newBtn}>
          <Text style={styles.newPlus}>+</Text>
          <Text style={styles.newText}>New Request</Text>
        </TouchableOpacity>

        {/* Request cards */}
        {REQUESTS.map(item => {
          const st = STATUS_STYLE[item.status];
          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.fileWrap}>
                  <Image source={icFile} style={styles.fileIcon} />
                </View>
                <View style={styles.brokerCol}>
                  <Text style={styles.fieldLabel}>BROKER</Text>
                  <Text style={styles.brokerName}>{item.broker}</Text>
                </View>
                <View style={[styles.pill, {backgroundColor: st.bg}]}>
                  <Text style={[styles.pillText, {color: st.color}]}>
                    {item.status}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBottom}>
                <View style={styles.col}>
                  <Text style={styles.fieldLabel}>REQUEST TYPE</Text>
                  <Text style={styles.fieldValue}>{item.type}</Text>
                </View>
                <View style={styles.col}>
                  <Text style={styles.fieldLabel}>DATE & TIME</Text>
                  <Text style={styles.fieldValue}>{item.datetime}</Text>
                </View>
              </View>
            </View>
          );
        })}
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
    marginBottom: scaleWidth(14),
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

  subHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleWidth(14),
  },
  subTitle: {
    ...typography(700, 17, 'coffeeDark'),
    fontWeight: '700',
  },
  subCount: {
    ...typography('regular', 13, 'gray'),
  },

  newBtn: {
    height: scaleWidth(54),
    borderRadius: scaleWidth(14),
    backgroundColor: appColors.maroon,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleWidth(16),
    ...shadow,
    shadowOpacity: 0.18,
  },
  newPlus: {
    color: appColors.white,
    fontSize: scaleWidth(20),
    fontWeight: '500',
    marginRight: scaleWidth(8),
    marginTop: scaleWidth(-2),
  },
  newText: {
    ...typography(600, 16, 'white'),
    fontWeight: '600',
  },

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
});

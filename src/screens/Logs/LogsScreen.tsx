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
const icLogin = require('../../assets/images/ic-login.png');
const icLogout = require('../../assets/images/ic-logout.png');
const icSearch = require('../../assets/images/ic-search.png');

type LogType = 'login' | 'logout' | 'search';
type LogItem = {id: string; type: LogType; title: string; sub?: string; time: string};
type LogSection = {label: string; items: LogItem[]};

const SECTIONS: LogSection[] = [
  {
    label: 'TODAY · 06/19/2026',
    items: [
      {id: '1', type: 'login', title: 'Logged in successfully', time: '12:54 PM'},
      {id: '2', type: 'logout', title: 'Logged out successfully', time: '12:53 PM'},
      {id: '3', type: 'login', title: 'Logged in successfully', time: '12:39 PM'},
      {id: '4', type: 'login', title: 'Logged in successfully', time: '11:51 AM'},
      {id: '5', type: 'search', title: 'Searched a property', sub: '3578 STONE GATE DR', time: '11:22 AM'},
      {id: '6', type: 'search', title: 'Searched a property', sub: '2302 W CHEW ST', time: '10:52 AM'},
      {id: '7', type: 'login', title: 'Logged in successfully', time: '10:18 AM'},
    ],
  },
  {
    label: 'MAY 28 · 2026',
    items: [
      {id: '8', type: 'logout', title: 'Logged out successfully', time: '05:13 PM'},
    ],
  },
];

const TYPE_STYLE: Record<LogType, {icon: number; tint: string; bg: string}> = {
  login: {icon: icLogin, tint: appColors.success, bg: 'rgba(30,135,75,0.12)'},
  logout: {icon: icLogout, tint: appColors.error, bg: 'rgba(193,52,52,0.12)'},
  search: {icon: icSearch, tint: appColors.coffeeLight, bg: 'rgba(152,117,85,0.13)'},
};

export const LogsScreen = () => {
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
          <Text style={styles.headerTitle}>Audit Logs</Text>
          <TouchableOpacity style={styles.iconBtnCircle} activeOpacity={0.8}>
            <Image source={icProfile} style={styles.headerIcon} />
          </TouchableOpacity>
        </View>

        {SECTIONS.map(section => (
          <View key={section.label}>
            <Text style={styles.sectionLabel}>{section.label}</Text>
            <View style={styles.card}>
              {section.items.map((item, i) => {
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
                        <Text style={styles.rowTitle}>{item.title}</Text>
                        {item.sub ? (
                          <Text style={styles.rowSub}>{item.sub}</Text>
                        ) : null}
                      </View>
                      <Text style={styles.rowTime}>{item.time}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ))}
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
    marginBottom: scaleWidth(6),
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

  sectionLabel: {
    ...typography(600, 11, 'gray'),
    fontWeight: '600',
    letterSpacing: 0.8,
    marginTop: scaleWidth(18),
    marginBottom: scaleWidth(10),
  },
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
  },
  rowTitle: {
    ...typography(600, 14, 'coffeeDark'),
    fontWeight: '600',
  },
  rowSub: {
    ...typography(500, 11, 'gray'),
    fontWeight: '500',
    letterSpacing: 0.4,
    marginTop: scaleWidth(3),
  },
  rowTime: {
    ...typography('regular', 12, 'gray'),
    marginLeft: scaleWidth(8),
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(61,32,20,0.07)',
    marginLeft: scaleWidth(50),
  },
});

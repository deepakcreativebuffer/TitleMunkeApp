import React, {useState, useEffect, useCallback} from 'react';
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
import {useNavigation} from '@react-navigation/native';
import {appColors, typography, scaleWidth} from '../../global';
import {useAppDispatch, useAppSelector} from '../../store';
import {userProfileSelector} from '../../slices';
import {isAdminRole} from '../../utils';
import {logoutThunk} from '../../thunks';
import {useDrawer} from '../../context/DrawerContext';
import {ConfirmModal} from '../../components/ConfirmModal';
import {useFetch} from '../../hooks';
import {
  fetchEmailPreference,
  setEmailPreferenceSearchComplete,
  setEmailPreferenceWeeklyReport,
} from '../../api/userAdmin.api';

const gridBg = require('../../assets/images/grid-bg.png');
const icMenu = require('../../assets/images/ic-menu.png');
const icProfile = require('../../assets/images/ic-profile.png');
const icChevron = require('../../assets/images/ic-chevron.png');
const icEdit = require('../../assets/images/ic-edit.png');
const icKey = require('../../assets/images/ic-key.png');
const icBell = require('../../assets/images/ic-bell.png');
const icMail = require('../../assets/images/ic-mail.png');
const icShield = require('../../assets/images/ic-shield.png');
const icLogout = require('../../assets/images/ic-logout.png');

const Toggle = ({
  on,
  onToggle,
  disabled,
}: {
  on: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) => (
  <TouchableOpacity
    activeOpacity={0.8}
    disabled={disabled}
    onPress={onToggle}
    style={[styles.track, on ? styles.trackOn : styles.trackOff]}>
    <View style={styles.thumb} />
  </TouchableOpacity>
);

export const SettingsScreen = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();
  const {openDrawer} = useDrawer();
  const profile = useAppSelector(userProfileSelector);

  const name = profile?.name || profile?.email?.split('@')[0] || 'agent';
  const email = profile?.email || 'agent@titlemunke.com';
  const role = (profile?.groups?.[0] || 'agent').toUpperCase();
  const initial = name.charAt(0).toUpperCase();

  // Notification email preferences (fetched, optimistic toggles).
  const {data: prefData} = useFetch(fetchEmailPreference, []);
  const [searchComplete, setSearchComplete] = useState(false);
  const [weekly, setWeekly] = useState(false);
  const [savingSC, setSavingSC] = useState(false);
  const [savingW, setSavingW] = useState(false);

  useEffect(() => {
    const p = (prefData as any)?.data ?? prefData;
    if (p) {
      setSearchComplete(!!p.emailPreferenceSearchComplete);
      setWeekly(!!p.emailPreferenceWeeklyReport);
    }
  }, [prefData]);

  const toggleSearchComplete = useCallback(async () => {
    const nextVal = !searchComplete;
    setSearchComplete(nextVal); // optimistic
    setSavingSC(true);
    try {
      await setEmailPreferenceSearchComplete(nextVal);
    } catch {
      setSearchComplete(!nextVal); // rollback
    } finally {
      setSavingSC(false);
    }
  }, [searchComplete]);

  const toggleWeekly = useCallback(async () => {
    const nextVal = !weekly;
    setWeekly(nextVal);
    setSavingW(true);
    try {
      await setEmailPreferenceWeeklyReport(nextVal);
    } catch {
      setWeekly(!nextVal);
    } finally {
      setSavingW(false);
    }
  }, [weekly]);

  const [confirmLogout, setConfirmLogout] = useState(false);

  // AI Governance is admin-only (opens its own screen).
  const roleLower = (
    profile?.groups?.[0] ||
    profile?.role ||
    'broker'
  ).toLowerCase();
  const isAdmin = isAdminRole(roleLower);
  // Agents/brokers can manage their broker/organisation connection.
  const showAdvanced = roleLower === 'agent' || roleLower === 'broker';

  const doLogout = () => {
    setConfirmLogout(false);
    // Fire the logout flow (audit log + Cognito sign-out + state reset).
    dispatch(logoutThunk());
    // Navigate immediately; AuthGate also enforces this once state clears.
    const root = navigation.getParent?.() ?? navigation;
    root.reset({index: 0, routes: [{name: 'LoginScreen'}]});
  };

  const NavRow = ({
    icon,
    label,
    showDivider,
    onPress,
  }: {
    icon: number;
    label: string;
    showDivider: boolean;
    onPress?: () => void;
  }) => (
    <View>
      {showDivider ? <View style={styles.divider} /> : null}
      <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={onPress}>
        <View style={styles.rowIconWrap}>
          <Image source={icon} style={styles.rowIcon} />
        </View>
        <Text style={styles.rowLabel}>{label}</Text>
        <Image source={icChevron} style={styles.chevron} />
      </TouchableOpacity>
    </View>
  );

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
          <Text style={styles.headerTitle}>Settings</Text>
          <TouchableOpacity style={styles.iconBtnCircle} activeOpacity={0.8}>
            <Image source={icProfile} style={styles.headerIcon} />
          </TouchableOpacity>
        </View>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {email}
            </Text>
          </View>
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>{role}</Text>
          </View>
        </View>

        {/* Account */}
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.card}>
          <NavRow
            icon={icEdit}
            label="Edit profile"
            showDivider={false}
            onPress={() => navigation.navigate('EditProfile')}
          />
          {isAdmin ? (
            <NavRow
              icon={icShield}
              label="AI Governance"
              showDivider
              onPress={() => navigation.navigate('AiGovernance')}
            />
          ) : null}
          <NavRow
            icon={icKey}
            label="Change password"
            showDivider
            onPress={() => navigation.navigate('ChangePassword')}
          />
          {showAdvanced ? (
            <NavRow
              icon={icShield}
              label="Advanced Settings"
              showDivider
              onPress={() => navigation.navigate('AdvancedSettings')}
            />
          ) : null}
        </View>

        {/* Notifications */}
        <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowIconWrap}>
              <Image source={icBell} style={styles.rowIcon} />
            </View>
            <Text style={[styles.rowLabel, styles.rowLabelWrap]}>
              Email me when a search is completed
            </Text>
            <Toggle
              on={searchComplete}
              onToggle={toggleSearchComplete}
              disabled={savingSC}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.rowIconWrap}>
              <Image source={icMail} style={styles.rowIcon} />
            </View>
            <Text style={[styles.rowLabel, styles.rowLabelWrap]}>
              Send me a weekly usage summary
            </Text>
            <Toggle on={weekly} onToggle={toggleWeekly} disabled={savingW} />
          </View>
        </View>

        {/* Legal */}
        <Text style={styles.sectionLabel}>LEGAL</Text>
        <View style={styles.card}>
          <NavRow
            icon={icShield}
            label="Privacy Policy"
            showDivider
            onPress={() =>
              navigation.navigate('WebPage', {
                title: 'Privacy Policy',
                url: 'https://staging.d1n4t6s0drx6o.amplifyapp.com/privacy-policy',
              })
            }
          />
          <NavRow
            icon={icShield}
            label="Terms and Conditions"
            showDivider={false}
            onPress={() =>
              navigation.navigate('WebPage', {
                title: 'Terms and Conditions',
                url: 'https://staging.d1n4t6s0drx6o.amplifyapp.com/terms-and-conditions',
              })
            }
          />
        </View>

        {/* Log out */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.logoutCard}
          onPress={() => setConfirmLogout(true)}>
          <Image source={icLogout} style={styles.logoutIcon} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <ConfirmModal
        visible={confirmLogout}
        title="Log out?"
        message="You'll need to sign in again to access your account."
        confirmLabel="Log Out"
        danger
        onConfirm={doLogout}
        onCancel={() => setConfirmLogout(false)}
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

const LOGOUT_RED = 'rgba(193,82,82,0.75)';

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

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(18),
    padding: scaleWidth(16),
    ...shadow,
  },
  avatar: {
    width: scaleWidth(56),
    height: scaleWidth(56),
    borderRadius: scaleWidth(56),
    backgroundColor: appColors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(14),
  },
  avatarText: {
    ...typography(700, 24, 'white'),
    fontWeight: '700',
  },
  profileInfo: {flex: 1},
  profileName: {
    ...typography(700, 17, 'coffeeDark'),
    fontWeight: '700',
  },
  profileEmail: {
    ...typography('regular', 13, 'gray'),
    marginTop: scaleWidth(3),
  },
  rolePill: {
    backgroundColor: 'rgba(152,117,85,0.16)',
    borderRadius: scaleWidth(8),
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleWidth(5),
  },
  roleText: {
    ...typography(700, 10, 'coffeeLight'),
    fontWeight: '700',
    letterSpacing: 0.6,
  },

  sectionLabel: {
    ...typography(600, 11, 'gray'),
    fontWeight: '600',
    letterSpacing: 0.8,
    marginTop: scaleWidth(20),
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
    paddingVertical: scaleWidth(14),
  },
  rowIconWrap: {
    width: scaleWidth(36),
    height: scaleWidth(36),
    borderRadius: scaleWidth(10),
    backgroundColor: 'rgba(94,23,23,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(12),
  },
  rowIcon: {
    width: scaleWidth(18),
    height: scaleWidth(18),
    tintColor: appColors.maroon,
  },
  rowLabel: {
    flex: 1,
    ...typography(500, 15, 'coffeeDark'),
    fontWeight: '500',
  },
  rowLabelWrap: {
    marginRight: scaleWidth(12),
    lineHeight: scaleWidth(20),
  },
  chevron: {
    width: scaleWidth(14),
    height: scaleWidth(14),
    tintColor: appColors.gray,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(61,32,20,0.07)',
    marginLeft: scaleWidth(48),
  },

  track: {
    width: scaleWidth(46),
    height: scaleWidth(28),
    borderRadius: scaleWidth(14),
    padding: scaleWidth(3),
    justifyContent: 'center',
  },
  trackOn: {
    backgroundColor: appColors.maroon,
    alignItems: 'flex-end',
  },
  trackOff: {
    backgroundColor: 'rgba(0,0,0,0.18)',
    alignItems: 'flex-start',
  },
  thumb: {
    width: scaleWidth(22),
    height: scaleWidth(22),
    borderRadius: scaleWidth(22),
    backgroundColor: appColors.white,
  },

  logoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(16),
    paddingVertical: scaleWidth(16),
    marginTop: scaleWidth(20),
    ...shadow,
  },
  logoutIcon: {
    width: scaleWidth(18),
    height: scaleWidth(18),
    tintColor: LOGOUT_RED,
    marginRight: scaleWidth(8),
  },
  logoutText: {
    ...typography(600, 15, 'coffeeDark'),
    fontWeight: '600',
    color: LOGOUT_RED,
  },
});

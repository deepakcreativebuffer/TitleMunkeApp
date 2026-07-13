import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageBackground,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Modal,
  Easing,
} from 'react-native';
import {CommonActions} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {appColors, typography, scaleWidth, SCREEN_WIDTH} from '../global';
import {navigationRef} from '../navigators/navigationRef';
import {store} from '../store';
import {logoutThunk} from '../thunks';
import {isOrgRole, isAdminRole} from '../utils';

const headerBg = require('../assets/images/drawer-header.png');
const logoIcon = require('../assets/images/logo-icon.png');
const icHome = require('../assets/images/ic-home.png');
const icPeople = require('../assets/images/ic-people.png');
const icFile = require('../assets/images/ic-file.png');
const icList = require('../assets/images/ic-list.png');
const icSettings = require('../assets/images/ic-settings.png');
const icSearch = require('../assets/images/ic-search.png');
const icLogout = require('../assets/images/ic-logout.png');

const PANEL_W = Math.min(scaleWidth(300), SCREEN_WIDTH * 0.82);

type Item = {
  key: string;
  label: string;
  icon: number;
  route?: string; // tab inside TabNavigator
  rootRoute?: string; // top-level stack route
  badge?: boolean; // show the messaging unread count
};

// Messages + Nearby Search now live in the bottom tab bar, so they're not in
// the drawer. Requests + Settings moved out of the tab bar into the drawer
// (reached as top-level stack routes).
const ITEMS: Item[] = [
  {key: 'Dashboard', label: 'Dashboard', icon: icHome, route: 'Home'},
  {key: 'Agents', label: 'Agents', icon: icPeople, rootRoute: 'Agents'},
  {key: 'Requests', label: 'Requests', icon: icFile, rootRoute: 'Requests'},
  {key: 'Logs', label: 'Audit Logs', icon: icList, rootRoute: 'Logs'},
  {key: 'Settings', label: 'Settings', icon: icSettings, rootRoute: 'Settings'},
];

// Organisations have Search + Users instead of Agents.
const ORG_ITEMS: Item[] = [
  {key: 'Dashboard', label: 'Dashboard', icon: icHome, route: 'Home'},
  {key: 'Search', label: 'Search', icon: icSearch, rootRoute: 'Search'},
  {key: 'Requests', label: 'Requests', icon: icFile, rootRoute: 'Requests'},
  {key: 'Users', label: 'Users', icon: icPeople, rootRoute: 'OrgUsers'},
  {key: 'Logs', label: 'Audit Logs', icon: icList, rootRoute: 'Logs'},
  {key: 'Settings', label: 'Settings', icon: icSettings, rootRoute: 'Settings'},
];

// Admins have Search + Demo Requests + Users + Audit Logs.
const ADMIN_ITEMS: Item[] = [
  {key: 'Dashboard', label: 'Dashboard', icon: icHome, route: 'Home'},
  {key: 'Search', label: 'Search', icon: icSearch, rootRoute: 'Search'},
  {key: 'Requests', label: 'Demo Requests', icon: icFile, rootRoute: 'Requests'},
  {key: 'Users', label: 'Users', icon: icPeople, rootRoute: 'AdminUsers'},
  {key: 'Logs', label: 'Audit Logs', icon: icList, rootRoute: 'Logs'},
  {key: 'Settings', label: 'Settings', icon: icSettings, rootRoute: 'Settings'},
];

const routeToKey = (name?: string): string => {
  switch (name) {
    case 'Dashboard':
    case 'Home':
      return 'Dashboard';
    case 'Search':
      return 'Search';
    case 'Requests':
      return 'Requests';
    case 'Agents':
      return 'Agents';
    case 'OrgUsers':
    case 'AdminUsers':
      return 'Users';
    case 'Logs':
      return 'Logs';
    case 'Settings':
      return 'Settings';
    default:
      return 'Dashboard';
  }
};

export const AppDrawer = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const profile = store.getState().user.user;
  const name = profile?.name || profile?.email?.split('@')[0] || 'agent';
  const email = profile?.email || 'agent@titlemunke.com';
  const role = (profile?.groups?.[0] || profile?.role || 'broker').toLowerCase();
  // Each role gets its own menu; agents don't manage other agents.
  const items = isAdminRole(role)
    ? ADMIN_ITEMS
    : isOrgRole(role)
      ? ORG_ITEMS
      : role === 'agent'
        ? ITEMS.filter(i => i.key !== 'Agents')
        : ITEMS;
  const activeKey = routeToKey(
    navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : undefined,
  );
  // Messaging unread total for the menu badge (read on open).
  const unreadTotal = (store.getState().messaging?.conversations ?? []).reduce(
    (sum: number, c: {unreadCount?: number}) => sum + (c.unreadCount ?? 0),
    0,
  );

  useEffect(() => {
    if (open) {
      setVisible(true);
      Animated.timing(anim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (visible) {
      Animated.timing(anim, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }
  }, [open, visible, anim]);

  const go = (item: Item) => {
    onClose();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigationRef as any;
    if (item.rootRoute) {
      nav.navigate(item.rootRoute);
    } else if (item.route) {
      nav.navigate('TabNavigator', {screen: item.route});
    }
  };

  const doLogout = () => {
    setConfirmLogout(false);
    onClose();
    // Audit log + Cognito sign-out + state reset (best-effort side-effects).
    store.dispatch(logoutThunk());
    navigationRef.dispatch(
      CommonActions.reset({index: 0, routes: [{name: 'LoginScreen'}]}),
    );
  };

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-PANEL_W, 0],
  });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.backdrop, {opacity: anim}]} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[styles.panel, {width: PANEL_W, transform: [{translateX}]}]}>
          {/* Header */}
          <ImageBackground
            source={headerBg}
            resizeMode="cover"
            style={[styles.header, {paddingTop: insets.top + scaleWidth(18)}]}>
            <View style={styles.avatar}>
              <Image
                source={logoIcon}
                style={styles.avatarLogo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.email}>{email}</Text>
          </ImageBackground>

          {/* Menu */}
          <View style={styles.body}>
            <Text style={styles.menuLabel}>MENU</Text>
            {items.map(item => {
              const active = item.key === activeKey;
              return (
                <TouchableOpacity
                  key={item.key}
                  activeOpacity={0.8}
                  onPress={() => go(item)}
                  style={[styles.item, active && styles.itemActive]}>
                  <Image
                    source={item.icon}
                    style={[
                      styles.itemIcon,
                      {tintColor: active ? appColors.maroon : appColors.coffeeDark},
                    ]}
                  />
                  <Text
                    style={[styles.itemLabel, active && styles.itemLabelActive]}>
                    {item.label}
                  </Text>
                  {item.badge && unreadTotal > 0 ? (
                    <View style={styles.menuBadge}>
                      <Text style={styles.menuBadgeText}>{unreadTotal}</Text>
                    </View>
                  ) : null}
                  {active ? <View style={styles.dot} /> : null}
                </TouchableOpacity>
              );
            })}

            <View style={styles.divider} />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setConfirmLogout(true)}
              style={[styles.item, styles.logoutItem]}>
              <Image
                source={icLogout}
                style={[styles.itemIcon, {tintColor: appColors.maroon}]}
              />
              <Text style={[styles.itemLabel, styles.itemLabelActive]}>
                Log Out
              </Text>
            </TouchableOpacity>

            <Text style={styles.version}>v1.0 · Title Munke</Text>
          </View>
        </Animated.View>

        {/* Logout confirmation (inline overlay — avoids nested native modals) */}
        {confirmLogout ? (
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmCard}>
              <Text style={styles.confirmTitle}>Log out?</Text>
              <Text style={styles.confirmMsg}>
                You'll need to sign in again to access your account.
              </Text>
              <View style={styles.confirmActions}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.confirmBtn, styles.confirmCancel]}
                  onPress={() => setConfirmLogout(false)}>
                  <Text style={styles.confirmCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={[styles.confirmBtn, styles.confirmDanger]}
                  onPress={doLogout}>
                  <Text style={styles.confirmDangerText}>Log Out</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, flexDirection: 'row'},
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(20,10,8,0.45)',
  },
  panel: {
    height: '100%',
    backgroundColor: appColors.white,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: scaleWidth(20),
    paddingBottom: scaleWidth(20),
  },
  avatar: {
    width: scaleWidth(54),
    height: scaleWidth(54),
    borderRadius: scaleWidth(54),
    backgroundColor: appColors.white,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleWidth(12),
  },
  avatarLogo: {
    width: scaleWidth(32),
    height: scaleWidth(38),
  },
  name: {
    ...typography(700, 18, 'white'),
    fontWeight: '700',
  },
  email: {
    ...typography('regular', 12, 'white'),
    opacity: 0.75,
    marginTop: scaleWidth(2),
  },
  body: {
    flex: 1,
    paddingHorizontal: scaleWidth(14),
    paddingTop: scaleWidth(16),
  },
  menuLabel: {
    ...typography(600, 11, 'gray'),
    fontWeight: '600',
    letterSpacing: 0.8,
    marginLeft: scaleWidth(8),
    marginBottom: scaleWidth(8),
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    height: scaleWidth(48),
    borderRadius: scaleWidth(12),
    paddingHorizontal: scaleWidth(12),
  },
  itemActive: {
    backgroundColor: 'rgba(94,23,23,0.10)',
  },
  itemIcon: {
    width: scaleWidth(20),
    height: scaleWidth(20),
    marginRight: scaleWidth(14),
  },
  itemLabel: {
    flex: 1,
    ...typography(500, 15, 'coffeeDark'),
    fontWeight: '500',
  },
  itemLabelActive: {
    ...typography(600, 15, 'maroon'),
    fontWeight: '600',
  },
  dot: {
    width: scaleWidth(7),
    height: scaleWidth(7),
    borderRadius: scaleWidth(7),
    backgroundColor: appColors.maroon,
  },
  menuBadge: {
    backgroundColor: appColors.maroon,
    borderRadius: scaleWidth(10),
    minWidth: scaleWidth(20),
    height: scaleWidth(20),
    paddingHorizontal: scaleWidth(6),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: scaleWidth(8),
  },
  menuBadgeText: {...typography(700, 11, 'white'), fontWeight: '700'},
  divider: {
    height: 1,
    backgroundColor: 'rgba(61,32,20,0.08)',
    marginVertical: scaleWidth(12),
    marginHorizontal: scaleWidth(4),
  },
  logoutItem: {
    backgroundColor: 'rgba(94,23,23,0.08)',
  },
  version: {
    ...typography('regular', 11, 'gray'),
    marginTop: scaleWidth(16),
    marginLeft: scaleWidth(8),
  },
  confirmOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(20,10,8,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleWidth(32),
  },
  confirmCard: {
    width: '100%',
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(20),
    padding: scaleWidth(22),
  },
  confirmTitle: {
    ...typography(700, 18, 'coffeeDark'),
    fontWeight: '700',
  },
  confirmMsg: {
    ...typography('regular', 14, 'gray'),
    marginTop: scaleWidth(8),
    lineHeight: scaleWidth(20),
  },
  confirmActions: {
    flexDirection: 'row',
    marginTop: scaleWidth(22),
  },
  confirmBtn: {
    flex: 1,
    height: scaleWidth(48),
    borderRadius: scaleWidth(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancel: {
    backgroundColor: 'rgba(61,32,20,0.06)',
    marginRight: scaleWidth(6),
  },
  confirmCancelText: {
    ...typography(600, 15, 'coffeeDark'),
    fontWeight: '600',
  },
  confirmDanger: {
    backgroundColor: appColors.error,
    marginLeft: scaleWidth(6),
  },
  confirmDangerText: {
    ...typography(600, 15, 'white'),
    fontWeight: '600',
  },
});

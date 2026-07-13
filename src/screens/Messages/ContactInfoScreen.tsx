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
import {AppScreenProps} from '../../types';
import {useAppSelector} from '../../store';
import {conversationByIdSelector, myUserIdSelector} from '../../slices';
import {Avatar} from '../../components/Avatar';
import {otherParticipant, userImageUrl} from '../../utils/chat';

const gridBg = require('../../assets/images/grid-bg.png');
const icChevron = require('../../assets/images/ic-chevron.png');
const icMail = require('../../assets/images/ic-mail.png');
const icProfile = require('../../assets/images/ic-profile.png');

const titleCase = (s?: string | null) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';

export const ContactInfoScreen = ({
  navigation,
  route,
}: AppScreenProps<'ContactInfo'>) => {
  const insets = useSafeAreaInsets();
  const {conversationId, title} = route.params;
  const myUserId = useAppSelector(myUserIdSelector);
  const conv = useAppSelector(conversationByIdSelector(conversationId));
  const other = otherParticipant(conv, myUserId)?.user;

  const name = other?.name ?? title ?? 'Contact';
  const rows = [
    {key: 'email', icon: icMail, label: 'Email', value: other?.email},
    {key: 'phone', icon: icProfile, label: 'Phone', value: other?.phone_number},
    {
      key: 'role',
      icon: icProfile,
      label: 'Role',
      value: titleCase(other?.role),
    },
  ].filter(r => !!r.value);

  return (
    <ImageBackground source={gridBg} resizeMode="cover" style={styles.bg}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={appColors.background}
        translucent={false}
      />
      <View style={{paddingTop: insets.top + scaleWidth(10), flex: 1}}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}>
            <Image source={icChevron} style={styles.backIcon} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contact Info</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: scaleWidth(20),
            paddingBottom: insets.bottom + scaleWidth(40),
          }}>
          <View style={styles.head}>
            <Avatar
              name={name}
              id={`u${other?.id ?? conversationId}`}
              imageUrl={userImageUrl(other)}
              cacheKey={other?.profile_image_key ?? undefined}
              size={scaleWidth(84)}
            />
            <Text style={styles.name}>{name}</Text>
            {other?.role ? (
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{titleCase(other.role)}</Text>
              </View>
            ) : null}
          </View>

          {rows.length ? (
            <View style={styles.card}>
              {rows.map((r, i) => (
                <View
                  key={r.key}
                  style={[styles.row, i > 0 && styles.rowDivider]}>
                  <View style={styles.rowIcon}>
                    <Image source={r.icon} style={styles.rowIconImg} />
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.rowLabel}>{r.label}</Text>
                    <Text style={styles.rowValue}>{r.value}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>
      </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scaleWidth(20),
    marginBottom: scaleWidth(14),
  },
  iconBtn: {
    width: scaleWidth(44),
    height: scaleWidth(44),
    borderRadius: scaleWidth(12),
    backgroundColor: appColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  backIcon: {
    width: scaleWidth(18),
    height: scaleWidth(18),
    tintColor: appColors.coffeeDark,
    transform: [{scaleX: -1}],
  },
  headerTitle: {...typography(700, 18, 'coffeeDark'), fontWeight: '700'},
  headerSpacer: {width: scaleWidth(44), height: scaleWidth(44)},
  head: {alignItems: 'center', marginBottom: scaleWidth(24)},
  name: {
    ...typography(700, 20, 'coffeeDark'),
    fontWeight: '700',
    marginTop: scaleWidth(12),
  },
  roleBadge: {
    marginTop: scaleWidth(8),
    backgroundColor: 'rgba(94,23,23,0.1)',
    borderRadius: scaleWidth(12),
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleWidth(4),
  },
  roleBadgeText: {...typography(600, 12, 'maroon'), fontWeight: '600'},
  card: {
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(16),
    paddingHorizontal: scaleWidth(14),
    ...shadow,
    shadowOpacity: 0.05,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleWidth(14),
  },
  rowDivider: {borderTopWidth: 1, borderTopColor: '#F1EDEA'},
  rowIcon: {
    width: scaleWidth(40),
    height: scaleWidth(40),
    borderRadius: scaleWidth(12),
    backgroundColor: appColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(12),
  },
  rowIconImg: {
    width: scaleWidth(18),
    height: scaleWidth(18),
    tintColor: appColors.maroon,
  },
  rowLabel: {...typography('regular', 12, 'gray')},
  rowValue: {
    ...typography(600, 14, 'coffeeDark'),
    fontWeight: '600',
    marginTop: scaleWidth(2),
  },
});

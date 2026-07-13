import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageBackground,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {appColors, typography, scaleWidth} from '../../global';
import {AppScreenProps, ChatContact} from '../../types';
import {useAppSelector} from '../../store';
import {userProfileSelector, userRoleSelector} from '../../slices';
import {Avatar} from '../../components/Avatar';
import {fetchChatContacts, canCreateGroups} from '../../api/contacts.api';

const gridBg = require('../../assets/images/grid-bg.png');
const icChevron = require('../../assets/images/ic-chevron.png');
const icSearch = require('../../assets/images/ic-search.png');
const icPeople = require('../../assets/images/ic-people.png');

export const NewChatScreen = ({navigation}: AppScreenProps<'NewChat'>) => {
  const insets = useSafeAreaInsets();
  const role = useAppSelector(userRoleSelector);
  const profile = useAppSelector(userProfileSelector);
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchChatContacts(role, profile)
      .then(list => alive && setContacts(list))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [role, profile]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) {
      return contacts;
    }
    return contacts.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q),
    );
  }, [contacts, q]);

  const start = (c: ChatContact) =>
    // Replace so back from the chat returns to the conversation list. The
    // conversation is created server-side on the first message.
    navigation.replace('Chat', {toUserId: c.id, title: c.name});

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
          <Text style={styles.headerTitle}>New Chat</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.searchBox}>
          <Image source={icSearch} style={styles.searchIcon} />
          <TextInput
            style={styles.searchText}
            value={query}
            onChangeText={setQuery}
            placeholder="Search people…"
            placeholderTextColor={appColors.gray}
            autoCapitalize="none"
          />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: scaleWidth(20),
            paddingBottom: insets.bottom + scaleWidth(40),
            flexGrow: 1,
          }}>
          {/* New group action (roles allowed to create groups) */}
          {canCreateGroups(role) && !query ? (
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.actionRow}
              onPress={() => navigation.replace('NewGroup')}>
              <View style={styles.actionIcon}>
                <Image source={icPeople} style={styles.actionIconImg} />
              </View>
              <View style={styles.actionMid}>
                <Text style={styles.actionLabel}>New group</Text>
                <Text style={styles.actionSub}>
                  Start a group conversation
                </Text>
              </View>
              <Image source={icChevron} style={styles.actionChevron} />
            </TouchableOpacity>
          ) : null}

          {!query ? (
            <Text style={styles.sectionLabel}>CONTACTS</Text>
          ) : null}

          {loading ? (
            <ActivityIndicator
              color={appColors.maroon}
              style={{marginTop: scaleWidth(40)}}
            />
          ) : filtered.length === 0 ? (
            <Text style={styles.noResults}>
              {contacts.length === 0
                ? 'No contacts available to message.'
                : `No people match “${query}”.`}
            </Text>
          ) : (
            filtered.map(c => (
              <TouchableOpacity
                key={c.id}
                activeOpacity={0.85}
                style={styles.card}
                onPress={() => start(c)}>
                <Avatar name={c.name} id={`u${c.id}`} />
                <View style={styles.mid}>
                  <Text style={styles.name} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={styles.sub} numberOfLines={1}>
                    {c.role ? `${c.role} · ` : ''}
                    {c.email ?? ''}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: scaleWidth(48),
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(12),
    paddingHorizontal: scaleWidth(14),
    marginHorizontal: scaleWidth(20),
    marginBottom: scaleWidth(14),
    ...shadow,
    shadowOpacity: 0.05,
  },
  searchIcon: {
    width: scaleWidth(18),
    height: scaleWidth(18),
    tintColor: appColors.gray,
    marginRight: scaleWidth(10),
  },
  searchText: {flex: 1, ...typography('regular', 14, 'coffeeDark'), padding: 0},
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(16),
    padding: scaleWidth(12),
    marginBottom: scaleWidth(10),
    ...shadow,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(16),
    padding: scaleWidth(12),
    marginBottom: scaleWidth(12),
    ...shadow,
  },
  actionIcon: {
    width: scaleWidth(46),
    height: scaleWidth(46),
    borderRadius: scaleWidth(23),
    backgroundColor: appColors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconImg: {
    width: scaleWidth(22),
    height: scaleWidth(22),
    tintColor: appColors.white,
  },
  actionMid: {flex: 1, marginLeft: scaleWidth(12)},
  actionLabel: {...typography(700, 15, 'coffeeDark'), fontWeight: '700'},
  actionSub: {
    ...typography('regular', 12, 'gray'),
    marginTop: scaleWidth(2),
  },
  actionChevron: {
    width: scaleWidth(16),
    height: scaleWidth(16),
    tintColor: appColors.gray,
  },
  sectionLabel: {
    ...typography(600, 11, 'gray'),
    letterSpacing: 1,
    fontWeight: '600',
    marginBottom: scaleWidth(10),
  },
  mid: {flex: 1, marginLeft: scaleWidth(12)},
  name: {...typography(700, 15, 'coffeeDark'), fontWeight: '700'},
  sub: {...typography('regular', 12, 'gray'), marginTop: scaleWidth(2)},
  noResults: {
    ...typography(500, 13, 'gray'),
    fontWeight: '500',
    textAlign: 'center',
    marginTop: scaleWidth(40),
  },
});

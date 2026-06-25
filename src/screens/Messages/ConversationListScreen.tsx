import React, {useMemo, useState} from 'react';
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
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {appColors, typography, scaleWidth} from '../../global';
import {AppScreenProps} from '../../types';
import {useAppSelector} from '../../store';
import {
  conversationsSortedSelector,
  messagingUsersSelector,
  totalUnreadSelector,
} from '../../slices';
import {Avatar} from '../../components/Avatar';
import {timeAgo} from '../../utils/time';

const gridBg = require('../../assets/images/grid-bg.png');
const icChevron = require('../../assets/images/ic-chevron.png');
const icSearch = require('../../assets/images/ic-search.png');
const icMessage = require('../../assets/images/ic-message.png');

export const ConversationListScreen = ({
  navigation,
}: AppScreenProps<'Messages'>) => {
  const insets = useSafeAreaInsets();
  const conversations = useAppSelector(conversationsSortedSelector);
  const users = useAppSelector(messagingUsersSelector);
  const totalUnread = useAppSelector(totalUnreadSelector);
  const [query, setQuery] = useState('');

  const userById = useMemo(
    () => Object.fromEntries(users.map(u => [u.id, u])),
    [users],
  );
  const q = query.trim().toLowerCase();

  const rows = useMemo(() => {
    const list = conversations
      .map(c => ({conv: c, user: userById[c.participantId]}))
      .filter(r => r.user);
    if (!q) {
      return list;
    }
    return list.filter(r => {
      const u = r.user!;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q)
      );
    });
  }, [conversations, userById, q]);

  // When searching, surface matching people who aren't in a conversation yet.
  const people = useMemo(() => {
    if (!q) {
      return [];
    }
    const existing = new Set(conversations.map(c => c.participantId));
    return users.filter(
      u =>
        !existing.has(u.id) &&
        (u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q)),
    );
  }, [q, users, conversations]);

  const openChat = (participantId: string) =>
    navigation.navigate('Chat', {participantId});

  const empty = conversations.length === 0;

  return (
    <ImageBackground source={gridBg} resizeMode="cover" style={styles.bg}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={appColors.background}
        translucent={false}
      />
      <View style={{paddingTop: insets.top + scaleWidth(10), flex: 1}}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}>
            <Image source={icChevron} style={styles.backIcon} />
          </TouchableOpacity>
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle}>Messages</Text>
            {totalUnread > 0 ? (
              <View style={styles.titleBadge}>
                <Text style={styles.titleBadgeText}>{totalUnread}</Text>
              </View>
            ) : null}
          </View>
          {/* Transparent spacer to keep the title centered opposite the back button */}
          <View style={styles.headerSpacer} />
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Image source={icSearch} style={styles.searchIcon} />
          <TextInput
            style={styles.searchText}
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name, email or username…"
            placeholderTextColor={appColors.gray}
            autoCapitalize="none"
          />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: scaleWidth(20),
            paddingBottom: insets.bottom + scaleWidth(100),
          }}
          keyboardShouldPersistTaps="handled">
          {empty ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Image source={icMessage} style={styles.emptyIconImg} />
              </View>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.emptyBtn}
                onPress={() => navigation.navigate('NewChat')}>
                <Text style={styles.emptyBtnText}>Start New Chat</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {rows.map(({conv, user}) => (
                <TouchableOpacity
                  key={conv.conversationId}
                  activeOpacity={0.85}
                  style={styles.card}
                  onPress={() => openChat(conv.participantId)}>
                  <Avatar
                    name={user!.name}
                    id={user!.id}
                    online={user!.status === 'online'}
                  />
                  <View style={styles.cardMid}>
                    <View style={styles.cardTop}>
                      <Text style={styles.name} numberOfLines={1}>
                        {user!.name}
                      </Text>
                      <Text style={styles.time}>{timeAgo(conv.updatedAt)}</Text>
                    </View>
                    <View style={styles.cardBottom}>
                      <Text
                        style={[
                          styles.preview,
                          conv.unreadCount > 0 && styles.previewUnread,
                        ]}
                        numberOfLines={1}>
                        {conv.lastMessage || 'Start the conversation…'}
                      </Text>
                      {conv.unreadCount > 0 ? (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadText}>
                            {conv.unreadCount}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}

              {people.length > 0 ? (
                <>
                  <Text style={styles.sectionLabel}>PEOPLE</Text>
                  {people.map(u => (
                    <TouchableOpacity
                      key={u.id}
                      activeOpacity={0.85}
                      style={styles.card}
                      onPress={() => openChat(u.id)}>
                      <Avatar
                        name={u.name}
                        id={u.id}
                        online={u.status === 'online'}
                      />
                      <View style={styles.cardMid}>
                        <Text style={styles.name} numberOfLines={1}>
                          {u.name}
                        </Text>
                        <Text style={styles.preview} numberOfLines={1}>
                          {u.email}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              ) : null}

              {rows.length === 0 && people.length === 0 ? (
                <Text style={styles.noResults}>No matches for “{query}”.</Text>
              ) : null}
            </>
          )}
        </ScrollView>
      </View>

      {/* FAB */}
      {!empty ? (
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.fab, {bottom: insets.bottom + scaleWidth(24)}]}
          onPress={() => navigation.navigate('NewChat')}>
          <Text style={styles.fabPlus}>+</Text>
          <Text style={styles.fabText}>New Chat</Text>
        </TouchableOpacity>
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
  headerSpacer: {width: scaleWidth(44), height: scaleWidth(44)},
  titleRow: {flexDirection: 'row', alignItems: 'center'},
  headerTitle: {...typography(700, 18, 'coffeeDark'), fontWeight: '700'},
  titleBadge: {
    backgroundColor: appColors.maroon,
    borderRadius: scaleWidth(10),
    minWidth: scaleWidth(20),
    height: scaleWidth(20),
    paddingHorizontal: scaleWidth(6),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: scaleWidth(8),
  },
  titleBadgeText: {...typography(700, 11, 'white'), fontWeight: '700'},
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
  cardMid: {flex: 1, marginLeft: scaleWidth(12)},
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {flex: 1, ...typography(700, 15, 'coffeeDark'), fontWeight: '700'},
  time: {...typography('regular', 11, 'gray'), marginLeft: scaleWidth(8)},
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: scaleWidth(4),
  },
  preview: {flex: 1, ...typography('regular', 13, 'gray')},
  previewUnread: {...typography(600, 13, 'coffeeDark'), fontWeight: '600'},
  unreadBadge: {
    backgroundColor: appColors.maroon,
    borderRadius: scaleWidth(11),
    minWidth: scaleWidth(22),
    height: scaleWidth(22),
    paddingHorizontal: scaleWidth(6),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: scaleWidth(8),
  },
  unreadText: {...typography(700, 11, 'white'), fontWeight: '700'},
  sectionLabel: {
    ...typography(600, 11, 'gray'),
    letterSpacing: 1,
    fontWeight: '600',
    marginTop: scaleWidth(10),
    marginBottom: scaleWidth(8),
  },
  noResults: {
    ...typography(500, 13, 'gray'),
    fontWeight: '500',
    textAlign: 'center',
    marginTop: scaleWidth(40),
  },
  emptyWrap: {alignItems: 'center', marginTop: scaleWidth(80)},
  emptyIcon: {
    width: scaleWidth(80),
    height: scaleWidth(80),
    borderRadius: scaleWidth(40),
    backgroundColor: 'rgba(94,23,23,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleWidth(16),
  },
  emptyIconImg: {
    width: scaleWidth(36),
    height: scaleWidth(36),
    tintColor: appColors.maroon,
  },
  emptyTitle: {
    ...typography(600, 16, 'coffeeDark'),
    fontWeight: '600',
    marginBottom: scaleWidth(18),
  },
  emptyBtn: {
    height: scaleWidth(48),
    paddingHorizontal: scaleWidth(28),
    borderRadius: scaleWidth(12),
    backgroundColor: appColors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBtnText: {...typography(600, 15, 'white'), fontWeight: '600'},
  fab: {
    position: 'absolute',
    right: scaleWidth(20),
    flexDirection: 'row',
    alignItems: 'center',
    height: scaleWidth(52),
    paddingHorizontal: scaleWidth(20),
    borderRadius: scaleWidth(26),
    backgroundColor: appColors.maroon,
    shadowColor: '#3d2014',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  fabPlus: {
    ...typography(700, 22, 'white'),
    fontWeight: '700',
    marginRight: scaleWidth(8),
    marginTop: -scaleWidth(2),
  },
  fabText: {...typography(600, 15, 'white'), fontWeight: '600'},
});

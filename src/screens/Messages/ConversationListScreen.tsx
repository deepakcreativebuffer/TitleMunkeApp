import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { appColors, typography, scaleWidth } from '../../global';
import { AppScreenProps } from '../../types';
import { useDrawer } from '../../context/DrawerContext';
import { useAppSelector } from '../../store';
import {
  conversationsSortedSelector,
  totalUnreadSelector,
  myUserIdSelector,
  messagingConnectedSelector,
  loadingConversationsSelector,
  messagingErrorSelector,
  messagingPresenceSelector,
  messagingTypingSelector,
  messagingMessagesSelector,
} from '../../slices';
import { Avatar } from '../../components/Avatar';
import { conversationTimeLabel } from '../../utils/time';
import {
  conversationTitle,
  conversationAvatar,
  conversationPreview,
  messagePreview,
  otherParticipant,
} from '../../utils/chat';
import {
  wsGetConversations,
  wsGetMessageHistory,
} from '../../services/messaging.ws';

const gridBg = require('../../assets/images/grid-bg.png');
const icMenu = require('../../assets/images/ic-menu.png');
const icSearch = require('../../assets/images/ic-search.png');
const icMessage = require('../../assets/images/ic-message.png');
const icPeople = require('../../assets/images/ic-people.png');

export const ConversationListScreen = ({
  navigation,
}: AppScreenProps<'Messages'>) => {
  const insets = useSafeAreaInsets();
  const conversations = useAppSelector(conversationsSortedSelector);
  const totalUnread = useAppSelector(totalUnreadSelector);
  const myUserId = useAppSelector(myUserIdSelector);
  const connected = useAppSelector(messagingConnectedSelector);
  const loading = useAppSelector(loadingConversationsSelector);
  const error = useAppSelector(messagingErrorSelector);
  const presence = useAppSelector(messagingPresenceSelector);
  const typing = useAppSelector(messagingTypingSelector);
  const messagesMap = useAppSelector(messagingMessagesSelector);
  const { openDrawer } = useDrawer();
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'groups'>('all');
  // Ticker to expire stale typing entries (a "stop" event can be dropped).
  const [typingTick, setTypingTick] = useState(0);
  useEffect(() => {
    if (Object.keys(typing).length === 0) {
      return;
    }
    const id = setInterval(() => setTypingTick(t => t + 1), 2000);
    return () => clearInterval(id);
  }, [typing]);

  const unreadConvos = conversations.filter(
    c => (c.unreadCount ?? 0) > 0,
  ).length;
  const groupConvos = conversations.filter(c => c.type === 'GROUP').length;
  const FILTERS: Array<{
    key: 'all' | 'unread' | 'groups';
    label: string;
    count?: number;
  }> = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread', count: unreadConvos },
    { key: 'groups', label: 'Groups', count: groupConvos },
  ];

  // Refresh the list whenever the screen gains focus (and on mount).
  useFocusEffect(
    useCallback(() => {
      void wsGetConversations();
    }, []),
  );

  useEffect(() => {
    if (!loading) {
      setRefreshing(false);
    }
  }, [loading]);

  const onRefresh = () => {
    setRefreshing(true);
    void wsGetConversations();
  };

  // On cold start, getConversations' embedded last message can omit the
  // `attachments` array, so an attachment-only last message (e.g. a voice note)
  // renders an empty preview ("Start the conversation…") until the chat is
  // opened. Proactively load history for exactly those conversations — where a
  // last message exists but its preview computes empty — so the correct preview
  // (🎤 Voice message, 📷 Photo, …) shows without the user opening the chat.
  // Deduped per conversation so we don't re-request on every render.
  const previewFetched = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!connected) {
      return;
    }
    for (const c of conversations) {
      const embedded = c.messages?.[0];
      // Skip: no last message at all (truly empty conversation), history
      // already loaded, or the embedded message already yields a preview.
      if (
        !embedded ||
        messagesMap[c.id]?.length ||
        previewFetched.current.has(c.id) ||
        messagePreview(embedded)
      ) {
        continue;
      }
      previewFetched.current.add(c.id);
      void wsGetMessageHistory({ conversationId: c.id });
    }
  }, [conversations, connected, messagesMap]);

  const q = query.trim().toLowerCase();
  const rows = useMemo(() => {
    let source = conversations;
    if (filter === 'unread') {
      source = source.filter(c => (c.unreadCount ?? 0) > 0);
    } else if (filter === 'groups') {
      source = source.filter(c => c.type === 'GROUP');
    }
    const now = Date.now();
    const list = source.map(c => {
      const other =
        c.type === 'ONE_TO_ONE'
          ? otherParticipant(c, myUserId)?.user_id
          : undefined;
      // Live typing: names of others typing in this conversation (fresh only).
      const typers = Object.entries(typing[c.id] ?? {})
        .filter(([uid, v]) => Number(uid) !== myUserId && now - v.ts < 6000)
        .map(([, v]) => v.name);
      let typingLabel: string | undefined;
      if (typers.length) {
        typingLabel =
          c.type === 'GROUP'
            ? typers.length === 1
              ? `${typers[0].split(' ')[0]} is typing…`
              : `${typers.length} people are typing…`
            : 'typing…';
      }
      // Prefer the fully-loaded last message (has attachments) over the
      // conversation's embedded one, so audio/image/doc previews resolve even
      // when getConversations didn't include attachments.
      const embedded = c.messages?.[0];
      const loaded = messagesMap[c.id];
      const lastLoaded = loaded?.length ? loaded[loaded.length - 1] : undefined;
      const bestLast =
        lastLoaded &&
        (!embedded ||
          new Date(lastLoaded.created_at).getTime() >=
            new Date(embedded.created_at).getTime())
          ? lastLoaded
          : embedded;
      return {
        conv: c,
        title: conversationTitle(c, myUserId),
        avatar: conversationAvatar(c, myUserId),
        preview: conversationPreview(c, myUserId, bestLast),
        typingLabel,
        online: other != null ? !!presence[other]?.online : false,
      };
    });
    if (!q) {
      return list;
    }
    return list.filter(r => r.title.toLowerCase().includes(q));
    // typingTick forces re-eval so stale typers expire even without new events.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    conversations,
    myUserId,
    q,
    filter,
    presence,
    typing,
    typingTick,
    messagesMap,
  ]);
  const openChat = (row: (typeof rows)[number]) =>
    navigation.navigate('Chat', {
      conversationId: row.conv.id,
      title: row.title,
      isGroup: row.conv.type === 'GROUP',
      groupId: row.conv.group?.id,
    });

  const empty = conversations.length === 0;
  return (
    <ImageBackground source={gridBg} resizeMode="cover" style={styles.bg}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={appColors.background}
        translucent={false}
      />
      <View style={{ paddingTop: insets.top + scaleWidth(10), flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.8}
            onPress={openDrawer}
          >
            <Image source={icMenu} style={styles.menuIcon} />
          </TouchableOpacity>
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle}>Chat</Text>
            {totalUnread > 0 ? (
              <View style={styles.titleBadge}>
                <Text style={styles.titleBadgeText}>{totalUnread}</Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.plusBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('NewChat')}
          >
            <View style={styles.plusBarH} />
            <View style={styles.plusBarV} />
          </TouchableOpacity>
        </View>

        {!connected ? (
          <View style={styles.connBar}>
            <ActivityIndicator size="small" color={appColors.maroon} />
            <Text style={styles.connText}>Connecting…</Text>
          </View>
        ) : null}

        {/* Search */}
        <View style={styles.searchBox}>
          <Image source={icSearch} style={styles.searchIcon} />
          <TextInput
            style={styles.searchText}
            value={query}
            onChangeText={setQuery}
            placeholder="Search conversations…"
            placeholderTextColor={appColors.gray}
            autoCapitalize="none"
          />
        </View>

        {/* Filter tabs: All / Unread / Groups */}
        <View style={styles.filterRow}>
          {FILTERS.map(f => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                activeOpacity={0.85}
                onPress={() => setFilter(f.key)}
                style={[styles.pill, active && styles.pillActive]}
              >
                <Text
                  style={[styles.pillText, active && styles.pillTextActive]}
                >
                  {f.label}
                  {f.count ? ` ${f.count}` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={appColors.maroon}
            />
          }
          contentContainerStyle={{
            paddingHorizontal: scaleWidth(20),
            paddingBottom: insets.bottom + scaleWidth(100),
            flexGrow: 1,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {empty ? (
            loading ? (
              <ActivityIndicator
                color={appColors.maroon}
                style={{ marginTop: scaleWidth(60) }}
              />
            ) : (
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIcon}>
                  <Image source={icMessage} style={styles.emptyIconImg} />
                </View>
                <Text style={styles.emptyTitle}>
                  {error ? 'Couldn’t load messages' : 'No conversations yet'}
                </Text>
                {error ? <Text style={styles.emptyError}>{error}</Text> : null}
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.emptyBtn}
                  onPress={() =>
                    error ? onRefresh() : navigation.navigate('NewChat')
                  }
                >
                  <Text style={styles.emptyBtnText}>
                    {error ? 'Retry' : 'Start New Chat'}
                  </Text>
                </TouchableOpacity>
              </View>
            )
          ) : (
            <>
              {rows.map((row, i) => (
                <TouchableOpacity
                  key={row.conv.id}
                  activeOpacity={0.6}
                  style={styles.row}
                  onPress={() => openChat(row)}
                >
                  <Avatar
                    name={row.avatar.name}
                    id={row.avatar.id}
                    imageUrl={row.avatar.imageUrl}
                    cacheKey={row.avatar.imageKey}
                    group={row.conv.type === 'GROUP'}
                    online={row.online}
                  />
                  <View
                    style={[
                      styles.cardMid,
                      i < rows.length - 1 && styles.cardDivider,
                    ]}
                  >
                    <View style={styles.cardTop}>
                      <View style={styles.nameWrap}>
                        {row.conv.type === 'GROUP' ? (
                          <View style={styles.groupChip}>
                            <Image
                              source={icPeople}
                              style={styles.groupChipIcon}
                            />
                            <Text style={styles.groupChipText}>Group</Text>
                          </View>
                        ) : null}
                        <Text
                          style={[
                            styles.name,
                            row.conv.type === 'GROUP' && styles.nameGroup,
                          ]}
                          numberOfLines={1}
                        >
                          {row.title}
                        </Text>
                      </View>
                      <Text style={styles.time}>
                        {(() => {
                          const t =
                            row.conv.lastMessageAt ??
                            row.conv.messages?.[0]?.created_at ??
                            row.conv.updated_at;
                          return t
                            ? conversationTimeLabel(new Date(t).getTime())
                            : '';
                        })()}
                      </Text>
                    </View>
                    <View style={styles.cardBottom}>
                      {row.typingLabel ? (
                        <Text style={styles.typing} numberOfLines={1}>
                          {row.typingLabel}
                        </Text>
                      ) : (
                        <Text
                          style={[
                            styles.preview,
                            (row.conv.unreadCount ?? 0) > 0 &&
                              styles.previewUnread,
                          ]}
                          numberOfLines={1}
                        >
                          {row.preview || 'Start the conversation…'}
                        </Text>
                      )}
                      {(row.conv.unreadCount ?? 0) > 0 ? (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadText}>
                            {row.conv.unreadCount}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
              {rows.length === 0 ? (
                <Text style={styles.noResults}>
                  {q
                    ? `No conversations match “${query}”.`
                    : filter === 'unread'
                    ? 'You’re all caught up — no unread messages.'
                    : filter === 'groups'
                    ? 'No group conversations yet.'
                    : 'No conversations to show.'}
                </Text>
              ) : null}
            </>
          )}
        </ScrollView>
      </View>
    </ImageBackground>
  );
};

const shadow = {
  shadowColor: '#3d2014',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.08,
  shadowRadius: 16,
  elevation: 3,
};

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: appColors.background },
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
  menuIcon: {
    width: scaleWidth(20),
    height: scaleWidth(20),
    tintColor: appColors.coffeeDark,
  },
  plusBtn: {
    width: scaleWidth(46),
    height: scaleWidth(46),
    borderRadius: scaleWidth(23),
    backgroundColor: appColors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: appColors.maroon,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  plusBarH: {
    position: 'absolute',
    width: scaleWidth(18),
    height: scaleWidth(2.6),
    borderRadius: scaleWidth(2),
    backgroundColor: appColors.white,
  },
  plusBarV: {
    position: 'absolute',
    width: scaleWidth(2.6),
    height: scaleWidth(18),
    borderRadius: scaleWidth(2),
    backgroundColor: appColors.white,
  },
  filterRow: {
    flexDirection: 'row',
    gap: scaleWidth(8),
    paddingHorizontal: scaleWidth(20),
    marginBottom: scaleWidth(12),
  },
  pill: {
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleWidth(7),
    borderRadius: scaleWidth(18),
    backgroundColor: appColors.white,
    ...shadow,
    shadowOpacity: 0.05,
  },
  pillActive: { backgroundColor: appColors.maroon },
  pillText: { ...typography(600, 13, 'coffeeDark'), fontWeight: '600' },
  pillTextActive: { color: appColors.white },
  headerSpacer: { width: scaleWidth(44), height: scaleWidth(44) },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { ...typography(700, 18, 'coffeeDark'), fontWeight: '700' },
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
  titleBadgeText: { ...typography(700, 11, 'white'), fontWeight: '700' },
  connBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scaleWidth(8),
    paddingBottom: scaleWidth(10),
  },
  connText: { ...typography('regular', 12, 'gray') },
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
  searchText: {
    flex: 1,
    ...typography('regular', 14, 'coffeeDark'),
    padding: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardMid: {
    flex: 1,
    marginLeft: scaleWidth(12),
    paddingVertical: scaleWidth(12),
  },
  cardDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(61,32,20,0.12)',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    flexShrink: 1,
    ...typography(700, 15, 'coffeeDark'),
    fontWeight: '700',
  },
  nameGroup: { color: appColors.maroon },
  groupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5E171714',
    borderRadius: scaleWidth(6),
    paddingHorizontal: scaleWidth(6),
    paddingVertical: scaleWidth(2),
    marginRight: scaleWidth(6),
  },
  groupChipIcon: {
    width: scaleWidth(11),
    height: scaleWidth(11),
    marginRight: scaleWidth(4),
    tintColor: appColors.maroon,
    resizeMode: 'contain',
  },
  groupChipText: {
    ...typography(700, 10, 'maroon'),
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  time: { ...typography('regular', 11, 'gray'), marginLeft: scaleWidth(8) },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: scaleWidth(4),
  },
  preview: { flex: 1, ...typography('regular', 13, 'gray') },
  previewUnread: { ...typography(600, 13, 'coffeeDark'), fontWeight: '600' },
  typing: {
    flex: 1,
    ...typography(600, 13, 'success'),
    fontWeight: '600',
    fontStyle: 'italic',
  },
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
  unreadText: { ...typography(700, 11, 'white'), fontWeight: '700' },
  noResults: {
    ...typography(500, 13, 'gray'),
    fontWeight: '500',
    textAlign: 'center',
    marginTop: scaleWidth(40),
  },
  emptyWrap: { alignItems: 'center', marginTop: scaleWidth(80) },
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
  emptyError: {
    ...typography('regular', 13, 'gray'),
    textAlign: 'center',
    marginTop: -scaleWidth(8),
    marginBottom: scaleWidth(18),
    paddingHorizontal: scaleWidth(20),
  },
  emptyBtn: {
    height: scaleWidth(48),
    paddingHorizontal: scaleWidth(28),
    borderRadius: scaleWidth(12),
    backgroundColor: appColors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBtnText: { ...typography(600, 15, 'white'), fontWeight: '600' },
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
    shadowOffset: { width: 0, height: 6 },
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
  fabText: { ...typography(600, 15, 'white'), fontWeight: '600' },
});

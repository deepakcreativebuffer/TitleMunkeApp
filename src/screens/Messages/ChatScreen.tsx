import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageBackground,
  TextInput,
  TouchableOpacity,
  FlatList,
  StatusBar,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {appColors, typography, scaleWidth} from '../../global';
import {AppScreenProps} from '../../types';
import {useAppDispatch, useAppSelector} from '../../store';
import {
  startConversation,
  sendMessage,
  receiveMockReply,
  setTyping,
  markConversationRead,
  randomReply,
  userByIdSelector,
  messagesByParticipantSelector,
  typingByParticipantSelector,
  currentUserIdSelector,
} from '../../slices';
import {Avatar} from '../../components/Avatar';
import {clockTime, lastSeenLabel} from '../../utils/time';
import type {Message} from '../../data/messagingData';

const gridBg = require('../../assets/images/grid-bg.png');
const icChevron = require('../../assets/images/ic-chevron.png');
const icSend = require('../../assets/images/ic-send.png');

export const ChatScreen = ({navigation, route}: AppScreenProps<'Chat'>) => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const {participantId} = route.params;

  const currentUserId = useAppSelector(currentUserIdSelector);
  const user = useAppSelector(userByIdSelector(participantId));
  const messages = useAppSelector(messagesByParticipantSelector(participantId));
  const typing = useAppSelector(typingByParticipantSelector(participantId));

  const [input, setInput] = useState('');
  const [kbVisible, setKbVisible] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Drop the home-indicator padding while the keyboard is open (it already
  // covers that area), otherwise it shows as a gap above the keyboard.
  useEffect(() => {
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s1 = Keyboard.addListener(show, () => setKbVisible(true));
    const s2 = Keyboard.addListener(hide, () => setKbVisible(false));
    return () => {
      s1.remove();
      s2.remove();
    };
  }, []);

  // Ensure the conversation exists and mark it read on open.
  useEffect(() => {
    dispatch(startConversation(participantId));
    dispatch(markConversationRead(participantId));
  }, [dispatch, participantId]);

  useEffect(() => {
    const t = setTimeout(
      () => listRef.current?.scrollToEnd({animated: true}),
      80,
    );
    return () => clearTimeout(t);
  }, [messages.length, typing]);

  useEffect(
    () => () => timers.current.forEach(clearTimeout),
    [],
  );

  const onSend = () => {
    const text = input.trim();
    if (!text) {
      return;
    }
    dispatch(sendMessage({participantId, text}));
    setInput('');
    // Mock: the other person "types" then replies (timeout-based simulation).
    timers.current.push(
      setTimeout(() => dispatch(setTyping({participantId, typing: true})), 700),
    );
    timers.current.push(
      setTimeout(() => {
        dispatch(receiveMockReply({participantId, text: randomReply()}));
      }, 2300),
    );
  };

  const statusText = user
    ? user.status === 'online'
      ? 'Online'
      : lastSeenLabel(user.lastSeen)
    : '';

  const renderItem = ({item, index}: {item: Message; index: number}) => {
    const mine = item.senderId === currentUserId;
    const prev = messages[index - 1];
    const showMeta = !prev || prev.senderId !== item.senderId;
    return (
      <View
        style={[
          styles.row,
          mine ? styles.rowRight : styles.rowLeft,
          showMeta ? {marginTop: scaleWidth(8)} : {marginTop: scaleWidth(2)},
        ]}>
        <View
          style={[
            styles.bubble,
            mine ? styles.bubbleMine : styles.bubbleTheirs,
          ]}>
          <Text style={mine ? styles.textMine : styles.textTheirs}>
            {item.text}
          </Text>
          <View style={styles.metaRow}>
            <Text style={[styles.metaTime, mine && styles.metaTimeMine]}>
              {clockTime(item.timestamp)}
            </Text>
            {mine ? (
              <Text
                style={[
                  styles.tick,
                  item.status === 'read' && styles.tickRead,
                ]}>
                {item.status === 'sent' ? '✓' : '✓✓'}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  return (
    <ImageBackground source={gridBg} resizeMode="cover" style={styles.bg}>
      <StatusBar barStyle="dark-content" backgroundColor={appColors.white} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}>
        {/* Header */}
        <View style={[styles.header, {paddingTop: insets.top + scaleWidth(8)}]}>
        <TouchableOpacity
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
          onPress={() => navigation.goBack()}>
          <Image source={icChevron} style={styles.backIcon} />
        </TouchableOpacity>
        <Avatar
          name={user?.name ?? '?'}
          id={participantId}
          size={scaleWidth(40)}
          online={user?.status === 'online'}
          style={{marginHorizontal: scaleWidth(10)}}
        />
        <View style={{flex: 1}}>
          <Text style={styles.headerName} numberOfLines={1}>
            {user?.name ?? 'Unknown'}
          </Text>
          <Text style={styles.headerStatus} numberOfLines={1}>
            {typing ? 'typing…' : statusText}
          </Text>
        </View>
        </View>

        <FlatList
          ref={listRef}
          style={styles.flex}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({animated: false})
          }
          ListFooterComponent={
            typing ? (
              <View style={[styles.row, styles.rowLeft]}>
                <View style={[styles.bubble, styles.bubbleTheirs, styles.typing]}>
                  <Text style={styles.typingText}>
                    {(user?.name ?? 'User').split(' ')[0]} is typing…
                  </Text>
                </View>
              </View>
            ) : null
          }
        />

        {/* Composer */}
        <View
          style={[
            styles.composer,
            {
              paddingBottom: kbVisible
                ? scaleWidth(8)
                : insets.bottom + scaleWidth(8),
            },
          ]}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Message…"
            placeholderTextColor={appColors.gray}
            multiline
          />
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            disabled={!input.trim()}
            onPress={onSend}>
            <Image source={icSend} style={styles.sendIcon} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  bg: {flex: 1, backgroundColor: appColors.background},
  flex: {flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(16),
    paddingBottom: scaleWidth(10),
    backgroundColor: appColors.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(61,32,20,0.07)',
  },
  backIcon: {
    width: scaleWidth(20),
    height: scaleWidth(20),
    tintColor: appColors.coffeeDark,
    transform: [{scaleX: -1}],
  },
  headerName: {...typography(700, 16, 'coffeeDark'), fontWeight: '700'},
  headerStatus: {...typography('regular', 12, 'success'), marginTop: scaleWidth(1)},
  listContent: {
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleWidth(14),
  },
  row: {flexDirection: 'row'},
  rowLeft: {justifyContent: 'flex-start'},
  rowRight: {justifyContent: 'flex-end'},
  bubble: {
    maxWidth: '80%',
    borderRadius: scaleWidth(16),
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleWidth(8),
  },
  bubbleMine: {
    backgroundColor: appColors.maroon,
    borderBottomRightRadius: scaleWidth(4),
  },
  bubbleTheirs: {
    backgroundColor: appColors.white,
    borderBottomLeftRadius: scaleWidth(4),
    ...{
      shadowColor: '#3d2014',
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 1,
    },
  },
  textMine: {...typography('regular', 14, 'white'), lineHeight: scaleWidth(20)},
  textTheirs: {
    ...typography('regular', 14, 'coffeeDark'),
    lineHeight: scaleWidth(20),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: scaleWidth(3),
  },
  metaTime: {...typography('regular', 10, 'gray')},
  metaTimeMine: {color: 'rgba(255,255,255,0.7)'},
  tick: {
    ...typography('regular', 11, 'gray'),
    color: 'rgba(255,255,255,0.7)',
    marginLeft: scaleWidth(4),
  },
  tickRead: {color: appColors.primaryGreen},
  typing: {paddingVertical: scaleWidth(10)},
  typingText: {...typography('regular', 13, 'gray'), fontStyle: 'italic'},
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: scaleWidth(12),
    paddingTop: scaleWidth(8),
    backgroundColor: appColors.white,
    borderTopWidth: 1,
    borderTopColor: 'rgba(61,32,20,0.07)',
  },
  input: {
    flex: 1,
    maxHeight: scaleWidth(110),
    minHeight: scaleWidth(44),
    borderWidth: 1.4,
    borderColor: appColors.inputBorder,
    borderRadius: scaleWidth(22),
    paddingHorizontal: scaleWidth(16),
    paddingTop: Platform.OS === 'ios' ? scaleWidth(12) : scaleWidth(8),
    paddingBottom: Platform.OS === 'ios' ? scaleWidth(12) : scaleWidth(8),
    ...typography('regular', 14, 'coffeeDark'),
    marginRight: scaleWidth(8),
  },
  sendBtn: {
    width: scaleWidth(44),
    height: scaleWidth(44),
    borderRadius: scaleWidth(22),
    backgroundColor: appColors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {opacity: 0.5},
  sendIcon: {
    width: scaleWidth(18),
    height: scaleWidth(18),
    tintColor: appColors.white,
  },
});

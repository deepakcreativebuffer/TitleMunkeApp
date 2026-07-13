import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Modal,
  Pressable,
  ActivityIndicator,
  Linking,
  Alert,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { appColors, typography, scaleWidth } from '../../global';
import {
  AppScreenProps,
  AppStackParamList,
  WsMessage,
  WsAttachment,
  AttachmentInput,
  PickedFile,
} from '../../types';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  myUserIdSelector,
  conversationByIdSelector,
  messagesByConversationSelector,
  historyLoadedSelector,
  loadingHistorySelector,
  historyCursorSelector,
  oneToOneWithSelector,
  presenceOfSelector,
  typingInSelector,
  setActiveConversation,
  addOptimisticMessage,
  markConversationReadLocally,
  userRoleSelector,
  userProfileSelector,
} from '../../slices';
import { Avatar } from '../../components/Avatar';
import { CachedImage } from '../../components/CachedImage';
import { clockTime, lastSeenLabel, dateSeparatorLabel } from '../../utils/time';
import {
  conversationTitle,
  otherParticipant,
  isMessageHiddenForMe,
  withinEditWindow,
  groupReactions,
  attachmentViewUrl,
  userImageUrl,
  parseSharedLocation,
  parseSharedProperty,
  encodeSharedProperty,
  SharedProperty,
} from '../../utils/chat';
import { listSearchHistories } from '../../api/userAdmin.api';
import {
  mapSearchHistory,
  PropertyHistoryItem,
} from '../../utils/searchHistory';
import {
  wsGetMessageHistory,
  wsSendMessage,
  wsMarkAsRead,
  wsEditMessage,
  wsDeleteMessage,
  wsReactToMessage,
  wsTyping,
} from '../../services/messaging.ws';
import {
  pickFiles,
  pickImageFromLibrary,
  captureFromCamera,
  getCurrentLocation,
  uploadAttachments,
  formatFileSize,
  isImageType,
  PICKER_UNAVAILABLE,
  PERMISSION_DENIED,
} from '../../services/attachmentUpload';
import {
  AttachmentSheet,
  AttachOption,
} from '../../components/AttachmentSheet';
import { VoiceMessage } from '../../components/VoiceMessage';
import {
  startRecording,
  stopRecording,
  cancelRecording,
  formatMillis,
  AUDIO_UNAVAILABLE,
  MIC_PERMISSION_DENIED,
} from '../../services/audio';
import EmojiSelector from 'react-native-emoji-selector';

const gridBg = require('../../assets/images/grid-bg.png');
const icChevron = require('../../assets/images/ic-chevron.png');
const icSend = require('../../assets/images/ic-send.png');
const icDoc = require('../../assets/images/ic-message.png');

const icCheck = require('../../assets/images/ic-check-plain.png');
const icClock = require('../../assets/images/ic-clock.png');
const icPin = require('../../assets/images/ic-pin.png');
const mapBg = require('../../assets/images/streetmap.png');
const icTrash = require('../../assets/images/ic-trash.png');

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

// WhatsApp-style message ticks: single grey check = sent, overlapped double
// blue checks = read. Rendered on the maroon "mine" bubble.
const MsgTicks = ({ read }: { read: boolean }) => {
  const color = read
    ? appColors.primaryGreen ?? '#3ddc84'
    : 'rgba(255,255,255,0.8)';
  return (
    <View style={styles.ticks}>
      <Image
        source={icCheck}
        style={[
          styles.tickImg,
          read && styles.tickImgBack,
          { tintColor: color },
        ]}
      />
      {read ? (
        <Image
          source={icCheck}
          style={[styles.tickImg, { tintColor: color }]}
        />
      ) : null}
    </View>
  );
};

// Animated three-dot "typing…" indicator.
const TypingDots = () => {
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0.3))).current;
  useEffect(() => {
    const anims = dots.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(v, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0.3,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, [dots]);
  return (
    <View style={styles.dotsRow}>
      {dots.map((v, i) => (
        <Animated.View key={i} style={[styles.dot, { opacity: v }]} />
      ))}
    </View>
  );
};

export const ChatScreen = ({ navigation, route }: AppScreenProps<'Chat'>) => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const {
    conversationId: paramConvId,
    toUserId,
    title,
    isGroup,
    groupId,
  } = route.params;

  const myUserId = useAppSelector(myUserIdSelector);
  // For a brand-new 1-1 chat (opened with toUserId only), adopt the real
  // conversation id as soon as the first message creates it server-side.
  const oneToOne = useAppSelector(oneToOneWithSelector(myUserId, toUserId));
  const resolvedConvId = paramConvId ?? oneToOne?.id;

  const conv = useAppSelector(conversationByIdSelector(resolvedConvId));
  const sliceMessages = useAppSelector(
    messagesByConversationSelector(resolvedConvId),
  );
  const historyLoaded = useAppSelector(historyLoadedSelector(resolvedConvId));
  const loadingHistory = useAppSelector(loadingHistorySelector(resolvedConvId));
  const cursor = useAppSelector(historyCursorSelector(resolvedConvId));

  const [input, setInput] = useState('');
  const [kbVisible, setKbVisible] = useState(false);
  const [localPending, setLocalPending] = useState<WsMessage[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PickedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [replyTo, setReplyTo] = useState<WsMessage | null>(null);
  const [editing, setEditing] = useState<WsMessage | null>(null);
  const [actionMsg, setActionMsg] = useState<WsMessage | null>(null);
  const [reactionsMsg, setReactionsMsg] = useState<WsMessage | null>(null);
  const [emojiPickerMsg, setEmojiPickerMsg] = useState<WsMessage | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  // Voice recording
  const [recording, setRecording] = useState(false);
  const [recordMs, setRecordMs] = useState(0);
  const recordingRef = useRef(false);
  recordingRef.current = recording;
  // Discard an in-progress recording if the screen unmounts.
  useEffect(
    () => () => {
      if (recordingRef.current) {
        void cancelRecording();
      }
    },
    [],
  );
  // Share-property picker (fetched from the same search-history API).
  const [propertyOpen, setPropertyOpen] = useState(false);
  const [properties, setProperties] = useState<PropertyHistoryItem[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [selectedPropIds, setSelectedPropIds] = useState<string[]>([]);

  const role = useAppSelector(userRoleSelector);
  const profile = useAppSelector(userProfileSelector);
  // Root-stack nav for property screens (PropertyReport / SearchMap live there).
  const rootNav = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const listRef = useRef<FlatList<any>>(null);

  // Prefer the LIVE conversation name (reflects group renames) over the title
  // passed as a route param when the chat was opened.
  const headerTitle = conversationTitle(conv, myUserId) || title || 'Chat';
  const isGroupChat = isGroup ?? conv?.type === 'GROUP';
  const memberCount = conv?.participants?.length ?? 0;
  const other = otherParticipant(conv, myUserId);

  // Presence of the other person (1-1 only).
  const otherPresence = useAppSelector(presenceOfSelector(other?.user_id));
  const isOnline = !isGroupChat && !!otherPresence?.online;
  const presenceLabel = isGroupChat
    ? ''
    : isOnline
    ? 'Online'
    : otherPresence?.lastSeen
    ? lastSeenLabel(new Date(otherPresence.lastSeen).getTime())
    : '';

  // Live typing indicator. Filter out stale entries (a "stop" event can be
  // missed) via a ticker while anyone is typing.
  const typingMap = useAppSelector(typingInSelector(resolvedConvId));
  const [typingTick, setTypingTick] = useState(0);
  useEffect(() => {
    if (!typingMap || Object.keys(typingMap).length === 0) {
      return;
    }
    const id = setInterval(() => setTypingTick(t => t + 1), 2000);
    return () => clearInterval(id);
  }, [typingMap]);
  const typers = useMemo(() => {
    const now = Date.now();
    return Object.entries(typingMap ?? {})
      .filter(([uid, v]) => Number(uid) !== myUserId && now - v.ts < 6000)
      .map(([, v]) => v.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typingMap, typingTick, myUserId]);
  const typingLabel =
    typers.length === 0
      ? ''
      : isGroupChat
      ? typers.length === 1
        ? `${typers[0]} is typing…`
        : `${typers.length} people are typing…`
      : 'typing…';

  // Once we have a real conversation id, the slice is the source of truth.
  useEffect(() => {
    if (resolvedConvId != null && localPending.length) {
      setLocalPending([]);
    }
  }, [resolvedConvId, localPending.length]);

  // Keyboard padding tweak (matches other screens).
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

  // Mark active + load history + mark read when the conversation is known.
  useEffect(() => {
    if (resolvedConvId == null) {
      return;
    }
    dispatch(setActiveConversation(resolvedConvId));
    if (!historyLoaded) {
      void wsGetMessageHistory({ conversationId: resolvedConvId });
    }
    wsMarkAsRead(resolvedConvId);
    dispatch(markConversationReadLocally(resolvedConvId));
    return () => {
      dispatch(setActiveConversation(null));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedConvId]);

  const data = useMemo(() => {
    const base = resolvedConvId != null ? sliceMessages : localPending;
    return base.filter(m => !isMessageHiddenForMe(m, myUserId));
  }, [resolvedConvId, sliceMessages, localPending, myUserId]);

  // Look up a full loaded message by id (the server's `reply_to` omits the
  // replied message's attachments, so resolve them from what we already have).
  const messagesById = useMemo(() => {
    const map = new Map<number, WsMessage>();
    for (const m of sliceMessages) {
      if (m.id > 0) {
        map.set(m.id, m);
      }
    }
    return map;
  }, [sliceMessages]);

  // Preview details for a replied-to message (text + optional image thumbnail).
  const replyPreview = (m?: WsMessage | null) => {
    const full = m?.id != null ? messagesById.get(m.id) ?? m : m;
    const att = full?.attachments?.[0] ?? m?.attachments?.[0];
    const isImg = !!att && isImageType(att.file_type);
    // The message text (caption). Falls back to a media label only when there's
    // no caption, so an image WITH a caption shows both the caption AND thumb.
    const caption = (full?.content ?? m?.content ?? '').trim();
    const text =
      caption || (att ? (isImg ? 'Photo' : att.file_name || 'Attachment') : '');
    return {
      text,
      isImage: isImg,
      thumbKey: isImg ? att?.file_key : undefined,
      thumbUrl: isImg && att ? attachmentViewUrl(att) : undefined,
    };
  };

  // Interleave WhatsApp-style day separators between messages of different days.
  const listData = useMemo(() => {
    const out: Array<WsMessage | { _sep: true; id: string; label: string }> =
      [];
    let lastKey = '';
    for (const m of data) {
      const d = new Date(m.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (key !== lastKey) {
        lastKey = key;
        out.push({
          _sep: true,
          id: `sep-${key}`,
          label: dateSeparatorLabel(d.getTime()),
        });
      }
      out.push(m);
    }
    return out;
  }, [data]);

  // Keep unread cleared + re-mark read as new messages come in while viewing.
  useEffect(() => {
    if (resolvedConvId == null || data.length === 0) {
      return;
    }
    const last = data[data.length - 1];
    if (last && last.sender_id !== myUserId && !last._pending) {
      wsMarkAsRead(resolvedConvId);
      dispatch(markConversationReadLocally(resolvedConvId));
    }
  }, [data.length, resolvedConvId, myUserId, dispatch, data]);

  useEffect(() => {
    const t = setTimeout(
      () => listRef.current?.scrollToEnd({ animated: true }),
      80,
    );
    return () => clearTimeout(t);
  }, [data.length, typingLabel]);

  const makeOptimistic = (
    content: string,
    attachments?: AttachmentInput[],
  ): WsMessage => ({
    id: -Date.now(),
    conversation_id: resolvedConvId ?? -1,
    sender_id: myUserId ?? -1,
    content: content || null,
    reply_to_id: replyTo?.id ?? null,
    reply_to: replyTo ?? null,
    created_at: new Date().toISOString(),
    sender: { id: myUserId ?? -1, name: 'You' },
    attachments: attachments?.map(a => ({
      file_name: a.fileName,
      file_key: a.fileKey,
      file_type: a.fileType,
      file_size: a.fileSize,
      // Show the sender their own image straight from the local file until the
      // server sends back a signed URL (avoids the blank/broken bubble).
      url: a.localUri,
    })),
    reactions: [],
    _clientId: `c-${Date.now()}-${Math.random()}`,
    _pending: true,
  });

  const dispatchSend = (content: string, attachments?: AttachmentInput[]) => {
    const optimistic = makeOptimistic(content, attachments);
    if (resolvedConvId != null) {
      dispatch(
        addOptimisticMessage({
          conversationId: resolvedConvId,
          message: optimistic,
        }),
      );
      wsSendMessage({
        conversationId: resolvedConvId,
        content,
        replyToId: replyTo?.id,
        attachments,
      });
    } else if (isGroupChat && groupId != null) {
      wsSendMessage({ groupId, content, replyToId: replyTo?.id, attachments });
    } else if (toUserId != null) {
      setLocalPending(prev => [...prev, optimistic]);
      wsSendMessage({ toUserId, content, replyToId: replyTo?.id, attachments });
    }
  };

  // ── Typing indicator (outbound) ────────────────────────────────────────────
  const lastTypingSent = useRef(0);
  const typingTarget = (): {
    conversationId?: number;
    groupId?: number;
    toUserId?: number;
  } | null => {
    if (resolvedConvId != null) {
      return { conversationId: resolvedConvId };
    }
    if (isGroupChat && groupId != null) {
      return { groupId };
    }
    if (toUserId != null) {
      return { toUserId };
    }
    return null;
  };
  const sendTyping = (isTyping: boolean) => {
    const target = typingTarget();
    if (target) {
      wsTyping({ ...target, isTyping });
    }
  };
  const onInputChange = (t: string) => {
    setInput(t);
    if (editing) {
      return;
    }
    if (!t) {
      sendTyping(false);
      lastTypingSent.current = 0;
      return;
    }
    // Throttle "started typing" to ~once every 2.5s.
    const now = Date.now();
    if (now - lastTypingSent.current > 2500) {
      lastTypingSent.current = now;
      sendTyping(true);
    }
  };

  // Stop typing when leaving the conversation.
  useEffect(() => {
    return () => sendTyping(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedConvId]);

  const onSend = async () => {
    sendTyping(false);
    lastTypingSent.current = 0;
    const text = input.trim();

    // Editing an existing message.
    if (editing) {
      if (text && text !== editing.content) {
        wsEditMessage(editing.id, text);
      }
      setEditing(null);
      setInput('');
      return;
    }

    if (!text && pendingFiles.length === 0) {
      return;
    }

    let attachments: AttachmentInput[] | undefined;
    if (pendingFiles.length) {
      try {
        setUploading(true);
        attachments = await uploadAttachments(pendingFiles);
      } catch (e) {
        setUploading(false);
        Alert.alert('Upload failed', 'Could not upload the attachment.');
        return;
      }
      setUploading(false);
    }

    dispatchSend(text, attachments);
    setInput('');
    setPendingFiles([]);
    setReplyTo(null);
  };

  // ── Voice messages ─────────────────────────────────────────────────────────
  const startVoice = async () => {
    Keyboard.dismiss();
    try {
      setRecordMs(0);
      await startRecording(ms => setRecordMs(ms));
      setRecording(true);
    } catch (e) {
      if (e instanceof Error && e.message === MIC_PERMISSION_DENIED) {
        Alert.alert(
          'Microphone needed',
          'Enable microphone access in Settings to record voice messages.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
      } else if (e instanceof Error && e.message === AUDIO_UNAVAILABLE) {
        Alert.alert(
          'Voice messages',
          'This needs an app rebuild (run pod install and rebuild the app).',
        );
      } else {
        Alert.alert(
          'Voice messages',
          `Could not start recording.\n${
            e instanceof Error ? e.message : String(e)
          }`,
        );
      }
    }
  };

  const cancelVoice = async () => {
    setRecording(false);
    setRecordMs(0);
    await cancelRecording();
  };

  const stopVoiceAndSend = async () => {
    const ms = recordMs;
    setRecording(false);
    setRecordMs(0);
    let uri: string | null = null;
    try {
      uri = await stopRecording();
    } catch {
      uri = null;
    }
    // Discard taps shorter than ~1s (accidental).
    if (!uri || ms < 1000) {
      await cancelRecording();
      return;
    }
    try {
      setUploading(true);
      const file: PickedFile = {
        uri,
        name: `voice_${Date.now()}_${Math.round(ms)}ms.m4a`,
        type: 'audio/mp4', // .m4a is an MPEG-4 audio container
        size: 0,
      };
      const attachments = await uploadAttachments([file]);
      setUploading(false);
      dispatchSend('', attachments);
      setReplyTo(null);
    } catch {
      setUploading(false);
      Alert.alert('Voice messages', 'Could not send the voice message.');
    }
  };

  const notifyUnavailable = (e: unknown, fallback: string) => {
    if (e instanceof Error && e.message === PERMISSION_DENIED) {
      Alert.alert(
        'Permission needed',
        'TitleMunke needs access to continue. Enable it in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }
    const msg =
      e instanceof Error && e.message === PICKER_UNAVAILABLE
        ? 'This needs an app rebuild (run pod install and rebuild the app).'
        : fallback;
    Alert.alert('Attachment', msg);
  };

  const sendLocation = async () => {
    try {
      const { latitude, longitude } = await getCurrentLocation();
      const link = `https://maps.google.com/?q=${latitude},${longitude}`;
      dispatchSend(`📍 My location: ${link}`);
      setReplyTo(null);
    } catch (e) {
      notifyUnavailable(e, 'Could not get your location.');
    }
  };

  // Share property: open a picker fed by the same search-history API.
  const openPropertyPicker = () => {
    setSelectedPropIds([]);
    setPropertyOpen(true);
    setLoadingProperties(true);
    const brokerId = profile?.sub;
    const isAgent = role === 'agent';
    listSearchHistories({
      userType: role,
      ...(isAgent ? {} : { brokerId }),
      userId: brokerId,
      limit: 50,
    })
      .then(res => setProperties(mapSearchHistory(res)))
      .catch(() => setProperties([]))
      .finally(() => setLoadingProperties(false));
  };

  const togglePropSelect = (id: string) => {
    setSelectedPropIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(p => p !== id);
      }
      if (prev.length >= 2) {
        // Cap at two — drop the oldest to keep the newest tap.
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  const shareSelectedProperties = () => {
    const chosen = properties.filter(p => selectedPropIds.includes(p.id));
    setPropertyOpen(false);
    // One card per property so each is independently tappable.
    chosen.forEach(p =>
      dispatchSend(
        encodeSharedProperty({
          address: p.address,
          when: p.when,
          searchId: p.searchId,
          lat: p.latitude,
          lng: p.longitude,
        }),
      ),
    );
    setSelectedPropIds([]);
    setReplyTo(null);
  };

  // WhatsApp-style attachment menu handler.
  const onAttachSelect = async (option: AttachOption) => {
    setAttachOpen(false);
    // Wait for the attachment sheet (a Modal) to finish dismissing before
    // presenting a native picker — iOS can't present a view controller while
    // another is still being dismissed, so the picker silently fails to open.
    await new Promise<void>(res =>
      setTimeout(() => res(), Platform.OS === 'ios' ? 400 : 80),
    );
    try {
      if (option === 'photos') {
        const files = await pickImageFromLibrary();
        if (files.length) {
          setPendingFiles(prev => [...prev, ...files]);
        }
      } else if (option === 'camera') {
        const files = await captureFromCamera();
        if (files.length) {
          setPendingFiles(prev => [...prev, ...files]);
        }
      } else if (option === 'document') {
        const files = await pickFiles();
        if (files.length) {
          setPendingFiles(prev => [...prev, ...files]);
        }
      } else if (option === 'location') {
        await sendLocation();
      } else if (option === 'properties') {
        openPropertyPicker();
      }
    } catch (e) {
      notifyUnavailable(e, 'Could not open the picker.');
    }
  };

  const loadEarlier = () => {
    if (resolvedConvId != null && cursor != null && !loadingHistory) {
      void wsGetMessageHistory({
        conversationId: resolvedConvId,
        cursor,
        older: true,
      });
    }
  };

  const toggleReaction = (m: WsMessage, emoji: string) => {
    const mine = m.reactions?.some(
      r => r.user_id === myUserId && r.reaction === emoji,
    );
    if (m.id > 0) {
      wsReactToMessage(m.id, emoji, !!mine);
    }
    setActionMsg(null);
  };

  const onDelete = (m: WsMessage) => {
    setActionMsg(null);
    Alert.alert('Delete message', 'Delete this message?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => m.id > 0 && wsDeleteMessage(m.id),
      },
    ]);
  };

  const startEdit = (m: WsMessage) => {
    setActionMsg(null);
    setEditing(m);
    setReplyTo(null);
    setInput(m.content ?? '');
  };

  // Open shared coordinates in the platform's native maps app:
  // Apple Maps on iOS, Google Maps on Android (falls back to a web URL).
  const openLocationInMaps = (lat: number, lng: number) => {
    const primary =
      Platform.OS === 'ios'
        ? `maps://?ll=${lat},${lng}&q=${lat},${lng}`
        : `geo:${lat},${lng}?q=${lat},${lng}`;
    const web = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(primary).catch(() => {
      Linking.openURL(web).catch(() => {});
    });
  };

  // ── Rendering ──────────────────────────────────────────────────────────────
  // Open an attachment INSIDE the app (dedicated viewer screen — never Safari).
  const openAttachment = (a: WsAttachment) => {
    const url = attachmentViewUrl(a);
    if (!url) {
      return;
    }
    navigation.navigate('DocumentViewer', {
      url,
      name: a.file_name,
      type: a.file_type,
      fileKey: a.file_key,
      isImage: isImageType(a.file_type),
    });
  };

  // Open a shared property's full report (same screen as search history).
  const openProperty = (p: SharedProperty) => {
    rootNav.navigate('PropertyReport', {
      address: p.address,
      when: p.when ?? '',
      searchId: p.searchId,
    });
  };

  // Open the property on the in-app map (same SearchMap screen).
  const openPropertyMap = (p: SharedProperty) => {
    rootNav.navigate('SearchMap', {
      items: [
        {
          id: p.searchId ?? p.address,
          address: p.address,
          when: p.when ?? '',
          status: 'SUCCESS',
          searchId: p.searchId,
          latitude: p.lat,
          longitude: p.lng,
        },
      ],
    });
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: WsMessage | { _sep: true; id: string; label: string };
    index: number;
  }) => {
    if ('_sep' in item) {
      return (
        <View style={styles.dateSepRow}>
          <View style={styles.dateSep}>
            <Text style={styles.dateSepText}>{item.label}</Text>
          </View>
        </View>
      );
    }
    const mine = item.sender_id === myUserId;
    const prev = listData[index - 1];
    const showMeta =
      !prev || '_sep' in prev || prev.sender_id !== item.sender_id;
    const reactions = groupReactions(item, myUserId);
    const rp = item.reply_to ? replyPreview(item.reply_to) : null;

    // Read receipt (double green ticks). "Read" = every participant OTHER than
    // the message's SENDER has read past it (1-1 → the one recipient; group →
    // all members). Keying off item.sender_id (not myUserId) means my own read
    // from a second device on the same account never counts as a read receipt —
    // and it stays correct even if myUserId hasn't resolved on this device.
    const msgTime = new Date(item.created_at).getTime();
    const hasRead = (readAt?: string | null) =>
      !!readAt && new Date(readAt).getTime() >= msgTime;
    let otherRead = false;
    if (mine) {
      const readers = (conv?.participants ?? []).filter(
        p => p.user_id !== item.sender_id,
      );
      otherRead =
        readers.length > 0 && readers.every(p => hasRead(p.last_read_at));
    }
    return (
      <Pressable
        onLongPress={() => item.id > 0 && setActionMsg(item)}
        delayLongPress={250}
        style={[
          styles.row,
          mine ? styles.rowRight : styles.rowLeft,
          showMeta
            ? { marginTop: scaleWidth(8) }
            : { marginTop: scaleWidth(2) },
        ]}
      >
        <View style={{ maxWidth: '82%' }}>
          {isGroupChat && !mine && showMeta ? (
            <Text style={styles.senderName}>{item.sender?.name ?? 'User'}</Text>
          ) : null}
          <View
            style={[
              styles.bubble,
              mine ? styles.bubbleMine : styles.bubbleTheirs,
            ]}
          >
            {rp ? (
              <View
                style={[
                  styles.replyQuote,
                  mine ? styles.replyQuoteMine : styles.replyQuoteTheirs,
                ]}
              >
                {rp.thumbKey ? (
                  <CachedImage
                    fileKey={rp.thumbKey}
                    url={rp.thumbUrl!}
                    style={styles.replyThumb}
                    resizeMode="cover"
                  />
                ) : null}
                <View style={styles.replyTextCol}>
                  <Text
                    style={[
                      styles.replyName,
                      mine ? styles.replyNameMine : styles.replyNameTheirs,
                    ]}
                    numberOfLines={1}
                  >
                    {item.reply_to?.sender_id === myUserId
                      ? 'You'
                      : item.reply_to?.sender?.name ?? 'Reply'}
                  </Text>
                  <Text
                    style={[
                      styles.replyText,
                      mine ? styles.replyTextMine : styles.replyTextTheirs,
                    ]}
                    numberOfLines={2}
                  >
                    {rp.isImage ? `📷 ${rp.text}` : rp.text}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Attachments */}
            {item.attachments?.map((a, i) =>
              a.file_type?.startsWith('audio') ? (
                <VoiceMessage
                  key={i}
                  url={attachmentViewUrl(a)}
                  mine={mine}
                  durationMs={
                    Number(a.file_name?.match(/_(\d+)ms/)?.[1]) || undefined
                  }
                />
              ) : isImageType(a.file_type) && a.file_key ? (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.9}
                  onPress={() => openAttachment(a)}
                >
                  <CachedImage
                    fileKey={a.file_key}
                    url={attachmentViewUrl(a)}
                    style={styles.imageAttach}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.85}
                  onPress={() => a.file_key && openAttachment(a)}
                  style={[styles.fileChip, mine && styles.fileChipMine]}
                >
                  <Image source={icDoc} style={styles.fileIcon} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.fileName, mine && styles.textMine]}
                      numberOfLines={1}
                    >
                      {a.file_name}
                    </Text>
                    {a.file_size ? (
                      <Text
                        style={[styles.fileSize, mine && styles.metaTimeMine]}
                      >
                        {formatFileSize(a.file_size)}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ),
            )}

            {(() => {
              const prop = parseSharedProperty(item.content);
              if (prop) {
                const parts = prop.address.split(',');
                const line1 = parts[0]?.trim() || prop.address;
                const line2 =
                  parts.slice(1).join(',').trim() || prop.when || '';
                return (
                  <View style={styles.propCard}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => openProperty(prop)}
                      style={styles.propTop}
                    >
                      <View style={styles.propIconTile}>
                        <Image source={icPin} style={styles.propPin} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.propTitle} numberOfLines={1}>
                          {line1}
                        </Text>
                        {line2 ? (
                          <Text style={styles.propSub} numberOfLines={1}>
                            {line2}
                          </Text>
                        ) : null}
                      </View>
                      {prop.distanceKm != null ? (
                        <Text style={styles.propDist}>
                          {prop.distanceKm.toFixed(1)} KM
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => openPropertyMap(prop)}
                      style={styles.propMapBtn}
                    >
                      <Image source={icPin} style={styles.propMapIcon} />
                      <Text style={styles.propMapText}>View on Map</Text>
                    </TouchableOpacity>
                  </View>
                );
              }
              const loc = parseSharedLocation(item.content);
              if (loc) {
                return (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => openLocationInMaps(loc.lat, loc.lng)}
                    style={styles.locCard}
                  >
                    <ImageBackground
                      source={mapBg}
                      style={styles.locMap}
                      imageStyle={styles.locMapImg}
                    >
                      <Image source={icPin} style={styles.locPin} />
                    </ImageBackground>
                    <View style={styles.locFooter}>
                      <Image source={icPin} style={styles.locFooterPin} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.locTitle}>Location</Text>
                        <Text style={styles.locCoords} numberOfLines={1}>
                          {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }
              return item.content ? (
                <Text style={mine ? styles.textMine : styles.textTheirs}>
                  {item.content}
                </Text>
              ) : null;
            })()}

            <View style={styles.metaRow}>
              {item.edited_at ? (
                <Text style={[styles.edited, mine && styles.metaTimeMine]}>
                  edited
                </Text>
              ) : null}
              <Text style={[styles.metaTime, mine && styles.metaTimeMine]}>
                {clockTime(new Date(item.created_at).getTime())}
              </Text>
              {mine ? (
                item._failed ? (
                  <Text style={styles.failMark}>!</Text>
                ) : item._pending ? (
                  <Image source={icClock} style={styles.clockImg} />
                ) : (
                  <MsgTicks read={otherRead} />
                )
              ) : null}
            </View>
          </View>

          {/* Reactions */}
          {reactions.length ? (
            <View style={[styles.reactRow, mine && { alignSelf: 'flex-end' }]}>
              {reactions.map(r => (
                <TouchableOpacity
                  key={r.reaction}
                  activeOpacity={0.7}
                  // Tapping a reaction shows WHO reacted (reacting is hold-only).
                  onPress={() => setReactionsMsg(item)}
                  style={[styles.reactChip, r.mine && styles.reactChipMine]}
                >
                  <Text style={styles.reactEmoji}>{r.reaction}</Text>
                  {r.count > 1 ? (
                    <Text style={styles.reactCount}>{r.count}</Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  };

  const composerLabel = editing
    ? 'Edit message…'
    : replyTo
    ? 'Reply…'
    : 'Message…';
  // console.log('datadatadatadatadatadatadata', JSON.stringify(data, null, 2));

  return (
    <ImageBackground source={gridBg} resizeMode="cover" style={styles.bg}>
      <StatusBar barStyle="dark-content" backgroundColor={appColors.white} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View
          style={[styles.header, { paddingTop: insets.top + scaleWidth(8) }]}
        >
          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => navigation.goBack()}
          >
            <Image source={icChevron} style={styles.backIcon} />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={resolvedConvId != null ? 0.7 : 1}
            disabled={resolvedConvId == null}
            onPress={() => {
              if (resolvedConvId == null) {
                return;
              }
              if (isGroupChat && groupId != null) {
                navigation.navigate('GroupInfo', {
                  conversationId: resolvedConvId,
                  groupId,
                  title: headerTitle,
                });
              } else {
                navigation.navigate('ContactInfo', {
                  conversationId: resolvedConvId,
                  title: headerTitle,
                });
              }
            }}
            style={styles.headerCenter}
          >
            <Avatar
              name={headerTitle || '?'}
              id={
                isGroupChat
                  ? `g${resolvedConvId ?? 0}`
                  : `u${other?.user_id ?? 0}`
              }
              imageUrl={
                isGroupChat ? conv?.group?.image_url : userImageUrl(other?.user)
              }
              cacheKey={
                isGroupChat
                  ? conv?.group?.image_key ?? undefined
                  : other?.user?.profile_image_key ?? undefined
              }
              online={isOnline}
              size={scaleWidth(40)}
              style={{ marginRight: scaleWidth(10) }}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.headerName} numberOfLines={1}>
                {headerTitle || 'Chat'}
              </Text>
              {typingLabel ? (
                <Text
                  style={[styles.headerSub, styles.headerTyping]}
                  numberOfLines={1}
                >
                  {typingLabel}
                </Text>
              ) : isGroupChat ? (
                <Text style={styles.headerSub} numberOfLines={1}>
                  {memberCount} members
                </Text>
              ) : presenceLabel ? (
                <Text
                  style={[styles.headerSub, isOnline && styles.headerOnline]}
                  numberOfLines={1}
                >
                  {presenceLabel}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        </View>
        <FlatList
          ref={listRef}
          style={styles.flex}
          data={listData}
          keyExtractor={m =>
            '_sep' in m
              ? m.id
              : m.id > 0
              ? `s${m.id}`
              : m._clientId ?? `t${m.id}`
          }
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: false })
          }
          ListHeaderComponent={
            cursor != null ? (
              <TouchableOpacity
                style={styles.loadEarlier}
                onPress={loadEarlier}
                disabled={loadingHistory}
              >
                {loadingHistory ? (
                  <ActivityIndicator size="small" color={appColors.maroon} />
                ) : (
                  <Text style={styles.loadEarlierText}>
                    Load earlier messages
                  </Text>
                )}
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            loadingHistory ? (
              <ActivityIndicator
                color={appColors.maroon}
                style={{ marginTop: scaleWidth(40) }}
              />
            ) : (
              <Text style={styles.emptyChat}>
                No messages yet. Say hello 👋
              </Text>
            )
          }
          ListFooterComponent={
            typingLabel ? (
              <View style={[styles.row, styles.rowLeft, styles.typingRow]}>
                <View
                  style={[
                    styles.bubble,
                    styles.bubbleTheirs,
                    styles.typingBubble,
                  ]}
                >
                  {isGroupChat ? (
                    <Text style={styles.typingBubbleText}>{typingLabel}</Text>
                  ) : null}
                  <TypingDots />
                </View>
              </View>
            ) : null
          }
        />

        {/* Reply / edit banner */}
        {replyTo || editing ? (
          <View style={styles.replyBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.replyBannerTitle}>
                {editing
                  ? 'Editing message'
                  : `Replying to ${replyTo?.sender?.name ?? ''}`}
              </Text>
              <Text style={styles.replyBannerText} numberOfLines={1}>
                {editing ? editing.content ?? '' : replyPreview(replyTo).text}
              </Text>
            </View>
            {!editing && replyPreview(replyTo).thumbKey ? (
              <CachedImage
                fileKey={replyPreview(replyTo).thumbKey}
                url={replyPreview(replyTo).thumbUrl!}
                style={styles.replyBannerThumb}
                resizeMode="cover"
              />
            ) : null}
            <TouchableOpacity
              onPress={() => {
                setReplyTo(null);
                if (editing) {
                  setEditing(null);
                  setInput('');
                }
              }}
            >
              <Text style={styles.replyClose}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Pending attachments strip */}
        {pendingFiles.length ? (
          <View style={styles.attachStrip}>
            {pendingFiles.map((f, i) => {
              const remove = () =>
                setPendingFiles(prev => prev.filter((_, j) => j !== i));
              return isImageType(f.type) ? (
                <View key={i} style={styles.attachThumbWrap}>
                  <Image source={{ uri: f.uri }} style={styles.attachThumb} />
                  <TouchableOpacity
                    style={styles.attachThumbRemove}
                    onPress={remove}
                  >
                    <Text style={styles.attachThumbRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View key={i} style={styles.attachPill}>
                  <Text style={styles.attachPillText} numberOfLines={1}>
                    📎 {f.name}
                  </Text>
                  <TouchableOpacity onPress={remove}>
                    <Text style={styles.attachRemove}>✕</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Composer */}
        <View
          style={[
            styles.composer,
            {
              paddingBottom: kbVisible
                ? scaleWidth(8)
                : insets.bottom + scaleWidth(8),
            },
          ]}
        >
          {recording ? (
            // ── Recording bar ──
            <>
              <TouchableOpacity
                style={styles.recCancel}
                activeOpacity={0.8}
                onPress={cancelVoice}
              >
                <Image source={icTrash} style={styles.recTrashIcon} />
              </TouchableOpacity>
              <View style={styles.recMid}>
                <View style={styles.recDot} />
                <Text style={styles.recTime}>{formatMillis(recordMs)}</Text>
                <Text style={styles.recHint}>Recording…</Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.sendBtn}
                onPress={stopVoiceAndSend}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color={appColors.white} />
                ) : (
                  <Image source={icSend} style={styles.sendIcon} />
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {!editing ? (
                <TouchableOpacity
                  style={styles.attachBtn}
                  activeOpacity={0.8}
                  onPress={() => setAttachOpen(true)}
                  disabled={uploading}
                >
                  <Text style={styles.attachIcon}>＋</Text>
                </TouchableOpacity>
              ) : null}
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={onInputChange}
                placeholder={composerLabel}
                placeholderTextColor={appColors.gray}
                multiline
              />
              {input.trim() || pendingFiles.length > 0 || editing ? (
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.sendBtn}
                  disabled={uploading}
                  onPress={onSend}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color={appColors.white} />
                  ) : (
                    <Image source={icSend} style={styles.sendIcon} />
                  )}
                </TouchableOpacity>
              ) : (
                // Mic button (WhatsApp-style) when there's nothing to send.
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.sendBtn}
                  onPress={startVoice}
                  disabled={uploading}
                >
                  <View style={styles.micGlyph}>
                    <View style={styles.micBody} />
                    <View style={styles.micStem} />
                    <View style={styles.micBase} />
                  </View>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Long-press action sheet */}
      <Modal
        visible={!!actionMsg}
        transparent
        animationType="fade"
        onRequestClose={() => setActionMsg(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setActionMsg(null)}
        >
          <View style={styles.actionSheet}>
            <View style={styles.emojiRow}>
              {QUICK_EMOJIS.map(e => (
                <TouchableOpacity
                  key={e}
                  onPress={() => actionMsg && toggleReaction(actionMsg, e)}
                >
                  <Text style={styles.emojiBig}>{e}</Text>
                </TouchableOpacity>
              ))}
              {/* Open the full emoji sheet */}
              <TouchableOpacity
                style={styles.emojiMore}
                onPress={() => {
                  setEmojiPickerMsg(actionMsg);
                  setActionMsg(null);
                }}
              >
                <Text style={styles.emojiMoreText}>＋</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => {
                if (actionMsg) {
                  setReplyTo(actionMsg);
                }
                setActionMsg(null);
              }}
            >
              <Text style={styles.actionText}>Reply</Text>
            </TouchableOpacity>
            {actionMsg &&
            actionMsg.sender_id === myUserId &&
            actionMsg.content &&
            withinEditWindow(actionMsg) ? (
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => startEdit(actionMsg)}
              >
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>
            ) : null}
            {actionMsg && actionMsg.sender_id === myUserId ? (
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => onDelete(actionMsg)}
              >
                <Text style={[styles.actionText, styles.actionDanger]}>
                  Delete
                </Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.actionItem, styles.actionCancel]}
              onPress={() => setActionMsg(null)}
            >
              <Text style={styles.actionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* WhatsApp-style attachment menu */}
      <AttachmentSheet
        visible={attachOpen}
        onClose={() => setAttachOpen(false)}
        onSelect={onAttachSelect}
      />

      {/* Property picker — share properties from search history as cards */}
      <Modal
        visible={propertyOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPropertyOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setPropertyOpen(false)}
        >
          <Pressable style={styles.actionSheet}>
            <View style={styles.propSheetHead}>
              <Text style={styles.contactSheetTitle}>Share property</Text>
              <Text style={styles.propSheetHint}>Select up to 2</Text>
            </View>
            {loadingProperties ? (
              <ActivityIndicator
                color={appColors.maroon}
                style={{ marginVertical: scaleWidth(20) }}
              />
            ) : properties.length === 0 ? (
              <Text style={styles.contactEmpty}>No properties found.</Text>
            ) : (
              <FlatList
                data={properties}
                keyExtractor={p => p.id}
                style={{ maxHeight: scaleWidth(360) }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const selected = selectedPropIds.includes(item.id);
                  return (
                    <TouchableOpacity
                      style={styles.contactRow}
                      activeOpacity={0.8}
                      onPress={() => togglePropSelect(item.id)}
                    >
                      <View style={styles.propRowIcon}>
                        <Image source={icPin} style={styles.propRowPin} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.contactName} numberOfLines={1}>
                          {item.address}
                        </Text>
                        {item.when ? (
                          <Text style={styles.contactSub} numberOfLines={1}>
                            {item.when}
                          </Text>
                        ) : null}
                      </View>
                      <View
                        style={[
                          styles.propCheck,
                          selected && styles.propCheckOn,
                        ]}
                      >
                        {selected ? (
                          <Text style={styles.propCheckMark}>✓</Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
            <TouchableOpacity
              style={[
                styles.propShareBtn,
                selectedPropIds.length === 0 && styles.propShareBtnOff,
              ]}
              disabled={selectedPropIds.length === 0}
              activeOpacity={0.9}
              onPress={shareSelectedProperties}
            >
              <Text style={styles.propShareText}>
                {selectedPropIds.length
                  ? `Share ${selectedPropIds.length}`
                  : 'Share'}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Who reacted (tap a reaction chip) */}
      <Modal
        visible={!!reactionsMsg}
        transparent
        animationType="slide"
        onRequestClose={() => setReactionsMsg(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setReactionsMsg(null)}
        >
          <Pressable style={styles.actionSheet}>
            <Text style={styles.contactSheetTitle}>Reactions</Text>
            {(reactionsMsg?.reactions ?? []).length === 0 ? (
              <Text style={styles.contactEmpty}>No reactions yet.</Text>
            ) : (
              <FlatList
                data={reactionsMsg?.reactions ?? []}
                keyExtractor={(r, i) =>
                  String(r.id ?? `${r.user_id}-${r.reaction}-${i}`)
                }
                style={{ maxHeight: scaleWidth(340) }}
                renderItem={({ item: r }) => {
                  const isMe = r.user_id === myUserId;
                  const rName = isMe
                    ? 'You'
                    : conv?.participants?.find(p => p.user_id === r.user_id)
                        ?.user?.name ?? 'User';
                  return (
                    <TouchableOpacity
                      style={styles.reactorRow}
                      activeOpacity={isMe ? 0.6 : 1}
                      disabled={!isMe}
                      onPress={() => {
                        if (reactionsMsg && reactionsMsg.id > 0) {
                          wsReactToMessage(reactionsMsg.id, r.reaction, true);
                        }
                        setReactionsMsg(null);
                      }}
                    >
                      <View style={styles.reactorAvatar}>
                        <Text style={styles.contactInitial}>
                          {rName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reactorName} numberOfLines={1}>
                          {rName}
                        </Text>
                        {isMe ? (
                          <Text style={styles.reactorHint}>Tap to remove</Text>
                        ) : null}
                      </View>
                      <Text style={styles.reactorEmoji}>{r.reaction}</Text>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Full emoji picker (opened from the "+" in the quick-react row) */}
      <Modal
        visible={!!emojiPickerMsg}
        transparent
        animationType="slide"
        onRequestClose={() => setEmojiPickerMsg(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setEmojiPickerMsg(null)}
        >
          <Pressable style={styles.emojiSheet}>
            <Text style={styles.contactSheetTitle}>React</Text>
            <View style={styles.emojiSelectorWrap}>
              <EmojiSelector
                onEmojiSelected={emoji => {
                  if (emojiPickerMsg) {
                    toggleReaction(emojiPickerMsg, emoji);
                  }
                  setEmojiPickerMsg(null);
                }}
                showSearchBar
                showHistory={false}
                showTabs
                showSectionTitles
                columns={8}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ImageBackground>
  );
};

const shadow1 = {
  shadowColor: '#3d2014',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 4,
  elevation: 1,
};

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: appColors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(16),
    paddingBottom: scaleWidth(10),
    backgroundColor: appColors.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(61,32,20,0.07)',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: scaleWidth(10),
  },
  backIcon: {
    width: scaleWidth(20),
    height: scaleWidth(20),
    tintColor: appColors.coffeeDark,
    transform: [{ scaleX: -1 }],
  },
  headerName: { ...typography(700, 16, 'coffeeDark'), fontWeight: '700' },
  headerSub: { ...typography('regular', 12, 'gray'), marginTop: scaleWidth(1) },
  headerOnline: { color: appColors.success },
  headerTyping: { color: appColors.maroonLink, fontStyle: 'italic' },
  listContent: {
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleWidth(14),
    flexGrow: 1,
  },
  emptyChat: {
    ...typography('regular', 14, 'gray'),
    textAlign: 'center',
    marginTop: scaleWidth(60),
  },
  loadEarlier: { alignItems: 'center', paddingVertical: scaleWidth(10) },
  loadEarlierText: { ...typography(600, 12, 'maroon'), fontWeight: '600' },
  row: { flexDirection: 'row' },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  senderName: {
    ...typography(600, 11, 'maroon'),
    fontWeight: '600',
    marginLeft: scaleWidth(6),
    marginBottom: scaleWidth(2),
  },
  bubble: {
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
    ...shadow1,
  },
  textMine: {
    ...typography('regular', 14, 'white'),
    lineHeight: scaleWidth(20),
  },
  textTheirs: {
    ...typography('regular', 14, 'coffeeDark'),
    lineHeight: scaleWidth(20),
  },
  replyQuote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(8),
    borderLeftWidth: scaleWidth(3),
    borderRadius: scaleWidth(8),
    paddingVertical: scaleWidth(5),
    paddingHorizontal: scaleWidth(8),
    marginBottom: scaleWidth(6),
  },
  replyThumb: {
    width: scaleWidth(38),
    height: scaleWidth(38),
    borderRadius: scaleWidth(6),
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  replyTextCol: { flex: 1, minWidth: scaleWidth(40) },
  replyQuoteMine: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderLeftColor: 'rgba(255,255,255,0.75)',
  },
  replyQuoteTheirs: {
    backgroundColor: 'rgba(94,23,23,0.06)',
    borderLeftColor: appColors.maroon,
  },
  replyName: {
    ...typography(600, 11, 'coffeeDark'),
    fontWeight: '600',
    marginBottom: scaleWidth(1),
  },
  replyNameMine: { color: appColors.white },
  replyNameTheirs: { color: appColors.maroon },
  replyText: { ...typography('regular', 12, 'gray') },
  replyTextMine: { color: 'rgba(255,255,255,0.9)' },
  replyTextTheirs: { color: appColors.coffeeLight },
  imageAttach: {
    width: scaleWidth(200),
    height: scaleWidth(150),
    borderRadius: scaleWidth(10),
    marginBottom: scaleWidth(6),
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  // Shared-location card (WhatsApp-style: map preview + address footer).
  locCard: {
    width: scaleWidth(210),
    borderRadius: scaleWidth(12),
    overflow: 'hidden',
    marginBottom: scaleWidth(4),
    backgroundColor: appColors.white,
  },
  locMap: {
    width: '100%',
    height: scaleWidth(110),
    alignItems: 'center',
    justifyContent: 'center',
  },
  locMapImg: { resizeMode: 'cover' },
  locPin: {
    width: scaleWidth(30),
    height: scaleWidth(30),
    tintColor: appColors.maroon,
    resizeMode: 'contain',
    marginBottom: scaleWidth(10),
  },
  locFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleWidth(8),
    backgroundColor: appColors.white,
  },
  locFooterPin: {
    width: scaleWidth(16),
    height: scaleWidth(16),
    tintColor: appColors.maroon,
    resizeMode: 'contain',
    marginRight: scaleWidth(8),
  },
  locTitle: { ...typography(700, 13.5, 'coffeeDark'), fontWeight: '700' },
  locCoords: { ...typography('regular', 11.5, 'gray') },
  // Shared-property card
  propCard: {
    width: scaleWidth(240),
    borderRadius: scaleWidth(14),
    backgroundColor: appColors.white,
    padding: scaleWidth(10),
    marginBottom: scaleWidth(4),
  },
  propTop: { flexDirection: 'row', alignItems: 'center' },
  propIconTile: {
    width: scaleWidth(44),
    height: scaleWidth(44),
    borderRadius: scaleWidth(12),
    backgroundColor: 'rgba(94,23,23,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(10),
  },
  propPin: {
    width: scaleWidth(22),
    height: scaleWidth(22),
    tintColor: appColors.maroon,
    resizeMode: 'contain',
  },
  propTitle: { ...typography(700, 14.5, 'coffeeDark'), fontWeight: '700' },
  propSub: {
    ...typography('regular', 12, 'gray'),
    marginTop: scaleWidth(2),
  },
  propDist: {
    ...typography(700, 12.5, 'maroon'),
    fontWeight: '700',
    marginLeft: scaleWidth(8),
  },
  propMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scaleWidth(10),
    paddingVertical: scaleWidth(9),
    borderRadius: scaleWidth(10),
    backgroundColor: 'rgba(94,23,23,0.06)',
  },
  propMapIcon: {
    width: scaleWidth(15),
    height: scaleWidth(15),
    tintColor: appColors.maroon,
    resizeMode: 'contain',
    marginRight: scaleWidth(6),
  },
  propMapText: { ...typography(700, 13, 'maroon'), fontWeight: '700' },
  // Share-property picker sheet
  propSheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  propSheetHint: { ...typography('regular', 12, 'gray') },
  propRowIcon: {
    width: scaleWidth(40),
    height: scaleWidth(40),
    borderRadius: scaleWidth(10),
    backgroundColor: 'rgba(94,23,23,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(12),
  },
  propRowPin: {
    width: scaleWidth(20),
    height: scaleWidth(20),
    tintColor: appColors.maroon,
    resizeMode: 'contain',
  },
  propCheck: {
    width: scaleWidth(24),
    height: scaleWidth(24),
    borderRadius: scaleWidth(12),
    borderWidth: 1.6,
    borderColor: appColors.gray,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: scaleWidth(8),
  },
  propCheckOn: {
    backgroundColor: appColors.maroon,
    borderColor: appColors.maroon,
  },
  propCheckMark: { ...typography(700, 13, 'white'), fontWeight: '700' },
  propShareBtn: {
    marginTop: scaleWidth(12),
    paddingVertical: scaleWidth(13),
    borderRadius: scaleWidth(14),
    backgroundColor: appColors.maroon,
    alignItems: 'center',
  },
  propShareBtnOff: { backgroundColor: 'rgba(94,23,23,0.35)' },
  propShareText: { ...typography(700, 15, 'white'), fontWeight: '700' },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(8),
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: scaleWidth(10),
    padding: scaleWidth(8),
    marginBottom: scaleWidth(6),
    minWidth: scaleWidth(180),
  },
  fileChipMine: { backgroundColor: 'rgba(255,255,255,0.18)' },
  fileIcon: {
    width: scaleWidth(20),
    height: scaleWidth(20),
    tintColor: appColors.maroon,
  },
  fileName: { ...typography(600, 13, 'coffeeDark'), fontWeight: '600' },
  fileSize: { ...typography('regular', 11, 'gray') },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: scaleWidth(3),
    gap: scaleWidth(4),
  },
  edited: { ...typography('regular', 10, 'gray'), fontStyle: 'italic' },
  metaTime: { ...typography('regular', 10, 'gray') },
  metaTimeMine: { color: 'rgba(255,255,255,0.7)' },
  tick: {
    ...typography('regular', 11, 'gray'),
    color: 'rgba(255,255,255,0.7)',
  },
  tickRead: { color: appColors.primaryGreen ?? '#3ddc84' },
  ticks: { flexDirection: 'row', alignItems: 'center' },
  tickImg: {
    width: scaleWidth(15),
    height: scaleWidth(13),
    resizeMode: 'contain',
  },
  tickImgBack: { marginRight: -scaleWidth(9) },
  clockImg: {
    width: scaleWidth(12),
    height: scaleWidth(12),
    resizeMode: 'contain',
    tintColor: 'rgba(255,255,255,0.8)',
  },
  failMark: { ...typography(700, 12, 'white'), color: '#ffd2d2' },
  reactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scaleWidth(4),
    marginTop: scaleWidth(3),
    marginLeft: scaleWidth(6),
  },
  reactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(3),
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(12),
    paddingHorizontal: scaleWidth(7),
    paddingVertical: scaleWidth(2),
    ...shadow1,
  },
  reactChipMine: { borderWidth: 1, borderColor: appColors.maroon },
  reactEmoji: { fontSize: scaleWidth(13) },
  reactCount: { ...typography(600, 10, 'coffeeDark'), fontWeight: '600' },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.white,
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleWidth(8),
    borderTopWidth: 1,
    borderTopColor: 'rgba(61,32,20,0.07)',
  },
  replyBannerTitle: { ...typography(600, 12, 'maroon'), fontWeight: '600' },
  replyBannerText: { ...typography('regular', 12, 'gray') },
  replyBannerThumb: {
    width: scaleWidth(36),
    height: scaleWidth(36),
    borderRadius: scaleWidth(6),
    marginHorizontal: scaleWidth(8),
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  replyClose: {
    ...typography(700, 16, 'gray'),
    paddingHorizontal: scaleWidth(6),
  },
  attachStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scaleWidth(6),
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleWidth(8),
    backgroundColor: appColors.white,
    borderTopWidth: 1,
    borderTopColor: 'rgba(61,32,20,0.07)',
  },
  attachPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(6),
    maxWidth: scaleWidth(180),
    backgroundColor: appColors.background,
    borderRadius: scaleWidth(14),
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleWidth(5),
  },
  attachPillText: { ...typography('regular', 12, 'coffeeDark'), flexShrink: 1 },
  attachRemove: { ...typography(700, 12, 'gray') },
  attachThumbWrap: {
    width: scaleWidth(56),
    height: scaleWidth(56),
    borderRadius: scaleWidth(10),
    overflow: 'visible',
  },
  attachThumb: {
    width: scaleWidth(56),
    height: scaleWidth(56),
    borderRadius: scaleWidth(10),
    backgroundColor: appColors.background,
  },
  attachThumbRemove: {
    position: 'absolute',
    top: -scaleWidth(6),
    right: -scaleWidth(6),
    width: scaleWidth(20),
    height: scaleWidth(20),
    borderRadius: scaleWidth(10),
    backgroundColor: appColors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: appColors.white,
  },
  attachThumbRemoveText: {
    ...typography(700, 10, 'white'),
    lineHeight: scaleWidth(12),
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: scaleWidth(12),
    paddingTop: scaleWidth(8),
    backgroundColor: appColors.white,
    borderTopWidth: 1,
    borderTopColor: 'rgba(61,32,20,0.07)',
  },
  attachBtn: {
    width: scaleWidth(44),
    height: scaleWidth(44),
    borderRadius: scaleWidth(22),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(4),
  },
  attachIcon: { ...typography(700, 26, 'maroon'), marginTop: -scaleWidth(2) },
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
  sendBtnDisabled: { opacity: 0.5 },
  sendIcon: {
    width: scaleWidth(25),
    height: scaleWidth(25),
    resizeMode: 'contain',
    tintColor: appColors.white,
  },
  // Mic glyph (white, drawn on the maroon send button)
  micGlyph: { alignItems: 'center', justifyContent: 'center' },
  micBody: {
    width: scaleWidth(7.5),
    height: scaleWidth(12),
    borderRadius: scaleWidth(3.75),
    backgroundColor: appColors.white,
  },
  micStem: {
    width: scaleWidth(2),
    height: scaleWidth(3),
    marginTop: scaleWidth(1),
    backgroundColor: appColors.white,
  },
  micBase: {
    width: scaleWidth(11),
    height: scaleWidth(2),
    borderRadius: scaleWidth(1),
    backgroundColor: appColors.white,
  },
  // Recording bar
  recCancel: {
    width: scaleWidth(44),
    height: scaleWidth(44),
    borderRadius: scaleWidth(22),
    alignItems: 'center',
    justifyContent: 'center',
  },
  recTrashIcon: {
    width: scaleWidth(20),
    height: scaleWidth(20),
    tintColor: appColors.maroon,
    resizeMode: 'contain',
  },
  recMid: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(6),
  },
  recDot: {
    width: scaleWidth(10),
    height: scaleWidth(10),
    borderRadius: scaleWidth(5),
    backgroundColor: '#e53935',
    marginRight: scaleWidth(8),
  },
  recTime: {
    ...typography(700, 15, 'coffeeDark'),
    fontWeight: '700',
    minWidth: scaleWidth(46),
  },
  recHint: {
    ...typography('regular', 13, 'gray'),
    marginLeft: scaleWidth(6),
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: appColors.white,
    borderTopLeftRadius: scaleWidth(20),
    borderTopRightRadius: scaleWidth(20),
    paddingTop: scaleWidth(10),
    paddingBottom: scaleWidth(30),
    paddingHorizontal: scaleWidth(16),
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: scaleWidth(10),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(61,32,20,0.07)',
    marginBottom: scaleWidth(6),
  },
  emojiBig: { fontSize: scaleWidth(26) },
  emojiMore: {
    width: scaleWidth(34),
    height: scaleWidth(34),
    borderRadius: scaleWidth(17),
    backgroundColor: appColors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiMoreText: {
    ...typography(700, 20, 'coffeeDark'),
    marginTop: -scaleWidth(2),
  },
  emojiSheet: {
    backgroundColor: appColors.white,
    borderTopLeftRadius: scaleWidth(20),
    borderTopRightRadius: scaleWidth(20),
    paddingTop: scaleWidth(14),
    paddingHorizontal: scaleWidth(16),
    paddingBottom: scaleWidth(8),
  },
  emojiSelectorWrap: {
    height: scaleWidth(360),
    marginTop: scaleWidth(8),
  },
  actionItem: { paddingVertical: scaleWidth(14) },
  actionText: { ...typography(600, 15, 'coffeeDark'), fontWeight: '600' },
  actionDanger: { color: '#c0392b' },
  actionCancel: { alignItems: 'center', marginTop: scaleWidth(4) },
  contactSheetTitle: {
    ...typography(700, 16, 'coffeeDark'),
    fontWeight: '700',
    marginBottom: scaleWidth(10),
  },
  contactEmpty: {
    ...typography('regular', 13, 'gray'),
    textAlign: 'center',
    marginVertical: scaleWidth(20),
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleWidth(10),
  },
  contactAvatar: {
    width: scaleWidth(42),
    height: scaleWidth(42),
    borderRadius: scaleWidth(21),
    backgroundColor: appColors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(12),
  },
  contactInitial: { ...typography(700, 16, 'white'), fontWeight: '700' },
  contactName: { ...typography(600, 14, 'coffeeDark'), fontWeight: '600' },
  contactSub: {
    ...typography('regular', 12, 'gray'),
    marginTop: scaleWidth(1),
  },
  reactorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleWidth(10),
  },
  reactorAvatar: {
    width: scaleWidth(38),
    height: scaleWidth(38),
    borderRadius: scaleWidth(19),
    backgroundColor: appColors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(12),
  },
  reactorName: {
    ...typography(600, 14, 'coffeeDark'),
    fontWeight: '600',
  },
  reactorHint: {
    ...typography('regular', 11, 'gray'),
    marginTop: scaleWidth(1),
  },
  reactorEmoji: { fontSize: scaleWidth(22), marginLeft: scaleWidth(8) },
  dateSepRow: {
    alignItems: 'center',
    marginVertical: scaleWidth(10),
  },
  dateSep: {
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(12),
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleWidth(5),
    ...shadow1,
  },
  dateSepText: {
    ...typography(600, 12, 'coffeeLight'),
    fontWeight: '600',
  },
  typingRow: { marginTop: scaleWidth(6) },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleWidth(12),
    paddingHorizontal: scaleWidth(14),
  },
  typingBubbleText: {
    ...typography('regular', 12, 'gray'),
    fontStyle: 'italic',
    marginRight: scaleWidth(8),
  },
  dotsRow: { flexDirection: 'row', alignItems: 'center' },
  dot: {
    width: scaleWidth(7),
    height: scaleWidth(7),
    borderRadius: scaleWidth(3.5),
    backgroundColor: appColors.maroonLink,
    marginHorizontal: scaleWidth(2),
  },
});

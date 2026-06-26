import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Image,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {appColors, typography, scaleWidth} from '../global';
import {useAppSelector} from '../store';
import {
  isAuthenticatedSelector,
  userProfileSelector,
  userRoleSelector,
  currentSearchSelector,
} from '../slices';
import {chatQuery} from '../api/chat.api';
import {getDefaultAiModel} from '../api/llm.api';
import {navigationRef} from '../navigators/navigationRef';

const icChatBot = require('../assets/images/ic-chatbot.png');

// Pre-auth / onboarding screens where the chat button must never appear.
const HIDDEN_ROUTES = [
  'SplashScreen',
  'OnboardingScreen',
  'LoginScreen',
  'ForgotPassword',
  'SearchMap',
  'NearbyMap',
  'PropertyReport',
  'Messages',
  'Chat',
  'NewChat',
];

// Active TOP-LEVEL route name ('TabNavigator', 'NearbySearch', 'LoginScreen'…).
// The floating tab bar only exists inside 'TabNavigator'.
const getTopRoute = (): string | undefined => {
  if (!navigationRef.isReady()) {
    return undefined;
  }
  const state = navigationRef.getRootState();
  return state?.routes?.[state.index]?.name;
};

interface ChatMessage {
  from: 'bot' | 'user';
  text: string;
  source?: string;
}

const GREETING: ChatMessage = {
  from: 'bot',
  text: "Hi 👋 I'm your AI Property Assistant! Type an address, PIN, or question below to begin your search.",
};

// Floating "Munke Assist" chatbot, mirroring the web widget. Mounted once at the
// app root; only shows when the user is authenticated.
export const AIChatBot = () => {
  const insets = useSafeAreaInsets();
  const isAuthenticated = useAppSelector(isAuthenticatedSelector);
  const profile = useAppSelector(userProfileSelector);
  const userType = useAppSelector(userRoleSelector);
  const search = useAppSelector(currentSearchSelector);
  // The in-progress bar is only on screen while a search is actively running —
  // match that exactly so the chat button doesn't float when no bar is shown.
  const searchBarVisible =
    !!search.searchId && search.status === 'IN_PROGRESS';
  const userId = profile?.sub ?? '';

  // Track the active top-level route so we can hide on certain screens and know
  // whether the floating tab bar is on screen.
  const [topRoute, setTopRoute] = useState<string | undefined>(getTopRoute);
  useEffect(() => {
    const update = () => setTopRoute(getTopRoute());
    update();
    const unsub = navigationRef.addListener('state', update);
    return unsub;
  }, []);

  // Bottom offset: above the in-progress search bar if a search is running;
  // else above the floating tab bar on tab screens; else near the bottom edge
  // (stack screens like Nearby Search have no tab bar).
  const hasTabBar = topRoute === 'TabNavigator';
  // Use the same base the tab bar uses (max(insets, 12)) so the gap above the
  // tab bar / search bar is identical on every device (Pro vs non-Pro).
  const tabBase = Math.max(insets.bottom, scaleWidth(12));
  // Lift above the in-progress bar when it's showing; the bar sits at
  // tabBase + 74 on tab screens / insets + 14 on stack screens, and is ~60 tall.
  const fabBottom = searchBarVisible
    ? hasTabBar
      ? tabBase + scaleWidth(138)
      : insets.bottom + scaleWidth(78)
    : hasTabBar
    ? tabBase + scaleWidth(74)
    : insets.bottom + scaleWidth(24);

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [pending, setPending] = useState(false);
  const modelRef = useRef<string | undefined>(undefined);
  const scrollRef = useRef<ScrollView>(null);

  // Fetch the admin's default AI model once we know the user (same as the web).
  useEffect(() => {
    if (!userId) {
      return;
    }
    let alive = true;
    getDefaultAiModel(userId, userType)
      .then((res: any) => {
        if (alive) {
          modelRef.current = res?.[0]?.data?.llm_name;
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [userId, userType]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() =>
        scrollRef.current?.scrollToEnd({animated: true}),
      );
    }
  }, [messages, open]);

  const handleSend = useCallback(async () => {
    const question = input.trim();
    if (!question || pending) {
      return;
    }
    setMessages(prev => [...prev, {from: 'user', text: question}]);
    setInput('');
    setPending(true);
    try {
      const data = await chatQuery({
        question,
        userId,
        userType,
        modelName: modelRef.current,
      });
      setMessages(prev => [
        ...prev,
        {
          from: 'bot',
          text:
            data?.answer ||
            "Sorry, I couldn't get a response right now. Please try again.",
          source: data?.source_file_url,
        },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          from: 'bot',
          text: '⚠️ There was a problem reaching the server. Please try again later.',
        },
      ]);
    } finally {
      setPending(false);
    }
  }, [input, pending, userId, userType]);

  if (!isAuthenticated || (topRoute && HIDDEN_ROUTES.includes(topRoute))) {
    return null;
  }

  return (
    <>
      {/* Floating launcher button */}
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.fab, {bottom: fabBottom}]}
        onPress={() => setOpen(true)}>
        <Image source={icChatBot} style={styles.fabIcon} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.kav}
          pointerEvents="box-none">
          <View
            style={[styles.panel, {marginBottom: insets.bottom + scaleWidth(16)}]}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Munke Assist</Text>
              <TouchableOpacity
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                onPress={() => setOpen(false)}>
                <Text style={styles.headerClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <ScrollView
              ref={scrollRef}
              style={styles.messages}
              contentContainerStyle={styles.messagesContent}
              keyboardShouldPersistTaps="handled">
              {messages.map((m, i) => (
                <View
                  key={i}
                  style={[
                    styles.row,
                    m.from === 'user' ? styles.rowRight : styles.rowLeft,
                  ]}>
                  <View
                    style={[
                      styles.bubble,
                      m.from === 'user' ? styles.bubbleUser : styles.bubbleBot,
                    ]}>
                    <Text
                      style={
                        m.from === 'user'
                          ? styles.textUser
                          : styles.textBot
                      }>
                      {m.text}
                    </Text>
                    {m.from === 'bot' && m.source ? (
                      <Text
                        style={styles.sourceLink}
                        onPress={() => Linking.openURL(m.source!)}>
                        {m.source}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
              {pending ? (
                <View style={[styles.row, styles.rowLeft]}>
                  <View style={[styles.bubble, styles.bubbleBot]}>
                    <ActivityIndicator color={appColors.maroon} size="small" />
                  </View>
                </View>
              ) : null}
            </ScrollView>

            {/* Input */}
            <View style={styles.inputBar}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder="Type here..."
                placeholderTextColor={appColors.gray}
                returnKeyType="send"
                onSubmitEditing={handleSend}
                editable={!pending}
              />
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.sendBtn, pending && styles.sendBtnDisabled]}
                disabled={pending}
                onPress={handleSend}>
                <Text style={styles.sendText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: scaleWidth(18),
    width: scaleWidth(56),
    height: scaleWidth(56),
    borderRadius: scaleWidth(28),
    backgroundColor: appColors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3d2014',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 999,
  },
  fabIcon: {
    width: scaleWidth(30),
    height: scaleWidth(30),
    tintColor: appColors.white,
    resizeMode: 'contain',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  kav: {flex: 1, justifyContent: 'flex-end'},
  panel: {
    marginHorizontal: scaleWidth(14),
    height: scaleWidth(440),
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(18),
    overflow: 'hidden',
    shadowColor: '#3d2014',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    backgroundColor: appColors.maroon,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleWidth(13),
  },
  headerTitle: {...typography(700, 16, 'white'), fontWeight: '700'},
  headerClose: {color: appColors.white, fontSize: scaleWidth(16)},
  messages: {flex: 1, backgroundColor: appColors.white},
  messagesContent: {padding: scaleWidth(14), gap: scaleWidth(10)},
  row: {flexDirection: 'row'},
  rowLeft: {justifyContent: 'flex-start'},
  rowRight: {justifyContent: 'flex-end'},
  bubble: {
    maxWidth: '80%',
    borderRadius: scaleWidth(16),
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleWidth(9),
  },
  bubbleUser: {backgroundColor: appColors.maroon, borderBottomRightRadius: scaleWidth(4)},
  bubbleBot: {backgroundColor: '#F5F0EC', borderBottomLeftRadius: scaleWidth(4)},
  textUser: {...typography('regular', 14, 'white'), lineHeight: scaleWidth(20)},
  textBot: {...typography('regular', 14, 'coffeeDark'), lineHeight: scaleWidth(20)},
  sourceLink: {
    ...typography('regular', 12, 'maroonLink'),
    textDecorationLine: 'underline',
    marginTop: scaleWidth(6),
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleWidth(10),
    borderTopWidth: 1,
    borderTopColor: 'rgba(61,32,20,0.08)',
    backgroundColor: appColors.white,
  },
  input: {
    flex: 1,
    height: scaleWidth(44),
    borderWidth: 1.4,
    borderColor: appColors.inputBorder,
    borderRadius: scaleWidth(10),
    paddingHorizontal: scaleWidth(12),
    ...typography('regular', 14, 'coffeeDark'),
    marginRight: scaleWidth(8),
  },
  sendBtn: {
    height: scaleWidth(44),
    paddingHorizontal: scaleWidth(18),
    borderRadius: scaleWidth(10),
    backgroundColor: appColors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {opacity: 0.6},
  sendText: {...typography(600, 14, 'white'), fontWeight: '600'},
});

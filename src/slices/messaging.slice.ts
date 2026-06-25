import {createSlice, PayloadAction, createSelector} from '@reduxjs/toolkit';
import {RootState} from '../store/rootReducer';
import {
  CURRENT_USER_ID,
  MOCK_USERS,
  MOCK_CONVERSATIONS,
  MOCK_MESSAGES,
  MOCK_REPLIES,
  ChatUser,
  Conversation,
  Message,
  MessageStatus,
} from '../data/messagingData';

interface MessagingState {
  currentUserId: string;
  users: ChatUser[];
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  typing: Record<string, boolean>; // conversationId -> participant typing
}

const initialState: MessagingState = {
  currentUserId: CURRENT_USER_ID,
  users: MOCK_USERS,
  conversations: MOCK_CONVERSATIONS,
  messages: MOCK_MESSAGES,
  typing: {},
};

// Monotonic id generator for new messages (prototype only).
let msgSeq = 0;
const nextId = () => `m-local-${Date.now()}-${msgSeq++}`;
const convIdFor = (participantId: string) => `conv-${participantId}`;

const messagingSlice = createSlice({
  name: 'messaging',
  initialState,
  reducers: {
    // Ensure a conversation exists for a participant (idempotent).
    startConversation: (state, action: PayloadAction<string>) => {
      const participantId = action.payload;
      const id = convIdFor(participantId);
      if (!state.conversations.find(c => c.conversationId === id)) {
        state.conversations.unshift({
          conversationId: id,
          participantId,
          lastMessage: '',
          unreadCount: 0,
          updatedAt: Date.now(),
        });
      }
      if (!state.messages[id]) {
        state.messages[id] = [];
      }
    },

    // Append a message from the current user.
    sendMessage: (
      state,
      action: PayloadAction<{participantId: string; text: string}>,
    ) => {
      const {participantId, text} = action.payload;
      const id = convIdFor(participantId);
      const msg: Message = {
        id: nextId(),
        conversationId: id,
        senderId: state.currentUserId,
        text,
        timestamp: Date.now(),
        status: 'sent',
      };
      (state.messages[id] ||= []).push(msg);
      const c = state.conversations.find(x => x.conversationId === id);
      if (c) {
        c.lastMessage = text;
        c.updatedAt = msg.timestamp;
      }
    },

    // Mock: the other participant replies (used by the typing simulation).
    receiveMockReply: (
      state,
      action: PayloadAction<{participantId: string; text: string}>,
    ) => {
      const {participantId, text} = action.payload;
      const id = convIdFor(participantId);
      const msg: Message = {
        id: nextId(),
        conversationId: id,
        senderId: participantId,
        text,
        timestamp: Date.now(),
        status: 'read',
      };
      (state.messages[id] ||= []).push(msg);
      // Our previously-sent messages are now read.
      state.messages[id].forEach(m => {
        if (m.senderId === state.currentUserId) {
          m.status = 'read';
        }
      });
      const c = state.conversations.find(x => x.conversationId === id);
      if (c) {
        c.lastMessage = text;
        c.updatedAt = msg.timestamp;
      }
      state.typing[id] = false;
    },

    setTyping: (
      state,
      action: PayloadAction<{participantId: string; typing: boolean}>,
    ) => {
      state.typing[convIdFor(action.payload.participantId)] =
        action.payload.typing;
    },

    markConversationRead: (state, action: PayloadAction<string>) => {
      const id = convIdFor(action.payload);
      const c = state.conversations.find(x => x.conversationId === id);
      if (c) {
        c.unreadCount = 0;
      }
    },

    setMessageStatus: (
      state,
      action: PayloadAction<{
        participantId: string;
        messageId: string;
        status: MessageStatus;
      }>,
    ) => {
      const id = convIdFor(action.payload.participantId);
      const msg = state.messages[id]?.find(
        x => x.id === action.payload.messageId,
      );
      if (msg) {
        msg.status = action.payload.status;
      }
    },
  },
});

export const {
  startConversation,
  sendMessage,
  receiveMockReply,
  setTyping,
  markConversationRead,
  setMessageStatus,
} = messagingSlice.actions;

// ── Selectors ────────────────────────────────────────────────────────────────
const EMPTY_MESSAGES: Message[] = [];

export const messagingUsersSelector = (s: RootState) => s.messaging.users;
export const currentUserIdSelector = (s: RootState) =>
  s.messaging.currentUserId;

// Memoized so it returns a stable array reference until conversations change
// (an unmemoized sort() returns a new array every render → react-redux warns).
export const conversationsSortedSelector = createSelector(
  [(s: RootState) => s.messaging.conversations],
  conversations =>
    [...conversations].sort((a, b) => b.updatedAt - a.updatedAt),
);

export const totalUnreadSelector = (s: RootState) =>
  s.messaging.conversations.reduce((sum, c) => sum + c.unreadCount, 0);

export const userByIdSelector = (id: string) => (s: RootState) =>
  s.messaging.users.find(u => u.id === id);

export const conversationByParticipantSelector =
  (participantId: string) => (s: RootState) =>
    s.messaging.conversations.find(c => c.participantId === participantId);

export const messagesByParticipantSelector =
  (participantId: string) => (s: RootState) =>
    // Stable empty reference avoids a new [] each call.
    s.messaging.messages[`conv-${participantId}`] ?? EMPTY_MESSAGES;

export const typingByParticipantSelector =
  (participantId: string) => (s: RootState) =>
    !!s.messaging.typing[`conv-${participantId}`];

export const randomReply = () =>
  MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)];

export default messagingSlice.reducer;

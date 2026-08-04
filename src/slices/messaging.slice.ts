import {createSlice, PayloadAction, createSelector} from '@reduxjs/toolkit';
import {RootState} from '../store/rootReducer';
import type {
  WsConversation,
  WsMessage,
  WsReaction,
  WsGroup,
  MessageDeletedEvent,
  ReactionUpdatedEvent,
  MessagesReadEvent,
} from '../types/messaging';

interface MessagingState {
  connected: boolean;
  connecting: boolean;
  // Cognito `sub` of the signed-in user; used to resolve our numeric User.id
  // from the participant lists the backend returns.
  myCognitoSub: string | null;
  myUserId: number | null;
  conversations: WsConversation[];
  // conversationId -> messages (ascending by created_at).
  messages: Record<number, WsMessage[]>;
  // conversationId -> oldest message id loaded (cursor for older-page fetch),
  // or null when the start of history has been reached.
  cursors: Record<number, number | null>;
  historyLoaded: Record<number, boolean>;
  loadingConversations: boolean;
  loadingHistory: Record<number, boolean>;
  activeConversationId: number | null;
  // user_id -> presence (seeded from getConversations, updated by presenceUpdate).
  presence: Record<number, {online: boolean; lastSeen: string | null}>;
  // conversationId -> (userId -> {name, ts}) for live typing indicators.
  typing: Record<number, Record<number, {name: string; ts: number}>>;
  error: string | null;
}

const initialState: MessagingState = {
  connected: false,
  connecting: false,
  myCognitoSub: null,
  myUserId: null,
  conversations: [],
  messages: {},
  cursors: {},
  historyLoaded: {},
  loadingConversations: false,
  loadingHistory: {},
  activeConversationId: null,
  presence: {},
  typing: {},
  error: null,
};

const lastActivityTs = (c: WsConversation): number => {
  const t =
    c.lastMessageAt ??
    c.messages?.[0]?.created_at ??
    c.updated_at ??
    c.created_at;
  const ms = t ? new Date(t).getTime() : 0;
  return isNaN(ms) ? 0 : ms;
};

// Resolve our numeric User.id by matching the stored Cognito sub against any
// participant across the loaded conversations.
const resolveMyUserId = (state: MessagingState): number | null => {
  if (!state.myCognitoSub) {
    return state.myUserId;
  }
  for (const c of state.conversations) {
    for (const p of c.participants ?? []) {
      if (p.user?.cognito_id && p.user.cognito_id === state.myCognitoSub) {
        return p.user_id;
      }
    }
  }
  return state.myUserId;
};

// Find the conversation id that holds a given message id (delete/react events
// don't carry the conversation id).
const findConversationOfMessage = (
  state: MessagingState,
  messageId: number,
): number | undefined => {
  const id = Number(messageId);
  for (const key of Object.keys(state.messages)) {
    const cid = Number(key);
    if (state.messages[cid]?.some(m => Number(m.id) === id)) {
      return cid;
    }
  }
  return undefined;
};

const bumpConversation = (
  state: MessagingState,
  conversationId: number,
  msg: WsMessage,
  incrementUnread: boolean,
) => {
  const conv = state.conversations.find(c => c.id === conversationId);
  if (conv) {
    conv.messages = [msg];
    conv.lastMessageAt = msg.created_at;
    conv.updated_at = msg.created_at;
    if (incrementUnread) {
      conv.unreadCount = (conv.unreadCount ?? 0) + 1;
    }
  }
};

const messagingSlice = createSlice({
  name: 'messaging',
  initialState,
  reducers: {
    setConnecting: (state, action: PayloadAction<boolean>) => {
      state.connecting = action.payload;
    },
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.connected = action.payload;
      if (!action.payload) {
        state.connecting = false;
      }
    },
    setMyCognitoSub: (state, action: PayloadAction<string | null>) => {
      state.myCognitoSub = action.payload;
    },
    setLoadingConversations: (state, action: PayloadAction<boolean>) => {
      state.loadingConversations = action.payload;
    },
    setConversations: (state, action: PayloadAction<WsConversation[]>) => {
      // getConversations includes `group` WITHOUT its members. Preserve any
      // richer group.members we already loaded (from groupCreated / add/remove
      // events) so Group Info doesn't lose them on refresh.
      state.conversations = (action.payload ?? []).map(c => {
        if (c.type === 'GROUP' && c.group && !c.group.members?.length) {
          const existing = state.conversations.find(
            x => x.group?.id === c.group?.id,
          );
          if (existing?.group?.members?.length) {
            return {...c, group: {...c.group, members: existing.group.members}};
          }
        }
        return c;
      });
      state.loadingConversations = false;
      state.myUserId = resolveMyUserId(state);
      // Seed presence from whatever presence the backend included — nested
      // (user.userPresence.is_online) or flat (user.is_online).
      for (const c of state.conversations) {
        for (const p of c.participants ?? []) {
          const u = p.user as
            | (typeof p.user & {is_online?: boolean; last_seen_at?: string})
            | undefined;
          const up = u?.userPresence;
          const online = up?.is_online ?? u?.is_online;
          const lastSeen = up?.last_seen_at ?? u?.last_seen_at ?? null;
          if (online != null || lastSeen != null) {
            state.presence[p.user_id] = {online: !!online, lastSeen};
          }
        }
      }
    },
    upsertConversation: (state, action: PayloadAction<WsConversation>) => {
      const incoming = action.payload;
      const idx = state.conversations.findIndex(c => c.id === incoming.id);
      if (idx >= 0) {
        state.conversations[idx] = {...state.conversations[idx], ...incoming};
      } else {
        state.conversations.unshift(incoming);
      }
      state.myUserId = resolveMyUserId(state);
    },
    setLoadingHistory: (
      state,
      action: PayloadAction<{conversationId: number; loading: boolean}>,
    ) => {
      state.loadingHistory[action.payload.conversationId] =
        action.payload.loading;
    },
    // Initial history load (replaces) — messages arrive ascending.
    setHistory: (
      state,
      action: PayloadAction<{
        conversationId: number;
        messages: WsMessage[];
        nextCursor: number | null;
      }>,
    ) => {
      const {conversationId, messages, nextCursor} = action.payload;
      // Keep any optimistic (pending) messages that aren't yet on the server.
      const pending = (state.messages[conversationId] ?? []).filter(
        m => m._pending,
      );
      state.messages[conversationId] = [...messages, ...pending];
      state.cursors[conversationId] = nextCursor ?? null;
      state.historyLoaded[conversationId] = true;
      state.loadingHistory[conversationId] = false;
    },
    // Older page (prepend).
    prependHistory: (
      state,
      action: PayloadAction<{
        conversationId: number;
        messages: WsMessage[];
        nextCursor: number | null;
      }>,
    ) => {
      const {conversationId, messages, nextCursor} = action.payload;
      const existing = state.messages[conversationId] ?? [];
      const existingIds = new Set(existing.map(m => m.id));
      const older = messages.filter(m => !existingIds.has(m.id));
      state.messages[conversationId] = [...older, ...existing];
      state.cursors[conversationId] = nextCursor ?? null;
      state.loadingHistory[conversationId] = false;
    },
    // Optimistic local echo before the server confirms.
    addOptimisticMessage: (
      state,
      action: PayloadAction<{conversationId: number; message: WsMessage}>,
    ) => {
      const {conversationId, message} = action.payload;
      (state.messages[conversationId] ||= []).push(message);
      bumpConversation(state, conversationId, message, false);
    },
    // Flip an optimistic (background-uploading) message's state by clientId.
    updateOptimisticState: (
      state,
      action: PayloadAction<{
        conversationId: number;
        clientId: string;
        uploading?: boolean;
        failed?: boolean;
      }>,
    ) => {
      const {conversationId, clientId, uploading, failed} = action.payload;
      const m = state.messages[conversationId]?.find(
        x => x._clientId === clientId,
      );
      if (m) {
        if (uploading !== undefined) {
          m._uploading = uploading;
        }
        if (failed !== undefined) {
          m._failed = failed;
          if (failed) {
            m._pending = false;
          }
        }
      }
    },
    markOptimisticFailed: (
      state,
      action: PayloadAction<{conversationId: number; clientId: string}>,
    ) => {
      const list = state.messages[action.payload.conversationId];
      const m = list?.find(x => x._clientId === action.payload.clientId);
      if (m) {
        m._pending = false;
        m._failed = true;
      }
    },
    // A confirmed message from the server (newMessage event; includes our own
    // echo since the backend broadcasts to the sender too).
    addIncomingMessage: (state, action: PayloadAction<WsMessage>) => {
      const msg = action.payload;
      const cid = msg.conversation_id;
      const list = (state.messages[cid] ||= []);
      // Replace a matching optimistic message (same sender + content, still
      // pending) so our echo doesn't duplicate.
      const mine = state.myUserId != null && msg.sender_id === state.myUserId;
      if (mine) {
        const pIdx = list.findIndex(
          m =>
            m._pending &&
            m.sender_id === msg.sender_id &&
            (m.content ?? '') === (msg.content ?? '') &&
            (m.attachments?.length ?? 0) === (msg.attachments?.length ?? 0),
        );
        if (pIdx >= 0) {
          list[pIdx] = msg;
          bumpConversation(state, cid, msg, false);
          return;
        }
      }
      if (list.some(m => m.id === msg.id)) {
        return; // already have it
      }
      list.push(msg);
      const isActive = state.activeConversationId === cid;
      bumpConversation(state, cid, msg, !mine && !isActive);
    },
    applyEditedMessage: (state, action: PayloadAction<WsMessage>) => {
      const msg = action.payload;
      const list = state.messages[msg.conversation_id];
      const idx = list?.findIndex(m => m.id === msg.id) ?? -1;
      if (idx >= 0 && list) {
        list[idx] = {...list[idx], ...msg};
      }
    },
    applyDeletedMessage: (
      state,
      action: PayloadAction<MessageDeletedEvent>,
    ) => {
      const {messageId, deleteScope, deletedBy} = action.payload;
      const cid = findConversationOfMessage(state, messageId);
      if (cid == null) {
        return;
      }
      const m = state.messages[cid]?.find(x => Number(x.id) === Number(messageId));
      if (m) {
        m.deleted_at = new Date().toISOString();
        m.deleted_scope = deleteScope;
        m.content = null;
        m.attachments = [];
        (m as WsMessage & {deleted_by?: number}).deleted_by = deletedBy;
      }
      // Also reflect it on the conversation's embedded last message (list
      // preview) so the other side's chat list shows "deleted" without a reopen.
      const conv = state.conversations.find(c => c.id === cid);
      const last = conv?.messages?.[0];
      if (last && Number(last.id) === Number(messageId)) {
        last.deleted_at = new Date().toISOString();
        last.deleted_scope = deleteScope;
        last.content = null;
        last.attachments = [];
      }
    },
    applyReaction: (state, action: PayloadAction<ReactionUpdatedEvent>) => {
      const {messageId, reactions} = action.payload;
      const cid = findConversationOfMessage(state, messageId);
      if (cid == null) {
        return;
      }
      const m = state.messages[cid]?.find(x => Number(x.id) === Number(messageId));
      if (m) {
        m.reactions = reactions as WsReaction[];
      }
    },
    applyMessagesRead: (state, action: PayloadAction<MessagesReadEvent>) => {
      const {conversationId, readBy} = action.payload;
      const conv = state.conversations.find(c => c.id === conversationId);
      const p = conv?.participants?.find(x => x.user_id === readBy);
      if (p) {
        p.last_read_at = new Date().toISOString();
      }
    },
    setActiveConversation: (
      state,
      action: PayloadAction<number | null>,
    ) => {
      state.activeConversationId = action.payload;
    },
    // Locally zero the unread count when we open/read a conversation.
    markConversationReadLocally: (
      state,
      action: PayloadAction<number>,
    ) => {
      const conv = state.conversations.find(c => c.id === action.payload);
      if (conv) {
        conv.unreadCount = 0;
        const me = conv.participants?.find(p => p.user_id === state.myUserId);
        if (me) {
          me.last_read_at = new Date().toISOString();
        }
      }
    },
    applyGroupCreated: (state, action: PayloadAction<WsGroup>) => {
      const g = action.payload;
      const convId = g.conversation_id;
      const participants = g.conversation?.participants ??
        (g.members?.map(m => ({
          user_id: m.user_id,
          user: m.user,
        })) as WsConversation['participants']) ??
        [];
      const conv: WsConversation = {
        id: convId,
        type: 'GROUP',
        participants,
        group: g,
        messages: [],
        unreadCount: 0,
        lastMessageAt: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const idx = state.conversations.findIndex(c => c.id === convId);
      if (idx >= 0) {
        state.conversations[idx] = {...state.conversations[idx], ...conv};
      } else {
        state.conversations.unshift(conv);
      }
      state.myUserId = resolveMyUserId(state);
    },
    // Update a group's name / photo / description (from updateGroup).
    applyGroupUpdated: (
      state,
      action: PayloadAction<{
        groupId: number;
        name?: string | null;
        description?: string | null;
        image_key?: string | null;
        image_url?: string | null;
      }>,
    ) => {
      const {groupId, name, description, image_key, image_url} = action.payload;
      const conv = state.conversations.find(c => c.group?.id === groupId);
      if (conv?.group) {
        if (name != null) {
          conv.group.name = name;
        }
        if (description !== undefined) {
          conv.group.description = description;
        }
        if (image_key !== undefined) {
          conv.group.image_key = image_key;
        }
        if (image_url !== undefined) {
          conv.group.image_url = image_url;
        }
      }
    },
    applyGroupMembers: (
      state,
      action: PayloadAction<{group: WsGroup}>,
    ) => {
      const g = action.payload.group;
      const conv = state.conversations.find(
        c => c.group?.id === g.id || c.id === g.conversation_id,
      );
      if (conv) {
        conv.group = {...conv.group, ...g};
        if (g.members) {
          conv.participants = g.members.map(m => ({
            user_id: m.user_id,
            user: m.user,
          }));
        }
      }
    },
    // Remove a group conversation locally (e.g. we were removed / left).
    removeConversation: (state, action: PayloadAction<number>) => {
      state.conversations = state.conversations.filter(
        c => c.id !== action.payload,
      );
      delete state.messages[action.payload];
      delete state.cursors[action.payload];
      delete state.historyLoaded[action.payload];
    },
    // Online/offline + last-seen update (from a presenceUpdate event).
    applyPresence: (
      state,
      action: PayloadAction<{
        userId: number;
        is_online: boolean;
        last_seen_at?: string | null;
      }>,
    ) => {
      const {userId, is_online, last_seen_at} = action.payload;
      state.presence[userId] = {
        online: is_online,
        lastSeen:
          last_seen_at ?? state.presence[userId]?.lastSeen ?? null,
      };
    },
    // Live typing indicator (from a typing event).
    setTyping: (
      state,
      action: PayloadAction<{
        conversationId: number;
        userId: number;
        userName?: string | null;
        isTyping: boolean;
        ts: number;
      }>,
    ) => {
      const {conversationId, userId, userName, isTyping, ts} = action.payload;
      const conv = (state.typing[conversationId] ||= {});
      if (isTyping) {
        conv[userId] = {name: userName || 'Someone', ts};
      } else {
        delete conv[userId];
      }
    },
    setMessagingError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    // Full reset (logout / disconnect).
    resetMessaging: () => initialState,
  },
});

export const {
  setConnecting,
  setConnected,
  setMyCognitoSub,
  setLoadingConversations,
  setConversations,
  upsertConversation,
  setLoadingHistory,
  setHistory,
  prependHistory,
  addOptimisticMessage,
  updateOptimisticState,
  markOptimisticFailed,
  addIncomingMessage,
  applyEditedMessage,
  applyDeletedMessage,
  applyReaction,
  applyMessagesRead,
  setActiveConversation,
  markConversationReadLocally,
  applyGroupCreated,
  applyGroupUpdated,
  applyGroupMembers,
  removeConversation,
  applyPresence,
  setTyping,
  setMessagingError,
  resetMessaging,
} = messagingSlice.actions;

// ── Selectors ────────────────────────────────────────────────────────────────
const EMPTY_MESSAGES: WsMessage[] = [];

export const messagingConnectedSelector = (s: RootState) =>
  s.messaging.connected;
export const messagingConnectingSelector = (s: RootState) =>
  s.messaging.connecting;
export const myUserIdSelector = (s: RootState) => s.messaging.myUserId;
export const messagingErrorSelector = (s: RootState) => s.messaging.error;
export const messagingPresenceSelector = (s: RootState) => s.messaging.presence;
export const presenceOfSelector =
  (userId?: number | null) => (s: RootState) =>
    userId != null ? s.messaging.presence[userId] : undefined;
export const typingInSelector =
  (conversationId?: number | null) => (s: RootState) =>
    conversationId != null ? s.messaging.typing[conversationId] : undefined;
// Whole typing map (conversationId -> userId -> {name, ts}) for the list.
export const messagingTypingSelector = (s: RootState) => s.messaging.typing;
export const loadingConversationsSelector = (s: RootState) =>
  s.messaging.loadingConversations;
export const activeConversationIdSelector = (s: RootState) =>
  s.messaging.activeConversationId;

// Memoized so the sorted array reference is stable between unrelated renders.
export const conversationsSortedSelector = createSelector(
  [(s: RootState) => s.messaging.conversations],
  conversations =>
    [...conversations].sort((a, b) => lastActivityTs(b) - lastActivityTs(a)),
);

export const totalUnreadSelector = (s: RootState) =>
  s.messaging.conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);

export const messagesByConversationSelector =
  (conversationId?: number) => (s: RootState) =>
    conversationId != null
      ? s.messaging.messages[conversationId] ?? EMPTY_MESSAGES
      : EMPTY_MESSAGES;
// Whole messages map — used by the list to derive a rich last-message preview
// (with attachments) for chats whose embedded last message lacks them.
export const messagingMessagesSelector = (s: RootState) => s.messaging.messages;

export const conversationByIdSelector =
  (conversationId?: number) => (s: RootState) =>
    conversationId != null
      ? s.messaging.conversations.find(c => c.id === conversationId)
      : undefined;

export const historyLoadedSelector =
  (conversationId?: number) => (s: RootState) =>
    conversationId != null
      ? !!s.messaging.historyLoaded[conversationId]
      : false;

export const historyCursorSelector =
  (conversationId?: number) => (s: RootState) =>
    conversationId != null ? s.messaging.cursors[conversationId] ?? null : null;

export const loadingHistorySelector =
  (conversationId?: number) => (s: RootState) =>
    conversationId != null
      ? !!s.messaging.loadingHistory[conversationId]
      : false;

// Find an existing 1-1 conversation with a given other user (used to adopt the
// real conversation id after a brand-new chat's first message).
export const oneToOneWithSelector =
  (myUserId: number | null, otherUserId?: number) => (s: RootState) => {
    if (myUserId == null || otherUserId == null) {
      return undefined;
    }
    return s.messaging.conversations.find(
      c =>
        c.type === 'ONE_TO_ONE' &&
        c.participants?.some(p => p.user_id === otherUserId) &&
        c.participants?.some(p => p.user_id === myUserId),
    );
  };

export default messagingSlice.reducer;

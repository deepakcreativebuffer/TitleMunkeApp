import { store } from '../store';
import { WEBSOCKET_URL } from '../static';
import {
  setConnecting,
  setConnected,
  setMyCognitoSub,
  setLoadingConversations,
  setConversations,
  setLoadingHistory,
  setHistory,
  prependHistory,
  addIncomingMessage,
  applyEditedMessage,
  applyDeletedMessage,
  applyReaction,
  applyMessagesRead,
  applyGroupCreated,
  applyGroupUpdated,
  applyGroupMembers,
  removeConversation,
  applyPresence,
  setTyping,
  setMessagingError,
  resetMessaging,
} from '../slices/messaging.slice';
import type {
  WsConversation,
  WsMessage,
  WsGroup,
  AttachmentInput,
  GroupMembersEvent,
  ChatContact,
} from '../types/messaging';

/**
 * Long-lived WebSocket connection to titlemunke-websocket-<stage>.
 *
 * Delivery model (per POSTMAN_TESTING.md §7): a WebSocket API does NOT return the
 * Lambda `{statusCode, body}` to the client, so every reply is pushed back as a
 * typed frame `{type, data}` — the same shape as server broadcasts:
 *  - getConversations           → {type:'conversations',  data:[conversations]}
 *  - getMessageHistory          → {type:'messageHistory', data:[messages], nextCursor}
 *  - getUsersByRole             → {type:'usersByRole',    data:{role,count,users}}
 *  - getPresignedUrlForAttachment → {type:'presignedUrl', data:{uploadUrl,s3Key,...}}
 *  - broadcasts (newMessage, messageEdited, …) — sender is included, so our own
 *    mutations echo back.
 * We still tolerate a raw `{statusCode, body}` / bare body as a fallback.
 *
 * Modeled on services/fcm.ts: never throws to callers, best-effort, reconnects.
 */

interface PresignedWaiter {
  resolve: (v: any) => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

let ws: WebSocket | null = null;
let intentionalClose = false;
let reconnectAttempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let keepAliveTimer: ReturnType<typeof setInterval> | null = null;
// Safety timers so a missing read reply (e.g. backend route-response not yet
// deployed) clears the loading state instead of spinning forever.
let convLoadTimer: ReturnType<typeof setTimeout> | null = null;
const historyLoadTimers: Record<number, ReturnType<typeof setTimeout>> = {};
const outbox: object[] = [];
// One-shot listeners for the next event of a type (used by createGroup).
const onceListeners: Record<string, Array<(data: any) => void>> = {};
// conversationId -> whether the in-flight history request is an older page.
const historyMode: Record<number, 'initial' | 'older'> = {};
// FIFO of requested history conversationIds (to attribute empty replies that
// carry no conversationId — only needed for the bare route-response shape).
const historyQueue: number[] = [];
// FIFO of pending presigned-url requests.
const presignedWaiters: PresignedWaiter[] = [];

const REQUEST_TIMEOUT = 20000;
const LOADING_TIMEOUT = 12000; // clear a stuck loading spinner after this long
const KEEPALIVE_MS = 240000; // 4 min — under API Gateway's 10-min idle timeout
const MAX_BACKOFF = 30000;

const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
const log = (...a: unknown[]) => {
  if (isDev) {
    console.log('[ws]', ...a);
  }
};

const isOpen = () => ws?.readyState === WebSocket.OPEN;

// ── Outbound ────────────────────────────────────────────────────────────────
const sendRaw = (payload: object) => {
  const action = (payload as { action?: string }).action;
  if (isOpen()) {
    log('→ send', action ?? payload);
    ws!.send(JSON.stringify(payload));
  } else {
    log('⧗ queued (socket not open):', action ?? payload);
    outbox.push(payload);
    connectMessagingSocket();
  }
};

const flushOutbox = () => {
  while (outbox.length && isOpen()) {
    ws!.send(JSON.stringify(outbox.shift()));
  }
};

// ── Presigned request/response correlation (FIFO) ────────────────────────────
const registerPresigned = (): Promise<any> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const i = presignedWaiters.findIndex(w => w.timer === timer);
      if (i >= 0) {
        presignedWaiters.splice(i, 1);
      }
      reject(new Error('Request timed out'));
    }, REQUEST_TIMEOUT);
    presignedWaiters.push({ resolve, reject, timer });
  });

const takePresigned = (): PresignedWaiter | undefined => {
  const w = presignedWaiters.shift();
  if (w) {
    clearTimeout(w.timer);
  }
  return w;
};

// ── getUsersByRole (contact list) request/response correlation (FIFO) ─────────
interface UsersWaiter {
  resolve: (v: ChatContact[]) => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}
const usersWaiters: UsersWaiter[] = [];

const registerUsers = (): Promise<ChatContact[]> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const i = usersWaiters.findIndex(w => w.timer === timer);
      if (i >= 0) {
        usersWaiters.splice(i, 1);
      }
      reject(new Error('Request timed out'));
    }, REQUEST_TIMEOUT);
    usersWaiters.push({ resolve, reject, timer });
  });

const takeUsers = (): UsersWaiter | undefined => {
  const w = usersWaiters.shift();
  if (w) {
    clearTimeout(w.timer);
  }
  return w;
};

// Map raw user rows from getUsersByRole into ChatContacts. `id` MUST be the
// numeric Prisma User.id (the WebSocket's toUserId/memberUserIds are integers);
// rows without a numeric id are dropped.
const mapUsersToContacts = (rows: any): ChatContact[] => {
  const arr: any[] = Array.isArray(rows)
    ? rows
    : rows?.users ?? rows?.data ?? [];
  return arr
    .map((u: any) => {
      const id = Number(u?.id ?? u?.user_id ?? u?.userId);
      return {
        id,
        name: u?.name ?? u?.email ?? 'Unknown',
        email: u?.email ?? undefined,
        role: typeof u?.role === 'string' ? u.role.toLowerCase() : undefined,
        cognitoId: u?.cognito_id ?? u?.cognitoId ?? undefined,
      } as ChatContact;
    })
    .filter(c => Number.isFinite(c.id) && c.id > 0);
};

// ── Inbound routing ──────────────────────────────────────────────────────────
const safeParse = (raw: unknown): any => {
  if (typeof raw !== 'string') {
    return raw;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const routeMessage = (raw: string) => {
  const msg = safeParse(raw);
  if (!msg || typeof msg !== 'object') {
    log('← recv (unparsed)', String(raw).slice(0, 200));
    return;
  }
  log('← recv', msg.type ?? `reply(status ${msg.statusCode ?? '?'})`);
  // Typed frame (broadcasts + typed read replies).
  if (typeof msg.type === 'string') {
    handleTyped(msg.type, msg);
    return;
  }
  // Raw lambda-proxy result {statusCode, body}.
  if (typeof msg.statusCode === 'number') {
    const body = safeParse(msg.body) ?? msg.body ?? {};
    if (msg.statusCode >= 400) {
      const m = (body && body.message) || 'Request failed';
      store.dispatch(setMessagingError(m));
      takePresigned()?.reject(new Error(m));
      return;
    }
    handleBareReply(body);
    return;
  }
  // Bare reply body (API Gateway route-response $default).
  handleBareReply(msg);
};

const dispatchConversations = (list: WsConversation[]) => {
  if (convLoadTimer) {
    clearTimeout(convLoadTimer);
    convLoadTimer = null;
  }
  store.dispatch(setConversations(list));
};

const applyHistoryFrame = (
  conversationId: number | undefined,
  messages: WsMessage[],
  nextCursor: number | null,
) => {
  if (conversationId == null) {
    return;
  }
  if (historyLoadTimers[conversationId]) {
    clearTimeout(historyLoadTimers[conversationId]);
    delete historyLoadTimers[conversationId];
  }
  const qi = historyQueue.indexOf(conversationId);
  if (qi >= 0) {
    historyQueue.splice(qi, 1);
  }
  const mode = historyMode[conversationId] ?? 'initial';
  delete historyMode[conversationId];
  const payload = { conversationId, messages, nextCursor };
  store.dispatch(
    mode === 'older' ? prependHistory(payload) : setHistory(payload),
  );
};

// Typed frames: broadcasts AND (optionally) typed read replies.
const handleTyped = (type: string, frame: any) => {
  const data = frame?.data;
  emitOnce(type, data);
  switch (type) {
    // ── Typed read replies (if the backend postToConnection's them) ──
    // getConversations reply — data is the conversations array.
    case 'conversations':
    case 'conversationsList':
      dispatchConversations((data as WsConversation[]) ?? []);
      return;
    // getMessageHistory reply — {type, data:[messages], nextCursor} (fields
    // spread on the frame). No conversationId in the frame, so derive it from
    // the first message, falling back to the oldest in-flight history request
    // (needed when the page is empty).
    case 'messageHistory': {
      const msgs: WsMessage[] = Array.isArray(data)
        ? (data as WsMessage[])
        : Array.isArray(data?.data)
        ? (data.data as WsMessage[])
        : [];
      const nextCursor =
        ((Array.isArray(data) ? frame.nextCursor : data?.nextCursor ?? frame.nextCursor) as
          | number
          | null) ?? null;
      const conversationId =
        frame.conversationId ?? msgs[0]?.conversation_id ?? historyQueue[0];
      applyHistoryFrame(conversationId, msgs, nextCursor);
      return;
    }
    case 'presignedUrl':
      takePresigned()?.resolve(data ?? frame);
      return;
    // getUsersByRole reply — data is { role, count, users:[...] }.
    case 'usersByRole':
    case 'usersList': {
      const rows: any[] = Array.isArray(data)
        ? data
        : data?.users ?? data?.data ?? [];
      // Seed presence if the backend included it on the user rows.
      for (const u of rows) {
        const up = u?.userPresence;
        const online = up?.is_online ?? u?.is_online;
        const lastSeen = up?.last_seen_at ?? u?.last_seen_at ?? null;
        if (u?.id != null && (online != null || lastSeen != null)) {
          store.dispatch(
            applyPresence({
              userId: Number(u.id),
              is_online: !!online,
              last_seen_at: lastSeen,
            }),
          );
        }
      }
      takeUsers()?.resolve(mapUsersToContacts(rows));
      return;
    }
    case 'error': {
      const m = data?.message || 'Request failed';
      store.dispatch(setMessagingError(m));
      if (data?.action === 'getConversations') {
        store.dispatch(setLoadingConversations(false));
      }
      if (data?.action === 'getPresignedUrlForAttachment') {
        takePresigned()?.reject(new Error(m));
      }
      return;
    }
    // ── Broadcasts ──
    case 'newMessage': {
      const msg = data as WsMessage;
      store.dispatch(addIncomingMessage(msg));
      const known = store
        .getState()
        .messaging.conversations.some(c => c.id === msg.conversation_id);
      if (!known) {
        wsGetConversations();
      } else if (
        // sendMessage broadcasts attachments WITHOUT a signed URL. If any
        // attachment lacks one, refetch history (which IS signed) so the
        // image/file can actually be opened. Self-disables once the backend
        // signs attachments in the newMessage broadcast too.
        (msg.attachments ?? []).some(
          a => a.file_key && !a.url && !a.signed_url && !a.download_url,
        )
      ) {
        wsGetMessageHistory({conversationId: msg.conversation_id});
      }
      return;
    }
    case 'messageEdited':
      store.dispatch(applyEditedMessage(data as WsMessage));
      return;
    case 'messageDeleted':
      store.dispatch(applyDeletedMessage(data));
      return;
    case 'messageReactionUpdated':
      store.dispatch(applyReaction(data));
      return;
    case 'messagesRead':
      store.dispatch(applyMessagesRead(data));
      return;
    case 'presenceChanged':
    case 'presenceUpdate':
    case 'presence': {
      // Backend sends {userId, isOnline, lastSeenAt} (camelCase); tolerate
      // snake_case too.
      if (data?.userId != null) {
        store.dispatch(
          applyPresence({
            userId: data.userId,
            is_online: data.isOnline ?? data.is_online ?? false,
            last_seen_at: data.lastSeenAt ?? data.last_seen_at ?? null,
          }),
        );
      }
      return;
    }
    case 'typing': {
      // {conversationId, groupId, userId, userName, isTyping}
      let conversationId: number | undefined = data?.conversationId;
      if (conversationId == null && data?.groupId != null) {
        conversationId = store
          .getState()
          .messaging.conversations.find(c => c.group?.id === data.groupId)?.id;
      }
      if (conversationId != null && data?.userId != null) {
        store.dispatch(
          setTyping({
            conversationId,
            userId: data.userId,
            userName: data.userName,
            isTyping: !!data.isTyping,
            ts: Date.now(),
          }),
        );
      }
      return;
    }
    case 'groupCreated':
      store.dispatch(applyGroupCreated(data as WsGroup));
      wsGetConversations();
      return;
    case 'groupUpdated': {
      const g = data as WsGroup;
      store.dispatch(
        applyGroupUpdated({
          groupId: g.id,
          name: g.name,
          description: g.description,
          image_key: g.image_key,
          image_url: g.image_url,
        }),
      );
      return;
    }
    case 'memberAddedToGroup': {
      const e = data as GroupMembersEvent;
      store.dispatch(applyGroupMembers({ group: e.group }));
      wsGetConversations();
      return;
    }
    case 'memberRemovedFromGroup': {
      const e = data as GroupMembersEvent;
      const myUserId = store.getState().messaging.myUserId;
      if (myUserId != null && e.removedMembers?.includes(myUserId)) {
        store.dispatch(removeConversation(e.group.conversation_id));
      } else {
        store.dispatch(applyGroupMembers({ group: e.group }));
      }
      return;
    }
    default:
      log('unknown event', type);
  }
};

// Raw handler-return reply ({statusCode<400} unwrapped body, or a bare body).
// These are the direct responses to OUR requests (NOT wrapped in `type`).
const handleBareReply = (body: any) => {
  if (!body || typeof body !== 'object') {
    return;
  }

  // getPresignedUrlForAttachment → { uploadUrl, s3Key, fileName, ... }
  if (body.uploadUrl) {
    takePresigned()?.resolve(body);
    return;
  }

  const data = body.data;

  // getUsersByRole → { data: { role, count, users: [ ... ] } }
  if (data && !Array.isArray(data) && Array.isArray(data.users)) {
    takeUsers()?.resolve(mapUsersToContacts(data.users));
    return;
  }

  // getConversations → { data: [conversations] }
  // getMessageHistory → { data: [messages], nextCursor }
  if (Array.isArray(data)) {
    const first = data[0];
    const isConv = first && 'type' in first && 'participants' in first;
    const isMsg = first && ('sender_id' in first || 'conversation_id' in first);
    if (isConv) {
      dispatchConversations(data as WsConversation[]);
      return;
    }
    if (isMsg) {
      applyHistoryFrame(
        data[0].conversation_id,
        data as WsMessage[],
        body.nextCursor ?? null,
      );
      return;
    }
    // Empty array — attribute to the oldest in-flight history request if any.
    // Otherwise it's ambiguous (an empty history page vs an empty conversation
    // list): do NOT wipe the conversation list here — a real getConversations
    // reply arrives as a typed `conversations` frame (which handles the empty
    // case). Treating a stray empty array as "no conversations" would blank out
    // a populated list (e.g. after opening a chat with no messages yet).
    if (historyQueue.length) {
      applyHistoryFrame(historyQueue[0], [], body.nextCursor ?? null);
    }
    return;
  }

  // sendMessage → { message:"Message sent", data:<message> }. Echo it so the
  // sender sees their own message even if the broadcast doesn't include them
  // (idempotent — addIncomingMessage ignores ids it already has / reconciles an
  // optimistic one).
  if (
    data &&
    typeof data === 'object' &&
    data.id != null &&
    data.conversation_id != null &&
    data.sender_id != null
  ) {
    store.dispatch(addIncomingMessage(data as WsMessage));
    return;
  }

  // Any other ack (e.g. { message:"Marked as read successfully" }) is
  // informational — the matching broadcast event updates state. It is NOT an
  // error (real errors come via statusCode>=400 or a {type:'error'} frame).
};

// ── One-shot event listeners ─────────────────────────────────────────────────
const onceEvent = (type: string): Promise<any> =>
  new Promise(resolve => {
    (onceListeners[type] ||= []).push(resolve);
  });

const emitOnce = (type: string, data: any) => {
  const ls = onceListeners[type];
  if (ls && ls.length) {
    onceListeners[type] = [];
    ls.forEach(fn => fn(data));
  }
};

// ── Lifecycle ────────────────────────────────────────────────────────────────
export const connectMessagingSocket = (): void => {
  const state = store.getState();
  const token = state.user.token;
  const sub = state.user.user?.sub ?? null;
  if (!token) {
    log('no token, skip connect');
    return;
  }
  if (
    ws &&
    (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }
  intentionalClose = false;
  store.dispatch(setMyCognitoSub(sub));
  store.dispatch(setConnecting(true));

  const url = `${WEBSOCKET_URL}?token=${encodeURIComponent(token)}`;
  try {
    ws = new WebSocket(url);
  } catch (e) {
    log('construct failed', e);
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    log('open');
    reconnectAttempts = 0;
    store.dispatch(setConnected(true));
    store.dispatch(setMessagingError(null));
    flushOutbox();
    startKeepAlive();
    wsGetConversations();
  };
  ws.onmessage = e => routeMessage(e.data as string);
  ws.onerror = e => log('error', (e as any)?.message ?? e);
  ws.onclose = () => {
    log('close');
    store.dispatch(setConnected(false));
    stopKeepAlive();
    ws = null;
    if (!intentionalClose) {
      scheduleReconnect();
    }
  };
};

export const disconnectMessagingSocket = (): void => {
  intentionalClose = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  stopKeepAlive();
  if (convLoadTimer) {
    clearTimeout(convLoadTimer);
    convLoadTimer = null;
  }
  Object.values(historyLoadTimers).forEach(clearTimeout);
  Object.keys(historyLoadTimers).forEach(
    k => delete historyLoadTimers[Number(k)],
  );
  outbox.length = 0;
  historyQueue.length = 0;
  // Fail any in-flight presigned / users requests.
  while (presignedWaiters.length) {
    takePresigned()?.reject(new Error('Disconnected'));
  }
  while (usersWaiters.length) {
    takeUsers()?.reject(new Error('Disconnected'));
  }
  try {
    ws?.close();
  } catch {
    /* noop */
  }
  ws = null;
  store.dispatch(resetMessaging());
};

// Reconnect only while authenticated (e.g. after a dropped connection).
export const ensureMessagingSocket = (): void => {
  if (!store.getState().user.token) {
    return;
  }
  if (!isOpen()) {
    connectMessagingSocket();
  }
};

const scheduleReconnect = () => {
  if (reconnectTimer || intentionalClose) {
    return;
  }
  if (!store.getState().user.token) {
    return; // logged out
  }
  const delay = Math.min(1000 * 2 ** reconnectAttempts, MAX_BACKOFF);
  reconnectAttempts += 1;
  log('reconnect in', delay);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectMessagingSocket();
  }, delay);
};

const startKeepAlive = () => {
  stopKeepAlive();
  keepAliveTimer = setInterval(() => {
    if (isOpen()) {
      ws!.send(JSON.stringify({ action: 'ping' }));
    }
  }, KEEPALIVE_MS);
};
const stopKeepAlive = () => {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
};

// ── Public API (one function per route) ──────────────────────────────────────
// Reads are fire-and-forget: the reply frame is dispatched into redux by the
// router regardless of which delivery shape the backend uses.
export const wsGetConversations = (): void => {
  store.dispatch(setMessagingError(null));
  store.dispatch(setLoadingConversations(true));
  if (convLoadTimer) {
    clearTimeout(convLoadTimer);
  }
  convLoadTimer = setTimeout(() => {
    convLoadTimer = null;
    if (store.getState().messaging.loadingConversations) {
      // Just stop the spinner and show the normal "no conversations" empty
      // state. We intentionally do NOT set an error here: a silent timeout is
      // indistinguishable from an empty inbox, so surfacing "couldn't load"
      // would be misleading. Real failures still come via an `error` frame.
      store.dispatch(setLoadingConversations(false));
    }
  }, LOADING_TIMEOUT);
  sendRaw({ action: 'getConversations' });
};

export const wsGetMessageHistory = (opts: {
  conversationId: number;
  limit?: number;
  cursor?: number | null;
  older?: boolean;
}): void => {
  const { conversationId } = opts;
  store.dispatch(setLoadingHistory({ conversationId, loading: true }));
  historyMode[conversationId] = opts.older ? 'older' : 'initial';
  if (!historyQueue.includes(conversationId)) {
    historyQueue.push(conversationId);
  }
  if (historyLoadTimers[conversationId]) {
    clearTimeout(historyLoadTimers[conversationId]);
  }
  historyLoadTimers[conversationId] = setTimeout(() => {
    delete historyLoadTimers[conversationId];
    if (store.getState().messaging.loadingHistory[conversationId]) {
      store.dispatch(setLoadingHistory({ conversationId, loading: false }));
    }
  }, LOADING_TIMEOUT);
  sendRaw({
    action: 'getMessageHistory',
    conversationId: opts.conversationId,
    limit: opts.limit ?? 50,
    ...(opts.cursor != null ? { cursor: opts.cursor } : {}),
  });
};

export const wsSendMessage = (opts: {
  conversationId?: number;
  toUserId?: number;
  groupId?: number;
  content?: string;
  replyToId?: number;
  attachments?: AttachmentInput[];
}): void => {
  sendRaw({
    action: 'sendMessage',
    ...(opts.conversationId != null
      ? { conversationId: opts.conversationId }
      : {}),
    ...(opts.toUserId != null ? { toUserId: opts.toUserId } : {}),
    ...(opts.groupId != null ? { groupId: opts.groupId } : {}),
    ...(opts.content ? { content: opts.content } : {}),
    ...(opts.replyToId != null ? { replyToId: opts.replyToId } : {}),
    ...(opts.attachments?.length ? { attachments: opts.attachments } : {}),
  });
};

export const wsEditMessage = (messageId: number, content: string): void =>
  sendRaw({ action: 'editMessage', messageId, content });

export const wsDeleteMessage = (messageId: number): void =>
  sendRaw({ action: 'deleteMessage', messageId });

export const wsReactToMessage = (
  messageId: number,
  reaction: string,
  remove = false,
): void => sendRaw({ action: 'reactToMessage', messageId, reaction, remove });

export const wsMarkAsRead = (conversationId: number): void =>
  sendRaw({ action: 'markAsRead', conversationId });

// Relay a typing indicator (ephemeral; provide exactly one target).
export const wsTyping = (opts: {
  conversationId?: number;
  groupId?: number;
  toUserId?: number;
  isTyping: boolean;
}): void =>
  sendRaw({
    action: 'typing',
    ...(opts.conversationId != null ? { conversationId: opts.conversationId } : {}),
    ...(opts.groupId != null ? { groupId: opts.groupId } : {}),
    ...(opts.toUserId != null ? { toUserId: opts.toUserId } : {}),
    isTyping: opts.isTyping,
  });

export const wsCreateGroup = (opts: {
  name: string;
  description?: string;
  memberUserIds: number[];
}): Promise<WsGroup> => {
  const done = onceEvent('groupCreated');
  sendRaw({
    action: 'createGroup',
    name: opts.name,
    ...(opts.description ? { description: opts.description } : {}),
    memberUserIds: opts.memberUserIds,
  });
  return done;
};

// Rename / change photo of a group (group admins only, enforced server-side).
export const wsUpdateGroup = (opts: {
  groupId: number;
  name?: string;
  description?: string;
  imageKey?: string;
}): void =>
  sendRaw({
    action: 'updateGroup',
    groupId: opts.groupId,
    ...(opts.name != null ? { name: opts.name } : {}),
    ...(opts.description != null ? { description: opts.description } : {}),
    ...(opts.imageKey != null ? { imageKey: opts.imageKey } : {}),
  });

export const wsAddGroupMember = (groupId: number, userIds: number[]): void =>
  sendRaw({ action: 'addGroupMember', groupId, userIds });

export const wsRemoveGroupMember = (groupId: number, userIds: number[]): void =>
  sendRaw({ action: 'removeGroupMember', groupId, userIds });

// Contact list: chat-eligible users (with numeric ids) for the signed-in user.
export const wsGetUsersByRole = (): Promise<ChatContact[]> => {
  const p = registerUsers();
  sendRaw({ action: 'getUsersByRole' });
  return p;
};

export const wsGetPresignedUrl = (opts: {
  fileName: string;
  fileType: string;
  fileSize?: number;
}): Promise<{ uploadUrl: string; s3Key: string }> => {
  const p = registerPresigned();
  sendRaw({
    action: 'getPresignedUrlForAttachment',
    fileName: opts.fileName,
    fileType: opts.fileType,
    ...(opts.fileSize != null ? { fileSize: opts.fileSize } : {}),
  });
  return p;
};

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * BACKEND REQUIREMENT (websocket-service) — reads are NOT reaching the client
 * ─────────────────────────────────────────────────────────────────────────────
 * The getConversations / getMessageHistory / getPresignedUrlForAttachment
 * handlers `return {statusCode, body}`, but the WebSocket routes have NO
 * `routeResponseSelectionExpression`, so API Gateway discards the return value —
 * the client receives nothing (hence the earlier "Request timed out").
 * Mutations already work because they broadcast via postToConnection.
 *
 * Apply EITHER fix (client already supports both shapes):
 *
 * (A) Minimal, config-only — add a route response to the 3 read routes in each
 *     function's serverless.yml, then redeploy:
 *         events:
 *           - websocket:
 *               route: getConversations
 *               routeResponseSelectionExpression: $default
 *     (repeat for getMessageHistory and getPresignedUrlForAttachment)
 *     → the client receives the handler's `body` and routes it by shape.
 *
 * (B) Explicit — in each read handler, before returning, push the result to the
 *     caller's connectionId via postToConnection with a typed frame:
 *         { type: 'conversationsList', data }
 *         { type: 'messageHistory', data, nextCursor, conversationId }
 *         { type: 'presignedUrl', data: { uploadUrl, s3Key, fileName, fileType, fileSize } }
 *     (and { type:'error', data:{ action, message } } on failure)
 *
 * Also required for New Chat / groups: the REST user-list endpoints must return
 * the numeric Prisma User.id (they currently return cognito_id as `id`), since
 * toUserId / memberUserIds are integers.
 * ─────────────────────────────────────────────────────────────────────────────
 */

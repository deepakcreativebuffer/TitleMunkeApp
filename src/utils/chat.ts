import type {
  WsConversation,
  WsMessage,
  WsParticipant,
  WsAttachment,
  WsUser,
} from '../types';

// The "other" participant in a 1-1 conversation (relative to me).
export const otherParticipant = (
  conv: WsConversation | undefined,
  myUserId: number | null,
): WsParticipant | undefined =>
  conv?.participants?.find(p => p.user_id !== myUserId);

export const conversationTitle = (
  conv: WsConversation | undefined,
  myUserId: number | null,
): string => {
  if (!conv) {
    return '';
  }
  if (conv.type === 'GROUP') {
    return conv.group?.name ?? 'Group';
  }
  return otherParticipant(conv, myUserId)?.user?.name ?? 'Unknown';
};

// Stable avatar seed + name (+ optional photo) for a conversation row/header.
// `imageKey` is the STABLE S3 key used to cache the image to disk (the signed
// `imageUrl` rotates, so it can't be a cache key).
export const conversationAvatar = (
  conv: WsConversation | undefined,
  myUserId: number | null,
): {name: string; id: string; imageUrl?: string; imageKey?: string} => {
  if (conv?.type === 'GROUP') {
    const key = conv.group?.image_key ?? undefined;
    return {
      name: conv.group?.name ?? 'Group',
      id: `g${conv.id}`,
      imageUrl: conv.group?.image_url ?? (key ? attachmentUrl(key) : undefined),
      imageKey: key,
    };
  }
  const other = otherParticipant(conv, myUserId);
  return {
    name: other?.user?.name ?? 'Unknown',
    id: `u${other?.user_id ?? conv?.id ?? 0}`,
    imageUrl: userImageUrl(other?.user),
    imageKey: other?.user?.profile_image_key ?? undefined,
  };
};

// The URL to load a user's profile photo. Prefers the backend-signed URL (works
// with a private bucket); falls back to a public URL from the key (only works
// if the bucket/object is public — otherwise 403s and the avatar shows initials).
export const userImageUrl = (user?: WsUser): string | undefined => {
  if (user?.profile_image_url) {
    return user.profile_image_url;
  }
  return user?.profile_image_key
    ? attachmentUrl(user.profile_image_key)
    : undefined;
};

// One-line preview of a single message.
export const messagePreview = (m?: WsMessage): string => {
  if (!m) {
    return '';
  }
  if (m.deleted_at) {
    return 'This message was deleted';
  }
  if (m.content) {
    return parseSharedLocation(m.content) ? '📍 Location' : m.content;
  }
  const atts = m.attachments;
  if (atts?.length) {
    if (atts.some(a => a.file_type?.startsWith('audio'))) {
      return '🎤 Voice message';
    }
    if (atts.length > 1) {
      return `📎 ${atts.length} attachments`;
    }
    const t = atts[0].file_type;
    if (t?.startsWith('image')) {
      return '📷 Photo';
    }
    if (t?.startsWith('video')) {
      return '🎥 Video';
    }
    return '📄 Document';
  }
  return '';
};

// Preview of a conversation's last message (from getConversations). For groups
// it's prefixed with the sender ("Alex: …" / "You: …") like WhatsApp.
// `lastMsg` overrides the conversation's embedded last message — the list passes
// the fully-loaded message (with attachments) when available, so audio/image/
// document previews resolve even if getConversations didn't include attachments.
export const conversationPreview = (
  conv: WsConversation,
  myUserId?: number | null,
  lastMsg?: WsMessage,
): string => {
  const m = lastMsg ?? conv.messages?.[0];
  const text = messagePreview(m);
  if (!m || !text || conv.type !== 'GROUP') {
    return text;
  }
  const who =
    m.sender_id === myUserId
      ? 'You'
      : (m.sender?.name ?? '').split(' ')[0] || m.sender?.name;
  return who ? `${who}: ${text}` : text;
};

// If a message is a shared location (contains a maps link with q=lat,lng),
// pull out the coordinates + the openable URL. Used to render a location card.
export const parseSharedLocation = (
  content?: string | null,
): {lat: number; lng: number; url: string} | null => {
  if (!content) {
    return null;
  }
  const m = content.match(
    /https?:\/\/[^\s]*[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
  );
  if (!m) {
    return null;
  }
  return {lat: parseFloat(m[1]), lng: parseFloat(m[2]), url: m[0]};
};

// Whether a (soft-deleted) message should be hidden for me.
//   BOTH        → hidden for everyone
//   SENDER_ONLY → hidden only for the sender
export const isMessageHiddenForMe = (
  m: WsMessage,
  myUserId: number | null,
): boolean => {
  if (!m.deleted_at) {
    return false;
  }
  if (m.deleted_scope === 'SENDER_ONLY') {
    return m.sender_id === myUserId;
  }
  return true; // BOTH
};

// Whether the given message is still within its 15-minute edit window.
export const withinEditWindow = (m: WsMessage): boolean => {
  const created = new Date(m.created_at).getTime();
  return !isNaN(created) && Date.now() - created < 15 * 60 * 1000;
};

// Fallback public S3 URL for an attachment key. Only works if the bucket/object
// is public — a private object needs a signed URL (see attachmentViewUrl).
export const attachmentUrl = (fileKey: string): string =>
  `https://titlemunke-dev.s3.amazonaws.com/${fileKey}`;

// The URL to actually open/preview an attachment. Prefer a signed GET URL the
// backend attached to the message (works with a private bucket); fall back to
// the raw key URL only if no signed URL was provided.
export const attachmentViewUrl = (a: WsAttachment): string =>
  a.url ?? a.signed_url ?? a.download_url ?? attachmentUrl(a.file_key);

// Group reactions into { emoji: count } with whether I reacted.
export const groupReactions = (
  m: WsMessage,
  myUserId: number | null,
): Array<{reaction: string; count: number; mine: boolean}> => {
  const map = new Map<string, {count: number; mine: boolean}>();
  for (const r of m.reactions ?? []) {
    const cur = map.get(r.reaction) ?? {count: 0, mine: false};
    cur.count += 1;
    if (r.user_id === myUserId) {
      cur.mine = true;
    }
    map.set(r.reaction, cur);
  }
  return Array.from(map.entries()).map(([reaction, v]) => ({reaction, ...v}));
};

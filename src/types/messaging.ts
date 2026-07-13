// Realtime messaging types — mirror the backend websocket-service payloads
// (Prisma snake_case shapes) so we don't remap on every event. Numeric ids are
// the Prisma `User.id` / `Conversation.id` / `Message.id` primary keys.

export type ConversationType = 'ONE_TO_ONE' | 'GROUP';
export type GroupMemberRole = 'ADMIN' | 'MEMBER';
export type MessageDeleteScope = 'BOTH' | 'SENDER_ONLY';

export interface WsUser {
  id: number;
  cognito_id?: string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  phone_number?: string | null;
  profile_image_key?: string | null;
  // Backend-signed GET URL for the profile photo (private bucket). Preferred
  // over building a public URL from the key. Present only if the backend signs
  // it (see getConversations / getUsersByRole).
  profile_image_url?: string | null;
  // Online/last-seen presence (backend must include this relation in the
  // participant.user data for it to show).
  userPresence?: {
    is_online?: boolean | null;
    last_seen_at?: string | null;
  } | null;
}

// Server-pushed presence change.
export interface PresenceEvent {
  userId: number;
  is_online: boolean;
  last_seen_at?: string | null;
}

export interface WsAttachment {
  id?: number;
  message_id?: number;
  file_name: string;
  file_key: string;
  file_type: string;
  file_size: number;
  // Signed GET URL the backend attaches when returning messages, so the
  // recipient can actually open a private-bucket object. Any of these names
  // are accepted.
  url?: string;
  signed_url?: string;
  download_url?: string;
}

export interface WsReaction {
  id?: number;
  message_id?: number;
  user_id: number;
  reaction: string;
  created_at?: string;
}

export interface WsMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string | null;
  reply_to_id?: number | null;
  edited_at?: string | null;
  deleted_at?: string | null;
  deleted_scope?: MessageDeleteScope | null;
  created_at: string;
  sender?: WsUser;
  reply_to?: WsMessage | null;
  attachments?: WsAttachment[];
  reactions?: WsReaction[];
  // Client-only optimistic fields (never sent to the server).
  _clientId?: string;
  _pending?: boolean;
  _failed?: boolean;
  // Attachment(s) still uploading in the background (show a spinner overlay).
  _uploading?: boolean;
}

export interface WsParticipant {
  user_id: number;
  last_read_at?: string | null;
  user: WsUser;
}

export interface WsGroupMember {
  user_id: number;
  role: GroupMemberRole;
  user: WsUser;
}

export interface WsGroup {
  id: number;
  conversation_id: number;
  name: string;
  description?: string | null;
  created_by?: number | null;
  // Group photo: S3 key + (backend-signed) view URL.
  image_key?: string | null;
  image_url?: string | null;
  members?: WsGroupMember[];
  conversation?: {participants?: WsParticipant[]};
}

export interface WsConversation {
  id: number;
  type: ConversationType;
  participants: WsParticipant[];
  group?: WsGroup | null;
  // getConversations returns the single last message here.
  messages?: WsMessage[];
  unreadCount?: number;
  // Timestamp of the most recent message — the authoritative sort/label key
  // (backend adds this). Falls back to updated_at/created_at when absent.
  lastMessageAt?: string | null;
  updated_at?: string;
  created_at?: string;
}

// Contact for New Chat / group member picking. `id` MUST be the numeric Prisma
// User.id (the WebSocket's toUserId/memberUserIds are integers). See
// contacts.api.ts for how this is resolved from the REST list endpoints.
export interface ChatContact {
  id: number;
  name: string;
  email?: string;
  role?: string;
  cognitoId?: string;
}

// Attachment descriptor the client sends with sendMessage (after uploading the
// file to the presigned S3 URL).
export interface AttachmentInput {
  fileName: string;
  fileKey: string;
  fileType: string;
  fileSize: number;
  // Local file:// uri of the picked file — lets the sender preview the image
  // instantly from disk instead of waiting for a signed S3 URL.
  localUri?: string;
}

// A local file chosen from the picker, before upload.
export interface PickedFile {
  uri: string;
  name: string;
  type: string;
  size: number;
}

// ── Server → client push events ─────────────────────────────────────────────
export interface MessageDeletedEvent {
  messageId: number;
  deleteScope: MessageDeleteScope;
  deletedBy: number;
}
export interface ReactionUpdatedEvent {
  messageId: number;
  reactions: WsReaction[];
  removed: boolean;
}
export interface MessagesReadEvent {
  conversationId: number;
  readBy: number;
}
export interface GroupMembersEvent {
  groupId: number;
  addedMembers?: number[];
  removedMembers?: number[];
  group: WsGroup;
}

export type WsServerEvent =
  | {type: 'newMessage'; data: WsMessage}
  | {type: 'messageEdited'; data: WsMessage}
  | {type: 'messageDeleted'; data: MessageDeletedEvent}
  | {type: 'messageReactionUpdated'; data: ReactionUpdatedEvent}
  | {type: 'messagesRead'; data: MessagesReadEvent}
  | {type: 'groupCreated'; data: WsGroup}
  | {type: 'memberAddedToGroup'; data: GroupMembersEvent}
  | {type: 'memberRemovedFromGroup'; data: GroupMembersEvent};

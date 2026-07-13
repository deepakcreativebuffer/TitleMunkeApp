import type {AuthUser, ChatContact} from '../types';
import {wsGetUsersByRole} from '../services/messaging.ws';

/**
 * Chat contacts (who the signed-in user is allowed to message).
 *
 * Resolved via the `getUsersByRole` WebSocket action, which derives the caller
 * from the auth token and returns the chat-eligible users — each with the
 * numeric Prisma User.id the WebSocket needs for toUserId / memberUserIds
 * (mapped to ChatContact in messaging.ws.ts). The role hierarchy (broker →
 * agents, organisation → brokers+agents, admin → all, agent → their broker) is
 * enforced server-side.
 *
 * `role`/`profile` are accepted for backwards compatibility but unused — the
 * server determines the contact set from the connection.
 */
export const fetchChatContacts = async (
  _role?: string,
  _profile?: AuthUser | null,
): Promise<ChatContact[]> => {
  try {
    return await wsGetUsersByRole();
  } catch {
    return [];
  }
};

// Whether the signed-in role is allowed to create groups (mirrors the backend
// createGroup permission check).
export const canCreateGroups = (role: string): boolean =>
  role === 'admin' || role === 'broker' || role === 'organisation';

// Mock data for the One-to-One Messaging prototype. No backend — everything is
// seeded locally. Kept in one place + behind the messaging slice so a real
// backend (Firebase / AppSync / Socket.IO) can replace the source later with
// minimal changes.

export type UserStatus = 'online' | 'offline';

export interface ChatUser {
  id: string;
  name: string;
  email: string;
  username: string;
  status: UserStatus;
  lastSeen: number; // epoch ms (used when offline)
}

export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: number;
  status: MessageStatus;
}

export interface Conversation {
  conversationId: string;
  participantId: string;
  lastMessage: string;
  unreadCount: number;
  updatedAt: number;
}

export const CURRENT_USER_ID = 'me';

const now = Date.now();
const min = 60 * 1000;
const hr = 60 * min;
const day = 24 * hr;

export const MOCK_USERS: ChatUser[] = [
  {id: 'u1', name: 'John Smith', email: 'john.smith@titlemunke.com', username: 'johnsmith', status: 'online', lastSeen: now},
  {id: 'u2', name: 'Emma Wilson', email: 'emma.wilson@titlemunke.com', username: 'emmaw', status: 'offline', lastSeen: now - 10 * min},
  {id: 'u3', name: 'Michael Johnson', email: 'michael.j@titlemunke.com', username: 'mjohnson', status: 'online', lastSeen: now},
  {id: 'u4', name: 'Olivia Brown', email: 'olivia.brown@titlemunke.com', username: 'oliviab', status: 'offline', lastSeen: now - 2 * hr},
  {id: 'u5', name: 'Daniel Clark', email: 'daniel.clark@titlemunke.com', username: 'danclark', status: 'offline', lastSeen: now - 45 * min},
  {id: 'u6', name: 'Sophia Davis', email: 'sophia.davis@titlemunke.com', username: 'sophiad', status: 'online', lastSeen: now},
  {id: 'u7', name: 'James Miller', email: 'james.miller@titlemunke.com', username: 'jmiller', status: 'offline', lastSeen: now - 5 * hr},
  {id: 'u8', name: 'Ava Martinez', email: 'ava.martinez@titlemunke.com', username: 'avam', status: 'offline', lastSeen: now - 1 * day},
  {id: 'u9', name: 'William Garcia', email: 'william.garcia@titlemunke.com', username: 'wgarcia', status: 'online', lastSeen: now},
  {id: 'u10', name: 'Isabella Rodriguez', email: 'isabella.r@titlemunke.com', username: 'isabellar', status: 'offline', lastSeen: now - 3 * hr},
  {id: 'u11', name: 'Benjamin Lee', email: 'benjamin.lee@titlemunke.com', username: 'blee', status: 'offline', lastSeen: now - 20 * min},
  {id: 'u12', name: 'Mia Walker', email: 'mia.walker@titlemunke.com', username: 'miaw', status: 'online', lastSeen: now},
  {id: 'u13', name: 'Lucas Hall', email: 'lucas.hall@titlemunke.com', username: 'lucash', status: 'offline', lastSeen: now - 2 * day},
  {id: 'u14', name: 'Charlotte Allen', email: 'charlotte.allen@titlemunke.com', username: 'charlottea', status: 'offline', lastSeen: now - 8 * hr},
  {id: 'u15', name: 'Henry Young', email: 'henry.young@titlemunke.com', username: 'hyoung', status: 'online', lastSeen: now},
  {id: 'u16', name: 'Amelia King', email: 'amelia.king@titlemunke.com', username: 'ameliak', status: 'offline', lastSeen: now - 30 * min},
  {id: 'u17', name: 'Alexander Wright', email: 'alex.wright@titlemunke.com', username: 'awright', status: 'offline', lastSeen: now - 6 * hr},
  {id: 'u18', name: 'Harper Scott', email: 'harper.scott@titlemunke.com', username: 'harpers', status: 'online', lastSeen: now},
];

const conv = (participantId: string) => `conv-${participantId}`;

// Conversations the current user already has.
export const MOCK_CONVERSATIONS: Conversation[] = [
  {conversationId: conv('u1'), participantId: 'u1', lastMessage: 'Thanks for sharing the property details.', unreadCount: 3, updatedAt: now - 2 * min},
  {conversationId: conv('u3'), participantId: 'u3', lastMessage: 'Can we schedule the title search for Monday?', unreadCount: 1, updatedAt: now - 18 * min},
  {conversationId: conv('u2'), participantId: 'u2', lastMessage: 'Perfect, I’ll send over the report shortly.', unreadCount: 0, updatedAt: now - 55 * min},
  {conversationId: conv('u6'), participantId: 'u6', lastMessage: 'Is the deed available for 1202 W Broad St?', unreadCount: 2, updatedAt: now - 2 * hr},
  {conversationId: conv('u9'), participantId: 'u9', lastMessage: 'Great, talk soon!', unreadCount: 0, updatedAt: now - 5 * hr},
  {conversationId: conv('u5'), participantId: 'u5', lastMessage: 'I’ll review and get back to you.', unreadCount: 0, updatedAt: now - 1 * day},
];

const m = (
  id: string,
  participantId: string,
  senderId: string,
  text: string,
  minsAgo: number,
  status: MessageStatus = 'read',
): Message => ({
  id,
  conversationId: conv(participantId),
  senderId,
  text,
  timestamp: now - minsAgo * min,
  status,
});

export const MOCK_MESSAGES: Record<string, Message[]> = {
  [conv('u1')]: [
    m('m1', 'u1', 'u1', 'Hi, is the property at 1249 Pennsylvania Ave still available?', 40),
    m('m2', 'u1', CURRENT_USER_ID, 'Yes, it is currently available.', 38),
    m('m3', 'u1', 'u1', 'Can I schedule a visit this week?', 36),
    m('m4', 'u1', CURRENT_USER_ID, 'Absolutely — what day works for you?', 34, 'read'),
    m('m5', 'u1', 'u1', 'Thursday afternoon would be great.', 6),
    m('m6', 'u1', 'u1', 'Also, could you share the title details?', 4),
    m('m7', 'u1', 'u1', 'Thanks for sharing the property details.', 2),
  ],
  [conv('u3')]: [
    m('m10', 'u3', CURRENT_USER_ID, 'Hi Michael, the search results are ready.', 60),
    m('m11', 'u3', 'u3', 'Awesome, thank you!', 40),
    m('m12', 'u3', 'u3', 'Can we schedule the title search for Monday?', 18),
  ],
  [conv('u2')]: [
    m('m20', 'u2', 'u2', 'Could you pull the report for the Bethlehem parcel?', 70),
    m('m21', 'u2', CURRENT_USER_ID, 'Sure, running it now.', 60),
    m('m22', 'u2', CURRENT_USER_ID, 'Perfect, I’ll send over the report shortly.', 55),
  ],
  [conv('u6')]: [
    m('m30', 'u6', 'u6', 'Hello! Quick question about a parcel.', 150),
    m('m31', 'u6', 'u6', 'Is the deed available for 1202 W Broad St?', 120),
  ],
  [conv('u9')]: [
    m('m40', 'u9', CURRENT_USER_ID, 'Sent you the closing docs.', 320),
    m('m41', 'u9', 'u9', 'Got them, thanks!', 305),
    m('m42', 'u9', 'u9', 'Great, talk soon!', 300),
  ],
  [conv('u5')]: [
    m('m50', 'u5', CURRENT_USER_ID, 'Here is the updated assessment.', 1500),
    m('m51', 'u5', 'u5', 'I’ll review and get back to you.', 1440),
  ],
};

// Canned replies used by the mock typing/auto-reply simulation.
export const MOCK_REPLIES = [
  'Got it, thanks!',
  'Sounds good 👍',
  'Let me check and get back to you.',
  'Sure, that works for me.',
  'Appreciate the quick response!',
  'Perfect, talk soon.',
];

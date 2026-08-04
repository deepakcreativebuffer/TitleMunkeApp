import {combineReducers} from '@reduxjs/toolkit';
import {persistReducer, createTransform} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {userSlice, searchSlice, messagingSlice} from '../slices';

const MAX_MESSAGES_PER_CONVERSATION = 50;

// Cap each conversation's persisted messages to the most recent 50 (applied
// only to the `messages` sub-state of the messaging slice).
const capMessages = createTransform(
  (inbound: any) => {
    if (!inbound || typeof inbound !== 'object') {
      return inbound;
    }
    const capped: Record<string, unknown[]> = {};
    for (const cid of Object.keys(inbound)) {
      const list = inbound[cid];
      capped[cid] = Array.isArray(list)
        ? list.slice(-MAX_MESSAGES_PER_CONVERSATION)
        : list;
    }
    return capped;
  },
  outbound => outbound,
  {whitelist: ['messages']},
);

// Persist only the durable messaging data so chats (text, attachments, audio)
// open instantly from cache. Transient fields (socket connection, presence,
// typing, loading flags) are intentionally excluded and reset on rehydrate.
const messagingPersistConfig = {
  key: 'messaging',
  storage: AsyncStorage,
  whitelist: ['conversations', 'messages', 'myUserId', 'myCognitoSub'],
  transforms: [capMessages],
};

const rootReducer = combineReducers({
  user: userSlice,
  search: searchSlice,
  messaging: persistReducer(messagingPersistConfig, messagingSlice),
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;

import axios from 'axios';
import {CHAT_API_URL} from '../static';

// "Munke Assist" AI chatbot. Like the web, this is a standalone Lambda URL
// (not the usersAdmin host), so we use a bare axios call with no interceptors.

export interface ChatResponse {
  answer?: string;
  source_file_url?: string;
  [key: string]: unknown;
}

// Maps the user's cognito group/role to the id key the chat API expects.
export const CHAT_USER_KEYS: Record<string, string> = {
  individual: 'user_id',
  agent: 'agent_id',
  broker: 'broker_id',
};

// Send a user question. `userType` is the cognito group (e.g. 'broker'),
// `userId` the cognito sub, `modelName` the admin's default LLM.
export const chatQuery = (params: {
  question: string;
  userId: string;
  userType: string;
  modelName?: string;
}): Promise<ChatResponse> => {
  const idKey = CHAT_USER_KEYS[params.userType] ?? 'user_id';
  return axios
    .post(
      CHAT_API_URL,
      {
        action: 'query',
        question: params.question,
        [idKey]: params.userId,
        userType: params.userType,
        top_k: 5,
        model_name: params.modelName,
      },
      {timeout: 60000},
    )
    .then(r => r.data as ChatResponse);
};

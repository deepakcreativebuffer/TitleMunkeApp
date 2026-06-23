import axios from 'axios';
import {LLM_API_URL} from '../static';

// The LLM governance API is a standalone Lambda URL (not the usersAdmin host),
// so we use a bare axios call — no app interceptors / auth headers.
const post = (payload: Record<string, unknown>) =>
  axios.post(LLM_API_URL, payload, {timeout: 30000}).then(r => r.data);

// List of available AI models → response { data: string[] }.
export const getAiModels = (userId: string, userType: string) =>
  post({action: 'get_llm_list', user_id: userId, userType});

// Currently-selected default model → response [{ data: { llm_name } }].
export const getDefaultAiModel = (adminId: string, userType: string) =>
  post({action: 'get_llm_by_admin', admin_id: adminId, userType});

// Save the default model chosen by the admin.
export const changeDefaultAiModel = (
  llmName: string,
  adminId: string,
  userType: string,
) =>
  post({action: 'save_llm_by_admin', llm_name: llmName, admin_id: adminId, userType});

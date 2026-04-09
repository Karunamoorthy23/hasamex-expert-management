import { http } from './http';

export async function fetchChatSessions({ archived = false } = {}) {
  const query = new URLSearchParams();
  if (archived) query.set('archived', 'true');
  const res = await http(`/chat/sessions${query.size ? `?${query.toString()}` : ''}`);
  return res.data || [];
}

export async function createChatSession({ title = 'New conversation' } = {}) {
  const res = await http('/chat/sessions', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
  return res.data;
}

export async function renameChatSession(id, { title }) {
  const res = await http(`/chat/sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
  return res.data;
}

export async function archiveChatSession(id, { archived = true } = {}) {
  const res = await http(`/chat/sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ archived }),
  });
  return res.data;
}

export async function deleteChatSession(id) {
  const res = await http(`/chat/sessions/${id}`, {
    method: 'DELETE',
  });
  return res.data;
}

export async function fetchChatMessages(sessionId) {
  const res = await http(`/chat/sessions/${sessionId}/messages`);
  return res.data || [];
}

export async function postChatMessage(sessionId, { role = 'user', content_text, content_json = null }) {
  const res = await http(`/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ role, content_text, content_json }),
  });
  return res.data;
}

export async function searchChatMessages({ query, sessionId = null, limit = 50 }) {
  const qs = new URLSearchParams();
  if (query) qs.set('query', query);
  if (sessionId) qs.set('session_id', sessionId);
  if (limit) qs.set('limit', String(limit));
  const res = await http(`/chat/search?${qs.toString()}`);
  return res.data || [];
}

export async function requestAgentReply(sessionId, { content_text }) {
  const res = await http(`/chat/sessions/${sessionId}/agent`, {
    method: 'POST',
    body: JSON.stringify({ content_text }),
  });
  return res.data;
}

import { request } from './apiClient.js'

export const getConversations = (params, signal) => request('/conversations', { params, signal })
export const getMessages = (conversationId, signal) => request(`/conversations/${conversationId}/messages`, { signal })
export const sendMessage = (conversationId, body) =>
  request(`/conversations/${conversationId}/messages`, { method: 'POST', body: { body } })
import type {
  AddReactionRequest,
  BlockedUser,
  BlockUserRequest,
  ChatMessage,
  CreateReportRequest,
  EditMessageRequest,
  MessagePage,
  MessageResponse,
  SendMessageRequest,
} from '@moto/contract';
import { apiFetch } from './client';

/**
 * Typed wrappers over the Phase 4 chat REST routes. Real-time updates arrive
 * separately over Socket.IO (see chat/socket.ts); these cover history +
 * mutations + trust/safety.
 */

// --- Messages ---

export function listMessages(
  groupId: string,
  before?: string,
  limit = 50,
): Promise<MessagePage> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (before) params.set('before', before);
  return apiFetch<MessagePage>(`/groups/${groupId}/messages?${params.toString()}`, { auth: true });
}

export function sendMessage(groupId: string, body: SendMessageRequest): Promise<ChatMessage> {
  return apiFetch<ChatMessage>(`/groups/${groupId}/messages`, { method: 'POST', body, auth: true });
}

export function editMessage(
  groupId: string,
  messageId: string,
  body: EditMessageRequest,
): Promise<ChatMessage> {
  return apiFetch<ChatMessage>(`/groups/${groupId}/messages/${messageId}`, {
    method: 'PATCH',
    body,
    auth: true,
  });
}

export function deleteMessage(groupId: string, messageId: string): Promise<MessageResponse> {
  return apiFetch<MessageResponse>(`/groups/${groupId}/messages/${messageId}`, {
    method: 'DELETE',
    auth: true,
  });
}

// --- Reactions / reads / reports (keyed by messageId) ---

export function addReaction(messageId: string, body: AddReactionRequest): Promise<MessageResponse> {
  return apiFetch<MessageResponse>(`/messages/${messageId}/reactions`, {
    method: 'POST',
    body,
    auth: true,
  });
}

export function removeReaction(messageId: string, emoji: string): Promise<MessageResponse> {
  return apiFetch<MessageResponse>(
    `/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
    { method: 'DELETE', auth: true },
  );
}

export function markRead(messageId: string): Promise<MessageResponse> {
  return apiFetch<MessageResponse>(`/messages/${messageId}/read`, { method: 'POST', auth: true });
}

export function reportMessage(
  messageId: string,
  body: CreateReportRequest,
): Promise<MessageResponse> {
  return apiFetch<MessageResponse>(`/messages/${messageId}/report`, {
    method: 'POST',
    body,
    auth: true,
  });
}

export function reportUser(userId: string, body: CreateReportRequest): Promise<MessageResponse> {
  return apiFetch<MessageResponse>(`/users/${userId}/report`, { method: 'POST', body, auth: true });
}

// --- Block list ---

export function listBlocked(): Promise<BlockedUser[]> {
  return apiFetch<BlockedUser[]>('/block-list', { auth: true });
}

export function blockUser(body: BlockUserRequest): Promise<BlockedUser> {
  return apiFetch<BlockedUser>('/block-list', { method: 'POST', body, auth: true });
}

export function unblockUser(blockedUserId: string): Promise<MessageResponse> {
  return apiFetch<MessageResponse>(`/block-list/${blockedUserId}`, { method: 'DELETE', auth: true });
}

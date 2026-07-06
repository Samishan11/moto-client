import { useMutation, useInfiniteQuery } from '@tanstack/react-query';
import type {
  AddReactionRequest,
  CreateReportRequest,
  MessagePage,
  SendMessageRequest,
} from '@moto/contract';
import {
  addReaction,
  blockUser,
  deleteMessage,
  editMessage,
  listMessages,
  markRead,
  removeReaction,
  reportMessage,
  reportUser,
  sendMessage,
  unblockUser,
} from '../api/chat';
import { queryClient } from '../api/queryClient';
import { queryKeys } from '../api/queries';

/**
 * Message history as a reverse-infinite list. Each page is newest-first; the
 * `nextCursor` fetches older messages (scroll-up pagination). Real-time inserts
 * are patched into this cache directly by the ChatScreen's socket handlers, so
 * the query itself only owns history + pagination.
 */
export function useMessages(groupId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.messages(groupId),
    queryFn: ({ pageParam }) => listMessages(groupId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: MessagePage) => last.nextCursor ?? undefined,
    staleTime: 0,
  });
}

export function useSendMessage(groupId: string) {
  return useMutation({
    mutationFn: (body: SendMessageRequest) => sendMessage(groupId, body),
    // The socket `message:new` echo patches the cache; no invalidation needed.
  });
}

export function useEditMessage(groupId: string) {
  return useMutation({
    mutationFn: (vars: { messageId: string; content: string }) =>
      editMessage(groupId, vars.messageId, { content: vars.content }),
  });
}

export function useDeleteMessage(groupId: string) {
  return useMutation({
    mutationFn: (messageId: string) => deleteMessage(groupId, messageId),
  });
}

export function useAddReaction() {
  return useMutation({
    mutationFn: (vars: { messageId: string; body: AddReactionRequest }) =>
      addReaction(vars.messageId, vars.body),
  });
}

export function useRemoveReaction() {
  return useMutation({
    mutationFn: (vars: { messageId: string; emoji: string }) =>
      removeReaction(vars.messageId, vars.emoji),
  });
}

export function useReportMessage() {
  return useMutation({
    mutationFn: (vars: { messageId: string; body: CreateReportRequest }) =>
      reportMessage(vars.messageId, vars.body),
  });
}

export function useReportUser() {
  return useMutation({
    mutationFn: (vars: { userId: string; body: CreateReportRequest }) =>
      reportUser(vars.userId, vars.body),
  });
}

// --- Block list ---

export function useBlockUser() {
  return useMutation({
    mutationFn: (blockedUserId: string) => blockUser({ blockedUserId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.blockList }),
  });
}

export function useUnblockUser() {
  return useMutation({
    mutationFn: (blockedUserId: string) => unblockUser(blockedUserId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.blockList }),
  });
}

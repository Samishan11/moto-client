import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import type {
  CreateAnnouncementRequest,
  CreateGroupRequest,
  CreateInviteRequest,
  GroupDetail,
  UpdateAnnouncementRequest,
  UpdateGroupRequest,
  UpdateMemberRoleRequest,
} from '@moto/contract';
import { connectChatSocket, joinGroupRoom, subscribeGroupMembers } from '../chat/socket';
import {
  acceptInvite,
  createAnnouncement,
  createGroup,
  createInvite,
  deleteAnnouncement,
  deleteGroup,
  removeMember,
  requestJoin,
  reviewJoinRequest,
  updateAnnouncement,
  updateGroup,
  updateMemberRole,
} from '../api/group';
import { queryClient } from '../api/queryClient';
import { queryKeys } from '../api/queries';

/**
 * React Query mutation hooks for the Phase 3 group flows. Each invalidates the
 * caches its write affects so lists/detail stay consistent.
 */

// `refetchType: 'all'` refetches matching queries even when they're currently
// unmounted (the custom stack navigator only mounts the active screen), so the
// data is already fresh the moment you navigate back — no manual reload.
const invalidateGroups = () =>
  queryClient.invalidateQueries({ queryKey: queryKeys.groups, refetchType: 'all' });

const invalidateGroup = (id: string) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.group(id), refetchType: 'all' });
  queryClient.invalidateQueries({ queryKey: queryKeys.groups, refetchType: 'all' });
};

/** Synchronously patch the cached group detail so the UI updates instantly. */
function patchGroupDetail(id: string, updater: (g: GroupDetail) => GroupDetail): void {
  queryClient.setQueryData<GroupDetail>(queryKeys.group(id), (old) => (old ? updater(old) : old));
}

/**
 * Keep an open group screen live: join the group room and, when the server
 * broadcasts a membership change, refresh the group detail (+ the groups list
 * count) so joins/leaves by anyone appear without navigating away and back.
 */
export function useGroupMemberSync(groupId: string): void {
  useEffect(() => {
    const socket = connectChatSocket();
    joinGroupRoom(groupId);
    return subscribeGroupMembers(socket, (e) => {
      if (e.groupId !== groupId) return;
      invalidateGroup(groupId);
    });
  }, [groupId]);
}

// --- Groups ---

export function useCreateGroup() {
  return useMutation({
    mutationKey: queryKeys.groups,
    mutationFn: (body: CreateGroupRequest) => createGroup(body),
    onSuccess: invalidateGroups,
  });
}

export function useUpdateGroup(id: string) {
  return useMutation({
    mutationKey: queryKeys.group(id),
    mutationFn: (body: UpdateGroupRequest) => updateGroup(id, body),
    onSuccess: () => invalidateGroup(id),
  });
}

export function useDeleteGroup() {
  return useMutation({
    mutationKey: queryKeys.groups,
    mutationFn: (id: string) => deleteGroup(id),
    onSuccess: invalidateGroups,
  });
}

// --- Membership ---

export function useJoinGroup(id: string) {
  return useMutation({
    mutationKey: queryKeys.group(id),
    mutationFn: () => requestJoin(id, {}),
    onSuccess: (result) => {
      // Public group → instant membership (result carries a `role`); private
      // group → a pending request (no immediate role change). Optimistically
      // flip the detail so the member view + chat button appear at once.
      if (result && 'role' in result) {
        patchGroupDetail(id, (g) => ({
          ...g,
          myRole: result.role,
          memberCount: g.memberCount + 1,
          members: g.members.some((m) => m.id === result.id)
            ? g.members
            : [...g.members, result],
        }));
      }
      invalidateGroup(id);
    },
  });
}

/** Pass `self: true` when the current user is leaving (vs. an admin removing someone). */
export function useLeaveGroup(id: string) {
  return useMutation({
    mutationFn: (vars: { userId: string; self?: boolean } | string) => {
      const userId = typeof vars === 'string' ? vars : vars.userId;
      return removeMember(id, userId);
    },
    onSuccess: (_res, vars) => {
      const userId = typeof vars === 'string' ? vars : vars.userId;
      const self = typeof vars === 'string' ? false : !!vars.self;
      patchGroupDetail(id, (g) => ({
        ...g,
        myRole: self ? null : g.myRole, // leaving yourself → back to non-member view
        members: g.members.filter((m) => m.user.id !== userId),
        memberCount: Math.max(0, g.memberCount - 1),
      }));
      invalidateGroup(id);
    },
  });
}

export function useUpdateMemberRole(id: string) {
  return useMutation({
    mutationFn: (vars: { userId: string; body: UpdateMemberRoleRequest }) =>
      updateMemberRole(id, vars.userId, vars.body),
    onSuccess: (updated, vars) => {
      console.log('[role] success', vars.userId, '→', updated.role);
      // Instantly reflect the new role badge in the member list.
      patchGroupDetail(id, (g) => ({
        ...g,
        members: g.members.map((m) =>
          m.user.id === vars.userId ? { ...m, role: updated.role } : m,
        ),
      }));
      invalidateGroup(id);
    },
    onError: (err) => {
      console.warn('[role] FAILED:', err instanceof Error ? err.message : err);
    },
  });
}

export function useAcceptInvite() {
  return useMutation({
    mutationKey: queryKeys.groups,
    mutationFn: (token: string) => acceptInvite(token),
    onSuccess: invalidateGroups,
  });
}

// --- Join requests ---

export function useReviewJoinRequest(id: string) {
  return useMutation({
    mutationFn: (vars: { requestId: string; status: 'APPROVED' | 'REJECTED' }) =>
      reviewJoinRequest(id, vars.requestId, { status: vars.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.groupJoinRequests(id),
        refetchType: 'all',
      });
      invalidateGroup(id);
    },
  });
}

// --- Invites ---

export function useCreateInvite(id: string) {
  return useMutation({
    mutationFn: (body: CreateInviteRequest) => createInvite(id, body),
  });
}

// --- Announcements ---

// Refetch immediately (active + inactive) so the list is fresh when you return
// to the group detail after posting/editing from the separate form screen.
const invalidateAnnouncements = (id: string) =>
  queryClient.invalidateQueries({
    queryKey: queryKeys.groupAnnouncements(id),
    refetchType: 'all',
  });

export function useCreateAnnouncement(id: string) {
  return useMutation({
    mutationFn: (body: CreateAnnouncementRequest) => createAnnouncement(id, body),
    onSuccess: () => invalidateAnnouncements(id),
  });
}

export function useUpdateAnnouncement(id: string) {
  return useMutation({
    mutationFn: (vars: { announcementId: string; body: UpdateAnnouncementRequest }) =>
      updateAnnouncement(id, vars.announcementId, vars.body),
    onSuccess: () => invalidateAnnouncements(id),
  });
}

export function useDeleteAnnouncement(id: string) {
  return useMutation({
    mutationFn: (announcementId: string) => deleteAnnouncement(id, announcementId),
    onSuccess: () => invalidateAnnouncements(id),
  });
}

import type {
  Announcement,
  CreateAnnouncementRequest,
  CreateGroupRequest,
  CreateInviteRequest,
  CreateJoinRequestRequest,
  Group,
  GroupDetail,
  GroupInvite,
  GroupPage,
  GroupMember,
  JoinRequestDto,
  MessageResponse,
  ReviewJoinRequestRequest,
  UpdateAnnouncementRequest,
  UpdateGroupRequest,
  UpdateMemberRoleRequest,
} from '@moto/contract';
import { apiFetch } from './client';

/**
 * Thin, fully-typed wrappers over the backend's Phase 3 `/groups` + `/invites`
 * routes. Request/response shapes come from @moto/contract — the same Zod
 * schemas the API validates against — so there's no client/server type drift.
 */

// --- Groups ---

/**
 * Server-side search + cursor pagination; pass `nextCursor` back as `cursor`.
 * `joined: true` restricts to the caller's groups, most recently joined first.
 */
export function listGroups(
  opts: { search?: string; cursor?: string; limit?: number; joined?: boolean } = {},
): Promise<GroupPage> {
  const params = new URLSearchParams();
  if (opts.search) params.set('search', opts.search);
  if (opts.cursor) params.set('cursor', opts.cursor);
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.joined) params.set('joined', 'true');
  const qs = params.toString();
  return apiFetch<GroupPage>(`/groups${qs ? `?${qs}` : ''}`, { auth: true });
}

export function getGroup(id: string): Promise<GroupDetail> {
  return apiFetch<GroupDetail>(`/groups/${id}`, { auth: true });
}

export function createGroup(body: CreateGroupRequest): Promise<Group> {
  return apiFetch<Group>('/groups', { method: 'POST', body, auth: true });
}

export function updateGroup(id: string, body: UpdateGroupRequest): Promise<Group> {
  return apiFetch<Group>(`/groups/${id}`, { method: 'PATCH', body, auth: true });
}

export function deleteGroup(id: string): Promise<MessageResponse> {
  return apiFetch<MessageResponse>(`/groups/${id}`, { method: 'DELETE', auth: true });
}

// --- Members & roles ---

export function listGroupMembers(id: string): Promise<GroupMember[]> {
  return apiFetch<GroupMember[]>(`/groups/${id}/members`, { auth: true });
}

export function updateMemberRole(
  id: string,
  userId: string,
  body: UpdateMemberRoleRequest,
): Promise<GroupMember> {
  return apiFetch<GroupMember>(`/groups/${id}/members/${userId}`, {
    method: 'PATCH',
    body,
    auth: true,
  });
}

export function removeMember(id: string, userId: string): Promise<MessageResponse> {
  return apiFetch<MessageResponse>(`/groups/${id}/members/${userId}`, {
    method: 'DELETE',
    auth: true,
  });
}

// --- Join requests ---

export function listJoinRequests(id: string): Promise<JoinRequestDto[]> {
  return apiFetch<JoinRequestDto[]>(`/groups/${id}/join-requests`, { auth: true });
}

/** Returns a GroupMember when the group is public (instant join) or a JoinRequest for private groups. */
export function requestJoin(
  id: string,
  body: CreateJoinRequestRequest,
): Promise<JoinRequestDto | GroupMember> {
  return apiFetch<JoinRequestDto | GroupMember>(`/groups/${id}/join-requests`, {
    method: 'POST',
    body,
    auth: true,
  });
}

export function reviewJoinRequest(
  id: string,
  requestId: string,
  body: ReviewJoinRequestRequest,
): Promise<MessageResponse> {
  return apiFetch<MessageResponse>(`/groups/${id}/join-requests/${requestId}`, {
    method: 'PATCH',
    body,
    auth: true,
  });
}

// --- Invite links ---

export function listInvites(id: string): Promise<GroupInvite[]> {
  return apiFetch<GroupInvite[]>(`/groups/${id}/invites`, { auth: true });
}

export function createInvite(id: string, body: CreateInviteRequest): Promise<GroupInvite> {
  return apiFetch<GroupInvite>(`/groups/${id}/invites`, { method: 'POST', body, auth: true });
}

export function revokeInvite(id: string, token: string): Promise<MessageResponse> {
  return apiFetch<MessageResponse>(`/groups/${id}/invites/${token}`, {
    method: 'DELETE',
    auth: true,
  });
}

export function acceptInvite(token: string): Promise<GroupMember> {
  return apiFetch<GroupMember>(`/invites/${token}/accept`, { method: 'POST', auth: true });
}

// --- Announcements ---

export function listAnnouncements(id: string): Promise<Announcement[]> {
  return apiFetch<Announcement[]>(`/groups/${id}/announcements`, { auth: true });
}

export function createAnnouncement(
  id: string,
  body: CreateAnnouncementRequest,
): Promise<Announcement> {
  return apiFetch<Announcement>(`/groups/${id}/announcements`, {
    method: 'POST',
    body,
    auth: true,
  });
}

export function updateAnnouncement(
  id: string,
  announcementId: string,
  body: UpdateAnnouncementRequest,
): Promise<Announcement> {
  return apiFetch<Announcement>(`/groups/${id}/announcements/${announcementId}`, {
    method: 'PATCH',
    body,
    auth: true,
  });
}

export function deleteAnnouncement(id: string, announcementId: string): Promise<MessageResponse> {
  return apiFetch<MessageResponse>(`/groups/${id}/announcements/${announcementId}`, {
    method: 'DELETE',
    auth: true,
  });
}

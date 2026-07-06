import { useState, type ReactNode } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import type { GroupDetail, GroupMember, Role, UpdateMemberRoleRequest } from '@moto/contract';

/** Roles that can be assigned via the member-role endpoint (OWNER excluded). */
type AssignableRole = UpdateMemberRoleRequest['role'];
import { Button, FormError } from '../components/ui';
import { Loading } from '../components/layout';
import { RoleBadge, ROLE_COLOR, ROLE_LABEL } from '../components/RoleBadge';
import { useNavigation } from '../navigation/Navigator';
import { useAuth } from '../auth/AuthContext';
import {
  useActiveRide,
  useGroup,
  useGroupAnnouncements,
  useGroupJoinRequests,
  useTrips,
} from '../api/queries';
import { useStartRide } from '../ride/hooks';
import {
  useCreateInvite,
  useDeleteAnnouncement,
  useDeleteGroup,
  useGroupMemberSync,
  useJoinGroup,
  useLeaveGroup,
  useReviewJoinRequest,
  useUpdateMemberRole,
} from '../group/hooks';
import type { Announcement } from '@moto/contract';
import { errorMessage } from '../api/errorMessage';
import { colors, spacing } from '../theme';

const ROLE_RANK: Record<Role, number> = {
  MEMBER: 1,
  RIDE_LEADER: 2,
  MODERATOR: 3,
  ADMIN: 4,
  OWNER: 5,
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts.length >= 2 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
}

export function GroupDetailScreen(): ReactNode {
  const nav = useNavigation();
  const id = typeof nav.params.id === 'string' ? nav.params.id : '';
  const group = useGroup(id);

  return (
    <View style={styles.flex}>
      {group.data ? <Content group={group.data} /> : <Loading />}
    </View>
  );
}

function Content({ group }: { group: GroupDetail }): ReactNode {
  const { t } = useTranslation();
  const nav = useNavigation();
  const { user } = useAuth();

  const announcements = useGroupAnnouncements(group.id);
  const trips = useTrips(group.id, true); // upcoming trips for this group
  const myRank = group.myRole ? ROLE_RANK[group.myRole] : 0;
  const isMember = group.myRole !== null;
  const isAdmin = myRank >= ROLE_RANK.ADMIN;
  const canPost = myRank >= ROLE_RANK.RIDE_LEADER;
  const isOwner = group.myRole === 'OWNER';

  const joinRequests = useGroupJoinRequests(group.id, isAdmin && group.visibility === 'PRIVATE');

  // Live membership: reflect joins/leaves by anyone without a manual revisit.
  useGroupMemberSync(group.id);

  const join = useJoinGroup(group.id);
  const leave = useLeaveGroup(group.id);
  const del = useDeleteGroup();
  const invite = useCreateInvite(group.id);
  const review = useReviewJoinRequest(group.id);
  const delAnnouncement = useDeleteAnnouncement(group.id);
  const roleMut = useUpdateMemberRole(group.id);
  const removeMut = useLeaveGroup(group.id);

  const mutationError =
    join.error ??
    leave.error ??
    invite.error ??
    review.error ??
    del.error ??
    delAnnouncement.error ??
    roleMut.error ??
    removeMut.error ??
    null;
  const error = mutationError ? errorMessage(mutationError, t) : null;

  const isModerator = myRank >= ROLE_RANK.MODERATOR;

  // Which roles the current user may assign to a member (mirrors the server):
  // only the OWNER can grant ADMIN; ADMINs manage up to MODERATOR. OWNER role
  // is never assignable here. Returns [] when the actor can't manage the target.
  function assignableRoles(target: GroupMember): AssignableRole[] {
    if (!isAdmin) return []; // ADMIN+ only
    if (target.role === 'OWNER') return []; // owner is untouchable
    if (target.user.id === user?.id) return []; // don't manage yourself
    if (target.role === 'ADMIN' && !isOwner) return []; // only owner touches admins
    const base: AssignableRole[] = ['MODERATOR', 'RIDE_LEADER', 'MEMBER'];
    return isOwner ? ['ADMIN', ...base] : base;
  }

  function manageMember(member: GroupMember): void {
    const roles = assignableRoles(member).filter((r) => r !== member.role);
    const name = member.user.displayName ?? 'Rider';
    const buttons = roles.map((r) => ({
      text: `Make ${ROLE_LABEL[r]}`,
      onPress: () => roleMut.mutate({ userId: member.user.id, body: { role: r } }),
    }));
    Alert.alert(name, `Currently ${ROLE_LABEL[member.role]}`, [
      ...buttons,
      {
        text: 'Remove from group',
        style: 'destructive' as const,
        onPress: () =>
          Alert.alert('Remove member', `Remove ${name} from ${group.name}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Remove',
              style: 'destructive',
              onPress: () => removeMut.mutate(member.user.id),
            },
          ]),
      },
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }
  /** Author of a post can edit/delete it; moderators+ can edit/delete any. */
  const canMutateAnnouncement = (a: Announcement): boolean =>
    (!!user && user.id === a.createdBy) || isModerator;

  function announcementActions(a: Announcement): void {
    Alert.alert(a.title, undefined, [
      {
        text: 'Edit',
        onPress: () =>
          nav.navigate('announcementForm', {
            groupId: group.id,
            announcementId: a.id,
            title: a.title,
            content: a.content,
            isPinned: a.isPinned,
          }),
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Delete announcement', `Delete "${a.title}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => delAnnouncement.mutate(a.id),
            },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function handleLeave(): void {
    if (!user) return;
    Alert.alert('Leave group', `Leave ${group.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => leave.mutate({ userId: user.id, self: true }) },
    ]);
  }

  function handleDelete(): void {
    Alert.alert('Delete group', `Permanently delete ${group.name}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => del.mutate(group.id, { onSuccess: () => nav.goBack() }),
      },
    ]);
  }

  function handleInvite(): void {
    invite.mutate(
      {},
      {
        onSuccess: (inv) => {
          Share.share({
            message: `Join "${group.name}" on Moto — invite code: ${inv.token}`,
          }).catch(() => undefined);
        },
      },
    );
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
      {/* Header banner */}
      <View style={styles.banner}>
        {group.coverUrl ? (
          <Image source={{ uri: group.coverUrl }} style={styles.bannerImage} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={['#3a2a1a', '#171009']}
            style={StyleSheet.absoluteFill}
          />
        )}
        <Pressable style={styles.backButton} onPress={nav.goBack} hitSlop={8}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <LinearGradient
          colors={['#FF5A1F', '#E8410C']}
          start={{ x: 0.2, y: 0.2 }}
          end={{ x: 0.8, y: 0.8 }}
          style={styles.bannerAvatar}
        >
          <Text style={styles.bannerAvatarText}>{initials(group.name)}</Text>
        </LinearGradient>
      </View>

      <View style={styles.body}>
        <Text style={styles.name}>{group.name}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>
            {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
          </Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta}>
            {group.visibility === 'PRIVATE' ? '🔒 Private' : '🌐 Public'}
          </Text>
          {group.location ? (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.meta}>📍 {group.location}</Text>
            </>
          ) : null}
        </View>
        {group.description ? <Text style={styles.description}>{group.description}</Text> : null}

        <FormError message={error} />

        {/* Primary action */}
        {!isMember ? (
          <Button
            title={group.visibility === 'PUBLIC' ? 'Join group' : 'Request to join'}
            onPress={() => join.mutate()}
            loading={join.isPending}
          />
        ) : (
          <View style={styles.memberActions}>
            {group.myRole ? <RoleBadge role={group.myRole} /> : null}
            {isAdmin ? (
              <Pressable style={styles.secondaryBtn} onPress={handleInvite}>
                <Text style={styles.secondaryBtnText}>
                  {invite.isPending ? 'Creating…' : '＋ Invite'}
                </Text>
              </Pressable>
            ) : null}
            {!isOwner ? (
              <Pressable style={styles.secondaryBtn} onPress={handleLeave}>
                <Text style={[styles.secondaryBtnText, { color: colors.danger }]}>Leave</Text>
              </Pressable>
            ) : null}
          </View>
        )}

        {/* Live ride — members only */}
        {isMember ? <LiveRideEntry groupId={group.id} /> : null}

        {/* Group chat — members only */}
        {isMember ? (
          <Pressable
            style={styles.chatBtn}
            onPress={() => nav.navigate('chat', { id: group.id })}
            accessibilityRole="button"
            accessibilityLabel="Open group chat"
          >
            <Text style={styles.chatBtnIcon}>💬</Text>
            <Text style={styles.chatBtnText}>Open Chat</Text>
            <Text style={styles.chatBtnChevron}>›</Text>
          </Pressable>
        ) : null}

        {/* Plan a trip — members only */}
        {isMember ? (
          <Pressable
            style={styles.chatBtn}
            onPress={() => nav.navigate('tripForm', { groupId: group.id })}
            accessibilityRole="button"
            accessibilityLabel="Plan a trip"
          >
            <Text style={styles.chatBtnIcon}>🗺️</Text>
            <Text style={styles.chatBtnText}>Plan a Trip</Text>
            <Text style={styles.chatBtnChevron}>›</Text>
          </Pressable>
        ) : null}

        {/* Pending join requests (admins, private groups) */}
        {isAdmin && (joinRequests.data?.length ?? 0) > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PENDING REQUESTS</Text>
            {joinRequests.data!.map((r) => (
              <View key={r.id} style={styles.requestRow}>
                <MemberAvatar name={r.user.displayName ?? 'Rider'} url={r.user.avatarUrl} />
                <View style={styles.rowText}>
                  <Text style={styles.rowName}>{r.user.displayName ?? 'Rider'}</Text>
                  {r.message ? (
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {r.message}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  style={[styles.pill, styles.pillApprove]}
                  onPress={() => review.mutate({ requestId: r.id, status: 'APPROVED' })}
                >
                  <Text style={styles.pillApproveText}>Approve</Text>
                </Pressable>
                <Pressable
                  style={styles.pill}
                  onPress={() => review.mutate({ requestId: r.id, status: 'REJECTED' })}
                >
                  <Text style={styles.pillRejectText}>Reject</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {/* Upcoming trips — members only */}
        {isMember ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>UPCOMING TRIPS</Text>
              <Pressable onPress={() => nav.navigate('tripForm', { groupId: group.id })}>
                <Text style={styles.sectionAction}>＋ Plan</Text>
              </Pressable>
            </View>
            {(trips.data?.length ?? 0) === 0 ? (
              <Text style={styles.emptyText}>No upcoming trips — plan one!</Text>
            ) : (
              trips.data!.map((trip) => (
                <Pressable
                  key={trip.id}
                  style={styles.tripRow}
                  onPress={() => nav.navigate('tripDetail', { id: trip.id, groupId: group.id })}
                  accessibilityRole="button"
                  accessibilityLabel={trip.title}
                >
                  <View style={styles.tripIcon}>
                    <Text style={styles.tripIconText}>🗺️</Text>
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.tripTitle} numberOfLines={1}>
                      {trip.title}
                    </Text>
                    <Text style={styles.tripMeta}>
                      {new Date(trip.scheduledAt).toLocaleDateString([], {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                      {' · '}
                      🧭 {trip.stopCount} · 👥 {trip.rsvp.going}
                    </Text>
                  </View>
                  {trip.myRsvp === 'GOING' ? <Text style={styles.tripGoing}>Going</Text> : null}
                  <Text style={styles.tripChevron}>›</Text>
                </Pressable>
              ))
            )}
          </View>
        ) : null}

        {/* Announcements */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>ANNOUNCEMENTS</Text>
            {canPost ? (
              <Pressable onPress={() => nav.navigate('announcementForm', { groupId: group.id })}>
                <Text style={styles.sectionAction}>＋ Post</Text>
              </Pressable>
            ) : null}
          </View>
          {(announcements.data?.length ?? 0) === 0 ? (
            <Text style={styles.emptyText}>No announcements yet.</Text>
          ) : (
            announcements.data!.map((a) => {
              const canEdit = canMutateAnnouncement(a);
              return (
                <Pressable
                  key={a.id}
                  style={styles.announcement}
                  onLongPress={canEdit ? () => announcementActions(a) : undefined}
                  delayLongPress={250}
                >
                  <View style={styles.announcementHead}>
                    {a.isPinned ? <Text style={styles.pin}>📌</Text> : null}
                    <Text style={styles.announcementTitle}>{a.title}</Text>
                    {canEdit ? (
                      <Pressable
                        onPress={() => announcementActions(a)}
                        hitSlop={10}
                        accessibilityLabel="Announcement options"
                      >
                        <Text style={styles.announcementMenu}>⋯</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <Text style={styles.announcementBody}>{a.content}</Text>
                </Pressable>
              );
            })
          )}
        </View>

        {/* Members */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MEMBERS · {group.members.length}</Text>
          {group.members.map((m) => {
            const canManage = assignableRoles(m).length > 0;
            return (
              <MemberRow
                key={m.id}
                member={m}
                isYou={m.user.id === user?.id}
                onManage={canManage ? () => manageMember(m) : undefined}
              />
            );
          })}
        </View>

        {/* Danger zone */}
        {isOwner ? (
          <View style={styles.section}>
            <Button title="Delete group" onPress={handleDelete} variant="destructive" />
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

/**
 * Live-ride entry: a bright banner to open/join an active ride, or a subtle
 * "Start a ride" button when the group has none. Any member can start.
 */
function LiveRideEntry({ groupId }: { groupId: string }): ReactNode {
  const nav = useNavigation();
  const active = useActiveRide(groupId);
  const start = useStartRide(groupId);

  if (active.data) {
    return (
      <Pressable
        style={styles.liveBanner}
        onPress={() => nav.navigate('liveRide', { id: active.data!.id, groupId })}
        accessibilityRole="button"
        accessibilityLabel="Open live ride"
      >
        <View style={styles.liveDotWrap}>
          <View style={styles.liveDot} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.liveBannerTitle}>
            LIVE · {active.data.participantCount}{' '}
            {active.data.participantCount === 1 ? 'rider' : 'riders'}
          </Text>
          <Text style={styles.liveBannerSub}>
            {active.data.status === 'PAUSED' ? 'Ride paused' : 'Tap to open the live map'}
          </Text>
        </View>
        <Text style={styles.chatBtnChevron}>›</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={styles.chatBtn}
      onPress={() =>
        start.mutate(
          {},
          { onSuccess: (ride) => nav.navigate('liveRide', { id: ride.id, groupId }) },
        )
      }
      disabled={start.isPending}
      accessibilityRole="button"
      accessibilityLabel="Start a ride"
    >
      <Text style={styles.chatBtnIcon}>🏍️</Text>
      <Text style={styles.chatBtnText}>{start.isPending ? 'Starting…' : 'Start a Ride'}</Text>
      <Text style={styles.chatBtnChevron}>›</Text>
    </Pressable>
  );
}

function MemberAvatar({ name, url }: { name: string; url: string | null }): ReactNode {
  if (url) return <Image source={{ uri: url }} style={styles.memberAvatar} />;
  return (
    <View style={[styles.memberAvatar, styles.memberAvatarFallback]}>
      <Text style={styles.memberAvatarText}>{initials(name)}</Text>
    </View>
  );
}

function MemberRow({
  member,
  isYou,
  onManage,
}: {
  member: GroupMember;
  isYou: boolean;
  onManage?: () => void;
}): ReactNode {
  const name = member.user.displayName ?? 'Rider';
  return (
    <Pressable
      style={({ pressed }) => [styles.memberRow, pressed && onManage ? styles.memberRowPressed : null]}
      onPress={onManage}
      disabled={!onManage}
      accessibilityRole={onManage ? 'button' : undefined}
      accessibilityLabel={onManage ? `Manage ${name}` : undefined}
    >
      <MemberAvatar name={name} url={member.user.avatarUrl} />
      <Text style={[styles.rowName, styles.memberName]} numberOfLines={1}>
        {name}
        {isYou ? <Text style={styles.youTag}>  (you)</Text> : null}
      </Text>
      <View style={[styles.roleDot, { backgroundColor: ROLE_COLOR[member.role] }]} />
      <RoleBadge role={member.role} />
      {onManage ? <Text style={styles.manageChevron}>›</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 120 },

  banner: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171009',
    overflow: 'hidden',
  },
  bannerImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  backButton: {
    position: 'absolute',
    top: 52,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(10,11,13,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: '#fff', fontSize: 22, fontWeight: '600', lineHeight: 24 },
  bannerAvatar: {
    width: 84,
    height: 84,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF5A1F',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 10,
  },
  bannerAvatarText: { fontSize: 30, fontWeight: '800', color: '#fff' },

  body: { paddingHorizontal: 20, paddingTop: 18 },
  name: { fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  meta: { fontSize: 13, fontWeight: '500', color: colors.muted },
  metaDot: { color: colors.muted },
  description: { fontSize: 14, color: colors.text, lineHeight: 21, marginTop: 12 },

  memberActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  secondaryBtn: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '600', color: colors.text },

  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chatBtnIcon: { fontSize: 18 },
  chatBtnText: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  chatBtnChevron: { fontSize: 20, color: colors.muted },

  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,90,31,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,90,31,0.35)',
  },
  liveDotWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(48,209,88,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#30D158' },
  liveBannerTitle: { fontSize: 14, fontWeight: '800', color: colors.primary, letterSpacing: 0.3 },
  liveBannerSub: { fontSize: 12, fontWeight: '500', color: colors.muted, marginTop: 2 },

  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 14,
    marginBottom: 10,
  },
  tripIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(255,90,31,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripIconText: { fontSize: 18 },
  tripTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  tripMeta: { fontSize: 12, fontWeight: '500', color: colors.muted, marginTop: 3 },
  tripGoing: { fontSize: 11, fontWeight: '700', color: '#30D158' },
  tripChevron: { fontSize: 20, color: colors.muted },

  section: { marginTop: 28 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 1,
    marginBottom: 12,
  },
  sectionAction: { fontSize: 13, fontWeight: '700', color: colors.primary },
  emptyText: { fontSize: 13, color: colors.muted },

  requestRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  rowText: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 14, fontWeight: '600', color: colors.text },
  rowSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  pill: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pillApprove: { backgroundColor: 'rgba(48,209,88,0.14)', borderColor: 'rgba(48,209,88,0.3)' },
  pillApproveText: { fontSize: 12, fontWeight: '700', color: colors.success },
  pillRejectText: { fontSize: 12, fontWeight: '700', color: colors.muted },

  announcement: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 14,
    marginBottom: 10,
  },
  announcementHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  announcementTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  announcementMenu: { fontSize: 18, fontWeight: '700', color: colors.muted, lineHeight: 18 },
  pin: { fontSize: 13 },
  announcementBody: { fontSize: 13, color: colors.muted, lineHeight: 19 },

  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  memberRowPressed: { opacity: 0.6 },
  youTag: { fontSize: 12, fontWeight: '500', color: colors.muted },
  manageChevron: { fontSize: 20, color: colors.muted, marginLeft: 2 },
  memberAvatar: { width: 40, height: 40, borderRadius: 13 },
  memberAvatarFallback: {
    backgroundColor: '#23272F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: { fontSize: 14, fontWeight: '700', color: colors.text },
  memberName: { flex: 1 },
  roleDot: { width: 8, height: 8, borderRadius: 4 },
});

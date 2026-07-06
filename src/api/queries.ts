import {
  keepPreviousData,
  queryOptions,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import type { GroupPage } from "@samishan11/moto-contract";
import { meRequest } from "./auth";
import { getHealth } from "./client";
import { getProfile, listEmergencyContacts } from "./profile";
import { getBike, listBikes, listReminders } from "./bike";
import {
  getGroup,
  listAnnouncements,
  listGroupMembers,
  listGroups,
  listJoinRequests,
} from "./group";
import { listBlocked } from "./chat";
import { getTrip, listMyTrips, listTrips } from "./trip";
import { getActiveRide, getRide, getRideStats } from "./ride";
import { listHazards } from "./hazard";
import { listNearbyRiders } from "./nearby";
import { getMyLift, listNearbyLifts } from "./lift";

/**
 * Hazards are queried by live position, which changes constantly. Snap the
 * anchor to a coarse grid (~1.1km at 2dp) so panning/riding within an area
 * reuses one cache entry instead of refetching on every GPS tick.
 */
export const HAZARD_AREA_DP = 2;
const snap = (n: number): number => {
  const f = 10 ** HAZARD_AREA_DP;
  return Math.round(n * f) / f;
};

/** Centralized query keys so cache reads/invalidations stay consistent. */
export const queryKeys = {
  health: ["health"] as const,
  me: ["auth", "me"] as const,
  profile: ["profile"] as const,
  emergencyContacts: ["profile", "emergency-contacts"] as const,
  bikes: ["bikes"] as const,
  bike: (id: string) => ["bikes", id] as const,
  reminders: ["reminders"] as const,
  groups: ["groups"] as const,
  /** Paged, server-filtered group list — one cache entry per search term. */
  groupsList: (search: string) => ["groups", "list", search] as const,
  /** The caller's groups (most recently joined first), server-filtered. */
  myGroups: (search: string) => ["groups", "mine", "search", search] as const,
  /** Latest N joined groups for picker suggestions. */
  recentGroups: ["groups", "mine", "recent"] as const,
  group: (id: string) => ["groups", id] as const,
  groupMembers: (id: string) => ["groups", id, "members"] as const,
  groupJoinRequests: (id: string) => ["groups", id, "join-requests"] as const,
  groupAnnouncements: (id: string) => ["groups", id, "announcements"] as const,
  messages: (groupId: string) => ["groups", groupId, "messages"] as const,
  blockList: ["block-list"] as const,
  trips: (groupId: string) => ["groups", groupId, "trips"] as const,
  myTrips: (upcoming: boolean) =>
    ["trips", "mine", upcoming ? "upcoming" : "past"] as const,
  trip: (tripId: string) => ["trips", tripId] as const,
  activeRide: (groupId: string) => ["groups", groupId, "active-ride"] as const,
  ride: (rideId: string) => ["rides", rideId] as const,
  rideStats: (rideId: string) => ["rides", rideId, "stats"] as const,
  /** All hazard-area caches share this prefix for bulk invalidation. */
  hazardsRoot: ["hazards"] as const,
  hazards: (lat: number, lng: number, radius: number) =>
    ["hazards", snap(lat), snap(lng), radius] as const,
  /** All nearby-rider snapshots share this prefix for bulk invalidation. */
  nearbyRidersRoot: ["nearby-riders"] as const,
  nearbyRiders: (lat: number, lng: number, radius: number) =>
    ["nearby-riders", snap(lat), snap(lng), radius] as const,
  /** All nearby-lift snapshots share this prefix for bulk invalidation. */
  liftsRoot: ["lifts"] as const,
  nearbyLifts: (lat: number, lng: number, radius: number) =>
    ["lifts", "nearby", snap(lat), snap(lng), radius] as const,
  myLift: ["lifts", "mine"] as const,
};

export const healthQueryOptions = queryOptions({
  queryKey: queryKeys.health,
  queryFn: getHealth,
});

export const meQueryOptions = queryOptions({
  queryKey: queryKeys.me,
  queryFn: meRequest,
  staleTime: 60_000,
});

export const profileQueryOptions = queryOptions({
  queryKey: queryKeys.profile,
  queryFn: getProfile,
});

export const emergencyContactsQueryOptions = queryOptions({
  queryKey: queryKeys.emergencyContacts,
  queryFn: listEmergencyContacts,
});

export const bikesQueryOptions = queryOptions({
  queryKey: queryKeys.bikes,
  queryFn: listBikes,
});

export const bikeQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.bike(id),
    queryFn: () => getBike(id),
  });

export const remindersQueryOptions = queryOptions({
  queryKey: queryKeys.reminders,
  queryFn: listReminders,
});

export const groupsQueryOptions = queryOptions({
  queryKey: queryKeys.groups,
  // Flat first-page list for pickers (Home, Create Trip). The Groups screen
  // itself uses useGroupsInfinite for server-side search + infinite scroll.
  queryFn: () => listGroups({ limit: 50 }).then((page) => page.groups),
});

/**
 * Group detail + its sub-lists are opened repeatedly and mutate often (join,
 * role changes, announcements). The custom stack navigator remounts screens on
 * every navigation, so `refetchOnMount: 'always'` + `staleTime: 0` guarantees
 * fresh data each time the detail screen opens — no stale-cache flashes.
 */
const FRESH = { staleTime: 0, refetchOnMount: "always" } as const;

export const groupQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.group(id),
    queryFn: () => getGroup(id),
    ...FRESH,
  });

export const groupMembersQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.groupMembers(id),
    queryFn: () => listGroupMembers(id),
    ...FRESH,
  });

export const groupJoinRequestsQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.groupJoinRequests(id),
    queryFn: () => listJoinRequests(id),
    ...FRESH,
  });

export const groupAnnouncementsQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.groupAnnouncements(id),
    queryFn: () => listAnnouncements(id),
    ...FRESH,
  });

export const blockListQueryOptions = queryOptions({
  queryKey: queryKeys.blockList,
  queryFn: listBlocked,
});

export const tripsQueryOptions = (groupId: string, upcoming: boolean) =>
  queryOptions({
    queryKey: [
      ...queryKeys.trips(groupId),
      upcoming ? "upcoming" : "past",
    ] as const,
    queryFn: () => listTrips(groupId, upcoming),
    ...FRESH,
  });

export const myTripsQueryOptions = (upcoming: boolean) =>
  queryOptions({
    queryKey: queryKeys.myTrips(upcoming),
    queryFn: () => listMyTrips(upcoming),
    ...FRESH,
  });

export const tripQueryOptions = (tripId: string) =>
  queryOptions({
    queryKey: queryKeys.trip(tripId),
    queryFn: () => getTrip(tripId),
    ...FRESH,
  });

export const activeRideQueryOptions = (groupId: string) =>
  queryOptions({
    queryKey: queryKeys.activeRide(groupId),
    queryFn: () => getActiveRide(groupId),
    ...FRESH,
  });

export const rideQueryOptions = (rideId: string) =>
  queryOptions({
    queryKey: queryKeys.ride(rideId),
    queryFn: () => getRide(rideId),
    ...FRESH,
  });

export const rideStatsQueryOptions = (rideId: string) =>
  queryOptions({
    queryKey: queryKeys.rideStats(rideId),
    queryFn: () => getRideStats(rideId),
  });

/**
 * Nearby hazards for the rider's current area. The anchor is snapped (see
 * `queryKeys.hazards`) so the queryFn fetches for the grid cell, not the exact
 * live coordinate — keeping the cache stable while moving. Real-time
 * hazard:new/expired events keep it fresh, so a modest staleTime is fine.
 */
export const hazardsQueryOptions = (
  lat: number,
  lng: number,
  radius: number,
) => {
  const f = 10 ** HAZARD_AREA_DP;
  const aLat = Math.round(lat * f) / f;
  const aLng = Math.round(lng * f) / f;
  return queryOptions({
    queryKey: queryKeys.hazards(lat, lng, radius),
    queryFn: () => listHazards(aLat, aLng, radius),
    staleTime: 60_000,
  });
};

/**
 * Snapshot of nearby riders for the global map. Same grid-snapped key strategy
 * as hazards; live movement arrives over the socket, so the snapshot only needs
 * to be re-fetched on open/reconnect (the hook invalidates it explicitly).
 */
export const nearbyRidersQueryOptions = (
  lat: number,
  lng: number,
  radius: number,
) => {
  const f = 10 ** HAZARD_AREA_DP;
  const aLat = Math.round(lat * f) / f;
  const aLng = Math.round(lng * f) / f;
  return queryOptions({
    queryKey: queryKeys.nearbyRiders(lat, lng, radius),
    queryFn: () => listNearbyRiders(aLat, aLng, radius),
    staleTime: 30_000,
  });
};

/** Open lifts from mutual-group members near the rider (grid-snapped key). */
export const nearbyLiftsQueryOptions = (
  lat: number,
  lng: number,
  radius: number,
) => {
  const f = 10 ** HAZARD_AREA_DP;
  const aLat = Math.round(lat * f) / f;
  const aLng = Math.round(lng * f) / f;
  return queryOptions({
    queryKey: queryKeys.nearbyLifts(lat, lng, radius),
    queryFn: () => listNearbyLifts(aLat, aLng, radius),
    staleTime: 30_000,
  });
};

export const myLiftQueryOptions = queryOptions({
  queryKey: queryKeys.myLift,
  queryFn: getMyLift,
  staleTime: 15_000,
});

// --- Hooks ---

/** Backend health, consumed by the Home screen. */
export function useHealth() {
  return useQuery(healthQueryOptions);
}

export function useProfile() {
  return useQuery(profileQueryOptions);
}

export function useEmergencyContacts() {
  return useQuery(emergencyContactsQueryOptions);
}

export function useBikes() {
  return useQuery(bikesQueryOptions);
}

export function useBike(id: string) {
  return useQuery(bikeQueryOptions(id));
}

export function useReminders() {
  return useQuery(remindersQueryOptions);
}

/**
 * Server-filtered, cursor-paginated group list for the Groups screen. Each
 * search term gets its own cache entry; `keepPreviousData` keeps the current
 * results on screen while a new search term is fetching (no flash to empty).
 */
export function useGroupsInfinite(search: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.groupsList(search),
    queryFn: ({ pageParam }) =>
      listGroups({ search: search || undefined, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: GroupPage) => last.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
  });
}

/** How many recently-joined groups the pickers suggest. */
export const RECENT_GROUPS_LIMIT = 5;

export const recentGroupsQueryOptions = queryOptions({
  queryKey: queryKeys.recentGroups,
  queryFn: () =>
    listGroups({ joined: true, limit: RECENT_GROUPS_LIMIT }).then((page) => page.groups),
});

/** Latest joined groups — suggestion chips under the group select. */
export function useRecentGroups() {
  return useQuery(recentGroupsQueryOptions);
}

/**
 * Server-side search over the groups the user belongs to (most recently
 * joined first) — backs the searchable group select.
 */
export function useMyGroupsInfinite(search: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.myGroups(search),
    queryFn: ({ pageParam }) =>
      listGroups({ joined: true, search: search || undefined, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: GroupPage) => last.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useGroups() {
  return useQuery(groupsQueryOptions);
}

export function useGroup(id: string) {
  return useQuery(groupQueryOptions(id));
}

export function useGroupAnnouncements(id: string) {
  return useQuery(groupAnnouncementsQueryOptions(id));
}

export function useGroupJoinRequests(id: string, enabled: boolean) {
  return useQuery({ ...groupJoinRequestsQueryOptions(id), enabled });
}

export function useBlockList() {
  return useQuery(blockListQueryOptions);
}

export function useTrips(groupId: string, upcoming: boolean) {
  return useQuery(tripsQueryOptions(groupId, upcoming));
}

export function useMyTrips(upcoming = true) {
  return useQuery(myTripsQueryOptions(upcoming));
}

export function useTrip(tripId: string) {
  return useQuery(tripQueryOptions(tripId));
}

export function useActiveRide(groupId: string) {
  return useQuery(activeRideQueryOptions(groupId));
}

export function useRide(rideId: string) {
  return useQuery(rideQueryOptions(rideId));
}

export function useRideStats(rideId: string) {
  return useQuery(rideStatsQueryOptions(rideId));
}

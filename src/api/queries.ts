import { queryOptions, useQuery } from '@tanstack/react-query';
import { meRequest } from './auth';
import { getHealth } from './client';
import { getProfile, listEmergencyContacts } from './profile';
import { getBike, listBikes, listReminders } from './bike';

/** Centralized query keys so cache reads/invalidations stay consistent. */
export const queryKeys = {
  health: ['health'] as const,
  me: ['auth', 'me'] as const,
  profile: ['profile'] as const,
  emergencyContacts: ['profile', 'emergency-contacts'] as const,
  bikes: ['bikes'] as const,
  bike: (id: string) => ['bikes', id] as const,
  reminders: ['reminders'] as const,
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

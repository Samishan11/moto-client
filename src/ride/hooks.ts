import { useMutation } from '@tanstack/react-query';
import type { StartRideRequest, UpdateRideStatusRequest } from '@moto/contract';
import {
  joinRide,
  leaveRide,
  startRide,
  updateRideStatus,
} from '../api/ride';
import { queryClient } from '../api/queryClient';
import { queryKeys } from '../api/queries';

const invalidateActive = (groupId: string) =>
  queryClient.invalidateQueries({ queryKey: queryKeys.activeRide(groupId), refetchType: 'all' });
const invalidateRide = (rideId: string) =>
  queryClient.invalidateQueries({ queryKey: queryKeys.ride(rideId), refetchType: 'all' });

export function useStartRide(groupId: string) {
  return useMutation({
    mutationFn: (body: StartRideRequest) => startRide(groupId, body),
    onSuccess: () => invalidateActive(groupId),
  });
}

export function useUpdateRideStatus(rideId: string, groupId: string) {
  return useMutation({
    mutationFn: (body: UpdateRideStatusRequest) => updateRideStatus(rideId, body),
    onSuccess: () => {
      invalidateRide(rideId);
      invalidateActive(groupId);
    },
  });
}

export function useJoinRide(rideId: string, groupId: string) {
  return useMutation({
    mutationFn: () => joinRide(rideId),
    onSuccess: () => {
      invalidateRide(rideId);
      invalidateActive(groupId);
    },
  });
}

export function useLeaveRide(rideId: string, groupId: string) {
  return useMutation({
    mutationFn: () => leaveRide(rideId),
    onSuccess: () => {
      invalidateRide(rideId);
      invalidateActive(groupId);
    },
  });
}

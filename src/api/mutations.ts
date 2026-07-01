import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  AddBikePhotoRequest,
  CreateBikeRequest,
  CreateEmergencyContactRequest,
  CreateServiceRecordRequest,
  UpdateBikeRequest,
  UpdateEmergencyContactRequest,
  UpdateProfileRequest,
  UpdateServiceRecordRequest,
} from '@moto/contract';
import {
  addBikePhoto,
  createBike,
  createServiceRecord,
  deleteBike,
  deleteBikePhoto,
  deleteServiceRecord,
  updateBike,
  updateServiceRecord,
} from './bike';
import {
  createEmergencyContact,
  deleteAvatar,
  deleteEmergencyContact,
  setAvatar,
  updateEmergencyContact,
  updateProfile,
} from './profile';
import { queryKeys } from './queries';

/**
 * React Query mutation hooks for Phase 2 (Profile & Garage).
 * All mutations invalidate relevant cache keys to keep the UI in sync.
 */

// --- Profile ---

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateProfileRequest) => updateProfile(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
}

export function useSetAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (objectKey: string) => setAvatar(objectKey),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
}

export function useDeleteAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deleteAvatar(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
}

// --- Emergency Contacts ---

export function useCreateEmergencyContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateEmergencyContactRequest) => createEmergencyContact(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.emergencyContacts });
    },
  });
}

export function useUpdateEmergencyContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; body: UpdateEmergencyContactRequest }) =>
      updateEmergencyContact(vars.id, vars.body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.emergencyContacts });
    },
  });
}

export function useDeleteEmergencyContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEmergencyContact(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.emergencyContacts });
    },
  });
}

// --- Bikes ---

export function useCreateBike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateBikeRequest) => createBike(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.bikes });
    },
  });
}

export function useUpdateBike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; body: UpdateBikeRequest }) =>
      updateBike(vars.id, vars.body),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.bikes });
      qc.invalidateQueries({ queryKey: queryKeys.bike(data.id) });
    },
  });
}

export function useDeleteBike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBike(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.bikes });
    },
  });
}

// --- Bike Photos ---

export function useAddBikePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { bikeId: string; body: AddBikePhotoRequest }) =>
      addBikePhoto(vars.bikeId, vars.body),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.bike(variables.bikeId) });
    },
  });
}

export function useDeleteBikePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { bikeId: string; photoId: string }) =>
      deleteBikePhoto(vars.bikeId, vars.photoId),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.bike(variables.bikeId) });
    },
  });
}

// --- Service Records ---

export function useCreateServiceRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { bikeId: string; body: CreateServiceRecordRequest }) =>
      createServiceRecord(vars.bikeId, vars.body),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.bike(variables.bikeId) });
    },
  });
}

export function useUpdateServiceRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { bikeId: string; recordId: string; body: UpdateServiceRecordRequest }) =>
      updateServiceRecord(vars.bikeId, vars.recordId, vars.body),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.bike(variables.bikeId) });
    },
  });
}

export function useDeleteServiceRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { bikeId: string; recordId: string }) =>
      deleteServiceRecord(vars.bikeId, vars.recordId),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.bike(variables.bikeId) });
    },
  });
}

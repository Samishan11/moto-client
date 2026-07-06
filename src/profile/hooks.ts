import { useMutation } from '@tanstack/react-query';
import type {
  CreateEmergencyContactRequest,
  UpdateEmergencyContactRequest,
  UpdateProfileRequest,
  UserProfile,
} from '@samishan11/moto-contract';
import {
  createEmergencyContact,
  deleteAvatar,
  deleteEmergencyContact,
  setAvatar,
  updateEmergencyContact,
  updateProfile,
} from '../api/profile';
import { uploadLocalFile } from '../api/upload';
import { queryClient } from '../api/queryClient';
import { queryKeys } from '../api/queries';

/** Reflect a fresh profile in the cache (and the auth `me` view it overlaps). */
function syncProfile(profile: UserProfile): void {
  queryClient.setQueryData(queryKeys.profile, profile);
  void queryClient.invalidateQueries({ queryKey: queryKeys.me });
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: (body: UpdateProfileRequest) => updateProfile(body),
    onSuccess: syncProfile,
  });
}

export function useUploadAvatar() {
  return useMutation({
    mutationFn: async (file: { uri: string; contentType: string }) => {
      const objectKey = await uploadLocalFile('AVATAR', file.uri, file.contentType);
      return setAvatar(objectKey);
    },
    onSuccess: syncProfile,
  });
}

export function useDeleteAvatar() {
  return useMutation({
    mutationFn: () => deleteAvatar(),
    onSuccess: syncProfile,
  });
}

export function useCreateContact() {
  return useMutation({
    mutationFn: (body: CreateEmergencyContactRequest) => createEmergencyContact(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.emergencyContacts }),
  });
}

export function useUpdateContact() {
  return useMutation({
    mutationFn: (vars: { id: string; body: UpdateEmergencyContactRequest }) =>
      updateEmergencyContact(vars.id, vars.body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.emergencyContacts }),
  });
}

export function useDeleteContact() {
  return useMutation({
    mutationFn: (id: string) => deleteEmergencyContact(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.emergencyContacts }),
  });
}

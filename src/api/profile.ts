import type {
  CreateEmergencyContactRequest,
  EmergencyContact,
  MessageResponse,
  UpdateEmergencyContactRequest,
  UpdateProfileRequest,
  UserProfile,
} from '@moto/contract';
import { apiFetch } from './client';

// --- Profile ---

export function getProfile(): Promise<UserProfile> {
  return apiFetch<UserProfile>('/profile', { auth: true });
}

export function updateProfile(body: UpdateProfileRequest): Promise<UserProfile> {
  return apiFetch<UserProfile>('/profile', { method: 'PATCH', body, auth: true });
}

export function setAvatar(objectKey: string): Promise<UserProfile> {
  return apiFetch<UserProfile>('/profile/avatar', {
    method: 'PUT',
    body: { objectKey },
    auth: true,
  });
}

export function deleteAvatar(): Promise<UserProfile> {
  return apiFetch<UserProfile>('/profile/avatar', { method: 'DELETE', auth: true });
}

// --- Emergency contacts ---

export function listEmergencyContacts(): Promise<EmergencyContact[]> {
  return apiFetch<EmergencyContact[]>('/profile/emergency-contacts', { auth: true });
}

export function createEmergencyContact(
  body: CreateEmergencyContactRequest,
): Promise<EmergencyContact> {
  return apiFetch<EmergencyContact>('/profile/emergency-contacts', {
    method: 'POST',
    body,
    auth: true,
  });
}

export function updateEmergencyContact(
  id: string,
  body: UpdateEmergencyContactRequest,
): Promise<EmergencyContact> {
  return apiFetch<EmergencyContact>(`/profile/emergency-contacts/${id}`, {
    method: 'PATCH',
    body,
    auth: true,
  });
}

export function deleteEmergencyContact(id: string): Promise<MessageResponse> {
  return apiFetch<MessageResponse>(`/profile/emergency-contacts/${id}`, {
    method: 'DELETE',
    auth: true,
  });
}

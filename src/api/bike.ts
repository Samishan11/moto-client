import type {
  AddBikePhotoRequest,
  Bike,
  BikeDetail,
  BikePhoto,
  CreateBikeRequest,
  CreateServiceRecordRequest,
  MessageResponse,
  Reminder,
  ServiceRecord,
  UpdateBikeRequest,
  UpdateServiceRecordRequest,
} from '@moto/contract';
import { apiFetch } from './client';

// --- Bikes ---

export function listBikes(): Promise<Bike[]> {
  return apiFetch<Bike[]>('/bikes', { auth: true });
}

export function getBike(id: string): Promise<BikeDetail> {
  return apiFetch<BikeDetail>(`/bikes/${id}`, { auth: true });
}

export function createBike(body: CreateBikeRequest): Promise<Bike> {
  return apiFetch<Bike>('/bikes', { method: 'POST', body, auth: true });
}

export function updateBike(id: string, body: UpdateBikeRequest): Promise<Bike> {
  return apiFetch<Bike>(`/bikes/${id}`, { method: 'PATCH', body, auth: true });
}

export function deleteBike(id: string): Promise<MessageResponse> {
  return apiFetch<MessageResponse>(`/bikes/${id}`, { method: 'DELETE', auth: true });
}

// --- Photos ---

export function addBikePhoto(bikeId: string, body: AddBikePhotoRequest): Promise<BikePhoto> {
  return apiFetch<BikePhoto>(`/bikes/${bikeId}/photos`, { method: 'POST', body, auth: true });
}

export function deleteBikePhoto(bikeId: string, photoId: string): Promise<MessageResponse> {
  return apiFetch<MessageResponse>(`/bikes/${bikeId}/photos/${photoId}`, {
    method: 'DELETE',
    auth: true,
  });
}

// --- Service records ---

export function createServiceRecord(
  bikeId: string,
  body: CreateServiceRecordRequest,
): Promise<ServiceRecord> {
  return apiFetch<ServiceRecord>(`/bikes/${bikeId}/service-records`, {
    method: 'POST',
    body,
    auth: true,
  });
}

export function updateServiceRecord(
  bikeId: string,
  recordId: string,
  body: UpdateServiceRecordRequest,
): Promise<ServiceRecord> {
  return apiFetch<ServiceRecord>(`/bikes/${bikeId}/service-records/${recordId}`, {
    method: 'PATCH',
    body,
    auth: true,
  });
}

export function deleteServiceRecord(bikeId: string, recordId: string): Promise<MessageResponse> {
  return apiFetch<MessageResponse>(`/bikes/${bikeId}/service-records/${recordId}`, {
    method: 'DELETE',
    auth: true,
  });
}

// --- Reminders ---

export function listReminders(): Promise<Reminder[]> {
  return apiFetch<Reminder[]>('/reminders', { auth: true });
}

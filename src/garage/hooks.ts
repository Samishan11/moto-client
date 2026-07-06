import { useMutation } from '@tanstack/react-query';
import type {
  CreateBikeRequest,
  UpdateBikeRequest,
  CreateServiceRecordRequest,
  UpdateServiceRecordRequest,
} from '@samishan11/moto-contract';
import {
  addBikePhoto,
  createBike,
  createServiceRecord,
  deleteBike,
  deleteBikePhoto,
  deleteServiceRecord,
  updateBike,
  updateServiceRecord,
} from '../api/bike';
import { uploadLocalFile } from '../api/upload';
import { queryClient } from '../api/queryClient';
import { queryKeys } from '../api/queries';

// --- Bikes ---

export function useCreateBike() {
  return useMutation({
    mutationFn: (body: CreateBikeRequest) => createBike(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.bikes }),
  });
}

export function useUpdateBike() {
  return useMutation({
    mutationFn: (vars: { id: string; body: UpdateBikeRequest }) =>
      updateBike(vars.id, vars.body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bikes });
      queryClient.invalidateQueries({ queryKey: queryKeys.bike(data.id) });
    },
  });
}

export function useDeleteBike() {
  return useMutation({
    mutationFn: (id: string) => deleteBike(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.bikes }),
  });
}

// --- Bike Photos ---

export function useAddBikePhoto() {
  return useMutation({
    mutationFn: async (vars: { bikeId: string; file: { uri: string; contentType: string } }) => {
      const objectKey = await uploadLocalFile('BIKE_PHOTO', vars.file.uri, vars.file.contentType);
      return addBikePhoto(vars.bikeId, { objectKey });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bike(variables.bikeId) });
    },
  });
}

export function useDeleteBikePhoto() {
  return useMutation({
    mutationFn: (vars: { bikeId: string; photoId: string }) =>
      deleteBikePhoto(vars.bikeId, vars.photoId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bike(variables.bikeId) });
    },
  });
}

// --- Service Records ---

export function useCreateServiceRecord() {
  return useMutation({
    mutationFn: (vars: {
      bikeId: string;
      body: CreateServiceRecordRequest;
      invoiceFile?: { uri: string; contentType: string };
    }) =>
      (async () => {
        const body = { ...vars.body } as CreateServiceRecordRequest;
        if (vars.invoiceFile) {
          body.invoiceKey = await uploadLocalFile(
            'SERVICE_INVOICE',
            vars.invoiceFile.uri,
            vars.invoiceFile.contentType,
          );
        }
        return createServiceRecord(vars.bikeId, body);
      })(),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bike(variables.bikeId) });
    },
  });
}

export function useUpdateServiceRecord() {
  return useMutation({
    mutationFn: (vars: {
      bikeId: string;
      recordId: string;
      body: UpdateServiceRecordRequest;
      invoiceFile?: { uri: string; contentType: string };
    }) =>
      (async () => {
        const body = { ...vars.body } as UpdateServiceRecordRequest;
        if (vars.invoiceFile) {
          body.invoiceKey = await uploadLocalFile(
            'SERVICE_INVOICE',
            vars.invoiceFile.uri,
            vars.invoiceFile.contentType,
          );
        }
        return updateServiceRecord(vars.bikeId, vars.recordId, body);
      })(),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bike(variables.bikeId) });
    },
  });
}

export function useDeleteServiceRecord() {
  return useMutation({
    mutationFn: (vars: { bikeId: string; recordId: string }) =>
      deleteServiceRecord(vars.bikeId, vars.recordId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bike(variables.bikeId) });
    },
  });
}
